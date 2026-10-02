# Data model — slice `fold-and-width`

Nothing is stored or exchanged. One new look token, `--nb-fold`, in each of the three look blocks of
`src/styles/notebook.css`:

| Look | `--nb-paper` | `--nb-fold` | Contrast |
|---|---|---|---|
| morning | `#f8f1e3` | `#e3d6bf` | 1.28:1 |
| midday | `#f8f1e3` | `#e3d6bf` | 1.28:1 |
| night | `#f1e6d0` | `#dccdb1` | 1.27:1 |

The notebook's size is a function of the window (FR-035, D36), with W the window width and H its height:

- beside the greeting (W ≥ 1100): room = W − 156 − 250 − 44; width = min(room, 1200, max(830, (H − 120) × 830/680)); height = min(H − 120, width × 680/830), at least 480
- under the greeting (W < 1100): width = W − 80; height = min(the row left under the greeting, width × 680/830)

| Window | Notebook |
|---|---|
| 1280×800 | 830×680 |
| 1100×600 | 650×480 |
| 1920×800 | 830×680 |
| 1920×1080 | ≈1172×960 |
| 2560×1440 | 1200×983 |
| 1280×1400 | 830×680 (was 830×1280) |
| 800×600 | 720 wide, the row's height (≤ 590) |
