//! The bounds of a range, each limit held at its edge and one second past it
//! (slice `history-by-site`, scenario 9).
//!
//! As `bounds_and_clipping.rs` holds `check_bounds`. The offset of an end is
//! how far its instant is from the UTC midnight of the date it should begin.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::dates::LocalDate;
use cairn::reflection::over_time::check_range;

const HOUR: i64 = 3600;
const DAY: i64 = 86_400;

fn date(text: &str) -> LocalDate {
    serde_json::from_str(&format!("\"{text}\"")).unwrap()
}

fn midnight(day: LocalDate) -> i64 {
    day.days_since_epoch() * DAY
}

/// 2026-09-03 to 2026-09-30, the plan's fixed range.
fn first() -> LocalDate {
    date("2026-09-03")
}
fn last() -> LocalDate {
    date("2026-09-30")
}
fn after_last() -> LocalDate {
    date("2026-10-01")
}

/// A moment well after every range here has begun.
const LATER: i64 = 2_000_000_000;

fn check(start_offset: i64, end_offset: i64) -> bool {
    check_range(
        first(),
        last(),
        midnight(first()) + start_offset,
        midnight(after_last()) + end_offset,
        LATER,
    )
    .is_ok()
}

fn in_voice(sentence: &str) {
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

#[test]
fn an_ordinary_range_is_accepted() {
    assert!(check(0, 0));
}

#[test]
fn a_refusal_is_one_plain_sentence() {
    let trouble = check_range(first(), last(), 0, 0, LATER).unwrap_err();
    assert_eq!(
        trouble.message,
        "Cairn could not tell which days those are just now, so it has shown nothing. \
         Protection is unaffected."
    );
    in_voice(&trouble.message);
}

#[test]
fn the_first_day_may_be_the_last_but_not_after_it() {
    let day = date("2026-09-30");
    let next = date("2026-10-01");
    assert!(check_range(day, day, midnight(day), midnight(next), LATER).is_ok());
    assert!(
        check_range(next, day, midnight(next), midnight(next), LATER).is_err(),
        "a first day after the last"
    );
    let later = date("2026-10-02");
    assert!(check_range(later, day, midnight(later), midnight(next), LATER).is_err());
}

#[test]
fn the_start_may_be_fourteen_hours_before_its_date_and_no_more() {
    assert!(check(-14 * HOUR, -14 * HOUR));
    assert!(!check(-14 * HOUR - 1, -14 * HOUR));
}

#[test]
fn the_start_may_be_twelve_hours_after_its_date_and_no_more() {
    assert!(check(12 * HOUR, 12 * HOUR));
    assert!(!check(12 * HOUR + 1, 12 * HOUR));
}

#[test]
fn the_end_may_be_fourteen_hours_before_the_day_after_and_no_more() {
    assert!(check(-14 * HOUR, -14 * HOUR));
    assert!(!check(-14 * HOUR, -14 * HOUR - 1));
}

#[test]
fn the_end_may_be_twelve_hours_after_the_day_after_and_no_more() {
    assert!(check(12 * HOUR, 12 * HOUR));
    assert!(!check(12 * HOUR, 12 * HOUR + 1));
}

#[test]
fn an_end_a_day_short_is_refused() {
    // `range_end` at the start of `last_day` itself: the range would drop its
    // last day.
    let range_end = midnight(last());
    assert!(check_range(first(), last(), midnight(first()), range_end, LATER).is_err());
}

#[test]
fn the_ends_offsets_may_differ_by_three_hours_and_no_more() {
    // Three hours is the largest change in tzdata (Antarctica/Casey, +11 to +08).
    assert!(check(0, 3 * HOUR));
    assert!(!check(0, 3 * HOUR + 1));
    assert!(check(3 * HOUR, 0));
    assert!(!check(3 * HOUR + 1, 0));
    assert!(check(0, -3 * HOUR));
    assert!(!check(0, -3 * HOUR - 1));
}

#[test]
fn a_range_that_begins_at_the_present_is_accepted_and_one_second_later_is_not() {
    let start = midnight(first());
    let end = midnight(first()) + DAY;
    assert!(check_range(first(), first(), start, end, start).is_ok());
    assert!(check_range(first(), first(), start, end, start - 1).is_err());
    assert!(check_range(first(), first(), start, end, start + 1).is_ok());
}

#[test]
fn a_range_may_end_no_later_than_the_end_of_today() {
    // Today's own range ends at the next midnight: at most a day and a clock
    // change from now. Anything later asks for days that have not happened,
    // which the screen never does (R2).
    let now = midnight(first()) + 12 * HOUR;
    let end = midnight(first()) + DAY;
    assert!(check_range(first(), first(), midnight(first()), end, now).is_ok());

    let tomorrow = date("2026-09-04");
    let far_end = midnight(tomorrow) + DAY;
    assert!(check_range(tomorrow, tomorrow, midnight(tomorrow), far_end, now).is_err());

    // Nor the last day there is: it used to slip past the estimates count by
    // sorting as text.
    let last_of_all = date("9999-12-31");
    let start = midnight(last_of_all);
    assert!(
        check_range(first(), last_of_all, midnight(first()), start + DAY, now).is_err()
    );
}

#[test]
fn four_weeks_across_a_twenty_three_hour_day_are_accepted() {
    // London: clocks went forward on 2026-03-29, so 03-29 had 23 hours. The
    // range begins at 00:00 GMT and ends at 00:00 BST, which is 23:00 UTC.
    let (first, last, after) =
        (date("2026-03-16"), date("2026-04-12"), date("2026-04-13"));
    assert!(
        check_range(first, last, midnight(first), midnight(after) - HOUR, LATER).is_ok()
    );
}

#[test]
fn four_weeks_across_a_twenty_five_hour_day_are_accepted() {
    // London: clocks went back on 2026-10-25, so that day had 25 hours. The
    // range begins at 00:00 BST (23:00 UTC the day before) and ends at 00:00
    // GMT.
    let (first, last, after) =
        (date("2026-10-12"), date("2026-11-08"), date("2026-11-09"));
    assert!(
        check_range(first, last, midnight(first) - HOUR, midnight(after), LATER).is_ok()
    );
}

#[test]
fn a_range_across_both_changes_is_accepted_when_its_ends_agree() {
    let (first, last, after) =
        (date("2026-03-01"), date("2026-11-01"), date("2026-11-02"));
    assert!(check_range(first, last, midnight(first), midnight(after), LATER).is_ok());
}

#[test]
fn an_instant_at_either_extreme_is_refused_not_a_panic() {
    for extreme in [i64::MIN, i64::MAX] {
        // every position an extreme can take in the two bounds and in `now`
        assert!(check_range(first(), first(), extreme, 0, 0).is_err());
        assert!(check_range(first(), first(), 0, extreme, 0).is_err());
        assert!(check_range(first(), last(), extreme, extreme, extreme).is_err());
        assert!(check_range(first(), last(), midnight(first()), extreme, LATER).is_err());
        assert!(
            check_range(first(), last(), extreme, midnight(after_last()), LATER).is_err()
        );
    }
}

#[test]
fn the_end_may_be_a_day_and_a_clock_change_past_now_and_no_more() {
    // The latest an end can be: the next midnight is at most a day and the
    // largest clock change (three hours) after now.
    let end = midnight(after_last()) + 3 * HOUR;
    let now = end - DAY - 3 * HOUR;
    let start = midnight(first());
    assert!(check_range(first(), last(), start, end, now).is_ok());
    assert!(check_range(first(), last(), start, end, now - 1).is_err());
}
