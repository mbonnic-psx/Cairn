# Implementation Plan: The evening check-in and honest history

**Branch**: `003-reflection-and-history` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-reflection-and-history/spec.md`

## Summary

Slice `002` records reaches and the periods it was not watching, encrypted, and shows only
today. This slice turns that record into the recovery half of the product: one quiet
announcement at an hour the person chose, a check-in holding the day's reaches beside a space
to write, and history views that read the accumulated past by site, by hour, by day of week,
and as movement over a range.

The technical shape is smaller than the product weight suggests, because slice `002` left the
right seams. Reach reads already take a range and already return gaps and a fail-closed
sentence. The encryption boundary and its key already exist, so journal entries join them
rather than founding a second store. Nothing here touches a system file, elevates, or asks
the helper for anything — this slice makes no privileged writes at all.

Three things carry the real risk, and none of them is the feature's visible surface:

1. **The announcement inverts a guarantee.** Slice `002` promised silence by refusing the
   capability to notify. That absence was the proof. This slice needs the capability, so the
   proof has to become behavioural — *fires at most once per local day, at the chosen hour,
   never at a reach, never at a repair* — and it has to be as hard to pass by accident as
   the absence was.
2. **Five standing guards constrain this work and four must change.** They are listed in
   full below. Widening one carelessly would quietly undo a property slice `002` paid for.
3. **The announcement cannot fire while Cairn is not running**, because the tray and
   autostart belong to a later slice. That is a real shortfall against FR-001 and FR-002,
   and it is recorded in Complexity Tracking rather than glossed.

## Technical Context

**Language/Version**: Rust 1.83 (workspace `rust-version`), TypeScript 5.6, React 18.3

**Primary Dependencies**: Existing — `tauri` 2, `rusqlite` 0.32 with
`bundled-sqlcipher-vendored-openssl`, `keyring` 3, `serde`, `tokio`, `dirs`, `idna`.
**One addition proposed**: `tauri-plugin-notification` 2 plus its npm counterpart, the only
new dependency this slice needs and the subject of research R1.

**Storage**: The existing encrypted store (SQLCipher, key in the platform credential store)
gains journal entries and day-level estimates as new tables in the same file under the same
key. Configuration (plain JSON, no reach data) gains the evening hour, the announcement
switch, and the record of what has been announced. No new store is founded.

**Testing**: `cargo test -p cairn --no-default-features` for the pure and store layers,
`cargo test -p cairn` with the `history` feature for the encrypted reads and writes,
`vitest` + Testing Library for screens, `proptest` for the pattern arithmetic.

**Target Platform**: Windows, macOS, Linux desktop — unchanged from slice `002`.

**Project Type**: Desktop application (Tauri 2: React frontend, Rust core).

**Performance Goals**: SC-006 — every breakdown and range change presents without a
perceptible wait at 10,000 protected entries and 2 years of history. This slice owns that
measurement; it is not inherited from `002`'s unresolved latency spike, which concerns
resolution rather than reading.

**Constraints**: No outbound network calls of any kind. No privileged write and no system
file touched. Journal entries encrypted at rest with no opt-out and no passphrase. Exactly
one notification per local day and never any other. The pure domain layer stays free of I/O
and platform conditionals. Nothing may put a reach in front of someone who did not ask.

**Scale/Scope**: ~5 new screens (check-in, history, one day, settings additions, deletion),
6–8 new commands, 2 new tables, 1 new pure module, 38 functional requirements, 18 success
criteria.

## The standing guards

This slice is unusual in that most of its risk sits in automated checks that already pass.
Recording them here is not documentation for its own sake — four must be modified, and each
modification is a place where a property slice `002` bought could be given back for free.

| Guard | Today | This slice |
| --- | --- | --- |
| `check-no-notifications.sh` | Fails if any notification capability, plugin, or browser API appears anywhere | **Rewritten.** The capability becomes legitimate; the check must forbid every notification *other than* the one daily announcement, and the once-per-day bound moves into tests |
| `eslint.config.js` — `no-restricted-syntax` on `new Notification` | Forbids the constructor outright | **Narrowed**, not removed: the announcement goes through the plugin from one module, and the raw constructor stays forbidden everywhere |
| `eslint.config.js` — `no-restricted-imports` on `ipc/reaches` | Only `screens/Reaches.tsx` may import reach data | **Allowlist extended** to the check-in, the history, and the single-day screens — each a deliberate-navigation destination |
| `check-no-ambient-counts.mjs` | Hardcodes `Reaches.tsx` as the one place reach data may appear | **Allowlist extended, and the check strengthened** — see below |
| `check-no-streaks.mjs` | Fails on *streak*, *chain*, *in a row*, *day N*, *best run* anywhere | **Unchanged, and must keep passing.** Streaks are slice `004` |
| `check-banned-words.mjs` | Fails on the six words | Unchanged, and this slice writes more user-facing prose than any before it |
| `check-no-network-deps.sh` | Fails if anything network-capable enters the build graph | Unchanged — and it is the gate the new dependency must pass (R1) |
| `check-domain-purity.sh` | No I/O or platform conditionals in `domain/` | Unchanged — constrains where the pattern arithmetic may live (R4) |
| `tests/ipc_surface.rs` | Every exposed command classified by its effect on protection; the array is fixed-size | Every new command must be classified before it can be exposed |

**On widening the ambient-counts guard.** Its current form encodes *one screen may show
reaches*. Its actual intent, stated in its own header, is *nothing may put a reach in front
of someone who did not ask*. Those coincided in slice `002` and stop coinciding here, because
three screens now legitimately show reach data. The guard is therefore re-expressed against
its intent: an allowlist of deliberate-navigation destinations, plus a new prohibition it did
not previously need — no reach data in the application shell, the header, the navigation, a
tray, or a badge. It ends up forbidding more than it does today, not less. Anything less than
that is a weakening, and this plan treats a weakening as a defect rather than a trade-off.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design. Result: **PASS** — one
recorded shortfall in Complexity Tracking (C1), no unjustified violations.*

Evaluated against `.specify/memory/constitution.md` **v1.1.0**.

### I. The Wall Holds (NON-NEGOTIABLE)

| Rule | How this design satisfies it |
| --- | --- |
| No in-moment path around a protected domain | This slice adds no privileged verb and no command that reduces protection. The helper's vocabulary is untouched |
| Protection changes only from deliberate settings navigation | No screen added here offers, links to, or mentions a protection change. The check-in in particular MUST NOT — it is the one screen a notification leads someone to, and a route to a reduction sitting there would be the closest thing to an in-moment escape hatch this product could accidentally build |
| Reductions pass the active gate | Unchanged. The fixed 24-hour gate from `002` continues to govern every reduction |
| A blocked request produces no Cairn UI | Unchanged, and reinforced: the announcement is bound to a chosen hour, so it can never coincide with a reach |

**Design consequence, and the one worth stating plainly**: deleting reach history is *not* a
reduction in protection. It removes records, not blocks; nothing about what is protected
changes. It is classified alongside `delete_all_data` as having no effect on protection, and
a test asserts that no deletion command can alter the trail.

### II. Local-First, Zero Telemetry (NON-NEGOTIABLE)

- Journal entries and estimates go into the existing SQLCipher file under the existing key.
  No second store, no second key, no second fail-closed path to get wrong.
- Fail-closed extends to writing, not only reading: when the key is unavailable the
  journaling space is **not offered**, with the plain sentence explaining why. Accepting
  someone's writing and then failing to keep it is a worse outcome than saying so first, and
  is the specific failure this decision exists to prevent (R5).
- Quotes ship as a bundled resource beside the category seeds. Nothing is fetched.
- The new dependency is the only network-adjacent risk in the slice and is gated on R1.
- Configuration stays free of reach data, which a test in `002` already asserts; the evening
  hour and the announcement record are settings, not reaches, so that property holds.

### III. Honest About Limits

- Gaps are shown wherever a count covering them is shown (FR-022). Slice `002` already
  records them; this slice's obligation is to never render one as a zero.
- **A gap is a statement about Cairn, never about the person** (FR-022a). A day the person
  deleted produces no gap. Conflating the two would turn an honesty mechanism into a
  surveillance one.
- Day-level estimates are excluded from by-site and by-hour breakdowns, visibly (FR-023),
  because an estimate carries neither a site nor an hour.
- **C1**: the announcement cannot fire while Cairn is not running. Stated in the interface,
  recorded below, closed by the tray and autostart slice.
- The DST approximation in hour bucketing (R4) is stated in the interface rather than hidden.

### IV. Reversible by Construction (NON-NEGOTIABLE)

This slice makes **no privileged write and modifies no system file**, so the
backup-and-restore machinery is not engaged at all. Its obligations are narrower and still
real:

- The new tables live in the file `delete_all_data` already removes, and a test must prove
  journal entries and estimates are gone after it — a new table silently surviving a full
  deletion is the failure mode here.
- The inventory stays unencrypted and untouched, preserving `002`'s property that a machine
  is recoverable even when the key is not.

### V. Reflection Happens at Distance

This is the principle the slice exists to satisfy, and the one it is most able to damage.

| Rule | How this design satisfies it |
| --- | --- |
| No prompting in the moment or during the day | One announcement, at an hour the person set, at most once per local day. The decision to announce is made in Rust and durably recorded there, so a restarted or reopened window cannot produce a second (R2) |
| Reflection is opt-in and once daily | The announcement is turn-off-able and the check-in stays reachable without it (FR-003) |
| A reach is information, never failure | No congratulation, no shame, no comparison with yesterday, no total to beat — carried forward from `Reaches.tsx`, which already sets this tone |
| Never require typing or solving to reach a site or keep protection running | Nothing in this slice gates protection on anything the person writes. The journal has no bearing on enforcement whatsoever |
| — | **And the addition this slice makes**: a missed day must never become a debt. Backfill is permitted and MUST NEVER be invited, counted, or advertised (FR-026b) |

**The sanctioned exception, stated openly.** The ambient-counts guard's principle is that
nobody may be walked to their reaches. The daily announcement does exactly that, once, and
Principle V names it as permitted. This is the single exception in the product, it is bounded
by an hour the person chose, and it can be switched off. Recording it here matters because a
future reader comparing the guard's intent against this feature would otherwise be right to
call it a contradiction.

### VI. Voice, Language, and Gamification Discipline

- The six words stay absent; this slice writes more prose than any so far, and the automated
  check covers all of it.
- No streak, no day count, no chain — the `002` guard stays absolute and unmodified.
- Serif for reflective moments is already in the theme as `.reflective`; the check-in and the
  journal are the most reflective surfaces in the product and use it.
- Quotes must be chosen against this principle, not merely for sentiment: nothing that
  exhorts, congratulates, or implies a person is behind. R6 sets the selection criteria.
- Deletion copy is bound by FR-018b — no language of loss, cost, or regret, and no report of
  how much was removed.

### VII. Free at the Moment of Need (NON-NEGOTIABLE)

No account, payment, entitlement, or trial path. Everything in this slice is in
`specs/001-cairn-v1/spec.md` and is therefore permanently free. The existing check enforces
this and is unmodified.

### Enforcement architecture constraints

| Constraint | Verdict |
| --- | --- |
| Layer independence | **N/A** — this slice touches no enforcement layer |
| Platform abstraction | **PASS** — one new platform seam, for raising a notification, behind an interface like the existing services. No `#[cfg(target_os)]` in domain, IPC, or frontend code |
| Privilege | **PASS** — nothing here elevates; the helper is not called at all |
| Reach counting | **PASS** — this slice reads recorded reaches and records none |
| Data normalization | **N/A** — no new entry parsing |
| Mandatory coverage 1 (normalization/dedup) | **N/A** — unchanged from `002` |
| Mandatory coverage 2 (marker splicing) | **N/A** — no system file written |
| Mandatory coverage 3 (teardown/uninstall) | **PASS with an addition** — the new tables must be proven gone after full deletion |
| Mandatory coverage 4 (layer 2/3 degradation) | **N/A** — no layers 2 or 3 |
| No privileged write without reviewed teardown + test | **N/A** — no privileged write |
| Banned words in user-facing strings | **PASS** — automated, and this slice is its heaviest user |

