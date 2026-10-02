//! The days of the week of a range, counted by the offset in force at each
//! reach's own instant, and how many of each weekday the range holds (slice
//! `history-by-weekday`, gaps review W3 to W5; plan scenarios 4 to 11 and
//! `contracts/patterns.md` as amended 2026-10-02).
//!
//! `by_weekday(reaches, first_offset, changes, from, to)` is pure: the offsets
//! are supplied, never looked up. `weekdays_in(first_day, last_day)` is calendar
//! arithmetic and takes no offset. Properties are checked against the inputs
//! alone, by plain filters, not by a second bucketing pass; every expected
//! value in the examples is read off the calendar (a date and its weekday), not
//! from running the code. No feature gate: the domain builds without the
//! history.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use proptest::prelude::*;

use cairn::domain::dates::LocalDate;
use cairn::domain::patterns::{
    by_hour, by_weekday, summarize, weekdays_in, OffsetChange, Reach,
};

const HOUR: i64 = 3600;
const DAY: i64 = 86_400;

/// Weekday numbers, as `LocalDate::weekday` gives them.
const MON: usize = 0;
const TUE: usize = 1;
const WED: usize = 2;
const THU: usize = 3;
const FRI: usize = 4;
const SUN: usize = 6;

fn reach(at: i64) -> Reach {
    Reach {
        domain: "a.example".into(),
        at,
    }
}

fn reaches(instants: &[i64]) -> Vec<Reach> {
    instants.iter().copied().map(reach).collect()
}

fn change(from: i64, offset_seconds: i32) -> OffsetChange {
    OffsetChange {
        from,
        offset_seconds,
    }
}

fn date(year: i32, month: u8, day: u8) -> LocalDate {
    LocalDate::new(year, month, day).unwrap()
}

/// The UTC instant `seconds` into `day`.
fn utc(day: LocalDate, seconds: i64) -> i64 {
    day.days_since_epoch() * DAY + seconds
}

/// Which weekdays hold anything, as `(weekday, count)`.
fn occupied(counts: &[u32; 7]) -> Vec<(usize, u32)> {
    counts
        .iter()
        .copied()
        .enumerate()
        .filter(|(_, count)| *count > 0)
        .collect()
}

/// 2026-10-25 01:00 UTC: London's clocks go back, +3 600 to 0.
const AUTUMN: i64 = 1_792_890_000;
/// 2026-03-29 01:00 UTC: London's clocks go forward, 0 to +3 600.
const SPRING: i64 = 1_774_746_000;

// --- by_weekday: examples (scenarios 4 to 9) --------------------------------------

/// Scenario 4: 23:59 and 00:01 by the clock, and a UTC evening that is already
/// the next morning in London.
#[test]
fn midnight_by_the_clock_not_by_utc() {
    // Sunday 2026-09-13 23:59 BST, Monday 2026-09-14 00:01 BST.
    let monday_midnight_bst = utc(date(2026, 9, 14), 0) - HOUR;
    let from = monday_midnight_bst - 7 * DAY;
    let to = monday_midnight_bst + 7 * DAY;
    let counts = by_weekday(
        &reaches(&[monday_midnight_bst - 60, monday_midnight_bst + 60]),
        3_600,
        &[],
        from,
        to,
    );
    assert_eq!(occupied(&counts), [(MON, 1), (SUN, 1)]);

    // 23:30 UTC on Sunday is 00:30 on Monday in London: Monday, not Sunday.
    let evening = utc(date(2026, 9, 13), 23 * HOUR + 1_800);
    let counts = by_weekday(&reaches(&[evening]), 3_600, &[], from, to);
    assert_eq!(occupied(&counts), [(MON, 1)]);
}

/// Scenario 5: the clocks go back. The 25-hour Sunday is one Sunday.
#[test]
fn autumn_the_25_hour_sunday_is_one_sunday() {
    let from = utc(date(2026, 10, 19), 0) - HOUR;
    let to = utc(date(2026, 11, 2), 0);
    let early = utc(date(2026, 10, 24), 23 * HOUR + 1_800); // Sunday 00:30 BST
    let late = utc(date(2026, 10, 25), 23 * HOUR + 1_800); // Sunday 23:30 GMT
    let counts = by_weekday(
        &reaches(&[early, late]),
        3_600,
        &[change(AUTUMN, 0)],
        from,
        to,
    );
    assert_eq!(occupied(&counts), [(SUN, 2)]);
    // Under the summer offset kept past the change, the second is on Monday.
    let kept = by_weekday(&reaches(&[late]), 3_600, &[], from, to);
    assert_eq!(occupied(&kept), [(MON, 1)]);
}

