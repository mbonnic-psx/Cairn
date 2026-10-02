//! Bucketing reaches by site, hour of day, day of week, and day, over a
//! range — the arithmetic behind the Reaches screen described in
//! `specs/003-reflection-and-history/contracts/patterns.md`.
//!
//! Every bucket that answers "which site" or "which hour" is built from
//! `reaches` alone (FR-023): a day-level estimate carries no site and no
//! hour, so it can never populate either. `estimates_excluded` reports how
//! many estimates were set aside for the window, so that exclusion is stated
//! rather than left implicit.
//!
//! [`by_hour`] and [`by_weekday`] place each reach by the offset in force at its
//! own instant; [`weekdays_in`] counts the weekdays the range holds, by the
//! calendar alone (gaps review B4, W4, W5).
//!
//! This module reads no clock and knows nothing about what platform it runs
//! on (FR-019, FR-020, FR-024) — the local offset that turns an instant into
//! an hour and a weekday is supplied by the caller (`research.md`, R4), never
//! looked up here. `scripts/check-domain-purity.sh` enforces that this stays
//! true, not just convention.

use std::collections::HashMap;

use super::dates::LocalDate;

/// Seconds in a day. Every local-day and hour-of-day bucket below divides by
/// this.
const SECONDS_PER_DAY: i64 = 86_400;
/// Seconds in an hour, for turning a within-day remainder into an hour 0-23.
const SECONDS_PER_HOUR: i64 = 3_600;

/// A single recorded reach, as stored: which domain, and when.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Reach {
    pub domain: String,
    pub at: i64,
}

/// The bucketed view of a range of reaches, plus how many estimates were set
/// aside because they carry no site or hour to bucket by.
///
/// This is deliberately not the shape `contracts/ui-ipc.md` calls `Patterns`
/// on the wire. The IPC struct also carries `gaps` and `sealed`, and neither
/// belongs here: both are read from encrypted storage, and this module does
/// no I/O. It also carries `dst_approximate`, which this struct does not —
/// see [`crosses_offset_change`] for why that bit cannot be computed inside
/// `summarize` at all, only assembled by whatever calls it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Patterns {
    /// Reach count per domain, descending by count, ties broken ascending by
    /// domain name — a fixed rule (contracts/patterns.md, property 5) so the
    /// interface never reorders on refresh.
    pub by_site: Vec<(String, u32)>,
    /// Exactly 24 entries, index = hour of the day (0-23). Zero-filled,
    /// never absent (FR-024).
    pub by_hour: Vec<u32>,
    /// Exactly 7 entries, index = weekday per [`LocalDate::weekday`]: 0 =
    /// Monday .. 6 = Sunday. Zero-filled, never absent (FR-024).
    pub by_weekday: Vec<u32>,
    /// One entry per local day in the window, ascending, with no gaps —
    /// the local-day image of a contiguous `at` range under a floor-division
    /// map is itself contiguous, so this is well-defined for every offset.
    pub by_day: Vec<(LocalDate, u32)>,
    /// How many `estimates` entries fell within the window and were set
    /// aside, because an estimate has no site and no hour to bucket by
    /// (FR-023).
    pub estimates_excluded: u32,
}

/// Shifts a raw timestamp by the caller's local offset without ever
/// wrapping. `at` is widened against, not narrowed to, `offset_seconds`:
/// `offset_seconds` is converted to `i64` before the addition rather than
/// the addition happening in `i32`, and the addition itself saturates
/// instead of overflowing — `at` alone already spans the full range these
/// tests probe, so ordinary inputs never come close to the saturation edge,
/// but nothing here is allowed to wrap into the wrong bucket if they did.
fn shift(at: i64, offset_seconds: i32) -> i64 {
    at.saturating_add(i64::from(offset_seconds))
}

