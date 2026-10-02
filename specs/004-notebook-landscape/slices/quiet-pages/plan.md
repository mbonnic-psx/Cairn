# Implementation Plan: The notebook in the landscape — slice `quiet-pages`

**Branch**: `slice/quiet-pages` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 6 · [decisions](../../decisions.md) D6, D10, D16

**Input**: Feature specification from `specs/004-notebook-landscape/spec.md`, slice `quiet-pages` only: US3 (What Cairn
covers, This machine is as it was); FR-016, FR-018, FR-021, FR-022, FR-025, FR-031, SC-009; the Clarifications
answer "Some screens hold little … the right page is a blank ruled page" and the block "Gaps reviewed for slice
`quiet-pages`" (D16). Carried (D10): looks T020, T022 and T023 (`slices/looks/tasks.md`, *Converge pass 2* and
*After-converge gaps*). Contract: `contracts/ui-shell.md`, all of it, in particular *Knowing it is on a page*, *A step
of more than one screen* (this slice's prefixes, `.nb-limits-` and `.nb-teardown-`) and *Look tokens*.

## Summary

Two quiet screens become notebook spreads, and three open details of the looks are closed.

1. **What Cairn covers as a spread (FR-018, FR-031).** Left page: the heading, the lines Cairn covers, *What it does
   not cover in this release* with its lines, *What is kept, and how* with the encryption sentence, and the note on
   administrators under a hairline. Right page: blank and ruled. Nothing is invented to fill it.
2. **This machine is as it was as a spread, both outcomes (FR-018, FR-031, FR-016; D16).** Left page: the heading
   (*This machine is as it was* or *Almost everything is undone*), its sentence, what was checked, and *Still here*
   with what is left, each marked with an amber dot. Right page: blank and ruled. The screen is not reachable from
   the app; tests render it inside the notebook in every look and both outcomes, and the demo names it under *Not
   working yet* (D16).
3. **The carried looks tasks (D10).** T020: the guard that keeps the sun or moon from sitting behind the greeting
   covers every window 800×600 upwards, with the text bands read from the stylesheet and the glow counted. T022: the
   hilltop cairn's outline stones are held at 3:1 against whatever is directly behind them, hill or sky, per look.
   T023: the tab focus ring is visible on all four sides at night, where one side lies on the paper.

Every word, list and state is today's, word for word (FR-018). Current, and every existing screen test, is unchanged
(SC-009).

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3 (the interface). Rust is untouched.

**Primary Dependencies**: Vite 6.4.3, Tailwind CSS 4.3.3, Vitest 3.2.7 with Testing Library. No new package.

**Storage**: None. The screens read the `Disclosures` and `TeardownReport` they are handed, as today.

**Testing**: Vitest + Testing Library (jsdom). Screen tests render the screen with props inside `NotebookShell` (as
`ProtectionPage.test.tsx` does). The App-level test stands in at the IPC seam with the fake already in the test tree,
`src/screens/__tests__/fakeCore.ts` (`window.__TAURI_INTERNALS__.invoke`; protection-page research P4). No mocking
framework is added and no new test uses `vi.mock` (`AGENTS.md`). Stylesheet tests read CSS from disk, as
`tokens.test.ts` reads `notebook.css`. Geometry tests compute from the stylesheet's own values; no layout engine runs
in jsdom (research Q4–Q6).

**Target Platform**: Tauri 2 desktop webview on Windows, macOS and Linux.

**Project Type**: Desktop application, interface layer.

**Performance Goals**: None beyond today's. Two static layouts, no animation.

**Constraints**: Current unchanged element for element (SC-009). Words unchanged (FR-018). Colour only from look
tokens (contract, *Look tokens*). Amber, never red, for what is still here (FR-016). Text at 4.5:1 on every look's
paper (FR-021). Focus visible (FR-022). Content reachable down to 800×600, scrolling inside the notebook (FR-025).
Nothing moves (FR-023, D3).

**Scale/Scope**: New: `src/styles/quiet-pages.css` (this slice's `.nb-limits-` and `.nb-teardown-` rules) and its one
import line in `src/main.tsx` (the composition root). Edited: `src/screens/Limits.tsx`, `src/screens/Teardown.tsx`
(a branch taken only on a page; today's words hoisted to one constant each so both layouts read them once). For the
carried tasks only: `src/styles/notebook.css` (T023's ring), the T016 `describe` in
`src/look/__tests__/tokens.test.ts` (T020), and `src/shell/Landscape.tsx` only if T022's sweep finds a stone below
its floor (research Q5 expects none). Tests in new files beside them. No shell code changes: the hook (D6) and the
heading outline (D9) are protection-page's and are used as they are.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing here reacts to a blocked request. What Cairn covers is reached only by its tab (FR-027); teardown is not reachable at all. | Pass |
| II. Local-First, Zero Telemetry | No dependency, no font or image fetched, no data touched. | Pass |
| III. Honest About Limits | What Cairn does not cover stays on the same page as what it covers, in the same words (FR-009a's line verbatim from the core); the note that an administrator can undo Cairn stays. Teardown still names what is left and never rounds it down: the heading follows `report.complete`, the residue is listed whenever there is any, as today. | Pass |
| IV. Reversible by Construction | No system file touched. The teardown *report* is restyled; teardown itself is not changed. | N/A |
| V. Reflection Happens at Distance | No notification, prompt or required answer added. | Pass |
| VI. Voice, Language, and Gamification Discipline (v1.5.0) | Words unchanged; teardown reports, never congratulates (the existing test holds it). Amber for what is still here; no red. Serif for headings, lists and sentences; the typewriter face only for the two small section labels and *Still here*. No count added. | Pass |
| VII. Free at the Moment of Need | Nothing gated. | Pass |
| Continuous Integration on Trunk | Lands behind the development switch; Current is the default and unchanged (FR-011, FR-032). | Pass |
| Agent-Generated Change Meets the Same Bar; Tests First | One RED-GREEN-REFACTOR increment per rule; today's markup pinned before either screen changes (*Pin*). | Pass |

No violations. Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** still passes. No IPC command added, so `ipc_surface.rs` is untouched. No
`src/shell/` file imports from `src/ipc`.

## Project Structure

### Documentation (this slice)

```text
specs/004-notebook-landscape/
├── spec.md, story-split.md, decisions.md      # feature-wide
├── contracts/ui-shell.md                      # read, not amended
└── slices/quiet-pages/
    ├── plan.md            # this file
    ├── research.md        # Phase 0
    ├── data-model.md      # Phase 1
    ├── quickstart.md      # Phase 1
    ├── demo/fake-core.js  # the demo's stand-in core, with the core's own disclosure words
    └── tasks.md           # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── main.tsx                     # one line: import './styles/quiet-pages.css'
├── screens/
│   ├── Limits.tsx               # asks the hook; spread on a page, today's Card otherwise
│   └── Teardown.tsx             # asks the hook; spread on a page, today's Card otherwise
└── styles/
    ├── quiet-pages.css          # NEW: .nb-limits-…, .nb-teardown-… only; colour from tokens
    └── notebook.css             # T023 only: the tab focus ring's second band

src/screens/__tests__/QuietCurrentPin.test.tsx   # the pin: today's markup, both screens, every shape
src/screens/__tests__/LimitsPage.test.tsx        # the What Cairn covers spread, every look
src/screens/__tests__/TeardownPage.test.tsx      # the teardown spread, every look, both outcomes (D16)
src/shell/__tests__/AppLimitsPage.test.tsx       # App wiring through the fake core: the tab opens the spread; Current unchanged
src/look/__tests__/quietPages.test.ts            # the slice's stylesheet: scope, tokens, mono, motion, import
src/look/__tests__/tokens.test.ts                # T020, inside the existing T016 describe only
src/look/__tests__/hilltopCairn.test.ts          # T022
src/look/__tests__/tabFocusRing.test.ts          # T023
```

New tests go in new files so the concurrent sibling `setup-pages`, which adds focus and contrast tests of its own,
meets this slice only in `main.tsx`'s import list and, for `tokens.test.ts`, never outside the T016 `describe`.

**Structure Decision**: The slice lives in the `.` deployable (`cairn`, kind `tool`, the TypeScript interface), where
`frame`, `looks` and `protection-page` put the shell and the spreads. `src-tauri` is not touched. Under the accepted
strategy (ADR 0002, leave-it) the code stays in the interface's existing home: `Limits.tsx` and `Teardown.tsx` are
edited in place, as D6 requires (one component, one set of state). **Bounded context:** one. "Page", "spread",
"ruled" and "label" are presentation words; "covered", "kept", "checked" and "still here" keep the meaning the core
gives them, and this slice reads them only as words to display.

**Pin**: `Limits.tsx` and `Teardown.tsx` existed before the method. This slice changes none of their behaviour
outside a notebook page: it adds a branch taken only when `NotebookShell` says so, and hoists today's literal words
into constants that both branches read. What must not move is today's markup, so the Pin stage records it before
either screen changes: `QuietCurrentPin.test.tsx` renders `Limits` (one and two covered lines) and `Teardown`
(complete with and without checked lines; partial with checked lines and residue; partial with residue only) outside
any shell and asserts today's `innerHTML` as literal strings, seen passing on the unchanged code. The existing
`Waiting.test.tsx` (the teardown report's two tests) and `AppFlows.test.tsx` pin the words and the route to What
Cairn covers. Nothing pinned What Cairn covers before this slice. The row goes into `delivery/survey/pinned.md` if
`check-slice-scope` lets a slice write it, and is handed back to the host otherwise, as protection-page's was.

## Complexity Tracking

None.

## Open questions

None. Every product question about this slice was answered before the split (FR-031) and at slice gaps (D16).

Two needs met after convergence lie outside this slice's files and do not block it; both are handed to the host (`tasks.md`, *Handed back*):

- **The pin's ledger row.** `check-slice-scope` refuses `delivery/survey/pinned.md` on a slice branch; the row is written out verbatim in `tasks.md` for the host to append on `main`.
- **Keyboard scrolling of a spread with no control (MEDIUM).** The notebook's scrolling page area (`src/shell/NotebookShell.tsx:39`) is focusable only where the engine makes a scroller focusable; WebKit (macOS, Linux) is believed not to. A shell change, frame's file, touching every spread. Recommendation: one shell task before `reveal`.
