---

description: "Task list for machine-wide protection and quiet reach counting"
---

# Tasks: Machine-Wide Protection and Quiet Reach Counting

**Input**: Design documents from `/specs/002-machine-wide-protection/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included and **not optional**. The constitution mandates four coverage areas —
domain normalization, marker splicing byte-identity, teardown restoration, and degradation
paths — and forbids merging a privileged write path without a reviewed teardown and a test
proving it restores. Test tasks here are requirements, not a chosen style.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are given in each task

## Path Conventions

Two Rust binaries plus a React frontend, per [plan.md](./plan.md):

- `src-tauri/src/` — unelevated app; `domain/` is pure and platform-free
- `src-tauri/helper/src/` — privileged helper, the only elevated component
- `src/` — React frontend
- `src-tauri/tests/` — integration and property tests
- `scripts/` — CI guards and per-platform acceptance runs

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding and the automated guards that enforce constitutional rules from the
first commit rather than at review time.

- [X] T001 Create the workspace layout from plan.md in `src-tauri/`, `src-tauri/helper/`, `src/`, `scripts/`
- [X] T002 Initialize the Tauri 2.x application with React 18 + TypeScript + Tailwind in `src-tauri/tauri.conf.json` and `src/`
- [X] T003 Define the Cargo workspace with a pure `domain` crate, the app binary, and the helper binary in `src-tauri/Cargo.toml`
- [X] T004 [P] Configure rustfmt and clippy in `src-tauri/rustfmt.toml` and `src-tauri/clippy.toml`
- [X] T005 [P] Configure ESLint and Prettier in `.eslintrc.cjs` and `.prettierrc`
- [X] T006 [P] Write the banned-word guard over extracted UI strings in `scripts/check-banned-words.mjs` (SC-019)
- [X] T007 [P] Write the dependency guard that fails the build if an HTTP client crate enters the tree in `scripts/check-no-network-deps.sh` (Principle II)
- [X] T008 [P] Add a clippy lint denying `cfg(target_os)` and all I/O inside `src-tauri/src/domain/` in `src-tauri/clippy.toml`
- [X] T009 [P] Add a guard asserting no notification capability is declared, in `scripts/check-no-notifications.sh` (FR-023, SC-007)
- [X] T010 CI workflow running `cargo test`, `npm test`, and every `scripts/check-*` guard in `.github/workflows/ci.yml`

**Checkpoint**: The guards fail loudly on an empty project. Everything after this inherits them.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Risk spikes that can invalidate the design, the four constitution-critical pure
functions, and the privileged helper with its verbs built in apply/remove pairs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Risk spikes — resolve before the work they gate

- [ ] T011 SPIKE (R7) Measure resolution latency for unprotected domains at 0/1k/5k/10k paired entries on all three platforms; record results in `specs/002-machine-wide-protection/research.md`. **Go/no-go before T041 sizes the preset categories.** If a platform misses SC-016's 50 ms bound, the answer is a stated cap or a stated slowdown — never silent dropping
- [ ] T012 SPIKE (R1) Confirm `SMAppService` privileged-helper installation with a Developer ID signature on macOS; record the outcome in `research.md`. **Go/no-go before T032.** If unavailable, macOS falls back to per-write elevation with automatic repair disabled and the limit stated in the UI
- [ ] T013 SPIKE (R5) Verify Secret Service availability on a minimal Linux target; record the outcome in `research.md`. **Go/no-go before T029.** Fallback is fail-closed history with protection and recording continuing

### Constitution-critical pure functions (all in `domain/`, no I/O, no platform code)

- [X] T014 [P] Implement domain normalization and deduplication in `src-tauri/src/domain/normalize.rs` (FR-004, FR-005, FR-006, FR-007)
- [X] T015 [P] Write table-driven normalization tests covering scheme/port/path stripping, case, `www.` pairing, cross-source dedup, and refusal of system-breaking entries in `src-tauri/tests/normalize.rs`
- [X] T016 [P] Implement marker splicing over raw bytes in `src-tauri/src/domain/splice.rs`, preserving line endings, BOM, and trailing bytes (FR-040, FR-042)
- [X] T017 [P] Write the `proptest` property asserting byte-identity outside the markers across apply, repair, and teardown in `src-tauri/tests/splice_properties.rs`
- [X] T018 [P] Implement the capped destination-name parser for TLS `server_name` and HTTP `Host` in `src-tauri/src/domain/sni.rs` (FR-025, research R2)
- [X] T019 [P] Write parser tests asserting the byte cap holds and that nothing beyond the domain is retained, in `src-tauri/tests/sni.rs`
- [X] T020 [P] Implement trusted-clock waiting-period arithmetic in `src-tauri/src/domain/gate.rs` (FR-047a, FR-047d, research R4)
- [X] T021 [P] Write gate tests for clock moved forward while running, moved backward, and machine powered off, in `src-tauri/tests/gate.rs`
- [X] T022 [P] Implement Trail, SourceRef, and paired IPv4/IPv6 hosts-line emission in `src-tauri/src/domain/entries.rs`

### Service traits and stores

- [X] T023 [P] Define `ElevationService`, `HostsService`, `DnsFlushService`, `CredentialStore`, `AutostartService` per contracts/platform-services.md in `src-tauri/src/services/mod.rs`
- [X] T024 [P] Declare `ResolverRulesService` and `BrowserPolicyService` returning `Capability::Unsupported`, with no implementation, in `src-tauri/src/services/layers.rs`
- [X] T025 [P] Implement JSON configuration storage holding no reach data in `src-tauri/src/store/config.rs` (FR-032)
- [X] T026 Implement the change inventory and backup manifest, deliberately unencrypted so teardown survives a missing key, in `src-tauri/src/store/inventory.rs` (FR-039, FR-041)
- [ ] T027 Implement SQLCipher-backed reach history in `src-tauri/src/store/history.rs` (FR-033)
- [ ] T028 Implement key retrieval and creation through the platform credential store in `src-tauri/src/store/key.rs` (FR-034)
- [ ] T029 Implement the fail-closed path: report unreadable history, keep protecting, keep recording, never overwrite, in `src-tauri/src/store/history.rs` (FR-036)
- [ ] T030 Write the fail-closed test asserting the existing history file is byte-identical after a start with no key, in `src-tauri/tests/fail_closed.rs`

### Privileged helper — every verb built with its teardown counterpart

- [X] T031 Implement the helper binary skeleton with closed-verb dispatch, rejecting unknown verbs, in `src-tauri/helper/src/main.rs` (contracts/helper-ipc.md)
- [ ] T032 Implement the peer-authenticated channel per platform — named pipe DACL, XPC code-signing requirement, `SO_PEERCRED` — in `src-tauri/helper/src/channel/`
- [X] T033 Implement `WriteBackupOnce` and `RemoveBackup` as a pair, never overwriting an existing backup, in `src-tauri/helper/src/verbs/backup.rs` (FR-039, FR-042)
- [X] T034 Implement `ApplyHostsSection` and `RemoveHostsSection` as a pair, using atomic same-directory rename with preserved permissions, in `src-tauri/helper/src/verbs/hosts.rs` (FR-040, FR-043)
- [X] T035 Implement `VerifyHostsSection` and `RepairHostsSection` returning what was actually found, in `src-tauri/helper/src/verbs/verify.rs` (FR-012, FR-013)
- [ ] T036 Implement `BindCountingSockets` and `ReleaseCountingSockets` with descriptor passing to the unelevated process in `src-tauri/helper/src/verbs/sockets.rs` (research R3)
- [X] T037 [P] Implement `FlushDnsCache` per platform, treating failure as non-fatal and reported in `src-tauri/helper/src/verbs/dnsflush.rs` (research R8)
- [X] T038 Implement `ReadTrustedClock` and the 60-second heartbeat advancing the trusted clock in `src-tauri/helper/src/heartbeat.rs` (FR-047d)
- [X] T039 Implement `Uninstall`, walking the inventory in reverse and reporting residue, in `src-tauri/helper/src/verbs/uninstall.rs` (FR-043)
- [ ] T040 [P] Implement `ElevationService` per platform, installing the helper once and recording it in the inventory, in `src-tauri/src/platform/{windows,macos,linux}/elevation.rs` (FR-014)
- [ ] T041 [P] Implement `HostsService` read-only access per platform in `src-tauri/src/platform/{windows,macos,linux}/hosts.rs`
- [ ] T042 [P] Implement `CredentialStore` per platform in `src-tauri/src/platform/{windows,macos,linux}/credentials.rs`
- [X] T043 Write the teardown restoration test proving byte-level restoration for every verb pair, on every platform, in `src-tauri/tests/teardown_restoration.rs` (SC-012, SC-013)

**Checkpoint**: Helper installs, applies, verifies, repairs, and fully removes itself, with the
restoration test passing. User story work can begin.

---

## Phase 3: User Story 1 - Choose what to protect and turn it on (Priority: P1) 🎯 MVP

**Goal**: Someone picks categories, types custom sites, turns protection on, and sees it go
into force.

**Independent Test**: Complete setup with one category and one custom site typed with scheme,
port, path, and mixed case. Confirm it stores as a bare domain with its `www.` form, that a
duplicate in another form adds nothing, and that protection reads in force within 60 seconds.

### Tests for User Story 1

- [ ] T044 [P] [US1] Integration test for the full setup-to-protected journey in `src-tauri/tests/us1_setup.rs`
- [ ] T045 [P] [US1] Test that an entry breaking the system or Cairn is refused with a plain-language reason in `src-tauri/tests/us1_refusal.rs`

### Implementation for User Story 1

- [ ] T046 [US1] Author the nine preset category seed files, sized against the T011 result, in `src-tauri/resources/categories/` (FR-001, FR-002)
- [ ] T047 [US1] Implement first-run copying of seed data into the person's own editable copy in `src-tauri/src/enforcement/seed.rs` (FR-002)
- [ ] T048 [P] [US1] Implement the `get_trail`, `list_categories`, and `set_category_enabled` commands in `src-tauri/src/ipc/trail.rs`
- [ ] T049 [P] [US1] Implement the `add_custom_entry` command returning normalized entries or a plain-language rejection in `src-tauri/src/ipc/entries.rs` (FR-003, FR-004)
- [ ] T050 [US1] Implement the apply orchestration — backup, apply, verify, flush — in `src-tauri/src/enforcement/apply.rs` (FR-009, FR-010)
- [ ] T051 [US1] Implement the `turn_protection_on` command with one-time helper install in `src-tauri/src/ipc/protection.rs`
- [ ] T052 [US1] Implement the disclosure-and-confirm step shown before the first system change in `src/screens/Disclosure.tsx` (FR-016, Principle III)
- [ ] T053 [P] [US1] Build the setup wizard screens for category choice and custom entry in `src/screens/Setup/`
- [ ] T054 [P] [US1] Build the protection screen showing state at a glance in `src/screens/Protection.tsx` (FR-011)
- [ ] T055 [P] [US1] Build the trail screen for reviewing and editing what is protected in `src/screens/Trail.tsx`
- [ ] T056 [US1] Implement typed frontend wrappers over the Tauri commands in `src/ipc/index.ts` (contracts/ui-ipc.md)
- [ ] T057 [US1] Apply the warm palette, serif/sans split, and whitespace rules, with no lock, shield, chain, or alarm-red imagery, in `src/styles/theme.css` (FR-052)

**Checkpoint**: Setup completes and protection goes into force. SC-001 and SC-004 are measurable.

---

## Phase 4: User Story 2 - The block holds, everywhere, and says nothing (Priority: P1)

**Goal**: Protected sites fail to load in every application using the system resolver, Cairn
shows nothing at all, and external tampering is repaired silently.

**Independent Test**: Attempt a protected site in two browsers and a non-browser client — all
fail, Cairn displays nothing. Delete Cairn's marked section externally and confirm silent
repair within 60 seconds.

### Tests for User Story 2

- [ ] T058 [P] [US2] Integration test asserting silent repair within 60 seconds with no user-visible output in `src-tauri/tests/us2_repair.rs` (SC-008)
- [ ] T059 [P] [US2] Test asserting the counting path has no channel to the frontend and emits no event in `src-tauri/tests/us2_no_ui.rs` (FR-019, SC-005)

### Implementation for User Story 2

- [ ] T060 [US2] Implement the 60-second verification cycle in the helper heartbeat in `src-tauri/helper/src/heartbeat.rs` (FR-013)
- [ ] T061 [US2] Implement silent automatic repair triggered by drift detection in `src-tauri/src/enforcement/repair.rs` (FR-013)
- [ ] T062 [US2] Implement `ProtectionState` derivation from verified read-back, with `NotVerified` as a distinct status, in `src-tauri/src/enforcement/state.rs` (FR-012)
- [ ] T063 [US2] Render `NotVerified` as its own state, never as protected, in `src/screens/Protection.tsx` (FR-012)
- [ ] T064 [P] [US2] Implement the `get_disclosures` command carrying coverage limits, helper presence, and the administrator caveat in `src-tauri/src/ipc/disclosures.rs` (FR-017, FR-018)
- [ ] T065 [P] [US2] Build the coverage and limits screen naming what is not covered in this release in `src/screens/Limits.tsx` (FR-009a, FR-018)
- [ ] T066 [P] [US2] Add the administrator-can-defeat-Cairn and uncovered-application statements to `README.md` (FR-017, FR-018)
- [ ] T067 [P] [US2] Script the non-browser client acceptance check for CI in `scripts/acceptance/non-browser-client.sh` (SC-002)
- [ ] T068 [P] [US2] Document the manual browser matrix run for all three platforms in `scripts/acceptance/README.md` (SC-002, SC-003)

**Checkpoint**: The wall holds and repairs itself. SC-002, SC-003, SC-005, and SC-008 are measurable.

---

## Phase 5: User Story 3 - Reaches are counted quietly, or honestly not at all (Priority: P1)

**Goal**: Reaches recorded as domain and timestamp only, encrypted at rest, visible only to
someone who navigates to them, with honest silent-mode fallback.

**Independent Test**: Attempt three protected sites at noted times, navigate deliberately to
the reaches screen, confirm three correct records and nothing else. Occupy port 443, restart
protection, confirm automatic silent mode with blocking fully in force.

### Tests for User Story 3

- [ ] T069 [P] [US3] Integration test asserting recorded reaches carry domain and timestamp only in `src-tauri/tests/us3_counting.rs` (FR-024, SC-009)
- [ ] T070 [P] [US3] Degradation test asserting a counting loss never reduces blocking in `src-tauri/tests/degradation.rs` (FR-028, SC-010)
- [ ] T071 [P] [US3] Log-scan test asserting no domain or reach appears in any diagnostic output in `src-tauri/tests/log_scan.rs` (FR-038b, SC-018)

### Implementation for User Story 3

- [ ] T072 [US3] Implement the counting listener accepting passed descriptors, parsing the destination name, recording, and closing without a response in `src-tauri/src/counting/listener.rs` (FR-024, research R2)
- [ ] T073 [US3] Implement port-conflict detection at setup and at every protection start in `src-tauri/src/counting/availability.rs` (FR-027)
- [ ] T074 [US3] Implement automatic silent-mode fallback with a one-sentence explanation in `src-tauri/src/enforcement/reach_mode.rs` (FR-027, FR-028)
- [ ] T075 [P] [US3] Implement `get_reach_mode` and `set_reach_mode` allowing override in either direction in `src-tauri/src/ipc/reach_mode.rs` (FR-029)
- [ ] T076 [US3] Implement coverage-gap recording on shutdown and inference on start in `src-tauri/src/store/gaps.rs` (FR-030)
- [ ] T077 [US3] Implement the `list_todays_reaches` command returning reaches with their coverage gaps in `src-tauri/src/ipc/reaches.rs`
- [ ] T078 [P] [US3] Build the reaches screen reachable only by deliberate navigation, stating that counting covers only running time, in `src/screens/Reaches.tsx` (FR-030, FR-030a)
- [ ] T079 [US3] Add the ESLint rule restricting the `list_todays_reaches` import to the reaches screen in `.eslintrc.cjs` (FR-030a)
- [ ] T080 [P] [US3] Add the plain statement of what encryption at rest does and does not protect against, in `src/screens/Limits.tsx` (FR-035)
- [X] T081 [P] [US3] Write the ambient-surface sweep check asserting no count, badge, or hint exists outside the reaches screen in `scripts/check-no-ambient-counts.mjs` (SC-006)

**Checkpoint**: Counting works, degrades honestly, and stays invisible. SC-006, SC-009, SC-010,
SC-014, SC-018 are measurable.

---

## Phase 6: User Story 4 - Protection comes off deliberately, and the machine is exactly as it was (Priority: P1)

**Goal**: A reduction waits 24 hours with protection in force throughout, is cancellable, and
teardown restores the machine byte-for-byte.

**Independent Test**: Request protection off; confirm it does not apply early across an app
restart, a machine restart, and a clock moved forward 48 hours. Cancel it. Then let one apply
and confirm byte-identical restoration with no residue.

### Tests for User Story 4

- [ ] T082 [P] [US4] Integration test asserting no pending reduction applies early across restart and clock change in `src-tauri/tests/us4_gate.rs` (SC-011)
- [ ] T083 [P] [US4] Test asserting an increase in protection applies immediately and does not disturb a pending reduction in `src-tauri/tests/us4_increase.rs` (FR-048)

### Implementation for User Story 4

- [ ] T084 [US4] Implement `PendingChange` persistence carrying the trusted-clock values in `src-tauri/src/store/pending.rs` (FR-047a)
- [ ] T085 [US4] Implement the single reduction path that every reduction routes through in `src-tauri/src/enforcement/reduce.rs` (FR-047)
- [ ] T086 [US4] Implement `request_protection_off`, `remove_custom_entry`, and category-disable as pending changes in `src-tauri/src/ipc/protection.rs` (FR-047, FR-047b)
- [ ] T087 [P] [US4] Implement `cancel_pending_change` and `get_pending_change` in `src-tauri/src/ipc/pending.rs` (FR-047c)
- [ ] T088 [US4] Implement the eligibility check refusing any reduction without an eligible pending change in `src-tauri/src/enforcement/reduce.rs` (FR-047a, Principle I)
- [ ] T089 [P] [US4] Show remaining time wherever protection state is shown, and nowhere that draws the person back, in `src/screens/Protection.tsx` (FR-047e)
- [ ] T090 [US4] Implement teardown orchestration walking the inventory in reverse with verification in `src-tauri/src/enforcement/teardown.rs` (FR-043)
- [ ] T091 [US4] Implement the post-teardown confirmation reporting residue rather than success in `src/screens/Teardown.tsx` (FR-044)
- [ ] T092 [P] [US4] Implement the `delete_all_data` command in `src-tauri/src/ipc/data.rs` (FR-045)
- [ ] T093 [US4] Verify no command anywhere reduces protection immediately, by review against contracts/ui-ipc.md, recorded in `src-tauri/src/ipc/mod.rs` doc comment (Principle I)

**Checkpoint**: All four stories functional. SC-011, SC-012, SC-013 measurable. Slice is
releasable.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T094 [P] Run the full banned-word check over every shipped string and fix any hit in `scripts/check-banned-words.mjs` (SC-019)
- [ ] T095 [P] Sweep every screen for streak counters, day-counts, and chain imagery in `src/screens/` (SC-020)
- [ ] T096 [P] Verify no payment, account, entitlement, or trial code path exists anywhere in `src-tauri/src/` and `src/` (SC-021)
- [ ] T097 [P] Run a 30-day network capture asserting zero bytes leave the machine (SC-017)
- [ ] T098 Measure added latency for unprotected sites at 10,000 entries against the 50 ms bound (SC-016)
- [ ] T099 Run every quickstart.md scenario on Windows, macOS, and Linux and record results
- [ ] T100 Update `CLAUDE.md` to replace "no application code exists yet" with the real build and test commands

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–6)**: All depend on Foundational
- **Polish (Phase 7)**: Depends on all four stories

### Spike gating inside Phase 2

- T011 gates T046 (preset sizing)
- T012 gates T032 (macOS helper channel)
- T013 gates T029 (fail-closed history path)

The remaining Phase 2 work proceeds while spikes run — the pure domain functions T014–T022
depend on nothing at all and should start immediately.

### User Story Dependencies

These four stories are **less independent than the template assumes**, and pretending
otherwise would produce a broken plan:

- **US1** is genuinely independent once Phase 2 completes.
- **US2** depends on US1 for something to verify — repair has no meaning before apply exists.
- **US3** is independent of US2 and can be built in parallel with it.
- **US4** depends on US1 for something to remove. Its *teardown* half is already proven by
  T043 in Phase 2, because the constitution forbids merging a write path without it; Phase 6
  adds the waiting period and the user-facing removal journey on top.

Honest ordering: **US1 → (US2 ∥ US3) → US4**.

### Within Each User Story

- Tests before implementation
- Domain before stores, stores before orchestration, orchestration before commands, commands
  before screens
- Every privileged verb ships with its teardown counterpart in the same change

### Parallel Opportunities

- Phase 1: T004–T009 all parallel
- Phase 2: T014–T022 all parallel (pure functions, separate files); T040–T042 parallel across
  platforms; the three spikes run alongside all of it
- Phase 4 and Phase 5 can run concurrently once US1 is complete
- Within stories, `[P]`-marked screen and command tasks touch separate files

---

## Parallel Example: Phase 2 pure functions

```bash
# Four constitution-critical functions, four files, no shared state:
Task: "Implement domain normalization in src-tauri/src/domain/normalize.rs"
Task: "Implement marker splicing in src-tauri/src/domain/splice.rs"
Task: "Implement the destination-name parser in src-tauri/src/domain/sni.rs"
Task: "Implement trusted-clock arithmetic in src-tauri/src/domain/gate.rs"

