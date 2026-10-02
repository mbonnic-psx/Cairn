# Slice register — The check-in and history

A row marks a slice done: accepted, its Phase 4 cleared and its pull request merged.

| Slice | Done | PR | Accepted by | Notes |
|---|---|---|---|---|
| write-tonight | 2026-10-01 | #17 | the owner, demo on WSL ("accepted") | adversary: 10 findings, all fixed (J6's class outside the slice in #10); mutation: interface 96.96%, core 22/24 viable; W13, W14 parked to `history-by-site` |
| quote | 2026-10-01 | #22 | the owner, demo on WSL ("it works", after Q1 was revised twice) | adversary: 6 LOW, A1 via #19, A6 deferred by the owner, the rest fixed; mutation: interface 95.86%, core 29/32 live with 7 Tauri wrappers app-only |
| history-by-site | 2026-10-01 | #29 | the owner, demo on WSL with seeded demo data ("yes"; date boxes kept for now) | converged at pass 1; adversary: R1 HIGH (a sealed session marked unseen time as seen) and R2–R5 LOW, all fixed; mutation: interface 97.07%, core 107/108 viable; demo moved Today into the header always |
