---

description: "Task list for the evening check-in and honest history"
---

# Tasks: The Evening Check-in and Honest History

**Input**: Design documents from `/specs/003-reflection-and-history/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included and **not optional**. Two of this slice's guarantees exist only as tests.
The once-per-day announcement bound replaces an absent capability that slice `002` could
prove by inspection, and the no-residue property of deletion cannot be seen by reading the
code at all. Test tasks here are requirements, not a chosen style.

**Slice `002` is a prerequisite**, not a parallel effort. This slice reads the reaches, gaps,
encryption key, and reach mode it produced.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are given in each task

## Path Conventions

Per [plan.md](./plan.md), unchanged from slice `002`:

- `src-tauri/src/domain/` — pure, no I/O, no platform conditionals
- `src-tauri/src/` — the unelevated app: stores, orchestration, IPC
- `src/` — React frontend
- `src-tauri/tests/` — integration and property tests
- `scripts/` — the constitutional guards

**No task in this slice touches `src-tauri/helper/`.** This slice makes no privileged write.

---

## Phase 1: Setup — the guards, before the code they govern

**Purpose**: Four standing guards must change. Doing this first means every later task is
written against the constraints that will judge it, rather than discovering them at review.

**⚠️ A widened guard that forbids less than before is a defect, not a trade-off.** Each
modified guard must end up forbidding more.

- [ ] T001 **SPIKE (R1)** Resolve whether a notification can be raised without admitting anything network-capable: add `tauri-plugin-notification` to `src-tauri/Cargo.toml` and `package.json`, run `bash scripts/check-no-network-deps.sh` on all three desktop targets, and record the resolved graph in `specs/003-reflection-and-history/research.md`. **GO/NO-GO before T004, T005, and T028.** If it does not pass, take the fallback ladder in R1 in order — the first rung needs no new dependency on Linux, since `keyring`'s `async-secret-service` already puts a D-Bus client in the tree
- [ ] T002 [P] Extend the ambient-counts guard in `scripts/check-no-ambient-counts.mjs`: replace the single hardcoded `Reaches.tsx` allowance with an allowlist of the four navigated-to screens, and **add** prohibitions it does not have today — no reach data in `src/App.tsx`, in any header, nav, tray, or badge surface (FR-033, SC-006 of slice `002`)
- [ ] T003 [P] Extend the reach-data import restriction in `eslint.config.js` to permit `src/screens/CheckIn.tsx`, `src/screens/History.tsx`, and `src/screens/Day.tsx` alongside `Reaches.tsx`, leaving the restriction in force everywhere else
- [ ] T004 Narrow, do not remove, the `no-restricted-syntax` rule forbidding `new Notification` in `eslint.config.js`: the raw constructor stays forbidden everywhere, and the announcement is permitted only through `src/announce.ts`
- [ ] T005 Rewrite `scripts/check-no-notifications.sh` so it permits exactly one notification path and forbids every other: no badge API, no raw constructor, no second notification module, and no notification capability beyond the one declared. Record in the script's own header why the guarantee moved from absence to proof
- [ ] T006 [P] Add the notification capability, scoped as narrowly as the plugin permits, to `src-tauri/capabilities/default.json`, and update its `description` so it no longer claims no notification permission of any kind
- [ ] T007 [P] Author the bundled quote set against the R6 criteria in `src-tauri/resources/quotes/quotes.json`, and register it under `bundle.resources` in `src-tauri/tauri.conf.json`
- [ ] T008 Plant a violation against each of the four modified guards, confirm each one fails, then remove the violation — the same standard slice `002` set for its seven checks. Record the confirmation in `specs/003-reflection-and-history/quickstart.md`
- [ ] T009 [P] Add the new test files and the `history` feature invocation to the CI matrix in `.github/workflows/ci.yml`

**Checkpoint**: `npm run check` passes, every modified guard has been proven to fail on a
planted violation, and the streak guard is untouched.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure arithmetic both stories depend on, the storage both stories write
through, and the one platform seam. Tests come before implementations here, from the property
tables fixed in [contracts/patterns.md](./contracts/patterns.md), so they cannot be shaped
around an implementation's mistakes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### The pure layer

- [ ] T010 [P] Write the property tests for pattern bucketing from the six properties in `contracts/patterns.md` — total preservation, range exclusivity, estimates never bucketed, offset shifts never lose, determinism including list ordering, empty-is-zero-filled — in `src-tauri/tests/patterns.rs`
- [ ] T011 [P] Write the unit tests for the announcement decision from the five properties in `contracts/patterns.md` — at most once per day, never early, never late, off means silent, a backward clock grants nothing — in `src-tauri/tests/checkin_due.rs`
- [ ] T012 Implement pattern bucketing by site, hour of day, day of week, and movement across a range in `src-tauri/src/domain/patterns.rs`, using `rem_euclid`/`div_euclid` so a pre-epoch timestamp buckets correctly (FR-019, FR-020, FR-023, FR-024)
- [ ] T013 Implement `announcement_due` as a pure function over the local day, chosen hour, current instant, last-announced day, and switch in `src-tauri/src/domain/checkin.rs` (FR-001, FR-002, FR-004, FR-006)
- [ ] T014 [P] Add the DST-crossing detection that sets `dst_approximate` in `src-tauri/src/domain/patterns.rs`, so the interface can state the approximation rather than hide it (research R4)
- [ ] T015 Confirm `bash scripts/check-domain-purity.sh` still passes with both new modules present — no I/O, no `cfg(target_os)`, no clock read in `src-tauri/src/domain/`

### Storage

- [ ] T016 [P] Write the store tests for journal entries and estimates — one entry per day, empty text refused, replace-on-save retaining nothing, estimates independent of entries — in `src-tauri/tests/journal_store.rs`
- [ ] T017 Add the `journal_entries` and `reach_estimates` tables to the existing encrypted store in `src-tauri/src/store/history.rs`, per [data-model.md](./data-model.md), keeping `written_at` unexposed by any read
- [ ] T018 Add range reads for reaches, gaps, entries, and estimates over an arbitrary `[from, to)` in `src-tauri/src/store/history.rs`, generalizing the existing `between` seam rather than adding a parallel one
- [ ] T019 Implement deletion at day, range, and all-of-it granularity in `src-tauri/src/store/history.rs`, removing **both reaches and coverage gaps** in the range and returning nothing (FR-018, FR-018a, data-model.md)
- [ ] T020 [P] Add `evening_hour`, `announce_check_in`, and `last_announced_day` to `Config` in `src-tauri/src/store/config.rs`, each with a `serde` default so a slice `002` configuration file loads unchanged (FR-007)
- [ ] T021 [P] Confirm the existing test asserting configuration holds no reach data still passes with the three new fields, in `src-tauri/tests/stores.rs`

### The platform seam

- [ ] T022 [P] Declare the announcement trait alongside the existing platform services in `src-tauri/src/services/mod.rs`, taking a title and body and returning whether the platform accepted it
- [ ] T023 Implement the announcement seam for all three platforms in `src-tauri/src/platform/announce.rs`, with no `cfg(target_os)` leaking above this module (plan.md, Platform abstraction)

**Checkpoint**: The pure arithmetic is proven by property test, the store round-trips entries
and estimates under encryption, and `cargo test -p cairn --no-default-features` passes with no
GUI toolchain and no database.

---

## Phase 3: User Story 1 — The evening check-in (Priority: P1) 🎯 MVP

**Goal**: One quiet announcement at the chosen hour, opening onto today's reaches, a space to
write, and perhaps a quote — with nothing else in the day interrupting anyone.

**Independent Test**: Set the hour a few minutes ahead, wait, and get exactly one
notification. Open the check-in, write an entry, save, reopen — the text is intact. Restart
the app and get no second announcement for the day.

### Tests for User Story 1

- [ ] T024 [P] [US1] Write the end-to-end announcement test — called any number of times across a day, at most one announcement is produced, and none before the hour or after the day ends — in `src-tauri/tests/us1_announcement.rs` (SC-001, SC-002)
- [ ] T025 [P] [US1] Write the durability test proving the announcement record survives a restart, so a reopened window cannot produce a second notice, in `src-tauri/tests/us1_announcement.rs` (research R2)
- [ ] T026 [P] [US1] Write the test proving the journaling space is refused rather than offered when the key is unavailable, and that nothing is written, in `src-tauri/tests/fail_closed_journal.rs` (research R5, FR-029)
- [ ] T027 [P] [US1] Write the screen tests for the check-in — reaches shown, entry saved and reopened, quote optional and absent without degrading, no banned words — in `src/screens/__tests__/CheckIn.test.tsx`

### Implementation for User Story 1

- [ ] T028 [US1] Implement the announcement orchestration in `src-tauri/src/reflection/mod.rs` and `src-tauri/src/reflection/checkin.rs`: call the pure decision, **record the answer before raising**, then return it (research R2). Depends on T001
- [ ] T029 [US1] Implement assembling a day — reaches, gaps, coverage note, entry, sealed sentence — into the `DayView` of `contracts/ui-ipc.md` in `src-tauri/src/reflection/checkin.rs` (FR-008, FR-021)
- [ ] T030 [US1] Implement saving a journal entry in `src-tauri/src/reflection/journal.rs`, refusing empty text and refusing outright when the key is unavailable (FR-014, FR-015, FR-029)
- [ ] T031 [US1] Implement reading a quote from the bundled set in `src-tauri/src/reflection/checkin.rs`, returning nothing as a valid complete answer (FR-008, FR-009)
- [ ] T032 [US1] Expose `get_day`, `get_quote`, `save_journal_entry`, `announce_check_in_if_due`, `get_check_in_settings`, `set_evening_hour`, and `set_announce_check_in` in `src-tauri/src/ipc/commands.rs` and `src-tauri/src/ipc/state.rs`
- [ ] T033 [US1] Add all seven new commands to the `CLASSIFIED` array in `src-tauri/tests/ipc_surface.rs`, growing its fixed size, each classified as having no effect on protection
- [ ] T034 [P] [US1] Add the typed command wrappers in `src/ipc/journal.ts`, and extend `src/ipc/reaches.ts` with the range read
- [ ] T035 [US1] Implement the one module permitted to raise a notification in `src/announce.ts`, polling the decision command and rendering nothing itself
- [ ] T036 [US1] Build the check-in screen in `src/screens/CheckIn.tsx` — serif for the reflective surface, today's reaches, the journaling space, the optional quote. **No route to any protection change may appear here** (plan.md, Principle I)
- [ ] T037 [P] [US1] Build the evening hour and announcement switch in `src/screens/Settings/EveningHour.tsx`, stating that the reminder needs Cairn to be running (Complexity Tracking C1, Principle III)
- [ ] T038 [US1] Wire the check-in and settings destinations into `src/App.tsx` **without putting reach data, a count, or a hint in the shell** (FR-033)

**Checkpoint**: The evening ritual works end to end. `npm run check` still passes, including
the rewritten notification guard.

---

## Phase 4: User Story 2 — Seeing the pattern (Priority: P2)

**Goal**: Reaches read by site, by hour of day, by day of week, and as movement over a range
the person chooses — fully available with zero journal entries written.

**Independent Test**: Seed four weeks of history, open the history view, break down all three
ways, change the range. Everything works with no entries in existence.

### Tests for User Story 2

- [ ] T039 [P] [US2] Write the test proving every breakdown is fully available with zero journal entries present, in `src-tauri/tests/us2_patterns.rs` (FR-019, spec US2 scenario 3)
- [ ] T040 [P] [US2] Write the test proving a range with no reaches returns zero-filled buckets rather than nothing, so the interface can render a quiet range, in `src-tauri/tests/us2_patterns.rs` (FR-024)
- [ ] T041 [P] [US2] Write the at-scale test measuring summary cost at 10,000 entries and two years of seeded history in `src-tauri/tests/patterns_at_scale.rs`, following slice `002`'s habit of measuring Cairn's own cost so an accidentally quadratic path cannot hide behind an unresolved spike (SC-006)
- [ ] T042 [P] [US2] Write the screen tests for the history view — all three breakdowns, range change, no streak or day-count surface — in `src/screens/__tests__/History.test.tsx` (FR-033)

### Implementation for User Story 2

- [ ] T043 [US2] Implement the summary orchestration over the range read in `src-tauri/src/reflection/mod.rs`, delegating all arithmetic to `domain/patterns.rs` (FR-019, FR-020)
- [ ] T044 [US2] Expose `summarize_reaches` in `src-tauri/src/ipc/commands.rs`, returning `estimates_excluded` as a count so the exclusion can be stated rather than implied, and add it to `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs`
- [ ] T045 [US2] Build the history view in `src/screens/History.tsx` — by site, by hour, by day of week, movement across the range, and the range control (FR-019, FR-020)
- [ ] T046 [P] [US2] Render the DST approximation notice in `src/screens/History.tsx` when the range crosses a change, rather than presenting the buckets as exact (research R4, Principle III)
- [ ] T047 [P] [US2] Write the copy for a quiet range in `src/screens/History.tsx` so it reads as neither an achievement nor a warning (FR-024, FR-032)

**Checkpoint**: Patterns are readable independently of anything written in the check-in.

---

## Phase 5: User Story 3 — A day, whole and honest (Priority: P2)

**Goal**: One day read truthfully — its reaches, its writing, its gaps, its estimate if it was
silent, and its skipped-ness if it was skipped. No count presented as more complete than it is.

**Independent Test**: Seed four days — one with reaches and an entry, one with a gap, one
silent, one skipped — and open each. All four read truthfully with no guilt language.

### Tests for User Story 3

- [ ] T048 [P] [US3] Write the test proving a gap is shown beside any count covering it and a count is never presented as a whole day, in `src-tauri/tests/us3_honest_day.rs` (SC-007, FR-022)
- [ ] T049 [P] [US3] Write the test proving a day-level estimate never enters a by-site or by-hour breakdown and that its exclusion is reported, in `src-tauri/tests/us3_honest_day.rs` (SC-008, FR-023)
- [ ] T050 [P] [US3] Write the test proving skipped days are derived and that **no command, field, or return value anywhere counts or totals them** — the FR-026b guarantee, which is a property of the whole surface rather than of one screen — in `src-tauri/tests/us3_no_debt.rs` (SC-016)
- [ ] T051 [P] [US3] Write the screen tests for one day — reaches and entry together, gap shown, estimate invited when silent, skipped shown as skipped with no guilt language — in `src/screens/__tests__/Day.test.tsx` (FR-021, SC-015)

### Implementation for User Story 3

- [ ] T052 [US3] Derive `is_skipped` and `needs_estimate` at read time in `src-tauri/src/reflection/checkin.rs`, storing neither (data-model.md — a stored flag is a countable field)
- [ ] T053 [US3] Implement saving a reach estimate in `src-tauri/src/reflection/journal.rs`, typed so it carries no site and no hour and therefore cannot reach a breakdown (FR-012, FR-023)
- [ ] T054 [US3] Expose `save_reach_estimate` in `src-tauri/src/ipc/commands.rs` and add it to `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs`
- [ ] T055 [US3] Build the single-day screen in `src/screens/Day.tsx` — reaches and entry together, the gap beside the count, the estimate as the person's own (FR-021, FR-022)
- [ ] T056 [US3] Implement the estimate invitation in `src/screens/CheckIn.tsx` for a day silent mode was active, worded so the number is plainly theirs rather than a measurement (FR-012)
- [ ] T057 [US3] Implement writing an entry for a past day in `src/screens/Day.tsx`, on identical terms to today and **with nothing anywhere inviting, counting, or drawing attention to the days without entries** (FR-026, FR-026a, FR-026b)
- [ ] T058 [P] [US3] Write the skipped-day copy in `src/screens/Day.tsx` and `src/screens/History.tsx` — shown as skipped, nothing to catch up on, no penalty (FR-011, SC-015)

**Checkpoint**: A day cannot be read as more complete, or more damning, than it was.

---

## Phase 6: User Story 4 — The entries are theirs (Priority: P3)

**Goal**: What the person wrote is theirs to keep, revise, or remove; history is theirs to
delete at any granularity; and none of it makes them feel bad for doing so.

**Independent Test**: Write entries, revise one, delete one, restart — the rest survive
untouched. Delete a day, a range, and everything, and confirm each leaves no trace of itself.

### Tests for User Story 4

- [ ] T059 [P] [US4] Write the **no-residue test**: after deleting a day, compare every view against the same data recorded without that day and assert they are indistinguishable — no marker, no gap on the deleted range's behalf, no inferable absence — in `src-tauri/tests/us4_deletion.rs` (SC-017, FR-018a, FR-022a)
- [ ] T060 [P] [US4] Write the test proving no deletion command alters the trail, the protection state, or anything the enforcement layer reads, in `src-tauri/tests/us4_deletion.rs` (contracts/ui-ipc.md)
- [ ] T061 [P] [US4] Write the test proving entries and estimates are gone after a full deletion, extending the existing coverage in `src-tauri/tests/delete_all_data.rs` (data-model.md)
- [ ] T062 [P] [US4] Write the retention test proving nothing is aged out, trimmed, or summarized away across repeated restarts, in `src-tauri/tests/us4_retention.rs` (FR-017, SC-014)
- [ ] T063 [P] [US4] Write the test proving entries and reaches are deleted independently in either order, in `src-tauri/tests/us4_deletion.rs` (data-model.md)
- [ ] T064 [P] [US4] Write the screen tests for deletion — no report of what was removed, and confirmation copy free of loss, cost, or regret — in `src/screens/__tests__/DeleteHistory.test.tsx` (SC-018, FR-018b)

### Implementation for User Story 4

- [ ] T065 [US4] Implement revising and deleting a journal entry in `src-tauri/src/reflection/journal.rs`, retaining no previous text on replace (FR-015)
- [ ] T066 [US4] Expose `delete_journal_entry` and `delete_reach_history` in `src-tauri/src/ipc/commands.rs`, the latter returning nothing at all, and add both to `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs` (FR-018b)
- [ ] T067 [US4] Build the deletion screen in `src/screens/Settings/DeleteHistory.tsx` covering a day, a range, and everything (FR-018)
- [ ] T068 [US4] Write the deletion copy in `src/screens/Settings/DeleteHistory.tsx` with no language of loss, cost, or regret, and no count of what will be or was removed (FR-018b, SC-018)
- [ ] T069 [P] [US4] Implement the sealed-key state in `src/screens/CheckIn.tsx` and `src/screens/Day.tsx`: the plain sentence, the journaling space **not offered**, and what is still true — protection on, reaches still recorded (research R5, SC-012)

**Checkpoint**: All four stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T070 [P] Verify every user-facing string added by this slice passes `node scripts/check-banned-words.mjs` — this slice writes more prose than any before it (FR-031, SC-009)
- [ ] T071 [P] Verify `node scripts/check-no-streaks.mjs` passes **unmodified**, and that this slice added no counter, no day count, and no chain (FR-033, SC-010)
- [ ] T072 [P] Verify `node scripts/check-free.mjs` and `bash scripts/check-no-network-deps.sh` still pass with the notification dependency in the tree (Principle VII, Principle II)
- [ ] T073 [P] Sweep every screen with several skipped days and reaches present, confirming zero surfaces count, list, total, or draw attention to unwritten days or reach counts (SC-016, SC-004)
- [ ] T074 **Measure (R7)** SC-006: change ranges and breakdowns against 10,000 entries and two years of seeded history on all three platforms, and record the result in `specs/003-reflection-and-history/research.md`. A miss is answered with a stated cap or a stated wait, never with silent truncation
- [ ] T075 Run a network capture across ordinary use including several check-ins, asserting zero bytes leave the machine, and record it in `specs/003-reflection-and-history/quickstart.md` (SC-013)
- [ ] T076 Observe the announcement across seven days, confirming exactly one per day on days Cairn was running at the hour and zero at any other time (SC-001, SC-003)
- [ ] T077 Run every [quickstart.md](./quickstart.md) scenario on Windows, macOS, and Linux and record the results
- [ ] T078 [P] Replace the Current State section of `CLAUDE.md` with this slice's commands, the four modified guards, and the two tests that are guards in disguise (T050 and T059)
- [ ] T079 [P] Record the C1 limit — the reminder needs Cairn to be running — in `README.md` alongside the existing administrator caveat (Principle III)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 is a spike and gates T004, T005, and T028
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories**
- **User Stories (Phase 3–6)**: All depend on Foundational
- **Polish (Phase 7)**: Depends on the stories being complete

### Critical path

```text
T001 (R1 spike) ──► T004, T005 ──► T028 (announcement orchestration)
T010, T011 (property tests) ──► T012, T013 (pure modules) ──► everything
T017, T018 (tables and range reads) ──► every story's reads
T019 (deletion) ──► US4
```

### Story dependencies

- **US1 (P1)**: Foundational only. The MVP
- **US2 (P2)**: Foundational only. Genuinely independent of US1 — patterns are readable with
  zero journal entries, which T039 asserts
- **US3 (P2)**: Foundational, plus the `DayView` shape and `get_day` from US1 (T029). US3
  extends what that view *surfaces* — gaps, estimates, skipped-ness — rather than redefining
  it. This is the one cross-story coupling in the slice and is deliberate: two independent
  definitions of a day would drift
- **US4 (P3)**: Foundational, plus journal saving from US1 (T030). There must be entries
  before there is anything to revise, delete, or keep

### Within each story

- Tests are written first, from the property tables in `contracts/patterns.md` and the
  scenarios in `quickstart.md`, and must fail before implementation
- Pure functions before stores; stores before orchestration; orchestration before commands;
  commands before screens
- A new command is classified in `ipc_surface.rs` in the **same task** that exposes it, never
  a follow-up

### Parallel opportunities

- T002, T003, T006, T007, T009 — different files, no shared dependency
- T010, T011, T016 — all test-authoring, all independent
- Every test task inside a single story is `[P]` against the others
- Once Foundational completes, **US1 and US2 can proceed in full parallel**; US3 waits only
  on T029 and US4 only on T030

---

## Parallel Example: Foundational

```bash
# The property tests, authored together before any implementation:
Task: "Property tests for pattern bucketing in src-tauri/tests/patterns.rs"          # T010
Task: "Unit tests for the announcement decision in src-tauri/tests/checkin_due.rs"   # T011
Task: "Store tests for entries and estimates in src-tauri/tests/journal_store.rs"    # T016
```

## Parallel Example: User Story 1

```bash
# All four test tasks together:
Task: "End-to-end announcement test in src-tauri/tests/us1_announcement.rs"          # T024
Task: "Announcement durability across restart, same file"                            # T025
Task: "Fail-closed journal test in src-tauri/tests/fail_closed_journal.rs"            # T026
Task: "Check-in screen tests in src/screens/__tests__/CheckIn.test.tsx"               # T027
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 — the guards, and the R1 spike
2. Phase 2 — Foundational (**blocks everything**)
3. Phase 3 — the evening check-in
4. **Stop and validate**: quickstart Scenarios 1, 2, and 7. The ritual works, nothing
   interrupts outside the hour, and a missing key loses nobody's writing
5. This is a coherent release on its own. The recovery half of the product exists, without
   history views

### Incremental delivery

1. Setup + Foundational → the arithmetic and the store are proven
2. **US1 → the check-in. Ship it.** The product now has both halves
3. US2 → patterns. Independently valuable and independently testable
4. US3 → the honest day. This is where trust is either earned or quietly spent
5. US4 → ownership of the record

### Notes

- **T050 and T059 are guards in disguise** and matter as much as anything in `scripts/`. T050
  proves nothing anywhere counts unwritten days; T059 proves a deletion leaves no trace.
  Neither property can be seen by reading the code, which is why each is a test rather than a
  review note
- The two go/no-go items are T001 (before the announcement is built) and T074 (before SC-006
  is claimed). Neither may be answered by assumption
- `check-no-streaks.mjs` stays untouched for this slice's entire duration. Streaks are slice
  `004`
- Commit after each task or logical group. Stop at any checkpoint to validate a story
  independently
