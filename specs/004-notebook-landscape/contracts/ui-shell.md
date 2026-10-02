# Contract — the notebook shell

What the page slices (`protection-page`, `tonight-page`, `setup-pages`, `quiet-pages`) build against. Settled by
slice `frame`, extended by slice `looks` (more `Look` values and tokens), by `protection-page` (knowing it is on a
page, headings), by `fold-and-width` (the fold), by `board-scale` (the scale length, the measure) and by `reveal`
(one shell, every screen only a spread), and by nothing else.

## Navigation

- `tabsFor(step, protectionOn, status?): Tab[]` in `src/navigation.ts` is the only place that decides which destinations
  exist and which one is current. The optional `status` (a `ProtectionStatus`) decides only the trail tab's
  label. A page slice never adds, removes or reorders a tab.
- The tab column belongs to the shell and is bounded by the notebook's height: a tab that cannot fit its label on
  one line shrinks and wraps it, so every tab stays whole and reachable down to an 800x600 window.
- Tab accessible names are exactly today's header labels. The existing tests find them by role `button` and name.

## The page area

- `NotebookShell` renders the current screen's element inside one scrolling page area spanning the spread. A
  screen receives no new props from the shell.
- A page slice that lays a screen out as two pages does so inside that screen's own component, using the shell's
  spread classes:
  - `.nb-spread`: a grid of two equal columns;
  - `.nb-page`: one page;
  - `.nb-page--ruled`: a page with rule lines.

  The margin line is the shell's, drawn once as a single `.nb-margin` element inside the notebook; it does not
  scroll with the page. A page slice never adds a `.nb-margin` of its own.

  The fold is the shell's too: drawn once as a single `.nb-fold` element inside the notebook, on the centre of the gap
  between the leaves, and it does not scroll. It is centred only if the pages keep to this: a page slice never adds a
  fold of its own, never gives a spread unequal columns or any horizontal padding or margin, and never restyles
  `.nb-page-area`, whose padding is the shell's.

  The notebook is a size container (`container-type: size`); the tab column queries it. A page that queries a
  container sets and names its own, and nothing on a page is fixed to the window (`position: fixed` is placed by the
  notebook).

  A screen whose content fits one page leaves the right page as `.nb-page--ruled` and empty (FR-031).

## Every screen is a page

Added by `protection-page` (D6) as "Knowing it is on a page"; rewritten by `reveal` (D42). `CurrentShell` and the
"on a notebook page" signal (`NotebookPageContext`, `useNotebookPage`) are gone.

- Every screen renders only its spread, wherever it is rendered: inside `NotebookShell`, or alone, as a screen test
  renders it. A screen reads nothing to decide its layout, and has one layout.
- One component, one set of state and handlers per screen. A page slice never copies a screen into a second component.
- A page slice's own styles live in a stylesheet of its own under `src/styles/`, imported once from `src/main.tsx`.
  Every selector in it starts with one prefix per screen, `.nb-<screen>-` (`protection-page` uses `.nb-protection-`
  and `.nb-trail-`), so two page slices never edit or override each other's rules. The spread classes above stay
  the shell's; a page slice uses them and never restyles them.

## A step of more than one screen

Added before `setup-pages` and `quiet-pages` (D13). The choosing step shows two screens and a button. Its composition
moves out of `App` into one component beside the setup screens, which `App` renders in its place, and it lays
the step out as one spread. The two screens inside it keep their own components and state.

Prefixes, one per screen: `setup-pages` uses `.nb-choosing-`, `.nb-categories-`, `.nb-custom-` and `.nb-disclosure-`;
`quiet-pages` uses `.nb-limits-` and `.nb-teardown-`; `tonight-page` uses `.nb-reaches-` (the Today screen, both views)
and `.nb-checkin-` (Tonight).

## Size

Added by `board-scale` (FR-036, D39). The notebook grows with the window, and everything inside it grows by one factor,
so a page's writing, controls and spacing keep their proportions at any size.

- **The rule.** A page sheet writes every length that lays out its page as `calc(N * var(--nb-u))`, N being the length
  in px at 1280×800, or 0. Lines and rings, which are `border*`, `outline*` and `box-shadow`, keep their px, so a
  1px line stays 1px. A length written in rem is a length that would not grow, and a page sheet has none. A font size
  is written the same way, and an em then follows it. A page markup carries no Tailwind size utility (`w-`, `h-`,
  `p-`, `gap-`, `leading-`, `text-sm` and the like) inside the page area, which would not grow either.
