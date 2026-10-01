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
| A1 | LOW | confirmed | open | No guard holds the bundled lines to R6: `check-no-streaks.mjs` does not scan `src-tauri/resources`, so a streak or "stay strong" line ships green. The guard is the host's (`scripts/`), not the slice's |
| A2 | LOW | confirmed | open | A bundled line that shows nothing (U+200B, U+2800, U+3164) passes `trim().is_empty()` and renders as an empty quote; `domain::visible::shows_nothing` (G4) is not used |
| A3 | LOW | confirmed | open | Double-clicking "Show quotes" while the save is in flight asks twice and swaps the line while the check-in stays open (Q1) |
| A4 | LOW | confirmed | open | A line asked for on the old day lands after Tonight opened a new day, replacing the new day's line (Q1, G5) |
| A5 | LOW | confirmed | open | The switch's failure note shows any rejection verbatim (`Error: …`); it is hidden behind a save refusal, and not cleared on a new day |
| A6 | LOW | confirmed | open | A FIFO in place of the quotes file blocks `get_quote` (a sync command), which would freeze the window. Needs write access to the install's resources, i.e. admin |

Held: missing, empty and pre-slice config read as shown; a malformed setting makes the config unreadable and shows neither line nor switch (fail closed); a save never loses trail, pending change or trusted clock, and a half-way save leaves the old file; hostile quotes files (empty, non-strings, invalid UTF-8, a directory, missing, 100k lines, a 50 MB line) give no line or a line, never a panic; the roll is never the date; the quote is only reachable from `CheckIn.tsx`; the shipped 24 lines pass the banned-words check and read clean against R6.
