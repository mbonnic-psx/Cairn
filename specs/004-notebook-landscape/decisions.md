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

## D12 — Is "added with its root address" a small label, in the typewriter face?
- **Stage:** after-converge gaps · **Slice:** protection-page · **When:** 2026-10-02T07:25:00Z · **Iteration:** 3
- **Question:** The list's caption beside an address is 14px and set in the serif, while the plan put it in the typewriter face.
- **Options:** a small label, so typewriter (recommended: FR-014 names small labels); reading text, so serif
- **Decision:** A small label: typewriter face, as the plan said.
- **Why:** It is a short note beside an entry, not text read at length; FR-014 and Principle VI put such labels in the typewriter face, and it tells the caption apart from the addresses (T019).
- **Decided by:** host (stage recommendation)
- **Confidence:** medium · **Would reverse if:** the owner, at the reveal demo, reads the caption as part of the list's text
- **Written to:** `specs/004-notebook-landscape/slices/protection-page/tasks.md` (T021)
- **Status:** standing

## D13 — How does the choosing step sit on one spread?
- **Stage:** slice gaps · **Slice:** setup-pages · **When:** 2026-10-02T07:12:00Z · **Iteration:** 4
- **Question:** Choosing what to protect shows two screens, What would you like to protect? and Anywhere else?, and the "Turn protection on" button, one under the other. How do they sit on two pages?
- **Options:** categories on the left page, Anywhere else? and "Turn protection on" on the right page (recommended); everything on the left page, the right blank; the categories across both pages, Anywhere else? below
- **Decision:** What would you like to protect?, its sentence, the categories and the note a change leaves on the left page. Anywhere else?, the address box and what comes back on the right page, with "Turn protection on" at its foot. The step's composition moves into one component of the setup screens that the app renders, so Current renders exactly what it renders today.
- **Why:** Each heading opens its own page, the person reads in the order they do today, and the step ends with its way forward where the eye ends. Nothing is invented and nothing moves between steps (FR-018, FR-031).
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner, at the reveal demo, wants the address box beside the categories on the left page
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications), `specs/004-notebook-landscape/contracts/ui-shell.md` (A step of more than one screen)
- **Status:** standing

## D14 — Where do Before Cairn changes anything's parts and its two buttons go?
- **Stage:** slice gaps · **Slice:** setup-pages · **When:** 2026-10-02T07:12:00Z · **Iteration:** 4
- **Question:** The screen is a heading, a paragraph, what Cairn will change, the background component's paragraph, What this does not cover, the note on administrators, and "Yes, set this up" and "Not yet". Its details may still be loading or could not be read. How do they sit on two pages?
- **Options:** what changes on the left page; the limits, the administrator note and the buttons on the right page, the buttons in the same place in every state (recommended); everything on the left with the buttons, the right blank
- **Decision:** Left page: the heading, the opening paragraph, what Cairn will change and the background component's paragraph. Right page: What this does not cover, the note on administrators, then "Yes, set this up" and "Not yet" at its foot. Without the details, the left page holds the heading and the paragraph and the right page holds only the two buttons, in the same place.
- **Why:** Cairn discloses before it asks (Principle III, FR-016 of 002): the person reaches the yes only after reading what Cairn does not cover. The buttons never move as the details arrive.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner, at the reveal demo, wants the buttons under what Cairn will change
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D15 — Do the setup controls' edges stay visible on the paper?
- **Stage:** slice gaps · **Slice:** setup-pages · **When:** 2026-10-02T07:12:00Z · **Iteration:** 4
- **Question:** The address box's edge and the checkboxes were drawn for a white card. On the notebook's paper, in night's lamp-lit look most of all, nothing holds them visible. FR-022 covers focus only.
- **Options:** every control's edge on the paper at least 3:1 against the paper in every look, the floor D4 used for graphics (recommended); leave it to the owner's eye at the demo
- **Decision:** The edge of every control the setup screens draw on the paper — the address box and each checkbox — meets at least 3:1 against the paper in every look, held by a test.
- **Why:** A person who cannot find the address box cannot add the site that brought them here. 3:1 is the WCAG floor for what identifies a control, and the floor this feature already holds the mark to.
- **Decided by:** host (stage recommendation)
- **Confidence:** medium · **Would reverse if:** the owner, at the reveal demo, wants the address box drawn as a bare line on the page
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D16 — How is This machine is as it was seen in each look before it is reachable?
- **Stage:** slice gaps · **Slice:** quiet-pages · **When:** 2026-10-02T07:12:00Z · **Iteration:** 4
- **Question:** Teardown is restyled now but not reachable from the app (Assumptions), so no demo can open it.
- **Options:** tests render it inside the notebook in each look and both outcomes, and the demo names it under Not working yet (recommended: protection-page did this for the waiting change); a development-only way to open it; leave it unseen
- **Decision:** Tests render This machine is as it was inside the notebook in morning, midday and night, both as it was and almost everything undone. The demo lists it under Not working yet: not reachable from the app until teardown is wired in.
- **Why:** The spread is proved in every look without adding a way into the app that Cairn does not have, which would change what Cairn does (FR-018).
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** teardown is wired into the app before this slice merges
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D17 — Are "not confirmed" and waiting sentences on the setup pages amber?
- **Stage:** convergence · **Slice:** setup-pages · **When:** 2026-10-02T08:11:00Z · **Iteration:** 4
- **Question:** After an address is added and the read-back is not confirmed, "Added to your list, though Cairn has not confirmed it is in force just now: …" is moss, the colour of "Protected: …". The note beside the categories, which carries a waiting untick, is quiet ink. FR-016 says "not confirmed" and "waiting" keep their warm amber meaning (T021, T023).
- **Options:** keep today's colours on the page; on the page only, amber for not confirmed, off and waiting, moss for in force, Current unchanged (recommended by converge); change Current as well
- **Decision:** On the notebook page only: the added sentence is amber when the read-back is not confirmed or protection is off, moss when it is in force; the note beside the categories is amber. Current keeps today's colours until `reveal`.
- **Why:** A person who added a site must not read "not confirmed" in the colour of "Protected". FR-016 asks for amber in the notebook, and Current must stay as it is (SC-009).
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner, at the reveal demo, wants "off" kept apart from "not confirmed" in colour
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications), `specs/004-notebook-landscape/slices/setup-pages/tasks.md` (T027)
- **Status:** standing