- **Why viewport units.** `--nb-u` is written in viewport units, not container units, because a page's own container
  (the trail leaf is one) would resolve a container unit against itself and not against the notebook. Where the
  window is below 1280 wide or 800 tall, `--nb-u` is 1px, so a page is exactly today's size there, and at the narrow
  layout.
- **The measure.** The shell holds a page's text column to a measure of 383 × s (`calc(383 * var(--nb-u))`), set as
  `max-inline-size` on the leaf's children (`.nb-page-area .nb-spread > .nb-page > *`) in windows 1100px wide and up.
  The leaf keeps its full width, so its ruling runs to the edge and the fold stays on the gap. A page slice never sets
  its own measure on the leaf or the spread, and the narrow layout takes none. A leaf child that paints the paper to
  hide a rule of the page is not capped: its page sheet lifts the measure for it (`max-inline-size: none`, at the
  measure's weight or more), so no stub of that rule shows past it.
- **What the shell owns.** The notebook's place and size, `--nb-u` and `--nb-g` are the shell's. A page sheet reads
  `--nb-u` and never redefines it.

## Headings

Added by `protection-page` (D9, frame T025). The notebook supplies one `h1`, "Cairn", visually hidden and read by
assistive technology. The greeting is not a heading. A screen's own heading is the next heading in the outline.

## Look tokens

Every page reads colour and type only from CSS custom properties set on the shell's root, `[data-look]`. What is the same in every look (the fonts) lives in one shared `[data-look]` block. Each look
(`morning`, `midday`, `night`) defines every other token below under the same name, so a page that reads a token is lit
by every look with no change of its own:

| Token | Meaning |
|---|---|
| `--nb-paper` | the page colour |
| `--nb-ink` | headings and strong text |
| `--nb-ink-body` | body text |
| `--nb-ink-quiet` | labels, captions, times |
| `--nb-rule` | rule lines and dividers |
| `--nb-margin` | the margin line |
| `--nb-fold` | the fold between the pages |
| `--nb-accent-amber` | waiting and not confirmed (text) |
| `--nb-button` | the primary button's fill, with `--nb-button-ink` |
| `--nb-font-serif` | headings, lists, reflective text; the same in every look, set once in the shared `[data-look]` block |
| `--nb-font-mono` | tab names, small labels, buttons only; shared, as above |
| `--nb-u` | the notebook's scale, a length: `clamp(1px, min(100vw / 1280, 100vh / 800), 2px)`, written once in the shared `[data-look]` block. It is the shared length page sheets size by: everything inside the notebook, the sun and the stones are N × this |
| `--nb-g` | the shell's own greeting factor, `max(1px, 100vw / 1280)`: the greeting's words, time and gap grow by it. Not for page sheets |
| `--nb-sun-size`, `--nb-sun-left`, `--nb-sun-top` | the sun's diameter and place, per look |
| `--nb-stone-glow` | the glow around the cairn's stones; set by night alone (`looks`) |
| `--nb-lamp-glow` | the lamp's glow on the notebook; set by night alone (`looks`) |
| `--nb-focus-sky` | the focus outline of anything drawn over the sky (tabs, the switch); added by `looks` |

No screen colours its text with the theme's palette classes (`text-ink-*`, `text-amber-*`, `text-moss-*`); the
contrast test holds that none does. The one palette value a page sheet reads, `--color-moss-600` (`setup-pages.css`),
is re-pointed inside each `[data-look]` to a darker warm value, and the contrast test checks it against `--nb-paper`.

A page slice never hard-codes a colour. That way, slice `looks` can re-light every page by changing tokens only,
and the contrast test (research R6) covers every page by covering the tokens.

## What never changes

- The shell holds no reach data, imports nothing from `ipc/reaches`, and shows no count, badge or streak
  (the `check-no-ambient-counts` rule 3, FR-008).
- `NotebookShell` takes the look (`'morning' | 'midday' | 'night'`, the whole of `Look`) and sets it as `data-look` on
  its root; the screens it wraps still receive no new props. It is the only shell (FR-032).