## Project Structure

### Documentation (this feature)

```text
specs/003-reflection-and-history/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R7 and their rationale
├── data-model.md        # Phase 1 — the new entities and their on-disk shapes
├── quickstart.md        # Phase 1 — how to run and validate
├── contracts/
│   ├── ui-ipc.md              # The new command surface, and its classification
│   └── patterns.md            # The pure bucketing contract
├── checklists/
│   └── requirements.md  # Quality gate + validation history
└── tasks.md             # /speckit-tasks output — not created by /speckit-plan
```

### Source code (repository root)

Additions and modifications only; everything unlisted is untouched by this slice.

```text
src-tauri/src/
├── domain/
│   ├── patterns.rs            # NEW — pure bucketing by site, hour, day of week, and
│   │                          #       movement over a range. No I/O, no platform code
│   └── checkin.rs             # NEW — pure: is an announcement due for this local day,
│                              #       given what was last announced (R2)
├── store/
│   ├── history.rs             # MODIFIED — range reads, journal tables, estimates,
│   │                          #            deletion at day / range / all granularity
│   └── config.rs              # MODIFIED — evening hour, announcement switch, the record
│                              #            of the last day announced
├── reflection/                # NEW — the check-in's orchestration
│   ├── mod.rs
│   ├── checkin.rs             # assembling a day: reaches, gaps, estimate, entry
│   └── journal.rs             # save, revise, delete; refuses when the key is sealed
├── platform/
│   └── announce.rs            # NEW — the one seam that raises a notification
├── services/mod.rs            # MODIFIED — the announcement trait joins the existing set
└── ipc/
    ├── commands.rs            # MODIFIED — the new commands
    └── state.rs               # MODIFIED — the new orchestration entry points

src-tauri/resources/
└── quotes/quotes.json         # NEW — bundled, no network (R6)

src/
├── screens/
│   ├── CheckIn.tsx            # NEW — the evening ritual
│   ├── History.tsx            # NEW — by site, by hour, by day of week, over a range
│   ├── Day.tsx                # NEW — one day, whole: reaches, gaps, entry
│   └── Settings/
│       ├── EveningHour.tsx    # NEW — the hour, and the announcement switch
│       └── DeleteHistory.tsx  # NEW — day, range, or all (FR-018, FR-018b)
├── ipc/
│   ├── reaches.ts             # MODIFIED — range reads join the restricted module
│   └── journal.ts             # NEW — journal and estimate calls
├── announce.ts                # NEW — the only module that may raise a notification
└── App.tsx                    # MODIFIED — new destinations, and no reach data in the shell

scripts/
├── check-no-notifications.sh  # REWRITTEN — see The standing guards
└── check-no-ambient-counts.mjs # MODIFIED — allowlist extended, prohibition widened

eslint.config.js               # MODIFIED — both restrictions adjusted, neither removed
```