## D18 — What does "the same place" mean for Before Cairn changes anything's buttons?
- **Stage:** convergence · **Slice:** setup-pages · **When:** 2026-10-02T08:11:00Z · **Iteration:** 4
- **Question:** D14 says the buttons never move as the details arrive. At 1280×800 they hold still; at 800×600 the details push them further down the right page (T022).
- **Options:** the buttons sit at the foot of the right page in every state, below whatever it holds (recommended); reserve the details' height while they load
- **Decision:** The buttons sit at the foot of the right page in every state, after What this does not cover and the note on administrators. In a small window they move down as the details arrive.
- **Why:** What D14 protects is that the yes comes after the limits. Reserving empty space for text that may never arrive would leave a blank gap on a screen that should read plainly.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner, at the reveal demo, finds the buttons moving under their pointer
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D19 — Who makes a spread with no control scrollable from the keyboard?
- **Stage:** after-converge gaps · **Slice:** quiet-pages · **When:** 2026-10-02T08:11:00Z · **Iteration:** 4
- **Question:** A keyboard-only person may be unable to scroll a spread with no control on it (What Cairn covers) in the macOS and Linux webview, because the scrolling page area is the shell's and is not in the tab order there. Chromium puts it in the order; WebKit is untested. It touches every spread, protection-page's too.
- **Options:** one small shell task before `reveal`, owned by the host and landed on main between slices (recommended by the slice); each page slice adds its own focus target; leave it
- **Decision:** A shell task before `reveal`: the notebook's page area can be reached and scrolled from the keyboard in every webview, held by a test. It is recorded in the split's parking lot and lands on main as host work before `reveal` starts.
- **Why:** FR-022 and FR-025 promise every part of every page is reachable by keyboard; one fix in the shell covers every spread at once, and a page slice may not edit the shell.
- **Decided by:** host (stage recommendation)
- **Confidence:** medium · **Would reverse if:** a run in WebKit shows the page area already scrolls from the keyboard
- **Written to:** `specs/004-notebook-landscape/story-split.md` (Parking lot)
- **Status:** standing

## D20 — May a person confirm Before Cairn changes anything without seeing What this does not cover?
- **Stage:** after-converge gaps · **Slice:** setup-pages · **When:** 2026-10-02T08:16:00Z · **Iteration:** 4
- **Question:** setup-pages T026. While the disclosure's details have not arrived, or could not be read, the screen still shows its heading, the paragraph saying Cairn affects everyone who uses this machine, and "Yes, set this up". A person can confirm without ever seeing What this does not cover or the note on administrators. This is how `src/screens/Disclosure.tsx` behaves today, in both layouts. 004 does not change it, and the disclosure belongs to 002.
- **Options:** (a) leave it as today; (b) a task in 002, like D11: the disclosure offers "Yes, set this up" only once its details are shown, and says plainly when they could not be read, with a way to try again; fixed in 002, so Current and the notebook both get it; (c) fix it inside 004's setup-pages. No stage recommendation beyond "the owner's call for 002".
- **Decision:** (b). A new unchecked task in `specs/002-machine-wide-protection/tasks.md`: until the details are shown, the screen does not offer "Yes, set this up"; if they could not be read, it says so plainly and offers "Try again" beside "Not yet", in both layouts. setup-pages ships the screen as it is today (FR-018), and D14 stands for 004 until the 002 task lands.
- **Why:** For someone in recovery, saying yes to a wall without being told where its gaps are is what Principle III exists to prevent: an operation affecting other accounts is disclosed in plain language before the first write, with an explicit confirmation, and 002's FR-016–FR-018 say the disclosure carries what is not covered and that an administrator can defeat Cairn. A yes before those are on screen is not that confirmation, so (a) is out. (c) would change what Cairn does inside 004 and make Current differ from today (FR-018, SC-009), as D11 found. "Not yet" stays in every state, and nothing asks the person to type or solve anything (Principle V).
- **Decided by:** drive-skipper (claude-opus-5-5)
- **Confidence:** high · **Would reverse if:** every path to the first system change already shows What this does not cover and the note on administrators before the yes, somewhere other than this screen
- **Written to:** `specs/002-machine-wide-protection/tasks.md` (task appended on the trunk after this slice merges), `specs/004-notebook-landscape/slices/setup-pages/tasks.md` (T026), `specs/004-notebook-landscape/story-split.md` (Parking lot)
- **Status:** standing

