# Cairn — Vision

> A cairn is a stack of stones left by someone who walked the trail before you, so the next person can find the way.

## What Cairn is

- A cross-platform desktop website blocker (Windows, macOS, Linux) that actually blocks.
- A native desktop application. Not a browser extension, not a web app, not a local website. Everything lives in the app.
- Wrapped around the block: a recovery layer built from end-of-day reflection, journaling, and honest history.
- Local-first. No accounts, no cloud, no telemetry. Your data never leaves your machine.
- Free forever for everything that matters. Nobody pays to protect themselves.

## The two halves

**Cairn is a blocker first.** When a site is protected, you don't get in. The connection fails at the system level, across every browser and every app. No negotiating, no "are you sure," no soft dismissal. A blocker that can be talked out of its job is worthless to the person who needed it most.

**Cairn is a recovery tool second.** The recovery work doesn't happen by weakening the wall — it happens at the end of the day, away from the moment of craving, when there's enough distance to think honestly:

- What you reached for, and how often.
- A journaling prompt: how the day went, what was going on, what you noticed.
- Patterns over time — which sites, which hours, which days.
- A partner who can see it, if you want one.

Reaching for a site isn't failure. It's information. The wall stops the behavior; the evening tells you the truth about it.

## Why reflection is at the end of the day

- In the moment of craving, nobody writes anything honest. They type whatever gets the box to go away.
- Interrupting someone mid-workday with a prompt trains them to resent the app.
- Distance produces insight. The evening is when "I hit Twitter eleven times between 2 and 4" becomes a fact you can actually do something with.
- So: the block is instant and silent. The reflection is a calm, once-daily ritual you choose to sit down for.

## The core loop

1. **Set the trail** — pick categories and custom sites; choose when protection is active.
2. **Protection runs** — silently, at the system level, all day. No interruptions, no popups.
3. **A reach happens** — the site fails to load. Cairn notes it and says nothing.
4. **Evening check-in** — a single daily prompt: today's reaches, a journaling space, an optional quote.
5. **See the pattern** — a history view showing reaches by site, by hour, by day, over time.
6. **Share it, if you want** — a partner sees the same picture.

---

## Enforcement: three layers

A hosts file alone is a screen door. Cairn stacks three layers, each independently toggleable, each with clean teardown. Every layer Cairn touches is marked as Cairn's, backed up before first modification, and fully removed when protection ends or Cairn is uninstalled.

### Layer 1 — Hosts file (always on)

The foundation. System-wide, all browsers, all applications.

```
# --- Cairn-managed section BEGIN ---
0.0.0.0         facebook.com
::              facebook.com
0.0.0.0         www.facebook.com
::              www.facebook.com
# --- Cairn-managed section END ---
```

- **Marker-based splicing** — Cairn only ever touches its own block; lines outside the markers are never modified.
- **One-time backup** — `hosts.cairn.bak` written on first modification, preserving the true pre-Cairn state permanently.
- **IPv4 and IPv6 together** — every domain blocked on both, or neither.
- **Automatic `www.` variants** — root domain entries generate their `www.` counterparts.
- **Domain normalization** — protocol, port, and path stripped (`https://example.com:443/path` → `example.com`), case-insensitive deduplication, with unit tests.
- **UTF-8, no BOM.**
- **DNS cache flush after every write**, silently, per platform.
- **Integrity check** — if the managed section is missing or altered while protection is on, Cairn repairs it.

Known weakness: no wildcard support, and linear scanning degrades with very large lists. That's what layer 2 is for.

### Layer 2 — System resolver rules (wildcards and scale)

Rules enforced by the OS resolver itself, rather than by a flat text file. Gives Cairn wildcard blocking (`*.example.com`) and efficient lookup regardless of list size.

- **Windows** — NRPT (Name Resolution Policy Table), registry-based policy rules. Supports domain-suffix wildcards natively and uses indexed lookup instead of a linear file scan.
- **macOS** — per-domain resolver files under `/etc/resolver/`, directing matched domains to a dead resolver.
- **Linux** — dnsmasq or systemd-resolved configuration drop-ins, depending on what the distribution runs.

Design notes:

