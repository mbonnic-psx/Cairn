# 0002. Leave the architecture where it is

Date: 2026-09-30

## Status

Accepted (by the project owner, 2026-09-30: "Accept leave-it")

## Context

The delivery method was adopted around Cairn after features 002 and 003 were built. The survey found two
applications: the interface at the root (React and TypeScript) and `src-tauri` (the Rust core and the
privileged helper). Both are green in `make verify` with no baseline and nothing quarantined. The
architecture is already the one the constitution requires: platform behavior behind services, a pure
`domain/` held by `check-domain-purity.sh`, and an unelevated interface that elevates only through the helper.

The adoption changes how work is delivered, not what Cairn is built from. Nothing in the trigger names a
platform to leave, a host to move, or a capability the current shape cannot carry. The map's open rungs (a
release path, and a green suite recorded in the gate) are delivery rungs, and they pay off whatever the
architecture is.

## Decision

Strategy: leave-it

Cairn keeps its current architecture. New work is built as slices in place, through `/drive`, with no
strangler, modular-monolith or rewrite programme. The delivery rungs on the convergence map are climbed as
method slices where a feature needs them.

## Consequences

No retirement ledger and no routing seam are needed, and `/strangle` has no work to do here.

The open rungs stay visible in `delivery/docs/convergence.md`. `/drive` offers them as method slices rather
than as a programme that has to finish first.

If a trigger appears that the current shape cannot meet, such as a platform Cairn has to leave, a new ADR
supersedes this one and names the strategy it calls for.
