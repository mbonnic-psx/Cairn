# Tasks — slice `first-counted`

Numbered `N` (`F` is this slice's gaps review, F1–F7; `S`, `K`, `Y`, `W`, `Q`, `M` and `V` are the slices before it).
Every task is `[US2]` and names the rule of `plan.md` (*Stories and rules*) it implements and the scenarios that hold
it. **Every task in Phase 2 is one RED-GREEN-REFACTOR increment, one rule with its examples, one commit.** Its RED is
written first and seen failing for the reason the task states; only then is its GREEN written. There is no task that
writes tests for several rules, and none that implements without a RED of its own. A rule whose proof would pass the
moment it is written (a negative, or a property of a mechanism an earlier task built) is folded into the task that
produces the behaviour it guards, and the task says so. Each task lists the files it may edit (*Files*). A delegate
edits those and no others, and never this file.

The Rust RED tests are written by a different agent than the one that writes the same task's GREEN (plan,
*Constitution Check*, Delivery Method). Where one agent runs two adjacent tasks in a track, it still hands the RED of
each to a fresh agent.

**Not produced by Spec Kit's tasks command.** The feature's own `../../tasks.md` is a record, not a link, and is not
touched (plan, *Complexity Tracking*). The ledger rows in the plan's *Pin* section, `decisions.md` (D3 answered by F2,
V29's carry closed; D2's V47 and V48 closed by N15 and N16) and the feature `tasks.md`'s ticks are the host's.

**Unix-only APIs.** None is needed. The core reads no zone and no locale. The interface's tests set `process.env.TZ` at
the top of their file, before any date is made, one zone per file (`Europe/London` for the screens, `Pacific/Kiritimati`
for `localDays`). No test depends on the runner's locale: every expected string is derived from the same `Intl` call
made on a fixed instant (plan, *The words*).

**Guards that read source lines, comments included** (plan, *The words*). `check-no-streaks.mjs` refuses `day` followed
by a number: write *the first count's own date*, never a numbered day. `check-banned-words.mjs` reads string literals
in `src/` and `src-tauri/src/`: no *fail*, *denied*, *violation*, *relapse*, *forbidden*, *you lost* in any new string,
including a Rust `"could not fail"`. `check-no-ambient-counts.mjs` refuses `first_counted` / `firstCounted` once N7
lands outside `Reaches.tsx`, `CheckIn.tsx`, `Day.tsx` and `src/ipc/`: `localDays.ts` must not name it (its new function
takes `at`).

**Held from earlier slices, never reintroduced.** This slice edits none of `check_range`, `check_offsets`, `offsetAt`,
`offsetChanges`, `domain::patterns::movement`, `store/gaps.rs`, `counting/presence.rs`, `ipc/commands.rs`, `main.rs`,
`ipc_surface.rs` or `eslint.config.js`. No command is added, and `CLASSIFIED` does not grow.

**Q1–Q4** are decided as recommended (plan, *Questions decided by the owner*, 2026-10-05, "all yes"). No question is
open.

## Phase 0 — Pin: before code that was here changes

- [x] N1 [US2] [pin] On the branch head, before any edit, re-read the constitution's version line (v1.5.0 when this was
  written; `.specify/memory/constitution.md` line 546) and re-check the plan's *Constitution Check* against any later
  version. Then run and record green: `ipc_surface`, `gaps`, `stores`, `journal_store`, `counting_session_pin`,
  `fail_closed`, `us1_write_tonight`, `us2_by_site`, `us2_by_hour`, `us2_by_weekday`, `us2_movement`,
  `range_allocation`, `patterns_at_scale`
  (`cd src-tauri && cargo test -p cairn --no-default-features --features history --test …`), and
  `npx vitest run src/screens/__tests__/TonightWordsKept.test.tsx src/screens/__tests__/ReachesPage.test.tsx src/screens/__tests__/ReachesByHourPage.test.tsx src/screens/__tests__/ReachesByDayPage.test.tsx src/screens/__tests__/ReachesMovementPage.test.tsx src/screens/__tests__/ReachesMovement.test.tsx src/screens/__tests__/ReachesOverTime.test.tsx src/screens/__tests__/ReachesToday.test.tsx src/screens/__tests__/Reaches.test.tsx src/look/__tests__/tonightPage.test.ts src/__tests__/localDays.test.ts`.
  The host appends the seven ledger rows of the plan's *Pin* section to `delivery/survey/pinned.md` before the change
  lands; this task confirms they are there. *Files:* none.
- [x] N2 [P] [US2] [pin; N-C1] Characterise the time before the first record as it reads today, green on this branch's
  head before any RED. In `src-tauri/tests/us2_movement.rs`: for a history whose earliest record is a reach on
  2026-09-07 and the opening range (2026-09-05 to 2026-10-02, `Europe/London`), rows 2026-09-05 and 09-06 are
  `"whole"` with count 0 (H5's limit as it stands). In `src-tauri/tests/us1_write_tonight.rs`: for a day whose first
  record is a gap that began the evening before, `get_day` states the whole gap. Name each test for the behaviour it
  pins, with a comment that rule 8's RED changes it (N13, N14). *Files:* `src-tauri/tests/us2_movement.rs`,
  `src-tauri/tests/us1_write_tonight.rs`.
- [x] N3 [P] [US2] [pin; N-C2] Characterise `OpenHistory::record`: it writes exactly one row and nothing else
  (`table_names` and the row count of each table, before and after), green on this branch's head before any RED. Rule
  4's RED (N11) changes it. *Files:* `src-tauri/tests/stores.rs`.

## Phase 1 — Contracts, the guard, and the time

Five tasks, each with files no other open task touches.

- [x] N4 [P] [US2] [contract; plan, *Contract amendments*] Append the plan's `ui-ipc.md` amendment text, verbatim, as
  *Amended in slice `first-counted` (2026-10-05)* after the `history-movement` amendment. A documentation task: its
  proof is N24's field-for-field match, and its RED is that match failing until the code exists. *Files:*
  `specs/003-reflection-and-history/contracts/ui-ipc.md`.
- [x] N5 [P] [US2] [contract] Append the plan's `patterns.md` amendment (`first_count::unseen`, `gaps_since`, and the
  properties) after the `history-movement` amendment. *Files:* `specs/003-reflection-and-history/contracts/patterns.md`.
