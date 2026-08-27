# Phase 1 — Quickstart: validating the check-in and history

**Feature**: `003-reflection-and-history` | **Date**: 2026-08-27

How to run this slice and how to know it works. Scenarios map to the spec's user stories and
success criteria; details live in [data-model.md](./data-model.md),
[contracts/ui-ipc.md](./contracts/ui-ipc.md), and
[contracts/patterns.md](./contracts/patterns.md).

## Prerequisites

Slice `002` must be in place — its protection, recording, and encryption boundary are what
this reads. No new toolchain beyond it.

```sh
npm install
```

## Commands

```sh
# The pure layers — no GUI toolchain, no C dependencies, no database.
cd src-tauri && cargo test -p cairn --no-default-features

# The encrypted reads and writes. Needs the SQLCipher build.
cargo test -p cairn --features history

# Screens.
cd .. && npm test

# Every constitutional guard. Four are modified by this slice; all must pass.
npm run check

# The application.
npm run tauri dev
```

## The guard checks, first

Run these before any scenario. This slice modifies four of them, and a scenario passing while
a guard fails means the feature works and the product is broken.

```sh
npm run check
```

| Check | What a pass means here |
| --- | --- |
| `check:no-notifications` | The rewritten form permits the one announcement and still forbids every other notification, badge, and raw `Notification` use |
| `check:ambient-counts` | Reach data appears only on the four navigated-to screens, and nowhere in the shell, header, nav, tray, or a badge |
| `check:no-streaks` | **Unmodified.** Still fails on *streak*, *chain*, *in a row*, *day N*, *best run* |
| `check:banned-words` | The six words are absent from the largest body of prose in the product so far |
| `check:no-network-deps` | The notification dependency admitted nothing network-capable (research R1) |
| `check:domain-purity` | The pattern and announcement arithmetic stayed free of I/O and platform code |

### Guard verifications on record

Each modified guard must be proven to fail on the violation it exists to catch, the standard
slice `002` set for its seven checks. Confirmed so far:

| Guard | Demonstrated by | Result |
| --- | --- | --- |
| `check-no-network-deps.sh` | T001 — the notification plugin in the tree | `clean on 3 desktop targets`, reported independently from all three Core runners. **GO** |
| `check-no-notifications.sh` (old form) | T001 — the same push | Failed with `src-tauri/Cargo.toml declares tauri-plugin-notification`. The rewritten form needs its own planted violation |
| `check-no-ambient-counts.mjs` | T002 — ten planted cases | Seven fail and three pass, exactly as specified. Table below |
| `eslint` import restriction | T003 — nine planted cases | Six fail and three pass. Closed two pre-existing holes: literal specifiers missed deeper nesting, and the allowlist switched the whole rule off |

**T002's ten cases.** Seven must fail:

1. A badge on the allowlisted `Reaches.tsx` — *this passed before T002*, and is the hole T002 closed
2. A badge on a newly-allowlisted screen
3. A reach count in the shell (`App.tsx`)
4. Reach data in a shared component
5. A reach summary on a screen not on the allowlist
6. A tray surface, anywhere
7. A dock or taskbar progress surface, anywhere

Three must pass:

8. Reach data on an allowlisted screen — the whole point of the allowlist
9. The typed IPC wrapper declaring a reach command
10. A test naming a surface it asserts is absent

**T003's nine cases.** Six must fail: reaches imported two levels deep (the old hole);
reaches on a screen not allowlisted; reaches in the shell; journal on an unrelated screen;
journal on `History.tsx`; and journal on `Reaches.tsx` — the last two being what the old
`off` allowlist silently permitted. Three must pass: reaches on `History.tsx`, both modules
on `CheckIn.tsx`, and journal on `Day.tsx`.

Then confirm the classification test still holds, since ten commands were added to it:

```sh
cd src-tauri && cargo test -p cairn --no-default-features ipc_surface
```

## Scenario 1 — The evening check-in (US1)

1. Set the evening hour to a few minutes ahead. Leave Cairn open.
2. Wait for the hour. **Expect exactly one notification.** (SC-001)
3. Dismiss it. Wait through the rest of the evening. **Expect nothing further** — no repeat,
   no escalation, no second notice. (SC-002, FR-004)
4. Open the check-in from the app. Expect today's reaches, a journaling space, and perhaps a
   quote.
5. Write an entry. Save. Navigate away and reopen. **Expect the text intact and editable.**
6. Restart the application. Reopen the check-in. **Expect no second announcement for today**
   — the record is durable, not in-memory. (research R2)
7. Turn the announcement off in settings. Advance to the next evening. **Expect no notice, and
   the check-in still reachable.** (SC-003, FR-003)

