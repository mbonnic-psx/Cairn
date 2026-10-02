# Contract — The pure pattern and announcement arithmetic

> **Revised 2026-10-01 — the announcement is withdrawn.** The owner decided Cairn raises no
> notification of any kind, the check-in included (spec Clarifications 2026-10-01; constitution
> v1.4.0). Everything below about the announcement, the evening hour, the announcement switch,
> `last_announced_day`, the notification plugin and the rewritten notification guard is kept as
> the record of what was planned and validated, and no longer describes Cairn. The plugin, its
> permissions, the announce seam and the decision function were removed, and
> `check-no-notifications.sh` forbids notification capability entirely again.

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

#### Amended in slice `history-by-hour` (2026-10-02)

Gaps review B4 decides a reach counts in the hour the computer's clock showed at its own instant, so one offset
for a range is no longer the rule for hours. Added beside `summarize`, which is unchanged:

```rust
pub struct OffsetChange { pub from: i64, pub offset_seconds: i32 }

pub fn by_hour(
    reaches: &[Reach],
    first_offset: i32,          // in force from `from`; supplied by the interface
    changes: &[OffsetChange],   // each in force from its `from` on; strictly increasing, inside `[from, to)`
    from: i64,
    to: i64,
) -> [u32; 24]
```

Each reach in `[from, to)` is bucketed by the offset of the last change at or before its `at` (or `first_offset`
before the first change), with the hour rule above. Properties 1, 2, 4, 5 and 6 hold for it as they do for
`summarize`. With no changes it equals `summarize(...).by_hour` for `first_offset`. A reach's hour depends only on
the offset in force at its instant. Checking that the changes increase is the caller's job
(`reflection::over_time::check_offsets`), not this module's. `crosses_offset_change` stays, but it no longer feeds
`dst_approximate` (`ui-ipc.md`, amended the same day). See `slices/history-by-hour/plan.md`, *The hour*.

#### Amended in slice `history-by-weekday` (2026-10-02)

Gaps review W5 decides a reach belongs to the local day its own instant falls in, by the offset in force then, as
B4 decides for hours. W4 decides the screen states how many of each weekday the range holds. Two functions are added
beside `by_hour`. `summarize` and `by_hour` are unchanged in behaviour:

```rust
pub fn by_weekday(
    reaches: &[Reach],
    first_offset: i32,
    changes: &[OffsetChange],
    from: i64,
    to: i64,
) -> [u32; 7]                                   // index = LocalDate::weekday, 0 = Monday … 6 = Sunday

pub fn weekdays_in(first_day: LocalDate, last_day: LocalDate) -> [u32; 7]
```

`by_weekday` gives each reach in `[from, to)` the offset `by_hour` would give it. The two share one private lookup,
so they cannot disagree. It counts the reach under the weekday of its local day, `(at + offset).div_euclid(86 400)`,
the day rule above. Properties 1, 2, 4, 5 and 6 hold for it as they do for `summarize`. Its total equals `by_hour`'s
for the same arguments. With no changes, it equals `summarize(...).by_weekday` for `first_offset`.

`weekdays_in` counts the weekdays of the dates `first_day..=last_day`. With `n` days, each weekday gets `n / 7`, and
the `n % 7` days from `first_day`'s weekday onwards get one more. It is computed in `i64` and saturates to `u32`. It
gives seven zeros when `first_day > last_day`. It takes no offset and no reach. Its properties: the sum is `n`
(below saturation); any two entries differ by at most 1; a whole number of weeks gives seven equal entries.

The first day of the week, and the days' names, are not here. `by_weekday` returns `0–6`, as *Deliberately not in
this module* says. The interface orders and names the days. See `slices/history-by-weekday/plan.md`.

#### Amended in slice `history-movement` (2026-10-02)

Added beside `by_hour`, `by_weekday` and `weekdays_in`, which are unchanged:

```rust
pub struct LocalRange<'a> {
    pub first_day: LocalDate, pub last_day: LocalDate,
    pub from: i64, pub to: i64,                 // the range's bounds, as the interface computed them
    pub first_offset: i32, pub changes: &'a [OffsetChange],   // as `check_offsets` returned them
}
pub fn movement(reaches: &[Reach], range: &LocalRange<'_>, unseen: &[(i64, i64)], now: i64) -> Vec<MovementRow>
```

`unseen` is the range's gaps, sorted, merged and inside `[from, to)`. `now` is supplied by the caller and never
read here. Properties: the rows are contiguous from `first_day`, one per date up to 56 dates and one per seven
dates beyond; every reach in `[from, to)` is in exactly one row, so the counts sum to `by_hour`'s; a reach's row
holds its instant; the reaches' order does not matter; estimates never come in; adding unseen time never makes a
row more seen; no row holding a reach is `None`; nothing is allocated per date.

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
