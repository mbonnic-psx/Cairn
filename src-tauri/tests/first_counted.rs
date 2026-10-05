//! Slice `first-counted`: when Cairn first counted, through the driving port.
//!
//! `specs/003-reflection-and-history/slices/first-counted/plan.md`, scenarios
//! 2 (silence, protection off), 4 to 20. Each **When** enters through
//! `AppState`, as the IPC commands serve it, and each **Then** is observed in
//! what it returns or in the bytes of `history.db`. Scenarios 1, 2 (refused
//! sockets) and 3 start a counting session, which is process-wide, and so live
//! in `first_counted_session.rs`.
//!
//! Fixtures are integers, never a zone database. `NOW` is 2026-10-02 20:00 BST.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg_attr(not(feature = "history"), allow(dead_code, unused_imports))]

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use cairn::domain::dates::LocalDate;
use cairn::domain::entries::ReachMode;
use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::state::{DayView, OffsetChange, Patterns, TodaysReaches};
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal,
};
use cairn::store::config::{ChosenBy, ConfigStore, ProtectionIntent, ReachModeSetting};

const A_KEY: [u8; 32] = [7u8; 32];

const HOUR: i64 = 3600;
const DAY: i64 = 86_400;

/// 2026-10-02 20:00 BST.
const NOW: i64 = 1_790_967_600;
/// The instant the first count is fixed at where a test says "first".
const FIRST: i64 = 1_790_000_000;

fn date(text: &str) -> LocalDate {
    serde_json::from_str(&format!("\"{text}\"")).unwrap()
}

/// London's 2026-10-02 (BST, +1 h): the bounds the screen would send.
fn today_start() -> i64 {
    date("2026-10-02").days_since_epoch() * DAY - HOUR
}

fn today_end() -> i64 {
    today_start() + DAY
}

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

fn app(setup: &Setup, keychain: &Keychain) -> AppState {
    let shipped = Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");
    AppState {
        config: ConfigStore::at(&setup.data),
        data_directory: setup.data.clone(),
        credentials: Box::new(keychain.clone()),
        categories: CategoryStore::at(&setup.data),
        shipped_categories: shipped,
        shipped_quotes: PathBuf::from("no-quotes-here.json"),
        hosts: Box::new(SystemHosts::at(setup.directory.path().join("hosts"))),
        helper: Box::new(NoHelper),
        elevation: Box::new(NoElevation),
        reserved: ReservedNames::default(),
        now: || NOW,
        roll: || 0,
    }
}

/// The opening range the screen sends today: 2026-09-05 to 2026-10-02, London.
fn ask_range(state: &AppState) -> Patterns {
    let first = date("2026-09-05");
    let last = date("2026-10-02");
    let start = first.days_since_epoch() * DAY - HOUR;
    let end = today_end();
    state.summarize_reaches(
        first,
        last,
        start,
        end,
        &[OffsetChange {
            from: start,
            offset: HOUR,
        }],
    )
}

fn ask_today(state: &AppState) -> TodaysReaches {
    state.list_todays_reaches(today_start(), today_end())
}

fn ask_day(state: &AppState) -> DayView {
    state.get_day(date("2026-10-02"), today_start(), today_end())
}

/// What the three reads say, in the order the plan names them.
fn all_three(state: &AppState) -> [Option<i64>; 3] {
    [
        ask_range(state).first_counted,
        ask_today(state).first_counted,
        ask_day(state).first_counted,
    ]
}

// --- The wire shape (scenario 10) ----------------------------------------------------

fn keys_of(value: &impl serde::Serialize) -> Vec<String> {
    let value = serde_json::to_value(value).unwrap();
    let mut keys: Vec<String> = value.as_object().unwrap().keys().cloned().collect();
    keys.sort();
    keys
}

#[cfg(feature = "history")]
mod with_history {
    use super::*;

    use cairn::store::history::{History, OpenHistory, HISTORY_FILE};
    use cairn::store::key::HistoryKey;

    fn seed(data: &Path) -> OpenHistory {
        let History::Open(open) =
            History::open(data, &HistoryKey::Available(Key::from_bytes(A_KEY)))
        else {
            panic!("a fresh directory with a good key should open");
        };
        open
    }