## D21 — Does `tonight-page` lay out 003's Over time view as a notebook spread too?
- **Stage:** slice gaps · **Slice:** tonight-page · **When:** 2026-10-02T10:02:00Z · **Iteration:** 5
- **Question:** 003's `history-by-site` (PR #29, accepted 2026-10-01) put a "Which days" pair (Today / Over time) at the top of the Today screen, and an Over time view under it: a heading naming the range in words, From and To date boxes, a coverage note, an estimates-excluded line, the sites with counts and soft bars, "Nothing here for these days.", a could-not-read sentence, a sealed sentence and "Cairn counts only while it is running…" at the foot. 004's Assumptions call Over time "not yet built … out of scope". It is now built, inside the screen `tonight-page` lays out. Does `tonight-page` carry it?
- **Options:** (a) yes: `tonight-page` lays out Over time and the Which days buttons as part of the Today screen (recommended by the host); (b) no: only the Today view, and Over time stays a single column on the paper, unstyled at the reveal; (c) a separate slice for Over time before `reveal`
- **Decision:** (a). The Today screen's spread includes both views and the Which days buttons, word for word, in every state the view has today: looking, could not read, sealed, nothing here, the list, the coverage note and the estimates line. The buttons stay in the same place on the spread in both views. The bars stay warm (FR-016). Current keeps the screen exactly as it is on main after #29 (SC-009). "One day" is still not built and stays out of scope. 004's Assumptions drop Over time from the not-yet-built list. Layout: D22.
- **Why:** A person who opens Today in the notebook and presses "Over time" should still be in the notebook. Shipping a page in the old style inside a new spread is the "half a screen" the split promises no slice leaves. FR-018 names Today as a screen to lay out with every control and state it has, and Over time is now part of it. The Assumption was written so screens adopt the style when they exist, and this one does. (b) would let the reveal ship an unstyled page. (c) would put two slices on the same screen file, and they would collide at merge, as D10 warned.
- **Decided by:** drive-skipper (claude-opus-5-5)
- **Confidence:** high · **Would reverse if:** #29 does not reach main before `tonight-page` is planned, or the owner pulls Over time out of the Today screen
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications, Assumptions), `specs/004-notebook-landscape/story-split.md` (row 4)
- **Status:** standing

## D22 — How do the Today screen's parts sit on a notebook spread, in each of its states?
- **Stage:** slice gaps · **Slice:** tonight-page · **When:** 2026-10-02T10:03:00Z · **Iteration:** 5
- **Question:** The Today screen has the Which days buttons, the Today view (heading, the typed log or "Nothing here for today.", the coverage note at its foot; "Looking…"; a sealed day) and the Over time view (heading naming the range, From/To, coverage note, estimates line, the sites with counts and soft bars or "Nothing here for these days.", "Looking…", could-not-read, sealed, and "Cairn counts only while it is running. This is what it saw over these days." at its foot). How do they sit on two pages, in each state?
- **Options:** (a) like What is protected (D8): Which days, the heading and the notes on the left page, the log or list on the right page, ruled, "Nothing here…" where the list would be; loading, sealed and could-not-read on the left page only, the right page blank and ruled (recommended); (b) everything on the left page, the right page blank and ruled, in every state; (c) something else
- **Decision:** (a), made exact:
  1. Today, with a log: the left page holds the Which days buttons at the top (small, typewriter face), then "Today", then the coverage note, the last thing on the left page, set off by its rule. The right page holds the typed log, ruled, one reach a line: the site, then its time. A long log scrolls inside the notebook (FR-025).
  2. Today, nothing yet today: the left page as in 1. "Nothing here for today." sits at the top of the right page, where the log would begin.
  3. Today, sealed: the left page holds Which days, "Today" and the sealed sentence. The right page is blank and ruled.
  4. Today, loading: the left page holds Which days and "Looking…", with no heading, exactly as the screen does now. The right page is blank and ruled.
  5. Over time: the left page holds Which days, the heading naming the range, From and To, then the coverage note, the estimates line and "Cairn counts only while it is running. This is what it saw over these days.", the last set off by its rule. The right page holds the sites, ruled, one site a line, each with its count and soft bar, or "Nothing here for these days." at its top.
  6. Over time loading, could-not-read and sealed: the left page holds Which days, the heading, From and To, then that one sentence where the notes would be. The right page is blank and ruled. The date boxes stay where they are in every state.
  7. Control edges: D15's floor covers this screen. The edges of the From and To boxes, and whatever shows which Which days button is pressed, meet at least 3:1 against the paper in every look, each held by a test.
  8. Current renders exactly what it renders now (D6, SC-009).
