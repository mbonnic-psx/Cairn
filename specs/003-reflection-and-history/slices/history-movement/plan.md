# Plan — slice `history-movement`

**Feature**: `003-reflection-and-history` | **Slice**: 5d of `story-split.md` | **Date**: 2026-10-02

Inside *Over time* on the reaches screen, the *Seen by* choice gains a fourth option, *Day by day*, over the same
range. *Day by day* shows one row per date, oldest first, each with its count and the same soft bar as the other
views. A range longer than 56 days is shown one row per week, each week named by the date it begins ("week of
6 Oct"). A row Cairn was not counting for at all reads *not seen*, with no count and no bar. A row Cairn saw only
part of keeps its count and says *partly seen*. The row holding today says *so far*. Nothing says up, down, better,
worse or average. A reach belongs to the local day its own instant falls in, by the offset in force at that
instant, so rows across a clock change are exact, and a 23-hour or 25-hour day is one row. What Cairn did not see
is stated above the rows, and the person's own estimates are said to be left out.

**How this plan was made.** As `history-by-weekday`'s was (`../history-by-weekday/plan.md`), and before it
`history-by-hour`'s (`../history-by-hour/plan.md`). 003 was planned whole before the delivery method arrived, and
`../../plan.md`, `../../research.md`, `../../data-model.md` and `../../contracts/` stand. This plan takes this
slice's part of them and cites them rather than restating them. It was not produced by Spec Kit's plan command
through the links `/drive` prescribes (see *Complexity Tracking*). Where it departs from the feature plan, it says
so:

- R4's single offset is not used for rows, as it was not used for hours or weekdays (B4, W5). The per-day list
  `domain::patterns::summarize` already builds (`by_day`) is not used (see *The rows*, *Rejected*).
- The wire's `movement` was planned as `[{ day, count }]`, one point per local day (`../../contracts/ui-ipc.md`,
  line 75). M3 makes a long range weekly and M5, M6 need a mark per row, so each row gains `days`, `span`,
  `seen` and `so_far`.
- The core groups the rows and judges what it saw of each. The interface draws them.
- The request does not change. `ipc_surface.rs`'s `CLASSIFIED` does not grow.

Checked against constitution **v1.5.0** (ratified 2026-08-18, last amended 2026-10-01), the version on this
branch's head (`.specify/memory/constitution.md`, line 546). Another session has been amending it. The implementer
re-reads the version line before Phase 1 and re-checks *Constitution Check* below against any later version.

**The branch.** `slice/history-movement` was cut from `main` at `1c6f572` (the merge of PR #56,
`history-by-weekday`). It holds one commit beyond trunk, `85dca17`, the gaps review (M1–M8), and an uncommitted
`benchmark.json` that the harness keeps.

## Scope

In, from `../../tasks.md`:

- T039, T040: movement. It is available with no journal entry, and a quiet range returns every row at zero rather
  than nothing (M8).
- T041: movement. Cost at two years of history, counted in the same pass. Memory at the widest range the core
  accepts (R5 of the `history-by-site` adversary pass, `../../adversary-log.md` line 81).
- T042, T045, retargeted to `Reaches.tsx` as in the three history slices before it (H1, M1): movement, and the
  fourth option of the view choice.
- T043: movement, in `reflection/over_time.rs`, with the arithmetic in `domain/patterns.rs`.
- T044: movement. `summarize_reaches` sends `movement`. Its signature does not change: it already takes the
  offsets, and the core already has a clock (`AppState::now`, `src-tauri/src/ipc/state.rs` line 250).
- T047: the quiet range, for movement.
- T049, extended to movement by M7: an estimate never enters a row, and its exclusion is stated.

With this slice, T043, T044 and T045 cover all four breakdowns. The host may tick them when it closes the slice's
records.

Out:

- When Cairn first counted (`first-counted`, 5e, H5). Until it lands, a row before Cairn first counted, or while
  protection was off, reads as a row Cairn saw with no reaches. H5 records why: that time is not recorded as a gap,
  and this slice does not invent it. The standing sentence (*Cairn counts only while it is running…*) stays under
  the rows, as it does under every view. See *What Cairn saw of each row*, *A limit this slice keeps*.
- Trends, averages, rankings and comparisons (M4). Nothing is derived from the counts but the bars.
- Calendar weeks that begin on the computer's first day of the week (Q1). Weeks run from the range's first day.
- Any grouping coarser than a week, however long the range (Q3).
- Any change to how a reach is recorded. A reach stays a domain and an instant (Principle II, B4 clarified).
- `domain::patterns::summarize`, its single-offset `by_day`, and `crosses_offset_change`. They stay as they are,
  pinned by `tests/patterns.rs` and their own unit tests. This slice calls neither, and nothing in production does
  (`summarize` has no caller outside `tests/patterns.rs`).
- `check_range` and `check_offsets`. Neither changes. Both were settled by `history-by-hour` (A1, A3, K23–K25).
- `src/screens/History.tsx`. It is not created (H1).

Acceptance: US2 scenario 2 (movement across a chosen range), and scenarios 3, 4 and 5 as they bear on it; FR-020,
FR-022, FR-022a, FR-023 (extended to movement by M7) and FR-024; SC-005 to SC-008 as they bear on movement; the
edge cases *The clock moves* and *A single reach at 23:59 versus 00:01*; gaps review M1–M8, and H4 and H5 above the
rows, in `../../spec.md`.

## Stories and rules, for the tasks stage

There is one story. Every task is `[US2]`, as in the three slices before it. The rules below are numbered so that
a task can name the rule it proves (`[rule 4]`) and the scenarios that hold it. Scenarios 1–24 enter through
`AppState::summarize_reaches`; 25–27 are `src/localDays.ts`; 28–41 are the screen.

| Rule | Decision | What must be true | Scenarios |
|---|---|---|---|
| 1 | M1, H1 | *Day by day* is the fourth option of *Seen by*, over the same range and the same one read | 28, 29 |
| 2 | M2 | One row per date, oldest first, each with its count and the one soft bar | 1, 2, 31 |
| 3 | M3 | Up to 56 days, one row per day. More, one row per week from the range's first day, the last week possibly short. Every reach in the range is in exactly one row | 3, 4, 5, 6, 7, 32 |
| 4 | M3, W5, B4 | A reach is in the row of the local date its own instant falls on, by the offset in force then. A date outside the range (W-A1) goes to the nearest row | 8, 9, 10, 11, 12 |
| 5 | M5, FR-022 | A row Cairn did not count for at all is *not seen*, with no count and no bar, never a zero | 13, 15, 16, 33 |
| 6 | M5 | A row Cairn saw only part of keeps its count and says *partly seen*. A row holding a reach is never *not seen* | 13, 14, 15, 16, 33, 39 |
| 7 | M6 | The row holding today, and any row after it, says *so far* | 17, 18, 34 |
| 8 | M7, FR-023 | An estimate never enters a row, and its exclusion is stated with W6's reason | 19, 36 |
| 9 | M8, FR-024 | A quiet range: the quiet sentence and every row at zero, rows not seen still *not seen* | 1, 20, 37 |
| 10 | Principle III | A sealed or unreadable answer has `movement: []` and shows the sentence alone | 21, 22, 38 |
| 11 | M4, scenario 5 | No trend, average, ranking word, comparison, streak, *day N* or chain. Rows are named by date, never numbered | 40 |
| 12 | SC-006, R5 | The core answers two years inside 1 000 ms, and holds nothing per day beyond the rows it returns | 23, 24 |

## The rows (M2, M3): days or weeks, and which side groups them

### The question

