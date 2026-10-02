# Implementation Plan: The notebook in the landscape — slice `board-scale`

**Branch**: `slice/board-scale` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 10 · [decisions](../../decisions.md) D37–D39

**Input**: `specs/004-notebook-landscape/spec.md`, slice `board-scale` only: FR-036, FR-035's amended last sentence,
SC-009 and the Clarifications block "Gaps reviewed for slice `board-scale`" (D38, D39). Asked by the owner after their
own demo of fold-and-width (D37). Contract: `contracts/ui-shell.md`, amended (the page sheets learn one length to
size by, and that the shell may hold a page's text column to a measure).

## Summary

Where the greeting sits beside the notebook (1100px wide and up), the scene becomes the G-Morning board (1280×800)
scaled to the window. Under 1100px wide nothing changes: the narrow `@media (max-width: 1099px)` block stays as it is,
byte for byte.

1. **Two lengths, one per kind of growth (research R1, R2).** In the shared `[data-look]` block:
   - `--nb-u: clamp(1px, min(100vw / 1280, 100vh / 800), 2px)` — D39's factor *s* as a length (s px). D39 defines
     s = clamp(1, min(notebook width/830, notebook height/680), 2); with D38's notebook (below) that is exactly
     clamp(1, min(W/1280, H/800), 2) (R1, proved over the grid by T003's model). Written in viewport units, not
     container units, because the trail leaf is a size container of its own (`protection-page.css:29`): a `cqw`
     inside it would resolve against the leaf, not the notebook (R2).
   - `--nb-g: max(1px, 100vw / 1280)` — the greeting's factor: "40px at 1280×800 … about 60px at 1920×1080" is
     40 × W/1280, and the column it sits in is 250/1280 of the width, so the two grow together. Floored at 1, so
     between 1100 and 1280 wide the greeting is today's size (R3).
   Every size that grows is written `calc(N * var(--nb-u))` (or `--nb-g`), N being today's px value, so at 1280×800
   and in the narrow layout every computed size is today's exactly.
2. **The place and size of the notebook (FR-036, D38).** `.nb-root` (base rule only):
   `grid-template-columns: 19.53125vw minmax(0, min(64.84375vw, 127.5vh))`, `column-gap: 3.4375vw`,
   `padding: 8.75vh 0 0 4.375vw`, `justify-content: start` — that is 250, 830 and 44 of 1280, 56 of 1280, 70 of 800,
   and D38's width limit 1.5 × the notebook's tallest height (0.85 H) = 1.275 H (R4). `.nb-notebook` keeps
   `width: 100%`, `aspect-ratio: 830 / 680`, `container-type: size`, `min-height: 480px`, and takes
   `max-height: 85vh` (was `calc(100vh - 120px)`). `.nb-aside` `padding-top: 2.25vh` (18/800), so the greeting's
   top is 88/800 of the height. The `@supports not (aspect-ratio: 1 / 1)` fallback's base height becomes `85vh`.
   FR-035's 1200px cap and centring are gone where the greeting sits beside the notebook (D37).
3. **The greeting grows (FR-036).** `.nb-greeting__time` `font-size: calc(12 * var(--nb-g))`, `.nb-greeting` `gap:
   calc(10 * var(--nb-g))`, `.nb-greeting__words` `font-size: calc(40 * var(--nb-g))`. The narrow block's own 30px
   and 4px still win under 1100px, and `--nb-g` is 1px there anyway. The greeting has no sentence under the words
   today (the board's "Protection is on…" line is not in the app, and FR-018 keeps every word as it is), so FR-036's
   "and the sentence under it" has nothing to act on: noted, not a question. The title bar and the testing switch
   are window chrome, not the board's scene, and stay as they are.
4. **The scenery keeps its places and grows (FR-036).** Places are already fractions of the window (sun `left`/`top`
   in %, hills in vw and %, the cairn at 10%/69%). Sizes grow by `--nb-u`: each look's `--nb-sun-size` becomes
   `calc(96 * var(--nb-u))` (84, 56; the token still means the diameter), the sun's glow `0 0 calc(80 * var(--nb-u))
   calc(30 * var(--nb-u))`, the stones' widths, heights and the cairn's gap. Stars stay 3px points.
5. **Everything inside the notebook grows by one factor (D39).** Every px length in a rule that lays out the
   notebook's interior — in `notebook.css` (`.nb-page-area`, `.nb-page--ruled`, `.nb-margin`, `.nb-fold`, `.nb-label`,
   `.nb-button`, `.nb-tabs`, `.nb-tab`, `.nb-tab-label`, the large-tab block) and in the four page sheets — becomes
   `calc(N * var(--nb-u))`, except lines and rings: `border*`, `outline*` and `box-shadow` keep their px, so 1px
   lines stay 1px (D39). The ruling keeps a 1px rule on a pitch of `calc(32 * var(--nb-u))`, starting at
   `calc(22 * var(--nb-u))`. `.nb-page-area` takes `font-size: calc(16 * var(--nb-u))`, so text that sets no size of
   its own (it inherits the html 16px today) grows too. The tabs' `right` becomes `calc(-44 * var(--nb-u))`. The fold
   stays on the gap's centre: `left: calc(50% + 6 * var(--nb-u))`, (60 − 48) / 2 of the scaled padding. The large-tab
   container query keeps its 580px threshold: where s > 1 the notebook is at least 680·s tall (R5).
   tonight-page's one rem length (`calc(14rem + 2px)`) becomes `calc(226 * var(--nb-u))`.
6. **A page's line stays comfortable (D39).** Under `@media (min-width: 1100px)`, `.nb-page-area .nb-spread >
   .nb-page > *` takes `max-inline-size: calc(383 * var(--nb-u))`: today's leaf at 1280×800 is
   (830 − 60 − 48 − 48) / 2 = 337px, and 337 × 75/66 = 383. The leaf keeps its full width, so its ruling runs to its
   edge and the fold stays on the gap; only the writing stops at the measure, the rest of the paper margin. Not in the
   narrow layout, which stays as it was (D37).

Every word is today's (FR-018). Current is untouched: no rule outside `.nb-` / `[data-look]` changes (SC-009).

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3, CSS. **Primary Dependencies**: none new. **Storage**: none.
**Testing**: Vitest + Testing Library in jsdom; sheets read from disk through the dynamic `'node:' + 'fs'` import.
No mocking framework. jsdom runs no layout, so sizes are held by an arithmetic model over the sheets' own numbers
(`notebookSize.test.ts`, rewritten), by the band model in `tokens.test.ts` (rewritten for a greeting and sun that
grow), and by a real browser (agent-browser, Chromium) in convergence and at the demo, at the quickstart's sizes.
**Target Platform**: Tauri 2 webviews. New CSS used: `clamp()`/`min()`/`max()` with viewport units in custom
properties (R6). No container units are added.
**Constraints**: colours only as tokens; nothing moves (FR-023); scenery silent (FR-024); Current unchanged
(SC-009); the narrow block unchanged; the greeting on the sky its contrast guards measure (FR-021, SC-003).
**Scale/Scope**: edited `src/styles/notebook.css`, `src/styles/protection-page.css`, `quiet-pages.css`,
`setup-pages.css`, `tonight-page.css`; tests `src/look/__tests__/notebookSize.test.ts` (rewritten for FR-036),
`tokens.test.ts` (band model, ruling, sun-size and contract tests that parse the changed declarations),
`fold.test.ts` (the fold's offset parse), new `src/look/__tests__/boardScale.test.ts(x)`; contract
`contracts/ui-shell.md`. `src/shell/*.tsx` need no change (the composition is the sheet's). Not edited: any screen,
`src/App.tsx`, `CurrentShell.tsx`, `theme.css`, `src-tauri/`, `package.json`, the lock, `Makefile`, `delivery/`,
CI, `project.json`.

## Constitution Check

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing reacts to a blocked request. | Pass |
| II. Local-First | No dependency, no network. | Pass |
| III. Honest About Limits | No state shown or hidden; every word kept; webview limits named in quickstart. | Pass |
| IV. Reversible by Construction | No system file touched. | N/A |
| V. Reflection at Distance | No notification or prompt. | Pass |
| VI. Voice and visuals | The canvas board's own composition; generous whitespace kept by the measure (D39); no motion. | Pass |
| VII. Free | Nothing gated. | Pass |
| Continuous Integration on Trunk | Behind the development switch; Current the default and unchanged. | Pass |
| Tests first | One RED-GREEN-REFACTOR increment per rule. | Pass |

No violations. Complexity Tracking is empty.

## Structure Decision

One deployable, the interface of `cairn` (the repository root, `src/`): the notebook shell's stylesheet and the page
sheets. One vocabulary, one context (the notebook context named by 004's earlier slices). Ground: the map rows this
slice touches (*Safety net*, *Structure*) are where fold-and-width left them; no path to production changes.

## Pin

`notebook.css`, the page sheets and their tests were written by this method (004 `frame` onwards), so their own tests
are the pin: `src/look/__tests__/*.test.ts(x)`, `src/shell/__tests__/NotebookShell.test.tsx`,
`CurrentShell.test.tsx` and `AppLook.test.tsx`, green before the first increment. No row in
`delivery/survey/pinned.md` is needed; the application's run path is proved (`delivery/survey/running.md`, earlier
slices' demos).

## Readings recorded (not questions)

- D38's "1.5 × the height" is 1.5 × the notebook's height, as D38's own numbers show (2560×1080 → 1377×918; the
  limit met only past about 1.97:1): width = min(830/1280 W, 1.275 H).
- The greeting never goes below today's 40px / 12px / 10px gap between 1100 and 1280 wide (D39's floor, read for the
  greeting too); the sun and stones never below today's sizes either (same factor, floored at 1).
- The title bar and the testing switch are not scaled.

## Open questions

None. D37–D39 answered the slice's.
