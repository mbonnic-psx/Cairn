# Implementation Plan: The notebook in the landscape — slice `tonight-page`

**Branch**: `slice/tonight-page` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 4 · [decisions](../../decisions.md) D5, D6, D8, D9, D10, D15, D17, D19, D21–D24

**Input**: Feature specification from `specs/004-notebook-landscape/spec.md`, slice `tonight-page` only: US3 (Today,
Tonight) and US1 scenario 5; FR-014, FR-016, FR-018, FR-019, FR-021, FR-022, FR-023, FR-025, FR-031, SC-009; the
Clarifications block "Gaps reviewed for slice `tonight-page`" (D21–D24). Carried (D10): looks T021 (focus visible on
the paper) and T024 (nothing fades), for the check-in (`slices/looks/tasks.md`). Contract:
`contracts/ui-shell.md`, all of it, in particular *The page area*, *Knowing it is on a page*, *Headings* and *Look
tokens*. This slice's prefixes are `.nb-reaches-` and `.nb-checkin-`, added to the contract's prefix list.

## Summary

Two screens become notebook spreads: the Today screen in both of its views, and Tonight.

1. **Today, the Today view (D22 1–4).** Left page: the Which days buttons, "Today", and the coverage note as the last
   thing on the left page, set off by its rule. Right page: the typed log, ruled, one reach a line, the site then its
   time; or "Nothing here for today." at its top. Sealed: Which days, "Today" and the sealed sentence on the left, the
   right page blank and ruled. Loading: Which days and "Looking…" on the left, no heading, the right page blank and
   ruled.
2. **Today, the Over time view (D21, D22 5–6).** Left page: Which days, the heading naming the range, From and To, the
   coverage note, the estimates line, and "Cairn counts only while it is running. This is what it saw over these
   days." last, set off by its rule. Right page: the sites, ruled, one site a line, each with its count and a soft
   bar; or "Nothing here for these days." at its top. Looking, could-not-read and sealed: Which days, the heading,
   From and To, then that one sentence on the left; the right page blank and ruled. The date boxes never move.
3. **Tonight (D23, D24, FR-019).** Left page: the heading ("Tonight", or the date once the day has ended), today's
   reaches as a typed log with times or "Nothing here for …", and the coverage note. Right page: the quote, "How the
   day went" with a lined writing space in the serif, "Keep this", the status sentence, and the quotes switch at the
   foot. Sealed: the heading and the sealed sentence on the left; the quote, the status sentence and the switch on
   the right. Loading or a load that could not be made: "Looking…" or the reason on the left, the right page blank
   and ruled.
4. **The controls on the paper (D15, D22 7, D24; looks T021, T024 for the check-in).** The From and To boxes' edges,
   the pressed Which days button's mark and the writing space's edge meet 3:1 against every look's paper; every
   control on both spreads shows a focus outline from `--nb-ink`; nothing on either spread fades, and the writing
   space's lines sit under each line of text and move with it.

Every word, state and control is today's, word for word (FR-018). The check-in's text is kept across tabs as today
(FR-019, US1 scenario 5): `useCheckInSession` is untouched. Current, and every existing screen test, is unchanged
(SC-009).

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3 (the interface). Rust is untouched.

**Primary Dependencies**: Vite 6.4.3, Tailwind CSS 4.3.3, Vitest 3.2.7 with Testing Library and `user-event`. No new
package.

**Storage**: None. The screens read `TodaysReaches`, `Patterns` and `DayView` as today.

**Testing**: Vitest + Testing Library (jsdom). `Reaches` is tested through its own `read` and `now` props (the seam
`history-by-site` introduced); `CheckIn` and the App-level tests stand in at the IPC seam with the fake already in the
test tree, `src/screens/__tests__/fakeCore.ts` (`window.__TAURI_INTERNALS__.invoke`; commands `get_day`,
`save_journal_entry`, `get_quote`, `get_quotes_shown`, `set_quotes_shown`, `list_todays_reaches`,
`summarize_reaches`). No mocking framework is added and no new test uses `vi.mock` (`AGENTS.md`); the clock is moved
with Vitest's fake timers where a day must end, as the existing check-in tests do. Stylesheet tests read CSS from disk,
as `setupPages.test.ts` does, with the contrast helpers in `src/look/contrast.ts`.

