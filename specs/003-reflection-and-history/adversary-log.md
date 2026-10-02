# Adversary log — The check-in and history

Every surface attacked in this feature, slice by slice. A slice that skips cites the rows here that cover it.

## write-tonight · 992ea48 · 2026-10-01

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | widened | `src-tauri/src/ipc/commands.rs`: `get_day` and `save_journal_entry`, new IPC commands the window calls |
| driven adapter or the provider types behind one | widened | `src-tauri/src/store/history.rs`: journal entries in the encrypted store, `secure_delete` |
| authorisation decision (who can reach one that already exists) | not present | single local user; no new role or reach to a protection change (`src/App.tsx` adds navigation only, held by `tests/ipc_surface.rs`) |
| concurrency, idempotency, ordering, retention, or time | widened | `src-tauri/src/reflection/checkin.rs`, `src/screens/CheckIn.tsx`: a day's bounds, midnight while open, revise-replaces (retention of old text) |

Spawned: journal write and read path · `drive-adversary` · host (Opus 5.5) · delegated, fresh context · manifest: `src-tauri/src/ipc/commands.rs`, `src-tauri/src/ipc/state.rs`, `src-tauri/src/reflection/checkin.rs`, `src-tauri/src/reflection/journal.rs`, `src-tauri/src/store/history.rs`, `src-tauri/src/store/key.rs`, `src-tauri/tests/us1_write_tonight.rs`, `src-tauri/tests/fail_closed_journal.rs`, `src-tauri/tests/ipc_surface.rs`
Spawned: time on the check-in · `drive-adversary` · host (Opus 5.5) · delegated, fresh context · manifest: `src/screens/CheckIn.tsx`, `src/ipc/journal.ts`, `src/App.tsx`, `src/screens/__tests__/CheckIn.test.tsx`, `src/screens/__tests__/Navigation.test.tsx`, `src-tauri/src/reflection/checkin.rs`, `src-tauri/src/ipc/state.rs`, `src-tauri/src/domain/dates.rs`, `src-tauri/tests/us1_write_tonight.rs`
Omitted: authorisation · not present (single local user; no new route to a protection change)

Findings (triaged by the host; J1 and T1 re-run by the host and reproduced):

