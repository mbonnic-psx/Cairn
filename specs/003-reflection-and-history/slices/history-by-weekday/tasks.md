# Tasks — slice `history-by-weekday`

Numbered `Y`. `W` is taken by `write-tonight`'s tasks and by this slice's gaps review (W1–W6). Each task names the
feature task it carries out (`../../tasks.md`) and the plan's scenarios (`plan.md`). RED comes before GREEN, always:
a GREEN task starts only once the RED task it answers has been seen failing for the reason it states. Every task is
`[US2]`. `[P]` marks a task whose files no other open task in its phase touches.

**Unix-only APIs.** Any Rust test that touches a Unix-only API (`libc`, a file mode, setting `TZ` for the process)
is `#[cfg(unix)]`, so `cargo test --workspace` stays green on the Windows CI runner. This plan needs none: the core
reads no zone and no locale, and every zone in these tests is a fixture of integers. The interface's tests set
`process.env.TZ` at the top of their file, before any date is made, one zone per file, as `localDays.test.ts`,
`offsetChangesCairo.test.ts` and `TonightCurrentPin.test.tsx` do. No test depends on the runner's locale: every
expected name or clause is derived from the same `Intl` call made on a fixed instant, or the locale is passed
explicitly.

**What not to reintroduce** (`history-by-hour`'s convergence and adversary findings). The largest clock change is
3 hours (`LARGEST_CLOCK_CHANGE`, A1), never 2. Offsets are read from `Date`'s local fields to the second
(`offsetAt`, A2), never from `getTimezoneOffset()`. The first offset may be at or above the one `range_start`
implies, never below (A3). A range whose first midnight the clock skips is placed, not sealed (K23). A change at the
range's end is outside it (K24). The case is held through the command as well as through the check (K25). This slice
edits none of `check_range`, `check_offsets`, `offsetAt` or `offsetChanges`. Scenario 8 holds all three of K23–K25
for days.

**Q1–Q3** (`plan.md`, *Open questions*) are the owner's. The tasks are written to the recommendations. If the owner
decides otherwise: Q1 changes Y7's scenario 25 cases, Y8's absent-day line and one branch of Y18 (the core's answer
is the same either way); Q2 changes Y6's clause cases and `acrossInWords` in Y15; Q3 changes nothing here.

## Phase 0 — Pin: before code that was here changes

- [X] Y1 [US2] [pin] On the branch head, before any edit, re-read the constitution's version line (v1.5.0 when
  this was written), then run and record green: `ipc_surface`, `gaps`, `patterns`, `patterns_by_hour`,
  `offset_changes`, `range_bounds`, `range_coverage`, `us2_by_site`, `us2_by_hour`, `patterns_at_scale`
  (`cd src-tauri && cargo test -p cairn --no-default-features --features history --test …`), and
  `npx vitest run src/screens/__tests__/TonightCurrentPin.test.tsx src/screens/__tests__/ReachesOverTime.test.tsx src/screens/__tests__/ReachesPage.test.tsx src/screens/__tests__/ReachesEdges.test.tsx src/screens/__tests__/ReachesToday.test.tsx src/screens/__tests__/Reaches.test.tsx src/screens/__tests__/ReachesByHour.test.tsx src/screens/__tests__/ReachesByHourPage.test.tsx src/screens/__tests__/ReachesRowGuard.test.tsx src/__tests__/localDays.test.ts src/__tests__/offsetChanges.test.ts src/__tests__/offsetChangesCairo.test.ts`.
  Hand the host the two rows in `plan.md`, *Pin*, for `delivery/survey/pinned.md`. Row 1 lands before Y11, and row 2
  before Y4. No new seam is needed: both behaviours are already observed.

## Phase 1 — RED: the behaviour, stated as failing tests

