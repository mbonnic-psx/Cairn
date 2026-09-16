//! The announcement decision that the rewritten notification guard leans on
//! (`contracts/patterns.md`, `domain/checkin.rs`; research R2; FR-001, FR-002,
//! FR-004, FR-006).
//!
//! `announcement_due` is a pure function over an explicit clock, never a timer
//! that resets when a window reopens — that is the whole reason it is provable
//! by unit test at any call frequency rather than by inspecting a running
//! process. These tests hold it to the five properties `contracts/patterns.md`
//! states as its contract, and to the boundary instants where an off-by-one
//! would live.
//!
//! This file does not assert that anything is written. `announcement_due`
//! decides; the caller records. A `Some(day)` passed as `last_announced`
//! below stands in for "the caller already recorded this," never for a write
//! this test performs.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use proptest::prelude::*;

use cairn::domain::checkin::announcement_due;
use cairn::domain::dates::LocalDate;

const SECONDS_PER_HOUR: i64 = 3_600;
const SECONDS_PER_DAY: i64 = 86_400;

/// A day-number range wide enough to land solidly before the epoch as well as
/// solidly after it — this function must not assume the calendar starts at
/// the epoch.
const WIDE_DAY_RANGE: std::ops::RangeInclusive<i64> = -3_650_000..=3_650_000;

/// The start of `day`, in epoch seconds, the way the interface would compute
/// it: the day's own offset from the epoch, times the length of a day.
fn day_start_for(day: LocalDate) -> i64 {
    day.days_since_epoch() * SECONDS_PER_DAY
}

fn some_day(day_number: i64) -> LocalDate {
    LocalDate::from_days_since_epoch(day_number)
}

proptest! {
    // --- Property 1: at most once per day ------------------------------
    //
    // The property the guard rewrite depends on. Given widely, across many
    // days, hours, and switch states, all it takes to stay silent for the
    // rest of a day is having already been recorded for it.

    /// Once the caller has recorded an announcement for a given calendar day,
    /// no instant within that day produces a second one — not near the
    /// chosen hour, not at either end of the day, switch on or off.
    #[test]
    fn once_recorded_that_day_stays_silent_at_any_later_moment(
        day_number in WIDE_DAY_RANGE,
        chosen_hour in 0u8..=23,
        offset_into_day in 0i64..SECONDS_PER_DAY,
        switched_on in any::<bool>(),
    ) {
        let day = some_day(day_number);
        let day_start = day_start_for(day);
        let now = day_start + offset_into_day;

        prop_assert!(!announcement_due(day, day_start, chosen_hour, now, Some(day), switched_on));
    }

    // --- Property 2: never early ----------------------------------------

    /// Before the chosen hour arrives on a given day, nothing makes the
    /// answer true — swept across the whole span from the day's start to one
    /// second before the hour, for every possibility of what was last
    /// recorded and whether the switch is on.
    #[test]
    fn no_announcement_before_the_chosen_hour_has_arrived(
        day_number in WIDE_DAY_RANGE,
        chosen_hour in 1u8..=23, // hour zero has no instant strictly before it
        raw_offset in 0i64..SECONDS_PER_HOUR,
        last_announced_choice in 0u8..3,
        switched_on in any::<bool>(),
    ) {
        let day = some_day(day_number);
        let day_start = day_start_for(day);
        let hour_seconds = i64::from(chosen_hour) * SECONDS_PER_HOUR;
        // Fold into [0, hour_seconds) so the offset always lands strictly
        // before the hour, whatever the hour's own span happens to be.
        let offset = raw_offset % hour_seconds;
        let now = day_start + offset;

        let last_announced = match last_announced_choice {
            0 => None,
            1 => Some(day),
            _ => Some(some_day(day_number - 1)),
        };

        prop_assert!(!announcement_due(day, day_start, chosen_hour, now, last_announced, switched_on));
    }

    // --- Property 3: never late ------------------------------------------

    /// Once a day has ended, nothing makes the answer true — including a
    /// `last_announced` unrelated to this day. FR-006 is explicit that an
    /// hour which passed while Cairn was closed does not announce once `now`
    /// has left the day.
    #[test]
    fn no_announcement_once_the_day_has_ended(
        day_number in WIDE_DAY_RANGE,
        chosen_hour in 0u8..=23,
        seconds_past_the_end in 0i64..(SECONDS_PER_DAY * 30),
        last_announced_choice in 0u8..3,
        switched_on in any::<bool>(),
    ) {
        let day = some_day(day_number);
        let day_start = day_start_for(day);
        let now = day_start + SECONDS_PER_DAY + seconds_past_the_end;

        let last_announced = match last_announced_choice {
            0 => None,
            1 => Some(day),
            _ => Some(some_day(day_number + 1)),
        };

        prop_assert!(!announcement_due(day, day_start, chosen_hour, now, last_announced, switched_on));
    }

    // --- Property 4: off means silent -------------------------------------

    /// With the switch off, nothing makes the answer true — including a
    /// `now` that would otherwise satisfy every other condition.
    #[test]
    fn switched_off_is_silent_no_matter_what_else_is_true(
        day_number in WIDE_DAY_RANGE,
        chosen_hour in 0u8..=23,
        now_offset in -SECONDS_PER_DAY..(SECONDS_PER_DAY * 2),
        last_announced_choice in 0u8..3,
    ) {
        let day = some_day(day_number);
        let day_start = day_start_for(day);
        let now = day_start + now_offset;

        let last_announced = match last_announced_choice {
            0 => None,
            1 => Some(day),
            _ => Some(some_day(day_number + 1)),
        };

        prop_assert!(!announcement_due(day, day_start, chosen_hour, now, last_announced, false));
    }
}