/// Scenario 6: the clocks go forward. The 23-hour Sunday is one Sunday.
#[test]
fn spring_the_23_hour_sunday_is_one_sunday() {
    let from = utc(date(2026, 3, 23), 0);
    let to = utc(date(2026, 4, 5), 0) - HOUR;
    let late = utc(date(2026, 3, 29), 23 * HOUR + 1_800); // Monday 00:30 BST
    let before = SPRING - 1; // Sunday 00:59:59 GMT
    let counts = by_weekday(
        &reaches(&[before, late]),
        0,
        &[change(SPRING, 3_600)],
        from,
        to,
    );
    assert_eq!(occupied(&counts), [(MON, 1), (SUN, 1)]);
}

/// Scenario 7: a year whose two ends agree still holds a summer.
#[test]
fn a_year_whose_ends_agree_buckets_summer_by_summer() {
    let from = utc(date(2026, 1, 1), 0);
    let to = utc(date(2027, 1, 1), 0);
    // 2026-07-05, a Sunday, at 23:30 UTC is Monday 00:30 BST.
    let at = utc(date(2026, 7, 5), 23 * HOUR + 1_800);
    let counts = by_weekday(
        &reaches(&[at]),
        0,
        &[change(SPRING, 3_600), change(AUTUMN, 0)],
        from,
        to,
    );
    assert_eq!(occupied(&counts), [(MON, 1)]);
}

/// Scenario 8: a clock that skips its first midnight (Cairo, 2026-04-24).
#[test]
fn a_skipped_midnight_places_the_first_reach_on_friday_under_either_offset() {
    // Friday 2026-04-24 at 00:00 at +2 is 22:00 UTC on the 23rd.
    let start = utc(date(2026, 4, 23), 22 * HOUR);
    let to = utc(date(2026, 5, 1), 0) - 3 * HOUR;
    for first in [10_800, 7_200] {
        let counts = by_weekday(
            &reaches(&[start + 60]),
            first,
            &[change(start, first)],
            start,
            to,
        );
        assert_eq!(occupied(&counts), [(FRI, 1)], "first offset {first}");
    }
    // The range that ends at the change's own instant ends on Thursday.
    let end = start;
    let counts = by_weekday(&reaches(&[end - 1]), 7_200, &[], end - 7 * DAY, end);
    assert_eq!(occupied(&counts), [(THU, 1)]);
}

/// Scenario 9: the same instant, two zones. The core keeps nothing between calls.
#[test]
fn the_weekday_follows_the_offsets_sent() {
    // Tuesday 2026-09-15 23:30 UTC: Wednesday 00:30 in London (+1 h)...
    let at = utc(date(2026, 9, 15), 23 * HOUR + 1_800);
    let from = utc(date(2026, 9, 14), 0);
    let to = utc(date(2026, 9, 17), 0);
    let london = by_weekday(&reaches(&[at]), 3_600, &[], from, to);
    // ...and Tuesday 19:30 in New York (-4 h).
    let new_york = by_weekday(&reaches(&[at]), -4 * 3_600, &[], from, to);
    let london_again = by_weekday(&reaches(&[at]), 3_600, &[], from, to);
    assert_eq!(occupied(&london), [(WED, 1)]);
    assert_eq!(occupied(&new_york), [(TUE, 1)]);
    assert_eq!(london_again, london);
}

#[test]
fn the_edges_of_the_range_are_left_out() {
    let counts = by_weekday(&reaches(&[99, 100, 3_699, 3_700]), 0, &[], 100, 3_700);
    assert_eq!(counts.iter().sum::<u32>(), 2);
}

#[test]
fn a_change_is_in_force_from_its_own_second() {
    // 1970-01-01 was a Thursday; an hour behind UTC, second 999 is still
    // Wednesday evening.
    let counts = by_weekday(&reaches(&[1_000 - 1]), -HOUR as i32, &[], -DAY, DAY);
    assert_eq!(occupied(&counts), [(WED, 1)]);
    let changed = by_weekday(
        &reaches(&[1_000 - 1, 1_000]),
        -HOUR as i32,
        &[change(1_000, 0)],
        -DAY,
        DAY,
    );
    // At 999 the offset is -1 h (Wednesday 23:43); at 1000 it is 0 (Thursday).
    assert_eq!(occupied(&changed), [(WED, 1), (THU, 1)]);
}

