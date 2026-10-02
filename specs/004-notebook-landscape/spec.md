# Feature Specification: The notebook in the landscape

**Feature Branch**: `004-notebook-landscape`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Feature 004-notebook-landscape: the owner-chosen redesign of Cairn's whole interface, 'notebook in the landscape' (reference: Design canvas https://claude.ai/artifact/G5Fiv4zHgF1A1t3QHKPYMa, boards G-Morning, G-Midday, G-Night). Cairn's window shows a calm landscape behind an open field notebook … three looks: morning, midday, night … every existing screen is re-laid out in this style … content, behaviour and wording rules are unchanged … the system window frame stays; the Cairn mark appears at the left of the app's top area … fonts ship inside the app … a three-way morning/midday/night switch, present only in development builds … the clock is out of scope … contrast at least 4.5:1 in all three looks, keyboard-reachable tabs, reduced motion respected."

## Context

This feature changes how Cairn looks and is laid out. It does not change what Cairn does.

The owner reviewed several directions on a design canvas and chose one, "the notebook in the
landscape". Cairn's window becomes a quiet outdoor scene: sky, layered hills, the sun or the
moon, and a small stone cairn on a hilltop. An open field notebook rests on that scene, and
every screen is a page spread in it. Coloured paper tabs on the notebook's edge replace
today's row of header buttons.

The scene comes in three looks: **morning**, **midday** and **night**. Later, the look will
follow the time of day on the person's own machine. That is not part of this feature. Here,
a switch that exists only while Cairn is being developed and tested lets a tester see each
look.

The visual reference is the design canvas linked above, boards `G-Morning`, `G-Midday` and
`G-Night`. Where this specification and the canvas disagree, this specification wins. Where
the canvas shows sample content (sites, times, journal text), that content is illustration,
not requirement.

**What this feature must not disturb.** Every rule the current screens obey still holds: no
reach count anywhere except where reaches are shown today, no streak imagery, none of the
banned words, nothing that appears in response to a blocked request, no notification, no
network use. This is a change of surface, and the guards that protect those rules must pass
unchanged.

Constitution v1.5.0 (Principle VI) allows the typewriter-style face for small labels, tabs
and buttons that this design uses, and forbids it for body text read at length.

## Clarifications

### Session 2026-10-01

- Q: The look is fixed on morning in a released build, so the greeting would say "Good morning." in the evening. What should the greeting do until the clock arrives? → A: Keep showing it. The greeting always follows the look the toggle is on. The toggle is temporary: before Cairn's first release, the toggle is removed and the clock chooses the look, so the greeting never disagrees with the time of day in a shipped Cairn (owner, 2026-10-01).

- Gaps reviewed 2026-10-01, before the split. The owner answered:
  - Q: The mockups are 1280×800, but Cairn opens at 1000×720 and can shrink to 800×600. → A: Cairn opens at 1280×800. The smallest window stays 800×600. In a narrow window the greeting moves into the sky above the notebook instead of beside it (FR-028, FR-029).
  - Q: The greeting shows a time. Does it keep up? → A: It shows the weekday and the time, keeps up within a minute, and uses the computer's own 12- or 24-hour format (FR-030).
  - Q: Some screens hold little (What Cairn covers, teardown). What fills the second page? → A: The content goes on the left page, and the right page is a blank ruled page. Nothing is invented to fill it (FR-031).
  - Q: Where does the testing switch sit? → A: Small, at the top right of the sky, labelled "Look (testing)", so it never reads as part of the product (FR-011).
  - Q: The 003 slice `history-by-site` may touch the Today screen. → A: It lands before this feature's Tonight-and-Today slice (story split, parking lot).

- Q: Should the redesign live on a long-lived Design branch and be merged at the end? → A: No. Every slice lands on `main` within a day (constitution, Continuous Integration on Trunk), behind the testing switch. The switch gets a fourth choice, **Current**, which is today's interface and its default. The new design stays off until it is whole (owner, 2026-10-01: "option 1", "yes").
- Q: Does the switch remember the choice between restarts? → A: No. It starts on Current every time (owner, 2026-10-01).
- Q: What ends the hidden period? → A: A final slice, `reveal`, makes the notebook the default and removes today's interface and the Current choice. It runs only after the owner has accepted all three looks in a demo (SC-008; owner, 2026-10-01).