M3 says a range of up to 56 days is one row per day, and a longer one is one row per week, named by the date it
begins. Someone has to turn reaches into rows. Someone has to decide where a week begins. The weekday slice put
the week's first day in the interface and kept the core locale-free (W2, W9). The core accepts any range
`check_range` can place, which reaches back to 0000-01-01 over IPC (`LocalDate`'s four-digit years) and to year
0100 from the screen (`isLocalDate` rejects years 0–99, because `new Date(y, …)` reads them as 1900–1999,
`src/localDays.ts` line 33). The core may not build a per-day list of such a range for nothing (adversary R5,
fixed in `51fc952` and held by `tests/range_allocation.rs`).

### Chosen: the core groups, by the range's own first day, and sends one row per day or per week

`domain::patterns::movement` sits beside `by_hour` and `by_weekday`. With `n` the number of dates in
`first_day..=last_day`:

- **`n <= 56`**: `n` rows, one per date. Each row has `days: 1`, `span: "day"`.
- **`n > 56`**: `ceil(n / 7)` rows. Row `k` holds the dates `first_day + 7k` to `min(first_day + 7k + 6,
  last_day)`. It is named by its first date, with `days` set to how many dates it holds (7, or 1–7 for the last
  row), and `span: "week"`.

The threshold is one constant in the domain, `DAILY_UP_TO: i64 = 56`. The interface never re-derives it: each row
says its own `span`.

A reach in `[from, to)` takes the offset in force at its instant from the same private `offset_in_force` that
`by_hour` and `by_weekday` share (`src-tauri/src/domain/patterns.rs` lines 219–225). Its local day is `local_day`
(line 85), `(at + offset).div_euclid(86 400)`. Its row is `clamp(local_day − first_day, 0, n − 1)` divided by the
row's length (1 or 7). The clamp is rule 4's nearest row. For the offsets the screen sends, it changes nothing,
except where a clock change crosses midnight (W-A1, see below). Counts add with `saturating_add`.

**Why the core groups.**

- *R5.* With the interface grouping, the core would send one entry per day: 740 257 entries for the widest
  range IPC accepts, and 703 732 for the widest the screen can send, to draw 100 534 rows. The rows are what is
  shown, so the rows are what crosses.
- *The counting rules stay in one place.* R4 and every history slice rejected counting in the interface (SC-006).
  The rows' coverage (M5) depends on which instants a row holds. That needs the same offsets the reaches are
  placed by. In the core, a reach's row and that row's coverage come from one lookup, so they can never disagree.
- *No change to the request.* The core has `first_day`, `last_day`, the bounds and the offsets already.

**Why weeks begin on the range's first day.** M3 names a week by the date it begins and says nothing about which
weekday that is (Q1).

- Every week holds seven dates except possibly the last. Calendar weeks would usually cut both ends short.
- The core stays locale-free. The weekday slice's reason for keeping the week's first day off the wire still holds
  (`../history-by-weekday/plan.md`, *The week*, *Rejected*, first row).
- The default range, 4 weeks ending today (H2), is daily, so weeks appear only once the person widens the range
  past 8 weeks.

A short last week says how many dates it holds (*across 3 days*, see *The words*), so its smaller bar is not read
as a drop. This mirrors W4's *across 2 Mondays*.

**The cost.** Rows are at most `max(56, ceil(n / 7))`: 105 751 over IPC, 100 534 from the screen, 105 for two
years. The pieces walked to judge coverage are bounded by rows plus offset changes plus gaps (see *What Cairn saw
of each row*), so the work is linear and nothing is allocated per day. `tests/range_allocation.rs` reaches further
than IPC can, to about 3.67 million days. There, `movement` returns 524 286 weekly rows. At about 20 bytes a row,
that is more than the test's 8 MiB bound, so the bound changes to *8 MiB plus the rows returned* (Pin, row 3). The
claim it pins, *nothing per day*, stays. The row's exact size is the implementer's to measure with
`size_of::<MovementRow>()`. The 20 bytes is an estimate.

### Rejected

| Option | Why not |
|---|---|
| `summarize(...).by_day`, the per-day list this module already has | R4's single offset, superseded for days by W5 as for hours by B4. It builds one entry per day of the whole range, which is R5's finding. It has no coverage, no weeks and no today |
| The core sends one entry per day, and the interface groups weeks and judges coverage | R5's per-day list, sent across the boundary. Counting rules would sit on both sides (SC-006). Coverage would come from `Date` midnights while reaches are placed by the core's offsets, two sources that could disagree at a clock change |
| Calendar weeks from the computer's first day of the week (W2, W9) | It needs the first day sent with the request: a new parameter, a refusal rule for a value outside 0–6, and a core answer that depends on where it was asked. That is the option the weekday slice rejected. Both ends of most ranges become short weeks. This is Q1, and the owner may still choose it |
| Weeks counted back from the last day, so the short week is the oldest | Equally simple. The short row would then be the first one read, left to right, and would look like a low start. Recorded as the alternative under Q1 |
| A coarser row (a month, a year) for very long ranges | Not decided by M3. That is Q3 |

## What Cairn saw of each row (M5)

### The question

M5 says a row Cairn was not counting for at all reads *not seen*, and a row it saw part of keeps its count with
*partly seen*. Gaps are instants (`store::gaps::Gap { from, to }`), clipped to the range and merged
(`clipped`, `src-tauri/src/store/gaps.rs` lines 64–74, the merge from adversary R3). A row is dates. The two must
meet by the rule that already places reaches, or a reach could sit in a row whose instants do not hold it.

### Chosen: a row is the instants whose local date falls in it, judged in the core against the merged gaps

A row's **instants** are the `t` in `[from, to)` whose clamped local date, `clamp((t + offset_in_force(t))
.div_euclid(86 400), first_day, last_day)`, falls in the row's dates. That is rule 4 read backwards: the instant of
any reach in the row is one of the row's instants. A row's **seeable** instants are those before `now`, the
instant the core read for this request. Then:

- `seen: "none"`: the row has seeable instants, every one is inside a gap, **and the row holds no reach**.
- `seen: "part"`: some seeable instants are inside a gap and some are not, **or** every seeable instant is inside
  a gap but the row holds a reach. A reach is proof Cairn saw that instant. Overlapping sessions or a clock moved
  back can leave a reach inside a recorded gap (adversary R3). The weekday slice's rule, *a count is never
  hidden* (Y23), holds here too.
- `seen: "whole"`: no seeable instant is inside a gap, or the row has no seeable instant at all (a row wholly after
  `now`, see *Today*).

Any unseen second makes a row *partly seen*. That is Principle III's direction: never round toward having seen
more. Gaps shorter than five minutes are never recorded (`WORTH_MENTIONING`, `gaps.rs` line 30), so in practice a
*partly seen* row lost at least part of a five-minute stretch.

**How it is computed, without a per-day list.** Split `[from, to)` at the offset changes into stretches of one
offset. Within a stretch with offset `o`, the row boundaries are the instants `(first_day + k·len)·86 400 − o`,
with `len` 1 or 7. Each piece between two boundaries belongs to one row, by the clamp. Walk the pieces in order
against the merged gaps with two pointers. For each row, add up seeable seconds and seeable seconds inside a gap.
That is linear in rows, offset changes and gaps. The domain takes the gaps as `&[(i64, i64)]`, sorted, merged and
inside `[from, to)`, as `clipped` returns them. It never imports `store` (`scripts/check-domain-purity.sh`).

**A clock change.** The rows are instants, so a 25-hour Sunday is one row of 25 hours and a 23-hour Sunday one of
23. A gap of exactly 24 hours from 2026-10-25 00:00 BST leaves that row *partly seen*: its last hour, 23:00–24:00
GMT on the 25th, was seen. A gap of 24 hours from 2026-03-29 00:00 GMT covers all 23 hours of that row,
which is *not seen*, and the first hour of the 30th, which is *partly seen*. Scenarios 13 and 14 hold both. A gap
that ends at a local midnight leaves the next row untouched, because both bounds are half-open (scenario 15).

**The W-A1 midnight.** Where a clock goes back just after midnight (America/Goose_Bay put its clocks back at 00:01
until 2010), instants inside the range read as the day before `first_day`
(`../history-by-weekday/plan.md`'s adversary finding, pinned in `tests/patterns_by_weekday.rs` lines 496–523). The
clamp puts those instants, and any reach among them, in the first row. That row's count and coverage both include
them, so nothing is lost and nothing is double-counted. None of this occurs in tzdata from 2026 to 2100 (the
`history-by-weekday` adversary run). A hostile staircase of offsets (A3) can place reaches up to a row away. Counts
are still conserved, as for weekdays.

**A limit this slice keeps (H5).** Time before Cairn first counted, while protection was off, or while the person
chose silence is not a gap (H5), so those rows read as seen, with zero or the reaches recorded. On a long range
reaching back before Cairn was installed, that is many rows at zero. The standing sentence under the rows says
Cairn counts only while it is running. `first-counted` (5e) is the slice that makes those rows say so, and the
owner has already chosen that order (H5, "1. yes"). This plan builds `seen` so that 5e only has to add instants to
the unseen set.

### Rejected

| Option | Why not |
|---|---|
| The interface judges coverage from `gaps`, already on the wire, against `Date`'s local midnights | Exact for the screen's zone. But a row's bounds would come from `Date` while its reaches are placed by the core's offsets. At a W-A1 midnight, or for a hostile offsets list, a reach could sit in a row whose bounds do not hold it. It also walks every row in JavaScript, which is 100 534 for the widest range the screen sends |
| A row is `days × 86 400` seconds from its first midnight | Wrong twice a year. A 25-hour day would be *not seen* after 24 hours of gap, and its last hour would be charged to the next day |
| Send each row's two bounds and let the interface judge | Adds two integers per row and says what the offsets already say. The judgement would still need the gaps on one side |
| *Not seen* even when the row holds a reach | It hides a count (FR-022 forbids presenting unseen time as zero, and Y23 forbids hiding a count the core holds) |

## Today (M6)

### Chosen: the core marks `so_far`, from the clock it already checks the range against

`check_range` already refuses a range that begins after the present and one that ends more than a day and a clock
change after it (`src-tauri/src/reflection/over_time.rs` lines 51–52), with `(self.now)()`
(`ipc/state.rs` line 842). `summarize_reaches` reads the clock **once**, as `now`, and passes the same value to
`check_range` and to `assemble`, so the range check and the *so far* mark cannot straddle a second.

A row is `so_far: true` when any of its instants is at or after `now`, meaning the row is not over. That is the
row holding today. It is also any row after today, which the screen never asks for (its *To* box stops at today,
`Reaches.tsx` line 323) but `check_range` lets through near midnight. Such a row has no seeable instants, so it is
`seen: "whole"` with count 0, and reads *0, so far*. That is true, and it is not a zero for a day that happened.

If the screen stays open across midnight, its range still ends yesterday. The core's `now` is past `range_end`, no
row is *so far*, and yesterday's row reads as a finished day, which it is.

### Rejected

| Option | Why not |
|---|---|
| The interface marks the row holding `localToday(now())` | It would be a second clock, beside the one the range was checked against. It would also need the row's dates on the screen's side, and a week row would need the screen to know which week holds today |
| A `today` field naming the date | It says less than `so_far` per row, and leaves the week case to the screen |

## Quiet, sealed and estimates (M7, M8)

- **Quiet (M8, FR-024).** A range with no reaches has every row, each with count 0 and its own `seen`. The screen
  shows *Nothing here for these days.* where the list begins, with every row under it. Rows Cairn did not see
  still read *not seen*. That includes a range wholly inside a gap, where the coverage note is above and every row
  is *not seen*.
- **Sealed.** `movement` is `[]` when `sealed` is present: the key unavailable, the history unreadable, the bounds
  or offsets refused, or a build without the history (`Patterns::sealed`, `ipc/state.rs` lines 214–226). It is
  never rows at zero, which would read as a quiet range.
- **Estimates (M7).** `movement` is built from the reaches alone, by the same `assemble` call that builds the other
  three. An estimate has a date, and so a row. M7 and W6 leave it out anyway: what Cairn did not count is not
  recorded as though it had been. `estimates_excluded` is the field the other views state. On *Day by day* the
  sentence gives W6's reason: *Your own estimates for 2 days are not counted here, because Cairn counts only what
  it saw.*

## The words

| Where | Text | Source |
|---|---|---|
| The fourth button | *Day by day* | M1 |
| A day row's name | the date as the computer writes it, short: *6 Oct* (en-GB), *Oct 6* (en-US), with the year when the range crosses one: *29 Dec 2025* | M2; Q2 |
| A week row's name | *week of* and the same date: *week of 6 Oct* | M3; Q2 |
| A short week's clause | *across 1 day*, *across 3 days* (only when `span` is week and `days < 7`) | Q1, after W4 |
| A partly seen row's clause | *partly seen* | M5 |
| A not seen row's clause | *not seen* (no count, no bar) | M5 |
| Today's clause | *so far* | M6 |
| Clauses together | joined by `, ` in this order: across, then seen, then so far: *across 3 days, partly seen, so far*; *not seen, so far* | — |
| The estimates sentence on *Day by day* | W6's, unchanged: *…not counted here, because Cairn counts only what it saw.* | M7 |
| The quiet sentence | *Nothing here for these days.* (unchanged) | M8 |

**The date in words.** `src/localDays.ts` gains two functions. Neither holds reach data, and neither name nor any
comment in that file contains the word `movement` (see the guard below):

- `shortDateInWords(day, withYear)`: the date written by the computer's locale, `{ day: 'numeric', month: 'short'
  }` plus `year: 'numeric'` when asked, formatted in `timeZone: 'UTC'` from a `Date` built with `setUTCFullYear(y,
  m, d)`. `Date.UTC` reads years 0–99 as 1900–1999, which is why `offsetAt` already uses `setUTCFullYear`
  (`localDays.ts` line 109). A fixed UTC instant means no zone can move a date, as `weekdayInWords` does for names.
- `weekOfInWords(day, withYear)`: `week of ${shortDateInWords(day, withYear)}`.

`withYear` is true for every row when `first_day` and `last_day` are in different years, as `rangeInWords` already
decides (line 90).

**Evidence (a run against it).** Run on 2026-10-02 against Node v22.22.1, ICU as bundled, default locale `en-US`
(`LANG=C.UTF-8`). For 2026-10-06, 2025-12-29 with the year, and 0100-01-04 with the year:

| Locale | Short | With year | Year 100 |
|---|---|---|---|
| default, `en-US`, `en-CA` | Oct 6 | Dec 29, 2025 | Jan 4, 100 |
| `en-GB` | 6 Oct | 29 Dec 2025 | 4 Jan 100 |
| `fr-FR` | 6 oct. | 29 déc. 2025 | 4 janv. 100 |
| `de-DE` | 6. Okt. | 29. Dez. 2025 | 4. Jan. 100 |
| `ar-EG` | ٦ أكتوبر | ٢٩ ديسمبر ٢٠٢٥ | ٤ يناير ١٠٠ |

The probe is not kept. Its English rows are restated as fixtures in scenario 25, derived through the same `Intl`
call, so no test depends on the runner's locale. **What was not run:** the three webviews. It is *assumed*, as in
the weekday plan, that each webview's default locale follows the computer's region. The demo records what each
platform shows.

**The guards, checked against these strings and the code that makes them.**

- `check-banned-words.mjs` (lines 21–29): none of *failed, fail, denied, violation, relapsed, relapse, forbidden,
  you lost* appears.
- `check-no-streaks.mjs` (line 27): its day-count pattern is `\bday\s+\{?\d|\bday\s+\{count|\bday\s+\{n\b`, the
  word `day` followed by a number. *Day by day* is `day` then `by`. *across 3 days* is a number then `days`. *week
  of 6 Oct* has no `day`. All pass. **Warning for the implementer:** the guard scans source lines, comments
  included, in `src/` and `src-tauri/src/`. A comment such as `// the row for day 2026-10-06`, or a template such as
  `` `day ${n}` ``, fails it. Write *the row for 2026-10-06*, and build the clause as
  `` `across ${days} ${days === 1 ? 'day' : 'days'}` ``.
- `check-no-ambient-counts.mjs` (lines 61–69): `REACH_DATA` gains `\bmovement\b` (Pin, row 4), so the new field
  is held to the same places as `by_weekday`: `Reaches.tsx` and `src/ipc/`. `\b` means `movementRow` would not
  match, but a comment saying *movement* in `localDays.ts` would. So none is written there. Today the word appears
  only in `src/ipc/reaches.ts` (line 70), which is allowed.

**What it never says (M4, scenario 5).** No *up, down, more, fewer, better, worse, rising, falling, trend, average,
per day, peak, worst, best, busiest, quietest, top, rank, than last week*, no *day N*, *streak*, *in a row* or
*chain*. No colour means good or bad: the bars use the one warm fill the other views use, and *not seen* and
*partly seen* are words in the clause slot, not colours.

## Contract amendments, as text for the implementer

Append to `../../contracts/ui-ipc.md`, after the `history-by-weekday` amendment and before `get_quote`:

```markdown
#### Amended in slice `history-movement` (2026-10-02)

**The signature does not change.** The rows are placed by the `offsets` of the `history-by-hour` amendment, as the
hours and weekdays are. Whether a row is today's is judged by the core's own clock, the one `check_range` already
holds the range against.

**Fields.** Slice `history-movement` adds one, so the answer holds nine keys:

    movement: [{ day, days, span, count, seen, so_far }]   // oldest first; [] when sealed

This supersedes the original `[{ day, count }]` above. The field was never sent before.

- `day` (`YYYY-MM-DD`) is the row's first date. `days` is how many dates it holds. `span` is `"day"` when the
  range holds 56 dates or fewer, each row one date (`days: 1`), and `"week"` when it holds more, each row seven
  dates from `first_day` (gaps review M3), the last possibly fewer. The rows are contiguous and their `days` sum
  to the range's length.
- `count` is the reaches whose instant falls in the row, by the local date of that instant under the offset in force
  then (M3, W5). A local date before `first_day` or after `last_day`, which only a clock change across midnight
  produces (adversary W-A1), counts in the nearest row. The counts sum to every reach in the range. Built from
  reaches alone: an estimate is never counted in a row (M7), and `estimates_excluded` states it.
- `seen` is `"whole"`, `"part"` or `"none"`: whether the row's instants before the present lie inside `gaps`, none,
  some, or all (M5). A row holding a reach is never `"none"`. A row with no instant before the present is
  `"whole"`. The interface shows `"none"` as *not seen*, with no count and no bar, never a zero (FR-022).
- `so_far` is true when any of the row's instants is at or after the present: the row holding today, and any row
  after it (M6).
- A quiet range has every row with `count` 0 (M8, FR-024). A sealed answer is `[]`, never rows at zero.

See `slices/history-movement/plan.md`, *The rows*, *What Cairn saw of each row* and *Today*.
```

In the same file, the `history-by-weekday` amendment's last bullet (*`movement` (`history-movement`) is still
absent.*) stays as the record it is. The amendment above supersedes it.

Append to `../../contracts/patterns.md`, after the `history-by-hour` amendment and anything below it:

````markdown
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
````

`src-tauri/src/domain/mod.rs` gains one row in its module table, and its prose count goes from eight to nine:

```markdown
| [`patterns::movement`] | a row of days is never presented as seen when Cairn was not counting, nor as zero when it did not see it, and every reach is in exactly one row (M3, M5; FR-022, III) |
```

## Acceptance, as scenarios through the driving port

Constitution v1.5.0, *Acceptance-Driven Development* (line 448). In the Rust scenarios, each **When** enters
through `AppState::summarize_reaches`, as the IPC command serves it, with `AppState::now` set to a fixed instant.
Each **Then** is observed in what it returns. `offsets` is the list the interface would send, written out as a
fixture. In the screen scenarios, each **When** is the person acting on the reaches screen, with a fake reader
written in the test tree (no `vi.mock`), and each **Then** is what the screen shows and what it asked for.

Fixtures, in `Europe/London` unless named otherwise. They are computed with Python's `zoneinfo` on 2026-10-02 and
agree with the weekday plan's constants where they overlap. The clock: `NOW` = 2026-10-02 20:00 BST =
`1790967600`, a Friday. Autumn: clocks go back at `1792890000` (2026-10-25 01:00 UTC), +3 600 to 0. Spring: clocks
go forward at `1774746000` (2026-03-29 01:00 UTC), 0 to +3 600. 2025's changes: `1743296400` (to +3 600) and
`1761440400` (to 0). Local midnights: 2025-01-01 `1735689600`, 2026-01-01 `1767225600`, 2026-03-23 `1774224000`,
2026-03-29 `1774742400`, 2026-03-30 `1774825200` (23 hours later), 2026-04-06 `1775430000`, 2026-08-07
`1786057200`, 2026-08-08 `1786143600`, 2026-08-14 `1786662000`, 2026-09-05 `1788562800`, 2026-09-07 `1788735600`,
2026-10-02 `1790895600`, 2026-10-03 `1790982000`, 2026-10-19 `1792364400`, 2026-10-25 `1792882800`, 2026-10-26
`1792972800` (25 hours later), 2026-11-02 `1793577600`. Ranges whose end is after `NOW` plus a day are refused by
`check_range`, so the autumn and year cases set `AppState::now` after their own range (2026-11-03 12:00 GMT,
`1793707200`, and `NOW` respectively). The year case uses 2025, which ends before `NOW`.

**The rows (rules 2, 3, 9).**

1. **Four weeks, day by day (M2, the default H2 range).** **Given** 2026-09-05 to 2026-10-02 (28 dates, offsets
   `[{1788562800, 3600}]`), with two reaches on 2026-09-07 and one on 2026-09-30, **When** `summarize_reaches` is
   called at `NOW`, **Then** `movement` has 28 rows, `day` 2026-09-05 to 2026-10-02 ascending, each `days: 1`,
   `span: "day"`. The counts are 0 except 2 on 09-07 and 1 on 09-30. Every `seen` is `"whole"`. Only the last row is
   `so_far`. `sealed` is absent. **And given** no reaches, **then** there are still 28 rows, each with count 0,
   never `[]`.
2. **One date.** **Given** 2026-10-02 alone, **Then** `movement` is one row, `days: 1`, `span: "day"`, `so_far:
   true`.
3. **56 dates is still daily (M3).** **Given** 2026-08-08 to 2026-10-02, **Then** there are 56 rows, all `span:
   "day"`.
4. **57 dates is weekly (M3).** **Given** 2026-08-07 to 2026-10-02 (offsets `[{1786057200, 3600}]`), **Then** there
   are 9 rows, `span: "week"`. Rows 0–7 begin 2026-08-07, 08-14, … 09-25 with `days: 7`. Row 8 is 2026-10-02 with
   `days: 1` and `so_far: true`. The `days` sum to 57.
5. **A week's edges (M3, rule 4).** **Given** the range of scenario 4, and reaches at `1786660200` (2026-08-13 23:30
   BST, the last half hour of row 0) and `1786663800` (2026-08-14 00:30 BST), **Then** row 0 counts 1 and row 1
   counts 1.
6. **A year, weekly, across both changes.** **Given** 2025-01-01 to 2025-12-31 (365 dates, offsets
   `[{1735689600, 0}, {1743296400, 3600}, {1761440400, 0}]`) and a reach at `1751412600` (2025-07-01 23:30 UTC,
   which is 2 July 00:30 BST), **Then** there are 53 rows. Row 52 is 2025-12-31 with `days: 1`. The reach is in row
   26, which begins 2025-07-02, not in row 25, where UTC would put it. No row is `so_far`.
7. **Every reach in exactly one row (M3).** **Given** any of the ranges above with reaches spread across them, a
   reach the second before `range_start` and one at `range_end`, **Then** neither edge reach is in any row, and the
   sum of `movement`'s counts equals the sum of `by_hour`'s, of `by_weekday`'s and of `by_site`'s.

**The local day (rule 4).**

8. **Midnight by the clock (edge case *23:59 versus 00:01*).** **Given** reaches at 23:59 BST on 2026-09-13 and
   00:01 BST on 2026-09-14, **Then** they are in those two rows. A reach at 2026-09-13 23:30 UTC is 00:30 BST on
   the 14th and is in the 14th's row.
9. **Autumn (W5).** **Given** 2026-10-19 to 2026-11-01, offsets `[{1792364400, 3600}, {1792890000, 0}]`, and
   reaches at `1792884600` (Sunday 2026-10-25 00:30 BST) and `1792971000` (2026-10-25 23:30 GMT), **Then** both are
   in the 2026-10-25 row. The second would be in the 26th's under the summer offset.
10. **Spring (W5).** **Given** 2026-03-23 to 2026-04-05, offsets `[{1774224000, 0}, {1774746000, 3600}]`, and a
    reach at `1774827000` (2026-03-29 23:30 UTC), **Then** it is in the 2026-03-30 row (00:30 BST).
11. **A skipped midnight (Cairo, K23–K25).** **Given** 2026-04-24 to 2026-04-30 in `Africa/Cairo`, `range_start`
    `1776981600` (01:00 at +3), offsets `[{1776981600, 10800}]`, and a reach at `range_start + 60`, **Then** the
    answer is placed, not sealed, and the reach is in the 2026-04-24 row. **And when** the first offset is +7 200,
    which the core also accepts, **then** it is still in that row.
12. **A clock change after midnight (W-A1).** **Given** the Goose Bay day of `tests/patterns_by_weekday.rs` line
    497 (2010-11-07 alone, `range_start` `1289098800`, `range_end` `1289188800`, first offset −10 800, a change at
    `1289098860` to −14 400) and reaches at `1289100600` (Saturday 23:30 by the clock) and `1289149200`, **Then**
    the one row counts 2. **And given** a gap over the whole range, **then** that row is `"part"`, because it holds
    reaches.

**What Cairn saw of each row (rules 5, 6).**

13. **Autumn's 25-hour day.** **Given** the range of scenario 9, `now` at `1793707200`, and a gap
    `[1792882800, 1792972800)` (all 25 hours of 2026-10-25), **Then** that row is `"none"` with count 0, and the
    rows either side are `"whole"`. **And given** instead a gap `[1792882800, 1792969200)` (24 hours), **then** the
    25th is `"part"` and the 26th `"whole"`.
14. **Spring's 23-hour day.** **Given** the range of scenario 10, and a gap `[1774742400, 1774825200)` (all 23
    hours of 2026-03-29), **Then** the 29th is `"none"` and the 30th `"whole"`. **And given** instead a gap
    `[1774742400, 1774828800)` (24 hours), **then** the 29th is `"none"` and the 30th `"part"`.
