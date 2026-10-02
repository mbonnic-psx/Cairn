# Feature Specification: The evening check-in and honest history

**Feature Branch**: `003-reflection-and-history`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "The evening check-in and honest history — the second implementable slice of Cairn v1, carved from specs/001-cairn-v1 User Story 3 and User Story 4. One quiet notification at a chosen evening hour, today's reaches presented alongside a free-form journaling space and an optional quote, and history views showing reaches by site, hour of day, and day of week over a chosen range, with a day's reaches and that day's journal entry shown together. Journal entries join reach history inside the existing encryption boundary. Streaks are out of scope and belong to slice 004."

## Context

This is the second implementable slice of Cairn v1, carved out of the product-level
specification at [`specs/001-cairn-v1/spec.md`](../001-cairn-v1/spec.md), covering that
document's User Story 3 (the evening check-in) and User Story 4 (seeing the pattern).

Every requirement below traces to a requirement in the v1 PRD, noted as `(v1: FR-0NN)`, or
is introduced here to make the slice honest and coherent on its own, noted as `(slice)`.
Nothing in this slice contradicts or extends the v1 PRD's scope.

Slice `002` built the protection and the quiet recording beneath this: reaches are already
recorded as domain and timestamp, already encrypted at rest, and the periods when Cairn was
not watching are already recorded alongside them. That slice deliberately presented only
today's reaches, and only as far as verifying that counting worked. This slice is where the
recorded past becomes something a person can sit with.

This is the recovery half of the product. It is what separates Cairn from a blocker.

**Two inherited facts shape this slice more than anything in the description.** First,
slice `002` produces gaps as well as counts — periods when the machine was off or Cairn was
not running — and a history view that renders a gap as a zero would be presenting a blind
spot as a fact. Second, protection can run in silent mode, where no reaches are recorded at
all; a day spent in silent mode has no count to show, only whatever the person is willing
to estimate. Honest history has to carry both without apology and without pretending.

## Clarifications

### Session 2026-08-27

- Q: Should streaks be part of this slice, given that history views are where a streak
  would surface? → A: No. Streaks are slice `004`. The streak choice has to be offered at
  setup, which slice `002` already built, so it is a change to existing code rather than new
  construction here. This slice therefore adds no counter, no "day N", and no chain, and the
  existing guard forbidding them stays absolute for its duration.
- Q: At what granularity may a person delete their reach history? → A: Any granularity they
  choose — one day, a range, or all of it — and the deletion leaves no trace of itself. No
  marker, no gap raised on that day's behalf, no tally of what was removed, and no
  confirmation phrased as a loss. The reasoning is that a person must not be made to feel
  bad for removing their own data. This is deliberately *not* treated as a threat to honest
  history: Principle III obliges Cairn to be honest about **its own** blind spots, and
  someone deleting their own record is exercising ownership, not introducing dishonesty. The
  consequence is accepted openly — a pattern read after a deletion describes the data that
  remains, and Cairn does not editorialise about what is gone.
- Q: May a journal entry be written for a past day the person skipped? → A: Yes, for any past
  day, on exactly the same terms as today, and an entry written later is indistinguishable
  from one written on the day. The freedom comes with a hard constraint attached: Cairn MUST
  NEVER invite it. No count of unwritten days, no "3 days missing", no prompt, no badge,
  nothing presented as outstanding or incomplete. A skipped day offers the same quiet opening
  as any other day. Same reasoning as the deletion answer — a missed day must not become a
  debt, and an invitation to fill it in is how a debt would first appear.

### Session 2026-10-01

