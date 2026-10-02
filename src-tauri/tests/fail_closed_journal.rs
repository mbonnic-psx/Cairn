//! The check-in fails closed (T026, FR-029, FR-036).
//!
//! Scenario 5 of `specs/003-reflection-and-history/slices/write-tonight/plan.md`:
//! when the key is unavailable, `get_day` says so in one plain sentence and
//! shows nothing else, and `save_journal_entry` refuses rather than accept
//! text it cannot keep. Nothing is written: not a new database where there
//! was none, and not a byte of one that was already there and cannot be read.
//!
//! # This file does not compile yet, and that is correct
//!
//! The RED step. The expected errors are exactly: an unresolved import of
//! `cairn::ipc::state::DayView`, and no method `get_day` or
//! `save_journal_entry` on `AppState`. Anything else is a mistake here.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::{Path, PathBuf};

use cairn::domain::dates::LocalDate;
use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::state::DayView;
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal,
};
use cairn::store::config::ConfigStore;
use cairn::store::history::HISTORY_FILE;

/// 2026-09-30, 00:00 to 24:00 UTC.
const TODAY_START: i64 = 1_790_726_400;
const TODAY_END: i64 = 1_790_812_800;

fn today() -> LocalDate {
    LocalDate::new(2026, 9, 30).unwrap()
}

/// A credential store that never has the key.
#[derive(Clone)]
struct LockedKeychain;

impl CredentialStore for LockedKeychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        Err(KeyUnavailable::Locked)
    }
    fn delete_history_key(&self) -> Outcome<()> {
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

fn app(root: &Path, data: &Path) -> AppState {
    AppState {
        config: ConfigStore::at(data),
        data_directory: data.to_path_buf(),
        credentials: Box::new(LockedKeychain),
        categories: CategoryStore::at(data),
        shipped_categories: Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources/categories"),
        shipped_quotes: PathBuf::from("no-quotes-here.json"),
        hosts: Box::new(SystemHosts::at(root.join("hosts"))),
        helper: Box::new(NoHelper),
        elevation: Box::new(NoElevation),
        reserved: ReservedNames::default(),
        now: || TODAY_START + 20 * 3600,
        roll: || 0,
    }
}

fn data_directory(root: &Path) -> PathBuf {
    let data = root.join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    data
}

/// Every file name in the data directory that belongs to the history.
fn history_files(data: &Path) -> Vec<String> {
    let mut names: Vec<String> = std::fs::read_dir(data)
        .unwrap()
        .map(|entry| entry.unwrap().file_name().to_string_lossy().to_string())
        .filter(|name| name.starts_with(HISTORY_FILE))
        .collect();
    names.sort();
    names
}

fn assert_sealed_and_empty(day: &DayView) {
    let sentence = day.sealed.as_deref().expect("a sealed history says so");
    assert!(!sentence.trim().is_empty(), "the sentence says something");
    assert!(day.reaches.is_empty(), "no reaches shown while sealed");
    assert!(day.gaps.is_empty(), "no gaps shown while sealed");
    assert_eq!(day.entry, None, "no entry shown while sealed");
    assert_eq!(day.estimate, None, "no estimate shown while sealed");
}

#[test]
fn with_no_key_the_day_is_one_plain_sentence_and_nothing_else() {
    let root = tempfile::tempdir().unwrap();
    let data = data_directory(root.path());
    let state = app(root.path(), &data);

    assert_sealed_and_empty(&state.get_day(today(), TODAY_START, TODAY_END));
}

#[test]
fn with_no_key_a_save_is_refused_and_no_database_is_created() {
    let root = tempfile::tempdir().unwrap();
    let data = data_directory(root.path());
    let state = app(root.path(), &data);

    let _ = state.get_day(today(), TODAY_START, TODAY_END);
    let refused = state
        .save_journal_entry(
            today(),
            TODAY_START,
            TODAY_END,
            "Words with nowhere safe to go.",
        )
        .expect_err("a sealed history takes nothing");
    assert!(!refused.trim().is_empty(), "the refusal is a sentence");

    assert!(
        history_files(&data).is_empty(),
        "nothing was written: no history database where there was none, found {:?}",
        history_files(&data)
    );
}

#[test]
fn with_no_key_a_history_already_there_is_left_byte_for_byte() {
    let root = tempfile::tempdir().unwrap();
    let data = data_directory(root.path());
    let existing = b"bytes this build cannot read and must not replace".to_vec();
    std::fs::write(data.join(HISTORY_FILE), &existing).unwrap();
    let state = app(root.path(), &data);

    assert_sealed_and_empty(&state.get_day(today(), TODAY_START, TODAY_END));
    let refused = state
        .save_journal_entry(
            today(),
            TODAY_START,
            TODAY_END,
            "Words with nowhere safe to go.",
        )
        .expect_err("a sealed history takes nothing");
    assert!(!refused.trim().is_empty(), "the refusal is a sentence");

    assert_eq!(
        std::fs::read(data.join(HISTORY_FILE)).unwrap(),
        existing,
        "the unreadable history is untouched"
    );
    assert_eq!(
        history_files(&data),
        vec![HISTORY_FILE.to_string()],
        "and nothing was written beside it"
    );
}
