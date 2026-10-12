//! The time before the first count is never presented as seen, and no gap's
//! watching is lost after it (slice `first-counted`, rule 17, scenario 22).
//!
//! `unseen(first, from, to, gaps)` and `gaps_since(first, gaps)` are pure.
//! Properties are checked instant by instant over a small range, against the
//! inputs alone. No feature gate: the domain builds without the history.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::first_count::{gaps_since, unseen};
use proptest::prelude::*;

type Spans = Vec<(i64, i64)>;

fn covers(spans: &[(i64, i64)], at: i64) -> bool {
    spans.iter().any(|(start, end)| *start <= at && at < *end)
}

/// Sorted and merged gaps inside `[from, to)`, as `store::gaps::clipped` gives them.
fn merged_inside(raw: &[(i64, i64)], from: i64, to: i64) -> Spans {
    let mut cut: Spans = raw
        .iter()
        .map(|(a, b)| (*a.min(b), *a.max(b)))
        .map(|(a, b)| (a.max(from), b.min(to)))
        .filter(|(a, b)| a < b)
        .collect();
    cut.sort_unstable();
    let mut merged: Spans = Vec::new();
    for (a, b) in cut {
        match merged.last_mut() {
            Some(last) if a <= last.1 => last.1 = last.1.max(b),
            _ => merged.push((a, b)),
        }
    }
    merged
}

fn inputs() -> impl Strategy<Value = (Option<i64>, i64, i64, Spans)> {
    (
        proptest::option::of(-20i64..220),
        0i64..100,
        0i64..120,
        proptest::collection::vec((0i64..220, 0i64..220), 0..6),
    )
        .prop_map(|(first, from, length, raw)| {
            let to = from + length;
            (first, from, to, merged_inside(&raw, from, to))
        })
}

fn assert_sorted_disjoint_inside(spans: &[(i64, i64)], from: i64, to: i64) {
    for (start, end) in spans {
        assert!(start < end, "no empty span: {spans:?}");
        assert!(
            from <= *start && *end <= to,
            "inside [{from}, {to}): {spans:?}"
        );
    }
    for pair in spans.windows(2) {
        assert!(pair[0].1 < pair[1].0, "sorted and disjoint: {spans:?}");
    }
}

proptest! {
    #[test]
    fn unseen_is_sorted_disjoint_and_inside_the_range((first, from, to, gaps) in inputs()) {
        assert_sorted_disjoint_inside(&unseen(first, from, to, &gaps), from, to);
    }

    #[test]
    fn unseen_covers_everything_before_the_first_count((first, from, to, gaps) in inputs()) {
        let spans = unseen(first, from, to, &gaps);
        let before = first.map_or(to, |first| first.min(to));
        for at in from..before {
            prop_assert!(covers(&spans, at), "{at} is before the first count: {spans:?}");
        }
    }

    #[test]
    fn unseen_covers_nothing_after_the_first_count_that_no_gap_covers((first, from, to, gaps) in inputs()) {
        let spans = unseen(first, from, to, &gaps);
        if let Some(first) = first {
            for at in first.max(from)..to {
                prop_assert_eq!(covers(&spans, at), covers(&gaps, at), "at {}", at);
            }
        }
    }

    #[test]
    fn without_a_first_count_the_whole_range_is_unseen((_, from, to, gaps) in inputs()) {
        let spans = unseen(None, from, to, &gaps);
        for at in from..to {
            prop_assert!(covers(&spans, at));
        }
        for at in (from - 5)..from {
            prop_assert!(!covers(&spans, at));
        }
        for at in to..(to + 5) {
            prop_assert!(!covers(&spans, at));
        }
    }

    #[test]
    fn moving_the_first_count_later_never_covers_less(
        (first, from, to, gaps) in inputs(),
        later in 0i64..80,
    ) {
        let Some(first) = first else { return Ok(()) };
        let before = unseen(Some(first), from, to, &gaps);
        let after = unseen(Some(first + later), from, to, &gaps);
        for at in from..to {
            prop_assert!(!covers(&before, at) || covers(&after, at), "at {}", at);
        }
    }

    #[test]
    fn gaps_since_never_returns_time_before_the_first_count_and_loses_none_after((first, from, to, gaps) in inputs()) {
        let cut = gaps_since(first, &gaps);
        match first {
            None => prop_assert_eq!(&cut, &gaps),
            Some(first) => {
                for (start, end) in &cut {
                    prop_assert!(first <= *start && start < end, "{:?}", cut);
                }
                for at in (from - 5)..(to + 5) {
                    if at >= first {
                        prop_assert_eq!(covers(&cut, at), covers(&gaps, at), "at {}", at);
                    } else {
                        prop_assert!(!covers(&cut, at), "at {}", at);
                    }
                }
            }
        }
    }
}

#[test]
fn a_gap_that_began_before_the_first_count_is_cut_to_begin_at_it() {
    assert_eq!(
        gaps_since(Some(100), &[(40, 150), (200, 300)]),
        [(100, 150), (200, 300)]
    );
    assert_eq!(gaps_since(Some(100), &[(40, 100)]), []);
}

#[test]
fn the_time_before_the_first_count_and_a_gap_that_follows_it_are_one_stretch() {
    assert_eq!(
        unseen(Some(100), 0, 400, &[(100, 150), (200, 300)]),
        [(0, 150), (200, 300)]
    );
}
