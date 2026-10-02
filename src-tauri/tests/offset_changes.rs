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
fn antarctica_caseys_three_hour_change_of_2018_is_accepted() {
    // Casey went from +11:00 to +08:00 at 2018-03-10 17:00 UTC, the largest change in
    // tzdata. Epoch integers found with Node under TZ=Antarctica/Casey.
    let case = Case {
        first: "2018-03-01",
        last: "2018-03-31",
        after_last: "2018-04-01",
    };
    assert_eq!(case.start(39_600), 1_519_822_800);
    let (first, changes) = case
        .check(
            39_600,
            28_800,
            &[(1_519_822_800, 39_600), (1_520_701_200, 28_800)],
        )
        .unwrap();
    assert_eq!(first, 39_600);
    assert_eq!(
        changes,
        [OffsetChange {
            from: 1_520_701_200,
            offset_seconds: 28_800
        }]
    );
    // And the way back, 2018-10-06 at 20:00 UTC, +08:00 to +11:00 (2018-10-01 to 14).
    let back = Case {
        first: "2018-10-01",
        last: "2018-10-14",
        after_last: "2018-10-15",
    };
    accepted(back.check(
        28_800,
        39_600,
        &[(1_538_323_200, 28_800), (1_538_856_000, 39_600)],
    ));
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
fn the_first_offset_is_the_one_range_start_implies_or_up_to_a_clock_change_above_it() {
    // Amended in K23: a clock that skips its first midnight begins the day an
    // hour late, at the new offset, so the offset in force is up to one change
    // above the implied one. Amended in A3: never below it, for a clock that
    // skips a midnight only ever puts the offset up.
    let start = FOUR_DAYS.start(3600);
    accepted(FOUR_DAYS.check(3600, 3600, &[(start, 3600)]));
    accepted(FOUR_DAYS.check(3600, 3600, &[(start, 3600 + 3 * HOUR)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(start, 3600 - 1)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(start, 3600 - HOUR)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(start, 3600 - 3 * HOUR)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(start, 3600 - 3 * HOUR - 1)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(start, 3600 + 3 * HOUR + 1)]));
    refused(FOUR_DAYS.check(3600, 3600, &[(start, 3600 + 5 * HOUR)]));
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
    for offset in [-13 * HOUR - 1, 14 * HOUR + 1] {
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
fn neighbours_differ_by_no_more_than_three_hours_and_by_something() {
    let at = start() + HOUR;
    // Equal.
    refused(FOUR_DAYS.check(0, 0, &[(start(), 0), (at, 0)]));
    // Exactly three hours apart, up and down.
    accepted(FOUR_DAYS.check(0, 3 * HOUR, &[(start(), 0), (at, 3 * HOUR)]));
    accepted(FOUR_DAYS.check(
        3 * HOUR,
        0,
        &[(FOUR_DAYS.start(3 * HOUR), 3 * HOUR), (at, 0)],
    ));
    // Three hours and a second.
    refused(FOUR_DAYS.check(0, 3 * HOUR + 1, &[(start(), 0), (at, 3 * HOUR + 1)]));
    refused(FOUR_DAYS.check(
        3 * HOUR + 1,
        0,
        &[(FOUR_DAYS.start(3 * HOUR + 1), 3 * HOUR + 1), (at, 0)],
    ));
}

#[test]
fn the_last_offset_is_within_three_hours_of_the_one_range_end_implies() {
    accepted(FOUR_DAYS.check(0, 3 * HOUR, &[(start(), 0)]));
    accepted(FOUR_DAYS.check(0, -3 * HOUR, &[(start(), 0)]));
    refused(FOUR_DAYS.check(0, 3 * HOUR + 1, &[(start(), 0)]));
    refused(FOUR_DAYS.check(0, -3 * HOUR - 1, &[(start(), 0)]));
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

// --- Zones that change at midnight (K23) ------------------------------------------
//
// Epoch seconds are fixed constants, found with Node under each `TZ`. At a
// skipped midnight the zone's `new Date(y, m, d)` is 01:00 at the new offset, so
// the start implies the old offset and the offset in force is the new one.

fn assert_placed(
    case: &Case,
    start_offset: i64,
    end_offset: i64,
    offsets: &[(i64, i64)],
) {
    accepted(case.check(start_offset, end_offset, offsets));
    check_range(
        date(case.first),
        date(case.last),
        case.start(start_offset),
        case.end(end_offset),
        LATER,
    )
    .expect("the range's own bounds are accepted");
}

#[test]
fn a_range_starting_on_a_skipped_midnight_is_placed_with_the_offset_in_force() {
    let zones = [
        // Africa/Cairo 2026-04-24: +02:00 to +03:00 at 00:00.
        (
            "2026-04-24",
            "2026-04-30",
            "2026-05-01",
            7200,
            10_800,
            10_800,
        ),
        // America/Santiago 2026-09-06: -04:00 to -03:00 at 00:00.
        (
            "2026-09-06",
            "2026-09-10",
            "2026-09-11",
            -14_400,
            -10_800,
            -10_800,
        ),
        // America/Havana 2026-03-08: -05:00 to -04:00 at 00:00.
        (
            "2026-03-08",
            "2026-03-12",
            "2026-03-13",
            -18_000,
            -14_400,
            -14_400,
        ),
        // Asia/Beirut 2026-03-29: +02:00 to +03:00 at 00:00.
        (
            "2026-03-29",
            "2026-04-02",
            "2026-04-03",
            7200,
            10_800,
            10_800,
        ),
    ];
    for (first, last, after_last, implied, in_force, end_offset) in zones {
        let case = Case {
            first,
            last,
            after_last,
        };
        assert_placed(
            &case,
            implied,
            end_offset,
            &[(case.start(implied), in_force)],
        );
        let (offset, changes) = case
            .check(implied, end_offset, &[(case.start(implied), in_force)])
            .unwrap();
        assert_eq!(i64::from(offset), in_force, "{first}");
        assert!(changes.is_empty(), "{first}");
    }
    // The probe that sealed Over time: Cairo from 2026-04-24, start 1_776_981_600.
    let cairo = Case {
        first: "2026-04-24",
        last: "2026-04-30",
        after_last: "2026-05-01",
    };
    assert_eq!(cairo.start(7200), 1_776_981_600);
}

#[test]
fn a_first_offset_more_than_a_clock_change_from_the_implied_one_is_still_refused() {
    let cairo = Case {
        first: "2026-04-24",
        last: "2026-04-30",
        after_last: "2026-05-01",
    };
    let at = cairo.start(7200);
    refused(cairo.check(7200, 10_800, &[(at, 7200 + 3 * HOUR + 1)]));
    refused(cairo.check(7200, 10_800, &[(at, 7200 - 3 * HOUR - 1)]));
    accepted(cairo.check(7200, 10_800, &[(at, 7200 + 3 * HOUR)]));
}

#[test]
fn a_range_ending_on_a_skipped_midnight_is_placed_and_its_last_offset_held() {
    // Cairo: a range ending 2026-04-23 ends at the change's instant, 1_776_981_600,
    // which implies the old offset (+7200); the day after that, 2026-04-24, ends
    // at 1_777_064_400 and implies +10800.
    let ends_at_change = Case {
        first: "2026-04-20",
        last: "2026-04-23",
        after_last: "2026-04-24",
    };
    assert_eq!(ends_at_change.end(7200), 1_776_981_600);
    let s = ends_at_change.start(7200);
    assert_placed(&ends_at_change, 7200, 7200, &[(s, 7200)]);
    // An entry at the range's end is outside it.
    refused(ends_at_change.check(7200, 7200, &[(s, 7200), (1_776_981_600, 10_800)]));
    accepted(ends_at_change.check(7200, 7200, &[(s, 7200), (1_776_981_599, 10_800)]));
    // The last offset is held to the one the end implies.
    refused(ends_at_change.check(7200, 7200, &[(s, 7200 + 3 * HOUR + 1)]));

    let after = Case {
        first: "2026-04-20",
        last: "2026-04-24",
        after_last: "2026-04-25",
    };
    let s = after.start(7200);
    assert_placed(&after, 7200, 10_800, &[(s, 7200), (1_776_981_600, 10_800)]);
    assert_placed(&after, 7200, 10_800, &[(s, 7200)]);
    refused(after.check(
        7200,
        10_800,
        &[(s, 7200), (1_776_981_600, 10_800 + 3 * HOUR + 1)],
    ));
}

#[test]
fn a_repeated_midnight_is_placed_at_the_start_and_at_the_end_of_a_range() {
    // America/Havana 2026-11-01: 01:00 (-04:00) falls back to 00:00 (-05:00) at
    // 1_793_509_200; midnight happens twice and `new Date` gives the first,
    // 1_793_505_600, at -04:00.
    let from_it = Case {
        first: "2026-11-01",
        last: "2026-11-05",
        after_last: "2026-11-06",
    };
    assert_eq!(from_it.start(-14_400), 1_793_505_600);
    assert_placed(
        &from_it,
        -14_400,
        -18_000,
        &[(1_793_505_600, -14_400), (1_793_509_200, -18_000)],
    );
    // Beginning at the second midnight: -05:00 is both implied and in force.
    assert_placed(&from_it, -18_000, -18_000, &[(1_793_509_200, -18_000)]);
    refused(from_it.check(-14_400, -18_000, &[(1_793_505_600, -14_400 + 3 * HOUR + 1)]));

    let to_it = Case {
        first: "2026-10-28",
        last: "2026-10-31",
        after_last: "2026-11-01",
    };
    assert_eq!(to_it.end(-14_400), 1_793_505_600);
    let s = to_it.start(-14_400);
    assert_placed(&to_it, -14_400, -14_400, &[(s, -14_400)]);
    refused(to_it.check(-14_400, -14_400, &[(s, -14_400), (1_793_505_600, -18_000)]));
    refused(to_it.check(-14_400, -14_400, &[(s, -14_400 + 3 * HOUR + 1)]));

    let through_it = Case {
        first: "2026-10-28",
        last: "2026-11-01",
        after_last: "2026-11-02",
    };
    let s = through_it.start(-14_400);
    assert_placed(
        &through_it,
        -14_400,
        -18_000,
        &[(s, -14_400), (1_793_509_200, -18_000)],
    );
    // The second midnight as a range's end implies -05:00; holding -04:00 to the
    // end is within a clock change, and -07:00 would not be.
    assert_placed(&through_it, -14_400, -18_000, &[(s, -14_400)]);
    refused(through_it.check(
        -14_400,
        -18_000,
        &[(s, -14_400), (1_793_509_200, -18_000 - 3 * HOUR - 1)],
    ));
}