15. **Half-open edges.** **Given** the range of scenario 1, and a gap `[1790895600 − 7200, 1790895600)` (the last
    two hours of 2026-10-01), **Then** 10-01 is `"part"` and 10-02 is `"whole"`. **And given** a gap from 10-02's
    midnight to `NOW`, **then** 10-02 is `"none"` with `so_far: true`.
16. **A reach inside a gap (rule 6).** **Given** a gap covering all of 2026-09-07 and a reach recorded inside it
    (two sessions at once, adversary R3), **Then** that row is `"part"` with count 1, never `"none"`. **And given** a
    week row of scenario 4 with a gap covering two of its seven dates, **then** that week is `"part"`.

**Today (rule 7).**

17. **So far.** **Given** scenario 1's range at `NOW`, and a gap `[1790895600 + 3600, 1790895600 + 7200)` today,
    **Then** the 10-02 row is `so_far: true` and `"part"`. Coverage counts only the instants before `NOW`, so the
    hours still to come are not unseen. **And when** `now` is 2026-10-03 00:30 BST, **then** no row is `so_far`.
18. **A row after today.** **Given** a range whose last date is tomorrow, asked at 23:30 today, which `check_range`
    accepts, **Then** tomorrow's row is `so_far: true`, `"whole"`, count 0. **And** the core reads the clock once:
    `check_range` and the rows see the same `now`.