- **Why:** A typed log down a ruled page is how US3 describes Today, and it is how What is protected already sits (D8): the person reads what the log is and what Cairn could see before reading down it. Kept as the last thing on the left page, the coverage sentence reads as the honest caveat (Principle III), not a second heading. In states with no list, nothing is invented to fill the right page (FR-031). Nothing is added and no words change (FR-018). A person who cannot find the date boxes on night's paper cannot look back over their weeks (D15, WCAG 1.4.11). The owner brief's actor, priorities and taste are placeholders, so this is decided from the specification, the constitution and D6–D8, D13–D15, D17.
- **Decided by:** drive-skipper (claude-opus-5-5)
- **Confidence:** medium · **Would reverse if:** the owner, at the reveal demo, wants the coverage note back under the log, in today's reading order
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D23 — How do Tonight's parts sit on its spread, in each state?
- **Stage:** slice gaps · **Slice:** tonight-page · **When:** 2026-10-02T10:10:00Z · **Iteration:** 5
- **Question:** The check-in is a heading, the quote, today's reaches (or "Nothing here for today."), the coverage note, "How the day went" with its writing space, "Keep this", the save's status sentence and "Hide quotes"/"Show quotes". It also has a sealed day, a load that has not arrived or could not be made, and a day that ended while it was open. Where does each go on two pages?
- **Options:** as US3 says: today's reaches on the left page, the quote and a lined journal page on the right with "Keep this" (recommended, the specification's own words); everything on the left page
- **Decision:** Left page: the heading ("Tonight", or the date once the day has ended), today's reaches as a typed log with times, or "Nothing here for …", and the coverage note under them. Right page: the quote, then "How the day went" and the writing space as a lined page in the serif, "Keep this", the status sentence, and the quotes switch at the foot. A sealed day: the heading and the sealed sentence on the left; the quote, the status sentence and the switch on the right, where they sit on an open day. While the day is loading, or could not be read: "Looking…" or the reason on the left page, the right page blank and ruled (FR-031). The status sentence stays one polite live region in every state.
- **Why:** US3 names this layout ("today's reaches on the left page; the quote and a lined journal page on the right, with Keep this"), and FR-019 asks the journal to read as a lined notebook page. Putting the switch and the status in the same place on a sealed day keeps the page from moving under someone who comes back to it.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner, at the reveal demo, wants the quote above the reaches on the left page
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D24 — What holds the lined journal page readable and usable?
- **Stage:** slice gaps · **Slice:** tonight-page · **When:** 2026-10-02T10:10:00Z · **Iteration:** 5
- **Question:** A lined writing space can drift: lines that stay still while the text scrolls, lines that cut through letters, an edge that vanishes on night's paper, a focus ring lost on the lines. Nothing in the spec says which of these must hold.
- **Options:** the ruled lines sit under each line of text and move with it as it scrolls, the writing space's edge meets 3:1 against the paper in every look (D15), focus stays visible on it in every look (looks T021, carried by D10), nothing fades (looks T024), and under forced colours the lines may drop while the edge and text stay (recommended); leave it to the owner's eye at the demo
- **Decision:** All of the first option, held by tests where a test can see it (the edge's contrast, the focus ring, no transition, the line spacing matching the text's line height) and shown in the demo in every look at 1280×800 and 800×600.
- **Why:** The writing is the point of the check-in. A person who cannot find where to write, or whose words sit between the lines, is pushed away from the one thing the evening is for.
- **Decided by:** host (standing decision D15)
- **Confidence:** medium · **Would reverse if:** the owner, at the reveal demo, wants the writing space drawn as bare lines with no edge
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D25 — Is "How the day went" a small label in the typewriter face, or the writing's heading in the serif?
- **Stage:** after-converge gaps · **Slice:** tonight-page · **When:** 2026-10-02T11:40:00Z · **Iteration:** 5
- **Question:** "How the day went" is the label of the writing space, set in the serif at 20px on the page, as Current sets it. FR-014 and US3 scenario 3 put small labels in the typewriter face; D12 made a 14px label one.
- **Options:** (a) keep the serif: it reads as the prompt that opens the journal page, at the size of a subheading, and Principle VI keeps the serif for reflective writing (recommended by the gaps review and the slice); (b) the typewriter face, like From and To
- **Decision:** (a). It stays in the serif, as on the page today.
- **Why:** It opens the writing, not a control's name: the person reads it as the question the evening asks, and FR-014 sets reflective writing in the serif. D12 was a small note beside a control; this is the page's prompt.
- **Decided by:** host (stage recommendation)
- **Confidence:** medium · **Would reverse if:** the owner, at the reveal demo, reads it as a small label and wants the typewriter face
- **Written to:** `specs/004-notebook-landscape/slices/tonight-page/plan.md` (Open questions)
- **Status:** standing

## D26 — What becomes of what the completion audit found the pages promise but no test holds?
- **Stage:** completion audit · **Slice:** loose-ends · **When:** 2026-10-02T12:15:00Z · **Iteration:** 6
- **Question:** Three audits over 004 found no criterion unbuilt, and these held by nothing: the release bundle is never searched for the look switch (SC-002); What is protected's left page scrolls on its own with no tab stop (FR-022, FR-025); "Yes, set this up" is never pressed on the page (setup-pages T024); the setup and Protection buttons lose their edge in forced colours (setup-pages T025); the shared button still fades its colours on a change of look (looks T024, D3); the focus and contrast guards read only the base rule (quiet-pages T013); nothing pins the platform's own window frame (FR-007).
- **Options:** (a) one slice, `loose-ends`, before `reveal`, carrying all seven as tasks (recommended by the audits); (b) leave them as open tasks in the slices that merged; (c) out of scope
- **Decision:** (a). Slice 8, `loose-ends`, depends on protection-page, setup-pages and quiet-pages, and `reveal` waits on it.
- **Why:** The owner's reveal demo should judge pages whose promises are held, not ones a stylesheet change could quietly break; the slices that owned these have merged, so without one owner nobody carries them.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner would rather see the reveal demo first and take these after
- **Written to:** `specs/004-notebook-landscape/story-split.md` (slice 8, graph), `specs/004-notebook-landscape/cruise-report.md`
- **Status:** standing

## D27 — Does this run choose a browser test runner so the real layout at 800×600 is held?
- **Stage:** completion audit · **Slice:** frame · **When:** 2026-10-02T12:15:00Z · **Iteration:** 6
- **Question:** All three audits name frame T024: nothing renders the notebook in a real browser, so the tabs, greeting and spreads at 800×600 (FR-025, FR-029) rest on text-match tests and demo screenshots. A runner (Vitest Browser Mode or Playwright) is a new dependency in `package.json`.
- **Options:** (a) leave T024 open for the owner to choose a runner, said in the report (recommended: D10 left it so); (b) choose one here; (c) withdraw T024
- **Decision:** (a). T024 stays open; the cruise report asks the owner to choose.
- **Why:** A new dependency is the owner's to choose (D10), and the build graph is held to no network capability; the reveal demo at 800×600 is the person's own check meanwhile.
- **Decided by:** host (standing decision D10)
- **Confidence:** high · **Would reverse if:** the owner names a runner
- **Written to:** `specs/004-notebook-landscape/story-split.md` (Parking lot), `specs/004-notebook-landscape/cruise-report.md`
- **Status:** standing