// --- weekdays_in: examples ---------------------------------------------------------

#[test]
fn one_day_holds_one_of_its_weekday() {
    // 2026-09-15 is a Tuesday.
    let days = weekdays_in(date(2026, 9, 15), date(2026, 9, 15));
    assert_eq!(days, [0, 1, 0, 0, 0, 0, 0]);
}

#[test]
fn three_days_hold_three_weekdays_and_four_hold_none() {
    // Friday 2026-09-11 to Sunday 2026-09-13.
    let days = weekdays_in(date(2026, 9, 11), date(2026, 9, 13));
    assert_eq!(days, [0, 0, 0, 0, 1, 1, 1]);
}

#[test]
fn ten_days_are_uneven() {
    // Saturday 2026-09-12 to Monday 2026-09-21: two Saturdays, two Sundays,
    // two Mondays, one of each other day.
    let days = weekdays_in(date(2026, 9, 12), date(2026, 9, 21));
    assert_eq!(days, [2, 1, 1, 1, 1, 2, 2]);
}

#[test]
fn a_year_that_begins_and_ends_on_a_thursday_holds_53_thursdays() {
    // 2026-01-01 and 2026-12-31 are both Thursdays; 365 = 52 * 7 + 1.
    let days = weekdays_in(date(2026, 1, 1), date(2026, 12, 31));
    assert_eq!(days, [52, 52, 52, 53, 52, 52, 52]);
}

#[test]
fn four_whole_weeks_hold_four_of_each() {
    let days = weekdays_in(date(2026, 9, 7), date(2026, 10, 4));
    assert_eq!(days, [4; 7]);
}

#[test]
fn a_first_day_after_the_last_gives_seven_zeros() {
    assert_eq!(weekdays_in(date(2026, 9, 8), date(2026, 9, 7)), [0; 7]);
}

#[test]
fn a_range_of_more_days_than_a_count_holds_saturates() {
    let first = LocalDate::from_days_since_epoch(-20_000_000_000);
    let last = LocalDate::from_days_since_epoch(20_000_000_000);
    let days = weekdays_in(first, last);
    // 40 000 000 001 days: a seventh of them is 5.7 billion, past u32.
    assert!(days.iter().all(|count| *count == u32::MAX), "{days:?}");
}

// --- Properties: by_weekday ----------------------------------------------------------

/// A range, a sorted strictly increasing list of changes inside it, and reaches
/// placed before, inside and after it.
fn scenario() -> impl Strategy<Value = (i64, i64, i32, Vec<OffsetChange>, Vec<i64>)> {
    (
        -1_000_000_000i64..=2_000_000_000i64,
        1i64..=40 * DAY,
        -43_200i32..=50_400i32,
    )
        .prop_flat_map(|(from, span, first)| {
            let to = from + span;
            (
                prop::collection::btree_set(from + 1..to, 0..6),
                prop::collection::vec(-43_200i32..=50_400i32, 6),
                prop::collection::vec(from - span..=to + span, 0..60),
            )
                .prop_map(move |(instants, offsets, ats)| {
                    let changes: Vec<OffsetChange> = instants
                        .into_iter()
                        .zip(offsets)
                        .map(|(from, offset_seconds)| OffsetChange {
                            from,
                            offset_seconds,
                        })
                        .collect();
                    (from, to, first, changes, ats)
                })
        })
}

/// The offset in force at `at`, by a plain scan from the latest change back.
fn offset_at(first: i32, changes: &[OffsetChange], at: i64) -> i32 {
    changes
        .iter()
        .rev()
        .find(|change| change.from <= at)
        .map_or(first, |change| change.offset_seconds)
}

fn weekday_of(at: i64, offset: i32) -> usize {
    LocalDate::from_days_since_epoch((at + i64::from(offset)).div_euclid(DAY)).weekday()
        as usize
}

