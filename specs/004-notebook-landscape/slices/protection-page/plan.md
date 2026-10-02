# Implementation Plan: The notebook in the landscape — slice `protection-page`

**Branch**: `slice/protection-page` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 3 · [decisions](../../decisions.md) D6–D10

**Input**: Feature specification from `specs/004-notebook-landscape/spec.md`, slice `protection-page` only: US3
(Protection, What is protected); FR-018, FR-020, FR-016, FR-021, FR-022, FR-025, FR-031, SC-009; the Clarifications
block "Gaps reviewed for slice `protection-page`"; carried task frame T025.

## Summary

Two screens become notebook spreads, and the shell gains the two things every later page slice builds on.

1. **The shell tells a screen it is on a page (D6).** `NotebookShell` provides a React context that says "on a
   notebook page"; `CurrentShell` provides nothing, and a screen rendered outside any shell reads the same as
   Current. A screen asks with one hook, `useNotebookPage()`, exported from `src/shell/`. Told, it lays itself out as
   a spread; not told, it renders today's markup element for element (SC-009).
2. **The heading outline (D9, frame T025).** The notebook supplies one visually hidden `h1`, "Cairn". The greeting's
   words stop being a heading (`h2` becomes `p`), and the title bar's visible "Cairn" is hidden from assistive
   technology so the name is heard once. A screen's own `h2` is then the next heading after "Cairn".
3. **Protection as a spread (D7).** Left page: the state badge, the state's heading and sentence, and, when
   protection is not off, the two figures (Addresses in force, Last checked). Right page: a waiting change, when
   there is one, as a stamped note in the amber language with "Keep things as they are" (FR-020); otherwise a blank
   ruled page (FR-031). "Checking this machine…" and a read that could not be made sit on the left page with the
   right page blank and ruled.
4. **What is protected as a spread (D8).** Left page: the heading, the count sentence, the not-confirmed note (amber)
   and the note on taking things out. Right page: the list, ruled like an inventory, one address a line. A long list
   scrolls inside the notebook's page area (FR-025).

Every word, state and control is today's, word for word (FR-018). No content is invented or moved between screens
(D7). Current, and every existing screen test, is unchanged (SC-009).

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3 (the interface). Rust is untouched.

**Primary Dependencies**: Vite 6.4.3, Tailwind CSS 4, Vitest 3.2.7 with Testing Library. No new package.

**Storage**: None. The "on a page" signal is a React context value, never stored.

**Testing**: Vitest + Testing Library (jsdom). Where a test needs the core, it stands in at the IPC seam with a fake
written in the test tree: `window.__TAURI_INTERNALS__.invoke`, the one call `@tauri-apps/api/core` makes
(`node_modules/@tauri-apps/api/core.js:201`, version 2.11.1; research P4). No mocking framework is added and no new
test uses `vi.mock` (`AGENTS.md`). The stylesheet test reads the slice's CSS from disk, as `tokens.test.ts` reads
`notebook.css`.

**Target Platform**: Tauri 2 desktop webview on Windows, macOS and Linux.

**Project Type**: Desktop application, interface layer.

**Performance Goals**: None beyond today's. Two static layouts, no animation.

**Constraints**: Current unchanged element for element (SC-009). Words unchanged (FR-018). Colour only from look
tokens or the theme palette the shell re-points (contracts, *Look tokens*). Amber, never red, for "not confirmed"
and "waiting" (FR-016). Text at 4.5:1 on every look's paper (FR-021). Keyboard reachable with visible focus
(FR-022). Content reachable down to 800×600, scrolling inside the notebook (FR-025). Nothing moves (FR-023, D3).

