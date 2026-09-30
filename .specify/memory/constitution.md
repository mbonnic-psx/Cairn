<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0
Rationale: MINOR. One section added, "Delivery Method", when the Slipwai delivery
method was adopted around this repository (make verify, /drive). It states, in
Cairn's terms, the delivery practices that method's constitution gate holds. Where
a practice would reach past Principles I–VII (remote alerting, a hosted release
channel), the section says so and the principle wins. Principles I–VII and the
Enforcement Architecture Constraints are unchanged, so no NON-NEGOTIABLE principle
is amended.

Modified principles: none
Added sections:
  - Delivery Method: trunk-based integration (in force); agent-generated change;
    local-only observability and audit; security and privacy; versioning and
    compatibility; pull-request gates; and five practices written as targets not
    yet in force, each with what holds today (one path to production, build once,
    fast feedback, acceptance-driven testing, the typed domain and its boundary).
Removed sections: none

Templates requiring review:
  - .specify/templates/plan-template.md — no edit required; the Constitution
    Check reads this document at runtime and now also covers the Delivery Method.

Downstream artifacts updated:
  - CLAUDE.md — the constitution version it names.

Approved: by the project owner, 2026-09-30, "Approve as written".

Follow-up TODOs: none

Previous amendment, 1.0.0 → 1.1.0:
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

## Delivery Method

How a change is made and reaches trunk. This section came with the delivery method
adopted around this repository (`make verify`, `/drive`), and states that method's
practices in Cairn's terms. Where one of them would reach past Principles I–VII, the
principle wins, and the practice below says so.

<!-- trunk-based-integration: Continuous integration on trunk, in small batches -->
### Continuous Integration on Trunk (NON-NEGOTIABLE)

- Every change MUST integrate to trunk (`main`) at least once per day. Work that has
  not reached trunk is unintegrated, however often a build ran against its branch.
- Where branches are used they MUST be cut from trunk, MUST re-integrate to trunk,
  and MUST live less than a day. Long-lived per-feature branches MUST NOT exist; a
  feature larger than a day ships as slices behind whatever keeps it unreachable
  until it is whole.
- Trunk MUST be releasable at every commit, and a red trunk stops the line: while
  the build is failing, the only permitted work is restoring it.
- A work item MUST be codeable, testable, reviewable and integrable within two days,
  or it is split before it is started.
- Fixes MUST travel forward through trunk. Cherry-picking onto a release branch MUST
  NOT be the route to a release.

<!-- agent-change-same-bar: Agent-generated change meets the same bar -->
### Agent-Generated Change Meets the Same Bar (NON-NEGOTIABLE)

- Agent-generated change MUST pass the same pipeline and the same gates as a
  person's: `make verify`, the seven constitutional guards, and the two guard tests.
  There is no fast lane.
- Humans own intent. An agent MUST NOT edit this constitution, `VISION.md`, or a
  specification's requirements except when a person has asked for that edit.
- When a request would break a principle, or falls outside its constraints, an agent
  MUST stop and ask rather than proceed by guessing.
- An agent works one acceptance scenario at a time, and each MUST end at a green
  commit.

<!-- observability-and-audit: Observability and auditability -->
### Observability and Audit, On the Device Only

Principle II forbids telemetry, so Cairn's observability never leaves the machine,
and its audience is the person using Cairn, never a remote party.

- A diagnostic log, where Cairn writes one, MUST be structured, MUST stay on the
  device, and MUST carry a correlation identifier linking a request from the
  interface to the helper verb it caused and the inventory entry that verb wrote.
- Journal content, paths, query strings and other personally identifying data MUST
  NOT be written to any log. A log records no more than Principle II lets Cairn
  record at all.
- The inventory of rules, keys and files Cairn created (Principle IV) is the audit
  trail of every privileged change. It MUST be retained on the device and readable
  without restoring a backup.
- A problem is detected by verification, never by a remote alert. Protection whose
  verified state is not what Cairn intended MUST be reported where the person looks
  for it, in Cairn's own status (Principle III). Detection MUST NOT produce
  interruptions that the one daily reflection notification (Principle V) does not
  already allow.

<!-- security-and-privacy: Security, privacy, and compliance -->
### Security and Privacy

- Sensitive payloads (journal entries, reach history, and the domains a person
  blocks) MUST NOT be logged, and MUST NOT be sent anywhere (Principle II).
- Secrets MUST come from the platform credential store. The encryption key never
  sits in a file, in configuration, or in the repository, and a committed secret is
  a build-breaking defect.
- Authorisation MUST be enforced by the privileged helper itself on every request.
  The interface is not trusted to have checked, and a request outside the helper's
  fixed set of verbs is refused.
