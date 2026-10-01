# Tasks — slice `write-tonight`

Numbered `W`, and each names the feature task it carries out (`../../tasks.md`). RED before GREEN, always: a GREEN
task starts only once the RED task it answers has been seen failing for the reason it states.

## Phase 1 — RED: the behaviour, stated as failing tests

- [x] W1 [T027-adjacent, scenarios 1–4, 6, 7] Write `src-tauri/tests/us1_write_tonight.rs` against `AppState`, the
  driving port: the day assembled (reaches, gap, coverage note, no entry), save, reopen through a fresh `AppState`,
  revise with the old text absent from the database file, whitespace refused over an existing entry (G2), the key
  lost between read and save (G1), and a day with no reaches (G3). Written by a different agent than W5–W7.
- [x] W2 [T026, scenario 5] Write `src-tauri/tests/fail_closed_journal.rs`: key unavailable, `get_day` sealed with
  reaches and entry absent, and `save_journal_entry` refused with no database file written or changed.
- [x] W3 [T033] Grow `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs` from 15 to 17 with `get_day` and
  `save_journal_entry`, both `Effect::Reads` (no effect on protection), so the surface test fails until both are
  exposed and registered.
- [x] W4 [T027, scenario 8, G1, G3] Write `src/screens/__tests__/CheckIn.test.tsx`: today's reaches beside the
  space; save and see the entry; reopen and see it; sealed shows the sentence and no text area; a refused save
  keeps the typed text and shows the sentence; no reaches reads the same, with no congratulation; no banned word;
  no control that changes protection.

## Phase 2 — GREEN: the least that passes

- [x] W5 [T029] `src-tauri/src/reflection/checkin.rs`: assemble a `DayView` from the history (reaches, gaps,
  coverage note, entry, estimate) or the sealed sentence.
- [x] W6 [T030] `src-tauri/src/reflection/journal.rs`: save through `OpenHistory::save_entry`, refusing outright
  when the history is sealed. The empty-text rule stays in the store, where it is proved.
- [x] W7 [T032] `get_day` and `save_journal_entry` on `AppState` (`ipc/state.rs`), as `#[tauri::command]`s
  (`ipc/commands.rs`), and registered in `main.rs`. Both behave under `--no-default-features` the way
  `list_todays_reaches` does: sealed, with the sentence that this build keeps no history.
- [x] W8 [T034] `src/ipc/journal.ts`: `getDayView(day, dayStart, dayEnd)` and `saveJournalEntry(day, text)`,
  typed to the `DayView` this slice ships.
- [x] W9 [T036] `src/screens/CheckIn.tsx`: serif for the reflective surface, today's reaches, the space, save.
  The day and its bounds are fixed at open. A refused save leaves the text where it was.
- [x] W10 [T038] `src/App.tsx`: one quiet destination for the check-in, beside *Today*, with no count and no hint.

## Phase 3 — Hold it

- [x] W11 `make verify` green; `make smoke` green (main.rs changed); `npm run check` green.
- [ ] W12 After the merge, on `main` (the feature's `tasks.md` is the host's; `check-slice-scope` refuses it on this
  branch): tick T026, T029, T030 and T036 in `../../tasks.md`, and note T027, T032, T033, T034 and T038 as partly
  done, naming what remains and for which slice.

## Done notes

- W3: growing `CLASSIFIED` alone could not fail, because the surface test only checked *exposed ⇒ classified*. The
  RED step added the reverse, `every_classified_command_is_exposed`.
- W7: `save_journal_entry` takes the day's bounds, so its `DayView` is the whole day (`contracts/ui-ipc.md`, amended
  in `a809862`). A read that does not go through is the sealed sentence, never an empty day.
- W9: the day ends at the next local midnight, not start + 86 400. `Reaches.tsx` still uses + 86 400, which is an
  hour out on a daylight-saving day. That is not this slice's code; it is offered as a task for `history`, which
  reads ranges.
