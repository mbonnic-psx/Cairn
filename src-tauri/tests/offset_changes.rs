//! The offsets in force across a range, each rule held at its edge and one
//! second (or one entry) past it (slice `history-by-hour`, scenario 12).
//!
//! As `range_bounds.rs` holds `check_range`. An offset is seconds east of UTC;
//! an end's implied offset is how far the UTC midnight of its date is from the
//! instant. Every refusal is the one sentence `check_range` gives.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::dates::LocalDate;
use cairn::domain::patterns::OffsetChange;
use cairn::reflection::over_time::{check_offsets, check_range};

const HOUR: i64 = 3600;
const DAY: i64 = 86_400;
const LATER: i64 = 2_000_000_000;

fn date(text: &str) -> LocalDate {
    serde_json::from_str(&format!("\"{text}\"")).unwrap()
}

fn midnight(text: &str) -> i64 {
    date(text).days_since_epoch() * DAY
}

/// A range of days whose first midnight implies `start_offset` and whose end
/// implies `end_offset`, and the offsets to check against it.
struct Case {
    first: &'static str,
    last: &'static str,
    after_last: &'static str,
}

impl Case {
    fn start(&self, offset: i64) -> i64 {
        midnight(self.first) - offset
    }
    fn end(&self, offset: i64) -> i64 {
        midnight(self.after_last) - offset
    }
    fn check(
        &self,
        start_offset: i64,
        end_offset: i64,
        offsets: &[(i64, i64)],
    ) -> Result<(i32, Vec<OffsetChange>), String> {
        check_offsets(
            date(self.first),
            date(self.last),
            self.start(start_offset),
            self.end(end_offset),
            offsets,
        )
        .map_err(|trouble| trouble.message)
    }
}

/// Four days in September, in UTC unless a test says otherwise.
const FOUR_DAYS: Case = Case {
    first: "2026-09-03",
    last: "2026-09-06",
    after_last: "2026-09-07",
};

fn accepted(result: Result<(i32, Vec<OffsetChange>), String>) {
    assert!(result.is_ok(), "{result:?}");
}

fn refused(result: Result<(i32, Vec<OffsetChange>), String>) {
    let sentence = result.expect_err("refused");
    let range_sentence = check_range(date("2026-09-30"), date("2026-09-03"), 0, 0, LATER)
        .expect_err("the range's own refusal")
        .message;
    assert_eq!(
        sentence, range_sentence,
        "one sentence for every range Cairn cannot place"
    );
    let lower = sentence.to_lowercase();
    for banned in [
        "failed",
        "denied",
        "violation",
        "relapse",
        "forbidden",
        "you lost",
    ] {
        assert!(!lower.contains(banned), "{sentence:?}");
    }
}

fn start() -> i64 {
    FOUR_DAYS.start(0)
}

// --- What is accepted, and what comes back -----------------------------------

#[test]
fn one_entry_at_the_start_is_accepted_and_returned_typed() {
    let (first, changes) = FOUR_DAYS.check(0, 0, &[(start(), 0)]).unwrap();
    assert_eq!(first, 0);
    assert!(
        changes.is_empty(),
        "the first entry is the first offset, not a change"
    );
}

#[test]
fn londons_two_years_are_accepted_with_four_changes() {
    let case = Case {
        first: "2025-10-01",
        last: "2027-09-30",
        after_last: "2027-10-01",
    };
    let (first, changes) = case
        .check(
            3600,
            3600,
            &[
                (case.start(3600), 3600),
                (1_761_440_400, 0),
                (1_774_746_000, 3600),
                (1_792_890_000, 0),
                (1_806_195_600, 3600),
            ],
        )
        .unwrap();
    assert_eq!(first, 3600);
    assert_eq!(
        changes,
        [
            OffsetChange {
                from: 1_761_440_400,
                offset_seconds: 0
            },
            OffsetChange {
                from: 1_774_746_000,
                offset_seconds: 3600
            },
            OffsetChange {
                from: 1_792_890_000,
                offset_seconds: 0
            },
            OffsetChange {
                from: 1_806_195_600,
                offset_seconds: 3600
            },
        ]
    );
}

#[test]
fn lord_howes_half_hour_change_is_accepted() {
    let case = Case {
        first: "2026-10-01",
        last: "2026-10-09",
        after_last: "2026-10-10",
    };
    accepted(case.check(
        37_800,
        39_600,
        &[(case.start(37_800), 37_800), (1_791_041_400, 39_600)],
    ));
}

// --- Each rule, at its edge ----------------------------------------------------

#[test]
fn an_empty_list_is_refused() {
    refused(FOUR_DAYS.check(0, 0, &[]));
}

#[test]
fn the_first_entry_begins_at_range_start_to_the_second() {
    accepted(FOUR_DAYS.check(0, 0, &[(start(), 0)]));
    refused(FOUR_DAYS.check(0, 0, &[(start() + 1, 0)]));
    refused(FOUR_DAYS.check(0, 0, &[(start() - 1, 0)]));
}

