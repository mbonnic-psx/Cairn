# Feature Specification: Cairn v1

**Feature Branch**: `001-cairn-v1`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Cairn v1 — a cross-platform desktop website blocker that actually blocks, wrapped in a recovery layer built from end-of-day reflection, journaling, and honest history. Local-first, no accounts, no cloud, no telemetry. Free forever for everything that matters. Scope per VISION.md."

## Clarifications

### Session 2026-08-18

- Q: With no server and no accounts, how should a partner be established and how should their approval reach Cairn? → A: The partner sets a secret passphrase during setup (in person or on a call); approving a pending change means supplying that passphrase. Summaries are exported by the person and sent through a channel they already use. Nothing for the partner to install, no network.
- Q: How long should delay-mode gating hold a protection reduction, and can the person change that duration? → A: Chosen at setup from 1 hour to 7 days, defaulting to 24 hours. Lengthening the delay applies immediately; shortening it must itself wait out the current delay.
- Q: How should journal entries and reach history be protected in storage on the machine? → A: Always encrypted at rest, with the key held in the platform credential store. No passphrase for the person to set or forget. Stated plainly: this protects a copied folder, a synced backup, or an imaged disk — not someone sitting at an already-unlocked machine.
- Q: Should uninstalling Cairn pass the recovery gate, given an OS-level uninstall cannot be intercepted? → A: Removal started inside the app passes the active gate. An uninstall started from the operating system removes everything immediately, because Cairn cannot intercept it, and this is stated plainly in the app and the README.
- Q: At the evening hour the person chose, should Cairn announce that the check-in is ready? → A: One quiet system notification at that hour, at most once a day, dismissible, turn-off-able in settings. No other unsolicited prompt at any point in the day.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set the trail and be protected (Priority: P1)

Someone installs Cairn, picks the categories and specific sites they don't want to
reach, and turns protection on. From that moment the chosen sites fail to load — in
every browser and every application on the machine — until they deliberately go into
settings and turn protection off. Nothing about the setup is technical: they choose
from named categories, add anything else by typing an address, and confirm.

**Why this priority**: This is the product. Without it there is nothing to reflect
on and nothing to recover from. Shipped alone, it is already a working, useful
website blocker.

**Independent Test**: Complete setup with one category and one custom site, turn
protection on, then attempt to load a protected site in two different browsers and a
non-browser application. Every attempt fails to connect. Turn protection off; the
same sites load normally and the machine is byte-for-byte back to its pre-Cairn
state.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the person selects the Social category and
   turns protection on, **Then** every site in that category fails to load in every
   installed browser within one minute, with no restart required.
2. **Given** protection is on, **When** the person types `https://Example.com:443/some/path`
   as a custom site, **Then** `example.com` and `www.example.com` are protected and
   the entry is not duplicated if added again in a different form.
3. **Given** protection is on, **When** something outside Cairn alters or deletes
   Cairn's blocking entries, **Then** Cairn restores them without being asked and
   without notifying the person mid-day.
4. **Given** protection is on and a protected site fails to load, **When** the
   failure happens, **Then** Cairn displays nothing at all — no page, no
   notification, no sound.
5. **Given** the person turns protection off, **When** teardown completes, **Then**
   Cairn confirms the system is restored and any content it did not author is
   untouched.

---

### User Story 2 - Reaches are counted, quietly (Priority: P1)

Every time the person reaches for a protected site, Cairn records it — which site,
what time — and says nothing. No interruption, no acknowledgement, no shaming. The
count exists for the evening, not the moment.

**Why this priority**: Reach data is half of what makes Cairn worth using; without
it the evening ritual has nothing true to work with. It must exist from the first
release because history cannot be reconstructed retroactively.

**Independent Test**: With protection on, attempt three protected sites at known
times, then inspect today's recorded reaches. All three appear with correct domain
and time, nothing else was recorded, and nothing was shown to the person during the
attempts.

**Acceptance Scenarios**:

1. **Given** counted mode is active, **When** the person attempts a protected site
   four times in an hour, **Then** today's record shows four reaches for that domain
   with their times.
2. **Given** something else on the machine prevents Cairn from counting — a local
   development server, for instance — **When** protection starts, **Then** Cairn
   switches to silent mode on its own, still blocks completely, and explains the
   switch in one sentence.