- W11 (2026-10-01): `make verify` green apart from `check-slice-scope`, which reports the 289 adoption files not yet
  on `main` (PR #6) and none of this slice's. `make smoke` green with the two commands registered. `npm run check`:
  all seven guards clean. 11 Rust scenario tests, 6 surface tests, 9 screen tests.

## Phase 4 — carried from convergence (MEDIUM and below, not this slice's to close)

- [ ] W13 [LOW, for `history`] One shared `localDayBounds()` for every caller that passes bounds. `Reaches.tsx` still
  uses `start + 86 400`, an hour out on a daylight-saving day, so on such a day it and the check-in can show different
  reaches for the same "today" (convergence finding 5).
- [ ] W14 [LOW, every `src/ipc/*` wrapper] Pass on only a command's own `Err` sentence. Turn anything else (a transport
  or deserialisation error, whose text is outside the voice guard and may say "failed") into one plain sentence in voice
  (convergence finding 7).

- [ ] W15 [LOW] A day that cannot be loaded says so in a plain `<p>`, outside any live region (`CheckIn.tsx`, the
  loading path). Put it in the same `role="status"` region (convergence pass 2).
- [ ] W16 [LOW] If `secure_delete` cannot be set, the history seals, as a schema error already does
  (`store/history.rs`, `connect`). That matches the existing fail-closed rule, and it has no realistic trigger on
  SQLCipher. Recorded, not changed (convergence pass 2).

## Convergence

**Pass 1 (2026-10-01): not converged.** No CRITICAL and no HIGH. Each level was accounted for: store, orchestration,
adapter, screen, contract, tests. Closed in this slice, each with a test seen failing first, or a mutation the old
tests let through:

- **MEDIUM 1, midnight while open:** `CheckIn.test.tsx`, *keeps an entry on the day it was opened for, across
  midnight*. It kills the mutation that recomputes the day at save time.
- **MEDIUM 2, the screen half of G2:** *cannot clear a saved entry by saving nothing over it*. It kills the mutation
  that drops the empty-text guard.
- **MEDIUM 3, scenario 3 passing trivially:** `us1_write_tonight.rs` now opens the history and asserts one row for the
  day, holding only the new text. `secure_delete` is turned on where every history connection opens
  (`store/history.rs`, `connect`), and the test holds it (`erases_freed_pages`). The test was RED first: no such
  method existed.
- **MEDIUM 4, contract drift:** `contracts/ui-ipc.md` marks `is_skipped` and `needs_estimate` as not sent until
  `one-day`, and replaces "exactly as `Reaches.tsx` does" with local midnight to local midnight.
- **LOW 6, refusals heard by nobody:** the save outcome sits in one `role="status"` live region. *says what happened to
  a save where a screen reader will hear it* was RED first.
- **LOW 5 and LOW 7** carried as W13 and W14 above.

Constitution, per principle, with where it holds:
- **I:** no control changes protection (`CheckIn.tsx`; test *offers nothing that changes protection*).
- **II:** no new dependency. The entry lives only in the encrypted history (`ipc/state.rs`, `open_history`), and a
  sealed key fails closed with nothing written (`fail_closed_journal.rs`).
- **III:** the coverage note travels with the reaches (`day_view`), and unknown fields are absent, not `false`.
- **IV:** no system file is touched.
- **V:** no notification; the check-in is reached by navigation (`App.tsx`, *Tonight*).
- **VI:** guards clean, and every refusal is checked for voice (`us1_write_tonight.rs`).
- **VII:** nothing is gated.
- **Delivery Method:** RED `095064b` before GREEN `febe95b`, with scenarios through `AppState`. FR-015's "retaining no
  previous text" is now held below the row level too, by `secure_delete`.

**Pass 2 (2026-10-01): converged.** The confirming pass re-ran each pass-1 mutation against `6ecaff3`. Recompute at
save, drop the empty-text guard, `secure_delete` off, and remove the live region: each now fails a test. `connect` is
the only way a history connection opens. The contract matches `DayView` in Rust and TypeScript. `us1_write_tonight`
8/8, `fail_closed_journal` 3/3, `journal_store` 19/19, `CheckIn.test.tsx` 12/12. Two new LOWs, carried as W15 and W16.
The loop stops here, at its bound of two passes, and the slice goes to its demo.