**Estimates, quiet, sealed (rules 8, 9, 10).**

19. **An estimate is not a reach (M7, FR-023, SC-008, T049).** **Given** the person's estimates on two dates in the
    range and one on the day after it, **Then** `movement`'s counts are what the reaches alone give, and
    `estimates_excluded` is 2.
20. **A range wholly inside a gap (M8, H4).** **Given** scenario 1's range, one gap from before `range_start` to
    `NOW` (Cairn began counting at `NOW`), and no reaches, **Then** every row is `"none"` with count 0, and the
    10-02 row is also `so_far`. `coverage_note` is present. **And given** 2026-08-08 to 2026-09-04 asked at `NOW`
    with one gap over all of it, **then** every row is `"none"` and none is `so_far`. **And given** a day of reaches deleted through the history store,
    **then** that row counts only what remains, and its `seen` is unchanged (FR-018a, FR-022a).
21. **Refused, sealed, unreadable.** **Given** one representative `check_range` refusal, one `check_offsets`
    refusal, the key unavailable, and a history that opens but cannot be read, **Then** each has `sealed` set and
    `movement: []`, never rows at zero.
22. **A build without the history.** **Given** `--no-default-features`, **Then** `sealed` is `NO_HISTORY`, with
    `movement: []`.

**Cost (rule 12).**

