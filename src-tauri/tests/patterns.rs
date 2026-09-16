//! Property tests for the pure pattern-bucketing arithmetic described in
//! `specs/003-reflection-and-history/contracts/patterns.md`.
//!
//! `domain::patterns` does not exist yet. That is deliberate: T012 implements
//! `summarize` against exactly the properties below, written by someone other
//! than whoever writes the implementation, so the guarantee is a property the
//! code is judged against rather than a shape the code was allowed to define
//! for itself. This file will not compile until T012 lands `Reach`,
//! `Patterns`, and `summarize` with the exact surface these tests use.
//!
//! ## The API surface these tests require
//!
//! ```text
//! pub struct Reach { pub domain: String, pub at: i64 }
//!
//! pub fn summarize(
//!     reaches: &[Reach],
//!     estimates: &[(LocalDate, u32)],
//!     offset_seconds: i32,
//!     from: i64,
//!     to: i64,
//! ) -> Patterns
//!
//! pub struct Patterns {
//!     pub by_site: Vec<(String, u32)>,
//!     pub by_hour: Vec<u32>,
//!     pub by_weekday: Vec<u32>,
//!     pub by_day: Vec<(LocalDate, u32)>,
//!     pub estimates_excluded: u32,
//! }
//! ```
//!
//! ## Semantics these tests assume, because the contract leaves them to the
//! implementation and something has to be fixed for a test to compile
//!
//! - **Range membership** is decided on the raw `at`, never on `at + offset`:
//!   a reach is in range exactly when `from <= at < to`. `offset_seconds`
//!   only ever decides which *bucket* a qualifying reach lands in, never
//!   whether it qualifies. (`range_exclusivity_includes_from_and_excludes_to`
//!   below fixes this at the boundary, at an arbitrary offset, so a reading
//!   where offset shifted the window itself would fail loudly rather than
//!   silently passing elsewhere.)
//! - **`by_hour`** is a fixed 24-element vector indexed by hour (0-23): the
//!   position *is* the ordering, so there is nothing incidental left to sort.
//! - **`by_weekday`** is a fixed 7-element vector indexed by weekday
//!   (`LocalDate::weekday()`: 0 = Monday .. 6 = Sunday), same reasoning.
//! - **`by_site`** is ordered by count descending, ties broken by domain name
//!   ascending — a "what did I reach for most" list needs *a* tie-break to be
//!   deterministic, and this is the one these tests fix.
//! - **`by_day`** holds one entry per local day number in
//!   `local_day(from) ..= local_day(to - 1)` (empty when `to <= from`),
//!   ascending by date — the local-day image of a contiguous range of `at`
//!   under a floor-division map is itself contiguous, so this is well-defined
//!   for every offset without needing the range to be day-aligned.
//! - **`estimates_excluded`** counts `estimates` entries whose day's day
//!   number falls in that same window — nothing about an estimate's `u32`
//!   count is summed; only whether the day itself is in range.
//!
//! None of this reimplements `summarize`: every assertion below is either an
//! invariant checked against the output alone (ordering, zero-fill, contiguity,
//! equality across two calls) or a comparison against a plain filter/count on
//! the *inputs* the test built by hand — never a parallel bucketing pass.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use proptest::prelude::*;

use cairn::domain::dates::LocalDate;
use cairn::domain::patterns::{summarize, Reach};

// --- Strategies ----------------------------------------------------------

/// A `(from, to)` pair with `to > from`. Generated two ways: across a wide
/// span reaching deep pre-epoch, and — separately — narrow around zero so a
/// good share of ranges straddle the epoch itself, which is exactly where
/// `rem_euclid`/`div_euclid` earn their keep over `%`/`/`.
fn range_strategy() -> impl Strategy<Value = (i64, i64)> {
    prop_oneof![
        (-50_000_000_000i64..=50_000_000_000i64, 1i64..=5_000_000i64),
        (-500_000i64..=500_000i64, 1i64..=2_000_000i64),
    ]
    .prop_map(|(from, span)| (from, from + span))
}