**The one to try hardest to break**: reopen the app repeatedly across the chosen hour. The
announcement must fire at most once for the day no matter how many times the decision is
asked for.

## Scenario 2 — Nothing interrupts outside that hour (US1, Principle V)

1. With protection on and reaches occurring, use the machine through a full day.
2. **Expect zero notices, prompts, badges, or invitations to reflect** at any point other
   than the chosen hour. (SC-004, FR-005)
3. Reach a protected site. **Expect nothing at all** — this is `002`'s guarantee and this
   slice must not have weakened it.

## Scenario 3 — Seeing the pattern (US2)

1. Seed four weeks of reach history.
2. Open the history view. Break down by site, by hour of day, by day of week. Change the date
   range. **Expect all four to work with zero journal entries written.** (SC-005)
3. Choose a range containing no reaches. **Expect it to read as a quiet range** — neither an
   achievement nor a warning. (FR-024)
4. Choose a range crossing a daylight-saving change. **Expect the interface to state that
   hour buckets are approximate** rather than presenting them as exact. (research R4)
5. Seed 2 years and 10,000 entries. Change ranges and breakdowns. **Expect no perceptible
   wait.** (SC-006)

## Scenario 4 — A day, whole and honest (US3)

Seed four distinct days and open each.

| Day | Expect |
| --- | --- |
| Reaches and an entry | Both shown together (FR-021) |
| A period Cairn was not running | The gap shown beside the count; the count never presented as the whole day (SC-007) |
| Silent mode all day | An invitation to estimate; the estimate clearly the person's own, not a measurement (FR-012) |
| Skipped, no entry | Shown as skipped. **No guilt language, no penalty, nothing to catch up on** (SC-015) |

Then, with an estimate present, open the by-site and by-hour breakdowns. **Expect the estimate
excluded and the exclusion stated** — not silently missing. (SC-008)

## Scenario 5 — A missed day is not a debt (US3, FR-026b)

1. Skip several days deliberately.
2. Sweep every screen. **Expect nothing that counts, lists, totals, or draws attention to the
   days without entries.** No "3 days missing", no badge, no prompt, no nudge. (SC-016)
3. Open one of those days and write an entry for it. **Expect it to work on exactly the same
   terms as today.** (FR-026)
4. Compare it to an entry written on its own day. **Expect no visible difference** — no
   "written later", no composition date. (FR-026a, SC-016)

## Scenario 6 — The entries are theirs (US4)

1. Write entries across several days. Revise one, delete another. Restart. **Expect the rest
   intact, nothing aged out or summarized away.** (SC-014)
2. Delete a single day's reaches. Then a range. Then all of it. After each:
   - **Expect no marker, no residue, no gap raised on the deleted range's behalf.** Compare
     every view against the same data recorded without those days — they must be
     indistinguishable. (SC-017, FR-018a)
   - **Expect no report of how much was removed**, and confirmation copy free of loss, cost,
     or regret. (SC-018, FR-018b)
3. Delete a day's reaches and confirm its journal entry survives, and the reverse.
4. Confirm the trail and protection state are untouched by any deletion.

## Scenario 7 — Fail closed, both directions (US4)

1. Make the key unavailable.
2. Open the check-in. **Expect a plain sentence saying entries cannot be opened, and the
   journaling space not offered at all** — not offered and then failing. (research R5)
3. Confirm **protection is still in force and reaches are still being recorded.** (SC-012)
4. Restore the key. **Expect every prior entry present and unmodified** — nothing was
   discarded, reset, or written over. (FR-029, SC-012)

## Scenario 8 — Full deletion reaches the new tables

```sh
cd src-tauri && cargo test -p cairn --features history delete_all_data
```

Journal entries and estimates must be gone afterwards. They live in the file `002` already
removes, so this passes by construction — which is exactly why it is asserted rather than
assumed. (data-model.md)

## Scenario 9 — Nothing leaves the machine

1. Capture network traffic over ordinary use including several check-ins.
2. **Expect zero outbound connections.** (SC-013)
3. Confirm the quote came from the bundled resource and nothing was fetched. (FR-009)

## Known limits at this slice

State these plainly rather than treating a scenario as failed when it meets them.

- **The announcement needs Cairn to be running.** If the machine is off or the app is closed
  at the chosen hour, nothing is announced and the check-in is simply available un-announced
  when next opened. This is Complexity Tracking **C1**, closed by the tray and autostart
  slice, and the interface says so.
- **Hour buckets across a daylight-saving change are approximate** by one hour for the
  affected reaches (research R4), and the interface says so.
- **R1 and R7 are unresolved go/no-go items.** The notification dependency's build graph must
  be verified on all three targets, and SC-006 must be measured rather than assumed.
