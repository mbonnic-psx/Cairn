# Plan — slice `history-by-weekday`

**Feature**: `003-reflection-and-history` | **Slice**: 5c of `story-split.md` | **Date**: 2026-10-02

Inside *Over time* on the reaches screen, the *Seen by* choice gains a third option, *By day*, over the same
range. *By day* lists all seven days of the week, starting on the day the computer's locale starts its week (Monday
when it does not say), each named as the computer names it, with its count, the same soft bar as by site and by
hour, and beside it how many of that day the range holds ("across 2 Mondays"). A day of the week with no reaches is
shown as plainly as any other. A reach belongs to the local day its own instant falls in, by the offset in force at
that instant, so a range across a clock change is exact. What Cairn did not see is stated above the days, and the
person's own estimates are said to be left out.

**How this plan was made.** As `history-by-hour`'s was (`../history-by-hour/plan.md`). 003 was planned whole
before the delivery method arrived, and `../../plan.md`, `../../research.md`, `../../data-model.md` and
`../../contracts/` stand. This plan takes this slice's part of them and cites them rather than restating them. It
was not produced by Spec Kit's plan command through the links `/drive` prescribes (see *Complexity Tracking*).
Where it departs from the feature plan, it says so. R4's single offset is not used for days, as it was not used for
hours (B4, W5). The wire's `by_weekday` gains a field, `days`, for W4. The first day of the week is the interface's
to choose and is never sent (W2).

Checked against constitution **v1.5.0** (ratified 2026-08-18, last amended 2026-10-01), the version on this
branch's head. Another session has been amending it. The implementer re-reads the version line before Phase 1 and
re-checks *Constitution Check* below against any later version.

**The branch.** `slice/history-by-weekday` was cut from `slice/history-by-hour` at `bf92e20`. PR #48 has since
merged to `main` as `f9a0d7e`, and that merge has no content beyond `bf92e20`. The branch is one merge commit
behind trunk, and its content matches trunk.

## Scope

In, from `../../tasks.md`:

- T039, T040: by day of week. Every breakdown is available with no journal entry, and a quiet range returns seven
  zero-filled days rather than nothing.
- T041: by day of week. Cost at two years of history, counted in the same pass.
- T042, T045, retargeted to `Reaches.tsx` as in `history-by-site` and `history-by-hour` (H1, W1): by day of week,
  and the third option of the view choice.
- T043: by day of week, in `reflection/over_time.rs`, with the arithmetic in `domain/patterns.rs`.
- T044: by day of week. `summarize_reaches` sends `by_weekday`. Its signature does not change: it already takes
  the offsets.
- T047: the quiet range, by day of week.
- T049, extended to days by W6: an estimate never enters the days, and its exclusion is stated.

Out:

- Movement (`history-movement`, 5d) and when Cairn first counted (`first-counted`, 5e, H5). The range states the
  gaps Cairn recorded and the standing sentence, exactly as by site and by hour do.
- Averages, ranks and comparisons. W4 says *no averages are computed and no day is ranked*. The view shows the
  count and how many of that day the range holds, and nothing derived from the two.
- Any change to how a reach is recorded. A reach stays a domain and an instant (Principle II, B4 clarified).
- Reading the operating system's own first-day-of-week setting, as distinct from its locale (Q3).
- `domain::patterns::summarize`, its single-offset `by_weekday`, and `crosses_offset_change`. They stay as they
  are, pinned by `tests/patterns.rs` and their own unit tests. This slice calls neither.
- `check_range` and `check_offsets`. Neither changes. Both were settled by `history-by-hour` (A1, A3, K23–K25),
  and this slice reuses them exactly as they are.
- `src/screens/History.tsx`. It is not created (H1).

Acceptance: US2 scenario 1 (by day of week, and changing the range), 3, 4 and 5; FR-019 (by day of week), FR-022,
FR-022a, FR-023 (extended to days by W6) and FR-024; SC-005 to SC-008 as they bear on days; the edge cases *The
clock moves* and *A single reach at 23:59 versus 00:01*; gaps review W1–W6, and H4 and H5 above the days, in
`../../spec.md`.

## The day (W5): how a reach is placed in its local day

### The question

W5 says *a reach belongs to the local day its own instant falls in, with the offset in force then, exactly as by
hour*. The core cannot know that offset (`domain/` reads no clock and consults no zone; `check-domain-purity.sh`).
`history-by-hour` already solved this for hours. The interface sends `offsets`, the offsets in force across the
range (`src/localDays.ts`, `offsetChanges`). The core checks them (`reflection::over_time::check_offsets`), and the
pure domain gives each reach the offset of the last change at or before its instant (`domain::patterns::by_hour`).

### Chosen: the same offsets, the same lookup, a day number in place of an hour

`domain::patterns::by_weekday(reaches, first_offset, changes, from, to) -> [u32; 7]` sits beside `by_hour` and
takes the same arguments. For each reach in `[from, to)`, it finds the offset in force with the same
`partition_point` lookup and computes the local day as `summarize` already does (`local_day`:
`(at + offset).div_euclid(86 400)`). It then takes that day's weekday (`LocalDate::weekday`, 0 = Monday … 6 =
Sunday, ISO 8601 zero-based, fixed by T009a). The lookup moves into one private helper, `offset_in_force`, which
`by_hour` and `by_weekday` share, so the two can never disagree about which offset a reach had. `by_hour`'s
behaviour does not change, and `tests/patterns_by_hour.rs` and `us2_by_hour.rs` hold it.