## D28 — Does 004 announce Tonight's loading and could-not-be-read sentences?
- **Stage:** completion audit · **Slice:** tonight-page · **When:** 2026-10-02T12:15:00Z · **Iteration:** 6
- **Question:** D23 asks for one polite live region in every state, but Tonight's loading and load-failure sentences sit in none, on the page and in Current alike, and a test holds "nothing announced".
- **Options:** (a) hand it to 003's check-in as a task, since announcing them changes Current (recommended by the audit); (b) announce them on the page only; (c) read D23 as open and sealed days only
- **Decision:** (a). 003 task T080.
- **Why:** A person using a screen reader should hear that the evening could not be opened, in either interface; 004 may not change what Current does (SC-009), and the page matches Current today, so FR-018 holds.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner reads D23 as open and sealed days only
- **Written to:** `specs/003-reflection-and-history/tasks.md` (T080)
- **Status:** standing

## D29 — What does SC-002's "search of the released interface" search?
- **Stage:** slice gaps · **Slice:** loose-ends · **When:** 2026-10-02T12:22:00Z · **Iteration:** 7
- **Question:** SC-002 says a search of the released interface finds no control, label or announcement for the look switch. Today only a comment and `import.meta.env.DEV` stand behind it; nothing searches what ships.
- **Options:** a test that makes a production build of the interface itself and searches every file it emits for the switch's words, its choices as the switch names them and its accessible name (recommended); a new check script run by CI; leave it to the guard on `import.meta.env.DEV`
- **Decision:** A test that builds the interface in production mode into a scratch directory and searches every emitted file. None of the switch's words, choices or accessible name may appear. The test proves it has teeth by finding them in a development build.
- **Why:** A person using a released Cairn must never meet a testing control. A test lives in the tree the slice owns; a new CI check would change the gate, which no slice may do.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** a production build inside the test suite proves too slow for `npm test`, and the owner prefers a CI step
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D30 — How does a keyboard reach What is protected's left page?
- **Stage:** slice gaps · **Slice:** loose-ends · **When:** 2026-10-02T12:22:00Z · **Iteration:** 7
- **Question:** The left page of What is protected stays put while the list scrolls, and scrolls inside itself when it is long (`protection-page.css`, `.nb-trail-sticky`). With no control on it, a keyboard cannot scroll it in every webview.
- **Options:** on the page only, make the left page a tab stop of its own, named, with the page area's focus ring (D19) (recommended); let it grow and drop its own scroll, which loses the sticky leaf D8 chose; leave it
- **Decision:** On the page only, the left page is a tab stop with a name and the page area's focus ring, so the arrow keys scroll it. Current is unchanged.
- **Why:** FR-022 and FR-025 promise every part of every page by keyboard. A person reading the note on taking things out must be able to reach all of it. This is the same answer D19 gave the page area.
- **Decided by:** host (standing decision D19)
- **Confidence:** high · **Would reverse if:** the owner, at the reveal demo, wants the left page to scroll with the list
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D31 — What pins "each platform's own window frame MUST be kept"?
- **Stage:** slice gaps · **Slice:** loose-ends · **When:** 2026-10-02T12:22:00Z · **Iteration:** 7
- **Question:** FR-007 keeps the platform's own frame. Nothing holds it: a later change could turn decorations off and draw a frame of Cairn's own.
- **Options:** a test over the window configuration and the interface code: decorations not turned off, no title bar overlay, no transparent window, and no call that turns decorations off at run time (recommended); a Rust test over the same file; leave it
- **Decision:** A test over `tauri.conf.json`'s windows and a search of the interface code for a run-time call that turns decorations off.
- **Why:** The person's own close, minimise and move controls are where they expect them on their platform. One file says so, and a test over it is the cheapest pin.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** a later feature chooses a frame of Cairn's own and the owner accepts it
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications)
- **Status:** standing

## D32 — Does the run merge 003's `history-by-site` (#29) and then start `tonight-page`?
- **Stage:** ready-set selection · **Slice:** tonight-page · **When:** 2026-10-02T15:12:00Z · **Iteration:** 7
- **Question:** The owner's message, queued 2026-10-02: "yes, merge PR #29 (003 history-by-site) yourself — the owner accepted that slice in its demo. Then start tonight-page."
- **Options:** merge #29, then run `tonight-page` (the owner's answer)
- **Decision:** Yes, as the owner said. Both had already happened when the message reached the run: #29 merged at 2026-10-02T09:28Z, and `tonight-page` merged as #38 at 11:41Z (D21). Nothing more to do.
- **Why:** The owner accepted `history-by-site` in its own demo, and `tonight-page` was waiting only for it (story split, Parking lot).
- **Decided by:** human
- **Confidence:** high · **Would reverse if:** the owner asks for #29 to be reverted
- **Written to:** `specs/004-notebook-landscape/slices/README.md` (tonight-page row)
- **Status:** standing