3. **Given** silent mode is active, **When** the evening check-in opens, **Then** it
   asks the person to estimate rather than displaying a count it does not have.
4. **Given** any mode, **When** a reach is recorded, **Then** the stored record
   contains the domain and timestamp only — no path, no query, no page content.

---

### User Story 3 - The evening check-in (Priority: P2)

Once a day, in the evening, the person sits down with Cairn. It shows what they
reached for today, offers a space to write about how the day went and what was going
on, and optionally a quote. It does not ask them to explain themselves and it never
calls the day a failure.

**Why this priority**: This is the recovery half of the product, and it is what
separates Cairn from every other blocker. It depends on reach data existing but
delivers value even on a day with zero reaches.

**Independent Test**: With some reaches recorded, open the evening check-in, review
today's reaches, write a journal entry, and save. Reopen it later the same evening
and the entry is intact and editable.

**Acceptance Scenarios**:

1. **Given** the person's chosen evening hour arrives, **When** the check-in becomes
   available, **Then** exactly one quiet notification announces it, and opening it
   presents today's reaches, a journaling space, and an optional quote — with nothing
   having interrupted them earlier in the day.
2. **Given** the notification is dismissed or ignored, **When** the rest of the
   evening passes, **Then** it is never repeated or escalated, and the check-in stays
   available to be opened.
3. **Given** a check-in is open, **When** the person writes and saves an entry,
   **Then** it is stored against today's date and can be revised until the day
   closes.
4. **Given** the person skips several days, **When** they next open the check-in,
   **Then** the skipped days are shown as skipped, with no guilt language and no
   penalty.
5. **Given** any check-in, **When** its text is reviewed, **Then** no user-facing
   string contains *failed*, *denied*, *violation*, *relapsed*, *forbidden*, or
   *you lost*.

---

### User Story 4 - Seeing the pattern (Priority: P2)

Over weeks, the person looks back: which sites they reach for, at which hours, on
which days, and how that has moved over time. The point is a fact they didn't know
about themselves — "it's always between 2 and 4" — not a score.

**Why this priority**: The insight that makes the daily ritual worth repeating. It
needs history to have accumulated, so it follows the check-in, but it is independent
of it — patterns are readable with zero journal entries written.

**Independent Test**: Seed several weeks of reach history, open the history view, and
confirm reaches can be read by site, by hour of day, by day of week, and as a trend
over a chosen date range.

**Acceptance Scenarios**:

1. **Given** four weeks of history, **When** the person opens the history view,
   **Then** they can break reaches down by site, by hour, and by day, and change the
   date range.
2. **Given** history and journal entries exist for the same day, **When** the person
   opens that day, **Then** they see the reaches and the entry together.
3. **Given** streaks are turned off, **When** any history view is displayed,
   **Then** it contains no counter, no "day N", and no chain imagery.

---

### User Story 5 - Changing protection is deliberate (Priority: P2)

Protection is a state the person is in, not a button they remember to press.
Reducing or removing it is possible — Cairn is not a trap — but it takes a chosen
form of friction: a waiting period, a partner's approval, or both. The friction is
configured once, calmly, and applies from then on.

**Why this priority**: Without a gate, the wall is decorative. It ranks below the
core loop only because a v1 with an ungated off switch is still testable, not
because it is optional at release.

**Independent Test**: Enable delay-mode gating, then request removal of a protected
site. The change does not take effect until the delay elapses; protection remains
fully enforced throughout, and the request can be cancelled.

**Acceptance Scenarios**:

1. **Given** delay-mode gating is set to 24 hours, **When** the person requests to
   unprotect a site, **Then** the site stays protected for the full 24 hours, the
   time remaining is visible, and the request can be cancelled at any point.
2. **Given** delay-mode gating is set to 24 hours, **When** the person changes the
   waiting period to 1 hour, **Then** the shorter period takes effect only after 24
   hours have passed; changing it to 7 days takes effect at once.
3. **Given** partner-mode gating is active, **When** the person requests a change,
   **Then** the change applies only once the partner's passphrase is entered.
4. **Given** a gate is active, **When** the person quits Cairn, restarts the machine,
   or changes the system clock, **Then** the gate is still in force and the pending
   change has not applied early.
5. **Given** any gate, **When** the person is at a blocked site, **Then** no path to
   the change screen is offered to them there.

---

### User Story 6 - Prevent browser workarounds (Priority: P3)

