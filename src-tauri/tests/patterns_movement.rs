//! The rows of a range, placed by the offset in force at each reach's own
//! instant (slice `history-movement`; plan scenarios 1 to 24 and
//! `contracts/patterns.md` as amended 2026-10-02).
//!
//! `movement(reaches, range, unseen, now)` is pure: the offsets, the gaps and the
//! present are supplied, never looked up. Properties are checked against the
//! inputs alone, by plain filters, not by a second bucketing pass; every expected
//! value in the examples is read off the calendar. No feature gate: the domain
//! builds without the history.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::dates::LocalDate;
use cairn::domain::patterns::{
    movement, LocalRange, MovementRow, OffsetChange, Reach, Seen, Span,
};

const HOUR: i64 = 3600;
const DAY: i64 = 86_400;

fn reach(at: i64) -> Reach {
    Reach {
        domain: "a.example".into(),
        at,
    }
}

fn reaches(instants: &[i64]) -> Vec<Reach> {
    instants.iter().copied().map(reach).collect()
}

fn date(year: i32, month: u8, day: u8) -> LocalDate {
    LocalDate::new(year, month, day).unwrap()
}

/// A range of whole dates at one offset, from the first date's local midnight
/// to the one after the last.
fn at_offset(
    first_day: LocalDate,
    last_day: LocalDate,
    offset: i32,
    changes: &[OffsetChange],
    reaches: &[Reach],
    now: i64,
) -> Vec<MovementRow> {
    let from = first_day.days_since_epoch() * DAY - i64::from(offset);
    let to = (last_day.days_since_epoch() + 1) * DAY - i64::from(offset);
    let range = LocalRange {
        first_day,
        last_day,
        from,
        to,
        first_offset: offset,
        changes,
    };
    movement(reaches, &range, &[], now)
}

fn counts(rows: &[MovementRow]) -> Vec<u32> {
    rows.iter().map(|row| row.count).collect()
}

// --- Scenarios 1, 2: the rows exist and are daily ------------------------------------

#[test]
fn twenty_eight_dates_are_twenty_eight_daily_rows_from_the_first_date() {
    let first = date(2026, 9, 5);
    let last = date(2026, 10, 2);
    let at = |day: LocalDate, seconds: i64| day.days_since_epoch() * DAY + seconds;
    let reaches = reaches(&[
        at(date(2026, 9, 7), 100),
        at(date(2026, 9, 7), 200),
        at(date(2026, 9, 30), 100),
    ]);

    let rows = at_offset(first, last, 0, &[], &reaches, at(last, 12 * HOUR));

    assert_eq!(rows.len(), 28);
    for (index, row) in rows.iter().enumerate() {
        assert_eq!(
            row.day.days_since_epoch(),
            first.days_since_epoch() + index as i64
        );
        assert_eq!((row.days, row.span), (1, Span::Day));
    }
    let mut expected = [0u32; 28];
    expected[2] = 2;
    expected[25] = 1;
    assert_eq!(counts(&rows), expected);
}

#[test]
fn one_date_is_one_row_and_a_quiet_range_is_rows_at_zero() {
    let day = date(2026, 10, 2);
    let rows = at_offset(day, day, 0, &[], &[], day.days_since_epoch() * DAY);
    assert_eq!(rows.len(), 1);
    assert_eq!(
        (rows[0].days, rows[0].span, rows[0].count),
        (1, Span::Day, 0)
    );
}

#[test]
fn a_first_date_after_the_last_has_no_rows() {
    let rows = at_offset(date(2026, 10, 3), date(2026, 10, 2), 0, &[], &[], 0);
    assert!(rows.is_empty());
}

#[test]
fn a_reach_before_the_range_and_one_at_its_end_are_in_no_row() {
    let first = date(2026, 9, 5);
    let last = date(2026, 9, 6);
    let from = first.days_since_epoch() * DAY;
    let to = (last.days_since_epoch() + 1) * DAY;
    let rows = at_offset(
        first,
        last,
        0,
        &[],
        &reaches(&[from - 1, from, to - 1, to]),
        to,
    );
    assert_eq!(counts(&rows), [1, 1]);
}

// --- Scenarios 3 to 7: a long range is weekly ----------------------------------------

/// London, summer time all the way: the offset at both ends of a range inside it.
const BST: i32 = 3600;

fn london_summer(
    first: LocalDate,
    last: LocalDate,
    reaches: &[Reach],
) -> Vec<MovementRow> {
    at_offset(first, last, BST, &[], reaches, i64::MAX / 2)
}

