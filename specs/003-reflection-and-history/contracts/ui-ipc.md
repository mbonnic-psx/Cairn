# Contract — Frontend ↔ Rust command surface

**Feature**: `003-reflection-and-history` | **Date**: 2026-08-27

Extends `specs/002-machine-wide-protection/contracts/ui-ipc.md`. The frontend calls nothing
else: no filesystem, no helper channel, no network. Every error returned here is a sentence
shown to a person exactly as written and is covered by the banned-word check.

## Classification — read this before adding anything

`src-tauri/tests/ipc_surface.rs` holds a fixed-size array pairing every exposed command with
its effect on protection, and the test fails if an exposed command is missing from it. Ten
commands were planned here, so that array was to grow from 15 to 25. *(Amended in slice `quote`, 2026-10-01: the announcement's commands are withdrawn, and the switch adds `get_quotes_shown` and `set_quotes_shown`, so the array's final size follows the commands below rather than this count. Each slice grows it by the commands it exposes.)*

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
  is_skipped:     bool,              // derived, never stored — NOT SENT YET: added by slice `one-day` (T052)
  needs_estimate: bool,              // silent mode was active and no estimate given — NOT SENT YET: `one-day`
  coverage_note:  string | null,     // shown when part of the day was unobserved
  sealed:         string | null,     // set when the key is unavailable; see below
}
```

`day` is the local calendar date; `day_start`/`day_end` are its bounds in epoch seconds: that local
midnight and the next one, computed by the interface (research R3). Not `day_start + 86 400`, which is an
hour out on a daylight-saving day. `Reaches.tsx` still does that; slice `history` moves every caller onto
one shared computation.

**Fields are sent once a slice can state them truthfully** (slice `write-tonight`, 2026-10-01). Until then a
field is absent, never a placeholder: a `false` for `is_skipped` would claim something nothing computed. The
contract grows additively, so a reader treats an absent field as not yet known.

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

#### Amended in slice `history-by-site` (2026-10-01)

**The signature takes the range's days and their bounds, like `get_day`.** It replaces
`(from, to, offset_seconds)` above. The command had not shipped, so nothing reads the old shape.

```
summarize_reaches(first_day, last_day, range_start, range_end) -> Patterns
```

`first_day` and `last_day` are local calendar dates (`YYYY-MM-DD`), both inside the range.
`range_start` is the local midnight that begins `first_day`. `range_end` is the local midnight
that ends `last_day`, which is the start of the next day. Both are epoch seconds, computed by the
interface (research R3), never with `+ 86 400` per day. A reach counts when
`range_start <= at < range_end`.

This also settles the defect T044 records: one offset cannot reveal a change in offset. Here
each bound, set against its own date's UTC midnight, *is* an offset. The command can derive the
offset at each end of the range, and slice `history-by-hour` passes that pair to
`domain::patterns::crosses_offset_change` for `dst_approximate`. Nothing needs to be added to the
signature for it.

**The bounds are checked as `get_day`'s are, at each end.** The core refuses the range, putting
the plain sentence in `sealed` and returning nothing else, unless all of these hold:

- `first_day <= last_day`;
- `range_start` could begin `first_day` somewhere on earth: no earlier than 14 hours before
  that date's UTC midnight and no later than 12 hours after it (the rule `check_bounds` holds
  for a day);
- `range_end` could begin the day after `last_day`, by the same rule;
- the offsets at the two ends differ by no more than 3 hours, the largest clock change in tzdata
  (amended 2026-10-02, adversary A1: the premise was "2 hours, the largest seasonal change any zone
  uses", and it was untrue. Antarctica/Casey went from +11:00 to +08:00 in 2018, and Vostok and
  Ust-Nera have had 3-hour changes. Every 2-hour bound below is now 3 hours);
- `range_start` is not after the present. A range that has not begun holds nothing Cairn could
  have seen, and an empty answer would read as a quiet range.

**Fields are sent once a slice can state them truthfully**, as `DayView`'s are. Slice
`history-by-site` sends:

```
Patterns {
  by_site:            [{ domain, count }],  // most first; equal counts by domain name, A to Z
  gaps:               [{ from, to }],       // each cut to the part inside the range
  coverage_note:      string | null,        // the gaps in one sentence, about the range
  estimates_excluded: number,               // days in the range that hold the person's own estimate
  sealed:             string | null,
}
```

`by_hour` and `dst_approximate` (slice `history-by-hour`), `by_weekday` (`history-by-weekday`)
and `movement` (`history-movement`) are **absent until their slices add them**. A reader treats
an absent field as not yet known.

- `by_site` is built from reaches alone (FR-023). An estimate has no site, so it cannot appear
  here. `estimates_excluded` says how many days' estimates were left out, counted by their own
  dates in `first_day..=last_day`.
- `gaps` and `coverage_note` cover the range the way `get_day`'s cover a day (FR-022, SC-007).
  The note speaks of *these days*, never *today*. A deletion the person made never adds a gap
  (FR-022a).
- A range with no reaches has `by_site: []` and no `sealed`. That is a quiet range (FR-024), not
  a refusal.
- `sealed` is set when the key is unavailable, the history cannot be read, or the bounds are
  refused. Then `by_site` and `gaps` are empty, `coverage_note` is null, `estimates_excluded` is
  0, and the interface shows the sentence and nothing else. A read that does not go through is
  never an empty range.

Classified `Effect::Reads`. The frontend wrapper is `summarizeReaches` in `src/ipc/reaches.ts`,
and the reaches screen is its only caller (spec, gaps review H1).

#### Amended in slice `history-by-hour` (2026-10-02)

**The command takes the offsets in force across the range.** This adds one parameter to the signature of
2026-10-01. Gaps review B4 decides a reach counts in the hour the computer's clock showed at its own instant, and
the two ends of a range cannot say what happened between them. A range from January to December has the same
offset at both ends and a summer inside it.

```
summarize_reaches(first_day, last_day, range_start, range_end, offsets) -> Patterns