**Scale/Scope**: New: `src/shell/notebookPage.ts` (context and hook), `src/styles/protection-page.css` (this
slice's `.nb-` rules) and its one import line in `src/main.tsx`. Edited: `NotebookShell.tsx` (provider, hidden
`h1`, title-bar name hidden from assistive technology), `Greeting.tsx` (`h2` to `p`), `Protection.tsx`,
`Trail.tsx`. Tests beside them. The contract `contracts/ui-shell.md` already carries "Knowing it is on a page" and
"Headings" (written at slice gaps); this slice holds the code to it and amends it only if the build shows a clause
wrong.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing here reacts to a blocked request. Both screens are reached only by a tab (FR-027). | Pass |
| II. Local-first | No dependency, no font or image fetched. | Pass |
| III. Encryption at rest | No data touched. | N/A |
| IV. Reversible | No system file touched. | N/A |
| V. Honest about limits | The state shown is still the core's read-back; "not confirmed" keeps its own words and is never shown as protected (`Trail` heading and the badge keep today's rules). The list is called protected only while in force, as today. | Pass |
| VI. Voice and visuals (v1.5.0) | Words unchanged; amber for not confirmed and waiting, no red; serif for headings, the sentence and the list; mono only for the badge, the figures' labels, the list's caption and the button. The waiting time stays a phrase, never a countdown. No count is added anywhere: the two figures and the count sentence are today's, on today's screens. | Pass |
| VII. Free at the moment of need | Nothing gated. | Pass |
| The waiting period (FR-047e) | "Keep things as they are" stays as reachable as today, beside the state (FR-020). Nothing offers a change now. | Pass |
| Continuous Integration on Trunk | Lands on `main` behind the development switch; Current is the default and unchanged (FR-011, FR-032). | Pass |
| Agent change meets the same bar / tests first | One RED-GREEN-REFACTOR increment per rule; Current's markup pinned before the screens change (*Pin*). | Pass |

No violations. Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** still passes. No IPC command added, so `ipc_surface.rs` is untouched.
`src/shell/` still imports nothing from `src/ipc`, so the shell holds no reach data (contract, *What never
changes*).

## Project Structure

### Documentation (this slice)

```text
specs/004-notebook-landscape/
├── spec.md, story-split.md, decisions.md      # feature-wide
├── contracts/ui-shell.md                      # "Knowing it is on a page" and "Headings" (written at slice gaps)
└── slices/protection-page/
    ├── plan.md            # this file
    ├── research.md        # Phase 0
    ├── data-model.md      # Phase 1
    ├── quickstart.md      # Phase 1
    └── tasks.md           # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── main.tsx                     # one line: import './styles/protection-page.css'
├── shell/
│   ├── notebookPage.ts          # NEW: the context and useNotebookPage()
│   ├── NotebookShell.tsx        # provides "on a page"; hidden h1 "Cairn"; title-bar name aria-hidden
│   └── Greeting.tsx             # the words are a paragraph, not a heading
├── screens/
│   ├── Protection.tsx           # asks the hook; spread on a page, today's Card otherwise
│   └── Trail.tsx                # asks the hook; spread on a page, today's Card otherwise
└── styles/
    └── protection-page.css      # NEW: .nb-state…, .nb-inventory… only; colour from tokens

src/screens/__tests__/ProtectionCurrentPin.test.tsx   # the pin: today's markup, every state, both screens
src/screens/__tests__/ProtectionPage.test.tsx         # the Protection spread
src/screens/__tests__/TrailPage.test.tsx              # the What is protected spread
src/shell/__tests__/notebookPage.test.tsx             # the hook under each shell and none
src/shell/__tests__/NotebookShell.test.tsx            # the heading outline (frame T025)
src/shell/__tests__/AppProtectionPage.test.tsx        # App wiring through a fake core, Morning look
src/look/__tests__/protectionPage.test.ts             # the slice's stylesheet: scope, tokens, mono, motion, contrast
```

**Structure Decision**: The slice lives in the `.` deployable (`cairn`, kind `tool`, the TypeScript interface),
where `frame` and `looks` put the shell. `src-tauri` is not touched. Under the accepted strategy (ADR 0002,
leave-it) the code stays in the interface's existing home, beside the screens it lays out: `Protection.tsx` and
`Trail.tsx` are edited in place, as D6 requires (one component, one set of state). **Bounded context:** one. "Page",
"spread", "heading" and "inventory" are presentation words; "protection", "waiting change" and "what is protected"
keep the meaning the core gives them, and this slice reads them only as words to display.

**Pin**: `Protection.tsx` and `Trail.tsx` existed before the method. This slice changes none of their behaviour
outside a notebook page: it adds a branch taken only when `NotebookShell` says so. What must not move is today's
markup, so the Pin stage records it before the screens change: `ProtectionCurrentPin.test.tsx` renders every state
of both screens outside any shell (checking, a read that could not be made, off, in force, not confirmed, a waiting
change pending and ready, the list in force, not confirmed and off, with and without a `www.` companion) and asserts
today's `innerHTML` as literal strings, seen passing on the unchanged code. The existing `Protection.test.tsx`,
`Waiting.test.tsx`, `Trail.test.tsx` and `AppFlows.test.tsx` pin the words and behaviour. The ledger row for
`delivery/survey/pinned.md` is outside this slice's manifest and is handed to the host (tasks, *Handed back*).

## Complexity Tracking

None.

## Open questions

None. Every product question this slice met was answered at slice gaps (D6–D9).
