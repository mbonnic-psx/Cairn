# Phase 0 Research: Machine-Wide Protection and Quiet Reach Counting

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-20

Ten questions had to be answered before a design could be committed. Four of them
(R1, R2, R4, R7) materially shape the architecture; the rest settle mechanics.

Items marked **SPIKE** are decisions whose direction is settled but whose feasibility
must be proven on real hardware before the dependent work starts. They are listed
again in `plan.md` under Risks with their go/no-go points.

---

## R1. How does an unelevated UI perform repeated privileged writes without prompting?

**Decision**: Install a single privileged helper component per platform, once, at first
protection-on. The unelevated UI never writes system files; it asks the helper over a
local, peer-authenticated channel. The helper exposes a closed set of operations and
nothing else.

**Rationale**: FR-013 requires Cairn to repair its own entries automatically and
explicitly forbids interrupting the person to do it. An elevation prompt *is* an
interruption, and a prompt that appears unbidden during the day would additionally
function as a reminder of protection — close to the ambient surface FR-030a rules out.
Per-write elevation therefore cannot satisfy FR-013. A helper also keeps the UI
unelevated as the constitution requires, and narrows the privileged surface to a fixed
verb list rather than "whatever the app decides to write".

**Mechanism per platform**:

| Platform | Helper form | Channel | Peer check |
| --- | --- | --- | --- |
| Windows | Windows Service, `LocalSystem`, installed elevated once | Named pipe with a DACL limited to the installing user's SID | Pipe ACL + `GetNamedPipeClientProcessId` |
| macOS | `launchd` privileged helper installed via `SMAppService` | XPC | Code-signing requirement on the connecting peer |
| Linux | `systemd` system unit | Unix domain socket in a root-owned directory | `SO_PEERCRED` uid match |

**Alternatives considered**:

- *Elevate per write.* Rejected: cannot satisfy FR-013 without interrupting, and produces
  a prompt storm during ordinary use.
- *Run the whole app elevated.* Rejected outright by the constitution — the UI must run
  unelevated.
- *setuid helper binary invoked per operation.* Rejected on Linux/macOS: a setuid binary
  is a larger and more dangerous attack surface than a socket-activated service with a
  fixed verb list, and it still cannot act on a timer without the UI running.
- *Make the system file immutable while protection is on* (`chattr +i`, `uchg`, ACL deny)
  *so repair is rarely needed.* Rejected as the primary mechanism, and deferred entirely:
  it prevents other software from making legitimate edits to content Cairn does not own,
  which cuts against FR-040's promise about surrounding content. Revisit only as
  defence-in-depth after layer 1 is stable.

**Consequences that must be carried into the spec's honesty requirements**: Cairn installs
a background privileged component. That is a disclosable fact under Principle III, it must
appear in the Change Inventory (FR-041), and its removal is part of teardown (FR-043).

**SPIKE — macOS code signing.** `SMAppService` privileged helpers require a Developer ID
signature and a hardened runtime. A free, local-first, no-account product still needs a
paid Apple Developer account to ship a working macOS build. **Go/no-go before any macOS
helper work begins.** If unavailable, macOS degrades to per-write elevation with automatic
repair disabled, and that limit must be stated in the UI under FR-018 — it does not
degrade to no blocking.

---

## R2. How does the counting listener learn which domain was reached?

**Decision**: Protected domains resolve to loopback. The listener accepts the connection,
reads **only** the destination name the client volunteers — the TLS `server_name`
extension in the ClientHello, or the HTTP `Host` header — records domain and timestamp,
and closes the connection without reading another byte or writing a response.

**Rationale**: FR-024 requires the domain, so something must identify it. This reads
exactly the field that names the destination and nothing else: no path, no method, no
headers beyond `Host`, no body, no response. The constitution's counting rule ("serve no
content and drop connections after counting") is satisfied literally. The read is bounded
by a fixed byte cap and a short timeout so a connection cannot be used to stream anything
into Cairn.

**Alternatives considered**:

- *Give every protected domain its own loopback address (`127.x.y.z`) so the destination
  address alone identifies it, with zero request inspection.* This is the strictly purer
  option and was the preferred design until it broke on scale. Linux and Windows route all
  of `127.0.0.0/8` to loopback without configuration, but macOS configures only
  `127.0.0.1` — every additional address needs an interface alias. FR-008 requires 10,000
  entries, and 10,000 `lo0` aliases is not a viable system change to make or to tear down.
  **Rejected on macOS scale**, and rejected outright rather than kept as a
  platform-conditional second code path.
- *Count without identifying the domain.* Rejected: FR-024 requires the domain, and a
  count with no domain is not usable by the history and check-in slices.