- Gaps reviewed for slice `frame`, 2026-10-01. Checked: the tab set before and after protection is on (it follows today's header, US1 scenarios 1–2); a tab for an unbuilt part (scenario 4); unsaved check-in text across tabs (scenario 5); where the mark sits under each platform's own frame (FR-007, the top left of the sky); the greeting at narrow widths and keeping time (FR-029, FR-030); morning contrast for text on the sky as well as on paper (FR-021); scrolling inside the notebook while the scenery stays put (edge cases); the window opening at 1280×800 (FR-028). Added: in `frame`, an existing screen keeps its current single-column layout on the notebook's paper, across the spread. Its two-page layout arrives with its own page slice (story split, slices 3–6). Nothing else was missing.

- Gaps reviewed for slice `looks`, 2026-10-02 (cruise, iteration 2). Checked: the switch's four choices and their order (FR-011); moving between any two looks, and to and from Current, keeps the screen and the text typed on it (US2 scenario 1; frame's round-trip test covers Current and Morning); the greeting's words per look (FR-013b); the amber "not confirmed" and "waiting" text and the focus ring on night's lamp-lit paper (FR-016, FR-021, FR-022); forced colours in every look (edge cases); a released build still has no switch (FR-012). Two gaps, answered (decisions D3, D4):
  - Q: Does a change of look fade, or happen at once? → A: At once, with no transition, whether or not reduced motion is asked for. Scenario 1 already says "at once" (US2 scenario 1, FR-010).
  - Q: The Cairn mark and the hilltop cairn are drawn in ink-coloured stones. On the night sky they would vanish. → A: In every look, the mark's base and top stones MUST stand out from the sky behind them by at least 3:1, so its shape reads. The middle stones may stay soft, as in the accepted morning look (FR-033).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The window becomes a notebook in a landscape (Priority: P1)

A person opens Cairn. Instead of a plain page with a header of buttons, they see a calm
landscape filling the window and an open notebook resting on it. A short greeting with the
day and time sits in the sky beside the notebook. The Cairn mark sits at the left of the
app's top area. They move between Cairn's parts using paper tabs on the notebook's edge.
Each part opens as a page spread in the same notebook.

**Why this priority**: Everything else in this feature lives inside this frame. With only
this story built, every existing screen already sits in the new notebook, so the change is
visible end to end, even before each screen's layout is reworked.

**Independent Test**: Open Cairn with protection on and with protection off. Confirm the
landscape, the notebook, the greeting and the mark appear. Confirm each tab opens its part
in the notebook, the current tab is shown as current, and every tab is reachable and usable
from the keyboard alone.

**Acceptance Scenarios**:

1. **Given** protection is on, **When** the person opens Cairn, **Then** the window shows the landscape, the notebook, the greeting, the Cairn mark, and one tab for each part the header offers today (Protection, What is protected, Today, Tonight, What Cairn covers).
2. **Given** protection is off, **When** the person opens Cairn, **Then** only the tabs the header offers today before protection is on are shown, and the tab set keeps the same shape as the person moves around.
3. **Given** any tab, **When** the person selects it with the keyboard or pointer, **Then** that part opens in the notebook and its tab is marked as the current one, to assistive technology as well as visually.
4. **Given** a part of Cairn that has not been built yet (for example Settings), **When** the notebook is shown, **Then** no tab for it appears. No tab ever leads nowhere.
5. **Given** the check-in has unsaved text, **When** the person moves to another tab and back, **Then** the text is still there, as it is today.

---

### User Story 2 - Three looks: morning, midday and night (Priority: P1)

The scene can show three looks. **Morning**: a peach sky, a low sun, green hills, and the
cairn in ink, cream, amber and moss. **Midday**: a golden sky, a high sun, golden hills, and
the cairn in deeper and lighter tones of that same landscape. **Night**: a dark, starry sky,
the moon, hills in silhouette, a notebook that looks lamp-lit, and a cairn of light,
moonlit stones with a soft glow. The greeting matches the look: "Good morning.", "Midday.",
"Good evening."

