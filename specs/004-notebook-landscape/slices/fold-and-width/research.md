# Research — slice `fold-and-width`

**R1 — Where the gap between the leaves sits.** `.nb-page-area` is the only child that holds a spread, with
`padding: 40px 48px 36px 60px` (`notebook.css`), and `28px 32px 28px 52px` under `max-width: 1099px`. Every spread
is a two-column grid of equal columns (`grid-template-columns: 1fr 1fr`) with a single `column-gap` (48px in
`protection-page.css:14`, `quiet-pages.css:15`, `setup-pages.css:21`, `tonight-page.css:20`). For a content box of
width C starting at the left padding L, the gap's centre is L + C/2 = L + (W − L − R)/2 = W/2 + (L − R)/2: 6px right
of centre beside the greeting, 10px under it. With a classic (non-overlay) scrollbar showing in the page area, the
content box loses the scrollbar's width on its right, and the gap's centre moves left by half of it (about 7–8px on
WebView2): the fold still lies inside the 48px gap. Read from the sheets on 2026-10-02.

**R2 — Sizing with `aspect-ratio` in a grid.** CSS Box Sizing 4 §5.1 and CSS Grid 1 §6.2: a grid item with a
preferred aspect ratio and `justify-self: normal` behaves as `start`, not `stretch`, so the notebook needs an
explicit `width: 100%`. With a definite width and `height: auto`, the height is the width over the ratio, then
`min-height`/`max-height` clamp it (the ratio gives way, the width does not). An `aspect-ratio` box with
`min-height: auto` and `overflow: visible` takes its content's height as its minimum (Box Sizing 4 §5.3), which
would grow the notebook to the page area's content; an explicit `min-height` (480px beside the greeting, 0 under it)
prevents that. The percentage `height: 100%` on `.nb-page-area` resolves against the ratio-derived height, which is
definite (Box Sizing 4 §5.1). Read from the specifications at w3.org on 2026-10-02; proved in Chromium at the demo.

**R3 — Webview support.** `aspect-ratio`: Chromium 88, Safari/WebKit 15. `min()`/`max()` in `grid-template-columns`
track sizes: Chromium 79, Safari 11.1. WebView2 is evergreen Chromium; Tauri 2 requires macOS 10.15+ (WKWebView
follows the OS Safari: 15+ on macOS 12+) and WebKitGTK 2.40+ on Linux. *Assumed* for macOS 10.15/11 with Safari 14
or older: `aspect-ratio` is ignored there and the notebook falls back to `max-height` with height auto — content
height. Said in quickstart under Not working yet; the owner's demo is on this machine's Chromium.

**R4 — The fold's contrast.** `#e3d6bf` on `#f8f1e3` is 1.28:1; `#dccdb1` on `#f1e6d0` is 1.27:1; the ruled lines
(`--nb-rule`, morning `#ebe0cb`) are 1.16:1. Computed with `src/look/contrast.ts`'s formula. D34: held at ≥ 1.2:1.