/// A handful of repeating domain names, so `by_site` sees real collisions and
/// its descending-count, ascending-domain tie-break is actually exercised
/// rather than vacuously true on all-distinct input.
fn domain_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("site-a.example".to_string()),
        Just("site-b.example".to_string()),
        Just("site-c.example".to_string()),
    ]
}

/// `(from, to, reaches)`: each reach's `at` is drawn relative to the range so
/// that some land before it, some inside it (including its exact start), and
/// some at or after `to` — the regions range exclusivity and total
/// preservation both care about.
fn range_and_reaches() -> impl Strategy<Value = (i64, i64, Vec<Reach>)> {
    range_strategy().prop_flat_map(|(from, to)| {
        let span = (to - from).max(1);
        prop::collection::vec(
            (domain_strategy(), -span..=2 * span).prop_map(move |(domain, delta)| {
                Reach {
                    domain,
                    at: from + delta,
                }
            }),
            0..40,
        )
        .prop_map(move |reaches| (from, to, reaches))
    })
}

/// Offsets covering realistic timezones and reaching well beyond them: real
/// zones run to +-14h, but the contract does not say the implementation
/// clamps, so these tests do not assume it does.
fn offset_strategy() -> impl Strategy<Value = i32> {
    prop_oneof![
        3 => -90_000i32..=90_000i32,
        1 => i32::MIN..=i32::MAX,
    ]
}

fn estimate_strategy() -> impl Strategy<Value = (LocalDate, u32)> {
    (-2_000_000i64..=2_000_000i64, 0u32..=50)
        .prop_map(|(day, count)| (LocalDate::from_days_since_epoch(day), count))
}

fn estimates_strategy() -> impl Strategy<Value = Vec<(LocalDate, u32)>> {
    prop::collection::vec(estimate_strategy(), 0..10)
}

/// A day number `k` and a day count `n`, for a range `[k * 86_400, (k + n) *
/// 86_400)` at `offset_seconds == 0` — exactly `n` local days starting at day
/// `k`. Alignment is what lets a test state the expected day window as plain
/// multiplication instead of leaning on the bucketing formula under test.
fn aligned_day_window() -> impl Strategy<Value = (i64, i64)> {
    (-2_000_000i64..=2_000_000i64, 1i64..=30i64)
}

/// One estimate day for a given aligned window, tagged with whether it was
/// placed inside `[k, k + n - 1]` or deliberately outside it.
fn tagged_estimate_day(k: i64, n: i64) -> impl Strategy<Value = (bool, i64)> {
    prop_oneof![
        (0i64..n).prop_map(move |offset| (true, k + offset)),
        (1i64..=1000i64).prop_map(move |offset| (false, k - offset)),
        (0i64..1000i64).prop_map(move |offset| (false, k + n + offset)),
    ]
}

fn window_and_tagged_estimates() -> impl Strategy<Value = (i64, i64, Vec<(bool, i64)>)> {
    aligned_day_window().prop_flat_map(|(k, n)| {
        prop::collection::vec(tagged_estimate_day(k, n), 0..20)
            .prop_map(move |tagged| (k, n, tagged))
    })
}

// --- Properties ------------------------------------------------------------