/// The local day number (days since the epoch, per [`LocalDate`]) that
/// `at` falls on once shifted by `offset_seconds`. `div_euclid`, not `/`,
/// because a pre-epoch shifted timestamp is negative and truncating
/// division would floor toward zero instead of toward the day that
/// actually contains it.
fn local_day(at: i64, offset_seconds: i32) -> i64 {
    shift(at, offset_seconds).div_euclid(SECONDS_PER_DAY)
}

/// The hour of day (0-23) that `at` falls in once shifted by
/// `offset_seconds`. `rem_euclid`, not `%`, for the same reason as
/// [`local_day`]: a negative shifted timestamp must still land on 0-23, not
/// on a negative remainder.
fn hour_of_day(at: i64, offset_seconds: i32) -> u32 {
    (shift(at, offset_seconds).rem_euclid(SECONDS_PER_DAY) / SECONDS_PER_HOUR) as u32
}

/// The inclusive local-day window `[first, last]` covered by `[from, to)`
/// once shifted by `offset_seconds`, or `None` when the range is empty
/// (`to <= from`) and so covers no day at all.
fn day_window(offset_seconds: i32, from: i64, to: i64) -> Option<(i64, i64)> {
    if to <= from {
        return None;
    }
    let first = local_day(from, offset_seconds);
    let last = local_day(to - 1, offset_seconds);
    Some((first, last))
}

/// Buckets `reaches` by site, hour of day, day of week, and local day across
/// `[from, to)`, and reports how many `estimates` fall in that same local-day
/// window.
///
/// Range membership is decided on the raw `at`: a reach counts exactly when
/// `from <= at < to`. `offset_seconds` only ever chooses which bucket a
/// qualifying reach lands in, never whether it qualifies — an offset can move
/// a reach from one hour or one day to another, but it can never make a
/// reach appear or disappear from the total.
pub fn summarize(
    reaches: &[Reach],
    estimates: &[(LocalDate, u32)],
    offset_seconds: i32,
    from: i64,
    to: i64,
) -> Patterns {
    let window = day_window(offset_seconds, from, to);

    let mut by_hour = vec![0u32; 24];
    let mut by_weekday = vec![0u32; 7];
    let mut site_counts: HashMap<String, u32> = HashMap::new();
    let mut by_day_counts: Vec<u32> = match window {
        Some((first, last)) => vec![0u32; (last - first + 1) as usize],
        None => Vec::new(),
    };

    for reach in reaches {
        if reach.at < from || reach.at >= to {
            continue;
        }

        let hour = hour_of_day(reach.at, offset_seconds);
        by_hour[hour as usize] += 1;

        let day = local_day(reach.at, offset_seconds);
        let weekday = LocalDate::from_days_since_epoch(day).weekday();
        by_weekday[weekday as usize] += 1;

        *site_counts.entry(reach.domain.clone()).or_insert(0) += 1;

        if let Some((first, _)) = window {
            by_day_counts[(day - first) as usize] += 1;
        }
    }

    let by_site = sorted_sites(site_counts);

    let by_day: Vec<(LocalDate, u32)> = match window {
        Some((first, _)) => by_day_counts
            .into_iter()
            .enumerate()
            .map(|(offset, count)| {
                (
                    LocalDate::from_days_since_epoch(first + offset as i64),
                    count,
                )
            })
            .collect(),
        None => Vec::new(),
    };

    let estimates_excluded = match window {
        Some((first, last)) => estimates
            .iter()
            .filter(|(day, _)| {
                let day_number = day.days_since_epoch();
                day_number >= first && day_number <= last
            })
            .count() as u32,
        None => 0,
    };

    Patterns {
        by_site,
        by_hour,
        by_weekday,
        by_day,
        estimates_excluded,
    }
}

