# Cruise report — The notebook in the landscape (004)

Written by the completion audit, iteration 6, 2026-10-02. Three `drive-gaps` reviews read the whole of `spec.md`
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
   `tonight-page` (#38) — six of seven slices, every one behind the switch.
2. Host work: D19 (#40) — the page area takes focus, so a spread with no control scrolls from the keyboard, and
   each screen opens at its top.
3. The audit found no criterion unbuilt. Every requirement it read is built and almost all are held by tests.

## What is left

1. **`loose-ends`** (slice 8, D26) — seven things the pages promise but no test holds yet. It runs next:
   1. Search the release build for the look switch (SC-002).
   2. Let the keyboard scroll What is protected's left page (FR-022, FR-025).
   3. Press "Yes, set this up" on the page, for both outcomes (setup-pages T024).
   4. Keep the setup and Protection buttons' edges in forced colours (setup-pages T025).
   5. Stop the shared button fading on a change of look (looks T024, D3).
   6. Make the focus and contrast guards read every rule, not only the base one (quiet-pages T013).
   7. Pin the platform's own window frame (FR-007).
2. **`reveal`** (slice 7) — never run by `/cruise`. It waits for your own demo of all three looks (D1).

## Out of scope, by decision

1. Tonight's loading and could-not-be-read sentences go unannounced, in Current too. Handed to 003 as T080 (D28).
2. The waiting change is never fetched (D11) and the disclosure can be confirmed before its details (D20): 002's,
   as T101 and T104.
3. The clock choosing the look (FR-013a) is a later feature.

## Your questions — each with a recommendation

1. **Choose a browser test runner for the real layout check at 800×600?** (frame T024, D27) Recommend Vitest
   Browser Mode: it runs the tests this repository already has, in a real browser. Until you choose, the demos'
   screenshots are the only proof of real layout.
2. **Run the reveal demo?** Recommend yes, after `loose-ends`: see morning, midday and night on every page, at
   800×600 too, on macOS or Linux if you can — that is also the only WebKit check of D19.

## Decisions you have not yet reviewed

1. Every entry in `decisions.md` decided by `host` or `drive-skipper` — D3 to D28. D1 and D2 are yours.
2. Every demo `accepted-by: drive-hand` in `slices/README.md`: looks, protection-page, setup-pages, quiet-pages,
   tonight-page. You have seen only `frame`.

## Architecture decisions still `Proposed`

None from this feature.
