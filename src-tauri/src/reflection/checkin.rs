//! One day, whole, as the history holds it (T029).

use crate::domain::dates::LocalDate;
use crate::services::Trouble;
use crate::store::gaps::Gap;
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
    let gaps = history
        .gaps_between(day_start, day_end)?
        .into_iter()
        .map(|gap| Gap {
            from: gap.from,
            to: gap.to,
        })
        .collect();
    let entry = history.entry_for(day)?.map(|entry| entry.text);
    let estimate = history.estimate_for(day)?.map(|estimate| estimate.count);

    Ok(Day {
        reaches,
        gaps,
        entry,
        estimate,
    })
}