## D33 — Does the run build the fold and a notebook that widens on a large window before the reveal?
- **Stage:** split · **Slice:** fold-and-width · **When:** 2026-10-02T16:05:00Z · **Iteration:** 8
- **Question:** The owner's message, after their own demo of all three looks, 2026-10-02: "It looks great." Two changes before the reveal, as a small slice of their own: (1) the fold, the line between the two pages the canvas draws (`border-right: 1px solid #e3d6bf`, `#dccdb1` at night), dropped by frame converge pass 1 (T020), back as a look token in every look, drawn once by the shell, on every screen; (2) on a full-screen window the notebook goes tall instead of wide; it must widen with the window and stay landscape like the G boards (830×680), never taller than wide, with each page's reading measure kept comfortable. Check 1280×800, 1920×1080, 2560×1440 and 800×600 in all three looks, the tabs and greeting placed as now. Then park on `reveal` again (D1 stands).
- **Options:** slice 9, `fold-and-width`, depending on `loose-ends`, with `reveal` waiting on it (the owner's answer)
- **Decision:** As the owner said. Slice 9, `fold-and-width`, runs now; `reveal` depends on it and stays the owner's (D1).
- **Why:** These are what the owner will judge at the reveal demo; the fold is the canvas's, and a notebook that turns portrait on a large screen is not the landscape notebook they chose.
- **Decided by:** human
- **Confidence:** high · **Would reverse if:** the owner withdraws either change
- **Written to:** `specs/004-notebook-landscape/story-split.md` (slice 9, graph), `specs/004-notebook-landscape/spec.md` (FR-034, FR-035)
- **Status:** standing

## D34 — Does the fold have to meet 3:1 against the paper?
- **Stage:** slice gaps · **Slice:** fold-and-width · **When:** 2026-10-02T16:12:00Z · **Iteration:** 8
- **Question:** The owner asked that the fold "meet non-text contrast where the constitution asks". The canvas's fold is 1.28:1 on the morning and midday paper and 1.27:1 on night's. A 3:1 fold would be a dark brown line (about `#958268`).
- **Options:** the canvas's colours, held visibly apart from the paper (at least 1.2:1, more than the ruled lines' 1.16:1) and drawn in a system colour under forced colours (recommended); 3:1 like the mark (D4) and the control edges (D15)
- **Decision:** The canvas's colours. A test holds each look's fold at least 1.2:1 against its paper, and under forced colours the fold is drawn in a system colour, so it stays visible there.
- **Why:** The constitution sets no contrast floor, and the specification's floors cover text (FR-021), the mark that tells the person this is Cairn (FR-033) and what identifies a control (D15). The fold is neither: each page reads on its own and the pages already sit apart, so WCAG 1.4.11 does not ask it of a decorative line. A 3:1 fold would be a heavy rule down the middle of a page the owner has just said looks great.
- **Decided by:** host (stage recommendation)
- **Confidence:** medium · **Would reverse if:** the owner, at the reveal demo, wants the fold darker, or reads it as something a person needs to tell the pages apart
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications, FR-034)
- **Status:** standing
- **Note, 2026-10-02 (after-converge gaps):** "more than the ruled lines' 1.16:1" holds for morning only. On midday and night the fold is the ruled lines' own colour (`--nb-fold` = `--nb-rule`), as on the canvas, so on a blank ruled page only its direction sets it apart. A line for the owner's reveal demo.

## D35 — How wide may the notebook grow, and what happens past that?
- **Stage:** slice gaps · **Slice:** fold-and-width · **When:** 2026-10-02T16:20:00Z · **Iteration:** 8
- **Question:** The notebook must grow with the window and stay landscape at the canvas's proportion (830×680, about 1.22 wide to 1 tall), never taller than wide. The owner said: "cap the width where lines would grow too long, and centre it on the scene." What is the cap, and what happens above it? Should the notebook also centre top to bottom above the cap?
- **Options:** (a) cap at 1200 wide (about 982 tall), each page's text about 522px, roughly 65–75 characters a line; above the cap the notebook stays 1200 wide and is centred side to side with the greeting beside it, and the top and the greeting stay where they are now (recommended by the host); (b) cap at 1100 (about 472px a page, 60–65 characters); (c) cap at 1360 (about 602px a page, more than 80 characters); (d) no cap, only the proportion. Below the cap, under every option, the width is the smaller of the room left beside the greeting and (window height − 120px) × 830/680. On centring top to bottom, the host recommends no.
- **Decision:** (a). The notebook stops growing at 1200 by 982 px (830:680). Below the cap the width is the smaller of the room beside the greeting and (window height − 120px) × 830/680. The height always follows from the width, so the notebook is never taller than wide. At 1280×800 that gives exactly 830×680, as today. Above the cap, the greeting, the notebook and the tabs stay together as one group, the same spacing as at 1280. The group is centred side to side, and the sky widens equally on both sides. The paper is not centred on its own: at the first window that reaches the cap (1650 wide), centring the paper alone would push the greeting over the notebook. The notebook does not centre top to bottom. Its top stays 70px down, the greeting keeps its place over the sky, and the extra height goes to the landscape below.
- **Why:** At the body serif's 16.5px, a 522px page holds about 66 characters a line. That is the upper end of a comfortable line, so a person reading a check-in or the covered list on a large screen reads at the measure the canvas was drawn for. 1100 would cap the notebook on an ordinary 1080p screen, where it fits about 1170 wide, for no gain in reading. 1360 runs past 75 characters, where the eye loses its place on the way back to the next line. No cap breaks the owner's own words. Centring the whole group keeps the composition the owner accepted at 1280 and stops the greeting jumping when the cap is reached. Leaving the top alone follows the owner ("keep the tabs and the greeting placed as now") and keeps the greeting on the sky that the contrast guards (FR-021, SC-003) measure it against. The brief's Taste and Priorities sections are placeholders, so this is decided from the spec's edge case "A very large window", the constitution's "generous whitespace", and the owner's message.
- **Decided by:** drive-skipper (claude-opus-5-5[1m])
- **Confidence:** high · **Would reverse if:** in the slice's demo on a large screen, the owner says the 1200 notebook looks small in the scene or the lines read long. The cap then moves; the rule stays the same.
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications, FR-035)
- **Status:** overridden by D37
- **Note, 2026-10-02:** first overridden by D36 (the width below the cap), then wholly by D37.
- **Note:** D36 overrides only the width rule below the cap; the 1200×983 cap and the centring stand. D34's answer was recommended by its own question's options and answered outright by the constitution and the specification.
- **Note, 2026-10-02 (converge T009):** the cap's height is 1200 × 680/830 = 983, not 982; FR-035 and the tests say 983.