#[test]
fn fifty_six_dates_are_still_fifty_six_daily_rows() {
    let rows = london_summer(date(2026, 8, 8), date(2026, 10, 2), &[]);
    assert_eq!(rows.len(), 56);
    assert!(rows
        .iter()
        .all(|row| row.span == Span::Day && row.days == 1));
}

#[test]
fn fifty_seven_dates_are_nine_weekly_rows_the_last_one_date_long() {
    let first = date(2026, 8, 7);
    let rows = london_summer(first, date(2026, 10, 2), &[]);

    assert_eq!(rows.len(), 9);
    assert!(rows.iter().all(|row| row.span == Span::Week));
    for (index, row) in rows.iter().take(8).enumerate() {
        assert_eq!(row.days, 7);
        assert_eq!(
            row.day.days_since_epoch(),
            first.days_since_epoch() + 7 * index as i64
        );
    }
    assert_eq!(rows[8].days, 1);
    assert_eq!(rows[8].day, date(2026, 10, 2));
    assert_eq!(rows.iter().map(|row| row.days).sum::<u32>(), 57);
}

#[test]
fn a_reach_at_a_weeks_last_half_hour_and_one_just_after_are_in_neighbouring_rows() {
    // 2026-08-13 23:30 BST and 2026-08-14 00:30 BST.
    let rows = london_summer(
        date(2026, 8, 7),
        date(2026, 10, 2),
        &reaches(&[1_786_660_200, 1_786_663_800]),
    );
    assert_eq!(&counts(&rows)[..3], [1, 1, 0]);
}

#[test]
fn a_year_across_both_changes_is_53_weekly_rows_and_the_july_reach_is_in_the_26th() {
    // 2025-07-01 23:30 UTC, which is 2 July 00:30 BST.
    let changes = [
        OffsetChange {
            from: 1_743_296_400,
            offset_seconds: 3600,
        },
        OffsetChange {
            from: 1_761_440_400,
            offset_seconds: 0,
        },
    ];
    let rows = at_offset(
        date(2025, 1, 1),
        date(2025, 12, 31),
        0,
        &changes,
        &reaches(&[1_751_412_600]),
        i64::MAX / 2,
    );

    assert_eq!(rows.len(), 53);
    assert_eq!((rows[52].day, rows[52].days), (date(2025, 12, 31), 1));
    assert_eq!(rows[26].day, date(2025, 7, 2));
    assert_eq!(rows[26].count, 1);
    assert_eq!(rows[25].count, 0);
}

mod properties {
    use super::*;
    use proptest::prelude::*;

    /// A range of 1 to 400 dates in 2026 at one offset, with reaches placed
    /// anywhere from before it to after it.
    fn a_range() -> impl Strategy<Value = (i64, i64, i32, Vec<i64>)> {
        let first = date(2026, 1, 1).days_since_epoch();
        (0i64..300, 1i64..400, -12 * 3600i32..14 * 3600).prop_flat_map(
            move |(shift, length, offset)| {
                let first_day = first + shift;
                let from = first_day * DAY - i64::from(offset);
                let to = from + length * DAY;
                (
                    Just(first_day),
                    Just(length),
                    Just(offset),
                    proptest::collection::vec(from - 2 * DAY..to + 2 * DAY, 0..60),
                )
            },
        )
    }

    fn rows_of(
        first_day: i64,
        length: i64,
        offset: i32,
        instants: &[i64],
    ) -> Vec<MovementRow> {
        at_offset(
            LocalDate::from_days_since_epoch(first_day),
            LocalDate::from_days_since_epoch(first_day + length - 1),
            offset,
            &[],
            &reaches(instants),
            i64::MAX / 2,
        )
    }