    fn history_bytes(data: &Path) -> Option<Vec<u8>> {
        std::fs::read(data.join(HISTORY_FILE)).ok()
    }

    /// A `history.db` as the build before this slice wrote it: the four tables,
    /// no `first_count`, under the same key.
    fn legacy(data: &Path, reaches: &[i64], gaps: &[(i64, i64)]) {
        let connection = rusqlite::Connection::open(data.join(HISTORY_FILE)).unwrap();
        let hex: String = A_KEY.iter().map(|byte| format!("{byte:02x}")).collect();
        connection
            .pragma_update(None, "key", format!("x'{hex}'"))
            .unwrap();
        connection
            .execute_batch(
                "CREATE TABLE reaches (domain TEXT NOT NULL, at INTEGER NOT NULL);
                 CREATE INDEX reaches_at ON reaches (at);
                 CREATE TABLE coverage_gaps (from_at INTEGER NOT NULL, to_at INTEGER NOT NULL);
                 CREATE TABLE journal_entries (
                     day TEXT PRIMARY KEY, text TEXT NOT NULL, written_at INTEGER NOT NULL);
                 CREATE TABLE reach_estimates (day TEXT PRIMARY KEY, count INTEGER NOT NULL);",
            )
            .unwrap();
        for at in reaches {
            connection
                .execute(
                    "INSERT INTO reaches (domain, at) VALUES ('a.example', ?1)",
                    [at],
                )
                .unwrap();
        }
        for (from, to) in gaps {
            connection
                .execute(
                    "INSERT INTO coverage_gaps (from_at, to_at) VALUES (?1, ?2)",
                    [from, to],
                )
                .unwrap();
        }
    }

    // Scenario 4
    #[test]
    fn an_install_that_holds_history_takes_the_earliest_moment_it_recorded_anything() {
        let (r1, r2, g) = (FIRST + 10 * HOUR, FIRST + 20 * HOUR, FIRST + 5 * HOUR);

        let setup = setup();
        legacy(&setup.data, &[r1, r2], &[(g, g + HOUR)]);
        let state = app(&setup, &Keychain::available());
        assert_eq!(all_three(&state), [Some(g); 3], "the gap came first");

        let setup = self::setup();
        legacy(&setup.data, &[r2, r1], &[]);
        let state = app(&setup, &Keychain::available());
        assert_eq!(all_three(&state), [Some(r1); 3], "reaches only");

        let setup = self::setup();
        legacy(&setup.data, &[], &[]);
        let state = app(&setup, &Keychain::available());
        assert_eq!(all_three(&state), [None; 3], "neither");
        seed(&setup.data).note_counting(NOW).unwrap();
        assert_eq!(
            all_three(&state),
            [Some(NOW); 3],
            "a later session makes it"
        );
    }

    // Scenario 5
    #[test]
    fn the_fill_runs_once_and_a_later_gap_from_before_it_does_not_move_it() {
        let (r1, g) = (FIRST + 10 * HOUR, FIRST + 5 * HOUR);
        let setup = setup();
        legacy(&setup.data, &[r1], &[(g, g + HOUR)]);
        let state = app(&setup, &Keychain::available());
        assert_eq!(all_three(&state), [Some(g); 3]);

        seed(&setup.data)
            .record_gap(&cairn::store::history::CoverageGap {
                from: g - 3 * HOUR,
                to: g - 2 * HOUR,
            })
            .unwrap();

        assert_eq!(
            all_three(&state),
            [Some(g); 3],
            "gaps are read by the fill only"
        );
    }

    // Rule 6 for the fill: a sealed open writes nothing, and the fill waits.
    #[test]
    fn with_the_key_unavailable_the_file_is_not_opened_and_the_fill_waits() {
        let r1 = FIRST + 10 * HOUR;
        let setup = setup();
        legacy(&setup.data, &[r1], &[]);
        let keychain = Keychain::available();
        keychain.set_available(false);
        let state = app(&setup, &keychain);
        let before = history_bytes(&setup.data);

        assert_eq!(all_three(&state), [None; 3]);
        assert_eq!(history_bytes(&setup.data), before, "bytes unchanged");

        keychain.set_available(true);
        assert_eq!(
            all_three(&state),
            [Some(r1); 3],
            "the fill happens on the first open"
        );
    }

