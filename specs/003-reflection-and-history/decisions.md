# Decisions — The check-in and history

Decisions `/cruise` took for this feature, one entry each. The owner's own answers before the run began are in
`spec.md` (Clarifications) and in each slice's `plan.md` and `tasks.md` (M-, Q- and B-numbered).

## D1 — Should M14's year rule reach the check-in's ended-day name?
- **Stage:** converge (after the demo) · **Slice:** history-movement · **When:** 2026-10-04T04:55:00Z · **Iteration:** 12
- **Question:** V45: the check-in names an ended day it held open past midnight as *Wednesday 30 September*, with no year, so on 1 January it says *Thursday 31 December*. Should M14 (name the year when a date is outside this year) apply there too?
- **Options:** leave it (recommended by the converge pass) · extend M14 to every date Cairn writes
- **Decision:** Leave it. M14 covers the four views' titles and *Day by day*'s rows, as the owner said it.
- **Why:** That day is at most yesterday, and its weekday makes it plain which day it is. A year there adds words to the evening page and tells the person nothing.
- **Decided by:** host (stage recommendation)
- **Confidence:** high · **Would reverse if:** the owner says M14 applies wherever a date is written
- **Written to:** specs/003-reflection-and-history/slices/history-movement/tasks.md
- **Status:** standing

## D2 — Do V26's two count findings hold up the slice?
- **Stage:** design review (V26) · **Slice:** history-movement · **When:** 2026-10-04T04:58:00Z · **Iteration:** 12
- **Question:** V26 found a MEDIUM (a screen reader hears a row's count with no unit, and *week of Nov 3, 2025* runs into the count) and a LOW (counts not grouped, so a wide count moves its bar). Fix them now, or carry them?
- **Options:** carry both to `first-counted`, which edits the same rows next (recommended: after converge only a CRITICAL re-opens the loop, and neither is new to this slice's views alone) · fix them in this slice before the demo
- **Decision:** Carry both to `first-counted` as V47 and V48.
- **Why:** The count has read this way on every view since `history-by-site`. Fixing it touches every view's tests, which is a change of its own. The next slice opens the same rows anyway.
- **Decided by:** host (stage recommendation)
- **Confidence:** medium · **Would reverse if:** the demo or the adversary pass finds a person misled by the run-together year and count
- **Written to:** specs/003-reflection-and-history/slices/history-movement/tasks.md
- **Status:** standing

## D3 — The widest range freezes *Day by day* for about ten seconds: fix it here, or in `first-counted`?
- **Stage:** demo (V29) · **Slice:** history-movement · **When:** 2026-10-04T05:30:00Z · **Iteration:** 12
- **Question:** At the widest range the screen sends (From 1000-01-01; `isLocalDate` refuses earlier years, so the plan's 0100 case is unreachable), the core answers 53 574 weekly rows in 64 ms, but drawing them blocks the page for about 10 s, and returning to *Day by day* blocks it for 17 s. V29 hands the remedy to the owner: a coarser span, windowing, or the range starting at `first-counted`.
- **Options:** carry it to `first-counted`, as the owner's M11 (Q3) already said: keep weeks however long, measure it, and let `first-counted` decide whether a range starts no earlier than Cairn's first count (recommended) · a coarser row beyond some length (a third `span`, a contract change) · window the list in the screen now
- **Decision:** Carry it to `first-counted`, which decides with this measurement in hand. This slice merges with the freeze on record.
- **Why:** The owner chose this on 2026-10-02 (M11), knowing the range could be centuries long. Reaching the freeze takes typing a year centuries back into *From*. Every range a person would use (weeks, months, a few years) draws at once. The rows are true as far as Cairn recorded.
- **Decided by:** host (stage recommendation)
- **Confidence:** medium · **Would reverse if:** the owner says a freeze any person can reach must not ship, even for a range typed on purpose
- **Written to:** specs/003-reflection-and-history/slices/history-movement/tasks.md, specs/003-reflection-and-history/story-split.md
- **Status:** standing