While Cairn is being developed and tested, a three-way switch at the top of the window
changes the look. A released build of Cairn has no such switch.

**Why this priority**: The three looks are the heart of the chosen design and the owner's
reason for choosing it. The switch is how the owner and testers judge each look before the
clock decides it.

**Independent Test**: In a development build, use the switch to show each look in turn and
confirm the sky, the hills, the sun or moon, the cairn, the greeting and the notebook change
together. Build a release version and confirm no switch exists anywhere in it.

**Acceptance Scenarios**:

1. **Given** a development build, **When** the tester chooses morning, midday or night on the switch, **Then** the whole scene, the greeting and the notebook take that look at once, with no transition, and the current screen and anything typed on it are kept.
2. **Given** a development build, **When** Cairn starts, **Then** the switch is on Current and Cairn looks exactly as it does today, until the tester chooses a look.
3. **Given** a released build before the reveal, **When** the person uses Cairn in any way, **Then** no look switch is present, reachable or announced, and Cairn looks exactly as it does today.
4. **Given** the night look, **When** the person reads any text in the notebook or in the sky, **Then** the text is as readable as in the morning look (see SC-003).

---

### User Story 3 - Every screen laid out as a notebook page (Priority: P2)

Each existing screen is laid out as a notebook spread in the chosen style, with the same
content and behaviour it has today:

- **Protection**: the state of protection on the left page; what you are protecting and the
  way to add another address beside it, with margin notes for what it does not cover and how
  changes that protect less wait. A change that is waiting appears as a stamped note with
  "Keep things as they are".
- **What is protected**: the full list, ruled like an inventory.
- **Today**: today's reaches as a typed log with times, as today.
- **Tonight**: today's reaches on the left page; the quote and a lined journal page on the
  right, with "Keep this".
- **What Cairn covers**, **Before Cairn changes anything** and setup (**What would you like
  to protect?**, **Anywhere else?**): the same words, set as notebook pages.
- **This machine is as it was** (teardown): the same words, set as a notebook page, ready for
  when it is wired into the app.

**Why this priority**: The frame (Story 1) and the looks (Story 2) already carry the design.
Each screen's own layout can then arrive one screen at a time, and each one is useful alone.

**Independent Test**: Open each screen in each of the three looks. Compare it with the
screen as it is today and confirm every piece of content, every control and every message is
still present and still works, now laid out as a notebook page.

**Acceptance Scenarios**:

1. **Given** any existing screen, **When** it is shown in the notebook, **Then** every heading, sentence, list, control and state message it shows today is still shown, with the same words.
2. **Given** headings, lists and reflective writing (journal text, quotes), **When** they are shown, **Then** they are set in the serif.
3. **Given** small labels, tab names and buttons, **When** they are shown, **Then** they are set in the typewriter-style face, and no body text read at length is.
4. **Given** the Tonight screen, **When** the person writes, **Then** the journal reads as a lined notebook page, and saving, leaving, quotes and the other existing behaviours work as today.
5. **Given** protection is "not confirmed" or a change is waiting, **When** the Protection screen shows it, **Then** it uses the warm amber language and appearance it uses today, never red.

---

### Edge Cases

- **A small window.** Some screens have a lot of content. When the window is small, the page
  scrolls inside the notebook. The tabs stay reachable, nothing is cut off or overlaps, and
  the landscape stays behind.
- **A very large window.** The notebook keeps a comfortable reading width and stays centred
  on the scene. The landscape fills the rest.
- **Reduced motion.** When the person's system asks for reduced motion, nothing moves: no
  settling animation, no transition between looks, no drifting scenery.
- **High contrast or forced colours.** Text and controls stay visible and usable. The scenery
  may be simplified or dropped.
- **Fonts missing.** If a bundled font cannot be used, a close system fallback is shown, and
  every rule about which text is serif and which is typewriter-style still holds.
- **Keyboard only.** Every tab and control is reachable in a sensible order, and focus is
  always visible on paper, sky and the night look alike.
- **Screen readers.** The scenery is decoration: it is silent to assistive technology, and
  the greeting is read as text.
- **A blocked request.** Nothing in this feature appears in response to a blocked request. The
  scene and greeting are inside Cairn's own window only.

