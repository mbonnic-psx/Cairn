# CLAUDE.md

Guidance for AI agents working in this repository.

## What Cairn is

A cross-platform desktop website blocker (Windows, macOS, Linux) with a recovery
layer built from end-of-day reflection. Native desktop app — not a browser
extension, not a web app, not a served UI. Local-first: no accounts, no cloud, no
telemetry. Free forever for everything that matters.

Its users include people in genuine recovery from compulsive online behavior. That
fact, not convenience, decides every trade-off.

## Read these before doing anything

| Document | What it is |
| --- | --- |
| `VISION.md` | Intent and voice. The source. Do not edit without being asked. |
| `.specify/memory/constitution.md` | **Binding rules.** Currently v1.1.0. |
| `specs/001-cairn-v1/spec.md` | The v1 PRD — 90 functional requirements, 18 success criteria. |
| `specs/001-cairn-v1/checklists/requirements.md` | Quality gate + validation history. |

The constitution wins over convenience, over cleverness, and over your own judgement
about what would be nicer. If a requested change violates it, say so before writing
code — then follow the user's decision.

## Current state

**No application code exists yet.** The repository holds VISION, the constitution,
the v1 PRD, and Spec Kit scaffolding. Nothing has been scaffolded, no build system,
no dependencies. Do not invent build or test commands — there are none yet. This
section gets replaced with real commands when the app is scaffolded.

## Workflow — Spec Kit

This project uses [spec-kit](https://github.com/github/spec-kit) (`specify` CLI,
v0.16.4). Work flows through skills in `.claude/skills/speckit-*`:

```
constitution → specify → clarify → plan → tasks → implement
```

- `/speckit-specify` — new feature spec under `specs/NNN-name/` (sequential numbering)
- `/speckit-clarify` — resolve ambiguity **before** planning; it writes answers back
  into the spec under `## Clarifications`
- `/speckit-plan` — implementation plan; **must pass a Constitution Check** before
  tasks are generated
- `/speckit-tasks` → `/speckit-implement`

Rules:

- `specs/001-cairn-v1/` is the product-level PRD covering all of v1. It is not a
  planning target. Individual features get their own `specs/NNN-*` directory.
- Specs describe **what and why**, never how. No tech stack, file paths, or APIs in
  a spec. Those belong in the plan.
- Never edit `.specify/templates/` to work around a template. Never write to
  `.specify/feature.json` by hand (it is gitignored, machine-local state).
- A constitution violation in a plan must be resolved, or recorded in the plan's
  Complexity Tracking table with explicit justification. Unjustified violations
  block implementation.

## Non-negotiables while writing code

These are the constitution's rules in the form you will most often be about to break.

**The wall holds.** No in-moment escape hatch — ever. No "just this once", no
snooze, no countdown ending in access, no dismissible dialog that grants access, no
hidden key combination. A blocked request produces **no Cairn UI at all**: no page,
no notification, no toast, no sound, no badge change. Never link to, suggest, or
surface a protection change in response to a blocked request.

**Local-first.** No outbound network calls. Not for analytics, crash reporting,
feature flags, license checks, update pings, or anything else. Record domain and
timestamp only — never paths, query strings, or content.

**Encryption at rest.** Journal entries and reach history are always encrypted, no
opt-out, key in the platform credential store. Never ask the user for a passphrase
to read their own entries. If the key is unavailable, fail closed: report it, keep
protecting and recording, never discard or overwrite unreadable data.

**Reversible by construction.** Before the first modification of any system file:
write a one-time backup. Edit shared files only inside Cairn-owned markers — content
outside the markers must be byte-identical afterward. Every rule, key, and file
Cairn creates gets namespaced and inventoried. Teardown runs in reverse order,
verifies, and reports residue.

> No privileged write path is merged without a reviewed teardown path and a test
> proving it restores.

**Honest about limits.** Report verified system state, never intended state. When a
platform can't support something, say so in the UI — never claim coverage you don't
have. Disclose plainly before any change affecting other user accounts. The app and
README both state that a determined user with admin access can defeat Cairn.

**Reflection at distance.** One quiet notification per day at the user's chosen
evening hour, never repeated or escalated, off-switch in settings. Nothing else,
ever. Never require the user to type, solve, or answer anything to reach a site or
keep protection running.

**Free at the moment of need.** Everything in `specs/001-cairn-v1/spec.md` is
permanently free. No feature may move from free to paid.

## Voice — this is product, not polish

Never write these words in user-facing text: **failed, denied, violation, relapsed,
forbidden, "you lost"**. There is an automated check for this (SC-013).

Write instead: *protected*, *you reached for this*, *a slip*, *back on the trail*.

- Name features by what they do, never by mechanism. "Prevent browser workarounds",
  never "DoH policy enforcement".
- A reach is information, not failure. Never congratulate, never shame.
- Streaks are opt-in and reversible. With streaks off: no counter, no "day N", no
  chain imagery anywhere. Turning them off never produces a loss moment.
- Visuals: warm palette, generous whitespace, soft motion. Serif for reflective
  moments, sans for UI. No locks, no shields, no alarm-red, no broken chains, no
  neumorphism.

## Tech direction (planned, not yet built)

- **Tauri** — React + TypeScript + Tailwind frontend, small Rust core.
- Rust owns: hosts file I/O, resolver rules, browser policy files, privilege
  elevation, DNS cache flush, local storage, autostart, reach counting.
- Frontend owns everything the user sees and feels.
- Platform differences sit behind interfaces from day one: `ElevationService`,
  `HostsService`, `ResolverRulesService`, `BrowserPolicyService`, `DnsFlushService`,
  `AutostartService`. Platform-conditional logic must never leak into UI or domain
  code.
- UI runs unelevated. Only privileged writes elevate, scoped as narrowly as possible.
- SQLite for history and journal (encrypted), JSON for configuration.

**Three enforcement layers.** Layer 1 (hosts file) is authoritative and always on.
Layer 2 (resolver rules — NRPT, `/etc/resolver`, dnsmasq/systemd-resolved) and layer
3 (DoH lockdown — browser policy, endpoint blocking, Firefox canary) are
enhancements. A failure in 2 or 3 degrades to layer 1 — **never to no blocking**.
Layers 2 and 3 are the largest engineering item in v1 and carry their own go/no-go
checkpoint; nothing else may take a hard dependency on them.

## Testing — mandatory, no exceptions

1. Domain normalization and deduplication (scheme/port/path stripping,
   case-insensitivity, `www.` variants, paired IPv4/IPv6).
2. Marker-based splicing — content outside Cairn's markers is byte-identical before
   and after apply, repair, and teardown.
3. Teardown and uninstall restoration, every layer, every platform.
4. Layer 2 and 3 failure paths degrade to layer 1, never to no blocking.

## Git

Repository: `mbonnic-psx/Cairn`, default branch `main`. Commit only when asked.
