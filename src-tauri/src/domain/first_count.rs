//! The time before Cairn first counted is not time it saw (slice
//! `first-counted`; `contracts/patterns.md`).
//!
//! Two pure functions over epoch seconds. `first` is when Cairn first counted,
//! or `None` when it never has. `gaps` are sorted, merged and inside the range,
//! as `store::gaps::clipped` returns them. Nothing here reads a clock, a file or
//! a zone.

/// What Cairn did not see in `[from, to)`: everything before the first count,
/// then each gap from the first count on. Sorted and disjoint (a stretch that
/// touches the next is one), and what `movement` is given as its unseen time.
/// With no first count, all of `[from, to)`.
pub fn unseen(
    first: Option<i64>,
    from: i64,
    to: i64,
    gaps: &[(i64, i64)],
) -> Vec<(i64, i64)> {
    let Some(first) = first else {
        return if from < to {
            vec![(from, to)]
        } else {
            Vec::new()
        };
    };
    let mut spans: Vec<(i64, i64)> = Vec::with_capacity(1 + gaps.len());
    let before = first.min(to);
    if from < before {
        spans.push((from, before));
    }
    for (start, end) in gaps_since(Some(first), gaps) {
        match spans.last_mut() {
            Some(last) if start <= last.1 => last.1 = last.1.max(end),
            _ => spans.push((start, end)),
        }
    }
    spans
}

/// Each gap cut to begin no earlier than the first count, with what is left
/// empty dropped. Returned unchanged when Cairn never counted.
pub fn gaps_since(first: Option<i64>, gaps: &[(i64, i64)]) -> Vec<(i64, i64)> {
    let Some(first) = first else {
        return gaps.to_vec();
    };
    gaps.iter()
        .map(|(start, end)| (*start.max(&first), *end))
        .filter(|(start, end)| start < end)
        .collect()
}
