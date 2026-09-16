# Feature Specification: Machine-Wide Protection and Quiet Reach Counting

**Feature Branch**: `002-machine-wide-protection`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "Machine-wide protection and quiet reach counting — the first implementable slice of Cairn v1, carved from specs/001-cairn-v1 User Story 1 and User Story 2. Layer 1 (authoritative hosts-level blocking) only; layers 2 and 3 are out of scope for this slice."

## Context

This is the first implementable slice of Cairn v1. It is carved out of the
product-level specification at [`specs/001-cairn-v1/spec.md`](../001-cairn-v1/spec.md),
covering that document's User Story 1 (set the trail and be protected) and User Story
2 (reaches are counted, quietly).

Every requirement below traces to a requirement in the v1 PRD, noted as `(v1: FR-0NN)`,
or is introduced here to make the slice honest and coherent on its own, noted as
`(slice)`. Nothing in this slice contradicts or extends the v1 PRD's scope.

The slice delivers basic machine-wide protection: the authoritative blocking layer,
quiet reach recording, exact reversibility, and a fixed waiting period standing in front
of any reduction in protection. Enhanced protection layers, the evening ritual, history
views, and the configurable recovery gate are separate slices.

## Clarifications

### Session 2026-08-20

- Q: Should this slice ship a simple interim waiting period on turning protection off, or stay unreleased until the full recovery gate slice lands? → A: This slice includes a non-configurable 24-hour waiting period on any reduction or removal of protection, surviving app restarts, machine restarts, and clock changes. The later gate slice adds a configurable duration and partner approval on top of it. Slice 002 is therefore independently releasable.
- Q: How should today's recorded reaches be visible in this slice? → A: Only on a screen the person navigates to deliberately. Never on the main screen, never at a glance, no tray badge, no notification. Counting is confirmable by someone who goes looking, and invisible to someone who does not.
- Q: Should Cairn write local diagnostic logs, and may they contain protected domain names? → A: Cairn writes local diagnostic logs of events, counts, and outcomes, and never records a domain, a reach, or any part of a request. Failures reference entries by count or position, never by name. Logs remain on the machine and are never transmitted.
- Q: How should the blocking guarantee be scoped and verified across browsers and applications? → A: The guarantee covers every browser and application that uses the operating system's own address resolution. Verification is a fixed per-platform matrix — the platform default browser, Chrome, Firefox, and one non-browser network client, on all three platforms. Anything that resolves addresses independently is named in the interface as not covered in this release.
- Q: How should the protected list reach the 10,000-entry scale requirement in this slice? → A: Entirely from the preset categories, which contain that many domains on their own. Custom entries are added one at a time by typing. Bulk paste and file import are deferred to a later slice.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose what to protect and turn it on (Priority: P1)

Someone opens Cairn for the first time, picks from named categories, adds a few sites
of their own by typing addresses however they come to mind, and turns protection on.
Nothing about the setup is technical. Within a minute the chosen sites stop loading,
and the app shows plainly that protection is on.

**Why this priority**: This is the entry point to the entire product. Without it
there is nothing to protect, nothing to count, and nothing to reflect on later.

**Independent Test**: Complete setup choosing one category and adding one custom site
typed with a scheme, a port, a path, and mixed case. Confirm the entry is stored as a
bare domain, that its `www.` form is covered, and that adding the same site again in a
different form does not create a second entry. Turn protection on and observe the
state change without restarting anything.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the person selects the Social category and
   turns protection on, **Then** every site in that category stops loading within 60
   seconds, with no restart of the machine or of any browser.
2. **Given** the person is adding a custom site, **When** they type
   `https://Example.com:443/some/path`, **Then** `example.com` and `www.example.com`
   are protected, and typing `EXAMPLE.com` afterwards does not add a duplicate.
3. **Given** the person has selected two categories that both contain the same site,
   **When** they remove one of those categories, **Then** the site remains protected
   because the other category still requires it.
4. **Given** the person types an address that would break the operating system or
   Cairn itself, **When** they confirm it, **Then** Cairn declines to protect it and
   says why in one plain sentence.
