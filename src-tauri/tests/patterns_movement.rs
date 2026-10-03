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

// --- Scenarios 13 to 16: a row Cairn saw only part of ------------------------------------

#[test]
fn a_24_hour_gap_from_autumns_midnight_leaves_that_row_part_and_the_next_whole() {
    let rows = autumn(&[(1_792_882_800, 1_792_969_200)], &[]);

    assert_eq!(row_of(&rows, date(2026, 10, 25)).seen, Seen::Part);
    assert_eq!(row_of(&rows, date(2026, 10, 26)).seen, Seen::Whole);
}

#[test]
fn a_gap_from_springs_midnight_over_its_date_and_thirteen_hours_of_the_next_is_none_then_part(
) {
    // M12: the gap once ended an hour into the 30th, which is now a whole row.
    // Widened to 13 hours of it, so that "the next row is part" is still proved.
    let rows = spring(&[(1_774_742_400, 1_774_825_200 + 13 * HOUR)]);

    assert_eq!(row_of(&rows, date(2026, 3, 29)).seen, Seen::None);
    assert_eq!(row_of(&rows, date(2026, 3, 30)).seen, Seen::Part);
}

#[test]
fn a_gap_over_the_last_thirteen_hours_of_yesterday_leaves_it_part_and_today_whole() {
    // M12: two hours is now a whole row; thirteen is more than half.
    let midnight = 1_790_895_600;
    let rows = four_weeks(&[(midnight - 13 * HOUR, midnight)], &[], NOW);

    assert_eq!(row_of(&rows, date(2026, 10, 1)).seen, Seen::Part);
    assert_eq!(row_of(&rows, date(2026, 10, 2)).seen, Seen::Whole);
}

#[test]
fn a_row_holding_a_reach_inside_a_gap_over_all_of_it_is_part_with_its_count() {
    // 2026-09-07 00:00 BST to 2026-09-08 00:00 BST, and a reach at noon.
    let (begins, ends) = (1_788_735_600, 1_788_822_000);
    let rows = four_weeks(&[(begins, ends)], &reaches(&[begins + 12 * HOUR]), NOW);

    let day = row_of(&rows, date(2026, 9, 7));
    assert_eq!((day.seen, day.count), (Seen::Part, 1));
    assert_eq!(row_of(&rows, date(2026, 9, 6)).seen, Seen::Whole);
}

#[test]
fn a_week_with_a_gap_over_four_of_its_seven_dates_is_part() {
    // M12: two of seven is now whole (scenario 61); four is more than half.
    let range = LocalRange {
        first_day: date(2026, 8, 7),
        last_day: date(2026, 10, 2),
        from: 1_786_057_200,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };
    let third_date = 1_786_057_200 + 2 * DAY;
    let rows = movement(&[], &range, &[(third_date, third_date + 4 * DAY)], NOW);

    assert_eq!(rows[0].seen, Seen::Part);
    assert_eq!(rows[1].seen, Seen::Whole);
}

#[test]
fn the_goose_bay_date_under_a_gap_over_the_whole_range_is_part() {
    let changes = [OffsetChange {
        from: 1_289_098_860,
        offset_seconds: -14_400,
    }];
    let day = date(2010, 11, 7);
    let range = LocalRange {
        first_day: day,
        last_day: day,
        from: 1_289_098_800,
        to: 1_289_188_800,
        first_offset: -10_800,
        changes: &changes,
    };
    let rows = movement(
        &reaches(&[1_289_100_600, 1_289_149_200]),
        &range,
        &[(1_289_098_800, 1_289_188_800)],
        1_289_188_800,
    );

    assert_eq!(rows.len(), 1);
    assert_eq!((rows[0].seen, rows[0].count), (Seen::Part, 2));
}

// --- Scenarios 57 to 61: a row is partly seen only when more than half was missed (M12) --

fn tenth_midnight() -> i64 {
    date(2026, 9, 10).days_since_epoch() * DAY - HOUR
}

