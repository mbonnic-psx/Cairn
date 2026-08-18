<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Rationale: MINOR. Two amendments arising from the /speckit-clarify session on
specs/001-cairn-v1. Principle I gains a clarification (the acknowledged uninstall
exception); Principle II gains materially new guidance (encryption at rest). A new
binding rule takes precedence over a clarification, so the bump is MINOR, not PATCH.

Modified principles:
  - I. The Wall Holds — added: in-app removal of Cairn passes the active gate; an
    OS-initiated uninstall cannot be intercepted, MUST restore completely, MUST NOT
    be obstructed, and MUST be disclosed as ungated. Closes a divergence with
    specs/001-cairn-v1 FR-070a–c, where the spec was correct and the constitution
    was silent.
  - II. Local-First, Zero Telemetry — added: journal entries and reach history are
    always encrypted at rest with the key in the platform credential store; the user
    is never asked for a passphrase; unavailable key fails closed without data loss;
    exports are labeled unencrypted. Aligns with FR-063a–e.

Added sections: none
Removed sections: none

Templates requiring review:
  - .specify/templates/plan-template.md — Constitution Check must now also cover
    encryption at rest and the uninstall path. No template edit required; the gate
    reads this document at runtime.
  - .specify/templates/spec-template.md — no changes required.
  - .specify/templates/tasks-template.md — no changes required.

Downstream artifacts updated:
  - specs/001-cairn-v1/checklists/requirements.md — constitution follow-up closed.
  - CLAUDE.md — agent guidance regenerated against v1.1.0.

Follow-up TODOs: none
-->

# Cairn Constitution

Cairn is a cross-platform desktop website blocker with a recovery layer built from
end-of-day reflection. Its users include people in genuine recovery from compulsive
online behavior. That fact, not convenience, decides every trade-off below.

This constitution is the enforceable distillation of `VISION.md`. Where the two
disagree, `VISION.md` states intent and this document states the binding rule; the
disagreement itself is a defect and MUST be resolved by amendment rather than by
interpretation at implementation time.

## Core Principles

### I. The Wall Holds (NON-NEGOTIABLE)

When a domain is protected, the connection MUST fail. There is no in-moment path
around it — no "just this once", no snooze, no countdown that ends in access, no
confirmation dialog that can be dismissed into access, no hidden gesture or key
combination that lifts protection.

- Changing what is protected MUST be reachable only from settings the user
  navigates to deliberately. Protection changes MUST NEVER be offered, suggested,
  or surfaced in response to a blocked request.
- Removing or narrowing protection MUST pass whichever recovery gate is active
  (delay, partner approval, or both) before taking effect.
- Removal of Cairn initiated from inside the app is a reduction in protection and
  MUST pass the active gate like any other.
- An uninstall initiated from the operating system cannot be intercepted. On that
  path Cairn MUST restore the system completely, MUST NOT attempt to obstruct,
  delay, or survive the uninstall, and MUST state plainly in the app and the README
  that this path is not gated. This is the single acknowledged exception to the
  gating rule, and it is disclosed rather than concealed (Principle III).
- A blocked request MUST produce no Cairn-authored UI: no interstitial page, no
  notification, no toast, no sound. The user sees their browser's ordinary
  connection failure and nothing else.

**Rationale**: A blocker that can be talked out of its job is worthless to the
person who needed it most. Every in-moment escape hatch is used at the exact moment
the user is least able to refuse it.

### II. Local-First, Zero Telemetry (NON-NEGOTIABLE)

User data MUST NEVER leave the machine. Cairn MUST NOT make outbound network
requests for analytics, crash reporting, feature flags, license checks, update
pings, or content fetches that carry user state.

- No accounts, no cloud sync, no server-side component in v1.
- Reach counting MUST record domain and timestamp only. Full URLs, paths, query
  strings, page content, and request bodies MUST NEVER be recorded or inspected.
- Journal entries, history, and configuration MUST be stored only in the platform
  user-data directory.
- Journal entries and reach history MUST be encrypted at rest at all times, with no
  option to store them unencrypted. The key MUST be held in the platform credential
  store, and the user MUST NEVER be required to set, remember, or enter a passphrase
  to read their own entries.
- If the key is unavailable, Cairn MUST fail closed: report that history cannot be
  opened, continue protecting and recording, and NEVER silently discard, reset, or
  overwrite data it cannot read.
