# Quickstart — slice `protection-page`

## See it

Both spreads need the core and protection on. In a browser alone (`npm run dev`) there is no core, so protection
reads as off, the Protection tab opens setup and What is protected has no tab. Two ways in:

**A browser, with the demo fake core** (`demo/fake-core.js`, loaded before the page, answering the read calls from
the page itself; nothing is written or sent). With `npm run dev` serving, for example, on port 1431:

```sh
agent-browser --init-script specs/004-notebook-landscape/slices/protection-page/demo/fake-core.js \
  open 'http://127.0.0.1:1431/?core=in_force&list=long'
```

- `?core=in_force` protection on and checked, a short list (four addresses).
- `?core=in_force&list=long` the same with 120 addresses, one of them very long.
- `?core=not_verified` protection on, not confirmed just now.

Choose a look on **Look (testing)**, then the Protection tab and **What is protected** (**What you chose** when not
confirmed). A waiting change cannot be shown this way (research P6). "Checking this machine…" and "a read that could
not be made" cannot be reached through the app at all: `App` renders Protection only once it holds a state, so the
tests carry them.

**The application:**

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

The tests render every state below in every look (`describe.each` over morning, midday and night in `ProtectionPage.test.tsx` and `TrailPage.test.tsx`), including the ones the running app cannot reach today.

## Not working yet

- **A waiting change on the Protection screen cannot be seen in the running app.** `App.tsx` never asks the core
  for a waiting change and never passes one to the Protection screen, so the note with "Keep things as they are"
  appears only in the tests (`ProtectionPage.test.tsx`, `Waiting.test.tsx`). That is today's behaviour, in Current
  as in the notebook, and this feature does not change what Cairn does (D7).
- **"Not confirmed"** is reachable in a browser through the demo fake core (`?core=not_verified`). In the application it is reachable only by changing Cairn's
  section of the hosts file by hand, as an administrator, after protection is on, and opening Protection before Cairn repairs it (research P6). The tests cover it in every
  look.
- **"Checking this machine…"** and **a read that could not be made** cannot be reached through the app at all:
  `App` renders Protection only once it holds a state. The tests cover both, in every look.
- No real-browser layout check runs in CI (frame T024): the fit at 800×600 is checked by eye in the demo.