offsets: [{ from, offset }]   // from: epoch seconds; offset: seconds east of UTC, whole seconds
```

`offsets[0]` is `{ from: range_start, offset: the offset in force there }`. Each later entry is an instant inside
the range at which the computer's clock changes its offset, and the offset from then on. The interface computes the
list with `Date`, as it computes the bounds (`src/localDays.ts`, `offsetChanges`). The core refuses the range, with
the same sealed sentence as for its bounds and nothing else returned, unless:

- the list is not empty and has no more entries than the range has days, plus one;
- the first `from` is `range_start`, and the first offset is the one in force there, within 3 hours of the one
  `range_start` implies for `first_day` (amended 2026-10-02, convergence K23: where a zone puts its clocks forward
  at 00:00, `range_start` is 01:00 at the new offset, so it implies the old one while the offset in force is the
  new one; the two are one clock change apart, and no further);
- the `from`s strictly increase and are all before `range_end`;
- every offset lies between −12 h and +14 h;
- neighbouring offsets differ, by no more than 3 hours;
- the last offset is within 3 hours of the one `range_end` implies for the day after `last_day`.

**Fields.** Slice `history-by-hour` adds two, so the answer holds seven keys:

```
  by_hour:          [{ hour, count }],  // exactly 24, hour 0–23 ascending, zeros included; [] when sealed
  dst_approximate:  bool,               // false: every hour is bucketed by the offset in force at its instant
