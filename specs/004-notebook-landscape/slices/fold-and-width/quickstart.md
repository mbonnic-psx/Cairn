# Quickstart — slice `fold-and-width`

## Run it

```sh
npm run dev -- --port 1420 --strictPort
agent-browser --allowed-domains 127.0.0.1 \
  --init-script specs/004-notebook-landscape/slices/protection-page/demo/fake-core.js \
  open 'http://127.0.0.1:1420/'
```

Choose Morning, Midday or Night on the switch (top of the sky, development builds only). Setup screens use
`specs/004-notebook-landscape/slices/setup-pages/demo/` and Tonight/Today `slices/tonight-page/demo/`'s fake cores,
as earlier demos did.

## What to see

1. **The fold.** A thin warm line down the middle of the notebook, between the two pages, top to bottom, on every
   tab: Protection, What is protected, Today (both views), Tonight, What Cairn covers, and the setup screens. On a
   one-page screen (What Cairn covers, a Protection with no waiting change) it runs down the blank ruled right
   page's left edge. It does not move when the pages scroll. At night it is a little darker, on the lamp-lit paper.
2. **The width.** At 1280×800 the notebook is 830×680, as before. At 1920×1080 it is about 1172×960, at 2560×1440
   1200×983 with the greeting beside it and the group centred. At 800×600 the greeting sits above it as before and
   it is as wide as before. In every case it is wider than it is tall; the tabs sit on its right edge and the
   greeting at its left, as before.

## Tests

```sh
npx vitest run src/look/__tests__/fold.test.ts src/look/__tests__/notebookSize.test.ts \
  src/look/__tests__/tokens.test.ts src/shell/__tests__/NotebookShell.test.tsx
```

## Not working yet

- On macOS 11 or older (WebKit before Safari 15) `aspect-ratio` is not read; the notebook's proportion is not kept
  there, but it keeps a definite height (the window's, less 120px; the room left when narrow), so its pages still
  scroll and nothing on them is out of reach (research R3, assumed). Tauri on this machine and on current systems is unaffected.
- On macOS 11 and 12 running Safari 15.x WebKit, container queries are not read (`aspect-ratio` is), so the tabs
  stay at their small size at every window height, where elsewhere they are large from a notebook 580px tall. They
  stay whole and legible: the small rules shrink and wrap. Only their size is lost.
- Current is unchanged; the notebook stays behind the development switch until `reveal` (D1).
