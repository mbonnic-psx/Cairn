# Plan — slice `history-by-site`

**Feature**: `003-reflection-and-history` | **Slice**: 5a of `story-split.md` | **Date**: 2026-10-01

On the reaches screen, a person chooses *Over time* beside *Today*. The view opens on the last 4 weeks, ending
today. It lists the sites they reached for, the most first, each with its count and a soft bar. Any period
Cairn was not counting is stated above the list. They can change the range, and the choice is not remembered.
By hour, by day of week and movement are slices 5b–5d.

**How this plan was made.** 003 was planned whole, before the delivery method arrived: `../../plan.md`,
`../../research.md`, `../../data-model.md` and `../../contracts/` are committed and stand, apart from their
announcement parts, which are withdrawn. This plan takes this slice's part of them and does not repeat them.
It does not run Spec Kit's plan command through the links `/drive` prescribes, because those links would write
over the feature's committed plan (see *Complexity Tracking*). Where this slice departs from the feature plan,
the departure is named here: no `History.tsx` (H1), and `summarize_reaches` takes days and bounds rather than
one offset (`../../contracts/ui-ipc.md`, amended).

## Scope

In, from `../../tasks.md`:

- T034, its second half: the range read in `src/ipc/reaches.ts`.
- T039, T040: by site only. A breakdown is available with no journal entry, and an empty range is quiet.
- T041: by site only. Cost at two years of history.
- T042, retargeted from `History.test.tsx` to the reaches screen (H1): by site, range change, and no streak
  or day count.
- T043, by site only, in `reflection/over_time.rs` rather than `reflection/mod.rs`.
- T044: `summarize_reaches`, sending `by_site`, `gaps`, `coverage_note`, `estimates_excluded` and `sealed`.
  The contract defect T044 records is settled by the amended signature.
- T045, retargeted from `History.tsx` to `Reaches.tsx` (H1): by site and the range control.
- T047, on the same screen: the copy for a quiet range.
- T049, by site only (a US3 test, pulled forward because H4 and FR-023 hold here): an estimate never enters
  by site, and its exclusion is stated.

Also carried from `write-tonight`'s Phase 4, because this slice reads ranges and changes `Reaches.tsx`:

- W13: one shared local-day computation. *Today* moves from `start + 86 400` to the next local midnight.
- W14, for the one wrapper this slice adds: a transport failure becomes one plain sentence in voice, never
  the error's own text.

Out:

- By hour, `dst_approximate` and T046's notice: `history-by-hour`.
- By day of week: `history-by-weekday`.
- Movement (FR-020, US2 scenario 2): `history-movement`.
- T048, T050–T052 (one day, whole): `one-day`.
- Every deletion command (FR-018): `theirs`.
- FR-025 (reaches of a site removed from the trail). It holds by construction, because `by_site` reads the
  history and never the trail. No scenario is added for it here.
- `History.tsx` and `History.test.tsx` are not created, by H1.

Acceptance: US2 scenarios 1 (by site, and changing the range), 3, 4 and 5; FR-019 (by site), FR-022,
FR-022a, FR-023 and FR-024; SC-005 to SC-008 as they bear on by site; the gaps review H1–H4 in
`../../spec.md`.

## Acceptance, as scenarios through the driving port

Constitution v1.4.0, *Acceptance-Driven Development*. In the Rust scenarios, each **When** enters through
`AppState::summarize_reaches`, as the IPC command serves it, and each **Then** is observed in what it returns.
In the screen scenarios, each **When** is the person acting on the reaches screen, the screen that calls that
command, and the **Then** is what the screen shows and what it asked the command for.

Written against one fixed range: 4 weeks, `first_day` 2026-09-03 to `last_day` 2026-09-30, with its bounds
computed as the interface computes them.

1. **By site, most first (US2 scenario 1, H3).** **Given** reaches in the range at `a.example` ×5,
   `c.example` ×2 and `b.example` ×2, one reach at `a.example` the second before `range_start`, and one at
   `range_end` itself, **When** `summarize_reaches(first_day, last_day, range_start, range_end)` is called,
   **Then** `by_site` is `[a.example 5, b.example 2, c.example 2]`: most first, equal counts by name. The
   reaches outside `[range_start, range_end)` are in no count, and `sealed` is absent.
2. **Changing the range (US2 scenario 1, FR-019).** **Given** the same history, **When** it is called for
   the last week alone, **Then** `by_site` holds only that week's sites and counts. **And when** it is called
   for the 4 weeks again, **then** the answer is the first one, unchanged.
