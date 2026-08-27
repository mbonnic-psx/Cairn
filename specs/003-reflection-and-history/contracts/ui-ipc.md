# Contract — Frontend ↔ Rust command surface

**Feature**: `003-reflection-and-history` | **Date**: 2026-08-27

Extends `specs/002-machine-wide-protection/contracts/ui-ipc.md`. The frontend calls nothing
else: no filesystem, no helper channel, no network. Every error returned here is a sentence
shown to a person exactly as written and is covered by the banned-word check.

## Classification — read this before adding anything

`src-tauri/tests/ipc_surface.rs` holds a fixed-size array pairing every exposed command with
its effect on protection, and the test fails if an exposed command is missing from it. Ten
commands are added here, so that array grows from 15 to 25.

**All ten classify as `Effect::Reads`.** That variant means *no effect on protection* rather
than *performs no write* — a convention slice `002` already set, since it classifies
`set_reach_mode` and `delete_all_data` the same way and both write. Naming it `Reads` is a
little loose, and the looseness is worth leaving alone: renaming the variant churns a test
whose entire value is that it is stable and hard to edit thoughtlessly. What matters is that
the classification question — *what does this do to protection?* — is answered for each, and
the answer is *nothing*.

**The one that deserves a second look** is `delete_reach_history`. A command that erases
records could be mistaken for a way to weaken protection. It is not: it removes what was
observed, never what is blocked. A test asserts that no deletion command can alter the trail,
the protection state, or anything the enforcement layer reads.

## Reads

### `get_day(day, day_start, day_end) -> DayView`

One day, whole. Serves both the check-in and the single-day history screen.

```
DayView {
  reaches:        [{ domain, at }],
  gaps:           [{ from, to }],
  estimate:       number | null,     // the person's own, for a silent day
  entry:          string | null,     // their writing, if any
  is_skipped:     bool,              // derived, never stored
  needs_estimate: bool,              // silent mode was active and no estimate given
  coverage_note:  string | null,     // shown when part of the day was unobserved
  sealed:         string | null,     // set when the key is unavailable; see below
}
```

`day` is the local calendar date; `day_start`/`day_end` are its bounds in epoch seconds,
computed by the interface exactly as `Reaches.tsx` already does (research R3).

**The frontend wrapper is named `getDayView`, not `getDay`.** `getDay` is a `Date` method, so
the ambient-counts guard cannot watch for the shorter name without false-positiving on every
date calculation in the codebase — and a guard that cries wolf gets edited into uselessness.
The Rust command keeps its `get_day` name; only the TypeScript wrapper differs.

When `sealed` is set, `entry`, `estimate`, and `reaches` are all absent and the interface
shows the sentence and nothing else. It does **not** offer the journaling space — see
`save_journal_entry`.

`is_skipped` is derived at read time and never stored. There is no skipped flag anywhere
(data-model.md), so nothing can count skipped days.

### `summarize_reaches(from, to, offset_seconds) -> Patterns`

```
Patterns {
  by_site:             [{ domain, count }],
  by_hour:             [{ hour, count }],        // 0–23, local
  by_weekday:          [{ weekday, count }],     // 0–6, local
  movement:            [{ day, count }],         // one point per local day in range
  estimates_excluded:  number,                   // how many days' estimates are not counted
  gaps:                [{ from, to }],
  dst_approximate:     bool,                     // true if the range crosses a DST change
  sealed:              string | null,
}
```

`offset_seconds` is the local UTC offset supplied by the interface, because the pure layer
may not read a clock (research R4).

`estimates_excluded` exists so FR-023's exclusion is *visible rather than silent*. If it is
non-zero the interface must say so. Returning the count rather than a boolean lets it say how
many without the interface recomputing anything.

`dst_approximate` is the honest reporting of R4's accepted approximation. When true the
interface states that hour buckets across the range are approximate.

### `get_quote() -> string | null`

A quote from the bundled set, or nothing. Never fetched. Null is a valid, complete answer —
a check-in without a quote is not degraded (FR-008).

Served only to the check-in. The single-day history screen does not ask for one; a quote
belongs to the ritual, not to the record.

### `get_check_in_settings() -> { evening_hour, announce }`

## The announcement

### `announce_check_in_if_due(day_start, now) -> Announcement | null`

Returns an announcement **at most once per local day**, and durably records that it did
before returning it (research R2).

```
Announcement { title, body }
```

This is the guarantee the rewritten notification guard leans on, so the contract states it as
a testable property rather than a description:

> Called any number of times with any interleaving of `day_start` and `now`, this returns
> non-null at most once for each distinct local day, and never before the chosen hour has
> arrived on that day.

The interface raises the notification when it receives one and has no other path to raising
one. It never decides whether an announcement is due, and it must not cache the answer.

**Returns null**, without exception, when: the announcement is switched off; the hour has not
yet come today; an announcement has already been recorded for this local day; or the hour
passed while Cairn was not running — an announcement is never issued late (FR-006).

## Writes

### `save_journal_entry(day, text) -> DayView`

**Refuses when the key is unavailable**, returning the plain sentence rather than accepting
text it cannot keep (research R5). The interface must not offer the journaling space in that
state, so this refusal is a second line of defence rather than the expected path.

Empty or whitespace-only `text` is refused and stores nothing (FR-014). Saving over an
existing entry replaces it (FR-015) and does not retain the previous text.

Accepts any past `day`, on the same terms as today (FR-026). The response is identical
whichever day it was — nothing in the return value distinguishes an entry written later
(FR-026a), and `written_at` is never exposed.

### `delete_journal_entry(day) -> DayView`

Leaves that day's reaches untouched.

### `save_reach_estimate(day, count) -> DayView`

The person's own number for a silent day. Never presented as a measurement, and excluded from
by-site and by-hour breakdowns by construction — it carries neither.

### `delete_reach_history(from, to) -> ()`

Deletes reaches **and coverage gaps** in the range (data-model.md). One command covers all
three granularities FR-018 requires: a day, a range, or everything.

**Returns nothing at all**, and this is deliberate. A count of what was removed would be a
report of what was lost, which FR-018b forbids. The command has no useful return value and is
specified as having none so that nobody adds one helpfully.

### `set_evening_hour(hour) -> settings` and `set_announce_check_in(on) -> settings`

`hour` is 0–23 and refused otherwise. Changing the hour to one already past today applies from
tomorrow and raises nothing now.

Switching the announcement off never affects whether the check-in can be opened (FR-003).

## What this contract deliberately does not contain

Each of these would be a natural thing to add, and each is refused for a stated reason.

| Not exposed | Why |
| --- | --- |
| `count_unwritten_days`, or anything returning how many days lack an entry | FR-026b. This is the exact shape of a debt. There is no data behind it either — skipped is derived, never stored |
| `get_streak`, or any consecutive-day figure | Slice `004`, and the guard forbids it now |
| Anything returning `written_at` | FR-026a. Exposing it is how an entry written later becomes visibly one |
| A reach total on any summary the shell could read | The ambient-counts guard. Counts live on the screens someone navigated to |
| Any command that reduces protection | Principle I. This slice adds none, and the classification test would catch an attempt |