23. **At scale (SC-006, T041).** **Given** two years at 50 reaches a day across 300 sites and London's offsets
    (`tests/patterns_at_scale.rs`), **When** it is called for the two years, **Then** it answers inside the same
    1 000 ms, `movement` has `ceil(730 / 7)` = 105 rows of `span: "week"`, and their counts sum to every reach.
24. **The widest range, memory (R5).** **Given** `tests/range_allocation.rs`'s range (about 3.67 million dates,
    one reach), **When** `assemble` is called, **Then** `movement` has `ceil(n / 7)` rows, one of them counting 1, and
    the most held at once is under 8 MiB plus `movement.len() × size_of::<MovementRow>()`. **And given** the widest
    range the screen can send, 0100-01-01 to 2026-10-02 in UTC with one offset, **when** it is called through
    `AppState`, **then** it answers with 100 534 rows inside 1 000 ms.

The wire, in `us2_movement.rs`: **when** an answer is serialised, **then** it holds exactly nine keys (`by_hour`,
`by_site`, `by_weekday`, `coverage_note`, `dst_approximate`, `estimates_excluded`, `gaps`, `movement`, `sealed`),
and each row holds exactly `count`, `day`, `days`, `seen`, `so_far` and `span`, with `seen` and `span` as the
lower-case strings above.

