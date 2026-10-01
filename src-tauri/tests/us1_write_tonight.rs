//! Slice `write-tonight`: the check-in, through the driving port.
//!
//! `specs/003-reflection-and-history/slices/write-tonight/plan.md`, *Acceptance,
//! as scenarios through the driving port*. Each **When** enters through an IPC
//! command as `AppState` serves it, and each **Then** is observed in what that
//! command returns, or in what a later command returns. Scenario 5 (the key
//! unavailable from the start) is in `fail_closed_journal.rs`.
//!
//! # This file does not compile yet, and that is correct
//!
//! The RED step. `AppState::get_day`, `AppState::save_journal_entry` and
//! `cairn::ipc::state::DayView` do not exist. The compiler errors this file
//! should produce are exactly those: an unresolved import of `DayView`, and no
//! method `get_day` or `save_journal_entry` on `AppState`. Anything else is a
//! mistake in this file.
//!
//! # The API this file requires
//!
//! ```text
//! DayView { reaches: Vec<ReachView>, gaps: Vec<Gap>, coverage_note: Option<String>,
//!           entry: Option<String>, estimate: Option<u32>, sealed: Option<String> }
//! AppState::get_day(&self, day: LocalDate, day_start: i64, day_end: i64) -> DayView
//! AppState::save_journal_entry(&self, day: LocalDate, day_start: i64, day_end: i64, text: &str) -> Result<DayView, String>
//! ```
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use cairn::domain::dates::LocalDate;
use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::state::{DayView, ReachView};
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal,
};
use cairn::store::config::ConfigStore;
use cairn::store::gaps::Gap;
use cairn::store::history::{CoverageGap, History, OpenHistory, HISTORY_FILE};
use cairn::store::key::HistoryKey;

/// The key the fake keychain hands out, and the one the seed opens with, so
/// the `AppState` reads the history the test wrote.
const A_KEY: [u8; 32] = [7u8; 32];

/// 2026-09-30, 00:00 to 24:00 UTC.
const TODAY_START: i64 = 1_790_726_400;
const TODAY_END: i64 = 1_790_812_800;

fn today() -> LocalDate {
    LocalDate::new(2026, 9, 30).unwrap()
}

fn yesterday() -> LocalDate {
    LocalDate::new(2026, 9, 29).unwrap()
}

/// A credential store whose key can be taken away and given back mid-test,
/// for the key that was there when the day was read and is not when the save
/// arrives (G1).
#[derive(Clone)]
struct Keychain {
    available: Arc<AtomicBool>,
}

impl Keychain {
    fn available() -> Self {
        Keychain {
            available: Arc::new(AtomicBool::new(true)),
        }
    }

    fn set_available(&self, on: bool) {
        self.available.store(on, Ordering::SeqCst);
    }
}

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        if self.available.load(Ordering::SeqCst) {
            Ok(Key::from_bytes(A_KEY))
        } else {
            Err(KeyUnavailable::Locked)
        }
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

struct Setup {
    directory: tempfile::TempDir,
    data: PathBuf,
}

fn setup() -> Setup {
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    Setup { directory, data }
}

/// An `AppState` over `setup`'s data directory. Called twice in one test, it is
/// the application restarted.
fn app(setup: &Setup, keychain: &Keychain) -> AppState {
    let shipped = Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");
    AppState {
        config: ConfigStore::at(&setup.data),
        data_directory: setup.data.clone(),
        credentials: Box::new(keychain.clone()),
        categories: CategoryStore::at(&setup.data),
        shipped_categories: shipped,
        hosts: Box::new(SystemHosts::at(setup.directory.path().join("hosts"))),
        helper: Box::new(NoHelper),
        elevation: Box::new(NoElevation),
        reserved: ReservedNames::default(),
        now: || TODAY_START + 20 * 3600,
    }
}

/// The history opened directly, for seeding. Dropped before the `AppState`
/// reads it.
fn seed(data: &Path) -> OpenHistory {
    let History::Open(open) =
        History::open(data, &HistoryKey::Available(Key::from_bytes(A_KEY)))
    else {
        panic!("a fresh directory with a good key should open");
    };
    open
}

fn get_today(state: &AppState) -> DayView {
    state.get_day(today(), TODAY_START, TODAY_END)
}

/// Every byte of the history database and anything SQLite keeps beside it.
fn database_bytes(data: &Path) -> Vec<u8> {
    let mut bytes = Vec::new();
    for entry in std::fs::read_dir(data).unwrap() {
        let path = entry.unwrap().path();
        let name = path.file_name().unwrap().to_string_lossy().to_string();
        if name.starts_with(HISTORY_FILE) {
            bytes.extend(std::fs::read(&path).unwrap());
        }
    }
    assert!(!bytes.is_empty(), "the history database should exist");
    bytes
}

fn contains(haystack: &[u8], needle: &[u8]) -> bool {
    haystack
        .windows(needle.len())
        .any(|window| window == needle)
}

/// The voice rule (SC-019, FR-031): checked on every sentence these tests see.
fn assert_in_voice(sentence: &str) {
    assert!(!sentence.trim().is_empty(), "a refusal says something");
    let lower = sentence.to_lowercase();
    for banned in [
        "failed",
        "fail",
        "denied",
        "violation",
        "relapse",
        "forbidden",
        "you lost",
    ] {
        assert!(
            !lower.contains(banned),
            "{sentence:?} carries the word {banned:?}"
        );
    }
}

// --- Scenario 1: the day, whole ------------------------------------------

