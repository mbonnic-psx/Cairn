# Slice register — The notebook in the landscape

A row marks a slice done: accepted, its Phase 4 cleared and its pull request merged.

| Slice | Done | PR | Accepted by | Notes |
|---|---|---|---|---|
| frame | 2026-10-01 | #28 | the owner, demo of the morning look | adversary: T1, T2 fixed through tests, R1 deferred to `reveal`, T3 and R2 declined; mutation: interface 90.39%, five survivors killed by tests, the rest equivalent or artwork; T024 (real-browser layout check) and T025 (heading outline) ride with the page slices |
| looks | 2026-10-02 | #30 | drive-hand (accepted-by: drive-hand), demo of midday and night; the owner has not yet seen these looks | converged in two passes (T015 rescoped by D5); adversary skipped, covered by frame rows; mutation 95.07%, no behavioural survivors; T020–T024 (MEDIUM/LOW) carried to the page slices |
| protection-page | 2026-10-02 | #31 | drive-hand (accepted-by: drive-hand), demo of both spreads in all three looks; the owner has not yet seen them | lands the notebook context and heading outline (D6, D9) the other page slices build on; converged in two passes; adversary skipped, covered by frame rows; mutation 81.70%, Protection.tsx 97.37% after follow-up tests; handed back: the waiting change is never fetched (D11, 002), T024, "1 hours ago" wording |