#[test]
fn the_first_offset_is_the_one_range_start_implies() {
    accepted(FOUR_DAYS.check(3600, 3600, &[(FOUR_DAYS.start(3600), 3600)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(FOUR_DAYS.start(3600), 3599)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(FOUR_DAYS.start(3600), 3601)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(FOUR_DAYS.start(3600), 0)]));
}

#[test]
fn the_instants_strictly_increase() {
    let at = start() + HOUR;
    accepted(FOUR_DAYS.check(0, 0, &[(start(), 0), (at, 3600), (at + 1, 0)]));
    refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (at, 3600), (at, 0)]));
    refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (at, 3600), (at - 1, 0)]));
    refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (start(), 3600)]));
}

#[test]
fn every_instant_is_before_range_end() {
    let end = FOUR_DAYS.end(0);
    accepted(FOUR_DAYS.check(0, 0, &[(start(), 0), (end - 1, 3600)]));
    refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (end, 3600)]));
    refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (end + 1, 3600)]));
}

#[test]
fn an_offset_is_between_minus_twelve_and_plus_fourteen_hours() {
    for offset in [-12 * HOUR, 14 * HOUR] {
        accepted(FOUR_DAYS.check(offset, offset, &[(FOUR_DAYS.start(offset), offset)]));
    }
    for offset in [-12 * HOUR - 1, 14 * HOUR + 1] {
        refused(FOUR_DAYS.check(offset, offset, &[(FOUR_DAYS.start(offset), offset)]));
    }
    // And in a later entry.
    let at = start() + HOUR;
    let case = FOUR_DAYS;
    accepted(case.check(
        13 * HOUR,
        14 * HOUR,
        &[(case.start(13 * HOUR), 13 * HOUR), (at, 14 * HOUR)],
    ));
    refused(case.check(
        13 * HOUR,
        14 * HOUR + 1,
        &[(case.start(13 * HOUR), 13 * HOUR), (at, 14 * HOUR + 1)],
    ));
}

#[test]
fn neighbours_differ_by_no_more_than_two_hours_and_by_something() {
    let at = start() + HOUR;
    // Equal.
    refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (at, 0)]));
    // Exactly two hours apart, up and down.
    accepted(FOUR_DAYS.check(0, 2 * HOUR, &[(start(), 0), (at, 2 * HOUR)]));
    accepted(FOUR_DAYS.check(
        2 * HOUR,
        0,
        &[(FOUR_DAYS.start(2 * HOUR), 2 * HOUR), (at, 0)],
    ));
    // Two hours and a second.
    refused(FOUR_DAYS.check(0, 2 * HOUR + 1, &[(start(), 0), (at, 2 * HOUR + 1)]));
    refused(FOUR_DAYS.check(
        2 * HOUR + 1,
        0,
        &[(FOUR_DAYS.start(2 * HOUR + 1), 2 * HOUR + 1), (at, 0)],
    ));
}

#[test]
fn the_last_offset_is_within_two_hours_of_the_one_range_end_implies() {
    accepted(FOUR_DAYS.check(0, 2 * HOUR, &[(start(), 0)]));
    accepted(FOUR_DAYS.check(0, -2 * HOUR, &[(start(), 0)]));
    refused(FOUR_DAYS.check(0, 2 * HOUR + 1, &[(start(), 0)]));
    refused(FOUR_DAYS.check(0, -2 * HOUR - 1, &[(start(), 0)]));
}

#[test]
fn no_more_entries_than_the_range_has_days_plus_one() {
    // Four days: five entries are the most.
    let at = |n: i64| start() + n * HOUR;
    let five: Vec<(i64, i64)> = vec![
        (start(), 0),
        (at(1), 3600),
        (at(2), 0),
        (at(3), 3600),
        (at(4), 0),
    ];
    accepted(FOUR_DAYS.check(0, 0, &five));
    let mut six = five.clone();
    six.push((at(5), 3600));
    refused(FOUR_DAYS.check(0, 3600, &six));
}

// --- Arithmetic never panics ---------------------------------------------------

#[test]
fn the_extremes_are_refused_not_panicked() {
    for extreme in [i64::MIN, i64::MAX] {
        // In the first instant, a later instant, and an offset.
        refused(FOUR_DAYS.check(0, 0, &[(extreme, 0)]));
        refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (extreme, 3600)]));
        refused(FOUR_DAYS.check(0, 0, &[(start(), extreme)]));
        refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (start() + HOUR, extreme)]));
        // In the bounds themselves.
        refused(
            check_offsets(
                date("2026-09-03"),
                date("2026-09-06"),
                extreme,
                FOUR_DAYS.end(0),
                &[(extreme, 0)],
            )
            .map_err(|trouble| trouble.message),
        );
        refused(
            check_offsets(
                date("2026-09-03"),
                date("2026-09-06"),
                start(),
                extreme,
                &[(start(), 0)],
            )
            .map_err(|trouble| trouble.message),
        );
    }
    // Neighbours that would overflow a subtraction.
    refused(FOUR_DAYS.check(0, 0, &[(start(), i64::MAX), (start() + 1, i64::MIN)]));
}
