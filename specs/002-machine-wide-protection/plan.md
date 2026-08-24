# Implementation Plan: Machine-Wide Protection and Quiet Reach Counting

**Branch**: `002-machine-wide-protection` | **Date**: 2026-08-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-machine-wide-protection/spec.md`

## Summary

Deliver Cairn's authoritative blocking layer as a Tauri desktop application: a person
chooses preset categories and custom domains, protection goes into force machine-wide
within 60 seconds, reaches are recorded silently with domain and timestamp only, and every
system change is exactly reversible. Reducing protection passes a fixed 24-hour waiting
period that survives restarts and casual clock manipulation.

The architecture turns on one decision (research R1): because automatic repair may not
interrupt the person, per-write elevation is impossible, so Cairn installs **one privileged
helper per platform** exposing a closed set of verbs. The unelevated UI never touches a
system file. Everything else follows from that — the helper owns writes, socket binding,
and the heartbeat that advances the waiting period; the UI owns everything the person sees.

## Technical Context

**Language/Version**: Rust 1.83+ (core, helper), TypeScript 5.x (frontend)

**Primary Dependencies**: Tauri 2.x; `rusqlite` (bundled SQLCipher); `keyring`; `serde`;
`tokio`; React 18; Tailwind

**Storage**: SQLite encrypted with SQLCipher for reach history; plain JSON for configuration
containing no reach data; both under the platform user-data directory

**Testing**: `cargo test` (unit + integration), `proptest` (splicing byte-identity),
`vitest` + Testing Library (frontend), scripted per-platform acceptance runs in CI

**Target Platform**: Windows 10+, macOS 13+, Linux desktop (systemd)

**Project Type**: Native desktop application with a privileged background helper

**Performance Goals**: Protection applied and verified within 60 s (SC-004); ≤50 ms added
resolution latency for unprotected sites at 10,000 entries (SC-016); repair within 60 s of
external alteration (SC-008)

**Constraints**: No outbound network calls of any kind; UI unelevated; reach records limited
to domain and timestamp; content outside Cairn's markers byte-identical; no UI at the moment
of a reach

**Scale/Scope**: 10,000 protected entries (reached through presets, not custom entry); one
person, one machine; ~12 screens; 64 functional requirements, 21 success criteria

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design. Result: **PASS** — no
violations, Complexity Tracking empty.*

### I. The Wall Holds (NON-NEGOTIABLE)

| Rule | How the design satisfies it |
| --- | --- |
| Connection must fail; no in-moment path around | Blocking lives in a system file the UI cannot alter without the helper; the helper exposes no "unblock now" verb at all (`contracts/helper-ipc.md`) |
| Changes reachable only from deliberate settings navigation | Single `request_protection_reduction` path; no other IPC verb reduces protection |
| Reduction passes the active gate | `PendingChange` is the only route to a reduction; the applier refuses any reduction without an eligible pending change |
| A blocked request produces no Cairn UI | The counting listener writes a record and closes the socket. It has no response path, no notification permission, and no channel to the UI |

**Design consequence**: "no in-moment escape hatch" is enforced by the *absence of a verb*
in the privileged interface, not by UI discipline. A future screen cannot accidentally
introduce one.

### II. Local-First, Zero Telemetry (NON-NEGOTIABLE)

- No HTTP client crate is in the dependency set. A CI check fails the build if one appears.
- The listener parser is a pure function capped at the destination name (R2); a unit test
  asserts nothing beyond the domain is retained.
- Reach history is SQLCipher-encrypted with the key in the platform credential store; the
  person never sees a passphrase.
- Key unavailable → fail closed, keep protecting, keep recording, never overwrite (R5).
- Diagnostic logs may not contain a domain or a reach (FR-038b), enforced by a log-scan test.

### III. Honest About Limits

- Protection state is derived from re-reading the system file and comparing, never from
  "we wrote it, so it worked" (`ProtectionState.verified_at`).
- Verification failure surfaces as its own state, distinct from on and off.
- The privileged helper, and the fact that an application resolving addresses on its own is
  not covered, are both disclosed (FR-009a, FR-018).
- Installing the helper affects the machine rather than one account; it is disclosed and
  confirmed before the first write (FR-016).

### IV. Reversible by Construction (NON-NEGOTIABLE)

- One-time backup written by the helper before its first modification, never overwritten.
- Marker-delimited splicing over raw bytes with atomic same-directory rename (R6).
- Every change recorded in the `ChangeInventory` — including the helper's own installation.
- Teardown walks the inventory in reverse, verifies each removal, and reports residue.
- No privileged verb is merged without its teardown verb and a test proving restoration.

### V. Reflection Happens at Distance

- Zero notifications in this slice. No notification permission is requested at all.
- Reaches viewable only by deliberate navigation; no ambient count, badge, or hint
  (FR-030a, FR-030b).
- Nothing must be typed, solved, or answered to reach a site or keep protection running.

### VI. Voice, Language, and Gamification Discipline

- Banned-word check runs over extracted UI strings in CI (SC-019).
- No streak surface exists in this slice, so no streak state is stored.
- Feature names in the UI are plain-language; mechanism names stay in code and in this plan.

### VII. Free at the Moment of Need

- No licensing, account, entitlement, or trial code path exists.

### Enforcement Architecture Constraints

- **Layer independence**: this slice implements layer 1 only. `ResolverRulesService` and
  `BrowserPolicyService` are declared as traits with no implementation, so layers 2 and 3
  attach later without touching the applier.
- **Layer 1 integrity**: verified on a 60-second cycle in the helper; repair is automatic
  and silent.
- **Platform abstraction**: `ElevationService`, `HostsService`, `DnsFlushService`,
  `AutostartService`, `CredentialStore` are traits defined in `core`; platform code lives
  only under `platform/{windows,macos,linux}` and is selected at composition. No
  `cfg!(target_os)` in domain or UI code — enforced by a lint over the `domain` module.
- **Privilege**: UI unelevated; the helper is the only elevated component and exposes a
  fixed verb list.
- **Scope of system changes**: the hosts file is inherently machine-wide, so this is the
  "no user-scoped alternative exists" case — permitted, and disclosed before the first write.
- **Reach counting**: counted by default; port conflict at setup and every protection start
  drops to silent with a one-sentence explanation; user may override either way; the
  listener serves no content and drops the connection.
- **Data normalization**: pure, centrally implemented in `domain::normalize`, unit-tested,
  paired IPv4/IPv6 output, UTF-8 with no BOM.

### Post-Phase-1 re-evaluation

Re-checked against the completed design artifacts. No new violations. Two points worth
recording because the design made them sharper rather than looser:

1. The privileged helper is a *larger* machine-wide footprint than a per-write elevation
   design would have been. It is justified by FR-013 (silent repair) and is fully
   inventoried and torn down, but it raises the stakes on Principle IV — hence the rule
   that no privileged verb merges without its teardown verb and test.
2. Reading the TLS `server_name` / HTTP `Host` field is the minimum inspection that can
   satisfy FR-024, and the purer alternative was rejected on measured platform grounds
   (R2). The parser is therefore treated as a constitution-critical function with its own
   dedicated test.

## Project Structure

### Documentation (this feature)

```text
specs/002-machine-wide-protection/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── helper-ipc.md    # Privileged helper verb list
│   ├── platform-services.md
│   └── ui-ipc.md        # Tauri command surface
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output — not created here
```

### Source Code (repository root)

```text
src-tauri/
├── src/
│   ├── main.rs                  # Tauri app; unelevated; wires composition root
│   ├── ipc/                     # Tauri commands — the only frontend boundary
│   ├── domain/                  # Pure, platform-free, no I/O
│   │   ├── normalize.rs         # Domain normalization + dedup (constitution-critical)
│   │   ├── splice.rs            # Marker splicing over bytes (constitution-critical)
│   │   ├── sni.rs               # Destination-name parse (constitution-critical)
│   │   ├── gate.rs              # Trusted-clock waiting period arithmetic
│   │   └── entries.rs           # Trail, sources, IPv4/IPv6 pairing
│   ├── services/                # Trait definitions only
│   ├── platform/
│   │   ├── windows/ macos/ linux/
│   ├── store/
│   │   ├── history.rs           # SQLCipher; reach records
│   │   ├── config.rs            # JSON; no reach data
│   │   └── inventory.rs         # Change inventory + backup manifest
│   ├── enforcement/             # apply / verify / repair / teardown orchestration
│   └── counting/                # Listener; accepts sockets from helper
├── helper/                      # Separate privileged binary
│   └── src/
│       ├── main.rs              # Fixed verb dispatch; no dynamic paths
│       ├── verbs/               # One module per verb, each with its teardown
│       └── heartbeat.rs         # Trusted clock + integrity cycle
└── tests/
    ├── splice_properties.rs     # proptest: byte-identity outside markers
    ├── normalize.rs
    ├── teardown_restoration.rs
    └── degradation.rs           # counting loss never reduces blocking