    proptest! {
        #[test]
        fn the_rows_are_contiguous_and_their_days_are_the_ranges_length(
            (first_day, length, offset, instants) in a_range()
        ) {
            let rows = rows_of(first_day, length, offset, &instants);
            prop_assert_eq!(rows[0].day.days_since_epoch(), first_day);
            for pair in rows.windows(2) {
                prop_assert_eq!(
                    pair[1].day.days_since_epoch(),
                    pair[0].day.days_since_epoch() + i64::from(pair[0].days)
                );
            }
            prop_assert_eq!(rows.iter().map(|row| i64::from(row.days)).sum::<i64>(), length);
        }

        #[test]
        fn counts_are_conserved_and_the_order_of_reaches_does_not_matter(
            (first_day, length, offset, instants) in a_range()
        ) {
            let from = first_day * DAY - i64::from(offset);
            let to = from + length * DAY;
            let inside = instants.iter().filter(|at| **at >= from && **at < to).count();
            let rows = rows_of(first_day, length, offset, &instants);
            prop_assert_eq!(rows.iter().map(|row| row.count as usize).sum::<usize>(), inside);

            let mut reversed = instants.clone();
            reversed.reverse();
            prop_assert_eq!(rows_of(first_day, length, offset, &reversed), rows);
        }

        #[test]
        fn a_reachs_row_holds_its_instant(
            (first_day, length, offset, instants) in a_range()
        ) {
            let from = first_day * DAY - i64::from(offset);
            let to = from + length * DAY;
            for at in instants.into_iter().filter(|at| *at >= from && *at < to) {
                let rows = rows_of(first_day, length, offset, &[at]);
                let local = (at + i64::from(offset)).div_euclid(DAY);
                let held: Vec<&MovementRow> = rows.iter().filter(|row| row.count == 1).collect();
                prop_assert_eq!(held.len(), 1);
                let begins = held[0].day.days_since_epoch();
                prop_assert!(begins <= local && local < begins + i64::from(held[0].days));
            }
        }
    }
}

// --- Scenarios 8 to 12: a reach is in the row of its own local date ------------------

/// A range given by its bounds, as the interface would have computed them.
fn ranged(
    (first_day, last_day): (LocalDate, LocalDate),
    (from, to): (i64, i64),
    first_offset: i32,
    changes: &[OffsetChange],
    reaches: &[Reach],
) -> Vec<MovementRow> {
    let range = LocalRange {
        first_day,
        last_day,
        from,
        to,
        first_offset,
        changes,
    };
    movement(reaches, &range, &[], to)
}

fn holding(rows: &[MovementRow], count: u32) -> Vec<LocalDate> {
    rows.iter()
        .filter(|row| row.count == count)
        .map(|row| row.day)
        .collect()
}

#[test]
fn a_reach_at_the_last_minute_of_a_date_and_one_at_the_first_of_the_next_are_in_two_rows()
{
    let local = |day: LocalDate, hour: i64, minute: i64| {
        day.days_since_epoch() * DAY + hour * HOUR + minute * 60 - HOUR
    };
    let rows = london_summer(
        date(2026, 9, 5),
        date(2026, 10, 2),
        &reaches(&[
            local(date(2026, 9, 13), 23, 59),
            local(date(2026, 9, 14), 0, 1),
        ]),
    );
    assert_eq!(holding(&rows, 1), [date(2026, 9, 13), date(2026, 9, 14)]);
}

#[test]
fn half_past_eleven_at_night_in_utc_is_half_past_midnight_in_summer_time() {
    // 2026-09-13 23:30 UTC.
    let at = date(2026, 9, 13).days_since_epoch() * DAY + 23 * HOUR + 1_800;
    let rows = london_summer(date(2026, 9, 5), date(2026, 10, 2), &reaches(&[at]));
    assert_eq!(holding(&rows, 1), [date(2026, 9, 14)]);
}

#[test]
fn autumns_two_ends_of_the_25_hour_date_are_in_one_row() {
    // 2026-10-25 00:30 BST and 23:30 GMT.
    let changes = [OffsetChange {
        from: 1_792_890_000,
        offset_seconds: 0,
    }];
    let rows = ranged(
        (date(2026, 10, 19), date(2026, 11, 1)),
        AUTUMN_RANGE,
        3600,
        &changes,
        &reaches(&[1_792_884_600, 1_792_971_000]),
    );
    assert_eq!(rows.len(), 14);
    assert_eq!(holding(&rows, 2), [date(2026, 10, 25)]);
}

#[test]
fn springs_late_evening_utc_is_the_next_date_in_summer_time() {
    // 2026-03-29 23:30 UTC is 00:30 BST on the 30th.
    let changes = [OffsetChange {
        from: 1_774_746_000,
        offset_seconds: 3600,
    }];
    let rows = ranged(
        (date(2026, 3, 23), date(2026, 4, 5)),
        (1_774_224_000, 1_775_430_000),
        0,
        &changes,
        &reaches(&[1_774_827_000]),
    );
    assert_eq!(holding(&rows, 1), [date(2026, 3, 30)]);
}

