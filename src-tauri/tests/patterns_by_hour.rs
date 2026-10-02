//! The hours of a range, counted by the offset in force at each reach's own
//! instant (slice `history-by-hour`, gaps review B4; plan scenarios 3 to 6 and
//! 8, and `contracts/patterns.md` as amended 2026-10-02).
//!
//! `by_hour(reaches, first_offset, changes, from, to)` is pure: the offsets are
//! supplied, never looked up. Properties are checked against the inputs alone,
//! by plain filters, not by a second bucketing pass; the examples are the
//! fixture instants of the plan, the second before and at each change.
//! No feature gate: the domain builds without the history.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use proptest::prelude::*;

use cairn::domain::patterns::{by_hour, summarize, OffsetChange, Reach};

const HOUR: i64 = 3600;
const DAY: i64 = 86_400;

fn reach(at: i64) -> Reach {
    Reach {
        domain: "a.example".into(),
        at,
    }
}

fn reaches(instants: &[i64]) -> Vec<Reach> {
    instants.iter().copied().map(reach).collect()
}

/// 2026-10-25 01:00 UTC: London's clocks go back, +3 600 to 0.
const AUTUMN: i64 = 1_792_890_000;
/// 2026-03-29 01:00 UTC: London's clocks go forward, 0 to +3 600.
const SPRING: i64 = 1_774_746_000;
/// 2026-10-03 15:30 UTC: Lord Howe's clocks go forward half an hour.
const LORD_HOWE: i64 = 1_791_041_400;

fn change(from: i64, offset_seconds: i32) -> OffsetChange {
    OffsetChange {
        from,
        offset_seconds,
    }
}

fn at_hour(counts: &[u32; 24]) -> Vec<(usize, u32)> {
    counts
        .iter()
        .copied()
        .enumerate()
        .filter(|(_, count)| *count > 0)
        .collect()
}

// --- Examples: the plan's fixtures ---------------------------------------------

/// Scenario 3: the repeated hour is one hour on the clock.
#[test]
fn autumn_the_repeated_hour_is_one_hour_on_the_clock() {
    let from = 1_792_364_400; // 2026-10-19 00:00 BST
    let to = from + 14 * DAY + HOUR;
    let counts = by_hour(
        &reaches(&[
            AUTUMN - 1,
            AUTUMN,
            AUTUMN + 1_800,
            1_792_929_600, // 2026-10-26 12:00 UTC
        ]),
        3_600,
        &[change(AUTUMN, 0)],
        from,
        to,
    );
    assert_eq!(at_hour(&counts), [(1, 3), (12, 1)]);
}

/// Scenario 4: the skipped hour is still listed, and holds nothing from that night.
#[test]
fn spring_the_skipped_hour_is_listed_and_empty_that_night() {
    let from = 1_774_224_000; // 2026-03-23 00:00 GMT
    let to = from + 13 * DAY;
    let counts = by_hour(
        &reaches(&[SPRING - 1, SPRING]),
        0,
        &[change(SPRING, 3_600)],
        from,
        to,
    );
    assert_eq!(at_hour(&counts), [(0, 1), (2, 1)]);
    assert_eq!(counts.len(), 24);
    assert_eq!(counts[1], 0);
}

/// Scenario 5: a year whose two ends agree still holds a summer.
#[test]
fn a_year_whose_ends_agree_buckets_summer_by_summer() {
    let from = 1_767_225_600; // 2026-01-01 00:00 GMT
    let to = 1_798_761_600; // 2027-01-01 00:00 GMT
    let counts = by_hour(
        &reaches(&[1_782_907_200]), // 2026-07-01 12:00 UTC
        0,
        &[change(SPRING, 3_600), change(AUTUMN, 0)],
        from,
        to,
    );
    assert_eq!(at_hour(&counts), [(13, 1)]);
}

/// Scenario 6: no offset is assumed to be a whole hour.
#[test]
fn a_half_hour_change_is_found_to_the_second() {
    let from = LORD_HOWE - 5 * DAY;
    let to = LORD_HOWE + 5 * DAY;
    let counts = by_hour(
        &reaches(&[LORD_HOWE - 1, LORD_HOWE]),
        37_800,
        &[change(LORD_HOWE, 39_600)],
        from,
        to,
    );
    // 01:59:59 and 02:30:00 local.
    assert_eq!(at_hour(&counts), [(1, 1), (2, 1)]);
}

