# Phase 0 — Research: The evening check-in and honest history

**Feature**: `003-reflection-and-history` | **Date**: 2026-08-27

Seven questions had to be settled before design. Two are go/no-go items that cannot be
answered from this machine and are marked as such rather than guessed — slice `002`
established that a dependency fact nobody verified is a supply-chain fact invented out of
nothing, and that rule applies here.

---

## R1 — Can Cairn raise a notification without admitting anything network-capable?

**Status: GO/NO-GO. Must be resolved before the announcement is built.**

**Decision (proposed)**: add `tauri-plugin-notification` 2 and its npm counterpart, and
verify the resolved build graph on all three desktop targets before writing a line against
it.

**Why this cannot be settled here**: `cargo` is not available on this machine, so the graph
cannot be resolved. `check-no-network-deps.sh` reads the real per-target build graph with
`cargo tree` rather than the lockfile, precisely because the lockfile over-reports. That
check *is* the answer to this question, and it has to be run.

**What is expected, stated as an expectation and not a finding**: the plugin's backends are
D-Bus on Linux, WinRT toast on Windows, and the platform notification framework on macOS.
None of those is HTTP. The guard's banned list already anticipates the category — it names
`tauri-plugin-updater` and `tauri-plugin-http` explicitly — so Tauri plugins were understood
as a risk surface when it was written, and this one is expected to pass. Expected is not
verified.

**Fallback ladder if it does not pass**, in order of preference:

1. **Implement the announcement behind the platform seam directly, with no new dependency.**
   This is more attractive than it first appears on Linux: `keyring` is already configured
   with `async-secret-service` and `crypto-rust`, which means a D-Bus client is *already in
   the tree*. A desktop notification on Linux is a D-Bus method call. Windows and macOS would
   each need their own small implementation behind the same trait.
2. **Ship the slice without the announcement**, with the check-in reachable exactly as
   FR-003 already requires when the announcement is switched off, and the absence stated in
   the interface under Principle III.

**Alternatives rejected**: adding a general-purpose notification crate that brings its own
async runtime — the tree already has `tokio` and does not need a second. Widening the guard's
banned list to permit something that pulls HTTP — the guard's own message forbids this, and
it is right to.

---

## R2 — How is "at most once per local day" made true rather than merely intended?

**Decision**: a pure function in `domain/checkin.rs` decides. It takes the start of the
person's local day, the chosen hour, the current instant, and the day Cairn last announced
for. It returns whether an announcement is due. Rust records the answer durably before the
notification is raised; the interface renders, and never decides.

**Rationale**: this is the load-bearing choice of the whole slice. Slice `002` guaranteed
silence by refusing the capability, and the rewritten guard cannot lean on absence any more —
it has to lean on proof. A pure function over explicit inputs is provable by unit test at any
call frequency: called a thousand times in a day it returns *due* at most once. A timer in
the frontend proves nothing, because a reopened window resets it and a test would have to
simulate the window to say otherwise.

Recording *before* raising, rather than after, is deliberate. A crash between the two loses
one reminder; the reverse order risks a second notification, and of the two failures only one
interrupts somebody.

**On clock manipulation**: the waiting-period gate uses `TrustedClock`, an advance-only
elapsed-second counter that resists a person moving the clock to shorten a wait. That
machinery is deliberately **not** reused here, and the reason is that the threat model does
not carry over. Shortening a wait buys access, so it is worth defending against. Producing an
extra reminder buys nothing — there is no incentive to game it, and the worst outcome of a
clock change is one extra or one missed announcement, neither of which grants anything or
takes anything away. The announcement is therefore keyed to the local calendar day, which is
what a human means by "9pm", and the cost is accepted openly.

**Alternatives considered**: keying off `TrustedClock` — rejected, it measures elapsed
seconds and cannot express "9pm", and forcing it to would make the reminder drift away from
the hour the person chose. Storing only a timestamp of the last announcement and comparing a
24-hour difference — rejected, it drifts: an announcement seen at 21:04 pushes the next past
21:00 the following day, and repeated a few times the reminder walks out of the evening.

---

## R3 — Where does the announcement fire from, and how does Rust know the local hour?

**Decision**: the interface supplies the local frame; Rust owns the decision and the record.
The frontend already computes the start of the local day for the Reaches screen. It passes
that same value, plus the current instant, and Rust compares against the chosen hour with
integer arithmetic. No timezone crate enters the tree.

**Rationale**: Rust's standard library has no local-time facility — `SystemTime` is UTC — so
the alternative is a timezone-aware crate in a dependency set the project keeps deliberately
tiny. Meanwhile the browser runtime knows the person's timezone correctly and already does
this exact computation in `Reaches.tsx`. Passing the local frame inward reuses an established
pattern rather than inventing a second source of truth about what day it is.

**Who runs the clock**: the application process, while it is running. Not the privileged
helper — it is elevated, has deliberately no channel to the interface, and giving it one so
it could interrupt somebody would be the worst trade available in this feature. This is the
direct cause of Complexity Tracking **C1**: no tray and no autostart until a later slice
means no announcement when Cairn is closed. The check-in remains available un-announced, and
the interface says so.