5. **Given** the person types something that is not a valid address, **When** they
   confirm it, **Then** Cairn says what it could not read, in plain language, and
   leaves the rest of their entries untouched.

---

### User Story 2 - The block holds, everywhere, and says nothing (Priority: P1)

With protection on, a protected site fails to load — in every browser, and in every
application on the machine. The person sees their browser's own ordinary connection
failure. Cairn shows them nothing at all: no page, no notification, no sound, no badge.
If something on the machine alters or removes Cairn's blocking entries, Cairn puts
them back on its own, without saying anything about it during the day.

**Why this priority**: This is the wall. It is the reason the product exists, and the
one thing that cannot be partially delivered.

**Independent Test**: With protection on, attempt a protected site in two different
browsers and in one non-browser application. Every attempt fails to connect and Cairn
displays nothing. Then alter Cairn's blocking entries from outside the app and confirm
they are restored automatically, with nothing shown to the person.

**Acceptance Scenarios**:

1. **Given** protection is on, **When** the person opens a protected site in any
   installed browser or any other application, **Then** the connection fails.
2. **Given** protection is on and a protected site fails to load, **When** the failure
   happens, **Then** Cairn displays nothing at all — no page, no notification, no
   toast, no sound, no badge change.
3. **Given** protection is on and a protected site fails to load, **When** the person
   looks anywhere in what Cairn showed them, **Then** there is no offer, suggestion,
   or link to change or reduce protection.
4. **Given** protection is on, **When** something outside Cairn alters or deletes
   Cairn's blocking entries, **Then** Cairn restores them within 60 seconds without
   being asked and without interrupting the person.
5. **Given** protection is on, **When** the person checks the protection state in the
   app, **Then** what they see reflects what Cairn verified on the machine, and if
   verification did not succeed the app says so rather than showing protection as on.
6. **Given** the person closes the Cairn window, **When** they attempt a protected
   site, **Then** the connection still fails and the reach is still recorded.

---

### User Story 3 - Reaches are counted quietly, or honestly not at all (Priority: P1)

Every time the person reaches for a protected site, Cairn records the domain and the
time, and says nothing. If counting is not possible on this machine, Cairn switches to
silent mode by itself — still blocking completely — and explains the switch in one
sentence rather than pretending to have data it does not have.

**Why this priority**: Reach history cannot be reconstructed after the fact. If it is
not being recorded from the first release, the evening ritual and the pattern views
that follow have nothing true to work with.

**Independent Test**: With protection on and counted mode active, attempt three
protected sites at known times, then navigate deliberately to the reaches screen and
inspect today's recorded reaches. All three appear
with the correct domain and time, nothing else was recorded, and nothing was shown to
the person during the attempts. Then occupy whatever counting depends on, restart
protection, and confirm Cairn switches to silent mode on its own while still blocking.

**Acceptance Scenarios**:

1. **Given** counted mode is active, **When** the person attempts a protected site four
   times in an hour and then navigates deliberately to the reaches screen, **Then** it
   shows four reaches for that domain with their times.
2. **Given** counted mode is active and reaches have been recorded today, **When** the
   person uses the app without navigating to the reaches screen, **Then** no count, total,
   or indication of today's reaches appears anywhere — not on the main screen, not in the
   tray, not as a badge.
3. **Given** any mode, **When** a reach is recorded, **Then** the stored record contains
   the domain and the timestamp only — no path, no query, no page content.
4. **Given** something else on the machine prevents Cairn from counting, **When**
   protection starts, **Then** Cairn switches to silent mode on its own, still blocks
   completely, and explains the switch in one sentence.
5. **Given** Cairn has switched to silent mode on its own, **When** the person opens
   settings, **Then** they can turn counted mode back on, and can also choose silent
   mode deliberately when counting is available.
6. **Given** Cairn was not running for part of a day, **When** the person views that
   day's reaches, **Then** Cairn states that counting covers only the time it was
   running, rather than presenting the count as complete.
7. **Given** recorded reaches exist, **When** the stored data is inspected directly
   outside the app, **Then** no domain history is readable.