- Anything the user exports is outside this guarantee and MUST be labeled as
  unencrypted at the moment of export.
- Any future network capability MUST be opt-in, disclosed in plain language at the
  point of enabling, and MUST NOT be required for any blocking or reflection
  feature.

**Rationale**: The data Cairn holds is among the most sensitive a person owns. The
only durable guarantee is that it never travels.

### III. Honest About Limits

Cairn MUST NOT overstate what its enforcement can do.

- The app and the README MUST state plainly that a determined user with
  administrator access can defeat Cairn, and MUST NOT imply tamper-proofing.
- Where a platform cannot support a layer or a capability, Cairn MUST report that
  fact in the UI rather than silently doing nothing or claiming success.
- Any operation that affects other user accounts on the machine MUST be disclosed
  in plain language before the first write, with an explicit user confirmation.
- Status shown to the user MUST reflect verified system state, never intended
  state. If verification fails, the UI MUST say so.

**Rationale**: Overselling enforcement to someone in recovery is a betrayal, not a
marketing decision. A user who trusts a wall that isn't there is worse off than one
who knows exactly where the gaps are.

### IV. Reversible by Construction (NON-NEGOTIABLE)

Every modification Cairn makes to the system MUST be attributable, backed up, and
exactly removable.

- Before the first modification of any system file, Cairn MUST write a one-time
  backup preserving the true pre-Cairn state (e.g. `hosts.cairn.bak`).
- Shared files MUST be edited only through marker-delimited sections owned by
  Cairn. Content outside Cairn's markers MUST NEVER be altered or reordered.
- Every resolver rule, policy key, and policy file Cairn creates MUST be namespaced
  and recorded in an inventory sufficient to remove it exactly.
- Teardown MUST run in reverse order of application, MUST verify removal, and MUST
  report any residue it could not remove.
- Uninstall MUST leave the system in its pre-Cairn state.
- Every write path MUST have a corresponding automated teardown test asserting
  byte-level restoration of surrounding content.

**Rationale**: Cairn asks for administrator access to files that can break a
machine's networking. That access is only defensible if every change is exactly
undoable.

### V. Reflection Happens at Distance

Cairn MUST NOT prompt for reflection, journaling, or justification in the moment of
craving or during the working day.

- Reflection MUST be a single, once-daily, end-of-day ritual the user opts into.
- A reach MUST be recorded silently and treated as information, never as failure.
- Cairn MUST NEVER require the user to type, solve, or answer anything in order to
  reach or leave a blocked site — no quizzes, no passphrases, no math problems.

**Rationale**: In the moment of craving, nobody writes anything honest; they type
whatever makes the box go away. Distance is what produces insight.

### VI. Voice, Language, and Gamification Discipline

The interface speaks like a good sponsor, not a firewall log.

- The words *failed*, *denied*, *violation*, *relapsed*, *forbidden*, and *you lost*
  MUST NOT appear in user-facing text.
- Use *protected*, *you reached for this*, *a slip*, *back on the trail*.
- Feature names in the UI MUST be plain-language, never mechanism names — e.g.
  "Prevent browser workarounds", never "DoH policy enforcement".
- Visual constraints: warm palette, generous whitespace, soft motion; serif for
  reflective moments, sans for UI. No locks, no shields, no red as an alarm color,
  no broken chains, no neumorphism.
- Streaks and any later gamification MUST be opt-in, chosen at setup, and
  reversible without ceremony. With streaks off, no counter, no "day N", and no
  broken-chain imagery may appear anywhere. Turning streaks off MUST NEVER produce
  a "you lost your streak" moment.
- A user with streaks disabled MUST have access to every non-streak capability,
  with no feature degraded or hidden.

**Rationale**: Language is the product. A long streak can make a single slip feel
catastrophic and turn the number into the goal instead of the work.

### VII. Free at the Moment of Need (NON-NEGOTIABLE)

Anything a person needs during a vulnerable moment MUST NEVER sit behind a paywall,
a trial timer, an account, or a usage limit.

- Permanently free: all blocking and all enforcement layers, all reach logging, all
  journaling, all pattern and history views, and core partner functionality.
- Fair to charge for later: themes, deeper analytics, multiple partners, data
  export.
- No feature may move from the free set to the paid set. Movement in the other
  direction is always permitted.

**Rationale**: Nobody pays to protect themselves. This predates the product and is
not a pricing decision.

