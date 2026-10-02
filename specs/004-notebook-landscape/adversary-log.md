# Adversary log — The notebook in the landscape

Every surface attacked in this feature, slice by slice. A slice that skips cites the rows here that cover it.

## frame · 712ab5d · 2026-10-01

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | not present | no IPC command, route or CLI added (`src-tauri/tests/ipc_surface.rs` unchanged). The "Look (testing)" control is an in-window development tool, not an adapter |
| driven adapter or the provider types behind one | not present | no store, file or system call touched. `src-tauri/tauri.conf.json` changes only the opening window size |
| authorisation decision (who can reach one that already exists) | widened | `src/App.tsx`: the notebook must be unreachable in a released build (`import.meta.env.DEV && devBuild`). A new gate on who can reach a whole interface (FR-012, SC-002) |
| concurrency, idempotency, ordering, retention, or time | widened | `src/shell/Greeting.tsx`, `src/look/look.ts`: the greeting claims the true weekday and time, kept up within a minute (FR-030) |

Spawned: release gate on the notebook · `drive-adversary` · host (Opus 5.5) · delegated, fresh context · manifest: `src/App.tsx`, `src/look/LookSwitch.tsx`, `src/look/look.ts`, `src/shell/CurrentShell.tsx`, `src/shell/NotebookShell.tsx`, `src/main.tsx`, `src/styles/notebook.css`, `src/styles/theme.css`, `vite.config.ts`, `src-tauri/tauri.conf.json`, `src/shell/__tests__/AppLook.test.tsx`, `src/shell/__tests__/LookSwitch.test.tsx`, `slices/frame/quickstart.md`
Spawned: time on the greeting · `drive-adversary` · host (Opus 5.5) · delegated, fresh context · manifest: `src/shell/Greeting.tsx`, `src/look/look.ts`, `src/shell/NotebookShell.tsx`, `src/shell/__tests__/Greeting.test.tsx`, `src/look/__tests__/look.test.ts`, `src/App.tsx`
Omitted: driving and driven adapters · not present (no IPC, store or system call in the diff)

Findings (triaged by the host, 2026-10-01):

| # | Severity | Triage | State | Finding |
|---|---|---|---|---|
| T1 | MEDIUM | confirmed | fixed in 06e1eca (`Greeting.test.tsx`: visibility, focus) | After the machine sleeps, or the clock is changed by hand, the greeting shows the old weekday and time for up to 60 s. `Greeting.tsx` computes the minute boundary once at mount, then runs a blind 60 s interval and never re-reads the clock on wake or visibility. Reproduced with fake timers: mount Thu 07:48:20, +50 s, clock set to Fri 08:30:05; it still shows "Thursday 7:49 AM" 49.999 s later (FR-030 "true weekday and time"). |
| T2 | LOW | confirmed | fixed in 06e1eca (`Greeting.test.tsx`: re-aims at :00, drift) | After any sleep or clock change, ticks no longer land on :00, so every later minute is shown up to about 59 s late until restart. Same fix as T1: re-derive the delay to the next minute from the clock on every tick, and refresh on `visibilitychange` and focus. |
| T3 | LOW | duplicate | declined | The 12- or 24-hour choice follows the webview's locale, not the operating system's 24-hour switch. Already recorded as a webview limit in research R4. |
| R1 | LOW | confirmed | deferred to `reveal` | The notebook's code, CSS and fonts ship in the production bundle, unreachable: no element carries `data-look` or `nb-switch`, and the shell setter is dead code (`N` is always "current"). Quickstart step 4's grep catches only the label. `reveal` removes today's interface and the gate together; until then, the code only goes out in a released build, which none is planned before the clock feature (FR-013a). |
| R2 | LOW | question | declined, confirmed by the owner 2026-10-01 (D2) | A released build opens at 1280×800, not 1000×720, before the reveal. That differs from the letter of SC-009 and FR-012. The owner asked for 1280×800 explicitly (FR-028, gaps review 2026-10-01). The window's size is not the interface the reveal guards. Decided by the host on that standing answer; the owner may reverse it. |

No CRITICAL or HIGH. Current is byte-for-byte today's: `innerHTML` matched `main`'s App for three statuses across every tab, and the production CSS adds only `.nb-`/`[data-look]` rules, `@font-face` and two unused `:root` properties.