3. **No journal entry needed (US2 scenario 3, T039).** **Given** reaches and no journal entry ever written,
   **When** it is called, **Then** `by_site` is complete. **And given** the same reaches with entries written
   on three of the days, **then** the answer is identical.
4. **A quiet range (US2 scenario 4, FR-024, T040).** **Given** a range with no reaches and no gap, **When** it
   is called, **Then** `by_site` is `[]`, `gaps` is `[]`, `coverage_note` and `sealed` are absent, and
   `estimates_excluded` is 0.
5. **What Cairn did not see (H4, FR-022, SC-007).** **Given** a gap from two days before `range_start` to
   six hours after it, and one of three hours inside the range, **When** it is called, **Then** `gaps` holds
   both, the first cut to begin at `range_start`. `coverage_note` states about nine hours, in voice, speaking
   of *these days* and never of *today*. **And given** a range lying wholly inside one gap, **then**
   `by_site` is `[]` and the coverage note is present. An unobserved range is never answered as a zero.
6. **An estimate is not a reach (H4, FR-023, SC-008, T049).** **Given** the person's own estimates on two
   days inside the range and one on the day after it, **When** it is called, **Then** `by_site` is what the
   reaches alone give, and `estimates_excluded` is 2.
7. **A deletion is not a gap (FR-022a).** **Given** reaches over the range and one day of them deleted
   through the history store, **When** it is called, **Then** `by_site` counts only what remains, and no gap
   and no coverage note appear on that day's account.
8. **Sealed, and a read that does not go through (Principle II, III).** **Given** the key is unavailable,
   **When** it is called, **Then** `sealed` holds the sentence, and `by_site` and `gaps` are empty with no
   note. **And given** a history that opens but cannot be read, **then** the answer is the sealed sentence,
   never an empty range. This is the difference from `list_todays_reaches`, which reads a failure as an
   empty day (`unwrap_or_default`). That is not this slice's code to change, and it is recorded below.
9. **Bounds that are not the range (the contract, amended).** **When** it is called with
   `first_day > last_day`, with a `range_start` that could not begin `first_day` anywhere, with a
   `range_end` a day short, with ends whose offsets differ by 3 hours, or with a range that begins after the
   present, **Then** each is refused with one plain sentence in `sealed`, and nothing else is returned.
   **And when** a range holds a 23-hour and a 25-hour day, with offsets differing by one hour, **then** it is
   accepted. Each limit is held exactly at its edge, as `bounds_and_clipping.rs` holds `check_bounds`.
10. **A build without the history.** **Given** `--no-default-features`, **When** it is called, **Then**
    `sealed` is the sentence that this build keeps no history, as `get_day` says it.
11. **At scale (SC-006, T041).** **Given** two years of history with 50 reaches a day across 300 sites,
    **When** it is called for the two years, **Then** it answers well inside a bound that catches an
    accidentally quadratic path (1 000 ms, as `at_scale.rs` bounds its own cost). This is Cairn's own cost.
    It is not a measurement of what a person perceives.
12. **The wire shape (Principle III).** **When** the answer is serialised, **Then** it holds exactly
    `by_site`, `gaps`, `coverage_note`, `estimates_excluded` and `sealed`: no `by_hour`, `by_weekday`,
    `movement` or `dst_approximate`, which would be a claim that nothing computed.

The screen, `Reaches.tsx`, given a fake reader in the test tree:

13. **Where it lives (H1).** **Given** the reaches screen opened from the header's *Today*, **Then** it shows
    *Today* as before, with a choice of *Today* and *Over time*. **When** the person chooses *Over time*,
    **Then** the over-time view replaces the day, on the same screen. Nothing in the shell changes.
14. **The range it opens on (H2).** **Given** it is 30 September 2026, **When** *Over time* is chosen,
    **Then** the screen calls `summarize_reaches("2026-09-03", "2026-09-30", start, end)`, with `start` and
    `end` the local midnights, and its fields show those two dates. **When** the person changes the first
    day, **Then** the screen calls it again for the new range. **And when** they go to *Today* and back, or
    leave the screen and return, **then** it opens on the last 4 weeks again: the choice is not remembered.
    The last day cannot be after today, and the first cannot be after the last.
15. **How it reads (H3).** **Given** three sites, **When** the view shows them, **Then** they are in the
    order given, each with its count and a bar whose length is its count against the largest. The bars share
    one warm colour. No text says *top*, *worst*, *best*, *most problematic* or *rank*, nothing compares with
    another range, and nothing congratulates a short list.
16. **A quiet range on the screen (FR-024, T047).** **Given** `by_site` is `[]` and nothing is sealed,
    **Then** the view says *Nothing here for these days.* with the standing coverage sentence, and no word of
    praise or warning.