/// Scenario 8: midnight.
#[test]
fn twenty_three_fifty_nine_and_zero_zero_one_fall_either_side_of_midnight() {
    let midnight = 20_000 * DAY;
    let counts = by_hour(
        &reaches(&[midnight - 60, midnight + 60]),
        0,
        &[],
        midnight - DAY,
        midnight + DAY,
    );
    assert_eq!(at_hour(&counts), [(0, 1), (23, 1)]);
}

/// The change takes effect at its own instant: the second before is the old offset.
#[test]
fn a_change_is_in_force_from_its_own_second() {
    let counts = by_hour(
        &reaches(&[1_000 - 1]),
        0,
        &[change(1_000, HOUR as i32)],
        0,
        DAY,
    );
    assert_eq!(at_hour(&counts), [(0, 1)]);
    let counts = by_hour(&reaches(&[1_000]), 0, &[change(1_000, HOUR as i32)], 0, DAY);
    assert_eq!(at_hour(&counts), [(1, 1)]);
}

#[test]
fn the_edges_of_the_range_are_left_out() {
    let counts = by_hour(&reaches(&[99, 100, 3_699, 3_700]), 0, &[], 100, 3_700);
    assert_eq!(counts.iter().sum::<u32>(), 2);
}

// --- Properties ------------------------------------------------------------

/// A range, a sorted strictly increasing list of changes inside it, and reaches
/// placed before, inside and after it.
fn scenario() -> impl Strategy<Value = (i64, i64, i32, Vec<OffsetChange>, Vec<i64>)> {
    (
        -1_000_000_000i64..=2_000_000_000i64,
        1i64..=40 * DAY,
        -43_200i32..=50_400i32,
    )
        .prop_flat_map(|(from, span, first)| {
            let to = from + span;
            (
                prop::collection::btree_set(from + 1..to, 0..6),
                prop::collection::vec(-43_200i32..=50_400i32, 6),
                prop::collection::vec(from - span..=to + span, 0..60),
            )
                .prop_map(move |(instants, offsets, ats)| {
                    let changes: Vec<OffsetChange> = instants
                        .into_iter()
                        .zip(offsets)
                        .map(|(from, offset_seconds)| OffsetChange {
                            from,
                            offset_seconds,
                        })
                        .collect();
                    (from, to, first, changes, ats)
                })
        })
}

proptest! {
    /// Always 24 entries, and the sum is the reaches in `[from, to)`.
    #[test]
    fn the_sum_is_the_reaches_in_the_range((from, to, first, changes, ats) in scenario()) {
        let counts = by_hour(&reaches(&ats), first, &changes, from, to);
        prop_assert_eq!(counts.len(), 24);
        let expected = ats.iter().filter(|at| **at >= from && **at < to).count() as u32;
        prop_assert_eq!(counts.iter().sum::<u32>(), expected);
    }

    /// With no changes it is what `summarize` gives for that offset.
    #[test]
    fn with_no_changes_it_is_summarizes_hours(
        (from, to, first, _changes, ats) in scenario(),
    ) {
        let counts = by_hour(&reaches(&ats), first, &[], from, to);
        let summary = summarize(&reaches(&ats), &[], first, from, to);
        prop_assert_eq!(counts.to_vec(), summary.by_hour);
    }

    /// A reach's hour depends only on the last change at or before its instant:
    /// a change after it leaves it alone.
    #[test]
    fn a_change_after_a_reach_leaves_it_alone(
        (from, to, first, changes, ats) in scenario(),
        later in 0i64..1_000,
        offset in -43_200i32..=50_400i32,
    ) {
        let Some(at) = ats.iter().copied().find(|at| *at >= from && *at < to) else {
            return Ok(());
        };
        let one = vec![at];
        let before = by_hour(&reaches(&one), first, &changes, from, to);
        let mut extended = changes.clone();
        let last = extended.last().map_or(from, |last| last.from);
        let after_it = last.max(at) + 1 + later;
        extended.push(OffsetChange { from: after_it, offset_seconds: offset });
        let after = by_hour(&reaches(&one), first, &extended, from, after_it.max(to) + 1);
        prop_assert_eq!(before, after);
    }

    /// The reaches' order does not matter.
    #[test]
    fn the_order_of_the_reaches_does_not_matter(
        (from, to, first, changes, ats) in scenario(),
    ) {
        let mut reversed = ats.clone();
        reversed.reverse();
        prop_assert_eq!(
            by_hour(&reaches(&ats), first, &changes, from, to),
            by_hour(&reaches(&reversed), first, &changes, from, to)
        );
    }
}