/// The sites reached in `[from, to)`, most first, and nothing else.
///
/// What a range-by-site view needs of [`summarize`], without the per-hour,
/// per-weekday and per-day lists it would build and throw away: the per-day
/// list is one entry for every day of the range, and a range can be thousands
/// of years (R5). Counts and order are those `summarize` gives.
pub fn by_site(reaches: &[Reach], from: i64, to: i64) -> Vec<(String, u32)> {
    let mut site_counts: HashMap<String, u32> = HashMap::new();
    for reach in reaches {
        if reach.at >= from && reach.at < to {
            *site_counts.entry(reach.domain.clone()).or_insert(0) += 1;
        }
    }
    sorted_sites(site_counts)
}

/// The offset the computer's clock takes from `from` on, in whole seconds
/// east of UTC (`contracts/patterns.md`, amended in slice `history-by-hour`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OffsetChange {
    /// The instant, in epoch seconds, the offset begins to be in force.
    pub from: i64,
    pub offset_seconds: i32,
}

/// The offset in force at `at`: that of the last of `changes` at or before it,
/// found by binary search, or `first_offset` when none is. Shared by
/// [`by_hour`] and [`by_weekday`], so the two cannot disagree. The changes must
/// increase: that is the caller's check.
fn offset_in_force(first_offset: i32, changes: &[OffsetChange], at: i64) -> i32 {
    let in_force = changes.partition_point(|change| change.from <= at);
    match in_force.checked_sub(1) {
        Some(index) => changes[index].offset_seconds,
        None => first_offset,
    }
}

/// The hours of `[from, to)`, each reach counted in the hour the computer's
/// clock showed at its own instant (gaps review B4).
///
/// `first_offset` is in force until the first of `changes`; each change is in
/// force from its `from` on. A reach takes the offset of the last change at or
/// before its instant, found by binary search, and is bucketed as
/// [`summarize`] buckets it. The changes must increase: that is the caller's
/// check (`reflection::over_time::check_offsets`), not this module's. The
/// reaches' order does not matter, and estimates never come in (FR-023).
///
/// Range membership is decided on the raw `at`, as for [`summarize`].
pub fn by_hour(
    reaches: &[Reach],
    first_offset: i32,
    changes: &[OffsetChange],
    from: i64,
    to: i64,
) -> [u32; 24] {
    let mut hours = [0u32; 24];
    for reach in reaches {
        if reach.at < from || reach.at >= to {
            continue;
        }
        let offset = offset_in_force(first_offset, changes, reach.at);
        hours[hour_of_day(reach.at, offset) as usize] += 1;
    }
    hours
}

/// The days of the week of `[from, to)`, each reach counted on the weekday of
/// the local day the computer's clock showed at its own instant (gaps review
/// W5), indexed by [`LocalDate::weekday`]: 0 = Monday .. 6 = Sunday.
///
/// The offset in force, the range test and the preconditions are those of
/// [`by_hour`], found by the same lookup ([`offset_in_force`]), so the two can
/// never disagree about which offset a reach had. The sum is therefore the
/// sum of [`by_hour`]'s. Estimates never come in (FR-023, W6).
pub fn by_weekday(
    reaches: &[Reach],
    first_offset: i32,
    changes: &[OffsetChange],
    from: i64,
    to: i64,
) -> [u32; 7] {
    let mut weekdays = [0u32; 7];
    for reach in reaches {
        if reach.at < from || reach.at >= to {
            continue;
        }
        let offset = offset_in_force(first_offset, changes, reach.at);
        let weekday =
            LocalDate::from_days_since_epoch(local_day(reach.at, offset)).weekday();
        weekdays[weekday as usize] += 1;
    }
    weekdays
}

