# Quickstart — slice `board-scale`

## Run it

```sh
# from /home/mbonnic/Cairn-worktrees/board-scale; 1420 is the main checkout's own dev server, which shows main's layout
npm run dev -- --port 1455 --strictPort
agent-browser --allowed-domains 127.0.0.1 \
  --init-script specs/004-notebook-landscape/slices/protection-page/demo/fake-core.js \
  open 'http://127.0.0.1:1455/'
agent-browser set viewport 1280 800    # then 1920 1080, 2560 1440, 800 600
```

The sizes below are the window's inner area (the viewport), which `agent-browser set viewport` sets exactly. A maximised
desktop window on a 1920×1080 screen is about 1920×1000 inside, so its notebook is about 1245×850 (s ≈ 1.25), not 918
tall: the same rule, a shorter window.

Choose Morning, Midday or Night on the switch (top of the sky, development builds only). Setup screens use
`slices/setup-pages/demo/` and Tonight/Today `slices/tonight-page/demo/`'s fake cores, as earlier demos did.

## The owner's checks

Each size in morning, midday and night. At every one: nothing clipped, the tabs inside the window, the notebook wider
than it is tall.

1. **1280×800, against the board** (`slices/looks/demo/board-G-Morning.png`). The notebook at the board's place and size
   (830×680, its left edge 350px in, its top 70px down), the greeting hard left (56px in, "Good morning." 40px), the
   sun, hills and cairn where the board has them. Every size inside the notebook as before this slice.
2. **1920×1080: the board, larger.** The notebook about 1245×918, left edge about 525px in; "Good morning." about 60px;
   the writing and the tabs about a third larger (s ≈ 1.35); the sun and stones larger in the same places.
3. **2560×1440: the board, larger still.** The notebook about 1660×1224; "Good morning." about 80px; the writing about
   1.8 times its 1280 size; a page's lines no longer than about 75 characters.
4. **800×600: as before.** The greeting above the notebook, 30px; the notebook 720px wide; nothing changed.

Worth a look too: 1920×800 (the notebook 1020×680, writing at today's size, each page's writing held to its measure),
2560×1080 (an ultrawide: the notebook 1377×918, open sky to its right), 1100×700 (713×584).

## Tests

```sh
npx vitest run src/look src/shell
```

## Not working yet

- On a webview that does not read `clamp()` (WebKit before Safari 13.1, 2020) the sizes inside the notebook would not
  compute. No platform Tauri 2 ships to is known to be that old (research R6, assumed for WebKitGTK).
- The `aspect-ratio` and container-query limits fold-and-width named still hold (its quickstart).
- The greeting has no sentence under "Good morning." as the board does; every word is today's (FR-018).
- Current is unchanged; the notebook stays behind the development switch until `reveal` (D1).
