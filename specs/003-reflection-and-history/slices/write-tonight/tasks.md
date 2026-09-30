# Tasks — slice `write-tonight`

Numbered `W`, and each names the feature task it carries out (`../../tasks.md`). RED before GREEN, always: a GREEN
task starts only once the RED task it answers has been seen failing for the reason it states.

## Phase 1 — RED: the behaviour, stated as failing tests

- [ ] W1 [T027-adjacent, scenarios 1–4, 6, 7] Write `src-tauri/tests/us1_write_tonight.rs` against `AppState`, the
  driving port: the day assembled (reaches, gap, coverage note, no entry), save, reopen through a fresh `AppState`,
  revise with the old text absent from the database file, whitespace refused over an existing entry (G2), the key
  lost between read and save (G1), and a day with no reaches (G3). Written by a different agent than W5–W7.
- [ ] W2 [T026, scenario 5] Write `src-tauri/tests/fail_closed_journal.rs`: key unavailable, `get_day` sealed with
  reaches and entry absent, and `save_journal_entry` refused with no database file written or changed.
- [ ] W3 [T033] Grow `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs` from 15 to 17 with `get_day` and
  `save_journal_entry`, both `Effect::Reads` (no effect on protection), so the surface test fails until both are
  exposed and registered.
- [ ] W4 [T027, scenario 8, G1, G3] Write `src/screens/__tests__/CheckIn.test.tsx`: today's reaches beside the
  space; save and see the entry; reopen and see it; sealed shows the sentence and no text area; a refused save
  keeps the typed text and shows the sentence; no reaches reads the same, with no congratulation; no banned word;
  no control that changes protection.

## Phase 2 — GREEN: the least that passes

- [ ] W5 [T029] `src-tauri/src/reflection/checkin.rs`: assemble a `DayView` from the history (reaches, gaps,
  coverage note, entry, estimate) or the sealed sentence.
- [ ] W6 [T030] `src-tauri/src/reflection/journal.rs`: save through `OpenHistory::save_entry`, refusing outright
  when the history is sealed. The empty-text rule stays in the store, where it is proved.
- [ ] W7 [T032] `get_day` and `save_journal_entry` on `AppState` (`ipc/state.rs`), as `#[tauri::command]`s
  (`ipc/commands.rs`), and registered in `main.rs`. Both behave under `--no-default-features` the way
  `list_todays_reaches` does: sealed, with the sentence that this build keeps no history.
- [ ] W8 [T034] `src/ipc/journal.ts`: `getDayView(day, dayStart, dayEnd)` and `saveJournalEntry(day, text)`,
  typed to the `DayView` this slice ships.
- [ ] W9 [T036] `src/screens/CheckIn.tsx`: serif for the reflective surface, today's reaches, the space, save.
  The day and its bounds are fixed at open. A refused save leaves the text where it was.
- [ ] W10 [T038] `src/App.tsx`: one quiet destination for the check-in, beside *Today*, with no count and no hint.

## Phase 3 — Hold it

- [ ] W11 `make verify` green; `make smoke` green (main.rs changed); `npm run check` green.
- [ ] W12 After the merge, on `main` (the feature's `tasks.md` is the host's; `check-slice-scope` refuses it on this
  branch): tick T026, T029, T030 and T036 in `../../tasks.md`, and note T027, T032, T033, T034 and T038 as partly
  done, naming what remains and for which slice.

## Convergence

Not yet run.