#[test]
fn a_skipped_midnight_places_the_first_reach_in_the_first_row_under_either_first_offset()
{
    // Africa/Cairo, 2026-04-24: the clocks skip midnight.
    let start = 1_776_981_600;
    let end = date(2026, 5, 1).days_since_epoch() * DAY - 3 * HOUR;
    for first_offset in [3 * 3600, 2 * 3600] {
        let rows = ranged(
            (date(2026, 4, 24), date(2026, 4, 30)),
            (start, end),
            first_offset,
            &[],
            &reaches(&[start + 60]),
        );
        assert_eq!(
            holding(&rows, 1),
            [date(2026, 4, 24)],
            "first offset {first_offset}"
        );
    }
}

#[test]
fn a_clock_change_just_after_midnight_puts_both_reaches_in_the_one_row() {
    // America/Goose_Bay, 2010-11-07, whose clocks went back at 00:01: the
    // instants after it read as the day before the range's only date.
    let changes = [OffsetChange {
        from: 1_289_098_860,
        offset_seconds: -14_400,
    }];
    let day = date(2010, 11, 7);
    let rows = ranged(
        (day, day),
        (1_289_098_800, 1_289_188_800),
        -10_800,
        &changes,
        &reaches(&[1_289_100_600, 1_289_149_200]),
    );
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].count, 2, "nothing lost, nothing counted twice");
}

// --- Scenarios 13 to 16, 20 and 24: what Cairn saw of each row ---------------------------

/// 2026-10-19 00:00 BST to 2026-11-02 00:00 GMT.
const AUTUMN_RANGE: (i64, i64) = (1_792_364_400, 1_793_577_600);
/// 2026-11-03 12:00 GMT: after the autumn range.
const AFTER_AUTUMN: i64 = 1_793_707_200;
/// 2026-10-02 20:00 BST.
const NOW: i64 = 1_790_967_600;

fn autumn(unseen: &[(i64, i64)], reaches: &[Reach]) -> Vec<MovementRow> {
    let changes = [OffsetChange {
        from: 1_792_890_000,
        offset_seconds: 0,
    }];
    let range = LocalRange {
        first_day: date(2026, 10, 19),
        last_day: date(2026, 11, 1),
        from: AUTUMN_RANGE.0,
        to: AUTUMN_RANGE.1,
        first_offset: 3600,
        changes: &changes,
    };
    movement(reaches, &range, unseen, AFTER_AUTUMN)
}

fn spring(unseen: &[(i64, i64)]) -> Vec<MovementRow> {
    let changes = [OffsetChange {
        from: 1_774_746_000,
        offset_seconds: 3600,
    }];
    let range = LocalRange {
        first_day: date(2026, 3, 23),
        last_day: date(2026, 4, 5),
        from: 1_774_224_000,
        to: 1_775_430_000,
        first_offset: 0,
        changes: &changes,
    };
    movement(&[], &range, unseen, NOW)
}

/// 2026-09-05 to 2026-10-02 in London, asked at `now`.
fn four_weeks(unseen: &[(i64, i64)], reaches: &[Reach], now: i64) -> Vec<MovementRow> {
    let range = LocalRange {
        first_day: date(2026, 9, 5),
        last_day: date(2026, 10, 2),
        from: 1_788_562_800,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };
    movement(reaches, &range, unseen, now)
}

fn seen_of(rows: &[MovementRow]) -> Vec<Seen> {
    rows.iter().map(|row| row.seen).collect()
}

fn row_of(rows: &[MovementRow], day: LocalDate) -> MovementRow {
    *rows
        .iter()
        .find(|row| row.day == day)
        .expect("a row for the date")
}

#[test]
fn a_gap_over_all_25_hours_of_autumns_date_makes_that_row_none_and_not_its_neighbours() {
    let rows = autumn(&[(1_792_882_800, 1_792_972_800)], &[]);

    let day = row_of(&rows, date(2026, 10, 25));
    assert_eq!((day.seen, day.count), (Seen::None, 0));
    assert_eq!(row_of(&rows, date(2026, 10, 24)).seen, Seen::Whole);
    assert_eq!(row_of(&rows, date(2026, 10, 26)).seen, Seen::Whole);
    assert_eq!(rows.iter().filter(|row| row.seen == Seen::None).count(), 1);
}

