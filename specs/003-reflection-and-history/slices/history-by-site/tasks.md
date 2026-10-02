# Tasks — slice `history-by-site`

Numbered `S`. Each names the feature task it carries out (`../../tasks.md`) and the plan's scenarios
(`plan.md`). RED before GREEN, always: a GREEN task starts only once the RED task it answers has been seen
failing for the reason it states. Every task is `[US2]`. `[P]` marks a task whose files no other open task in
its phase touches.

## Phase 0 — Pin: before code that was here changes

- [X] S1 [US2] [pin] Write `src/screens/__tests__/ReachesToday.test.tsx`. It renders `Reaches` with a fake
  `read` (a plain object of two functions, written in the test file, recording its calls) and a fixed `now`
  (an ordinary day, 30 September 2026, 20:00 local). It asserts the screen opens on *Today*, and asks
  `listTodaysReaches` for this local midnight to that instant plus 86 400. It fails only because `Reaches`
  takes no `read` or `now` yet. No `vi.mock`.
- [X] S2 [US2] [pin] `src/screens/Reaches.tsx`: add the optional `read` and `now` props, defaulting to the real
  wrappers and `() => new Date()`, with no other change. S1 and `Reaches.test.tsx` green, and
  `Reaches.test.tsx` is not edited. Hand the host the two rows in `plan.md`, *Pin*, for
  `delivery/survey/pinned.md`.

## Phase 1 — RED: the behaviour, stated as failing tests

- [X] S3 [P] [US2] [T039, T040, T043, T044, T049; scenarios 1–8, 10, 12] Write `src-tauri/tests/us2_by_site.rs`
  against `AppState`, the driving port, seeding the history through `OpenHistory` as
  `us1_write_tonight.rs` does. It covers by site most first, with the edges of the range excluded; changing the
  range and back; the same answer with and without journal entries; a quiet range; gaps cut to the range, with
  a note about *these days*; a range wholly inside a gap; estimates out of `by_site` and counted by date; a
  deleted day adding no gap; sealed, and a history that opens but cannot be read; the no-history build; and the
  serialised keys, exactly five. Every sentence is checked for voice. Written by a different agent than S11–S14.
- [X] S4 [P] [US2] [scenario 9] Write `src-tauri/tests/range_bounds.rs` (`#![cfg(feature = "history")]`, as
  `bounds_and_clipping.rs` is) against `reflection::over_time::check_range`. Each limit is held at its edge and
  one second past it: first day after last; `range_start` at −14 h and +12 h of `first_day`'s UTC midnight;
  `range_end` the same against the day after `last_day`; offsets differing by exactly 2 h and by 2 h + 1 s; a
  range that begins at the present and one second after it. Also a 4-week range across a 23-hour and a 25-hour
  day, accepted.
- [X] S5 [P] [US2] [scenario 5] Write `src-tauri/tests/range_coverage.rs`: `store::gaps::range_coverage_note`
  is `None` for no gaps. It states minutes under an hour, hours under two days, and days from two days up,
  speaks of *these days* and never *today*, and passes the banned-word list. `coverage_note` for a day says
  what it says now (the `gaps` test holds it).
- [X] S6 [P] [US2] [T041; scenario 11] Write `src-tauri/tests/patterns_at_scale.rs`: two years of history at
  50 reaches a day across 300 sites, read through `AppState::summarize_reaches` for the two years, inside
  1 000 ms. The header says what this does not measure, as `at_scale.rs`'s does.
- [X] S7 [P] [US2] [T044] Grow `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs` from 17 to 18 with
  `summarize_reaches` as `Effect::Reads`, so `every_classified_command_is_exposed` fails until it is exposed.
- [X] S8 [P] [US2] [W13] Write `src/__tests__/localDays.test.ts` for `src/localDays.ts`: today's date as
  `YYYY-MM-DD`; a day's bounds as its two local midnights, 23 hours apart on a spring-forward day and 25 on a
  fall-back day (with `process.env.TZ = 'Europe/London'` set at the top of the file, before any date is made); a range's bounds; adding
  days across a month end, a year end and 29 February.
