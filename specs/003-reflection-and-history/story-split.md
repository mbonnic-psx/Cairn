# Story split — The check-in and history

The capability is *a person in recovery sits down with Cairn in the evening, writes about the day beside what
they reached for, and can later see the pattern and own what they wrote*. The Rust foundations are already
merged: the pure domain (`dates`, `checkin`, `patterns`) and the encrypted journal and estimate stores (tasks
T001–T023; the announce seam they also built was removed on 2026-10-01). Each slice below leaves the person able to do one more thing, end to end, from
the store to the screen. None of them is a layer on its own.

Split by **path** (SPIDR), the writing first. The writing is the point: US1 delivers value on a day with zero
reaches, and a check-in with no notification, no settings and no quote is still one a person can open and use.

**Revised 2026-10-01.** The owner withdrew the evening notice: Cairn never asks anyone to check in, and raises no
notification of any kind (constitution v1.4.0, spec Clarifications 2026-10-01). Slices 2 and 3 are withdrawn and
`quote` is next.

Approved by the owner on 2026-09-30 ("Approve, start write-tonight").

## Slices, in order

| # | Slice | What the person can do afterwards | Specification | Depends on |
|---|---|---|---|---|
| 1 | `write-tonight` | Open the check-in from the app at any time, see today's reaches beside a space to write, save an entry, and reopen and revise it later the same evening. When the key is unavailable, the space is not offered and the plain sentence is shown instead | US1 scenarios 4 and 6; FR-010, FR-014, FR-015 (save and revise), FR-016, FR-027–FR-029, FR-031–FR-033; edge cases: midnight while open, nothing written; tasks T026, T027 (the check-in without a quote), T029, T030, T032 (`get_day`, `save_journal_entry`), T033, T034, T036, T038 | — |
| 2 | ~~`evening-notice`~~ | *Withdrawn 2026-10-01* — Cairn raises no notification | — | — |
| 3 | ~~`evening-settings`~~ | *Withdrawn 2026-10-01* — with no notice there is no evening hour or switch to set | — | — |
| 4 | `quote` | See a quote on the check-in, or none, with nothing degraded either way | US1 scenario 1 (the optional quote); FR-008, FR-009; tasks T031, T032 (`get_quote`), T027 (the quote half) | 1 |
| 5 | `history` | See reaches by site, by hour and by day of week over a range, with no streak or day count | US2; split 2026-10-01 into 5a–5d below | 1 |
| 5a | `history-by-site` | Choose a range (the last 4 weeks to start) on the reaches screen and see which sites were reached for, most first, with what Cairn did not see stated above | US2 scenarios 1 (by site, the range), 3, 4, 5; FR-019 (by site), FR-022, FR-022a, FR-023, FR-024; T034's range read | 1 |
| 5b | `history-by-hour` | See the same range by hour of the day | US2 scenario 1 (by hour); FR-019, FR-023 | 5a |
| 5c | `history-by-weekday` | See the same range by day of the week | US2 scenario 1 (by day of week); FR-019 | 5a |
| 5d | `history-movement` | See how the number of reaches moved across the range | US2 scenario 2; FR-020 | 5a |
| 5e | `first-counted` | Know from when Cairn has been counting, so a range or a day that reaches back before it says so rather than reading as quiet | FR-022, FR-022a, FR-024; H5 | 5a |
| 6 | `one-day` | Open any single day, whole, with its gaps, and give an estimate for a silent day | US3; split again when reached | 1 |
| 7 | `theirs` | Revise, delete and erase entries and history, with nothing left behind | US4; split again when reached | 1 |

## Slice graph

```text
write-tonight ──┬── quote
                ├── history-by-site ──┬── history-by-hour
                │                     ├── history-by-weekday
                │                     └── history-movement
                ├── one-day
                └── theirs
```

- `write-tonight`: depends_on none
- `quote`, `history-by-site`, `one-day`, `theirs`: depends_on write-tonight
- `history-by-hour`, `history-by-weekday`, `history-movement`, `first-counted`: depends_on history-by-site (they share its range and screen)

Once `write-tonight` is done, `quote`, `history-by-site`, `one-day` and `theirs` are ready together.
They share the `DayView` and journal contracts in `contracts/ui-ipc.md`, and each touches a different screen or
command, apart from `quote` and `one-day`, which both edit `CheckIn.tsx`. Run those two one after the other.

## Parking lot

- `theirs` includes revising an entry to nothing. Until then, clearing an entry to empty is refused and the saved
  entry stays (the gaps review for `write-tonight`, G2).
- The 002 spikes T011–T013 are unresolved. T013 (Secret Service on a minimal Linux target) bears on how often the
  sealed state is what a Linux user sees, which is why `write-tonight` treats the sealed state as a first-class
  path rather than an error.

- `first-counted` decides, with `history-movement`'s V29 measurement, whether a range starts no earlier than Cairn's
  first count: at the widest range the screen sends (1000-01-01), *Day by day* blocks the page for about 10 s
  (`decisions.md` D3, M11). It also takes V47 and V48, the count's unit for a screen reader and its grouping (D2).

- `theirs` clears the first count only when the person erases everything; any narrower deletion leaves it where it
  is (gaps review F5, 2026-10-05).

## History, split (2026-10-01)

Split by **rule** (SPIDR): each breakdown is a rule a person can use alone, and the range and the screen are
shared, so `history-by-site` comes first and carries them. Approved by the owner on 2026-10-01 ("1. yes, 2. yes,
3. yes, 4. yes"): by site first; a range of the last 4 weeks to start; on the reaches screen, not a new one; a calm
list, most first.

