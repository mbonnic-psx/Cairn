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