// Scenario 57
#[test]
fn an_eight_hour_night_unseen_in_a_date_leaves_it_whole() {
    let midnight = tenth_midnight();
    let rows = four_weeks(&[(midnight, midnight + 8 * HOUR)], &[], NOW);

    assert_eq!(row_of(&rows, date(2026, 9, 10)).seen, Seen::Whole);
}

// Scenario 58
#[test]
fn thirteen_hours_unseen_in_a_date_make_it_part() {
    let midnight = tenth_midnight();
    let rows = four_weeks(&[(midnight, midnight + 13 * HOUR)], &[], NOW);

    assert_eq!(row_of(&rows, date(2026, 9, 10)).seen, Seen::Part);
}

// Scenario 59
#[test]
fn exactly_twelve_hours_unseen_in_a_date_is_whole_and_one_second_more_is_part() {
    let midnight = tenth_midnight();
    let rows = four_weeks(&[(midnight, midnight + 12 * HOUR)], &[], NOW);
    assert_eq!(row_of(&rows, date(2026, 9, 10)).seen, Seen::Whole);

    let rows = four_weeks(&[(midnight, midnight + 12 * HOUR + 1)], &[], NOW);
    assert_eq!(row_of(&rows, date(2026, 9, 10)).seen, Seen::Part);
}

// Scenario 60
#[test]
fn today_at_ten_with_six_of_its_ten_hours_unseen_is_part_and_five_is_whole() {
    let midnight = 1_790_895_600;
    let now = midnight + 10 * HOUR;
    let rows = four_weeks(&[(midnight, midnight + 6 * HOUR)], &[], now);
    assert_eq!(row_of(&rows, date(2026, 10, 2)).seen, Seen::Part);

    let rows = four_weeks(&[(midnight, midnight + 5 * HOUR)], &[], now);
    assert_eq!(row_of(&rows, date(2026, 10, 2)).seen, Seen::Whole);
}

// Scenario 61
#[test]
fn a_week_with_two_dates_unseen_is_whole_and_with_four_is_part() {
    let range = LocalRange {
        first_day: date(2026, 8, 7),
        last_day: date(2026, 10, 2),
        from: 1_786_057_200,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };
    let two = movement(&[], &range, &[(range.from, range.from + 2 * DAY)], NOW);
    assert_eq!(two[0].seen, Seen::Whole);

    let four = movement(&[], &range, &[(range.from, range.from + 4 * DAY)], NOW);
    assert_eq!(four[0].seen, Seen::Part);
}

