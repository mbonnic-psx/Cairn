# Specification Quality Checklist: The evening check-in and honest history

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-27
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain
- [X] Requirements are testable and unambiguous
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic (no implementation details)
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Validation History

### Iteration 1 — 2026-08-27

Three issues found and fixed before this checklist was first recorded:

1. **Seven traceability citations pointed at the wrong v1 requirements.** Banned words were
   cited as v1 FR-055 (which is the streak-surface rule) rather than FR-064; the fail-closed
   clause was cited as FR-063c (the plain-statement clause) rather than FR-063d; the
   no-counter rule was cited as FR-058 (autostart) rather than FR-055; and one requirement
   cited FR-056 for a rule the v1 PRD carries as voice rather than as a numbered
   requirement. All 39 distinct citations now resolve against a requirement that exists and
   says what is claimed, verified mechanically.
2. **Two file paths and three task identifiers appeared in the Dependencies section**,
   against the project rule that a spec describes what and why and never how. Both
   dependencies were rewritten to describe the standing automated checks by what they
   guarantee rather than by where they live. The sibling slice `002` names zero paths; this
   spec now matches.
3. **A gap-honesty requirement cited v1 FR-030**, which is the no-prompting clause. The
   basis is Principle III, and the requirement now says so.

### Iteration 2 — 2026-08-27

Both open markers resolved by the project owner, on a single stated principle: *nothing may
make the person feel bad for deleting something or for missing a day.*

- **FR-018** — deletion at any granularity the person chooses, leaving no trace of itself.
- **FR-026** — a journal entry may be written for any past day, indistinguishable from one
  written on the day.

That principle ruled out the option this spec's author had recommended for both questions.
Each recommendation had carried a visible marker — a gap where data was removed, a "written
later" label — and each marker was, on inspection, a small accusation. The decision was
taken as given and two consequences were then followed through, because an implementer
working from the bare answers would have reintroduced exactly what the answers rejected:

1. **A deletion must not surface as a gap** (FR-018a, FR-022a). The gap machinery already
   exists for periods Cairn did not observe, and rendering a deleted day through it would
   have recreated the rejected marker by the shortest available path. Gaps are now explicitly
   scoped to Cairn's own blind spots and never to the person's choices.
2. **Backfill must never be invited** (FR-026b). Permission to write for a past day, with no
   rule against advertising it, invites a count of unwritten days — and a missed day would
   have become a debt, which is the same feeling by another route. Inviting, counting, or
   drawing attention to unwritten days is now forbidden outright.

Also added: three acceptance scenarios, three edge cases covering the interaction between
deletion and genuine gaps, and four success criteria (SC-016 – SC-018) making both rules
verifiable rather than aspirational.

**One consequence recorded openly rather than mitigated.** A pattern read after a deletion
describes only the data that remains, and Cairn does not editorialise about what is gone.
This is not judged a conflict with Principle III: that principle obliges Cairn to be honest
about **its own** limits, and a person removing their own record is exercising ownership, not
introducing dishonesty. The distinction is stated in the spec rather than left implicit.

## Notes

- All 17 checklist items pass. No blockers remain; the spec is ready for `/speckit-plan`.
- `/speckit-clarify` is not required — both questions it would have surfaced were resolved
  with the project owner during specification and are recorded under Clarifications.

---

## Planning Phase — 2026-08-27

`/speckit-plan` complete. Artifacts: `plan.md`, `research.md`, `data-model.md`,
`contracts/ui-ipc.md`, `contracts/patterns.md`, `quickstart.md`.

**Constitution Check: PASS**, with one recorded shortfall and no unjustified violations.

- **C1 — the announcement cannot fire while Cairn is not running.** There is no tray and no
  autostart until a later slice, so an evening hour that passes with the app closed announces
  nothing. Recorded with its closing condition (v1 FR-058 – FR-061) rather than glossed. Not a
  release blocker: the check-in is always available un-announced, and FR-003 already makes the
  reminder optional. The three alternatives — announcing late, letting the privileged helper
  do it, or saying nothing — were each rejected on a named principle.

**Five findings from reading the built code that the specification phase did not have:**