- [X] Y2 [P] [US2] [T043; scenarios 1–11] Write `src-tauri/tests/patterns_by_weekday.rs` (no feature gate: the
  domain builds with `--no-default-features`) against `domain::patterns::by_weekday(reaches, first_offset, changes,
  from, to)` and `domain::patterns::weekdays_in(first_day, last_day)`, with `proptest` as `tests/patterns_by_hour.rs`
  uses it. Properties of `by_weekday`: always 7 entries; the sum equals the reaches in `[from, to)` and equals
  `by_hour`'s sum for the same arguments; with no changes it equals `summarize(...).by_weekday` for that offset; a
  reach's weekday is that of `LocalDate::from_days_since_epoch((at + offset in force).div_euclid(86 400))`, with the
  offset `by_hour` would use (adding a change after it leaves it alone); the reaches' order does not matter; any
  offsets, including a staircase, conserve the total. Properties of `weekdays_in`: the sum is the number of days in
  `first_day..=last_day`; any two entries differ by at most 1; a multiple of 7 days gives seven equal entries; the
  entries that get one more run on from `first_day`'s weekday; `first_day > last_day` gives seven zeros; a range of
  more days than `u32` holds saturates rather than wraps (use `WIDE_DAY_RANGE`-sized dates, as `dates.rs` does).
  Examples at the plan's fixture instants: scenarios 4–9 for `by_weekday`, and the 1-day, 3-day, 10-day
  (`[2, 1, 1, 1, 1, 2, 2]`) and 2026 (`[52, 52, 52, 53, 52, 52, 52]`) ranges for `weekdays_in`. Every expected value
  is derived from the calendar, not from running the code. It fails only because the two functions do not exist.
- [X] Y3 [P] [US2] [T039, T040, T043, T044, T047, T049; scenarios 1–17, 19] Write `src-tauri/tests/us2_by_weekday.rs`
  against `AppState::summarize_reaches`, the driving port, seeding the history through `OpenHistory` as
  `us2_by_hour.rs` does, with the plan's London, Cairo and New York bounds and offsets as fixtures. It covers: all
  seven days in the core's order, and seven zeros for a quiet range with `days` kept; every day present; the edges
  of the range, with the three sums equal; midnight by the clock; autumn's 25-hour Sunday; spring's 23-hour Sunday;
  a year whose ends agree; Cairo's skipped midnight placed under both accepted first offsets, and the range ending
  at the change's instant; the same reach under London's and New York's offsets and back; the 1-day and 3-day
  ranges, the four absent weekdays present with count 0 and `days` 0; the 10-day uneven range; with and without
  journal entries; estimates out of the days, `days` unaffected, still counted in `estimates_excluded`; gaps and
  the coverage note as by site gets them, a range wholly inside a gap, and a deleted day adding no gap and leaving
  `days` as it was; one refused-offsets case of each `check_offsets` rule, with `by_weekday` `[]`; sealed and
  unreadable, with `by_weekday` `[]`; the no-history build (`#[cfg(not(feature = "history"))]`, as `us2_by_hour.rs`
  does it); and the eight serialised keys, with each entry holding exactly `weekday`, `count` and `days`. Every
  sentence is checked for voice. Written by a different agent than Y12–Y14.
- [X] Y4 [P] [US2] [the pin, row 2] `src-tauri/tests/us2_by_site.rs` and `src-tauri/tests/us2_by_hour.rs`: each
  wire-shape test (`the_answer_serialises_to_exactly_seven_keys…`) becomes `…_eight_keys…`, naming `by_weekday`, and
  its message says `movement` is still absent because nothing computed it. No other expectation changes. Both fail
  because the answer has seven keys.
- [X] Y5 [P] [US2] [T041; scenario 18] `src-tauri/tests/patterns_at_scale.rs`: assert that `by_weekday`'s counts
  sum to every reach seeded, and that its `days` sum to the two years' 730 days, inside the same 1 000 ms bound. The
  header gains one sentence: the days are counted in the same pass, and the bound is unchanged.
