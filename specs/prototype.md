# Prototype register — Cairn, whole app

Hand-built on 2026-10-01 to slipwai's prototype-mode spec (Slippy `specs/002-prototype-mode/spec.md`, PRs #23 and #24)
before that mode exists in the factory. It is throwaway: production is still built slice by slice, test-first, and no
prototype code is ever imported by `src/` or `src-tauri/`.

- **Link:** https://claude.ai/artifact/PyXanw1aHwLPY5EUFrrasg (private; share it from the page's Share menu)
- **Source:** `prototype/app/index.html` — one prototype for the whole app, across specs 001, 002 and 003
- **Built from:** `main` at `5e27e06`, plus `slice/write-tonight`, `slice/quote` and `slice/history-by-site` (plan) for
  Tonight, the quote and Over time, and spec 001 and `VISION.md` for the screens no slice has reached yet
- **Seeded with:** sample data only. Social, News and Streaming lists on, one custom site (`slowforum.net`), protection
  on, 28 days of reaches, journal entries on about half the days, one day with a 3-hour gap, and one silent day with
  an estimate of 6. "Start empty" on the banner switches to a first run with nothing set up.
- **Accepting a screen:** use the "Accept this screen" button on the bar. It is recorded with who accepted and when.
  It needs access that can use the page: share the link with product people at that level, not view-only. A view-only
  viewer sees why the button is unavailable.

## Screens

| Route | Screen | Feature · story | State |
|---|---|---|---|
| `choose` | Setup · What would you like to protect? | 001 US1 · 002 (built) | draft |
| `streaks` | Setup · Streaks | 001 streaks · slice 004 (spec only) | draft |
| `disclosure` | Setup · Before Cairn changes anything | 002 (built) | draft |
| `protection` | Protection, including the waiting panel and "not confirmed" | 002 (built) | draft |
| `trail` | What is protected | 002 (built) | draft |
| `today` | Today | 002 · 003 (built) | draft |
| `overtime` | Today · Over time: by site, by hour, by weekday, day by day | 003 slices 5a–5e (planned) | draft |
| `day` | One day | 003 slice one-day (spec only) | draft |
| `tonight` | Tonight, with quote, estimate when silent, streak when on | 003 write-tonight · quote (branches) | draft |
| `covers` | What Cairn covers | 002 (built) | draft |
| `settings` | Settings: protection off, waiting period, partner, schedule, counting, browser workarounds, streaks, start with machine, history, remove Cairn's changes | 001 FR-039 · 002 US4 (spec only) | draft |
| `partner` | Settings · A partner, and the shared summary | 001 partner flow (spec only) | draft |
| `theirs` | Settings · Your history: delete a day, a range, all of it | 003 slice theirs (spec only) | draft |
| `teardown` | This machine is as it was | 002 teardown (built, not wired) | draft |

Not prototyped: the evening notice and evening settings (withdrawn 2026-10-01), and the tray.

## Reactions

None yet. Each comment on a screen becomes a gap in the feature that screen shows, answered in that feature's `decisions.md`,
and the prototype is republished to the same link.
