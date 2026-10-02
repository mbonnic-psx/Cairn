# Implementation Plan: The notebook in the landscape — slice `loose-ends`

**Branch**: `slice/loose-ends` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 8 · [decisions](../../decisions.md) D19, D26, D29, D30, D31

**Input**: Feature specification from `specs/004-notebook-landscape/spec.md`, slice `loose-ends` only: FR-007, FR-010,
FR-021, FR-022, FR-025, SC-002, SC-004, SC-009 and the Clarifications block "Gaps reviewed for slice `loose-ends`"
(D29–D31). Carried (D26): setup-pages T024 and T025 (`slices/setup-pages/tasks.md`, Phase 4), looks T024
(`slices/looks/tasks.md`), quiet-pages T013 (`slices/quiet-pages/tasks.md`, Phase 4). Not carried: frame T024, the
real-browser runner (D27). Contract: `contracts/ui-shell.md`, read and not amended.

## Summary

Nothing new for the person to see. Seven promises the pages already keep become promises a test holds, and two
small gaps in what the pages do are closed on the page only.

1. **No look switch in a released build (SC-002, D29).** A test builds the interface the way a release does, into
   a scratch directory under `~/.cache/cairn-scratch`, and searches every emitted file for the switch's label, its
   four choices as the switch names them and its accessible name. None may appear. The same test builds in
   development mode and finds them all, so the search has teeth.
2. **What is protected's left page by keyboard (FR-022, FR-025, D30).** On the page only, the left page that stays
   put and scrolls inside itself becomes a tab stop of its own, named by its heading, with the page area's focus
   ring (D19). The arrow keys then scroll it. Current is unchanged.
3. **"Yes, set this up" pressed on the page (setup-pages T024).** Through the real `App` with the fake core, in
   every look: success opens the Protection spread; a refusal returns to the choosing spread with the core's
   sentence on the left page and the boxes as they were.
4. **Every button on the setup and Protection spreads keeps an edge in forced colours (setup-pages T025).** The
   filled buttons, "Not yet" and Protection's "Keep things as they are" draw no border; under forced colours their
   backgrounds go and they read as bare words. Each slice sheet gains a forced-colours edge for every control it
   draws without one.
5. **Nothing a look re-points fades (looks T024, D3).** Protection's "Keep things as they are" is the last control a
   spread draws through the shared `Button`, which carries `transition-colors duration-200`. On the page it becomes a
   plain button with the same box. A sweep over every screen a page can show holds the class. `Button.tsx` is not
   touched (Current renders it, SC-009).
6. **The guards read every rule they model (quiet-pages T013).** The tab focus ring, hilltop cairn and greeting-band
   guards collect every rule that can apply to what they model, look-scoped and media-scoped included, and either
   model it or fail by name.
7. **The platform's own window frame (FR-007, D31).** A test over every window in `tauri.conf.json`, the window
   capabilities, and the interface and core sources: decorations not turned off, no title-bar overlay, no
   transparent window, and nothing that turns any of these off at run time.

Every word is today's (FR-018). Current, and every existing Current test, is unchanged (SC-009).

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3 (the interface). Rust is read by one test as text and not edited.

**Primary Dependencies**: Vite 6.4.3 (its CLI, run by the SC-002 test as a child process), Tailwind CSS 4.3.3,
Vitest 3.2.7 with Testing Library, `@tauri-apps/cli` 2.11.4's config schema (read for key names). No new package.

**Storage**: None.

**Testing**: Vitest + Testing Library (jsdom; the SC-002 and window-frame tests in the `node` environment). Screen
tests render the screen inside `NotebookShell`, as `ProtectionPage.test.tsx` does; App-level tests stand in at the
IPC seam with `installFakeCore` from `src/screens/__tests__/fakeCore.ts`, used and never edited. No mocking
framework, no new `vi.mock` (`AGENTS.md`). Files are read from disk through the dynamic `'node:' + 'fs'` import the
look tests already use, since the project carries no Node typings (`src/look/__tests__/tokens.test.ts:6-11`).

**Target Platform**: Tauri 2 desktop webview on Windows, macOS and Linux. Forced colours exist on Windows
(WebView2); WebKit has no forced-colours mode, so item 4 is a Windows promise held on every platform's CSS.

**Project Type**: Desktop application, interface layer.

**Performance Goals**: The SC-002 test makes two builds of about 1.3 s each on this machine (research R1); its
timeout is generous so a slow CI runner does not flake.

**Constraints**: Current element for element as today (SC-009); existing Current tests unedited. Words unchanged
(FR-018). Colour from look tokens, system colours only inside `@media (forced-colors: active)`. Nothing moves
(FR-023, D3). Scratch builds under `~/.cache/cairn-scratch`, never `/tmp` (RAM on this machine), removed after.

