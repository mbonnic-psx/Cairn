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

/// Each gap cut down to the part inside `[from, to)`, those with nothing left
/// dropped. A gap that began the night before is only the day's for the hours
/// that fall in it, and that is the span a day may be told about (T4).
///
/// Gaps that cover the same time are one gap: two Cairn processes at once, or a
/// clock moved back, can leave rows that overlap, and the same hours are not
/// unseen twice (R3).
pub fn clipped(gaps: &[Gap], from: i64, to: i64) -> Vec<Gap> {
    let cut: Vec<Gap> = gaps
        .iter()
        .map(|gap| Gap {
            from: gap.from.max(from),
            to: gap.to.min(to),
        })
        .filter(|gap| gap.to > gap.from)
        .collect();
    merged(&cut)
}

/// The same time with no stretch of it counted twice: gaps sorted by their
/// start, those that overlap joined into one.
pub fn merged(gaps: &[Gap]) -> Vec<Gap> {
    let mut sorted: Vec<Gap> = gaps.to_vec();
    sorted.sort_by_key(|gap| (gap.from, gap.to));
    let mut joined: Vec<Gap> = Vec::with_capacity(sorted.len());
    for gap in sorted {
        match joined.last_mut() {
            Some(last) if gap.from < last.to => last.to = last.to.max(gap.to),
            _ => joined.push(gap),
        }
    }
    joined
}

/// Seconds not observed, each stretch of time counted once.
fn unobserved_seconds(gaps: &[Gap]) -> i64 {
    merged(gaps).iter().map(Gap::seconds).sum()
}

/// A length of unobserved time in words, rounded toward admitting more
/// blindness: never fewer minutes, hours or days than the seconds hold, and
/// never "0" for time that was recorded (Principle III).
fn span_in_words(seconds: i64) -> Span {
    let seconds = seconds.max(0);
    let minutes = (seconds + 59) / 60;
    let hours = (seconds + 3599) / 3600;
    let days = (seconds + 86_399) / 86_400;
    let plural =
        |n: i64, unit: &str| format!("{n} {unit}{}", if n == 1 { "" } else { "s" });
    if seconds < 60 {
        Span::Brief
    } else if hours >= 48 {
        Span::Days(plural(days, "day"))
    } else if minutes >= 60 {
        Span::Hours(plural(hours, "hour"))
    } else {
        Span::Minutes(plural(minutes, "minute"))
    }
}

enum Span {
    Brief,
    Minutes(String),
    Hours(String),
    Days(String),
}

/// What is said above a day's reaches when part of that day was not observed.
///
/// It states the limit rather than apologising for it, and it never guesses at
/// what happened in the gap.
pub fn coverage_note(gaps: &[Gap]) -> Option<String> {
    if gaps.is_empty() {
        return None;
    }
    let total = unobserved_seconds(gaps);
    let lead = match span_in_words(total) {
        Span::Brief => "less than a minute".to_string(),
        Span::Minutes(s) | Span::Hours(s) | Span::Days(s) => format!("about {s}"),
    };
    Some(format!(
        "Cairn was not running for {lead} of today, so anything you reached for \
         then is not here. This is what Cairn saw, not everything that happened."
    ))
}

/// What is said above a range's reaches when part of it was not observed.
///
/// Beside [`coverage_note`], which speaks of a single day. The span is in
/// minutes, hours or days, and the sentence states the limit and guesses at
/// nothing.
pub fn range_coverage_note(gaps: &[Gap]) -> Option<String> {
    if gaps.is_empty() {
        return None;
    }
    let total = unobserved_seconds(gaps);
    let lead = match span_in_words(total) {
        Span::Brief => "for less than a minute of these days".to_string(),
        Span::Minutes(s) | Span::Hours(s) => format!("for about {s} of these days"),
        Span::Days(s) => format!("for about {s} across these days"),
    };
    Some(format!(
        "Cairn was not running {lead}, so anything you reached for then is not here. \
         This is what Cairn saw, not everything that happened."
    ))
}
