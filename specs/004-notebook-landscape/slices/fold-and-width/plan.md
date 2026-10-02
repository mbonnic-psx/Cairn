# Implementation Plan: The notebook in the landscape — slice `fold-and-width`

**Branch**: `slice/fold-and-width` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 9 · [decisions](../../decisions.md) D33–D36

**Input**: `specs/004-notebook-landscape/spec.md`, slice `fold-and-width` only: FR-034, FR-035, SC-009 and the
Clarifications block "Gaps reviewed for slice `fold-and-width`" (D34–D36). Asked by the owner after their own demo
of all three looks (D33). Contract: `contracts/ui-shell.md`, read and not amended (the fold is the shell's own
drawing, like the margin line; no screen learns of it).

## Summary

Two things the owner will judge at the reveal demo.

1. **The fold (FR-034, D34).** A new look token `--nb-fold` in every look block of `notebook.css` (morning and
   midday `#e3d6bf`, night `#dccdb1`, the canvas's own `border-right` values). The shell draws it once: one
   `<span className="nb-fold" aria-hidden="true" />` in `NotebookShell`, a sibling of `.nb-margin` inside
   `.nb-notebook` and outside the scrolling `main`, so it runs the notebook's full height and stays put while the
   pages scroll. It sits on the centre of the gap between the leaves: `.nb-page-area` pads 60px left and 48px
   right (52/32 in the narrow layout) and every spread's columns are equal with a symmetric gap, so the gap's centre
   is `50% + (left − right) / 2` of the notebook: `calc(50% + 6px)`, and `calc(50% + 10px)` under 1100px wide
   (research R1). It is drawn as a 1px `border-left` on a zero-width box, so under forced colours the system
   recolours it rather than dropping it, and the forced-colours block names it in `GrayText` explicitly.
   frame converge pass 1, T020 dropped `--nb-fold`; the test that holds its absence ("names no fold") is replaced.
2. **The notebook widens and stays landscape (FR-035, D35, D36).** `.nb-root`'s notebook track becomes
   `minmax(0, min(1200px, max(830px, calc((100vh - 120px) * 830 / 680))))`; the grid already centres the group
   (`justify-content: center`) and keeps `align-items: start`. `.nb-notebook` takes `width: 100%`,
   `aspect-ratio: 830 / 680`, `max-height: calc(100vh - 120px)` and keeps `min-height: 480px`, replacing
   `height: calc(100vh - 120px)`. In the narrow layout it takes `max-height: 100%` and `min-height: 0` over the
   same ratio, replacing `height: 100%`. `width: 100%` is needed because a grid item with an aspect ratio is not
   stretched (research R2); the explicit `min-height` keeps the ratio's automatic content minimum from growing the
   notebook to its content (R2).

Every word is today's (FR-018). Current is untouched: no rule outside `.nb-` / `[data-look]` changes (SC-009).

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3, CSS (Tailwind 4.3.3 alongside, not used here).
**Primary Dependencies**: none new. **Storage**: none.
**Testing**: Vitest + Testing Library in jsdom; stylesheet tests read `src/styles/notebook.css` from disk through
the dynamic `'node:' + 'fs'` import (`src/look/__tests__/tokens.test.ts:6-11`). No mocking framework. jsdom runs
no layout, so the sizes are held two ways: an arithmetic model over the sheet's own numbers (T003), and a real
browser (agent-browser, Chromium) at the demo for 1280×800, 1920×1080, 2560×1440 and 800×600 in all three looks
(quickstart). No browser runner is added (D27 stands).
**Target Platform**: Tauri 2 webviews (WebView2, WKWebView, WebKitGTK). `aspect-ratio`, `min()`/`max()` and
`calc()` inside grid track sizes are supported by all three (research R3).
**Constraints**: colours only as tokens; nothing moves (FR-023); scenery and fold silent to assistive technology
(FR-024); Current unchanged (SC-009); the greeting band model in `tokens.test.ts` (which reads `.nb-root`'s
padding) stays valid — the root's padding and the greeting's place do not change.
**Scale/Scope**: edited `src/styles/notebook.css`, `src/shell/NotebookShell.tsx`,
`src/look/__tests__/tokens.test.ts` (the "names no fold" test only), `src/shell/__tests__/NotebookShell.test.tsx`
(new `describe` appended); new `src/look/__tests__/fold.test.ts`, `src/look/__tests__/notebookSize.test.ts`. Not
edited: any screen, any page sheet, `src/App.tsx`, `CurrentShell.tsx`, `src-tauri/`, `package.json`, the lock,
`Makefile`, `delivery/`, CI, `project.json`.

## Constitution Check

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing reacts to a blocked request. | Pass |
| II. Local-First | No dependency, no network. | Pass |
| III. Honest About Limits | No state is shown or hidden; the pages keep every word. | Pass |
| IV. Reversible by Construction | No system file touched. | N/A |
| V. Reflection at Distance | No notification or prompt added. | Pass |
| VI. Voice and visuals (v1.5.0) | Warm palette (the canvas's fold colours), generous whitespace kept by the reading cap (D35), no motion. | Pass |
| VII. Free | Nothing gated. | Pass |
| Continuous Integration on Trunk | Behind the development switch; Current the default and unchanged. | Pass |
| Tests first | One RED-GREEN-REFACTOR increment per rule. | Pass |

No violations. Complexity Tracking is empty.

## Structure Decision

One deployable, the interface of `cairn` (the repository root, `src/`), the notebook shell's own files. One
vocabulary, one context (the notebook context named by 004's earlier slices).

## Pin

`NotebookShell` and `notebook.css` were written by this method (004 `frame`), so their own tests are the pin:
`src/shell/__tests__/NotebookShell.test.tsx`, `src/look/__tests__/tokens.test.ts`,
`src/shell/__tests__/CurrentShell.test.tsx` and `src/shell/__tests__/AppLook.test.tsx`, green before the first
increment. No ledger row in `delivery/survey/pinned.md` is needed.

## Open questions

None. D34–D36 answered the slice's three.
