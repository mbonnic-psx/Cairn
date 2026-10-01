# Plan — slice `write-tonight`

**Feature**: `003-reflection-and-history` | **Slice**: 1 of `story-split.md` | **Date**: 2026-09-30

A person opens the check-in from the app at any time, sees today's reaches beside a space to write, saves an
entry, and reopens and revises it later the same evening. When the key is unavailable, the space is not offered
and the plain sentence is shown instead. No notification, no settings and no quote: those are slices 2–4.

**How this plan was made.** 003 was planned whole, before the delivery method arrived: `../../plan.md`,
`../../research.md`, `../../data-model.md` and `../../contracts/` are committed and stand. This plan takes this
slice's part of them and does not repeat them. It does not run Spec Kit's plan command through the links `/drive`
prescribes, because those links would write over the feature's committed plan (see *Complexity Tracking*).

## Scope

In, from `../../tasks.md`: T026, T027 (the check-in without the quote), T029, T030, T032 (`get_day` and
`save_journal_entry` only), T033 (those two commands only), T034 (`src/ipc/journal.ts`), T036 (without the
quote), T038 (the check-in destination only).

Out: the announcement (T024, T025, T028, T035: `evening-notice`), the settings (T037 and its three commands:
`evening-settings`), the quote (T031, `get_quote`: `quote`), the range read in `src/ipc/reaches.ts` (T034's
second half: `history`), and `is_skipped` / `needs_estimate` (T052: `one-day`).

Acceptance: US1 scenarios 4 and 6; the gaps review G1–G3 in `../../spec.md`; the edge cases *midnight while
open* and *nothing written*.

## Acceptance, as scenarios through the driving port

Constitution v1.3.0, *Acceptance-Driven Development*: each **When** enters through an IPC command, as
`AppState` serves it, and each **Then** is observed in what that command returns, or in what a later command
returns.

1. **Given** today holds two reaches and one coverage gap, **When** `get_day(today, start, end)` is called,
   **Then** the `DayView` carries both reaches, the gap, a coverage note, no entry, and no `sealed` sentence.
2. **Given** no entry for today, **When** `save_journal_entry(today, "A long day.")` is called, **Then** the
   returned `DayView`'s entry is that text; **and when** a fresh `AppState` over the same data directory calls
   `get_day(today, …)`, **then** the entry is still that text (reopened after a restart).
3. **Given** an entry for today, **When** `save_journal_entry(today, "Revised.")` is called, **Then** `get_day`
   returns `Revised.`, and the old text is nowhere in the database file (FR-015, data-model: no version kept).
4. **Given** an entry for today, **When** `save_journal_entry(today, "   ")` is called, **Then** it is refused
   with a plain sentence, and `get_day` still returns the saved entry (FR-014, G2).
5. **Given** the key is unavailable, **When** `get_day` is called, **Then** `sealed` is set and reaches and
   entry are absent; **and when** `save_journal_entry` is called, **then** it is refused and nothing is written
   (T026, FR-029).
6. **Given** the key was available when the day was read and is not when the save arrives, **When**
   `save_journal_entry` is called, **Then** it is refused with the plain sentence and nothing is stored (G1,
   Rust half). The screen half: the typed text stays in the space.
7. **Given** today holds no reaches, **When** `get_day` is called, **Then** reaches are empty, nothing is
   sealed, and the screen offers the space exactly as it does on a day with reaches (G3).
8. **Given** any check-in state, **When** its text is rendered, **Then** no banned word appears (scenario 6,
   FR-031), and no control leads to a protection change (Principle I).

## Structure Decision

The one deployable this touches is `src-tauri` (the core: IPC, the orchestration, the encrypted store), with the
screen in `cairn` (the interface). Both purposes in `project.json` cover it; nothing new is a service. One
vocabulary is in play (a day, its reaches, its entry), so there is one bounded context, and saying so is the
whole decision. The layering is the feature plan's, unchanged:

```text
src-tauri/src/
├── reflection/            # NEW — mod.rs, checkin.rs (assemble a DayView), journal.rs (save; refuse when sealed)
├── ipc/state.rs           # MODIFIED — get_day, save_journal_entry, beside list_todays_reaches
├── ipc/commands.rs        # MODIFIED — the two #[tauri::command]s
├── ipc/mod.rs             # MODIFIED — DayView exported, if the module re-exports views
├── lib.rs                 # MODIFIED — `pub mod reflection`
└── main.rs                # MODIFIED — two handlers registered
src-tauri/tests/
├── us1_write_tonight.rs   # NEW — scenarios 1–4, 6, 7
├── fail_closed_journal.rs # NEW — scenario 5 (T026)
└── ipc_surface.rs         # MODIFIED — CLASSIFIED 15 → 17, both `Effect::Reads`
src/
├── ipc/journal.ts         # NEW — getDayView, saveJournalEntry (the import-restricted module)
├── screens/CheckIn.tsx    # NEW — serif, today's reaches, the space
├── screens/__tests__/CheckIn.test.tsx  # NEW — T027 without the quote, plus G1 and G3
└── App.tsx                # MODIFIED — one quiet destination, no count, no hint
```

`DayView` ships the contract's fields that this slice can state truthfully: `reaches`, `gaps`, `coverage_note`,
`entry`, `estimate` (read from the store that already exists) and `sealed`. `is_skipped` and `needs_estimate`
are added by `one-day`, where they are derived (T052). Returning `false` for them here would be a claim that
nothing computed. The contract changes additively (constitution, *Versioning and Compatibility*).

The day is fixed when the check-in opens: the screen computes `today` and its bounds once and passes them to
every call, so a check-in open across midnight stays attached to the day it was opened for (edge case).

## Constitution Check (v1.3.0)

- **I. The Wall Holds:** the check-in has no control that changes protection, and scenario 8 tests for its
  absence. A blocked request still produces no Cairn UI; nothing here listens for one.
- **II. Local-First:** no new dependency, and nothing leaves the machine. The entry lives in the encrypted
  history, keyed from the credential store. A sealed key fails closed: reported, nothing written, nothing
  discarded (scenarios 5 and 6).
- **III. Honest About Limits:** the coverage note travels with the reaches (scenario 1). `DayView` carries no
  field this slice cannot compute.
- **IV. Reversible:** no system file is touched. Journal data is user data in the history database, which
  `delete_all_data` already removes (`tests/delete_all_data.rs`).
- **V. Reflection at Distance:** this slice raises no notification. The check-in is reached by navigation only.
- **VI. Voice:** every string passes `check-banned-words.mjs`, and no count, streak or chain appears
  (`check-no-streaks.mjs`, `check-no-ambient-counts.mjs`: `CheckIn.tsx` is already on its allowlist, from T002).
- **VII. Free:** nothing is gated.
- **Delivery Method:** trunk (this branch lives under a day on `main`); tests first (the RED tasks come before
  every GREEN one, and the Rust RED tests are written by a different agent than the implementation, as 003's
  earlier phases were); and adapters are tests of parse, delegate and outcome, with the empty-text rule proved at
  the store, where it lives.

## Pin

This slice changes code that was here: `ipc/state.rs`, `ipc/commands.rs`, `main.rs`, `App.tsx`. The behaviours at
those seams that it must not change are already pinned by existing tests, recorded in
`delivery/survey/pinned.md` (the host's ledger, written on the adoption branch ahead of this one, each row run green
on 2026-09-30):

- the exposed command surface and each command's effect on protection: `src-tauri/tests/ipc_surface.rs`;
- today's reaches, gaps and the sealed sentence as `list_todays_reaches` serves them: `src/screens/__tests__/Reaches.test.tsx` and `src-tauri/tests/gaps.rs`;
- the shell's navigation carrying no count: `src/screens/__tests__/Protection.test.tsx` and `check-no-ambient-counts.mjs`;
- the application starting: `scripts/smoke.sh app` (`make smoke`), because `main.rs` changes.

## Complexity Tracking

| Deviation | Why | What was done instead |
|---|---|---|
| The plan and tasks were not produced by Spec Kit's commands through `/drive`'s links | `specs/003-…/plan.md` and `tasks.md` are committed feature-level files from before adoption, and the links would write over them | This slice's plan and tasks were written under `slices/write-tonight/` from the committed feature plan, which they cite rather than restate |