/// How many of each weekday the dates `first_day..=last_day` hold, indexed by
/// [`LocalDate::weekday`] (gaps review W4).
///
/// Pure calendar arithmetic with no offset: a local date is a date in every
/// zone, and a 23-hour or 25-hour day is still one day. With `n` days, each
/// weekday holds `n / 7` and the `n % 7` weekdays from `first_day`'s onwards
/// one more. Computed in `i64` with checked arithmetic and saturated to `u32`
/// as `estimates_excluded` is: a range may be thousands of years (R5), and a
/// [`LocalDate`] spans more days than `u32` holds. A first day after the last
/// gives seven zeros.
pub fn weekdays_in(first_day: LocalDate, last_day: LocalDate) -> [u32; 7] {
    let days = last_day
        .days_since_epoch()
        .checked_sub(first_day.days_since_epoch())
        .and_then(|difference| difference.checked_add(1))
        .filter(|days| *days > 0);
    let Some(days) = days else {
        return [0; 7];
    };
    let (whole_weeks, extra) = (days / 7, days % 7);
    let start = i64::from(first_day.weekday());
    let mut weekdays = [0u32; 7];
    for (weekday, count) in weekdays.iter_mut().enumerate() {
        let steps_in = (weekday as i64 - start).rem_euclid(7);
        let held = whole_weeks.saturating_add(i64::from(steps_in < extra));
        *count = u32::try_from(held).unwrap_or(u32::MAX);
    }
    weekdays
}

/// Most reached first; equal counts by domain name.
fn sorted_sites(site_counts: HashMap<String, u32>) -> Vec<(String, u32)> {
    let mut by_site: Vec<(String, u32)> = site_counts.into_iter().collect();
    by_site.sort_by(|(domain_a, count_a), (domain_b, count_b)| {
        count_b.cmp(count_a).then_with(|| domain_a.cmp(domain_b))
    });
    by_site
}

/// Whether the local offset changed between the two ends of a range —
/// the honest signal behind `contracts/ui-ipc.md`'s `dst_approximate`.
///
/// `summarize` takes a single `offset_seconds` for the whole range
/// (`research.md`, R4): the pure layer may not read a clock or consult a
/// timezone database, so it has no way to notice that the offset it was
/// handed stopped applying partway through. One offset cannot reveal a
/// change *in* the offset — there is nothing inside `summarize` to compare
/// it against. Reporting `false` from inside `summarize` whenever a
/// transition was missed would not mean "no transition"; it would mean
/// "could not tell", which is exactly the false confidence Principle III
/// forbids.
///
/// So this takes the comparison as two arguments instead of trying to work
/// it out. The interface — which holds the real timezone rules this module
/// is deliberately denied — computes the local offset at `from` and at `to`
/// and passes both in. When they differ, hour buckets across the range are
/// only approximate: some reaches were bucketed against an offset that
/// stopped being correct partway through the window.
///
/// Deliberately symmetric: a spring-forward and an autumn-back are both
/// still an approximation, so only whether the two offsets differ matters,
/// never which one is larger.
pub fn crosses_offset_change(offset_at_from: i32, offset_at_to: i32) -> bool {
    offset_at_from != offset_at_to
}

#[cfg(test)]
mod crosses_offset_change_tests {
    use super::crosses_offset_change;

    #[test]
    fn equal_offsets_never_cross() {
        assert!(!crosses_offset_change(0, 0));
        assert!(!crosses_offset_change(-18_000, -18_000));
        assert!(!crosses_offset_change(i32::MIN, i32::MIN));
        assert!(!crosses_offset_change(i32::MAX, i32::MAX));
    }

    #[test]
    fn differing_offsets_always_cross() {
        assert!(crosses_offset_change(0, 3_600));
        assert!(crosses_offset_change(-18_000, -14_400));
        assert!(crosses_offset_change(i32::MIN, i32::MAX));
    }

    #[test]
    fn the_sign_of_the_difference_does_not_matter() {
        // Spring forward (offset increases) and autumn back (offset
        // decreases) are both still an approximation — only whether the
        // offsets differ is reported, never which direction moved.
        assert_eq!(
            crosses_offset_change(0, 3_600),
            crosses_offset_change(3_600, 0)
        );
        assert!(crosses_offset_change(0, 3_600));
        assert!(crosses_offset_change(3_600, 0));
    }
}