proptest! {
    /// Property 1 — total preservation. `by_hour`, `by_weekday`, `by_site`,
    /// and `by_day` each sum to the number of reaches whose `at` is in
    /// `[from, to)`, computed here by a plain filter on the input, not by any
    /// bucketing pass of this test's own.
    #[test]
    fn total_preservation_across_hour_weekday_site_and_day_buckets(
        (from, to, reaches) in range_and_reaches(),
        offset in offset_strategy(),
        estimates in estimates_strategy(),
    ) {
        let patterns = summarize(&reaches, &estimates, offset, from, to);
        let expected_count = reaches.iter().filter(|r| r.at >= from && r.at < to).count() as u32;

        prop_assert_eq!(patterns.by_hour.len(), 24);
        prop_assert_eq!(patterns.by_weekday.len(), 7);

        prop_assert_eq!(patterns.by_hour.iter().sum::<u32>(), expected_count);
        prop_assert_eq!(patterns.by_weekday.iter().sum::<u32>(), expected_count);
        prop_assert_eq!(
            patterns.by_site.iter().map(|(_, count)| count).sum::<u32>(),
            expected_count
        );
        prop_assert_eq!(
            patterns.by_day.iter().map(|(_, count)| count).sum::<u32>(),
            expected_count
        );
    }

    /// Property 2 — range exclusivity, at the boundary. Four reaches, placed
    /// one second before `from`, exactly at `from`, exactly at `to - 1`, and
    /// exactly at `to`. Only the middle two may ever surface, at any offset.
    #[test]
    fn range_exclusivity_includes_from_and_excludes_to(
        from in -50_000_000_000i64..=50_000_000_000i64,
        gap in 1i64..=5_000_000i64,
        offset in offset_strategy(),
    ) {
        let to = from + gap;
        let reaches = vec![
            Reach { domain: "before-from.example".to_string(), at: from - 1 },
            Reach { domain: "at-from.example".to_string(), at: from },
            Reach { domain: "at-to-minus-one.example".to_string(), at: to - 1 },
            Reach { domain: "at-to.example".to_string(), at: to },
        ];

        let patterns = summarize(&reaches, &[], offset, from, to);

        let counted_once =
            |domain: &str| patterns.by_site.iter().any(|(d, count)| d == domain && *count == 1);
        let absent = |domain: &str| !patterns.by_site.iter().any(|(d, _)| d == domain);

        prop_assert!(counted_once("at-from.example"));
        prop_assert!(counted_once("at-to-minus-one.example"));
        prop_assert!(absent("before-from.example"));
        prop_assert!(absent("at-to.example"));

        // Two reach records regardless of whether `gap == 1` makes their
        // timestamps the same instant — they are still two recorded reaches.
        prop_assert_eq!(patterns.by_hour.iter().sum::<u32>(), 2u32);
    }

    /// Property 3a — estimates never enter a reach-derived bucket. Two
    /// independent, arbitrary `estimates` vectors (including empty) must
    /// produce byte-for-byte identical `by_hour`/`by_weekday`/`by_site`/
    /// `by_day`, since none of those may be computed from anything but
    /// `reaches`.
    #[test]
    fn estimates_never_change_a_reach_derived_bucket(
        (from, to, reaches) in range_and_reaches(),
        offset in offset_strategy(),
        estimates_x in estimates_strategy(),
        estimates_y in estimates_strategy(),
    ) {
        let with_x = summarize(&reaches, &estimates_x, offset, from, to);
        let with_y = summarize(&reaches, &estimates_y, offset, from, to);

        prop_assert_eq!(with_x.by_hour, with_y.by_hour);
        prop_assert_eq!(with_x.by_weekday, with_y.by_weekday);
        prop_assert_eq!(with_x.by_site, with_y.by_site);
        prop_assert_eq!(with_x.by_day, with_y.by_day);
    }

    /// Property 3b — `estimates_excluded` counts exactly the estimate days
    /// whose day number falls in the local-day window `[k, k + n - 1]`. The
    /// window is day-aligned and at `offset_seconds == 0`, so the expected
    /// count is tracked at generation time by simple tagging, not recomputed
    /// through the bucketing formula.
    #[test]
    fn estimates_excluded_counts_only_days_within_the_local_day_window(
        (k, n, tagged) in window_and_tagged_estimates(),
        reaches in prop::collection::vec(
            (domain_strategy(), -200_000_000i64..=200_000_000i64)
                .prop_map(|(domain, at)| Reach { domain, at }),
            0..10,
        ),
    ) {
        let from = k * 86_400;
        let to = (k + n) * 86_400;
        let estimates: Vec<(LocalDate, u32)> = tagged
            .iter()
            .map(|(_, day)| (LocalDate::from_days_since_epoch(*day), 1))
            .collect();
        let expected_in_window = tagged.iter().filter(|(inside, _)| *inside).count() as u32;

        let patterns = summarize(&reaches, &estimates, 0, from, to);
        prop_assert_eq!(patterns.estimates_excluded, expected_in_window);
    }

    /// Property 4 — offset shifts never lose a reach. Two arbitrary,
    /// independent offsets on the same reaches/range: the hour and weekday
    /// totals are unchanged (and equal the same range-filtered count `by_hour`
    /// alone would give at either offset), and `by_site` — which has nothing
    /// to do with the clock — is byte-for-byte identical.
    #[test]
    fn offset_never_loses_a_reach_and_by_site_never_moves_with_it(
        (from, to, reaches) in range_and_reaches(),
        offset_a in offset_strategy(),
        offset_b in offset_strategy(),
        estimates in estimates_strategy(),
    ) {
        let with_a = summarize(&reaches, &estimates, offset_a, from, to);
        let with_b = summarize(&reaches, &estimates, offset_b, from, to);
        let expected_count = reaches.iter().filter(|r| r.at >= from && r.at < to).count() as u32;

        prop_assert_eq!(with_a.by_hour.iter().sum::<u32>(), expected_count);
        prop_assert_eq!(with_b.by_hour.iter().sum::<u32>(), expected_count);
        prop_assert_eq!(with_a.by_weekday.iter().sum::<u32>(), expected_count);
        prop_assert_eq!(with_b.by_weekday.iter().sum::<u32>(), expected_count);

        prop_assert_eq!(with_a.by_site, with_b.by_site);
    }

    /// Property 5a — determinism. Calling `summarize` twice on identical
    /// inputs returns identical output in every field, `==` on a `Vec`
    /// checking order along with content.
    #[test]
    fn summarize_is_deterministic_given_identical_inputs(
        (from, to, reaches) in range_and_reaches(),
        offset in offset_strategy(),
        estimates in estimates_strategy(),
    ) {
        let first = summarize(&reaches, &estimates, offset, from, to);
        let second = summarize(&reaches, &estimates, offset, from, to);

        prop_assert_eq!(first.by_hour, second.by_hour);
        prop_assert_eq!(first.by_weekday, second.by_weekday);
        prop_assert_eq!(first.by_site, second.by_site);
        prop_assert_eq!(first.by_day, second.by_day);
        prop_assert_eq!(first.estimates_excluded, second.estimates_excluded);
    }

    /// Property 5b — `by_site`'s ordering is a stated rule, not an accident of
    /// a single run: descending by count, ties broken by ascending domain
    /// name, and no domain repeated.
    #[test]
    fn by_site_is_ordered_by_descending_count_then_ascending_domain(
        (from, to, reaches) in range_and_reaches(),
        offset in offset_strategy(),
    ) {
        let patterns = summarize(&reaches, &[], offset, from, to);

        for pair in patterns.by_site.windows(2) {
            let (earlier_domain, earlier_count) = &pair[0];
            let (later_domain, later_count) = &pair[1];
            let correctly_ordered = earlier_count > later_count
                || (earlier_count == later_count && earlier_domain < later_domain);
            prop_assert!(correctly_ordered);
        }

        let mut domains: Vec<&String> = patterns.by_site.iter().map(|(domain, _)| domain).collect();
        let before_dedup = domains.len();
        domains.sort();
        domains.dedup();
        prop_assert_eq!(domains.len(), before_dedup);
    }

    /// Property 5c — `by_day`'s ordering is chronological with no gaps and no
    /// repeats, for any offset, since the local-day image of a contiguous
    /// `at` range is itself contiguous.
    #[test]
    fn by_day_entries_are_strictly_ascending_with_no_gaps(
        (from, to, reaches) in range_and_reaches(),
        offset in offset_strategy(),
    ) {
        let patterns = summarize(&reaches, &[], offset, from, to);

        for pair in patterns.by_day.windows(2) {
            let (earlier_day, _) = &pair[0];
            let (later_day, _) = &pair[1];
            prop_assert_eq!(later_day.days_since_epoch(), earlier_day.days_since_epoch() + 1);
        }
    }

    /// Property 6 — empty is zero-filled, not absent. No reaches at all: the
    /// hour and weekday buckets are still full-length and all zero, `by_site`
    /// is empty (there is no enumerable universe of domains to zero-fill),
    /// and `by_day` covers every one of the `n` local days in the window,
    /// each at zero — including when `estimates` is non-empty, since
    /// estimates never populate a bucket either.
    #[test]
    fn empty_reaches_yield_zero_filled_hour_weekday_and_day_buckets(
        k in -2_000_000i64..=2_000_000i64,
        n in 1i64..=30i64,
        estimates in estimates_strategy(),
    ) {
        let from = k * 86_400;
        let to = (k + n) * 86_400;
        let patterns = summarize(&[], &estimates, 0, from, to);

        prop_assert_eq!(patterns.by_hour.len(), 24);
        prop_assert!(patterns.by_hour.iter().all(|&count| count == 0));

        prop_assert_eq!(patterns.by_weekday.len(), 7);
        prop_assert!(patterns.by_weekday.iter().all(|&count| count == 0));

        prop_assert!(patterns.by_site.is_empty());

        prop_assert_eq!(patterns.by_day.len(), n as usize);
        for (index, (day, count)) in patterns.by_day.iter().enumerate() {
            prop_assert_eq!(*count, 0);
            prop_assert_eq!(day.days_since_epoch(), k + index as i64);
        }
    }
}