## Requirements *(mandatory)*

### Functional Requirements

**The frame**

- **FR-001**: Cairn's window MUST show a landscape scene behind all content: a sky, layered hills, the sun or the moon according to the look, and a small cairn of five stacked stones on a hilltop.
- **FR-002**: All of Cairn's screens MUST appear as page spreads in a single open notebook resting on the landscape.
- **FR-003**: Navigation MUST be paper tabs on the notebook's edge, one per part of Cairn that today's header offers. The tab set MUST follow the same rules as today's header, including which tabs appear before protection is on.
- **FR-004**: A tab MUST NOT appear for a part of Cairn that does not exist yet.
- **FR-005**: The current tab MUST be shown as current, both visually and to assistive technology.
- **FR-006**: A short greeting with the weekday and time MUST appear in the sky beside the notebook. Its words follow the look: "Good morning.", "Midday.", "Good evening." The words under it MUST obey every wording rule (no banned words, no counts of reaches, no streak language).
- **FR-007**: Each platform's own window frame MUST be kept. The Cairn mark MUST appear at the left of the app's top area.
- **FR-008**: The tabs, greeting and scene MUST carry no count, badge or hint of anything new. This is the same discipline the header follows today.

**The looks**

- **FR-009**: The interface MUST support exactly three looks: morning, midday and night, as described in User Story 2 and on the reference canvas.
- **FR-010**: Changing the look MUST change the sky, hills, sun or moon, cairn colours, greeting and notebook together. It MUST keep the current screen and anything typed on it.
- **FR-011**: A development build MUST offer a switch, small, at the top right of the window, labelled "Look (testing)", with four choices: Current, Morning, Midday, Night. Current is today's interface, unchanged. The switch MUST start on Current every time Cairn starts, and MUST NOT remember the last choice.
- **FR-012**: A released build MUST contain no look switch: not shown, not reachable by keyboard or any key combination, and not announced to assistive technology. Until the reveal (FR-032), it MUST show today's interface, unchanged.
- **FR-013**: Choosing the look by time of day MUST NOT be part of this feature. Nothing in this feature reads the clock to choose a look.
- **FR-013a**: The look switch is temporary. Before Cairn's first release, the time-of-day feature MUST remove the switch and let the clock choose the look. This feature records that obligation and does not meet it.
- **FR-013b**: The greeting MUST always follow the look on screen. Morning shows "Good morning.", midday shows "Midday.", night shows "Good evening." It is never hidden.

- **FR-032**: Until every page slice is done and the owner has accepted all three looks in a demo, the notebook MUST be reachable only through the switch in a development build. The `reveal` slice then makes the notebook the default (morning in a released build), removes today's interface and the Current choice, and leaves a three-way switch for development builds until the clock replaces it (FR-013a).

**Type and voice**

- **FR-014**: Headings, lists and reflective writing (journal text, quotes) MUST be set in a serif. Small labels, tab names and buttons MUST be set in a typewriter-style face. Body text read at length MUST NOT be typewriter-style (constitution v1.5.0, Principle VI).
- **FR-015**: Every font MUST ship inside Cairn. Showing the interface MUST NOT fetch anything over the network.
- **FR-016**: Colours MUST stay warm in all three looks. Nothing may use red as an alarm colour, and the "not confirmed" and "waiting" states MUST keep their warm amber meaning.
- **FR-017**: No lock, shield, chain or broken-chain imagery, and no neumorphism, may appear in the scene, the notebook or the tabs.

**The screens**

- **FR-018**: Every existing screen MUST be laid out as a notebook spread, keeping every heading, sentence, list, control, state and behaviour it has today, word for word. The screens are: setup (What would you like to protect?, Anywhere else?), Before Cairn changes anything, Protection (including "not confirmed" and a waiting change), What is protected, Today, Tonight, What Cairn covers, and This machine is as it was.
- **FR-019**: The Tonight journal MUST read as a lined notebook page in the serif. Its existing behaviours (saving, keeping text while moving between tabs, quotes and hiding them, leaving with unsaved text) MUST work exactly as today.
- **FR-020**: A waiting change on the Protection screen MUST stay visible beside protection's state, with "Keep things as they are" as reachable as today.

