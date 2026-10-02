//! Slice `history-by-hour`: a range of days, by hour, through the driving port.
//!
//! `specs/003-reflection-and-history/slices/history-by-hour/plan.md`, *Acceptance,
//! as scenarios through the driving port*, 1 to 14 and 16. Each **When** enters
//! through `AppState::summarize_reaches`, as the IPC command serves it, with the
//! offsets the interface would send written out as fixtures, and each **Then**
//! is observed in what it returns. `offset_changes.rs` holds each offset rule at
//! its edge; `patterns_by_hour.rs` holds the bucketing's properties.
//!
//! Fixtures are integers, never a zone database: the core knows no zone.
//! London's clocks go back at 2026-10-25 01:00 UTC and forward at 2026-03-29
//! 01:00 UTC; Lord Howe's go forward half an hour at 2026-10-03 15:30 UTC.
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
/// 2026-10-03 15:30 UTC: Lord Howe's clocks go forward, +37 800 to +39 600.
const LORD_HOWE: i64 = 1_791_041_400;
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

    /// 2026-09-03 to 2026-09-30 in London: summer time throughout.
    fn four_weeks_in_london() -> Self {
        Range::new("2026-09-03", "2026-09-30", HOUR, HOUR, &[])
    }

    /// The same days in UTC.
    fn four_weeks_in_utc() -> Self {
        Range::new("2026-09-03", "2026-09-30", 0, 0, &[])
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

    /// 2026-10-01 to 2026-10-09 on Lord Howe.
    fn lord_howe() -> Self {
        Range::new(
            "2026-10-01",
            "2026-10-09",
            37_800,
            39_600,
            &[(LORD_HOWE, 39_600)],
        )
    }

    /// The same four weeks in New York (summer time, −4 h).
    fn four_weeks_in_new_york() -> Self {
        Range::new("2026-09-03", "2026-09-30", -4 * HOUR, -4 * HOUR, &[])
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

/// The hours that hold anything, as `(hour, count)`.
#[cfg(feature = "history")]
fn occupied(patterns: &Patterns) -> Vec<(u8, u32)> {
    patterns
        .by_hour
        .iter()
        .filter(|hour| hour.count > 0)
        .map(|hour| (hour.hour, hour.count))
        .collect()
}

/// All 24 hours, 0 to 23 in order, whatever they hold.
#[cfg(feature = "history")]
fn assert_all_24_hours(patterns: &Patterns) {
    let hours: Vec<u8> = patterns.by_hour.iter().map(|hour| hour.hour).collect();
    assert_eq!(
        hours,
        (0..24).collect::<Vec<u8>>(),
        "24 hours from midnight"
    );
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
    ] {
        assert!(
            !lower.contains(banned),
            "{sentence:?} carries the word {banned:?}"
        );
    }
}

// --- Scenario 16: the wire shape -----------------------------------------------

#[test]
fn the_answer_serialises_to_exactly_nine_keys_and_dst_approximate_is_false() {
    let state_setup = setup();
    let state = app(&state_setup, &Keychain::available());
    let value = serde_json::to_value(Range::four_weeks_in_utc().ask(&state)).unwrap();
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
        ],
        "nine keys, movement among them"
    );
    assert_eq!(object["dst_approximate"], serde_json::json!(false));
}

