# Implementation Plan: The notebook in the landscape — slice `setup-pages`

**Branch**: `slice/setup-pages` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 5 · [decisions](../../decisions.md) D5, D6, D10, D13–D15

**Input**: Feature specification from `specs/004-notebook-landscape/spec.md`, slice `setup-pages` only: US3 (setup,
disclosure); FR-014, FR-016, FR-018, FR-021, FR-022, FR-023, FR-025, FR-031, SC-009; the Clarifications block "Gaps
reviewed for slice `setup-pages`"; carried tasks looks T021 (focus on the paper at 3:1) and T024 (nothing a look
re-points fades), both owned here for the setup screens by D10.

## Summary

The steps before protection is on become notebook spreads. Nothing they say or do changes.

1. **The choosing step moves into one component (D13, contract "A step of more than one screen").** Today `App`
   renders the step inline: What would you like to protect?, Anywhere else? and the "Turn protection on" button, one
   under the other. A new `Choosing` component beside the setup screens takes that composition and `App` renders it
   in its place. Off a page it renders exactly today's elements in today's order (SC-009). On a page it lays the step
   out as one spread: What would you like to protect?, its sentence, the nine categories and the note a change
   leaves on the left page; Anywhere else?, the address box and what comes back on the right page, with "Turn
   protection on" at its foot.
2. **Categories and CustomEntry each lay themselves out on a page (D6).** Each asks `useNotebookPage()` once. Told,
   it drops today's `Card` (the page is the paper) and renders its own words with the slice's classes; not told, it
   renders today's markup element for element. The step's state (categories, note, the address typed and what came
   back) stays where it is today: `App` and `CustomEntry`.
3. **Before Cairn changes anything as a spread (D14).** Left page: the heading, the opening paragraph, what Cairn will
   change and the background component's paragraph. Right page: What this does not cover, the note on
   administrators, then "Yes, set this up" and "Not yet" at its foot. While the details are loading or could not be
   read, the left page holds the heading and the paragraph and the right page holds only the two buttons, in the same
   place: the foot of the right page.
