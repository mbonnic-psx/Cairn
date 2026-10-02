//! Slice `history-movement`: the days of a range as rows, through the driving
//! port.
//!
//! `specs/003-reflection-and-history/slices/history-movement/plan.md`,
//! *Acceptance, as scenarios through the driving port*, 1 to 22 and the wire.
//! Each **When** enters through `AppState::summarize_reaches`, as the IPC
//! command serves it, with the offsets the interface would send written out as
//! fixtures, and each **Then** is observed in what it returns.
//! `patterns_movement.rs` holds the grouping's properties.
//!
//! Fixtures are integers, never a zone database: the core knows no zone.
//! London's clocks go back at 2026-10-25 01:00 UTC and forward at 2026-03-29
//! 01:00 UTC. `NOW` is 2026-10-02 20:00 BST, a Friday.
//!
//! The history-reading scenarios need the history store and are compiled only
//! with it; the build that keeps none has its own, at the end.
#![allow(clippy::unwrap_used, clippy::expect_used)]
// The fixtures are for the scenarios that read the history; the build without it
// has only its own.
#![cfg_attr(not(feature = "history"), allow(dead_code, unused_imports))]

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use cairn::domain::dates::LocalDate;
use cairn::domain::normalize::ReservedNames;
use cairn::domain::patterns::{MovementRow, Span};
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::state::{OffsetChange, Patterns};
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal,
};
use cairn::store::config::ConfigStore;

const A_KEY: [u8; 32] = [7u8; 32];

const HOUR: i64 = 3600;
const DAY: i64 = 86_400;

/// 2026-10-25 01:00 UTC: London's clocks go back, +3 600 to 0.
#[allow(dead_code)]
const AUTUMN: i64 = 1_792_890_000;
/// 2026-03-29 01:00 UTC: London's clocks go forward, 0 to +3 600.
#[allow(dead_code)]
const SPRING: i64 = 1_774_746_000;
/// 2026-10-02 20:00 BST.
const NOW: i64 = 1_790_967_600;

fn date(text: &str) -> LocalDate {
    serde_json::from_str(&format!("\"{text}\"")).unwrap()
}

fn midnight(text: &str) -> i64 {
    date(text).days_since_epoch() * DAY
}

fn change(from: i64, offset: i64) -> OffsetChange {
    OffsetChange { from, offset }
}

/// A range of days, with the bounds the interface would compute for a zone
/// (`start_offset` and `end_offset` east of UTC at its two ends) and the offsets
/// in force across it.
struct Range {
    first: LocalDate,
    last: LocalDate,
    start: i64,
    end: i64,
    offsets: Vec<OffsetChange>,
}

impl Range {
    /// `later` are the changes after `start_offset`, as `(instant, offset)`.
    fn new(
        first: &str,
        last: &str,
        start_offset: i64,
        end_offset: i64,
        later: &[(i64, i64)],
    ) -> Self {
        let after_last =
            LocalDate::from_days_since_epoch(date(last).days_since_epoch() + 1);
        let start = midnight(first) - start_offset;
        let end = after_last.days_since_epoch() * DAY - end_offset;
        let mut offsets = vec![change(start, start_offset)];
        offsets.extend(later.iter().map(|(from, offset)| change(*from, *offset)));
        Range {
            first: date(first),
            last: date(last),
            start,
            end,
            offsets,
        }
    }

    /// Scenario 1's range: 2026-09-05 to 2026-10-02 in London, 28 dates, BST all
    /// the way.
    fn four_weeks() -> Self {
        Range::new("2026-09-05", "2026-10-02", HOUR, HOUR, &[])
    }

    /// 2026-10-02 alone.
    fn today() -> Self {
        Range::new("2026-10-02", "2026-10-02", HOUR, HOUR, &[])
    }

    fn ask(&self, state: &AppState) -> Patterns {
        self.ask_with(state, &self.offsets)
    }

    fn ask_with(&self, state: &AppState, offsets: &[OffsetChange]) -> Patterns {
        state.summarize_reaches(self.first, self.last, self.start, self.end, offsets)
    }
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
    #[cfg(feature = "history")]
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
    app_at(setup, keychain, || NOW)
}