/// A denser, single-day sweep than the proptest above: every thirty-seventh
/// second of the day — a stride that does not line up with hour boundaries,
/// so it never conveniently skips past the instant where a mistake would
/// hide — all of them false once the day has been recorded. This is the
/// property the guard rewrite leans on, so it gets more than a scattering of
/// random samples.
#[test]
fn a_recorded_announcement_holds_at_every_stride_across_a_whole_day() {
    let day = some_day(19_000);
    let day_start = day_start_for(day);
    for chosen_hour in [0u8, 1, 12, 23] {
        let mut offset = 0i64;
        while offset < SECONDS_PER_DAY {
            let now = day_start + offset;
            assert!(
                !announcement_due(day, day_start, chosen_hour, now, Some(day), true),
                "offset {offset} with chosen_hour {chosen_hour} should stay silent"
            );
            offset += 37;
        }
    }
}

// --- Property 5: a backward clock grants nothing and takes nothing --------

#[test]
fn a_clock_moved_backward_after_recording_produces_no_second_announcement() {
    let day = some_day(19_500);
    let day_start = day_start_for(day);
    let chosen_hour = 21u8;
    let due_instant = day_start + i64::from(chosen_hour) * SECONDS_PER_HOUR;

    // Before anything is recorded, the due instant is genuinely due.
    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        due_instant,
        None,
        true
    ));

    // The caller records it. Moving the clock back to the very start of the
    // same day grants nothing.
    assert!(!announcement_due(
        day,
        day_start,
        chosen_hour,
        day_start,
        Some(day),
        true
    ));

    // Moving it back to the due instant itself grants nothing either.
    assert!(!announcement_due(
        day,
        day_start,
        chosen_hour,
        due_instant,
        Some(day),
        true
    ));

    // Nor does landing just past the due instant.
    let just_after = due_instant + 10;
    assert!(!announcement_due(
        day,
        day_start,
        chosen_hour,
        just_after,
        Some(day),
        true
    ));
}

