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
