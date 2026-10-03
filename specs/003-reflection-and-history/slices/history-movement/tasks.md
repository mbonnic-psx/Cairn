# Tasks — slice `history-movement`

Numbered `V` (`M` is this slice's gaps review, M1–M11; `S`, `K`, `Y`, `W` and `Q` are the slices before it). Every
task is `[US2]` and names the rule of `plan.md` (*Stories and rules*) it implements and the scenarios that hold it.
**Every task in Phase 2 is one RED-GREEN-REFACTOR increment, one rule with its examples, one commit.** Its RED is
written first and seen failing for the reason the task states; only then is its GREEN written. There is no task that
writes tests for several rules, and none that implements without a RED of its own. Each task lists the files it may
edit (*Files*). A delegate edits those and no others, and never this file.

The Rust RED tests are written by a different agent than the one that writes the same task's GREEN (plan,
*Constitution Check*, Delivery Method). Where one agent runs two adjacent tasks in a track, it still hands the RED of
each to a fresh agent.

**Unix-only APIs.** None is needed. The core reads no zone and no locale, and every zone in a Rust test is a fixture of
integers. The interface's tests set `process.env.TZ` at the top of their file, before any date is made, one zone per
file (`ReachesMovement.test.tsx`: `Europe/London`; `dates.test.ts`: `Pacific/Kiritimati`). No test depends on the
runner's locale: every expected name is derived from the same `Intl` call made on a fixed instant.

**Guards that read source lines, comments included** (plan, *The words*). `check-no-streaks.mjs` refuses `day`
followed by a number or `{n}`: write *the row for 2026-10-06*, never `day 2026…`, and build the clause as
`` `across ${days} ${days === 1 ? 'day' : 'days'}` ``. The word `movement` appears nowhere in `src/` outside
`src/screens/Reaches.tsx`, `src/ipc/` and the tests (`check-no-ambient-counts.mjs`, V4): not in a name or a comment in
`localDays.ts`.

**Held from earlier slices, never reintroduced.** Offsets are read from `Date`'s local fields (`offsetAt`), never from
`getTimezoneOffset()`. The largest clock change is 3 hours. A range whose first midnight the clock skips is placed,
not sealed (K23), and a change at the range's end is outside it (K24). This slice edits none of `check_range`,
`check_offsets`, `offsetAt`, `offsetChanges`, `summarize`, `by_hour`, `by_weekday` or `weekdays_in`.

**Q1–Q3** are answered as recommended (`spec.md` M9–M11): weeks run from the range's first day, a row's date is the
computer's own short date, and weeks stay weeks however long the range.

## Phase 0 — Pin: before code that was here changes

- [x] V1 [US2] [pin] On the branch head, before any edit, re-read the constitution's version line (v1.5.0 when this
  was written) and re-check the plan's *Constitution Check* against any later version. Then run and record green:
  `ipc_surface`, `gaps`, `patterns`, `patterns_by_hour`, `patterns_by_weekday`, `offset_changes`, `range_bounds`,
  `range_coverage`, `range_allocation`, `us2_by_site`, `us2_by_hour`, `us2_by_weekday`, `patterns_at_scale`
  (`cd src-tauri && cargo test -p cairn --no-default-features --features history --test …`), and
  `npx vitest run src/screens/__tests__/TonightWordsKept.test.tsx src/screens/__tests__/ReachesPage.test.tsx src/screens/__tests__/ReachesByHourPage.test.tsx src/screens/__tests__/ReachesByDayPage.test.tsx src/screens/__tests__/ReachesOverTime.test.tsx src/screens/__tests__/ReachesEdges.test.tsx src/screens/__tests__/ReachesToday.test.tsx src/screens/__tests__/Reaches.test.tsx src/screens/__tests__/ReachesByHour.test.tsx src/screens/__tests__/ReachesByDay.test.tsx src/screens/__tests__/ReachesRowGuard.test.tsx src/__tests__/localDays.test.ts src/__tests__/weekdays.test.ts src/__tests__/offsetChanges.test.ts src/__tests__/offsetChangesCairo.test.ts`.
  *Files:* none. The four pin rows are already in `delivery/survey/pinned.md` (the host's, landed on main). Nothing is
  written there.
  *Done 2026-10-02 (host):* constitution still v1.5.0; `make -f delivery/Makefile verify` green on `dc9054d` rebased onto
  `efd88cc`, which runs every test named above (log `~/.cache/cairn-scratch/hm-verify-0.log`).

## Phase 1 — Contracts, the guard, and the dates

Four tasks, each with files no other open task touches.

- [x] V2 [P] [US2] [contract; plan, *Contract amendments*] Append the plan's `ui-ipc.md` amendment text, verbatim, as
  *Amended in slice `history-movement` (2026-10-02)* after the `history-by-weekday` amendment and before `get_quote`.
  The weekday amendment's last bullet (*`movement` … is still absent*) stays as the record it is. A documentation
  task: its proof is V21's field-for-field match, and its RED is that match failing until the code exists.
  *Files:* `specs/003-reflection-and-history/contracts/ui-ipc.md`.
- [x] V3 [P] [US2] [contract] Append the plan's `patterns.md` amendment (`LocalRange`, `movement`, and the properties
  list) after the `history-by-hour` amendment and anything below it. *Files:*
  `specs/003-reflection-and-history/contracts/patterns.md`.
- [x] V4 [P] [US2] [pin row 4; the ambient-counts guard] RED: plant `const movement = summary.movement;` in a new
  scratch file `src/plantedMovement.ts` (not in `localDays.ts`, which V5 edits) and run `npm run check:ambient-counts`.
  Record that it is **not** refused. GREEN: `REACH_DATA` gains `{ pattern: /\bmovement\b/, why: 'a reach breakdown' }`
  (or its own entry), and the same run refuses the plant, naming the file and line. Record that refusal. Remove the
  plant, and run `npm run check` clean: the word appears today only in `src/ipc/reaches.ts`, an allowed place. The
  guard's allowed places do not change. *Files:* `scripts/check-no-ambient-counts.mjs`; the scratch
  `src/plantedMovement.ts`, deleted in the same task.
- [x] V5 [P] [US2] [rules 2, 3; scenarios 25–27] RED: write `src/__tests__/dates.test.ts`, with `process.env.TZ =
  'Pacific/Kiritimati'` at the top. `shortDateInWords('2026-10-06', false)` equals `toLocaleDateString([], { day:
  'numeric', month: 'short', timeZone: 'UTC' })` of that date built with `setUTCFullYear`; with `true` it carries the
  year; `'0100-01-04'` names year 100, not 1900 or 2000. `weekOfInWords('2026-10-06', false)` is `week of ` plus the
  same text. Under the +14 zone the date named is the date given, never the day before or after. Fails because
  neither exists. GREEN: `src/localDays.ts` gains the two functions as the plan's *The date in words* describes them
  (`timeZone: 'UTC'`, `setUTCFullYear`, no reach data, no `by_*` name, the word `movement` nowhere).
  *Files:* `src/__tests__/dates.test.ts`, `src/localDays.ts`.

## Phase 2 — One rule at a time

Two tracks with disjoint files. **Track A (core)** is V6–V11, each needing the one before it, since all touch
`domain/patterns.rs`. **Track B (interface)** is V12–V19, each needing the one before it, since all touch
`Reaches.tsx`. The tracks meet only at the contract (V2, V3), and the screen tests run against a fake reader. Neither
track waits for the other. Within a track no task is `[P]`.

### Track A — the core (`src-tauri`)

