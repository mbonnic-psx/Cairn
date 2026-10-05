//! Slice `history-by-weekday`: a range of days, by day of the week, through
//! the driving port.
//!
//! `specs/003-reflection-and-history/slices/history-by-weekday/plan.md`,
//! *Acceptance, as scenarios through the driving port*, 1 to 17 and 19. Each
//! **When** enters through `AppState::summarize_reaches`, as the IPC command
//! serves it, with the offsets the interface would send written out as
//! fixtures, and each **Then** is observed in what it returns.
//! `offset_changes.rs` holds each offset rule at its edge; `patterns_by_weekday.rs`
//! holds the bucketing's and the weekday count's properties. Every expected
//! weekday is read off the calendar: 2026-09-07 is a Monday.
//!
//! Fixtures are integers, never a zone database: the core knows no zone.
//! London's clocks go back at 2026-10-25 01:00 UTC and forward at 2026-03-29
//! 01:00 UTC; Cairo's skip midnight on 2026-04-24.
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
const AUTUMN: i64 = 1_792_890_000;
/// 2026-03-29 01:00 UTC: London's clocks go forward, 0 to +3 600.
const SPRING: i64 = 1_774_746_000;
/// 2027-01-02 12:00 UTC: after every range here.
const NOW: i64 = 1_798_891_200;

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

    /// 2026-10-19 to 2026-11-01 in London, across the clocks going back.
    fn autumn() -> Self {
        Range::new("2026-10-19", "2026-11-01", HOUR, 0, &[(AUTUMN, 0)])
    }

    /// 2026-03-23 to 2026-04-05 in London, across the clocks going forward.
    fn spring() -> Self {
        Range::new("2026-03-23", "2026-04-05", 0, HOUR, &[(SPRING, HOUR)])
    }

    /// The calendar year in London, whose two ends are both at offset 0.
    fn year_of_2026() -> Self {
        Range::new(
            "2026-01-01",
            "2026-12-31",
            0,
            0,
            &[(SPRING, HOUR), (AUTUMN, 0)],
        )
    }

    /// 2026-09-07 to 2026-10-04 in London: four whole weeks, Monday to Sunday.
    fn four_whole_weeks() -> Self {
        Range::new("2026-09-07", "2026-10-04", HOUR, HOUR, &[])
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

/// The days that hold anything, as `(weekday, count)`.
#[cfg(feature = "history")]
fn occupied(patterns: &Patterns) -> Vec<(u8, u32)> {
    patterns
        .by_weekday
        .iter()
        .filter(|day| day.count > 0)
        .map(|day| (day.weekday, day.count))
        .collect()
}

/// All seven days, 0 (Monday) to 6 (Sunday) in order, whatever they hold.
#[cfg(feature = "history")]
fn assert_all_7_days(patterns: &Patterns) {
    let days: Vec<u8> = patterns.by_weekday.iter().map(|day| day.weekday).collect();
    assert_eq!(days, (0..7).collect::<Vec<u8>>(), "seven days from Monday");
}

/// How many of each weekday the range holds, Monday first.
#[cfg(feature = "history")]
fn days_held(patterns: &Patterns) -> Vec<u32> {
    patterns.by_weekday.iter().map(|day| day.days).collect()
}

/// Every count, Monday first.
#[cfg(feature = "history")]
fn counts(patterns: &Patterns) -> Vec<u32> {
    patterns.by_weekday.iter().map(|day| day.count).collect()
}

/// The voice rule (SC-019, FR-031) and the ranking words (H3): every sentence
/// these tests see.
#[cfg(feature = "history")]
fn assert_in_voice(sentence: &str) {
    assert!(!sentence.trim().is_empty(), "a sentence says something");
    let lower = sentence.to_lowercase();
    for banned in [
        "failed",
        "fail",
        "denied",
        "violation",
        "relapse",
        "forbidden",
        "you lost",
        "worst",
        "peak",
        "busiest",
        "top ",
        "rank",
        "average",
        "per day",
        "best",
        "quietest",
    ] {
        assert!(
            !lower.contains(banned),
            "{sentence:?} carries the word {banned:?}"
        );
    }
}

// --- Scenario 19: the wire shape -----------------------------------------------

#[test]
fn the_answer_serialises_to_exactly_ten_keys() {
    let state_setup = setup();
    let state = app(&state_setup, &Keychain::available());
    let value = serde_json::to_value(Range::four_whole_weeks().ask(&state)).unwrap();
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
            "first_counted",
            "gaps",
            "movement",
            "sealed"
        ],
        "ten keys, movement and first_counted among them"
    );
    if cfg!(feature = "history") {
        let days = object["by_weekday"].as_array().expect("a list");
        assert_eq!(days.len(), 7);
        for (weekday, day) in days.iter().enumerate() {
            let day = day.as_object().expect("an object");
            let mut keys: Vec<&str> = day.keys().map(String::as_str).collect();
            keys.sort_unstable();
            assert_eq!(keys, ["count", "days", "weekday"]);
            assert_eq!(day["weekday"], serde_json::json!(weekday));
        }
    }
}

