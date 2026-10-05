# Plan — slice `first-counted`

**Feature**: `003-reflection-and-history` | **Slice**: 5e of `story-split.md` | **Date**: 2026-10-05

Cairn records, once, the moment it first counted: the first time a counting session was accepting on its ports and
keeping what it saw. An install that already holds history takes the earliest moment it recorded anything. A reach
whose time is earlier (a clock that was wrong) moves it back; no deletion moves it; only erasing everything clears
it. The moment lives in the encrypted history beside the reaches, and it travels to the interface as one more field
on the three answers that already carry a day or a range. In *Over time*, *From* can go no earlier than the day
Cairn first counted: an earlier date is moved up to it, so the widest range is "since Cairn started" and the
ten-second freeze at 1000-01-01 cannot be reached. Time before the first count is never a quiet stretch and never a
gap: rows read it as not seen, and one sentence names the start. On the first day, *Today* and the check-in say
when Cairn started counting. A row's count is read with its unit and written in the computer's own grouping.

**How this plan was made.** As `history-movement`'s was (`../history-movement/plan.md`), and before it
`history-by-weekday`'s and `history-by-hour`'s. 003 was planned whole before the delivery method arrived, and
`../../plan.md`, `../../research.md`, `../../data-model.md` and `../../contracts/` stand. This plan takes this
slice's part of them and cites them rather than restating them. It was not produced by Spec Kit's plan command
through the links `/drive` prescribes (see *Complexity Tracking*). Where it departs from the feature plan, it says
so:

- `data-model.md` adds two tables to the encrypted store and says nothing of when Cairn began recording, though
  its *skipped day* paragraph (line 86) already speaks of "after Cairn began recording". This slice adds a third
  table, of one row, and amends `data-model.md` (text below).
- The three answers `get_day`, `list_todays_reaches` and `summarize_reaches` each gain one field, `first_counted`.
  No command is added, and `ipc_surface.rs`'s `CLASSIFIED` does not grow.
- The core answers any range `check_range` accepts, as before. It does not refuse or move a range that starts
  before the first count: it marks that time as not seen. Moving *From* up is the screen's (F2).

Checked against constitution **v1.5.0** (ratified 2026-08-18, last amended 2026-10-01), the version on this
branch's head (`.specify/memory/constitution.md`, line 546). The implementer re-reads the version line before
Phase 1 and re-checks *Constitution Check* below against any later version.

**The branch.** `slice/first-counted` was cut from `main` at `76157dd` (the merge of PR #64, the after-movement
records). It holds one commit beyond trunk, `19d38f1`, the gaps review (F1–F7), and an uncommitted
`benchmark.json` that the harness keeps.

## Scope

In:

- F1–F7 of the gaps review (`../../spec.md`, *Gaps reviewed — slice `first-counted`*).
- H5's promise (`spec.md` line 311): "a later slice, `first-counted`, records when Cairn first counted, so every
  count can state the time before it". M11's open half (line 415): whether a range may start before the first
  count. F2 answers it: no.
- `decisions.md` D3: V29's freeze at the widest range, retired by F2 (see *The freeze*).
- `decisions.md` D2: V47 (a count has no unit for a screen reader) and V48 (counts are not grouped, and a wider
  count moves its bar), both as F7. V47 and V48 in `../history-movement/tasks.md` are closed by this slice's tasks.
- M16's standing sentence, which stays under every view (F3 says so).

Out:

- Erasing everything. `delete_all_data` (slice 002) already removes `history.db`, and the first count goes with it
  (rule 5). The words and the flow of erasing are slice `theirs` (`story-split.md` line 66). Nothing is built here
  for it beyond a scenario that pins it.
- A deletion command for reaches. `delete_reach_history` is a store method with no IPC command yet (it is `theirs`).
  F5 is proved at the store and read back through the answers.
- Time while protection was off or while the person chose silence (H5). It stays unrecorded, as H5 says. Only the
  time *before* Cairn first counted is named by this slice.
- Any coarser row for a long range (Q3 of `history-movement`, M11). With F2 the long range is gone from the screen.
- The single-day screen (`one-day`). `get_day` carries the field; only the check-in reads it.
- Any change to what a reach is. A reach stays a domain and an instant (Principle II, B4 clarified).

Acceptance: F1–F7; FR-022, FR-022a, FR-024 as they bear on the time before the first count; H5, M11, M16; D2
(V47, V48) and D3 (V29).

## Stories and rules, for the tasks stage

There is one story. Every task is `[US2]`, as in the four history slices before it (F4's two sentences on *Today*
and the check-in serve US2's honesty about coverage; they are not US1's journaling). The rules are numbered so a
task can name the rule it proves (`[rule 4]`) and the scenarios that hold it. Scenarios 1–21 enter through
`AppState` (and, where a rule lives in the store, through `OpenHistory`); 22 is `domain::first_count`; 23–41 are
the screens; 42 is `src/localDays.ts`; 43 is the guard; 44 is the demo.

| Rule | Decision | What must be true | Scenarios |
|---|---|---|---|
| 1 | F1 | Cairn records the moment a counting session is accepting and storing, once. A later session never moves it later | 1 |
| 2 | F1, III | A start that does not count records nothing: silence chosen, protection off, ports not handed over, or the history sealed | 2, 3 |
| 3 | F1 | The first open of a history written before this slice takes the earliest reach or gap it holds, once. A history with neither takes none | 4, 5 |
| 4 | F6 | A reach recorded earlier than the first count moves it back to that reach, when it is recorded and at every open. Nothing but erasing everything moves it later | 6, 7 |
| 5 | F5 | Deleting reaches or gaps, for a range or all of them, leaves it where it is. `delete_all_data` takes it with the file | 8, 9 |
| 6 | II | It is kept in the encrypted history. Sealed, nothing is written or read, every answer says `null`, and an upgrade's one-time fill waits for the key | 3, 19, 20 |
| 7 | contract | `first_counted` (an instant, or `null`) is on `DayView`, `TodaysReaches` and `Patterns`. No command is added | 10, 18 |
| 8 | F3, FR-022, FR-022a | In a range or a day, the time before the first count is not seen in the rows (the whole range, when Cairn has never counted), and it is never a gap, never in `gaps` and never in the coverage note | 11, 12, 13, 14, 15, 16, 17 |
| 9 | F4 | *Today* and the check-in say *Cairn started counting at 2:14 PM today.* for the day the first count falls in, and on no other day | 17, 35, 36 |
| 10 | F2 | *From* is never earlier than the day of the first count. A date typed earlier is moved up to it; so is the opening range. An answer for the earlier range is never drawn | 23, 24, 25, 26, 27 |
| 11 | F2, Q2 (recommended) | Where Cairn has never counted, *From* and *To* are held at today | 28 |
| 12 | F2, F3, Q1 (recommended) | One sentence names the start: F3's among the notes when the range holds the first count, F2's beside the date boxes otherwise. M16's standing sentence stays | 29, 30, 31, 32, 33, 34 |
| 13 | F7, V47 | In all four views a screen reader hears a count with its unit (*3 reaches*, *1 reach*), never a bare number run into the row's name | 37 |
| 14 | F7, V48 | A count is written in the computer's own grouping (*1,234*), and every count in a view takes the same width, so every bar starts at the same place | 38, 39 |
| 15 | D3, M11, R5 | The freeze is retired by rule 10. The core's memory bound for a wide range over IPC is unchanged | 21, 44 |
| 16 | VI, SC-006 | No new text holds a banned word, a day count or a number of days since the start. The new field is held to the screens a person navigates to | 40, 43 |
| 17 | III | `domain::first_count` never makes time after the first count unseen that no gap covers, and never makes time before it seen | 22 |

## Where the first count is kept (F1, Principle II)

### The question

F1 says Cairn records the moment it first counts. It must be kept somewhere that survives restarts, that no
deletion of reaches or gaps touches (F5), that erasing everything removes, and that obeys Principle II. Two
plain files already sit beside the history: `last-seen`, the presence mark, unencrypted because "nothing here names a
domain or a reach" (`src-tauri/src/counting/presence.rs` lines 32–36), and `config.json`. Is one instant reach
history, which Principle II says "MUST be encrypted at rest at all times" (constitution line 168)?

