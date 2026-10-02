# Quickstart — slice `protection-page`

## See it

Both spreads need the core and protection on. In a browser alone (`npm run dev`) protection always reads as off,
so the Protection tab opens setup and What is protected has no tab: **neither spread can be seen there** (research
P6).

```sh
npm ci
npm run tauri dev
```

On a machine where Cairn can turn protection on (the privileged helper's install and elevation path is not yet
proven on any platform: `delivery/survey/running.md`):

1. Turn protection on (choose a list, **Turn protection on**, confirm). Cairn opens on Protection, in today's
   interface. The switch, top right, reads **Look (testing)** on **Current**.
2. Choose **Morning**. The Protection page is a spread: on the left the state ("Protection is on" or its
   not-confirmed words), its sentence, **Addresses in force** and **Last checked**; on the right a blank ruled page.
3. Choose the **What is protected** tab. On the left: the heading, the count sentence and the note on taking things
   out. On the right: the list, one address a line, ruled. A long list scrolls inside the notebook.
4. Choose **Midday** and **Night**: the same spreads, re-lit. Shrink the window to 800×600: nothing overlaps, and
   the page scrolls inside the notebook.
5. With a screen reader, list the headings: "Cairn" first, then the page's own heading. The greeting is read as
   text, not as a heading.
6. Choose **Current**: both screens are exactly as before this slice.

## Check it

```sh
npx vitest run src/shell src/screens src/look
npm test && npm run lint && npm run check
npm run build && ! grep -rl "Look (testing)" dist/
```

The tests render every state below in every look, including the ones the running app cannot reach today.

## Not working yet

- **A waiting change on the Protection screen cannot be seen in the running app.** `App.tsx` never asks the core
  for a waiting change and never passes one to the Protection screen, so the note with "Keep things as they are"
  appears only in the tests (`ProtectionPage.test.tsx`, `Waiting.test.tsx`). That is today's behaviour, in Current
  as in the notebook, and this feature does not change what Cairn does (D7).
- **"Not confirmed"** is reachable only by changing Cairn's section of the hosts file by hand, as an administrator,
  after protection is on, and opening Protection before Cairn repairs it (research P6). The tests cover it in every
  look.
- **"Checking this machine…"** and **a read that could not be made** show only for the moment before the core
  answers, or when it cannot answer at all; the tests cover both.
- No real-browser layout check runs in CI (frame T024): the fit at 800×600 is checked by eye in the demo.
