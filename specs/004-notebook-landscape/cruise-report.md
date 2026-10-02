# Cruise report — The notebook in the landscape (004)

Written by the completion audit, iteration 6, 2026-10-02; brought up to date in iteration 7, after `loose-ends` merged, in iteration 8, after `fold-and-width`, and in iteration 10, after `board-scale`. Three `drive-gaps` reviews read the whole of `spec.md`
against what is on `main` (frame and looks; setup and Protection pages; Today, Tonight, What Cairn covers and
This machine is as it was).

## What the specification asked

1. The window as a notebook resting on a landscape, with paper tabs, a greeting and the Cairn mark (US1).
2. Three looks — morning, midday, night — behind a development-only switch that starts on Current (US2).
3. Every existing screen laid out as a notebook spread, word for word, readable and usable by keyboard in every
   look (US3).
4. Then the reveal: the notebook becomes the default, only after the owner accepts all three looks (FR-032, SC-008).

## What shipped

1. `frame` (#28), `looks` (#30), `protection-page` (#31), `setup-pages` (#34), `quiet-pages` (#35),
   `tonight-page` (#38) — six slices, every one behind the switch.
2. `loose-ends` (#42, D26, D29–D31): the seven things the pages promised are now held by tests. What is protected's left page now scrolls inside itself, and its focus ring has room (found at its demo).
3. `fold-and-width` (slice 9, your message after your demo, D33–D36): the fold between the pages in every look and on every screen, and a notebook that widens with the window up to 1200×983, never taller than wide, never narrower than before.
4. `board-scale` (slice 10, your message after your demo of fold-and-width, D37–D40): the whole scene is your G-Morning board scaled to the window. The notebook fills most of a large window as on the board, the greeting sits hard left and grows (60px at 1920×1080), and the writing grows with the notebook. This replaces fold-and-width's 1200px cap.
5. Host work: D19 (#40) — the page area takes focus, so a spread with no control scrolls from the keyboard, and
   each screen opens at its top.
6. The audit found no criterion unbuilt. Every requirement it read is built and almost all are held by tests.

## What is left

1. **`reveal`** (slice 7) — never run by `/cruise`. It waits for your own demo of all three looks (D1). Every other slice is merged.
2. Demo design notes for the reveal's review: the midday greeting sits on the sun at every size, as on the board; in a short wide window (1920×800) the greeting grows with the width while the writing stays today's size; the title row and testing switch do not grow; at 1920×1080 the notebook is 918px tall, a little less than fold-and-width's 960 (D38 note); a page's line holds about 77 characters (D39 note); an ultrawide window stops the notebook at 1.5× as wide as tall (D38); at 2560 the tab labels read a little small and Tonight's writing space leaves a lot of ruled page below it (fold-and-width); on midday and night the fold is the ruled lines' own colour, so on a blank page only its direction sets it apart (D34 note); at 800×600 the sun or moon and the hilltop cairn are hidden behind the notebook (looks); under forced colours the landscape keeps its painted sun, moon and hills (loose-ends).

## Out of scope, by decision

1. Tonight's loading and could-not-be-read sentences go unannounced, in Current too. Handed to 003 as T080 (D28).
2. The waiting change is never fetched (D11) and the disclosure can be confirmed before its details (D20): 002's,
   as T101 and T104.
3. The clock choosing the look (FR-013a) is a later feature.

## Your questions — each with a recommendation

1. **Choose a browser test runner for the real layout check at 800×600?** (frame T024, D27) Recommend Vitest
   Browser Mode: it runs the tests this repository already has, in a real browser. Until you choose, the demos'
   screenshots are the only proof of real layout.
2. **Run the reveal demo?** Recommend yes, now that `board-scale` has merged — try a full-screen window: see morning, midday and night on every page, at
   800×600 too, on macOS or Linux if you can — that is also the only WebKit check of D19.

## Decisions you have not yet reviewed

1. Every entry in `decisions.md` decided by `host` or `drive-skipper` — D3 to D31, D34 to D36 and D38 to D40. D1, D2, D32, D33 and D37 are yours.
2. Every demo `accepted-by: drive-hand` in `slices/README.md`: looks, protection-page, setup-pages, quiet-pages,
   tonight-page, loose-ends, fold-and-width, board-scale. You have seen `frame`, and all three looks in your own demo.

## Architecture decisions still `Proposed`

None from this feature.