**Why this is exact, and where it rests.** A reach's local date is the floor of its local reading, and its local
reading is `at + offset in force`. That is how `Date` turns an instant into a calendar day. `history-by-hour`
showed that `offsetChanges` finds every change at the instant the zone's rules put it, in four zones, against Node
v22.22.1 (`../history-by-hour/plan.md`, *Evidence*). It also showed this at a skipped midnight (Cairo, K23, K24)
and to the second before 1972 (Monrovia, A2). This slice adds no new dependency behaviour. The same *assumed*
carries over: that the three webviews apply the same zone rules to `Date` as Node does. As before, the plan does
not depend on that. It depends only on the bounds, the offsets and the times the *Today* log prints all coming
from the same `Date`. The demo checks it again (Y21).

**What a correct `offsets` list guarantees, and what a hostile one does not.** With the list the screen sends,
every reach in `[range_start, range_end)` falls on a local date in `first_day..=last_day`. `range_start` is the
first instant of `first_day` by the clock, and `range_end` is the first instant after `last_day`. That includes a
skipped midnight: in Cairo on 2026-04-24, `range_start` is 01:00 at +3, and the first offset `offsetChanges` sends
is +3. The core also accepts the old +2 there (A3's one-directional rule), and under either the first reach is on
2026-04-24, a Friday. A caller that sends a staircase of offsets the core cannot refute (A3, "left to the webview")
could place a reach on a date outside the range. Its weekday is still a weekday, and every count is conserved
(property 1). The screen never sends such a list. This is the same limit `history-by-hour` recorded, and this
slice adds no rule for it.

### Rejected

| Option | Why not |
|---|---|
| `summarize(...).by_weekday`, the single-offset weekday this module already has | R4's approximation, superseded for days by W5 as for hours by B4. After a change, every reach within an hour of midnight lands on the wrong day: London's 2026-10-25 23:30 GMT would read as Monday 00:30 |
| One entry per local midnight (the day bounds) sent with the range, with each reach placed between two of them | Exact, but it adds a second list to the wire (730 entries for two years) with its own refusal rules. It says what `offsets` already says, and the two could disagree. `offsets` already fixes every local date |
| The interface counts the days itself | R4's and `history-by-hour`'s rejection holds. Every reach in the range would cross the boundary to produce seven numbers, and the counting rules would leave the core, where by site's and by hour's live (SC-006) |

## The week (W2): which day comes first, and the names

### Chosen: the interface reads the locale's week, orders the seven days on screen, and the core stays locale-free

The wire always carries the seven days in one fixed order, `weekday` 0 (Monday) to 6 (Sunday), as `LocalDate`
numbers them. The core never learns which day the person's week starts on. `src/localDays.ts` gains three
functions. None holds reach data, so `check-no-ambient-counts.mjs` has nothing to say about them:

- `firstWeekday(locale?)`: the first day of the computer's week, in the core's numbering (0 = Monday). It reads
  `new Intl.Locale(locale ?? <the default locale>)`. It prefers `getWeekInfo().firstDay`, then the older
  `weekInfo.firstDay` accessor, and takes Monday when neither exists or the value is not an integer 1–7. `firstDay`
  is ISO numbered, 1 = Monday … 7 = Sunday, so the result is `firstDay − 1`. The default locale is
  `Intl.DateTimeFormat().resolvedOptions().locale`, the same one that names the days, so the order and the names
  come from one place.
- `weekdayInWords(weekday)`: the day's name as the computer names it,
  `new Date(Date.UTC(2024, 0, 1 + weekday)).toLocaleDateString([], { weekday: 'long', timeZone: 'UTC' })`.
  2024-01-01 was a Monday (`dates.rs`'s own test), so weekday 0 is named Monday. The fixed UTC instant means no zone
  can shift a name, as `hourInWords` does for hours.
- `acrossInWords(weekday, days)`: W4's clause. `across 1 Monday` for 1, `across 2 Mondays` for more (the name and
  `s`), and `not in these days` for 0 (Q1).

**Evidence (a run against it).** Run on 2026-10-02 against Node v22.22.1 (ICU as bundled):

| Locale | `getWeekInfo` | `weekInfo.firstDay` | First day |
|---|---|---|---|
| `en-GB`, `fr-FR`, `en-AE` | absent | 1 | Monday |
| `en-US`, `he-IL`, `pt-BR`, `en`, `und` | absent | 7 | Sunday |
| `ar-EG`, `fa-IR` | absent | 6 | Saturday |
| `en-US-u-fw-mon` | absent | 1 | Monday, but `Intl.DateTimeFormat(...).resolvedOptions().locale` drops the `-u-fw-` extension (`en-US`) |

`toLocaleDateString` with `{ weekday: 'long', timeZone: 'UTC' }` named 2024-01-01 to 2024-01-07 *Monday* to
*Sunday* in the runner's default (`en-US`, from `LANG=C.UTF-8`). It named 2024-01-01 *lundi*, *Montag* and
*الاثنين* for `fr-FR`, `de-DE` and `ar-EG`. The probe is not kept. Its numbers are restated as fixtures in Y6.

**What was not run.** The three webviews. It is *assumed* that WebView2 (evergreen Chromium) has `getWeekInfo()`,
that WKWebView has one of the two forms, and that WebKitGTK may have neither. The fallback means none of these
needs to be true: a webview without week info opens on Monday, which is W2's own default. It is also *assumed* that
each webview's default locale follows the computer's language and region as the operating system reports them to
it. The demo records the first day and the names each platform shows (Y21).

**Why here.**

- *The core stays locale-free.* The order a week is drawn in is presentation, like the names. `contracts/patterns.md`
  already says the pure layer does no labels. The core's answer is the same on every computer, so its tests need no
  locale.
- *One source.* The order and the names come from the same default locale, so a week cannot start on a Sunday
  while it is named in another language's order.
- *The contract.* Nothing is added to the request. `ipc_surface.rs`'s `CLASSIFIED` does not grow.

### Rejected

| Option | Why not |
|---|---|
| The interface sends the first day, and the core returns the days rotated | It puts a locale concern into the core for an order the screen can apply itself. It also adds a parameter and a refusal rule (a value outside 0–6), and makes the core's answer depend on where it was asked |
| Always Monday | Against W2, "the day the computer's own settings say it starts" |
| Read the operating system's own first-day setting (Windows' *First day of week*, macOS' *First day of week*, `LC_TIME`'s `first_weekday` on Linux) through a platform service | It would add a new command and platform code on three systems, and on Linux there is no single setting to read. The day names would still come from the webview's locale, so the two could disagree. The behaviour of these settings was not read for this plan: *assumed*. Q3 puts it to the owner |

