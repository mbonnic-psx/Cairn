# Story split — The notebook in the landscape

Approved by the owner on 2026-10-01 ("1. yes").

The capability: *a person opens Cairn and finds a calm landscape with a notebook resting on it, and every part of
Cairn reads as a page in that notebook, in a morning, midday or night look*. Nothing Cairn does changes. Each slice
leaves the whole app usable and visibly closer to the chosen design, never half a screen.

**Revised 2026-10-01.** Every slice lands on `main` within a day, behind the development switch, whose default is
**Current**, today's interface. The redesign stays hidden until slice 7, `reveal` (spec FR-011, FR-032).

Split by **interface** (SPIDR). The frame first, because every page lives inside it. Then the looks, so every
page that follows is built and checked in all three. Then one group of screens at a time.

## Slices, in order

| # | Slice | What the person sees afterwards | Specification | Depends on |
|---|---|---|---|---|
| 1 | `frame` | Behind the switch (Current or Morning): the landscape in its morning look, the notebook, the paper tabs, the greeting and the Cairn mark. Every existing screen already sits inside the notebook, unchanged in content. Fonts ship in the app. Works from the smallest window to the largest | US1; FR-001–FR-008, FR-014, FR-015, FR-017, FR-022, FR-024–FR-027 | — |
| 2 | `looks` | Midday and night, and the testing switch that moves between the three looks, present only in development builds | US2; FR-009–FR-013b, FR-016, FR-021, FR-023, FR-033 | `frame` |
| 3 | `protection-page` | Protection (including "not confirmed" and a waiting change) and What is protected, laid out as notebook spreads | US3 (Protection, What is protected); FR-018, FR-020 | `looks` |
| 4 | `tonight-page` | Tonight and Today (both its views, Today and Over time, with the Which days buttons), laid out as notebook spreads: the typed log, the sites over a range, and the lined journal page (D21) | US3 (Tonight, Today); FR-018, FR-019 | `looks` |
| 5 | `setup-pages` | What would you like to protect?, Anywhere else? and Before Cairn changes anything, as notebook spreads | US3 (setup, disclosure); FR-018 | `looks` |
| 6 | `quiet-pages` | What Cairn covers and This machine is as it was, as notebook spreads | US3 (limits, teardown); FR-018 | `looks` |
| 8 | `loose-ends` | Nothing new to look at: what the completion audit found the pages promise but no test holds, held now — the release build carries no look switch, What is protected's left page scrolls from the keyboard, the setup and Protection buttons keep their edge in forced colours, a look change never fades a button, the focus and contrast guards read every rule, the platform frame is pinned, and Yes, set this up is pressed on the page (D26) | FR-007, FR-010, FR-021, FR-022, FR-025; SC-002, SC-004 | `protection-page`, `setup-pages`, `quiet-pages` |
| 9 | `fold-and-width` | The fold, a thin line between the two pages in every look and on every screen, as the canvas draws it; and on a large or full-screen window the notebook grows wider, staying landscape (never taller than wide), up to a width where lines stay comfortable to read, centred on the scene. Asked by the owner after their own demo of all three looks (D33) | FR-034, FR-035 | `loose-ends` |
| 10 | `board-scale` | The whole scene is the G board scaled to the window: on a large or full-screen window the notebook fills most of it, as on the board, the greeting sits hard left in the sky and grows with the window, the sun, hills and cairn keep their places, and the writing on the pages grows with the notebook. Asked by the owner after their demo of fold-and-width (D37) | FR-036 | `fold-and-width` |
| 7 | `reveal` | The notebook becomes Cairn's interface: morning by default, today's interface and the Current choice removed, a three-way switch left for testing. Runs only after the owner accepts all three looks in a demo. The owner accepted them and said "go reveal" on 2026-10-02 (D41) | FR-012, FR-032; SC-008, SC-009 | `protection-page`, `tonight-page`, `setup-pages`, `quiet-pages`, `loose-ends`, `fold-and-width`, `board-scale` |

## Slice graph

```text
frame ── looks ──┬── protection-page
                 ├── tonight-page
                 ├── setup-pages
                 └── quiet-pages
                              (all four) ── loose-ends ── fold-and-width ── board-scale ── reveal
```

- `frame`: depends_on none
- `looks`: depends_on frame
- `protection-page`, `tonight-page`, `setup-pages`, `quiet-pages`: depends_on looks
- `loose-ends`: depends_on protection-page, setup-pages, quiet-pages (added by the completion audit, D26)
- `fold-and-width`: depends_on loose-ends (the owner's message after their demo of all three looks, D33)
- `board-scale`: depends_on fold-and-width (the owner's message after their demo of fold-and-width, D37)
- `reveal`: depends_on protection-page, tonight-page, setup-pages, quiet-pages, loose-ends, fold-and-width, board-scale

Once `looks` is done, the four page slices are ready together. Each edits its own screen files. They share only
the frame's page-spread layout and the look tokens, both settled by `frame` and `looks`.

## Parking lot

- `tonight-page` touches the Today screen. The 003 slice `history-by-site` is in flight in its own worktree and may
  touch the same screen. Land it first, or run `tonight-page` after it.
- The clock choosing the look is a later feature. It removes the testing switch before the first release (FR-013a).
- Screens not built yet (Settings, Over time, One day, a partner, streaks) adopt this style when their own slices
  build them.
- `protection-page` lands the notebook context and heading outline (D6, D9) before `setup-pages` and `quiet-pages`
  start; they build against it. Carried tasks are owned as D10 says.
- A waiting change is never shown in the running app (`App` never fetches it). That is 002's to fix, as a task in
  `specs/002-machine-wide-protection/tasks.md` (D11). When it lands, Current's Protection shows it too; that is 002's
  change, not a break of SC-009.
- A spread with no control may not scroll from the keyboard in the macOS and Linux webview: the page area is the
  shell's. One shell task makes it reachable and scrollable by keyboard, as host work on main before `reveal` (D19).
  The same task scrolls the page area back to its top when the screen changes: at 800×600 the disclosure opened
  part-way down, its heading cut off (setup-pages demo, design note 1). Landed as host work in iteration 6: the
  page area is a tab stop of its own with a focus ring in `--nb-ink`, and it returns to its top when the step
  changes, choosing to disclosure included (`NotebookShell.test.tsx`, `AppSetupPages.test.tsx`). Held in jsdom
  only; no WebKit run was possible here, so the owner's macOS/Linux demo is where it is seen.
- Before Cairn changes anything can be confirmed before its details (what is not covered) are shown, while they load
  or when they cannot be read. That is 002's to fix, as a task in `specs/002-machine-wide-protection/tasks.md` (D20).
  When it lands, Current's disclosure changes too; that is 002's change, not a break of SC-009.
- A real-browser check of the layout at 800×600 (frame T024: tabs and greeting inside the notebook, spreads scrolling
  without overlap or clipping, FR-025, FR-029) waits on the owner choosing a browser test runner, a new dependency
  (D10, D27). Until then the demos' screenshots are the only proof of real layout.
- `reveal` removes every screen's one-column layout (D42). The 003 slice `history-by-weekday`, planned in its own worktree on 2026-10-02, builds on the Today page as `reveal` leaves it: rebase it after `reveal` merges.
