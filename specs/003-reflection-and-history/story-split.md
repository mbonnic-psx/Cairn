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
| 5 | `history` | See reaches by site, by hour and by day of week over a range, with no streak or day count | US2; split again when reached | 1 |
| 6 | `one-day` | Open any single day, whole, with its gaps, and give an estimate for a silent day | US3; split again when reached | 1 |
| 7 | `theirs` | Revise, delete and erase entries and history, with nothing left behind | US4; split again when reached | 1 |

## Slice graph

```text
write-tonight ──┬── quote
                ├── history
                ├── one-day
                └── theirs
```

- `write-tonight`: depends_on none
- `quote`, `history`, `one-day`, `theirs`: depends_on write-tonight

Once `write-tonight` is done, `quote`, `history`, `one-day` and `theirs` are ready together.
They share the `DayView` and journal contracts in `contracts/ui-ipc.md`, and each touches a different screen or
command, apart from `quote` and `one-day`, which both edit `CheckIn.tsx`. Run those two one after the other.

## Parking lot

- `theirs` includes revising an entry to nothing. Until then, clearing an entry to empty is refused and the saved
  entry stays (the gaps review for `write-tonight`, G2).
- The 002 spikes T011–T013 are unresolved. T013 (Secret Service on a minimal Linux target) bears on how often the
  sealed state is what a Linux user sees, which is why `write-tonight` treats the sealed state as a first-class
  path rather than an error.