4. **Controls stay visible on the paper (D15, looks T021, T024).** The address box's edge and each checkbox's edge
   meet 3:1 against the paper in every look; every control the setup spreads draw shows a focus outline from
   `--nb-ink` (3:1 on every look's paper); nothing on these spreads fades, because nothing on them declares a
   transition or an entrance.

Every word, state and control is today's, word for word (FR-018). Current, and every existing screen test, is
unchanged (SC-009).

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3 (the interface). Rust is untouched.

**Primary Dependencies**: Vite 6.4.3, Tailwind CSS 4, Vitest 3.2.7 with Testing Library. No new package.

**Storage**: None. No new state anywhere; the "on a page" signal is the context `protection-page` landed.

**Testing**: Vitest + Testing Library (jsdom). Screen tests render a screen with props inside `NotebookShell` (on a
page) or alone (Current), as `ProtectionPage.test.tsx` does. Where the core is needed (App wiring, `Disclosure`
fetching its own details, `CustomEntry`'s default `add` and `check`), a fake stands in at the IPC seam:
`installFakeCore` in `src/screens/__tests__/fakeCore.ts`, which `protection-page` wrote (research S5). No mocking
framework and no new `vi.mock` (`AGENTS.md`). The stylesheet test reads the slice's CSS and `notebook.css` from disk,
as `protectionPage.test.ts` does.

**Target Platform**: Tauri 2 desktop webview on Windows, macOS and Linux.

**Project Type**: Desktop application, interface layer.

**Performance Goals**: None beyond today's. Static layouts, no animation.

**Constraints**: Current unchanged element for element (SC-009). Words unchanged (FR-018). Colour only from look
tokens or the theme palette the shell re-points (contract, *Look tokens*). Amber, never red, for a reason an address
could not be taken (FR-016). Text at 4.5:1 and control edges and focus outlines at 3:1 on every look's paper (FR-021,
FR-022, D15). Content reachable down to 800×600, scrolling inside the notebook (FR-025). Nothing moves (FR-023, D3).

**Scale/Scope**: New: `src/screens/Setup/Choosing.tsx` (the step's composition), `src/styles/setup-pages.css` (this
slice's rules, prefixes `.nb-choosing-`, `.nb-categories-`, `.nb-custom-`, `.nb-disclosure-`) and its one import line
in `src/main.tsx`. Edited: `src/App.tsx` (renders `Choosing` in the step's place), `Categories.tsx`,
`CustomEntry.tsx`, `Disclosure.tsx`. Tests in new files of this slice's own. One line removed from
`src/look/__tests__/tokens.test.ts`: the vacuous `.nb-page …:focus-visible` assertion looks T021 names, and nothing
else in that file (a sibling, `quiet-pages`, is adding tests near it).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing here reacts to a blocked request. The setup steps are reached by opening Cairn before protection is on, or by the Protection tab, as today (FR-027). | Pass |
| II. Local-First, Zero Telemetry | No dependency, no font or image fetched. No data touched. | Pass |
| III. Honest About Limits | Before Cairn changes anything keeps every line it shows today and its order of reading: the person reaches "Yes, set this up" only after What this does not cover and the note on administrators (D14). "Protected:" after adding an address still comes only from a read-back in force (`CustomEntry.addedSentence`, unchanged). | Pass |
| IV. Reversible by Construction | No system file touched. The disclosure that precedes the first change keeps every word. | N/A |
| V. Reflection Happens at Distance | No notification, prompt or required answer added; nothing is typed or solved to reach a site or keep protection running. | Pass |
| VI. Voice, Language, and Gamification Discipline (v1.5.0) | Words unchanged; amber for a reason an address could not be taken, no red; serif for headings, sentences and the categories' names; typewriter only for small labels (a category's count, the address box's text is the person's own and stays serif) and buttons. No count added: a category's address count is today's. | Pass |
| VII. Free at the Moment of Need | Nothing gated. | Pass |
| The waiting period (FR-047e) | Unticking a category once something is in force still waits, and the note that says so is today's sentence, kept on the left page beside the categories. Nothing offers a change now. | Pass |
| Continuous Integration on Trunk | Lands on `main` behind the development switch; Current is the default and unchanged (FR-011, FR-032). | Pass |
| Agent-Generated Change Meets the Same Bar; Acceptance-Driven Development, Tests First | One RED-GREEN-REFACTOR increment per rule; today's markup of all three screens and of the choosing step pinned before any of them changes (*Pin*). | Pass |

No violations. Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** still passes. No IPC command added, so `ipc_surface.rs` is untouched. No
file under `src/shell/` changes, so the shell still holds no reach data.

## Project Structure

### Documentation (this slice)

```text
specs/004-notebook-landscape/
├── spec.md, story-split.md, decisions.md      # feature-wide
├── contracts/ui-shell.md                      # "A step of more than one screen" (written at slice gaps, D13)
└── slices/setup-pages/
    ├── plan.md            # this file
    ├── research.md        # Phase 0
    ├── data-model.md      # Phase 1
    ├── quickstart.md      # Phase 1
    ├── demo/fake-core.js  # the demo's in-page core (research S6)
    └── tasks.md           # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── main.tsx                         # one line: import './styles/setup-pages.css'
├── App.tsx                          # the choosing step renders <Choosing …/> in its place
├── screens/
│   ├── Setup/
│   │   ├── Choosing.tsx             # NEW: the step's composition; a spread on a page, today's elements otherwise
│   │   ├── Categories.tsx           # asks the hook; its words on a page, today's Card otherwise
│   │   └── CustomEntry.tsx          # asks the hook; its words and form on a page, today's Card otherwise
│   └── Disclosure.tsx               # asks the hook; a spread on a page, today's Card otherwise
└── styles/
    └── setup-pages.css              # NEW: .nb-choosing-, .nb-categories-, .nb-custom-, .nb-disclosure- only

src/screens/__tests__/SetupCurrentPin.test.tsx      # the pin: today's markup, every state, three screens and the step
src/screens/__tests__/ChoosingPage.test.tsx         # the choosing spread (Categories, CustomEntry, the button)
src/screens/__tests__/DisclosurePage.test.tsx       # the Before Cairn changes anything spread
src/shell/__tests__/AppSetupPages.test.tsx          # App wiring through a fake core, a notebook look, and Current
src/look/__tests__/setupPages.test.ts               # the slice's stylesheet: scope, tokens, mono, motion, edges, focus
src/look/__tests__/setupPagesControls.test.tsx      # rendered on a page: every control focusable with its own ring, nothing that fades
```

**Structure Decision**: The slice lives in the `.` deployable (`cairn`, kind `tool`, the TypeScript interface), where
`frame`, `looks` and `protection-page` put the shell and the spreads. `src-tauri` is not touched. Under the accepted
strategy (ADR 0002, leave-it) the code stays in the interface's existing home, beside the screens it lays out: the
three screens are edited in place, as D6 requires (one component, one set of state), and the step's composition moves
into `src/screens/Setup/Choosing.tsx` beside them, as the contract requires. **Bounded context:** one. "Page",
"spread" and "foot" are presentation words; "category", "address" and "what Cairn will change" keep the meaning the
core gives them, and this slice reads them only as words to display.

**Pin**: `Categories.tsx`, `CustomEntry.tsx`, `Disclosure.tsx` and `App.tsx`'s choosing block existed before the
method. This slice changes none of their behaviour outside a notebook page: it adds a branch taken only when
`NotebookShell` says so, and moves the choosing block's elements into a component that renders the same elements.
What must not move is today's markup, so the Pin stage records it before anything changes, in
`src/screens/__tests__/SetupCurrentPin.test.tsx`, as literal `innerHTML` strings seen passing on the unchanged code:
`Categories` with no categories, with categories (on, off, edited, not edited) and with a note; `CustomEntry` before
anything is typed, after an address is added under each of the three read-backs (in force, off, not confirmed, and a
read-back that could not be made) and after a reason comes back; `Disclosure` with no details and with details; and
the choosing step as `App` renders it in Current through a fake core (the column inside `CurrentShell`). The existing
`CustomEntry.test.tsx`, `Disclosure.test.tsx`, `SetupUntick.test.tsx`, `AppFlows.test.tsx` and `AppLook.test.tsx`
pin the words and behaviour and are never edited. The row in `delivery/survey/pinned.md` is written in the same
Pin stage, as protection-page's was.

## Complexity Tracking

None.

## Open questions

Every product question about this slice was answered at slice gaps (D13–D15). Two met at convergence are handed back to the host; neither blocks the slice, because the slice keeps today's behaviour in both, which FR-018 requires until someone decides otherwise:

- **T021 (MEDIUM) — the not-confirmed sentence after an address is added is moss, not amber.** "Added to your list, though Cairn has not confirmed it is in force just now: …" is `text-moss-600` in Current (`CustomEntry.tsx`), the colour of "Protected: …", and the spread keeps it (`setup-pages.css`, `.nb-custom-added`, pinned by T020). FR-016 says "not confirmed" keeps its warm amber meaning. Options: (a) keep moss on the page, as Current (what is built); (b) on the page only, amber for not confirmed and off, moss for in force, Current unchanged (converge's recommendation); (c) change both, which changes today's interface (SC-009) and belongs outside 004. Recommendation: (b), a small task in this slice's Phase 4 or in `reveal`.
- **T022 (LOW) — D14's "the buttons never move as the details arrive".** At 1280×800 they hold still (674–714 in every state); at 800×600 the details push them below the fold (508–548 without, 764–804 with, after a scroll). What is built reads "the same place" as "the foot of the right page". Options: (a) record that reading in D14 (recommended); (b) reserve the details' height while they load, which the owner would have to ask for.