The interface's dates, `src/localDays.ts` (a test file whose `TZ` is `Pacific/Kiritimati`, +14, far from UTC):

25. **A date in words.** **Given** `shortDateInWords('2026-10-06', false)`, **Then** it is exactly what
    `toLocaleDateString([], { day: 'numeric', month: 'short', timeZone: 'UTC' })` gives for that date built with
    `setUTCFullYear`, whatever the runner's locale. With `true`, it carries the year. **Given** `'0100-01-04'`,
    **then** the year is 100, not 2000 or 1900.
26. **A week in words.** **Given** `weekOfInWords('2026-10-06', false)`, **Then** it is `week of ` followed by
    scenario 25's text.
27. **No zone moves a date.** **Given** the same calls under the test file's +14 zone, **Then** the date named is
    the date given, never the day before or after.

The screen, `Reaches.tsx`, on the notebook page (post-reveal there is no other):

28. **Where it lives (M1, H1).** **Given** *Over time*, **Then** *Seen by* holds *By site* (pressed), *By hour*, *By
    day* and *Day by day*, in that order. **When** the person chooses *Day by day*, **Then** the rows replace the
    list for the same range, with no second read. **When** they change *From*, **Then** the screen reads again and
    stays on *Day by day*. **When** they go to *Today* and back, **Then** *Over time* opens on 4 weeks and *By site*.
29. **What it asks for.** **Given** `TZ=Europe/London` and `NOW`, **When** *Over time* opens and *Day by day* is
    chosen, **Then** the one call is `summarizeReaches("2026-09-05", "2026-10-02", start, end, offsets)`, exactly
    as the other views make it. Nothing is added.
30. **The estimates sentence.** **Given** `estimates_excluded` 2 on *Day by day*, **Then** it says *Your own
    estimates for 2 days are not counted here, because Cairn counts only what it saw.* With 1, the singular. *By
    site* and *By hour* keep *an estimate has no site* and *an estimate has no hour*.
31. **How a day row reads (M2).** **Given** scenario 1's answer, **Then** 28 lines, oldest first, each named by
    `shortDateInWords`, with the count as text and a bar against the largest row in the one warm colour. A 0 shows
    `0` and an empty bar, as plainly as any other row.
32. **How a week row reads (M3).** **Given** scenario 4's answer, **Then** nine lines named by `weekOfInWords`. The
    last says *across 1 day, so far*. A full week has no *across* clause. **Given** a range across a year, **then**
    every name carries its year.
33. **Not seen and partly seen (M5).** **Given** a row `"none"` with count 0, **Then** its line shows the name and
    *not seen*, with no count and no bar. **Given** a row `"part"`, **then** it shows the name, *partly seen*, the bar
    and the count.
34. **So far (M6).** **Given** the last row `so_far`, **Then** its clause ends with *so far*: *so far*, *partly
    seen, so far*, or *not seen, so far*.
35. **Stated above the rows (H4, H5).** **Given** a coverage note, **Then** it stands above the rows, and the
    standing sentence closes the view, as for the other three.
36. **Estimates, on the page (M7).** **Given** `estimates_excluded` 0, **Then** no estimates sentence appears.
37. **A quiet range (M8, FR-024).** **Given** all counts 0 and nothing sealed, **Then** *Nothing here for these
    days.* stands where the list begins, and every row stands under it, each at 0 or *not seen*. No word of praise
    or warning.
38. **Sealed and unreadable.** **Given** `sealed`, or a read that throws, **Then** *Day by day* shows exactly what
    *By site* shows: the sentence and no rows.
39. **A count is never hidden (rule 6, Y23).** **Given** a row the core sent as `"none"` with count 2 (an answer the
    core does not produce, built by hand), **Then** the line shows the count and the bar, with *partly seen*.
40. **No verdict, no streak (M4, scenario 5, SC-010; I).** **Given** any state above, **Then** no text holds any
    word in *What it never says*, no row is numbered, no banned word appears, and no control changes protection.
41. **On the notebook page (004 `tonight-page`).** **Given** the notebook, **Then** the four-option choice sits on
    the left page under the date boxes. The rows are on the right page, ruled, one row to a line: name, clause, bar
    and count, or name and clause. Lines sit on the ruling with no inline height or overflow, and the right page
    scrolls as it does for 24 hours. *Which days* stays the spread's first child. Focus stays on *Day by day* once it
    is pressed. The words-kept guard holds every captured state with `BY_DAY_DELTA` and `DAY_BY_DAY_DELTA` (Pin,
    row 1).

## Structure Decision

The two deployables in `project.json` are those the three history slices used. `src-tauri` (*the core … domain,
encrypted stores … IPC*) holds the rows, their counts and what was seen of them. `cairn` (*the interface: every
screen a person sees … reaches*) holds the dates in words and the view. Nothing is a new service. The strategy is
`leave-it` (ADR 0002), so the code lives where the other three views' code does. There is one vocabulary (a reach,
a range of days, a row, a gap, the computer's clock, today), so there is one bounded context.

```text
src-tauri/src/
├── domain/patterns.rs         # MODIFIED: LocalRange, Span, Seen, MovementRow, DAILY_UP_TO, movement
├── domain/mod.rs              # MODIFIED: one table row (patterns::movement); "eight" becomes "nine"
├── reflection/over_time.rs    # MODIFIED: assemble takes (&OpenHistory, &LocalRange, now); Range gains movement
└── ipc/state.rs               # MODIFIED: MovementRow on the wire; Patterns.movement; now read once; sealed sets []
src-tauri/tests/
├── patterns_movement.rs       # NEW: movement's properties (proptest) and scenarios 3–16 as examples, no feature gate
├── us2_movement.rs            # NEW: scenarios 1–22 and the wire shape, through AppState
├── us2_by_site.rs             # MODIFIED: the wire-shape test names nine keys
├── us2_by_hour.rs             # MODIFIED: the wire-shape test names nine keys
├── us2_by_weekday.rs          # MODIFIED: the wire-shape test names nine keys (its test name drops "never movement")
├── patterns_at_scale.rs       # MODIFIED: scenario 23
└── range_allocation.rs        # MODIFIED: the new assemble signature; the bound of scenario 24 (Pin, row 3)
src/
├── localDays.ts               # MODIFIED: shortDateInWords, weekOfInWords
├── __tests__/dates.test.ts    # NEW: scenarios 25–27 (TZ=Pacific/Kiritimati)
├── ipc/reaches.ts             # MODIFIED: MovementRow; Patterns.movement; the doc comment
├── screens/Reaches.tsx        # MODIFIED: Day by day in the choice; the rows; the estimates reason
├── screens/__tests__/ReachesDayByDay.test.tsx      # NEW: scenarios 28–40 (TZ=Europe/London)
├── screens/__tests__/ReachesDayByDayPage.test.tsx  # NEW: scenario 41
├── screens/__tests__/beforeTheReveal.ts            # MODIFIED: DAY_BY_DAY_DELTA beside BY_DAY_DELTA (D46)
├── screens/__tests__/{TonightWordsKept, ReachesPage, ReachesByHourPage, ReachesByDayPage}.test.tsx  # MODIFIED: apply DAY_BY_DAY_DELTA; Seen by holds four buttons
├── screens/__tests__/{ReachesByHour, ReachesByDay, ReachesRowGuard}.test.tsx  # MODIFIED: Seen by holds four buttons; the list guard's corners with Day by day
└── screens/__tests__/{tonightCases.ts, fakeCore, ReachesOverTime, ReachesEdges, …}  # fixtures only, where the Patterns type now needs movement
scripts/
└── check-no-ambient-counts.mjs   # MODIFIED: REACH_DATA gains \bmovement\b (Pin, row 4)
```