| # | Severity | Triage | State | Finding |
|---|---|---|---|---|
| J1 | HIGH | confirmed | fixed `03f9658` (history store swept; see J6) | An error sentence the person sees carries the OS's own words, including the banned "denied": `Cairn could not open your history (Permission denied (os error 13)).` `store/history.rs` formats `io::Error` and rusqlite errors into the sentence. Class: every `({error})` in a person-facing `Trouble` |
| J2 | MEDIUM | confirmed | fixed `03f9658` | Same site as J1: the full path, including the home directory, reaches the sentence (`unable to open database file: /…/history.db`). Closed by J1's sweep |
| J3 | MEDIUM | question → decided (G4, owner 2026-10-01) | fixed `33ae6c2` | Text made only of invisible characters (U+200B, U+3164, U+2800, NUL…) is saved as an entry and replaces a kept one. Owner: should "empty" mean "nothing visible"? |
| J4 | LOW | confirmed | fixed `358fbc6` | `get_day` and `save_journal_entry` never check `day_start`/`day_end` against `day`; inverted bounds read as an untrue empty day, and wide bounds pull every reach in |
| J5 | LOW | confirmed | fixed `935bd11` | A database held by another connection past the 5 s busy timeout is reported as the key being wrong, and the writing space is withheld (Principle III) |
| T1 | HIGH | confirmed | fixed `feb5bbd` | Text typed while a save is in flight is replaced by what was sent when the save returns, and the screen says "Kept for today." (G1) |
| T2 | MEDIUM | confirmed | fixed `1e7bda3` | Leaving the check-in mid-save, then a refused save: on return the text and the refusal are gone (G1). Leaving with unsaved text also loses it |
| T3 | MEDIUM | question → decided (G5, owner 2026-10-01) | fixed `2c877a1` | Pressing Tonight again the next morning keeps yesterday's day, still worded "today", and files the morning's writing under yesterday. Owner: should pressing Tonight count as a new opening, and should the screen name its date once that date has passed? |
| T4 | MEDIUM | confirmed (by reading; the RED test verifies) | fixed `3598d24` (both places a gap is summed against a day) | The coverage note counts whole gaps, not the part inside the day: an overnight gap reads "about 12 hours of today" when 8 fell inside it; a gap ending exactly at midnight still raises a note. Predates the slice (88a4104); this slice puts it on the check-in |
| J6 | HIGH | confirmed (by reading; J1's class outside this slice) | open | The same `({error})` pattern formats OS text into person-facing sentences outside the history store: `src/helper.rs:130,149`, `src/store/config.rs:100,106,113,116`, `src/store/inventory.rs:167,175,194,199`, `src/enforcement/seed.rs:75,82,92,99,125,131`, `src/platform/credentials.rs:68`, `src/platform/hosts.rs:51`, `src/platform/{linux,windows}/elevation.rs:133/132`. Larger than the slice: needs its own fix |
| L1 | LOW | duplicate of J3 | — | Zero-width space saved as an entry, from the screen side |

Held: no plaintext anywhere on disk (marker scan, no side files, `secure_delete` on); an unreadable or wrong-key store is never rewritten (random, zeroed, truncated, plaintext-SQLite, wrong key, one corrupt page); `LocalDate` parsing is strict; day bounds right on 23 h, 25 h, 23.5 h and a day with no midnight; a save after midnight goes to the day opened; a reach at 23:59 and at 00:01 fall in their own days; double-click saves once; closing without writing stores nothing.

## quote · abfa7ee · 2026-10-01

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | widened | `src-tauri/src/ipc/commands.rs`: `get_quote`, `get_quotes_shown`, `set_quotes_shown` |
| driven adapter or the provider types behind one | widened | `src-tauri/src/store/config.rs`: the hide-quotes setting; `src-tauri/resources/quotes/quotes.json` read from disk |
| authorisation decision (who can reach one that already exists) | not present | single local user; the switch changes no protection (`tests/ipc_surface.rs` classifies it) |
| concurrency, idempotency, ordering, retention, or time | widened | `src/screens/CheckIn.tsx`: a line kept per opening, a fresh one when Tonight opens a new day (G5) |

Spawned: the quote and its switch · `drive-adversary` · host (Opus 5.5) · delegated, fresh context · manifest: `src-tauri/src/reflection/quote.rs`, `src-tauri/src/ipc/state.rs`, `src-tauri/src/ipc/commands.rs`, `src-tauri/src/store/config.rs`, `src-tauri/src/main.rs`, `src-tauri/resources/quotes/quotes.json`, `src-tauri/tauri.conf.json`, `src-tauri/tests/us1_quote.rs`, `src-tauri/tests/quote_choice.rs`, `src-tauri/tests/stores.rs`, `src-tauri/tests/ipc_surface.rs`, `src/screens/CheckIn.tsx`, `src/ipc/journal.ts`, `src/screens/__tests__/CheckIn.test.tsx`, `src/screens/__tests__/CheckInQuoteDays.test.tsx`
Omitted: authorisation · not present

Findings (triaged by the host):

| # | Severity | Triage | State | Finding |
|---|---|---|---|---|
| A1 | LOW | confirmed | open — owner approved extending the guard on `main` (2026-10-01) | No guard holds the bundled lines to R6: `check-no-streaks.mjs` does not scan `src-tauri/resources`, so a streak or "stay strong" line ships green. The guard is the host's (`scripts/`), not the slice's |
| A2 | LOW | confirmed | open | A bundled line that shows nothing (U+200B, U+2800, U+3164) passes `trim().is_empty()` and renders as an empty quote; `domain::visible::shows_nothing` (G4) is not used |
| A3 | LOW | confirmed | open | Double-clicking "Show quotes" while the save is in flight asks twice and swaps the line while the check-in stays open (Q1) |
| A4 | LOW | confirmed | open | A line asked for on the old day lands after Tonight opened a new day, replacing the new day's line (Q1, G5) |
| A5 | LOW | confirmed | open | The switch's failure note shows any rejection verbatim (`Error: …`); it is hidden behind a save refusal, and not cleared on a new day |
| A6 | LOW | confirmed | deferred — the owner (matthew-volaris), 2026-10-01: agreed to leave it after the explanation that it needs administrator access, which can already switch Cairn off (README) | A FIFO in place of the quotes file blocks `get_quote` (a sync command), which would freeze the window. Needs write access to the install's resources, i.e. admin |

Held: missing, empty and pre-slice config read as shown; a malformed setting makes the config unreadable and shows neither line nor switch (fail closed); a save never loses trail, pending change or trusted clock, and a half-way save leaves the old file; hostile quotes files (empty, non-strings, invalid UTF-8, a directory, missing, 100k lines, a 50 MB line) give no line or a line, never a panic; the roll is never the date; the quote is only reachable from `CheckIn.tsx`; the shipped 24 lines pass the banned-words check and read clean against R6.

## history-by-site · 1ed58e6 · 2026-10-01

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | widened | `src-tauri/src/ipc/commands.rs`: `summarize_reaches(first_day, last_day, range_start, range_end)` |
| driven adapter or the provider types behind one | widened | `src-tauri/src/store/history.rs` range reads (`between`, `gaps_between`, `estimates_between`) through `reflection/over_time.rs` |
| authorisation decision (who can reach one that already exists) | not present | single local user; the screen offers no protection control (`ReachesOverTime.test.tsx`), the command is `Reads` (`tests/ipc_surface.rs`) |
| concurrency, idempotency, ordering, retention, or time | widened | range bounds across clock changes (`check_range`, `src/localDays.ts`), a late answer after a range change (`Reaches.tsx`), two years of history (`tests/patterns_at_scale.rs`) |

Spawned: reaches over a range · `drive-adversary` · host (Opus 5.5) · delegated, fresh context · manifest: `src-tauri/src/ipc/commands.rs`, `src-tauri/src/ipc/state.rs`, `src-tauri/src/reflection/over_time.rs`, `src-tauri/src/reflection/checkin.rs`, `src-tauri/src/store/gaps.rs`, `src-tauri/src/store/history.rs`, `src-tauri/src/domain/patterns.rs`, `src-tauri/tests/us2_by_site.rs`, `range_bounds.rs`, `range_coverage.rs`, `patterns_at_scale.rs`, `ipc_surface.rs`, `src/screens/Reaches.tsx`, `src/localDays.ts`, `src/ipc/reaches.ts`, and their screen tests
Omitted: authorisation · not present

Findings (triaged by the host):

| # | Severity | Triage | State | Finding |
|---|---|---|---|---|
| R1 | HIGH | confirmed (component-level reproduction through the calls `begin_counting_session` makes) | fixed `759a95b` (pinned first in `2fbaf4a`; the mark is not refreshed while reaches cannot be stored) | A counting session that starts with the key unavailable leaves no gap: the inferred gap and every reach go into a sealed store (no-ops), yet `keep_marking` refreshes the presence mark, so the next good start infers nothing. Days Cairn did not see, and days whose reaches were dropped, read as complete and quiet (Principle III, FR-022, H4). Predates the slice (`counting/presence.rs`, `counting/sink.rs`, `ipc/state.rs` `begin_counting_session`); the over-time view is where it shows |
| R2 | LOW | confirmed | fixed `d518b81` | A `last_day` of 9999-12-31 makes `estimates_between`'s text comparison against `10000-01-01` fail, so the estimates sentence vanishes (FR-023). IPC only; `range_end` is never checked against the present |
| R3 | LOW | confirmed | fixed `c855134` (merged in every place gaps are summed) | Overlapping gap rows are summed after `clipped`, so a 28-day range can read "about 84 days". Reachable with two Cairn processes at once (no single-instance guard) or a clock moved back |
| R4 | LOW | confirmed | fixed `9ee3d2b` | `Math.max(1, ...by_site.map(…))` in `Reaches.tsx` throws past ~65k–125k distinct sites, blanking the screen |
| R5 | LOW | confirmed | fixed `51fc952` | The widest range a hostile caller can send (±9999 years) builds a 7.3M-entry per-day list for nothing (0.16 s, 94 MB). IPC only |

Held: edges half-open and exact; gaps clipped and cut at both edges, rounded up; no double count across a clock change; estimates never a site; every bound refusal plain, checked arithmetic; a 4-week range across DST in eight odd zones (30-min, 2-h, date-line) accepted; no OS text or path in any sentence; a late answer dropped; the range forgotten on leaving (H2); no protection route, no count outside the reaches screen; no ranking, praise, streak or banned word. 1.06M reaches over 60k sites read in 0.40 s.

## history-by-hour · 507546e · 2026-10-02

| Trigger | Status | Evidence |
|---|---|---|
| driving adapter (HTTP route, CLI command, queue consumer) | widened | `src-tauri/src/ipc/commands.rs`: `summarize_reaches` gains `offsets` |
| driven adapter or the provider types behind one | already covered | the range reads are unchanged since `history-by-site` (row above) |
| authorisation decision (who can reach one that already exists) | not present | single local user; `Reads` (`tests/ipc_surface.rs`) |
| concurrency, idempotency, ordering, retention, or time | widened | offsets in force per instant (`domain/patterns.rs` `by_hour`, `reflection/over_time.rs` `check_offsets`, `src/localDays.ts` `offsetChanges`) |

Spawned: reaches by hour across a range · `drive-adversary` · host (Opus 5.5) · delegated, fresh context · manifest: `src-tauri/src/domain/patterns.rs`, `src-tauri/src/reflection/over_time.rs`, `src-tauri/src/ipc/state.rs`, `src-tauri/src/ipc/commands.rs`, `src-tauri/tests/patterns_by_hour.rs`, `offset_changes.rs`, `us2_by_hour.rs`, `us2_by_site.rs`, `patterns_at_scale.rs`, `range_allocation.rs`, `src/localDays.ts`, `src/ipc/reaches.ts`, `src/screens/Reaches.tsx`, `src/styles/tonight-page.css`, and their tests
Omitted: authorisation · not present; driven adapter · already covered by the `history-by-site` row

Findings (triaged by the host):

| # | Severity | Triage | State | Finding |
|---|---|---|---|---|
| A1 | LOW | confirmed | fixed `d257e85` (3 h, contract premise corrected) | tzdata has a 3-hour change (Antarctica/Casey 2010–11, 2018–19, 2020–21; Vostok 1994–95; Ust-Nera 1980–81), so `check_offsets`' "no more than 2 hours" seals ranges `check_range` places, By site included; the contract's premise ("the largest seasonal change any zone uses") is untrue |
| A2 | LOW | confirmed | fixed `4e6b978` | `offsetAt` uses `getTimezoneOffset()`, whole minutes in V8, while `Date`'s local fields carry seconds: before 1972 the hours can disagree with the Today log by up to 52 s at a boundary (B4) |
| A3 | LOW | confirmed | fixed `ae0cf5c` (first offset one-directional; staircases left to the webview, noted in the contract) | A hostile caller may send a first offset up to 2 h *below* the implied one, offsets no zone has, or a staircase of changes, and every reach is bucketed up to 12 h off; counts are conserved. The screen never sends these |

Held: every malformed offsets list (unsorted, duplicated, at `range_end`, empty, a wrong first instant, i64 extremes, days + 2 entries) refused with the one sentence, no panic; 4.4M entries checked in 40 ms; `by_hour` conserves every count; a reach at a change instant takes the new offset, as `Date` does; `offsetChanges` matches a 15-minute ground truth in all 419 zones, every two-year window 1900–today; 24 hours always, no ranking word; hours equal `Date.getHours()` for every whole-minute offset (1972 on).
