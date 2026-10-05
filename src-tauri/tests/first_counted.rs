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

    /// Insert a reach straight into `reaches`, as an older build would write it.
    fn insert_as_an_older_build(data: &Path, at: i64) {
        let connection = rusqlite::Connection::open(data.join(HISTORY_FILE)).unwrap();
        let hex: String = A_KEY.iter().map(|byte| format!("{byte:02x}")).collect();
        connection
            .pragma_update(None, "key", format!("x'{hex}'"))
            .unwrap();
        connection
            .execute(
                "INSERT INTO reaches (domain, at) VALUES ('old.example', ?1)",
                [at],
            )
            .unwrap();
    }

    /// The range of the one UTC date `at` falls on, asked of the history.
    fn that_date(state: &AppState, at: i64) -> Patterns {
        let day = LocalDate::from_days_since_epoch(at.div_euclid(DAY));
        let start = day.days_since_epoch() * DAY;
        state.summarize_reaches(
            day,
            day,
            start,
            start + DAY,
            &[OffsetChange {
                from: start,
                offset: 0,
            }],
        )
    }

    // Scenario 6
    #[test]
    fn a_reach_earlier_than_the_first_count_moves_it_back_and_a_later_one_does_not() {
        let setup = setup();
        let open = seed(&setup.data);
        open.note_counting(FIRST).unwrap();
        let state = app(&setup, &Keychain::available());

        let earlier = FIRST - 3 * DAY;
        open.record("a.example", earlier).unwrap();
        assert_eq!(all_three(&state), [Some(earlier); 3]);
        let that_day = that_date(&state, earlier);
        assert_eq!(
            that_day.by_site.len(),
            1,
            "the reach is in that date's range"
        );
        assert_eq!(that_day.by_site[0].domain, "a.example");

        open.record("a.example", NOW).unwrap();
        assert_eq!(
            all_three(&state),
            [Some(earlier); 3],
            "a later reach changes nothing"
        );
    }

    // Scenario 7
    #[test]
    fn a_reach_written_by_an_older_build_before_the_first_count_is_settled_at_the_next_open(
    ) {
        let setup = setup();
        seed(&setup.data).note_counting(FIRST).unwrap();
        insert_as_an_older_build(&setup.data, FIRST - HOUR);
        let state = app(&setup, &Keychain::available());

        assert_eq!(all_three(&state), [Some(FIRST - HOUR); 3]);
    }

    #[test]
    fn an_ordinary_open_moves_nothing_and_a_reach_after_the_first_count_settles_nothing()
    {
        let setup = setup();
        seed(&setup.data).note_counting(FIRST).unwrap();
        insert_as_an_older_build(&setup.data, FIRST + HOUR);
        let state = app(&setup, &Keychain::available());

        assert_eq!(all_three(&state), [Some(FIRST); 3]);
    }

    #[test]
    fn a_reach_with_no_row_at_all_settles_the_row_to_that_reach() {
        let setup = setup();
        legacy(&setup.data, &[], &[]);
        drop(seed(&setup.data));
        insert_as_an_older_build(&setup.data, FIRST + HOUR);
        let state = app(&setup, &Keychain::available());

        assert_eq!(all_three(&state), [Some(FIRST + HOUR); 3]);
    }

    // Scenario 8
    #[test]
    fn deleting_reach_history_never_moves_the_first_count() {
        let setup = setup();
        let open = seed(&setup.data);
        open.note_counting(FIRST).unwrap();
        open.record("a.example", FIRST + HOUR).unwrap();
        open.record_gap(&cairn::store::history::CoverageGap {
            from: FIRST + 2 * HOUR,
            to: FIRST + 3 * HOUR,
        })
        .unwrap();
        let state = app(&setup, &Keychain::available());

        open.delete_reach_history(FIRST - DAY, NOW).unwrap();
        assert_eq!(all_three(&state), [Some(FIRST); 3]);
        assert!(ask_range(&state).gaps.is_empty(), "no gap is left to state");

        open.record("a.example", FIRST + HOUR).unwrap();
        open.delete_all_reach_history().unwrap();
        assert_eq!(all_three(&state), [Some(FIRST); 3]);
        assert!(ask_range(&state).gaps.is_empty());
    }

    // Scenario 9
    #[test]
    fn deleting_all_data_removes_the_file_and_a_fresh_key_says_null() {
        let setup = setup();
        seed(&setup.data).note_counting(FIRST).unwrap();
        let state = app(&setup, &Keychain::available());
        assert_eq!(all_three(&state), [Some(FIRST); 3]);

        state.delete_all_data().unwrap();

        assert!(!setup.data.join(HISTORY_FILE).exists());
        assert_eq!(all_three(&state), [None; 3]);
    }

    /// The opening range of a screen in London, 2026-09-05 to 2026-10-02.
    fn rows_of(patterns: &Patterns) -> Vec<(String, String, u32)> {
        serde_json::to_value(&patterns.movement)
            .unwrap()
            .as_array()
            .unwrap()
            .iter()
            .map(|row| {
                (
                    row["day"].as_str().unwrap().to_string(),
                    row["seen"].as_str().unwrap().to_string(),
                    row["count"].as_u64().unwrap() as u32,
                )
            })
            .collect()
    }

    fn range_in_london(state: &AppState, first: &str, last: &str) -> Patterns {
        let (first, last) = (date(first), date(last));
        let start = first.days_since_epoch() * DAY - HOUR;
        let end = (last.days_since_epoch() + 1) * DAY - HOUR;
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

    /// 2026-10-01 14:14 BST: 14 h 14 m of that date is before it.
    const STARTED: i64 = 1_790_860_440;
    /// 2026-10-01 15:00 BST.
    const REACH_ONE: i64 = 1_790_863_200;
    /// 2026-10-02 09:30 BST.
    const REACH_TWO: i64 = 1_790_929_800;

    fn counting_since_the_afternoon(data: &Path) {
        let open = seed(data);
        open.note_counting(STARTED).unwrap();
        open.record("a.example", REACH_ONE).unwrap();
        open.record("a.example", REACH_TWO).unwrap();
    }

    // Scenario 11
    #[test]
    fn a_range_that_holds_the_first_count_reads_none_then_part_then_whole() {
        let setup = setup();
        counting_since_the_afternoon(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns = range_in_london(&state, "2026-09-05", "2026-10-02");
        let rows = rows_of(&patterns);

        assert_eq!(rows.len(), 28);
        for row in &rows[..26] {
            assert_eq!((row.1.as_str(), row.2), ("none", 0), "{row:?}");
        }
        assert_eq!(
            (rows[26].0.as_str(), rows[26].1.as_str(), rows[26].2),
            ("2026-10-01", "part", 1)
        );
        assert_eq!(
            (rows[27].0.as_str(), rows[27].1.as_str(), rows[27].2),
            ("2026-10-02", "whole", 1)
        );
        assert!(
            serde_json::to_value(&patterns.movement).unwrap()[27]["so_far"]
                .as_bool()
                .unwrap()
        );
        assert!(patterns.gaps.is_empty());
        assert_eq!(patterns.coverage_note, None);
        assert_eq!(patterns.first_counted, Some(STARTED));
    }

    // Scenario 12
    #[test]
    fn the_range_the_screen_sends_is_two_rows_and_no_note() {
        let setup = setup();
        counting_since_the_afternoon(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns = range_in_london(&state, "2026-10-01", "2026-10-02");

        assert_eq!(
            rows_of(&patterns)
                .iter()
                .map(|row| row.1.as_str())
                .collect::<Vec<_>>(),
            ["part", "whole"]
        );
        assert_eq!(patterns.coverage_note, None);
    }

    // Scenario 13
    #[test]
    fn an_early_start_leaves_that_date_whole() {
        let setup = setup();
        let open = seed(&setup.data);
        open.note_counting(1_790_838_000).unwrap(); // 2026-10-01 08:00 BST
        let state = app(&setup, &Keychain::available());

        let patterns = range_in_london(&state, "2026-10-01", "2026-10-02");

        assert_eq!(
            rows_of(&patterns)[0].1,
            "whole",
            "8 h of 24 unseen is not more than half"
        );
    }

    // Scenario 14
    #[test]
    fn a_gap_that_began_before_the_first_count_is_stated_from_it() {
        let setup = setup();
        let open = seed(&setup.data);
        open.note_counting(STARTED).unwrap();
        let gap_from = 1_790_805_600; // 2026-09-30 23:00 BST
        let gap_to = 1_790_866_800; // 2026-10-01 16:00 BST
        open.record_gap(&cairn::store::history::CoverageGap {
            from: gap_from,
            to: gap_to,
        })
        .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = range_in_london(&state, "2026-09-05", "2026-10-02");

        assert_eq!(
            patterns
                .gaps
                .iter()
                .map(|gap| (gap.from, gap.to))
                .collect::<Vec<_>>(),
            vec![(STARTED, gap_to)]
        );
        let note = patterns
            .coverage_note
            .expect("the hours after the first count are said");
        assert!(note.contains("about 2 hours"), "{note}");
    }

    // Scenario 15
    #[test]
    fn where_cairn_has_never_counted_every_row_is_none_and_gaps_are_as_recorded() {
        let setup = setup();
        let open = seed(&setup.data);
        let gap = cairn::store::history::CoverageGap {
            from: 1_790_000_000,
            to: 1_790_003_600,
        };
        open.record_gap(&gap).unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = range_in_london(&state, "2026-09-05", "2026-10-02");

        assert_eq!(patterns.first_counted, None);
        assert!(rows_of(&patterns)
            .iter()
            .all(|row| row.1 == "none" && row.2 == 0));
        assert_eq!(
            patterns
                .gaps
                .iter()
                .map(|g| (g.from, g.to))
                .collect::<Vec<_>>(),
            vec![(gap.from, gap.to)]
        );
    }

    // Scenario 16
    #[test]
    fn a_range_wholly_before_the_first_count_is_none_throughout() {
        let setup = setup();
        counting_since_the_afternoon(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns = range_in_london(&state, "2026-09-05", "2026-09-30");

        let rows = rows_of(&patterns);
        assert_eq!(rows.len(), 26);
        assert!(
            rows.iter().all(|row| row.1 == "none" && row.2 == 0),
            "{rows:?}"
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