`ipc/commands.rs` changes only its doc comment (*by site, by hour, by day of week and day by day*). Its signature is
unchanged. `main.rs`, `ipc_surface.rs`, `check_range`, `check_offsets`, `offsetChanges`, `store/`, `eslint.config.js`
and the other guard scripts do not change. No command is added. `tonight-page.css` changes only if scenario 41
shows that a line with a long clause does not sit on one rule. It gets no colour, font or focus rule of its own.

**The domain.** `movement(reaches, &LocalRange, unseen, now) -> Vec<MovementRow>`, where `MovementRow { first_day:
LocalDate, days: u32, span: Span, count: u32, seen: Seen, so_far: bool }`, `Span { Day, Week }` and `Seen { Whole,
Part, None }`. `LocalRange` exists because `assemble` would otherwise take eight arguments, and clippy's
`too_many_arguments` stops at seven under `-D warnings`. `assemble` takes `(&OpenHistory, &LocalRange, now)`, and
`movement` gets the same struct. The rows vector is allocated once with its exact capacity. `first_day > last_day`
returns `[]`, though `check_range` has already refused that range.

**The wire.** `MovementRow { day: LocalDate, days: u32, span: Span, count: u32, seen: Seen, so_far: bool }`, with
`#[serde(rename_all = "lowercase")]` on `Span` and `Seen`. `LocalDate` already serialises as `YYYY-MM-DD`
(`domain/dates.rs` line 190). `Patterns.movement` holds the rows oldest first, or `[]` when sealed.

**The screen.** One read serves all four views. `Seen` (the view type in `Reaches.tsx`, not the wire's) becomes
`'site' | 'hour' | 'weekday' | 'movement'`, and the choice gains a fourth `ViewButton` labelled *Day by day*.
`rowsOf` for `'movement'` maps each wire row to a `Row`. Its name is `shortDateInWords` or `weekOfInWords`, with the
year when the range crosses one. Its clause joins *across N days* (a week with `days < 7`), *partly seen* or *not
seen*, and *so far*. It is `absent` (no count, no bar) only when `seen` is `"none"` and `count` is 0. A `"none"` row
with a count draws as `"part"` (scenario 39). `estimatesSentence` gives W6's reason for `'movement'` as for
`'weekday'`. The list guard `seen !== 'site' || !isQuiet(rows)` already keeps a quiet range's rows. `largestCount`
already takes any rows. The *By site*, *By hour* and *By day* rows draw exactly as they do now.

**What it must not disturb.** *Today*, both its states, and the check-in. *By site*, *By hour* and *By day*: their
sentences, order, bars and states, with the fourth button the only change above them. On the page: *Which days* is
the spread's first child and the same node across views. The date boxes and the choice are the same nodes when an
answer arrives. There is no inline height or overflow.

## Constitution Check (v1.5.0)

- **I. The Wall Holds:** no control on the view changes protection (scenario 40). Nothing listens for a blocked
  request.
- **II. Local-First (NON-NEGOTIABLE):** no dependency and no network. Reach counting still records domain and
  timestamp only. Nothing new is stored: the rows are computed on demand (`data-model.md`, *Anything derived from
  patterns*). The range is read from the encrypted history and fails closed (scenario 21).
- **III. Honest About Limits:** each row is exact for the offsets the interface sends (scenarios 8–12). A row Cairn
  did not see is never a zero (rule 5), a row it saw part of says so (rule 6), and an unfinished day says *so far*
  (rule 7). A short week says how many dates it holds. A sealed answer is `[]` (rule 10). The rows that read as
  seen before Cairn first counted are H5's known limit, stated by the standing sentence and owned by 5e.
- **IV. Reversible:** no system file is touched.
- **V. Reflection at Distance:** no notification. *Day by day* is reached by navigation alone.
- **VI. Voice:** no trend, average, ranking word, praise, warning, streak or day count (scenario 40, *The words*).
  Every string passes `check-banned-words.mjs` and `check-no-streaks.mjs`. Dates are small labels in the face the
  rows already use, and no body text becomes monospace. No colour means good or bad.
- **VII. Free:** nothing is gated.
- **Delivery Method:** trunk. Tests come first: every RED task comes before its GREEN, and the Rust RED tests are
  written by a different agent than the core GREEN. Each rule is proved where it lives: rows, counts, coverage and
  *so far* in `domain/patterns.rs`, and the dates in words in `localDays.ts`. The adapter is held by scenarios
  21, 22 and the wire shape. `check-no-ambient-counts` only grows, and its new pattern is seen refusing a planted
  violation before it is trusted (Pin, row 4).

## Open questions, for the owner

**Answered by the owner, 2026-10-02 ("all yes"): each recommendation stands, recorded in `spec.md` as M9 (Q1), M10 (Q2) and M11 (Q3).** Nothing below changes the plan; the text is kept as the record of what was asked.

**Q1: where a week begins.** M3 names a week by the date it begins ("week of 6 Oct") but not which weekday that is.
*Recommendation*, which this plan is written to: weeks run from the range's first day, so every week is seven
dates except possibly the last, and a short last week says *across 3 days* beside its name. One-line reason: only
one row can be short, and the core needs nothing more from the screen. The alternatives: calendar weeks from the
computer's first day of the week (as *By day* orders its days, W2/W9), where both ends are usually short weeks and
the request gains the first day as a parameter; or weeks counted back from the last day, where the oldest row is the
short one. Choosing calendar weeks changes *The rows*, scenarios 4–6 and 32, the contract text, and adds a
request parameter with its refusal rule to `ipc_surface`'s command.

**Q2: how a row's date is written.** The hour labels and the weekday names follow the computer (`hourInWords`,
`weekdayInWords`), but the range's own title is Cairn's English, *From 6 September to 2 October*
(`dayInWords`, `localDays.ts` line 83). M3's example, *6 Oct*, is day-first. *Recommendation*, which this plan is
written to: the computer's own short date (*Oct 6* on a US computer, *6 Oct* on a UK one), as hours and weekday
names follow the computer. Reason: labels follow the computer and sentences stay Cairn's. The alternative is Cairn's
own form, *6 Oct*, always day-first in English, matching the title above the rows. That changes only
`shortDateInWords` and scenario 25.

**Q3: a range of centuries.** The *From* box has no lower limit, so a person can ask for 0100-01-01 to today:
100 534 weekly rows, almost all before Cairn existed and all reading as seen until `first-counted` (H5).
*Recommendation*: keep weeks however long the range (M3 says so, and nothing is hidden). Measure it (scenario 24),
and let `first-counted` (5e) decide whether the range should start no earlier than Cairn's first count. Reason: it
takes a deliberate act to ask for it, and the rows are true as far as Cairn recorded. If the owner prefers a coarser
row beyond some length (months beyond two years, say), that is a new decision: *The rows* gains a third `span`, and
scenarios 3–6 and 32 grow.

