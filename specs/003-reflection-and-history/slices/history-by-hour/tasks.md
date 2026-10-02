# Tasks — slice `history-by-hour`

Numbered `K`. Each names the feature task it carries out (`../../tasks.md`) and the plan's scenarios
(`plan.md`). RED before GREEN, always: a GREEN task starts only once the RED task it answers has been seen
failing for the reason it states. Every task is `[US2]`. `[P]` marks a task whose files no other open task in its
phase touches.

**Unix-only APIs.** Any Rust test that touches a Unix-only API (`libc`, a file mode, setting `TZ` for the process)
is `#[cfg(unix)]`, so `cargo test --workspace` stays green on the Windows CI runner. This plan needs none: the core
reads no zone, and every zone in these tests is a fixture of integers. The interface's tests set
`process.env.TZ` at the top of their file, before any date is made, as `localDays.test.ts` and
`TonightCurrentPin.test.tsx` do, one zone per file.

**Q1 and Q2** (`plan.md`, *Open questions*) are the owner's. The tasks are written to the recommendations. If
the owner decides otherwise, Q1 changes K4's scenario 7, and Q2 changes K9's scenario 22 and one branch of K18.

## Phase 0 — Pin: before code that was here changes

- [X] K1 [US2] [pin] On the branch head, before any edit, run and record green: `ipc_surface`, `gaps`,
  `patterns`, `range_bounds`, `range_coverage`, `us2_by_site`, `patterns_at_scale`
  (`cd src-tauri && cargo test -p cairn --no-default-features --features history --test …`), and
  `npx vitest run src/screens/__tests__/TonightCurrentPin.test.tsx src/screens/__tests__/ReachesOverTime.test.tsx src/screens/__tests__/ReachesPage.test.tsx src/screens/__tests__/ReachesEdges.test.tsx src/screens/__tests__/ReachesToday.test.tsx src/screens/__tests__/Reaches.test.tsx src/__tests__/localDays.test.ts`.
  Hand the host the two rows in `plan.md`, *Pin*, for `delivery/survey/pinned.md`. Row 1 lands before K11, and
  row 2 before K5. No new seam is needed: both behaviours are already observed.

## Phase 1 — RED: the behaviour, stated as failing tests

- [X] K2 [P] [US2] [T043; scenarios 1–8] Write `src-tauri/tests/patterns_by_hour.rs` (no feature gate: the domain
  builds with `--no-default-features`) against `domain::patterns::by_hour(reaches, first_offset, changes, from,
  to)`, with `proptest` as `tests/patterns.rs` uses it. Properties: always 24 entries; the sum equals the reaches in
  `[from, to)`; with no changes it equals `summarize(...).by_hour` for that offset; a reach's hour depends only on
  the last change at or before its instant (adding a change after it leaves it alone); the reaches' order does not
  matter. Examples at each fixture instant of scenarios 3–6 and 8, the second before and at each change. It fails
  only because `by_hour` and `OffsetChange` do not exist.
- [X] K3 [P] [US2] [scenario 12] Write `src-tauri/tests/offset_changes.rs` (`#![cfg(feature = "history")]`, as
  `range_bounds.rs` is) against `reflection::over_time::check_offsets`. Each rule is held at its edge and one second
  (or one entry) past it: empty; first `from` not `range_start`; first offset not the one `range_start` implies for
  `first_day`; `from`s not strictly increasing; a `from` at `range_end`; an offset at −12 h and +14 h, and one
  second beyond each; neighbours equal, exactly 2 h apart, and 2 h + 1 s apart; the last offset 2 h and 2 h + 1 s
  from the one `range_end` implies; days + 1 entries, and days + 2. `i64::MIN` and `i64::MAX` in each instant are
  refused, not panicked. London's two-year list and Lord Howe's half-hour list are accepted.
- [X] K4 [P] [US2] [T039, T040, T043, T044, T049; scenarios 1–14, 16] Write `src-tauri/tests/us2_by_hour.rs`
  against `AppState::summarize_reaches`, the driving port, seeding the history through `OpenHistory` as
  `us2_by_site.rs` does, with the plan's London, Lord Howe and New York offsets as fixtures. It covers: all 24 hours
  from midnight, and 24 zeros for a quiet range; the edges of the range; autumn's repeated hour; spring's skipped
  hour still listed; a year whose ends agree; the half-hour change; the same reach under London's and New York's
  offsets and back; 23:59 and 00:01; with and without journal entries; estimates out of the hours and still
  counted; gaps and the coverage note as by site gets them, a range wholly inside a gap, a deleted day adding no
  gap; the offsets refused (one case of each rule, as K3 holds the edges); sealed and unreadable, with `by_hour`
  `[]`; the no-history build (`#[cfg(not(feature = "history"))]`, as `us2_by_site.rs` does it); and the seven
  serialised keys, `dst_approximate` `false` throughout. Every sentence is checked for voice. Written by a different
  agent than K12–K14.
