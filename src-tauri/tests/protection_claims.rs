//! Cairn never tells someone a site is protected unless it has looked.
//!
//! Principle III: status shown to the person reflects verified system state,
//! never intended state. Some sentences are written far from any read of the
//! machine — a disclosure, an explanation of why counting is not running, a
//! refusal — and those may say what an action does or does not change, but
//! not that anything *is* protected, *stays* protected, or that protection
//! *is on*. Every test here sets up a machine where nothing is in force and
//! reads what the person would be shown.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::PathBuf;

use cairn::domain::entries::{CategoryId, ProtectedEntry, SourceRef, Trail};
use cairn::domain::gate::{PendingKind, TrustedClock};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::enforcement::reduce;
use cairn::enforcement::seed::{seed_missing_lists, CategoryStore};
use cairn::enforcement::state::ProtectionStatus;
use cairn::helper::NoHelper;
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal, Trouble,
};
use cairn::store::config::{Config, ConfigStore, ProtectionIntent};

const ORIGINAL_HOSTS: &[u8] = b"127.0.0.1 localhost\n::1 localhost\n";

/// Ways of saying a site is protected, or that protection is in force, that
/// only a read of the machine can back.
const CLAIMS_OF_STATE: &[&str] = &[
    "still protected",
    "stays protected",
    "is protected",
    "are protected",
    "protection is on",
    "protection stays on",
    "puts it back",
];

fn assert_claims_nothing(said: &str) {
    let lowered = said.to_lowercase();
    for claim in CLAIMS_OF_STATE {
        assert!(
            !lowered.contains(claim),
            "{claim:?} with nothing in force, in: {said}"
        );
    }
}

struct Keychain;

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        Ok(Key::from_bytes([7u8; 32]))
    }
    fn delete_history_key(&self) -> Outcome<()> {
        Ok(())
    }
}

/// A machine where the background component cannot run at all.
struct CannotRunHere;

impl ElevationService for CannotRunHere {
    fn helper_status(&self) -> HelperStatus {
        HelperStatus::Unsupported {
            because: "not on this machine".into(),
        }
    }
    fn install_helper(&self) -> Outcome<HelperStatus> {
        Err(Trouble::new("Not on this machine."))
    }
    fn uninstall_helper(&self) -> Outcome<Removal> {
        Ok(Removal::clean())
    }
}

struct Machine {
    _directory: tempfile::TempDir,
    state: AppState,
    hosts_path: PathBuf,
}

/// Nothing of Cairn's on the machine, and no helper to put anything there.
fn nothing_in_force() -> Machine {
    let directory = tempfile::tempdir().unwrap();
    let hosts_path = directory.path().join("hosts");
    std::fs::write(&hosts_path, ORIGINAL_HOSTS).unwrap();

    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();

    let shipped =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");
    seed_missing_lists(&shipped, &CategoryStore::at(&data)).unwrap();

    let state = AppState {
        config: ConfigStore::at(&data),
        data_directory: data.clone(),
        credentials: Box::new(Keychain),
        categories: CategoryStore::at(&data),
        shipped_categories: shipped,
        hosts: Box::new(SystemHosts::at(&hosts_path)),
        helper: Box::new(NoHelper),
        elevation: Box::new(CannotRunHere),
        reserved: ReservedNames::default(),
        now: || 1_700_000_000,
    };

    Machine {
        _directory: directory,
        state,
        hosts_path,
    }
}

impl Machine {
    fn untouched(&self) -> bool {
        std::fs::read(&self.hosts_path).unwrap() == ORIGINAL_HOSTS
    }

    /// Protection was asked for, and nothing reached the machine.
    fn asked_for_but_not_in_force(&self) {
        let mut config = self.state.config.load().unwrap();
        config.intent = ProtectionIntent::On;
        self.state.config.save(&config).unwrap();
    }
}

