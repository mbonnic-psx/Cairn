# Implementation Plan: The notebook in the landscape — slice `reveal`

**Branch**: `slice/reveal` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 7 · [decisions](../../decisions.md) D41–D45 (on D6, D29)

**Input**: `specs/004-notebook-landscape/spec.md`, slice `reveal` only: FR-011 (amended), FR-012, FR-013, FR-013a,
FR-018, FR-032, SC-002, SC-008, SC-009, User Story 2 scenarios 5 and 6, and the Clarifications block "Gaps reviewed for
slice `reveal`" (D42–D45). Run on the owner's go (D41). Frame adversary finding R1 closes here. Contract:
`contracts/ui-shell.md`, amended by this plan (the "on a page" signal and `CurrentShell` are gone).

## Summary

The notebook becomes Cairn's only interface. Nothing a person can do changes; what they see in a released build does.

1. **Morning by default, everywhere (FR-032, D44).** `Look` becomes `'morning' | 'midday' | 'night'`. `App` starts on
   `'morning'` and, outside a development build, always wears `'morning'`. Nothing reads the clock (FR-013); nothing
   is remembered.
2. **The switch offers three (FR-011, D44).** `LookSwitch` offers Morning, Midday, Night, in that order, keeps its label
   "Look (testing)", its place (top right, fixed) and its gate (`import.meta.env.DEV && devBuild`, unchanged). It always
   wears the look it shows (`data-look` is never absent now).
3. **Today's interface leaves the code (FR-032, D42, R1).** `CurrentShell` is deleted. Every screen's one-column
   branch is deleted, and with it the "on a notebook page" signal (`NotebookPageContext`, `useNotebookPage`,
   `src/shell/notebookPage.ts`). A screen renders its spread wherever it is rendered, including alone in a test.
   Whatever only those used goes too: `src/components/Card.tsx`, `src/components/Button.tsx` (so `src/components/`
   is gone), `theme.css`'s `.reflective`, `.settle`, `@keyframes settle` and the theme values nothing reads afterwards,
   and the palette re-points in `notebook.css` that served palette classes no screen draws any more (research R5).
4. **The Current pins retire, and FR-018 loses nothing (D43).** The four `*CurrentPin` tests held "unchanged from the old
   layout", and that claim ends at the reveal (SC-009). Their captured markup is not thrown away: it moves verbatim into
   a test fixture and becomes the words-and-controls baseline that every notebook page is held to, case for case, in
   every look. Every page test that compared its page with "the same screen outside any shell" is re-pointed at that
   baseline before the one-column branches go, because after they go such a comparison would compare the page with
   itself and pass while proving nothing (research R2, R3).
5. **What ships is proven (SC-002, D45).** D29's production-build test also finds the notebook in what ships ("Good
   morning.", `data-look`, `nb-root`) and none of Current's own code (`CurrentShell`'s and `Card`'s class strings,
   `.reflective`, `.settle`, `@keyframes settle`) nor any of the switch's words. Its teeth: the switch's words found in a
   development build, as before; Current's markers RED against the tree as it stands today, GREEN once they are gone,
   and each class marker shown to be real by finding it in the retired pins' captured markup (research R4). That the
   *default* is morning is proven where it can be, at `App` with `DEV` stubbed false (US2 scenario 6).