#[test]
fn evaluating_the_decision_repeatedly_without_recording_takes_nothing_away() {
    // The function is pure: asking the same question twice answers it the
    // same way twice. Nothing about calling it consumes the "due" state —
    // only the caller's own act of recording does that.
    let day = some_day(19_600);
    let day_start = day_start_for(day);
    let chosen_hour = 9u8;
    let due_instant = day_start + i64::from(chosen_hour) * SECONDS_PER_HOUR;

    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        due_instant,
        None,
        true
    ));
    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        due_instant,
        None,
        true
    ));
    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        due_instant,
        None,
        true
    ));
}

// --- Boundary instants: where an off-by-one would live ---------------------

#[test]
fn the_instant_the_chosen_hour_arrives_is_due_the_instant_before_is_not() {
    let day = some_day(20_000);
    let day_start = day_start_for(day);
    let chosen_hour = 21u8;
    let arrival = day_start + i64::from(chosen_hour) * SECONDS_PER_HOUR;

    assert!(!announcement_due(
        day,
        day_start,
        chosen_hour,
        arrival - 1,
        None,
        true
    ));
    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        arrival,
        None,
        true
    ));
}

#[test]
fn the_final_second_of_the_day_is_still_due() {
    let day = some_day(20_100);
    let day_start = day_start_for(day);
    let chosen_hour = 6u8;
    let final_second = day_start + SECONDS_PER_DAY - 1;

    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        final_second,
        None,
        true
    ));
}

#[test]
fn the_first_second_of_the_following_day_is_no_longer_due() {
    let day = some_day(20_200);
    let day_start = day_start_for(day);
    let chosen_hour = 6u8;
    let first_second_after = day_start + SECONDS_PER_DAY;

    assert!(!announcement_due(
        day,
        day_start,
        chosen_hour,
        first_second_after,
        None,
        true
    ));
}

#[test]
fn chosen_hour_at_the_low_end_of_its_range_is_due_from_the_very_start_of_the_day() {
    let day = some_day(20_300);
    let day_start = day_start_for(day);
    let chosen_hour = 0u8;

    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        day_start,
        None,
        true
    ));
}

#[test]
fn chosen_hour_at_the_high_end_of_its_range_is_due_only_in_the_days_closing_hour() {
    let day = some_day(20_400);
    let day_start = day_start_for(day);
    let chosen_hour = 23u8;
    let arrival = day_start + 23 * SECONDS_PER_HOUR;

    assert!(!announcement_due(
        day,
        day_start,
        chosen_hour,
        arrival - 1,
        None,
        true
    ));
    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        arrival,
        None,
        true
    ));
}

#[test]
fn an_announcement_recorded_for_a_different_calendar_date_does_not_suppress_this_one() {
    let day = some_day(20_500);
    let day_start = day_start_for(day);
    let chosen_hour = 12u8;
    let due_instant = day_start + 12 * SECONDS_PER_HOUR;
    let unrelated_date = some_day(20_499);

    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        due_instant,
        Some(unrelated_date),
        true
    ));
}

#[test]
fn a_calendar_date_before_the_epoch_is_evaluated_the_same_way_as_any_other() {
    // A negative day number names a date before 1970-01-01. This function
    // must not assume timestamps start non-negative.
    let day = some_day(-500_000);
    let day_start = day_start_for(day);
    assert!(day_start < 0, "sanity: this really is before the epoch");
    let chosen_hour = 20u8;
    let arrival = day_start + 20 * SECONDS_PER_HOUR;

    assert!(!announcement_due(
        day,
        day_start,
        chosen_hour,
        arrival - 1,
        None,
        true
    ));
    assert!(announcement_due(
        day,
        day_start,
        chosen_hour,
        arrival,
        None,
        true
    ));
    assert!(!announcement_due(
        day,
        day_start,
        chosen_hour,
        day_start + SECONDS_PER_DAY,
        None,
        true
    ));
}