- [X] S9 [P] [US2] [T042, T045, T047; scenarios 13–19] Write `src/screens/__tests__/ReachesOverTime.test.tsx`
  with a fake `read` and a fixed `now`, and no `vi.mock`. It covers the *Today* | *Over time* choice; the
  first call for 2026-09-03 to 2026-09-30 with local-midnight bounds; changing *From* calling again; the range
  forgotten on going back to *Today* and returning; *To* bounded by today and *From* by *To*; the order kept,
  with a count and a bar for each site; no ranking word and no comparison; a quiet range; the coverage note and
  the estimates sentence above the list, the latter only when non-zero; sealed; a read that throws, shown as
  one plain sentence; no streak, *day N*, chain or banned word; and no control that changes protection.
- [X] S10 [US2] [W13; scenario 20] Add the clock-change case to `src/screens/__tests__/ReachesToday.test.tsx`:
  on a 25-hour day (`TZ=Europe/London`, 25 October 2026), *Today* asks for this local midnight to the next one.
  It fails against `start + 86 400`. (Not `[P]` with S1, which writes the same file.)

## Phase 2 — GREEN: the least that passes

- [X] S11 [P] [US2] [S5] `src-tauri/src/store/gaps.rs`: `range_coverage_note(gaps)`, beside `coverage_note`,
  which does not change. The span is in minutes, hours or days; the sentence states the limit and guesses at
  nothing.
- [X] S12 [US2] [S4] `src-tauri/src/reflection/checkin.rs`: extract the rule that an instant could begin a
  given day, as a refactor, with `bounds_and_clipping.rs` and `us1_write_tonight.rs` green before and after.
  `src-tauri/src/reflection/over_time.rs` (new) and `reflection/mod.rs`: `check_range`, using that rule at each
  end, plus the offset limit and the has-begun limit, with the refusal sentence in `plan.md`.
- [X] S13 [US2] [T043; S3] `src-tauri/src/reflection/over_time.rs`: assemble the range from an
  `OpenHistory`: `between`, `gaps_between` cut by `clipped`, `estimates_between(first_day, last_day + 1)`
  counted, and `by_site` from `domain::patterns::summarize` given the reaches and no estimates. Every read
  error is returned as one, never as an empty list. Depends on S11 and S12.
- [X] S14 [US2] [T044; S3, S6, S7] `src-tauri/src/ipc/state.rs`: `SiteCount { domain, count }`, `Patterns` with
  the five fields, and `AppState::summarize_reaches(first_day, last_day, range_start, range_end)`. Bounds are
  checked first, then the history opened through `open_history`, and every refusal becomes the sealed
  sentence. Without the `history` feature, the answer is `NO_HISTORY`. `ipc/commands.rs`: the
  `#[tauri::command]`, whose doc comment names the reaches screen as its only caller. `main.rs`: registered.
  Depends on S13.
- [X] S15 [P] [US2] [W13; S8] `src/localDays.ts`: `localToday(now)`, `dayBounds(day)`,
  `rangeBounds(firstDay, lastDay)` and `addDays(day, n)`, built from the calendar (`new Date(y, m, d)`), never
  by adding seconds. It holds no reach data, so the guard has nothing to say about it.
- [X] S16 [P] [US2] [T034, W14] `src/ipc/reaches.ts`: `SiteCount`, `Patterns` (the five fields), and
  `summarizeReaches(firstDay, lastDay, rangeStart, rangeEnd)`. The wrapper returns what the command returns.
  The screen turns a thrown error into its own sentence (S17).
- [X] S17 [US2] [T045, T047; S9, S10, S1] `src/screens/Reaches.tsx`: the *Today* | *Over time* choice; *Today*
  on `dayBounds`; the over-time view with *From* and *To* (opening on `addDays(today, -27)` to today, and held
  only in component state); the coverage note, then the estimates sentence, above the list; each site with its
  count and a soft bar in one warm theme colour, decorative and `aria-hidden`, with the count as text; *Nothing
  here for these days.* for a quiet range; the standing sentence under the list; sealed; and one plain sentence
  for a failed read. Serif for the headings, as now. Depends on S2, S15 and S16.
