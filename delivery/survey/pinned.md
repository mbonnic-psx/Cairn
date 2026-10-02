# Pinned behaviour

What `/characterise` has pinned, one row per behaviour: the current behaviour of code that existed before
the delivery method did, recorded at the seam where it can be observed, so that a change to it can be told
apart from a regression. A slice reads this before it changes code that is here; `/strangle` reads it when a
behaviour moves. Rows are appended, never rewritten — a behaviour that stopped being pinned says so in a new row.

| Date | Behaviour | Seam | Tests | Runs with |
|---|---|---|---|---|
| 2026-09-30 | Every exposed command is classified by its effect on protection, and an unclassified one fails the build | `src-tauri/tests/ipc_surface.rs` (`CLASSIFIED`) | `ipc_surface` | `cd src-tauri && cargo test -p cairn --no-default-features --test ipc_surface` |
| 2026-09-30 | Today's reaches, gaps and coverage note as `list_todays_reaches` serves them, and the sealed sentence when the history cannot be opened | `AppState::list_todays_reaches`, `Reaches.tsx` | `gaps`; `Reaches.test.tsx` | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test gaps`; `npx vitest run src/screens/__tests__/Reaches.test.tsx` |
| 2026-09-30 | No streak, day count or chain anywhere in the shell, and reach data only on the screens a person navigates to | `App.tsx` navigation | `Protection.test.tsx`; `scripts/check-no-ambient-counts.mjs`; `scripts/check-no-streaks.mjs` | `npx vitest run src/screens/__tests__/Protection.test.tsx`; `npm run check` |
| 2026-09-30 | The desktop app starts and opens its window | `main.rs` composition root | `scripts/smoke.sh app` | `make smoke` |
| 2026-10-01 | An older config.json loads, unknown keys tolerated, nothing it held lost | `ConfigStore::load` (`store/config.rs`) | `stores` | `cd src-tauri && cargo test -p cairn --no-default-features --test stores` |
| 2026-10-01 | The reaches screen opens on *Today*, and asks `list_todays_reaches` for this local midnight to that instant plus 86 400 seconds. Slice `history-by-site` changes the end to the next local midnight, which differs only on a 23- or 25-hour day | `Reaches` props `read` and `now`: the smallest seam, introduced by `history-by-site` with no change in behaviour | `ReachesToday.test.tsx` (the ordinary-day case; the clock-change case is the slice's RED) | `npx vitest run src/screens/__tests__/ReachesToday.test.tsx` |
| 2026-10-01 | `check-no-ambient-counts` accepts reach data in `Reaches.tsx`, `CheckIn.tsx`, `Day.tsx` and `src/ipc/`, and refuses it in the shell and everywhere else; `History.tsx` left the list on this date (003 H1) | `scripts/check-no-ambient-counts.mjs` (`NAVIGATED_TO`), `eslint.config.js` (the reaches block) | planted reach data in `src/screens/History.tsx`: refused by both | `npm run check:ambient-counts`; `npx eslint src/screens/History.tsx` |