## How many of each day (W4)

### Chosen: the core counts, from `first_day` and `last_day`, by calendar arithmetic

`domain::patterns::weekdays_in(first_day, last_day) -> [u32; 7]`: how many of each weekday the dates
`first_day..=last_day` hold. With `n` days, each weekday gets `n / 7`, and the `n % 7` days from `first_day`'s
weekday onwards get one more. It is pure arithmetic on `LocalDate`, with no offset. A local date is a date in every
zone, and a 23-hour or 25-hour day is still one Sunday. It is computed in `i64` and saturates to `u32::MAX`, as
`estimates_excluded` does. A range is allowed to be thousands of years long (R5), and `LocalDate` spans more than
`u32` days. `first_day > last_day` gives seven zeros, though `check_range` has already refused that range.

Each wire entry is `{ weekday, count, days }`. `days` is that weekday's entry of `weekdays_in`. It travels with the
count so the two cannot be computed for different ranges.

**It counts the days the range holds, not the days Cairn watched.** A Monday Cairn was not running for is still a
Monday in the range. What Cairn did not see is stated above the days by the coverage note (H4, H5), as for sites
and hours. Counting only watched days would need the gaps cut into local days, and W4 asks for the range's days.

**How it reads.** Beside each day: *across 1 Monday*, *across 4 Mondays*. For a weekday the range does not hold at
all (four of them in a 3-day range), the line keeps the day's name and says *not in these days*, with no count and
no bar. A `0` there would present a day that is not in the range as a day with no reaches, which FR-022's rule is
against in spirit (Q1).

### Rejected

| Option | Why not |
|---|---|
| The interface counts the days | It is equally pure, but the count would then be computed apart from the answer it describes. A sealed answer would still show days, and the interface would hold a second calendar rule beside `localDays.ts`'s |
| An average per day, or a count normalised by `days` | W4: *no averages are computed* |
| Showing `0` for a weekday the range does not hold | Q1: it reads as a quiet day that never happened |

## Estimates (W6)

`by_weekday` is built from the reaches alone, by the same `assemble` call that builds `by_site` and `by_hour`. An
estimate has a date, and so a weekday. W6 decides it is still left out: *what Cairn did not count is not recorded as
though it had been*. `estimates_excluded` is the same field by site and by hour state. It counts the estimate days in
`first_day..=last_day`. On *By day* the sentence gives the reason that holds for days:

- *Your own estimates for 2 days are not counted here, because Cairn counts only what it saw.*
- *Your own estimate for 1 day is not counted here, because Cairn counts only what it saw.*

*By site* and *By hour* keep their sentences (*no site*, *no hour*) unchanged. `days` does not change for an
estimate either. A day holding an estimate is still a day in the range.

## Acceptance, as scenarios through the driving port

Constitution v1.5.0, *Acceptance-Driven Development*. In the Rust scenarios, each **When** enters through
`AppState::summarize_reaches`, as the IPC command serves it, and each **Then** is observed in what it returns.
`offsets` is the list the interface would send, written out as a fixture. In the screen scenarios, each **When** is
the person acting on the reaches screen, with a fake reader written in the test tree (no `vi.mock`), and each
**Then** is what the screen shows and what it asked the command for.