// --- Anchor examples ---------------------------------------------------
//
// Small, hand-checkable illustrations of the same properties above, kept
// alongside them the way `splice_properties.rs` keeps worked examples after
// its `proptest!` block.

#[test]
fn a_reach_exactly_at_from_counts_and_a_reach_exactly_at_to_does_not() {
    let reaches = vec![
        Reach {
            domain: "in-range.example".to_string(),
            at: 1_000,
        },
        Reach {
            domain: "out-of-range.example".to_string(),
            at: 2_000,
        },
    ];

    let patterns = summarize(&reaches, &[], 0, 1_000, 2_000);

    assert!(patterns
        .by_site
        .iter()
        .any(|(d, count)| d == "in-range.example" && *count == 1));
    assert!(!patterns
        .by_site
        .iter()
        .any(|(d, _)| d == "out-of-range.example"));
    assert_eq!(patterns.by_hour.iter().sum::<u32>(), 1);
}

#[test]
fn shifting_the_offset_moves_an_hour_bucket_without_changing_the_total() {
    // The epoch instant itself: hour 0 at offset zero, one second into the
    // previous day's last hour once the offset pulls it back one second.
    let reaches = vec![Reach {
        domain: "midnight.example".to_string(),
        at: 0,
    }];

    let at_offset_zero = summarize(&reaches, &[], 0, -100, 100);
    assert_eq!(at_offset_zero.by_hour[0], 1);
    assert_eq!(at_offset_zero.by_hour.iter().sum::<u32>(), 1);

    let one_second_earlier = summarize(&reaches, &[], -1, -100, 100);
    assert_eq!(one_second_earlier.by_hour[23], 1);
    assert_eq!(one_second_earlier.by_hour.iter().sum::<u32>(), 1);
}

#[test]
fn a_three_day_range_with_no_reaches_lists_all_three_local_days_at_zero() {
    // Day zero of the epoch through two days after it, entirely empty.
    let patterns = summarize(&[], &[], 0, 0, 3 * 86_400);

    assert_eq!(patterns.by_day.len(), 3);
    let expected_first = LocalDate::from_days_since_epoch(0);
    let expected_last = LocalDate::from_days_since_epoch(2);
    assert_eq!(patterns.by_day.first().unwrap().0, expected_first);
    assert_eq!(patterns.by_day.last().unwrap().0, expected_last);
    assert!(patterns.by_day.iter().all(|(_, count)| *count == 0));
}
