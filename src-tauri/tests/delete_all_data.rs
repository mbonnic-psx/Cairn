//! Deleting everything means everything (FR-045).
//!
//! Found in review: this used to report the history and its key as deleted
//! while leaving both exactly where they were. Saying a thing is gone when it is
//! still on the disk is the same kind of dishonesty as reporting protection
//! from a write that was never verified.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal,
};
use cairn::store::config::{Config, ConfigStore, ProtectionIntent};

/// A credential store that remembers whether it was asked to forget the key.
///
/// The flag is shared with the test, because a test that cannot see the answer
/// is not asserting anything.
#[derive(Clone, Default)]
struct Keychain {
    asked_to_forget: Arc<Mutex<bool>>,
}

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        Ok(Key::from_bytes([7u8; 32]))
    }
    fn delete_history_key(&self) -> Outcome<()> {
        *self.asked_to_forget.lock().unwrap() = true;
        Ok(())
    }
}

struct NoElevation;

impl ElevationService for NoElevation {
    fn helper_status(&self) -> HelperStatus {
        HelperStatus::NotInstalled
    }
    fn install_helper(&self) -> Outcome<HelperStatus> {
        Ok(HelperStatus::NotInstalled)
    }
    fn uninstall_helper(&self) -> Outcome<Removal> {
        Ok(Removal::clean())
    }
}

struct Setup {
    _directory: tempfile::TempDir,
    state: AppState,
    data: PathBuf,
    keychain: Keychain,
}

fn setup(intent: ProtectionIntent) -> Setup {
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();

    let config = ConfigStore::at(&data);
    config
        .save(&Config {
            intent,
            ..Config::default()
        })
        .unwrap();

    // Something to delete: a category list and a history file.
    let categories = CategoryStore::at(&data);
    let shipped =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");
    cairn::enforcement::seed::seed_missing_lists(&shipped, &categories).unwrap();
    std::fs::write(data.join("history.db"), b"encrypted bytes").unwrap();

    let keychain = Keychain::default();
    let state = AppState {
        config: ConfigStore::at(&data),
        data_directory: data.clone(),
        credentials: Box::new(keychain.clone()),
        categories: CategoryStore::at(&data),
        shipped_categories: shipped,
        hosts: Box::new(SystemHosts::at(directory.path().join("hosts"))),
        helper: Box::new(NoHelper),
        elevation: Box::new(NoElevation),
        reserved: ReservedNames::default(),
        now: || 1_700_000_000,
    };

    Setup {
        state,
        data,
        keychain,
        _directory: directory,
    }
}

#[test]
fn everything_on_the_disk_actually_goes() {
    let setup = setup(ProtectionIntent::Off);

    let deleted = setup.state.delete_all_data().unwrap();

    assert!(!setup.data.join("config.json").exists(), "settings");
    assert!(!setup.data.join("history.db").exists(), "history");
    assert!(
        !setup.data.join("categories/social.json").exists(),
        "category lists"
    );
    assert!(!deleted.is_empty());
}

#[test]
fn the_key_is_forgotten_too() {
    let setup = setup(ProtectionIntent::Off);

    assert!(!*setup.keychain.asked_to_forget.lock().unwrap());

    let deleted = setup.state.delete_all_data().unwrap();

    assert!(
        *setup.keychain.asked_to_forget.lock().unwrap(),
        "the platform keychain has to actually be asked"
    );
    assert!(
        deleted.iter().any(|line| line.contains("key")),
        "and only then is it reported: {deleted:?}"
    );
}

#[test]
fn only_what_was_really_there_is_reported_as_deleted() {
    let setup = setup(ProtectionIntent::Off);
    setup.state.delete_all_data().unwrap();

    // Second time round there is nothing left but the key, which the platform
    // reports as removed either way.
    let deleted = setup.state.delete_all_data().unwrap();

    assert!(
        !deleted.iter().any(|line| line.contains("settings")),
        "nothing was there to delete: {deleted:?}"
    );
}

#[test]
fn nothing_is_reported_that_did_not_happen() {
    // The report is a statement about the disk, not a list of intentions.
    let setup = setup(ProtectionIntent::Off);
    std::fs::remove_file(setup.data.join("history.db")).unwrap();

    let deleted = setup.state.delete_all_data().unwrap();

    assert!(
        !deleted.iter().any(|line| line.contains("recorded")),
        "there was no history to delete: {deleted:?}"
    );
}

#[test]
fn it_refuses_while_protection_is_on() {
    // Deleting data must never be an off-switch spelled differently
    // (Principle I).
    let setup = setup(ProtectionIntent::On);

    let refused = setup.state.delete_all_data().unwrap_err();

    assert!(
        refused.message.contains("takes a day"),
        "{}",
        refused.message
    );
    assert!(
        setup.data.join("history.db").exists(),
        "and nothing is deleted"
    );
}