8. **Given** the encryption key cannot be reached, **When** Cairn starts, **Then** it
   reports that history cannot be opened, keeps protecting, keeps recording, and does
   not discard, reset, or overwrite the existing history.

---

### User Story 4 - Protection comes off deliberately, and the machine is exactly as it was (Priority: P1)

The person deliberately navigates into settings and asks to turn protection off. Cairn
does not act on it immediately: the request waits a day, and protection stays fully in
force for the whole of that day. The person can call the request off at any point. When
the day has passed and the request still stands, Cairn removes everything it put in
place, checks that the removal actually happened, and confirms that the machine is back
to how it was. Anything Cairn did not author is untouched, down to the byte.

**Why this priority**: Two things meet here, and neither can be dropped. A reduction in
protection that takes effect the moment it is asked for is the in-moment escape hatch the
product exists to refuse. And Cairn asks for administrator access to files that can break
a machine's networking — access only defensible if every change is exactly undoable.

**Independent Test**: Capture the exact contents of every system file Cairn will modify.
Turn protection on, request that it be turned off, and confirm protection stays in force
and the request does not apply early — including across an app restart, a machine
restart, and a system clock moved forward. Let it apply, then compare: content Cairn did
not author is byte-identical, and no Cairn-authored entry remains anywhere.

**Acceptance Scenarios**:

1. **Given** a machine Cairn has never modified, **When** Cairn makes its first
   modification to a system file, **Then** a one-time backup of the true pre-Cairn state
   is written first.
2. **Given** protection is on, **When** any system file Cairn shares with the machine is
   examined, **Then** Cairn's content sits inside clearly marked boundaries it owns, and
   everything outside those boundaries is byte-identical to before.
3. **Given** the person asks to turn protection off, **When** they confirm the request,
   **Then** protection stays fully in force, and the request applies only after 24 hours
   have passed.
4. **Given** a request to turn protection off is waiting, **When** the person restarts the
   app, restarts the machine, or moves the system clock forward, **Then** the request
   still applies no earlier than 24 hours after it was made.
5. **Given** a request to turn protection off is waiting, **When** the person changes their
   mind, **Then** they can call the request off at any point before it applies, and
   protection simply continues.
6. **Given** a request to turn protection off is waiting, **When** the person looks at
   where protection state is shown, **Then** the time remaining is visible there, and
   nowhere else draws them back to it.
7. **Given** the waiting period has passed and the request still stands, **When** teardown
   completes, **Then** Cairn confirms the system is restored, and reports anything it
   could not remove rather than reporting success.
8. **Given** teardown has completed, **When** the machine is inspected, **Then** no entry,
   rule, or file Cairn authored remains.
9. **Given** the person wants to remove their data, **When** they choose to delete it from
   within the app, **Then** all Cairn data on the machine is permanently deleted.
10. **Given** the person wants to reduce or remove protection, **When** they look for a way
    to do it, **Then** the only way is a deliberate navigation into settings, and no other
    screen offers one.
11. **Given** the person adds a site or a category, **When** they confirm it, **Then** the
    increase in protection applies immediately, with no waiting period.

---

### Edge Cases

- **Elevated permission is refused.** The person declines the permission prompt. Cairn
  reports honestly that protection is not in force, shows protection as off, and does
  not present a partially-applied state as protected.
- **Elevated permission is withdrawn mid-session.** A repair cannot be written. Cairn
  reports that verification did not succeed rather than continuing to show protection
  as on.
- **The system file is missing, empty, or unreadable.** Cairn does not create speculative
  content or overwrite what it cannot parse; it reports the condition and leaves the file
  alone.
- **The system file already contains Cairn's markers from a previous install.** Cairn
  adopts the existing marked section rather than adding a second one, and does not
  overwrite the backup it finds.
- **The marked section is partially deleted.** Repair restores the whole section, and
  content outside the markers is still byte-identical afterwards.
- **The machine restarts while protection is on.** Blocking remains in force. Counting
  resumes when Cairn next runs, and the gap is disclosed rather than filled in.