fn app_at(setup: &Setup, keychain: &Keychain, now: fn() -> i64) -> AppState {
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
        now,
        roll: || 0,
    }
}

/// The date a row begins, as text.
#[cfg(feature = "history")]
fn named(row: &MovementRow) -> String {
    serde_json::to_value(row.day)
        .unwrap()
        .as_str()
        .unwrap()
        .to_string()
}

/// Every row's count, oldest first.
#[cfg(feature = "history")]
fn counts(patterns: &Patterns) -> Vec<u32> {
    patterns.movement.iter().map(|row| row.count).collect()
}

/// The rows that hold anything, as `(date, count)`.
#[cfg(feature = "history")]
fn occupied(patterns: &Patterns) -> Vec<(String, u32)> {
    patterns
        .movement
        .iter()
        .filter(|row| row.count > 0)
        .map(|row| (named(row), row.count))
        .collect()
}

// --- The wire shape ------------------------------------------------------------------

#[test]
fn the_answer_serialises_to_exactly_nine_keys_and_each_row_to_six() {
    let state_setup = setup();
    let state = app(&state_setup, &Keychain::available());
    let value = serde_json::to_value(Range::four_weeks().ask(&state)).unwrap();
    let object = value.as_object().expect("an object");
    let mut keys: Vec<&str> = object.keys().map(String::as_str).collect();
    keys.sort_unstable();
    assert_eq!(
        keys,
        [
            "by_hour",
            "by_site",
            "by_weekday",
            "coverage_note",
            "dst_approximate",
            "estimates_excluded",
            "gaps",
            "movement",
            "sealed"
        ]
    );
    if cfg!(feature = "history") {
        let rows = object["movement"].as_array().expect("a list");
        assert_eq!(rows.len(), 28, "a row for each of the 28 dates");
        for row in rows {
            let row = row.as_object().expect("an object");
            let mut keys: Vec<&str> = row.keys().map(String::as_str).collect();
            keys.sort_unstable();
            assert_eq!(keys, ["count", "day", "days", "seen", "so_far", "span"]);
            assert_eq!(row["span"], serde_json::json!("day"));
            assert_eq!(row["seen"], serde_json::json!("whole"));
            assert_eq!(row["days"], serde_json::json!(1));
        }
    } else {
        assert_eq!(object["movement"], serde_json::json!([]));
    }
}

// --- Scenarios 1, 2, 19 and 21, against the history -----------------------------------

#[cfg(feature = "history")]
mod with_history {
    use super::*;

    use cairn::store::history::{History, OpenHistory};
    use cairn::store::key::HistoryKey;

    fn seed(data: &Path) -> OpenHistory {
        let History::Open(open) =
            History::open(data, &HistoryKey::Available(Key::from_bytes(A_KEY)))
        else {
            panic!("a fresh directory with a good key should open");
        };
        open
    }

    /// `count` reaches in the day from `day`'s UTC midnight, a minute apart.
    fn reaches_on(history: &OpenHistory, day: &str, count: i64) {
        for index in 0..count {
            history
                .record("a.example", midnight(day) + 60 * (index + 1))
                .unwrap();
        }
    }

    // Scenario 1
    #[test]
    fn four_weeks_are_28_daily_rows_oldest_first_with_their_counts() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-07", 2);
        reaches_on(&history, "2026-09-30", 1);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks().ask(&state);

