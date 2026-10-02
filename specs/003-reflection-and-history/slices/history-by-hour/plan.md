# Plan — slice `history-by-hour`

**Feature**: `003-reflection-and-history` | **Slice**: 5b of `story-split.md` | **Date**: 2026-10-02

Inside *Over time* on the reaches screen, a person chooses between *By site* and *By hour*, over the same range.
*By hour* lists all 24 hours of the day in order from midnight, each with its count and the same soft bar as by
site, an hour with no reaches as plainly as any other. A reach counts in the hour the computer's clock showed at
its own instant, so a range that crosses a clock change is exact, in both directions, and carries no note. What
Cairn did not see is stated above the hours, and the person's own estimates are said to be left out.

**How this plan was made.** As `history-by-site`'s was: 003 was planned whole before the delivery method arrived,
and `../../plan.md`, `../../research.md`, `../../data-model.md` and `../../contracts/` stand. This plan takes this
slice's part of them and cites rather than restates them. It is not produced by Spec Kit's plan command through
the links `/drive` prescribes (see *Complexity Tracking*). Where it departs from the feature plan, the departure is
named: B4 supersedes R4's single offset for the hours, so `summarize_reaches` gains the offsets in force across the
range (`../../contracts/ui-ipc.md`, amended 2026-10-02), and T046's notice is not built.

Checked against constitution **v1.5.0** (ratified 2026-08-18, last amended 2026-10-01), the version on this
branch's head. Another session has been amending it: the implementer re-reads the version line before Phase 1 and
re-checks *Constitution Check* below against any later one.

## Scope

In, from `../../tasks.md`:

- T039, T040: by hour. Every breakdown is available with no journal entry, and a quiet range returns 24
  zero-filled hours rather than nothing.
- T041: by hour. Cost at two years of history, now with the offsets of a zone that changes its clocks.
- T042, T045, retargeted to `Reaches.tsx` as in `history-by-site` (H1, B1): by hour and the view choice.
- T043: by hour, in `reflection/over_time.rs`, with the arithmetic in `domain/patterns.rs`.
- T044: by hour. `summarize_reaches` sends `by_hour` and `dst_approximate`, and takes the offsets.
- T049: by hour. An estimate never enters the hours, and its exclusion is stated.

Out:

- T046 (the daylight-saving notice). B4 decides the hours are exact, so there is nothing approximate to state.
  `dst_approximate` is sent and is always `false` (see *The hour*). T046 is closed as superseded, not built.
- By day of week (`history-by-weekday`) and movement (`history-movement`). Each will take the same offsets when
  it is built. They are not built here.
- When Cairn first counted (`first-counted`, H5). The range states the gaps Cairn recorded and the standing
  sentence, exactly as by site does.
- Any change to how a reach is recorded. A reach stays a domain and an instant (Principle II, and Q1 below).
- `domain::patterns::summarize` and `crosses_offset_change`. Both stay as they are, pinned by `tests/patterns.rs`
  and their own unit tests. Neither is called by this slice. The contract no longer names `crosses_offset_change`
  for `dst_approximate`. Removing it is not this slice's work.
- `src/screens/History.tsx`. It is not created (H1).

Acceptance: US2 scenario 1 (by hour, and changing the range), 3, 4 and 5; FR-019 (by hour), FR-022, FR-022a,
FR-023 (for hours) and FR-024; SC-005 to SC-008 as they bear on by hour; the edge cases *The clock moves* and *A
single reach at 23:59 versus 00:01*; gaps review B1–B4, and H4 and H5 above the hours, in `../../spec.md`.

## The hour (B4): how a reach is bucketed, and why there

### The question

B4: *a reach counts in the hour the computer's own clock showed when it happened, with the offset in force at that
instant.* The core cannot know that offset. `domain/` may read no clock and consult no zone
(`scripts/check-domain-purity.sh`), and the rest of the core has no local-time facility. Rust's standard library
offers only UTC (`SystemTime`). That is what R3 records, and it was not re-read against Rust's documentation for
this plan (*assumed*, from R3). The interface knows the zone, and it is already the one source of truth about
local days: `src/localDays.ts` computes every day's and every range's bounds from the calendar.

### Chosen: the interface sends the offsets in force across the range, and the pure domain buckets each reach by the offset in force at its instant