- [x] V6 [US2] [rules 2, 8, 9, 10; scenarios 1, 2, 19, 21, 22; the wire shape] The rows exist, are daily, and cross the
  boundary.
  RED, from the driving port (`AppState::summarize_reaches`): 28 rows for 2026-09-05 to 2026-10-02, `day`
  ascending, each `days: 1`, `span: "day"`, counts 0 except 2 on 09-07 and 1 on 09-30; with no reaches, still 28 rows
  at 0, never `[]`; one date is one row; the person's estimates on two dates in the range and one after it leave the
  counts as the reaches alone give them and `estimates_excluded` 2 (scenario 19: a proof that `assemble` already
  builds from reaches alone, kept here because this is where the field is born; the task as a whole fails first);
  `movement` is `[]` with `sealed` set for one `check_range` refusal, one `check_offsets` refusal, the key unavailable,
  a history that opens but cannot be read, and a build without the history (`#[cfg(not(feature = "history"))]`); the
  serialised answer holds exactly nine keys and each row exactly `count`, `day`, `days`, `seen`, `so_far`, `span`,
  with `seen` and `span` lower-case strings. `us2_by_site.rs`, `us2_by_hour.rs`, `us2_by_weekday.rs`: each wire-shape
  test names nine keys (the `us2_by_weekday` test name drops *never movement*), with no other expectation changed (pin
  row 2). `range_allocation.rs` compiles against the new `assemble` signature and changes no expectation. `*seen*`
  and `*so_far*` are asserted here only at the values the later rules prove (V9–V11): do not assert `so_far` here.
  Fails because `movement` does not exist and the answer has eight keys.
  GREEN: `domain/patterns.rs` gains `LocalRange`, `Span`, `Seen`, `MovementRow`, `DAILY_UP_TO = 56` and `movement`,
  which places each reach by `offset_in_force` and `local_day` into the row of its local date, with one row per date
  and `saturating_add`. `seen` is `Whole` and `so_far` false until V9–V11 give them their rules. `assemble` takes
  `(&OpenHistory, &LocalRange, now)` and `Range` gains `movement`. `ipc/state.rs` builds the `LocalRange`, passes the
  clock it read, puts `MovementRow` on the wire (`#[serde(rename_all = "lowercase")]` on `Span` and `Seen`), and
  `Patterns::sealed` and the no-history branch set `movement` to `[]`. `ipc/commands.rs` changes its doc comment only.
  `domain/mod.rs` gains the table row of the plan and *eight* becomes *nine*. `check-domain-purity.sh` clean.
  *Files:* `src-tauri/tests/patterns_movement.rs` (new), `src-tauri/tests/us2_movement.rs` (new),
  `src-tauri/tests/us2_by_site.rs`, `us2_by_hour.rs`, `us2_by_weekday.rs`, `src-tauri/tests/range_allocation.rs`
  (signature only), `src-tauri/src/domain/patterns.rs`, `src-tauri/src/domain/mod.rs`,
  `src-tauri/src/reflection/over_time.rs`, `src-tauri/src/ipc/state.rs`, `src-tauri/src/ipc/commands.rs`.
- [x] V7 [US2] [rules 3, 12; scenarios 3–7, 23, 24] A long range is weekly, and every reach is in exactly one row.
  RED: 56 dates is 56 daily rows (holds at birth: it is the boundary the other cases lean on); 57 dates is 9 `week`
  rows, rows 0–7 of `days: 7` from 2026-08-07, row 8 of `days: 1`, `days` summing to 57; reaches at `1786660200` and
  `1786663800` fall in rows 0 and 1; a year across both changes is 53 rows with the 2 July 00:30 BST reach in row 26;
  a reach before `range_start` and one at `range_end` are in no row and the four counts (movement, `by_hour`,
  `by_weekday`, `by_site`) sum equal; `proptest` properties of `movement`: the rows are contiguous, the `days` sum is
  the range's length, counts are conserved, reaches' order does not matter, a reach's row holds its instant.
  `patterns_at_scale.rs`: two years at 50 reaches a day is 105 `week` rows summing to every reach inside the same
  1 000 ms. `range_allocation.rs`: `ceil(n / 7)` rows for the widest range, one counting 1, and the bound becomes
  *8 MiB plus `movement.len() × size_of::<MovementRow>()`* (pin row 3: the claim *nothing per day* stands). Fails
  because rows past 56 dates are still daily, so row counts and the bound are wrong.
  GREEN: `movement` groups by `ceil(n / 7)` past `DAILY_UP_TO`, allocates the rows vector once with its exact
  capacity, and walks nothing per date. A short last week's `days` is its own. The module doc gains a line.
  *Files:* `src-tauri/tests/patterns_movement.rs`, `src-tauri/tests/us2_movement.rs`,
  `src-tauri/tests/patterns_at_scale.rs`, `src-tauri/tests/range_allocation.rs`, `src-tauri/src/domain/patterns.rs`.
- [x] V8 [US2] [rule 4; scenarios 8–12] A reach is in the row of the local date its own instant falls on.
  RED: 23:59 and 00:01 BST on 2026-09-13/14 are in those two rows, and 2026-09-13 23:30 UTC is in the 14th's;
  autumn's 00:30 BST and 23:30 GMT on 2026-10-25 are both in that row; spring's 2026-03-29 23:30 UTC is in the 30th's;
  Cairo's skipped midnight is placed, not sealed, with the reach at `range_start + 60` in the 2026-04-24 row under
  both accepted first offsets; the Goose Bay day of `patterns_by_weekday.rs` lines 496–523 gives one row counting 2.
  (Scenarios 8–10 are held proofs over `offset_in_force` and may pass at birth. Scenarios 11 and 12 are the RED: a
  reach whose local date falls outside the range is dropped before the clamp exists.) Fails on 11 and 12, because
  such a reach is placed in no row and the counts are not conserved.
  GREEN: a reach's row is `clamp(local_day − first_day, 0, n − 1)` divided by the row's length. The comment names
  the W-A1 midnight and says nothing that holds `day` and a number.
  *Files:* `src-tauri/tests/patterns_movement.rs`, `src-tauri/tests/us2_movement.rs`,
  `src-tauri/src/domain/patterns.rs`.
- [x] V9 [US2] [rules 5, 12; scenarios 13 (first half), 14 (first half), 15, 20, 24 (second half)] A row Cairn did not
  count for at all is `none`; one it did is `whole`; every instant is walked once.
  RED: a gap over all 25 hours of 2026-10-25 makes that row `none` with count 0 and its neighbours `whole`; a gap
  over all 23 hours of 2026-03-29 makes the 29th `none` and the 30th `whole`; a gap that ends at a local midnight
  leaves the next row `whole`; a gap from 10-02's midnight to `NOW` makes that row `none`; a range wholly inside one
  gap has every row `none` at 0 with `coverage_note` present, and a range 2026-08-08 to 2026-09-04 inside one gap has
  every row `none`; a deleted day's row counts what remains and its `seen` is unchanged; `proptest`: adding unseen
  time never makes a row more seen. The widest range the screen can send (0100-01-01 to 2026-10-02 in UTC, one offset)
  answers through `AppState` with 100 534 rows inside 1 000 ms, and `patterns_at_scale` still holds. Fails because
  every row is `whole`.
  GREEN: `movement` takes the merged `unseen` pairs and walks the pieces between offset changes and row boundaries
  against them with two pointers, as the plan's *How it is computed* describes, with `i64` and `checked_*`
  arithmetic, nothing per date. `over_time.rs` passes the range's gaps as `clipped` returns them. Scenario 24's
  second half and the scale test are the guard that the walk is linear: they are to be seen green, and a per-date
  walk is to be seen failing them (rule 12 has no RED of its own).
  *Files:* `src-tauri/tests/patterns_movement.rs`, `src-tauri/tests/us2_movement.rs`,
  `src-tauri/tests/patterns_at_scale.rs`, `src-tauri/src/domain/patterns.rs`,
  `src-tauri/src/reflection/over_time.rs`.
