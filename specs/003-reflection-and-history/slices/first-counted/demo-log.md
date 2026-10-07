# Demo log — first-counted

## 2026-10-06T23:20:00Z — accepted · iteration 12 · drive-hand (claude-opus-5-5)

- **Owner:** accepted on 2026-10-06, in the harness that `demo/README.md` describes (Vite on 127.0.0.1:1473, seed A on core :1471, seed B on core :1472). The benchmark's demo stage was closed `outcome=accepted` (ended 2026-10-06T21:00:12Z). What follows under N26 is the evidence that task asks for, gathered after the acceptance. It does not reopen the acceptance.
- **Iteration:** none of its own; /cruise stopped in iteration 12 (2026-10-05) and this slice was driven by hand after it, so its entries carry 12.

- **Started with:** the owner's harness, left untouched (Vite :1473 PID 921176, core A :1471 PID 921162, core B :1472 PID 921163). Two exceptions, both reads: two `list_todays_reaches` reads reached core A (`logs-a/012`, `013`) before the second Vite was up. For N26 the hand added four histories, seeded by `hand-fc-core seed` (`demo/harness/core-server-main.rs`, the same program with three new seed arms), and each was served by its own core: `since-2025` on :1474, `installed-yesterday` on :1475, `centuries-back` on :1476 and a fresh `installed-today` on :1478. Their data directories are `~/.cache/cairn-scratch/hand-fc/data-{c,d,e,f}`. The cores were built by cargo against this worktree at 46dbf8e, and cargo found the `cairn` library up to date. A second Vite ran on 127.0.0.1:1477 (`demo/harness/vite.n26.config.ts`, dependency cache under `~/.cache/cairn-scratch/hand-fc/vite-cache-n26`). The first Vite keeps serving its cached `fake-core.js`, because it does not watch `specs/`, so the new `?seed=c|d|e|f` mapping is only live on :1477. Every extra server was stopped afterwards (below).
- **Seeded** (zone America/Chicago; `demo/seed-{c,d,e,f}.json` each carries `first_count_read_back`, the store's own `first_count()` after seeding):
  - **c, since-2025:** counting was noted at 2025-01-01 10:30 AM CST. There is one instagram.com reach every ninth day from then on. The last seven days carry reddit.com 1 234, youtube.com 56 and x.com 7. The first count read back is 1735749000.
  - **d, installed-yesterday:** the first count is yesterday, 2026-10-05, at 9:08 AM. There are three reaches that day and two today.
  - **e, centuries-back:** counting was noted at 2025-01-01, with one reach at 2025-01-01. One more reach was recorded at 1000-06-01 18:00 UTC, as under a clock set centuries back. F6 moved the first count to that reach: it reads back as −30597112800.
  - **f, installed-today:** the first count is today at 12:40 PM, with four reaches from then on.
- **Driven through:**
  - **Chromium:** agent-browser 0.38.1 (headless), in two sessions with `--allowed-domains 127.0.0.1`. One was started under `LANG=en_US.UTF-8` (Intl `en-US`) and one under `LANG=en_GB.UTF-8` (Intl `en-GB`). `--lang` alone was ignored.
  - **WebKitGTK:** WebKitGTK 2.52.6, the engine Tauri's window uses on Linux, driven through PyGObject (WebKit2 4.1) under Xvfb (`demo/harness/n26_webkitgtk.py`). It loaded the same page and got the same real-core answers, but it is **not** the Tauri window and not IPC.
  - **Tauri:** the Tauri window itself was not driven.
- **Platforms seen:** WSL2 (Linux), in Chromium and in WebKitGTK as a bare engine. **Not seen:** the Tauri window on Linux (WebKitGTK over IPC), Windows (WebView2), macOS (WKWebView).

- **Examples:** the N26 clauses, each below as seen, partly seen or not seen.

### N26, clause by clause

1. **First count 2025-01-01, *From* typed 1000-01-01: seen.**
   - *From* reads 2025-01-01, with `min` 2025-01-01, in Chromium en-US and en-GB and in WebKitGTK.
   - The core was asked for 2026-09-09..10-06 (the opening range) and then 2025-01-01..2026-10-06. It was never asked for 1000-01-01: `demo/n26-core-answers/c-009-*`, and the core's request log over the whole run holds no `firstDay` of 1000 for seed c.
   - *Day by day* drew **92** weekly rows. The page stayed responsive, timed as V29 timed it (`demo/harness/n26-v29.js`, `demo/n26-v29-timing.json`):

     | Engine | Locale | Typing to rows on the page | Longest main-thread block |
     | --- | --- | --- | --- |
     | Chromium | en-US | 170 ms | 62 ms |
     | Chromium | en-GB | 70 ms | 41 ms |
     | WebKitGTK | C locale | 159 ms | 135 ms |
     | WebKitGTK | en-GB | 244 ms | 194 ms |

   - The core spent 17.8 ms on the read, and the answer was 8 836 bytes.
   - After drawing, the view switches took 9–24 ms.
   - V29 measured 10 269 ms and 9 812 ms here.
   - Screenshots: `n26-01`, `n26-08`, `n26-11`.
2. **Fresh install: seen.** With seed f, the page asked for 2026-09-09..10-06 and then for 2026-10-06 alone (`n26-core-answers/f-039` and its twin `f-040`, then `f-041`). *From* and *To* read 2026-10-06, `min` 2026-10-06, and the heading reads *From 6 October to 6 October*. Over time says *Cairn started counting at 12:40 PM on Oct 6.* *Today* says **Cairn started counting at 12:40 PM today.** above the coverage line, and the check-in says the same before its notes. No coverage note counts the morning before 12:40 PM as time Cairn was away (`f-037`: `coverage_note` null). Screenshots: `n26-02`, `n26-03`, `n26-04`, en-GB `n26-13`.
3. **The next day it does not: seen** (simulated with seed d, whose first count was yesterday at 9:08 AM, read today). *Today* and the check-in draw no start sentence in any engine, locale or layout measured. Over time moves *From* up to 2026-10-05 (`n26-core-answers/d-005-*`) and reads *Cairn started counting at 9:08 AM on Oct 5.* Screenshots: `n26-05`, `n26-06`. Nobody waited for a real day to pass.
4. **Counts over 999, every bar starts at the same place: seen.** In each view measured, the spread of bar starts is at most 0.02 px, and every count box takes the width of the widest grouped count (`--nb-count-chars`). The bar-starts table is below. Screenshots: `n26-10` (1,234 / 56 / 7 / 2) and `n26-12` (*week of 30 Sept 2026* 1,297).
5. **The time is written as the computer writes it: seen in Chromium and WebKitGTK. Not seen in the Tauri window, Windows or macOS. The plan's assumption was neither confirmed nor refuted for a real regional setting.**
   - **Chromium:** en-US writes *10:30 AM*, *Jan 1, 2025* and *1,234*. en-GB writes *10:30*, *9:08*, *12:40*, *1 Jan 2025*, *5 Oct* and *1,234*.
   - **WebKitGTK follows the process locale.** This computer's own locale is `LANG=C.UTF-8`, and it is the only locale installed (`locale -a`: C, C.utf8, POSIX). Under it, WebKitGTK reports `navigator.language` **"C"** and Intl **`en-US-u-va-posix`**. It writes *10:30 AM* and the count **ungrouped, "1234"** (`n26-webkitgtk-default.json`), and the count box is 4ch wide. Chromium under the same `C.UTF-8` writes *1,234*. So on this Linux computer the real Tauri window would most likely write *1234*. That is the computer's POSIX form, and the plan's rule allows it, but the two engines differ.
   - **WebKitGTK and a region that is not installed:** with `LANG=en_GB.UTF-8` (or `LC_ALL`, or `LANGUAGE=en_GB`), WebKitGTK fell back to en-US. Through WebKit's own preferred-languages setting (`set_preferred_languages(['en-GB'])`, which Tauri is not known to call), it wrote en-GB. Whether WebKitGTK follows a GB region on a computer that has that locale installed could not be observed here.
6. **Sentence heights and bar starts as a table: done** (below).
7. **Platforms seen and not seen: recorded** (above).
8. **F6's one remaining freeze path: stated, and reproduced.** A reach recorded under a clock set centuries back moves the first count to that reach (F6), so *From*'s limit moves back with it.
   - With seed e, *From* typed as 1000-01-01 reads **1000-06-01**. Over time says *Cairn started counting on Jun 1, 1000.* (and *…at 12:09 PM on Jun 1, 1000.* once the range holds it; 12:09 PM is Chicago's local mean time for 18:00 UTC).
   - *Day by day* draws **53 553** weekly rows, and the page freezes as V29's did:

     | Engine | Typing to rows on the page | Longest main-thread block |
     | --- | --- | --- |
     | Chromium | **18 833 ms** | **17 862 ms** |
     | WebKitGTK | **107 568 ms** | **105 649 ms** |

   - Going back to *Day by day* after *By site* blocked Chromium for 51 460 ms and then 30 311 ms. *By site* itself took 1.3–1.8 s.
   - The core spent 186 ms on the read, and the answer was 4.5 MB (`n26-core-answers/e-005-*`).
   - This is the plan's recorded limit ("The freeze (D3, V29)"). It is not a new decision. The rows are true, and no reach is hidden. Screenshot: `n26-07`.

### Sentence heights (the left page's asides and notes, serif 16 units, line height 26.4 units)

At the narrowest window (800×600, Tauri's `minWidth`/`minHeight`), `--nb-u` resolves to **1px** by its own formula (`clamp(1px, min(100vw/1280, 100vh/800), 2px)`). A window reaches 2px only at 2560×1600 or larger, which is the wide layout. So the "800×600 at 2px" column holds `--nb-u` at 2px on `.nb-root` by hand. **No window can produce that state.** It is measured because N22 asked for it, and at that size the weekly rows' labels run over their bars (`n26-09`). Heights are the paragraph's box. The check-in's `nb-checkin-note` includes its 21 px top padding. Chromium values are in `n26-measurements-en-US.json` and `-en-GB.json`, and WebKitGTK values in `n26-webkitgtk-default.json` and `-en-GB.json` (WebKitGTK rounds to whole pixels).

| Sentence | Cr en-US 800×600 1px | Cr en-GB 800×600 1px | WK C 800×600 1px | WK en-GB 800×600 1px | Cr en-US 800×600 2px held | Cr en-GB 800×600 2px held | Cr en-US 2560×1600 2px | Cr en-GB 2560×1600 2px |
|---|---|---|---|---|---|---|---|---|
| F2 *…on Jan 1, 2025.* / *…on 1 Jan 2025.* | 26.39, 1 line | 26.39, 1 | 26, 1 | 26, 1 | 158.39, 3 | 158.39, 3 | 52.8, 1 | 52.8, 1 |
| F3 with year (longest) *…at 10:30 AM on Jan 1, 2025.* / *…at 10:30 on 1 Jan 2025.* | 52.78, 2 | 52.78, 2 | 52, 2 | 52, 2 | 211.19, 4 | 158.39, 3 | 105.59, 2 | 105.59, 2 |
| F3 without year *…at 9:08 AM on Oct 5.* / *…at 9:08 on 5 Oct.* | 52.78, 2 | 52.78, 2 | 52, 2 | 52, 2 | 158.39, 3 | 158.39, 3 | 52.8, 1 | 52.8, 1 |
| *Today*, first day *…at 12:40 PM today.* / *…at 12:40 today.* | 52.78, 2 | 26.39, 1 | 52, 2 | 26, 1 | 158.39, 3 | 158.39, 3 | 52.8, 1 | 52.8, 1 |
| Check-in, first day (same words) | 73.78, 2 | 47.39, 1 | 73, 2 | 47, 1 | 199.39, 3 | 199.39, 3 | 93.8, 1 | 93.8, 1 |
| *Today* / check-in, next day | none drawn | none | none | none | none | none | none | none |

At 1280×800 (1px), every sentence takes one line except F3 with year (2 lines, 52.78 px). Each sentence is on the left page (`nb-page`, not ruled) in `nb-reaches-aside` or `nb-checkin-note`. Every aside's height is a whole number of 26.4-unit lines, so none sits half on a line. The check-in's height is that plus its padding.

### Bar starts (`.nb-reaches-bar` left edge, px; count box width)

| View | Cr en-US 800×600 | Cr en-GB 800×600 | WK C 800×600 | WK en-GB 800×600 | Cr 800×600 2px held | Cr 2560×1600 |
|---|---|---|---|---|---|---|
| By site, 4 rows (1,234 / 56 / 7 / 2) | 573.67–573.69; 5ch = 36 px | 573.67–573.69; 36 px | 580.88–580.89; **4ch = 28.8 px ("1234")** | 573.67–573.69; 36 px | 532.41–532.42; 72 px | 1979.28–1979.30; 72 px |
| Day by day, 92 weekly rows (to 1,297) | 573.67–573.69; 36 px | 573.67–573.69; 36 px | 580.88–580.89; 28.8 px | 573.67–573.69; 36 px | 532.41–532.42; 72 px | 1979.28–1979.30; 72 px |
| By site, 3 rows (2 / 2 / 1) | 602.48; 1ch = 7.2 px | 602.48 | 602.48 | 602.48 | 590; 14.41 px | 2036.88; 14.41 px |

The 0.02 px spread comes from the grouped *1,234* measuring 36.02 px against 5ch = 36.00 px. That is less than a device pixel. The en-US and en-GB values are identical. 1280×800 matches too: 989.63–989.64 and 1018.44.

- **Evidence:**
  - Screenshots in `demo/`:
    - `n26-01-from-1000-reads-2025-daybyday-weekly-en-US-1280x800.png`
    - `n26-02-today-first-day-en-US-1280x800.png`
    - `n26-03-checkin-first-day-en-US-1280x800.png`
    - `n26-04-overtime-fresh-install-en-US-1280x800.png`
    - `n26-05-today-next-day-en-US-1280x800.png`
    - `n26-06-checkin-next-day-en-US-1280x800.png`
    - `n26-07-f6-centuries-back-from-reads-1000-06-01-en-US-1280x800.png`
    - `n26-08-f3-longest-en-US-800x600.png`
    - `n26-09-f3-longest-en-US-800x600-nb-u-held-2px.png`
    - `n26-10-f2-by-site-grouped-count-en-GB-800x600.png`
    - `n26-11-f3-longest-en-GB-800x600.png`
    - `n26-12-weekly-last-row-over-999-en-GB-800x600.png`
    - `n26-13-today-first-day-en-GB-800x600.png`
    - `n26-14-weekly-label-meets-bar-en-US-800x600.png`
  - Measurements and timing: `demo/n26-measurements-en-US.json`, `demo/n26-measurements-en-GB.json`, `demo/n26-webkitgtk-default.json`, `demo/n26-webkitgtk-en-GB.json`, `demo/n26-v29-timing.json`.
  - Core answers and seeds: `demo/n26-core-answers/` (c-009; d-005; e-005, whose 53 553 rows the core's log keeps as the first and last five; f-037, f-039, f-040, f-041) and `demo/seed-c.json`, `demo/seed-d.json`, `demo/seed-e.json`, `demo/seed-f.json`.
  - Harness: `demo/harness/n26.sh`, `n26-measure.js`, `n26-v29.js`, `n26_table.py`, `n26_webkitgtk.py`, `vite.n26.config.ts`, plus the updated `core-server-main.rs` and `fake-core.js`.
- **Feedback:**
  - **design:** at 800×600, weekly rows whose names carry a year run into their bar.
    - In en-US, 77 of 92 rows leave less than the 12-unit gap, and *week of May 20, 2026* overlaps the bar by 3.56 px. In en-GB it is 56 of 92, and *week of 30 Sept 2026* overlaps by 0.61 px (`n26-14`, `n26-12`).
    - The name is `nowrap` with `min-width: 0`, so it overflows its share instead of wrapping.
    - N16's grouped width likely made it visible: the count box is 5ch (36 px) where it was 2ch, so the label loses about 22 px.
    - At 1280×800 no row is tight.
  - **design:** the F3 sentence splits its date across lines at 800×600 and at 1280×800: *…on Jan 1, / 2025.* and *…on 1 / Jan 2025.* (`n26-01`, `n26-08`, `n26-11`). The Reviewed line foresaw this, and no non-breaking space is used.
  - **design:** on *Today*'s first day, the sentence writes *12:40 PM* and the rows beside it write *12:40 PM*, *01:25 PM*, with a leading zero. In en-GB the sentence writes *9:08* and *12:40* (24-hour, no leading zero, because of `hour: 'numeric'`). Two forms of the time sit on one spread (`n26-02`).
  - **design:** on the install day, Over time's heading reads *From 6 October to 6 October*, and its sentence says *on Oct 6* where *Today* says *today* (`n26-04`).
  - **note (platform):** under this computer's `C.UTF-8`, WebKitGTK writes counts without grouping (*1234*) and reports `navigator.language` "C", while Chromium writes *1,234*. A Linux computer without a region is likely to show ungrouped counts in the real app.
  - **note (F6, recorded limit):** with a reach under a clock set centuries back, Over time says *Cairn started counting on Jun 1, 1000.*, and *Day by day* blocks for about 18 s in Chromium and about 106 s in WebKitGTK. Each return to the view blocks again for 30–51 s in Chromium. This is the plan's known limit, and the decision stays with the owner.
  - **note (harness):** cores A and B (:1471 and :1472) have been running since 2026-10-05 15:02 CDT. That is after NC1–NC5 were written (author dates 2026-10-05 14:48–14:59; the 2026-10-06 15:51 dates are the rebase's commit dates), so the owner's demo got its answers from the converged core. The one later change, 23acccd, touches a test only. The screen was current through Vite's HMR. The N26 cores (:1474–:1478) are at 46dbf8e. (Corrected by the host: the hand first read the rebase dates as authoring dates.)
- **Stopped:**
  - Stopped: the N26 cores on :1474, :1475, :1476 and :1478, the second Vite on :1477, and the two agent-browser sessions `fc26us` and `fc26gb`.
  - Left running: the owner's harness on :1471–:1473, as found.

## 2026-10-07T18:20:00Z — accepted · iteration 12 · drive-hand (claude-opus-5-5)

- **Re-measure:** N28, after the owner chose to fix the weekly overlap in this slice.

- **Started with:** `3d2882c` (N28: Over time's `ul` gets `nb-reaches-log--bars`, a grid `minmax(min-content, 1fr) minmax(0, 28%) auto` with every row on `subgrid`, inside `@supports (grid-template-columns: subgrid)`). The change is frontend only.
- **Harness:**
  - **Vite:** a fresh one on 127.0.0.1:1477 (`demo/harness/vite.n26.config.ts`), so it served the CSS as committed.
  - **Cores:** `since-2025` on :1474 and `installed-yesterday` on :1475, serving the N26 histories `data-c` and `data-d` as they were seeded on 2026-10-06. Both run `hand-fc-core`, rebuilt for one new seed arm.
  - **Seed g (`long-names`):** a new history in `data-g`, served on :1479. It holds five sites: three names long enough to wrap (up to 63 characters), *reddit.com*, *x.com*, and 1,234 reaches on one long name (`demo/seed-g.json`). It was added because no earlier seed had a name that wraps.
  - **Harness files:** `fake-core.js` maps `?seed=g` to :1479. The owner's :1471–:1473 were not touched.
  - **Dates:** today is 2026-10-07, so *Day by day* from 2025-01-01 now draws **93** weekly rows (N26 had 92). The new week, *week of Oct 7, 2026*, holds 0.
- **Driven through:**
  - **Chromium:** agent-browser, headless, sessions `fc28us` (Intl `en-US`) and `fc28gb` (`en-GB`), `--allowed-domains 127.0.0.1`.
  - **WebKitGTK 2.52.6** (PyGObject, Xvfb), in three runs:
    - preferred language `en-US`: Intl `en-US`, writes *1,234*;
    - preferred language `en-GB`;
    - the computer's own C locale: Intl `en-US-u-va-posix`, writes *1234*, and the count box is 4ch.

  Both engines report `CSS.supports('grid-template-columns', 'subgrid')` true. Both lay the list out as `grid` and every row as `grid`.
- **How "before" was measured:** in each engine, each key state was measured twice on the same page, with the same answers and fonts:
  1. as committed;
  2. with `nb-reaches-log--bars` taken off the `ul` in place.

  Every N28 rule hangs on that class, so the second reading is the flex layout N26 measured. It is also what an engine without `subgrid` draws. The "before" counts reproduce N26 exactly (77 and 56).
- **Gap measure** (`demo/harness/n28-measure.js`): bar's left edge minus the right edge of the name's *text* (its line boxes, not its element box, since a one-line name can overflow its box), divided by `--nb-u`. A second reading takes the whole label, the name plus the clause beside it. It is 0 rows under 12 everywhere, so it is not repeated below.

- **Examples:** N28's Done-when, measured below.

### Day by day, since 2025 (93 weekly rows, *week of Sept 30* 1,297)

| Engine, locale | Window | Rows under 12 units, before → after | Tightest after (units) | Bar start, before → after (px) | Bar width, before → after | Bar end | Start / end spread after | Rows past the page / page scrolls sideways |
|---|---|---|---|---|---|---|---|---|
| Chromium en-US | 800×600 | **77 → 0** | 12.00 *week of May 20, 2026* | 573.67–573.69 → **589.25** | 82.31 → **66.73** | 655.98 (unchanged) | 0 / 0 | 0 / no |
| Chromium en-GB | 800×600 | **56 → 0** | 12.00 *week of 30 Sept 2026* | 573.67–573.69 → **586.28** | 82.31 → **69.70** | 655.98 | 0 / 0 | 0 / no |
| WebKitGTK en-US | 800×600 | **78 → 0** | 12.00 | 573.67–573.69 → **589.25** | 82.31 → **66.73** | 655.98 | 0 / 0 | 0 / no |
| WebKitGTK en-GB | 800×600 | **56 → 0** | 12.01 | 573.67–573.69 → **586.28** | 82.31 → **69.70** | 655.98 | 0 / 0 | 0 / no |
| WebKitGTK C (posix) | 800×600 | **42 → 0** | 12.00 | 580.88–580.89 → **589.25** | 82.31 → **73.94** | 663.19 | 0 / 0 | 0 / no |
| Chromium en-US | 1280×800 | 0 → 0 | 27.38 | 989.63–989.64 → 989.63 | 94.36 → 94.36 | 1083.98 | 0 / 0 | 0 / no |
| Chromium en-GB | 1280×800 | 0 → 0 | 30.34 | 989.63–989.64 → 989.63 | 94.36 | 1083.98 | 0 / 0 | 0 / no |
| WebKitGTK en-US | 1280×800 | 0 → 0 | 27.38 | 989.63–989.64 → 989.63 | 94.36 | 1083.98 | 0 / 0 | 0 / no |
| WebKitGTK en-GB | 1280×800 | 0 → 0 | 30.35 | 989.63–989.64 → 989.63 | 94.36 | 1083.98 | 0 / 0 | 0 / no |
| WebKitGTK C (posix) | 1280×800 | 0 → 0 | 34.58 | 996.83–996.84 → 996.83 | 94.36 | 1091.19 | 0 / 0 | 0 / no |

WebKitGTK en-US counts one row more than Chromium before the change (78 against 77): one row sits just under 12 in one engine and just over in the other. Row heights (32 or 64 units) and each name's line count are identical before and after, in every state compared.

### Every other view (after; bar figures identical in Chromium en-US, en-GB and WebKitGTK en-US, en-GB; gaps are Chromium's, WebKitGTK's within 0.7 units)

| View | Rows | 800×600: bar start / width / end; tightest gap | 1280×800: bar start / width / end; tightest gap | Changed from before? |
|---|---|---|---|---|
| By site, 1,234 / 56 / 7 / 2 (seed c, N26's `n26-10`) | 4 | 573.67 / 82.31 / 655.98; 53.3 | 989.63 / 94.36 / 1083.98; 84.3 | start spread 0.02 → 0 (the 36.02 px count is now one column); nothing else |
| By site, From 2025-01-01 (seed c) | 4 | 573.67 / 82.31 / 655.98; 53.3 | 989.63 / 94.36 / 1083.98; 84.3 | (not compared; same as above) |
| By site, short names 2 / 2 / 1 (seed d) | 3 | 602.48 / 82.31 / 684.80; 93.5 | 1018.44 / 94.36 / 1112.80; 124.4 | no: N26 read 602.48 and 1018.44 |
| By site, long names that wrap (seed g) | 5 | 573.67 / 82.31 / 655.98; 16.8; names on 4, 4, 3 lines (rows 128, 128, 96) | 989.63 / 94.36 / 1083.98; 20.9; names on 3 lines | start spread 0.02 → 0; line counts, row heights and gaps the same |
| By hour (seeds c, g) | 24 | 595.28 / 82.31 / 677.59; 108.7 en-US, 139.8 en-GB | 1011.23 / 94.36 / 1105.59 | no |
| By day (seeds c, g) | 7 | 588.08 / 82.31 / 670.39; 90.8 | 1004.03 / 94.36 / 1098.39 | no |
| Day by day, opening range, daily rows (seeds c, g) | 28, 21 | 588.08 / 82.31 / 670.39; 125.8 en-US, 120.2 en-GB | 1004.03 / 94.36 / 1098.39 | (not compared; width is the full 28%) |

In the C locale, WebKitGTK's views with a four-digit count start 7.21 px further right (4ch count box): 580.88 at 800×600 and 996.83 at 1280×800. Its long-name *By site* has its tightest gap at 12.41 units. Every reading in every engine has a bar-start spread of **0** and a bar-end spread of **0**. No row reaches past its page, and the document never scrolls sideways (`scrollWidth` equals the window width).

### What moved

- **Only one thing moved: the weekly list at 800×600.** Its name column grew to the longest one-line name plus the 12-unit column gap. The bars give way together: they now start 15.58 px later in en-US (12.61 px in en-GB, 8.37 px in the C locale) and end where they did. The bar is 66.73 px long in en-US where it was 82.31, a 19% cut, and 69.70 px in en-GB.
- **Nothing else moved.** At 1280×800, and in every other view at both sizes, bar start, width and end are what N26 read, to the hundredth. The one exception is the 0.01–0.02 px start spread from the grouped *1,234*, which is gone.
- **Wrapping names are unchanged.** Long site names still wrap first (`minmax(min-content, …)` with `overflow-wrap: anywhere`). They keep their line counts, the bar keeps its 28%, and the gap is unchanged.

### Verdict against N28's Done-when

**Met.** At 800×600 and 1280×800, in en-US and en-GB, in Chromium and in WebKitGTK, every Over time view has **no row under the 12-unit gap**. The tightest is 12.00, which is the column gap itself. **Every bar start is within 0.02 px**: the spread is 0.00 in every reading. The C-locale WebKitGTK run agrees as well.

Not seen: the Tauri window over IPC, WebView2 (Windows) and WKWebView (macOS). The flex fallback was seen only by taking the class off in Chromium and WebKitGTK, not in an engine that lacks `subgrid`. In such an engine the weekly overlap would remain as N26 found it (77 and 56).

- **Evidence:**
  - Screenshots in `demo/` (Chromium):
    - `n28-c-daybyday-since2025-{en-US,en-GB}-{800x600,1280x800}.png`, scrolled to the tightest row
    - `n28-c-bysite-default-{en-US,en-GB}-800x600.png`
    - `n28-c-byhour-since2025-{en-US,en-GB}-800x600.png`
    - `n28-d-bysite-default-{en-US,en-GB}-800x600.png`
    - `n28-g-bysite-default-{en-US,en-GB}-{800x600,1280x800}.png`
    - `n28-g-bysite-default-{en-US,en-GB}-800x600-class-off.png` (the before)
  - Screenshots in `demo/` (WebKitGTK): `n28-webkitgtk-{en-US,en-GB,default}-{c-daybyday-since2025,g-bysite-default}-{800x600,1280x800}.png`
  - Measurements:
    - `demo/n28-chromium-en-US.json` and `-en-GB.json` (every row of every state)
    - `demo/n28-chromium-before-after-en-US.json` and `-en-GB.json`
    - `demo/n28-webkitgtk-en-US.json`, `-en-GB.json` and `-default.json` (with the before for the two compared states)
  - Seed: `demo/seed-g.json`
  - Harness: `demo/harness/n28-measure.js`, `n28_table.py`, `n28_before_after.py`, `n28_webkitgtk.py`, plus the `long-names` arm in `core-server-main.rs` and `?seed=g` in `fake-core.js`
- **Feedback:**
  - **design:** at 800×600 the weekly bars are 19% shorter than the bars of every other view in the same window (66.73 against 82.31 px), so switching from *By day* to *Day by day* visibly shortens the scale (`n28-c-daybyday-since2025-en-US-800x600.png`). This is the trade N28 chose (bars give way together), and it is recorded only so the next slice sees it.
  - **design (not new):** a site name that wraps to four lines centres its bar on the row's middle line (row 128 units, bar at the centre), not on the name's first line as *Day by day* does (`n28-g-bysite-default-en-US-800x600.png`). It is identical with the class off, so N28 did not change it.
  - **note (harness):** WebKitGTK's `get_snapshot` needs pycairo's foreign converter, which this computer lacks. The WebKitGTK screenshots are the offscreen window's own pixbuf.
- **Stopped:** the cores on :1474, :1475 and :1479, the Vite on :1477, and the agent-browser sessions `fc28us` and `fc28gb`. Left running, as found: the owner's :1471–:1473.