- Layer 2 is an enhancement, never a replacement. Layer 1 stays authoritative so that a failure or unsupported configuration in layer 2 degrades to plain hosts blocking rather than to no blocking.
- Implementations sit behind one `ResolverRulesService` interface. Where a platform has no viable mechanism, Cairn reports honestly in the UI that wildcards are unavailable on this system, rather than silently doing nothing.
- Every rule Cairn creates is namespaced and inventoried so removal is exact.

### Layer 3 — DoH lockdown (closing the side trails)

The largest real hole in hosts-based blocking: a browser using DNS-over-HTTPS resolves domains through Cloudflare or Google directly, never consulting the operating system, and the hosts file is bypassed entirely. In Chrome this is three clicks in settings. This layer closes it.

**Browser managed policy** — Cairn writes policy that disables Secure DNS and prevents it from being re-enabled inside the browser's own settings.

**Scope rule: user-scoped wherever the platform allows it.** Cairn is a personal recovery tool, not an IT deployment. It should not silently reconfigure other people's browsers on a shared machine.

- **Windows** — `HKCU\SOFTWARE\Policies\` for Chrome (`DnsOverHttpsMode`), Edge, and Firefox (`DNSOverHTTPS`). User-scoped, no other account affected. Machine-wide `HKLM` is available as a deliberate opt-in for single-user machines that want the stronger lock.
- **macOS** — user-scoped managed preferences where the browser honors them; Firefox's `policies.json` lives in the app bundle and is unavoidably machine-wide.
- **Linux** — Chrome and Chromium only read policy from `/etc/opt/chrome/policies/managed/` and `/etc/chromium/policies/managed/`; Firefox from `/etc/firefox/policies/`. All machine-wide, with no user-scoped alternative.

Where machine-wide is the only option, Cairn says so plainly before writing anything: this will affect every user account on this computer.

**Endpoint blocking** — known DoH resolver hostnames are added to the layer 1 block list: `cloudflare-dns.com`, `dns.google`, `mozilla.cloudflare-dns.com`, and the rest of a maintained list.

**Firefox canary domain** — blocking `use-application-dns.net` causes Firefox to disable DoH on its own. Free, elegant, no policy file required.

Design notes:

- Separately toggleable, with plain-language explanation at enable time: this turns off Secure DNS in your browsers so they can't route around Cairn.
- Policy files get the same treatment as the hosts file: backup before first write, Cairn-owned markers or dedicated files, exact removal on disable.
- Called **Prevent browser workarounds** in the interface. Never "DoH policy enforcement."

### What Cairn does not claim

- These layers raise the cost of a workaround. They do not make one impossible.
- A determined user with administrator access can edit the hosts file, delete the policy keys, use a VPN, use a different device, or use a browser Cairn doesn't know about.
- Cairn says this plainly in the app and in the README. The lock is designed to stop casual urges and momentary weakness — not to be tamper-proof. Overselling enforcement to someone in recovery is a betrayal, not a marketing decision.

---

## Counting reaches

Hosts-file blocking sends a domain to a dead address, so the connection fails without the app ever knowing. Reach data is half of what makes Cairn worth using, so counting is the default — but Cairn decides by detection, not by asking the user a technical question.

- **Counted mode (default)** — domains point at `127.0.0.1`, and Cairn's core listens locally on ports 80 and 443 solely to count the connection and drop it. Nothing is served, no page is rendered, the browser still shows a plain connection failure. Purely a tally.
- **Silent mode** — domains point at `0.0.0.0` and `::`. Pure blocking, zero footprint, no counting. The evening journal asks you to estimate instead.
- **Automatic fallback** — at setup and at every protection start, Cairn checks whether ports 80 and 443 are free. If something else holds them — a local development server, for instance — Cairn falls back to silent mode on its own and explains why in one sentence. The user can override in either direction.
- Neither mode ever inspects traffic, logs URLs beyond the domain, or sends anything anywhere.
- Reach counts become meaningfully more accurate once layer 3 is active, since DoH-resolving browsers never touch Cairn's listener at all.

## Unlocking, deliberately

- Changing what's protected is a settings action, never a moment-of-temptation action. You go find it; it doesn't come find you.
- Removing protection is gated by whichever recovery mode is active — a delay, a partner's approval, or both.
- Turning protection off removes all three enforcement layers cleanly, in reverse order, and verifies removal.

## Streaks are optional, and off is a real choice

- Streaks help some people and quietly hurt others. A long streak can make a single slip feel catastrophic, and can turn the number into the goal instead of the work.
- Cairn asks during setup whether you want streaks, explains the tradeoff honestly, and respects the answer.
- With streaks off: reaches, patterns, and journal entries remain — no counters, no "day 47," no broken-chain imagery, anywhere.
- Turning streaks off later never shows a "you lost your streak" moment. The number just goes away.
- This applies to any gamification added later: opt-in, reversible, never the only way to see progress.

## Presets

Nine categories, carried forward and kept: Adult, AI, Gambling, Gaming, Messenger, News, Shopping, Social, Streaming. Shipped as a seed file, copied to user data on first run, editable by the user.

## What Nimbus got wrong

| Nimbus | Cairn |
| --- | --- |
| Blocked, and that was all | Blocks, and remembers |
| A reach was a dead end | A reach is a data point |
| Hosts file only — DoH walked right past it | Three enforcement layers |
| Wildcards were a roadmap item | Wildcards ship, via resolver rules |
| Reflection was a password-recovery quiz | Reflection is an evening ritual |
| Recovery mode was a hash handoff | A partner who actually sees something |
| Apply was a button you had to remember | Protection is a state you're in |
| Named for its mechanism, inaccurately | Named for the journey |
| Windows only, MAUI + Blazor, neumorphic | Three desktops, Tauri, warm and plain |

## Who it's for

- People in genuine recovery from compulsive or addictive online behavior.
- People with ordinary bad habits who've lost more hours than they want to admit.
- Both, weighted equally. Never so clinical it alienates the casual user, never so cute it insults someone doing hard work.

## Design language

- **Feeling**: a trail guide. Steady, unhurried, knows the route, doesn't judge you for resting.
- **Voice**: a good sponsor, not a firewall log. Warm, plain, honest.
- **Never say**: failed, denied, violation, relapsed, forbidden, "you lost."
- **Instead say**: protected, you reached for this, a slip, back on the trail.
- **Visuals**: warm palette, generous whitespace, soft motion. Serif for reflective moments, sans for UI. No locks, no shields, no red, no broken chains, no neumorphism.

## The commitment

- **Free forever**: all blocking, all three enforcement layers, all logging, all journaling, all pattern views, all core partnering.
- **Fair to charge for (later)**: themes, deeper analytics, multiple partners, data export.
- **The line**: if someone needs it during a vulnerable moment, it is never behind a paywall. Non-negotiable, and it predates the product.

## v1 scope

**In:**

- Layer 1: hosts-file blocking across all three platforms, with integrity repair
- Layer 2: system resolver rules — NRPT, `/etc/resolver`, dnsmasq/systemd-resolved — with wildcard support
- Layer 3: DoH lockdown — browser managed policy, endpoint blocking, Firefox canary
- Nine preset categories plus custom sites
- Counted and silent reach modes, with automatic port-conflict fallback
- Evening check-in: daily reflection and journaling
- History and patterns — by site, by hour, by day, over time
- Optional streaks, chosen at setup, reversible without ceremony
- Protection-change gating: delay mode and partner mode
- Partner flow v1: local, code-based approval and a shared summary
- Schedules: time-based protection windows
- Tray presence and autostart

**Out (explicitly, for now):**

- Mobile
- Browser extensions
- Any web-based or served UI
- Cloud sync and accounts
- Any paid tier

**Scope warning:** layers 2 and 3 together are the largest engineering item in v1 — roughly six platform-specific implementations. They deserve their own milestone with a real go/no-go checkpoint. If they slip, layer 1 alone still ships a working product; the vision does not depend on them landing simultaneously.

## Tech direction

- **Tauri** — React + TypeScript + Tailwind frontend, small Rust core.
- Rust owns: hosts file I/O, resolver rules, browser policy files, privilege elevation, DNS cache flush, local storage, autostart, reach counting.
- Frontend owns: everything the user sees and feels.
- Platform differences sit behind interfaces from day one: `ElevationService`, `HostsService`, `ResolverRulesService`, `BrowserPolicyService`, `DnsFlushService`, `AutostartService`.
- UI runs unelevated; only privileged writes elevate.
- Local storage: SQLite for history and journal entries, JSON for configuration.

## How we'll know it worked

- Someone learns something true about their own patterns that they didn't know before.
- The wall holds on the worst night, and the app is still something they want to open the next morning.
- A user with streaks turned off never once feels like they're using a lesser version.