17. **Stated above the list (H4, FR-023).** **Given** a coverage note, **Then** it stands above the list.
    **Given** `estimates_excluded` is 2, **Then** a sentence above the list says the person's own estimates
    for 2 days are not in it, because an estimate has no site. **Given** it is 0, no such sentence appears.
18. **Sealed and unreachable.** **Given** `sealed`, **Then** the view shows the sentence and no list.
    **Given** the read itself throws, **Then** the view shows one plain sentence in voice, and never the
    error's text (W14).
19. **No streak, no day count (US2 scenario 5, FR-033, SC-010).** **Given** any of the states above, **Then** no text
    holds a streak, a *day N*, a chain or *in a row*, and no banned word.
20. **Today's bounds (W13).** **Given** it is 25 October 2026 in a zone whose clocks go back that night (a
    25-hour day), **When** the reaches screen opens on *Today*, **Then** it asks `list_todays_reaches` for
    this local midnight to the next one, not `start + 86 400`.

## Structure Decision

The one deployable this touches is `src-tauri` (the core: IPC, the orchestration, the encrypted store), with
the screen in `cairn` (the interface). Both purposes in `project.json` cover it, and nothing new is a service.
One vocabulary is in play (a reach, a site, a range of days, a gap), the same as `write-tonight`'s, so there is
one bounded context, and saying so is the whole decision. The layering is the feature plan's, unchanged:

```text
src-tauri/src/
├── reflection/over_time.rs  # NEW: check_range (the bounds), by_site assembled from the history
├── reflection/checkin.rs    # MODIFIED (refactor): the "could this instant begin that day" rule, shared
├── reflection/mod.rs        # MODIFIED: `pub mod over_time`
├── store/gaps.rs            # MODIFIED: range_coverage_note, beside coverage_note (unchanged)
├── ipc/state.rs             # MODIFIED: Patterns, SiteCount, AppState::summarize_reaches
├── ipc/commands.rs          # MODIFIED: the #[tauri::command]
└── main.rs                  # MODIFIED: one handler registered
src-tauri/tests/
├── us2_by_site.rs           # NEW: scenarios 1–8, 10, 12
├── range_bounds.rs          # NEW: scenario 9, each limit at its edge
├── range_coverage.rs        # NEW: the range sentence (minutes, hours, days), in voice
├── patterns_at_scale.rs     # NEW: scenario 11 (T041, by site)
└── ipc_surface.rs           # MODIFIED: CLASSIFIED 17 → 18, `summarize_reaches` as Effect::Reads
src/
├── localDays.ts             # NEW: today's date, a day's bounds, a range's bounds, adding days
├── __tests__/localDays.test.ts               # NEW: 23- and 25-hour days, month and year ends
├── ipc/reaches.ts           # MODIFIED: Patterns, SiteCount, summarizeReaches
├── screens/Reaches.tsx      # MODIFIED: Today | Over time; the over-time view; Today on localDays
├── screens/CheckIn.tsx      # MODIFIED (refactor): its own today() replaced by localDays
├── screens/__tests__/ReachesToday.test.tsx    # NEW: the pin, then scenario 20
└── screens/__tests__/ReachesOverTime.test.tsx # NEW: scenarios 13–19
scripts/check-no-ambient-counts.mjs           # MODIFIED: History.tsx leaves the allowlist (H1)
eslint.config.js                              # MODIFIED: History.tsx leaves the reaches block (H1)
```

`by_site` comes from `domain::patterns::summarize`, which is already merged and holds the ordering rule
(contracts/patterns.md, property 5). The orchestration passes it the range's reaches and **no estimates**, and
reads `by_site` alone. `estimates_excluded` is counted from `OpenHistory::estimates_between(first_day,
last_day + 1)`, by the estimates' own dates. `summarize` would count them through a day window it derives from
one offset (R4), and at a clock change inside the range that window can take in a day beyond `last_day`. By
site has no hour, so it has no reason to accept that approximation.

**The range's bounds.** The interface computes them as `write-tonight` computes a day: `range_start` is the
local midnight beginning `first_day`, `range_end` the local midnight after `last_day`, both from the calendar
(`new Date(y, m, d)`), never by adding seconds. `src/localDays.ts` holds that computation once, and *Today*,
the check-in and *Over time* all use it (W13). The core cannot know the person's zone, so it holds the
interface to what is true in every zone. `check_bounds` reasons that a day's start lies between 14 hours
before and 12 hours after its date's UTC midnight. `check_range` applies that rule at each end: to `range_start`
against `first_day`, and to `range_end` against the day after `last_day`. Then it adds the two rules a range
needs and a day does not: the ends' offsets differ by no more than 2 hours, and the range has begun. The shared
rule is extracted from `check_bounds` as a refactor, under the tests that already hold it, and `check_bounds`
does not change behaviour. A refusal is the sealed sentence, as `get_day`'s is: *Cairn could not tell which
days those are just now, so it has shown nothing. Protection is unaffected.* There is no upper limit on a
range's length. Two years is what SC-006 asks to be fast, and scenario 11 measures it.