### Chosen: a one-row table, `first_count`, inside the encrypted history

```sql
CREATE TABLE first_count (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    at INTEGER NOT NULL
);
```

in `history.db`, under the same SQLCipher key as `reaches`, `coverage_gaps`, `journal_entries` and
`reach_estimates` (`src-tauri/src/store/history.rs` lines 207–226).

**Why it is reach history.** The instant on its own names no site. But F1 fills it, for an existing install,
from "the earliest moment it recorded anything (a reach or a gap)", and F6 moves it back "to that reach". Either
way the stored value can be exactly the instant of a reach. A plain file holding it would hold the time of a reach
in the clear, which is the record Principle II encrypts. So it is kept as reach history is kept, and every
property follows from where it is:

- *Encrypted at rest, key in the credential store* (II, line 168): the SQLCipher page encryption of research R5
  (`history.rs` lines 3–5).
- *Fail closed* (II, line 172): `History::open` never connects without the key (`history.rs` lines 110–127). A
  sealed history writes nothing and reads nothing, so the first count is neither filled nor moved, and every answer
  says `null` beside its sealed sentence (rule 6).
- *Deletion never moves it* (F5): `delete_reach_history` touches `reaches` and `coverage_gaps` only, by two fixed
  predicates (`history.rs` lines 470–518), and `delete_all_reach_history` deletes from those two tables only
  (lines 524–528). Neither names `first_count`. Rule 5 holds by construction and is still proved (scenario 8).
- *Erasing everything clears it* (F5, constitution line 417): `delete_all_data` removes `history.db`
  (`src-tauri/src/ipc/state.rs` line 482). The row goes with the file, as the journal does.
- *Additive* (constitution lines 429–432): a new table; nothing the previous build wrote is changed. A previous
  build opening this file runs its own `CREATE TABLE IF NOT EXISTS` statements and never reads the fifth table.

### Rejected

| Option | Why not |
|---|---|
| A plain file beside `last-seen` | It would hold a reach's instant in the clear (F1's fill, F6's move). `delete_all_data` does not remove `last-seen` today, so it would also outlive erasing everything unless 002's deletion grew |
| A key in `config.json` | Unencrypted, and configuration is about what the person chose, not what Cairn saw |
| Derive it at every read: the earliest reach or gap still recorded | F5 forbids it: deleting the earliest reaches would move the start later, and the deleted stretch would read as before Cairn existed |
| A column on `coverage_gaps` or a sentinel gap | FR-022a: the time before the first count is not a blind spot (F3), and a sentinel row is the residue `data-model.md` (Deletion) forbids |
| `PRAGMA user_version` to mark the one-time fill | Workable, but a second, invisible piece of schema state. Whether the table existed when the history was opened says the same thing, inside the same transaction |

## When it is written (F1, F6)

### The question

"The moment it first counts" must be a fact Cairn verified, never an intention (constitution line 194). An install
that already holds history has no such record, and F1 says it takes the earliest reach or gap. F6 says an earlier
reach moves it back. F5 says nothing else moves it.

### Chosen: one operation that only ever moves it earlier, at three places

`OpenHistory::note_counting(at)` writes the row if there is none, or moves it to `at` if `at` is earlier, and
otherwise does nothing:

```sql
INSERT INTO first_count (id, at) VALUES (1, ?1)
    ON CONFLICT(id) DO UPDATE SET at = excluded.at WHERE excluded.at < first_count.at;
```