**Alternatives considered**: adding `chrono` or `time` with local-offset support — held in
reserve; if a later slice needs local time in Rust for another reason this decision should be
revisited rather than worked around twice. A background OS-scheduled task — rejected, it is
an autostart surface by another name and belongs to the slice that owns removal of such
things.

---

## R4 — Where can the pattern arithmetic live, given it needs local time and `domain/` is pure?

**Decision**: `domain/patterns.rs`, pure, with the local offset in seconds passed as an
argument. Bucketing by hour of day and by day of week is integer arithmetic on
`at + offset`. No clock is read and no platform is consulted, so `check-domain-purity.sh`
stays satisfied and the module is property-testable with `proptest` alongside the existing
splicing tests.

**Rationale**: three constraints meet here — bucketing is inherently local, the pure layer
may not read a clock, and the dependency policy resists a timezone crate. Passing the offset
inward satisfies all three. It also puts the most easily-wrong arithmetic in the product
inside the one layer that needs neither a database nor a GUI to test.

**The cost, stated rather than hidden**: a single offset applied across a range spanning a
daylight-saving transition misplaces the reaches in the shifted hour. Cairn will state this
where it could mislead, rather than presenting the bucket as exact. The alternative —
per-day offsets supplied by the interface for every day in the range — is available if the
approximation proves to matter, and is deliberately not built first.

**Alternatives considered**: aggregating in SQL with SQLite's date functions — rejected, they
would bucket in UTC, silently placing a 1am local reach in the wrong hour and the wrong day.
Aggregating in the frontend — rejected on SC-006: it means transferring every row in the
range across the boundary to compute a summary, and the summary is a fraction of the size.

---

## R5 — What does fail-closed mean for *writing* a journal entry?

**Decision**: when the key is unavailable, the journaling space is not offered at all. The
check-in opens, states plainly that entries cannot be opened right now, and shows what is
still true — protection is on and reaches are still being recorded. Nothing accepts text it
cannot store.

**Rationale**: the constitution's fail-closed clause is written about reading — "report that
history cannot be opened … never silently discard". A journal introduces the mirror case
nobody had specified: someone types three hundred words into a box, presses save, and the
key is not there. Refusing the box costs them a sentence of explanation. Accepting the text
and failing costs them the writing, which is the one thing in this product that cannot be
regenerated from anything else. Between a disappointing interface and a lost entry, the
choice is not close.

**Alternatives considered**: buffering the entry in plain text until the key returns —
rejected outright, it writes an unencrypted journal entry to disk, which Principle II forbids
with no opt-out and which is exactly the data the encryption exists for. Buffering in memory
until the key returns — rejected as a false comfort: it survives neither a quit nor a crash,
and it would have to promise something it cannot keep.

---

## R6 — Where do quotes come from, and what makes one acceptable?

**Decision**: a bundled resource beside the existing category seeds, shipped with the
application. Selection criteria are a product constraint, not a matter of taste, and are
recorded here so a later contributor adding quotes has a rule to apply.

A quote is acceptable only if it does none of the following:

- exhort, motivate, or instruct — the person is not behind and does not need rallying
- congratulate, or imply an achievement, a score, or a comparison
- reference chains, streaks, runs, days counted, or anything broken
- imply the day went badly, or well
- moralise about self-control, discipline, or willpower

**Rationale**: Principle VI makes language the product, and a quote is the one string in the
check-in that Cairn chose rather than the person. A generic inspirational line would undo the
tone the rest of the screen is built to hold. The safest register is observational rather
than hortatory. The quote is also optional in both senses the spec records: switchable off,
and a check-in without one is complete.

**Alternatives considered**: fetching quotes — forbidden, Principle II, and not arguable. A
quote of the day tied to the date — rejected, it manufactures a reason to come back for the
quote rather than the writing, and repeats identically every year.

---

## R7 — Can history reads meet SC-006 at two years and ten thousand entries?

**Status: GO/NO-GO on measurement, but the design does not hinge on the answer.**

**Decision**: aggregate in Rust over an indexed range scan, return summaries rather than
rows, and measure before declaring SC-006 met.

**What is already known from slice `002`**: the reach table is keyed by timestamp and the
existing range read (`between`) is the seam this builds on, so the query shape is a bounded
scan rather than a table walk. Slice `002` also established the habit of measuring Cairn's own
cost at scale rather than assuming it — its at-scale test exists so that an accidentally
quadratic path cannot hide behind an unresolved spike. The same discipline applies here.

**What is not known**: the row count a real two years produces. Reaches are human actions
rather than machine events, so the volume is plausibly thousands rather than millions — but
that is a guess about people, and SC-006 is a measurement, so it will be measured with seeded
data at the stated bound.

**Rationale for aggregating in Rust rather than SQL**: R4 settles it — the buckets are local
and SQL's date functions are not.

**Note on what SC-006 is not**: it is unrelated to slice `002`'s unresolved resolution-latency
spike. That one concerns how fast a protected name fails to resolve; this one concerns how
fast a summary is drawn. They share nothing but the word *latency*.
