# Quickstart — slice `tonight-page`

## See it

**A browser, with the demo fake core** (`demo/fake-core.js`, loaded before the page, answering the read calls and the
journal's save in the page itself; nothing is written to disk or sent anywhere). With `npm run dev` serving on port
1431:

```sh
npm run dev -- --port 1431 --strictPort &
agent-browser --init-script specs/004-notebook-landscape/slices/tonight-page/demo/fake-core.js \
  open 'http://127.0.0.1:1431/?core=in_force'
```

1. The page opens in today's interface, the switch top right reading **Look (testing)** on **Current**.
2. Choose **Morning**, then the **Today** tab. Left page: the **Today / Over time** buttons, "Today", and the coverage
   note under a rule. Right page: the typed log, one site and its time to a ruled line.
3. Press **Over time**. Focus stays on it. Left page: the range in words, **From** and **To**, the coverage note, the
   estimates line, and "Cairn counts only while it is running…" under a rule. Right page: the sites, one to a line,
   each with a soft bar and its count. Change **From**: the heading follows. (The demo core answers the same sites for
   any range; that the list follows the range is proved by `ReachesPage.test.tsx`, and in the app by what was counted.)
4. Choose the **Tonight** tab. Left page: "Tonight", today's reaches with times, the coverage note. Right page: the
   quote, "How the day went" over a lined writing space, **Keep this**, and **Hide quotes** at the foot. Type two
   lines: each sits on its own rule, and the rules move with the text when it scrolls. Go to **Today** and back: the
   text is still there. Press **Keep this**: "Kept for today." appears under it.
5. Choose **Midday** and **Night**: the same spreads, re-lit, the text still there. Tab through each spread: every
   control shows a dark outline on the paper. At 800×600 nothing overlaps and the pages scroll inside the notebook.
6. Choose **Current**: Today and Tonight are exactly as before this slice, the Tonight text kept (D5).

Other states: `?core=empty` (nothing yet today, nothing over the range), `?core=sealed` (the history cannot be opened),
`?core=unreadable` (Over time could not read the history), `?core=quotes-off` (quotes hidden), `?core=refuse-save`
(the journal's save is refused: the core's sentence shows under "Keep this" and the text stays).

**The application** (`npm ci`, then `npm run tauri dev`): the same steps from the Today and Tonight tabs, with whatever
the machine has counted.

## Check it

```sh
npx vitest run src/shell src/screens src/look
npm test && npm run lint && npm run check
npm run build && ! grep -rl "Look (testing)" dist/
```

## Not working yet

- No real-browser layout check runs in CI (frame T024): the fit at 800×600 and the lines under the text are checked by
  eye in the demo.
- A day that ends while Tonight is open, a load that could not be made, a refused quotes switch and a quotes setting
  that could not be read are proved by the tests in every look; the demo core cannot show them. It shows a refused save
  (`?core=refuse-save`).