6. **The trunk is red before the slice starts** (research R6): two `.nb-reaches-seen` lengths that `history-by-hour`
   (#48) added and `board-scale` (#49) requires scaled. Increment 0 repairs it, first.

Every word, state and control is today's (FR-018). The window, the 800×600 minimum and the narrow layout are unchanged
(FR-025, FR-028, FR-036).

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3, CSS (Tailwind CSS 4 via `@tailwindcss/vite`).

**Primary Dependencies**: none new. Vite 6's CLI is run by the SC-002 test as a child process, as D29 already does.

**Storage**: none. `Look` is component state, never persisted (D44).

**Testing**: Vitest + Testing Library in jsdom; `releasedBuild.test.ts` in the `node` environment. New and rewritten
tests stand in at the IPC seam with `installFakeCore` (`src/screens/__tests__/fakeCore.ts`). No mocking framework is
added; the existing `vi.mock` in `AppLook.test.tsx` and the 002/003 screen tests is left as it is, and no new `vi.mock`
is written (`AGENTS.md`). Sheets and sources are read from disk through the dynamic `'node:' + 'fs'` import.

**Target Platform**: Tauri 2 desktop webviews (WebView2, WKWebView, WebKitGTK). No new CSS feature.

**Project Type**: desktop application, interface layer.

**Performance Goals**: `npm test` stays about 20 s here; the SC-002 test keeps its two builds (~1 s each, measured).

**Constraints**: words, states and controls unchanged (FR-018); no clock read (FR-013); no switch in a released build
(FR-012, SC-002); colour only from look tokens; nothing moves (FR-023, D3); the constitutional guards unedited and
passing; scratch builds under `~/.cache/cairn-scratch`, never `/tmp`.

**Scale/Scope**: deletion-heavy. Edited: `src/App.tsx`, `src/look/look.ts`, `src/look/LookSwitch.tsx`,
`src/shell/NotebookShell.tsx`, `src/shell/Greeting.tsx`, `src/shell/Landscape.tsx` (type name only), every screen
(`Protection`, `Trail`, `Limits`, `Teardown`, `Disclosure`, `Reaches`, `CheckIn`, `Setup/Choosing`,
`Setup/Categories`, `Setup/CustomEntry`), `src/styles/theme.css`, `src/styles/notebook.css`,
`src/styles/tonight-page.css` (Increment 0 only). Deleted: `src/shell/CurrentShell.tsx`, `src/shell/notebookPage.ts`,
`src/components/Card.tsx`, `src/components/Button.tsx`. Tests: see "Tests, file by file". Docs: `contracts/ui-shell.md`
(amended here), `delivery/survey/pinned.md` (rows appended). Not edited: `src-tauri/`, `scripts/` (every guard),
`package.json`, the lock, `Makefile`, `delivery/` beyond `survey/pinned.md`, CI, `project.json`, `main.tsx`,
`navigation.ts`, every page sheet but `tonight-page.css`.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 (below).*

| Principle | How this slice stands, and the file that holds it | Verdict |
|---|---|---|
| I. The Wall Holds | Nothing reacts to a blocked request. The only control this slice touches, the testing switch, still never ships: `src/App.tsx` keeps the `import.meta.env.DEV && devBuild` gate, and `src/shell/__tests__/releasedBuild.test.ts` searches what ships for it. | Pass |
| II. Local-First, Zero Telemetry | No dependency, no network. The SC-002 test runs the installed Vite offline into a local scratch directory (`releasedBuild.test.ts`); `package.json` and the lock are untouched; `check-no-network-deps.sh` unedited. | Pass |
| III. Honest About Limits | Every state sentence, "not confirmed" included, stays word for word on its page, held by the ported baseline (`src/screens/__tests__/*WordsKept.test.tsx`, `beforeTheReveal.ts`). Amber stays amber (`protection-page.css`, `setup-pages.css` untouched; `--color-moss-600`'s re-point kept, research R5). | Pass |
| IV. Reversible by Construction | No system file, hosts file or privileged path touched. | N/A |
| V. Reflection Happens at Distance | No notification, prompt or required answer added. `check-no-notifications.sh` unedited. | Pass |
| VI. Voice, Language, and Gamification Discipline | No new words: only Current's are deleted (`check-banned-words.mjs` passes on fewer strings). Serif for reading and mono for labels stay the page sheets' (`tonightPage.test.ts`, `setupPages.test.ts` hold them). The one motion removed, `.settle`, only ever ran on Current's cards; the notebook already moves nothing, by the owner's choice (FR-023, D3). | Pass |
| VII. Free at the Moment of Need | Nothing gated; `check-free.mjs` unedited. | Pass |
| Continuous Integration on Trunk | `main` is red today (research R6). Increment 0 restores it before any other work, and is offered to land on `main` alone first. The reveal ends the hidden period FR-032 described; the switch stays dev-only until the clock feature (FR-013a). | Pass, with Increment 0 first |
| Agent-Generated Change Meets the Same Bar; Tests First | One RED-GREEN-REFACTOR increment per rule (below). Characterisation increments (Increment 1) are green at once by design and prove their teeth by the sanctioned break-and-restore. No guard, no guard test (`ipc_surface.rs`, `teardown_restoration.rs`) is touched. | Pass |
| Acceptance-Driven Development | US2 scenario 6 enters through the screen (`App`, devBuild false and `DEV` stubbed false) and is observed there (`AppLook.test.tsx`); scenario 5 likewise in a development build. | Pass |
| Pull-Request Gates (SHOULD: under 200 lines) | The diff is well over 200 lines, nearly all deletions and a verbatim move of captured markup. | Deviation, recorded below |

**Post-design re-check (after Phase 1):** still passes. No IPC command added or removed, so `ipc_surface.rs` is
untouched. No Rust touched, so no `#[cfg(unix)]` question. `check-no-ambient-counts.mjs` lists `src/components/` in its
shell set; with that directory gone the rule matches nothing there and still runs over `App.tsx` and `main.tsx`
(research R9).

## Project Structure

### Documentation (this slice)

```text
specs/004-notebook-landscape/
├── spec.md, story-split.md, decisions.md      # feature-wide
├── contracts/ui-shell.md                      # amended by this plan
└── slices/reveal/
    ├── plan.md            # this file
    ├── research.md        # Phase 0
    ├── data-model.md      # Phase 1 (one type narrows; nothing stored)
    ├── quickstart.md      # Phase 1: run it, released and dev
    └── tasks.md           # /speckit-tasks (not written here)
```

### Source Code (repository root)

```text
src/
├── App.tsx                      # default 'morning'; NotebookShell only; CurrentShell import gone
├── look/
│   ├── look.ts                  # Look = morning|midday|night; GREETINGS without current; NotebookLook removed (Inc. 8)
│   └── LookSwitch.tsx           # three choices; data-look always set
├── shell/
│   ├── CurrentShell.tsx         # DELETED
│   ├── notebookPage.ts          # DELETED
│   ├── NotebookShell.tsx        # Provider removed; type name only otherwise
│   ├── Greeting.tsx, Landscape.tsx   # type name only (Inc. 8)
├── components/                  # DELETED (Card.tsx, Button.tsx)
├── screens/                     # every one-column branch and useNotebookPage call removed
│   ├── Protection.tsx, Trail.tsx, Limits.tsx, Teardown.tsx, Disclosure.tsx
│   ├── Reaches.tsx, CheckIn.tsx
│   └── Setup/Choosing.tsx, Setup/Categories.tsx, Setup/CustomEntry.tsx
└── styles/
    ├── theme.css                # .reflective, .settle, @keyframes settle, unread theme values removed
    ├── notebook.css             # [data-look] --font-serif, four palette re-points per look, the switch's Current rule removed
    └── tonight-page.css         # Inc. 0: .nb-reaches-seen's two lengths scaled
```

**Structure Decision**: The slice lives in the `.` deployable (`cairn`, the existing Tauri app's TypeScript interface,
`src/`), where every 004 slice has put its code; `src-tauri/` is not touched. Under the accepted strategy (ADR 0002,
leave-it) the code stays in the interface's existing home. **Bounded context:** one, the notebook interface; the slice
adds no vocabulary and removes one word ("Current").

### Pin

The screens existed before the method, and their output outside a page is pinned by four rows of
`delivery/survey/pinned.md` (2026-10-02: `ProtectionCurrentPin`, `SetupCurrentPin`, `QuietCurrentPin`,
`TonightCurrentPin`, and the 2026-10-02 Over time row). This slice ends those pins on purpose (D43). Rows are never
rewritten, so it appends one row per pin saying the markup pin stopped at the reveal, that its captured markup moved
verbatim into `src/screens/__tests__/beforeTheReveal.ts`, and that `*WordsKept.test.tsx` now holds its words, states and
controls on the notebook page in every look. The 2026-10-01 header row (`Navigation.test.tsx`, `AppFlows.test.tsx`)
stays in force: both run green against the notebook unchanged (research R3). Run green before Increment 1:
`npx vitest run src/screens/__tests__/*CurrentPin.test.tsx src/screens/__tests__/Navigation.test.tsx src/screens/__tests__/AppFlows.test.tsx`.
The optional `before_plan` hook (`characterise`) is satisfied by those rows; no new behaviour of pre-method code is
pinned, because the only behaviour changed is the one D43 retires.

## Increments, in order

Each ends green (`npm test`, `npm run lint`, `npm run build`, `npm run check`). RED is the failing test written first;
"characterisation" means green at once by design, teeth shown by break-and-restore.

| # | Increment | RED (written first) | GREEN | Files | Disjoint with |
|---|---|---|---|---|---|
| 0 | **Trunk repair** (research R6) | already red on `main`: `boardScale.test.ts` and `tokens.test.ts` name `.nb-reaches-seen { gap: 4px 20px }` and `{ margin: 12px 0 0 }` | `gap: calc(4 * var(--nb-u)) calc(20 * var(--nb-u))`, `margin: calc(12 * var(--nb-u)) 0 0` | `src/styles/tonight-page.css` | everything; landed alone on `main` first as PR #54 (`fix/reaches-seen-scale`); the slice rebases onto it |
| 1a–1d | **Freeze the words** (D43), one per screen group, tests only, code unchanged | characterisation | (a) move the group's pin records verbatim from its `*CurrentPin.test.tsx` (and `setupPin.ts`) into `beforeTheReveal.ts`; the pin file imports them from there, still passing; (b) add `<Group>WordsKept.test.tsx`: every pin case rendered in `NotebookShell`, every look, its words, states and controls equal to those parsed from the captured markup (research R2); (c) re-point every comparison with "the same screen outside any shell" in the group's page and App-level tests at the baseline, or, where the comparison is not a pin case, at a literal captured now from the off-page render (never retyped by hand) | 1a protection: `ProtectionPage`, `TrailPage`. 1b quiet: `LimitsPage`, `TeardownPage`. 1c setup: `ChoosingPage`, `DisclosurePage`, `CustomEntryGuards`, `AppSetupPages` (the call log). 1d tonight: `CheckInPage`, `ReachesPage`, `ReachesByHourPage`, `TonightSurvivors`, `AppTonightPage` (the call log). Plus `beforeTheReveal.ts`, which 1a–1d each add their own records to | 1a–1d disjoint with each other except for appending to `beforeTheReveal.ts`: run them one after another, or give each group its own fixture file |
| 2 | **The reveal in App** (US2 sc. 5, 6; FR-011, FR-012, FR-032, D44) | `AppLook.test.tsx`: starts on Morning, every fresh render; a production build renders `[data-look="morning"]` and "Good morning." (devBuild false, and `DEV` stubbed false). `LookSwitch.test.tsx`: offers Morning, Midday, Night in order; on any look keeps the label, place and style it had. `look.test.ts`: three looks. `releasedBuild.test.ts`: choices are exactly the three; what ships carries "Good morning." and `nb-root`, and none of `CurrentShell`'s class strings (RED today: the released build renders `CurrentShell`) | `Look` narrows; `App` defaults to and forces `'morning'`, renders `NotebookShell` only; `CurrentShell.tsx` deleted; `LookSwitch` three choices, `data-look={look}`; `GREETINGS` loses `current`; `notebook.css` loses `.nb-switch:not([data-look]) select:focus-visible` and the two "On Current" comments | `src/App.tsx`, `src/look/look.ts`, `src/look/LookSwitch.tsx`, `src/shell/CurrentShell.tsx`, `src/styles/notebook.css`; tests as listed under Increment 2 below | — (after 0, 1a–1d) |
| 3 | **Protection and What is protected are only spreads** (D42) | `ProtectionPage.test.tsx`, `TrailPage.test.tsx`: rendered alone, each is its spread (`.nb-spread`, two `.nb-page`) | remove both screens' one-column branches, `Waiting`'s, `toneClasses`, the `Card`/`Button`/`useNotebookPage` imports | `src/screens/Protection.tsx`, `src/screens/Trail.tsx`; retire `ProtectionCurrentPin.test.tsx` | 4, 5, 6 |
| 4 | **What Cairn covers and This machine is as it was** | `LimitsPage.test.tsx`, `TeardownPage.test.tsx`: "outside any shell renders no spread" becomes "rendered alone, it is its spread" | remove both one-column branches and imports | `src/screens/Limits.tsx`, `src/screens/Teardown.tsx`; retire `QuietCurrentPin.test.tsx` | 3, 5, 6 |
| 5 | **The setup screens** | `ChoosingPage.test.tsx`: "Choosing outside any shell renders today's elements" becomes "rendered alone, the step is its one spread"; `DisclosurePage.test.tsx` likewise for the disclosure | remove the branches in `Choosing`, `Categories`, `CustomEntry`, `Disclosure` | `src/screens/Setup/*.tsx`, `src/screens/Disclosure.tsx`; `CustomEntryGuards.test.tsx` loses its `layouts` and `NotebookPageContext.Provider`; retire `SetupCurrentPin.test.tsx` | 3, 4, 6 |
| 6 | **Today and Tonight** | `ReachesPage.test.tsx`, `CheckInPage.test.tsx`: rendered alone, each is its spread, in Today and Over time and every check-in state | remove `Reaches`' `Card` path in `Frame`, `RangeBody`, the `onPage` parameter of `ViewButton`, `SeenByChoice`, `DateBoxes`, `TodayView`, `OverTimeView`; `CheckIn`'s `line`, `quoteSwitch` and its three `Card` returns | `src/screens/Reaches.tsx`, `src/screens/CheckIn.tsx`; tests adapted: `CheckIn.test.tsx`, `ReachesByHour.test.tsx`, `ReachesOverTime.test.tsx`, `TonightSurvivors.test.tsx`; retire `TonightCurrentPin.test.tsx` | 3, 4, 5 |
| 7 | **The signal and what only Current used** (REFACTOR, plus D45's last markers) | `releasedBuild.test.ts`: what ships carries none of `Card`'s class string, `.reflective`, `.settle`, `@keyframes settle` (RED: theme.css still ships the rules). `tokens.test.ts`: no screen source carries a palette text class (`text-(ink\|amber\|moss\|clay\|sand)-N`), and the only palette value a look re-points is `--color-moss-600`, readable on the paper | delete `notebookPage.ts` and `NotebookShell`'s Provider; delete `src/components/`; trim `theme.css` and `notebook.css` as research R5 lists | `src/shell/notebookPage.ts`, `src/shell/NotebookShell.tsx`, `src/components/*`, `src/styles/theme.css`, `src/styles/notebook.css`; tests: `tokens.test.ts`, `nothingFades.test.tsx` (`ALLOWED_MOTION` loses the two `theme.css` entries); retire `notebookPage.test.tsx` | — (after 3–6) |
| 8 | **Names** (REFACTOR, no behaviour) | none; `tsc` and the suite hold it | `NotebookLook` removed, its importers import `Look`; comments that still speak of Current, "both layouts" or "outside any shell" rewritten (`App.tsx`, `NotebookShell.tsx`, `Choosing.tsx`, `Limits.tsx`, `Teardown.tsx`, `Reaches.tsx`, `CheckIn.tsx`, `theme.css`, `notebook.css`); test titles naming SC-009 or Current that still hold are retitled (`tokens.test.ts` "scopes every selector to the notebook", `protectionPage.test.ts` "leaves the palette classes to Current", `NotebookShell.test.tsx`'s `@ts-expect-error` note) | the files named | — (last) |
| 9 | **Records** | — | append the four pin-retirement rows to `delivery/survey/pinned.md` (see Pin) | `delivery/survey/pinned.md` | any |

After Increment 2 the one-column branches are unreachable in the app but still rendered by the old pin tests; that is
why 3–6 follow 2 and not the other way round (with Current still in `App`, removing a branch would change Current while
`AppLook` still holds it). 3, 4, 5 and 6 touch disjoint source and test files and may run in parallel worktrees.

## Tests, file by file

Probe (research R3): with every screen told it is on a page and `App` defaulting to morning, 21 of 86 test files and
109 of 2,773 tests fail; all are listed here. Files not listed run unchanged.

**Retire** (their claim was "Current is unchanged", which ends at the reveal, SC-009; D43):

| File | What it held | Where that goes |
|---|---|---|
| `src/screens/__tests__/ProtectionCurrentPin.test.tsx` | Protection and What is protected, 11 + 9 states, element for element outside a page | records → `beforeTheReveal.ts` (1a); words, states, controls → `ProtectionWordsKept.test.tsx`, every look. Retired in 3 |
| `src/screens/__tests__/QuietCurrentPin.test.tsx` | What Cairn covers (2) and teardown (4) | records → fixture (1b); → `QuietWordsKept.test.tsx`. Retired in 4 |
| `src/screens/__tests__/SetupCurrentPin.test.tsx` and `setupPin.ts` | categories (3), address (9), disclosure (4) states; the choosing step through `App` in Current | records → fixture (1c); → `SetupWordsKept.test.tsx`. The App composition case retires in 2 (its words are the categories' and address's, held above; its order is Current's). File retired in 5; `setupPin.ts` emptied into the fixture in 1c |
| `src/screens/__tests__/TonightCurrentPin.test.tsx` | Today (6), Over time (9), Tonight (16) states | records → fixture (1d); → `TonightWordsKept.test.tsx`. Retired in 6 |
| `src/shell/__tests__/CurrentShell.test.tsx` | Current's header and column | nothing to port: the heading "Cairn", the tab names and reporting the choice are held by `NotebookShell.test.tsx` ("is called Cairn once", "renders every tab as a button with exactly its name", "reports the chosen destination"); "only Protection marked current" and the one column are Current's own. Retired in 2 |
| `src/shell/__tests__/notebookPage.test.tsx` | the signal reads true in `NotebookShell`, false in `CurrentShell` and alone | nothing: the signal is gone (D42). Retired in 7 |

**Port the comparison, keep the test** (1a–1d; each "says the same words as outside any shell" or "equals the same
state outside any shell" is re-pointed at the baseline, and the assertion that the off-page render is a `Card`
(`section.settle`, "the Pin's card") is dropped with the pin it echoed):
`ProtectionPage.test.tsx` (`outside`, `wordsOutside`), `TrailPage.test.tsx` (`wordsOutside`), `LimitsPage.test.tsx`
(`outside`), `TeardownPage.test.tsx` (`outside`), `ChoosingPage.test.tsx` (`outside`; its `Button` import goes with the
T003 describe in 5), `DisclosurePage.test.tsx` (`outside`, `states`), `CheckInPage.test.tsx` (`wordsOutside`, `seen`;
"the Pin's card" ×3 per look dropped; "same arguments as outside any shell" for `save_journal_entry` and
`set_quotes_shown` frozen as literal call logs), `ReachesPage.test.tsx` (`wordsOutside` and the inline outside renders
at 177, 424, 595, 705), `ReachesByHourPage.test.tsx` (235), `AppSetupPages.test.tsx` and `AppTonightPage.test.tsx`
("asks the core the same things, with the same arguments, as Current does": the Current call log frozen as a literal,
the Morning run compared with it). `.settle` absence checks in these files stay (still true, cheap).

**Adapt to the app as it now is** (assertions kept, rendered as it now is; D43):

| File | Change | Inc. |
|---|---|---|
| `src/shell/__tests__/AppLook.test.tsx` | starts on Morning (was Current), every fresh render, no storage; "moves between Current and Morning shells" retired; the per-choice table loses its Current row; Tonight text kept across pairs of the three and a round trip through Night; production: equals the dev build on Morning without its switch, renders `[data-look="morning"]` and "Good morning.", no Midday./Good evening., `DEV` stubbed false likewise and Tab never reaches a switch (US2 sc. 5, 6) | 2 |
| `src/shell/__tests__/LookSwitch.test.tsx` | offers Morning, Midday, Night in that order; "on Current carries no look and is exactly what it was" becomes "on morning keeps its label, place and style" (the same attribute and style assertions, `data-look` present) | 2 |
| `src/look/__tests__/look.test.ts` | the `current` greeting and the `current` row of the clock table go | 2 |
| `src/look/__tests__/focus.test.tsx` | `LookSwitch look="current"` → `"morning"`; the focused select still matches a `.nb-switch` focus rule | 2 |
| `src/shell/__tests__/releasedBuild.test.ts` | extended per research R4 | 2, 7 |
| `src/look/__tests__/tokens.test.ts` | the describe "what applies outside any [data-look]: the switch on Current" retires with its rule (2); the palette describe "every colour a screen draws as text" becomes "no screen draws a palette text class", the overrides test keeps only `--color-moss-600` on the paper and drops the badge-tint pairs (Current's badges), night's `--color-amber-600` line goes (7) | 2, 7 |
| `src/look/__tests__/nothingFades.test.tsx` | `ALLOWED_MOTION` loses `.settle` and `@keyframes settle` (the rules are gone) | 7 |
| `src/shell/__tests__/AppProtectionPage.test.tsx`, `AppLimitsPage.test.tsx`, `AppSetupPages.test.tsx`, `AppTonightPage.test.tsx` | the "Current shows today's markup" / "Current is unchanged" / "Current through App" cases retire; `AppTonightPage`'s "through Current and back" keeps the three looks; the `choosing(look)` / `start(look)` helpers lose `'Current'` | 2 |
| `src/screens/__tests__/CheckInLeaving.test.tsx` | "puts nothing in the header": the `banner` (Current's `<header>`) becomes the tabs, `navigation` named "Pages" | 2 |
| `src/screens/__tests__/TrailPageKeyboard.test.tsx` | "outside any shell (Current) has no sticky leaf" retires; rendered alone it now has the named left page the rest of the file holds | 3 |
| `src/screens/__tests__/CustomEntryGuards.test.tsx` | the `layouts` table and the Provider go; every guard runs once, on `CustomEntry` rendered alone | 5 |
| `src/screens/__tests__/CheckIn.test.tsx` | "sets the reflective surface in serif" and "shows one line in serif": the heading, textbox and quote carry their page classes (`nb-checkin-title`, `nb-checkin-write`, `nb-checkin-quote__line`), which `tonight-page.css` sets in `--nb-font-serif`; "set apart from the reflective surface": the switch carries `nb-checkin-switch`, set in `--nb-font-mono` | 6 |
| `src/screens/__tests__/ReachesByHour.test.tsx`, `ReachesOverTime.test.tsx` | "the standing sentence after/under the list": on the spread it is the last thing on the left page and the list is on the right (D22 item 5); the coverage note still precedes the list | 6 |
| `src/screens/__tests__/TonightSurvivors.test.tsx` | the `['outside any shell', false]` row goes; the day still renames itself when it ends | 6 |

**Run unchanged** (002/003 tests that render a screen alone or `App`, green in the probe against the notebook):
`AppFlows`, `Navigation`, `SetupUntick`, `CheckInDetails`, `CheckInToday`, `CheckInQuoteDays`, `CheckInQuoteHeld`,
`CheckInQuoteStale`, `CheckInQuoteStays`, `CheckInQuoteSwitch`, `CheckInQuoteSwitchNote`, `CheckInSaveInFlight`,
`CustomEntry`, `Disclosure`, `NothingVisible`, `Protection`, `ProtectionLastChecked`, `Reaches`,
`ReachesDefaultReader`, `ReachesEdges`, `ReachesRowGuard`, `ReachesToday`, `Trail`, `Waiting` (all under
`src/screens/__tests__/`), and every look, shell and IPC test not named above. The case modules `pinCases.ts`,
`quietCases.ts`, `setupCases.ts`, `tonightCases.ts` and `fakeCore.ts` stay.

**New**: `src/screens/__tests__/beforeTheReveal.ts` (fixture: the four pins' captured markup, moved verbatim, and the
literals captured in 1a–1d), `ProtectionWordsKept.test.tsx`, `QuietWordsKept.test.tsx`, `SetupWordsKept.test.tsx`,
`TonightWordsKept.test.tsx` (all under `src/screens/__tests__/`).

**The vacuity check** (end of 6): `grep -rn "outside any shell\|wordsOutside\|function outside" src` finds no helper
that renders a screen alone to compare a page with. One that survived would pass forever.

## Readings recorded (not questions)

- "Morning in a released build" (FR-032) and "starts on Morning" (FR-011) are the same state in the code: `App` holds
  `'morning'` initially and, without a dev build, never anything else. US2 scenario 6 and FR-013 together mean the
  greeting reads "Good morning." whatever the hour.
- D42's "whatever only they used" is read by callers in the tree after the branches go (research R5), not by
  guessing: `Card` and `Button` have no caller left; the palette re-points have no class left to serve, except
  `--color-moss-600`, which `setup-pages.css` reads directly.
- 003's "the standing sentence under the list" (`ReachesOverTime`, `ReachesByHour`) was a one-column claim; D22 placed it
  on the left page. Rendering the screen "as it now is" (D43) means asserting D22's order.
- `CheckInLeaving`'s "header" is, in the notebook, the tab column; the assertion is the same promise (nothing there
  says text is unsaved, FR-030b).
- The `history-by-weekday` worktree (003) rebases onto `Reaches.tsx` as Increment 6 leaves it (story split, parking lot).

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Pull-Request Gates: the PR is far over the SHOULD of 200 lines | Removing today's interface is mostly deletion (four files, ten one-column branches, four pin tests), and the pins' captured markup is moved verbatim so FR-018 keeps its baseline (D43). The reviewable new logic is small: `App`'s default, the switch's choices, the ported comparisons and the extended build test | Splitting into several PRs: `AGENTS.md` asks one PR per slice, and a half-revealed app (Current gone but branches kept, or the reverse) is a state nobody asked to see. The increments above are the review units, each its own green commit |

## Open questions

None. D41–D45 answered the slice's product questions. One process point for the host, not the owner: `main` is red
(research R6); the constitution allows only its repair while it is, so Increment 0 should land on `main` by itself
before the rest of this slice.
