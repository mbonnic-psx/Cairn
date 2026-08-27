# Contract — The pure pattern and announcement arithmetic

**Feature**: `003-reflection-and-history` | **Date**: 2026-08-27

Two new modules live in `domain/`, which `check-domain-purity.sh` keeps free of I/O and
platform conditionals. Everything either module needs is an argument. Neither reads a clock,
opens a file, or knows what platform it is on — which is what makes both testable with
`cargo test -p cairn --no-default-features`, no database and no GUI toolchain.

## `domain/patterns.rs`

### Inputs

```rust
pub struct Reach { pub domain: String, pub at: i64 }   // as recorded: domain and timestamp

pub fn summarize(
    reaches: &[Reach],
    estimates: &[(LocalDate, u32)],
    offset_seconds: i32,        // supplied by the interface; never read here
    from: i64,
    to: i64,
) -> Patterns
```

### The arithmetic

Bucketing is integer arithmetic on `at + offset_seconds`:

| Bucket | Rule |
| --- | --- |
| Hour of day | `((at + offset).rem_euclid(86_400)) / 3_600` → 0–23 |
| Day of week | derived from `(at + offset).div_euclid(86_400)` against the epoch's known weekday |
| Local day | `(at + offset).div_euclid(86_400)` |

`rem_euclid` and `div_euclid` rather than `%` and `/`, because a pre-epoch timestamp is
negative and truncating division would place it in the wrong bucket. This is a small detail
with a property test attached, since it is exactly the kind of thing that is correct in
testing and wrong for one person in one timezone.

### Properties the tests must hold

These are the contract; the implementation is free to change under them.

1. **Total preservation.** The sum of `by_hour` counts equals the sum of `by_weekday` counts
   equals the sum of `by_site` counts equals the number of reaches in range.
2. **Range exclusivity.** No reach outside `[from, to)` contributes to any bucket.
3. **Estimates never enter a bucket.** `by_site`, `by_hour`, and `by_weekday` are computed
   from `reaches` alone. `estimates_excluded` equals the number of estimate days in range.
   (FR-023)
4. **Offset shifts, never loses.** For any offset, the total is unchanged; only which bucket
   each reach falls into moves.
5. **Determinism.** Same inputs, same output, including the ordering of every returned list.
   Ordering is specified, not incidental, so the interface never reorders on refresh.
6. **Empty is empty, not absent.** A range with no reaches returns zero-filled buckets rather
   than an empty list, so the interface renders a quiet range rather than a missing one
   (FR-024).

### Deliberately not in this module

No formatting, no labels, no words. `by_weekday` returns `0–6`, not "Monday". The pure layer
does no product copy, because every user-facing string must sit where the banned-word check
covers it and where a translator would look.

## `domain/checkin.rs`

The announcement decision, isolated so that the guarantee the rewritten notification guard
depends on is a unit test rather than an inspection of a timer (research R2).

### Inputs

```rust
pub fn announcement_due(
    day: LocalDate,             // the local day the interface is asking about
    day_start: i64,             // that day's start, epoch seconds
    chosen_hour: u8,            // 0–23
    now: i64,
    last_announced: Option<LocalDate>,
    switched_on: bool,
) -> bool
```

### The rule

Returns true only when **all** hold: `switched_on`; `now >= day_start + chosen_hour * 3600`;
`now` is still within `day`; and `last_announced != Some(day)`.

The third condition is what makes FR-006 true — an hour that passed while Cairn was closed
does not announce late, because by the time Cairn opens, `now` has left that day.

### Properties the tests must hold

1. **At most once per day.** For a fixed `day`, once the caller has recorded the
   announcement, every subsequent call for that day returns false — at any `now`, any number
   of times. This is the property the guard rewrite leans on.
2. **Never early.** False for every `now` before the chosen hour on that day.
3. **Never late.** False for every `now` after `day` has ended, regardless of
   `last_announced`.
4. **Off means silent.** False for every input when `switched_on` is false.
5. **A backward clock grants nothing and takes nothing.** Moving `now` backwards after an
   announcement was recorded does not produce a second one, because the record is keyed to
   the day rather than to elapsed time.

### Why this function does not write

It decides; the caller records. Keeping the write outside means the decision is pure and
exhaustively testable, and it makes the ordering explicit at the call site — record first,
then raise (research R2), so that a crash between the two costs a reminder rather than
producing a second interruption.