## D36 — Does keeping the proportion ever make the notebook narrower than today?
- **Stage:** slice gaps · **Slice:** fold-and-width · **When:** 2026-10-02T16:24:00Z · **Iteration:** 8
- **Question:** D35's width rule, the smaller of the room and (window height − 120px) × 830/680, makes small windows narrower than today. At 1100×600 (greeting beside) the notebook would go from 650 to 586 wide. In the narrow layout at 800×600 it would go from about 720 to less. How does the proportion apply in a small or short window?
- **Options:** (a) the proportion only limits the height and never narrows the width: width = the smaller of the room beside or under the greeting and 1200px; height = the smaller of the room left and width × 680/830; a short wide window such as 1920×800 gets a 1200×680 notebook (recommended by the host); (b) keep D35 for the side-by-side layout and use (a) only in the narrow layout; (c) keep the fixed proportion everywhere and accept narrower pages
- **Decision:** A fourth reading, close to (a): the window's height can widen the notebook but never narrow it. Width = the smallest of: the room beside or under the greeting; 1200px; and the larger of today's width and (window height − 120px) × 830/680. Today's width is the smaller of the room and 830 when the greeting sits beside the notebook, and the full room when it sits above. Height = the smaller of the room left and width × 680/830. So 1280×800 gives 830×680 and 1100×600 gives 650×480, both as today; 800×600 is as wide as today; 1920×800 gives 830×680, the canvas's own shape; 1920×1080 gives 1172×960; 2560×1440 gives 1200×982; and a tall, narrow window no longer stretches the notebook upright — the extra height goes to the landscape.
- **Why:** The owner asked for the notebook to grow with the window, stay landscape and keep the canvas's shape. A slice that grows the notebook must not shrink anyone's pages: at 800×600 a fixed shape would leave about 28 characters a line, which rules out (b) and (c). (a) also avoids shrinking, but in a short wide window it stretches the notebook into a long, low band (about 1.76 to 1) where today's 830×680 already fits, giving up the shape for nothing. This rule matches D35 wherever the notebook grows, and matches today wherever it would otherwise shrink. Decided from the spec's "A small window" and "A very large window" edge cases, FR-025 and the owner's message, since the brief's Taste section is a placeholder.
- **Decided by:** drive-skipper (claude-opus-5-5[1m])
- **Confidence:** medium · **Would reverse if:** in the demo, the owner wants a short wide window (such as 1920×800) to widen the notebook too. That is option (a).
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications, FR-035)
- **Status:** overridden by D37
- **Note, 2026-10-02 (D37):** overridden where the greeting sits beside the notebook; the rule stands in the narrow layout.
- **Note, 2026-10-02 (converge T009):** the cap's height is 1200 × 680/830 = 983, not 982; FR-035 and the tests say 983.