- Q: Should Cairn announce the check-in at all? → A: No (the owner: "I dont want the app to
  ask the user to check in ever. It is supposed to be a website blocker and then left and not
  come back"). Cairn raises no notification of any kind. The check-in stays, and is reachable
  only when the person opens the app. The chosen evening hour, the announcement, its
  off-switch, and the `evening-notice` and `evening-settings` slices are withdrawn. Numbered
  requirements and scenarios are kept in place and marked withdrawn, so references to the
  others still hold. Constitution v1.4.0 records the rule.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The evening check-in (Priority: P1)

When the person chooses to, usually in the evening, they open Cairn and sit down with the
check-in. Nothing tells them it is there; it waits. Opening it shows what they reached for today, a
space to write about how the day went and what was going on, and perhaps a quote. It does
not ask them to explain themselves, it does not score the day, and it never calls the day a
failure.

Nothing else in the day interrupts them. Not at a reach, not at a repair, not at all.

**Why this priority**: This is the product's second half. Without it, slice `002` is a
blocker with a good conscience. It depends on reach data existing but delivers value on a
day with zero reaches, because the writing is the point.

**Independent Test**: Leave Cairn running through a day and confirm nothing is ever raised.
Open the check-in, review today's reaches, write an entry, save. Reopen it later
the same evening and the entry is intact and editable.

**Acceptance Scenarios**:

1. **Given** the person opens Cairn, **When** they go to the check-in, **Then** it presents
   today's reaches, a journaling space, and an optional quote — with nothing having
   interrupted them at any point in the day.
2. **Given** Cairn is running and the person never opens the check-in, **When** the day
   passes, **Then** nothing announces, reminds, or invites them, and the check-in stays
   available to be opened from the app.
3. *Withdrawn 2026-10-01 — there is no notification to turn off.*
4. **Given** a check-in is open, **When** the person writes and saves an entry, **Then** it
   is stored against that day and can be reopened and revised.
5. *Withdrawn 2026-10-01 — there is no chosen hour, and nothing is ever announced.*
6. **Given** any check-in, **When** its text is reviewed, **Then** no user-facing string
   contains *failed*, *denied*, *violation*, *relapsed*, *forbidden*, or *you lost*.

---

### User Story 2 - Seeing the pattern (Priority: P2)

Over weeks, the person looks back: which sites they reach for, at which hours, on which
days, and how that has moved. The point is a fact they did not know about themselves — "it
is always between two and four" — not a score.

**Why this priority**: The insight that makes the daily ritual worth repeating. It needs
history to have accumulated, so it follows the check-in, but it is genuinely independent of
it — the patterns are readable with zero journal entries written.

**Independent Test**: Seed several weeks of reach history, open the history view, and
confirm reaches can be read by site, by hour of day, and by day of week, and as movement
over a date range the person chooses.

**Acceptance Scenarios**:

1. **Given** four weeks of history, **When** the person opens the history view, **Then**
   they can break reaches down by site, by hour of day, and by day of week, and change the
   date range.
2. **Given** a chosen date range, **When** the person views it, **Then** they can see how
   the number of reaches has moved across that range.
3. **Given** no journal entries have ever been written, **When** the person opens the
   history view, **Then** every breakdown is fully available.
4. **Given** a range containing no reaches at all, **When** it is displayed, **Then** it
   reads as a quiet range rather than as an achievement or a warning.
5. **Given** any history view, **When** it is displayed, **Then** it contains no counter of
   consecutive days, no "day N", and no chain imagery.

---

### User Story 3 - A day, whole and honest (Priority: P2)

The person opens a single day and sees it as it was: what they reached for, what they wrote,
and — plainly — whatever Cairn does not know about that day. A day the machine was off is
not a day of zero reaches. A day spent in silent mode has no count at all, only what the
person remembers. A day they skipped is simply skipped.

**Why this priority**: This is where the product either earns trust or quietly spends it. A
count presented as complete when it is not is the same sin as claiming coverage Cairn does
not have, and the constitution treats it the same way.

**Independent Test**: Seed a day with reaches and an entry, a day with a recorded gap, a day
spent in silent mode, and a skipped day. Open each and confirm all four read truthfully with
no guilt language.

**Acceptance Scenarios**:

1. **Given** reaches and a journal entry exist for the same day, **When** the person opens
   that day, **Then** they see the reaches and the entry together.
2. **Given** a day containing a period when Cairn was not counting, **When** that day is
   shown anywhere, **Then** the gap is shown alongside the count and the count is never
   presented as the whole of that day.
3. **Given** silent mode was active for a day, **When** the check-in for that day opens,
   **Then** it invites the person to estimate their reaches, and makes clear the estimate is
   theirs rather than a measurement.
4. **Given** an estimate exists for a day, **When** patterns are broken down by site or by
   hour, **Then** the estimate is excluded from those breakdowns, because it carries no site
   and no hour, and its exclusion is visible rather than silent.
5. **Given** the person skips several days, **When** they next open the check-in or the
   history, **Then** the skipped days are shown as skipped, with no penalty, no guilt
   language, and nothing to catch up on.

---

### User Story 4 - The entries are theirs (Priority: P3)

What the person writes belongs to them. It is kept for as long as they want it, it is
readable without a passphrase, it is encrypted the whole time it sits on the disk, and they
can revise or remove it. If Cairn cannot get at the key, it says so plainly and does not
touch the data.

**Why this priority**: Small in surface, load-bearing in trust. It follows the other stories
only because there must be entries before there is anything to keep, revise, or lose.

**Independent Test**: Write entries, revise one, delete one, confirm the rest survive a
restart. Make the key unavailable and confirm Cairn reports it, keeps protecting, keeps
recording, and does not discard or overwrite what it cannot read.

**Acceptance Scenarios**:

1. **Given** a saved entry, **When** the person revises it, **Then** the revision is kept
   against the same day and the earlier text is not retained against their wishes.
2. **Given** a saved entry, **When** the person deletes it, **Then** it is gone and that
   day's reaches are unaffected.
3. **Given** entries and history exist, **When** time passes and the app restarts, **Then**
   nothing is aged out, trimmed, or summarized away.
4. **Given** the key is unavailable, **When** the person opens the check-in or the history,
   **Then** Cairn states that entries cannot be opened, continues protecting and recording,
   and never discards, resets, or overwrites the unreadable data.
5. **Given** journal data at rest, **When** the stored data is examined directly, **Then**
   entry text is not recoverable from it.
6. **Given** a day the person skipped, **When** they open it, **Then** they may write an
   entry for it on the same terms as today, and nothing anywhere invited them to, counted the
   days they had not written for, or described the day as missing or incomplete.
7. **Given** an entry written for a past day, **When** it is displayed anywhere, **Then** it
   is indistinguishable from an entry written on its own day.
8. **Given** the person deletes a day, a range, or all of their reach history, **When** any
   view is displayed afterwards, **Then** the deleted data is simply absent — no marker, no
   gap on its behalf, no report of how much was removed — and the confirmation they saw
   beforehand described the action without implying loss or regret.

---

### Edge Cases

- **The clock moves** — a timezone change, daylight saving, or the person setting it. A
  reach keeps the hour it was recorded at; a day boundary is the local day.
- **Two days meet at midnight while the check-in is open.** The open check-in stays attached
  to the day it was opened for; it does not silently become tomorrow's.
- **The person writes nothing and closes the check-in.** That is not a skipped day and not a
  completed one. No empty entry is stored.
- **A day is partly counted and partly silent.** Both are true of that day, and both are
  shown; the count is not extended over the silent part.
- **A protected site is removed from the trail after being reached.** Its past reaches remain
  in history, because they happened.
- **A single reach at 23:59 versus 00:01.** Falls in the local day it occurred in, and the
  by-hour breakdown places it at its own hour.
- **A deleted day sits inside a period Cairn also did not observe.** The gap is still
  shown, because it is Cairn's own blind spot; the deletion adds nothing to it and is not
  named. The two are never merged into one explanation.
- **Every reach in a range is deleted.** The range reads exactly as a genuinely quiet range
  would, because that is all the remaining data supports — and a quiet range is presented
  neutrally under FR-024.
- **The person writes an entry for a day, then deletes that day's reaches.** The entry
  survives; entries and reaches are deleted independently.
- **Ten thousand protected entries and years of history.** The history view stays usable;
  see SC-006.

### Gaps reviewed — slice `write-tonight` (2026-09-30)

Checked against US1 scenarios 4 and 6, the edge cases, and FR-010 through FR-033 as they bear on writing and
revising tonight's entry. Three states the scenarios did not state, now part of the slice's acceptance:

- **G1 — a save that cannot be kept.** When the write does not go through (the store could not take it, or the
  key became unavailable after the check-in opened), the text the person typed stays on the screen, untouched,
  beside the plain sentence Cairn returns. Nothing says it was saved, and nothing is stored. Losing what someone
  wrote is the one failure a journaling space cannot have.
- **G2 — clearing an entry to nothing.** Saving empty or whitespace-only text over an existing entry is refused
  like any empty save (FR-014), and the saved entry stays as it was. Deleting an entry is `theirs` (US4, FR-015's
  delete), not a side effect of an empty save.
- **G3 — a day with no reaches.** The check-in reads the same whether today held reaches or none. No congratulation
  and no badge for zero (FR-032), and the journaling space is offered either way, because the writing is the point.

Two more, from the adversary pass and decided by the owner on 2026-10-01 ("Yes to all three"):

- **G4 — empty means nothing visible.** Text made only of characters that show nothing — whitespace, zero-width
  and formatting characters, control characters such as NUL, and blank-looking letters such as U+3164 or the
  braille blank — is empty. It is refused like any empty save (FR-014), and a saved entry stays as it was (G2).
  The screen and the store agree on what empty is.
- **G5 — opening Tonight opens today.** Choosing Tonight opens the current local day, unless the space holds
  writing the person has not saved, which stays attached to the day it was written for. A check-in still open on
  a day that has ended names that day's date and no longer calls it today, so nothing is filed under a day the
  screen did not name.

Already stated, and held by this slice as written: the check-in stays attached to the day it was opened for across
midnight (edge cases); closing without writing stores nothing (FR-014); the space is not offered when sealed
(FR-029, `contracts/ui-ipc.md`).

### Gaps reviewed — slice `quote` (2026-10-01)

Checked against US1 scenario 1 (the optional quote), FR-008, FR-009, research R6 and the
`get_quote` contract. Two states the artifacts did not settle, decided by the owner:

- **Q1 — which line shows.** A line is chosen at random from the bundled set each time the
  check-in opens, and stays the same while that check-in stays open; reopening may show
  another. It is never tied to the date (R6 rejects that: it gives a reason to come back for
  the quote, and repeats every year).
- **Q1, revised (owner, 2026-10-01, after the demo: "Its a different quote everytime I switch the page").** One
  line holds for the whole day: moving to another screen and back to the check-in keeps it. A fresh line is chosen
  only when Tonight opens a new day (G5) or Cairn is started again. It is still never derived from the date.
- **Q1, revised again (owner, 2026-10-01: a different line after a restart; "yes" to keeping it).** The line holds
  for the whole local day, across restarts too: once a line is chosen for a day, Cairn remembers it with that day
  and shows it again until a new day opens. It is still chosen at random and never derived from the date. What is
  remembered is a setting, not reach or journal data, so it is readable without the key; a line that is no longer
  in the bundled set, or a remembered day that is not today, means a fresh line.
- **Q2 — turning quotes off.** The person can hide quotes with a quiet switch on the check-in
  itself, since there is no settings screen to hold one. Hidden, the check-in shows no quote
  and nothing in its place; it reads as complete (FR-008). The choice is remembered across
  restarts, can be turned back on the same way, and is a setting, not reach or journal data,
  so it is readable without the key.

Already stated, and held by this slice as written: quotes are bundled and never fetched
(FR-009); a check-in without one is complete (FR-008); every line passes R6's rules and the
banned-words check. A quote shows the same whether today held reaches or none, and whether
the journal is sealed, because it is not about the day.

### Gaps reviewed — slice `history-by-site` (2026-10-01)

Checked against US2 scenarios 1, 3, 4 and 5, FR-019, FR-022–FR-024, SC-005–SC-008, and the standing guard that
keeps reach numbers on the reaches screen alone. Decided by the owner:

- **H1 — where it lives.** On the reaches screen (the header's *Today*), as a choice between *Today* and *Over
  time*, never a screen of its own, so reach numbers stay on the one screen that may hold them
  (`check-no-ambient-counts`).
- **H2 — the range it opens on.** The last 4 weeks, ending today. The person can change it; the choice is not a
  setting and is not remembered.
- **H3 — how it reads.** A calm list of sites, the most reached-for first, each with its count and a soft bar.
  No ranking words (*top*, *worst*, *most problematic*), no colour that means good or bad, no comparison with an
  earlier range, and nothing that congratulates a short list.
- **H4 — what Cairn did not see.** Any period in the range Cairn was not counting is stated above the list, as
  the check-in states it for a day (FR-022, FR-022a); day-level estimates are not counted in it (FR-023).

- **H5 — time Cairn never recorded.** The range states the gaps Cairn recorded, and the standing sentence that
  Cairn counts only while it is running, as Today and the check-in do. Time before Cairn first counted, while
  protection was off, or while the person chose silence is not recorded as a gap, and this slice does not invent
  it. A later slice, `first-counted`, records when Cairn first counted, so every count can state the time before
  it (owner, 2026-10-01: "1. yes").

Already stated, and held by this slice as written: a range with no reaches reads as a quiet range (FR-024); no
streak, day count or chain (scenario 5); everything is available with no journal entry ever written (scenario 3).

### Gaps reviewed — slice `history-by-hour` (2026-10-02)

Checked against US2 scenario 1 (by hour), FR-019, FR-023, the `by_hour` and `dst_approximate` fields of
`contracts/ui-ipc.md`, and research R4. Decided by the owner ("1. yes, 2. show all the hours even if empty, 3. do
this, 4. … just match the time of the computer"):

- **B1 — where it lives.** Inside *Over time*, a choice between *By site* and *By hour*, sharing the same range.
  Not a screen of its own, and nothing in the header (H1 holds).
- **B2 — every hour, quiet ones too.** All 24 hours of the day are shown, an hour with no reaches as plainly as
  any other, because the pattern a person is looking for ("always between two and four") only shows against the
  quiet hours.
- **B3 — how it reads.** The hours in order from midnight, each with its count and the same soft bar as by site.
  No *peak*, *worst hour* or other ranking word, no colour that means good or bad, nothing that congratulates a
  quiet hour.
- **B4 — the hour is the computer's.** A reach counts in the hour the computer's own clock showed when it
  happened, with the offset in force at that instant. So a range that crosses a clock change, or a time zone
  change, is not approximate, and there is no "approximate" note. This supersedes R4's accepted approximation for
  the hour breakdown; `dst_approximate` stays false whenever the hours are exact.

- **B4, clarified (2026-10-02; the host proceeded on the recommendation, to be confirmed by the owner).** "The
  computer's own clock" is the clock as it is set now, with its own daylight-saving history: across a clock change
  the hours are exact; after the computer moves to another time zone, every reach reads in the zone it has now, as
  the Today log already prints times. Keeping the zone a reach happened in would mean recording an offset with each
  reach, which Principle II's "domain and timestamp only" does not allow without an amendment.
- **B5 — a quiet range by hour (same footing).** Both the quiet sentence ("Nothing here for these days.", FR-024)
  and the 24 hours at zero under it (B2).

Already stated, and held by this slice as written: day-level estimates are excluded from the hour breakdown and
the exclusion is stated (FR-023); the time Cairn did not see is stated above the hours, as for by site (H4, H5).

## Requirements *(mandatory)*

### Functional Requirements

**No announcement** *(revised 2026-10-01; see Clarifications)*

- **FR-001**: System MUST NOT announce the check-in, and MUST NOT raise a notification of any
  kind. *(v1: FR-029a, revised)*
- **FR-002**–**FR-004**: *Withdrawn 2026-10-01* — the single notification, its off-switch,
  and its no-repeat rule.
- **FR-005**: System MUST NEVER prompt for reflection, journaling, or justification.
  *(v1: FR-030)*
- **FR-006**–**FR-007**: *Withdrawn 2026-10-01* — the announcement's timing, and the default
  evening hour it needed.

**The check-in**

- **FR-008**: System MUST present, in the check-in, today's reaches, a free-form journaling
  space, and an optional quote. *(v1: FR-031)*
- **FR-009**: System MUST draw any quote from content shipped with the application, and MUST
  NOT fetch a quote. *(slice)*
- **FR-010**: Users MUST be able to reach the check-in at any time from the application,
  *(slice)*
- **FR-011**: System MUST treat a skipped check-in as skipped, with no penalty and no guilt
  language. *(v1: FR-033)*
- **FR-012**: System MUST ask the person to estimate their reaches in the check-in whenever
  silent mode was active for the day, and MUST NOT present an estimate as a measurement.
  *(v1: FR-028)*
- **FR-013**: System MUST NEVER require the person to type, answer, or solve anything in
  order to reach a protected site or to keep protection running. *(v1: FR-034)*
- **FR-014**: System MUST NOT store an empty journal entry, and MUST NOT treat closing the
  check-in without writing as either a completed or a skipped day. *(slice)*

**Journal entries**

- **FR-015**: Users MUST be able to save, revise, and delete their own journal entries.
  *(v1: FR-032)*
- **FR-016**: System MUST store each entry against a single local day, and MUST keep an
  open check-in attached to the day it was opened for. *(slice)*
- **FR-017**: System MUST retain history and journal entries indefinitely until the person
  deletes them. *(v1: FR-038)*
- **FR-018**: Users MUST be able to delete their reach history at any granularity they
  choose — a single day, a range of days, or all of it. *(v1: FR-038)*
- **FR-018a**: System MUST leave no trace of a deletion the person performed: no marker, no
  residue, no "removed" label, and no gap raised on that day's behalf. Deleted data is simply
  absent, and the views read as though it had never been recorded. *(slice)*
- **FR-018b**: System MUST NOT ask the person to confirm a deletion in language that implies
  loss, cost, or a decision they may regret, and MUST NOT report afterwards how much was
  removed. *(slice)*

**History and patterns**

- **FR-019**: Users MUST be able to see reaches broken down by site, by hour of day, and by
  day of week, over a date range they choose. *(v1: FR-035)*
- **FR-020**: Users MUST be able to see how their reaches have moved over time. *(v1:
  FR-036)*
- **FR-021**: System MUST show a day's reaches and that day's journal entry together. *(v1:
  FR-037)*
- **FR-022**: System MUST show the periods when it was not counting alongside any count that
  covers them, and MUST NEVER present a period it did not observe as a period of zero
  reaches. *(slice, from Principle III — the same rule that forbids reporting
  coverage Cairn does not have)*
- **FR-022a**: System MUST treat a gap as a statement about Cairn's own blind spots and never
  about the person's choices. Data the person deleted MUST NOT produce a gap, and the two MUST
  NOT be conflated in any view. *(slice)*
- **FR-023**: System MUST exclude day-level estimates from breakdowns by site and by hour,
  and MUST make that exclusion visible rather than silent. *(slice)*
- **FR-024**: System MUST present a range with no reaches neutrally, as neither an
  achievement nor a warning. *(slice)*
- **FR-025**: System MUST retain the reaches of an entry that has since been removed from the
  trail. *(slice)*
- **FR-026**: Users MUST be able to write a journal entry for any past day, including a day
  they skipped, on the same terms as the current day. *(slice)*
- **FR-026a**: System MUST NOT distinguish an entry written later from one written on its own
  day — no "written later" label, no timestamp of composition shown beside it, no visual
  difference. *(slice)*
- **FR-026b**: System MUST NEVER invite, suggest, count, or draw attention to the days a
  person could still write for. A skipped day offers the same quiet opening as any other day
  and MUST NOT be presented as outstanding, missing, incomplete, or as anything to catch up
  on. *(slice)*

**Storage**

- **FR-027**: System MUST encrypt journal entries at rest at all times with no option to
  store them unencrypted, holding the key in the platform credential store. *(v1: FR-063a, FR-063b,
  Principle II)*
- **FR-028**: System MUST NEVER require the person to set, remember, or enter a passphrase
  to read their own entries. *(v1: FR-063b, Principle II)*
- **FR-029**: System MUST fail closed when the key is unavailable — report that entries
  cannot be opened, continue protecting and recording, and never silently discard, reset, or
  overwrite data it cannot read. *(v1: FR-063d, Principle II)*
- **FR-030**: System MUST store journal entries only in the platform user-data directory,
  and MUST make no outbound network request of any kind. *(v1: FR-062, FR-063,
  Principle II)*

**Voice**

- **FR-031**: System MUST NOT use the words *failed*, *denied*, *violation*, *relapsed*,
  *forbidden*, or *you lost* in any user-facing text. *(v1: FR-064, Principle VI)*
- **FR-032**: System MUST present a reach as information, and MUST NEITHER congratulate nor
  shame the person for any count, any absence of a count, or any journal entry. *(Principles V
  and VI; the v1 PRD carries this as voice rather than as a numbered requirement)*
- **FR-033**: System MUST NOT display a counter of consecutive days, a "day N", or chain
  imagery anywhere in this slice. *(v1: FR-055, FR-066, Principle VI)*

### Key Entities

- **Daily Check-in**: One day's record — the day's reaches or the person's estimate, the
  journal entry if there is one, and whether the day was skipped. Belongs to exactly one
  local day.
- **Journal Entry**: Free-form text the person wrote, attached to one day, encrypted at
  rest, revisable and deletable by them alone.
- **Reach Estimate**: A day-level number the person supplied for a day spent in silent mode.
  Carries no site and no hour, and is never a measurement.
- **Coverage Gap**: A period when Cairn was not counting, produced by slice `002` and
  consumed here so that no count is presented as more complete than it is.
- **Pattern View**: A derived summary of reaches over a chosen range — by site, by hour of
  day, by day of week, and as movement across the range. Derived on demand, never a stored
  score.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across a 7-day observation with Cairn running, zero notifications are raised,
  and the check-in is reachable from the app on all 7 days — verified by a full count of
  every notice raised.
- **SC-002**–**SC-003**: *Withdrawn 2026-10-01* — they measured the announcement.
- **SC-004**: Zero prompts for reflection, journaling, or justification appear anywhere,
  verified by a full screen-by-screen sweep with reaches recorded
  and protection active.
- **SC-005**: A person with four weeks of history can answer "which site, which hour, which
  day of week do I reach for most" in under 60 seconds, without documentation.
- **SC-006**: With 10,000 protected entries and 2 years of recorded history, every history
  breakdown and range change presents its result without the person perceiving a wait.
- **SC-007**: Every period Cairn did not observe is visible wherever a count covering it is
  shown, with zero cases of an unobserved period being presented as zero reaches.
- **SC-008**: Zero day-level estimates appear inside a by-site or by-hour breakdown, and
  every such breakdown that had an estimate excluded says so.
- **SC-009**: Zero user-facing strings contain *failed*, *denied*, *violation*, *relapsed*,
  *forbidden*, or *you lost*, verified by an automated check over all shipped text.
- **SC-010**: Zero consecutive-day counters, "day N" labels, or chain imagery appear
  anywhere, verified by an automated check.
- **SC-011**: Journal entry text is not recoverable from the stored data by direct
  examination, in 100% of attempts.
- **SC-012**: With the key unavailable, Cairn reports the condition, protection remains in
  force, recording continues, and 100% of the unreadable data is still present and unmodified
  afterward.
- **SC-013**: Zero outbound network connections are observed over a 7-day period of ordinary
  use including daily check-ins.
- **SC-014**: Journal entries and history survive 100 application restarts and 10 machine
  restarts with no loss, trimming, or summarization.
- **SC-015**: A skipped day is presented as skipped, with zero guilt language and zero
  prompts to make it up, in 100% of cases.
- **SC-016**: Across a full screen-by-screen sweep with several skipped days present, zero
  surfaces count, list, total, or draw attention to the days not yet written for.
- **SC-017**: After a deletion of any granularity, zero markers, gaps, residue, or removal
  reports attributable to that deletion appear in any view, verified by comparing every view
  against the same data set recorded without the deleted days.
- **SC-018**: Zero deletion confirmations or post-deletion messages contain language of loss,
  cost, regret, or quantity removed.

## Assumptions

- **Quotes ship with the application.** No network is available and none may be added, so
  the quote pool is bundled content. "Optional" is read as *the person may turn quotes off*,
  and also as *a check-in without one is still complete*.
- **A day means the local calendar day**, and a reach belongs to the day it was recorded in.
  This slice does not introduce a configurable day boundary.
- **Entries remain revisable after their day closes.** The v1 PRD's FR-032 places no time
  bound on revising an entry, and a bound would mean a person cannot correct their own words.
  The PRD's phrase "revised until the day closes" is read as describing the same-evening case
  rather than imposing a deadline.
- **Slice `002`'s recorded history is sufficient input.** Reaches carry domain and timestamp,
  gaps are already recorded, and the encryption boundary and its key already exist. This
  slice adds journal entries and estimates to that boundary rather than creating a new one.
- **Estimates are day-level only.** A person asked to remember a day cannot be asked to
  remember which hour and which site, so an estimate is a single number.
- **History is read-only apart from deletion.** Nothing in this slice lets a person alter a
  recorded reach or add one that did not happen; FR-018 governs removal alone. Journal
  entries are the one thing the person authors, and those they may write, revise, and remove
  freely for any day.

## Dependencies

- **Slice `002` (machine-wide protection).** This slice consumes the reach history, the
  coverage gaps, the reach mode, and the encryption key that slice produced. It adds to that
  storage boundary and MUST NOT create a second one.
- **The standing check that forbids all notifications stays absolute.** Slice `002`
  guaranteed silence by declining the capability to notify at all. This slice once planned to
  rewrite that check for a single daily notice; with the notice withdrawn (2026-10-01), the
  capability is removed again and the check forbids it everywhere, as it did in slice `002`.
- **The standing check that forbids streak surfaces stays absolute for this slice** and MUST
  continue to pass unchanged. Streaks are slice `004`.
- **An unresolved question inherited from slice `002` touches this work.** Whether every
  supported platform can actually hold a key in its credential store is still unmeasured,
  and that answer governs the fail-closed path FR-029 depends on. Separately, SC-006's
  history-at-scale bound is a measurement this slice owns rather than inherits.

## Out of Scope for This Slice

Everything below is in v1 but belongs to a later slice. It is listed so the boundary is
unambiguous, not to defer it indefinitely.

- **Streaks** — the opt-in choice at setup, the counter, and the rewrite of the streak guard
  (v1: FR-008, FR-055, FR-056, FR-057; v1 User Story 10). Slice `004`.
- **Enhanced protection layers** — deeper coverage, subdomain coverage, and prevention of
  browser workarounds (v1: FR-014, FR-016, FR-017, FR-020).
- **The configurable recovery gate** — a waiting period the person chooses between 5 minutes
  and 7 days, and partner approval (v1: FR-040a, FR-040b, FR-050 – FR-054). The fixed
  24-hour period built in slice `002` continues to apply unchanged.
- **Schedules** — time windows during which protection is active (v1: FR-046 – FR-049).
- **Export and shared summaries** — anything that carries data off the machine, including the
  unencrypted-export labeling that would accompany it (v1: FR-051, FR-063e).
- **The tray, autostart, and protection before first launch** (v1: FR-058 – FR-061).