**Structure Decision**: The existing layering is kept exactly as slice `002` established it —
pure `domain/` with no I/O, stores that own persistence, an orchestration layer above them,
`ipc/` as the only boundary the frontend crosses, and platform differences behind traits. Two
things follow from that and are worth naming. The pattern arithmetic goes in `domain/` so it
is property-testable without a database or a GUI, which is why the local-time offset is
passed *in* rather than read (R4). And the announcement decision goes in `domain/checkin.rs`
as a pure function over *what was last announced* and *what time it is now*, so the
once-per-day bound is provable by a unit test rather than by inspection of a timer — which is
precisely the proof the rewritten guard needs to lean on.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **C1 — The announcement cannot fire while Cairn is not running.** FR-001 and FR-002 require the check-in to be announced once daily at the chosen hour. Cairn has no tray presence and no autostart until a later slice, so if the application is not open when that hour passes, nothing is announced. | The tray, autostart, and background presence are v1 FR-058 – FR-061 and belong to their own slice. Building a background presence here means an autostart entry, a tray surface, and a startup inventory item — all removal-surface additions governed by Principle IV — in service of a notification, which inverts the priority order the v1 PRD sets. | *Announce late, when Cairn is next opened*: rejected outright. A notice at 2am for a 9pm check-in is an interruption at the worst possible time, and FR-006 forbids it. *Have the privileged helper announce it*: rejected on Principle I and V grounds — the helper is elevated, deliberately has no channel to the interface, and giving it one so it could interrupt someone is the worst trade in this document. *Accept it silently*: rejected on Principle III. **Mitigation, and it is most of the answer**: the check-in is always available un-announced, so nothing is lost but the reminder; the interface states plainly that the reminder needs Cairn to be running. **Closing condition**: the tray and autostart slice (v1: FR-058 – FR-061). Not a release blocker — the feature is fully usable without the reminder, which is why FR-003 makes the reminder optional in the first place. |