- [x] V10 [US2] [rule 6; scenarios 13 (second half), 14 (second half), 16] A row Cairn saw only part of is `part`, and
  a row holding a reach is never `none`.
  RED: a 24-hour gap from 2026-10-25 00:00 BST leaves the 25th `part` and the 26th `whole`; a 24-hour gap from
  2026-03-29 00:00 GMT leaves the 29th `none` and the 30th `part`; a gap over the last two hours of 2026-10-01 leaves
  it `part` and 10-02 `whole`; a gap covering all of 2026-09-07 with a reach recorded inside it is `part` with count 1;
  a week row with a gap over two of its seven dates is `part`; the Goose Bay day under a gap over the whole range is
  `part`. `proptest`: no row holding a reach is `none`. Fails because partial coverage is read as `whole`, and a row
  with a reach inside a gap is `none`.
  GREEN: `Seen::Part` for any seeable unseen second with some seen, or all unseen with a reach; `None` only when all
  seeable instants are unseen and the row holds no reach.
  *Files:* `src-tauri/tests/patterns_movement.rs`, `src-tauri/tests/us2_movement.rs`,
  `src-tauri/src/domain/patterns.rs`.
- [x] V11 [US2] [rule 7; scenarios 17, 18; scenarios 1 and 2's `so_far` assertions] The row holding today, and any row
  after it, is `so_far`; the clock is read once.
  RED: scenario 1's last row is `so_far` and no other; one date, today, is `so_far`; a gap an hour long today leaves
  10-02 `so_far` and `part`, because only instants before `NOW` count; with `now` at 2026-10-03 00:30 BST no row is
  `so_far`; a range whose last date is tomorrow, asked at 23:30 today, has tomorrow's row `so_far`, `whole`, count 0;
  a counting fake clock shows `check_range` and the rows see one read. Weekly rows: scenario 4's last row `days: 1` is
  `so_far`. Fails because `so_far` is always false.
  GREEN: `so_far` when any of the row's instants is at or after `now`; coverage counts only instants before `now`
  (a row with none is `whole`). `summarize_reaches` reads the clock once and passes the one value to `check_range`
  and `assemble`. `ipc/state.rs` is touched only for that.
  *Files:* `src-tauri/tests/patterns_movement.rs`, `src-tauri/tests/us2_movement.rs`,
  `src-tauri/src/domain/patterns.rs`, `src-tauri/src/ipc/state.rs`.

### Track B — the interface (`src`)

- [x] V12 [US2] [rule 1; scenarios 28, 29; pin row 1] *Day by day* is the fourth option of *Seen by*, over the same
  range and the one read.
  RED: write `src/screens/__tests__/ReachesMovement.test.tsx` (`TZ=Europe/London`, a fake `read`, a fixed `now`, no
  `vi.mock`): *Seen by* holds *By site* (pressed), *By hour*, *By day*, *Day by day*, in that order; choosing *Day by
  day* shows its view with no second read; changing *From* reads again and stays on *Day by day*; going to *Today*
  and back reopens on 4 weeks and *By site*; on `NOW` the one call is `("2026-09-05", "2026-10-02", start, end,
  offsets)`, identical to the other views'. Pin row 1: `beforeTheReveal.ts` gains `DAY_BY_DAY_DELTA` beside
  `BY_DAY_DELTA` (one word, one control `button | Day by day | disabled=false | pressed=false`, the captured markup
  untouched), and `TonightWordsKept`, `ReachesPage`, `ReachesByHourPage`, `ReachesByDayPage` apply both deltas.
  `ReachesByHour`, `ReachesByDay` and `ReachesRowGuard` list four buttons, *Day by day* `aria-pressed="false"` last.
  Fixtures gain `movement` only where the type requires it, through one helper. Fails because the group has three
  buttons.
  GREEN: `src/ipc/reaches.ts` gains `MovementRow` (`day`, `days`, `span`, `count`, `seen`, `so_far`) and
  `Patterns.movement`, with the header and docs naming the fourth breakdown. `Reaches.tsx`: `Seen` gains `'movement'`
  and *Seen by* a fourth `ViewButton`, *Day by day*. The view shows the standing sentence and, until V13, no rows.
  `summarizeReaches` and `commands.rs` do not change.
  *Files:* `src/screens/Reaches.tsx`, `src/ipc/reaches.ts`, `src/screens/__tests__/ReachesMovement.test.tsx` (new),
  `src/screens/__tests__/beforeTheReveal.ts`, `TonightWordsKept.test.tsx`, `ReachesPage.test.tsx`,
  `ReachesByHourPage.test.tsx`, `ReachesByDayPage.test.tsx`, `ReachesByHour.test.tsx`, `ReachesByDay.test.tsx`,
  `ReachesRowGuard.test.tsx`, `tonightCases.ts`, `fakeCore.ts`, `ReachesOverTime.test.tsx`, `ReachesEdges.test.tsx`,
  `ReachesToday.test.tsx`, `Reaches.test.tsx` (fixtures only).
- [x] V13 [US2] [rules 2, 9, 10, 11; scenarios 31, 35, 37, 38, 40] The days are drawn, quiet and sealed read as the other
  views read them, and nothing is a verdict.
  RED: scenario 1's answer draws 28 lines, oldest first, each named by `shortDateInWords`, the count as text, a bar
  against the largest row in the one warm colour, a 0 with `0` and an empty bar; the coverage note stands above the
  rows and the standing sentence closes the view; a quiet range shows *Nothing here for these days.* with every row
  under it; sealed and a read that throws show exactly what *By site* shows, sentence and no rows; in every state no
  word of *What it never says* (*up, down, more, fewer, better, worse, rising, falling, trend, average, per day, peak,
  worst, best, busiest, quietest, top, rank, than last week*), no *day N*, *streak*, *in a row* or *chain*, no banned
  word, no numbered row, and no control that changes protection (a reusable scan, used by V14–V18). `ReachesRowGuard`:
  the corners for *Day by day*, a quiet range keeps its rows under the sentence and a non-quiet one draws them, so no
  part of `seen !== 'site' || !isQuiet(rows)` can change unfailed. Fails because the view draws no rows.
  GREEN: `rowsOf` for `'movement'` maps each wire row to a `Row` named by `shortDateInWords`, with `withYear` true when
  `first_day` and `last_day` are in different years. The list guard stays as it is. Sealed and could-not-read are
  shared.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesMovement.test.tsx`,
  `src/screens/__tests__/ReachesRowGuard.test.tsx`.
- [x] V14 [US2] [rule 8; scenarios 30, 36] The estimates sentence on *Day by day*.
  RED: `estimates_excluded` 2 reads *Your own estimates for 2 days are not counted here, because Cairn counts only
  what it saw.*, 1 the singular, 0 no sentence; *By site* and *By hour* keep *an estimate has no site* and *an
  estimate has no hour*, and *By day* keeps its own. Fails because the view gives another view's reason or none.
  GREEN: `estimatesSentence` gives W6's reason for `'movement'` as for `'weekday'`.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesMovement.test.tsx`.
- [x] V15 [US2] [rule 3; scenario 32 (first and third parts)] A long range reads one row per week, each named by the date
  it begins.
  RED: scenario 4's answer draws nine lines named by `weekOfInWords`; a full week has no *across* clause; a short last
  week says *across 1 day*, *across 3 days* and so on, singular for 1; across a year every name carries its year.
  Fails because week rows are named as days and carry no clause.
  GREEN: `rowsOf` names a `span: "week"` row with `weekOfInWords` and gives a week of `days < 7` the clause `across N
  days`, built as the *Guards* paragraph requires. The interface never re-derives 56: it reads `span`.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesMovement.test.tsx`.
- [x] V16 [US2] [rule 5; scenario 33 (first half)] A row Cairn did not count for is *not seen*, never a zero.
  RED: a `seen: "none"` row with count 0 shows its name and *not seen*, with no count and no bar, on the card and in
  the quiet list; the largest bar is taken from the rows that are drawn. Fails because the row draws `0` and an empty
  bar.
  GREEN: `rowsOf` makes a row `absent` (name and clause only) when `seen` is `"none"` and `count` is 0.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesMovement.test.tsx`.
- [x] V17 [US2] [rule 6; scenarios 33 (second half), 39] A row Cairn saw part of keeps its count, and a count is never
  hidden.
  RED: a `seen: "part"` row shows its name, *partly seen*, the bar and the count; a row the core sent as `"none"` with
  count 2 (built by hand) shows the count and the bar with *partly seen*. Fails because the first draws no clause and
  the second is hidden as *not seen*.
  GREEN: the clause gains *partly seen*, and a `"none"` row with a count draws as `"part"`.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesMovement.test.tsx`.
- [x] V18 [US2] [rule 7; scenarios 34, 32 (second part)] The row holding today says *so far*.
  RED: the last row `so_far` ends its clause with *so far*, alone, after *partly seen* (*partly seen, so far*), or
  after *not seen* (*not seen, so far*), and a short week reads *across 1 day, so far* and *across 3 days, partly seen,
  so far*, in that order; a row not `so_far` never says it. Fails because the clause has no *so far*.
  GREEN: clauses are joined by `, `, in the order across, seen, so far.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesMovement.test.tsx`.
- [x] V19 [US2] [rules 2, 3; scenario 41; styling] The screen on the notebook page, and its look. The styles come from
  the notebook's `src/styles/tonight-page.css` (004 `tonight-page`), and *Day by day* takes the rows' face as *By day*
  and *Today* do: `nb-reaches-time` for the clause, the one warm bar fill, no colour that means good or bad, no
  monospace body text.
  *Design steps inside this task.* (1) Before any code, `delivery/skills/frontend-design`'s second pass over the plan,
  applied to this screen's lines (name, clause, bar, count) and its longest clause, *across 3 days, partly seen, so
  far*, with whatever an extension block in `AGENTS.md` adds to `/drive`'s *Screen design* rung (none at the time this
  was written). (2) RED: write `src/screens/__tests__/ReachesMovementPage.test.tsx`, inside the notebook as
  `ReachesByDayPage.test.tsx` renders it: the four-option group on the left page under the date boxes; the rows on the
  right page, ruled, one to a line (name, clause, bar, count; or name and clause); the notes off the right page; no
  inline height or overflow; *Which days* still the spread's first child and the same node; focus kept on *Day by day*
  after pressing it; the same words as Current; a captured state applies both deltas. (3) GREEN: `tonight-page.css`
  gains a layout rule for the clause only if the longest clause does not sit on one ruled line beside the name, and no
  colour, font or focus rule of its own. The 004 contrast and focus guards (`npm run check`) stay green unedited. If
  the test passes with no rule, close this task saying so: the test stays as the guard. (4) Before the demo, review the
  rendered screens, on the page and on the card, against `delivery/skills/web-interface-guidelines`, with whatever an
  extension block in `AGENTS.md` adds to `/drive`'s *Design review* rung. Write the `Designed:` and `Reviewed:` lines
  under *Design review* below.
  *Files:* `src/screens/__tests__/ReachesMovementPage.test.tsx` (new), `src/styles/tonight-page.css` (only if
  needed), `src/screens/Reaches.tsx` (only if the row markup must change; then no other Track B task is open).