- *Resolve to `0.0.0.0` and do not listen at all.* This is precisely silent mode
  (FR-027/FR-028), and remains the fallback — not the default.

**Constraint this places on implementation**: the parser must be a pure function over a
byte slice returning `Option<Domain>`, with a hard cap, no allocation of the remainder, and
a unit test asserting that nothing beyond the name is retained. This is the single most
privacy-sensitive function in the slice and is called out as such in `data-model.md`.

---

## R3. How does the listener bind ports 80 and 443?

**Decision**: The privileged helper binds the loopback sockets and hands the listening file
descriptors to the unelevated process, which does all accepting and parsing. On Windows the
helper holds the sockets and forwards accepted connections.

**Rationale**: Ports below 1024 need privilege on macOS and Linux. Binding in the helper
and parsing outside it keeps the untrusted-input parser — the riskiest code in the slice —
out of the privileged process. Descriptor passing over the existing Unix socket
(`SCM_RIGHTS`) is well-trodden.

**Alternatives considered**: `CAP_NET_BIND_SERVICE` on the binary (Linux-only, does not
help macOS); running the listener inside the helper (puts a parser of hostile bytes in a
root process — rejected); binding high ports and redirecting (a firewall rule is a second
privileged system change with its own teardown, for no gain).

**Port conflict** — a local development server already holding `:80` or `:443` — is
detected at setup and at every protection start, and drops Cairn to silent mode with the
one-sentence explanation FR-027 requires. This is the exact scenario the spec's US3
scenario 4 describes.

---

## R4. How does a 24-hour waiting period resist clock manipulation?

**Decision**: A pending change carries three persisted values: the wall-clock instant it
was requested, a monotonically non-decreasing *trusted clock* high-water mark, and an
accumulated *observed running time*. The change becomes eligible only when the trusted
clock has advanced 24 hours past the request. While Cairn is running, wall-clock advances
are credited only up to what the monotonic clock corroborates; an uncorroborated forward
jump is not credited. Time while the machine is off is credited from the wall clock,
because nothing on the machine can independently measure it.

**Rationale**: This defeats the two casual attacks — setting the clock back to lose the
request, and jumping it forward while the app runs to skip the wait — without pretending
to defeat the one that cannot be defeated. A person with administrator access who shuts
down, changes the clock, and boots can shorten the wait. That is already true of every
gate Cairn will ever have, and Principle III requires saying so rather than implying
tamper-proofing.

**Alternatives considered**:

- *Wall clock only.* Rejected: trivially defeated by a clock change, and FR-047d names
  clock changes explicitly.
- *Monotonic/uptime only.* Rejected: a pending change would stop advancing whenever the
  machine is off, so a person who requests a change and shuts down for a week would come
  back to a full 24 hours remaining. That is punitive rather than deliberate, and the
  spec's edge case expects the request to be "accurate about its remaining time".
- *A trusted external time source.* Rejected outright — it is an outbound network call.

**Heartbeat cadence**: the helper advances the trusted clock and running-time counters on a
fixed interval and on every clean shutdown. The interval bounds the maximum uncredited
running time; 60 seconds matches the granularity FR-010 and SC-004 already require.

---

## R5. Encryption at rest, and where the key lives

**Decision**: Reach history in SQLite with SQLCipher (`rusqlite` with the
`bundled-sqlcipher` feature). A 256-bit key generated on first run, stored in the platform
credential store through the `keyring` crate — Credential Manager on Windows, Keychain on
macOS, Secret Service on Linux. Configuration that contains no reach data stays as plain
JSON.

**Rationale**: Page-level encryption means the file is opaque at rest with no application
code able to forget to encrypt a column, which is what SC-014 actually tests. The key never
touches disk outside the credential store, and the person never sees a passphrase
(FR-034, SC-015).

**Failure path (FR-036)**: if the credential store is locked, absent, or the key is
missing, Cairn opens no database, reports that history cannot be opened, **continues
blocking and continues recording** to an encrypted spool it can write without the history
key, and never creates a fresh database over the old one. The unreadable file is left
exactly as found.

**SPIKE — Linux without a Secret Service.** Headless, minimal, and some tiling-WM setups
have no Secret Service provider. Cairn cannot invent a keystore and must not ask for a
passphrase. The fallback is to fail closed on history — protection and recording continue,
history stays unreadable — and to say so plainly. **Verify on a minimal Linux target before
history UI work.**

---

## R6. Marker splicing with byte-identical surroundings

**Decision**: Read the file as raw bytes, never as lines of text. Locate the Cairn section
by its begin/end marker byte sequences. Replace exactly the bytes between them. Write to a
temporary file in the same directory, `fsync`, then atomically rename over the original,
having first copied the original's permissions and ownership.

