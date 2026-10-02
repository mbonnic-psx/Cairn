# Decisions — The notebook in the landscape

Every product decision a `/cruise` run took, in order. A person overrides one by editing its `Status` and writing the answer into the artifact.

## D1 — Does `/cruise` run the `reveal` slice?
- **Stage:** split · **Slice:** reveal · **When:** 2026-10-01T22:45:00Z · **Iteration:** 0
- **Question:** The split ends with `reveal`, which makes the notebook the default. May an unattended run take it?
- **Options:** run it after the four page slices; stop before it and park (recommended)
- **Decision:** Stop before it. A run that reaches `reveal` parks for the owner.
- **Why:** The owner wants to see and accept all three looks themselves before the notebook replaces today's interface (SC-008). An agent's demo is not that acceptance.
- **Decided by:** human
- **Confidence:** high · **Would reverse if:** the owner accepts all three looks in a demo and asks for the reveal
- **Written to:** `.specify/product-owner.md` (Out of scope), `specs/004-notebook-landscape/story-split.md` (row 7 needs the owner's demo)
- **Status:** standing

## D2 — Does a released build open at 1280×800 before the reveal?
- **Stage:** after acceptance (adversary triage) · **Slice:** frame · **When:** 2026-10-01T23:58:00Z · **Iteration:** 1
- **Question:** Adversary finding R2: a released build opens at 1280×800, not today's 1000×720, before the reveal. That differs from the letter of SC-009 and FR-012. Keep it or revert it?
- **Options:** keep 1280×800 (the host's triage); open at 1000×720 until the reveal
- **Decision:** Keep 1280×800 in released builds. R2 stays declined.
- **Why:** The owner asked for 1280×800 (FR-028), and the window's size is not the interface the reveal guards.
- **Decided by:** human
- **Confidence:** high · **Would reverse if:** the owner asks for released builds to keep today's window until the reveal
- **Written to:** `specs/004-notebook-landscape/adversary-log.md` (R2)
- **Status:** standing

## D3 — Does a change of look fade, or happen at once?
- **Stage:** slice gaps · **Slice:** looks · **When:** 2026-10-02T04:33:00Z · **Iteration:** 2
- **Question:** Choosing a look on the switch could cross-fade the scene or change it at once.
- **Options:** at once, no transition (recommended: the scenario says "at once"); a soft cross-fade, none under reduced motion
- **Decision:** At once, with no transition, in every case.
- **Why:** US2 scenario 1 says the look changes "at once". The switch is a testing aid, and an instant change makes each look easy to compare.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner asks for a soft change between looks when the clock feature arrives
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications, US2 scenario 1)
- **Status:** standing

## D4 — Must the Cairn mark stay visible on the night sky?
- **Stage:** slice gaps · **Slice:** looks · **When:** 2026-10-02T04:33:00Z · **Iteration:** 2
- **Question:** The mark is drawn in ink-coloured stones. FR-021 covers text only, so nothing stops the mark vanishing on the dark night sky.
- **Options:** the base and top stones at least 3:1 against the sky, the WCAG floor for graphics, applied to the stones that carry the shape (recommended); every stone at 3:1, which the accepted morning mark's pale stone does not meet; leave it to the owner's eye at the demo
- **Decision:** The mark's base and top stones each meet at least 3:1 against the sky behind them, in every look. The middle stones may stay soft (FR-033).
- **Why:** The mark is how the person knows the window is Cairn. Lost on the night sky, it would read as a broken screen.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner, seeing the night look, wants the mark softer than 3:1
- **Written to:** `specs/004-notebook-landscape/spec.md` (FR-033, Clarifications), `specs/004-notebook-landscape/story-split.md` (row 2)
- **Status:** standing

## D5 — Does a move to or from Current have to keep everything typed on the screen?
- **Stage:** convergence · **Slice:** looks · **When:** 2026-10-02T04:57:48Z · **Iteration:** 2
- **Question:** Moving between notebook looks keeps the screen and everything typed. Moving to or from Current swaps the whole shell, so the screen is rebuilt: the step and the Tonight text survive, but a field the screen holds itself (the custom address box) empties and the entrance replays. No way was found to keep the screen mounted that leaves Current byte-identical to today (SC-009) without restructuring the accepted notebook layout (T015, graded HIGH).
- **Options:** flatten the notebook into one shell tree shared with Current, rewriting five of `frame`'s structural tests (the implementer's recommendation); lift each screen's own field state into App; FR-010 applies between the three looks, and a move to or from Current keeps the step and the Tonight text until `reveal` (the host's recommendation)
- **Decision:** FR-010 applies between morning, midday and night: that change stays instant (D3) and keeps the screen and everything on it. A move to or from Current keeps the step and the Tonight text, and may empty a screen's own field and replay its entrance, until `reveal` removes Current (FR-032).
- **Why:** The spec's Key Entities define a look as morning, midday or night, with Current "beside" them. Only a tester makes this move, in a development build, and loses at most an address they can type again; the Tonight writing is kept. Reworking the layout the owner accepted, to fix what only testers see, is the wrong trade.
- **Decided by:** drive-skipper (claude-opus-5-5)
- **Confidence:** medium · **Would reverse if:** a page slice gives a screen long-form text of its own while Current still exists, or the owner says a move to or from Current must keep everything
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications), `specs/004-notebook-landscape/slices/looks/tasks.md` (T015), `specs/004-notebook-landscape/slices/looks/quickstart.md` (Not working yet), `src/shell/__tests__/AppLook.test.tsx`
- **Status:** standing
