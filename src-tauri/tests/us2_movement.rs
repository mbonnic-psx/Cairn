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
use cairn::domain::patterns::{MovementRow, Seen, Span};
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

    use cairn::store::history::{CoverageGap, History, OpenHistory};
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

    // Scenarios 8 to 10
    #[test]
    fn a_reach_is_in_the_row_of_the_date_the_clock_showed_then() {
        let setup = setup();
        let history = seed(&setup.data);
        // 2026-09-13 23:59 BST, 2026-09-14 00:01 BST, and 2026-09-13 23:30 UTC,
        // which is 00:30 BST on the 14th.
        for at in [1_789_340_340, 1_789_340_460, 1_789_342_200] {
            history.record("a.example", at).unwrap();
        }
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks().ask(&state);

        assert_eq!(
            occupied(&patterns),
            [("2026-09-13".to_string(), 1), ("2026-09-14".to_string(), 2)]
        );
    }

    #[test]
    fn autumns_25_hour_date_is_one_row_for_a_reach_at_each_end() {
        let setup = setup();
        let history = seed(&setup.data);
        // 2026-10-25 00:30 BST and 23:30 GMT.
        history.record("a.example", 1_792_884_600).unwrap();
        history.record("a.example", 1_792_971_000).unwrap();
        let state = app_at(&setup, &Keychain::available(), || 1_793_707_200);
        let autumn = Range::new("2026-10-19", "2026-11-01", HOUR, 0, &[(AUTUMN, 0)]);

        let patterns = autumn.ask(&state);

        assert_eq!(occupied(&patterns), [("2026-10-25".to_string(), 2)]);
    }

    #[test]
    fn springs_late_evening_utc_is_in_the_next_row() {
        let setup = setup();
        let history = seed(&setup.data);
        // 2026-03-29 23:30 UTC, 00:30 BST on the 30th.
        history.record("a.example", 1_774_827_000).unwrap();
        let state = app(&setup, &Keychain::available());
        let spring = Range::new("2026-03-23", "2026-04-05", 0, HOUR, &[(SPRING, HOUR)]);

        let patterns = spring.ask(&state);

        assert_eq!(occupied(&patterns), [("2026-03-30".to_string(), 1)]);
    }

    // Scenario 11
    #[test]
    fn a_skipped_midnight_is_placed_not_sealed_under_either_first_offset() {
        let start = 1_776_981_600;
        let end = midnight("2026-05-01") - 3 * HOUR;
        for first_offset in [3 * HOUR, 2 * HOUR] {
            let setup = setup();
            seed(&setup.data).record("a.example", start + 60).unwrap();
            let state = app(&setup, &Keychain::available());

            let patterns = state.summarize_reaches(
                date("2026-04-24"),
                date("2026-04-30"),
                start,
                end,
                &[change(start, first_offset)],
            );

            assert_eq!(patterns.sealed, None, "placed at +{first_offset}");
            assert_eq!(occupied(&patterns), [("2026-04-24".to_string(), 1)]);
        }
    }

    // Scenario 12
    #[test]
    fn a_clock_change_after_midnight_leaves_one_row_counting_both() {
        let setup = setup();
        let history = seed(&setup.data);
        history.record("a.example", 1_289_100_600).unwrap();
        history.record("a.example", 1_289_149_200).unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = state.summarize_reaches(
            date("2010-11-07"),
            date("2010-11-07"),
            1_289_098_800,
            1_289_188_800,
            &[
                change(1_289_098_800, -10_800),
                change(1_289_098_860, -14_400),
            ],
        );

        assert_eq!(patterns.sealed, None);
        assert_eq!(counts(&patterns), [2]);
    }

    // Scenarios 15 and 20
    #[test]
    fn a_range_wholly_inside_a_gap_has_every_row_not_seen_at_zero_and_the_note() {
        let setup = setup();
        let history = seed(&setup.data);
        let london = Range::four_weeks();
        history
            .record_gap(&CoverageGap {
                from: london.start - 5 * DAY,
                to: NOW,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = london.ask(&state);

        assert_eq!(patterns.movement.len(), 28);
        assert!(patterns.movement.iter().all(|row| row.seen == Seen::None));
        assert_eq!(counts(&patterns), [0; 28]);
        assert!(patterns.coverage_note.is_some());
    }

    #[test]
    fn an_earlier_four_weeks_inside_one_gap_are_every_row_not_seen() {
        let setup = setup();
        let history = seed(&setup.data);
        let range = Range::new("2026-08-08", "2026-09-04", HOUR, HOUR, &[]);
        history
            .record_gap(&CoverageGap {
                from: range.start - DAY,
                to: range.end + DAY,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = range.ask(&state);

        assert_eq!(patterns.movement.len(), 28);
        assert!(patterns.movement.iter().all(|row| row.seen == Seen::None));
    }

    #[test]
    fn a_gap_from_todays_midnight_to_now_is_a_row_not_seen() {
        let setup = setup();
        let history = seed(&setup.data);
        let midnight = 1_790_895_600;
        history
            .record_gap(&CoverageGap {
                from: midnight,
                to: NOW,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks().ask(&state);

        assert_eq!(patterns.movement[27].seen, Seen::None);
        assert_eq!(patterns.movement[26].seen, Seen::Whole);
    }

    #[test]
    fn a_deleted_day_counts_what_remains_and_is_seen_as_it_was() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-09", 3);
        reaches_on(&history, "2026-09-10", 2);
        let state = app(&setup, &Keychain::available());
        let before = Range::four_weeks().ask(&state);
        history
            .delete_reach_history(midnight("2026-09-09"), midnight("2026-09-10"))
            .unwrap();

        let patterns = Range::four_weeks().ask(&state);

        assert_eq!(occupied(&patterns), [("2026-09-10".to_string(), 2)]);
        let seen: Vec<Seen> = patterns.movement.iter().map(|row| row.seen).collect();
        let seen_before: Vec<Seen> = before.movement.iter().map(|row| row.seen).collect();
        assert_eq!(seen, seen_before, "deleting adds no gap");
        assert!(patterns.gaps.is_empty());
    }

    // Scenario 24, the second part
    #[test]
    fn the_widest_range_the_screen_can_send_answers_with_100534_rows_inside_a_second() {
        let setup = setup();
        let history = seed(&setup.data);
        let first = LocalDate::new(100, 1, 1).unwrap();
        let last = date("2026-10-02");
        let start = first.days_since_epoch() * DAY;
        let end = (last.days_since_epoch() + 1) * DAY;
        history.record("a.example", NOW - DAY).unwrap();
        for index in 0..50 {
            history
                .record_gap(&CoverageGap {
                    from: start + index * 20_000_000,
                    to: start + index * 20_000_000 + 1_300_000,
                })
                .unwrap();
        }
        let state = app(&setup, &Keychain::available());

        let started = std::time::Instant::now();
        let patterns =
            state.summarize_reaches(first, last, start, end, &[change(start, 0)]);
        let elapsed = started.elapsed();

        assert_eq!(patterns.sealed, None);
        assert_eq!(patterns.movement.len(), 100_534);
        assert_eq!(counts(&patterns).iter().sum::<u32>(), 1);
        assert!(patterns.movement.iter().any(|row| row.seen != Seen::Whole));
        assert!(elapsed.as_millis() < 1_000, "took {elapsed:?}");
    }

    // Scenario 15, the first part
    #[test]
    fn a_gap_over_the_last_two_hours_of_yesterday_leaves_it_partly_seen() {
        let setup = setup();
        let history = seed(&setup.data);
        let midnight = 1_790_895_600;
        history
            .record_gap(&CoverageGap {
                from: midnight - 2 * HOUR,
                to: midnight,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks().ask(&state);

        assert_eq!(patterns.movement[26].seen, Seen::Part);
        assert_eq!(patterns.movement[27].seen, Seen::Whole);
        assert_eq!(patterns.movement[25].seen, Seen::Whole);
    }

    // Scenario 16
    #[test]
    fn a_reach_recorded_inside_a_gap_over_its_whole_date_is_partly_seen_never_not_seen() {
        let setup = setup();
        let history = seed(&setup.data);
        let (begins, ends) = (1_788_735_600, 1_788_822_000); // 2026-09-07 in BST
        history.record("a.example", begins + 12 * HOUR).unwrap();
        history
            .record_gap(&CoverageGap {
                from: begins,
                to: ends,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks().ask(&state);

        let day = patterns.movement[2];
        assert_eq!(named(&day), "2026-09-07");
        assert_eq!((day.seen, day.count), (Seen::Part, 1));
    }

    #[test]
    fn a_week_with_a_gap_over_two_of_its_dates_is_partly_seen() {
        let setup = setup();
        let history = seed(&setup.data);
        let weekly = Range::new("2026-08-07", "2026-10-02", HOUR, HOUR, &[]);
        history
            .record_gap(&CoverageGap {
                from: weekly.start + 2 * DAY,
                to: weekly.start + 4 * DAY,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = weekly.ask(&state);

        assert_eq!(patterns.movement[0].seen, Seen::Part);
        assert_eq!(patterns.movement[1].seen, Seen::Whole);
    }

    // Scenario 12, the second part
    #[test]
    fn the_goose_bay_date_under_a_gap_over_the_whole_range_is_partly_seen() {
        let setup = setup();
        let history = seed(&setup.data);
        history.record("a.example", 1_289_100_600).unwrap();
        history.record("a.example", 1_289_149_200).unwrap();
        history
            .record_gap(&CoverageGap {
                from: 1_289_098_800,
                to: 1_289_188_800,
            })
            .unwrap();
        let state = app_at(&setup, &Keychain::available(), || 1_289_190_000);

        let patterns = state.summarize_reaches(
            date("2010-11-07"),
            date("2010-11-07"),
            1_289_098_800,
            1_289_188_800,
            &[
                change(1_289_098_800, -10_800),
                change(1_289_098_860, -14_400),
            ],
        );

        assert_eq!(patterns.sealed, None);
        assert_eq!(patterns.movement.len(), 1);
        assert_eq!(
            (patterns.movement[0].seen, patterns.movement[0].count),
            (Seen::Part, 2)
        );
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
