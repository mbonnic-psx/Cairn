# Story split — The notebook in the landscape

Approved by the owner on 2026-10-01 ("1. yes").

The capability: *a person opens Cairn and finds a calm landscape with a notebook resting on it, and every part of
Cairn reads as a page in that notebook, in a morning, midday or night look*. Nothing Cairn does changes. Each slice
leaves the whole app usable and visibly closer to the chosen design, never half a screen.

Split by **interface** (SPIDR). The frame first, because every page lives inside it. Then the looks, so every
page that follows is built and checked in all three. Then one group of screens at a time.

## Slices, in order

| # | Slice | What the person sees afterwards | Specification | Depends on |
|---|---|---|---|---|
| 1 | `frame` | The landscape in its morning look, the notebook, the paper tabs, the greeting and the Cairn mark. Every existing screen already sits inside the notebook, unchanged in content. Fonts ship in the app. Works from the smallest window to the largest | US1; FR-001–FR-008, FR-014, FR-015, FR-017, FR-022, FR-024–FR-027 | — |
| 2 | `looks` | Midday and night, and the testing switch that moves between the three looks, present only in development builds | US2; FR-009–FR-013b, FR-016, FR-021, FR-023 | `frame` |
| 3 | `protection-page` | Protection (including "not confirmed" and a waiting change) and What is protected, laid out as notebook spreads | US3 (Protection, What is protected); FR-018, FR-020 | `looks` |
| 4 | `tonight-page` | Tonight and Today, laid out as notebook spreads: the typed log and the lined journal page | US3 (Tonight, Today); FR-018, FR-019 | `looks` |
| 5 | `setup-pages` | What would you like to protect?, Anywhere else? and Before Cairn changes anything, as notebook spreads | US3 (setup, disclosure); FR-018 | `looks` |
| 6 | `quiet-pages` | What Cairn covers and This machine is as it was, as notebook spreads | US3 (limits, teardown); FR-018 | `looks` |

## Slice graph

```text
frame ── looks ──┬── protection-page
                 ├── tonight-page
                 ├── setup-pages
                 └── quiet-pages
```

- `frame`: depends_on none
- `looks`: depends_on frame
- `protection-page`, `tonight-page`, `setup-pages`, `quiet-pages`: depends_on looks

Once `looks` is done, the four page slices are ready together. Each edits its own screen files. They share only
the frame's page-spread layout and the look tokens, both settled by `frame` and `looks`.

## Parking lot

- `tonight-page` touches the Today screen. The 003 slice `history-by-site` is in flight in its own worktree and may
  touch the same screen. Land it first, or run `tonight-page` after it.
- The clock choosing the look is a later feature. It removes the testing switch before the first release (FR-013a).
- Screens not built yet (Settings, Over time, One day, a partner, streaks) adopt this style when their own slices
  build them.
