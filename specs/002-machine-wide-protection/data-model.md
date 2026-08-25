# Phase 1 Data Model: Machine-Wide Protection and Quiet Reach Counting

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-20

Three stores, chosen by what the data is rather than by convenience:

| Store | Holds | Why |
| --- | --- | --- |
| `history.db` — SQLite + SQLCipher | Reaches, coverage gaps | Sensitive; FR-033 requires encryption with no opt-out |
| `config.json` — plain JSON | Trail, reach mode, protection intent, pending change | Contains no reach data; must be readable during teardown even when the key is not |
| `inventory.json` + `backups/` | Change inventory, one-time backups | Must survive a broken database and be readable by the helper alone |

**Deliberate split**: the inventory and backups are *not* in the encrypted database. If the
credential store is unavailable, Cairn must still be able to tear down completely (FR-036
keeps protecting; FR-043 must still work). Encrypting the teardown record behind a key that
may be missing would make the machine unrecoverable — a direct conflict with Principle IV.
The inventory holds no reach data, so nothing sensitive is exposed by this.

---

## Entities

### ProtectedEntry

The normalized unit of protection.

| Field | Type | Rules |
| --- | --- | --- |
| `domain` | string | Normalized: lowercase, no scheme, no port, no path, no trailing dot. Punycode-encoded if non-ASCII. Primary key |
| `sources` | set of SourceRef | Non-empty. An entry with zero sources is deleted, not orphaned (FR-006) |
| `auto_www` | bool | True when the entry was generated as the `www.` form of a root (FR-005) |

**Validation** (`domain::normalize`, pure, unit-tested — constitution-critical):

- Reject anything that is not a valid domain, with a plain-language reason (FR-004).
- Reject entries that would break the system or Cairn itself — `localhost`, the machine's
  own hostname, loopback names, and the broadcast entries a hosts file normally carries —
  with an explanation (FR-007).
- Case-insensitive; `EXAMPLE.com` and `example.com` are one entry (FR-004).
- Adding a root domain also yields its `www.` form (FR-005).
- Deduplicate across every source; removing one source does not unprotect an entry another
  source still requires (FR-006).

**Emission**: each entry produces a **pair** of hosts lines, IPv4 and IPv6. A domain
reachable over IPv6 is not blocked by an IPv4 line alone. Line count is therefore twice the
entry count, which is what the R7 performance spike must measure.

### CategoryPreset

| Field | Type | Rules |
| --- | --- | --- |
| `id` | enum | One of the nine named categories (FR-001) |
| `domains` | list of string | Seeded from shipped data, copied to the person's own data on first run (FR-002) |
| `enabled` | bool | |
| `edited` | bool | True once the person has changed their copy; shipped seed is never re-applied over it |

### Trail

The whole of what is protected: enabled categories, custom entries, and the reach mode.
Schedule, recovery gate configuration, and partner belong to later slices and have no
representation here.

### ProtectionState

Derived from the machine, never from intent (FR-012, Principle III).

| Field | Type | Notes |
| --- | --- | --- |
| `status` | enum | `Off` \| `InForce` \| `NotVerified` |
| `since` | timestamp \| null | |
| `verified_at` | timestamp \| null | When the system file was last read back and compared |
| `entry_count_verified` | int | What was actually found, not what was written |

`NotVerified` is a first-class state, not an error banner on `InForce`. The UI must never
render "protected" from a write that returned success — only from a read-back that matched.

**Transitions**:

```
Off ──apply──▶ InForce ──verify fails──▶ NotVerified ──repair ok──▶ InForce
 ▲                                              │
 └──────────── teardown ◀──────────────────────┘
```

Reduction to `Off` is reachable only through an eligible `PendingChange`.

### ReachMode

| Field | Type | Notes |
| --- | --- | --- |
| `mode` | enum | `Counted` \| `Silent` |
| `chosen_by` | enum | `Person` \| `Automatic` |
| `fallback_reason` | string \| null | One sentence, shown when `Automatic` (FR-027) |

Checked at setup and at every protection start. A person's explicit choice is not silently
overwritten by a later automatic check; the automatic fallback applies and is explained.

### Reach

The most privacy-sensitive record in the product.

| Field | Type | Rules |
| --- | --- | --- |
| `domain` | string | The destination name only |
| `at` | timestamp | |

That is the entire schema, and it is enforced by the schema itself: there is no column for a
path, a query, a header, a process, or a payload, so no code change can start recording one
without a visible migration. Stored in `history.db`, encrypted at rest.

### CoverageGap

| Field | Type | Notes |
| --- | --- | --- |
| `from` / `to` | timestamp | A period when Cairn was not running and therefore not counting |

Written on clean shutdown and inferred on start from the last heartbeat. Exists so counts are
never presented as complete for time nobody observed (FR-030).

### PendingChange

The only route to reducing protection.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `kind` | enum | `TurnOffProtection` \| `RemoveEntries` \| `DisableCategory` |
| `payload` | object | Exactly what would change |
| `requested_at_wall` | timestamp | For display |
| `trusted_clock_at_request` | int (seconds) | High-water mark at request time |
| `eligible_after_trusted` | int (seconds) | `trusted_clock_at_request + 86400` |

**Eligibility** (`domain::gate`, pure, unit-tested): eligible when the current trusted clock
reaches `eligible_after_trusted`. The trusted clock is monotonically non-decreasing and
advanced by the helper's heartbeat: while running, wall-clock advances are credited only up
to what the monotonic clock corroborates; across a shutdown, wall-clock advance is credited
in full (R4). Increases in protection never create a pending change (FR-048).

### ChangeInventory

| Field | Type | Notes |
| --- | --- | --- |
| `changes` | ordered list of Change | Append-only; teardown walks it in reverse (FR-043) |

Each `Change` records kind (`HostsSection`, `HelperInstalled`, `BackupWritten`), target,
applied-at, and enough detail to remove it exactly. **The helper's own installation is an
inventoried change** — it is not exempt from teardown.

### Backup

| Field | Type | Notes |
| --- | --- | --- |
| `path` | string | The original file |
| `captured_at` | timestamp | |
| `sha256` | string | Of the pre-Cairn content |

Written once, before the first modification, never overwritten — including when a previous
install left one behind (FR-039, FR-042).

---

## Constitution-critical functions

Four pure functions carry the weight of four constitutional rules. All live in `domain/`,
take and return plain values, do no I/O, and have dedicated tests:

| Function | Guards | Test |
| --- | --- | --- |
| `normalize(input) -> Result<Vec<ProtectedEntry>>` | Data normalization rule | Unit + table-driven cases |
| `splice(original: &[u8], section: &[u8]) -> Vec<u8>` | Principle IV byte-identity | `proptest` over arbitrary surroundings |
| `parse_destination_name(&[u8]) -> Option<Domain>` | Principle II minimal inspection | Asserts nothing beyond the name is retained; capped input |
| `is_eligible(pending, trusted_now) -> bool` | Principle I gating | Unit tests incl. clock forward/backward/off |