    // Scenario 10
    #[test]
    fn the_three_answers_hold_ten_five_and_seven_keys_and_first_counted_is_an_integer() {
        let setup = setup();
        seed(&setup.data).note_counting(FIRST).unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = serde_json::to_value(ask_range(&state)).unwrap();
        assert_eq!(patterns["first_counted"], serde_json::json!(FIRST));
        assert_eq!(keys_of(&ask_range(&state)).len(), 10);
        let today = serde_json::to_value(ask_today(&state)).unwrap();
        assert_eq!(today["first_counted"], serde_json::json!(FIRST));
        assert_eq!(keys_of(&ask_today(&state)).len(), 5);
        let day = serde_json::to_value(ask_day(&state)).unwrap();
        assert_eq!(day["first_counted"], serde_json::json!(FIRST));
        assert_eq!(keys_of(&ask_day(&state)).len(), 7);
    }

    #[test]
    fn where_cairn_has_never_counted_first_counted_is_null_not_absent() {
        let setup = setup();
        let state = app(&setup, &Keychain::available());

        for value in [
            serde_json::to_value(ask_range(&state)).unwrap(),
            serde_json::to_value(ask_today(&state)).unwrap(),
            serde_json::to_value(ask_day(&state)).unwrap(),
        ] {
            assert_eq!(value["first_counted"], serde_json::Value::Null);
            assert!(value.as_object().unwrap().contains_key("first_counted"));
        }
    }

    // Scenario 2: silence chosen, and protection off, never reach the note.
    #[test]
    fn silence_chosen_and_protection_off_each_leave_every_answer_at_null() {
        for (intent, mode) in [
            (ProtectionIntent::On, ReachMode::Silent),
            (ProtectionIntent::Off, ReachMode::Counted),
        ] {
            let setup = setup();
            let state = app(&setup, &Keychain::available());
            let mut config = state.config.load().unwrap();
            config.intent = intent;
            config.reach_mode = ReachModeSetting {
                mode,
                chosen_by: ChosenBy::Person,
                fallback_reason: None,
            };
            state.config.save(&config).unwrap();

            state.start_counting().unwrap();

            assert_eq!(all_three(&state), [None, None, None]);
        }
    }

    // Scenario 18
    #[test]
    fn saving_an_entry_returns_the_day_with_first_counted() {
        let setup = setup();
        seed(&setup.data).note_counting(FIRST).unwrap();
        let state = app(&setup, &Keychain::available());

        let saved = state
            .save_journal_entry(
                date("2026-10-02"),
                today_start(),
                today_end(),
                "a quiet day",
            )
            .unwrap();

        assert_eq!(saved.first_counted, Some(FIRST));
        assert_eq!(saved.entry.as_deref(), Some("a quiet day"));
    }

    // Scenario 19: a sealed history writes nothing and reads nothing.
    #[test]
    fn sealed_answers_carry_null_and_change_no_file() {
        let setup = setup();
        seed(&setup.data).note_counting(FIRST).unwrap();
        let keychain = Keychain::available();
        let state = app(&setup, &keychain);
        let before = history_bytes(&setup.data);
        keychain.set_available(false);

        let range = ask_range(&state);
        let today = ask_today(&state);
        let day = ask_day(&state);

        assert!(range.sealed.is_some() && today.sealed.is_some() && day.sealed.is_some());
        assert_eq!(all_three(&state), [None, None, None]);
        assert_eq!(
            history_bytes(&setup.data),
            before,
            "history.db is untouched"
        );
    }
}

// --- Scenario 20: a build without the history ----------------------------------------

#[cfg(not(feature = "history"))]
#[test]
fn a_build_without_the_history_seals_every_answer_with_null() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());
    let said = "This build of Cairn does not keep a history. Protection is unaffected.";

    let range = ask_range(&state);
    let today = ask_today(&state);
    let day = ask_day(&state);

    assert_eq!(range.sealed.as_deref(), Some(said));
    assert_eq!(today.sealed.as_deref(), Some(said));
    assert_eq!(day.sealed.as_deref(), Some(said));
    assert_eq!(all_three(&state), [None, None, None]);
}
