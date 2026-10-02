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
    movement, LocalRange, MovementRow, OffsetChange, Reach, Span,
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