Fixtures, in `Europe/London` unless named otherwise. These are the epoch constants of `history-by-hour`, plus new
ones computed with Node under each `TZ` on 2026-10-02. Autumn: clocks go back at `1792890000` (2026-10-25 01:00
UTC, a Sunday), +3 600 to 0. Spring: clocks go forward at `1774746000` (2026-03-29 01:00 UTC, a Sunday), 0 to
+3 600. Local midnights: 2026-09-07 (Mon) `1788735600`, 2026-09-11 (Fri) `1789081200`, 2026-09-12 (Sat)
`1789167600`, 2026-09-14 (Mon) `1789340400`, 2026-09-15 (Tue) `1789426800`, 2026-09-16 `1789513200`, 2026-09-22
`1790031600`, 2026-10-19 `1792364400`, 2026-11-02 `1793577600`, 2026-03-23 `1774224000`, 2026-04-06 `1775430000`,
2026-01-01 `1767225600`, 2027-01-01 `1798761600`. Cairo: 2026-04-17 (Fri) `1776376800`, 2026-04-24 (Fri)
`1776981600` (01:00 at +3, the midnight the clock skips), 2026-05-01 `1777582800`. New York: 2026-09-15
`1789444800`, 2026-09-17 `1789617600`.

1. **All seven days, in the core's order (W3).** **Given** 2026-09-07 to 2026-10-04 (four weeks, offsets
   `[{1788735600, 3600}]`), with two reaches on Monday 2026-09-07, one on Wednesday 2026-09-09 and one on Sunday
   2026-09-13, **When** `summarize_reaches(first_day, last_day, range_start, range_end, offsets)` is called,
   **Then** `by_weekday` has exactly seven entries, `weekday` 0 to 6 in order. The counts are `[2, 0, 1, 0, 0, 0,
   1]`, `days` is 4 for each, and `sealed` is absent. **And given** a quiet range, **then** the counts are seven
   zeros, never `[]`, with `days` still 4 each.
2. **Every day present.** **Given** 2026-09-07 to 2026-09-13 with one reach at noon on each day, **Then** each
   count is 1 and each `days` is 1.
3. **The edges of the range.** **Given** a reach the second before `range_start` and one at `range_end`, **Then**
   neither is in any day. The sum of `by_weekday`'s counts equals the sum of `by_site`'s and of `by_hour`'s.
4. **Midnight by the clock (edge case *23:59 versus 00:01*, W5).** **Given** reaches at 23:59 BST on Sunday
   2026-09-13 and 00:01 BST on Monday 2026-09-14, **Then** they are counted on Sunday and Monday. One of them is
   2026-09-13 23:30 UTC, which is Monday 00:30 BST and is counted on Monday, not on Sunday as UTC would put it.
5. **Autumn, the clock goes back (W5).** **Given** 2026-10-19 to 2026-11-01, offsets `[{1792364400, 3600},
   {1792890000, 0}]`, and reaches at `1792884600` (2026-10-24 23:30 UTC, Sunday 00:30 BST) and `1792971000`
   (2026-10-25 23:30 UTC, Sunday 23:30 GMT), **Then** both are counted on Sunday (weekday 6). The second would be
   Monday under the summer offset. Sunday's `days` is 2: the 25-hour day is one Sunday.
6. **Spring, the clock goes forward (W5).** **Given** 2026-03-23 to 2026-04-05, offsets `[{1774224000, 0},
   {1774746000, 3600}]`, and a reach at `1774827000` (2026-03-29 23:30 UTC), **Then** it is counted on Monday
   (00:30 BST on the 30th), not on Sunday. Sunday's `days` is 2: the 23-hour day is one Sunday.
7. **A year whose ends agree.** **Given** 2026-01-01 to 2026-12-31, both ends at offset 0, with the year's two
   changes in `offsets`, and a reach at `1783294200` (2026-07-05 23:30 UTC, a Sunday by UTC), **Then** it is
   counted on Monday. `days` is `[52, 52, 52, 53, 52, 52, 52]` (2026 begins and ends on a Thursday).
8. **A skipped midnight (Cairo, K23, K25).** **Given** 2026-04-24 to 2026-04-30 in `Africa/Cairo`, `range_start`
   `1776981600`, offsets `[{1776981600, 10800}]`, and a reach at `range_start + 60`, **Then** the answer is placed,
   not sealed. The reach is counted on Friday (weekday 4), and every `days` is 1. **And when** the first offset is
   the old one, +7 200, which the core also accepts, **then** the reach is still on Friday. **And given** 2026-04-17
   to 2026-04-23, whose `range_end` is the change's own instant (`1776981600`, K24), with offsets
   `[{1776376800, 7200}]` and a reach at `range_end − 1`, **then** it is counted on Thursday, the range's last day.
9. **A time-zone change (the computer moved, B4 clarified).** **Given** a reach at `1789515000` (2026-09-15 23:30
   UTC), **When** 2026-09-15 to 2026-09-16 is asked for with London's bounds and offsets, **Then** it is on
   Wednesday. **And when** it is asked for with New York's (−14 400), **then** it is on Tuesday. **And when**
   London's are sent again, **then** the answer is the first one, unchanged. The core keeps no zone between calls.
10. **One day, and three (W4).** **Given** 2026-09-15 alone, **Then** `days` is 1 for Tuesday and 0 for the other
    six, and Tuesday's count is that day's reaches. **And given** 2026-09-11 to 2026-09-13 (Friday to Sunday),
    **then** `days` is `[0, 0, 0, 0, 1, 1, 1]`. The four weekdays the range does not hold are present with count 0
    and `days` 0.