- **Two Cairn instances start at once.** Only one writes; the machine is never left with
  a half-written or duplicated section.
- **The protected list is emptied entirely.** Cairn removes its entries but the marked
  section and the protection state stay coherent — turning protection back on with new
  entries works without a reinstall.
- **The list grows to 10,000 entries through preset categories.** Applying, verifying, and
  repairing all still complete without noticeable slowdown to ordinary browsing, and
  turning a large category on or off stays within the 60-second bound.
- **An entry resolves to something already present in the system file outside Cairn's
  markers.** Cairn does not modify or remove the pre-existing line; its own entry lives
  inside its markers.
- **The system clock is moved to shorten a pending change.** Moving the clock forward does
  not make a pending reduction eligible sooner, and moving it backwards does not extend it
  indefinitely or lose the request.
- **A pending reduction is waiting when the machine is turned off for days.** On the next
  start the request is still there, still accurate about its remaining time, and protection
  was in force throughout.
- **A pending reduction is waiting and the person adds more sites.** The increase applies
  immediately and does not disturb, reset, or cancel the pending reduction.
- **The system clock moves backwards.** Recorded reaches keep their recorded times and
  history is not reordered destructively.
- **The credential store is locked or unavailable at start.** Cairn fails closed on
  history, keeps protecting, and never silently starts a fresh unencrypted store.
- **A diagnostic log is shared for support.** Nothing in it identifies what the person
  protected or reached for, so sharing it cannot expose their history.
- **Disk is full when a reach is recorded.** Blocking is unaffected; the recording failure
  is not surfaced at the moment of the reach.

## Requirements *(mandatory)*

### Functional Requirements

**Choosing what to protect**

- **FR-001**: System MUST let a person choose from the nine named preset categories —
  Adult, AI, Gambling, Gaming, Messenger, News, Shopping, Social, Streaming — during
  setup and at any time after. *(v1: FR-001)*
- **FR-002**: System MUST ship preset category contents as seed data, copy them to the
  person's own data on first run, and allow the person to edit their copy. *(v1: FR-002)*
- **FR-003**: Users MUST be able to add custom entries by typing an address in any
  ordinary form, one at a time. *(v1: FR-003)*
- **FR-004**: System MUST normalize every entry — strip scheme, port, and path, treat
  case as insignificant — and MUST reject entries that are not valid addresses with a
  plain-language reason. *(v1: FR-004)*
- **FR-005**: System MUST protect the `www.` form of a root entry automatically.
  *(v1: FR-005)*
- **FR-006**: System MUST deduplicate entries across categories and custom additions, and
  MUST NOT unprotect an entry that remains required by another source. *(v1: FR-006)*
- **FR-007**: System MUST refuse to protect entries that would break the operating system
  or Cairn itself, and MUST explain the refusal. *(v1: FR-007)*
- **FR-008**: System MUST keep protection effective as the protected list grows to at
  least 10,000 entries, without noticeable slowdown to ordinary browsing. This scale is
  reached through preset categories; custom entries are not a bulk path in this release.
  *(v1: FR-015)*

**Turning protection on**

- **FR-009**: System MUST block protected entries at the level of the whole machine,
  effective in every browser and every application that uses the operating system's own
  address resolution, without requiring per-application configuration. *(v1: FR-009)*
- **FR-009a**: System MUST name, in the interface, the fact that an application resolving
  addresses on its own is not covered in this release, and MUST NOT describe its coverage
  in terms that imply otherwise. *(slice; v1: FR-020)*
- **FR-010**: System MUST apply protection changes within 60 seconds of confirmation, with
  no restart of the machine or of any browser. *(v1: FR-010)*
- **FR-011**: System MUST show protection as a state, with the current state visible at a
  glance, and MUST NOT require the person to remember to apply changes. *(v1: FR-011)*
- **FR-012**: System MUST report protection status from verified system state, never from
  intended state, and MUST say so when verification fails. *(v1: FR-013)*
- **FR-013**: System MUST verify that protection is actually in force while it is on,
  repair its own entries automatically when they are missing or altered, and MUST NOT
  interrupt the person to report the repair. *(v1: FR-012)*