- [X] K5 [P] [US2] [the pin, row 2] `src-tauri/tests/us2_by_site.rs`: every call sends the range's offsets (one
  entry, the offset `range_start` implies, through one helper in the file), and
  `the_answer_serialises_to_exactly_five_keys` becomes `…_seven_keys`, naming `by_hour` and `dst_approximate`, with
  its message saying that `by_weekday` and `movement` are still absent because nothing computed them. No other
  expectation changes. It fails because the command takes four arguments.
- [X] K6 [P] [US2] [T041; scenario 15] `src-tauri/tests/patterns_at_scale.rs`: send London's five-entry offsets
  for the two years, and assert `by_hour` sums to every reach seeded, inside the same 1 000 ms bound. The header
  gains one sentence: the hours are counted in the same pass, and the bound is unchanged.
- [X] K7 [P] [US2] [scenario 17] Write `src/__tests__/offsetChanges.test.ts`, with `process.env.TZ =
  'Europe/London'` at the top, for `offsetChanges(firstDay, lastDay)` and `hourInWords(hour)` in `src/localDays.ts`:
  autumn (2026-10-19..2026-11-01, the change at `1792890000` to 0), spring (2026-03-23..2026-04-05, `1774746000` to
  +3 600), a winter month (one entry), a calendar year (three entries); the first `from` is always
  `rangeBounds(...).start`, `from`s strictly increase, and none is at or after `rangeBounds(...).end`; a change on
  the last day is in; offsets are whole seconds east. `hourInWords` gives 24 distinct labels in order, each in the
  form `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })` gives, interpolated as the pin does, so the
  runner's locale does not matter.
- [X] K8 [P] [US2] [scenario 17] Write `src/__tests__/offsetChangesLordHowe.test.ts`, with `process.env.TZ =
  'Australia/Lord_Howe'` at the top: the four half-hour changes from 2025-10-04 to 2027-04-03 of the plan's table,
  each to the second, with +37 800 and +39 600.
- [X] K9 [P] [US2] [T042, T045, T047; scenarios 18–25] Write `src/screens/__tests__/ReachesByHour.test.tsx`, with
  `process.env.TZ = 'Europe/London'` at the top, a fake `read` and a fixed `now`, and no `vi.mock`. It covers: the
  *Seen by* group under the range, *By site* pressed; *By hour* showing the hours with no second read; a change of
  *From* reading again and staying on *By hour*; going to *Today* and back reopening on 4 weeks and *By site*; on
  2 November 2026 the first call is `("2026-10-06", "2026-11-02", start, end, offsets)` with two offsets, the second
  at `1792890000`; 24 lines from midnight, each with its label, count as text, and a bar against the largest, zero
  hours with `0` and an empty bar; no ranking or comparing word; the coverage note, then the estimates sentence
  saying *no hour* (1 day and several) above the hours, and *no site* still on *By site*, and none at 0; the
  standing sentence; a quiet range with the sentence and the 24 hours under it; sealed and a read that throws, as
  *By site* shows them; nothing about approximation; no streak, *day N*, chain, banned word, or control that changes
  protection.
- [X] K10 [P] [US2] [scenario 26] Write `src/screens/__tests__/ReachesByHourPage.test.tsx`, inside the notebook as
  `ReachesPage.test.tsx` renders it: the group on the left page under the date boxes; the hours on the right page,
  ruled, one to a line (hour, bar, count); the notes off the right page; 24 lines scrolling the page area with no
  inline height or overflow; *Which days* still the spread's first child and the same node; focus kept on *By hour*
  after pressing it, and on *By site* after going back; the same words as Current.
- [X] K11 [P] [US2] [B1; the pin, row 1] `src/screens/__tests__/TonightCurrentPin.test.tsx`: rewrite each `OVER_TIME`
  case by hand with the *Seen by* group inserted after the date boxes' `div` (two buttons in Current's *Which days*
  classes, *By site* `aria-pressed="true"`). Do not re-capture, and do not touch the `TODAY` or Tonight cases. It
  fails because the screen has no group yet. Add a `by_hour` of 24 zeros to `tonightCases.ts`'s answers only if
  the type requires it.