## Enforcement Architecture Constraints

**Layer independence and graceful degradation.**

- Layer 1 (hosts file) is authoritative and always on. Layers 2 (system resolver
  rules) and 3 (DoH lockdown) are enhancements. Failure, absence, or an unsupported
  platform configuration in layer 2 or 3 MUST degrade to layer 1 blocking, never to
  no blocking.
- Each layer MUST be independently toggleable with independent, verified teardown.
- Layer 1 integrity MUST be checked while protection is active; a missing or
  altered managed section MUST be repaired automatically.

**Platform abstraction.**

- Platform-specific behavior MUST sit behind interfaces from day one:
  `ElevationService`, `HostsService`, `ResolverRulesService`, `BrowserPolicyService`,
  `DnsFlushService`, `AutostartService`.
- No platform-conditional logic may leak into UI code or domain logic.

**Privilege.**

- The UI MUST run unelevated. Only privileged writes elevate, scoped to the
  narrowest operation that accomplishes the change.

**Scope of system changes.**

- Browser policy and resolver changes MUST be user-scoped wherever the platform
  offers a user-scoped mechanism. Machine-wide scope is permitted only where no
  user-scoped alternative exists, or as a deliberate, clearly labeled opt-in — and
  in both cases only after the disclosure required by Principle III.

**Reach counting.**

- Counted mode is the default. Silent mode MUST be available and MUST remain fully
  functional as a blocking mode.
- Port availability for the local counting listener MUST be checked at setup and at
  every protection start; on conflict Cairn MUST fall back to silent mode
  automatically and explain why in one sentence. The user may override in either
  direction.
- The counting listener MUST serve no content and MUST drop connections after
  counting.

**Data normalization.**

- Domain normalization (protocol, port, and path stripping; case-insensitive
  deduplication; automatic `www.` variants; paired IPv4 and IPv6 entries) MUST be
  pure, centrally implemented, and unit-tested. Hosts output MUST be UTF-8 with no
  BOM.

## Development Workflow & Quality Gates

- Work follows the Spec Kit flow: constitution → `/speckit-specify` →
  `/speckit-clarify` (when ambiguity is material) → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`.
- Every plan MUST pass a Constitution Check before task generation. A violation
  MUST be resolved or recorded in the plan's Complexity Tracking table with an
  explicit justification; unjustified violations block implementation.
- Mandatory automated test coverage, no exceptions:
  1. Domain normalization and deduplication.
  2. Marker-based splicing — content outside Cairn's markers is byte-identical
     before and after apply, repair, and teardown.
  3. Teardown and uninstall restoration for every layer on every supported
     platform.
  4. Layer 2 and layer 3 failure paths degrade to layer 1 rather than to no
     blocking.
- Privileged code paths (hosts file, resolver rules, browser policy, elevation)
  MUST NOT be merged without a reviewed teardown path and its test.
- User-facing strings MUST be checked against the Principle VI banned-word list
  before release.
- Layers 2 and 3 form their own milestone with a real go/no-go checkpoint. If they
  slip, layer 1 alone ships a working product; no other v1 capability may take a
  hard dependency on them.

## Governance

This constitution supersedes ad-hoc practice and convenience. It binds all specs,
plans, tasks, and implementation work in this repository.

**Amendment procedure.** Amendments MUST be proposed as a change to this file,
stating the principle affected, the rationale, and the migration impact on existing
specs and code. Principles marked NON-NEGOTIABLE (I, II, IV, VII) MAY be amended
only by explicit decision of the project owner, recorded in the Sync Impact Report,
and never in the same change as unrelated edits.

**Versioning policy.** Semantic versioning applies to this document:

- MAJOR — a principle is removed or redefined in a backward-incompatible way.
- MINOR — a principle or section is added, or guidance is materially expanded.
- PATCH — clarification, wording, or non-semantic refinement.

**Compliance review.** Every `/speckit-plan` run MUST evaluate its design against
Principles I–VII and the Enforcement Architecture Constraints. Every review of a
change touching system state, user-facing language, or paid/free boundaries MUST
verify compliance explicitly. Runtime development guidance for agents lives in
`CLAUDE.md`; it MUST NOT contradict this document, and MUST be updated when this
document changes.

**Version**: 1.1.0 | **Ratified**: 2026-08-18 | **Last Amended**: 2026-08-18