        assert_eq!(patterns.sealed, None);
        assert_eq!(patterns.movement.len(), 28);
        assert_eq!(named(&patterns.movement[0]), "2026-09-05");
        assert_eq!(named(&patterns.movement[27]), "2026-10-02");
        let names: Vec<String> = patterns.movement.iter().map(named).collect();
        let mut sorted = names.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(names, sorted, "ascending, one row to a date");
        assert!(patterns
            .movement
            .iter()
            .all(|row| row.days == 1 && row.span == Span::Day));
        assert_eq!(
            occupied(&patterns),
            [("2026-09-07".to_string(), 2), ("2026-09-30".to_string(), 1)]
        );
    }

    #[test]
    fn no_reaches_still_28_rows_at_zero_never_an_empty_list() {
        let setup = setup();
        let _ = seed(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks().ask(&state);

        assert_eq!(patterns.sealed, None);
        assert_eq!(counts(&patterns), [0; 28]);
    }

    // Scenario 2
    #[test]
    fn one_date_is_one_row() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-10-02", 3);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::today().ask(&state);

        assert_eq!(patterns.movement.len(), 1);
        let row = patterns.movement[0];
        assert_eq!(
            (named(&row), row.days, row.span),
            ("2026-10-02".into(), 1, Span::Day)
        );
        assert_eq!(row.count, 3);
    }

    // Scenario 19
    #[test]
    fn an_estimate_is_not_a_reach_it_is_in_no_row_and_is_still_counted() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-07", 2);
        let state = app(&setup, &Keychain::available());
        let reaches_alone = Range::four_weeks().ask(&state);

        // Two inside the range, one the day after it.
        history.save_estimate(date("2026-09-08"), 4).unwrap();
        history.save_estimate(date("2026-09-20"), 9).unwrap();
        history.save_estimate(date("2026-10-03"), 7).unwrap();

        let patterns = Range::four_weeks().ask(&state);

        assert_eq!(patterns.movement, reaches_alone.movement);
        assert_eq!(counts(&patterns).iter().sum::<u32>(), 2);
        assert_eq!(patterns.estimates_excluded, 2);
    }

    // Scenario 3
    #[test]
    fn fifty_six_dates_are_still_daily() {
        let setup = setup();
        let _ = seed(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns =
            Range::new("2026-08-08", "2026-10-02", HOUR, HOUR, &[]).ask(&state);

        assert_eq!(patterns.movement.len(), 56);
        assert!(patterns.movement.iter().all(|row| row.span == Span::Day));
    }

    // Scenario 4
    #[test]
    fn fifty_seven_dates_are_nine_weekly_rows() {
        let setup = setup();
        let _ = seed(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns =
            Range::new("2026-08-07", "2026-10-02", HOUR, HOUR, &[]).ask(&state);

        assert_eq!(patterns.movement.len(), 9);
        assert!(patterns.movement.iter().all(|row| row.span == Span::Week));
        let begun: Vec<String> = patterns.movement.iter().map(named).collect();
        assert_eq!(
            begun,
            [
                "2026-08-07",
                "2026-08-14",
                "2026-08-21",
                "2026-08-28",
                "2026-09-04",
                "2026-09-11",
                "2026-09-18",
                "2026-09-25",
                "2026-10-02"
            ]
        );
        let days: Vec<u32> = patterns.movement.iter().map(|row| row.days).collect();
        assert_eq!(days, [7, 7, 7, 7, 7, 7, 7, 7, 1]);
        assert_eq!(days.iter().sum::<u32>(), 57);
    }

    // Scenario 5
    #[test]
    fn a_weeks_edges_are_the_local_midnights() {
        let setup = setup();
        let history = seed(&setup.data);
        // 2026-08-13 23:30 BST, the last half hour of the first row, and
        // 2026-08-14 00:30 BST.
        history.record("a.example", 1_786_660_200).unwrap();
        history.record("a.example", 1_786_663_800).unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns =
            Range::new("2026-08-07", "2026-10-02", HOUR, HOUR, &[]).ask(&state);

        assert_eq!(&counts(&patterns)[..3], [1, 1, 0]);
    }

    // Scenario 6
    #[test]
    fn a_year_across_both_changes_is_53_weekly_rows() {
        let setup = setup();
        let history = seed(&setup.data);
        // 2025-07-01 23:30 UTC, which is 2 July 00:30 BST.
        history.record("a.example", 1_751_412_600).unwrap();
        let state = app(&setup, &Keychain::available());
        let year = Range::new(
            "2025-01-01",
            "2025-12-31",
            0,
            0,
            &[(1_743_296_400, HOUR), (1_761_440_400, 0)],
        );

        let patterns = year.ask(&state);

        assert_eq!(patterns.sealed, None);
        assert_eq!(patterns.movement.len(), 53);
        let last = patterns.movement[52];
        assert_eq!((named(&last), last.days), ("2025-12-31".into(), 1));
        assert_eq!(named(&patterns.movement[26]), "2025-07-02");
        assert_eq!(patterns.movement[26].count, 1, "BST, not UTC");
        assert_eq!(patterns.movement[25].count, 0);
    }

    // Scenario 7
    #[test]
    fn every_reach_in_the_range_is_in_exactly_one_row_and_the_edges_are_in_none() {
        let ranges = [
            Range::four_weeks(),
            Range::new("2026-08-07", "2026-10-02", HOUR, HOUR, &[]),
        ];
        for range in &ranges {
            let setup = setup();
            let history = seed(&setup.data);
            for index in 0..50 {
                history
                    .record(
                        &format!("site{}.example", index % 4),
                        range.start + 1 + index * 17_000,
                    )
                    .unwrap();
            }
            history.record("edge.example", range.start - 1).unwrap();
            history.record("edge.example", range.end).unwrap();
            let state = app(&setup, &Keychain::available());

            let patterns = range.ask(&state);

            let in_rows: u32 = counts(&patterns).iter().sum();
            let in_hours: u32 = patterns.by_hour.iter().map(|hour| hour.count).sum();
            let on_weekdays: u32 = patterns.by_weekday.iter().map(|day| day.count).sum();
            let at_sites: u32 = patterns.by_site.iter().map(|site| site.count).sum();
            assert_eq!(in_rows, 50, "the edges are in no row");
            assert_eq!(in_rows, in_hours);
            assert_eq!(in_rows, on_weekdays);
            assert_eq!(in_rows, at_sites);
        }
    }

    // Scenario 21
    #[test]
    fn a_range_that_cannot_be_placed_is_sealed_with_no_rows() {
        let setup = setup();
        reaches_on(&seed(&setup.data), "2026-09-07", 2);
        let state = app(&setup, &Keychain::available());
        let london = Range::four_weeks();

        // One `check_range` refusal: it begins after the present.
        let late = Range::new("2026-10-06", "2026-10-06", HOUR, HOUR, &[]);
        let patterns = late.ask(&state);
        assert!(patterns.sealed.is_some(), "a range from the future");
        assert_eq!(patterns.movement, [], "never rows at zero");

        // One `check_offsets` refusal: none at all.
        let patterns = london.ask_with(&state, &[]);
        assert!(patterns.sealed.is_some());
        assert_eq!(patterns.movement, [], "never rows at zero");
    }

    #[test]
    fn a_sealed_history_has_no_rows_not_rows_at_zero() {
        let setup = setup();
        reaches_on(&seed(&setup.data), "2026-09-07", 2);
        let keychain = Keychain::available();
        keychain.set_available(false);
        let state = app(&setup, &keychain);

        let patterns = Range::four_weeks().ask(&state);

        assert!(patterns.sealed.is_some());
        assert_eq!(patterns.movement, []);
    }

    #[test]
    fn a_history_that_opens_but_cannot_be_read_has_no_rows() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-07", 2);
        drop(history);
        // A reach whose time is not a whole number: it opens, and the read of
        // the range cannot make sense of it.
        let connection = rusqlite::Connection::open(
            setup.data.join(cairn::store::history::HISTORY_FILE),
        )
        .unwrap();
        let hex: String = A_KEY.iter().map(|byte| format!("{byte:02x}")).collect();
        connection
            .pragma_update(None, "key", format!("x'{hex}'"))
            .unwrap();
        connection
            .execute(
                "INSERT INTO reaches (domain, at) VALUES ('odd.example', ?1)",
                [Range::four_weeks().start as f64 + 0.5],
            )
            .unwrap();
        drop(connection);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks().ask(&state);

        assert!(patterns.sealed.is_some());
        assert_eq!(patterns.movement, [], "never rows at zero");
    }
}

// --- Scenario 22: a build without the history -------------------------------------------

#[cfg(not(feature = "history"))]
#[test]
fn a_build_without_the_history_says_so_with_no_rows() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());

    let patterns = Range::four_weeks().ask(&state);

    assert_eq!(
        patterns.sealed.as_deref(),
        Some("This build of Cairn does not keep a history. Protection is unaffected.")
    );
    assert!(patterns.movement.is_empty());
}
