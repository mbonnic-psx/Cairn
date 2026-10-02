# Data model — slice `board-scale`

Nothing is stored or exchanged. Two lengths join the shared `[data-look]` block of `src/styles/notebook.css`:

| Length | Value | Meaning |
|---|---|---|
| `--nb-u` | `clamp(1px, min(100vw / 1280, 100vh / 800), 2px)` | D39's s, in px: everything inside the notebook, the sun and the stones |
| `--nb-g` | `max(1px, 100vw / 1280)` | the greeting's growth with the window's width |

The scene, beside the greeting (W ≥ 1100), W×H the window:

- notebook: left 350/1280 W, top 70/800 H; width min(830/1280 W, 1.275 H); height min(0.85 H, width × 680/830)
- greeting: left 56/1280 W, top 88/800 H, column 250/1280 W; words 40·g px, time 12·g px, gap 10·g px, g = max(1, W/1280)
- inside: s = clamp(1, min(W/1280, H/800), 2); text column ≤ 383·s px
- tabs: 44·s px past the notebook's right edge

| Window | Notebook | s | Greeting words | Leaf / column cap |
|---|---|---|---|---|
| 1280×800 | 830×680 at (350, 70) | 1 | 40px | 337 / 383 |
| 1920×1080 | 1245×918 at (525, 94.5) | 1.35 | 60px | 517.2 / 517.0 |
| 2560×1440 | 1660×1224 at (700, 126) | 1.8 | 80px | 689.6 / 689.3 |
| 2560×1080 | 1377×918 | 1.35 | 80px | 583 / 517 |
| 1920×800 | 1020×680 | 1 | 60px | 432 / 383 |
| 1100×700 | 713×584 | 1 | 40px | 278 / 383 |
| 1280×1024 | 830×680 | 1 | 40px | 337 / 383 |
| 3840×2160 | 2490×1836 | 2 | 120px | 1089 / 766 |
| 800×600 | narrow, as before: 720 wide | 1 | 30px | as before, no cap |
