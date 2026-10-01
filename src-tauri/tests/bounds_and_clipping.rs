//! The edges of a day, held exactly (mutation testing, write-tonight).
//!
//! `check_bounds` takes a span of up to 26 hours, and `clipped` keeps only
//! the part of a gap that has length inside the day. Both survived a `>` to
//! `>=` mutant until these held the edge itself.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::dates::LocalDate;
use cairn::reflection::checkin::check_bounds;
use cairn::store::gaps::{clipped, Gap};

const HOUR: i64 = 3600;

fn day() -> (LocalDate, i64) {
    let day: LocalDate = serde_json::from_str("\"2026-10-01\"").unwrap();
    (day, day.days_since_epoch() * 86_400)
}

#[test]
fn a_span_of_exactly_twenty_six_hours_is_still_a_day() {
    let (day, midnight) = day();
    assert!(check_bounds(day, midnight, midnight + 26 * HOUR).is_ok());
    assert!(check_bounds(day, midnight, midnight + 26 * HOUR + 1).is_err());
}

#[test]
fn a_gap_with_no_length_inside_the_day_is_dropped() {
    let (_, midnight) = day();
    let end = midnight + 24 * HOUR;
    let gaps = [
        Gap {
            from: midnight + 5 * HOUR,
            to: midnight + 5 * HOUR,
        },
        Gap {
            from: end,
            to: end + 3 * HOUR,
        },
        Gap {
            from: midnight + HOUR,
            to: midnight + 2 * HOUR,
        },
    ];
    let kept = clipped(&gaps, midnight, end);
    assert_eq!(
        kept.len(),
        1,
        "only the gap with length inside the day: {kept:?}"
    );
    assert_eq!(
        (kept[0].from, kept[0].to),
        (midnight + HOUR, midnight + 2 * HOUR)
    );
}