- [x] N6 [P] [US2] [contract] Append the plan's `data-model.md` text (`first_count`, one row) under *Additions to the
  encrypted store*, after `reach_estimates`. *Files:* `specs/003-reflection-and-history/data-model.md`.
- [x] N7 [P] [US2] [rule 16; scenario 43; pin row 7; the ambient-counts guard] RED: plant `const at =
  answer.first_counted;` in a new scratch file `src/plantedFirstCounted.ts` (not in `localDays.ts`, which N8 edits; the
  plan names `localDays.ts`, and any file outside the allowed places proves the same refusal) and run `npm run
  check:ambient-counts`. Record that it is **not** refused. GREEN: `REACH_DATA` gains `{ pattern:
  /\bfirst_counted\b|\bfirstCounted\b/, why: 'when Cairn first counted' }`, and the same run refuses the plant, naming
  the file and line. Record that refusal. Remove the plant and run `npm run check` clean (the words appear today in no
  `src/` file). The guard's allowed places do not change. *Files:* `scripts/check-no-ambient-counts.mjs`; the scratch
  `src/plantedFirstCounted.ts`, deleted in the same task.
- [x] N8 [P] [US2] [scenario 42] RED: add to `src/__tests__/localDays.test.ts`, under `process.env.TZ =
  'Pacific/Kiritimati'` at the top of the file if it is not already, `clockTimeInWords(FIRST)` equals exactly
  `new Date(FIRST * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })`, and under the +14 zone it
  names that zone's time, not London's or UTC's. Fails because the function does not exist. GREEN: `src/localDays.ts`
  gains `clockTimeInWords(at: number)`, taking `at`, naming neither `firstCounted` nor `first_counted`. If the file
  already pins another zone, put the test in a new `src/__tests__/clockTime.test.ts` instead. *Files:*
  `src/__tests__/localDays.test.ts` (or `src/__tests__/clockTime.test.ts`, new), `src/localDays.ts`.

## Phase 2 — One rule at a time

Four tracks with disjoint files. **Track A (the store and the wire)** is N9–N11, each needing the one before it, since
all touch `store/history.rs`, `ipc/state.rs` and the Rust test files. **Track D (the domain)** is N12, one task in
`domain/first_count.rs`. **Track A′ (the answers)** is N13 and N14, which need Track A and Track D. **Track B (the
interface)** is N15–N20, each needing the one before it, since all touch `Reaches.tsx`. **Track C (the check-in)** is
N21. The tracks meet only at the contract (N4, N5), and the screen tests run against a fake reader, so B and C wait for
neither A nor D. N22 joins B and C. Within a track no task is `[P]`.

### Track A — the store and the wire (`src-tauri`)