## Phase 2 — GREEN: the least that passes

- [X] K12 [US2] [T043; K2] `src-tauri/src/domain/patterns.rs`: `OffsetChange { from: i64, offset_seconds: i32 }`
  and `by_hour(reaches, first_offset, changes, from, to) -> [u32; 24]` beside `by_site`, reusing `hour_of_day`.
  For each reach in range, `partition_point` finds the change in force. `summarize` and `crosses_offset_change` are
  not edited. Its module doc and `domain/mod.rs`'s table gain one line each. `check-domain-purity.sh` is clean.
- [X] K13 [US2] [T043; K3] `src-tauri/src/reflection/over_time.rs`: `check_offsets(first_day, last_day, range_start,
  range_end, offsets)` with the rules of scenario 12, using `offset_from_midnight` and `LARGEST_CLOCK_CHANGE` and
  `checked_*` arithmetic throughout, and returning `check_range`'s sentence. `assemble` takes the offsets, and
  `Range` gains `by_hour` from `by_hour` over the same reaches `by_site` reads, with no estimates. Depends on K12.
- [X] K14 [US2] [T044; K4, K5, K6] `src-tauri/src/ipc/state.rs`: `HourCount { hour: u8, count: u32 }` and
  `OffsetChange`'s wire form `{ from, offset }` (deserialised, converted at the boundary). `Patterns` gains `by_hour`
  (24 entries, or `[]` when sealed) and `dst_approximate` (`false`, with a doc comment saying why it is always
  false under B4). `summarize_reaches(first_day, last_day, range_start, range_end, offsets)` runs `check_range`,
  then `check_offsets`, then opens the history. `Patterns::sealed` and the no-history branch set both new fields.
  `ipc/commands.rs`: the `offsets` parameter, with the doc comment still naming the reaches screen as the only
  caller. `main.rs` and `ipc_surface.rs` are not touched. Depends on K13.
- [X] K15 [P] [US2] [K7, K8] `src/localDays.ts`: `offsetChanges(firstDay, lastDay)`, from the offsets at each local
  midnight `rangeBounds` would give, searched to the second where neighbours differ, as the plan describes; and
  `hourInWords(hour)`, formatting `Date.UTC(2000, 0, 1, hour)` with `timeZone: 'UTC'` and the log's options. It
  holds no reach data. Both go through `isLocalDate` like every other day string here.
- [X] K16 [P] [US2] [T034] `src/ipc/reaches.ts`: `OffsetChange { from, offset }`, `HourCount { hour, count }`,
  `Patterns.by_hour` and `Patterns.dst_approximate` (documented as always false), and
  `summarizeReaches(firstDay, lastDay, rangeStart, rangeEnd, offsets)`. `largestCount` accepts any list of counts,
  so hours and sites share it.
- [X] K17 [P] [US2] [scenario 26] `src/styles/tonight-page.css`: one layout rule for the *Seen by* container on the
  left page. No colour, no font and no focus rule of its own: the buttons carry `nb-reaches-which__button`'s. The
  004 contrast and focus guards (`npm run check`) stay green unedited.
- [X] K18 [US2] [T042, T045, T047; K9, K10, K11] `src/screens/Reaches.tsx`: `ReachesReader.summarizeReaches`
  gains `offsets`, and the real reader passes it. *Over time* computes `offsetChanges(firstDay, lastDay)` beside
  `rangeBounds` and holds *By site* | *By hour* in component state, opening on *By site*. The *Seen by* group sits
  under the date boxes in every state. *By hour* draws 24 lines from `by_hour` with `hourInWords`, the count as text
  and an `aria-hidden` bar, in Current's `li` and on the page's `nb-reaches-line`. The estimates sentence names *no
  hour* or *no site* by the view. A quiet range shows *Nothing here for these days.* and the 24 hours (Q2). Sealed
  and could-not-read are shared with *By site*. Depends on K15, K16 and K17.

## Phase 3 — Hold it

- [ ] K19 `contracts/ui-ipc.md` and `contracts/patterns.md`, as amended on 2026-10-02, match `Patterns`, `HourCount`
  and `OffsetChange` in Rust (`ipc/state.rs`, `domain/patterns.rs`) and TypeScript (`src/ipc/reaches.ts`) field for
  field, and K4's wire-shape test holds the seven keys.
