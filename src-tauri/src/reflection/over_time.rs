//! A range of days, assembled from the history (slice `history-by-site`).

use crate::domain::dates::LocalDate;
use crate::reflection::checkin::could_begin;
use crate::services::Trouble;

/// The largest seasonal clock change any zone uses.
const LARGEST_CLOCK_CHANGE: i64 = 2 * 3600;

/// Whether `[range_start, range_end)` could be the days `first_day` to
/// `last_day`, inclusive, somewhere on earth.
///
/// The core does not know the person's zone, so each end is held to the rule
/// that is true in every zone (the one `check_bounds` holds for a day), and the
/// range to two more: its ends' offsets differ by no more than a clock change
/// can, and it has begun.
pub fn check_range(
    first_day: LocalDate,
    last_day: LocalDate,
    range_start: i64,
    range_end: i64,
    now: i64,
) -> Result<(), Trouble> {
    let day_after_last =
        LocalDate::from_days_since_epoch(last_day.days_since_epoch() + 1);
    let start_offset = range_start - first_day.days_since_epoch() * 86_400;
    let end_offset = range_end - day_after_last.days_since_epoch() * 86_400;

    if first_day > last_day
        || !could_begin(first_day, range_start)
        || !could_begin(day_after_last, range_end)
        || (end_offset - start_offset).abs() > LARGEST_CLOCK_CHANGE
        || range_start > now
    {
        return Err(Trouble::new(
            "Cairn could not tell which days those are just now, so it has shown \
             nothing. Protection is unaffected.",
        ));
    }
    Ok(())
}