# Their tests, equally parallel:
Task: "Normalization tests in src-tauri/tests/normalize.rs"
Task: "Splicing property test in src-tauri/tests/splice_properties.rs"
Task: "Parser retention tests in src-tauri/tests/sni.rs"
Task: "Gate clock-manipulation tests in src-tauri/tests/gate.rs"
```

---

## Implementation Strategy

### MVP scope

**Phases 1 + 2 + 3 (US1)** — through T057. That delivers setup and working machine-wide
protection, with teardown already proven by T043.

One caveat that is not negotiable: the MVP is a *development* milestone, not a release. US4's
waiting period is what makes reducing protection pass a gate, and a build shipped without it
would hand someone in recovery an instant off-switch. **Do not put a US1-only build in front
of a user.**

### Incremental delivery

1. Phases 1–2 → foundation, with restoration proven
2. Phase 3 (US1) → protection works — validate, do not ship
3. Phases 4 and 5 (US2, US3) in parallel → the wall holds silently and counts honestly
4. Phase 6 (US4) → the gate closes; **now it is releasable**
5. Phase 7 → verification sweep across all three platforms

### Parallel team strategy

After Phase 2: one developer on US1. Once US1 lands, US2 and US3 split cleanly between two
developers. US4 follows US1 and can start as soon as US1's apply path is stable, before US2
and US3 finish.

---

## Notes

- `[P]` means different files and no dependency on incomplete work
- Every privileged verb merges with its teardown counterpart and a passing restoration test —
  this is a constitutional rule, not a preference
- The four `domain/` functions are the ones to review hardest; each guards a different principle
- Commit after each task or logical group
- Stop at any checkpoint to validate against the matching success criteria
