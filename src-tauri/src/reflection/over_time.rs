//! A range of days, assembled from the history (slice `history-by-site`).

use crate::domain::dates::LocalDate;
use crate::domain::patterns::{by_hour, by_site, OffsetChange, Reach};
use crate::reflection::checkin::{could_begin, offset_from_midnight};
use crate::services::Trouble;
use crate::store::gaps::{clipped, Gap};
use crate::store::history::OpenHistory;

/// The largest seasonal clock change any zone uses.
const LARGEST_CLOCK_CHANGE: i64 = 2 * 3600;

const DAY: i64 = 86_400;

/// Whether `[range_start, range_end)` could be the days `first_day` to
/// `last_day`, inclusive, somewhere on earth.
///
/// The core does not know the person's zone, so each end is held to the rule
/// that is true in every zone (the one `check_bounds` holds for a day), and the
/// range to three more: its ends' offsets differ by no more than a clock change
/// can, it has begun, and it ends no later than the end of today (the next
/// midnight is at most a day and a clock change away), as the screen already
/// limits it. A last day far in the future once sorted as text past the
/// estimates and hid their count (R2).
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
        || range_end > now.saturating_add(DAY + LARGEST_CLOCK_CHANGE)
    {
        return Err(unplaceable());
    }
    Ok(())
}

/// A range of days as the history holds it, by site and by hour.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Range {
    /// Most first; equal counts by domain name.
    pub by_site: Vec<(String, u32)>,
    /// Exactly 24, index = hour of the day by the computer's clock at each
    /// reach's own instant. Zeros included.
    pub by_hour: [u32; 24],
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
/// `by_site` and `by_hour` are given the reaches and no estimates: an estimate
/// has no site and no hour (FR-023). `first_offset` and `changes` are what
/// [`check_offsets`] returned for this range. Estimates are counted here, by their own dates, because a window
/// derived from one offset can take in a day beyond `last_day` at a clock
/// change.
pub fn assemble(
    history: &OpenHistory,
    first_day: LocalDate,
    last_day: LocalDate,
    range_start: i64,
    range_end: i64,
    first_offset: i32,
    changes: &[OffsetChange],
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
        by_site: by_site(&reaches, range_start, range_end),
        by_hour: by_hour(&reaches, first_offset, changes, range_start, range_end),
        gaps: clipped(&gaps, range_start, range_end),
        estimates_excluded: u32::try_from(estimates.len()).unwrap_or(u32::MAX),
    })
}

/// The lowest and highest offsets any zone uses, in seconds east of UTC.
const LOWEST_OFFSET: i64 = -12 * 3600;
const HIGHEST_OFFSET: i64 = 14 * 3600;

/// Whether `offsets`, each `(from, offset)` in epoch seconds and seconds east
/// of UTC, could be the offsets in force across `[range_start, range_end)`
/// somewhere on earth (`contracts/ui-ipc.md`, amended in slice
/// `history-by-hour`). The core cannot know the zone, so each entry is held to
/// what is true in every zone:
///
/// - the list is not empty and has no more entries than the range has days,
///   plus one;
/// - the first begins at `range_start`, with the offset in force there, which
///   is within a clock change of the one `range_start` implies for
///   `first_day` (a clock that skips its first midnight begins the day at the
///   new offset);
/// - the instants strictly increase and all come before `range_end`;
/// - every offset lies between -12 h and +14 h;
/// - neighbouring offsets differ, by no more than a clock change can;
/// - the last is within a clock change of the offset `range_end` implies.
///
/// Every subtraction is checked: an instant of `i64::MIN` is refused, not
/// wrapped. Run after [`check_range`]. Returns the first offset and the
/// changes after it, in the form [`by_hour`] takes. Refused with the one
/// sentence `check_range` gives, for every range Cairn cannot place.
pub fn check_offsets(
    first_day: LocalDate,
    last_day: LocalDate,
    range_start: i64,
    range_end: i64,
    offsets: &[(i64, i64)],
) -> Result<(i32, Vec<OffsetChange>), Trouble> {
    offsets_in_force(first_day, last_day, range_start, range_end, offsets)
        .ok_or_else(unplaceable)
}

fn unplaceable() -> Trouble {
    Trouble::new(
        "Cairn could not tell which days those are just now, so it has shown \
         nothing. Protection is unaffected.",
    )
}

/// The offset an end implies: how far east of UTC a clock is when it reads
/// midnight at `instant`, the UTC midnight of `day` being the reference.
fn implied_offset(day: LocalDate, instant: i64) -> Option<i64> {
    offset_from_midnight(day, instant)?.checked_neg()
}

fn within_a_clock_change(one: i64, other: i64) -> bool {
    one.checked_sub(other).is_some_and(|difference| {
        difference.unsigned_abs() <= LARGEST_CLOCK_CHANGE as u64
    })
}

fn offsets_in_force(
    first_day: LocalDate,
    last_day: LocalDate,
    range_start: i64,
    range_end: i64,
    offsets: &[(i64, i64)],
) -> Option<(i32, Vec<OffsetChange>)> {
    let days = last_day
        .days_since_epoch()
        .checked_sub(first_day.days_since_epoch())?
        .checked_add(1)?;
    let most = usize::try_from(days.checked_add(1)?).ok()?;
    let (first, rest) = offsets.split_first()?;
    if offsets.len() > most
        || first.0 != range_start
        || !within_a_clock_change(first.1, implied_offset(first_day, range_start)?)
    {
        return None;
    }
    let day_after_last =
        LocalDate::from_days_since_epoch(last_day.days_since_epoch().checked_add(1)?);
    let mut previous = *first;
    for entry in rest {
        if entry.0 <= previous.0
            || entry.0 >= range_end
            || entry.1 == previous.1
            || !within_a_clock_change(entry.1, previous.1)
        {
            return None;
        }
        previous = *entry;
    }
    if first.0 >= range_end
        || !offsets
            .iter()
            .all(|(_, offset)| (LOWEST_OFFSET..=HIGHEST_OFFSET).contains(offset))
        || !within_a_clock_change(previous.1, implied_offset(day_after_last, range_end)?)
    {
        return None;
    }
    let first_offset = i32::try_from(first.1).ok()?;
    let changes = rest
        .iter()
        .map(|(from, offset)| {
            Some(OffsetChange {
                from: *from,
                offset_seconds: i32::try_from(*offset).ok()?,
            })
        })
        .collect::<Option<Vec<_>>>()?;
    Some((first_offset, changes))
}
