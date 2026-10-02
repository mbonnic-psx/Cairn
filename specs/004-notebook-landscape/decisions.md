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

## D6 — How does a screen know it is on a notebook page?
- **Stage:** slice gaps · **Slice:** protection-page · **When:** 2026-10-02T06:15:00Z · **Iteration:** 3
- **Question:** A screen gets no new props from the shell, and Current must stay exactly as today, yet each page slice lays its screen out as two pages. How does the screen tell which it is in?
- **Options:** the notebook tells the screens it wraps through React context, Current tells them nothing (recommended); a second notebook copy of each screen; CSS alone over today's markup
- **Decision:** The notebook tells the screens through React context, read with one hook from `src/shell/`. Told, a screen lays itself out as a spread; not told, it renders exactly as today. One component, one set of state.
- **Why:** It is the one reading that keeps both rules the specification states: no new props, and Current unchanged (SC-009). A copy of each screen could drift in words or behaviour (FR-018); CSS alone cannot move today's single card onto two pages.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** a page slice finds a screen whose today's markup cannot be kept element for element beside its spread
- **Written to:** `specs/004-notebook-landscape/contracts/ui-shell.md` (Knowing it is on a page), `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D7 — Does the Protection spread gain content the screen does not show today?
- **Stage:** slice gaps · **Slice:** protection-page · **When:** 2026-10-02T06:15:00Z · **Iteration:** 3
- **Question:** US3 describes the Protection spread with what you are protecting, a way to add an address and margin notes. Today's Protection screen shows none of them.
- **Options:** today's content only: state, words and figures on the left, a waiting change on the right, else a blank ruled page (recommended); bring the list, the address box and the limits onto it, as the canvas shows
- **Decision:** Today's content only. Left page: the state, its words and the two figures. Right page: a waiting change with "Keep things as they are", when there is one; otherwise blank and ruled.
- **Why:** FR-018 keeps every screen word for word and FR-031 says nothing is invented to fill a page; the canvas content is illustration (Assumptions). Moving controls between screens is a change of what Cairn does, which this feature rules out.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner, at the reveal demo, wants the Protection spread to carry the canvas's content
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D8 — Where does the What is protected list go on its spread?
- **Stage:** slice gaps · **Slice:** protection-page · **When:** 2026-10-02T06:15:00Z · **Iteration:** 3
- **Question:** The screen is a heading, a count sentence, notes and a list. How do they sit on two pages?
- **Options:** the heading, sentence and notes on the left, the list on the right ruled like an inventory (recommended); everything on the left, the right blank
- **Decision:** Heading, count sentence, not-confirmed note and the note on taking things out on the left page; the list on the right, ruled, one address a line. A long list scrolls inside the notebook.
- **Why:** US3 asks for "the full list, ruled like an inventory"; a person reads what the list is before reading down it.
- **Decided by:** host (stage recommendation)
- **Confidence:** medium · **Would reverse if:** the owner, at the reveal demo, wants the list on the left page
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D9 — Who settles the notebook's heading outline, and how?
- **Stage:** slice gaps · **Slice:** protection-page · **When:** 2026-10-02T06:15:00Z · **Iteration:** 3
- **Question:** Frame T025: the notebook has no `h1` and the greeting is the first heading. Nobody owns it.
- **Options:** protection-page, the first page slice to land: one visually hidden `h1` "Cairn", greeting not a heading (recommended by T025); each page slice in turn
- **Decision:** `protection-page` settles it as T025 recommends, and writes the rule into the contract.
- **Why:** A screen reader's list of headings should open on Cairn and then the page, not on "Good morning.". One owner, once, before the other page slices build.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner wants the greeting announced as a heading
- **Written to:** `specs/004-notebook-landscape/contracts/ui-shell.md` (Headings), `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D10 — Which page slices run now, and who carries the open tasks?
- **Stage:** ready-set selection · **Slice:** protection-page, setup-pages, quiet-pages, tonight-page · **When:** 2026-10-02T06:15:00Z · **Iteration:** 3
- **Question:** Three page slices are ready and unclaimed. The notebook context (D6) is shared code none of them has yet. Seven carried tasks wait for owners.
- **Options:** `protection-page` alone first, since it lands the context, then the other two together against it (recommended); all three at once, each adding the context
- **Decision:** `protection-page` runs alone this iteration and lands the context and the heading outline. `setup-pages` and `quiet-pages` run together after it merges. `tonight-page` waits for 003's `history-by-site` (parking lot). Carried tasks: frame T025 to `protection-page`; looks T021 (focus on the paper) and T024 (no fades) to `setup-pages` for the setup screens and to `tonight-page` for the check-in; looks T020, T022, T023 (sun band, hilltop stones, tab focus ring) to `quiet-pages`; frame T024 (a real-browser layout check) stays open, since adding a browser runner changes `package.json`, which no slice may write.
- **Why:** A slice whose shared surface is still being decided is worked first, never alongside others (drive, *The contract is settled*). Three slices each writing the same new hook would collide at every merge.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner adopts a browser test runner, which frees frame T024 to ride with a page slice
- **Written to:** `specs/004-notebook-landscape/story-split.md` (Parking lot)
- **Status:** standing

## D11 — Where is the missing waiting change on Protection fixed?
- **Stage:** convergence · **Slice:** protection-page · **When:** 2026-10-02T07:12:00Z · **Iteration:** 3
- **Question:** No screen in the running app shows a waiting change. `App` never asks the core for one (`getPendingChange` has no caller) and never passes `pending` to Protection. Yet What is protected tells the person they can cancel a change "at any time in that day".
- **Options:** (a) leave it, since 004 changes nothing Cairn does (D7); (b) a separate piece of work outside 004, owned by the feature that owns the waiting period, in which `App` asks for the waiting change and passes it to Protection (recommended by the slice delegate); (c) fix it inside 004's `protection-page`
- **Decision:** (b). It is a gap in 002-machine-wide-protection and is fixed there, as an unchecked task appended to `specs/002-machine-wide-protection/tasks.md`: ask the core for the waiting change when protection state is shown, and after any change that protects less or a cancel, and pass it to Protection, in `src/App.tsx` (FR-047c, FR-047e). Its test shows a waiting change and its cancel in the running app's shell. `protection-page` is unaffected: its spread already puts a waiting change on the right page (D7, FR-020).
- **Why:** A person who asked to take something out is told they can call it off, and today cannot find the change or see how long is left. 002 promised both, and Principle III says the screen reports real state, so (a) is out. (c) would change what Cairn does inside 004 and make Current differ from today (SC-009).
- **Decided by:** drive-skipper (claude-opus-5-5)
- **Confidence:** high · **Would reverse if:** a caller elsewhere in the running app already fetches the waiting change and shows it where protection state is shown
- **Written to:** `specs/002-machine-wide-protection/tasks.md` (task appended on the trunk after this slice merges), `specs/004-notebook-landscape/story-split.md` (Parking lot), `specs/004-notebook-landscape/slices/protection-page/plan.md` (Open questions)
- **Status:** standing
