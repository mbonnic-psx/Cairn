# Research — slice `reveal`

Phase 0 for [plan.md](plan.md). The product questions were answered at slice gaps (D42–D45); what follows is how,
and what was measured to decide it. Measurements on this machine (WSL2, Node 22), 2026-10-02.

## R1 — What replaces "knowing it is on a page" (D6, D42)

- **Decision:** nothing. Each screen keeps only its spread branch, unconditionally; `useNotebookPage`,
  `NotebookPageContext` and `src/shell/notebookPage.ts` are deleted, and `NotebookShell` stops providing it. A screen
  rendered alone (as the 002/003 tests render it) renders its spread: `.nb-spread` and `.nb-page` are plain classes and
  need no shell to exist.
- **Rationale:** D6 introduced the signal only so Current could stay unchanged while the notebook was built beside it.
  With Current gone the signal has one value; a constant read through a context is a second layout's hinge with no
  second layout.
- **Alternatives considered:** keep the context with a default of `true` (dead mechanism, and it would keep the
  vacuous "outside any shell" comparisons quietly passing, R3); keep the branches (D42 rejected).

## R2 — How the Current pins retire without FR-018 losing a word (D43)

- **Decision:** the pins' captured markup is the baseline, moved, never re-captured.
  1. Each `*CurrentPin.test.tsx` record map (and `setupPin.ts`'s `PIN`) moves verbatim into
     `src/screens/__tests__/beforeTheReveal.ts`. It is the output today's screens gave before 004 touched them, captured
     at the time and held unchanged since (pinned.md rows of 2026-10-02).
  2. A `<Group>WordsKept.test.tsx` renders every pin case inside `NotebookShell`, in each of the three looks, and
     compares with the record parsed in jsdom (a `<template>` element): **words** — the text of every leaf element,
     sorted, as `ProtectionPage.test.tsx`'s `words()` already does, so a sentence that moved page still matches;
     **controls** — every `button`, `input`, `textarea`, `select` and `a`, by role and accessible text (or label), with
     its `disabled` and `aria-pressed`, sorted; **states** — one case per state, the pin's own case table.
  3. Every page test that compared its page with "the same screen outside any shell" is re-pointed at that record for
     pin cases. A comparison over a state no pin captured (the CheckInPage view × quote-setting grid, typed text, the
     two App-level call logs) is captured now, while the one-column branch still exists, by running the existing
     comparison's outside side once and writing its output into the fixture as a literal. Never retyped by hand.
  4. Only then do the branches go (Increments 3–6), and each pin file retires in the increment that would turn it red.
- **Rationale:** D43's rule is "a pin that only proved unchanged from the old layout has nothing left to prove; a pin
  that proved a word was there still does". Element-for-element markup is the first kind; the words, controls and
  states inside it are the second. The page tests already assert word equality with Current for these same cases, so
  the ported comparison is expected to pass on day one; if a case does not, that is an FR-018 finding to report, never
  a record to edit.
- **Alternatives considered:** delete the pins outright (loses the only frozen statement of today's words); re-capture
  the baseline from the notebook (circular: the page would be held to itself); leave the page tests' "outside any
  shell" helpers as they are (they would render the page and compare it with itself, R3).

## R3 — The probe: which tests the reveal breaks, and which it silently empties

- **Method:** on the working tree, temporarily `createContext<boolean>(true)` in `notebookPage.ts` (every screen told it
  is on a page, wherever rendered) and `'morning'` as `App`'s initial and production look; `npx vitest run
  --reporter=json`; both files restored with `git checkout`. Baseline before the probe: 2 files, 3 tests red (R6).
- **Result:** 21 of 86 files, 109 of 2,773 tests red. Every one is named in plan.md's "Tests, file by file": the four
  pins (74 tests), the App-level Current cases (AppLook 5, AppLimitsPage, AppProtectionPage, AppSetupPages,
  AppTonightPage 1 each), `notebookPage.test.tsx` (2), "outside any shell renders no spread" (LimitsPage,
  TeardownPage, ChoosingPage T003, TrailPageKeyboard), CheckInPage's "the Pin's card" (12), `CheckIn.test.tsx`'s
  `reflective` (2), `CheckInLeaving`'s `banner`, the standing-sentence order in `ReachesByHour` and `ReachesOverTime`,
  and the R6 three. `CurrentShell.test.tsx`, `LookSwitch.test.tsx`'s Current case, `look.test.ts`'s `current` rows and
  `focus.test.tsx` stayed green only because the probe kept those files; they go with what they test.
- **The hidden part:** every page-test comparison with "the same screen outside any shell" (some 25 call sites, many
  of them `it.each` over every case and every look) stayed green in the probe and would stay green after the
  reveal while proving nothing, because their "outside any shell" side now renders the page too (ProtectionPage,
  TrailPage, LimitsPage, TeardownPage, ChoosingPage, DisclosurePage, CheckInPage, ReachesPage, ReachesByHourPage).
  `CustomEntryGuards` and `TonightSurvivors` would run each case twice over the same layout. That is why Increment 1
  precedes the removal, and why the plan ends with a grep for surviving helpers.
- **Green against the notebook, unchanged:** every 002/003 test that renders `App` (`AppFlows`, `Navigation`,
  `SetupUntick`, `CheckInDetails`, `CheckInToday`, `CheckInQuoteDays`, `CheckInQuoteStays`) and every one that renders
  a screen alone apart from those named. The header row pinned 2026-10-01 stays in force.

## R4 — What the extended production-build test searches, and its teeth (D29, D45)

- **Decision:** `src/shell/__tests__/releasedBuild.test.ts` keeps its two builds (production with `NODE_ENV` removed,
  development with `--mode development`) and its scratch directory under `~/.cache/cairn-scratch`. It adds:
  - **The switch's words, three choices now.** Read from `LookSwitch.tsx` as before; the label and exactly Morning,
    Midday, Night, in that order (FR-011). Found in the development build (teeth), none in the production build.
  - **The notebook ships.** The production build's files contain "Good morning.", `nb-root` and `data-look`.
  - **Current does not.** None of these markers in the production build: `min-h-screen px-6 py-12` and
    `mx-auto mb-10 flex max-w-3xl` (`CurrentShell`'s main and header), `settle rounded-2xl border border-sand-200`
    (`Card`), and in the CSS `.reflective`, `.settle` and `@keyframes settle`. Written as constants: their source files
    no longer exist to be read from.
  - **Teeth for the Current markers.** (a) RED first: written before the removal, the assertion fails on today's tree,
    whose production build renders `CurrentShell` (the probe build of 2026-10-02 carried `.reflective` and `.settle` in
    its CSS); it turns green in Increment 2 (shell markers) and Increment 7 (`Card`, CSS markers). (b) Standing: each
    class marker is found in the retired pins' captured markup in `beforeTheReveal.ts`, so a marker that drifted from
    what Current really rendered fails the test rather than passing vacuously.
- **What a bundle search cannot prove:** that morning is the *default*. "Good morning." shipped before the reveal too
  (frame adversary R1: the notebook's code was in the bundle, unreachable). The default is proven at `App`:
  `render(<App devBuild={false} />)` and `vi.stubEnv('DEV', false)` both show `[data-look="morning"]` and "Good
  morning." and no switch (US2 scenario 6). The quickstart's released-build run shows it to a person.
- **Alternatives considered:** a new CI check (changes a gate; D29, D45 rejected); importing the emitted production
  bundle into a jsdom test and letting it render (would prove the default in the shipped code itself, but executes a
  minified bundle inside Vitest's transform and is more mechanism than D45 asks; recorded for the adversary to weigh).

## R5 — What only Current used (D42), verified by callers

`.codegraph/` is not initialised in this checkout (`delivery/scripts/codegraph` says so), so callers were found by
`grep -rn` over `src/`, `scripts/`, `src-tauri/`, `delivery/scripts/`, the configs and `index.html`.

| Name | Callers today | After the branches go | Fate |
|---|---|---|---|
| `src/shell/CurrentShell.tsx` | `App.tsx`; `CurrentShell.test.tsx`; `notebookPage.test.tsx` | none | delete (Inc. 2) |
| `src/shell/notebookPage.ts` | `NotebookShell.tsx` (Provider); every screen (10 files); `CustomEntryGuards.test.tsx`, `notebookPage.test.tsx` | none | delete (Inc. 7) |
| `src/components/Card.tsx` | the one-column branch of every screen but `Choosing` | none | delete (Inc. 7) |
| `src/components/Button.tsx` | `CurrentShell`; one-column branches of `Protection` (`Waiting`), `Disclosure`, `Choosing`, `CustomEntry`, `CheckIn` (`quoteSwitch`, Keep this); `ChoosingPage.test.tsx` | none: every page branch draws a plain `<button>` (loose-ends D3) | delete (Inc. 7) |
| `theme.css` `.reflective` | one-column branches; `CurrentShell`'s h1 | none | delete |
| `theme.css` `.settle`, `@keyframes settle`, `--ease-gentle` | `Card` | none | delete |
| `theme.css` `--font-serif`, and `notebook.css`'s `[data-look] { --font-serif }` | `.reflective`; Tailwind `font-serif` (unused) | none | delete both |
| `theme.css` palette | body: `--color-sand-50`, `--color-ink-700`; `setup-pages.css`: `--color-moss-600`; the rest only by one-column classes and `Button` | those three | keep those three and `--font-sans`; delete the rest |
| `notebook.css` re-points `--color-ink-500`, `--color-ink-400`, `--color-amber-600`, `--color-amber-500` (×3 looks) | palette text classes in screens | none (a sweep of `src/screens/**` finds no `text-(ink\|amber\|moss\|clay\|sand)-N` once the branches go) | delete; `--color-moss-600` re-point kept, `setup-pages.css` reads it on the paper |
| `notebook.css` `.nb-switch:not([data-look]) select:focus-visible` | the switch on Current | none: the switch always carries a look | delete (Inc. 2) |
| Tailwind itself | `sr-only` (`NotebookShell`, `CustomEntry`), preflight | still used | keep |

Tailwind 4 emits only the theme values something reads: the production CSS of 2026-10-02 carried 16 `--color-*` values,
not the 18 `@theme` declares (no `clay-100`, `sand-400`). So trimming `@theme` changes the bundle by nothing; it is
source tidiness D42 asks for. The class strings and the `.settle`/`.reflective` rules are what actually leave the bundle.

## R6 — The trunk is red

- **Found:** `npm test` on `slice/reveal` (= `main` + one docs commit) fails 3 tests in 2 files:
  `boardScale.test.ts` and `tokens.test.ts` report `.nb-reaches-seen { gap: 4px 20px }` and `{ margin: 12px 0 0 }`
  unscaled. `history-by-hour` (#48, commit `4c2eb66`) added the rule; `board-scale` (#49) added the sweep that requires
  every page length as `calc(N * var(--nb-u))`; each was green alone and they merged on the same day.
- **Decision:** Increment 0 scales them (`gap: calc(4 * var(--nb-u)) calc(20 * var(--nb-u))`, `margin: calc(12 *
  var(--nb-u)) 0 0`), the sheet's own convention, and lands first. At 1280×800 and below, `--nb-u` is 1px, so nothing a
  person sees changes there.
- **Why first:** the constitution's trunk rule (a red trunk stops the line) and the plan's own rule that every increment
  ends green.

## R7 — The `Look` type

- **Decision:** `Look = 'morning' | 'midday' | 'night'` in Increment 2, with `NotebookLook` left as the identical alias it
  then is, so that increment touches no importer; Increment 8 removes the alias and its 18 importers import `Look`
  (type-only; `tsc --noEmit` in `npm run build` proves it). `NotebookShell.test.tsx`'s `@ts-expect-error` on
  `look="current"` stays meaningful: `'current'` is no look at all now.

## R8 — Seams for the tests this slice writes

- New and rewritten tests use `installFakeCore` and plain fakes. `AppLook.test.tsx` already carries `vi.mock` for
  `ipc` and `ipc/journal`, as do several 003 check-in tests; adapting their assertions keeps that seam as it is and adds
  no `vi.mock` (AGENTS.md: a mocking framework is the last resort, never added for the purpose).

## R9 — Anything outside the interface that names what goes

- `grep` over `scripts/`, `src-tauri/`, `delivery/scripts/`, `.github/`, `vite.config.ts`, `eslint.config.js`,
  `tsconfig*.json` and `index.html` for `CurrentShell`, `notebookPage`, `useNotebookPage`, `components/Card`,
  `components/Button`, `LookSwitch`, `theme.css`, `reflective`, `'current'`: no hit that refers to them (`settle` hits
  are Rust's `reach_mode::settle` and `smoke.sh`'s wait).
- `scripts/check-no-ambient-counts.mjs` lists `src/components/` among the shell paths. With the directory gone it
  matches nothing there; `App.tsx` and `main.tsx` are still checked. The guard is not edited and still fails on a
  planted violation in `App.tsx`.
- `npm run check` passes today; nothing this slice deletes is something a guard needs to find.