proptest! {
    /// Always 7 entries, and the sum is the reaches in `[from, to)`, which is
    /// also what `by_hour` counts.
    #[test]
    fn the_sum_is_the_reaches_in_the_range_and_by_hours_sum(
        (from, to, first, changes, ats) in scenario(),
    ) {
        let counts = by_weekday(&reaches(&ats), first, &changes, from, to);
        prop_assert_eq!(counts.len(), 7);
        let expected = ats.iter().filter(|at| **at >= from && **at < to).count() as u32;
        prop_assert_eq!(counts.iter().sum::<u32>(), expected);
        let hours = by_hour(&reaches(&ats), first, &changes, from, to);
        prop_assert_eq!(counts.iter().sum::<u32>(), hours.iter().sum::<u32>());
    }

    /// Each reach is on the weekday of its local day, by the offset in force at
    /// its own instant, found by a plain scan.
    #[test]
    fn each_reach_is_on_the_weekday_of_its_local_day(
        (from, to, first, changes, ats) in scenario(),
    ) {
        let mut expected = [0u32; 7];
        for at in ats.iter().filter(|at| **at >= from && **at < to) {
            expected[weekday_of(*at, offset_at(first, &changes, *at))] += 1;
        }
        prop_assert_eq!(by_weekday(&reaches(&ats), first, &changes, from, to), expected);
    }

    /// With no changes it is what `summarize` gives for that offset.
    #[test]
    fn with_no_changes_it_is_summarizes_weekdays(
        (from, to, first, _changes, ats) in scenario(),
    ) {
        let counts = by_weekday(&reaches(&ats), first, &[], from, to);
        let summary = summarize(&reaches(&ats), &[], first, from, to);
        prop_assert_eq!(counts.to_vec(), summary.by_weekday);
    }

    /// A reach's weekday depends only on the last change at or before its
    /// instant: a change after it leaves it alone.
    #[test]
    fn a_change_after_a_reach_leaves_it_alone(
        (from, to, first, changes, ats) in scenario(),
        later in 0i64..1_000,
        offset in -43_200i32..=50_400i32,
    ) {
        let Some(at) = ats.iter().copied().find(|at| *at >= from && *at < to) else {
            return Ok(());
        };
        let one = vec![at];
        let before = by_weekday(&reaches(&one), first, &changes, from, to);
        let mut extended = changes.clone();
        let last = extended.last().map_or(from, |last| last.from);
        let after_it = last.max(at) + 1 + later;
        extended.push(OffsetChange { from: after_it, offset_seconds: offset });
        let after = by_weekday(&reaches(&one), first, &extended, from, after_it.max(to) + 1);
        prop_assert_eq!(before, after);
    }

    /// The reaches' order does not matter.
    #[test]
    fn the_order_of_the_reaches_does_not_matter(
        (from, to, first, changes, ats) in scenario(),
    ) {
        let mut reversed = ats.clone();
        reversed.reverse();
        prop_assert_eq!(
            by_weekday(&reaches(&ats), first, &changes, from, to),
            by_weekday(&reaches(&reversed), first, &changes, from, to)
        );
    }
}

// --- Properties: weekdays_in -----------------------------------------------------------

const WIDE_DAY_RANGE: std::ops::RangeInclusive<i64> = -3_650_000..=3_650_000;

fn days_between() -> impl Strategy<Value = (i64, i64)> {
    (WIDE_DAY_RANGE, 0i64..=3_650_000).prop_map(|(first, length)| (first, first + length))
}