- [X] Y6 [P] [US2] [scenarios 20–21] Write `src/__tests__/weekdays.test.ts`, with `process.env.TZ =
  'Pacific/Kiritimati'` at the top, for `firstWeekday`, `weekdayInWords` and `acrossInWords` in `src/localDays.ts`.
  `firstWeekday('en-GB')`, `('fr-FR')` and `('en-AE')` give 0; `('en-US')`, `('he-IL')` and `('pt-BR')` give 6;
  `('ar-EG')` and `('fa-IR')` give 5 (the plan's table, Node v22.22.1). The parser it is built on is given plain
  objects: `getWeekInfo()` reporting 7 gives 6; `weekInfo` alone reporting 7 gives 6; both present with different
  values prefers `getWeekInfo()`; neither, `firstDay` 0, 8, 1.5, `'7'` or `null` give 0. `weekdayInWords(0..6)` gives
  seven distinct names. Name 0 equals `toLocaleDateString([], { weekday: 'long', timeZone: 'UTC' })` of 2026-09-07
  12:00 UTC, a Monday reached independently of 2024-01-01, and name 6 equals that of 2026-09-13. No name changes
  across the file's +14 zone. `acrossInWords(0, 1)` is `across 1 ` plus name 0, `(0, 4)` is `across 4 ` plus name 0
  plus `s`, `(3, 2)` uses name 3, and `(n, 0)` is `not in these days` for every `n`. Fails because none of the three
  exists.
- [X] Y7 [P] [US2] [T042, T045, T047, T049; scenarios 22–29] Write `src/screens/__tests__/ReachesByDay.test.tsx`,
  with `process.env.TZ = 'Europe/London'` at the top, a fake `read`, a fixed `now` and a `firstDay` prop, and no
  `vi.mock`. It covers: *Seen by* holding *By site* (pressed), *By hour* and *By day*, in that order; *By day*
  showing the days with no second read; a change of *From* reading again and staying on *By day*; going to *Today*
  and back reopening on 4 weeks and *By site*; on 2 November 2026 the one call is `("2026-10-06", "2026-11-02", start,
  end, offsets)`, identical to by hour's; the week from Sunday, from Monday and from Saturday, each line's count
  taken from its own `weekday` even when the fake answer lists the entries in another order; seven lines, each with
  its name, its clause, its count as text and a bar against the largest, a zero day with `0` and an empty bar; a
  3-day answer's four absent days with the name and *not in these days*, and no count or bar; a 1-day answer's
  *across 1 …*; no ranking, averaging or comparing word (*peak*, *worst*, *best*, *busiest*, *quietest*, *top*,
  *rank*, *average*, *per day*); the coverage note, then the estimates sentence giving *because Cairn counts only
  what it saw* (1 day and several) above the days, with *no site* and *no hour* unchanged on the other two views,
  and none at 0; the standing sentence; a quiet range with the sentence and the seven days under it; sealed, and a
  read that throws, as *By site* shows them; and no streak, *day N*, chain, banned word, or control that changes
  protection. Expected names come from `weekdayInWords`, and clauses from `acrossInWords`.
- [X] Y8 [P] [US2] [scenario 30] Write `src/screens/__tests__/ReachesByDayPage.test.tsx`, inside the notebook as
  `ReachesByHourPage.test.tsx` renders it: the three-option group on the left page under the date boxes; the days on
  the right page, ruled, one to a line (name, clause, bar, count; or name and *not in these days*); the notes off the
  right page; no inline height or overflow; *Which days* still the spread's first child and the same node; focus kept
  on *By day* after pressing it; the same words as Current.
- [X] Y9 [P] [US2] [the list guard] `src/screens/__tests__/ReachesRowGuard.test.tsx`: add the corners for *By day*,
  on the card and on the page: a quiet range keeps its seven days under the sentence, and a non-quiet one draws
  them. *By site*'s and *By hour*'s corners are unchanged, so no part of `seen !== 'site' || !isQuiet(rows)` can
  change without a case failing.
- [X] Y10 [P] [US2] [W1] `src/screens/__tests__/ReachesByHour.test.tsx` and
  `src/screens/__tests__/ReachesByHourPage.test.tsx`: where a test lists the *Seen by* group's buttons, it lists
  three, *By day* `aria-pressed="false"` last. No other expectation changes. They fail because the group has two.
- [X] Y11 [P] [US2] [W1; the pin, row 1] `src/screens/__tests__/TonightCurrentPin.test.tsx`: rewrite each
  `OVER_TIME` case by hand with a third button inserted after *By hour* in the *Seen by* group (Current's *Which
  days* classes, `aria-pressed="false"`, text *By day*). Do not re-capture, and do not touch the `TODAY` or Tonight
  cases. Add `by_weekday` to `tonightCases.ts`'s answers (seven entries, through one helper) only where the type
  requires it. It fails because the group has two buttons.

## Phase 2 — GREEN: the least that passes

- [X] Y12 [US2] [T043; Y2] `src-tauri/src/domain/patterns.rs`: move `by_hour`'s lookup into a private
  `offset_in_force(first_offset, changes, at) -> i32` and call it from `by_hour`, with no change in behaviour
  (`patterns_by_hour.rs` stays green). Add `by_weekday(reaches, first_offset, changes, from, to) -> [u32; 7]` beside
  it, reusing `offset_in_force`, `local_day` and `LocalDate::weekday`. Add `weekdays_in(first_day, last_day) ->
  [u32; 7]`, with `i64` arithmetic, `checked_*` throughout, and saturation to `u32`. `summarize` and
  `crosses_offset_change` are not edited. The module doc gains a line, and `domain/mod.rs`'s table a row for each.
  `check-domain-purity.sh` is clean.
- [X] Y13 [US2] [T043; Y3] `src-tauri/src/reflection/over_time.rs`: `Range` gains `by_weekday: [u32; 7]`, from
  `by_weekday` over the same reaches `by_site` and `by_hour` read, with no estimates, and `weekdays: [u32; 7]`, from
  `weekdays_in(first_day, last_day)`. `assemble`'s signature does not change. `check_range` and `check_offsets` are
  not edited. Depends on Y12.
- [X] Y14 [US2] [T044; Y3, Y4, Y5] `src-tauri/src/ipc/state.rs`: `WeekdayCount { weekday: u8, count: u32, days: u32
  }`. `Patterns` gains `by_weekday` (seven entries zipped from `range.by_weekday` and `range.weekdays`, weekday 0 to 6,
  or `[]` when sealed), with a doc comment naming the numbering (0 = Monday) and W6. `Patterns::sealed` and the
  no-history branch set it to `[]`. The struct's doc no longer says `by_weekday` is absent. `ipc/commands.rs`: only
  the doc comment (*by site, by hour and by day of week*), with the reaches screen still named as the only caller.
  `main.rs` and `ipc_surface.rs` are not touched. Depends on Y13.
- [X] Y15 [P] [US2] [Y6] `src/localDays.ts`: `firstWeekday(locale?)`, built on an exported pure parser of week info
  (preferring `getWeekInfo()`, then `weekInfo`, then Monday, refusing any `firstDay` that is not an integer 1–7) and
  defaulting to `Intl.DateTimeFormat().resolvedOptions().locale`; `weekdayInWords(weekday)`, formatting
  `Date.UTC(2024, 0, 1 + weekday)` with `{ weekday: 'long', timeZone: 'UTC' }`; and `acrossInWords(weekday, days)`.
  None of the three holds reach data or names a `by_*` field.
- [X] Y16 [P] [US2] [T034] `src/ipc/reaches.ts`: `WeekdayCount { weekday, count, days }`, documented with the
  numbering (0 = Monday, not `getDay`'s Sunday), and `Patterns.by_weekday`. The header and `Patterns`' doc say *by
  site, by hour and by day of week*. `summarizeReaches` does not change. In `ReachesOverTime`, `ReachesEdges`,
  `ReachesToday`, `ReachesPage`, `ReachesByHour`, `ReachesByHourPage` and `ReachesRowGuard`'s test fixtures, and only
  where `npm run build`'s typecheck asks, add `by_weekday` to the answer an existing helper builds. No expectation
  changes.
- [X] Y17 [P] [US2] [scenario 30] `src/styles/tonight-page.css`, only if Y8 shows the clause does not sit on one
  ruled line beside the name: a layout rule for it. No colour, font or focus rule of its own: the clause takes
  `nb-reaches-time`'s face, as *Today*'s times do. The 004 contrast and focus guards (`npm run check`) stay green
  unedited. If no rule is needed, close this task saying so.
- [X] Y18 [US2] [T042, T045, T047, T049; Y7, Y8, Y9, Y10, Y11] `src/screens/Reaches.tsx`: `Seen` gains `'weekday'`,
  and *Seen by* gains *By day* after *By hour*. `Reaches` takes `firstDay?: number`, defaulting to `firstWeekday()`
  read once, and passes it to *Over time*. `rowsOf` for `'weekday'` gives seven rows from the first day, each picked
  by its `weekday` value, named with `weekdayInWords`, and carrying `acrossInWords(weekday, days)`. A row with `days`
  0 draws its name and clause only (Q1). In Current the clause sits beside the name in the quiet ink. On the page it
  sits in a `nb-reaches-time` span between the name and the bar. Site and hour rows draw exactly as now. The list
  guard becomes `seen !== 'site' || !isQuiet(rows)`. The estimates sentence takes its reason from the view: *no
  site*, *no hour*, or *Cairn counts only what it saw*. Sealed and could-not-read are shared with the other two.
  Depends on Y15, Y16 and Y17.

## Phase 3 — Hold it

- [ ] Y19 `contracts/ui-ipc.md` and `contracts/patterns.md`, as amended on 2026-10-02 for this slice, match
  `Patterns` and `WeekdayCount` in Rust (`ipc/state.rs`), `by_weekday` and `weekdays_in` in `domain/patterns.rs`, and
  `src/ipc/reaches.ts` field for field. Y3's wire-shape test holds the eight keys.
- [ ] Y20 `make verify` green; `npm run check` (every guard), `npm test`, `npm run lint` and `npm run build` green;
  `cargo fmt --all` and `cargo clippy --all-targets -- -D warnings` clean; the Y1 runs green again. `make smoke` is
  not required: `main.rs` and the composition do not change.
- [ ] Y21 [demo] In the running app, on every platform at hand: a reach's day on *By day* is the day *Today* lists
  it under. A reach recorded a little after midnight is counted on that day, not the day before. The week starts on
  the day the computer's locale gives, and the days are named as the computer names them. This is where the plan's
  *assumed* is seen or refuted: that each webview gives week info or falls back to Monday, that its default locale
  follows the computer's, and that its `Date` applies the zone's rules as Node's does. Record in the demo log the
  platforms seen, the first day and the names each showed, and the platforms not seen.
- [ ] Y22 After the merge, on `main` (the feature's `tasks.md`, `pinned.md` and `spec.md` are the host's): append the
  two pin rows if Y1 has not landed them. Note T039–T045, T047 and T049 as done for by day of week, naming movement as
  what remains (5d). If the owner answers Q1–Q3 other than as recommended, record the answers in `spec.md` beside
  W3, W4 and W2.

## Parallel opportunities

- **Phase 0 runs first and alone.** Y1 records the baseline and gives the host the two rows Y4 and Y11 need.
- **Phase 1:** Y2–Y11 are all `[P]`. Each writes files no other task in the phase touches. Y11 may also touch
  `tonightCases.ts`, which nothing else in the phase edits. Y10 edits the two by-hour test files, which no other
  Phase 1 task touches. The Rust tests (Y2–Y5) and the interface tests (Y6–Y11) can be written by two agents at
  once. Y2–Y5 are written by a different agent than Y12–Y14.
- **Phase 2 has two tracks with disjoint files.**
  - *Core:* Y12 (`domain/patterns.rs`, `domain/mod.rs`), then Y13 (`reflection/over_time.rs`), then Y14
    (`ipc/state.rs`, `ipc/commands.rs`). Each needs the one before it.
  - *Interface:* Y15 (`src/localDays.ts`), Y16 (`src/ipc/reaches.ts` and the fixture-only edits) and Y17
    (`src/styles/tonight-page.css`) run side by side. Then Y18 (`src/screens/Reaches.tsx`).
  - The tracks meet only at the contract, which this plan fixes before Phase 1 (`contracts/ui-ipc.md`, amended).
    The screen tests run against a fake reader and do not wait for the core.
- **Across slices:** `history-movement` (5d) and `first-counted` (5e) edit the same files (`patterns.rs`,
  `over_time.rs`, `state.rs`, `reaches.ts`, `Reaches.tsx`, the wire-shape tests' key lists, the pin's Over time
  cases). Run them after this lands, not beside it. `history-movement` takes the same `offsets` and needs no change
  to the signature.

## Phase 4: Convergence

Pass 1 (2026-10-02). Only `CRITICAL` and `HIGH` re-open the loop; neither task below does.

- [ ] Y23 [US2] [MEDIUM] [W7, FR-022; Principle III] The screen never hides a count the core sent, and the contract
  states only what the core guarantees. Evidence: `check_offsets` accepts, for London 2026-09-15 alone, offsets
  `[{range_start, 14 400}]` (3 hours above the implied +3 600, inside both the start rule and the end rule), and
  `by_weekday` then puts a reach at `range_end − 1 800` on Wednesday, giving counts `[0, 0, 1, 0, 0, 0, 0]` beside
  `days` `[0, 1, 0, 0, 0, 0, 0]` (probe run against `check_offsets`, `by_weekday` and `weekdays_in`, then removed).
  `Reaches.tsx:132` marks a row `absent` on `days === 0` alone, so that reach is drawn as *not in these days*, with
  no count, while *By site* lists it. `contracts/ui-ipc.md` (amendment for this slice) says *a weekday the range
  does not hold has `days` 0 and `count` 0*, which holds only for the offsets the screen sends. RED: a
  `ReachesByDay.test.tsx` case with an entry `{ weekday, count: 1, days: 0 }` that expects its count and bar
  drawn, on the card and on the page; and a `patterns_by_weekday.rs` example pinning the probe above, so the limit
  is stated in a test rather than discovered. GREEN: `absent` only when `days === 0 && count === 0`; the contract
  sentence says the pair is 0 and 0 for the offsets the screen sends, and that an accepted offset list can place a
  reach on a date outside the range (the A3 limit, as by hour has it). Sweep, to close the class: every place
  `Reaches.tsx` drops or hides a value it was sent — `absent`, `isQuiet`, and `rowsOf`'s `find`, which drops a
  weekday missing from the answer instead of drawing all seven (W3) — and every sentence in the two contract
  amendments that claims an invariant of `by_weekday` or `by_hour` that `check_offsets` does not enforce.
- [ ] Y24 [US2] [LOW] [W2, W9] Every branch of the week's first day is pinned, and finding it can never take the
  reaches screen down. Evidence: changing `firstWeekdayOf` (`src/localDays.ts:181`) to fall through to `weekInfo`
  when `getWeekInfo()` returns a `firstDay` outside 1–7 left all 82 tests of `weekdays.test.ts`,
  `ReachesByDay*.test.tsx` and `ReachesRowGuard.test.tsx` green: the case is unpinned. Separately,
  `firstWeekday()` runs in `Reaches`' state initialiser (`src/screens/Reaches.tsx:167`) on every mount, *Today*
  included, and a webview whose `Intl.Locale` is missing or whose `getWeekInfo()` throws would throw there rather
  than open on Monday as the plan says it does. RED in `weekdays.test.ts`: `getWeekInfo` returning `{ firstDay: 9 }`
  beside `weekInfo: { firstDay: 7 }` gives 0 (the plan's reading: the forms are tried by presence, then Monday;
  if the host reads it otherwise, it says so and the expectation flips); `getWeekInfo` returning `undefined` gives
  0; `getWeekInfo` that throws gives 0. GREEN: `firstWeekdayOf` and `firstWeekday` catch and give Monday. Sweep:
  every `Intl` call made on the reaches screen's mount or render path (`firstWeekday`, `weekdayInWords`,
  `hourInWords`) either cannot throw for the values it is given or is covered by the same fallback.

## Convergence

**Converged at pass 1** (2026-10-02, `drive-converge` · host model · delegated, fresh context), against every level: domain, use case, delivery adapter, screen and the published contract. No CRITICAL or HIGH. Y23 (MEDIUM: a hostile but accepted offset list can put a reach on a weekday whose `days` is 0, which the screen then hides as "not in these days") and Y24 (LOW: the invalid-`getWeekInfo` branch is untested, and `firstWeekday()` on the mount path could throw on a webview without `Intl.Locale`) are Phase 4, after the demo.

Principles the diff touches: **I**, *By day* changes the view only (`Reaches.tsx`); **II**, no dependency, the week's first day never leaves the interface, the answer read from the encrypted history and `[]` when sealed (`ipc/state.rs`); **III**, sealed is `[]` not seven zeros, an absent weekday shows no zero, estimates stated with their reason (`Reaches.tsx`) — Y23 its open part; **VI**, no ranking word, banned-words and streaks guards clean.