- **FR-014**: System MUST request elevated permission only for the privileged write itself,
  and MUST report honestly — showing protection as not in force — when that permission is
  refused or withdrawn. *(slice; v1 Assumptions)*
- **FR-015**: System MUST prefer changes scoped to the current person's account wherever
  the platform offers that choice. *(v1: FR-019)*
- **FR-016**: System MUST disclose plainly, and require explicit confirmation, before
  making any change that affects other user accounts on the machine. *(v1: FR-018)*
- **FR-017**: System MUST state plainly, in the app and in the README, that a determined
  person with administrator access can defeat it. *(v1: FR-021)*
- **FR-018**: System MUST state plainly which protections are in force in this release, and
  MUST NOT imply coverage of browser-level workarounds that this slice does not provide.
  *(slice; v1: FR-020)*

**What a blocked request produces**

- **FR-019**: System MUST display nothing at the moment of a reach — no page, no
  notification, no toast, no sound, no badge change. *(v1: FR-023)*
- **FR-020**: System MUST NEVER offer, suggest, or link to a protection change in response
  to a blocked request. *(v1: FR-039)*
- **FR-021**: System MUST NEVER provide a moment-of-temptation bypass of any kind — no
  "just this once", no snooze, no countdown ending in access, no dismissible dialog that
  grants access, no hidden gesture or key combination. *(v1: FR-045)*
- **FR-022**: System MUST NEVER require the person to type, answer, or solve anything in
  order to reach a protected site or to keep protection running. *(v1: FR-034)*
- **FR-023**: System MUST produce zero unsolicited notifications or prompts in this
  release. *(slice; v1: FR-030)*

**Reach counting**

- **FR-024**: System MUST record each reach for a protected entry with the domain and the
  time, and MUST record nothing else about it. *(v1: FR-022)*
- **FR-025**: System MUST NEVER inspect, store, or transmit the content of any request, any
  path beyond the domain, or any page. *(v1: FR-027)*
- **FR-026**: System MUST default to counted mode, in which reaches are recorded.
  *(v1: FR-024)*
- **FR-027**: System MUST check, at setup and at every start of protection, whether counted
  mode is possible on this machine, and MUST switch to silent mode on its own when it is
  not, explaining the switch in one sentence. *(v1: FR-025)*
- **FR-028**: System MUST block completely in silent mode; a loss of counting MUST NEVER
  reduce or interrupt protection. *(v1: FR-016, FR-025)*
- **FR-029**: Users MUST be able to override the reach mode in either direction.
  *(v1: FR-026)*
- **FR-030**: System MUST state, wherever counted reaches are shown, that counting covers
  only the time Cairn was running, and MUST NOT present a count as complete for a period
  it did not observe. *(slice; v1: FR-013)*
- **FR-030a**: System MUST make recorded reaches viewable only on a screen the person
  navigates to deliberately, and MUST NOT show a reach count, total, or any indication of
  reach activity on the main screen, in the system tray, as a badge, or in a notification.
  *(slice; v1: FR-023, FR-030)*
- **FR-030b**: System MUST NOT draw the person toward the reaches screen — no prompt, no
  hint, no highlight indicating there is something new to look at. *(slice; v1: FR-030)*
- **FR-031**: System MUST retain reach history indefinitely until the person deletes it.
  *(v1: FR-038)*

**Storage and privacy**

- **FR-032**: System MUST store all data in the person's own user-data location on the
  machine. *(v1: FR-063)*
- **FR-033**: System MUST encrypt reach history at rest at all times, with no option to
  store it unencrypted. *(v1: FR-063a)*
- **FR-034**: System MUST hold the encryption key in the platform's own credential store,
  and MUST NEVER require the person to set, remember, or enter a passphrase to read their
  own history. *(v1: FR-063b)*
- **FR-035**: System MUST state plainly what encryption at rest protects against — a copied
  data folder, a synced backup, an imaged disk — and that it does not protect data from
  someone using the machine while it is unlocked. *(v1: FR-063c)*