proptest! {
    /// The sum is the number of days in `first_day..=last_day`.
    #[test]
    fn the_sum_is_the_number_of_days((first, last) in days_between()) {
        let counts = weekdays_in(
            LocalDate::from_days_since_epoch(first),
            LocalDate::from_days_since_epoch(last),
        );
        prop_assert_eq!(
            counts.iter().map(|count| u64::from(*count)).sum::<u64>(),
            (last - first + 1) as u64
        );
    }

    /// Any two entries differ by at most one.
    #[test]
    fn any_two_entries_differ_by_at_most_one((first, last) in days_between()) {
        let counts = weekdays_in(
            LocalDate::from_days_since_epoch(first),
            LocalDate::from_days_since_epoch(last),
        );
        let most = counts.iter().max().unwrap();
        let least = counts.iter().min().unwrap();
        prop_assert!(most - least <= 1, "{:?}", counts);
    }

    /// A multiple of seven days gives seven equal entries.
    #[test]
    fn a_multiple_of_seven_days_gives_seven_equal_entries(
        first in WIDE_DAY_RANGE,
        weeks in 1i64..=100_000,
    ) {
        let counts = weekdays_in(
            LocalDate::from_days_since_epoch(first),
            LocalDate::from_days_since_epoch(first + 7 * weeks - 1),
        );
        prop_assert_eq!(counts, [weeks as u32; 7]);
    }

    /// The entries that get one more run on from `first_day`'s weekday.
    #[test]
    fn the_extra_days_run_on_from_the_first_days_weekday(
        (first, last) in days_between(),
    ) {
        let first_day = LocalDate::from_days_since_epoch(first);
        let counts = weekdays_in(first_day, LocalDate::from_days_since_epoch(last));
        let days = (last - first + 1) as u64;
        let (base, extra) = (days / 7, days % 7);
        let start = first_day.weekday() as u64;
        for weekday in 0..7u64 {
            let steps_in = (weekday + 7 - start) % 7;
            let expected = base + u64::from(steps_in < extra);
            prop_assert_eq!(u64::from(counts[weekday as usize]), expected, "{}", weekday);
        }
    }

    /// A first day after the last gives seven zeros.
    #[test]
    fn a_first_day_after_the_last_gives_zeros(
        last in WIDE_DAY_RANGE,
        beyond in 1i64..=1_000,
    ) {
        prop_assert_eq!(
            weekdays_in(
                LocalDate::from_days_since_epoch(last + beyond),
                LocalDate::from_days_since_epoch(last),
            ),
            [0u32; 7]
        );
    }
}

/// Y23, the limit stated in a test (adversary A3): `check_offsets` accepts a list the
/// computer could not send, so a reach can land on a weekday the range does not hold.
/// London, 2026-09-15 (a Tuesday) alone: `range_start` is 23:00 UTC the day before, and a
/// first offset of +4 h is 3 hours above the implied +1 h, inside the rule. A reach 30
/// minutes before `range_end` is 02:30 on Wednesday by that offset, though `days` holds
/// Tuesday alone. The contract says no more than this.
#[cfg(feature = "history")]
#[test]
fn an_accepted_offset_list_can_place_a_reach_on_a_weekday_the_range_does_not_hold() {
    use cairn::reflection::over_time::check_offsets;

    let day = date(2026, 9, 15);
    let range_start = utc(day, 0) - HOUR;
    let range_end = utc(date(2026, 9, 16), 0) - HOUR;
    let (first, changes) =
        check_offsets(day, day, range_start, range_end, &[(range_start, 4 * HOUR)])
            .expect("accepted: 3 hours above the implied offset");

    let counts = by_weekday(
        &reaches(&[range_end - 1_800]),
        first,
        &changes,
        range_start,
        range_end,
    );
    let held = weekdays_in(day, day);

    assert_eq!(counts, [0, 0, 1, 0, 0, 0, 0]);
    assert_eq!(held, [0, 1, 0, 0, 0, 0, 0]);
    assert_eq!(held[WED], 0, "a reach on a weekday whose days is 0");
}

#[test]
fn a_clock_change_after_midnight_puts_a_reach_on_a_date_the_range_does_not_hold() {
    // Adversary W-A1: America/Goose_Bay, 2010-11-07, a Sunday. The clocks went back at
    // 00:01 to Saturday 23:01, so instants inside Sunday's range read as Saturday. These
    // are the exact bounds and offsets the screen sent for that day.
    let start = 1_289_098_800; // 2010-11-07 00:00 -03:00
    let end = 1_289_188_800; // 2010-11-08 00:00 -04:00
    let changes = [OffsetChange {
        from: 1_289_098_860,
        offset_seconds: -14_400,
    }];
    let saturday_23_30 = reach(1_289_100_600);
    let sunday_midday = reach(1_289_149_200);

    let weekdays = by_weekday(
        &[saturday_23_30, sunday_midday],
        -10_800,
        &changes,
        start,
        end,
    );
    // Monday = 0 … Saturday = 5, Sunday = 6.
    assert_eq!(weekdays, [0, 0, 0, 0, 0, 1, 1]);
    // The range holds one Sunday and no Saturday, so Saturday is days 0 with a count:
    // the screen must draw it, not hide it (Y23).
    let sunday: LocalDate = serde_json::from_str("\"2010-11-07\"").unwrap();
    assert_eq!(weekdays_in(sunday, sunday), [0, 0, 0, 0, 0, 0, 1]);
}