**The screen.** `Reaches` gains two optional props beside `today`: `read`, the two reach wrappers, and `now`.
The screen's tests pass a fake written in the test tree, as `AGENTS.md` asks. The default props are the real
wrappers and the real clock. `write-tonight`'s screen tests used `vi.mock`, and this slice does not follow
them. *Over time* holds its range in component state only, so it opens on 4 weeks each time it is chosen. Its
two `<input type="date">` fields, *From* and *To*, are bounded so the last day is at most today and the first
at most the last. The heading stays *Today* for the day, and the over-time heading names the range in words.

## The ambient-counts guard stays green (H1)

`summarize_reaches`, `summarizeReaches`, `by_site` and `estimates_excluded` are already reach data to
`check-no-ambient-counts.mjs`. They appear only in `src/ipc/reaches.ts`, a typed wrapper, and in
`src/screens/Reaches.tsx`, which is on the allowlist. `App.tsx` does not change: the header still says
*Today*, and the choice of *Over time* is made on the screen. So the guard passes without being edited to
pass.

It is edited once, to forbid more. H1 decides that by-site history never has a screen of its own, and
5b–5d live on the same screen. So `src/screens/History.tsx` leaves the guard's `NAVIGATED_TO` and the
reaches block in `eslint.config.js`. An allowlisted file nobody may write is a hole waiting for someone to
write it. `Day.tsx` stays, for `one-day`. The change is verified the way T002 verified the guard, by planting
cases: reach data in a planted `src/screens/History.tsx` now fails, in `Reaches.tsx` it passes, and in
`App.tsx` it still fails.

## Constitution Check (v1.4.0)

- **I. The Wall Holds:** the over-time view has no control that changes protection. Scenario 15's screen
  test asserts it, as `CheckIn.test.tsx` does. A blocked request still produces no Cairn UI, and nothing here
  listens for one.
- **II. Local-First:** no new dependency, and nothing leaves the machine. The range is read from the encrypted
  history and fails closed when the key is unavailable: the sentence is shown, and nothing is discarded
  (scenario 8).
- **III. Honest About Limits:** what Cairn did not see is stated above the list (scenario 5). A refused or
  unreadable range is the sealed sentence, never an empty one (8, 9), and the answer carries no field this
  slice cannot compute (12). The precedent for gaps is followed exactly, and it reaches only gaps Cairn
  recorded: see the open question below.
- **IV. Reversible:** no system file is touched. History is user data, which `delete_all_data` already
  removes.
- **V. Reflection at Distance:** no notification. *Over time* is reached by navigation alone, and nothing
  invites it.
- **VI. Voice:** every string passes `check-banned-words.mjs`. No streak, day count, chain or ranking word
  appears (`check-no-streaks.mjs`, scenarios 15 and 19). The guard for ambient counts is tightened, not
  loosened.
- **VII. Free:** nothing is gated.
- **Delivery Method:** trunk (this branch is stacked on the unmerged `slice/write-tonight`). Tests come first:
  every RED task comes before its GREEN one, and the Rust RED tests are written by a different agent than the
  implementation. The adapter, `commands.rs`, is held for parse, delegate and outcome by scenarios 8–10 and
  12, and the rules are proved where they live: ordering in `domain/patterns.rs`, bounds in
  `reflection/over_time.rs`, the sentence in `store/gaps.rs`.

## Open question, for the owner

**Q1: the time before Cairn first counted, and time it was running without counting.** H4 says *any period
in the range Cairn was not counting is stated above the list, as the check-in states it for a day*. The
check-in states the gaps Cairn recorded, which are the periods between a last mark and a restart
(`counting/presence.rs`). Three periods are not recorded as gaps:

- the time before Cairn first ran: there is no mark, so `infer` returns nothing;
- the time protection was off, while the app was running;
- the time the person chose silence, which their estimate covers.

A 4-week range for someone who installed Cairn a week ago would show three weeks with no reach and no stated
gap. The standing sentence under the list still says *Cairn counts only while it is running. This is what it
saw over these days.* The by-site list presents no day as a zero, but a range lying wholly before the install
would read as quiet.