- **FR-036**: System MUST fail closed if the key is unavailable: report that history cannot
  be opened, continue protecting and recording, and NEVER silently discard, reset, or
  overwrite unreadable data. *(v1: FR-063d)*
- **FR-037**: System MUST work fully with no account, no sign-in, and no internet
  connection. *(v1: FR-061)*
- **FR-038**: System MUST NEVER transmit any user data off the machine — no analytics, no
  crash reports, no usage pings, no license checks, no update checks. *(v1: FR-062)*
- **FR-038a**: System MUST keep any diagnostic log it writes on the machine, in the
  person's own user-data location, and MUST NEVER transmit it. *(slice; v1: FR-062, FR-063)*
- **FR-038b**: System MUST NEVER write a protected domain, a recorded reach, or any part of
  a request into a diagnostic log. Failures MUST reference entries by count or position
  rather than by name. *(slice; v1: FR-027, FR-063a)*

**Reversibility**

- **FR-039**: System MUST write a one-time backup of any system state it modifies, before
  the first modification, preserving the true pre-Cairn state. *(v1: FR-067)*
- **FR-040**: System MUST modify only content it owns and marks as its own, leaving all
  surrounding content byte-identical. *(v1: FR-068)*
- **FR-041**: System MUST record an inventory of every modification it has made to the
  machine, sufficient to remove each one exactly. *(slice; v1 Key Entities: Change
  Inventory)*
- **FR-042**: System MUST adopt an existing Cairn-marked section rather than creating a
  second one, and MUST NOT overwrite a backup it already finds. *(slice)*
- **FR-043**: System MUST remove all protection completely when protection is turned off,
  run removal in reverse order of application, verify the removal, and report anything it
  could not remove. *(v1: FR-069)*
- **FR-044**: System MUST confirm to the person, after teardown, that the system is
  restored and that content it did not author is untouched. *(v1: FR-069)*
- **FR-045**: Users MUST be able to delete all their Cairn data permanently from within the
  app. *(v1: FR-071)*

**Where protection can be changed**

- **FR-046**: System MUST place every protection change behind deliberate navigation into
  settings. *(v1: FR-039)*
- **FR-047**: System MUST route every reduction or removal of protection through a single
  path, so that no other route to reducing protection exists anywhere in the app.
  *(slice; v1: FR-040)*
- **FR-047a**: System MUST hold every reduction or removal of protection for a waiting
  period of 24 hours before it takes effect. The duration is fixed in this release and is
  not configurable. *(slice; v1: FR-040, FR-040a)*
- **FR-047b**: System MUST keep protection fully in force for the entire duration of a
  pending change. *(v1: FR-041)*
- **FR-047c**: Users MUST be able to cancel a pending change at any time before it applies.
  *(v1: FR-042)*
- **FR-047d**: System MUST keep the waiting period in force across app restarts, machine
  restarts, and changes to the system clock. *(v1: FR-043)*
- **FR-047e**: System MUST make the time remaining on a pending change visible wherever
  protection state is shown, and MUST NOT surface it anywhere that would draw the person
  back to it. *(v1: FR-040c)*
- **FR-048**: System MUST apply increases in protection immediately, without a waiting
  period. *(v1: FR-044)*

**Presence and language**

- **FR-049**: System MUST keep blocking in force, and keep recording reaches, when the Cairn
  window is closed. *(v1: FR-059)*
- **FR-050**: System MUST NEVER use the words *failed*, *denied*, *violation*, *relapsed*,
  *forbidden*, or *you lost* in user-facing text. *(v1: FR-064)*
- **FR-051**: System MUST name features by what they do for the person, never by their
  mechanism. *(v1: FR-065)*
- **FR-052**: System MUST avoid lock, shield, chain, and alarm-red imagery throughout.
  *(v1: FR-066)*
- **FR-053**: System MUST show no streak counter, no "day N", and no chain imagery anywhere
  in this release. *(slice; v1: FR-055)*
- **FR-054**: System MUST keep every capability in this specification free of charge,
  permanently, with no account, trial, or usage limit. *(v1: FR-072)*

### Key Entities