## looks · 522e163 · 2026-10-02

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | not present | no IPC command, route or CLI added (`src-tauri/` untouched, `ipc_surface.rs` unchanged); the switch gains two choices of an in-window development control |
| driven adapter or the provider types behind one | not present | no store, file or system call touched; the diff is `src/look/`, `src/shell/`, `src/styles/notebook.css` and one line of `src/App.tsx` |
| authorisation decision (who can reach one that already exists) | already covered | row `frame` (release gate on the notebook): `src/App.tsx` still forces `current` outside a dev build and drops the switch at build time; this diff changes only which notebook look renders inside the gate. Re-proved at the demo (R8) and by T013 |
| concurrency, idempotency, ordering, retention, or time | already covered | row `frame` (time on the greeting): `src/shell/Greeting.tsx` changes only the words, chosen by the look; its clock code is untouched |

Skipped: nothing widened, and the slice does not close the split. Covered by rows `frame` · release gate on the notebook and `frame` · time on the greeting.

## protection-page · 10f55e1 · 2026-10-02

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | not present | no IPC command, route or CLI added (`src-tauri/` untouched, `ipc_surface.rs` unchanged); the demo fake core lives under `specs/…/demo/` and ships in no build |
| driven adapter or the provider types behind one | not present | no store, file or system call touched; the diff is `src/screens/Protection.tsx`, `src/screens/Trail.tsx`, `src/shell/`, `src/styles/` and one import line in `src/main.tsx` |
| authorisation decision (who can reach one that already exists) | already covered | row `frame` (release gate on the notebook): `src/App.tsx` is untouched, so a released build still forces `current`; the new page context is provided only by `NotebookShell`, inside that gate |
| concurrency, idempotency, ordering, retention, or time | already covered | row `frame` (time on the greeting): `Greeting.tsx` changes its element only (`h2` to `p`, D9); `whenWas` in `Protection.tsx` is today's, unchanged; "Keep things as they are" is the same handler in both layouts |

Skipped: nothing widened, and the slice does not close the split. Covered by rows `frame` · release gate on the notebook and `frame` · time on the greeting.

## setup-pages · 956ce4a · 2026-10-02

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | not present | no IPC command, route or CLI added (`src-tauri/` untouched, `ipc_surface.rs` unchanged); the demo fake core lives under `specs/…/demo/` and ships in no build (T017) |
| driven adapter or the provider types behind one | not present | no store, file or system call touched; the diff is `src/screens/Setup/`, `src/screens/Disclosure.tsx`, `src/styles/setup-pages.css`, one import in `src/main.tsx` and the choosing block of `src/App.tsx`, which now renders `Choosing` with today's `toggle`, `note` and `setStep('disclosure')` |
| authorisation decision (who can reach one that already exists) | already covered | row `frame` (release gate on the notebook): a released build still forces `current`; the page context is provided only by `NotebookShell`, inside that gate; "Yes, set this up" calls today's `confirm` in both layouts (`AppSetupPages.test.tsx`) |
| concurrency, idempotency, ordering, retention, or time | already covered | the add-then-read-back order in `CustomEntry.tsx` and the waiting untick are today's, unchanged (pinned by `SetupCurrentPin.test.tsx`); no time is read |

Skipped: nothing widened, and the slice does not close the split. Covered by row `frame` · release gate on the notebook. The disclosure's yes before its details arrive is today's behaviour, handed to 002 (D20).

## quiet-pages · 716a7e7 · 2026-10-02

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | not present | no IPC command, route or CLI added (`src-tauri/` untouched, `ipc_surface.rs` unchanged); `App.tsx` unchanged; the demo fake core ships in no build |
| driven adapter or the provider types behind one | not present | no store, file or system call touched; the diff is `src/screens/Limits.tsx`, `src/screens/Teardown.tsx`, `src/styles/quiet-pages.css`, the tab focus ring in `src/styles/notebook.css`, one import in `src/main.tsx`, and tests |
| authorisation decision (who can reach one that already exists) | already covered | row `frame` (release gate on the notebook): a released build still forces `current`; Teardown stays unreachable from the app (D16) |
| concurrency, idempotency, ordering, retention, or time | not present | the screens render what they are given; nothing reads time or orders anything new |

Skipped: nothing widened, and the slice does not close the split. Covered by row `frame` · release gate on the notebook.