mod holding_a_reach {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn no_row_holding_a_reach_is_none(
            gaps in proptest::collection::vec((0i64..2_419_000, 1i64..2_000_000), 0..5),
            instants in proptest::collection::vec(1_788_562_800i64..1_790_967_600, 0..20),
        ) {
            let mut pairs: Vec<(i64, i64)> = gaps
                .into_iter()
                .map(|(from, length)| {
                    (1_788_562_800 + from, (1_788_562_800 + from + length).min(1_790_982_000))
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

            let rows = four_weeks(&merged, &reaches(&instants), NOW);

            for row in rows {
                prop_assert!(row.count == 0 || row.seen != Seen::None);
            }
        }
    }
}

// --- Scenarios 17 and 18: the row holding today is so far ----------------------------------

fn so_far_of(rows: &[MovementRow]) -> Vec<LocalDate> {
    rows.iter()
        .filter(|row| row.so_far)
        .map(|row| row.day)
        .collect()
}

#[test]
fn only_the_row_holding_today_is_so_far() {
    let rows = four_weeks(&[], &[], NOW);

    assert_eq!(so_far_of(&rows), [date(2026, 10, 2)]);
}

#[test]
fn one_date_which_is_today_is_so_far() {
    let day = date(2026, 10, 2);
    let range = LocalRange {
        first_day: day,
        last_day: day,
        from: 1_790_895_600,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };

    assert_eq!(so_far_of(&movement(&[], &range, &[], NOW)), [day]);
}

#[test]
fn a_gap_eleven_hours_long_today_leaves_todays_row_so_far_and_part() {
    // M12: an hour is whole. Today has 20 hours before `NOW`; eleven is more than half.
    let midnight = 1_790_895_600;
    let rows = four_weeks(&[(midnight + HOUR, midnight + 12 * HOUR)], &[], NOW);

    let today = row_of(&rows, date(2026, 10, 2));
    assert_eq!((today.so_far, today.seen), (true, Seen::Part));
}

#[test]
fn a_gap_after_now_is_not_unseen_time_because_only_instants_before_now_count() {
    let rows = four_weeks(&[(NOW + HOUR, NOW + 2 * HOUR)], &[], NOW);

    let today = row_of(&rows, date(2026, 10, 2));
    assert_eq!((today.so_far, today.seen), (true, Seen::Whole));
}

#[test]
fn after_todays_midnight_no_row_is_so_far() {
    // 2026-10-03 00:30 BST.
    let rows = four_weeks(&[], &[], 1_790_982_000 + 1_800);

    assert_eq!(so_far_of(&rows), Vec::<LocalDate>::new());
}

#[test]
fn a_row_after_today_is_so_far_whole_and_zero() {
    // 2026-09-05 to 2026-10-03, asked at 23:30 on the 2nd.
    let range = LocalRange {
        first_day: date(2026, 9, 5),
        last_day: date(2026, 10, 3),
        from: 1_788_562_800,
        to: 1_791_068_400,
        first_offset: 3600,
        changes: &[],
    };
    let rows = movement(&[], &range, &[], 1_790_982_000 - 1_800);

    assert_eq!(so_far_of(&rows), [date(2026, 10, 2), date(2026, 10, 3)]);
    let tomorrow = row_of(&rows, date(2026, 10, 3));
    assert_eq!((tomorrow.seen, tomorrow.count), (Seen::Whole, 0));
}

#[test]
fn the_last_weekly_row_holding_today_is_so_far() {
    let range = LocalRange {
        first_day: date(2026, 8, 7),
        last_day: date(2026, 10, 2),
        from: 1_786_057_200,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };
    let rows = movement(&[], &range, &[], NOW);

    assert_eq!(rows.len(), 9);
    assert_eq!(so_far_of(&rows), [date(2026, 10, 2)]);
    assert_eq!(rows[8].days, 1);
}

// --- V27: an example at the exact edge of each bound ---------------------------------
//
// Written after the GREEN by an author who did not write it, so that each
// comparison and each clamp in `movement`, `coverage` and `for_each_piece` has an
// example that fails when its bound moves by one.

/// `from` in UTC to `to` in UTC, 0 until `at`, then `+3 h`: an offsets list
/// `check_offsets` accepts, because a clock change is no more than 3 h and the
/// last offset is within one of the 0 the range's end implies. A reach in the
/// last 3 h of the last UTC date reads as the date after `last_day`.
fn clock_forward_near_the_end(
    first_day: LocalDate,
    last_day: LocalDate,
    change_at: i64,
    reaches: &[Reach],
    now: i64,
) -> Vec<MovementRow> {
    let changes = [OffsetChange {
        from: change_at,
        offset_seconds: 3 * 3600,
    }];
    let range = LocalRange {
        first_day,
        last_day,
        from: first_day.days_since_epoch() * DAY,
        to: (last_day.days_since_epoch() + 1) * DAY,
        first_offset: 0,
        changes: &changes,
    };
    movement(reaches, &range, &[], now)
}

#[test]
fn a_daily_reach_that_reads_as_the_date_after_the_last_is_in_the_last_row() {
    let (first, last) = (date(2026, 10, 1), date(2026, 10, 3));
    let change_at = last.days_since_epoch() * DAY + 12 * HOUR;
    // 2026-10-03 22:00 UTC is 2026-10-04 01:00 at +3 h: after `last_day`.
    let late = last.days_since_epoch() * DAY + 22 * HOUR;
    let rows = clock_forward_near_the_end(first, last, change_at, &reaches(&[late]), 0);

    assert_eq!(rows.len(), 3);
    assert_eq!(counts(&rows), [0, 0, 1]);
}

#[test]
fn a_reach_on_the_last_date_before_the_change_is_in_the_last_row_too() {
    // The same range, a reach that reads as the last date itself: the clamp's
    // upper end is the last row, not one short of it.
    let (first, last) = (date(2026, 10, 1), date(2026, 10, 3));
    let change_at = last.days_since_epoch() * DAY + 12 * HOUR;
    let on_the_last = last.days_since_epoch() * DAY + 5 * HOUR;
    let rows =
        clock_forward_near_the_end(first, last, change_at, &reaches(&[on_the_last]), 0);
    assert_eq!(counts(&rows), [0, 0, 1]);
}

#[test]
fn a_weekly_reach_that_reads_as_the_date_after_the_last_is_in_the_last_row() {
    // 63 dates are nine whole weeks, so a date past the last would index a tenth.
    let first = date(2026, 8, 1);
    let last = date(2026, 10, 2);
    assert_eq!(last.days_since_epoch() - first.days_since_epoch() + 1, 63);
    let change_at = last.days_since_epoch() * DAY + 12 * HOUR;
    let late = last.days_since_epoch() * DAY + 22 * HOUR;
    let rows = clock_forward_near_the_end(first, last, change_at, &reaches(&[late]), 0);

    assert_eq!(rows.len(), 9);
    assert!(rows
        .iter()
        .all(|row| row.span == Span::Week && row.days == 7));
    assert_eq!(counts(&rows), [0, 0, 0, 0, 0, 0, 0, 0, 1]);
}

#[test]
fn the_pieces_of_a_range_whose_end_reads_as_the_date_after_are_in_rows_that_exist() {
    // Not over, under `now` before the range, asks `for_each_piece` for every
    // row; the last piece's end reads as the date after `last_day`.
    let (first, last) = (date(2026, 10, 1), date(2026, 10, 3));
    let change_at = last.days_since_epoch() * DAY + 21 * HOUR;
    let rows = clock_forward_near_the_end(first, last, change_at, &[], 0);
    assert_eq!(rows.len(), 3);
    assert!(rows.iter().all(|row| row.so_far));

    let weeks = clock_forward_near_the_end(
        date(2026, 8, 1),
        date(2026, 10, 2),
        date(2026, 10, 2).days_since_epoch() * DAY + 21 * HOUR,
        &[],
        0,
    );
    assert_eq!(weeks.len(), 9);
    assert!(weeks.iter().all(|row| row.so_far));
}

#[test]
fn now_exactly_at_a_rows_local_midnight_leaves_the_row_before_not_so_far() {
    // 2026-09-20 00:00 BST: the end of the 19th and the beginning of the 20th.
    let midnight_20th = date(2026, 9, 20).days_since_epoch() * DAY - HOUR;
    let rows = four_weeks(&[], &[], midnight_20th);
    let so_far = so_far_of(&rows);
    assert_eq!(so_far.first(), Some(&date(2026, 9, 20)));
    assert_eq!(so_far.len(), 13);

    // One second earlier, the 19th is still going.
    let rows = four_weeks(&[], &[], midnight_20th - 1);
    assert_eq!(so_far_of(&rows).first(), Some(&date(2026, 9, 19)));
}

#[test]
fn now_at_the_very_end_of_the_range_leaves_no_row_so_far() {
    let rows = four_weeks(&[], &[], 1_790_982_000);
    assert_eq!(so_far_of(&rows), Vec::<LocalDate>::new());
    let rows = four_weeks(&[], &[], 1_790_982_000 - 1);
    assert_eq!(so_far_of(&rows), [date(2026, 10, 2)]);
}

#[test]
fn now_exactly_at_a_weekly_rows_boundary_leaves_the_week_before_not_so_far() {
    // Weeks of 2026-08-07: the second begins 2026-08-14 00:00 BST.
    let range = LocalRange {
        first_day: date(2026, 8, 7),
        last_day: date(2026, 10, 2),
        from: 1_786_057_200,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };
    let second_week = date(2026, 8, 14).days_since_epoch() * DAY - HOUR;
    let rows = movement(&[], &range, &[], second_week);
    assert_eq!(rows.iter().filter(|row| row.so_far).count(), 8);
    assert!(!rows[0].so_far);
    assert!(rows[1].so_far);
    let rows = movement(&[], &range, &[], second_week - 1);
    assert_eq!(rows.iter().filter(|row| row.so_far).count(), 9);
}

#[test]
fn a_range_of_no_instants_has_no_row_so_far() {
    // `from == to` at mid-day: nothing of the date lies in the range.
    let day = date(2026, 10, 2);
    let noon = day.days_since_epoch() * DAY + 12 * HOUR;
    let range = LocalRange {
        first_day: day,
        last_day: day,
        from: noon,
        to: noon,
        first_offset: 0,
        changes: &[],
    };
    let rows = movement(&reaches(&[noon]), &range, &[], 0);
    assert_eq!(rows.len(), 1);
    assert_eq!((rows[0].count, rows[0].so_far), (0, false));
}

#[test]
fn dates_that_run_backwards_have_no_rows_even_with_a_reach_in_the_instants() {
    let range = LocalRange {
        first_day: date(2026, 10, 3),
        last_day: date(2026, 10, 2),
        from: date(2026, 10, 2).days_since_epoch() * DAY,
        to: date(2026, 10, 4).days_since_epoch() * DAY,
        first_offset: 0,
        changes: &[],
    };
    let at = date(2026, 10, 3).days_since_epoch() * DAY + 100;
    assert!(movement(&reaches(&[at]), &range, &[], 0).is_empty());
}

#[test]
fn a_range_one_date_over_the_daily_limit_is_weekly_and_holds_every_reach_once() {
    // 57 dates at the first and last instants of the range.
    let first = date(2026, 8, 7);
    let last = date(2026, 10, 2);
    let from = first.days_since_epoch() * DAY;
    let to = (last.days_since_epoch() + 1) * DAY;
    let rows = at_offset(first, last, 0, &[], &reaches(&[from, to - 1]), 0);
    assert_eq!(rows.len(), 9);
    assert_eq!(counts(&rows), [1, 0, 0, 0, 0, 0, 0, 0, 1]);
}

#[test]
fn a_weekly_range_leaves_out_a_reach_at_each_side_edge_and_counts_the_next_in() {
    let first = date(2026, 8, 7);
    let last = date(2026, 10, 2);
    let from = first.days_since_epoch() * DAY;
    let to = (last.days_since_epoch() + 1) * DAY;
    let rows = at_offset(
        first,
        last,
        0,
        &[],
        &reaches(&[from - 1, from, to - 1, to]),
        0,
    );
    assert_eq!(counts(&rows), [1, 0, 0, 0, 0, 0, 0, 0, 1]);
}

// Coverage's edges.

/// 2026-09-05 to 2026-10-03 in London, asked at `now`: one row past today.
fn four_weeks_and_tomorrow(unseen: &[(i64, i64)], now: i64) -> Vec<MovementRow> {
    let range = LocalRange {
        first_day: date(2026, 9, 5),
        last_day: date(2026, 10, 3),
        from: 1_788_562_800,
        to: 1_791_068_400,
        first_offset: 3600,
        changes: &[],
    };
    movement(&[], &range, unseen, now)
}

#[test]
fn a_gap_elsewhere_leaves_a_row_wholly_after_now_whole_not_none() {
    // 2026-09-06 02:00-15:00 BST (M12: an hour is whole, thirteen is part); tomorrow, the 3rd, has no seconds before `now`.
    let night = date(2026, 9, 6).days_since_epoch() * DAY - HOUR;
    let rows = four_weeks_and_tomorrow(&[(night + 2 * HOUR, night + 15 * HOUR)], NOW);
    let tomorrow = row_of(&rows, date(2026, 10, 3));
    assert_eq!((tomorrow.seen, tomorrow.so_far), (Seen::Whole, true));
    assert_eq!(row_of(&rows, date(2026, 9, 6)).seen, Seen::Part);
}

#[test]
fn one_unseen_second_leaves_the_row_whole_and_so_does_an_empty_gap() {
    // M12 changes this expectation: one unseen second was part, and is now whole.
    let day = date(2026, 9, 10);
    let midnight = day.days_since_epoch() * DAY - HOUR;
    let rows = four_weeks(&[(midnight + 100, midnight + 101)], &[], NOW);
    assert!(rows.iter().all(|row| row.seen == Seen::Whole));
    let rows = four_weeks(&[(midnight + 100, midnight + 100)], &[], NOW);
    assert!(rows.iter().all(|row| row.seen == Seen::Whole));
}

#[test]
fn a_gap_over_all_but_the_last_second_of_a_date_is_part_and_over_all_of_it_is_none() {
    let day = date(2026, 9, 10);
    let midnight = day.days_since_epoch() * DAY - HOUR;
    let rows = four_weeks(&[(midnight, midnight + DAY - 1)], &[], NOW);
    assert_eq!(row_of(&rows, day).seen, Seen::Part);
    let rows = four_weeks(&[(midnight, midnight + DAY)], &[], NOW);
    assert_eq!(row_of(&rows, day).seen, Seen::None);
    // And a gap that begins one second late leaves a second seen.
    let rows = four_weeks(&[(midnight + 1, midnight + DAY)], &[], NOW);
    assert_eq!(row_of(&rows, day).seen, Seen::Part);
}

#[test]
fn a_gap_ending_at_a_rows_first_instant_or_beginning_at_its_last_leaves_it_whole() {
    let day = date(2026, 9, 10);
    let midnight = day.days_since_epoch() * DAY - HOUR;
    // Ends as the 10th begins: all of the 9th, none of the 10th.
    let rows = four_weeks(&[(midnight - DAY, midnight)], &[], NOW);
    assert_eq!(row_of(&rows, day).seen, Seen::Whole);
    assert_eq!(row_of(&rows, date(2026, 9, 9)).seen, Seen::None);
    // Begins as the 10th ends: none of the 10th.
    let rows = four_weeks(&[(midnight + DAY, midnight + 2 * DAY)], &[], NOW);
    assert_eq!(row_of(&rows, day).seen, Seen::Whole);
    assert_eq!(row_of(&rows, date(2026, 9, 11)).seen, Seen::None);
}

#[test]
fn now_inside_a_row_counts_only_the_seconds_before_it() {
    // The 10th, asked at its 06:00; a gap over its first 6 h is all it has.
    let day = date(2026, 9, 10);
    let midnight = day.days_since_epoch() * DAY - HOUR;
    let now = midnight + 6 * HOUR;
    let rows = four_weeks(&[(midnight, now)], &[], now);
    assert_eq!(row_of(&rows, day).seen, Seen::None);
    // A gap one second short of `now` leaves one second seen.
    let rows = four_weeks(&[(midnight, now - 1)], &[], now);
    assert_eq!(row_of(&rows, day).seen, Seen::Part);
    // A gap that runs on past `now` adds no unseen second after it: three hours
    // before `now` is exactly half of six (whole), where counting the hour after
    // it would make four of six (part). M12 widened this from one second.
    let rows = four_weeks(&[(midnight + 3 * HOUR, now + HOUR)], &[], now);
    assert_eq!(row_of(&rows, day).seen, Seen::Whole);
    assert_eq!(row_of(&rows, date(2026, 9, 11)).seen, Seen::Whole);
}

#[test]
fn now_before_the_range_leaves_every_row_whole_even_under_a_gap() {
    let from = 1_788_562_800;
    let rows = four_weeks(&[(from, from + DAY)], &[], from - 1);
    assert!(rows.iter().all(|row| row.seen == Seen::Whole && row.so_far));
}

#[test]
fn a_gap_before_the_range_starts_counts_nothing() {
    let from = 1_788_562_800;
    let rows = four_weeks(&[(from - DAY, from)], &[], NOW);
    assert!(rows.iter().all(|row| row.seen == Seen::Whole));
}

#[test]
fn a_weekly_row_is_none_only_when_every_one_of_its_seconds_is_unseen() {
    let range = LocalRange {
        first_day: date(2026, 8, 7),
        last_day: date(2026, 10, 2),
        from: 1_786_057_200,
        to: 1_790_982_000,
        first_offset: 3600,
        changes: &[],
    };
    let week = 7 * DAY;
    let begins = 1_786_057_200 + week; // the second week
    let all = movement(&[], &range, &[(begins, begins + week)], NOW);
    assert_eq!(all[1].seen, Seen::None);
    assert_eq!((all[0].seen, all[2].seen), (Seen::Whole, Seen::Whole));
    let most = movement(&[], &range, &[(begins, begins + week - 1)], NOW);
    assert_eq!(most[1].seen, Seen::Part);
    // M12: a second of spill is whole, so the gap spills four dates either side.
    let spill = movement(
        &[],
        &range,
        &[(begins - 4 * DAY, begins + week + 4 * DAY)],
        NOW,
    );
    assert_eq!(
        (spill[0].seen, spill[1].seen, spill[2].seen),
        (Seen::Part, Seen::None, Seen::Part)
    );
}

#[test]
fn a_clock_change_inside_a_weekly_row_sums_the_unseen_seconds_of_both_stretches() {
    // 63 dates, 2026-08-31 to 2026-11-01 in London: nine weeks. The eighth begins
    // at 2026-10-19 00:00 BST, holds the change at 2026-10-25 01:00 UTC, and is 7
    // days and an hour long; the ninth begins at 2026-10-26 00:00 GMT.
    let changes = [OffsetChange {
        from: 1_792_890_000,
        offset_seconds: 0,
    }];
    let range = LocalRange {
        first_day: date(2026, 8, 31),
        last_day: date(2026, 11, 1),
        from: date(2026, 8, 31).days_since_epoch() * DAY - HOUR,
        to: date(2026, 11, 2).days_since_epoch() * DAY,
        first_offset: 3600,
        changes: &changes,
    };
    let begins = date(2026, 10, 19).days_since_epoch() * DAY - HOUR;
    let ends = date(2026, 10, 26).days_since_epoch() * DAY;
    assert_eq!(ends - begins, 7 * DAY + HOUR);
    let ask = |unseen: &[(i64, i64)]| movement(&[], &range, unseen, i64::MAX / 2);
    let seen = |rows: &[MovementRow]| (rows[6].seen, rows[7].seen, rows[8].seen);

    assert_eq!(ask(&[]).len(), 9);
    // M12: seconds are no longer enough to make a row part, so each of these is
    // widened to what it was written to prove.
    // The last four dates of the week before are that week's, and only theirs.
    assert_eq!(
        seen(&ask(&[(begins - 4 * DAY, begins)])),
        (Seen::Part, Seen::Whole, Seen::Whole)
    );
    // The eighth week is 169 hours: 146 before the change, 23 after. A gap across
    // the change that ends where the ninth begins is summed over both stretches.
    // 84 hours is under half and whole; 85 is over and part.
    assert_eq!(
        seen(&ask(&[(1_792_890_000 - 61 * HOUR, ends)])),
        (Seen::Whole, Seen::Whole, Seen::Whole)
    );
    assert_eq!(
        seen(&ask(&[(1_792_890_000 - 62 * HOUR, ends)])),
        (Seen::Whole, Seen::Part, Seen::Whole)
    );
    // Every second of the eighth, across both stretches, is none; one short of
    // either end is part.
    assert_eq!(
        seen(&ask(&[(begins, ends)])),
        (Seen::Whole, Seen::None, Seen::Whole)
    );
    assert_eq!(seen(&ask(&[(begins, ends - 1)])).1, Seen::Part);
    assert_eq!(seen(&ask(&[(begins + 1, ends)])).1, Seen::Part);
    // A gap that spills four dates either side makes the neighbours part.
    assert_eq!(
        seen(&ask(&[(begins - 4 * DAY, ends + 4 * DAY)])),
        (Seen::Part, Seen::None, Seen::Part)
    );
}

// --- A reach on a later row's local midnight is in that row ---------------------------

#[test]
fn a_reach_on_a_dates_local_midnight_in_summer_time_is_in_that_dates_daily_row() {
    // 2026-09-14 00:00 BST is 2026-09-13 23:00 UTC: the 14th's row, not the 13th's.
    let midnight = date(2026, 9, 14).days_since_epoch() * DAY - HOUR;
    let rows = london_summer(date(2026, 9, 5), date(2026, 10, 2), &reaches(&[midnight]));
    assert_eq!(rows.len(), 28);
    assert_eq!(holding(&rows, 1), [date(2026, 9, 14)]);
}

#[test]
fn a_reach_on_a_dates_local_midnight_west_of_utc_is_in_that_dates_daily_row() {
    // 2026-09-14 00:00 at four hours behind UTC is 04:00 UTC.
    let offset = -4 * 3600;
    let midnight = date(2026, 9, 14).days_since_epoch() * DAY + 4 * HOUR;
    let rows = at_offset(
        date(2026, 9, 5),
        date(2026, 10, 2),
        offset,
        &[],
        &reaches(&[midnight]),
        i64::MAX / 2,
    );
    assert_eq!(holding(&rows, 1), [date(2026, 9, 14)]);
}

#[test]
fn a_reach_on_a_weeks_first_local_midnight_is_in_that_week_not_the_one_before() {
    // 57 dates from 2026-08-07: the second row begins on 2026-08-14. Its local
    // midnight in summer time is 2026-08-13 23:00 UTC.
    let midnight = date(2026, 8, 14).days_since_epoch() * DAY - HOUR;
    let rows = london_summer(date(2026, 8, 7), date(2026, 10, 2), &reaches(&[midnight]));
    assert_eq!(rows.len(), 9);
    assert_eq!(rows[1].day, date(2026, 8, 14));
    assert_eq!(counts(&rows), [0, 1, 0, 0, 0, 0, 0, 0, 0]);
}

#[test]
fn a_reach_on_a_weeks_first_local_midnight_west_of_utc_is_in_that_week() {
    let offset = -4 * 3600;
    let midnight = date(2026, 8, 21).days_since_epoch() * DAY + 4 * HOUR;
    let rows = at_offset(
        date(2026, 8, 7),
        date(2026, 10, 2),
        offset,
        &[],
        &reaches(&[midnight]),
        i64::MAX / 2,
    );
    assert_eq!(rows[2].day, date(2026, 8, 21));
    assert_eq!(counts(&rows), [0, 0, 1, 0, 0, 0, 0, 0, 0]);
}

#[test]
fn a_reach_on_the_first_local_midnight_after_springs_change_is_in_that_dates_row() {
    // Clocks go forward at 01:00 UTC on 2026-03-29. 2026-03-30 00:00 BST is
    // 2026-03-29 23:00 UTC: the 30th's row, not the 29th's.
    let changes = [OffsetChange {
        from: date(2026, 3, 29).days_since_epoch() * DAY + HOUR,
        offset_seconds: 3600,
    }];
    let midnight = date(2026, 3, 30).days_since_epoch() * DAY - HOUR;
    let rows = at_offset(
        date(2026, 3, 23),
        date(2026, 4, 19),
        0,
        &changes,
        &reaches(&[midnight]),
        i64::MAX / 2,
    );
    assert_eq!(holding(&rows, 1), [date(2026, 3, 30)]);
}

#[test]
fn a_reach_on_the_first_local_midnight_after_autumns_change_is_in_that_dates_row() {
    // Clocks go back at 01:00 UTC on 2026-10-25. 2026-10-26 00:00 GMT is
    // 00:00 UTC: the 26th's row, not the 25th's.
    let changes = [OffsetChange {
        from: date(2026, 10, 25).days_since_epoch() * DAY + HOUR,
        offset_seconds: 0,
    }];
    let midnight = date(2026, 10, 26).days_since_epoch() * DAY;
    let rows = at_offset(
        date(2026, 10, 19),
        date(2026, 11, 15),
        BST,
        &changes,
        &reaches(&[midnight]),
        i64::MAX / 2,
    );
    assert_eq!(holding(&rows, 1), [date(2026, 10, 26)]);
}