- **Protected Entry**: A single normalized domain and the sources that require it — one or
  more categories, a custom addition, or both.
- **Category Preset**: A named, editable collection of entries shipped as seed data and
  owned by the person after first run.
- **Trail**: What is currently protected — chosen categories plus custom entries — together
  with the reach mode in effect. The schedule, recovery gate, and partner belong to later
  slices.
- **Protection State**: Whether protection is currently in force, since when, and what was
  verified at the last check.
- **Reach Mode**: Counted or silent, whether it was chosen by the person or fallen back to
  automatically, and the reason for an automatic fallback.
- **Reach**: One recorded attempt on a protected domain — domain and timestamp only.
- **Coverage Gap**: A period during which Cairn was not running and therefore not counting,
  recorded so that counts are never presented as complete for time they did not observe.
- **Pending Change**: A requested reduction in protection — what it would change, when it
  was requested, and when it becomes eligible to apply.
- **Change Inventory**: The record of every modification Cairn has made to the machine,
  sufficient to remove each one exactly.
- **Backup**: The one-time capture of pre-Cairn system state, retained for as long as Cairn
  is installed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time person completes setup — categories chosen, custom sites added,
  protection on — in under 5 minutes without consulting documentation.
- **SC-002**: A protected site fails to load in 100% of attempts, in 100 consecutive
  attempts, across the full verification matrix on every supported platform: the platform's
  default browser, Chrome, Firefox, and one non-browser network client.
- **SC-003**: Every application in the verification matrix that resolves addresses on its
  own is named in the interface as not covered, with zero cases of Cairn reporting coverage
  it does not have.
- **SC-004**: Protection changes take effect within 60 seconds, with no restart of the
  machine or of any browser.
- **SC-005**: Cairn displays nothing to the person at the moment of a reach in 100% of
  reaches.
- **SC-006**: Zero reach counts, totals, or indications of reach activity appear on the
  main screen, in the system tray, as a badge, or in any notification, verified by a full
  screen-by-screen sweep with reaches recorded.
- **SC-007**: Over a 30-day period of normal use, Cairn produces zero notifications and zero
  unsolicited prompts.
- **SC-008**: Externally altering or deleting Cairn's blocking entries results in automatic
  repair within 60 seconds in 100% of cases, with nothing shown to the person.
- **SC-009**: In counted mode, recorded reaches match actual attempts within 5% over a
  100-attempt test.
- **SC-010**: When counting is unavailable for any reason, blocking remains fully in force
  in 100% of cases; no counting failure results in unprotected browsing.
- **SC-011**: No pending reduction in protection applies before its 24-hour waiting period
  has elapsed, in 100% of attempts, including across app restarts, machine restarts, and
  system clock changes.
- **SC-012**: Turning protection off restores every file Cairn touched to its exact
  pre-Cairn content, verified byte-for-byte, in 100% of teardowns across all three supported
  desktop platforms.
- **SC-013**: Teardown leaves zero Cairn-authored entries on the machine, verified across all
  three supported platforms.
- **SC-014**: Inspecting Cairn's stored data directly reveals zero readable domain history,
  on all three supported platforms.
- **SC-015**: A person never enters a passphrase to read their own history, in 100% of
  ordinary use.
- **SC-016**: With protection active and 10,000 entries protected, page load time for
  unprotected sites increases by no more than 50 milliseconds.
- **SC-017**: Zero bytes of user data leave the machine over a 30-day period of normal use,
  verified by network capture.
- **SC-018**: Zero protected domain names and zero reach records appear in any diagnostic
  log, verified by an automated scan of all log output produced during a full test run.
- **SC-019**: Zero user-facing strings contain the words *failed*, *denied*, *violation*,
  *relapsed*, *forbidden*, or *you lost*, verified by an automated check over all shipped
  strings.
- **SC-020**: Zero streak counters, day-counts, or chain imagery appear anywhere in this
  release, verified by a full screen-by-screen sweep.
- **SC-021**: 100% of the capabilities in this specification are reachable without payment,
  account, trial period, or usage limit.

## Assumptions

