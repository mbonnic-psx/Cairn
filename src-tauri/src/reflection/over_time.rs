//! A range of days, assembled from the history (slice `history-by-site`).

use crate::domain::dates::LocalDate;
use crate::domain::patterns::{summarize, Reach};
use crate::reflection::checkin::{could_begin, offset_from_midnight};
use crate::services::Trouble;
use crate::store::gaps::{clipped, Gap};
use crate::store::history::OpenHistory;

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
    let start_offset = offset_from_midnight(first_day, range_start);
    let end_offset = offset_from_midnight(day_after_last, range_end);
    let offsets_agree = match (start_offset, end_offset) {
        (Some(start), Some(end)) => end.checked_sub(start).is_some_and(|difference| {
            difference.unsigned_abs() <= LARGEST_CLOCK_CHANGE.unsigned_abs()
        }),
        _ => false,
    };

    if first_day > last_day
        || !could_begin(first_day, range_start)
        || !could_begin(day_after_last, range_end)
        || !offsets_agree
        || range_start > now
    {
        return Err(Trouble::new(
            "Cairn could not tell which days those are just now, so it has shown \
             nothing. Protection is unaffected.",
        ));
    }
    Ok(())
}

/// A range of days as the history holds it, by site.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Range {
    /// Most first; equal counts by domain name.
    pub by_site: Vec<(String, u32)>,
    /// What Cairn did not see, each cut to the part inside the range.
    pub gaps: Vec<Gap>,
    /// How many days in the range hold the person's own estimate.
    pub estimates_excluded: u32,
}

/// The range between `range_start` and `range_end`, the bounds the interface
/// computes for `first_day` to `last_day` (research R3).
///
/// A read that does not go through is returned as one, never as an empty
/// list: an empty list reads as a quiet range, which would be untrue
/// (Principle III).
///
/// `by_site` is given the reaches and no estimates: an estimate has no site
/// (FR-023). Estimates are counted here, by their own dates, because a window
/// derived from one offset can take in a day beyond `last_day` at a clock
/// change.
pub fn assemble(
    history: &OpenHistory,
    first_day: LocalDate,
    last_day: LocalDate,
    range_start: i64,
    range_end: i64,
) -> Result<Range, Trouble> {
    let reaches: Vec<Reach> = history
        .between(range_start, range_end)?
        .into_iter()
        .map(|reach| Reach {
            domain: reach.domain,
            at: reach.at,
        })
        .collect();
    let gaps: Vec<Gap> = history
        .gaps_between(range_start, range_end)?
        .into_iter()
        .map(|gap| Gap {
            from: gap.from,
            to: gap.to,
        })
        .collect();
    let day_after_last =
        LocalDate::from_days_since_epoch(last_day.days_since_epoch() + 1);
    let estimates = history.estimates_between(first_day, day_after_last)?;

    Ok(Range {
        by_site: summarize(&reaches, &[], 0, range_start, range_end).by_site,
        gaps: clipped(&gaps, range_start, range_end),
        estimates_excluded: u32::try_from(estimates.len()).unwrap_or(u32::MAX),
    })
}