src/                             # React frontend, unelevated, no platform logic
├── screens/                     # Setup, Protection, Trail, Reaches, Settings
├── components/
└── ipc/                         # Typed wrappers over Tauri commands

scripts/
├── check-banned-words.mjs       # SC-019
├── check-no-network-deps.sh     # Principle II
└── acceptance/                  # Per-platform verification matrix (SC-002)
```

**Structure Decision**: Two Rust binaries — the unelevated Tauri app and the privileged
helper — sharing a `domain` crate that is pure and platform-free. The split is not
stylistic: it is what keeps the UI unelevated while allowing silent repair, and it puts a
process boundary between hostile input (the listener's parser) and root. Platform code is
confined to `platform/`, and the `domain` module is lint-enforced to contain no I/O and no
platform conditionals, which is what makes the constitution's abstraction rule checkable
rather than aspirational.

## Risks

| Risk | Impact | Go/no-go |
| --- | --- | --- |
| **macOS helper needs a Developer ID** (R1) | No silent repair on macOS without a paid Apple account | Before any macOS helper work. Fallback: per-write elevation, repair disabled, limit stated in UI |
| **10,000 entries may exceed the latency bound** (R7) | SC-016 unmeetable on a platform | Before preset categories are sized. Fallback: stated cap or stated slowdown — never silent dropping |
| **Linux without a Secret Service** (R5) | History unreadable on some Linux setups | Before history UI work. Fallback: fail closed, keep protecting and recording, say so |
| **Browser-owned encrypted DNS** (R9) | A matrix browser may be uncovered on a given machine | Not blocking. Handled by disclosure (FR-009a) until a later slice |
| **Forward clock change while powered off** (R4) | Waiting period shortenable by a determined admin | Not blocking. Accepted and disclosed; consistent with Principle III |

## Complexity Tracking

> No constitutional violations require justification. This table is intentionally empty.