## Phase 3 — Hold it

- [x] V20 [US2] [mockups] Write back the states of this slice's white box as committed mockups, one per screen state:
  *Day by day* daily, weekly with a short last week, *partly seen*, *not seen*, *so far*, quiet, sealed. The writeback
  goes where `check-model` expects it (`delivery/docs/event-model/mockups/`, per `delivery/scripts/check-slice-scope.py`).
  `delivery/docs/event-model/` does not exist on this branch's head. If it still does not, record in the demo log that
  there is no model here and the host decides (see the report). *Files:* `delivery/docs/event-model/mockups/` only.
  *Host, 2026-10-02:* closed with no mockups. This repository has no event model (`delivery/docs/event-model/` is absent,
  as for the three history slices before it), so there is nowhere a mockup is checked against. The demo is the record.
- [x] V21 [US2] `contracts/ui-ipc.md` and `contracts/patterns.md`, as amended by V2 and V3, match `Patterns`,
  `MovementRow`, `Span` and `Seen` in Rust (`ipc/state.rs`), `LocalRange`, `movement`, `DAILY_UP_TO` in
  `domain/patterns.rs`, and `MovementRow` and `Patterns.movement` in `src/ipc/reaches.ts`, field for field. Every
  sentence that claims an invariant of `movement` is one the core enforces or one the contract says holds only for the
  offsets the screen sends (the weekday slice's Y23). V6's wire-shape test holds the nine keys. *Files:* the two
  contracts, if they differ.
- [x] V22 [US2] `make -f delivery/Makefile verify` green; `npm run check` (every guard, including V4's), `npm test`,
  `npm run lint` and `npm run build` green; `cargo fmt --all` and `cargo clippy --all-targets -- -D warnings` clean;
  V1's runs green again. Run `make smoke` if `main.rs` or the composition changed (the plan says neither does). *Files:*
  none.
- [ ] V23 [US2] [demo] In the running app, on every platform at hand: a reach's row on *Day by day* is the date *Today*
  lists it under; a reach just after midnight is in that day's row; widen to 9 weeks and the rows are weeks named by
  their first date, the last short and saying how many days; a stretch Cairn was not running reads *not seen* with no
  count; today reads *so far*; the date is written as the computer writes it. This is where the plan's *assumed* is
  seen or refuted: that each webview's default locale follows the computer's. Record the platforms seen, the dates
  each showed, and the platforms not seen. *Files:* the demo log and its evidence only.
- [ ] V24 After the merge, on `main` (the feature's `tasks.md`, `pinned.md` and `spec.md` are the host's): note T039–T045,
  T047 and T049 as done for day by day, and T043, T044, T045 as covering all four breakdowns; first-counted (5e) is
  what remains. *Files:* none of this slice's.

## Design review

Designed: _pending, written by V19 step 1_
Reviewed: _pending, written by V19 step 4_

## Parallel opportunities

- **Phase 0 runs first and alone.** V1 records the baseline.
- **Phase 1:** V2, V3, V4, V5 are all `[P]`. Their files are `contracts/ui-ipc.md`, `contracts/patterns.md`,
  `scripts/check-no-ambient-counts.mjs` with a scratch file, and `src/localDays.ts` with `src/__tests__/dates.test.ts`.
  No two share a file. V4's plant must not be in `localDays.ts` while V5 edits it.
- **Phase 2 has two tracks with disjoint files, and no `[P]` inside either.**
  - *Track A:* V6, V7, V8, V9, V10, V11 in order. Each edits `domain/patterns.rs` and the two Rust test files, so no
    two may run together. V6 also edits `over_time.rs`, `state.rs`, `commands.rs`, `mod.rs` and the three wire-shape
    tests; V9 edits `over_time.rs`; V11 edits `state.rs`.
  - *Track B:* V12, V13, V14, V15, V16, V17, V18, V19 in order. Each edits `Reaches.tsx` (V19 only if needed) and, V12
    to V18, `ReachesMovement.test.tsx`, so no two may run together.
  - The tracks share no file and may be run by two agents at once. Track B needs V5 (dates, for V13 and V15) and V2
    for the shape of `movement` (for V12's types). It does not wait for Track A.
  - A fresh agent writes each Track A RED, different from the one writing its GREEN.
- **Phase 3:** V21 reads both tracks' code, and V22 and V23 need both finished, so they run after Phase 2, one at a
  time. V20 may run beside V21 (disjoint files) once Track B is finished.
- **Across slices:** `first-counted` (5e) edits the same files (`patterns.rs`, `over_time.rs`, `state.rs`,
  `reaches.ts`, `Reaches.tsx`, the wire-shape tests, the pin's Over time cases), and adds instants to the unseen set
  `movement` already takes. Run it after this lands, not beside it.

## Phase 4: Convergence

Appended by convergence pass 1 of 2 (2026-10-02, at `f7aad64`). Only CRITICAL and HIGH re-open the loop.

- [x] V25 [US2] **HIGH** [rule 3, scenario 41; V19 step 3] A row whose name and clause do not fit the right page's line
  wraps to two to five ruled lines. *Evidence:* headless Chromium (playwright's `chromium-1234`), the app's own
  `notebook.css` and `tonight-page.css` and vendored fonts, notebook 830 units at `--nb-u: 1px`, right page 337 units,
  en-US: *week of Dec 29* + *across 3 days, partly seen, so far* is 128 units tall with the name squeezed to 39 units;
  with the year, 160; *week of Dec 29, 2025* + *across 3 days*, + *partly seen, so far* or + *across 3 days, so far*
  are each 64; *week of Dec 29* + *across 3 days, partly seen* is 64. Daily rows, with or without the year and any
  clause, measured 32. V19's GREEN rule ("a layout rule only if the longest clause does not sit on one ruled line")
  was decided in jsdom, which lays nothing out, so `ReachesMovementPage.test.tsx` passes whatever the width.
  *Sweep (the class):* every name form (day, day with year, week, week with year) times every clause `clauseOf` can
  produce, in en-US and en-GB (*Sept*), at the floor of `--nb-u` and in the single-column layout of
  `notebook.css` line 519, measured in a layout engine; every one sits on one 32-unit line, or the design pass
  chooses a form that keeps the ruling (for example the clause on its own ruled line under the name, a row of
  exactly 64) and writes it into `tonight-page.css` with no colour, font or focus rule of its own. The guard that
  keeps it is the host's choice (no browser test harness is installed here, and adding one is a dependency
  decision): at the least, the measured table goes into the demo evidence under V23.
  *Files:* `src/styles/tonight-page.css`, `src/screens/Reaches.tsx` (row markup only, if the chosen form needs it),
  `src/screens/__tests__/ReachesMovementPage.test.tsx`.
- [ ] V26 [US2] **MEDIUM** [V19 steps 1 and 4] V19 is ticked while *Design review* still reads `Designed: _pending_`
  and `Reviewed: _pending_`: the `frontend-design` second pass and the `web-interface-guidelines` review were not
  recorded, and V25 is what the first would have caught. *Sweep:* every ticked task in this file whose text requires
  a written record (V19's two lines, V1's log, V4's recorded refusal, V20's note) has it, or is un-ticked. Write
  both lines after V25, before the demo. *Files:* this file's *Design review* (host).
- [x] V27 [US2] **MEDIUM** [rules 4 and 7; the RED independence of *Constitution Check*, Delivery Method] Two
  mutants of `domain/patterns.rs` survive all 71 tests of `patterns_movement` and `us2_movement`:
  `.clamp(0, dates - 1)` to `.clamp(0, dates)` at line 419 (a reach whose local date falls *after* `last_day` is
  never exercised; on a daily range the mutant indexes past the rows and would panic), and `ends > now` to
  `ends >= now` at line 426 (no example puts `now` exactly on a row's local midnight, where the row before must not
  be `so_far`). Killed, for comparison: `unseen_part > seeable` (6 fail), dropping `row.count == 0` from `None`
  (3 fail), coverage ignoring `now` (3 fail). The implementer wrote each Track A RED and its GREEN, against the
  task's rule. *Sweep:* every comparison and bound in `movement`, `coverage` and `for_each_piece` (lines 410, 419,
  426, 437, 467, 479, 493, 512, 516) gets an example at its exact boundary, written by an agent that did not write
  the GREEN: a reach after `last_day` under an offsets list `check_offsets` accepts (daily and weekly), counted in
  the last row; `now` at a row's local midnight; then each mutant above, and one per swept bound, is shown killed.
  Record in the plan's *Constitution Check* that Track A's REDs were not independent and that this pass stands in.
  *Files:* `src-tauri/tests/patterns_movement.rs`, `src-tauri/tests/us2_movement.rs`.
- [x] V28 [US2] **MEDIUM** [pin row 4; SC-006] V4 is ticked, but its GREEN (`\bmovement\b` in `REACH_DATA`) left this
  branch in `02eab7a` for host PR #60, still open. Until #60 merges, `check-no-ambient-counts` does not refuse the
  field outside the reaches screen. *Sweep:* every guard or pin this slice's tasks claim (V1's pins, V4's guard,
  pin rows 1–4) is on `main` or in this diff before this slice merges. Merge #60 first, or state the order in this
  slice's PR. *Files:* none of this slice's.
- [ ] V29 [US2] **MEDIUM** [M11, R5; the screen at scale] The core's widest answer is measured (100 534 rows inside
  1 000 ms) but the screen drawing them is not: `Reaches.tsx` renders one `<li>` per row with no windowing, and a
  person can type *0100* in *From*. *Sweep:* every view whose row count grows with the range (today only *Day by
  day*) is timed in the running app at the widest range the screen sends. If it stalls, the remedy (a coarser span,
  windowing, or the range starting at `first-counted`, H5) is the owner's decision, handed back, not chosen here.
  *Files:* the demo log and its evidence (V23).
- [x] V30 [US2] **LOW** [lead d] `us2_by_site.rs` line 328, the quiet-range test, copies `movement` from the answer into
  its expectation, so that test holds nothing about the rows (they are proved at
  `us2_movement.rs::no_reaches_still_28_rows_at_zero_never_an_empty_list`, line 325). *Sweep:* no expectation in
  `src-tauri/tests/` is built from the value under test (`grep -n "patterns\.[a-z_]*\.clone()"` and the like: this
  is the only hit today). Replace it with the 28 rows at 0, `whole`, the last `so_far`, or compare every other
  field and name the test that holds `movement`. *Files:* `src-tauri/tests/us2_by_site.rs`.
- [x] V31 [US2] **LOW** [lead a; V2, V21] `contracts/ui-ipc.md` lines 143, 215 and 252 still say `movement` is absent,
  and this slice's amendment supersedes only `[{ day, count }]`. V2 rightly keeps the old text as the record.
  *Sweep:* every statement in `ui-ipc.md` and `patterns.md` that a field is absent or not yet computed has a
  pointer in the amendment that ends it (today only `movement`'s three). Add one sentence to this slice's amendment
  naming them as superseded. *Files:* `specs/003-reflection-and-history/contracts/ui-ipc.md`.

Appended by convergence pass 2 of 2 (2026-10-02, at `1133d75`). This is the loop's bound: only a CRITICAL re-opens it.

- [x] V32 [US2] **HIGH** [V25's own rule; scenario 41; the weekday view, which V25 widened to] V25 keeps every row on
  the ruling but takes the bar off the row's first line, on *Day by day* **and** on *By day*, a view that shipped
  before this slice. `.nb-reaches-line--label > .nb-reaches-bar` (`tonight-page.css` 230–233) adds
  `margin-top: calc(13 * var(--nb-u))` but leaves `.nb-reaches-bar`'s `align-self: center` (line 252) in force, so
  the margin and the centring add up: the bar's middle sits 22.5 units into a 32-unit row (6.5 low, toward the rule)
  and 38.5 into a 64-unit row (on the clause's line). The rule's own comment says "centred on the row's first
  line" (16). On `origin/main` the weekday bar was centred by `align-items: center` on a 32-unit line.
  *Evidence:* headless Chromium (`chromium-1234`, `--dump-dom`), the app's `theme.css`, `notebook.css` and
  `tonight-page.css` with the vendored Libre Caslon and Plex Mono loaded, the row markup `Reaches.tsx` 423–460
  draws, at `--nb-u` 1px and 2px, content widths 260, 300, 337, 420 and 520 units: 9 name forms (day, day with
  year, week, week with year; en-US and en-GB *Sept*; year 100) x 11 clauses, and 5 *By day* rows (up to *across
  5218 Wednesdays*). Every row is 32 or 64 units and no name wraps, so V25 holds as a class. All 425 rows that
  draw a bar have it at 22.5 or 38.5. With `align-self: flex-start` added to that one rule, all 520 rows measure
  32 or 64 with the bar's middle at 16 (tried, then restored with `git checkout -- src/styles/tonight-page.css`).
  The jsdom sheet test (`ReachesMovementPage.test.tsx` 323–371) cannot see this, as V25 already says of jsdom.
  *Sweep:* every flex child of a `nb-reaches-line--label` row (bar, count, clause) is placed relative to the first
  ruled line, measured in a layout engine across the table above. The table goes into V23's demo evidence beside
  V25's. *Files:* `src/styles/tonight-page.css`, `src/screens/__tests__/ReachesMovementPage.test.tsx` (the sheet
  test may name `align-self: flex-start` on the bar rule).
- [x] V33 [US2] **LOW** [V25, V27; Delivery Method, evidence] Two closures cite evidence this file does not hold. The
  plan's *Constitution Check* (`plan.md` 668–674) calls V27's "25 mutants killed, 9 argued equivalent" "V27's
  evidence in `tasks.md`". V25 is ticked with only pass 1's finding text and its own "at the least, the
  measured table goes into the demo evidence under V23". Pass 2 re-ran what it could: the five mutants it applied
  to `patterns.rs` (`clamp(0, dates)` at 419 and 505, `ends >= now` at 426, `unseen_part > seeable` at 437,
  `coverage` ignoring `now` at 467) each fail 2 to 4 of `patterns_movement`'s 58 tests, so V27 holds. The list of
  the 34 and the equivalence argument for the 9 are not on disk. *Sweep:* every ticked task in Phase 4 carries its
  closing evidence (what was run, the counts) in its own text or a file it names. Write V27's mutant list and the
  9 equivalence arguments under V27, and V25's measured table under V23's evidence. *Files:* this file (host).

### Evidence recorded for V25, V27 and V32 (host, 2026-10-02, V33)

**V25: row heights in `--nb-u` units, headless Chromium (agent-browser), the app's own `notebook.css` and
`tonight-page.css`, vendored fonts, morning look.** 480 rows per cell: 10 names (day, day with year, week, week
with year, over 5 dates) × 24 clauses (across none/1/3/6 days × nothing/not seen/partly seen × so far).

| Viewport (right page) | Before | After |
|---|---|---|
| 1280×800 (337) | 32–512, 14 distinct heights | en-US 32 ×195, 64 ×285; en-GB 32 ×202, 64 ×278 |
| 1100×800 (278.6) | 32–512 | en-US 32 ×118, 64 ×362; en-GB 32 ×119, 64 ×361 |
| 800×600 (294) | 32–512 | en-US 32 ×146, 64 ×334; en-GB 32 ×144, 64 ×336 |
| 1920×1080 (u 1.35) | 43.2–691 | 43.2 ×267, 86.4 ×213 (32 and 64 units) |

*By day* (7 days × counts 1, 4, 52, 780), the same rule: before 64–288 at 1100 and 800 wide, up to 96 at 1280;
after only 32 or 64. Converge pass 2 re-measured every form at `--nb-u` 1px and 2px, widths 260–520: all 32 or 64.

**V32:** with `align-self: flex-start` on `.nb-reaches-line--label > .nb-reaches-bar`, all 520 rows that draw a bar
centre it at 16 units, the middle of the first line (converge pass 2's trial of exactly this rule, then applied by the
host with a RED first: `ReachesMovementPage.test.tsx`, "sets a labelled row's bar on its first line").

**V27: mutants of `domain/patterns.rs`, by an agent that wrote none of the code.** Killed (25): the `movement` clamp
upper `(0, dates-1)`→`(0, dates)` (2 new tests, as panics) and lower 0→1 (11); the same clamps in `for_each_piece`
(4; 13); `ends > now`→`>=` (3 new); `dates > 0`→`>= 0`; `dates <= 56`→`< 56`; `dates % length > 0`→`>= 0` (25);
`.min(length)`→`.max` (11); `reach.at < from`→`<=`; `reach.at >= to`→`>`; `unseen_part > 0`→`>= 0` (21) and `> 1`
(4 new); `unseen_part >= seeable`→`>` (14); `row.count == 0`→`!= 0` (19); `to.min(now)`→`.max(now)` (7);
`.max(range.from)`→`.min` (28); `begins.max(range.from)`→`.min` (19); `ends.min(end)`→`.max` (18);
`gap_to.min(to)`→`.max` (7); `gap_from.max(from)`→`.min` (9); `ends <= begins`→`<` (1 new); `row == first_row`→`!=`
(19); `row == last_row`→`!=` (20); `row_begins(row+1)`→`row_begins(row)` (24). Survivors argued equivalent under every
input `check_offsets` accepts (9): `!unseen.is_empty()`→`true`; dropping `.max(range.from)` from `end`; dropping
`begins.max(range.from)`; `to <= from`→`<`; gap `.1 <= from`→`<`; `gap_from >= to`→`>`; `change.from <= cursor`→`<`;
`change.from < range.to`→`<=`; `row_at(ends - 1)`→`row_at(ends)`. Each is a zero-length piece or an unreachable
input. Script: the session scratchpad's `mut.py`. Converge pass 2 re-ran five of them: each failed 2–4 tests.

### After-converge gaps read (`drive-gaps` · host model · delegated, fresh context, 2026-10-02)

No CRITICAL or HIGH. Every state named in its brief is pinned (56/57 dates, a weekly row wholly not seen, partly seen
with so far, a year on a row, the quiet range with rows not seen).

- [x] V34 [US2] **MEDIUM** [M5; owner question at the demo] *Partly seen* is set by any unseen second
  (`domain/patterns.rs` 434–443), and a gap is recorded whenever Cairn starts after a stop (`counting/presence.rs`
  103–115), so a computer shut down overnight marks both dates *partly seen*: over weeks, nearly every row. Shown to
  the owner with the demo data's partial night; their answer decides whether the rule stands or a new one is made.
- [x] V35 [US2] **MEDIUM** [M8, FR-022, FR-024; owner question at the demo] A range with no seen time at all still
  says "Nothing here for these days." above rows that all read *not seen* (`Reaches.tsx` 172, 419; screen test
  `ReachesMovement.test.tsx` 442). Inherited from by site and by hour; the extension was the plan's, not the owner's.
- [x] V36 [US2] **LOW** A reach exactly on a later row's local midnight, under a non-zero offset, daily and weekly, is
  not pinned (only `range.from`, 23:59 and 00:01 are). *Sweep:* one example per span at `row_begins(k)`.
  *Files:* `src-tauri/tests/patterns_movement.rs`.
- [x] V37 [US2] **LOW** [owner question at the demo] A range wholly inside a past year names no year on its title or
  rows (`localDays.ts` `rangeInWords`, followed by `Reaches.tsx` 136–139); before this slice too, now up to 52 rows.
- [x] V38 [US2] **LOW** The comment in `shortDateInWords` says `new Date(100, …)` reads year 100 as 2000; JavaScript
  remaps only years 0–99. Correct it. *Files:* `src/localDays.ts`.

Appended by the convergence pass after the demo (2026-10-03, at `2a9d796`; Phase 5 only). Only a CRITICAL re-opens
the loop.

- [ ] V45 [US2] **LOW** [M14; scope question for the owner, not a fix] M14 reaches every date the *Over time* view
  writes: the title (`Reaches.tsx` 416) and *Day by day*'s rows (148–157), both through `namesYear`
  (`localDays.ts` 92). *Sweep of every other date written:* the *Today* header is the word *Today* (`Reaches.tsx`
  313, 322); both coverage notes give a length and no date (`store/gaps.rs` 128–164); the *From*/*To* boxes are
  native date inputs that always show the year. One place does not follow M14: the check-in names an ended day it
  held open past midnight as *Wednesday 30 September* with no year (`CheckIn.tsx` 115–119, 283), so on 1 January it
  says *Thursday 31 December*. Recommendation: leave it. That day is at most yesterday and its weekday makes it
  unambiguous, and M14 names the four views' titles and *Day by day*'s rows. Ask the owner only if they want M14 to
  apply wherever a date is written. *Files:* none unless the owner extends M14 (`src/screens/CheckIn.tsx`).
- [ ] V46 [US2] **LOW** [V29; the screen at scale] `OverTimeView` builds the rows twice on every render: once for
  `quiet` (`Reaches.tsx` 410) and again for `rows` (411). On *Day by day* at the widest range (100 534 weekly rows,
  V29) that doubles the work V29 is there to time. It is also built for `quiet` under M13's sentence when nothing
  reads it. *Sweep:* every value derived from `rowsOf` in `OverTimeView` comes from one call per render. Build the
  rows once and judge `quiet` from them (on *By site* and the others, an empty list under the M13 sentence is never
  read as quiet, because `unseen` comes first at 438). *Files:* `src/screens/Reaches.tsx`.

## Phase 5: After the demo (owner decisions M12–M16)

Plan: *After the demo: M13 and M14* (rules 13–19, scenarios 42–56) and *After the demo: M12* (scenarios 57–61). Pins:
the two rows of host PR #61; characterised first by C1–C3 (`289d573`). Two tracks, disjoint files, run concurrently.

### Track A — the core

- [x] V39 [US2] [M12; rule 6 as superseded; scenarios 57–61] A row is *partly seen* only when Cairn missed more than half
  of its seeable time (`2 * unseen > seeable`); exactly half is whole; a row holding a reach is never `none`.
  RED: scenarios 57–61 in the domain and through `AppState::summarize_reaches`, and every existing example that used one
  unseen second to mean `part` re-read against M12 (change its expectation, or its gap, and say which in the commit).
  GREEN: the threshold in `domain/patterns.rs`. Keep the `proptest`s; update the contract sentence for `seen: "part"`.
  *Files:* `src-tauri/src/domain/patterns.rs`, `src-tauri/tests/patterns_movement.rs`, `src-tauri/tests/us2_movement.rs`,
  `specs/003-reflection-and-history/contracts/ui-ipc.md` (the `seen` bullet of the `history-movement` amendment only).

### Track B — the screen

- [x] V40 [US2] [rules 13, 15, 16; M13, M15; scenarios 43–46, 48–50] *Cairn wasn't counting on these days.* where Cairn
  saw none of the range, in all four views, judged once from `movement`; by hour and by day draw no rows under it;
  day by day keeps its *not seen* rows; never from an empty, sealed or loading answer. RED: rewrite C1
  (`ReachesUnseenRange.test.tsx`) to the new behaviour, plus scenarios 48–50. *Files:* `src/screens/Reaches.tsx`,
  `src/screens/__tests__/ReachesUnseenRange.test.tsx`, `src/screens/__tests__/ReachesMovement.test.tsx`.
- [x] V41 [US2] [rule 14; scenarios 42, 47] Where Cairn saw any of the range, the quiet sentence and its rows are exactly as
  before. Held by the existing quiet tests (`movement: []`) and C1's seen variant. *Files:* as V40.
- [x] V42 [US2] [rules 17, 18; M14; scenarios 52–56] The title and day by day's rows name the year when either date is
  outside the current local year by the screen's `now`. RED: change C2's no-year case and C3 to the new behaviour, and add
  the rows. *Files:* `src/localDays.ts`, `src/__tests__/localDays.test.ts`, `src/screens/Reaches.tsx`,
  `src/screens/__tests__/ReachesOverTime.test.tsx`, `src/screens/__tests__/ReachesPage.test.tsx`,
  `src/screens/__tests__/ReachesMovement.test.tsx`.
- [x] V43 [US2] [rule 19, M16; scenario 51] The standing sentence stays under every view, and both guards pass.
  *Files:* as V40.
- [ ] V44 `make -f delivery/Makefile verify` green, then the demo again (V23), the app stopped afterwards.

## Convergence

**Pass 1 of 2 (2026-10-02, at `f7aad64`): not converged.** One HIGH (V25) re-opens the loop; V26–V29 MEDIUM and
V30–V31 LOW do not. Run on this branch: the seven Rust suites the slice touches (`patterns_movement` 38,
`us2_movement` 33, `us2_by_site`, `us2_by_hour`, `us2_by_weekday`, `range_allocation`, `patterns_at_scale`) green;
`dates`, `ReachesMovement`, `ReachesMovementPage`, `ReachesRowGuard`, `TonightWordsKept` (176 tests) green; `npm run
check` green. The full `make verify` was not run (V22's place).

*Levels.* **Domain** (`domain/patterns.rs` 318–548): rows contiguous, daily to 56 dates and weekly beyond, counts
conserved, coverage walked by pieces with no per-date work, `None` only with no reach; two boundaries unproved
(V27). **Use case** (`reflection/over_time.rs` 100–143): rows built from reaches alone (line 135), the same clipped
and merged gaps as the note (131–132), `now` passed in. **Delivery adapter** (`ipc/state.rs` 847, 879, 224;
`commands.rs` doc only; `src/ipc/reaches.ts` 68–98): one clock read for the range check and the rows, `[]` when
sealed, nine keys held by the wire-shape tests; fields match the contract (V21's match holds on this reading).
**Screen** (`Reaches.tsx` 104–155, 411–425): the fourth option, names, clauses, *not seen* with no count or bar,
quiet and sealed shared with the other views; on the notebook page the longer rows break the ruling (V25), and the
design record is missing (V26). **Published contract** (`ui-ipc.md` 256–283, `patterns.md` 122–139): matches the
code; stale "absent" lines (V31).

*Constitution (v1.5.0).*
- **III Honest About Limits / FR-022:** a row Cairn did not see is never a zero: `patterns.rs` 437–442 (`None` only
  when all seeable time is unseen and no reach), `Reaches.tsx` 113, 153–154, 420 (`absent` draws name and *not
  seen*, no count, no bar); *partly seen* 115; *so far* 116 and `patterns.rs` 426; coverage counts only before `now`,
  467. Known and owned elsewhere: rows before Cairn first counted read as seen (H5, slice `first-counted`, M11).
- **VI Voice, no streak or day count:** rows named by date (`localDays.ts` 238–256), never numbered; clause built as
  `across ${days} ${days === 1 ? 'day' : 'days'}` (`Reaches.tsx` 108); `check-banned-words` and `check-no-streaks`
  clean; the *What it never says* scan in `ReachesMovement.test.tsx`. Mono only for the clause and count (small
  labels, `tonight-page.css` 199–206).
- **SC-006 no ambient counts:** the field is read only in `Reaches.tsx` and `src/ipc/`; the guard that would refuse it
  elsewhere is in open PR #60, not this diff (V28).
- **FR-023 estimates:** never in a row (`over_time.rs` 135 passes reaches only), stated on the view (`Reaches.tsx` 83).
- **FR-024 quiet:** *Nothing here for these days.* over every row (`Reaches.tsx` 180, 411–412); sealed is `[]`
  (`state.rs` 224).
- **II Local-first:** no dependency added (no `Cargo.toml`, `Cargo.lock` or `package.json` in the diff); nothing new
  stored; `check-no-network-deps` clean.
- **Domain purity:** `movement` takes `now` and the offsets as values (`patterns.rs` 370–375); no clock, zone, locale
  or I/O; `check-domain-purity` clean.
- **Tests first, ADD:** the driving-port scenarios enter through `AppState::summarize_reaches` (`us2_movement.rs`);
  RED independence not as planned (V27).
- **I, IV, V, VII:** not touched: no control changes protection, no system file, no notification, nothing gated.

**Pass 2 of 2, the confirming pass (2026-10-02, at `1133d75`): converged at the loop's bound, with one HIGH (V32)
and one LOW (V33) owed before merge.** No finding is CRITICAL, so the loop stops here as bounded. V32 is a
one-declaration fix that should land before V23's demo, so the demo checks it. Run on this branch:
`patterns_movement` 58 (38 + V27's 20), `us2_movement` 33, `us2_by_site` 12, `us2_by_hour` 19, `us2_by_weekday`
23, `range_allocation` 1, `patterns_at_scale` 1, `ipc_surface` 10 (all with `--features history`) green.
`src/screens`, `src/look` and `dates` (68 files, 2 770 tests) green. `npm run check` (all eight guards) green. The
full `make verify` was not run (V22's place).

*Pass-1 findings, each confirmed as a class.*
- **V25 closed.** Every name form x every clause x en-US/en-GB x `--nb-u` 1 and 2 x five widths, plus the *By day*
  rows the shared `labelled()` markup now reaches: all 32 or 64 units, no name wraps. The fix took the bar off the
  first line, though (V32, HIGH).
- **V27 closed.** The two named mutants and three more, applied one at a time and restored, are each killed by
  V27's examples (2 to 4 failures each). The evidence it cites is not on disk (V33, LOW).
- **V28 closed.** `scripts/` is identical to `origin/main` (`ec64105`, #60 merged). A planted
  `summary.movement` in `src/look/` is refused by `check-no-ambient-counts` (exit 1), then removed (exit 0). Pins
  #59 and #60 are both on `main`.
- **V30 closed.** The quiet-range rows are built from the calendar (`us2_by_site.rs` 326–348). The sweep finds no
  expectation in `src-tauri/tests/` built from the answer: the two `patterns.sealed.clone()` hits read the value
  under test, they do not build the expected one.
- **V31 closed.** `ui-ipc.md` 266–268 names the three `movement`-absent statements (143, 215, 252) as ended. No other
  "absent / not computed" line in either contract concerns this slice's field.
- **V26, V29 left for the demo, as their text says:** V26 "before the demo" (*Design review* still `_pending_`);
  V29's files are "the demo log and its evidence (V23)". Neither is closed here.

*What the fixes introduced.* `labelled()` changes the *By day* rows' markup: its tests were updated (children
counts, the label wrapper) and pass, and the bar placement is V32. `nothingFades.test.tsx`'s 30 s timeout hides
nothing the slice caused. Its all-scenes test takes 1 016, 1 023 and 1 034 ms alone on this branch against 1 019,
1 036 and 1 021 ms on `origin/main` (a detached worktree, three runs each, then removed). The timeout guards
parallel load, not a slower render. (The commit's "about 4 s alone" is high: it measures about 1 s here.)

*Levels.* **Domain** (`domain/patterns.rs` 370–548): the bounds at 419, 426, 437, 467, 505 are now held at their
edges. **Use case** (`reflection/over_time.rs` 135): unchanged since pass 1, rows from reaches alone. **Delivery
adapter** (`ipc/state.rs` 200, 224, 881; `src/ipc/reaches.ts`): unchanged, nine keys held. **Screen**
(`Reaches.tsx` 104–117, 137–181, 419, 423–460; `tonight-page.css` 212–233): rows on the ruling, bar off the first
line (V32); not timed at the widest range (V29, demo). **Published contract** (`ui-ipc.md` 256–283, `patterns.md`
122–139): matches the code, stale lines pointed at.

*Constitution (v1.5.0).*
- **III Honest About Limits / FR-022:** a row Cairn did not see is never a zero: `patterns.rs` 437–442 (`None` only
  when all seeable time is unseen and no reach), `Reaches.tsx` 154 and 446 (`absent` draws no count and no bar),
  110 (*not seen*), 112 (*partly seen*), 113 and `patterns.rs` 426 (*so far*). `patterns.rs` 467: only time
  before `now` is seeable. Rows before Cairn first counted read as seen (H5, owned by `first-counted`).
- **VI Voice, no streak or day count:** rows named by date (`localDays.ts` 239–256), never numbered. The short-week
  clause is `Reaches.tsx` 107–108. `check-banned-words` and `check-no-streaks` are clean. Mono only for clause and
  count (`tonight-page.css` 199–206). The V25 rules add no colour, font or focus (`ReachesMovementPage.test.tsx`
  356–370).
- **SC-006 no ambient counts:** `movement` is read only in `Reaches.tsx` and `src/ipc/`. The guard that refuses it
  elsewhere is `scripts/check-no-ambient-counts.mjs` 69, on `main`, seen refusing a planted read.
- **FR-023 estimates:** never in a row (`over_time.rs` 135), stated on the view (`Reaches.tsx` 81–86, 407–409).
- **FR-024 quiet:** *Nothing here for these days.* (`Reaches.tsx` 65, 419). Sealed is `[]` (`state.rs` 224).
- **II Local-first:** no dependency added (no `Cargo.toml`, `Cargo.lock` or `package.json` in the diff).
  `check-no-network-deps` is clean on 3 targets.
- **Domain purity:** `movement` takes `now` and the offsets as values (`patterns.rs` 370–375).
  `check-domain-purity` is clean.
- **Tests first, ADD:** Track A's REDs were not independent (`plan.md` 668–674). V27's edge examples stand in, and
  the mutants above confirm them.
- **I, IV, V, VII:** not touched: nothing changes protection, no system file, no notification, nothing gated.

**After the demo, Phase 5 only (2026-10-03, at `2a9d796`): converged.** M12–M16 (V39–V43) hold at every level they
touch. No CRITICAL or HIGH. V45 and V46 are LOW and re-open nothing. `make -f delivery/Makefile verify` is green at
`2a9d796` (all gates; vitest 92 files, 3 124 tests, under #62's `maxWorkers: 8`), so V44's first half is met. The demo
again (V44's second half) is the host's. Three mutants, each applied alone and then restored with `git checkout --`, were each killed:
`> seeable` to `>=` in `patterns.rs` 438 (5 tests fail, among them *exactly twelve hours … is whole*); `sawNone`'s
`length > 0` to `>= 0` (*never says it of an answer with no rows* fails); `namesYear`'s `||` to `&&` (5 fail).
*Domain:* `patterns.rs` 434–447, `2 * unseen > seeable` (saturating), exactly half is whole, `None` still needs every
seeable second unseen and no reach. A row with nothing seeable stays whole. *Screen:* `sawNone` (`Reaches.tsx`
202–204) is judged once from `movement` (408), and only from a list that is neither loading, unreadable nor sealed
(407). The four views follow M13/M15 (411, 437–443). The standing sentence stays on the left page in every listed
state (431, M16). One year rule serves both title and rows (416, 148–151). *Published contract:* the `seen` bullet in
`ui-ipc.md` 278–281 matches 438. `patterns.md` 138 ("adding unseen time never makes a row more seen") still holds
under a threshold. *III / FR-022:* nothing presents unseen time as zero. Under M13's sentence *By hour* and *By day*
draw no zeros (411), and *Day by day*'s rows stay *not seen* with no count or bar (`absent`, 161). `sawNone` is false
for `[]` (`length > 0`), and sealed or loading never reach it. A row holding a reach is `part`, never `none` (contract
281, `Reaches.tsx` 203). *VI voice / no streaks:* the new sentence (67) holds no banned word. `check-banned-words` and
`check-no-streaks` are clean in the gate. *Clock:* `localDays.ts` 92–101 takes `today` as an argument, and every
`new Date` in the file builds from given values (no `Date.now`, no bare `new Date()`). *Sweeps:* the only other quiet
sentences are *Nothing here for today.* and the check-in's *Nothing here for {day}.*, which speak of a day Cairn is
counting as it is read, so not M13's class. For dates, see V45.
