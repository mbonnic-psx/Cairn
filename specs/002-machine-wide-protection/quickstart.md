# Quickstart: Validating Machine-Wide Protection

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-20

How to prove this slice works. Entities are in [data-model.md](./data-model.md); interfaces
in [contracts/](./contracts/).

> **Run destructive checks on a disposable machine or VM.** These exercise real system
> files and install a privileged helper. Snapshot first.

## Prerequisites

- Rust 1.83+, Node 20+, platform Tauri prerequisites
- Administrator access on the test machine
- A VM snapshot to roll back to
- The verification matrix installed: platform default browser, Chrome, Firefox, and `curl`

## Automated checks

```bash
cargo test                                    # unit + integration
cargo test --test splice_properties           # byte-identity outside markers
cargo test --test teardown_restoration        # restoration, every layer
cargo test --test degradation                 # counting loss never reduces blocking
npm test                                      # frontend
node scripts/check-banned-words.mjs           # SC-019
bash scripts/check-no-network-deps.sh         # Principle II
```

All must pass before the manual matrix is worth running.

## Manual validation

### 1. Setup and apply — US1, SC-001, SC-004

Launch, choose the Social category, add `https://Example.com:443/some/path` as a custom
entry, turn protection on.

**Expect**: setup completes in under 5 minutes; the entry is stored as `example.com` with
`www.example.com` alongside; re-adding `EXAMPLE.com` adds nothing; exactly one elevation
prompt (helper install), disclosed before it appears; protection reads `InForce` within 60
seconds with no restart.

### 2. The wall — US2, SC-002, SC-003, SC-005

Attempt a protected site in each matrix application.

**Expect**: every attempt fails to connect. **Cairn shows nothing** — no window, no
notification, no sound, no tray change. Any matrix application that resolves addresses on
its own is named in the UI as not covered; if one is uncovered and *not* named, SC-003 fails.

### 3. Byte-identity — US4, SC-012

```bash
sha256sum /etc/hosts > /tmp/before.sha        # Windows: Get-FileHash on the hosts path
# turn protection on, then off, then let the pending change apply
sha256sum -c /tmp/before.sha
```

**Expect**: identical. Also verify a hand-added line outside Cairn's markers survives apply,
repair, and teardown unchanged, including its line endings.

### 4. Silent repair — SC-008

With protection on, externally delete Cairn's marked section.

**Expect**: restored within 60 seconds; **nothing shown to the person**; content outside the
markers still byte-identical.

### 5. Counting — US3, SC-009, SC-006

Attempt three protected sites at noted times, then navigate deliberately to the Reaches
screen.

**Expect**: three reaches, correct domains and times, nothing else recorded. Sweep every
other screen and the tray: **zero** counts, totals, badges, or hints. Confirm the diagnostic
log contains no domain (SC-018).

### 6. Silent-mode fallback — SC-010

Occupy port 443 on loopback, then restart protection.

**Expect**: Cairn switches to silent mode by itself, explains in one sentence, and **blocking
is fully in force**. Counting loss must never reduce blocking.

### 7. The waiting period — SC-011

Request protection off, then in turn: restart the app; restart the machine; set the system
clock forward 48 hours while running.

**Expect**: protection stays in force through all three and the change does not apply early.
Remaining time is visible where protection state is shown, and nowhere else. Cancel it —
protection simply continues. Then add a category: it applies immediately, with no wait.

### 8. Fail closed — FR-036

Lock or remove the credential store entry, then start Cairn.

**Expect**: reports history cannot be opened; **keeps protecting and keeps recording**; the
existing history file is unchanged on disk — not reset, not replaced.

### 9. Teardown — SC-013

Let a pending turn-off apply.

**Expect**: Cairn confirms restoration; no Cairn-authored entry, helper, service, or file
remains; any residue is reported rather than reported as success.

## Scale check — SC-016

Enable enough preset categories to exceed 10,000 entries. Measure load time for an
**unprotected** site before and after.

**Expect**: no more than 50 ms added. This is the R7 spike; if a platform misses the bound,
the honest responses are a stated cap or a stated slowdown — never silently dropping entries.

## Sign-off

The slice is done when every automated check passes, sections 1–9 pass on **all three
platforms**, and the scale check either passes or has its limit stated in the UI.
