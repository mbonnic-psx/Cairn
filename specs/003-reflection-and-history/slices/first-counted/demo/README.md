# Owner demo setup — first-counted

Two disposable histories, each answered by the REAL core (`AppState` from this worktree's `src-tauri`,
features `history`, a fixed demo key), seeded through the real store (`note_counting`, `record`,
`record_gap`), so `first_counted` is whatever the real code derives. Protection, trail and quotes
are `fake-core.js` (in-page); only the three history reads (`list_todays_reaches`, `summarize_reaches`,
`get_day`) go to the core. Nothing is written outside `~/.cache/cairn-scratch/hand-fc/`. Dev server is
bound to 127.0.0.1.

## URLs (plain browser, no init script needed)

| | URL | Seed |
| --- | --- | --- |
| A "installed today" | http://127.0.0.1:1473/?seed=a | core on :1471 |
| B "counting for three weeks" | http://127.0.0.1:1473/?seed=b | core on :1472 |

The page opens on Protection: use the TODAY tab (then Today / Over time), and TONIGHT for the check-in.
The "Look (testing)" switch at top left defaults to Morning (dev-only; greeting only).

## PIDs (started 2026-10-05 about 15:02 CDT)

- core A `hand-fc-core serve` :1471 — PID 921162
- core B `hand-fc-core serve` :1472 — PID 921163
- Vite :1473 — PID 921176 (node; parent `npm exec` 921164)

## Stop everything

    ~/.cache/cairn-scratch/hand-fc/stop.sh

(kills both core servers and Vite, and prints `stopped` once ports 1471-1473 are free).

## Seed facts (zone America/Chicago, CDT, local clock)

- A: first count today 2026-10-05 at 12:40 PM. 2:14 PM was already past when this was built (15:00), so
  12:40 PM was used; the morning is unseen. Four reaches: reddit.com 12:40 PM, youtube.com 1:25 PM,
  x.com 2:10 PM, reddit.com 2:50 PM. Nothing earlier, no gaps. (`seed-a.json`)
- B: first count 2026-09-14 (21 days ago) at 2:14 PM. 61 reaches, 2-5 on most days up to today (days 4, 9,
  14, 19 back hold none); 3 on the first day, from 2:14 PM. One recorded gap on 2026-09-25 from
  2:00 AM to 5:30 AM (3.5 hours). (`seed-b.json`)

## What to expect

- A, TODAY (Today tab): "Cairn started counting at 12:40 PM today." above the four reaches. TONIGHT
  (check-in): "Cairn started counting at 12:40 PM" plus the day phrase the check-in writes. Over time with the
  default range: nothing earlier than today.
- B, TODAY then Over time: heading "From 14 September to 5 October"; From's min is 2026-09-14 (To's min too),
  so From cannot go earlier. The range holds the first count, so the line reads "Cairn started counting at
  2:14 PM on Sep 14." Move From later (e.g. to Sep 16) and it reads "Cairn started counting on Sep 14,
  2026." Try all four views (By site, By hour, By day, Day by day); Day by day shows Sep 25 with the
  3.5-hour gap as seen/partly seen per the core.
- Verified by me in agent-browser: A Today and Tonight sentences, B F3 and F2 sentences, B From min.
  Not hand-checked: B's other views and the gap's row.

## Files

`harness/core-server-main.rs`, `core-server-Cargo.toml` (package `hand-fc-core`, built from
`~/.cache/cairn-scratch/hand-fc/core-server`, target `.../hand-fc/target`), `harness/fake-core.js`
(`?seed=a|b` picks the core port), `harness/index.demo.html` and `harness/vite.demo.config.ts` (Vite
`--config`; "/" serves the demo page, which loads the shim first; no committed production file touched).
Logs: `~/.cache/cairn-scratch/hand-fc/{core-a,core-b,vite}.log`, every core answer in `logs-a/`, `logs-b/`.