## Pin

This slice changes code that was here before the method: `src-tauri/src/domain/patterns.rs` (gains `movement` and
`LocalRange`; `offset_in_force` and `local_day` are reused unchanged; `summarize` is not touched),
`src-tauri/src/ipc/state.rs` (a field on the command `history-by-site` added, and the clock read once),
`src/ipc/reaches.ts`, and `scripts/check-no-ambient-counts.mjs`. `reflection/over_time.rs`, `localDays.ts`, the *Over
time* half of `Reaches.tsx`, `by_hour`, `by_weekday`, `weekdays_in`, `range_allocation.rs` and their tests were written
under the method by the three history slices and 004, so their tests are their pin.

Already pinned in `delivery/survey/pinned.md`, and re-run before and after:

- the command surface and each command's effect on protection (`ipc_surface`, row of 2026-09-30): unchanged, no
  command added;
- today's reaches and *Today*'s bounds (`gaps`, `Reaches.test.tsx`, `ReachesToday.test.tsx`): unchanged;
- no streak or day count in the shell, and reach data only on the screens a person navigates to
  (`Protection.test.tsx`, `npm run check`, row of 2026-09-30): unchanged in behaviour, but the guard grows (row 4
  below);
- `check-no-ambient-counts`' allowed places (row of 2026-10-01): unchanged, the same three screens and `src/ipc/`;
- `domain::patterns::summarize` (`tests/patterns.rs`), `by_hour` (`patterns_by_hour.rs`, `us2_by_hour.rs`),
  `by_weekday` and `weekdays_in` (`patterns_by_weekday.rs`, `us2_by_weekday.rs`): unchanged in behaviour;
- Over time's words on the notebook page (`TonightWordsKept.test.tsx`, fixture `beforeTheReveal.ts`, row of
  2026-10-02 *stop at the reveal*): **changes** by one word and one control. See row 1.
- `summarize_reaches`' answer (rows of 2026-10-02 for `history-by-hour` and `history-by-weekday`): **changes** by
  one field. See row 2.

The host appends a row for each behaviour this slice changes, before the change lands (the ledger is the host's).
None needs a new seam, because each is already observed:

```markdown
| 2026-10-02 | Over time's words on the notebook page, every captured state that shows the *Seen by* group: one word, *Day by day*, and one control, `button \| Day by day \| disabled=false \| pressed=false`, are added after *By day*; nothing is removed. Recorded as `DAY_BY_DAY_DELTA` beside `BY_DAY_DELTA` in `beforeTheReveal.ts` (D46); the captured markup is untouched. A deliberate change: 003 gaps review M1, slice `history-movement` | `Reaches.tsx` on the notebook page | `TonightWordsKept.test.tsx`, `ReachesPage.test.tsx`, `ReachesByHourPage.test.tsx`, `ReachesByDayPage.test.tsx` (each applies both deltas) | `npx vitest run src/screens/__tests__/TonightWordsKept.test.tsx src/screens/__tests__/ReachesPage.test.tsx src/screens/__tests__/ReachesByHourPage.test.tsx src/screens/__tests__/ReachesByDayPage.test.tsx` |
| 2026-10-02 | `summarize_reaches` serialises nine keys, `movement` (`{ day, days, span, count, seen, so_far }` per row, oldest first, or `[]` when sealed) joining the eight of `history-by-weekday`. Its signature, by site, by hour, by weekday, the gaps, the note, the estimates count and every refusal are unchanged for the same range. A deliberate change: 003 gaps review M2–M8, slice `history-movement` | `AppState::summarize_reaches` (`ipc/state.rs`), `summarizeReaches` (`src/ipc/reaches.ts`) | `us2_by_site`, `us2_by_hour`, `us2_by_weekday` (each wire-shape test names nine keys); `us2_movement` | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test us2_by_site --test us2_by_hour --test us2_by_weekday --test us2_movement` |
| 2026-10-02 | A range summary over about 3.67 million days holds nothing per day: the most held at once stays under 8 MiB plus the weekly rows `movement` returns (`ceil(n / 7)` of them), where it was 8 MiB with no list returned. `assemble` takes `(&OpenHistory, &LocalRange, now)`. The input range and the one-site assertion are unchanged. A deliberate change: 003 gaps review M3 (a long range is weekly, every row shown), slice `history-movement`; the claim of `history-by-site` R5 (`51fc952`) stands | `reflection::over_time::assemble` | `range_allocation` | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test range_allocation` |
| 2026-10-02 | `check-no-ambient-counts` refuses the word `movement` (`\bmovement\b`) outside `Reaches.tsx`, `CheckIn.tsx`, `Day.tsx` and `src/ipc/`, as it refuses `by_weekday`. The guard only grows; its allowed places are unchanged. A deliberate change: the new field is reach data, slice `history-movement` | `scripts/check-no-ambient-counts.mjs` (`REACH_DATA`) | a planted `const movement = summary.movement;` in `src/localDays.ts`: refused, then removed; `npm run check` clean | `npm run check:ambient-counts` |
```

The implementer runs row 4's planted violation and records that it was refused before relying on the guard, as
`CLAUDE.md` requires of every guard ("each one has been verified to fail on a planted violation").

## Complexity Tracking

| Deviation | Why | What was done instead |
|---|---|---|
| The plan and tasks were not produced by Spec Kit's commands through `/drive`'s links | `specs/003-…/plan.md` and `tasks.md` are committed feature-level files from before adoption, and the links would write over them. The same reason was recorded for the three history slices before this one | Written under `slices/history-movement/` from the committed feature plan, which it cites rather than restates. `research.md` is not linked or rewritten. This slice's dependency evidence is in *The words* |
| `movement` on the wire is `[{ day, days, span, count, seen, so_far }]`, beyond the contract's original `[{ day, count }]` | M3 makes long ranges weekly. M5 and M6 need a mark per row, and the row must say whether it is a day or a week | Recorded as a dated amendment in `contracts/ui-ipc.md` (text above). The field was never sent before, so nothing reads the old shape |
| `domain::patterns` gains a third per-day computation beside `summarize`'s `by_day` | W5 needs the offset in force at each instant, and R5 forbids `by_day`'s per-day list. `summarize` is pinned and is not this slice's to change | `movement` shares `offset_in_force` and `local_day`. `summarize` stays, as the two slices before left it. Removing it, which has no production caller, is not this slice's work |
| `assemble`'s signature changes to take a `LocalRange` | It needs `now`, and an eighth argument trips clippy's `too_many_arguments` under `-D warnings` | One struct, built once in `summarize_reaches`. Its two callers (`ipc/state.rs`, `range_allocation.rs`) change with it |
| `range_allocation.rs`'s bound grows by the rows returned | M3 shows every row of any range, and the test's range is wider than IPC allows | Pin row 3. The test still fails on any per-day allocation, and still asserts the one site |
| `us2_by_site.rs`, `us2_by_hour.rs` and `us2_by_weekday.rs` change their wire-shape tests from eight keys to nine | M2 needs the rows on the one command H1 allows | Pin row 2. Every other expectation in the three files is unchanged |
| The ambient-counts guard gains a pattern | The new field is reach data, and the guard's rule is that the set only grows | Pin row 4, with a planted violation seen refused |

Tasks for this slice should be numbered `V`. `M` is taken by this slice's gaps review (M1–M8), and `S`, `K`, `Y`, `W`
and `Q` by the slices before it.