// --- Scenarios 1–15, against the history ------------------------------------------

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

    fn reach_at(history: &OpenHistory, at: i64) {
        history.record("a.example", at).unwrap();
    }

    /// `count` reaches in the day from `day`'s UTC midnight, a minute apart.
    fn reaches_on(history: &OpenHistory, day: &str, count: i64) {
        for index in 0..count {
            history
                .record("a.example", midnight(day) + 60 * (index + 1))
                .unwrap();
        }
    }

    const MON: u8 = 0;
    const TUE: u8 = 1;
    const WED: u8 = 2;
    const THU: u8 = 3;
    const FRI: u8 = 4;
    const SUN: u8 = 6;

    // Scenario 1
    #[test]
    fn all_seven_days_in_the_cores_order_each_with_its_count_and_its_days() {
        let setup = setup();
        let history = seed(&setup.data);
        // Mondays 2026-09-07 (twice), Wednesday the 9th, Sunday the 13th.
        reaches_on(&history, "2026-09-07", 2);
        reaches_on(&history, "2026-09-09", 1);
        reaches_on(&history, "2026-09-13", 1);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_whole_weeks().ask(&state);

        assert_all_7_days(&patterns);
        assert_eq!(counts(&patterns), [2, 0, 1, 0, 0, 0, 1]);
        assert_eq!(days_held(&patterns), [4; 7]);
        assert_eq!(patterns.sealed, None);
    }

    #[test]
    fn a_quiet_range_is_seven_zeros_with_its_days_never_an_empty_list() {
        let setup = setup();
        let _ = seed(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_whole_weeks().ask(&state);

        assert_all_7_days(&patterns);
        assert_eq!(counts(&patterns), [0; 7]);
        assert_eq!(days_held(&patterns), [4; 7]);
        assert_eq!(patterns.sealed, None);
    }

    // Scenario 2
    #[test]
    fn every_day_present_a_week_with_one_reach_a_day() {
        let setup = setup();
        let history = seed(&setup.data);
        // Monday 2026-09-07 to Sunday the 13th, at noon UTC.
        for day in 7..=13 {
            reach_at(&history, midnight(&format!("2026-09-{day:02}")) + 12 * HOUR);
        }
        let state = app(&setup, &Keychain::available());
        let week = Range::new("2026-09-07", "2026-09-13", HOUR, HOUR, &[]);

        let patterns = week.ask(&state);

        assert_eq!(counts(&patterns), [1; 7]);
        assert_eq!(days_held(&patterns), [1; 7]);
    }

    // Scenario 3
    #[test]
    fn the_edges_of_the_range_are_in_no_day_as_in_no_site_and_no_hour() {
        let setup = setup();
        let history = seed(&setup.data);
        let london = Range::four_whole_weeks();
        reach_at(&history, london.start - 1);
        reach_at(&history, london.start);
        reach_at(&history, london.end - 1);
        reach_at(&history, london.end);
        let state = app(&setup, &Keychain::available());

        let patterns = london.ask(&state);

        let days: u32 = counts(&patterns).iter().sum();
        let sites: u32 = patterns.by_site.iter().map(|site| site.count).sum();
        let hours: u32 = patterns.by_hour.iter().map(|hour| hour.count).sum();
        assert_eq!(days, 2, "the second before the start and the end are out");
        assert_eq!(days, sites);
        assert_eq!(days, hours);
        // The first Monday, and the last Sunday.
        assert_eq!(occupied(&patterns), [(MON, 1), (SUN, 1)]);
    }

    // Scenario 4
    #[test]
    fn midnight_by_the_clock_not_by_utc() {
        let setup = setup();
        let history = seed(&setup.data);
        // Sunday the 13th 23:59 BST, Monday the 14th 00:01 BST, and 23:30 UTC
        // on the 13th, which is 00:30 on Monday in London.
        reach_at(&history, midnight("2026-09-14") - HOUR - 60);
        reach_at(&history, midnight("2026-09-14") - HOUR + 60);
        reach_at(&history, midnight("2026-09-13") + 23 * HOUR + 1_800);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_whole_weeks().ask(&state);

        assert_eq!(occupied(&patterns), [(MON, 2), (SUN, 1)]);
    }

    // Scenario 5
    #[test]
    fn autumn_the_25_hour_sunday_is_one_sunday_counted_once_in_days() {
        let setup = setup();
        let history = seed(&setup.data);
        // Sunday 00:30 BST, and Sunday 23:30 GMT, the 25th.
        reach_at(&history, midnight("2026-10-24") + 23 * HOUR + 1_800);
        reach_at(&history, midnight("2026-10-25") + 23 * HOUR + 1_800);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::autumn().ask(&state);

        assert_eq!(occupied(&patterns), [(SUN, 2)]);
        assert_eq!(patterns.by_weekday[SUN as usize].days, 2);
        assert_eq!(days_held(&patterns), [2; 7]);
    }

    // Scenario 6
    #[test]
    fn spring_the_23_hour_sunday_is_one_sunday_counted_once_in_days() {
        let setup = setup();
        let history = seed(&setup.data);
        // Sunday 00:59:59 GMT, and 00:30 BST on Monday the 30th.
        reach_at(&history, SPRING - 1);
        reach_at(&history, midnight("2026-03-29") + 23 * HOUR + 1_800);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::spring().ask(&state);

        assert_eq!(occupied(&patterns), [(MON, 1), (SUN, 1)]);
        assert_eq!(days_held(&patterns), [2; 7]);
    }

    // Scenario 7
    #[test]
    fn a_year_whose_ends_agree_places_a_summer_reach_by_summer_time() {
        let setup = setup();
        let history = seed(&setup.data);
        // Sunday 2026-07-05 23:30 UTC is Monday 00:30 BST.
        reach_at(&history, midnight("2026-07-05") + 23 * HOUR + 1_800);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::year_of_2026().ask(&state);

        assert_eq!(occupied(&patterns), [(MON, 1)]);
        assert_eq!(days_held(&patterns), [52, 52, 52, 53, 52, 52, 52]);
    }

    // Scenario 8, K23 to K25 through the command
    #[test]
    fn a_skipped_midnight_is_placed_under_either_accepted_first_offset() {
        let setup = setup();
        let cairo = Range::new("2026-04-24", "2026-04-30", 7_200, 10_800, &[]);
        assert_eq!(cairo.start, 1_776_981_600);
        reach_at(&seed(&setup.data), cairo.start + 60);
        let state = app(&setup, &Keychain::available());

        for first_offset in [7_200, 10_800] {
            let patterns = cairo.ask_with(&state, &[change(cairo.start, first_offset)]);
            assert_eq!(patterns.sealed, None, "{first_offset} is placed");
            assert_eq!(occupied(&patterns), [(FRI, 1)], "{first_offset}");
            assert_eq!(days_held(&patterns), [1; 7]);
        }
        let own = cairo.ask(&state);
        assert_eq!(occupied(&own), [(FRI, 1)]);
    }

    #[test]
    fn a_range_that_ends_at_the_changes_own_instant_ends_on_thursday() {
        let setup = setup();
        // 2026-04-17 to 2026-04-23, ending where Cairo's clocks skip (K24).
        let cairo = Range::new("2026-04-17", "2026-04-23", 7_200, 7_200, &[]);
        assert_eq!(cairo.end, 1_776_981_600);
        reach_at(&seed(&setup.data), cairo.end - 1);
        let state = app(&setup, &Keychain::available());

        let patterns = cairo.ask(&state);

        assert_eq!(patterns.sealed, None);
        assert_eq!(occupied(&patterns), [(THU, 1)]);
        assert_eq!(days_held(&patterns), [1; 7]);
    }

    // Scenario 9
    #[test]
    fn the_weekday_follows_the_offsets_sent_and_nothing_is_kept_between_calls() {
        let setup = setup();
        let history = seed(&setup.data);
        // Tuesday 2026-09-15 23:30 UTC: Wednesday 00:30 in London, Tuesday
        // 19:30 in New York.
        reach_at(&history, midnight("2026-09-15") + 23 * HOUR + 1_800);
        let state = app(&setup, &Keychain::available());
        let in_london = Range::new("2026-09-15", "2026-09-16", HOUR, HOUR, &[]);
        let in_new_york =
            Range::new("2026-09-15", "2026-09-16", -4 * HOUR, -4 * HOUR, &[]);

        let london = in_london.ask(&state);
        let new_york = in_new_york.ask(&state);
        let london_again = in_london.ask(&state);

        assert_eq!(occupied(&london), [(WED, 1)]);
        assert_eq!(occupied(&new_york), [(TUE, 1)]);
        assert_eq!(london_again, london, "the core keeps no zone");
    }

    // Scenario 10
    #[test]
    fn one_day_holds_one_of_its_weekday_and_none_of_the_others() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-15", 3);
        let state = app(&setup, &Keychain::available());
        let day = Range::new("2026-09-15", "2026-09-15", HOUR, HOUR, &[]);

        let patterns = day.ask(&state);

        assert_all_7_days(&patterns);
        assert_eq!(days_held(&patterns), [0, 1, 0, 0, 0, 0, 0]);
        assert_eq!(occupied(&patterns), [(TUE, 3)]);
    }

    #[test]
    fn three_days_leave_four_weekdays_present_with_no_days() {
        let setup = setup();
        let _ = seed(&setup.data);
        let state = app(&setup, &Keychain::available());
        // Friday 2026-09-11 to Sunday the 13th.
        let weekend = Range::new("2026-09-11", "2026-09-13", HOUR, HOUR, &[]);

        let patterns = weekend.ask(&state);

        assert_all_7_days(&patterns);
        assert_eq!(days_held(&patterns), [0, 0, 0, 0, 1, 1, 1]);
        assert_eq!(counts(&patterns), [0; 7]);
    }

    // Scenario 11
    #[test]
    fn an_uneven_range_holds_two_mondays_and_one_tuesday() {
        let setup = setup();
        let _ = seed(&setup.data);
        let state = app(&setup, &Keychain::available());
        // Saturday 2026-09-12 to Monday the 21st.
        let ten = Range::new("2026-09-12", "2026-09-21", HOUR, HOUR, &[]);

        let patterns = ten.ask(&state);

        assert_eq!(days_held(&patterns), [2, 1, 1, 1, 1, 2, 2]);
    }

    // Scenario 12
    #[test]
    fn the_days_are_complete_with_no_journal_entry_and_the_same_with_three() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-09", 3);
        reaches_on(&history, "2026-09-10", 2);
        let state = app(&setup, &Keychain::available());
        let without = Range::four_whole_weeks().ask(&state);
        assert_eq!(occupied(&without), [(WED, 3), (THU, 2)]);

        for day in ["2026-09-09", "2026-09-10", "2026-09-29"] {
            history
                .save_entry(date(day), "Something I wrote.", 1)
                .unwrap();
        }

        let with = Range::four_whole_weeks().ask(&state);
        assert_eq!(with.by_weekday, without.by_weekday);
        assert_eq!(with, without);
    }

    // Scenario 13
    #[test]
    fn an_estimate_is_not_a_reach_it_is_in_no_day_and_is_still_counted() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-09", 3);
        let state = app(&setup, &Keychain::available());
        let reaches_alone = Range::four_whole_weeks().ask(&state);

        // Two inside the range, one the day after it.
        history.save_estimate(date("2026-09-08"), 4).unwrap();
        history.save_estimate(date("2026-10-04"), 9).unwrap();
        history.save_estimate(date("2026-10-05"), 7).unwrap();

        let patterns = Range::four_whole_weeks().ask(&state);

        assert_eq!(patterns.by_weekday, reaches_alone.by_weekday);
        assert_eq!(occupied(&patterns), [(WED, 3)]);
        assert_eq!(
            days_held(&patterns),
            [4; 7],
            "an estimate leaves days alone"
        );
        assert_eq!(patterns.estimates_excluded, 2);
    }

    // Scenario 14
    #[test]
    fn gaps_and_the_note_are_what_by_site_gets_for_the_range() {
        let setup = setup();
        let history = seed(&setup.data);
        let london = Range::four_whole_weeks();
        history
            .record_gap(&CoverageGap {
                from: london.start - 2 * DAY,
                to: london.start + 6 * HOUR,
            })
            .unwrap();
        let inside = london.start + 10 * DAY;
        history
            .record_gap(&CoverageGap {
                from: inside,
                to: inside + 3 * HOUR,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = london.ask(&state);

        let spans: Vec<(i64, i64)> =
            patterns.gaps.iter().map(|gap| (gap.from, gap.to)).collect();
        assert_eq!(
            spans,
            [
                (london.start, london.start + 6 * HOUR),
                (inside, inside + 3 * HOUR)
            ]
        );
        let note = patterns.coverage_note.expect("a note");
        assert!(note.contains("9 hours"), "about nine hours: {note}");
        assert!(note.to_lowercase().contains("these days"), "{note}");
        assert_in_voice(&note);
    }

    #[test]
    fn a_range_wholly_inside_a_gap_is_seven_zeros_with_its_days_and_the_note() {
        let setup = setup();
        let history = seed(&setup.data);
        let london = Range::four_whole_weeks();
        history
            .record_gap(&CoverageGap {
                from: london.start - 5 * DAY,
                to: london.end + 5 * DAY,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = london.ask(&state);

        assert_all_7_days(&patterns);
        assert_eq!(counts(&patterns), [0; 7]);
        assert_eq!(days_held(&patterns), [4; 7]);
        let note = patterns.coverage_note.expect("a note");
        assert!(note.contains("28 days"), "{note}");
    }

    #[test]
    fn a_deleted_day_leaves_only_what_remains_keeps_days_and_adds_no_gap() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-09", 3);
        reaches_on(&history, "2026-09-10", 2);
        history
            .delete_reach_history(midnight("2026-09-09"), midnight("2026-09-10"))
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_whole_weeks().ask(&state);

        assert_eq!(occupied(&patterns), [(THU, 2)]);
        assert_eq!(days_held(&patterns), [4; 7], "a deleted day is still a day");
        assert!(patterns.gaps.is_empty());
        assert_eq!(patterns.coverage_note, None);
    }

    // Scenario 15, through the port (each edge is held in `offset_changes.rs`)
    #[test]
    fn offsets_that_cannot_be_the_computers_are_refused_with_the_one_sentence() {
        let setup = setup();
        reaches_on(&seed(&setup.data), "2026-09-09", 3);
        let state = app(&setup, &Keychain::available());
        let london = Range::four_whole_weeks();
        let start = london.start;
        let refused = |offsets: Vec<OffsetChange>| {
            let patterns = london.ask_with(&state, &offsets);
            let sentence = patterns.sealed.clone().expect("refused");
            assert_in_voice(&sentence);
            assert!(patterns.by_weekday.is_empty(), "never seven zeros");
            assert!(patterns.by_site.is_empty(), "nothing else is returned");
            assert!(patterns.by_hour.is_empty());
            assert!(patterns.gaps.is_empty());
            assert_eq!(patterns.coverage_note, None);
            sentence
        };

        let sentences = [
            // None at all.
            refused(Vec::new()),
            // Not beginning at the range's start.
            refused(vec![change(start + 1, HOUR)]),
            // Below what the start implies.
            refused(vec![change(start, -2 * HOUR - 1)]),
            // Not increasing.
            refused(vec![change(start, HOUR), change(start, 0)]),
            // At the range's end.
            refused(vec![change(start, HOUR), change(london.end, 0)]),
            // Beyond any zone.
            refused(vec![change(start, 15 * HOUR)]),
            // Neighbours that do not differ.
            refused(vec![change(start, HOUR), change(start + HOUR, HOUR)]),
            // A change larger than any clock makes.
            refused(vec![
                change(start, HOUR),
                change(start + HOUR, 4 * HOUR + 1),
            ]),
            refused(vec![change(i64::MIN, 0)]),
            refused(vec![change(start, i64::MAX)]),
        ];

        assert!(sentences.iter().all(|one| one == &sentences[0]));
        assert_eq!(
            london.ask(&state).sealed,
            None,
            "the right offsets are placed"
        );
    }

    // Scenario 16
    #[test]
    fn a_sealed_history_says_so_with_no_days_not_seven_zeros() {
        let setup = setup();
        reaches_on(&seed(&setup.data), "2026-09-09", 3);
        let keychain = Keychain::available();
        keychain.set_available(false);
        let state = app(&setup, &keychain);

        let patterns = Range::four_whole_weeks().ask(&state);

        let sentence = patterns.sealed.expect("the sealed sentence");
        assert_in_voice(&sentence);
        assert!(patterns.by_weekday.is_empty());
        assert!(patterns.by_site.is_empty());
        assert!(patterns.by_hour.is_empty());
        assert!(patterns.gaps.is_empty());
        assert_eq!(patterns.coverage_note, None);
        assert_eq!(patterns.estimates_excluded, 0);
    }

    #[test]
    fn a_history_that_opens_but_cannot_be_read_is_sealed_with_no_days() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-09", 3);
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
                [Range::four_whole_weeks().start as f64 + 0.5],
            )
            .unwrap();
        drop(connection);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_whole_weeks().ask(&state);

        let sentence = patterns
            .sealed
            .expect("a read that does not go through is never a quiet range");
        assert_in_voice(&sentence);
        assert!(patterns.by_weekday.is_empty(), "never seven zeros");
        assert!(patterns.by_site.is_empty());
    }
}

// --- Scenario 17: a build without the history ---------------------------------------

#[cfg(not(feature = "history"))]
#[test]
fn a_build_without_the_history_says_so_with_no_days() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());

    let patterns = Range::four_whole_weeks().ask(&state);

    assert_eq!(
        patterns.sealed.as_deref(),
        Some("This build of Cairn does not keep a history. Protection is unaffected.")
    );
    assert!(patterns.by_weekday.is_empty());
    assert!(patterns.by_site.is_empty());
}