// --- Scenarios 1–13, against the history -----------------------------------------

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

    // Scenario 1
    #[test]
    fn all_24_hours_from_midnight_each_with_its_count() {
        let setup = setup();
        let history = seed(&setup.data);
        // 14:10, 14:50 and 15:05 local (summer time) on one day; 02:30 on another.
        let london = Range::four_weeks_in_london();
        for (day, hour, minute) in [
            ("2026-09-10", 14, 10),
            ("2026-09-10", 14, 50),
            ("2026-09-10", 15, 5),
            ("2026-09-20", 2, 30),
        ] {
            reach_at(&history, midnight(day) - HOUR + hour * HOUR + minute * 60);
        }
        let state = app(&setup, &Keychain::available());

        let patterns = london.ask(&state);

        assert_all_24_hours(&patterns);
        assert_eq!(occupied(&patterns), [(2, 1), (14, 2), (15, 1)]);
        assert!(!patterns.dst_approximate);
        assert_eq!(patterns.sealed, None);
    }

    #[test]
    fn a_quiet_range_is_24_zeros_never_an_empty_list() {
        let setup = setup();
        let _ = seed(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks_in_london().ask(&state);

        assert_all_24_hours(&patterns);
        assert!(patterns.by_hour.iter().all(|hour| hour.count == 0));
        assert_eq!(patterns.sealed, None);
        assert!(!patterns.dst_approximate);
    }

    // Scenario 2
    #[test]
    fn the_edges_of_the_range_are_in_no_hour_as_in_no_site() {
        let setup = setup();
        let history = seed(&setup.data);
        let london = Range::four_weeks_in_london();
        reach_at(&history, london.start - 1);
        reach_at(&history, london.start);
        reach_at(&history, london.end - 1);
        reach_at(&history, london.end);
        let state = app(&setup, &Keychain::available());

        let patterns = london.ask(&state);

        let hours: u32 = patterns.by_hour.iter().map(|hour| hour.count).sum();
        let sites: u32 = patterns.by_site.iter().map(|site| site.count).sum();
        assert_eq!(
            hours, 2,
            "the second before the start and the end itself are out"
        );
        assert_eq!(hours, sites);
        assert_eq!(occupied(&patterns), [(0, 1), (23, 1)]);
    }

    // Scenario 3
    #[test]
    fn autumn_the_repeated_hour_is_one_hour_on_the_clock() {
        let setup = setup();
        let history = seed(&setup.data);
        for at in [
            AUTUMN - 1,
            AUTUMN,
            AUTUMN + 1_800,
            midnight("2026-10-26") + 12 * HOUR,
        ] {
            reach_at(&history, at);
        }
        let state = app(&setup, &Keychain::available());

        let patterns = Range::autumn().ask(&state);

        assert_eq!(occupied(&patterns), [(1, 3), (12, 1)]);
        assert!(!patterns.dst_approximate);
    }

    // Scenario 4
    #[test]
    fn spring_the_skipped_hour_is_still_listed() {
        let setup = setup();
        let history = seed(&setup.data);
        reach_at(&history, SPRING - 1);
        reach_at(&history, SPRING);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::spring().ask(&state);

        assert_all_24_hours(&patterns);
        assert_eq!(occupied(&patterns), [(0, 1), (2, 1)]);
        assert_eq!(
            patterns.by_hour[1].count, 0,
            "hour 1 is listed, with nothing in it"
        );
        assert!(!patterns.dst_approximate);
    }

    // Scenario 5
    #[test]
    fn a_year_whose_ends_agree_still_places_a_summer_reach_by_summer_time() {
        let setup = setup();
        let history = seed(&setup.data);
        reach_at(&history, midnight("2026-07-01") + 12 * HOUR);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::year_of_2026().ask(&state);

        assert_eq!(occupied(&patterns), [(13, 1)]);
        assert!(!patterns.dst_approximate);
    }

    // Scenario 6
    #[test]
    fn a_half_hour_change_places_the_second_before_and_the_instant_itself() {
        let setup = setup();
        let history = seed(&setup.data);
        reach_at(&history, LORD_HOWE - 1);
        reach_at(&history, LORD_HOWE);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::lord_howe().ask(&state);

        // 01:59:59 and 02:30:00 local.
        assert_eq!(occupied(&patterns), [(1, 1), (2, 1)]);
    }

    // Scenario 7
    #[test]
    fn the_hour_follows_the_offsets_sent_and_nothing_is_kept_between_calls() {
        let setup = setup();
        let history = seed(&setup.data);
        reach_at(&history, midnight("2026-09-15") + 13 * HOUR);
        let state = app(&setup, &Keychain::available());

        let in_london = Range::four_weeks_in_london().ask(&state);
        let in_new_york = Range::four_weeks_in_new_york().ask(&state);
        let london_again = Range::four_weeks_in_london().ask(&state);

        assert_eq!(occupied(&in_london), [(14, 1)]);
        assert_eq!(occupied(&in_new_york), [(9, 1)]);
        assert_eq!(london_again, in_london, "the core keeps no zone");
        assert!(!in_london.dst_approximate);
        assert!(!in_new_york.dst_approximate);
        assert!(!london_again.dst_approximate);
    }

    // Scenario 8
    #[test]
    fn twenty_three_fifty_nine_and_zero_zero_one_fall_either_side_of_midnight() {
        let setup = setup();
        let history = seed(&setup.data);
        // 23:59 on 10 September and 00:01 on 11 September, London, summer time.
        reach_at(&history, midnight("2026-09-11") - HOUR - 60);
        reach_at(&history, midnight("2026-09-11") - HOUR + 60);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks_in_london().ask(&state);

        assert_eq!(occupied(&patterns), [(0, 1), (23, 1)]);
    }

    // Scenario 9
    #[test]
    fn the_hours_are_complete_with_no_journal_entry_and_the_same_with_three() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-05", 3);
        reaches_on(&history, "2026-09-10", 2);
        let state = app(&setup, &Keychain::available());
        let without = Range::four_weeks_in_utc().ask(&state);
        assert_eq!(
            occupied(&without),
            [(0, 5)],
            "complete with no entry ever written"
        );

        for day in ["2026-09-05", "2026-09-10", "2026-09-29"] {
            history
                .save_entry(date(day), "Something I wrote.", 1)
                .unwrap();
        }

        let with = Range::four_weeks_in_utc().ask(&state);
        assert_eq!(with.by_hour, without.by_hour);
        assert_eq!(with, without);
    }

    // Scenario 10
    #[test]
    fn an_estimate_is_not_a_reach_it_has_no_hour_and_is_still_counted() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-05", 3);
        let state = app(&setup, &Keychain::available());
        let reaches_alone = Range::four_weeks_in_utc().ask(&state);

        // Two inside the range, one the day after it.
        history.save_estimate(date("2026-09-03"), 4).unwrap();
        history.save_estimate(date("2026-09-30"), 9).unwrap();
        history.save_estimate(date("2026-10-01"), 7).unwrap();

        let patterns = Range::four_weeks_in_utc().ask(&state);

        assert_eq!(patterns.by_hour, reaches_alone.by_hour);
        assert_eq!(occupied(&patterns), [(0, 3)]);
        assert_eq!(patterns.estimates_excluded, 2);
    }

    // Scenario 11
    #[test]
    fn gaps_and_the_note_are_what_by_site_gets_for_the_range() {
        let setup = setup();
        let history = seed(&setup.data);
        let utc = Range::four_weeks_in_utc();
        history
            .record_gap(&CoverageGap {
                from: utc.start - 2 * DAY,
                to: utc.start + 6 * HOUR,
            })
            .unwrap();
        let inside = utc.start + 10 * DAY;
        history
            .record_gap(&CoverageGap {
                from: inside,
                to: inside + 3 * HOUR,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = utc.ask(&state);

        let spans: Vec<(i64, i64)> =
            patterns.gaps.iter().map(|gap| (gap.from, gap.to)).collect();
        assert_eq!(
            spans,
            [
                (utc.start, utc.start + 6 * HOUR),
                (inside, inside + 3 * HOUR)
            ]
        );
        let note = patterns.coverage_note.expect("a note");
        assert!(note.contains("9 hours"), "about nine hours: {note}");
        assert!(note.to_lowercase().contains("these days"), "{note}");
        assert_in_voice(&note);
    }

    #[test]
    fn a_range_wholly_inside_a_gap_is_24_zeros_with_the_note() {
        let setup = setup();
        let history = seed(&setup.data);
        let utc = Range::four_weeks_in_utc();
        history
            .record_gap(&CoverageGap {
                from: utc.start - 5 * DAY,
                to: utc.end + 5 * DAY,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = utc.ask(&state);

        assert_all_24_hours(&patterns);
        assert!(patterns.by_hour.iter().all(|hour| hour.count == 0));
        let note = patterns.coverage_note.expect("a note");
        assert!(note.contains("28 days"), "{note}");
    }

    #[test]
    fn a_deleted_day_leaves_only_what_remains_and_no_gap() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-05", 3);
        reaches_on(&history, "2026-09-10", 2);
        history
            .delete_reach_history(midnight("2026-09-05"), midnight("2026-09-06"))
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks_in_utc().ask(&state);

        assert_eq!(occupied(&patterns), [(0, 2)]);
        assert!(patterns.gaps.is_empty());
        assert_eq!(patterns.coverage_note, None);
    }

    // Scenario 12, through the port (each edge is held in `offset_changes.rs`)
    #[test]
    fn offsets_that_cannot_be_the_computers_are_refused_with_the_one_sentence() {
        let setup = setup();
        reaches_on(&seed(&setup.data), "2026-09-05", 3);
        let state = app(&setup, &Keychain::available());
        let london = Range::four_weeks_in_london();
        let start = london.start;
        let refused = |offsets: Vec<OffsetChange>| {
            let patterns = london.ask_with(&state, &offsets);
            let sentence = patterns.sealed.clone().expect("refused");
            assert_in_voice(&sentence);
            assert!(patterns.by_site.is_empty(), "nothing else is returned");
            assert!(patterns.by_hour.is_empty(), "never 24 zeros");
            assert!(patterns.gaps.is_empty());
            assert_eq!(patterns.coverage_note, None);
            assert!(!patterns.dst_approximate);
            sentence
        };
        let many: Vec<OffsetChange> = std::iter::once(change(start, HOUR))
            .chain(
                (1..=30)
                    .map(|n| change(start + n * HOUR, if n % 2 == 1 { 0 } else { HOUR })),
            )
            .collect();

        let sentences = [
            refused(Vec::new()),
            refused(vec![change(start + 1, HOUR)]),
            // London implies +1 h; a first offset a clock change from it is
            // the offset in force, and three hours and a second is not.
            refused(vec![change(start, -2 * HOUR - 1)]),
            refused(vec![change(start, HOUR), change(start, 0)]),
            refused(vec![change(start, HOUR), change(london.end, 0)]),
            refused(vec![change(start, 15 * HOUR)]),
            refused(vec![change(start, HOUR), change(start + HOUR, HOUR)]),
            refused(vec![
                change(start, HOUR),
                change(start + HOUR, 4 * HOUR + 1),
            ]),
            refused(vec![
                change(start, HOUR),
                change(start + HOUR, -2 * HOUR - 1),
            ]),
            refused(many),
            refused(vec![change(i64::MIN, 0)]),
            refused(vec![change(start, i64::MAX)]),
        ];

        assert!(sentences.iter().all(|one| one == &sentences[0]));
        // The same sentence the range's own bounds are refused with.
        let bounds = state.summarize_reaches(
            london.last,
            london.first,
            london.start,
            london.end,
            &london.offsets,
        );
        assert_eq!(bounds.sealed.as_deref(), Some(sentences[0].as_str()));
        // And the right offsets are accepted.
        assert_eq!(london.ask(&state).sealed, None);
    }

    // Scenario 13
    #[test]
    fn a_sealed_history_says_so_with_no_hours_not_24_zeros() {
        let setup = setup();
        reaches_on(&seed(&setup.data), "2026-09-05", 3);
        let keychain = Keychain::available();
        keychain.set_available(false);
        let state = app(&setup, &keychain);

        let patterns = Range::four_weeks_in_utc().ask(&state);

        let sentence = patterns.sealed.expect("the sealed sentence");
        assert_in_voice(&sentence);
        assert!(patterns.by_hour.is_empty());
        assert!(patterns.by_site.is_empty());
        assert!(patterns.gaps.is_empty());
        assert_eq!(patterns.coverage_note, None);
        assert_eq!(patterns.estimates_excluded, 0);
        assert!(!patterns.dst_approximate);
    }

    #[test]
    fn a_history_that_opens_but_cannot_be_read_is_sealed_with_no_hours() {
        let setup = setup();
        let history = seed(&setup.data);
        reaches_on(&history, "2026-09-05", 3);
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
                [Range::four_weeks_in_utc().start as f64 + 0.5],
            )
            .unwrap();
        drop(connection);
        let state = app(&setup, &Keychain::available());

        let patterns = Range::four_weeks_in_utc().ask(&state);

        let sentence = patterns
            .sealed
            .expect("a read that does not go through is never a quiet range");
        assert_in_voice(&sentence);
        assert!(patterns.by_hour.is_empty(), "never 24 zeros");
        assert!(patterns.by_site.is_empty());
        assert!(!patterns.dst_approximate);
    }

    /// K25: Cairo's clocks skip midnight on 2026-04-24 (+7 200 to +10 800), so
    /// the range's first midnight never shows on a clock. Asked through the
    /// command, as K23 pinned at the check, it is placed, not sealed.
    #[test]
    fn a_range_whose_first_midnight_the_clock_skips_is_placed_through_the_command() {
        let setup = setup();
        let cairo = Range::new("2026-04-24", "2026-04-30", 7_200, 10_800, &[]);
        assert_eq!(cairo.start, 1_776_981_600);
        reach_at(&seed(&setup.data), cairo.start + 60);
        let state = app(&setup, &Keychain::available());
        let ask = |first_offset: i64| {
            cairo.ask_with(&state, &[change(cairo.start, first_offset)])
        };

        // The range's own offsets: +7 200 at the start puts the reach at 00:01.
        let patterns = cairo.ask(&state);
        assert_eq!(patterns.sealed, None, "a placeable range is placed");
        assert_all_24_hours(&patterns);
        assert_eq!(patterns.by_site.len(), 1);
        assert_eq!(patterns.by_site[0].domain, "a.example");
        assert_eq!(patterns.by_site[0].count, 1);
        assert_eq!(occupied(&patterns), [(0, 1)], "7 200 puts it at 00:01");
        // +10 800, the offset in force once the clock has skipped.
        let new = ask(10_800);
        assert_eq!(new.sealed, None);
        assert_eq!(new.by_site.len(), 1, "in By site");
        assert_eq!(occupied(&new), [(1, 1)], "in hour 01, not 00");

        // Every first offset the core accepts here, each with its hour.
        for (offset, hour) in [(7_200, 0), (10_800, 1), (14_400, 2), (18_000, 3)] {
            let patterns = ask(offset);
            assert_eq!(patterns.sealed, None, "{offset} is placed");
            assert_eq!(patterns.by_site.len(), 1);
            assert_eq!(occupied(&patterns), [(hour, 1)], "{offset}");
        }

        // Below the implied one is sealed, as is more than a clock change above
        // it. Cairo's implied offset is 7 200, so 3 600 (hour 23) is sealed (A3).
        for offset in [7_199, 3_600, 0, 18_001] {
            let patterns = ask(offset);
            assert!(patterns.sealed.is_some(), "{offset} is sealed");
            assert!(patterns.by_hour.is_empty(), "never 24 zeros");
            assert!(patterns.by_site.is_empty());
        }
    }
}

// --- Scenario 14: a build without the history --------------------------------------

#[cfg(not(feature = "history"))]
#[test]
fn a_build_without_the_history_says_so_with_no_hours() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());

    let patterns = Range::four_weeks_in_utc().ask(&state);

    assert_eq!(
        patterns.sealed.as_deref(),
        Some("This build of Cairn does not keep a history. Protection is unaffected.")
    );
    assert!(patterns.by_hour.is_empty());
    assert!(patterns.by_site.is_empty());
    assert!(!patterns.dst_approximate);
}
