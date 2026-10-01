//! Slice `quote`: the optional quote, through the driving port.
//!
//! `specs/003-reflection-and-history/slices/quote/plan.md`, *Acceptance, as
//! scenarios through the driving port*, scenarios 1–7. Each **When** enters
//! through an IPC command as `AppState` serves it, and each **Then** is observed
//! in what that command, or a later one, returns.
//!
//! Nothing here needs the history: a quote is not about the day, and the switch
//! is a setting. So this runs under `--no-default-features`.
//!
//! # The API this file requires
//!
//! ```text
//! AppState { .., shipped_quotes: PathBuf, roll: fn() -> u64 }
//! AppState::get_quote(&self) -> Option<String>
//! ```
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::{Path, PathBuf};

use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal,
};
use cairn::store::config::ConfigStore;

/// 2026-09-30, 20:00 UTC, and the same hour a day later.
const AN_EVENING: i64 = 1_790_798_400;
const THE_NEXT_EVENING: i64 = AN_EVENING + 86_400;

/// The set Cairn ships, exactly as it ships.
fn bundled() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/quotes/quotes.json")
}

fn bundled_lines() -> Vec<String> {
    let text = std::fs::read_to_string(bundled()).unwrap();
    let value: serde_json::Value = serde_json::from_str(&text).unwrap();
    value["quotes"]
        .as_array()
        .unwrap()
        .iter()
        .map(|line| line.as_str().unwrap().to_string())
        .collect()
}

