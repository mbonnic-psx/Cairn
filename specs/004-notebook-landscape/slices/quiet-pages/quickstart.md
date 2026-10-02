# Quickstart — slice `quiet-pages`

## See it

**A browser, with the demo fake core** (`demo/fake-core.js`, loaded before the page, answering the read calls from
the page itself with the core's own words; nothing is written or sent). With `npm run dev` serving on port 1431:

```sh
npm run dev -- --port 1431 --strictPort &
agent-browser --init-script specs/004-notebook-landscape/slices/quiet-pages/demo/fake-core.js \
  open 'http://127.0.0.1:1431/?core=in_force'
```

1. The page opens in today's interface, the switch top right reading **Look (testing)** on **Current**.
2. Choose **Morning**, then the **What Cairn covers** tab. Left page: the heading, the two lines Cairn covers, *What it
   does not cover in this release* with its two lines, *What is kept, and how* with its sentence, and the note on
   administrators under a hairline. Right page: blank and ruled.
3. Choose **Midday** and **Night**: the same spread, re-lit. At 800×600 nothing overlaps and the left page scrolls
   inside the notebook.
4. Tab to the notebook's tabs at **Night**: the focused tab's ring shows on all four sides, including the side on the
   paper.
5. Choose **Current**: What Cairn covers is exactly as before this slice.

`?core=off` works as well: What Cairn covers has a tab in every state.

**The application** (`npm ci`, then `npm run tauri dev`): the same steps from the What Cairn covers tab.

## Check it

```sh
npx vitest run src/shell src/screens src/look
npm test && npm run lint && npm run check
npm run build && ! grep -rl "Look (testing)" dist/
```

`TeardownPage.test.tsx` renders This machine is as it was inside the notebook in morning, midday and night, in both
outcomes (D16).

## Not working yet

- **This machine is as it was cannot be seen in the app.** Nothing in the app opens it until teardown is wired in
  (spec Assumptions, D16); its spread is proved by the tests in every look and both outcomes.
- No real-browser layout check runs in CI (frame T024): the fit at 800×600 is checked by eye in the demo.
