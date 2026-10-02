# Research — slice `board-scale`

**R1 — D39's factor in window terms.** With W, H the window: notebook width w = min(830/1280·W, 1.275·H), height
h = min(0.85·H, w·680/830) (D38). Then w/830 = min(W/1280, H/651) and h/680 = min(H/800, w/830). So
min(w/830, h/680) = min(W/1280, H/651, H/800) = min(W/1280, H/800), and s = clamp(1, min(W/1280, H/800), 2). Where
W < 1280 or H < 800, s = 1. Under 1100px wide (the narrow layout) W/1280 < 0.86, so s = 1: the narrow layout is
untouched by construction. Arithmetic, held by the model in `notebookSize.test.ts` over the 20px window grid.

**R2 — Why viewport units and not container units.** `.nb-notebook` is a size container (fold-and-width T008), but
`.nb-trail-leaves` is one too (`protection-page.css:27-30`). An unregistered custom property is substituted where it
is used (CSS Variables 1 §3), so a `cqw` in `--nb-u` would resolve against the nearest container of the element using
it — the trail leaf, inside What is protected — not the notebook. Registering it (`@property`) would fix that but needs
Safari 16.4 (MDN browser-compat-data `css/at-rules/property`, read 2026-10-02). `vw`/`vh` resolve the same everywhere
and R1 shows they give the same factor. Viewport units: every engine Tauri targets (CSS Values 3, universal).

**R3 — The greeting's growth.** FR-036: "Good morning." 40px at 1280×800, about 60px at 1920×1080: 40 × 1920/1280 = 60,
so it follows the width, as does its column (250/1280 W). It is floored at today's size, so between 1100 and 1280 wide
it stays 40px in a column of 215–250px; "morning." at 40px is about 170px wide (measured on the 1280×800 board image,
x 56→226), so it fits. At 2560×1080 (an ultrawide) it is 80px, two lines and the time line ending about 450px down,
above the far hill's top at 59% of 1080 = 637px.

**R4 — D38's width limit.** D38 option (c): "never wider than 1.5 times its height". Its worked numbers (2560×1080 →
1377×918; only windows past about 1.97:1 meet the limit) are 1.5 × 0.85·H = 1.275·H. 0.648·W > 1.275·H ⇔ W/H > 1.967. ✓

**R5 — The tabs at scale.** The tab column's sizes all grow by s. The large-tab rule fires at a notebook 580px tall
(`@container (min-height: 580px)`); where s > 1, h ≥ 680·s (s ≤ h/680 by definition), so the scaled large column,
which fits a 580px notebook at s = 1 (fold-and-width pass 2: ends at 640 of 652 at 1160×800), fits h at s. The threshold
cannot take `var()` (container query conditions do not read custom properties), and need not. Held by the tab model in
`notebookSize.test.ts`, scaled. The tabs' right edge is the notebook's right (0.9219 W) plus 44·s ≤ 0.9219 W + 0.0344 W:
always inside the window.

**R6 — Webview support.** `clamp()`: Chrome 79, Safari 13.1 (MDN browser-compat-data `css/types/clamp.json`, read
2026-10-02); `min()`/`max()`: Chrome 79, Safari 11.1 (fold-and-width R3). Viewport units in `calc()` inside a custom
property: universal. WebView2 is evergreen Chromium (Tauri docs, *Webview versions*, read 2026-10-02); WKWebView follows
the macOS Safari; Tauri states no WebKitGTK minimum ("very hard to compile accurate information", same page).
*Assumed*: every WebKitGTK a supported distribution ships is past Safari 13.1's WebKit (2020). Where `clamp()` were not
read, `--nb-u` would be invalid at use and every `calc(N * var(--nb-u))` invalid at computed-value time, falling back to
the property's initial value — a broken page, not a smaller one; said in quickstart under Not working yet.

**R7 — The measure.** Today's leaf at 1280×800: (830 − 60 − 48 − 48)/2 = 337px. × 75/66 = 383 (D39). At 1920×1080 the
leaf is (1245 − 156·1.35)/2 = 517.2 and the cap 517.0 (bites by 0.2px); at 2560×1080 583 vs 517; at 1920×800 (s = 1)
432 vs 383; at 3840×2160 (s = 2, capped) 1089 vs 766. The cap is on the leaf's children, not the leaf, so the leaf's
ruling and the fold stay where they are.
