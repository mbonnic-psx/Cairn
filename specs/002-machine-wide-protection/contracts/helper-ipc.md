# Contract: Privileged Helper IPC

**Feature**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

The helper is the only elevated component. It exposes a **closed verb list** — there is no
generic "write this file" or "run this command" verb, and no verb takes a path from the
caller. Anything the helper will ever do to the machine is enumerated here.

**Channel**: named pipe (Windows, DACL to the installing user's SID), XPC (macOS, peer
code-signing requirement), Unix socket in a root-owned directory (Linux, `SO_PEERCRED` uid
match). Every request is rejected unless the peer check passes.

**Encoding**: length-prefixed JSON. Unknown verbs are rejected, never ignored.

---

## Verbs

| Verb | Request | Response | Teardown counterpart |
| --- | --- | --- | --- |
| `Ping` | — | `{ version, healthy }` | — |
| `WriteBackupOnce` | `{ target }` (enum, not a path) | `{ written: bool, existing_sha256? }` | `RemoveBackup` |
| `ApplyHostsSection` | `{ entries: [domain], mode }` | `{ verified_count, sha256_after }` | `RemoveHostsSection` |
| `VerifyHostsSection` | — | `{ present, entry_count, drift: bool }` | — |
| `RepairHostsSection` | `{ entries: [domain] }` | `{ repaired: bool, verified_count }` | — |
| `RemoveHostsSection` | — | `{ removed: bool, residue: [string] }` | — |
| `RemoveBackup` | `{ target }` | `{ removed, restored_sha256_match: bool }` | — |
| `BindCountingSockets` | — | `{ ok, fds }` / `{ ok: false, conflict_reason }` | `ReleaseCountingSockets` |
| `ReleaseCountingSockets` | — | `{ released }` | — |
| `FlushDnsCache` | — | `{ flushed, mechanism, non_fatal_error? }` | — |
| `ReadTrustedClock` | — | `{ trusted_seconds, running_seconds, last_heartbeat }` | — |
| `Uninstall` | — | `{ removed, residue: [string] }` | — |

### Verbs that deliberately do not exist

This absence is a constitutional control, not an omission:

- **No `UnblockDomain`, `PauseProtection`, `SuspendUntil`, or `AllowOnce`.** Principle I
  forbids an in-moment path around the wall. Because no such verb exists, no future UI
  change can introduce one without adding a privileged verb — a change that cannot pass
  the review the constitution already requires.
- **No `WriteFile(path, bytes)` or `RunCommand`.** The helper's blast radius is fixed at
  compile time.
- **No verb that reads or returns reach data.** The helper never touches history.
- **No `SetTrustedClock`.** The trusted clock is advance-only, internal, and cannot be moved
  by the UI.

---

## Invariants

1. **Backup before first write.** `ApplyHostsSection` fails if no backup exists for the
   target; it never writes one implicitly (FR-039).
2. **Markers only.** `ApplyHostsSection`, `RepairHostsSection`, and `RemoveHostsSection`
   modify only bytes between Cairn's markers. Bytes outside are byte-identical afterwards,
   asserted by the helper re-reading and comparing before it reports success (FR-040).
3. **Verified, not intended.** Every mutating verb re-reads the file and returns what it
   actually found. A write that cannot be verified reports failure to verify, and the UI
   renders `NotVerified` (FR-012).
4. **Idempotent.** Applying twice yields one section; removing twice is not an error
   (FR-042).
5. **Inventoried.** Every mutating verb appends to the change inventory before returning,
   including the helper's own installation.
6. **No verb without a teardown path.** Any verb added later must ship with its counterpart
   and a test proving restoration, or it is not merged.