**Accessibility**

- **FR-021**: All text MUST meet a contrast of at least 4.5:1 against what is directly behind it in every look. Large text (24px and up) MUST meet at least 3:1.
- **FR-022**: Every tab and control MUST be reachable and usable by keyboard alone, with a visible focus indicator in every look.
- **FR-023**: When the system asks for reduced motion, the interface MUST show no animation or transition.
- **FR-024**: The scenery MUST be silent to assistive technology. The greeting and all notebook content MUST be readable by it.
- **FR-033**: The Cairn mark MUST keep its shape visible in every look: its base stone and its top stone, which carry the outline, each meet a contrast of at least 3:1 against the sky directly behind them. The middle stones may be soft, as they are in the morning look.
- **FR-025**: Content MUST stay reachable, without overlap or clipping, at window sizes down to the smallest window Cairn allows today, scrolling inside the notebook where needed.

**Window and greeting**

- **FR-028**: Cairn MUST open at 1280×800. The smallest window MUST stay 800×600.
- **FR-029**: When the window is too narrow for the greeting to sit beside the notebook, the greeting MUST move into the sky above the notebook. It is never hidden behind the notebook or cut off.
- **FR-030**: The greeting MUST show the weekday and the time in the computer's own 12- or 24-hour format, and MUST keep up with the clock to within a minute while Cairn is open. Showing the time MUST NOT change the look (FR-013).
- **FR-031**: A screen whose content fits on one page MUST put it on the left page and leave the right page as a blank ruled page. Nothing may be invented to fill it.

**What must not change**

- **FR-026**: Every existing constitutional guard (banned words, no ambient counts, no streaks, free, no network dependencies, no notifications, domain purity, Unix-gated tests) MUST pass unchanged. None may be weakened to admit this feature.
- **FR-027**: Nothing in this feature may appear in response to a blocked request.

### Key Entities

- **Look**: one of morning, midday or night. It decides the sky, hills, sun or moon, cairn colours, greeting words and how the notebook is lit. In this feature only the development switch chooses it. Beside the three looks, the switch offers Current, today's interface, until the reveal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every existing screen can be reached and shown in each of the three looks. That is 3 looks × every screen, with no missing content compared with today's screen.
- **SC-002**: A released build contains no look switch: a search of the released interface finds no control, label or announcement for it.
- **SC-003**: 100% of text in every look meets the contrast floor of FR-021, measured against the colour directly behind it.
- **SC-004**: A keyboard-only user can reach every tab and every control on every screen and see where focus is, in all three looks.
- **SC-005**: Showing the interface makes zero network requests.
- **SC-006**: All eight constitutional guards and every existing interface test pass, with no guard changed. Tests are changed only where they asserted the old appearance, never what a screen says or does.
- **SC-007**: With reduced motion requested, nothing in the interface moves.
- **SC-008**: The owner, comparing each look against the reference canvas boards, accepts it as the chosen design.
- **SC-009**: Until the reveal, a released build, and a development build with the switch on Current, look and behave exactly as before this feature. Every existing interface test passes against them unchanged.

## Assumptions

- The reference canvas is a guide to look and layout, not a pixel specification. Small departures are fine where they serve readability or accessibility.
- Before the reveal, released builds show today's interface. After it, they show the morning look, with "Good morning.", until the clock feature arrives. No release is planned before the clock feature replaces the switch (FR-013a).
- "Today's header" means the navigation as it stands on `main` when this feature starts: Protection, What is protected (once protection is on), Today (once protection is on), Tonight, What Cairn covers. A Settings tab appears only once a Settings screen exists. The canvas shows one for illustration.
- Teardown ("This machine is as it was") is restyled now, though it is not yet reachable from the app, so it matches when it is wired in.
- Screens planned by other features but not yet built (Settings, Over time, One day, a partner, streaks) are out of scope. When they are built, they adopt this style.
- The sample content on the canvas (sites, times, journal entries, the "Waiting · 23 hours" stamp's exact wording) is illustration. Real screens keep their real words.
- The feature number 004 was free when this spec was created. Earlier documents call the future streaks work "slice 004". That work takes the next free number when it is specified.
