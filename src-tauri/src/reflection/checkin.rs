//! One day, whole, as the history holds it (T029).

use crate::domain::dates::LocalDate;
use crate::domain::first_count;
use crate::services::Trouble;
use crate::store::gaps::{clipped, Gap};
use crate::store::history::{OpenHistory, Reach};

/// What the history holds for one local day: what was reached for, what
/// Cairn did not see, and what the person wrote or estimated.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Day {
    pub reaches: Vec<Reach>,
    pub gaps: Vec<Gap>,
    pub entry: Option<String>,
    pub estimate: Option<u32>,
    /// When Cairn first counted (slice `first-counted`).
    pub first_counted: Option<i64>,
}

/// Each gap cut to begin no earlier than the first count: the time before it
/// is not a stretch Cairn was not running (slice `first-counted`, rule 8).
pub(crate) fn cut_at_the_first_count(
    gaps: &[Gap],
    first_counted: Option<i64>,
) -> Vec<Gap> {
    let spans: Vec<(i64, i64)> = gaps.iter().map(|gap| (gap.from, gap.to)).collect();
    first_count::gaps_since(first_counted, &spans)
        .into_iter()
        .map(|(from, to)| Gap { from, to })
        .collect()
}

/// The longest a local day can be: 25 hours at a clock change, and an hour
/// of slack for a zone that moves by more than that.
const LONGEST_DAY: i64 = 26 * 3600;

/// The earliest and latest local midnight can fall, in seconds from 00:00 UTC
/// on the date: in UTC+14 it comes 14 hours before UTC's, in UTC-12 it comes
/// 12 hours after.
const EARLIEST_START: i64 = -14 * 3600;
const LATEST_START: i64 = 12 * 3600;

/// How far `instant` is from the UTC midnight of `day`; `None` where the
/// difference does not fit, which no real instant produces.
pub(crate) fn offset_from_midnight(day: LocalDate, instant: i64) -> Option<i64> {
    day.days_since_epoch()
        .checked_mul(86_400)
        .and_then(|midnight| instant.checked_sub(midnight))
}

/// Whether `instant` could be the moment `day` begins, somewhere on earth: no
/// earlier than 14 hours before the date's UTC midnight and no later than 12
/// hours after it. The rule `check_bounds` holds for a day, and `over_time`
/// holds at each end of a range.
pub(crate) fn could_begin(day: LocalDate, instant: i64) -> bool {
    offset_from_midnight(day, instant)
        .is_some_and(|offset| (EARLIEST_START..=LATEST_START).contains(&offset))
}

/// Whether `[day_start, day_end)` could be `day` somewhere on earth (J4).
///
/// The core does not know the person's zone, so it holds the interface to
/// the one rule that is true in every zone, on 23 and 25 hour days alike: the
/// span is not empty and not longer than 26 hours, and begins within the
/// hours at which `day` can begin anywhere. Bounds outside that would make
/// the day show reaches of other days, or an untrue empty one (Principle III).
pub fn check_bounds(day: LocalDate, day_start: i64, day_end: i64) -> Result<(), Trouble> {
    let span_fits = day_end
        .checked_sub(day_start)
        .is_some_and(|span| span > 0 && span <= LONGEST_DAY);
    if !span_fits || !could_begin(day, day_start) {
        return Err(Trouble::new(
            "Cairn could not tell which day that is just now, so it has shown and \
             saved nothing. Protection is unaffected.",
        ));
    }
    Ok(())
}

/// The day between `day_start` and `day_end`, the bounds the interface
/// computes for `day` (research R3).
///
/// A read that does not go through is returned as one, never as an empty
/// list: an empty list reads as *nothing reached for today*, which would be
/// untrue (Principle III).
pub fn assemble(
    history: &OpenHistory,
    day: LocalDate,
    day_start: i64,
    day_end: i64,
) -> Result<Day, Trouble> {
    let reaches = history.between(day_start, day_end)?;
    let first_counted = history.first_count()?;
    let gaps: Vec<Gap> = history
        .gaps_between(day_start, day_end)?
        .into_iter()
        .map(|gap| Gap {
            from: gap.from,
            to: gap.to,
        })
        .collect();
    let gaps = cut_at_the_first_count(&clipped(&gaps, day_start, day_end), first_counted);
    let entry = history.entry_for(day)?.map(|entry| entry.text);
    let estimate = history.estimate_for(day)?.map(|estimate| estimate.count);

    Ok(Day {
        reaches,
        gaps,
        entry,
        estimate,
        first_counted,
    })
}