#[test]
fn a_gap_over_all_23_hours_of_springs_date_makes_it_none_and_the_next_whole() {
    let rows = spring(&[(1_774_742_400, 1_774_825_200)]);

    assert_eq!(row_of(&rows, date(2026, 3, 29)).seen, Seen::None);
    assert_eq!(row_of(&rows, date(2026, 3, 30)).seen, Seen::Whole);
}

#[test]
fn a_gap_that_ends_at_a_local_midnight_leaves_the_next_row_whole() {
    let midnight = 1_790_895_600; // 2026-10-02 00:00 BST
    let rows = four_weeks(&[(midnight - 2 * HOUR, midnight)], &[], NOW);

    assert_eq!(row_of(&rows, date(2026, 10, 2)).seen, Seen::Whole);
}

#[test]
fn a_gap_from_todays_midnight_to_now_makes_todays_row_none() {
    let midnight = 1_790_895_600;
    let rows = four_weeks(&[(midnight, NOW)], &[], NOW);

    let today = row_of(&rows, date(2026, 10, 2));
    assert_eq!((today.seen, today.count), (Seen::None, 0));
    assert_eq!(row_of(&rows, date(2026, 10, 1)).seen, Seen::Whole);
}

#[test]
fn a_range_wholly_inside_one_gap_has_every_row_none_at_zero() {
    let rows = four_weeks(&[(1_788_562_800, NOW)], &[], NOW);

    assert_eq!(seen_of(&rows), vec![Seen::None; 28]);
    assert!(rows.iter().all(|row| row.count == 0));

    // The weekly case: 2026-08-08 to 2026-09-04 is 28 dates, still daily; ask
    // for the 57 dates before it ends with the same gap over all of it.
    let range = LocalRange {
        first_day: date(2026, 8, 7),
        last_day: date(2026, 10, 2),
        from: 1_786_057_200,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };
    let weekly = movement(&[], &range, &[(1_786_057_200, NOW)], NOW);
    assert_eq!(weekly.len(), 9);
    assert_eq!(seen_of(&weekly), vec![Seen::None; 9]);
}

#[test]
fn a_gap_over_the_first_weeks_dates_and_the_second_rows_are_judged_apart() {
    let range = LocalRange {
        first_day: date(2026, 8, 7),
        last_day: date(2026, 10, 2),
        from: 1_786_057_200,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };
    let first_week_ends = 1_786_057_200 + 7 * DAY;
    let rows = movement(&[], &range, &[(1_786_057_200, first_week_ends)], NOW);

    assert_eq!(rows[0].seen, Seen::None);
    assert_eq!(rows[1].seen, Seen::Whole);
}

mod seen_properties {
    use super::*;
    use proptest::prelude::*;

    fn rank(seen: Seen) -> u8 {
        match seen {
            Seen::None => 0,
            Seen::Part => 1,
            Seen::Whole => 2,
        }
    }

    /// Up to six gaps, sorted and merged, inside the four weeks.
    fn gaps() -> impl Strategy<Value = Vec<(i64, i64)>> {
        proptest::collection::vec((0i64..2_419_000, 1i64..400_000), 0..6).prop_map(
            |raw| {
                let mut pairs: Vec<(i64, i64)> = raw
                    .into_iter()
                    .map(|(from, length)| {
                        (
                            1_788_562_800 + from,
                            (1_788_562_800 + from + length).min(1_790_982_000),
                        )
                    })
                    .collect();
                pairs.sort_unstable();
                let mut merged: Vec<(i64, i64)> = Vec::new();
                for (from, to) in pairs {
                    match merged.last_mut() {
                        Some(last) if from <= last.1 => last.1 = last.1.max(to),
                        _ => merged.push((from, to)),
                    }
                }
                merged
            },
        )
    }

    proptest! {
        #[test]
        fn adding_unseen_time_never_makes_a_row_more_seen(
            before in gaps(), extra in gaps()
        ) {
            let mut after: Vec<(i64, i64)> = before.iter().chain(extra.iter()).copied().collect();
            after.sort_unstable();
            let mut merged: Vec<(i64, i64)> = Vec::new();
            for (from, to) in after {
                match merged.last_mut() {
                    Some(last) if from <= last.1 => last.1 = last.1.max(to),
                    _ => merged.push((from, to)),
                }
            }
            let less = four_weeks(&before, &[], NOW);
            let more = four_weeks(&merged, &[], NOW);
            for (one, other) in less.iter().zip(&more) {
                prop_assert!(rank(other.seen) <= rank(one.seen));
            }
        }
    }
}