- The person is the administrator of their own machine and can grant elevated permission
  when Cairn asks; without it, Cairn reports honestly rather than failing silently.
- Cairn is a personal recovery tool on a personal machine, not a managed IT deployment;
  changes are scoped to the current account wherever the platform allows.
- The three supported platforms are current Windows, macOS, and Linux desktop releases.
- The interface is a native desktop application. Nothing about Cairn is served over a
  browser, including its own screens.
- A "reach" means an attempt to resolve a protected domain. Multiple attempts from a single
  page load may register as more than one reach; the number is directional, not forensic.
- Layer 1 blocking reaches every application that asks the operating system to resolve an
  address. An application carrying its own resolution bypasses it. That boundary is a
  property of the enforcement layer, not a defect, and is stated rather than hidden until
  the enhanced layers close it.
- Reach counts in this slice are lower than reality for any browser that resolves addresses
  on its own. That gap closes when the enhanced protection layers land, and until then it is
  stated rather than hidden.
- Counting only happens while Cairn is running. Blocking does not depend on Cairn running.
- The preset categories are the realistic source of a large protected list; a person typing
  addresses one at a time will not approach 10,000 entries.
- Preset category contents will drift as sites appear and disappear; the person's ability to
  edit their own copy is the answer here, with no automatic updating.
- Retention is indefinite by default; the person is the only one who deletes their data.
- **This slice is releasable on its own.** Reducing protection passes a fixed 24-hour
  waiting period (FR-047a – FR-047e), which satisfies the requirement that protection can
  only be reduced through a gate. The later slice widens that gate rather than introducing
  it: a duration the person chooses, the rule that shortening it must itself wait, and
  partner approval.
- A fixed waiting period is honest friction, not security: a person with administrator
  access can defeat it. Its job is to put distance between the impulse and the removal.

## Dependencies

- **Recovery gate (later slice).** Constitution Principle I requires every reduction of
  protection to pass the active gate. This slice satisfies that with a fixed 24-hour
  waiting period on a single reduction path. The later slice extends it — a duration the
  person chooses between 5 minutes and 7 days, the rule that a decrease must itself wait out
  the current period, and partner approval — and MUST be able to do so without redesigning
  the path built here.
- **Enhanced protection layers (later slice).** Layers 2 and 3 are the largest engineering
  item in v1 and carry their own go/no-go checkpoint. This slice MUST NOT take a hard
  dependency on them, and MUST NOT imply the coverage they would provide (FR-018).
- **Evening check-in, journal, and history views (later slices).** These consume the reach
  history this slice produces. This slice records that history but presents only today's
  reaches, and only as needed to verify counting.

## Out of Scope for This Slice

Everything below is in v1 but belongs to a later slice. It is listed so the boundary is
unambiguous, not to defer it indefinitely.

- Enhanced protection layers — deeper system-wide coverage, subdomain coverage, and
  prevention of browser workarounds (v1: FR-014, FR-016, FR-017, FR-020).
- The configurable recovery gate: a waiting period the person chooses between 5 minutes and
  7 days, and the rule that shortening it must itself wait out the current period
  (v1: FR-040a, FR-040b). The fixed 24-hour period is in scope; choosing its length is not.
- Applying the gate to ending a scheduled protection period early, to quitting the app, and
  to in-app removal of Cairn itself (v1: FR-049, FR-060, FR-070a).
- The evening check-in, its notification, and journaling (v1: FR-028 – FR-034).
- History and pattern views over any range beyond today (v1: FR-035 – FR-037).
- Schedules and time windows (v1: FR-046 – FR-048).
- Partner setup, approval, and shared summaries (v1: FR-050 – FR-054).
- Streaks, and the setup question that offers them (v1: FR-008, FR-055 – FR-057).
- Starting with the machine, and system tray presence (v1: FR-058, FR-059 beyond keeping
  protection and counting alive while the window is closed).
- Uninstall handling beyond turning protection off from within the app
  (v1: FR-070, FR-070a – FR-070c).
- Adding many custom entries at once — bulk paste, or importing a list from a file.
- Everything already out of scope for v1 as a whole.