A browser can be told to resolve addresses on its own, through an encrypted service,
walking straight past Cairn. The person switches on one plainly-named option —
"Prevent browser workarounds" — and Cairn closes that route in the browsers on the
machine, telling them exactly what it is about to change first.

**Why this priority**: It closes the largest real hole in the wall and materially
improves reach-count accuracy. It ranks P3 only because the product is honest and
useful without it, and because it is the most platform-specific work in v1.

**Independent Test**: With the option off, enable encrypted DNS in a browser and
confirm a protected site loads. Turn the option on, restart the browser, and confirm
the site no longer loads and the setting cannot be re-enabled from inside the
browser. Turn the option off; the browser's own settings are exactly as they were.

**Acceptance Scenarios**:

1. **Given** the option is being enabled, **When** the change would affect other user
   accounts on the machine, **Then** Cairn says so plainly and requires explicit
   confirmation before writing anything.
2. **Given** the option is on, **When** a browser attempts to resolve addresses
   through a known encrypted-DNS service, **Then** that route fails.
3. **Given** a browser Cairn cannot control on this system, **When** the person views
   protection status, **Then** Cairn names the gap instead of reporting full
   coverage.
4. **Given** the option is turned off, **When** teardown completes, **Then** every
   setting Cairn wrote is removed and no unrelated browser setting has changed.

---

### User Story 7 - Whole-domain protection at scale (Priority: P3)

Protecting a site means protecting the whole of it, including subdomains the person
has never heard of, and doing so without the machine slowing down as the list grows
into the thousands.

**Why this priority**: Removes a real gap — a site reachable at an unlisted subdomain
is not protected — and makes large category lists practical. It layers on top of the
core block rather than replacing it.

**Independent Test**: Protect a domain with subdomain coverage, then attempt an
unlisted subdomain of it; the attempt fails. Grow the protected list to several
thousand entries and confirm ordinary browsing of unprotected sites shows no
noticeable slowdown.

**Acceptance Scenarios**:

1. **Given** subdomain coverage is available on this system, **When** a domain is
   protected, **Then** arbitrary subdomains of it are protected too.
2. **Given** subdomain coverage is not available on this system, **When** the person
   views protection status, **Then** Cairn states that subdomain coverage is
   unavailable here and continues protecting the listed domains.
3. **Given** subdomain coverage fails at any point, **When** the failure occurs,
   **Then** protection falls back to listed-domain blocking and never to no
   blocking.

---

### User Story 8 - Protection on a schedule (Priority: P3)

The person sets the hours protection is active — work hours, evenings, all the time —
and Cairn moves in and out of protection on its own.

**Why this priority**: Makes Cairn livable for people who need a site during part of
the day. Genuinely useful, but the product works fully with always-on protection.

**Independent Test**: Define a window, wait for its boundaries, and confirm protection
activates and deactivates on time without the app being opened.

**Acceptance Scenarios**:

1. **Given** a schedule with a window, **When** the window opens, **Then** protection
   activates within a minute without the person doing anything.
2. **Given** protection is active by schedule, **When** the person tries to end it
   early, **Then** the active recovery gate applies.
3. **Given** the machine was asleep across a boundary, **When** it wakes, **Then**
   Cairn corrects to the state the schedule requires.

---

### User Story 9 - A partner who sees something (Priority: P3)

The person chooses someone to share with. That person sits down with them once and
sets a passphrase only they know. From then on the partner sees the same honest
picture — reaches, patterns, and whether protection is holding — through summaries
the person sends them, and their passphrase is what releases a pending change when
partner gating is on. The partner never installs anything.

**Why this priority**: For many people accountability is what makes recovery stick.
It sits at P3 because it requires the history and gating work beneath it.

**Independent Test**: Establish a partner with a passphrase, produce a summary for a
period, then release a pending protection change by entering that passphrase. Without
it the change does not apply, and the app offers no way around it.

**Acceptance Scenarios**:

1. **Given** a partner is being established, **When** they set their passphrase,
   **Then** Cairn stores it unrecoverably and never shows it to the person again.
2. **Given** a partner is established, **When** the person produces a summary,
   **Then** it contains reaches, patterns, and protection status, excludes journal
   text unless explicitly included, and Cairn sends it nowhere itself.
3. **Given** partner gating is on, **When** a change is pending, **Then** it applies
   only once the partner's passphrase is entered.