#[test]
fn the_disclosure_where_the_background_component_cannot_run_claims_nothing() {
    // Given a machine where Cairn's background component cannot run, and
    // nothing of Cairn's is on it
    let machine = nothing_in_force();
    assert_eq!(
        machine.state.get_protection_state().unwrap().status,
        ProtectionStatus::Off
    );

    // When the person reads what Cairn is about to do
    let disclosures = machine.state.get_disclosures();

    // Then no sentence says anything is protected, stays protected, or will be
    // put back — none of that has been checked, and here none of it can happen
    for line in disclosures
        .in_force
        .iter()
        .chain(disclosures.not_covered.iter())
        .chain([
            &disclosures.helper,
            &disclosures.encryption,
            &disclosures.administrator,
        ])
    {
        assert_claims_nothing(line);
    }

    // And it says plainly what cannot happen here
    assert!(
        disclosures.helper.to_lowercase().contains("cannot"),
        "{}",
        disclosures.helper
    );
    assert!(machine.untouched());
}

#[test]
fn not_counting_says_what_it_does_not_change_rather_than_what_is_protected() {
    // Given protection was asked for, and nothing is in force on the machine
    let machine = nothing_in_force();
    machine.asked_for_but_not_in_force();
    assert_ne!(
        machine.state.get_protection_state().unwrap().status,
        ProtectionStatus::InForce
    );

    // When Cairn tries to start counting, as it does every time it opens
    let settled = machine.state.start_counting().unwrap();

    // Then it says it is not counting, and that this changes nothing about
    // what Cairn protects — never that anything is still protected
    let reason = settled.fallback_reason.expect("it says why");
    assert_claims_nothing(&reason);
    assert!(
        reason
            .to_lowercase()
            .contains("does not change what cairn protects"),
        "the sentence has to answer the real question: {reason}"
    );
    assert!(machine.untouched());
}

#[test]
fn delete_all_data_refuses_without_claiming_protection_is_on() {
    // Given protection was asked for, and nothing is in force on the machine
    let machine = nothing_in_force();
    machine.asked_for_but_not_in_force();

    // When the person asks to delete everything
    let refused = machine.state.delete_all_data().unwrap_err();

    // Then the refusal names what they chose, not a state nobody checked
    assert_claims_nothing(&refused.message);
    assert!(machine.untouched());
}

/// Protection was asked for. Nothing in this configuration says whether it is
/// in force, and the sentences written from it cannot say so either.
fn chosen_but_unchecked() -> Config {
    let mut trail = Trail::default();
    for domain in normalize("example.com", &ReservedNames::default()).unwrap() {
        trail.insert(ProtectedEntry::new(
            domain,
            SourceRef::Category(CategoryId::Social),
        ));
    }
    Config {
        trail,
        intent: ProtectionIntent::On,
        ..Config::default()
    }
}

#[test]
fn a_change_still_waiting_says_nothing_changes_rather_than_that_protection_is_on() {
    // Given a reduction that has hours left to wait
    let mut config = chosen_but_unchecked();
    reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &TrustedClock {
            trusted_seconds: 0,
            last_wall_seconds: 1_700_000_000,
            last_monotonic_seconds: 0,
        },
        1_700_000_000,
    )
    .unwrap();

    // When something asks for it to take effect early
    let refused = reduce::apply_reduction(&mut config, 3600).unwrap_err();

    // Then the refusal is about the change, which is all this code knows
    assert_claims_nothing(&refused.message);
    assert!(
        refused.message.to_lowercase().contains("nothing changes"),
        "{}",
        refused.message
    );
}

#[test]
fn taking_something_out_at_once_is_refused_without_claiming_protection_is_on() {
    let mut config = chosen_but_unchecked();

    let refused = reduce::apply_at_once(
        &mut config,
        PendingKind::DisableCategory {
            category: CategoryId::Social,
        },
    )
    .unwrap_err();

    assert_claims_nothing(&refused.message);
}