#[test]
fn todays_reaches_and_its_gap_arrive_together_with_a_coverage_note_and_no_entry() {
    let setup = setup();
    {
        let open = seed(&setup.data);
        open.record("example.com", TODAY_START + 3600).unwrap();
        open.record("news.example", TODAY_START + 7200).unwrap();
        open.record_gap(&CoverageGap {
            from: TODAY_START + 10 * 3600,
            to: TODAY_START + 13 * 3600,
        })
        .unwrap();
    }
    let state = app(&setup, &Keychain::available());

    let day = get_today(&state);

    assert_eq!(
        day.reaches,
        vec![
            ReachView {
                domain: "example.com".into(),
                at: TODAY_START + 3600,
            },
            ReachView {
                domain: "news.example".into(),
                at: TODAY_START + 7200,
            },
        ]
    );
    assert_eq!(
        day.gaps,
        vec![Gap {
            from: TODAY_START + 10 * 3600,
            to: TODAY_START + 13 * 3600,
        }]
    );
    assert!(day.coverage_note.is_some(), "the unobserved hours are said");
    assert_eq!(day.entry, None);
    assert_eq!(day.sealed, None);
}

// --- Scenario 2: saved, and still there after a restart --------------------

#[test]
fn a_saved_entry_comes_back_in_the_answer_and_after_a_restart() {
    let setup = setup();
    let keychain = Keychain::available();

    let saved = app(&setup, &keychain)
        .save_journal_entry(today(), TODAY_START, TODAY_END, "A long day.")
        .unwrap();
    assert_eq!(saved.entry.as_deref(), Some("A long day."));

    let restarted = app(&setup, &keychain);
    assert_eq!(get_today(&restarted).entry.as_deref(), Some("A long day."));
}

// --- Scenario 3: revised, and the old text gone ----------------------------

#[test]
fn revising_an_entry_replaces_it_and_leaves_no_trace_of_the_old_text() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());

    state
        .save_journal_entry(
            today(),
            TODAY_START,
            TODAY_END,
            "The first words, kept nowhere.",
        )
        .unwrap();
    state
        .save_journal_entry(today(), TODAY_START, TODAY_END, "Revised.")
        .unwrap();

    assert_eq!(get_today(&state).entry.as_deref(), Some("Revised."));

    drop(state);
    let bytes = database_bytes(&setup.data);
    assert!(
        !contains(&bytes, b"The first words, kept nowhere."),
        "the previous text is nowhere in the database file"
    );
    assert!(
        !contains(&bytes, b"Revised."),
        "and the current text is not there in plain either: it is encrypted"
    );
}

// --- Scenario 4 (G2): nothing written is not a save -------------------------

#[test]
fn saving_only_whitespace_is_refused_plainly_and_the_saved_entry_stays() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());
    state
        .save_journal_entry(today(), TODAY_START, TODAY_END, "A long day.")
        .unwrap();

    let refused = state
        .save_journal_entry(today(), TODAY_START, TODAY_END, "   ")
        .expect_err("whitespace is not an entry");
    assert_in_voice(&refused);

    assert_eq!(get_today(&state).entry.as_deref(), Some("A long day."));
}

// --- Scenario 6 (G1): the key goes between the read and the save ------------

#[test]
fn a_save_arriving_after_the_key_went_is_refused_and_nothing_is_stored() {
    let setup = setup();
    let keychain = Keychain::available();
    let state = app(&setup, &keychain);

    let opened = get_today(&state);
    assert_eq!(opened.sealed, None, "the space was offered");

    keychain.set_available(false);
    let refused = state
        .save_journal_entry(
            today(),
            TODAY_START,
            TODAY_END,
            "Written while the keychain locked.",
        )
        .expect_err("a sealed history takes nothing");
    assert_in_voice(&refused);

    keychain.set_available(true);
    assert_eq!(get_today(&state).entry, None, "nothing was stored");
}

// --- Scenario 7 (G3): a day with no reaches is still a day to write about ---

#[test]
fn a_day_with_no_reaches_offers_the_space_and_saves_the_same_way() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());

    let day = get_today(&state);
    assert!(day.reaches.is_empty());
    assert_eq!(day.sealed, None, "nothing sealed: the space is offered");
    assert_eq!(day.entry, None);

    let saved = state
        .save_journal_entry(
            today(),
            TODAY_START,
            TODAY_END,
            "Nothing reached for. Still a day.",
        )
        .unwrap();
    assert_eq!(
        saved.entry.as_deref(),
        Some("Nothing reached for. Still a day.")
    );
    assert!(saved.reaches.is_empty());
    assert_eq!(saved.sealed, None);
    assert_eq!(
        get_today(&state).entry.as_deref(),
        Some("Nothing reached for. Still a day.")
    );
}

// --- One day's entry is that day's ----------------------------------------

#[test]
fn an_entry_written_for_yesterday_is_not_todays() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());

    state
        .save_journal_entry(
            yesterday(),
            TODAY_START - 86_400,
            TODAY_START,
            "Yesterday's words.",
        )
        .unwrap();

    assert_eq!(get_today(&state).entry, None);
}

// --- Voice -----------------------------------------------------------------

#[test]
fn every_refusal_and_every_sealed_sentence_is_in_voice() {
    let setup = setup();
    let keychain = Keychain::available();
    let state = app(&setup, &keychain);

    assert_in_voice(
        &state
            .save_journal_entry(today(), TODAY_START, TODAY_END, "")
            .unwrap_err(),
    );
    assert_in_voice(
        &state
            .save_journal_entry(today(), TODAY_START, TODAY_END, " \n\t ")
            .unwrap_err(),
    );

    keychain.set_available(false);
    assert_in_voice(
        &state
            .save_journal_entry(today(), TODAY_START, TODAY_END, "While sealed.")
            .unwrap_err(),
    );
    let sealed = get_today(&state).sealed.expect("a sealed history says so");
    assert_in_voice(&sealed);
}