4. **Given** partner gating is on, **When** the person guesses at the passphrase
   repeatedly, **Then** attempts are slowed and no hint, reset, or bypass is offered
   anywhere in the app.
5. **Given** the person requests removal of the partner, **When** the active recovery
   gate is satisfied, **Then** the partner's approval power ends and further sharing
   stops.

---

### User Story 10 - Streaks, only if you want them (Priority: P4)

During setup Cairn asks whether the person wants streaks, explains honestly that a
long streak helps some people and makes a single slip feel catastrophic for others,
and respects the answer. The answer is reversible later without ceremony.

**Why this priority**: A correctness and dignity requirement rather than a
capability, and it is small — but it must be present at first setup, because the
choice is offered there.

**Independent Test**: Complete setup with streaks off and confirm no streak surface
appears anywhere in the app. Turn streaks on, then off again; no "you lost your
streak" moment occurs.

**Acceptance Scenarios**:

1. **Given** setup, **When** the streak question is presented, **Then** both choices
   are given equal weight with the trade-off stated plainly.
2. **Given** streaks are off, **When** any screen is displayed, **Then** it contains
   no streak counter and no chain imagery.
3. **Given** streaks are on with an active count, **When** the person turns them off,
   **Then** the number simply disappears with no loss language.

---

### User Story 11 - Always there, never in the way (Priority: P4)

Cairn starts with the machine and lives quietly in the tray. Closing the window does
not end protection.

**Why this priority**: Protection that stops when a window closes is not protection.
Small, but it protects everything above it.

**Independent Test**: Enable start-with-machine, restart, and confirm protection is
active before the person opens anything, with Cairn present in the tray.

**Acceptance Scenarios**:

1. **Given** start-with-machine is on, **When** the machine restarts, **Then**
   protection is active without the window being opened.
2. **Given** the window is closed, **When** protected sites are attempted, **Then**
   they still fail to load and reaches are still counted.
3. **Given** start-with-machine is turned off, **When** the machine restarts, **Then**
   Cairn does not launch and has left no startup entry behind.

### Edge Cases

- **Cairn cannot get administrator permission** — protection does not silently fail;
  Cairn states that it could not apply protection and what is unprotected as a
  result.
- **The machine loses power mid-write** — on next start Cairn detects the partial
  state, repairs its own section, and never leaves foreign content damaged.
- **Someone edits the blocking entries by hand while protection is on** — Cairn
  repairs them silently and records nothing about the person having done it.
- **A protected domain is also required by the operating system or by Cairn itself** —
  Cairn refuses to protect entries that would break the machine and says why.
- **The clock jumps forward or backward** — a pending gated change cannot be released
  early, and reach timestamps remain readable across the jump.
- **The person adds thousands of custom entries** — protection still applies within
  the stated time and ordinary browsing is not noticeably slowed.
- **The person adds an invalid or unreachable entry** — it is rejected with a plain
  explanation rather than accepted and silently ignored.
- **The evening hour passes while the machine is off** — the check-in is available
  the next time Cairn runs, presented as the day it belongs to.
- **A day with zero reaches** — the check-in still opens and treats zero as a fact,
  not an achievement to celebrate or a streak to protect.
- **Two protected categories contain the same domain** — it is protected once and
  removal from one category does not silently unprotect it.
- **Uninstalling while protection is on** — all protection is removed and the system
  restored; the machine is never left blocking sites with no app to manage it. From
  inside the app this passes the gate first; from the operating system it happens
  immediately, and Cairn says so rather than implying a lock it does not have.
- **The stored key is missing or the credential store is unavailable** — Cairn says
  plainly that past entries cannot be opened, keeps protecting and recording, and
  never deletes or overwrites what it cannot read.
- **The data folder is copied to another machine** — journal entries and history are
  unreadable there.
- **A partner approval is never given** — the pending change simply never applies and
  the person can cancel it themselves at any time.

## Requirements *(mandatory)*

### Functional Requirements

**Setup and configuration**

- **FR-001**: System MUST let a person choose from nine named preset categories —
  Adult, AI, Gambling, Gaming, Messenger, News, Shopping, Social, Streaming — during
  setup and at any time after.
- **FR-002**: System MUST ship preset category contents as seed data, copy them to
  the person's own data on first run, and allow the person to edit their copy.
