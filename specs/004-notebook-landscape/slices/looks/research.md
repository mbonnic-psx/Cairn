# Research — slice `looks`

## L1. Where the midday and night colours come from

**Decision**: Start every token from the reference boards `G-Midday` and `G-Night` of the design canvas the spec
cites. Where a canvas pair falls under its floor (FR-021, FR-033), move the token the least distance that meets the
floor, keeping its hue, and record the departure here when it is made.

**Source**: the canvas boards, read from their HTML (`G-Midday.dc.html`, `G-Night.dc.html`, saved 2026-10-01). The
values, by token, with `frame`'s morning token in the same role:

| Token | Midday | Night |
|---|---|---|
| `--nb-sky-top` / `-mid` / `-bottom` | `#f6e6c4` / `#f1d8a4` / `#ecca8a` (0 / 70 / 100%) | `#221c22` / `#3a2b2a` / `#7a4a38` (0 / 55 / 100%) |
| sun or moon | sun `#f5c374`, 84px, high: left 150px, top 60px of 1280×800; glow `#f5c37473` | moon `#f3e6cf`, 56px, left 230px, top 330px; glow `#f3e6cf2e` |
| stars | none | six, `#f3e6cf`, 2–3px, at (90,80) (240,120) (300,64) (40,170) (1220,60) (1250,140) |
| `--nb-hill-far` / `-mid` / `-near` | `#dccb98` / `#c2ad72` / `#93874f` | `#4c3a33` / `#352c27` / `#221d1a` |
| stones base / moss / amber / pale | `#4a3a22` / `#5f6234` / `#a8762f` / `#fbf3df` | `#e6d5b6` / `#c9b48e` / `#efe0c4` / `#d6c19b`, each with glow `#f3e6cf59` |
| `--nb-paper` | `#f8f1e3` | `#f1e6d0` |
| `--nb-rule` | `#e3d6bf` | `#dccdb1` |
| `--nb-ink` / `-body` / `-quiet` | `#2a2119` / `#33291f` / `#6b5a47` | `#2a2119` / `#33291f` / `#6b5a47` |
| `--nb-greeting-ink` / `-body` / `-quiet` | `#2a2119` / `#4a3d2f` / `#6b5440` | `#f6ecdc` / `#d9cbb4` / `#c9b79c` |
| titlebar name | `#4a3d2f` | `#d9cbb4` |
| tabs | `#e7dcc8`, `#dcbf8c`, `#d7b4a2`, `#cfc5b3`; ink `#2a2119` | `#8f8574`, `#8a9478`, `#a68a7c`, `#9a9283`; ink `#1d1915` |
| notebook shadow | edge `#c9b998`, soft `#33291f80` | edge `#8a7860`, soft `#00000099`, lamp glow `#f3c88c40` |

**Departures made** (token, look: old → new, the pair it fixed):

- Midday: none. `#6b5440` on `#ecca8a` measures 4.51:1, over the floor, so the canvas values stand. The canvas shows
  four tab colours and no green; midday's `trail` tab keeps morning's `#b9c4a7`, and the sun sits at 11.7% / 7.5%
  (150 / 60 px of 1280 x 800).
- Night, `--nb-greeting-quiet`: `#c9b79c` -> `#d7c9b5` (lightness only, hue kept). The pair it fixed: quiet greeting
  text on the sky's bottom stop `#7a4a38`, 3.75:1 -> 4.51:1. It now sits a hair under `--nb-greeting-body` (`#d9cbb4`).
- Night, `--color-amber-500` (the theme-palette override, set per look): morning's `#8a6325` -> `#876124`. The pair
  it fixed: amber text on night's lamp-lit paper `#f1e6d0`, 4.36:1 -> 4.51:1.
- Night's `reaches` tab: the canvas shows four tab colours and none is amber, so `#a69070` was chosen at the lightness
  of its neighbours (a gap in the canvas, not a floor move; tab ink `#1d1915` on it passes 4.5:1).
- Night's moon takes the sun's tokens (`--nb-sun-*`: 56px at 18% / 41%, the board's 230 / 330 px of 1280 x 800).

The canvas names tabs by its own sample set (it shows a Settings tab, which does not exist: spec Assumptions).
Map its colours onto the five real tabs in the order the canvas uses them, the current tab taking the paper colour
as in `frame`.

**Already known to need a move** (computed with `src/look/contrast.ts`'s formula): night's `#c9b79c` greeting-quiet
on the night sky's bottom stop `#7a4a38` is under 4.5:1, and midday's `#6b5440` on `#ecca8a` is close to it. The
test, not this table, is the judge; the implementer moves the token and adds the departure to the table above.

**Alternatives**: hand-picking colours (rejected: the owner chose the canvas, SC-008); measuring the greeting only
against the sky stops it overlays (rejected: the greeting moves above the notebook in a narrow window, FR-029, and
`frame` measured all three stops).

## L2. One block of tokens per look

**Decision**: Keep `[data-look="morning"]` as `frame` wrote it, add `[data-look="midday"]` and `[data-look="night"]`
blocks with the same token names, and move what is the same in all three (the bundled `--font-serif`, the
`--nb-font-*` tokens) into one shared `[data-look]` block. The theme's palette overrides (`--color-ink-400` and the
rest) are set per look, since they are measured against each look's paper. The sun's size and place become tokens
(`--nb-sun-size`, `--nb-sun-left`, `--nb-sun-top`) so the scene's layout rules name no look.

**Rationale**: the contract (`contracts/ui-shell.md`, *Look tokens*) promised that this slice re-lights every page
by tokens only. A page slice that reads `--nb-paper` gets each look's paper with no change of its own.

**Consequence for the tests**: `tokens.test.ts` reads a token from a named look's block, and its "keeps every
colour in a token" check strips every look block, not only morning's.

## L3. The moon, the stars and the glow

**Decision**: `Landscape` takes the look. At night it draws the moon (`data-testid="moon"`) where it draws the sun
by day (`data-testid="sun"`), and six stars (`data-testid="star"`). Night's stones and the moon carry a
`box-shadow` glow from tokens. None of it moves.

**Rationale**: FR-001 says "the sun or the moon according to the look", which a test can only tell apart if the DOM
does. The glow is static, so reduced motion (FR-023) asks nothing more of it.

## L4. A change of look is instant

**Decision**: No `transition` or `animation` on anything a look changes. The only transition in `notebook.css`
stays the tab's hover `filter`. A test holds this: no rule but `.nb-tab` declares a transition, and that one
transitions `filter` only.

**Rationale**: D3, US2 scenario 1 ("at once").

## L5. Focus, the switch and the mark on the night sky

**Decision**:
- **Focus.** The tabs' and the switch's focus outline sits over the sky (it is offset from the tab), so it takes a
  new token, `--nb-focus-sky`, that meets 3:1 (WCAG 2.2, 1.4.11 non-text contrast) against every sky stop in each
  look: dark by day, light at night. Focus inside the paper keeps `--nb-ink`, measured against `--nb-paper`.
- **The switch.** `LookSwitch` sits outside the shell, so the shell's `data-look` does not reach it. It sets
  `data-look` to the look it shows on its own root whenever that look is not Current, and `.nb-switch` takes its
  text colour from `--nb-greeting-body`. On Current it renders exactly as it does today.
- **The mark.** `CairnMark` keeps reading `--nb-stone-*`. Its base and top stones are both `--nb-stone-base`, so
  FR-033 is one check per look: `--nb-stone-base` at least 3:1 against every sky stop.

**Rationale**: FR-022 ("a visible focus indicator in every look"), FR-021 for the switch's label, FR-033, D4.