## D37 — Does the run scale the whole composition to the window, as the G board, before the reveal?
- **Stage:** split · **Slice:** board-scale · **When:** 2026-10-02T20:30:00Z · **Iteration:** 10
- **Question:** The owner's message, after their own demo of fold-and-width, 2026-10-02: "It looks better. We need to scale the notebook to fill a lot more of the page, and the Good Morning needs to be moved over to the left and scale up." With the canvas board G-Morning at 1280×800 as "the scale of how I would want the app to look in full screen mode". At any landscape window size the composition is the board scaled to the window: the notebook's left edge at 350/1280 of the width, its top at 70/800 of the height, 830/1280 wide and 680/800 tall, the tabs about 44px past its right edge at 1280, scaled; the greeting hard left in the sky at 56/1280 from the left and about 88/800 from the top, a column about 250/1280 wide, "Good morning." 40px at 1280×800 and growing with the window (about 60px at 1920×1080), the time line and the sentence under it growing with it; the sun, hills and cairn keeping their places relative to the window; type and spacing inside the notebook scaling with it, never below today's sizes, growth capped so a page's line stays comfortable. The 800×600 minimum and the narrow layout under 1100px stay as now. A small slice of its own before the reveal; park on `reveal` afterwards (D1 stands). It supersedes the width rule from fold-and-width where they conflict.
- **Options:** slice 10, `board-scale`, depending on `fold-and-width`, with `reveal` waiting on it (the owner's answer)
- **Decision:** As the owner said. Slice 10, `board-scale`, runs now; `reveal` depends on it and stays the owner's (D1). FR-036 states the composition; FR-035's width rule, its 1200px cap and the centring of the group above it (D35, D36) give way to it wherever the greeting sits beside the notebook. FR-035's "never taller than it is wide" and the narrow layout stand.
- **Why:** At 1920×1080 and above the fold-and-width notebook still sits small in the window, with the greeting tucked beside it; the owner chose the board's composition, and wants that composition at every size, larger, not a fixed notebook in a bigger window.
- **Decided by:** human
- **Confidence:** high · **Would reverse if:** the owner withdraws the change
- **Written to:** `specs/004-notebook-landscape/story-split.md` (slice 10, graph), `specs/004-notebook-landscape/spec.md` (FR-035, FR-036)
- **Status:** standing

## D38 — How does the composition hold in a window whose shape is not the board's?
- **Stage:** slice gaps · **Slice:** board-scale · **When:** 2026-10-02T20:40:00Z · **Iteration:** 10
- **Question:** FR-036 (the owner's numbers, D37) puts the notebook at 64.8% of the window's width and 85% of its height, measured on the 1280×800 board. In a window of another shape, that gives a notebook of another shape: 1920×1080 gives 1244×918 (1.36:1); 2560×1080 gives 1659×918 (1.81:1), a long band; 1280×1024 gives 830×870, taller than wide, which FR-035 still forbids. How does the composition hold where the greeting sits beside the notebook?
- **Options:** (a) each measure on its own axis, the height the smaller of 85% of the window's height and width × 680/830, the rest to the landscape (recommended by the host); (b) scale the whole board by min(W/1280, H/800) and centre it; (c) (a), plus a limit so the notebook is never wider than 1.5 times its height, the rest open sky to its right
- **Decision:** (c). Left edge 27.3% of the width, top 8.75% of the height. Width = the smaller of 64.8% of the window's width and 1.5 × the height. Height = the smaller of 85% of the window's height and width × 680/830. The tabs hang off the notebook's right edge wherever it is; the greeting, sun, hills and cairn keep their places relative to the window. 1280×800 gives 830×680 at (350, 70), the board exactly; 1920×1080 gives 1245×918; 2560×1440 gives 1660×1224; 1100×700 gives 713×584; 1280×1024 gives 830×680, landscape, the extra height to the landscape; 2560×1080 gives 1377×918. Only windows more than about 1.97 times as wide as tall meet the limit. 800×600 and the narrow layout are untouched.
- **Why:** The owner chose the notebook for its shape (D33), and D36 already turned down a 1.76:1 band. (c) keeps the owner's numbers on every window they named and every ordinary screen, and limits only far-from-board shapes, where (a) grows without bound into a strip of mostly empty paper. (b) is ruled out by FR-036, which measures every place against the window, and by the owner's "moved over to the left". Decided from FR-035, FR-036, D33, D36, D37 and the constitution's "generous whitespace", since the brief's Taste and Priorities sections are placeholders.
- **Decided by:** drive-skipper (claude-opus-5-5[1m])
- **Confidence:** medium · **Would reverse if:** the owner, at the demo, wants an ultrawide window to widen the notebook too. That is (a): drop the 1.5 limit.
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications, FR-036)
- **Status:** standing
- **Note:** at 1920×1080 the notebook is 918px tall, a little less than fold-and-width's 960. The owner's 85% sets that; type inside never gets smaller (D39). A line for the demo.

## D39 — How much do type and spacing inside the notebook grow, and what caps it?
- **Stage:** slice gaps · **Slice:** board-scale · **When:** 2026-10-02T20:40:00Z · **Iteration:** 10
- **Question:** FR-036 says type and spacing inside the notebook grow with it, "never below today's sizes; cap growth so a page's line stays comfortable", and the owner wants 1920×1080 and 2560×1440 to "look like the board, larger". At 1280×800 the notebook is 830×680 and the body serif 16.5px, about 66 characters to a page's line. How much do type and spacing grow, and what caps it?
- **Options:** (a) one factor s = the smaller of notebook width/830 and height/680, at least 1, at most 2, for type, spacing, ruled-line pitch and tabs; past the cap each page's text column held to its measure at the cap (recommended by the host); (b) the same, capped at 1.5, the column held to about 66 characters; (c) type grows with width only, uncapped
- **Decision:** (a), with one change. Everything inside the notebook grows by s = the smaller of notebook width/830 and notebook height/680, never below 1 and never above 2: type in every face, page padding, gaps, the ruled-line pitch and where it starts, the margin line's inset, buttons and tabs. 1px lines (fold, rules, margin) stay 1px. The change: at every size, a page's text column is never wider than today's column × s × 75/66, about 75 characters at its type size; paper beyond that stays margin. 1280×800 is exactly today; 1920×1080 gives s ≈ 1.35 (body ≈ 22px); 2560×1440 s ≈ 1.8 (body ≈ 30px). Between 1100 and 1280 wide the notebook is under 830, so type stays at today's size there.
- **Why:** The owner asked for the board, larger; one factor is the only way the inside keeps the board's proportions, and the smaller ratio keeps content from running off the bottom sooner than on the board. Type growing with the page holds a reading line at D35's comfortable 65–75 characters; the column limit holds it on 16:9 and wide windows too. (b) would show 2560×1440 as the board with its writing shrunk; (c) has no cap, which FR-036 rules out. The floor keeps "never below today's sizes". Decided from FR-036, D35's measure arithmetic and the constitution's "generous whitespace".
- **Decided by:** drive-skipper (claude-opus-5-5[1m])
- **Confidence:** medium · **Would reverse if:** at the demo at 2560×1440 the owner says the writing reads too large or a page holds too little; the cap then drops toward 1.5.
- **Written to:** `specs/004-notebook-landscape/spec.md` (Clarifications, FR-036)
- **Status:** standing
- **Note, 2026-10-02 (Phase 4, T011):** the page area's type is 16px, not 16.5px, so the 383·s measure holds about 77 characters a line, not 75; within "about 75", and the test bounds it at 78.5. A line for the owner's reveal demo if lines read long.

## D40 — Do the notebook's corners and soft shadows grow with it?
- **Stage:** after acceptance (Phase 4, T012) · **Slice:** board-scale · **When:** 2026-10-02T21:40:00Z · **Iteration:** 10
- **Question:** Converge pass 1 found the notebook's and tabs' 6px corners, the notebook's drop shadow, the night lamp glow and the stones' glow kept at their 1280 sizes while everything else inside grows by D39's factor. Do they grow too, or is that a taste call for the owner?
- **Options:** grow them by the same factor, keeping the 1px edge line at 1px (recommended by T012); leave them and put them on the owner's demo list
- **Decision:** Grow them. Radii, shadow offsets and blurs and the glows take `calc(N * var(--nb-u))`; 1px edges and focus rings stay as they are.
- **Why:** D39 says everything inside the notebook grows by one factor so the scene is the board, larger; a 1660px notebook with a 1280-size corner and shadow reads as a smaller board's paper cut bigger. The 1px-lines exception in D39 is for lines, which corners and soft shadows are not.
- **Decided by:** host (standing decision D39)
- **Confidence:** high · **Would reverse if:** the owner, at the reveal demo, finds the shadow heavy at 2560×1440
- **Written to:** `specs/004-notebook-landscape/slices/board-scale/tasks.md` (T012)
- **Status:** standing