- **FR-003**: Users MUST be able to add custom entries by typing an address in any
  ordinary form.
- **FR-004**: System MUST normalize every entry — strip scheme, port, and path, treat
  case as insignificant, and reject entries that are not valid addresses with a
  plain-language reason.
- **FR-005**: System MUST protect the `www.` form of a root entry automatically.
- **FR-006**: System MUST deduplicate entries across categories and custom additions,
  and MUST NOT unprotect an entry that remains required by another source.
- **FR-007**: System MUST refuse to protect entries that would break the operating
  system or Cairn itself, and MUST explain the refusal.
- **FR-008**: System MUST ask during setup whether the person wants streaks, present
  both choices with equal weight, and state the trade-off plainly.

**Protection**

- **FR-009**: System MUST block protected entries at the level of the whole machine,
  effective in every browser and every application, without requiring per-application
  configuration.
- **FR-010**: System MUST apply protection changes within 60 seconds of confirmation,
  with no restart of the machine or of browsers required.
- **FR-011**: System MUST show protection as a state, with the current state visible
  at a glance, and MUST NOT require the person to remember to apply changes.
- **FR-012**: System MUST verify that protection is actually in force while it is on,
  repair its own protection entries automatically when they are missing or altered,
  and MUST NOT interrupt the person to report the repair.
- **FR-013**: System MUST report protection status from verified system state, never
  from intended state, and MUST say so when verification fails.
- **FR-014**: System MUST provide subdomain coverage for protected domains where the
  system supports it, and MUST state in the interface when it is unavailable rather
  than implying coverage it does not have.
- **FR-015**: System MUST keep protection effective as the protected list grows to at
  least 10,000 entries, without noticeable slowdown to ordinary browsing.
- **FR-016**: System MUST fall back to its most basic working protection whenever an
  enhanced protection mechanism fails or is unsupported, and MUST NEVER fall back to
  no protection.
- **FR-017**: System MUST offer "Prevent browser workarounds" as a separately
  toggleable option, named in plain language, explained at the moment of enabling.
- **FR-018**: System MUST disclose plainly, and require explicit confirmation, before
  making any change that affects other user accounts on the machine.
- **FR-019**: System MUST prefer changes scoped to the current person's account
  wherever the system offers that choice.
- **FR-020**: System MUST name any browser or route it cannot cover on this machine
  rather than reporting complete coverage.
- **FR-021**: System MUST state plainly, in the app and in the README, that a
  determined person with administrator access can defeat it.

**Reach counting**

- **FR-022**: System MUST record each reach for a protected entry with the domain and
  the time, and MUST record nothing else about it.
- **FR-023**: System MUST NEVER display anything at the moment of a reach — no page,
  no notification, no sound, no badge change.
- **FR-024**: System MUST default to counted mode, in which reaches are recorded.
- **FR-025**: System MUST check, at setup and at every start of protection, whether
  counted mode is possible on this machine, and MUST switch to silent mode — full
  protection with no reaches recorded — on its own when it is not, explaining the
  switch in one sentence.
- **FR-026**: Users MUST be able to override the mode in either direction.
- **FR-027**: System MUST NEVER inspect, store, or transmit the content of any
  request, any path beyond the domain, or any page.
- **FR-028**: System MUST ask the person to estimate their reaches in the evening
  check-in whenever silent mode was active for the day.

**Evening check-in and journal**

- **FR-029**: System MUST make the daily check-in available once per day at an hour
  the person chooses.
- **FR-029a**: System MUST announce the check-in with a single quiet notification at
  that hour, at most once per day, dismissible without consequence.
- **FR-029b**: Users MUST be able to turn that notification off in settings, and the
  check-in MUST remain reachable without it.
- **FR-029c**: System MUST NOT re-announce, escalate, or repeat the notification for
  a check-in the person did not open.
- **FR-030**: System MUST NEVER prompt for reflection, journaling, or justification
  outside that single daily announcement.
- **FR-031**: System MUST present, in the check-in, today's reaches, a free-form
  journaling space, and an optional quote.
- **FR-032**: Users MUST be able to save, revise, and delete their own journal
  entries.
- **FR-033**: System MUST treat a skipped check-in as skipped, with no penalty and no
  guilt language.
- **FR-034**: System MUST NEVER require the person to type, answer, or solve anything
  in order to reach a protected site or to keep protection running.