The interface already computes `range_start` and `range_end` with `Date`. It now also computes the **offset
changes inside the range**: a list `[{ from, offset }]` whose first entry is `{ from: range_start, offset: the
offset in force there }`, followed by one entry for every instant inside `[range_start, range_end)` at which the
computer's clock changes its offset. `offset` is seconds east of UTC (+3 600 for London in summer), whole seconds.

`src/localDays.ts` finds the changes by asking `Date` for the offset at each local midnight from `first_day` to
the day after `last_day`. Where two neighbouring midnights differ, it searches that day to the second for the first
instant with the new offset. The offset at an instant `t` is `-new Date(t * 1000).getTimezoneOffset() * 60`,
rounded to whole seconds.

The core holds the list to rules that are true in every zone (`check_offsets`, beside `check_range`, below). Then
`domain::patterns::by_hour(reaches, first_offset, changes, from, to)` gives each reach in `[from, to)` the offset
of the last change at or before its instant (a binary search, `partition_point`), and buckets it as
`summarize` already does: `(at + offset).rem_euclid(86 400) / 3 600`. It is pure, so it is property-tested with
`proptest` and needs no database and no GUI.

**Evidence (a run against it).** The search was run on 2026-10-02 against Node v22.22.1, for two years from
1 October 2025, in four zones. It found every change at the instant the zone's rules put it:

| Zone | Changes found (UTC) | Offsets |
|---|---|---|
| `Europe/London` | 2025-10-26 01:00, 2026-03-29 01:00, 2026-10-25 01:00, 2027-03-28 01:00 | +3 600 ↔ 0 |
| `Australia/Lord_Howe` | 2025-10-04 15:30, 2026-04-04 15:00, 2026-10-03 15:30, 2027-04-03 15:00 | +37 800 ↔ +39 600 (a half-hour change) |
| `America/Santiago` | 2026-04-05 03:00, 2026-09-06 04:00, 2027-04-04 03:00, 2027-09-05 04:00 | −10 800 ↔ −14 400 (changes at local midnight) |
| `Asia/Tokyo` | none | +32 400 throughout |

The scratch probe is not kept. Its algorithm is the one above, and the tests in Phase 1 restate its London and
Lord Howe numbers as fixtures. **What was not run:** the three webviews the app ships in (WebView2, WKWebView,
WebKitGTK). That they give `Date` the same zone rules as Node is *assumed*, on the grounds that each implements
ECMA-262's local time from the operating system's zone. The demo checks it in the running app (task K21). The plan
does not depend on the webview and Node agreeing, only on the interface's bounds, offsets and printed times all
coming from the same `Date`. They do, by construction.

**Why here.**

- *Domain purity.* The domain receives plain integers and reads nothing. `check-domain-purity.sh` has nothing to
  say about it.
- *One source of truth about local time.* The range's bounds, the offsets and the times the *Today* log prints
  (`toLocaleTimeString` in `Reaches.tsx`) all come from the interface's `Date`. A reach the log prints at 14:23 is
  counted under 14:00, on every day, including a clock-change day. A second source in the core could disagree with
  the first, for example because of a different zone database version, and a reach would sit in one hour by the
  list and in another by the hours.
- *Local-first.* No dependency, no network, and nothing new is recorded.
- *Honest.* Every reach is bucketed by the offset in force at its instant, so no hour is approximate.
  This includes a range whose two ends share an offset but which holds a summer between them. R4's end-to-end
  comparison could not see that case: a 1 January to 31 December range has the same offset at both ends.
- *The contract.* The amendment is additive. One parameter is added, and two fields join the answer, as the
  amendment of 2026-10-01 anticipated. No command is added, so `ipc_surface.rs`'s `CLASSIFIED` does not grow.
- *Cost at SC-006's scale.* Two years at 50 reaches a day is 36 500 reaches. A zone that changes its clocks twice a
  year sends five entries. Bucketing is `O(n log k)` over reaches already read for by site, against a 1 000 ms bound
  (`patterns_at_scale.rs`). On the interface, the search is one `Date` per day of the range, plus about 17 steps
  per change: about 760 `Date` calls for two years. There is no upper limit on a range's length (as for by site),
  so a range of centuries costs the interface one `Date` per day. That is the person's choice, and the screen does
  not offer such a range by default.

### Rejected