- A person's journal and reach history MUST be erasable, by deletion from inside
  Cairn and by uninstall, without leaving readable data behind.
- Dependencies MUST be scanned in CI, and a known-exploitable critical finding blocks
  release. Scanning is a development-time check and never a runtime network call.

<!-- versioning-and-compatibility: Versioning and breaking changes -->
### Versioning and Compatibility

- Released builds MUST be versioned MAJOR.MINOR.PATCH.
- The helper's verb protocol and the interface's IPC contract are APIs. A breaking
  change to either MUST ship as a new version, and the prior version MUST keep
  working until an upgrade has replaced both sides.
- Stored contracts (configuration, the encrypted stores, the inventory) MUST change
  additively, and readers MUST tolerate unknown fields.
- An upgrade MUST be backward compatible with everything the previous release
  wrote. Data Cairn cannot read MUST NOT be discarded or overwritten (Principle II).

<!-- quality-gates: Pull-request gates, review, and recorded deviation -->
### Pull-Request Gates

- Every pull request MUST pass `make verify` and CI, including the seven
  constitutional guards and the two guard tests.
- A pull request MUST NOT be merged while the pipeline is red, and MUST NOT be merged
  by disabling or weakening a gate.
- A pull request SHOULD change fewer than 200 lines; beyond that a reviewer's defect
  detection falls off.
- A deviation from a principle MUST be recorded in the plan's Complexity Tracking
  table and in the pull request under a "Complexity / Deviation" heading, naming the
  principle and the reason. Silent deviation is a defect.

### Targets, Not Yet in Force

Each practice below comes into force at the rung of the convergence map
(`delivery/docs/convergence.md`) that its marker names. Until then, what holds today
is written under it and binds as written, and the map's *planned* column names the
slice that climbs.

<!-- journey: one-path-to-production at unknown -->
**One path to production, and the pipeline decides.** In force at `one-path`.

- Today: v1 has not shipped, so there is no path to a person's machine yet, and no
  installer is built by CI.
- Next: one release workflow that builds, signs and publishes every platform's
  installer from trunk, and no other route. No slice is planned for it yet.

<!-- journey: build-once-deploy-is-not-release at unknown -->
**Build once, and deploy is not release.** In force at `pipeline-decides`.

- Today: there is no release artifact to build once.
- Next: the installer CI builds is the one that ships, unchanged. Principle II rules
  out remote feature flags: release means a person installs a version, and the only
  toggles are local settings. No slice is planned for it yet.

<!-- journey: fast-feedback at tests-exist -->
**Fast feedback from a deterministic suite.** In force at `fast`.

- Today: the domain, store, enforcement and helper tests run on every change, with
  no GUI toolchain and no network. The tests that need the webview run only in CI's
  `core` job.
- Next: `tests-pass` once `make verify` is green with nothing quarantined, then a
  feedback budget measured for it. No slice is planned for it yet.

<!-- journey: acceptance-driven-testing at tests-exist -->
**Acceptance-driven development, tests first.** In force at `tests-pass`.

- Today: the four mandatory test categories above are covered, and each spec carries
  acceptance scenarios, but a slice is not yet required to start from one failing
  scenario.
- Next: `tests-pass`, the first green `make verify` of this adoption. From then on,
  every slice starts from a failing acceptance scenario.

<!-- journey: strict-typing at named -->
**Strict typing, with untrusted data parsed at the boundary.** In force at `typed`.

- Today: TypeScript runs in strict mode, with no `@ts-ignore` and no `any` in `src/`.
  Rust is checked by `cargo check` and clippy with warnings denied. Both type checks
  run in the gate.
- Next: the structure rungs between `named` and `typed`. No slice is planned yet.

<!-- journey: ubiquitous-language-and-domain-types at named -->
**Ubiquitous language and domain types.** In force at `typed`.

- Today: the vocabulary is agreed and enforced where a person reads it (Principle VI
  and its guard), and domain normalization is pure and centrally implemented.
- Next: the same terms in the types, so that a domain entry is parsed once at the
  edge rather than re-checked. No slice is planned yet.

<!-- journey: hexagonal-boundary at named -->
**The domain isolated from infrastructure.** In force at `hexagonal`.

- Today: `domain/` is held pure by `check-domain-purity.sh`, and platform behavior
  sits behind the services named in Platform abstraction. Nothing yet holds the
  import direction of the other modules.
- Next: declare the layers so that the method's import check holds them. No slice is
  planned yet.

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

**Version**: 1.2.0 | **Ratified**: 2026-08-18 | **Last Amended**: 2026-09-30