- [X] S18 [US2] [W13, refactor] `src/screens/CheckIn.tsx`: replace its own `today()` with `localDays`, with
  every `CheckIn*.test.tsx` green before and after. `quote` also edits this file, so whichever lands second
  rebases. Depends on S15.
- [X] S19 [P] [US2] [H1, guard] `scripts/check-no-ambient-counts.mjs`: remove `History.tsx` from *(Done on `main` by the host in #21, 2026-10-01: a slice may not edit `scripts/` or `eslint.config.js`. Planted `History.tsx` refused by both.)*
  `NAVIGATED_TO`, and say why in its header. `eslint.config.js`: remove it from the reaches block. Verify by
  planting: reach data in a planted `src/screens/History.tsx` fails both, in `Reaches.tsx` it passes, and in
  `App.tsx` it fails. Remove the planted files and record the runs in *Done notes*.

## Phase 3 — Hold it

- [X] S20 `make verify` green; `make smoke` green (`main.rs` changed); `npm run check` (all seven guards),
  `npm test` and `npm run lint` green; `cargo fmt --all` and
  `cargo clippy --all-targets -- -D warnings` clean. Run by the host. This stage builds nothing.
- [X] S21 `contracts/ui-ipc.md`, as amended, matches `Patterns` in Rust (`ipc/state.rs`) and TypeScript
  (`src/ipc/reaches.ts`) field for field, and S3's wire-shape test holds it.
- [ ] S22 After the merge, on `main` (the feature's `tasks.md` and `pinned.md` are the host's): append the two *(The two pin rows landed early, in #21; the feature `tasks.md` ticks remain for after the merge.)*
  pinned rows if S2 has not already; tick T039, T040 and T047 if their by-site halves are all they still owe,
  and otherwise note T039–T045, T047 and T049 as partly done, naming what remains and for which slice (5b–5d,
  `one-day`). Tick W13 in `../write-tonight/tasks.md`, and note W14 as done for `summarizeReaches` only.

## Parallel opportunities

- **Phase 0 runs first and alone.** S2 is the seam that S9, S10 and S17 build on.
- **Phase 1:** S3–S9 are all `[P]`. Each writes one new test file, apart from S7, which writes
  `ipc_surface.rs`, a file no other task touches. The Rust tests (S3–S7) and the screen tests (S8, S9) can be
  written by two agents at once, and S3 must be written by a different agent than S11–S14. S10 follows S1, in
  the same file.
- **Phase 2 has two tracks with disjoint files.**
  - *Core:* S11 (`store/gaps.rs`) runs beside S12 (`reflection/checkin.rs`, `over_time.rs`, `mod.rs`). Then
    S13 (`over_time.rs`), then S14 (`ipc/state.rs`, `commands.rs`, `main.rs`).
  - *Interface:* S15 (`src/localDays.ts`) runs beside S16 (`src/ipc/reaches.ts`). Then S17 (`Reaches.tsx`),
    with S18 (`CheckIn.tsx`) beside it.
  - S19 (`scripts/`, `eslint.config.js`) runs at any point in Phase 2.
  - The two tracks meet only at the contract, which is fixed before Phase 1. The interface tests run against a
    fake reader and do not wait for the core.
- **Across slices:** `quote` edits `CheckIn.tsx`, and so does S18. Run S18 after `quote` lands, or rebase it
  then. `one-day` and `theirs` touch none of this slice's files except `ipc/state.rs`, `commands.rs`, `main.rs`
  and `ipc_surface.rs`, each by adding entries, which merge cleanly.

## Phase 4: Convergence (pass 1)

Appended by converge pass 1 at `eb3468f`. Graded; none is `CRITICAL` or `HIGH`, so none re-opens the loop.

- [X] S23 [US2] [MEDIUM] [Principle III] **A coverage note never states less unobserved time than the gaps
  hold.** Seen: `range_coverage_note` floors (`store/gaps.rs`), so a recorded gap clipped to 30 s at a range
  edge reads *about 0 minutes of these days* while `gaps` is non-empty, and 71 h reads *about 2 days*
  (probe run at `eb3468f` and removed). RED in `src-tauri/tests/range_coverage.rs`: a 30 s gap never says
  *0*, and 71 h says no fewer than the hours it holds (or *nearly 3 days*); *of these days* is not preceded by
  *days* (*about 2 days of these days*). GREEN, the sweep: **every sentence that states a gap's length** —
  `range_coverage_note` and the day's `coverage_note` beside it (same floor, same *0 minutes* after
  `clipped`) — rounds toward admitting more blindness, never less (*less than a minute* below one). The day
  note is pinned (`gaps`, `delivery/survey/pinned.md`): the host adds the row before it changes.
- [X] S24 [US2] [MEDIUM] [Principle III, W14] **The screen turns only a real calendar date into a range, and
  a refused date is never told as an unreadable history.** Seen: `Reaches.tsx:194-199` accepts any non-empty
  string the date input yields that compares below the other bound (a text-field fallback in a webview gives
  `"2026-09-0"` or `"1"`); `rangeBounds` then makes `NaN` or a different day, `LocalDate` deserialisation
  refuses it, `invoke` throws, and the view says *Cairn could not read your history just now*
  (`Reaches.tsx:166,186`), which is untrue. RED in `ReachesOverTime.test.tsx`: a malformed or impossible date
  (`2026-02-30`, a two-digit year) keeps the last good range and never calls the reader. GREEN, the sweep:
  **every place a day string enters `localDays`** (`addDays`, `dayBounds`, `rangeBounds`, and the two
  `change*` handlers) goes through one `isLocalDate(s)` that round-trips `format(parse(s)) === s` with a
  four-digit year; the core's refusal sentence stays the only answer for a date it cannot place.
- [X] S25 [US2] [LOW] [Principle III] **Bound arithmetic cannot overflow.** Seen: `check_range(d, d,
  i64::MIN, 0, 0)` panics at `reflection/over_time.rs:29` in a debug build (probe run and removed); in
  release it wraps. RED in `range_bounds.rs` and `bounds_and_clipping.rs`: `i64::MIN`/`i64::MAX` at each bound
  are refused, not panicked. GREEN, the sweep: **every subtraction on a caller-supplied instant in the
  bounds rules** — `could_begin` and `check_bounds` (`reflection/checkin.rs`), `check_range`'s two offsets and
  their difference — uses `checked_sub`, a `None` being a refusal.
- [X] S26 [US2] [LOW] [plan, *The screen*] **The over-time heading names the range in words**, as the plan
  says and `Reaches.tsx:203` does not (it reads *Over time*). RED in `ReachesOverTime.test.tsx`: on
  30 September 2026 the heading names 3 to 30 September, and follows a change of *From* or *To*. GREEN: the
  heading, with dates in words from the local calendar and no count, *day N* or ranking word in it; the
  standing sentence reads *over these days*, as the plan's Q1 quotes it, not *in these days*.

## Convergence

**Converged at pass 1** (2026-10-01, `drive-converge` · host model · delegated, fresh context), against every level: domain, use case, delivery adapter, screen and the published contract. No CRITICAL or HIGH. S23 and S24 (MEDIUM, Principle III wording) and S25 and S26 (LOW) are Phase 4, after the demo; none re-opens the loop.

Principles the diff touches, with what satisfies each: **I**, no protection control on the screen (`ReachesOverTime.test.tsx`), `summarize_reaches` classified `Reads` (`tests/ipc_surface.rs`), only `Reaches.tsx` imports it (`eslint.config.js` reaches block, `check-no-ambient-counts`); **II**, no new dependency, the range read from the encrypted history through `open_history` and sealed when the key is unavailable (`ipc/state.rs`, `tests/us2_by_site.rs`); **III**, gaps clipped to the range and stated above the list, estimates excluded and stated, the standing sentence under the list, a refused or unreadable range sealed and never empty (`reflection/over_time.rs`, `src/screens/Reaches.tsx`) — S23 and S24 are its open parts; **VI**, no ranking word, comparison, praise, streak or banned word in any state (`ReachesOverTime.test.tsx`, `tests/range_coverage.rs`, `npm run check`).
