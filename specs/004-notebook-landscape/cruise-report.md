# Cruise report — The notebook in the landscape (004)

Written by the completion audit, iteration 6, 2026-10-02. Updated in iterations 7, 8 and 10, and rewritten in
iteration 11 after `reveal` merged (#55). Three `drive-gaps` reviews read the whole of `spec.md` against `main`:
the frame, looks and release; setup and Protection; and Today, Tonight, What Cairn covers and This machine is as
it was.

## What the specification asked

1. The window as a notebook resting on a landscape, with paper tabs, a greeting and the Cairn mark (US1).
2. Three looks, morning, midday and night, with a switch only in development builds (US2).
3. Every existing screen laid out as a notebook spread, word for word, readable and usable by keyboard in every
   look (US3).
4. Then the reveal: the notebook becomes Cairn's interface once you accept all three looks (FR-032, SC-008).

## What shipped

1. All 10 slices are merged: `frame` (#28), `looks` (#30), `protection-page` (#31), `setup-pages` (#34),
   `quiet-pages` (#35), `tonight-page` (#38), `loose-ends` (#42), `fold-and-width` (#46), `board-scale` (#49) and
   `reveal` (#55).
2. **The reveal (your "go reveal", D41).**
   - A released build opens on the morning notebook, with "Good morning." at any hour, and no switch.
   - A development build starts on Morning, and its "Look (testing)" switch offers Morning, Midday and Night.
   - Today's interface and the Current choice are gone, along with every screen's old one-column layout (D42).
     The old code no longer ships, which closes frame finding R1.
   - Keyboard users now reach the paper tabs before the page (D47). Where the tabs are drawn has not changed.
   - Every screen's words, controls and live regions are checked against what it said before the reveal (D43).
     A later change to a page's words is recorded as a dated change beside that record (D46).
3. **Host work.**
   - D19 (#40): the page area takes keyboard focus, and each screen opens at its top.
   - After the reveal: a test now checks that a missing font falls back to the same kind of face (D49).
4. **The audit found nothing in 004 unbuilt.**

## What is left

1. **Screens that go blank or wrong when the core fails.** These were there before the notebook, and the reveal
   kept them word for word. They are handed to the features that own them (D48):
   - **002, T105 (HIGH):** if Cairn cannot read protection at start, the setup page shows as if Cairn were off.
   - **002, T106–T112:** the categories vanish when they cannot be read. A turn-on that worked returns to
     setup. What is protected's tab does nothing, and What Cairn covers is blank, when a read fails. Two
     setup sentences are never announced. "1 addresses". Teardown's "still here" over an empty list.
   - **003, T081 (with T080):** Today stays on "Looking…" when its read fails. Loading and could-not-read
     sentences are never announced.
2. **Design notes for you to look at.**
   - In midday the greeting sits on the sun.
   - At 2560 wide the tab labels read small.
   - At 800×600 the sun or moon and the hilltop cairn hide behind the notebook.
   - Over time writes dates two ways on one page.
   - The page area's focus ring is square on rounded paper.
   - A screen reader hears "Protection is on" twice.
   - In a development build the switch is the first Tab stop.
   - The window's first colour is the morning sky in every look.
   - In a short, wide window the greeting grows with the width, but the writing does not.
   - An ultrawide window stops the notebook at 1.5 times as wide as tall (D38).
3. **Proven only by screenshots so far:** the real layout at 800×600, and keyboard scrolling in the macOS and Linux
   webview. Both wait on your choice of a browser test runner (D27, frame T024).

## Out of scope, by decision

1. The waiting change is never fetched (D11, 002 T101).
2. The disclosure can be confirmed before its details (D20, 002 T104).
3. The clock choosing the look is a later feature. It removes the testing switch before the first release
   (FR-013a).

## Your questions, each with a recommendation

1. **See the released build yourself?** Recommended: yes. Run `npm run build && npx vite preview`, or
   `npm run tauri dev`. The reveal's demo was run by the demo agent, not by you.
2. **Choose a browser test runner for the real layout check?** (D27) Recommended: Vitest Browser Mode. It runs
   the tests this repository already has, in a real browser.
3. **Fix 002 T105 next?** Recommended: yes, before anything else in 002. A protected machine that looks
   unprotected is the one thing here that misleads.

## Decisions you have not yet reviewed

1. Every entry in `decisions.md` decided by `host` or `drive-skipper`: D3 to D31, D34 to D36, D38 to D40, and
   D42 to D49. D1, D2, D32, D33, D37 and D41 are yours.
2. Every demo marked `accepted-by: drive-hand` in `slices/README.md`: looks, protection-page, setup-pages,
   quiet-pages, tonight-page, loose-ends, fold-and-width, board-scale and reveal. You saw `frame` yourself, and
   all three looks in your own demos.

## Architecture decisions still `Proposed`

None from this feature.