**History and patterns**

- **FR-035**: Users MUST be able to see reaches broken down by site, by hour of day,
  and by day of week, over a date range they choose.
- **FR-036**: Users MUST be able to see how their reaches have moved over time.
- **FR-037**: System MUST show a day's reaches and that day's journal entry together.
- **FR-038**: System MUST retain history and journal entries indefinitely until the
  person deletes them.

**Changing protection**

- **FR-039**: System MUST place every protection change behind deliberate navigation
  into settings, and MUST NEVER offer, suggest, or link to a protection change in
  response to a blocked request.
- **FR-040**: System MUST gate every reduction or removal of protection behind the
  active recovery mode — a waiting period, a partner's approval, or both.
- **FR-040a**: System MUST let the person choose the waiting period at setup from a
  bounded range of 1 hour to 7 days, and MUST default it to 24 hours.
- **FR-040b**: System MUST apply an increase to the waiting period immediately, and
  MUST make any decrease to it wait out the currently configured period before taking
  effect.
- **FR-040c**: System MUST make the time remaining on a pending change visible
  wherever protection state is shown, without drawing the person back to it.
- **FR-041**: System MUST keep protection fully in force for the entire duration of a
  pending gated change.
- **FR-042**: Users MUST be able to cancel a pending change at any time before it
  applies.
- **FR-043**: System MUST keep a gate in force across app restarts, machine restarts,
  and changes to the system clock.
- **FR-044**: System MUST apply increases in protection immediately, without a gate.
- **FR-045**: System MUST NEVER provide a moment-of-temptation bypass of any kind.

**Schedules**

- **FR-046**: Users MUST be able to define time windows during which protection is
  active, and MUST be able to choose always-on.
- **FR-047**: System MUST enter and leave scheduled protection within 60 seconds of
  the boundary, without the app being opened.
- **FR-048**: System MUST correct to the state the schedule requires after sleep,
  hibernation, or a restart.
- **FR-049**: System MUST apply the active recovery gate to any attempt to end a
  scheduled protection period early.

**Partner**

- **FR-050**: Users MUST be able to establish exactly one partner in v1, and to
  request removal of that partner at any time.
- **FR-050a**: System MUST establish a partner by having the partner set a secret
  passphrase during a setup step, without requiring the partner to install anything,
  create an account, or be reachable over a network.
- **FR-050b**: System MUST store the partner's passphrase in a form from which the
  passphrase itself cannot be recovered, and MUST NEVER display it to the person
  after it is set.
- **FR-051**: System MUST let the person produce a shareable summary of reaches,
  patterns, and protection status covering a period they choose, in a form they can
  send through any channel they already use.
- **FR-051a**: System MUST NOT transmit a summary itself; sharing is an action the
  person takes outside Cairn with a file or image Cairn produced.
- **FR-052**: System MUST exclude journal text from anything shared unless the person
  explicitly includes it.
- **FR-053**: System MUST require the partner's passphrase to release a pending
  protection change when partner gating is active.
- **FR-053a**: System MUST resist repeated passphrase attempts by the person, and
  MUST NEVER offer a hint, a recovery path, or a way to bypass the passphrase from
  within the app.
- **FR-054**: System MUST end the partner's approval power and all sharing
  immediately when the partner is removed, and removing a partner MUST itself pass
  the active recovery gate.

**Streaks and gamification**

- **FR-055**: System MUST honour the streak choice everywhere: with streaks off, no
  counter, no "day N", and no chain imagery may appear on any screen.
- **FR-056**: Users MUST be able to change the streak choice at any time, and turning
  streaks off MUST NEVER produce a loss moment.
- **FR-057**: System MUST keep every non-streak capability fully available to a
  person with streaks off.

**Presence**

- **FR-058**: System MUST offer to start with the machine, and MUST remove its
  startup entry completely when that is turned off.
- **FR-059**: System MUST remain present in the system tray and keep protecting and
  counting when its window is closed.
- **FR-060**: System MUST make quitting distinct from closing the window, and MUST
  apply the active recovery gate to any quit that would end protection.

**Privacy and data**

- **FR-061**: System MUST work fully with no account, no sign-in, and no internet
  connection.
- **FR-062**: System MUST NEVER transmit any user data off the machine — no
  analytics, no crash reports, no usage pings, no license checks.
