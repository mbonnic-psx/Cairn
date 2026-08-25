//! Time nobody was watching.
//!
//! FR-030. A count is only ever a count of what Cairn saw. If it was not
//! running — the machine was off, the app had not started, the helper was
//! stopped — then nothing was counted for that period, and saying "you reached
//! for three things today" would be presenting a gap as a zero.
//!
//! So Cairn records the gap, and shows it alongside the count. Being honest
//! about a blind spot costs a little confidence and buys all of it back.

use serde::{Deserialize, Serialize};

/// A period when Cairn was not counting.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Gap {
    pub from: i64,
    pub to: i64,
}

impl Gap {
    pub fn seconds(&self) -> i64 {
        (self.to - self.from).max(0)
    }
}

/// How long a gap has to be before it is worth mentioning.
///
/// A few seconds between the helper starting and the app opening is not a blind
/// spot anyone needs told about; an afternoon is.
pub const WORTH_MENTIONING: i64 = 5 * 60;

/// Work out the gap between the last time Cairn was seen running and now.
///
/// A clock moved backwards produces no gap rather than a negative one: the
/// answer to "what happened while I was not looking" is never a negative
/// amount of time.
pub fn infer(last_seen: Option<i64>, now: i64) -> Option<Gap> {
    let last_seen = last_seen?;
    if now <= last_seen {
        return None;
    }
    let gap = Gap {
        from: last_seen,
        to: now,
    };
    (gap.seconds() >= WORTH_MENTIONING).then_some(gap)
}

/// The gaps that overlap a period, for showing beside the reaches in it.
pub fn overlapping(gaps: &[Gap], from: i64, to: i64) -> Vec<Gap> {
    gaps.iter()
        .filter(|gap| gap.to > from && gap.from < to)
        .cloned()
        .collect()
}

/// What is said above a day's reaches when part of that day was not observed.
///
/// It states the limit rather than apologising for it, and it never guesses at
/// what happened in the gap.
pub fn coverage_note(gaps: &[Gap]) -> Option<String> {
    if gaps.is_empty() {
        return None;
    }

    let total_minutes = gaps.iter().map(Gap::seconds).sum::<i64>() / 60;
    let hours = total_minutes / 60;

    let span = if hours >= 1 {
        format!("{hours} hour(s)")
    } else {
        format!("{total_minutes} minutes")
    };

    Some(format!(
        "Cairn was not running for about {span} of today, so anything you reached for \
         then is not here. This is what Cairn saw, not everything that happened."
    ))
}
