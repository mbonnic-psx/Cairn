//! One day, whole, as the history holds it (T029).

use crate::domain::dates::LocalDate;
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
}

/// The longest a local day can be: 25 hours at a clock change, and an hour
/// of slack for a zone that moves by more than that.
const LONGEST_DAY: i64 = 26 * 3600;

/// The earliest and latest local midnight can fall, in seconds from 00:00 UTC
/// on the date: in UTC+14 it comes 14 hours before UTC's, in UTC-12 it comes
/// 12 hours after.
const EARLIEST_START: i64 = -14 * 3600;
const LATEST_START: i64 = 12 * 3600;

/// Whether `instant` could be the moment `day` begins, somewhere on earth: no
/// earlier than 14 hours before the date's UTC midnight and no later than 12
/// hours after it. The rule `check_bounds` holds for a day, and `over_time`
/// holds at each end of a range.
pub(crate) fn could_begin(day: LocalDate, instant: i64) -> bool {
    let offset = instant - day.days_since_epoch() * 86_400;
    (EARLIEST_START..=LATEST_START).contains(&offset)
}

/// Whether `[day_start, day_end)` could be `day` somewhere on earth (J4).
///
/// The core does not know the person's zone, so it holds the interface to
/// the one rule that is true in every zone, on 23 and 25 hour days alike: the
/// span is not empty and not longer than 26 hours, and begins within the
/// hours at which `day` can begin anywhere. Bounds outside that would make
/// the day show reaches of other days, or an untrue empty one (Principle III).
pub fn check_bounds(day: LocalDate, day_start: i64, day_end: i64) -> Result<(), Trouble> {
    let span = day_end - day_start;
    if span <= 0 || span > LONGEST_DAY || !could_begin(day, day_start) {
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
    let gaps: Vec<Gap> = history
        .gaps_between(day_start, day_end)?
        .into_iter()
        .map(|gap| Gap {
            from: gap.from,
            to: gap.to,
        })
        .collect();
    let gaps = clipped(&gaps, day_start, day_end);
    let entry = history.entry_for(day)?.map(|entry| entry.text);
    let estimate = history.estimate_for(day)?.map(|estimate| estimate.count);

    Ok(Day {
        reaches,
        gaps,
        entry,
        estimate,
    })
}