- **FR-063**: System MUST store all data in the person's own user-data location on
  the machine.
- **FR-063a**: System MUST encrypt journal entries and reach history at rest at all
  times, with no option to store them unencrypted.
- **FR-063b**: System MUST hold the encryption key in the platform's own credential
  store, and MUST NEVER require the person to set, remember, or enter a passphrase to
  read their own entries.
- **FR-063c**: System MUST state plainly what this protects against — a copied data
  folder, a synced backup, an imaged disk — and that it does not protect data from
  someone using the machine while it is unlocked.
- **FR-063d**: System MUST fail closed if the key is unavailable: it MUST report that
  history cannot be opened, MUST continue protecting and recording, and MUST NEVER
  silently discard, reset, or overwrite unreadable data.
- **FR-063e**: System MUST include any shared summary the person exports in this
  protection decision by stating, at export time, that the exported file is not
  encrypted.

**Language and presentation**

- **FR-064**: System MUST NEVER use the words *failed*, *denied*, *violation*,
  *relapsed*, *forbidden*, or *you lost* in user-facing text.
- **FR-065**: System MUST name features by what they do for the person, never by
  their mechanism.
- **FR-066**: System MUST avoid lock, shield, chain, and alarm-red imagery
  throughout.

**Removal**

- **FR-067**: System MUST back up any system state it modifies, once, before the
  first modification, preserving the true pre-Cairn state.
- **FR-068**: System MUST modify only content it owns and marks as its own, leaving
  all surrounding content byte-identical.
- **FR-069**: System MUST remove all protection completely when protection is turned
  off, verify the removal, and report anything it could not remove.
- **FR-070**: System MUST restore the machine to its pre-Cairn state on uninstall,
  including when protection was active at the time.
- **FR-070a**: System MUST treat removal of Cairn initiated from inside the app as a
  reduction in protection, subject to the active recovery gate.
- **FR-070b**: System MUST restore the machine completely when an uninstall is
  initiated from the operating system, without a gate, because that path cannot be
  intercepted.
- **FR-070c**: System MUST state plainly, in the app and in the README, that
  uninstalling from the operating system removes protection immediately and is not
  gated.
- **FR-071**: Users MUST be able to delete all their Cairn data permanently from
  within the app.
- **FR-072**: System MUST keep every capability in FR-001 through FR-071 free of
  charge, permanently, with no account, trial, or usage limit.

### Key Entities

- **Trail**: The set of what is currently protected — chosen categories plus custom
  entries — together with the reach mode (counted or silent), the schedule, and the
  recovery gate in effect.
- **Category Preset**: A named, editable collection of entries shipped as seed data
  and owned by the person after first run.
- **Protected Entry**: A single normalized domain, its source (category or custom),
  and whether subdomain coverage applies.
- **Protection State**: Whether protection is currently in force, since when, which
  enhancement layers are active, and what was verified at last check.
- **Reach**: One recorded attempt on a protected domain — domain and timestamp only.
- **Daily Check-in**: One day's record — the day's reaches or the person's estimate,
  the journal entry, and whether the day was skipped.
- **Pattern View**: A derived summary of reaches over a chosen range, by site, hour,
  and day.
- **Recovery Gate**: The friction configured for reducing protection — a waiting
  period between 1 hour and 7 days, a partner's approval, or both — and any change
  currently pending against it.
- **Pending Change**: A requested reduction in protection, what it would change, when
  it becomes eligible, and its approval state.
- **Schedule Window**: A recurring period during which protection is active.
- **Partner**: The one person who may release pending changes, represented by a
  display name and an unrecoverable form of the passphrase they set.
- **Shared Summary**: A generated, self-contained account of reaches, patterns, and
  protection status for a chosen period, which the person sends themselves.
- **Change Inventory**: The record of every modification Cairn has made to the
  machine, sufficient to remove each one exactly.
- **Backup**: The one-time capture of pre-Cairn system state, retained for as long as
  Cairn is installed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time person completes setup — categories chosen, custom sites
  added, protection on — in under 5 minutes without consulting documentation.
- **SC-002**: A protected site fails to load in 100% of attempts across every browser
  and application installed on the machine, in 100 consecutive attempts.
- **SC-003**: Protection changes take effect within 60 seconds, with no restart of
  the machine or of any browser.