1. **Four standing guards must change, not two.** The specification named the notification
   and streak guards. Reading the code found three more constraints in play: the
   ambient-counts check hardcodes `Reaches.tsx` as the only screen that may show reach data,
   an ESLint rule restricts the reach-data import to that same file, and a second ESLint rule
   forbids the `Notification` constructor outright. The plan treats widening any of them as a
   defect unless the guard ends up forbidding more than it did before.
2. **Fail-closed had an unspecified write half.** The constitution's clause is written about
   reading. A journal introduces the mirror case — text typed into a box that cannot store it
   — and the only option that does not lose someone's writing is to not offer the box.
3. **The pure layer cannot read local time, and Rust has no local clock.** Bucketing by hour
   and weekday is inherently local; `domain/` may not read a clock; the dependency policy
   resists a timezone crate. Passing the offset inward satisfies all three at the cost of a
   stated DST approximation.
4. **Deletion and gaps had to be actively separated.** Both are absences of data, and the gap
   machinery already exists — rendering a deleted day through it was the shortest path in the
   codebase, and would have recreated the visible marker the project owner explicitly
   rejected. FR-022a exists because the easy implementation is the wrong one.
5. **`TrustedClock` is deliberately not reused for the announcement.** It resists a person
   shortening a wait, because a shortened wait buys access. An extra reminder buys nothing, so
   the threat model does not carry over and the announcement keys to the local calendar day
   instead — which is also the only thing that can express "9pm".

**Two go/no-go items remain open and are not Claude's to invent:**

- **R1** — whether the notification dependency admits anything network-capable. `cargo` is
  unavailable on this machine, so the build graph could not be resolved. A fallback ladder is
  designed, and the first rung needs no new dependency at all on Linux, since the credential
  store already brings a D-Bus client into the tree.
- **R7** — SC-006's history-at-scale bound must be measured, not assumed.

**Ready for `/speckit-tasks`.** R1 should be sequenced as an early spike, since the
announcement's implementation depends on its outcome.

---

## Tasks Phase — 2026-08-27

`/speckit-tasks` complete. `tasks.md`: **79 tasks**, T001–T079, across 7 phases. Format
validated mechanically — every task carries a checkbox, a sequential id, its story label where
one applies, and a file path.

| Phase | Tasks | Purpose |
| --- | --- | --- |
| 1 Setup | T001–T009 | The R1 spike, and the four guard modifications — before the code they judge |
| 2 Foundational | T010–T023 | Pure arithmetic, the store extensions, the platform seam. Blocks everything |
| 3 US1 (P1) | T024–T038 | The evening check-in — the MVP |
| 4 US2 (P2) | T039–T047 | Seeing the pattern |
| 5 US3 (P2) | T048–T058 | A day, whole and honest |
| 6 US4 (P3) | T059–T069 | The entries are theirs |
| 7 Polish | T070–T079 | The measurements, the sweeps, the docs |

**Two tasks are guards in disguise** and were called out as such, because neither property can
be seen by reading code:

- **T050** proves that no command, field, or return value anywhere counts or totals the days
  without entries. FR-026b is a property of the whole surface, not of one screen, so a
  screen test could not establish it.
- **T059** proves a deletion leaves no trace, by comparing every view against the same data
  recorded without the deleted days and asserting they are indistinguishable. An absence that
  is correctly absent looks exactly like a bug that dropped the wrong rows; only the
  comparison separates them.

**One deliberate cross-story coupling**, recorded rather than engineered away: US3 depends on
the `DayView` shape and `get_day` from US1 (T029), extending what that view surfaces rather
than redefining it. Two independent definitions of what a day is would drift, and the drift
would show up as a day reading differently in two places — which is the exact failure this
slice exists to prevent.

**Sequencing constraint that is not a preference**: a new command is classified in
`ipc_surface.rs` in the same task that exposes it, never as a follow-up. That test's whole
value is that an unclassified command cannot reach the interface, and a deferred
classification task is a window where it could.

**Ready for `/speckit-implement`**, with T001 first — the announcement's implementation
(T028) cannot be written before the dependency question is resolved.
