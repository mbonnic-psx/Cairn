# Specification Quality Checklist: Machine-Wide Protection and Quiet Reach Counting

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-20
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Constitution Alignment

Checked against `.specify/memory/constitution.md` v1.1.0:

- [x] **I. The Wall Holds** — FR-019, FR-020, FR-021, FR-022, FR-046, FR-047,
      FR-047a – FR-047e, FR-048; US2 scenarios 2, 3; US4 scenarios 3 – 6, 11.
      **The gap recorded at run 1 is closed**: every reduction of protection now passes a
      fixed 24-hour waiting period that survives restarts and clock changes, so the slice
      no longer relies on a later slice to satisfy this principle.
- [x] **II. Local-First, Zero Telemetry** — FR-024, FR-025, FR-032 – FR-038,
      FR-038a, FR-038b; SC-013, SC-014, SC-016, SC-017. Diagnostic logs are explicitly
      barred from containing a domain or a reach, so encryption at rest cannot be
      undermined by a plaintext log sitting beside it.
- [x] **III. Honest About Limits** — FR-009a, FR-012, FR-014, FR-016, FR-017, FR-018,
      FR-030; SC-003; US2 scenario 5, US3 scenario 6. The blocking guarantee is stated by
      the property that determines it — use of the operating system's own address
      resolution — with the known gap named in the interface rather than left to be
      discovered.
- [x] **IV. Reversible by Construction** — FR-039 – FR-045; SC-011, SC-012; US4 in full.
- [x] **V. Reflection at Distance** — FR-022, FR-023, FR-030a, FR-030b; SC-005, SC-006.
      Recorded reaches are reachable only by deliberate navigation, never on an ambient
      surface and never advertised, so nothing puts a count of craving in front of someone
      during the day.
- [x] **VI. Voice and Gamification Discipline** — FR-050 – FR-053; SC-019, SC-020.
- [x] **VII. Free at the Moment of Need** — FR-054; SC-021.

### Enforcement Architecture Constraints

- [x] **Layer independence** — this slice is layer 1 only and takes no dependency on
      layers 2 or 3 (Dependencies section, FR-018).
- [x] **Layer 1 integrity checked and repaired while active** — FR-013, SC-007.
- [x] **Reach counting: counted default, automatic fallback to silent, user override
      both ways, blocking unaffected** — FR-026 – FR-029, SC-010.
- [x] **Data normalization is pure, central, unit-tested** — FR-004, FR-005, FR-006;
      belongs to the plan for the "how", specified here as behaviour only.

## Notes

**Validation run 1**: 2026-08-20 — 15/16 pass. One issue found and fixed: the
"Out of Scope" list named an enforcement mechanism, which was reworded to name the
capability instead.

**Validation run 2**: 2026-08-20 — all 16 items pass, no regressions.

**Validation run 3**: 2026-08-20, after `/speckit-clarify` — all 16 items still pass,
16/16 → 16/16, no regressions. Five clarifications integrated. The constitution gap
recorded at run 1 is now closed in the spec rather than deferred to the plan, and two
further gaps the sweep surfaced — diagnostic logging as an unencrypted back door around
encryption at rest, and an unfalsifiable coverage claim in SC-002 — were closed.

### Deliberate judgement calls, recorded rather than deferred

1. **A fixed 24-hour waiting period, not a configurable one.** The slice satisfies
   Principle I with a non-configurable delay (FR-047a – FR-047e). The durable part — a
   pending change that survives app restarts, machine restarts, and clock manipulation —
   is built here, so the later gate slice widens an existing path rather than redesigning
   the off-switch. Choosing the duration, the rule that shortening it must itself wait,
   and partner approval remain out of scope.

2. **Reach counts are knowingly incomplete in this slice.** Without browser-workaround
   prevention, a browser resolving addresses on its own is never counted. Rather than
   overstate, FR-009a, FR-018 and FR-030 require Cairn to say what it does and does not
   cover. The v1 PRD records this as an assumption; here it is a requirement with a
   success criterion (SC-003) attached.

3. **The one mechanism name in the document is the recorded input.** The `**Input**`
   field quotes the user's own feature description verbatim, which contains a layer
   mechanism name. It is preserved rather than paraphrased because it is a record of what
   was asked for, not a requirement. No requirement, scenario, entity, or success
   criterion names a mechanism, file, protocol, or platform API.

4. **Four P1 user stories.** Unusual, but each is genuinely required for the slice to be
   coherent: protection that cannot be set up is unusable, protection that shows UI at
   the moment of a reach breaks Principle I, counting cannot be added retroactively, and
   a privileged write path cannot merge without its teardown.

### Ready for

`/speckit-plan`. The Constitution Check has no outstanding violation to resolve — the
sequencing gap that would have gone into Complexity Tracking was closed in the spec
instead. The plan's own risk work should concentrate on durable pending-change state
across clock manipulation, and on marker-based splicing with byte-identical surroundings.