**Rules that fall out of FR-040 and must be tested, not assumed**:

- Preserve the file's existing line-ending convention; do not normalise. A Windows hosts
  file is CRLF and must stay CRLF, including bytes Cairn did not write.
- Never write a BOM. If one exists, it is outside the markers and is preserved untouched.
- Never reorder, re-indent, or trim anything outside the markers, including trailing
  whitespace and a missing final newline.
- If the markers are absent, append the section at the end; if present, splice in place —
  never create a second section (FR-042).
- If the end marker is missing or the section is malformed, do not guess: report and leave
  the file alone (spec edge case).

**Verification**: a property-based test that generates arbitrary surrounding content —
including no trailing newline, mixed line endings, a BOM, and pre-existing entries for
protected domains — then asserts byte-identity outside the markers across apply, repair,
and teardown. This is one of the four mandatory test areas in the constitution.

**Atomic rename caveat**: rename is atomic only within a filesystem. The temporary file
must be created in the target's own directory, not in a temp directory.

---

## R7. Does a 10,000-entry hosts file actually perform?

**Decision**: Treat this as the slice's principal performance risk and measure it early.
Design so that a slow platform degrades to fewer entries plus honest reporting, never to
silent unenforcement.

**Rationale**: A large hosts file has historically caused resolution slowdowns on Windows,
where the DNS Client service parses it, and behaviour differs enough between platforms that
this cannot be reasoned about from first principles. SC-016 sets a hard, measurable bound —
no more than 50 ms added to loading an *unprotected* site with 10,000 entries active — which
is exactly the number a spike must produce.

**SPIKE — hosts file at scale.** Measure resolution latency for unprotected domains at 0,
1k, 5k, and 10k entries on all three platforms, with and without the DNS Client service on
Windows. **Go/no-go before the preset categories are sized.** If a platform cannot hold
10,000 entries within the bound, the honest responses are to cap the list with a stated
limit, or to state the slowdown — not to quietly drop entries.

**Related**: writing IPv4 and IPv6 entries as a pair for every domain doubles the line count.
This is required — a domain that resolves over IPv6 is not blocked by an IPv4 entry alone —
and the spike must measure the paired count, not the domain count.

---

## R8. Flushing the resolver cache after a change

**Decision**: Flush after every apply, repair, and teardown, through a `DnsFlushService`
with a per-platform implementation. Treat flush failure as non-fatal: log it, report
protection as in force only if verification passes independently, and let the change take
effect as caches expire.

**Mechanism**: Windows — the DNS Client service's own flush entry point. macOS —
`dscacheutil` plus a `HUP` to `mDNSResponder`. Linux — depends on what is running
(`systemd-resolved`, `nscd`, or nothing); detect and act accordingly, and do nothing
gracefully when nothing is caching.

**Rationale**: FR-010 and SC-004 require effect within 60 seconds without restarting
browsers. A stale cache is the main thing that would miss that bound. Browsers also keep
their own internal caches, which a system flush does not clear — this is a known and
disclosable limit, not a defect, and is the reason SC-002 counts attempts rather than
instantaneous transitions.

---

## R9. What "uses the operating system's own address resolution" means in practice

**Decision**: The verification matrix from the spec's clarifications — the platform default
browser, Chrome, Firefox, and one non-browser network client, on each of the three
platforms — is codified as a fixed manual acceptance checklist in `quickstart.md`, and the
non-browser client is scripted so it runs in CI on each platform.

**Finding that must reach the UI**: modern browsers ship encrypted-DNS behaviour that can
bypass the system resolver, and Firefox in particular may enable it independently of any
system setting. This means a browser in the matrix can be *not covered* on a given machine
through no fault of Cairn's. FR-009a exists for exactly this case: name it, do not imply
coverage. Closing it is the job of a later slice, and this slice must not pretend otherwise.

---

## R10. Stack confirmation

**Decision**: Tauri 2.x; Rust core; React 18 + TypeScript + Tailwind frontend; `rusqlite`
with bundled SQLCipher; `keyring` for credential storage; `serde` for configuration;
`proptest` for the splicing properties; `vitest` and Testing Library for the frontend.

**Rationale**: This matches the tech direction already recorded for the project. Tauri keeps
the privileged surface in Rust and the interface in web technology, which is the split the
constitution's platform-abstraction rule assumes. Nothing here is load-bearing enough to
warrant re-litigating at slice 002; the decisions that matter are R1 through R7.

**Note on dependencies**: every crate added is a supply-chain surface for a security tool.
The dependency set stays small and is reviewed as part of the privileged-path review the
constitution already requires.