11. **An uneven range (W4's own example).** **Given** 2026-09-12 to 2026-09-21 (ten days, Saturday to Monday),
    **Then** `days` is `[2, 1, 1, 1, 1, 2, 2]`: two Mondays and one Tuesday.
12. **No journal entry needed (US2 scenario 3, T039).** **Given** reaches and no journal entry, **Then**
    `by_weekday` is complete. **And given** entries on three days, **then** it is identical.
13. **An estimate is not a reach, for days either (W6, FR-023, SC-008, T049).** **Given** the person's own
    estimates on two days in the range and one on the day after it, **Then** `by_weekday`'s counts and `days` are
    what the reaches and the dates alone give, and `estimates_excluded` is 2.
14. **What Cairn did not see, above the days (H4, H5, FR-022, FR-022a, SC-007).** **Given** the gaps of
    `us2_by_site.rs` scenario 5, **Then** `gaps` and `coverage_note` are exactly what by site gets. **And given** a
    range wholly inside a gap, **then** the counts are seven zeros, `days` is the range's, and the coverage note is
    present. **And given** a day of reaches deleted through the history store, **then** the days count only what
    remains, `days` is unchanged, and no gap appears on that day's account.
15. **The offsets refused.** **Given** one representative of each `check_offsets` rule (`offset_changes.rs` holds
    the edges, and they are not repeated here), **Then** `sealed` holds the range's one sentence and `by_weekday`
    is `[]`.
16. **Sealed, and a read that does not go through.** **Given** the key is unavailable, or a history that opens but
    cannot be read, **Then** `sealed` holds the sentence and `by_weekday` is `[]`, not seven zeros, which would read
    as a quiet range.
17. **A build without the history.** **Given** `--no-default-features`, **Then** `sealed` is `NO_HISTORY`, with
    `by_weekday` `[]`.
18. **At scale (SC-006, T041).** **Given** two years at 50 reaches a day across 300 sites, and London's five-entry
    offsets, **When** it is called for the two years, **Then** it answers inside the same 1 000 ms. The counts sum to
    every reach, and `days` sums to the range's 730 days.
19. **The wire shape (Principle III).** **When** the answer is serialised, **Then** it holds exactly eight keys:
    `by_site`, `by_hour`, `by_weekday`, `gaps`, `coverage_note`, `estimates_excluded`, `dst_approximate` and
    `sealed`. Each `by_weekday` entry holds exactly `weekday`, `count` and `days`. It never holds `movement`.

The interface's week, `src/localDays.ts`:

20. **The first day (W2).** **Given** `firstWeekday('en-GB')`, `('en-US')` and `('ar-EG')`, **Then** they are 0,
    6 and 5 (Monday, Sunday, Saturday), as the table above found. **Given** the parser with week info reporting
    `firstDay` 7 through `getWeekInfo()`, through `weekInfo` alone, or through neither, **Then** it gives 6, 6 and 0.
    **Given** `firstDay` 0, 8, 1.5 or a string, **Then** it gives 0 (Monday). When both forms are present,
    `getWeekInfo()` is preferred.
21. **The names and the clause.** **Given** `weekdayInWords(0..6)`, **Then** they are seven distinct names, each
    exactly what `toLocaleDateString([], { weekday: 'long', timeZone: 'UTC' })` gives for 2024-01-01 + n, in a file
    whose `TZ` is far from UTC (`Pacific/Kiritimati`, +14). The runner's locale does not matter, and no zone shifts a
    name. **Given** `acrossInWords(0, 1)`, `(0, 4)` and `(0, 0)`, **Then** they are `across 1 <Monday's name>`,
    `across 4 <Monday's name>s` and `not in these days`.

The screen, `Reaches.tsx`:

22. **Where it lives (W1, H1).** **Given** *Over time*, **Then** *Seen by* holds *By site* (pressed), *By hour* and
    *By day*, in that order, under the range. **When** the person chooses *By day*, **Then** the days replace the
    list for the same range, with no second read. **When** they change *From*, **Then** the screen reads again
    and stays on *By day*. **And when** they go to *Today* and back, **then** *Over time* opens on 4 weeks and *By
    site*. Nothing in the header or the shell changes.
23. **What it asks for.** **Given** `TZ=Europe/London` and a `now` of 2 November 2026, **When** *Over time* opens
    and *By day* is chosen, **Then** the one call is `summarizeReaches("2026-10-06", "2026-11-02", start, end,
    offsets)`, exactly as by hour makes it. Nothing about the week is sent.
24. **The week's order (W2).** **Given** the screen's week starting on Sunday, **Then** the seven lines run Sunday
    to Saturday. **Given** Monday, **then** Monday to Sunday. **Given** Saturday, **then** Saturday to Friday. Each
    is named by `weekdayInWords`, and each line's count is the one for its own `weekday`, not for its position.
    The screen takes the first day as a prop beside `now`, defaulting to `firstWeekday()`.
25. **How a day reads (W3, W4, B3).** **Given** a 4-week answer with Monday 2, Wednesday 1 and the rest 0, **Then**
    each of the seven lines shows the name, *across 4 <name>s*, the count as text, and a bar against the largest
    day, in the one warm colour. A day with count 0 shows `0` and an empty bar, as plainly as any other. **Given** a
    3-day answer, **then** the four days with `days` 0 show the name and *not in these days*, with no count and no
    bar (Q1). **Given** a 1-day answer, **then** its day says *across 1 <name>*. No text says *peak*, *worst*,
    *best*, *busiest*, *quietest*, *top*, *rank*, *average* or *per day*. Nothing compares with another range, and
    nothing congratulates a quiet day.
26. **Stated above the days (H4, H5, W6).** **Given** a coverage note, **Then** it stands above the days. **Given**
    `estimates_excluded` 2, **Then** the sentence above the days says *Your own estimates for 2 days are not
    counted here, because Cairn counts only what it saw.* With 1 it says *Your own estimate for 1 day is not counted
    here, because Cairn counts only what it saw.* On *By site* and *By hour* the sentences are unchanged. **Given**
    0, no such sentence appears. The standing sentence closes the view.
27. **A quiet range (FR-024, B5 by analogy, W3).** **Given** all counts 0 and nothing sealed, **Then** *By day*
    says *Nothing here for these days.* where the list begins, and the seven days stand under it, each with its
    clause. There is no word of praise or warning.
28. **Sealed and unreachable.** **Given** `sealed`, or a read that throws, **Then** *By day* shows exactly what *By
    site* shows: the sentence and no days.
29. **No streak, no day count (US2 scenario 5, SC-010), no control over protection (I).** **Given** any state
    above, **Then** no text holds a streak, a *day N*, a chain or *in a row*, no banned word appears, and no
    control changes protection.
30. **On a notebook page (004 `tonight-page`).** **Given** the notebook, **Then** the three-option choice sits on
    the left page under the date boxes. The days are on the right page, ruled, one day to a line: the name, the
    clause, the bar and the count, or the name and *not in these days*. The notes stay off the right page. The
    seven lines sit on the ruling with no inline height or overflow. *Which days* stays the spread's first child.
    Focus stays on *By day* when it is pressed. The page says the same words as Current.

## Structure Decision

The two deployables in `project.json` are those `history-by-hour` used. `src-tauri` (*the core … domain,
encrypted stores … IPC*) holds the day bucketing and the count of each weekday. `cairn` (*the interface: every
screen a person sees … reaches*) holds the week's order, the names and the view. Each purpose covers its half, and
nothing is a new service. The strategy is `leave-it` (ADR 0002), so the code lives where by site's and by hour's
does. There is one vocabulary (a reach, a site, an hour, a day of the week, a range of days, a gap, the computer's
clock), the same as by hour's, so there is one bounded context, and saying so is the whole decision.

```text
src-tauri/src/
├── domain/patterns.rs         # MODIFIED: offset_in_force (private, shared with by_hour); by_weekday; weekdays_in
├── domain/mod.rs              # MODIFIED: one row each in the module table for by_weekday and weekdays_in
├── reflection/over_time.rs    # MODIFIED: Range gains by_weekday and weekdays; assemble fills them
└── ipc/state.rs               # MODIFIED: WeekdayCount; Patterns gains by_weekday; sealed and no-history set it to []
src-tauri/tests/
├── patterns_by_weekday.rs     # NEW: by_weekday's and weekdays_in's properties (proptest), no feature gate
├── us2_by_weekday.rs          # NEW: scenarios 1–17 and 19 through AppState
├── us2_by_site.rs             # MODIFIED: the wire-shape test names eight keys
├── us2_by_hour.rs             # MODIFIED: the wire-shape test names eight keys
└── patterns_at_scale.rs       # MODIFIED: asserts by_weekday sums to every reach and days to 730
src/
├── localDays.ts               # MODIFIED: firstWeekday, weekdayInWords, acrossInWords
├── __tests__/weekdays.test.ts               # NEW: scenarios 20–21 (TZ=Pacific/Kiritimati)
├── ipc/reaches.ts             # MODIFIED: WeekdayCount; Patterns.by_weekday
├── screens/Reaches.tsx        # MODIFIED: By day in the choice; the seven days, in Current and on the page
├── screens/__tests__/ReachesByDay.test.tsx      # NEW: scenarios 22–29 (TZ=Europe/London)
├── screens/__tests__/ReachesByDayPage.test.tsx  # NEW: scenario 30
├── screens/__tests__/ReachesRowGuard.test.tsx   # MODIFIED: the list guard's corners, with by day
├── screens/__tests__/ReachesByHour.test.tsx     # MODIFIED: Seen by holds three buttons
├── screens/__tests__/ReachesByHourPage.test.tsx # MODIFIED: Seen by holds three buttons
├── screens/__tests__/TonightCurrentPin.test.tsx # MODIFIED: Over time's cases gain By day (a deliberate change; Pin)
└── screens/__tests__/{tonightCases.ts, ReachesOverTime, ReachesEdges, ReachesToday, ReachesPage}  # fixtures only, if the type needs by_weekday
```

`ipc/commands.rs` changes only its doc comment (*by site, by hour and by day of week*). Its signature is unchanged.
`main.rs`, `ipc_surface.rs`, `check_range`, `check_offsets`, `offsetChanges`, `scripts/`, `eslint.config.js` and
the store do not change. No command is added. `check-no-ambient-counts.mjs` already treats `by_weekday` as reach
data (`REACH_DATA`, its `\bby_weekday\b` pattern), and the field appears only in `src/ipc/reaches.ts` and
`Reaches.tsx`, so the guard passes unedited. `tonight-page.css` changes only if the page's seven lines need a layout
rule for the clause (Y17). It gets no colour, font or focus rule of its own.

**The domain functions.** `by_weekday` takes what `by_hour` takes and returns `[u32; 7]`, indexed by
`LocalDate::weekday`. It assumes the changes increase, which is `check_offsets`' job, and it does not depend on the
reaches' order. `weekdays_in` takes two `LocalDate`s and nothing else. `Range.by_weekday` is built from the same
reaches as `by_site` and `by_hour`, with no estimates (W6), and `Range.weekdays` from `first_day` and `last_day`.

**The wire.** `WeekdayCount { weekday: u8, count: u32, days: u32 }`. `Patterns.by_weekday` holds exactly seven
entries, `weekday` 0 to 6 ascending, or `[]` when sealed.

**The screen.** One read serves all three views. `Seen` becomes `'site' | 'hour' | 'weekday'`, and the choice gains
a third `ViewButton` labelled *By day*. `rowsOf` for `'weekday'` orders the seven entries from the first day,
picking each by its `weekday` value (`(first + i) % 7`) rather than by its position. Each row carries an `across`
clause, and a row with `days` 0 is marked so that it draws no count and no bar. A site's and an hour's row draw
exactly as they do now: their markup is pinned (`TonightCurrentPin.test.tsx`, `ReachesByHour*.test.tsx`), and the
clause is rendered only where a row has one. The list guard becomes `seen !== 'site' || !isQuiet(rows)`, so a quiet
range keeps its seven days, as it keeps its 24 hours. The estimates sentence takes its reason from the view. The
first day of the week is a prop, `firstDay?: number`, defaulting to `firstWeekday()` read once on mount. The tests
pass it, as they pass `now`.

**What it must not disturb**, from `history-by-hour` and 004 `tonight-page` as the screen is now:

- *Today*, both its states, and the check-in: their Current markup is unchanged.
- *By site* and *By hour* read as they read now: their sentences, order, bars and states. The only change is the
  third button in the choice above them.
- On the page: *Which days* is the spread's first child and the same node across views. The date boxes and the
  choice are the same nodes when an answer arrives. There is no inline height or overflow, the notes stay off the
  right page, and the page and Current say the same words.

## Constitution Check (v1.5.0)

- **I. The Wall Holds:** no control on the view changes protection (scenario 29). Nothing listens for a blocked
  request.
- **II. Local-First (NON-NEGOTIABLE):** no dependency and no network. Reach counting still records domain and
  timestamp only. The offsets and the week's first day are never stored, and the first day never leaves the
  interface. The range is read from the encrypted history and fails closed (scenario 16).
- **III. Honest About Limits:** each day is exact for the offsets the interface sends (scenarios 4–9). The
  evenness of the range is stated beside each day, not hidden (W4, scenarios 10, 11, 25). A weekday the range does
  not hold is never shown as a day with no reaches (Q1). A sealed answer's `by_weekday` is `[]`, never seven zeros
  (16). A webview with no week info falls back to W2's Monday, and the demo records what each platform shows.
- **IV. Reversible:** no system file is touched.
- **V. Reflection at Distance:** no notification. *By day* is reached by navigation alone.
- **VI. Voice:** no ranking word, average, praise, warning, streak or day count (25, 27, 29). *across 2 Mondays*
  passes `check-no-streaks.mjs`: its day-count pattern is `day` followed by a number, and the clause is a number
  followed by a name. Every string passes `check-banned-words.mjs`. Day names are small UI labels in the face the
  screen already uses, and no body text becomes monospace.
- **VII. Free:** nothing is gated.
- **Delivery Method:** trunk. Tests come first: every RED task comes before its GREEN, and the Rust RED tests are
  written by a different agent than the core GREEN. Each rule is proved where it lives: the day bucketing and the
  weekday counts in `domain/patterns.rs`, and the week's order and names in `localDays.ts`. The adapter is held by
  scenarios 15–17 and 19.

## Open questions, for the owner

The tasks are written to the recommendations. Each question says what would change.

**Q1: a weekday the range does not hold.** W3 says every day is shown, and W4 says how many of each the range
holds. Neither says how a day reads when the range holds none of it: a 3-day range holds no Monday. Showing
*Monday 0 across 0 Mondays* would present a day that is not in the range as a day with no reaches. FR-022 is
against that in spirit: a period Cairn did not observe is never presented as zero reaches. *Recommendation*, which
this plan is written to: the line keeps the day's name, in its place in the week, and says *not in these days*, with
no count and no bar. If the owner prefers `0` with *across 0 Mondays*, scenarios 10 and 25 and one branch of Y18
change.

**Q2: the clause in a language other than English.** The day names follow the computer's locale (W2), but Cairn's
sentences are English throughout. `dayInWords` names months in English, and every sentence on the screen is written
in English. *across 2 Mondays* forms its plural by adding `s` to the name. That is right for every English day name,
and wrong for many others (*Montag* becomes *Montags*). *Recommendation*: accept it in this slice. Cairn has no
translation, and the owner's computer names its days in English. A translation slice, if one is ever planned, owns
plural forms. If the owner wants it closed now, the clause could avoid the plural (*Monday: 2 of these days*), and
only `acrossInWords` and scenarios 21 and 25 change.

**Q3: "the computer's settings" as the locale, or as the first-day setting itself.** W2 records the owner's *Follow
Computer Settings* as *the day the computer's own settings say it starts (its locale)*. Windows and macOS also let a
person set the first day of the week directly, apart from the region. Whether a webview's locale reflects that
setting was not read, so this plan *assumes* it does not. A person whose region is the United States but who set
Monday first would see Sunday first. *Recommendation*: accept the locale, as W2 is written. Reading the setting
itself would need a platform service on three systems and a new command (see *The week*, *Rejected*), so it would be
a slice of its own. Nothing in this plan's core would change, because the first day is the interface's alone.

## Pin

This slice changes code that was here before the method: `src-tauri/src/domain/patterns.rs` (gains `by_weekday` and
`weekdays_in`; `by_hour`'s lookup moves into a shared helper with no change in behaviour; `summarize` is not
touched), `src-tauri/src/ipc/state.rs` (a field on the command `history-by-site` added), and `src/ipc/reaches.ts`.
`reflection/over_time.rs`, `localDays.ts`, the *Over time* half of `Reaches.tsx`, `by_hour` and their tests were
written under the method by `history-by-site`, `history-by-hour` and 004 `tonight-page`, so their tests are their pin.

Already pinned in `delivery/survey/pinned.md`, and re-run before and after (Y1, Y20):

- the command surface and each command's effect on protection (`ipc_surface`): unchanged, no command added;
- today's reaches and *Today*'s bounds (`gaps`, `Reaches.test.tsx`, `ReachesToday.test.tsx`): unchanged;
- no streak or day count in the shell, and reach data only on screens a person navigates to
  (`Protection.test.tsx`, `npm run check`): unchanged;
- `domain::patterns::summarize` (`tests/patterns.rs`) and `by_hour` (`tests/patterns_by_hour.rs`,
  `us2_by_hour.rs`): unchanged in behaviour;
- the Today screen and Tonight in Current, element for element (`TonightCurrentPin.test.tsx`): **changes**, for
  Over time only. See row 1 below.
- `summarize_reaches`' answer (`us2_by_site`, `us2_by_hour`): **changes**, by one field. See row 2 below.

The host appends a row for each behaviour this slice changes before the change lands (the ledger is the host's).
Neither needs a new seam, because each is already observed:

```markdown
| 2026-10-02 | Over time in Current, every state (looking, could not read, sealed, a list, nothing here), element for element: the *Seen by* group gains a third button, *By day* (not pressed), after *By hour*. Everything else in the Today screen and Tonight is unchanged. A deliberate change: 003 gaps review W1, slice `history-by-weekday` | `Reaches.tsx` outside the notebook (no page context) | `TonightCurrentPin.test.tsx` (`tonightCases.ts`): Over time's cases rewritten by hand with the third button inserted, never re-captured | `npx vitest run src/screens/__tests__/TonightCurrentPin.test.tsx` |
| 2026-10-02 | `summarize_reaches` serialises eight keys, `by_weekday` (`{ weekday, count, days }`, seven entries, or `[]` when sealed) joining the seven of `history-by-hour`. Its signature, by site, by hour, the gaps, the note, the estimates count and every refusal are unchanged for the same range. A deliberate change: 003 gaps review W3–W6, slice `history-by-weekday` | `AppState::summarize_reaches` (`ipc/state.rs`), `summarizeReaches` (`src/ipc/reaches.ts`) | `us2_by_site`, `us2_by_hour` (each wire-shape test names eight keys); `us2_by_weekday` | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test us2_by_site --test us2_by_hour --test us2_by_weekday` |
```

## Complexity Tracking

| Deviation | Why | What was done instead |
|---|---|---|
| The plan and tasks were not produced by Spec Kit's commands through `/drive`'s links | `specs/003-…/plan.md` and `tasks.md` are committed feature-level files from before adoption, and the links would write over them. The same reason was recorded for `history-by-site` and `history-by-hour` | Written under `slices/history-by-weekday/` from the committed feature plan, which they cite rather than restate. `research.md` is not linked or rewritten. This slice's dependency evidence is in *The week* above |
| `by_weekday` on the wire gains `days`, beyond `contracts/ui-ipc.md`'s original `[{ weekday, count }]` | W4: the range's evenness is stated beside each day, and the count and the evenness must describe the same range | Recorded as a dated amendment in `contracts/ui-ipc.md`. The field was never sent before, so nothing reads the old shape |
| `domain::patterns` gains a second weekday function beside `summarize`'s single-offset one | W5 needs the offset in force at each instant. `summarize` is pinned and is not this slice's to change | `by_weekday` shares `by_hour`'s lookup. `summarize` stays, as `history-by-hour` left it. Removing it is not this slice's work |
| `us2_by_site.rs` and `us2_by_hour.rs` change their wire-shape tests from seven keys to eight | W3 needs the days on the one command H1 allows. The answer grows only by a field this slice computes | Pin row 2 records it. Every other expectation in both files is unchanged |
| Over time's Current markup changes again | W1 is a new decision about that interface, and this slice is the one it belongs to | Pin row 1 records it. The pin's Over time cases are rewritten by hand with the third button inserted, and Today's and Tonight's are not touched |