- [x] N9 [US2] [rules 1, 2, 6, 7; scenarios 1, 2, 3, 10, 18, 19, 20; the wire shape] A counting session that is
  accepting and storing is the first count, and it crosses the boundary.
  RED, from the driving port (`AppState`): with a helper that hands over its sockets (`Handing` of
  `counting_session_pin.rs`), `start_counting` at `NOW` makes `summarize_reaches`, `list_todays_reaches` and `get_day`
  each answer `first_counted: NOW`; after `session::stop`, a second `start_counting` at `NOW + 86 400` leaves it `NOW`
  (scenario 1). Silence chosen, protection off and a helper that refuses the sockets each leave every answer at `null`
  (scenario 2). A sealed first run at `T0` writes nothing to `history.db` (bytes unchanged, or no file) and leaves the
  mark at `T0`; the key made available and a start at `T1 = T0 + 6 h` records the gap `[T0, T1)` and
  `first_counted: T1`, with no answer's `gaps` or coverage note holding any of `[T0, T1)` (scenario 3, whose last
  clause also leans on N13 and N14: assert only `first_counted` and the recorded gap here, and the exclusion there).
  `save_journal_entry` returns a `DayView` carrying `first_counted` (scenario 18). Sealed answers carry `null` and
  change no file; a build without the history seals every answer with `NO_HISTORY` and `null` (scenarios 19, 20). The
  serialised `Patterns` holds exactly ten keys, `TodaysReaches` five, `DayView` seven, `first_counted` an integer or
  `null` (scenario 10). `journal_store.rs`'s table list holds five (pin row 4). `us2_by_site.rs`, `us2_by_hour.rs`,
  `us2_by_weekday.rs`, `us2_movement.rs`: each wire-shape test names ten keys, with no other expectation changed.
  Fails because no table, no field and no note exist. Scenarios 2, 3 and 19 are negative proofs over the same
  `begin_counting_session` branch that scenario 1 builds, so they are folded here and may pass at birth; the task as a
  whole fails first. The session is process-global, so scenarios 1, 2 (refused sockets) and 3 live in their own binary.
  GREEN: `store/history.rs` creates `first_count (id INTEGER PRIMARY KEY CHECK (id = 1), at INTEGER NOT NULL)` with the
  other tables, and `OpenHistory` gains `note_counting(at)` (the plan's UPSERT, moving only earlier) and
  `first_count() -> Option<i64>`. `AppState::begin_counting_session` reads the clock once at its top, and after
  `session::start` returns `Counting::Available` and the sink is storing, calls `note_counting` with that instant (by a
  method on `RecordReach` in `counting/sink.rs` or a second connection; the implementer's choice). Nothing is written
  before `session::start`, on a sealed history, or when the start does not count. `DayView`, `TodaysReaches` and
  `Patterns` gain `first_counted: Option<i64>`, and every sealed form and the no-history branch set `None`.
  `src/ipc` is not touched here. No command is added.
  *Files:* `src-tauri/tests/first_counted.rs` (new), `src-tauri/tests/first_counted_session.rs` (new),
  `src-tauri/tests/journal_store.rs`, `src-tauri/tests/us2_by_site.rs`, `us2_by_hour.rs`, `us2_by_weekday.rs`,
  `us2_movement.rs`, `src-tauri/src/store/history.rs`, `src-tauri/src/counting/sink.rs` (only if the note goes through
  the sink), `src-tauri/src/ipc/state.rs`.
- [x] N10 [US2] [rules 3, 6; scenarios 4, 5] An install that already holds history takes the earliest moment it recorded
  anything, once.
  RED: a `history.db` written as the previous build wrote it (the four tables of `history.rs`, no `first_count`, written
  through `rusqlite` with the same `PRAGMA key`) holding reaches at `R1 < R2` and a gap from `G < R1`: any answer says
  `first_counted: G`; reaches only, `R1`; neither, `null`, and a later counting session at `NOW` makes it `NOW`
  (scenario 4). After the fill, a gap from before `G` recorded through `record_gap` and the history opened again leaves
  `first_counted` at `G` (scenario 5). With the key unavailable the file is not opened and the fill waits (rule 6: a
  sealed open writes nothing; asserted by file bytes). Fails because `connect` creates the table empty and never fills
  it.
  GREEN: `OpenHistory::connect`, after the schema step, detects whether `first_count` existed before the open, and if it
  did not, in one `BEGIN IMMEDIATE` transaction creates it and fills it with the earliest of `MIN(reaches.at)` and
  `MIN(coverage_gaps.from_at)` (empty when both are `NULL`). Gaps are read by this fill and never again. The fill
  failing is the schema step failing and seals the history as that step already does.
  *Files:* `src-tauri/tests/first_counted.rs`, `src-tauri/src/store/history.rs`.
- [x] N11 [US2] [rules 4, 5; scenarios 6, 7, 8, 9; N-C2] A reach recorded earlier than the first count moves it back, and
  only erasing everything moves it later.
  RED: with `first_counted` `FIRST`, a reach recorded at `FIRST − 3 × 86 400` makes `first_counted` that instant, and
  `summarize_reaches` for that date's range holds the reach; a reach recorded at `NOW` leaves it unchanged (scenario 6).
  A reach inserted at `FIRST − 3 600` straight into `reaches`, as an older build would write it, moves it to that
  instant at the next open of any answer (scenario 7). `N-C2` is rewritten: `record` still adds exactly one `reaches`
  row and no other row but may add or move the one `first_count` row, in one transaction (a failed note keeps no
  reach). Held proofs, which pass at birth because deletion touches two tables and no code of this task widens that:
  `delete_reach_history(FIRST − 86 400, NOW)` removing every reach and gap leaves `first_counted` at `FIRST` and the
  answer with no gap, and so does `delete_all_reach_history` (scenario 8); `delete_all_data` removes `history.db`, and a
  later `list_todays_reaches` with a fresh key says `null` (scenario 9). They are folded here, after every writer of
  the row exists, so a later writer that widens a deletion is caught. Fails on scenarios 6 and 7 and on N-C2, because
  `record` notes nothing and `connect` never settles.
  GREEN: `OpenHistory::record` inserts the reach and calls `note_counting(at)` in one transaction. `connect`, after the
  fill, reads `MIN(reaches.at)` (answered from the `reaches_at` index) and writes only when it is earlier than the row
  or there is a reach and no row; an ordinary open takes no write lock, and a settle that cannot write is left for the
  next open. Gaps are not read by the settle.
  *Files:* `src-tauri/tests/first_counted.rs`, `src-tauri/tests/stores.rs`, `src-tauri/src/store/history.rs`.

### Track D — the domain (`src-tauri`)

- [x] N12 [US2] [rule 17; scenario 22; contract `patterns.md`] The time before the first count is never presented as
  seen, and no gap's watching is lost after it.
  RED: `src-tauri/tests/domain_first_count.rs` (proptest, no feature gate). For any `first`, any `[from, to)` and any
  sorted, merged gaps inside it: `unseen` is sorted, disjoint and inside `[from, to)`; it covers `[from, min(first,
  to))`; every instant at or after `first` that it covers is inside a gap; with `first` absent it covers `[from, to)`;
  moving `first` later never covers less. `gaps_since` never returns time before `first`, returns the gaps unchanged
  when `first` is absent, and loses no time after `first`. Fails because the module does not exist.
  GREEN: `domain/first_count.rs` with `unseen(first, from, to, gaps)` and `gaps_since(first, gaps)` as `patterns.md`
  (N5) states, pure, with `i64` and `checked_*`/`saturating_*` arithmetic and no platform conditional or I/O.
  `domain/mod.rs` gains `pub mod first_count`, the table row of the plan, and *Nine* becomes *Ten* in its count of
  modules. `check-domain-purity.sh` clean.
  *Files:* `src-tauri/tests/domain_first_count.rs` (new), `src-tauri/src/domain/first_count.rs` (new),
  `src-tauri/src/domain/mod.rs`.

### Track A′ — what the answers say of the time before it (`src-tauri`; needs N9 and N12)

- [x] N13 [US2] [rules 8, 15; scenarios 11–16, 21; N-C1 (`us2_movement`)] In a range, the time before the first count is
  not seen, and never a gap.
  RED: with `first_counted` `FIRST`, reaches at 2026-10-01 15:00 and `1790929800`, and no gaps, the opening range's rows
  2026-09-05 to 09-30 are `"none"` with count 0, 2026-10-01 is `"part"` with count 1 (14 h 14 m of 24 h unseen, M12),
  2026-10-02 is `"whole"` and `so_far` with count 1, `gaps` is `[]` and `coverage_note` is absent (scenario 11); the
  range the screen sends, 2026-10-01 to 2026-10-02, is two rows, `"part"` and `"whole"`, and no note (scenario 12);
  `first_counted` 2026-10-01 08:00 BST makes that row `"whole"` (scenario 13); a gap from 2026-09-30 23:00 to
  2026-10-01 16:00 BST leaves `gaps` `[[FIRST, 2026-10-01 16:00)]` and the note *about 2 hours* (scenario 14); with no
  first count and no reaches, every row is `"none"`, `first_counted` is `null`, and `gaps` is as recorded (scenario 15);
  2026-09-05 to 2026-09-30 asked alone is every row `"none"` with count 0 (scenario 16). N-C1's `us2_movement` pin is
  rewritten to the new reading (rows before the first record are `"none"`), and each `us2_*` fixture notes counting at
  2025-01-01 before its range so every other expectation stands (pin row 1). `range_allocation.rs` passes with no
  change to its bound or assertions (scenario 21). Fails because rows before the first count read `"whole"`.
  GREEN: `reflection/over_time.rs`'s `assemble` reads `history.first_count()`, gives `movement`
  `first_count::unseen(first_counted, range_start, range_end, &gaps)` (the `movement` signature does not change), and
  builds the answer's `gaps` and `range_coverage_note` from `first_count::gaps_since(first_counted, &gaps)`. `Range`
  carries `first_counted` to `Patterns`. `check_range` and `check_offsets` do not change.
  *Files:* `src-tauri/tests/first_counted.rs`, `src-tauri/tests/us2_movement.rs`, `us2_by_site.rs`, `us2_by_hour.rs`,
  `us2_by_weekday.rs`, `src-tauri/tests/range_allocation.rs` (read only; edited only if it must compile), `src-tauri/src/reflection/over_time.rs`,
  `src-tauri/src/ipc/state.rs` (only to pass the field).
- [x] N14 [US2] [rules 8, 9; scenario 17 and N-C1 (`us1_write_tonight`)] On the first day, *Today* and the check-in do not
  call the time before the first count a stretch Cairn was not running.
  RED: with `first_counted` `FIRST` and a gap from 2026-10-01 00:00 to 15:00 BST, `list_todays_reaches` and `get_day`
  for 2026-10-01's bounds each say `first_counted: FIRST` and hold the gap `[FIRST, 15:00)` only, with a coverage note
  for 46 minutes (scenario 17). N-C1's `us1_write_tonight` pin is rewritten: the day whose first record is a gap that
  began the evening before states the gap from the first count, not from the evening. `gaps` and `Reaches.test.tsx`
  keep their expectations. Fails because both answers state the whole gap.
  GREEN: `reflection/checkin.rs`'s `assemble` and `list_todays_reaches` apply `gaps_since` to the day's gaps, so a
  coverage note is built from the cut gaps; `Day` carries `first_counted`.
  *Files:* `src-tauri/tests/first_counted.rs`, `src-tauri/tests/us1_write_tonight.rs`, `src-tauri/tests/gaps.rs` (only if
  a fixture needs a first count), `src-tauri/src/reflection/checkin.rs`, `src-tauri/src/ipc/state.rs`.

### Track B — the interface, *Over time* and *Today* (`src`)

- [x] N15 [US2] [rule 13; scenario 37; pin row 6; closes V47] In all four views a screen reader hears a count with its
  unit.
  RED: write `src/screens/__tests__/ReachesCounts.test.tsx` (`TZ=Europe/London`, a fake `read`, a fixed `now`, no
  `vi.mock`): one answer drawn in each of *By site*, *By hour*, *By day* and *Day by day* has every count element's
  text equal to its grouped number followed by a hidden ` reach` (count 1) or ` reaches` (any other), the line's
  accessible text reads *…week of Nov 3, 2025 … 5 reaches* and not *2025* run into *5*, and an `absent` row (*not seen*,
  *not in these days*) has neither count nor unit. First measure the delta: run `wordsOf` (`beforeTheReveal.ts`) on one
  captured state with the unit in place. If it reads `sr-only` text, `beforeTheReveal.ts` gains `COUNT_UNIT_DELTA`
  beside `DAY_BY_DAY_DELTA` (the captured markup untouched) and `TonightWordsKept`, `ReachesPage`,
  `ReachesByHourPage`, `ReachesByDayPage` and `ReachesMovementPage` apply it; `tonightPage.test.ts` reads the count text
  through the unit. If it does not, record that there is no delta. Fails because a count is a bare number.
  GREEN: `Reaches.tsx` draws `<span className="sr-only"> {count === 1 ? 'reach' : 'reaches'}</span>` inside the count
  span, after the number, only where a count is drawn. Visible text is unchanged. `src/ipc` is not touched.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesCounts.test.tsx` (new),
  `src/screens/__tests__/beforeTheReveal.ts`, `TonightWordsKept.test.tsx`, `ReachesPage.test.tsx`,
  `ReachesByHourPage.test.tsx`, `ReachesByDayPage.test.tsx`, `ReachesMovementPage.test.tsx`,
  `src/look/__tests__/tonightPage.test.ts`.
- [x] N16 [US2] [rule 14; scenarios 38, 39; styling; closes V48] A count is written in the computer's own grouping, and
  every count in a view takes the same width.
  RED, in `ReachesCounts.test.tsx`: a site with 1 234 reaches shows `(1234).toLocaleString()` as its visible count and
  its bar is 100 % (the width still comes from the number, not the text); counts 1 234, 56 and 7 in one view set the
  list's `--nb-count-chars` to the length of the grouped `1,234` and every count element carries the same `min-width`;
  the sheet test (as `ReachesMovementPage.test.tsx` reads `tonight-page.css`) holds `.nb-reaches-count` at
  `min-width: calc(var(--nb-count-chars, 2) * 1ch)` with `tabular-nums` kept. Fails because the number is ungrouped
  and the width is fixed at `2ch`. jsdom lays nothing out, so the measured bar starts are the demo's (N26).
  GREEN: `Reaches.tsx` writes `count.toLocaleString()` and sets `--nb-count-chars` on the list from the largest count's
  grouped text; `tonight-page.css` takes `min-width` from that variable and adds no colour, font or focus rule.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesCounts.test.tsx`, `src/styles/tonight-page.css`,
  the captured-state tests of N15 only where a count over 999 is read.
- [x] N17 [US2] [rule 10; scenarios 23–27; the types] *From* is never earlier than the day Cairn first counted.
  RED: write `src/screens/__tests__/ReachesFirstCounted.test.tsx` (`TZ=Europe/London`, `now` = `NOW`, a fake `read`, no
  `vi.mock`). A reader whose answer carries `first_counted: FIRST` opens *Over time*: the first call is for 2026-09-05
  to 2026-10-02 and the second for 2026-10-01 to 2026-10-02, *From* reads 2026-10-01 with `min` 2026-10-01, and nothing
  from the first answer is ever drawn (*Looking…* stands until the second arrives) (scenario 23). `EARLY` gives one
  call, *From* 2026-09-05, `min` 2025-01-01 (24). Typing 2026-09-20 in *From* under scenario 23's state reads
  2026-10-01 and makes no call for 2026-09-20 (25); typing 2025-06-01 under `EARLY` is taken and one call is made
  (26). An answer with no `first_counted` key has no `min`, and one call (27, which holds the `?:` of the type). A
  `first_counted` after today (a clock moved back) caps the limit at today. Fails because `From` has no limit.
  GREEN: `src/ipc/reaches.ts` gains `first_counted?: number | null` on `TodaysReaches` and `Patterns`, and
  `src/ipc/journal.ts` gains it on `DayView` (the header and docs say a reader treats absent as not yet known).
  `OverTimeView` takes the limit from the latest placed answer that carries the field: a number gives
  `localToday(new Date(first_counted * 1000))` capped at `todayDay`, absent gives none. If the limit is after
  `firstDay`, the answer is not drawn: *Looking…* stays, `firstDay` (and `lastDay`, if earlier) is set to the limit and
  the existing effect asks again. `changeFirst` moves a valid earlier date up to the limit, and *From* gets `min`. The
  limit is component state, not remembered. `summarizeReaches` and `commands.rs` do not change.
  *Files:* `src/screens/Reaches.tsx`, `src/ipc/reaches.ts`, `src/ipc/journal.ts`,
  `src/screens/__tests__/ReachesFirstCounted.test.tsx` (new). Fixtures need no `first_counted` (optional field).
- [x] N18 [US2] [rule 11; scenario 28] Where Cairn has never counted, *From* and *To* are held at today.
  RED: with `first_counted: null`, the second call is for today alone, *From* and *To* read today, *From*'s `min` is
  today, no start sentence appears, and where every row is unseen M13's *Cairn wasn't counting on these days.* stands.
  Fails because `null` is treated as no limit. GREEN: `null` gives the limit `todayDay`, which pulls `lastDay` too.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesFirstCounted.test.tsx`.
- [x] N19 [US2] [rule 12; scenarios 29–34] One sentence names the start, and M16's stays.
  RED: with `EARLY` and the opening range, beside the date boxes stands *Cairn started counting on* followed by
  `shortDateInWords('2025-01-01', true)` and a full stop, and F3's sentence does not appear (29). With scenario 23's
  settled state, among the notes and before any coverage note stands *Cairn started counting at*
  `clockTimeInWords(FIRST)` *on* `shortDateInWords('2026-10-01', false)`, F2's sentence does not appear, in each of the
  four views (30). With `now` in 2027 and a first count in 2026 inside the range, F3's date carries its year (31). The
  expected strings are derived through the same `Intl` calls, so no test depends on the runner's locale. The standing
  sentence *Cairn counts only while it is running. This is what it saw over these days.* closes every state that draws a
  list, unchanged (34). Held proofs, folded because the sentence already exists: *Day by day* rows before 2026-10-01
  read *not seen*, the first count's row reads *partly seen* with its count, no row has a clause about the start (32);
  sealed, unreadable and looking draw neither sentence and leave *From*'s `min` as it was (33). A reusable scan: no
  banned word, no numbered day, no word of *What it never says* (*first day*, *only*, *already*, *welcome*, *new*), no
  congratulation or count up from the start, no control that changes protection. Fails because neither sentence exists.
  GREEN: `Reaches.tsx` draws F3's sentence among the notes when the range's bounds hold `first_counted`
  (`start <= first_counted < end`) and F2's beside the date boxes otherwise when a limit from a number is known, never
  both and never in a sealed state, in the notes' serif face. The date is `shortDateInWords`, the time
  `clockTimeInWords`, the year by `namesYear`.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesFirstCounted.test.tsx`.
- [x] N20 [US2] [rule 9; scenario 35] *Today* says when Cairn started counting, on the first day only.
  RED: with a `TodaysReaches` carrying `first_counted: FIRST` and `now` on 2026-10-01 at 20:00, under the title and
  before the standing note stands *Cairn started counting at* `clockTimeInWords(FIRST)` *today.*; `now` on 2026-10-02,
  `EARLY`, `null`, absent and a sealed answer each show none. The same scan as N19. Fails because *Today* has no
  sentence. GREEN: `Reaches.tsx`'s *Today* draws it when today's bounds (`dayBounds`) hold the instant.
  *Files:* `src/screens/Reaches.tsx`, `src/screens/__tests__/ReachesFirstCounted.test.tsx`.

### Track C — the check-in (`src`; needs N8)

- [x] N21 [US2] [rule 9; scenario 36] The check-in says when Cairn started counting, on the first day only.
  RED: write `src/screens/__tests__/CheckInFirstCounted.test.tsx` (`TZ=Europe/London`, a fake reader, no `vi.mock`). A
  `DayView` for 2026-10-01 with `first_counted: FIRST` shows, before the coverage note, *Cairn started counting at*
  `clockTimeInWords(FIRST)` *today.*; when the day has ended under the open check-in (`thisDay`) it ends *on Thursday 1
  October.*; another day, `null`, absent and a sealed answer show none. The same scan as N19. Fails because the
  check-in has no sentence. GREEN: `CheckIn.tsx` draws it in the class its neighbours use (`nb-checkin-note`). The
  `DayView` type was added by N17; if N21 runs before N17 lands, it adds that one field to `src/ipc/journal.ts` and N17
  does not. *Files:* `src/screens/CheckIn.tsx`, `src/screens/__tests__/CheckInFirstCounted.test.tsx` (new),
  `src/ipc/journal.ts` (only for the field, one of N17 and N21).

### Join — the notebook page and its look (after N16–N21)

- [x] N22 [US2] [rules 9, 12, 13, 14, 16; scenarios 40, 41; styling] The screens on the notebook page, and their look.
  The styles come from the notebook's `src/styles/tonight-page.css` (004 `tonight-page`): F2's sentence under the date
  boxes, F3's with the asides on the left page, *Today*'s and the check-in's on their left pages, each in the class its
  neighbours use (`nb-reaches-aside`, `nb-reaches-note`, `nb-checkin-note`), in the notes' serif and never monospace; the
  count keeps its small label face; no colour that means good or bad, none for *before the first count*.
  *Design steps inside this task.* (1) Before any code, `delivery/skills/frontend-design`'s second pass over the plan,
  applied to the longest sentences (*Cairn started counting at 2:14 PM on Oct 1, 2026.* beside the date boxes' column and
  on the left page of the narrowest layout, and the widest grouped count), with whatever an extension block in
  `AGENTS.md` adds to `/drive`'s *Screen design* rung. (2) RED: write
  `src/screens/__tests__/ReachesFirstCountedPage.test.tsx`, inside the notebook as `ReachesMovementPage.test.tsx` renders
  it: each sentence on the page it belongs to, on the ruling, with no inline height or overflow; *Which days* still the
  spread's first child and the same node; every captured state applies the deltas of N15 (words-kept guard); the voice
  scan of N19 over every state of scenarios 23–39 (scenario 40). (3) GREEN: `tonight-page.css` gains a layout rule only
  if a sentence does not sit on the ruling, and no colour, font or focus rule of its own. The 004 contrast and focus
  guards (`npm run check`) stay green unedited. If the test passes with no rule, close this task saying so: the test
  stays as the guard. jsdom lays nothing out (V25, V32), so the sentence heights are measured in a layout engine across
  en-US and en-GB at `--nb-u` 1px and 2px and the table goes into the demo evidence (N26). (4) Before the demo, review
  the rendered screens against `delivery/skills/web-interface-guidelines`, with whatever an extension block in `AGENTS.md`
  adds to `/drive`'s *Design review* rung. Write the `Designed:` and `Reviewed:` lines under *Design review* below.
  *Files:* `src/screens/__tests__/ReachesFirstCountedPage.test.tsx` (new), `src/styles/tonight-page.css` (only if
  needed), `src/screens/Reaches.tsx` and `src/screens/CheckIn.tsx` (only if the markup must change; then no other task
  of Tracks B and C is open).

## Phase 3 — Hold it

- [x] N23 [US2] [mockups] Write back the states of this slice's white box as committed mockups, one per screen state:
  *Over time* with *From* at the first count's day (F2's sentence), with the range holding the first count (F3's),
  never counted, *Today* and the check-in on the first day, and a grouped count with its width. The writeback goes where
  `check-model` expects it (`delivery/docs/event-model/mockups/`). `delivery/docs/event-model/` does not exist on this
  branch's head (as for the four history slices before it, whose V20 the host closed with no mockups). If it still
  does not, record in the demo log that there is no model here and the host decides. *Files:*
  `delivery/docs/event-model/mockups/` only.
- [x] N24 [US2] `contracts/ui-ipc.md`, `contracts/patterns.md` and `data-model.md`, as amended by N4–N6, match
  `first_counted` on `DayView`, `TodaysReaches` and `Patterns` in Rust (`ipc/state.rs`), `first_count::unseen` and
  `gaps_since` in `domain/first_count.rs`, the `first_count` table in `store/history.rs`, and `first_counted?: number |
  null` in `src/ipc/reaches.ts` and `journal.ts`, field for field. N9's wire-shape tests hold the ten, five and seven
  keys. Every sentence that claims an invariant of the first count is one the core enforces. *Files:* the three
  documents, if they differ.
- [ ] N25 [US2] `make -f delivery/Makefile verify` green; `npm run check` (every guard, including N7's), `npm test`,
  `npm run lint` and `npm run build` green; `cargo fmt --all` and `cargo clippy --all-targets -- -D warnings` clean;
  N1's runs green again. `ipc_surface` passes with `CLASSIFIED` unchanged. Run `make smoke` if `main.rs` or the
  composition changed (the plan says neither does). *Files:* none.
- [ ] N26 [US2] [demo; scenario 44; rule 15] In the running app, on every platform at hand: with a first count on
  2025-01-01 and *From* typed as 1000-01-01, *From* reads 2025-01-01 and *Day by day* draws its weekly rows with the page
  responsive, timed as V29 timed it (`demo/v29-timing.json`), and the figures go into the demo log. On a fresh install
  the opening range is moved up to today's own count, *Today* says *Cairn started counting at … today.*, and the next
  day it does not. With counts over 999 every bar starts at the same place. The time is written as the computer writes
  it, and the demo records what each webview shows (the plan *assumes* each follows the computer's region; this is where
  that is seen or refuted). The measured sentence heights and the bar starts of N16 and N22 go in as a table. Record the
  platforms seen and not seen, and state the freeze's one remaining path (a reach recorded under a clock set centuries
  back, F6). *Files:* the demo log and its evidence only.
- [ ] N27 [US2] After the merge, on `main` (the feature's `tasks.md`, `pinned.md`, `decisions.md` and `spec.md` are the
  host's): note first-counted (5e) as done; D3 answered by F2 and V29's carry closed; V47 and V48 ticked as closed by N15
  and N16; the plan's ledger rows landed. *Files:* none of this slice's.

## Design review

Designed: 2026-10-05, N22 step 1 (frontend-design second pass, before any code; no `AGENTS.md` extension block adds to *Screen design*). The notebook already chose the palette, the serif and the ruling, so the sentences add no look of their own: each takes the class its neighbours use, in the quiet ink at 16 units in the page's serif, and the one count keeps its small label face. Longest sentences: *Cairn started counting at 2:14 PM on Oct 1, 2026.* (about 50 characters) is held to the left page's 34em measure and wraps there to a second line at the narrowest layout; the left page is not ruled (only the right page and the rows are), so a wrapped aside sits on no rule it could miss, and the right page's rows stay 32 units. F2 stands first among the asides, after the Seen by buttons and not between the date boxes and the buttons, so the buttons do not move when an answer arrives (it is still under the date boxes, on the left page); F3 stands in the same place; Today's under its title; the check-in's before the coverage note, in `nb-checkin-note`. The widest grouped count is held by the list's `--nb-count-chars` (N16), so every bar starts together. No colour for good or bad, none for *before the first count*. Measured heights: jsdom lays nothing out, so they are deferred to the demo (N26), across en-US and en-GB at `--nb-u` 1px and 2px; no number is claimed here.
Reviewed: 2026-10-05, N22 step 4, against `delivery/skills/web-interface-guidelines` (every section read; the files are the sentence additions to `Reaches.tsx` and `CheckIn.tsx` and the count rules of `tonight-page.css`; `delivery/docs/design.md` does not exist in this repository, so no disagreement could be raised; no `AGENTS.md` extension block adds to *Design review*). Findings, all clear: accessibility (the sentences are plain paragraphs, no new control, no new heading, the bar stays `aria-hidden`, the count's unit is `sr-only`); focus (no new interactive element, no focus rule added); typography (the time and day are written by the computer's own locale, so its spaces and punctuation are the locale's, counts keep `tabular-nums`; no `...`, no straight quotes); content handling (the left page breaks long words and the sentence wraps inside the 34em measure; the site name keeps `min-width: 0`; empty and unreadable states draw no sentence); locale (counts through `toLocaleString`, times and dates through `localDays`); animation (none added). Nothing needed fixing. One thing is not reviewable without a layout engine and is left to the demo (N26): the rendered heights of the sentences at the narrowest layout, and a date such as *Oct 1, 2026* breaking across lines (no non-breaking space is used; the page text wraps by word, as every other note does).

## Parallel opportunities

- **Phase 0:** N1 runs first and alone. N2 and N3 are `[P]` after it: their files are `us2_movement.rs` with
  `us1_write_tonight.rs`, and `stores.rs`. Both are green before any RED, and both must be green before N9 starts.
- **Phase 1:** N4, N5, N6, N7, N8 are all `[P]`. Their files are `contracts/ui-ipc.md`, `contracts/patterns.md`,
  `data-model.md`, `scripts/check-no-ambient-counts.mjs` with a scratch file, and `src/localDays.ts` with its test. No
  two share a file. N7's plant must not be in `localDays.ts` while N8 edits it (it is not).
- **Phase 2 has four tracks and one join.**
  - *Track A:* N9, N10, N11 in order. Each edits `store/history.rs` and `tests/first_counted.rs`, so no two may run
    together. N9 also edits `ipc/state.rs`, `sink.rs`, `journal_store.rs` and the four `us2_*` wire tests.
  - *Track D:* N12 edits `domain/first_count.rs`, `domain/mod.rs` and `tests/domain_first_count.rs` only. It shares no
    file with Track A and may run beside it.
  - *Track A′:* N13 then N14, after N9 and N12 (they call the field and the domain). Both edit `tests/first_counted.rs`
    and `ipc/state.rs`, so they run one at a time, and not beside N10 or N11 (the shared test file and `state.rs`).
  - *Track B:* N15–N20 in order. Each edits `Reaches.tsx`, so no two may run together. N17 owns `src/ipc/reaches.ts`
    and `journal.ts`.
  - *Track C:* N21 edits `CheckIn.tsx` and its own test, and `journal.ts` only if it lands before N17. It needs N8 and
    is disjoint from Track B's files, so it may run beside any Track B task. If it does, N21 owns the `journal.ts` edit
    and N17 does not touch it.
  - Tracks A, A′ and D (Rust) share no file with B and C (TypeScript). Two agents may run at once, one per language.
    The screen tests run against a fake reader and wait for no Rust task.
  - A fresh agent writes each Rust RED, different from the one writing its GREEN.
- **Join:** N22 waits for N16–N21. It may edit `Reaches.tsx` and `CheckIn.tsx`, so nothing of B or C is open beside it.
- **Phase 3:** N24 reads both languages' code; N25 and N26 need everything above, so they run after Phase 2, one at a
  time. N23 may run beside N24 (disjoint files) once Track B and C are finished.
- **Across slices:** none beside this one is open. It edits `patterns` no further than `history-movement` left it
  (`movement`'s signature is unchanged), and adds instants to the unseen set `movement` already takes.

## Convergence

### Phase Convergence: what pass 1 found still owed

- [x] NC1 [US2] **HIGH** [rule 3, rule 6; Principle II (constitution lines 171–173), *Versioning and Compatibility*
  (lines 429–432)] **Two opens of a pre-slice history at once: the second is sealed.** `OpenHistory::connect` asks
  `table_exists(&connection, "first_count")` (`src-tauri/src/store/history.rs` line 266) *outside* the transaction,
  then runs `FILL_FIRST_COUNT` (line 66). Its `BEGIN IMMEDIATE` and its `CREATE TABLE first_count` (no
  `IF NOT EXISTS`) turn any concurrent first open into `cannot_prepare()`. On the first launch after the upgrade,
  the counting session's open (`ipc/state.rs` line 669) and the interface's first read (`list_todays_reaches`, line
  771; `summarize_reaches`, line 989) can be that pair. If the counting session's open is the one sealed, that run
  stores no reach, writes no mark and notes no first count, under a sentence saying the history could not be got
  ready. That loses a whole session of recording, on an upgrade that "MUST be backward compatible with everything the
  previous release wrote".
  **Reproduction** (pass 1 ran this as a scratch test, then removed it): build a `legacy()` history as
  `tests/first_counted.rs` line 194 writes it. A second keyed `rusqlite` connection runs `BEGIN IMMEDIATE; CREATE TABLE
  first_count (...); INSERT INTO first_count VALUES (1, 1700000000);` and commits from a thread 300 ms later.
  Meanwhile `History::open(dir, key)` returns `is_open() == false`. Control: the same write lock held against a
  history that already has `first_count` opens (`is_open() == true`), so the sealing comes from this slice. A second
  variant also seals where the pre-slice build opened: a writer holding the lock on a legacy file past rusqlite's 5 s
  busy timeout.
  **GREEN, the class:** every schema step in `connect` is safe under any number of concurrent openers of any history
  an earlier build wrote. The fill decides whether it is owed *inside* the write transaction that does it (the
  existence check after `BEGIN IMMEDIATE`, `CREATE TABLE IF NOT EXISTS`), so a loser that finds the table filled
  carries on without filling. A fill that cannot take the write lock leaves the open usable where the table now
  exists, and never seals a history the pre-slice build would have opened. Scenarios in `tests/first_counted.rs`
  through `History::open`: (a) both opens in the race above succeed, and the fill runs once with the earliest moment;
  (b) N threads calling `History::open` on one legacy file all open and agree on `first_count()`; (c) the control
  stays green.
- [x] NC2 [US2] **LOW** [rule 6; Principle III (line 194)] **One of the three answers reads an unreadable first count
  as "never counted".** `list_todays_reaches` takes `history.first_count().unwrap_or_default()`
  (`src-tauri/src/ipc/state.rs` line 791). A read error therefore answers `first_counted: null` and leaves the day's
  gaps uncut, so the time before the first count reads as a stretch Cairn was not running. `get_day`
  (`reflection/checkin.rs` line 94) and `summarize_reaches` (`reflection/over_time.rs` line 134) pass the error on to
  their sealed sentence instead.
  **Reproduction:** found by reading the code. No route through `AppState` makes `SELECT at FROM first_count` fail
  after a successful open without a mutation.
  **GREEN, the class:** every answer that carries `first_counted` treats an unreadable first count the same way: as
  the unreadable sentence with `null`, never as a fact. A store-level scenario pins `list_todays_reaches` beside the
  other two.
- [x] NC3 [US2] **LOW** [rule 12; Principle III (line 194)] **With the clock moved back, the start sentence names
  today, not the day Cairn started.** `limitOf` caps the limit at `todayDay` (`src/screens/Reaches.tsx` line 363).
  The sentence beside the date boxes is made from that capped limit, `startedOnWords(limit)` (line 487), not from
  `startedAt`.
  **Reproduction:** the existing test *caps the limit at today when the first count is after it*
  (`src/screens/__tests__/ReachesFirstCounted.test.tsx` line 151, with `first_counted` on Oct 5 and today Oct 2)
  draws *Cairn started counting on Oct 2, 2026.*, but the history says Oct 5.
  **GREEN, the class:** every sentence that names the start (F2's, F3's, *Today*'s, the check-in's) is made from the
  first count's own instant and its own local date. Only *From*'s `min` and the moved range use the capped limit.
  The test above asserts the sentence's date.

### Verdict: pass 1 (2026-10-05)

**Not converged.** One HIGH (NC1) re-opens the loop. NC2 and NC3 are LOW, and the slice may ship without them.

Gates this pass ran: the six source guards (`check-banned-words`, `check-no-ambient-counts`, `check-no-streaks`,
`check-free`, `check-unix-gated-tests`, `check-domain-purity`) are green on `HEAD` (`d3e6ed1`). `make verify` was not
run (that is N25). `check-slice-scope` is red only because N6 and N7 also ride host PR #65, which is not a finding.

**What the diff proves at each level, and what it does not.**

- *Domain.* `domain/first_count.rs` lines 12–38 (`unseen`) and 42–50 (`gaps_since`) are pure and match
  `contracts/patterns.md`, *Amended in slice `first-counted`*. `tests/domain_first_count.rs` holds rule 17. The
  `coverage` totals narrowed to `u32` (`domain/patterns.rs` lines 467–500) saturate rather than wrap. Nothing missing
  found.
- *Use case and stores.* `NOTE_COUNTING` (`store/history.rs` line 59) only ever moves the first count earlier.
  `record` (lines 324–340) writes the reach and the note in one transaction. The settle (lines 287–302) reads before
  it writes. The note at session start runs only after `Counting::Available` *and* storing (`ipc/state.rs` lines
  692–697). Rules 1–5 are proved through `AppState` and `OpenHistory`. **Not proved:** concurrent opens of a
  pre-slice history (NC1), and how the Today answer handles an unreadable first count (NC2).
- *Delivery adapter.* `TodaysReaches`, `DayView` and `Patterns` carry `first_counted: Option<i64>` (`ipc/state.rs`
  lines 100, 125, 217), with `null` on every sealed constructor. `src/ipc/reaches.ts` and `src/ipc/journal.ts` carry
  it too. No command is added and `CLASSIFIED` is unchanged. The wire tests assert ten, five and seven keys and an
  integer. Nothing missing found.
- *Screen.* *From* is held at the limit (`Reaches.tsx` lines 359–364 and 411–425, `changeFirst` at 435–437, `min` at
  618). The start sentences are at lines 485–493 and 325–330, and in `CheckIn.tsx` at lines 411–417. The unit and the
  grouping are at lines 470–474, 517 and 549–555, with `tonight-page.css` line 209. **Not proved:** the start
  sentence's date when the clock was moved back (NC3).
- *Published contract.* `contracts/ui-ipc.md` lines 288–306 and the amendment to `contracts/patterns.md` match the
  code. The `first_count` table in `data-model.md` (N6, also on PR #65) matches the `FILL_FIRST_COUNT` schema. Nothing
  missing found.

**Each constitution principle the diff touches.**

- **II, encrypted at rest** (line 168): the instant lives in `history.db` under the SQLCipher key, in the
  `first_count` table created at `store/history.rs` line 66. Nothing is written to `last-seen` or `config.json`.
- **II, fail closed** (lines 171–173): a sealed history notes nothing (`History::note_counting`, `store/history.rs`
  line 183), and every sealed answer carries `null` (the sealed constructors in `ipc/state.rs`). **Unmet under
  concurrency:** NC1. Another opener can seal an upgrade open, and recording stops for the run.
- **II, local-first:** the diff adds no crate and no package, so nothing network-capable enters the build graph.
- **III, verified state** (line 194): the note is written only after `session::start` returns `Counting::Available`
  and the sink is storing (`ipc/state.rs` lines 692–697), never on intent. Time before the first count is *not seen*
  and never a gap (`reflection/over_time.rs` lines 134–143, `reflection/checkin.rs` line 103). NC2 and NC3 weaken this.
- **VI, voice and no day counts** (lines 250–256): the sentences name a clock time and a date, never a number of days
  (`Reaches.tsx` lines 370–378 and 328, `CheckIn.tsx` line 415). `check-no-streaks` and `check-banned-words` are green.
- **SC-006, no ambient counts:** the new `REACH_DATA` row (`scripts/check-no-ambient-counts.mjs` line 70) holds
  `first_counted` to the navigated screens. `clockTimeInWords` in `localDays.ts` takes `at` and names nothing else.
- **Versioning and Compatibility** (lines 429–432): the store change is additive, a fifth table, and nothing the
  previous build wrote is altered or discarded. A failed fill rolls back (`store/history.rs` lines 266–271). **Unmet
  under concurrency:** NC1.
- **I, IV, V, VII:** not touched. The diff has no enforcement path, privileged write, notification capability or
  payment path.

## Phase 4: After acceptance

_Placeholder: the adversary pass and the archive, which ride in this slice's own pull request, are appended here by the
host after the demo. No task is derived from this phase._
