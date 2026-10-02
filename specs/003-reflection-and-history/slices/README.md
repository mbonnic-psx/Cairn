# Slice register — The check-in and history

A row marks a slice done: accepted, its Phase 4 cleared and its pull request merged.

| Slice | Done | PR | Accepted by | Notes |
|---|---|---|---|---|
| write-tonight | 2026-10-01 | #17 | the owner, demo on WSL ("accepted") | adversary: 10 findings, all fixed (J6's class outside the slice in #10); mutation: interface 96.96%, core 22/24 viable; W13, W14 parked to `history-by-site` |
| quote | 2026-10-01 | #22 | the owner, demo on WSL ("it works", after Q1 was revised twice) | adversary: 6 LOW, A1 via #19, A6 deferred by the owner, the rest fixed; mutation: interface 95.86%, core 29/32 live with 7 Tauri wrappers app-only |
| history-by-site | 2026-10-01 | #29 | the owner, demo on WSL with seeded demo data ("yes"; date boxes kept for now) | converged at pass 1; adversary: R1 HIGH (a sealed session marked unseen time as seen) and R2–R5 LOW, all fixed; mutation: interface 97.07%, core 107/108 viable; demo moved Today into the header always |
| history-by-hour | 2026-10-02 | #48 | the owner, demo on WSL with seeded demo data ("It looks great") | converged at pass 2 (K23 HIGH, a skipped midnight sealed the range); adversary: A1–A3 LOW, all fixed; mutation: interface 94.68% + one gap closed, core 53/54 viable; B4 clarified and B5 taken on the host's recommendation, confirmed by the owner |
| history-by-weekday | 2026-10-02 | #56 | the owner, demo on WSL with seeded weekly data ("its good to go") | converged at pass 1; Y23 (MEDIUM) and Y24 (LOW) fixed after the demo; adversary: W-A1 LOW (a clock change after midnight puts a reach on a date outside the range) — contract amended, example pinned; mutation: interface 96.92%, core 28/29 viable, every survivor equivalent |