*Recommendation:* keep this slice to recorded gaps, as the check-in and *Today* do, with the standing sentence.
Then add one fact, *when Cairn first counted*, as its own small slice, so every count (today, a day, a range)
can state the time before it. Doing that here would add an unrecorded fact for one screen, and the day screens
would still not state it. This plan is written to the recommendation. If the owner decides otherwise, the
change is one scenario under 5 and one task beside S12.

## Pin

This slice changes code that was here before the method: `src/screens/Reaches.tsx`, `src/ipc/reaches.ts`,
`src-tauri/src/store/gaps.rs`, `src-tauri/src/ipc/state.rs`, `src-tauri/src/ipc/commands.rs`,
`src-tauri/src/main.rs`, `src-tauri/tests/ipc_surface.rs`, `scripts/check-no-ambient-counts.mjs` and
`eslint.config.js`. `reflection/` and `CheckIn.tsx` were written under the method by `write-tonight`, so their
tests are their pin.

The behaviours it must not change are already pinned in `delivery/survey/pinned.md`, and each is re-run before
and after:

- the command surface and each command's effect on protection (`ipc_surface`);
- today's reaches, gaps, coverage note and sealed sentence as `list_todays_reaches` serves them (`gaps`,
  `Reaches.test.tsx`, which this slice does not edit);
- no streak or day count in the shell, and reach data only on screens a person navigates to
  (`Protection.test.tsx`, `check-no-ambient-counts.mjs`, `check-no-streaks.mjs`);
- the application starting (`make smoke`), because `main.rs` changes.

Two behaviours this slice **changes**, so each needs a row before it is changed. Neither can be observed today
without a mocking framework, so the first task introduces the smallest seam (the `read` and `now` props) and
the row records it. The ledger is the host's, so the row text is given here for the host to append:

```markdown
| 2026-10-01 | The reaches screen opens on *Today*, and asks `list_todays_reaches` for this local midnight to that instant plus 86 400 seconds. Slice `history-by-site` changes the end to the next local midnight, which differs only on a 23- or 25-hour day | `Reaches` props `read` and `now`: the smallest seam, introduced by `history-by-site` with no change in behaviour | `ReachesToday.test.tsx` (the ordinary-day case; the clock-change case is the slice's RED) | `npx vitest run src/screens/__tests__/ReachesToday.test.tsx` |
| 2026-10-01 | `check-no-ambient-counts` accepts reach data in `Reaches.tsx`, `CheckIn.tsx`, `History.tsx`, `Day.tsx` and `src/ipc/`, and refuses it in the shell and everywhere else. Slice `history-by-site` takes `History.tsx` off the list (H1) | `scripts/check-no-ambient-counts.mjs` (`NAVIGATED_TO`), `eslint.config.js` (the reaches block) | planted cases: reach data in a planted `src/screens/History.tsx`, in `Reaches.tsx`, and in `App.tsx` | `npm run check:ambient-counts`, once with each planted file in place and once with none |
```

`store/gaps.rs` gains a function, and `coverage_note` is not changed. `state.rs`, `commands.rs` and `main.rs`
gain a command, and nothing that is there changes. These are covered by the rows above and need none of their
own.

## Complexity Tracking

| Deviation | Why | What was done instead |
|---|---|---|
| The plan and tasks were not produced by Spec Kit's commands through `/drive`'s links | `specs/003-…/plan.md` and `tasks.md` are committed feature-level files from before adoption, and the links would write over them | This slice's plan and tasks were written under `slices/history-by-site/` from the committed feature plan, which they cite rather than restate, as `write-tonight`'s were |
| The feature plan's `History.tsx` and `History.test.tsx` are not built | The owner decided by-site history lives on the reaches screen (H1) | T042, T045 and T047 are retargeted to `Reaches.tsx`, and `History.tsx` leaves both allowlists |
| `summarize_reaches`'s planned signature changes, from `(from, to, offset_seconds)` to `(first_day, last_day, range_start, range_end)` | The planned one could not be checked like `get_day`'s bounds, could not count estimates by date, and could not compute `dst_approximate` (T044's defect). It never shipped, so no reader depends on it | Recorded in `contracts/ui-ipc.md` as an amendment beside the original, which stays visible |
| The pull request will likely pass the 200 lines the constitution suggests (*Pull-Request Gates*, a SHOULD) | A vertical slice from the store to the screen, with five new test files | One commit per RED-GREEN increment, so it can be reviewed commit by commit. 5b–5d are each a fraction of its size, because the range, the command and the screen exist once this lands |
| `list_todays_reaches` still reads a failed read as an empty day | It is not this slice's code. Its behaviour is pinned, and changing it is a fix for `Today` | Recorded here. The new command does not repeat it (scenario 8) |