/// A keychain that has a key, or one that never does.
struct Keychain {
    available: bool,
}

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        if self.available {
            Ok(Key::from_bytes([7u8; 32]))
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

struct Machine {
    directory: tempfile::TempDir,
    data: PathBuf,
}

fn a_machine() -> Machine {
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    Machine { directory, data }
}

/// Cairn over `machine`'s data, with the set at `quotes`, the roll and the
/// clock fixed, and the key there or not.
fn cairn(
    machine: &Machine,
    quotes: PathBuf,
    roll: fn() -> u64,
    now: fn() -> i64,
    key: bool,
) -> AppState {
    AppState {
        config: ConfigStore::at(&machine.data),
        data_directory: machine.data.clone(),
        credentials: Box::new(Keychain { available: key }),
        categories: CategoryStore::at(&machine.data),
        shipped_categories: machine.directory.path().join("shipped"),
        shipped_quotes: quotes,
        hosts: Box::new(SystemHosts::at(machine.directory.path().join("hosts"))),
        helper: Box::new(NoHelper),
        elevation: Box::new(NoElevation),
        reserved: ReservedNames::default(),
        now,
        roll,
    }
}

// Scenario 1 — the roll names the line, exactly as shipped (FR-009).

#[test]
fn the_roll_names_a_line_of_the_bundled_set() {
    let machine = a_machine();
    let lines = bundled_lines();
    assert!(lines.len() > 3, "the bundled set should have lines in it");

    let third = cairn(&machine, bundled(), || 2, || AN_EVENING, true);
    assert_eq!(third.get_quote(), Some(lines[2].clone()));

    // A roll past the end wraps rather than falling off it.
    let wrapped = cairn(&machine, bundled(), || 1_000_003, || AN_EVENING, true);
    let expected = &lines[(1_000_003 % lines.len() as u64) as usize];
    assert_eq!(wrapped.get_quote().as_ref(), Some(expected));
}

// Scenario 2 — random, and never tied to the date (Q1, R6).

#[test]
fn another_roll_on_the_same_evening_can_be_another_line() {
    let machine = a_machine();
    let first = cairn(&machine, bundled(), || 0, || AN_EVENING, true);
    let second = cairn(&machine, bundled(), || 1, || AN_EVENING, true);

    assert_ne!(first.get_quote(), second.get_quote());
}

#[test]
fn the_date_does_not_choose_the_line() {
    let machine = a_machine();
    let tonight = cairn(&machine, bundled(), || 5, || AN_EVENING, true);
    let tomorrow = cairn(&machine, bundled(), || 5, || THE_NEXT_EVENING, true);

    assert!(tonight.get_quote().is_some());
    assert_eq!(tonight.get_quote(), tomorrow.get_quote());
}

#[test]
fn each_ask_is_a_fresh_roll() {
    // The core does not remember a line between calls: keeping it while the
    // check-in is open is the screen's work, and reopening may bring another.
    fn counting() -> u64 {
        use std::sync::atomic::{AtomicU64, Ordering};
        static NEXT: AtomicU64 = AtomicU64::new(0);
        NEXT.fetch_add(1, Ordering::SeqCst)
    }
    let machine = a_machine();
    let state = cairn(&machine, bundled(), counting, || AN_EVENING, true);

    let first = state.get_quote();
    let second = state.get_quote();
    assert!(first.is_some() && second.is_some());
    assert_ne!(first, second);
}

// Scenario 3 — no set, or nothing in it, is no quote, and that is complete.

#[test]
fn a_missing_set_is_no_quote() {
    let machine = a_machine();
    let nowhere = machine.directory.path().join("no-such-quotes.json");
    let state = cairn(&machine, nowhere, || 0, || AN_EVENING, true);

    assert_eq!(state.get_quote(), None);
}

#[test]
fn an_empty_or_blank_set_is_no_quote() {
    let machine = a_machine();
    for (name, body) in [
        ("empty.json", r#"{ "id": "quotes", "quotes": [] }"#),
        ("blank.json", r#"{ "id": "quotes", "quotes": ["", "   "] }"#),
    ] {
        let path = machine.directory.path().join(name);
        std::fs::write(&path, body).unwrap();
        for roll in [|| 0, || 1] {
            let state = cairn(&machine, path.clone(), roll, || AN_EVENING, true);
            assert_eq!(state.get_quote(), None, "{name}");
        }
    }
}

#[test]
fn blank_lines_are_never_shown() {
    let machine = a_machine();
    let path = machine.directory.path().join("some-blank.json");
    std::fs::write(&path, r#"{ "quotes": ["", "The window is open.", "  "] }"#).unwrap();

    for roll in [|| 0, || 1, || 2, || 3] {
        let state = cairn(&machine, path.clone(), roll, || AN_EVENING, true);
        assert_eq!(state.get_quote().as_deref(), Some("The window is open."));
    }
}

#[test]
fn an_unreadable_set_is_no_quote() {
    let machine = a_machine();
    let path = machine.directory.path().join("broken.json");
    std::fs::write(&path, "{ this is not json").unwrap();
    let state = cairn(&machine, path, || 0, || AN_EVENING, true);

    assert_eq!(state.get_quote(), None);
}

// Scenario 6, the quote's half — the key has nothing to do with it.

#[test]
fn a_quote_shows_with_the_key_unavailable() {
    let machine = a_machine();
    let lines = bundled_lines();
    let sealed = cairn(&machine, bundled(), || 4, || AN_EVENING, false);

    assert_eq!(sealed.get_quote(), Some(lines[4].clone()));
}

#[test]
fn every_bundled_line_can_come_up_as_written() {
    // Each line of the set can come up, and comes up whole: nothing trimmed
    // from what was reviewed (T007), and nothing added to it.
    fn counting() -> u64 {
        use std::sync::atomic::{AtomicU64, Ordering};
        static NEXT: AtomicU64 = AtomicU64::new(0);
        NEXT.fetch_add(1, Ordering::SeqCst)
    }
    let machine = a_machine();
    let lines = bundled_lines();
    let state = cairn(&machine, bundled(), counting, || AN_EVENING, true);

    let shown: Vec<String> = (0..lines.len())
        .map(|_| state.get_quote().unwrap())
        .collect();
    assert_eq!(shown, lines);
}