| Option | Why not |
|---|---|
| R4 as planned: one offset for the range, with `dst_approximate` and T046's notice | Superseded by B4. It misplaces every reach after a change by an hour, and its signal compares only the two ends, so a range that holds a summer and starts and ends in winter would be called exact while it is wrong |
| Per-day offsets (one per local midnight), R4's fallback | Wrong for the hours between midnight and the change on a clock-change day (01:00–02:00 in London), which is where the error R4 accepted lives |
| A platform service in the core for the local offset (`localtime_r`'s `tm_gmtoff` through `libc` on Linux and macOS; a Win32 time-zone call on Windows) | It adds `unsafe` FFI on three platforms and, on Windows, a direct dependency, to learn what the interface already knows. It also makes a second source of truth about local time, which could disagree with the bounds and with the times the log prints. The behaviour of these calls was not read for this plan: *assumed*, and not needed |
| The interface buckets the reaches itself | R4's rejection holds: every reach in the range crosses the boundary (36 500 rows for two years) to produce 24 numbers, and the counting rules would leave the core, where by site's live (SC-006) |
| Recording the offset with each reach, when it is counted | The only option that keeps the hour a reach showed **before the computer moved to another time zone**. But Principle II (NON-NEGOTIABLE) says reach counting records *domain and timestamp only*, and an offset discloses roughly where the person was. It would also need the platform service above, on every platform, and a change to the store's schema. And the *Today* log would still print the time by the zone the computer has now, so the two would disagree. This is a decision for the owner, not for a plan. See Q1 |

### What a time-zone change does, stated rather than hidden

A daylight-saving change, in either direction, and any change in a zone's own rules over the years are exact:
`Date` applies the zone's full history. **When the person moves the computer to another time zone**, every reach,
including those recorded before the move, is read in the zone the computer has now. That is the same reading the
*Today* log and the check-in already make when they print a reach's time. The core keeps no zone of its own, so
the same arguments give the same answer (scenario 7). This is how this plan meets the owner's words *just match the
time of the computer*. It does not meet B4's gloss, *the hour the computer's own clock showed when it happened*,
for a reach recorded in another zone. Q1 asks the owner which is meant.

## Acceptance, as scenarios through the driving port

Constitution v1.5.0, *Acceptance-Driven Development*. In the Rust scenarios, each **When** enters through
`AppState::summarize_reaches`, as the IPC command serves it, and each **Then** is observed in what it returns.
`offsets` is the list the interface would send, written out as a fixture. In the screen scenarios, each **When** is
the person acting on the reaches screen, with a fake reader written in the test tree (no `vi.mock`), and each
**Then** is what the screen shows and what it asked the command for.

Fixtures, in `Europe/London` unless named otherwise. Autumn: clocks go back at 2026-10-25 01:00 UTC
(`1792890000`), from +3 600 to 0. Spring: clocks go forward at 2026-03-29 01:00 UTC (`1774746000`), from 0 to
+3 600.

1. **All 24 hours, from midnight (B2, B3, T040).** **Given** a 4-week range with no clock change (offsets
   `[{range_start, 3600}]`), with reaches at 14:10, 14:50 and 15:05 local on one day and 02:30 on another, **When**
   `summarize_reaches(first_day, last_day, range_start, range_end, offsets)` is called, **Then** `by_hour` has
   exactly 24 entries, `hour` 0 to 23 in order. Hour 14 is 2, hours 15 and 2 are 1 each, and every other hour is
   present with 0. `dst_approximate` is `false`, and `sealed` is absent. **And given** a quiet range, **then**
   `by_hour` is 24 zeros, never `[]`.
2. **The edges of the range.** **Given** a reach the second before `range_start` and one at `range_end`, **Then**
   neither is in any hour, as neither is in `by_site`. The sum of `by_hour` equals the sum of `by_site`.
3. **Autumn, the clock goes back (B4).** **Given** a range from 2026-10-19 to 2026-11-01, offsets `[{range_start,
   3600}, {1792890000, 0}]`, and reaches at `1792890000 − 1` (01:59:59 BST), `1792890000` (01:00:00 GMT),
   `1792890000 + 1 800` (01:30 GMT), and 2026-10-26 12:00 UTC, **Then** hour 1 holds the first three, because the
   repeated hour is one hour on the clock. The last reach is in hour 12, not 13, and `dst_approximate` is `false`.
4. **Spring, the clock goes forward (B4).** **Given** a range from 2026-03-23 to 2026-04-05, offsets
   `[{range_start, 0}, {1774746000, 3600}]`, and reaches at `1774746000 − 1` (00:59:59 GMT) and `1774746000`
   (02:00:00 BST), **Then** the first is in hour 0 and the second in hour 2. Hour 1, which the clock skipped that
   night, is still listed (B2), with whatever the range's other days hold.
5. **A year whose ends agree.** **Given** a range from 2026-01-01 to 2026-12-31, whose two ends are both at offset
   0, with the year's two changes in `offsets`, and a reach at 2026-07-01 12:00 UTC, **Then** it is in hour 13
   (BST). The case R4's end-to-end comparison would have called exact while placing it in hour 12.
6. **A half-hour change, southern hemisphere.** **Given** `Australia/Lord_Howe`'s offsets across 2026-10-03 15:30
   UTC (+37 800 to +39 600), and reaches the second before and at that instant, **Then** they fall in hours 1 and 2
   (01:59:59 and 02:30:00 local). No offset is assumed to be a whole hour.
7. **A time-zone change (the computer moved).** **Given** a reach at 2026-09-15 13:00 UTC, **When** the range is
   asked for with London's bounds and offsets, **Then** it is in hour 14. **And when** the same dates are asked for
   with `America/New_York`'s bounds and offsets (−14 400), **then** it is in hour 9. **And when** London's are sent
   again, **then** the answer is the first one, unchanged. The core keeps no zone between calls: the hour follows
   the offsets the interface sends, and `dst_approximate` is `false` each time.
8. **Midnight (edge case *23:59 versus 00:01*).** **Given** reaches at 23:59 and 00:01 local, **Then** they fall in
   hours 23 and 0.
9. **No journal entry needed (US2 scenario 3, T039).** **Given** reaches and no journal entry, **Then** `by_hour` is
   complete. **And given** entries on three days, **then** `by_hour` is identical.
10. **An estimate is not a reach, for hours (FR-023, SC-008, T049).** **Given** the person's own estimates on two
    days in the range and one on the day after it, **Then** `by_hour` is what the reaches alone give, and
    `estimates_excluded` is 2, the same field by site states.
11. **What Cairn did not see, above the hours (H4, H5, FR-022, FR-022a, SC-007).** **Given** the gaps of
    `us2_by_site.rs` scenario 5, **Then** `gaps` and `coverage_note` are exactly what by site gets for the range.
    **And given** a range wholly inside a gap, **then** `by_hour` is 24 zeros, the coverage note is present, and the
    screen states it above the hours (scenario 21), so an unobserved range is never answered as a quiet one alone. **And given** a day of reaches deleted through the history store, **then**
    the hours count only what remains, and no gap appears on that day's account.
12. **The offsets refused (the contract, amended).** **When** it is called with `offsets` that are empty; whose
    first `from` is not `range_start`; whose first offset is not the one `range_start` implies for `first_day`; whose
    `from`s do not strictly increase, or reach `range_end`; with an offset outside −12 h to +14 h; with two
    neighbouring offsets equal or more than 2 h apart; whose last offset is more than 2 h from the one `range_end`
    implies; or with more entries than the range has days plus one, **Then** each is refused with the range's one
    sealed sentence, and nothing else is returned. Each limit is held at its edge and one second (or one entry)
    past it, as `range_bounds.rs` holds `check_range`. Every subtraction is checked, and `i64::MIN` and `i64::MAX` are
    refused, not panicked.
13. **Sealed, and a read that does not go through.** **Given** the key is unavailable, or a history that opens but
    cannot be read, **Then** `sealed` holds the sentence, `by_hour` is `[]` (not 24 zeros, which would read as a
    quiet range), and `dst_approximate` is `false`.
14. **A build without the history.** **Given** `--no-default-features`, **Then** `sealed` is `NO_HISTORY`, with
    `by_hour` `[]`.
15. **At scale (SC-006, T041).** **Given** two years at 50 reaches a day across 300 sites, and London's five-entry
    offsets, **When** it is called for the two years, **Then** it answers inside 1 000 ms, and `by_hour` sums to
    every reach. This is Cairn's own cost, not what a person perceives, as the file's header says.
16. **The wire shape (Principle III).** **When** the answer is serialised, **Then** it holds exactly `by_site`,
    `by_hour`, `gaps`, `coverage_note`, `estimates_excluded`, `dst_approximate` and `sealed`. It never holds
    `by_weekday` or `movement`, because nothing computed them.

The interface's offsets, `src/localDays.ts`:

17. **The changes, found.** **Given** `TZ=Europe/London`, **When** `offsetChanges("2026-10-19", "2026-11-01")` is
    asked, **Then** it is `[{ from: rangeBounds(...).start, offset: 3600 }, { from: 1792890000, offset: 0 }]`. For
    `2026-03-23..2026-04-05` it holds `1774746000` with +3 600. For a winter month it is one entry. For
    `2026-01-01..2026-12-31` it is three entries. In every case the first `from` equals `rangeBounds(...).start`, the
    list strictly increases, and nothing is at or after `rangeBounds(...).end`. **Given** `TZ=Australia/Lord_Howe`,
    the half-hour changes of the table above are found to the second.

The screen, `Reaches.tsx`:

18. **Where it lives (B1, H1).** **Given** *Over time*, **Then** it shows *By site* and *By hour* as a choice under
    the range, with *By site* pressed. **When** the person chooses *By hour*, **Then** the hours replace the sites
    for the same range, with no second read. **When** they change *From*, **Then** the screen reads again and stays
    on *By hour*. **And when** they go to *Today* and back, **then** *Over time* opens on 4 weeks and *By site*: the
    choice is not remembered, as the range is not (H2). Nothing in the header or the shell changes.
19. **What it asks for.** **Given** `TZ=Europe/London` and a `now` of 2 November 2026, **When** *Over time* opens,
    **Then** the screen calls `summarizeReaches("2026-10-06", "2026-11-02", start, end, offsets)`, with `offsets`
    being `offsetChanges` for those days: two entries, the second at `1792890000`.
20. **How it reads (B2, B3).** **Given** `by_hour` with counts at 2, 14 and 15, **Then** 24 lines appear in order
    from midnight. Each is named by the hour's start in the same form the *Today* log prints a time
    (`toLocaleTimeString` with `hour` and `minute` 2-digit), with its count as text and a bar against the largest
    hour, in the one warm colour. An hour with 0 shows `0` and an empty bar, as plainly as any other. No text says
    *peak*, *worst*, *best*, *busiest*, *quietest*, *top* or *rank*, nothing compares with another range, and nothing
    congratulates a quiet hour.
21. **Stated above the hours (H4, H5, FR-023).** **Given** a coverage note, **Then** it stands above the hours.
    **Given** `estimates_excluded` 2, **Then** the sentence above the hours says *Your own estimates for 2 days are
    not counted here, because an estimate has no hour.* With 1 day it says *Your own estimate for 1 day is not
    counted here, because an estimate has no hour.* On *By site* the sentence keeps saying *no site*. **Given** 0, no
    such sentence appears. The standing sentence, *Cairn counts only while it is running. This is what it saw over
    these days.*, closes the view on both.
22. **A quiet range (FR-024, B2).** **Given** `by_hour` all zeros and nothing sealed, **Then** *By hour* says
    *Nothing here for these days.* where the list begins, and the 24 hours stand under it, each 0, so the view
    reads the same as a quiet range by site and still shows every hour (Q2). There is no word of praise or warning.
23. **Sealed and unreachable.** **Given** `sealed`, or a read that throws, **Then** *By hour* shows exactly what
    *By site* shows: the sentence and no hours (W14).
24. **`dst_approximate`.** **Given** an answer with `dst_approximate` `false`, **Then** nothing on the screen speaks
    of approximation. The screen does not read the field (B4).
25. **No streak, no day count (US2 scenario 5, SC-010), no control over protection (I).** **Given** any state above,
    **Then** no text holds a streak, a *day N*, a chain or *in a row*, and no banned word, and no control changes
    protection.
26. **On a notebook page (004 `tonight-page`, D21, D22).** **Given** the notebook, **Then** the *By site* | *By
    hour* choice sits on the left page under the date boxes. The hours are on the right page, ruled, one hour to a
    line: the hour, the bar, the count, as a site's line is. The notes stay off the right page. The 24 lines scroll
    the page area with no inline height or overflow, *Which days* stays the spread's first child, and focus stays on
    the button just pressed when the choice changes. The page says the same words as Current.

## Structure Decision

The two deployables in `project.json` are those `history-by-site` used. `src-tauri` (*the core … domain,
encrypted stores … IPC*) holds the offsets' rules and the bucketing. `cairn` (*the interface: every screen a person
sees … reaches*) holds the offsets' computation and the view. Each purpose covers its half, and nothing is a new
service. The strategy is `leave-it` (ADR 0002), so the code lives where by site's does. There is one vocabulary
(a reach, a site, an hour, a range of days, a gap, the computer's clock), the same as by site's, so there is one
bounded context, and saying so is the whole decision.

```text
src-tauri/src/
├── domain/patterns.rs         # MODIFIED: OffsetChange; by_hour(reaches, first_offset, changes, from, to) beside by_site
├── reflection/over_time.rs    # MODIFIED: check_offsets; assemble takes the offsets, Range gains by_hour
├── ipc/state.rs               # MODIFIED: HourCount; Patterns gains by_hour and dst_approximate; summarize_reaches takes offsets
└── ipc/commands.rs            # MODIFIED: the command's `offsets` parameter
src-tauri/tests/
├── patterns_by_hour.rs        # NEW: by_hour's properties (proptest), no feature gate
├── offset_changes.rs          # NEW: check_offsets, each rule at its edge (`#![cfg(feature = "history")]`)
├── us2_by_hour.rs             # NEW: scenarios 1–14 and 16 through AppState
├── us2_by_site.rs             # MODIFIED: every call sends the offsets; scenario 12's five keys become seven
└── patterns_at_scale.rs       # MODIFIED: sends London's offsets; asserts by_hour sums to every reach
src/
├── localDays.ts               # MODIFIED: offsetChanges(firstDay, lastDay); hourInWords(hour)
├── __tests__/offsetChanges.test.ts          # NEW: TZ=Europe/London, scenario 17
├── __tests__/offsetChangesLordHowe.test.ts  # NEW: TZ=Australia/Lord_Howe, scenario 17
├── ipc/reaches.ts             # MODIFIED: OffsetChange, HourCount, Patterns' two fields, the wrapper's fifth argument
├── screens/Reaches.tsx        # MODIFIED: the By site | By hour choice; the hours, in Current and on the page
├── styles/tonight-page.css    # MODIFIED: layout only, for the choice on the left page
├── screens/__tests__/ReachesByHour.test.tsx      # NEW: scenarios 18–25 (TZ=Europe/London)
├── screens/__tests__/ReachesByHourPage.test.tsx  # NEW: scenario 26
├── screens/__tests__/TonightCurrentPin.test.tsx  # MODIFIED: Over time's cases gain the choice (a deliberate change; Pin)
└── screens/__tests__/tonightCases.ts             # MODIFIED only if the pin's fixtures need by_hour
```

`main.rs`, `ipc_surface.rs`, `scripts/`, `eslint.config.js` and the store do not change. No command is added. The
guard `check-no-ambient-counts.mjs` already treats `by_hour` as reach data (`REACH_DATA`, its `\bby_hour\b`
pattern), and it appears only in `src/ipc/reaches.ts` and `Reaches.tsx`, so the guard passes unedited.

**The domain function.** `by_hour` takes the first offset as a value and the changes after it as a slice, so it
always has an offset to apply and there is no empty case to guess at. It assumes the changes increase, which is
`check_offsets`' job. It does not depend on the reaches' order. It returns `[u32; 24]`. `Range.by_hour` is built
from the same reaches `by_site` is, with no estimates (FR-023).

**`check_offsets`** sits beside `check_range` in `reflection/over_time.rs` and runs after it, with the rules of
scenario 12. It reuses `offset_from_midnight` to find the offsets `range_start` and `range_end` imply, and
`LARGEST_CLOCK_CHANGE`. Its refusal is `check_range`'s sentence, unchanged: *Cairn could not tell which days those
are just now, so it has shown nothing. Protection is unaffected.* One sentence for every range Cairn cannot place.

**The screen.** One read serves both breakdowns: the answer already holds `by_site` and `by_hour`, so *By site* |
*By hour* is component state beside the range, forgotten on leaving *Over time*. The choice is a `role="group"`
of two `aria-pressed` buttons labelled *Seen by*, and it is present in every state of *Over time*, so it never moves
when an answer arrives. In Current it reuses the *Which days* buttons' classes. On the page it reuses
`nb-reaches-which__button`, so the 004 contrast and focus rules (D15, D22) hold it with no new colour, and
`tonight-page.css` gains only a layout rule for its container. An hour's line reuses a site's line: in Current, the
`li` with the label, the count and the bar; on the page, `nb-reaches-line` with `nb-reaches-site`,
`nb-reaches-bar` and `nb-reaches-count`. `hourInWords(h)` formats `Date.UTC(2000, 0, 1, h)` with `timeZone:
'UTC'` and the log's options, so no zone's clock change can skip or double a label. `ReachesReader.summarizeReaches`
gains the fifth argument. Existing fakes that take four still type-check and still pass.

**What it must not disturb**, from 004 `tonight-page` (#38) as the screen is now:

- *Today*, both its states, and the check-in: their Current markup is unchanged (`TonightCurrentPin.test.tsx`'s
  Today and Tonight cases are not edited).
- *By site* reads as it reads now. Its sentences, order, bars and states are unchanged apart from the choice
  above it (`ReachesOverTime.test.tsx`, `ReachesEdges.test.tsx` and `ReachesPage.test.tsx`, not edited).
- On the page: *Which days* is the spread's first child and the same node across views. The date boxes are the
  same nodes when an answer arrives. No inline height or overflow. The notes stay off the right page. Bars are as
  wide as Current draws them, from the sheet. The page and Current say the same words.

## Constitution Check (v1.5.0)

- **I. The Wall Holds:** no control on the view changes protection (scenario 25). Nothing listens for a blocked
  request.
- **II. Local-First (NON-NEGOTIABLE):** no dependency, no network. Reach counting still records domain and
  timestamp only: the offsets are computed for the read and never stored. The range is read from the encrypted
  history and fails closed (scenario 13).
- **III. Honest About Limits:** each hour is exact for the offsets the interface sends, and none is called exact
  that is not (scenarios 3–6). A refused range or set of offsets is the sealed sentence, never an empty answer
  (12, 13). A sealed answer's `by_hour` is `[]`, never 24 zeros. The time-zone reading is stated in this plan, and
  Q1 puts the remaining question to the owner rather than deciding it.
- **IV. Reversible:** no system file is touched.
- **V. Reflection at Distance:** no notification. *By hour* is reached by navigation alone.
- **VI. Voice:** no ranking word, praise, warning, streak or day count (20, 22, 25). Every string passes
  `check-banned-words.mjs`. Hour labels are small UI labels in the face the screen already uses, and no body text
  becomes monospace (the v1.5.0 visual rule).
- **VII. Free:** nothing is gated.
- **Delivery Method:** trunk. Tests come first: every RED task comes before its GREEN, and the Rust RED tests are
  written by a different agent than the core GREEN. The rules are proved where they live: the bucketing in
  `domain/patterns.rs`, the offsets' rules in `reflection/over_time.rs`, the offsets' computation in
  `localDays.ts`. The adapter, `commands.rs`, is held by scenarios 13, 14 and 16.

## Open questions, for the owner

**Q1: a reach recorded before the computer moved to another time zone.** B4 records the owner's *just match the
time of the computer* as *the hour the computer's own clock showed when it happened … or a time zone change, is not
approximate*. For a daylight-saving change this plan meets that exactly. For a person who travels, a reach from
before the move is read in the zone the computer has now: a 14:00 reach in London reads as 09:00 once the laptop
is set to New York. That is how the *Today* log already prints it. To keep the clock's hour from before the move,
Cairn would have to record the offset with each reach. Principle II (NON-NEGOTIABLE) allows *domain and timestamp
only*, so that needs a constitution amendment, a platform service on three operating systems and a schema change.

*Recommendation:* accept the reading in this plan. It matches *just match the time of the computer*, keeps the
hours and the log in agreement, and records nothing new about where the person was. Amend B4's gloss to say a
reach is read by the computer's clock **as it is set now**, with that clock's own daylight-saving history. If the
owner wants the travelled hour kept, that is a constitution question first, and then a slice of its own on the
counting path. Only scenario 7 and one sentence in *The hour* would change here.

**Q2: a quiet range, by hour.** B2 says every hour is shown, *even if empty*. FR-024 says a quiet range reads as
neither achievement nor warning, and by site says *Nothing here for these days.* *Recommendation*, which this plan
is written to: both. The sentence stands where the list begins, and the 24 hours, each 0, stand under it. The view
reads as a quiet range by site does, and still shows every hour. If the owner prefers the sentence alone, scenario
22 and one branch of K18 change.

## Pin

This slice changes code that was here before the method: `src-tauri/src/domain/patterns.rs` (gains `OffsetChange`
and `by_hour`, and nothing in it changes), `src-tauri/src/ipc/state.rs` and `ipc/commands.rs` (a parameter and two
fields on a command `history-by-site` added), and `src/ipc/reaches.ts`. `reflection/over_time.rs`, `localDays.ts`,
the *Over time* half of `Reaches.tsx`, `tonight-page.css` and their tests were written under the method by
`history-by-site` and 004 `tonight-page`, so their tests are their pin.

Already pinned in `delivery/survey/pinned.md`, and re-run before and after (K1, K20):

- the command surface and each command's effect on protection (`ipc_surface`): unchanged, no command added;
- today's reaches as `list_todays_reaches` serves them, and *Today*'s bounds (`gaps`, `Reaches.test.tsx`,
  `ReachesToday.test.tsx`): unchanged;
- no streak or day count in the shell, and reach data only on screens a person navigates to
  (`Protection.test.tsx`, `npm run check`): unchanged;
- the Today screen and Tonight in Current, element for element (`TonightCurrentPin.test.tsx`): **changes**,
  for Over time only; row 1 below.

`domain::patterns::summarize` is pinned by `tests/patterns.rs` and not changed. Two behaviours this slice
**changes**, so the host appends a row for each before the change lands (the ledger is the host's). Neither needs a
new seam, because each is already observed:

```markdown
| 2026-10-02 | Over time in Current, every state (looking, could not read, sealed, a list, nothing here), element for element, gains a *Seen by* group of two buttons, *By site* (pressed) and *By hour*, under the date boxes. Everything else in the Today screen and Tonight is unchanged. A deliberate change: 003 gaps review B1, slice `history-by-hour` | `Reaches.tsx` outside the notebook (no page context) | `TonightCurrentPin.test.tsx` (`tonightCases.ts`): Over time's cases rewritten by hand with the group inserted, never re-captured | `npx vitest run src/screens/__tests__/TonightCurrentPin.test.tsx` |
| 2026-10-02 | `summarize_reaches` takes `(first_day, last_day, range_start, range_end, offsets)` and serialises seven keys, `by_hour` and `dst_approximate` joining the five of `history-by-site`; by site, gaps, the note, the estimates count and every refusal are unchanged for the same range. A deliberate change: 003 gaps review B2, B4, slice `history-by-hour` | `AppState::summarize_reaches` (`ipc/state.rs`), `summarizeReaches` (`src/ipc/reaches.ts`) | `us2_by_site` (every call sends the range's offsets; the wire-shape test names seven keys); `us2_by_hour` | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test us2_by_site --test us2_by_hour` |
```

## Complexity Tracking

| Deviation | Why | What was done instead |
|---|---|---|
| The plan and tasks were not produced by Spec Kit's commands through `/drive`'s links | `specs/003-…/plan.md` and `tasks.md` are committed feature-level files from before adoption, and the links would write over them. The same reason was recorded for `history-by-site` | Written under `slices/history-by-hour/` from the committed feature plan, which they cite rather than restate. `research.md` is not linked or rewritten. This slice's dependency evidence is in *The hour* above |
| R4 and T046 are superseded for the hours | The owner decided the hours are exact (B4). R4's single offset misplaces reaches after a change, and its end-to-end signal misses a range that holds a summer | Offsets sent by the interface, bucketed in the pure domain. `dst_approximate` is sent and always `false`. T046 is closed as superseded. Recorded as a dated amendment in `contracts/ui-ipc.md` and `contracts/patterns.md`, beside the originals |
| `summarize_reaches` gains a parameter, and `us2_by_site.rs`'s wire-shape test changes from five keys to seven | B2 and B4 need the hours and the offsets on the one command H1 allows. The answer grows only by fields this slice computes | A pin row records it (above). Every existing scenario keeps its expectation; only the call sends the offsets |
| Over time's Current markup changes, though 004's pin says Current is unchanged | 004's pin protects today's interface from 004's restyling. B1 is a new decision about that interface, and this slice is the one it belongs to | A pin row records it. The pin's Over time cases are rewritten by hand with the group inserted, Today and Tonight's are not touched, and the page and Current still say the same words |
