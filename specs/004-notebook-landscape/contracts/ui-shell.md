# Contract — the notebook shell

What the page slices (`protection-page`, `tonight-page`, `setup-pages`, `quiet-pages`) build against. Settled by
slice `frame`, extended by slice `looks` (more `Look` values and tokens) and by nothing else.

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
  - `.nb-spread`: a grid of two equal columns (the notebook draws no fold);
  - `.nb-page`: one page;
  - `.nb-page--ruled`: a page with rule lines.

  The margin line is the shell's, drawn once as a single `.nb-margin` element inside the notebook; it does not
  scroll with the page. A page slice never adds a `.nb-margin` of its own.
  A screen whose content fits one page leaves the right page as `.nb-page--ruled` and empty (FR-031).

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
| `--nb-accent-amber` | waiting and not confirmed (text) |
| `--nb-button` | the primary button's fill, with `--nb-button-ink` |
| `--nb-font-serif` | headings, lists, reflective text; the same in every look, set once in the shared `[data-look]` block |
| `--nb-font-mono` | tab names, small labels, buttons only; shared, as above |
| `--nb-sun-size`, `--nb-sun-left`, `--nb-sun-top` | the sun's diameter and place, per look |
| `--nb-stone-glow` | the glow around the cairn's stones; set by night alone (`looks`) |
| `--nb-lamp-glow` | the lamp's glow on the notebook; set by night alone (`looks`) |
| `--nb-focus-sky` | the focus outline of anything drawn over the sky (tabs, the switch); added by `looks` |

Screens that still colour their text with the theme's palette (`text-ink-*`, `text-amber-*`, `text-moss-*`) are
covered too: inside `[data-look]` the shell re-points those palette properties to darker warm values, and the
contrast test checks every text colour the screens use against `--nb-paper`.

A page slice never hard-codes a colour. That way, slice `looks` can re-light every page by changing tokens only,
and the contrast test (research R6) covers every page by covering the tokens.

## What never changes

- The shell holds no reach data, imports nothing from `ipc/reaches`, and shows no count, badge or streak
  (the `check-no-ambient-counts` rule 3, FR-008).
- `NotebookShell` takes the look (`'morning' | 'midday' | 'night'`) and sets it as `data-look` on its root; the
  screens it wraps still receive no new props.
- With `look === 'current'` the shell is `CurrentShell`, whose output is today's interface byte for byte (SC-009).