- [ ] K20 `make verify` green; `npm run check` (every guard), `npm test` and `npm run lint` green; `cargo fmt --all`
  and `cargo clippy --all-targets -- -D warnings` clean; the K1 runs green again. `make smoke` is not required:
  `main.rs` and the composition do not change.
- [ ] K21 [demo] In the running app, on every platform at hand: a reach's hour on *By hour* is the hour *Today*
  prints for it; and a range across the last clock change, set by moving *From*, places a reach recorded after it
  by the clock as it then read. This is where the plan's *assumed* (that the webview's `Date` applies the zone's
  rules as Node's does) is seen or refuted. Record the platforms seen and those not seen in the demo log.
- [ ] K22 After the merge, on `main` (the feature's `tasks.md`, `pinned.md` and `spec.md` are the host's): append
  the two pin rows if K1 has not landed them. Note T039–T042, T044, T045, T047 and T049 as done for by hour, naming
  by day of week and movement as what remains (5c, 5d). Close T046 as superseded by B4. If the owner answers Q1 as
  recommended, amend B4's gloss in `spec.md` with the owner's words.

## Phase 4 — Convergence (pass 1)

Appended by converge pass 1 at `28982cd`. Graded; K23 is `HIGH` and re-opens the loop, K24 rides with it.

- [X] K23 [US2] [HIGH] [Principle III] **A range whose first midnight the clock skips is placed, not sealed.**
  Seen: in a zone that puts its clocks forward at 00:00 (Africa/Cairo 2026-04-24, America/Santiago 2026-09-06,
  America/Havana 2026-03-08, Asia/Beirut 2026-03-29; found with Node under each `TZ`), `new Date(y, m, d)` is
  01:00 at the new offset, so `rangeBounds(...).start` implies the old offset (Cairo +7 200) while
  `offsetChanges(...)[0].offset` is the one in force there (+10 800). `check_offsets` demands they be equal
  (`reflection/over_time.rs:186`, and `contracts/ui-ipc.md`'s rule "the first offset is the one `range_start`
  implies"), so the whole *Over time* answer, *By site* included, is the sealed sentence for every range that
  begins on that day. `check_range` accepts the same bounds. Probe at `28982cd`: `check_offsets(2026-04-24,
  2026-04-30, 1_776_981_600, …, [(1_776_981_600, 10_800)])` returned the sealed sentence; probe removed. This is
  a regression for *By site*, which placed that range before this slice. RED in `src-tauri/tests/offset_changes.rs`:
  that Cairo range, and the Santiago one, are accepted with the offsets `offsetChanges` sends, and a first offset
  more than a clock change from the implied one is still refused; and in a new `src/__tests__/offsetChangesCairo.test.ts`
  (`process.env.TZ = 'Africa/Cairo'`) the list `offsetChanges` gives for a range starting 2026-04-24. GREEN: amend
  the rule in `contracts/ui-ipc.md` (the first offset is the one in force at `range_start`, within a clock change of
  the one it implies, and no further), then `check_offsets`. The sweep: **every rule in the core that compares an
  offset the interface states with the one an end implies** — the first entry (`over_time.rs:186`), the last
  (`over_time.rs`, `within_a_clock_change(previous.1, implied_offset(day_after_last, range_end)?)`), and
  `check_range`'s two ends — each held at a skipped midnight and at a repeated one (a zone falling back at 01:00 to
  00:00, America/Havana 2026-11-01), at the start and at the end of a range. Record in the verdict what each gave.
- [X] K24 [US2] [MEDIUM] [Principle III] **A clock change exactly at the range's end is pinned as outside it.**
  Seen: `localDays.ts:139` (`if (high < end)`) excludes a change at `end`, which is right (the core refuses an
  entry at or after `range_end`), but no test reaches it: the London and Lord Howe cases change away from midnight.
  Mutating it to `high <= end` left all 79 frontend files green (2 488 tests) at `28982cd`; mutation restored.
  The case is real: in Cairo a range ending 2026-04-23 ends at the change's instant, and the mutant would send an
  entry the core refuses, sealing the range. RED in the K23 Cairo test file: that range gives exactly one entry.
  The sweep: **every boundary of `offsetChanges`' loop in a zone that changes at midnight** — a change at the
  range's start, at its end, and at a midnight inside it (Cairo 2026-04-20 to 2026-04-30: one change, at
  1_776_981_600) — each pinned, with the expected list derived independently of `offsetChanges` (fixed epoch
  constants, as the London file has).

