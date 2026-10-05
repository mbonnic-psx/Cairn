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
- the first `from` is `range_start`, and the first offset is the one in force there: the one `range_start` implies
  for `first_day`, or up to 3 hours above it (amended 2026-10-02, convergence K23: where a zone puts its clocks
  forward at 00:00, `range_start` is 01:00 at the new offset, so it implies the old one while the offset in force
  is the new one, one clock change above. Narrowed 2026-10-02, adversary A3: the rule was "within 3 hours" in
  either direction, and a first offset below the implied one is never the computer's, since a clock that skips
  a midnight only puts the offset up. It is refused. What the core does not check, because the webview is the
  clock's authority and the screen never sends it: an offset no zone has, and a staircase of changes that each
  pass the neighbour rule. Neither is trivially false in every zone, and a rule for them would be a guess about
  zones the core does not know);
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

#### Amended in slice `history-by-weekday` (2026-10-02)

**The signature does not change.** The days are bucketed by the `offsets` the amendment above added. Gaps review W5
decides a reach belongs to the local day its own instant falls in, by the offset in force then, exactly as for
hours. Nothing about the week is sent: which day the week starts on is the interface's choice (W2), and the core is
locale-free.

**Fields.** Slice `history-by-weekday` adds one, so the answer holds eight keys:

```
  by_weekday:  [{ weekday, count, days }],  // exactly 7, weekday 0 (Monday) – 6 (Sunday) ascending; [] when sealed
```

This supersedes the original `[{ weekday, count }]` above by one field, `days`. The field was never sent before.

- `weekday` is numbered as `domain::dates::LocalDate::weekday` numbers it: 0 = Monday … 6 = Sunday (ISO 8601,
  zero-based). Note that this is **not** JavaScript's `Date.prototype.getDay`, where 0 is Sunday. The wire order is
  fixed. The interface draws the week from the first day the computer's locale gives, picking each entry by its
  `weekday` value, not by its position.
- `count` is built from reaches alone. W6 decides that an estimate is not counted toward its weekday, though it has
  a date: what Cairn did not count is not recorded as though it had been. `estimates_excluded` is the same count by
  site and by hour state, and the interface states it on *By day* too.
- `days` is how many of that weekday the dates `first_day..=last_day` hold (W4). It is calendar arithmetic on the
  two dates, with no offset: a 23-hour or 25-hour day is still one Sunday. It counts the range's days, not the days
  Cairn watched, and the coverage note states what Cairn did not see, as for sites and hours. The values sum to the
  range's length in days, saturating at `u32::MAX`. A weekday the range does not hold usually has `days` 0 and
  `count` 0, and the interface does not show that `0` as a day with no reaches. The pair is not guaranteed, even for
  the offsets the computer sends (amended 2026-10-02, adversary W-A1): where a clock change crosses midnight, a reach
  inside the range's instants can fall on a local date outside `[first_day, last_day]` — America/Goose_Bay put its
  clocks back at 00:01 until 2010, so the first hour of a Sunday's range read as Saturday 23:01 — and `check_offsets`
  also accepts lists the computer could not send (adversary A3). So a weekday with `days` 0 can hold a `count`. The interface draws every count the core sends: a weekday is shown as
  *not in these days* only when both are 0.
- A quiet range is seven entries with `count` 0 and the range's `days` (FR-024). A sealed answer is `[]`, never seven
  zeros, which would read as a quiet range.
- `movement` (`history-movement`) is still absent.

See `slices/history-by-weekday/plan.md`, *The day*, *The week* and *How many of each day*.

#### Amended in slice `history-movement` (2026-10-02)

**The signature does not change.** The rows are placed by the `offsets` of the `history-by-hour` amendment, as the
hours and weekdays are. Whether a row is today's is judged by the core's own clock, the one `check_range` already
holds the range against.

**Fields.** Slice `history-movement` adds one, so the answer holds nine keys:

    movement: [{ day, days, span, count, seen, so_far }]   // oldest first; [] when sealed

This supersedes the original `[{ day, count }]` above. The field was never sent before. It also ends the three earlier
statements that `movement` is absent (in the `history-by-site`, `history-by-hour` and `history-by-weekday` amendments),
which stay as the record of when they were true.

- `day` (`YYYY-MM-DD`) is the row's first date. `days` is how many dates it holds. `span` is `"day"` when the
  range holds 56 dates or fewer, each row one date (`days: 1`), and `"week"` when it holds more, each row seven
  dates from `first_day` (gaps review M3), the last possibly fewer. The rows are contiguous and their `days` sum
  to the range's length.
- `count` is the reaches whose instant falls in the row, by the local date of that instant under the offset in force
  then (M3, W5). A local date before `first_day` or after `last_day`, which only a clock change across midnight
  produces (adversary W-A1), counts in the nearest row. The counts sum to every reach in the range. Built from
  reaches alone: an estimate is never counted in a row (M7), and `estimates_excluded` states it.
- `seen` is `"whole"`, `"part"` or `"none"`: whether Cairn saw the row's instants before the present. `"none"` is
  every one of them inside `gaps`; `"part"` is more than half of them inside `gaps` (M12, which replaced "any");
  `"whole"` is half or less, so exactly half is whole. A row holding a reach is never `"none"`, so one Cairn missed
  wholly is `"part"`. A row with no instant before the present is `"whole"`. The interface shows `"none"` as *not seen*, with no count and no bar, never a zero (FR-022).
- `so_far` is true when any of the row's instants is at or after the present: the row holding today, and any row
  after it (M6).
- A quiet range has every row with `count` 0 (M8, FR-024). A sealed answer is `[]`, never rows at zero.

See `slices/history-movement/plan.md`, *The rows*, *What Cairn saw of each row* and *Today*.

#### Amended in slice `first-counted` (2026-10-05)

**No signature changes; one field on three answers.** `DayView` (`get_day`, `save_journal_entry`),
`TodaysReaches` (`list_todays_reaches`) and `Patterns` (`summarize_reaches`) each carry:

    first_counted: number | null   // epoch seconds: when Cairn first counted; null when it never has, or sealed

- It is the same instant on every answer, whatever was asked. The interface compares it with the bounds it sent.
- It is the first moment a counting session was accepting and storing (gaps review F1). For a history written
  before this slice, it is the earliest reach or gap that history held when this build first opened it. A reach
  recorded earlier moves it back to that reach (F6). Deleting reaches or gaps never moves it (F5). Erasing
  everything removes it with the history.
- Time before it is not seen: `summarize_reaches`' rows mark it so (`"none"` or `"part"`, by M12), and when it is
  `null` the whole range is. It is never in `gaps` and never in `coverage_note`. A gap that began before it is cut to
  begin at it (F3, FR-022a). The same holds for a day's `gaps` and `coverage_note`.
- `Patterns` now holds ten keys. A reader treats an absent `first_counted` as not yet known (as above).

The interface holds *From* to no earlier than the local date of `first_counted`, or to today when it is `null`
(F2). The core still answers any range `check_range` places. See `slices/first-counted/plan.md`.

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