```

- `by_hour` is built from reaches alone (FR-023). An estimate has no hour. `estimates_excluded` is the same count
  by site states. A quiet range is 24 zeros (FR-024). A sealed answer is `[]`, never 24 zeros, which would read as a
  quiet range.
- **`dst_approximate` changes meaning.** It was R4's flag for one offset applied across a change. Under this
  signature no hour is approximate, so it is always `false`. It stays on the wire, rather than being removed, so
  that it says what B4 says ("`dst_approximate` stays false whenever the hours are exact"). The interface does not
  read it, and T046's notice is not built. `domain::patterns::crosses_offset_change` no longer feeds it.
- **A time-zone change.** The core keeps no zone. The hour follows the offsets the interface sends, so after the
  computer moves to another zone, every reach is read in the zone it has now, as the *Today* log prints it. Whether
  a reach should instead keep the hour from before the move is the owner's question
  (`slices/history-by-hour/plan.md`, Q1). Answering yes would need more than domain and timestamp to be recorded
  (Principle II).

`by_weekday` (`history-by-weekday`) and `movement` (`history-movement`) are still absent. Each will take the same
`offsets` when it is built.

### `get_quote(day) -> string | null`

A quote from the bundled set, or nothing. Never fetched. Null is a valid, complete answer —
a check-in without a quote is not degraded (FR-008).

Served only to the check-in. The single-day history screen does not ask for one; a quote
belongs to the ritual, not to the record.

**Chosen at random, never by the date** (slice `quote`, gaps review Q1). The interface asks
once when the check-in opens and keeps the line while it stays open.

*Amended in slice `quote`, 2026-10-01 (Q1, revised again): the command now takes `day`, the
local date (YYYY-MM-DD) the check-in is for, and one line holds for that day across restarts.*
The first ask for a day chooses a line at random and remembers `{day, line}` in the
configuration (`quote_of_the_day`, a setting readable without the key); later asks for the
same day return it. A fresh random line is chosen when the remembered day is not `day`, or
the remembered line is no longer in the bundled set or shows nothing. Nothing is chosen or
remembered while quotes are hidden. If the line cannot be saved it is still returned; after a
restart the day then chooses again. A configuration written before this field existed loads
with no line remembered. Returns
null when the person has hidden quotes (`set_quotes_shown(false)`), when the configuration
cannot be read, and when the bundled set is missing or holds no line. Readable with the key
unavailable: it does not touch the history.

### `get_quotes_shown() -> bool`

*Added in slice `quote` (gaps review Q2).* Whether the person wants quotes on the check-in.
`true` until they say otherwise, including for a configuration written before this setting
existed. A configuration setting, not reach or journal data, so readable without the key.
Errs with a plain sentence when the configuration cannot be read.

### `set_quotes_shown(shown) -> bool`

*Added in slice `quote` (gaps review Q2).* The quiet switch on the check-in, in either
direction, remembered across restarts. Returns the setting as it now stands. Changes nothing
about protection: the trail, the intent, any pending change and the trusted clock are left as
they were, and it classifies as `Effect::Reads`. Errs with a plain sentence, and writes
nothing, when the configuration cannot be read — Cairn never overwrites what it cannot read.

## The announcement — withdrawn

*Withdrawn 2026-10-01* (spec Clarifications, constitution v1.4.0). Cairn raises no notification
of any kind, so `announce_check_in_if_due`, `get_check_in_settings`, `set_evening_hour` and
`set_announce_check_in` are not part of this contract and must not be added.

## Writes

### `save_journal_entry(day, day_start, day_end, text) -> DayView`

**Takes the day's bounds, like `get_day`** (amended in slice `write-tonight`, 2026-09-30). The `DayView` it
returns is the whole day, and its reaches can only be read between bounds the interface computes (research R3).
Without them, the answer would carry an empty reach list that reads as *nothing reached for today*, which would
be untrue. `delete_journal_entry` and `save_reach_estimate` take the same two bounds when their slices add them.

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

## What this contract deliberately does not contain

Each of these would be a natural thing to add, and each is refused for a stated reason.

| Not exposed | Why |
| --- | --- |
| `count_unwritten_days`, or anything returning how many days lack an entry | FR-026b. This is the exact shape of a debt. There is no data behind it either — skipped is derived, never stored |
| `get_streak`, or any consecutive-day figure | Slice `004`, and the guard forbids it now |
| Anything returning `written_at` | FR-026a. Exposing it is how an entry written later becomes visibly one |
| A reach total on any summary the shell could read | The ambient-counts guard. Counts live on the screens someone navigated to |
| Any command that reduces protection | Principle I. This slice adds none, and the classification test would catch an attempt |