## Phase 5 — Convergence (pass 2)

Appended by converge pass 2 at `4fb1156`. K23 and K24 closed; one `LOW`, which does not re-open the loop.

- [ ] K25 [US2] [LOW] [Principle III] **A skipped-midnight range is placed through the command, not only the check.**
  Seen: K23's fix is pinned at `check_offsets` (`src-tauri/tests/offset_changes.rs`), and `AppState::summarize_reaches`
  calls it directly (`src-tauri/src/ipc/state.rs:829`), but no test at the adapter (`src-tauri/tests/us2_by_hour.rs`,
  `with_history`) asks a range whose first midnight the clock skips — the level where pass 1's regression showed as
  the sealed sentence in place of *By site* and *By hour*. RED in `us2_by_hour.rs`: Cairo 2026-04-24 to 2026-04-30
  (`range_start` 1_776_981_600, offsets `[(1_776_981_600, 10_800)]`), with a reach at `range_start + 60`, answers
  placed, with that reach in *By site* and in hour 01 (not 00). GREEN: no production change expected. The sweep:
  **the same range asked through the command with each first offset the core accepts at that skipped midnight** —
  the old (+7 200, bucketing the reach in hour 00) and the new (+10 800, hour 01) — each placed, and one more than a
  clock change from the implied one sealed.

## Parallel opportunities

- **Phase 0 runs first and alone.** K1 records the baseline and gives the host the two rows K5 and K11 need.
- **Phase 1:** K2–K11 are all `[P]`. Each writes one file no other task in the phase touches (K11 may also touch
  `tonightCases.ts`, which nothing else in the phase edits). The Rust tests (K2–K6) and the interface tests
  (K7–K11) can be written by two agents at once. K2–K6 are written by a different agent than K12–K14.
- **Phase 2 has two tracks with disjoint files.**
  - *Core:* K12 (`domain/patterns.rs`), then K13 (`reflection/over_time.rs`), then K14 (`ipc/state.rs`,
    `ipc/commands.rs`). Each needs the one before it.
  - *Interface:* K15 (`src/localDays.ts`), K16 (`src/ipc/reaches.ts`) and K17 (`src/styles/tonight-page.css`) run
    side by side. Then K18 (`src/screens/Reaches.tsx`).
  - The tracks meet only at the contract, which the plan fixes before Phase 1 (`contracts/ui-ipc.md`, amended).
    The screen tests run against a fake reader and do not wait for the core.
- **Across slices:** `history-by-weekday` and `history-movement` edit the same files (`patterns.rs`,
  `over_time.rs`, `state.rs`, `reaches.ts`, `Reaches.tsx`, `us2_by_site.rs`'s key list, the pin's Over time cases).
  Run them after this lands, not beside it. Each takes the offsets this slice adds, so neither needs a second
  amendment to the signature.

## Convergence

**Converged at pass 2** (2026-10-02, `drive-converge` · host model · delegated, fresh context, both passes). Pass 1 found K23 (HIGH: a range starting on a midnight the clock skips was sealed, By site included) and K24 (MEDIUM: the range-end edge of `offsetChanges` untested); both fixed (`46ef1ac`, `03709d1`) and confirmed closed in pass 2 by re-running pass 1's reproductions and mutants, and by an independent probe across all 418 IANA zones (0 ranges sealed; 8 per spring-forward-at-midnight zone under the old rule). K25 (LOW, the same case through `AppState`) is Phase 5, after the demo; it does not re-open the loop. Observation left to the owner: the first-offset rule could be tightened to `[implied, implied + 2 h]` (a contract change).

Principles the diff touches: **I**, `summarize_reaches` stays `Reads` (`tests/ipc_surface.rs`), no protection route on the screen; **II**, offsets are a request parameter, discarded after use, nothing stored or sent (`ipc/state.rs`), "domain and timestamp only" holds under B4 clarified; **III**, hours exact by the offset in force at each instant (`domain/patterns.rs`), a placeable range placed and an unplaceable one refused (`reflection/over_time.rs` `check_offsets`, `src/localDays.ts`), the time Cairn did not see and the estimates exclusion stated in both views (`src/screens/Reaches.tsx`); **VI**, hours in clock order, no peak, worst or busiest wording, a quiet hour a plain zero row (`Reaches.tsx`).