UPSERT is SQLite 3.24 and later (<https://www.sqlite.org/lang_upsert.html>). The SQLCipher this build vendors is
SQLite 3.45.3 (`libsqlite3-sys-0.30.1/sqlcipher/sqlite3.c` line 499, the crate `rusqlite 0.32` pins in
`src-tauri/Cargo.toml` line 59). It is called:

1. **When a counting session starts and is keeping what it counts** (rule 1). In
   `AppState::begin_counting_session` (`ipc/state.rs` lines 647–682), after `session::start` returns
   `Counting::Available` *and* the sink is storing. The clock is read once at the top of the function: the gap since
   the last mark ends at that instant and counting begins at it, so the two agree. A second start, or a start the
   next day, is a no-op. A start where silence is chosen, protection is off, the ports are not handed over, or the
   history is sealed never reaches this line (rule 2; `start_counting`, lines 617–639). Which handle the call goes
   through (the history the sink holds, by a method on `RecordReach` in `counting/sink.rs`, or a second connection)
   is the implementer's choice; both are the same operation.
2. **When a reach is recorded** (rule 4, F6). `OpenHistory::record` (`history.rs` lines 236–244) inserts the reach
   and calls `note_counting(at)` in one transaction. A reach after the first count changes nothing. A reach before
   it, from a clock that was wrong, moves it back, so no recorded reach is ever behind *From*'s limit.
3. **When the history is opened** (rules 3 and 4). In `OpenHistory::connect`, after the existing schema step:
   - **Once, the fill (F1).** If `first_count` does not yet exist, it is created and filled, in one `BEGIN
     IMMEDIATE` transaction, with the earliest of `MIN(reaches.at)` and `MIN(coverage_gaps.from_at)`, or left
     empty when both are `NULL`. This runs on the first open of a history written by an earlier build, and on the
     first open of a new one (which holds nothing, so stays empty). After that the table exists and the fill never
     runs again.
   - **Every open, the settle (F6).** If a reach is earlier than the row (or there is a reach and no row), the row
     moves to `MIN(reaches.at)`. This repairs a reach written by an older build after a downgrade, or one whose
     note did not go through. It reads first and writes only when it would move, so an ordinary open takes no write
     lock. `MIN` on the indexed `reaches.at` (`reaches_at`, `history.rs` line 213) is answered from the index
     (<https://www.sqlite.org/optoverview.html#the_min_max_optimization>). A settle that cannot write (the other
     connection is busy) is left for the next open; the fill failing is the schema step failing, and seals the
     history as that step already does (`cannot_prepare`, line 228).

Gaps are read only by the fill, never by the settle. A gap's `from` is the last mark, a moment Cairn was running,
so for an install that already holds history it is a true counting moment (F1). After the fill, the only way a gap
can begin before the first count is a first run whose history was sealed: that run wrote the mark without storing
(`ipc/state.rs` lines 667–669), and the next run records a gap from it. That gap is wholly before the first count
the next run then writes, and rule 8 keeps it out of every answer.

**Monotone.** Every write is `min`. Deletions remove reaches and gaps only, which can raise `MIN(reaches.at)`
but never lower the row. So the first count moves only earlier, except when the file is removed (F5). F1's fill
may be later than the true start, where reaches before the upgrade were already deleted: Cairn then claims to have
seen less than it did, never more, as F1 accepts.

### Rejected

| Option | Why not |
|---|---|
| Write it only at session start | F6: a reach under a clock set back would sit before *From*'s limit, hidden |
| Write it at the first reach only | Hours of counting with no reach before it would read as before Cairn existed |
| Fill from reaches and gaps at every open, not once | After the fill, a gap that begins before the first count is the sealed-first-run case, and filling from it would name a moment Cairn was not storing as the start |
| Write it before `session::start` | It would record a start that `session::start` may then not make (ports taken). Principle III, line 194: verified state, not intended |

## How it crosses the boundary

### The question

The screen needs the instant in three places: on *Over time*, to limit *From* (F2) and name the start (F3); on
*Today* and in the check-in, to say when counting started on the first day (F4). Each place already reads one
answer. A new command would need a classification in `ipc_surface.rs` and a second read before the first.

### Chosen: one field, `first_counted`, on the three answers that already carry a day or a range

- `DayView` (`get_day`, `save_journal_entry`), `TodaysReaches` (`list_todays_reaches`) and `Patterns`
  (`summarize_reaches`) each gain `first_counted: Option<i64>`, serialised as an integer or `null`.
- `null` means Cairn has never counted, or the answer is sealed. A sealed answer is drawn as its sentence alone
  (as now), so the screen never reads `null` from it.
- It is the same instant on every answer, whatever day or range was asked. The screen compares it with the bounds
  it computed itself: `rangeBounds`, `dayBounds` (`src/localDays.ts` lines 55–80). "Inside" is
  `start <= first_counted < end`, the half-open rule every bound here uses.
- In TypeScript the field is optional, `first_counted?: number | null`. The contract already says a reader treats
  an absent field as not yet known (`../../contracts/ui-ipc.md` lines 52–54). So the forty-odd screen fixtures
  written before this slice keep their meaning: no limit and no sentence. The core always sends it.
- No command is added. `CLASSIFIED` in `ipc_surface.rs` is unchanged (Pin).

### Rejected

| Option | Why not |
|---|---|
| A new read, `get_first_count` | One more classified command, and the screen would need it before its first range read, a second round trip on every open of *Over time*. The precedent (four history slices) added fields, not commands |
| Send it only when it falls inside the day or range asked | *From*'s limit is needed whatever range is asked. One field meaning two things across answers invites a misread |
| The core builds the sentences | They name a time and a date in the computer's own form (M10). The core is locale-free (W2, W9). The Today log and every row label already format in the interface |

## The range (F2), and what the core does with time before the first count (F3)

### The question

F2 says the earliest *From* is the day Cairn first counted, and an earlier date is moved up to it. Someone must turn
the instant into a local day, hold the box to it, and handle the opening range (four weeks, H2), which on a new
install reaches back before Cairn existed. And the core must answer honestly for any range `check_range` accepts,
including one that starts before the first count, which IPC can still send.

### Chosen, the screen: the limit is the local day of the instant, and *From* is moved up to it

In `OverTimeView` (`src/screens/Reaches.tsx` lines 349–489):

- **The limit.** From the latest placed answer that carries the field:
  - `first_counted` a number: the limit is `localToday(new Date(first_counted * 1000))`, the computer's own date
    of that instant, capped at `todayDay` (a clock moved back after the first count can put the instant after
    today);
  - `null`: Cairn has never counted, and the limit is `todayDay` (rule 11, Q2);
  - absent: no limit (an answer from before this slice, which only test fixtures make).
- **The opening range.** The view opens on 4 weeks ending today and asks for it, exactly as now (H2). If the answer's
  limit is after `firstDay`, the view does not draw that answer. It keeps *Looking…*, sets `firstDay` to the limit
  (and `lastDay` too, if it was earlier), and the existing effect (lines 366–379) asks again. At most one extra read,
  and only while Cairn's first count is less than four weeks old. Because the first count only ever moves earlier
  (rule 4), the limit never moves later while the view is open, so this never repeats. The one exception is erasing
  everything while the screen is open. Then the limit becomes today, and the same move applies once.
- **A typed date.** `changeFirst` (line 381) moves a valid date earlier than the limit up to the limit. *From* gets
  `min={limit}` beside its `max` (lines 535–541). A date input reports a value below `min` as a range underflow
  rather than refusing it (<https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date#min>). So the
  handler, not the attribute, is what moves it, and the picker greys the earlier days. *To* keeps `min={firstDay}`.
- **Not remembered.** The limit is component state, read from each opening's answers, as the range is (H2).

### Chosen, the core: answer the range asked, and treat the time before the first count as not seen

`check_range` and `check_offsets` do not change. `assemble` (`src-tauri/src/reflection/over_time.rs` lines
98–143) reads `history.first_count()` and:

- **Rows.** `movement` is given the unseen time as
  `first_count::unseen(first_counted, range_start, range_end, &gaps)`: the stretch `[range_start, first_count)`
  (the whole range when Cairn has never counted), then the gaps from the first count on, sorted and disjoint. The
  domain's `movement` signature does not change. `history-movement` built `seen` "so that 5e only has to add
  instants to the unseen set" (`../history-movement/plan.md` line 222), and this is that. Under M12 a row is
  *partly seen* when more than half its passed time is unseen, and *not seen* when all of it is and it holds no
  reach. So a row wholly before the first count is *not seen*, and the first count's own row is *partly seen*
  only if Cairn started after midday of it.
- **Gaps and the note.** The answer's `gaps`, and so `range_coverage_note`, are
  `first_count::gaps_since(first_counted, &gaps)`: each gap cut to start no earlier than the first count, and
  dropped if nothing is left. When Cairn has never counted, they are as recorded. F3: the time before the first
  count "is never shown ... as one of the gaps".
- **Counts.** Unchanged. No reach can be before the first count once rule 4 has run.

`checkin::assemble` (`src-tauri/src/reflection/checkin.rs` lines 71–95) and `list_todays_reaches`
(`ipc/state.rs` lines 740–804) apply `gaps_since` to the day's gaps the same way, so the first morning is not
reported as a stretch Cairn "was not running" (FR-022a).

**Why the core does not refuse or move the range.**

- *Refusing* returns the sealed sentence, "Cairn could not tell which days those are just now"
  (`over_time.rs` lines 181–186), which would be untrue. It would also seal the screen's own first read on a new
  install, before it has learned the limit.
- *Moving the range* in the core would answer for days other than those asked. The title (`rangeInWords`) would then
  disagree with the rows. Finding the local midnight of the first count's day inside an offsets list is new
  arithmetic, and F2 already places the move in the screen ("the earliest *From* a person can choose").
- *Marking* keeps every answer true for any range IPC sends: rows before the first count are *not seen*, never a
  zero (FR-022), and a range wholly before it gets M13's "Cairn wasn't counting on these days." with no new code in
  the screen.

### Rejected

| Option | Why not |
|---|---|
| `check_range` refuses a `first_day` before the first count's day | An untrue sentence, see above |
| The core moves `first_day` and `range_start` up | Two sources of truth for the range; new offset arithmetic; F2 is the screen's |
| The core treats time before the first count as one more gap | FR-022a and F3: it is not a blind spot in Cairn's watching. It would also enter the coverage note's total |
| The screen holds the opening range back until a separate first-count read | Needs the rejected new command |
| Clamp the box with `min` alone | `min` does not change a typed value; the handler must (MDN, above) |

## The freeze (D3, V29) and the core's wide range (R5)

- **The screen.** With rule 10, the widest range the screen can send is from the first count's day to today. On an
  install a year old that is 53 weekly rows, against V29's 53 574 (`../history-movement/tasks.md` line 390). M11's
  "weeks however long the range" stands; the range is no longer centuries.
- **Where it could come back.** Only if a reach was recorded under a clock set centuries back (F6 moves the first
  count to it). The rows would then be true, and drawing them would be V29's measurement again. That is a known
  limit, recorded here and in the demo log (scenario 44), not a new decision. F6 chose that no reach is hidden.
- **The core.** It still accepts any range `check_range` places, so `tests/range_allocation.rs` keeps its claim:
  nothing is held per day. Its history holds one reach recorded through `record`, which now also writes the first
  count, so `unseen` gains one leading stretch. No list grows per day, and the test's bound and assertions do not
  change (scenario 21).
- **D3 closes.** The host records in `decisions.md` that D3 is answered by F2, and closes V29's carry.

## The words (F2, F3, F4)

| Where | Text | Shown when | Source |
|---|---|---|---|
| Beside the date boxes, left page | *Cairn started counting on Oct 1, 2026.* (`shortDateInWords(day, true)`: always the year) | a limit from a number is known, and the range does not hold the first count | F2; Q1 |
| Among the notes, left page, before the coverage note, every view | *Cairn started counting at 2:14 PM on Oct 1.* (the year by `namesYear`, as the rows, M14) | the range's bounds hold the first count | F3; Q1 |
| *Today*, left page, under the title, before the standing note | *Cairn started counting at 2:14 PM today.* | today's bounds hold the first count | F4 |
| The check-in, left page, before the coverage note | *Cairn started counting at 2:14 PM today.*, or *… at 2:14 PM on Thursday 1 October.* once the day has ended (`thisDay`, `CheckIn.tsx` line 283) | the opened day's bounds hold the first count | F4; D1 |
| Under every view | M16's standing sentence, unchanged | as now | M16 |

**The time and the date are the computer's.** The time is `clockTimeInWords(at)`, a new function in
`src/localDays.ts`: `new Date(at * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })`. The
date is `shortDateInWords` (lines 248–263, M10). The Today log uses `hour: '2-digit'` (`Reaches.tsx` lines
558–563). In a sentence that reads as a log stamp (*02:14 PM*), so the sentence takes `numeric`. The owner wrote
*2:14 pm*; the computer writes *2:14 PM* (en-US) or *14:14* (en-GB). M10 puts dates and times in the computer's
form and keeps the sentence in Cairn's English, and this follows it.

**Evidence (a run against it).** Node v22.22.1, ICU as bundled, on 2026-10-05, for the instant `1790860440`
(2026-10-01 14:14 in `Europe/London`): `{ hour: 'numeric', minute: '2-digit' }` gives *2:14 PM* (en-US) and
*14:14* (en-GB); `'2-digit'` gives *02:14 PM* and *14:14*. `(1234).toLocaleString()` gives *1,234* (en-US, en-GB),
`(1234567).toLocaleString('de-DE')` gives *1.234.567*, and `(1234).toLocaleString('fr-FR')` gives *1 234* with a
narrow no-break space (U+202F). The probe is not kept. Tests derive every expected string through the same `Intl`
call, so no test depends on the runner's locale (as `history-movement` scenario 25 did). **Not run:** the three
webviews. It is assumed, as before, that each follows the computer's region; the demo records what each shows.

**What it never says.** No number of days since the start (*day 3*, *4 days in*, *since 3 days*), no *first day*,
*only*, *already*, *welcome*, *new*, and nothing that congratulates the start or counts up from it (VI, line 253;
FR-033). The time before the start has no clause or colour of its own: rows read it as *not seen* (M5, M12), and
the one sentence names the start.

**The guards, checked against these strings and the code that makes them.**

- `check-banned-words.mjs` (lines 21–30, string literals in `src/` and `src-tauri/src/`): none of *failed, fail,
  denied, violation, relapsed, relapse, forbidden, you lost* appears. **Warning for the implementer:** a Rust string
  such as `"could not fail"` or a TS template holding *fail* trips it. Comments are not scanned by this guard.
- `check-no-streaks.mjs` (line 27, every source line, comments included): *started counting on Oct 1, 2026*,
  *at 2:14 PM today* and *on Thursday 1 October* have no `day` followed by a number. **Warning:** a comment such as
  `// day 1 of counting` or `// the first count's day 0` fails it. Write *the first count's own date*.
- `check-no-ambient-counts.mjs` (lines 61–70): the sentences hold no count. They appear in `Reaches.tsx` and
  `CheckIn.tsx`, both in `NAVIGATED_TO` (lines 48–55). `REACH_DATA` gains
  `{ pattern: /\bfirst_counted\b|\bfirstCounted\b/, why: 'when Cairn first counted' }`. The instant comes from the
  encrypted history and can be a reach's own instant (F6), so it belongs where reach data does and nowhere else
  (Pin, row 7). `localDays.ts` must therefore not name it: its new function takes `at`, not `firstCounted`.

## How a count is read and written (F7, V47, V48)

### The question

Every row with a count draws `<span className="nb-reaches-count">{row.count}</span>` after an `aria-hidden` bar
(`Reaches.tsx` lines 466–479). A screen reader hears the name, the clause and a bare number, so *week of Nov 3,
2025* is followed by *5* (V47). The number is not grouped, and `.nb-reaches-count` has `min-width: 2ch`
(`src/styles/tonight-page.css` lines 207–210). So a count wider than two characters pushes its bar's start left
of its neighbours' (V48).

### Chosen

- **The unit (rule 13).** Inside the count span, after the number, a visually hidden unit:
  `<span className="sr-only"> {count === 1 ? 'reach' : 'reaches'}</span>`. This is `sr-only`, the class
  `NotebookShell.tsx` line 37 already uses, as V47 prescribes. Visible text is unchanged, and a screen reader hears
  *5 reaches*. It applies in all four views, and only where a count is drawn: an `absent` row (W7, M5) has no count
  and no unit. Hidden text in the reading order is the established technique where a visible label would be noise
  (<https://webaim.org/techniques/css/invisiblecontent/>). `aria-label` on a `span` is not used: a `span` has the
  `generic` role, on which WAI-ARIA 1.2 prohibits naming (<https://www.w3.org/TR/wai-aria-1.2/#generic>).
- **The grouping (rule 14).** The number is `count.toLocaleString()`: the computer's own grouping, as dates and
  hours follow the computer (M10). The bar's width still comes from the number (`row.count / largest`), never from
  the text.
- **One width per view (rule 14).** The list sets `--nb-count-chars` to the length of the largest count's grouped
  text, and `.nb-reaches-count` takes `min-width: calc(var(--nb-count-chars, 2) * 1ch)`. Every count in the view
  then has the same box (digits are `tabular-nums`, line 205, and a separator is no wider than `0`), so every bar
  starts at the same place. A fixed `min-width` large enough for any count would take width from the bars on the
  narrow notebook page (V25's widths) for counts nobody has.

### Rejected

| Option | Why not |
|---|---|
| A visible unit (*5 reaches*) | Repeats a word on every row of a list whose heading already says what is counted. It changes every captured words-kept state and the page's rhythm |
| The unit as a sibling of the count span | V47 places it inside, so the number and its unit are one node to a reader |
| `aria-label` on the line | Replaces the line's spoken name and clause wholesale, and the role/label combination is unreliable across readers |
| A fixed `min-width: 7ch` | Wastes bar width on every small view (see above) |

## Acceptance, as scenarios through the driving port

Constitution v1.5.0, *Acceptance-Driven Development* (line 452). In the Rust scenarios each **When** enters through
`AppState` (`start_counting`, `summarize_reaches`, `list_todays_reaches`, `get_day`) as the IPC commands serve it,
with `AppState::now` fixed. Where a rule lives in the store (rules 3–5), the **Given** is written through
`OpenHistory` or, for a history an earlier build wrote, through `rusqlite` with the same `PRAGMA key`. Every
**Then** is read back through `AppState`. In the screen scenarios each **When** is the person acting on the screen,
with a fake reader written in the test tree (no `vi.mock`), and each **Then** is what the screen shows and what it
asked for.

Fixtures, `Europe/London`, computed with Python's `zoneinfo` on 2026-10-05: `NOW` = 2026-10-02 20:00 BST =
`1790967600` (as `history-movement`). `FIRST` = 2026-10-01 14:14 BST = `1790860440`. Local midnights: 2026-09-05
`1788562800`, 2026-09-20 `1789858800`, 2026-10-01 `1790809200`, 2026-10-02 `1790895600`, 2026-10-03
`1790982000`. `EARLY` = 2025-01-01 00:00 = `1735689600`. 2026-10-02 09:30 BST = `1790929800`. The opening range is
2026-09-05 to 2026-10-02, offsets `[{1788562800, 3600}]`.

**Recording it (rules 1–7).**

1. **The first session (rule 1).** **Given** a new data directory, protection on, counting chosen, and a helper
   that hands over its sockets (`counting_session_pin.rs`'s `Handing`), **When** `start_counting` is called at
   `NOW`, **Then** `summarize_reaches`, `list_todays_reaches` and `get_day` each answer `first_counted: NOW`. **And
   when**, after `session::stop`, `start_counting` is called again at `NOW + 86 400`, **then** it is still `NOW`.
2. **Not counting records nothing (rule 2).** **Given** each of: silence chosen by the person; protection off; a
   helper that refuses the sockets; **When** `start_counting` is called, **Then** every answer says
   `first_counted: null`.
3. **A sealed first run (rules 2, 6, 8).** **Given** the key unavailable, **When** `start_counting` is called at
   `T0`, **Then** nothing is written to `history.db` (its bytes unchanged, or no file) and the mark is `T0`. **When**
   the key is available and `start_counting` is called at `T1 = T0 + 6 h`, **Then** the gap `[T0, T1)` is recorded,
   `first_counted` is `T1`, and no answer's `gaps` or coverage note includes any of `[T0, T1)`.
4. **An existing install (rule 3).** **Given** a `history.db` written as the previous build wrote it (the four
   tables of `history.rs` lines 209–226, no `first_count`) holding reaches at `R1 < R2` and a gap from `G < R1`,
   **When** any answer is read, **Then** `first_counted` is `G`. **Given** reaches only, **then** `R1`. **Given**
   neither, **then** `null`, and a later counting session at `NOW` makes it `NOW`.
5. **Filled once (rule 3).** **Given** scenario 4's first history after its fill, **When** a gap from before `G` is
   recorded through `record_gap` and the history is opened again, **Then** `first_counted` is still `G`.
6. **A reach under a wrong clock (rule 4, F6).** **Given** `first_counted` `FIRST`, **When** a reach is recorded at
   `FIRST − 3 × 86 400`, **Then** `first_counted` is that instant, and `summarize_reaches` for that date's range
   holds the reach. **When** a reach is recorded at `NOW`, **then** it is unchanged.
7. **The settle at open (rule 4).** **Given** `first_counted` `FIRST`, and a reach inserted at `FIRST − 3 600`
   directly into `reaches` (as an older build would write it, with no note), **When** any answer is read, **Then**
   `first_counted` is `FIRST − 3 600`.
8. **Deletion never moves it (rule 5, F5).** **Given** `first_counted` `FIRST`, reaches from `FIRST` on and a gap
   after it, **When** `delete_reach_history(FIRST − 86 400, NOW)` removes every reach and gap, **Then**
   `first_counted` is still `FIRST`, and the answer holds no gap (FR-018a). **And when**
   `delete_all_reach_history` is called, **then** it is still `FIRST`.
9. **Erasing everything (rule 5).** **Given** `first_counted` `FIRST`, **When** `delete_all_data` is called,
   **Then** `history.db` is gone, and a later `list_todays_reaches` (with a fresh key) says `first_counted: null`.
10. **The wire (rule 7).** **When** each answer is serialised, **Then** `Patterns` holds exactly ten keys (the
    nine of `history-movement` and `first_counted`), `TodaysReaches` five, `DayView` seven, and `first_counted` is
    an integer or `null`.

**What the core says of the time before it (rule 8).**

11. **A range that holds the first count.** **Given** `first_counted` `FIRST`, reaches at 2026-10-01 15:00 and
    `1790929800`, and no gaps, **When** `summarize_reaches` is called for the opening range at `NOW`, **Then**
    rows 2026-09-05 to 2026-09-30 are `"none"` with count 0; 2026-10-01 is `"part"` (14 h 14 m of 24 h unseen,
    M12) with count 1; 2026-10-02 is `"whole"`, `so_far`, count 1; `gaps` is `[]` and `coverage_note` is absent.
12. **The range the screen sends.** **Given** scenario 11's history, **When** it is asked for 2026-10-01 to
    2026-10-02, **Then** two rows, `"part"` and `"whole"`, and no coverage note.
13. **An early start (M12).** **Given** `first_counted` 2026-10-01 08:00 BST, **Then** that row is `"whole"`
    (8 h of 24 unseen, not more than half).
14. **A gap that began before it (F3).** **Given** `first_counted` `FIRST` and a gap from 2026-09-30 23:00 to
    2026-10-01 16:00 BST, **Then** `gaps` is `[[FIRST, 2026-10-01 16:00)]` and the note says *about 2 hours*
    (1 h 46 m, rounded up, `gaps.rs` lines 215–231). The time before `FIRST` is in no gap.
15. **Never counted.** **Given** no first count and no reaches, **Then** every row is `"none"`, `first_counted` is
    `null`, and `gaps` is as recorded.
16. **Wholly before (M13).** **Given** `first_counted` `FIRST`, **When** asked for 2026-09-05 to 2026-09-30,
    **Then** every row is `"none"` with count 0.
17. **Today and the check-in on the first day (rules 8, 9).** **Given** `first_counted` `FIRST`, a gap from
    2026-10-01 00:00 to 15:00 BST, **When** `list_todays_reaches` and `get_day` are called for 2026-10-01's bounds,
    **Then** each says `first_counted: FIRST` and holds the gap `[FIRST, 15:00)` only, with a coverage note for 46
    minutes.
18. **Saving keeps it (rule 7).** **When** `save_journal_entry` is called for that day, **Then** the `DayView` it
    returns carries `first_counted: FIRST`.
19. **Sealed (rule 6).** **Given** the key unavailable, **Then** each of the three answers is sealed, with
    `first_counted: null`, and no file is written or changed (as `fail_closed.rs` holds it).
20. **No history in this build.** **Given** `--no-default-features`, **Then** each answer is sealed with
    `NO_HISTORY` and `first_counted: null`.
21. **The wide range, memory (rule 15).** **Given** `tests/range_allocation.rs` as it stands, **Then** it passes
    unchanged: one row counts 1, and the most held is under its existing bound.

**The domain (rule 17).**

22. **`domain::first_count`, as properties (proptest, no feature gate).** For any `first`, any `[from, to)` and
    any sorted, merged gaps inside it: `unseen` is sorted, disjoint and inside `[from, to)`; it covers
    `[from, min(first, to))`; every instant at or after `first` that it covers is inside a gap; with `first`
    absent it covers `[from, to)`; moving `first` later never covers less. `gaps_since` never returns time before
    `first`, returns the gaps unchanged when `first` is absent, and loses no time after `first`.

**The screen, *Over time* (rules 10–12; `TZ=Europe/London`, `now` = `NOW`).**

23. **The opening range is moved up (rule 10).** **Given** a reader whose answer carries `first_counted: FIRST`,
    **When** *Over time* opens, **Then** the first call is for 2026-09-05 to 2026-10-02, and the second for
    2026-10-01 to 2026-10-02. *From* reads 2026-10-01 with `min` 2026-10-01. Nothing from the first answer is ever
    drawn: *Looking…* stands until the second arrives.
24. **Nothing to move.** **Given** `first_counted: EARLY`, **Then** there is one call, *From* reads 2026-09-05,
    and its `min` is 2025-01-01.
25. **A typed date is moved up (rule 10).** **Given** scenario 23's state, **When** the person types 2026-09-20 in
    *From*, **Then** it reads 2026-10-01, and no call for 2026-09-20 is made.
26. **On or after the limit.** **Given** `EARLY`, **When** the person types 2025-06-01, **Then** it is taken as
    before, and one call is made for it.
27. **An answer without the field.** **Given** a fixture answer with no `first_counted` key, **Then** there is no
    `min`, no start sentence, and one call, exactly as before this slice.
28. **Never counted (rule 11).** **Given** `first_counted: null`, **Then** the second call is for today alone,
    *From* and *To* read today, *From*'s `min` is today, no start sentence appears, and where every row is unseen
    M13's sentence stands.
29. **F2's sentence (rule 12).** **Given** `EARLY` and the opening range, **Then** beside the date boxes stands
    *Cairn started counting on* followed by `shortDateInWords('2025-01-01', true)` and a full stop, and F3's
    sentence does not appear.
30. **F3's sentence (rule 12).** **Given** scenario 23's settled state, **Then** among the notes, before any
    coverage note, stands *Cairn started counting at* `clockTimeInWords(FIRST)` *on*
    `shortDateInWords('2026-10-01', false)`, and F2's sentence does not appear. The same holds in each of the four
    views.
31. **A past year (M14).** **Given** `now` in 2027 and a first count in 2026 inside the range, **Then** F3's date
    carries its year.
32. **The first count's row.** **Given** scenario 11's answer on *Day by day*, **Then** the rows before 2026-10-01
    read *not seen*, the 2026-10-01 row reads *partly seen* with its count, and no row has a clause about the start.
33. **Sealed, unreadable, looking.** **Given** each, **Then** neither start sentence appears and *From*'s `min` is
    as it was.
34. **M16 (rule 12).** **Given** every state above that draws a list, **Then** *Cairn counts only while it is
    running. This is what it saw over these days.* closes the view, unchanged.

**The screens, *Today* and the check-in (rule 9).**

35. ***Today*.** **Given** a `TodaysReaches` with `first_counted: FIRST` and `now` on 2026-10-01 at 20:00, **Then**
    under the title stands *Cairn started counting at* `clockTimeInWords(FIRST)` *today.*, before the standing
    note. **Given** `now` on 2026-10-02, or `first_counted` `EARLY`, `null`, absent, or a sealed answer, **then** it
    does not appear.
36. **The check-in.** **Given** a `DayView` for 2026-10-01 with `first_counted: FIRST`, **Then** before the
    coverage note stands the same sentence with *today*. **When** the day has ended under the open check-in,
    **then** it ends *on Thursday 1 October.* **Given** another day, `null`, absent or sealed, **then** none.

**The rows' counts (rules 13, 14).**

37. **The unit (rule 13).** **Given** one answer drawn in each of the four views, **Then** every count element's
    text is its grouped number followed by a visually hidden ` reach` (count 1) or ` reaches` (any other), the
    line's accessible text reads *…week of Nov 3, 2025 … 5 reaches* rather than running *2025* into *5*, and an
    absent row (*not seen*, *not in these days*) has neither count nor unit.
38. **The grouping (rule 14).** **Given** a site with 1 234 reaches, **Then** its visible count is
    `(1234).toLocaleString()` (*1,234* on an en-US runner) and its bar is 100 %.
39. **One width (rule 14).** **Given** counts 1 234, 56 and 7 in one view, **Then** the list's `--nb-count-chars`
    is the length of the grouped *1,234*, and every count element has the same `min-width`.

**Voice and the page.**

40. **The voice (rule 16).** **Given** every state of scenarios 23–39, **Then** no text holds a banned word, a
    *day N*, a number of days since the start, or a word of *What it never says*, and `npm run check` is clean.
41. **On the notebook page.** **Given** the notebook, **Then** F2's sentence sits under the date boxes and F3's
    with the asides on the left page, *Today*'s and the check-in's on their left pages, each in the class its
    neighbours use (`nb-reaches-aside`, `nb-reaches-note`, `nb-checkin-note`), on the ruling, with no inline
    height or overflow. *Which days* stays the spread's first child. The words-kept guard holds every captured
    state with the deltas of Pin, row 6.

**`src/localDays.ts` (a test file under `TZ=Pacific/Kiritimati`).**

42. **The time in words.** **Given** `clockTimeInWords(FIRST)`, **Then** it is exactly
    `new Date(FIRST * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })`, and under the test's
    +14 zone it names that zone's time, not London's or UTC's.

**The guard and the demo.**

43. **The ambient-counts guard (rule 16).** **Given** a planted `const at = answer.first_counted;` in
    `src/localDays.ts`, **When** `npm run check:ambient-counts` runs, **Then** it is refused. Removed, it is clean.
44. **The widest range the screen sends (rule 15, D3).** In the demo, with a first count on 2025-01-01 and *From*
    typed as 1000-01-01: *From* reads 2025-01-01, and *Day by day* draws its weekly rows with the page responsive.
    Timed as V29 timed it, and recorded in the demo log.

## Structure Decision

The two deployables in `project.json` are those the four history slices used. `src-tauri` (*the core … domain,
encrypted stores … IPC*) holds the first count, where it is stored, and what the answers say of the time before
it. `cairn` (*the interface*) holds the limit on *From*, the sentences and the counts' unit, grouping and width.
Nothing is a new service. The strategy is `leave-it` (ADR 0002), so the code lives where the history slices' code
lives. There is one vocabulary (a reach, a gap, a range of days, the first count, the computer's clock), so there
is one bounded context.

```text
src-tauri/src/
├── domain/first_count.rs        # NEW: unseen(first, from, to, gaps), gaps_since(first, gaps); pure
├── domain/mod.rs                # MODIFIED: pub mod first_count; one table row; "Nine" becomes "Ten"
├── store/history.rs             # MODIFIED: first_count table; fill once and settle at connect; record notes; note_counting; first_count()
├── counting/sink.rs             # MODIFIED only if the session's note goes through the sink (implementer's choice)
├── reflection/over_time.rs      # MODIFIED: Range.first_counted; unseen and gaps through domain::first_count
├── reflection/checkin.rs        # MODIFIED: Day.first_counted; gaps_since
└── ipc/state.rs                 # MODIFIED: first_counted on DayView, TodaysReaches, Patterns (and each sealed form); gaps_since in list_todays_reaches; begin_counting_session notes counting
src-tauri/tests/
├── first_counted.rs             # NEW: scenarios 2 (silence, off), 4–20, through AppState
├── first_counted_session.rs     # NEW: scenarios 1, 2 (refused sockets), 3 (the session is process-global, so its own binary)
├── domain_first_count.rs        # NEW: scenario 22 (proptest), no feature gate
├── journal_store.rs             # MODIFIED: the table list holds five (Pin, row 4)
├── us2_by_site.rs, us2_by_hour.rs, us2_by_weekday.rs, us2_movement.rs  # MODIFIED: wire tests name ten keys; fixtures note counting at EARLY before their ranges (Pin, rows 1, 2)
└── range_allocation.rs          # unchanged (scenario 21)
src/
├── ipc/reaches.ts               # MODIFIED: first_counted?: number | null on TodaysReaches and Patterns
├── ipc/journal.ts               # MODIFIED: first_counted?: number | null on DayView
├── localDays.ts                 # MODIFIED: clockTimeInWords(at)
├── __tests__/localDays.test.ts  # MODIFIED: scenario 42
├── screens/Reaches.tsx          # MODIFIED: the limit, the move, min on From, F2/F3 sentences, F4 on Today, the count's unit, grouping and width
├── screens/CheckIn.tsx          # MODIFIED: F4's sentence
├── styles/tonight-page.css      # MODIFIED: .nb-reaches-count min-width from --nb-count-chars
├── screens/__tests__/ReachesFirstCounted.test.tsx   # NEW: scenarios 23–35
├── screens/__tests__/ReachesCounts.test.tsx         # NEW: scenarios 37–39
├── screens/__tests__/CheckInFirstCounted.test.tsx   # NEW: scenario 36
├── screens/__tests__/ReachesFirstCountedPage.test.tsx  # NEW: scenario 41
└── screens/__tests__/{ReachesPage, ReachesByHourPage, ReachesByDayPage, ReachesMovementPage}.test.tsx, look/__tests__/tonightPage.test.ts, beforeTheReveal.ts  # MODIFIED only where they read a count element's text or the captured words (Pin, row 6)
scripts/
└── check-no-ambient-counts.mjs  # MODIFIED: REACH_DATA gains first_counted (Pin, row 7)
specs/003-reflection-and-history/
├── contracts/ui-ipc.md          # amendment below
├── contracts/patterns.md        # amendment below
└── data-model.md                # amendment below
```

`ipc/commands.rs`, `main.rs`, `ipc_surface.rs`, `check_range`, `check_offsets`, `domain::patterns::movement`,
`store/gaps.rs`, `counting/presence.rs`, `eslint.config.js` and the other guard scripts do not change. No command is
added.

**What it must not disturb.** Every count, row, hour and weekday for a range wholly after the first count: rows,
counts, `seen`, *so far*, the notes, the estimates sentence and every refusal, exactly as `history-movement` left
them. *Today*'s list and the check-in's list, entry, quote and save. The mark and the gap on start.

### Contract amendments, as text for the implementer

Append to `../../contracts/ui-ipc.md`, after the `history-movement` amendment:

```markdown
#### Amended in slice `first-counted` (2026-10-05)

**No signature changes; one field on three answers.** `DayView` (`get_day`, `save_journal_entry`),
`TodaysReaches` (`list_todays_reaches`) and `Patterns` (`summarize_reaches`) each carry:

    first_counted: number | null   // epoch seconds: when Cairn first counted; null when it never has, or sealed

- It is the same instant on every answer, whatever was asked. The interface compares it with the bounds it sent.
- It is the first moment a counting session was accepting and storing (gaps review F1). For a history written
  before this slice, it is the earliest reach or gap that history held when this build first opened it. A reach
  recorded earlier moves it back to that reach (F6). Deleting reaches or gaps never moves it (F5). Erasing
  everything removes it with the history.
- Time before it is not seen: `summarize_reaches`' rows mark it so (`"none"` or `"part"`, by M12), and when it is
  `null` the whole range is. It is never in `gaps` and never in `coverage_note`. A gap that began before it is cut to
  begin at it (F3, FR-022a). The same holds for a day's `gaps` and `coverage_note`.
- `Patterns` now holds ten keys. A reader treats an absent `first_counted` as not yet known (as above).

The interface holds *From* to no earlier than the local date of `first_counted`, or to today when it is `null`
(F2). The core still answers any range `check_range` places. See `slices/first-counted/plan.md`.
```

Append to `../../contracts/patterns.md`, after the `history-movement` amendment:

````markdown
#### Amended in slice `first-counted` (2026-10-05)

```rust
pub mod first_count {
    pub fn unseen(first: Option<i64>, from: i64, to: i64, gaps: &[(i64, i64)]) -> Vec<(i64, i64)>
    pub fn gaps_since(first: Option<i64>, gaps: &[(i64, i64)]) -> Vec<(i64, i64)>
}
```

`gaps` are sorted, merged and inside `[from, to)`, as `store::gaps::clipped` returns them. `unseen` is
`[from, min(first, to))` (all of `[from, to)` when `first` is `None`) followed by `gaps_since`, sorted and disjoint,
and it is what `movement`'s `unseen` is given. Properties: inside `[from, to)`; covers everything before `first`;
covers nothing after `first` that no gap covers; a later `first` never covers less. `gaps_since` cuts each gap to
begin no earlier than `first`, drops what is left empty, and returns them unchanged when `first` is `None`.
`movement` is unchanged.
````

`src-tauri/src/domain/mod.rs` gains one row in its module table:

```markdown
| [`first_count::unseen`] | the time before Cairn first counted is never presented as seen, nor as a gap in its watching (F3; FR-022, FR-022a, III) |
```

Append to `../../data-model.md`, under *Additions to the encrypted store*, after `reach_estimates`:

```markdown
### `first_count` (slice `first-counted`, 2026-10-05)

One row, `id` 1, `at` an epoch second: the first moment Cairn counted (gaps review F1). In the encrypted store
because it can be a reach's own instant (F1's fill, F6). Every write is `min`: a counting session that is storing,
each reach recorded, and, at open, the earliest reach. Once, on the first open by the build that adds it, it is filled
from the earliest reach or gap. Deletion of reaches or gaps never touches it (F5); removing the history file
removes it. It is not a gap, and the time before it is never stored as one (FR-022a).
```

## Constitution Check (v1.5.0)

- **I. The Wall Holds:** nothing here touches enforcement. No control on any view changes protection, and nothing
  listens for a blocked request.
- **II. Local-First (NON-NEGOTIABLE):**
  - No dependency and no network (line 159).
  - *Domain and timestamp only* (line 164): a reach is still a row of `domain` and `at`
    (`columns_of_reaches`, `history.rs` line 546, unchanged). The first count is a timestamp with no domain, and it
    records nothing about the request.
  - *Encrypted at rest* (line 168): the first count is in `history.db` under SQLCipher (see *Where the first count
    is kept*).
  - *Fail closed* (line 172): sealed means no fill, no settle, no note; each answer says `null` beside its
    sentence; the file is unchanged (scenarios 3, 19). Counting and protecting continue as now.
  - *Erasable* (Security and Privacy, line 417): `delete_all_data` removes it with the file (scenario 9).
- **III. Honest About Limits:**
  - *Verified state, never intended* (line 194): the first count is written only after `session::start` reports
    `Available` and the sink is storing (rule 1).
  - The fill errs later, so Cairn claims to have seen less, never more (F1).
  - The time before it is never a zero (FR-022, `spec.md` line 524) and never a gap (FR-022a, line 528).
  - M16's standing sentence stays.
  - The core never refuses a range with an untrue sentence.
  - The freeze's only remaining path, a clock set centuries back, is stated in the demo log.
- **IV. Reversible:** no system file is touched.
- **V. Reflection at Distance:** no notification (line 228). F4's sentence is shown only on screens the person
  opened.
- **VI. Voice:** see *The words*.
  - No banned word (line 243).
  - No day count, *day N* or counting up from the start (line 253).
  - The sentences are body text in the notes' serif face, never monospace (line 249). The count keeps the small
    label face it has.
- **VII. Free:** nothing is gated.
- **Versioning and Compatibility** (lines 426–432):
  - The IPC change is additive: a field, no signature.
  - The stored change is additive: a table, with nothing the previous build wrote altered.
  - The fill waits for the key; it never overwrites.
- **FR-018a** (`spec.md` line 509): a deletion leaves no trace of itself. The first count is a statement about Cairn
  that predates the deletion, and the deletion does not change it (F5). See Q3 for the one case where it equals a
  deleted reach's instant.
- **Delivery Method:**
  - Trunk. Tests first: every RED comes before its GREEN.
  - Each rule is proved where it lives: the time before the first count in `domain/first_count.rs` (scenario 22);
    its storage invariants in the store, read back through `AppState` (scenarios 1–10); the screen's limit and words
    in `Reaches.tsx` and `CheckIn.tsx`.
  - The adapter is held by scenarios 10, 19 and 20.
  - `check-no-ambient-counts` only grows, and its new pattern is seen refusing a planted violation first (scenario
    43).

## Pin

This slice changes code that was here before the method:

- `src-tauri/src/store/history.rs`: its schema, `connect` and `record`.
- `src-tauri/src/ipc/state.rs`: `list_todays_reaches`, `begin_counting_session`, and the `DayView` and
  `TodaysReaches` shapes.
- *Today* in `src/screens/Reaches.tsx` (lines 280–344).
- `src/ipc/reaches.ts`.
- `scripts/check-no-ambient-counts.mjs`.

The *Over time* half of `Reaches.tsx`, `CheckIn.tsx`, `src/ipc/journal.ts`, `reflection/`, `localDays.ts`,
`journal_store.rs`, the `us2_*` tests and `tonight-page.css` were written under the method, so their tests are their
pin.

Already pinned in `delivery/survey/pinned.md`, and re-run before and after:

- the command surface (`ipc_surface`, 2026-09-30): unchanged, no command added;
- today's reaches, gaps and coverage note (`gaps`, `Reaches.test.tsx`, 2026-09-30): **changes** where a gap began
  before the first count (row 3);
- reach data only on the screens a person navigates to (2026-09-30, 2026-10-01, 2026-10-02): unchanged in
  behaviour, but the guard grows (row 7);
- `summarize_reaches`' answer (2026-10-02 rows): **changes** by one field and by what rows say before the first
  count (rows 1, 2);
- Over time's words on the notebook page (2026-10-02): **changes** where a count is drawn (row 6).

**Characterisation, before any RED.** Two of the behaviours this slice changes have no test that observes them
today:

- **N-C1.** The time before the first reach reads as seen.
  - In `us2_movement.rs`: for a history whose earliest record is a reach on 2026-09-07 and the opening range, rows
    2026-09-05 and 09-06 are `"whole"` with count 0. That is H5's limit as it stands.
  - In `us1_write_tonight.rs`: for a day whose first record is a gap that began the evening before, `get_day`
    states the whole gap.
  - Written and seen green on this branch's head. Rule 8's REDs then change both.
- **N-C2.** `OpenHistory::record` writes exactly one row and nothing else (`table_names` and a row count of each
  table, before and after). Written green first; rule 4's RED changes it.

The host appends these rows before the change lands (the ledger is the host's):

```markdown
| 2026-10-05 | `summarize_reaches` serialises ten keys, `first_counted` (an integer or null) joining the nine of `history-movement`. Its signature, every refusal, and every row, count, gap and note for a range wholly after the first count are unchanged. A deliberate change: 003 gaps review F1–F3, slice `first-counted` | `AppState::summarize_reaches`, `summarizeReaches` | `us2_by_site`, `us2_by_hour`, `us2_by_weekday`, `us2_movement` (wire tests name ten keys; fixtures note counting at 2025-01-01 before their ranges, so every other expectation stands); `first_counted` | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test us2_by_site --test us2_by_hour --test us2_by_weekday --test us2_movement --test first_counted` |
| 2026-10-05 | A range's rows before Cairn first counted (all of them, when it never has) are not seen, where they read as seen with zero; the first count's own row is judged with the time before it unseen (M12). Pinned first by N-C1. A deliberate change: 003 gaps review F3, H5, slice `first-counted` | `reflection::over_time::assemble` | `us2_movement` (N-C1, then rule 8's RED); `first_counted` scenarios 11–16 | as above |
| 2026-10-05 | The gaps of a day and of a range, and their coverage notes, begin no earlier than the first count: a gap that began before it is cut to begin at it. Unchanged where Cairn has never counted, and for every gap after the first count. Pinned first by N-C1. A deliberate change: 003 gaps review F3, FR-022a, slice `first-counted` | `AppState::list_todays_reaches`, `AppState::get_day`, `reflection::checkin::assemble`, `assemble` | `gaps`, `us1_write_tonight` (N-C1, then the RED), `Reaches.test.tsx` (unchanged); `first_counted` scenarios 14, 17 | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test gaps --test us1_write_tonight --test first_counted` |
| 2026-10-05 | The encrypted history holds a fifth table, `first_count` (one row), created and filled once from the earliest reach or gap on the first open by this build; `record` also notes the reach as a counting moment, and every open moves the row back to the earliest reach. `reaches` keeps exactly `domain` and `at`. Pinned first by N-C2. A deliberate change: 003 gaps review F1, F6, slice `first-counted` | `OpenHistory::connect`, `OpenHistory::record` (`store/history.rs`) | `journal_store` (five tables); `stores`; `first_counted` scenarios 4–8 | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test journal_store --test stores --test first_counted` |
| 2026-10-05 | A counting session that is accepting and storing records its start as the first count, if none is earlier; the gap since the last mark is recorded before it, as before. A deliberate change: 003 gaps review F1, slice `first-counted` | `AppState::begin_counting_session` | `counting_session_pin` (unchanged); `first_counted_session` | `cd src-tauri && cargo test -p cairn --no-default-features --features history --test counting_session_pin --test first_counted_session` |
| 2026-10-05 | Over time's counts in all four views carry a visually hidden unit (*reach*, *reaches*) and are written with the computer's grouping; every count in a view has one width. Visible words are unchanged for counts under 1 000; the captured words-kept states gain the unit words where `wordsOf` reads hidden text, recorded as `COUNT_UNIT_DELTA` beside `DAY_BY_DAY_DELTA` (D46), the captured markup untouched. A deliberate change: 003 gaps review F7 (V47, V48), slice `first-counted` | `Reaches.tsx` *Over time* on the notebook page | `ReachesCounts`; `TonightWordsKept`, `ReachesPage`, `ReachesByHourPage`, `ReachesByDayPage`, `ReachesMovementPage`, `tonightPage` (count text read through the unit) | `npx vitest run src/screens/__tests__/ReachesCounts.test.tsx src/screens/__tests__/TonightWordsKept.test.tsx src/screens/__tests__/ReachesPage.test.tsx src/screens/__tests__/ReachesByHourPage.test.tsx src/screens/__tests__/ReachesByDayPage.test.tsx src/screens/__tests__/ReachesMovementPage.test.tsx src/look/__tests__/tonightPage.test.ts` |
| 2026-10-05 | `check-no-ambient-counts` refuses `first_counted` / `firstCounted` outside `Reaches.tsx`, `CheckIn.tsx`, `Day.tsx` and `src/ipc/`. The guard only grows; its allowed places are unchanged. A deliberate change: the field comes from the encrypted history and can be a reach's own instant, slice `first-counted` | `scripts/check-no-ambient-counts.mjs` (`REACH_DATA`) | a planted `const at = answer.first_counted;` in `src/localDays.ts`: refused, then removed; `npm run check` clean | `npm run check:ambient-counts` |
```

Row 6's delta is measured, not assumed. The implementer runs `wordsOf` (`beforeTheReveal.ts` line 87) on one
captured state with the unit in place. If it does not read `sr-only` text, there is no delta, and the row says so.

## Complexity Tracking

| Deviation | Why | What was done instead |
|---|---|---|
| The plan and tasks were not produced by Spec Kit's commands through `/drive`'s links | `specs/003-…/plan.md` and `tasks.md` are committed feature-level files from before adoption, and the links would write over them. The same reason was recorded for the four history slices before this one | Written under `slices/first-counted/` from the committed feature plan, which it cites. `research.md` is not linked or rewritten. This slice's evidence on library behaviour is cited inline (SQLite UPSERT and min/max, MDN `min`, WAI-ARIA `generic`, the `Intl` probe) |
| A fifth table in the encrypted store, beyond `data-model.md`'s two additions | F1 needs a record that no deletion touches (F5) and that Principle II encrypts | One row, amended into `data-model.md` (text above); `journal_store.rs`' table list grows (Pin, row 4) |
| A read path (`connect`) that can write | F1's one-time fill and F6's repair must happen whether or not Cairn ever counts again (silence, protection off) | The fill runs once, in one transaction. The settle reads first and writes only when it would move earlier. Neither runs on a sealed history |
| `record` writes two rows in one transaction | F6 must hold the moment a reach under a wrong clock is recorded, not only at the next open | A transaction, so a reach is never kept without its note; on failure, the existing *could not record* path applies, as for any write |
| `us2_*` fixtures now note counting before their ranges | Their rows read as seen only because nothing recorded when Cairn started (H5's limit). With rule 8 they would read as not seen | Each fixture states it: Cairn first counted on 2025-01-01. Every other expectation is unchanged (Pin, row 1) |
| The screen may read twice when *Over time* opens | The limit is learned from the first answer, and no command is added | At most once per opening, and only while the first count is under four weeks old (scenario 23) |
| The ambient-counts guard gains a pattern | The new field is history data and can be a reach's instant | Pin, row 7, with a planted violation seen refused |

Tasks for this slice are numbered `N`. `F` is taken by this slice's gaps review (F1–F7), and `S`, `K`, `Y`, `W`, `Q`, `M`
and `V` by the slices before it.

## Questions decided by the owner

Answered 2026-10-05 ("all yes"): each recommendation below stands as written, and the plan is written to it.

Each is planned to its recommendation; choosing otherwise changes only what each names.

**Q1: F2's and F3's sentences together.** F2 puts *Cairn started counting on Oct 1, 2026.* beside the range. F3
puts *Cairn started counting at 2:14 pm on Oct 1.* in the notes where the range holds the moment. Whenever *From*
sits at the first count's day, both apply, and the page would say the same thing twice.
*Recommendation*, which this plan is written to: one sentence, never two. F3's, with its time, when the range holds
the first count; F2's otherwise. One-line reason: the second sentence adds nothing the first did not say. The
alternative is both, always, which changes rule 12 and scenarios 29–30 only.

**Q2: before Cairn has ever counted.** On an install where counting never started (silence chosen from the outset,
or protection never on), there is no day to limit *From* to.
*Recommendation*, which this plan is written to: *From* and *To* are held at today, every row reads *not seen*,
and M13's *Cairn wasn't counting on these days.* says it, with no new sentence. One-line reason: it is true, it adds
no words, and it keeps the long range (and V29's freeze) unreachable. The alternatives:
- (a) no limit at all, with every row *not seen*, which brings back the freeze;
- (b) a new sentence such as *Cairn has not started counting yet.*, which adds words to rule 11 and scenario 28.

**Q3: a first count that equals a deleted reach's time.** F6 can set the first count to a reach recorded under a
wrong clock. If the person later deletes that reach, F5 keeps the first count, and *Cairn started counting at …*
then names the instant of a reach they deleted. FR-018a asks a deletion to leave no trace. Only in this case does
the first count carry one.
*Recommendation*, which this plan is written to: keep F5 as decided. One-line reason: the sentence names when
Cairn started, never what was reached for or that anything was deleted, and the case needs a clock set wrong and
then a deletion of exactly that reach. The alternative, a deletion that removes the earliest reach moving the first
count to the earliest remaining record, reverses F5 and changes rule 5 and scenario 8.

**Q4: the first count's own row on *Day by day*.** Under M12, the row for the day Cairn started reads *partly
seen* when it started after midday. The time it did not see was before Cairn existed, not a blind spot.
*Recommendation*, which this plan is written to: keep M12's judgement and add no clause; the one sentence above
the rows names the start. One-line reason: *partly seen* is true of what Cairn saw of that day, and a clause for
one row adds words for a day that happens once. The alternative is a clause *from 2:14 PM* on that row in place
of *partly seen*. That changes scenario 32 and the row's clause rule (`clauseOf`, `Reaches.tsx` lines 106–117).