## Post-Design Re-check

Re-evaluated after Phase 1 (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`).
No gate changed verdict. Four things the design surfaced that the pre-design check did not:

1. **Fail-closed had a write half nobody had specified.** The constitution's fail-closed
   clause is written about reading — "report that history cannot be opened". A journal
   introduces the opposite case: a person typing 300 words into a box that cannot store
   them. Refusing to offer the box is the only option that does not lose their words, and it
   is now a requirement rather than an implementation detail (R5).
2. **The pattern arithmetic forced a decision about local time.** Bucketing by hour and by
   day of week is inherently local, `domain/` may not read a clock or a timezone, and the
   dependency policy resists adding a timezone crate. Passing the offset inward keeps all
   three intact at the cost of a stated DST approximation (R4).
3. **Deletion and gaps had to be actively separated.** Both are absences of data. The gap
   machinery already exists and rendering a deleted day through it would have been the
   shortest path in the codebase — and would have recreated the visible marker the project
   owner explicitly rejected. FR-022a exists because the easy implementation is the wrong
   one.
4. **The `CLASSIFIED` array in `ipc_surface.rs` is a fixed-size array of 15.** Every new
   command forces an edit to a test whose whole purpose is to make someone say what a
   command does to protection. This is working as intended and is called out so no one
   mistakes it for an obstacle.