**Scale/Scope**: Edited: `src/screens/Trail.tsx` and `src/screens/Protection.tsx` (page branches only),
`src/styles/protection-page.css`, `src/styles/setup-pages.css`, `src/styles/tonight-page.css` (its forced-colours block only, added by convergence task T013), the three guards
`src/look/__tests__/tabFocusRing.test.ts`, `src/look/__tests__/hilltopCairn.test.ts` and the T016 `describe` of
`src/look/__tests__/tokens.test.ts`. New tests, each in a new file (research R8): the released-build search, the
left page by keyboard, the confirm through `App`, the forced-colours edge sweep, the no-fade sweep over every page
screen, and the window frame. Not edited: `src/components/Button.tsx`, `src/App.tsx`, `src/look/LookSwitch.tsx`,
anything under `src/shell/`, `src-tauri/`, `package.json`, the lock, `Makefile`, `delivery/`, CI, `project.json`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing reacts to a blocked request. The testing switch is held out of every released build (item 1), so no released control can change what a person sees. | Pass |
| II. Local-First, Zero Telemetry | No dependency. The SC-002 test runs the Vite already installed, offline, into a local scratch directory. | Pass |
| III. Honest About Limits | Item 3 holds that a refusal to turn protection on comes back in the core's own words on the page. "Keep things as they are" still asks the core and says what happened (unchanged). | Pass |
| IV. Reversible by Construction | No system file touched. | N/A |
| V. Reflection Happens at Distance | No notification, prompt or required answer added. The window keeps the platform's own close, minimise and move controls (item 7). | Pass |
| VI. Voice, Language, and Gamification Discipline (v1.5.0) | No new words: the left page's name is its heading, already on screen. Nothing fades (item 5). Typewriter face only where it is today. | Pass |
| VII. Free at the Moment of Need | Nothing gated. | Pass |
| Continuous Integration on Trunk | Behind the development switch; Current the default and unchanged. Item 1 is the proof that the switch stays behind it. | Pass |
| Agent-Generated Change Meets the Same Bar; Tests First | One RED-GREEN-REFACTOR increment per rule. Items whose GREEN is a test alone prove teeth by the sanctioned break-and-restore. | Pass |

No violations. Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** still passes. No IPC command added, so `ipc_surface.rs` is untouched. No
Rust test touched, so no `#[cfg(unix)]` question arises.

## Project Structure

### Documentation (this slice)

```text
specs/004-notebook-landscape/
├── spec.md, story-split.md, decisions.md      # feature-wide
├── contracts/ui-shell.md                      # read, not amended
└── slices/loose-ends/
    ├── plan.md            # this file
    ├── research.md        # Phase 0
    ├── data-model.md      # Phase 1 (nothing new modelled)
    ├── quickstart.md      # Phase 1: what to run, per item
    └── tasks.md           # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── screens/
│   ├── Trail.tsx                # page branch: the left page a named tab stop (D30)
│   └── Protection.tsx           # page branch: "Keep things as they are" a plain button (looks T024)
├── styles/
│   ├── protection-page.css      # the left page's focus ring; the note button's box; forced-colours edge
│   └── setup-pages.css          # forced-colours edge for the borderless buttons
├── look/__tests__/
│   ├── tabFocusRing.test.ts     # T013: every rule for the ring
│   ├── hilltopCairn.test.ts     # T013: every rule for the cairn and hills
│   ├── tokens.test.ts           # T013: inside the T016 describe only
│   ├── forcedColoursEdges.test.tsx   # NEW: every control the setup and Protection spreads draw
│   └── nothingFades.test.tsx         # NEW: every screen a page shows, every look
├── screens/__tests__/
│   └── TrailPageKeyboard.test.tsx    # NEW: the left page by keyboard, every look, both titles
└── shell/__tests__/
    ├── releasedBuild.test.ts         # NEW: SC-002 (D29)
    ├── windowFrame.test.ts           # NEW: FR-007 (D31)
    └── AppSetupConfirm.test.tsx      # NEW: "Yes, set this up" both ways, every look
```

**Structure Decision**: The slice lives in the `.` deployable (`cairn`, kind `tool`, the TypeScript interface),
where every 004 slice has put its code. `src-tauri` is read as text by the window-frame test and not changed. Under
the accepted strategy (ADR 0002, leave-it) the code stays in the interface's existing home, as every page slice
did. **Bounded context:** one; the slice adds no vocabulary.

**Pin**: `Trail.tsx` and `Protection.tsx` existed before the method; this slice changes only their page branches.
Their Current output is pinned element for element by the 2026-10-02 row for `ProtectionCurrentPin.test.tsx`
(`pinCases.ts`), which includes "Keep things as they are" as the shared `Button` renders it. The setup screens'
Current output is pinned by the `SetupCurrentPin.test.tsx` row; the window's configuration by the 2026-10-01
`tauri.conf.json` row. No new behaviour of pre-method code is changed outside a notebook page, so no new row is
needed: the Pin stage passes on those rows, run green before the first increment. The `before_plan` hook
(`characterise`, optional) is satisfied by the same rows.

## Complexity Tracking

None.

## Open questions

None at plan time. Every product question this slice raised was answered at slice gaps (D29–D31).