- **SC-004**: Turning protection off restores every file and setting Cairn touched to
  its exact pre-Cairn content, verified byte-for-byte, in 100% of teardowns across all
  three supported desktop platforms.
- **SC-005**: When any enhanced protection mechanism fails or is unsupported,
  protection remains fully in force in 100% of cases; no failure path results in
  unprotected browsing.
- **SC-006**: With protection active and 10,000 entries protected, page load time for
  unprotected sites increases by no more than 50 milliseconds.
- **SC-007**: Zero bytes of user data leave the machine over a 30-day period of normal
  use, verified by network capture.
- **SC-008**: In counted mode, recorded reaches match actual attempts within 5%
  over a 100-attempt test.
- **SC-009**: Cairn displays nothing to the person at the moment of a reach in 100% of
  reaches.
- **SC-010**: Over a 30-day period Cairn produces at most one notification per day —
  the evening check-in announcement — and zero other unsolicited prompts, including
  zero at the moment of any reach. With the announcement turned off, the count is
  zero.
- **SC-011**: No pending gated change applies before its gate is satisfied, in 100% of
  attempts, including across app restarts, machine restarts, and system clock changes.
- **SC-012**: With streaks off, zero streak counters, day-counts, or chain imagery
  appear anywhere in the app, verified by a full screen-by-screen sweep.
- **SC-013**: Zero user-facing strings contain the words *failed*, *denied*,
  *violation*, *relapsed*, *forbidden*, or *you lost*, verified by an automated check
  over all shipped strings.
- **SC-014**: After 30 days of use, a person can name at least one specific,
  previously unknown pattern in their own behaviour — a time of day, a day of week, or
  a site — drawn from the history view.
- **SC-015**: Uninstall leaves zero Cairn-authored entries, rules, policies, or
  startup registrations on the machine, including when protection was active at
  uninstall time.
- **SC-016**: 100% of the capabilities in this specification are reachable without
  payment, account, trial period, or usage limit.
- **SC-017**: Inspecting Cairn's stored data directly reveals zero readable journal
  text and zero readable domain history, on all three supported platforms.
- **SC-018**: A person never enters a passphrase to read their own history, in 100%
  of ordinary use.

## Assumptions

- The person is the administrator of their own machine and can grant elevated
  permission when Cairn asks; without it, Cairn reports honestly rather than failing
  silently.
- Cairn is a personal recovery tool on a personal machine, not a managed IT
  deployment; changes are scoped to the current account wherever the platform allows.
- The three supported platforms are current Windows, macOS, and Linux desktop
  releases. Where a platform genuinely cannot support a capability, Cairn says so
  rather than degrading silently.
- The interface is a native desktop application. Nothing about Cairn is served over
  a browser, including its own screens.
- The person may be technical or not; nothing in the interface requires understanding
  how blocking works.
- Preset category contents will drift as sites appear and disappear; the person's
  ability to edit their own copy is the v1 answer, with no automatic updating.
- A "reach" means an attempt to resolve a protected domain. Multiple attempts from a
  single page load may register as more than one reach; the number is directional,
  not forensic.
- Reach counts become more accurate once browser-workaround prevention is active,
  because a browser resolving addresses on its own is never counted.
- Partner functionality in v1 is local and works without any server, without the
  partner installing anything, and without an internet connection. It assumes the
  partner can be present once — in person or on a call — to set their passphrase, and
  can be reached later by whatever means the two already use.
- A passphrase-based gate is honest friction, not cryptographic security: a person
  with administrator access can defeat it. Its job is to make removal a conversation
  rather than an impulse.
- Journal entries are private by default and are never included in anything shared
  unless the person explicitly includes them.
- Retention is indefinite by default; the person is the only one who deletes their
  data.
- Layers of enhanced protection are the largest engineering item in v1 and carry
  their own go/no-go checkpoint. Basic protection alone constitutes a shippable
  product, and no other capability in this specification depends on the enhanced
  layers landing.

## Out of Scope for v1

- Mobile applications of any kind.
- Browser extensions.
- Any web-based or served user interface.
- Cloud sync, accounts, and remote backup.
- Any paid tier, trial, or license mechanism.
- More than one partner.
- Data export, deeper analytics, and themes — fair to charge for later, absent from
  v1.
- Automatic updating of preset category contents.
- Blocking of applications, protocols, or content types other than domain-addressed
  sites.