**Target Platform**: Tauri 2 desktop webview on Windows, macOS and Linux.

**Project Type**: Desktop application, interface layer.

**Performance Goals**: None beyond today's. No animation.

**Constraints**: Current unchanged element for element (SC-009). Words unchanged (FR-018). Colour only from look
tokens (contract, *Look tokens*). Amber, never red (FR-016). Text at 4.5:1 on every look's paper, control edges at
3:1 (FR-021, D15). Focus visible (FR-022). Content reachable down to 800×600, scrolling inside the notebook (FR-025).
Nothing moves (FR-023, D3). Keyboard focus is never lost when the Which days buttons switch the view (FR-022; research
T1).

**Scale/Scope**: New: `src/styles/tonight-page.css` (this slice's `.nb-reaches-` and `.nb-checkin-` rules) and its one
import line in `src/main.tsx` (the composition root). Edited: `src/screens/Reaches.tsx`, `src/screens/CheckIn.tsx`
(a branch taken only on a page; today's literal words hoisted to constants read by both layouts);
`contracts/ui-shell.md` (the two prefixes, additively). New tests beside them, in new files. No shell code changes:
the hook (D6) and the heading outline (D9) are protection-page's and are used as they are. `useCheckInSession` and
`App.tsx` are not edited.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing here reacts to a blocked request. Today and Tonight are reached by their tabs only (FR-027). Nothing on either spread leads to a change in protection. | Pass |
| II. Local-First, Zero Telemetry | No dependency, no font or image fetched, no command added; the screens ask the core exactly what they ask today. | Pass |
| III. Honest About Limits | The coverage notes stay on the same spread as the reaches they qualify, word for word, and are not dropped in any state; the coverage sentence is the last thing on the left page (D22). A sealed history, a read that could not be made and a load that failed are each said as today. The save's status stays one polite live region, so a save that was not kept is heard (G1). | Pass |
| IV. Reversible by Construction | No system file touched. | N/A |
| V. Reflection Happens at Distance | No notification or prompt added. Nothing asks the person to type anything to reach a site; the writing space stays optional, offered whether the day held reaches or none. | Pass |
| VI. Voice, Language, and Gamification Discipline (v1.5.0) | Words unchanged; no count is added; the reach counts and bars stay on the Today screen, where they are today (`check-no-ambient-counts`). No streak, no congratulation, no comparison. Serif for headings, the logs, the quote and the writing; the typewriter face only for the Which days buttons, From and To, the times, "Keep this" and the quotes switch. Warm palette, amber never red. | Pass |
| VII. Free at the Moment of Need | Nothing gated. | Pass |
| Continuous Integration on Trunk | Lands behind the development switch; Current is the default and unchanged (FR-011, FR-032). | Pass |
| Agent-Generated Change Meets the Same Bar; Tests First | One RED-GREEN-REFACTOR increment per rule; both screens pinned in every state before either changes (*Pin*). | Pass |

No violations. Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** still passes. No IPC command added, so `ipc_surface.rs` is untouched. No
`src/shell/` file imports from `src/ipc`. Reach data stays in `Reaches.tsx` and `CheckIn.tsx`, both on
`check-no-ambient-counts`' navigated-to list; the new stylesheet holds no data.

## Project Structure

### Documentation (this slice)

```text
specs/004-notebook-landscape/
├── spec.md, story-split.md, decisions.md      # feature-wide
├── contracts/ui-shell.md                      # amended additively: the prefixes .nb-reaches-, .nb-checkin-
└── slices/tonight-page/
    ├── plan.md            # this file
    ├── research.md        # Phase 0
    ├── data-model.md      # Phase 1
    ├── quickstart.md      # Phase 1
    ├── demo/fake-core.js  # the demo's stand-in core: reaches, a range, a day view, quotes
    └── tasks.md           # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── main.tsx                     # one line: import './styles/tonight-page.css'
├── screens/
│   ├── Reaches.tsx              # asks the hook; spread on a page, today's markup otherwise
│   └── CheckIn.tsx              # asks the hook in CheckIn; spread on a page, today's Card otherwise; the session hook untouched
└── styles/
    └── tonight-page.css         # NEW: .nb-reaches-…, .nb-checkin-… only; colour from tokens

src/screens/__tests__/TonightCurrentPin.test.tsx  # the pin: today's markup, both screens, every state
src/screens/__tests__/tonightCases.ts             # the states, as props and core answers
src/screens/__tests__/ReachesPage.test.tsx        # the Today screen spread, both views, every state, every look
src/screens/__tests__/CheckInPage.test.tsx        # the Tonight spread, every state, every look
src/shell/__tests__/AppTonightPage.test.tsx       # App wiring through the fake core: tabs open the spreads, text kept across tabs, Current unchanged
src/look/__tests__/tonightPage.test.ts            # the slice's stylesheet: scope, tokens, edges, lines, motion, import
src/look/__tests__/tonightPageControls.test.tsx   # focus on every control (looks T021) and no fades (looks T024), rendered
```

New tests go in new files, so no existing test is edited (SC-009).

**Structure Decision**: The slice lives in the `.` deployable (`cairn`, kind `tool`, the TypeScript interface), where
`frame`, `looks` and the other page slices put the shell and the spreads. `src-tauri` is not touched. Under the
accepted strategy (ADR 0002, leave-it) the code stays in the interface's existing home: `Reaches.tsx` and
`CheckIn.tsx` are edited in place, as D6 requires (one component, one set of state). **Bounded context:** one.
"Page", "spread", "ruled", "lined" and "label" are presentation words; "reach", "coverage", "sealed", "kept" and
"estimate" keep the meaning the core gives them, and this slice reads them only as words to display.

**Pin**: `Reaches.tsx` and `CheckIn.tsx` existed before the method. This slice changes none of their behaviour outside a
notebook page: it adds a branch taken only when `NotebookShell` says so, and hoists today's literal words into
constants both branches read. The ledger's 2026-09-30 row pins Today's words through `Reaches.test.tsx`, and the
2026-10-01 row pins its first request; nothing pins Over time's or the check-in's markup element for element. So the
Pin stage records both screens before either changes: `TonightCurrentPin.test.tsx` renders `Reaches` (Today: looking,
a log, nothing yet, sealed, a coverage note and the fallback; Over time: looking, could not read, sealed, a list with
and without a coverage note and with one and several estimates, nothing here) and `CheckIn` (looking, a load that
could not be made, an open day with reaches and with none, with and without a coverage note, with a quote and with
quotes hidden or unknown, an entry kept, a refused save, a sealed day, a day that ended while open) outside any shell,
and asserts today's `innerHTML` as literal strings (a time interpolated from the same `toLocaleTimeString` call the
screen makes), seen passing on the unchanged code. The ledger row goes into `delivery/survey/pinned.md` if
`check-slice-scope` lets a slice write it, and is handed back to the host verbatim otherwise, as the three page slices
before this one found.

## Complexity Tracking

None.

## Open questions

One, raised by the after-converge gaps review, LOW, handed back to the driver. It does not block the demo: the slice
renders today's choice, which is the recommendation.

- **Is "How the day went" a small label (typewriter face) or the writing's heading (serif)?** It is the `<label>` of
  the writing space, set in the serif at 20px on the page (`src/styles/tonight-page.css:238-243`,
  `src/screens/CheckIn.tsx:468-469`), as Current sets it (`reflective text-xl`). FR-014 and US3 scenario 3 put small
  labels in the typewriter face; D12 made the 14px "added with its root address" one. Options: (a) keep the serif — it
  reads as the prompt that opens the journal page, not a small label, at the size of a subheading, and Principle VI keeps
  the serif for reflective writing (recommended by the gaps review and the host); (b) set it in the typewriter face like
  From and To. If (b), the GREEN is one rule in `tonight-page.css` and the mono list in `tonightPage.test.ts`.

Every other product question about this slice was answered at slice gaps (D21–D24) or by standing decisions (D5, D6,
D8, D15, D17). Two readings this plan takes, each keeping every MUST, are recorded in research rather than asked:
T1 (the Which days buttons stay mounted across views, so focus is never lost) and T3 (the status sentence is one polite
live region in every state that has it today; the loading state gains none).
