# Contract — the notebook shell

What the page slices (`protection-page`, `tonight-page`, `setup-pages`, `quiet-pages`) build against. Settled by
slice `frame`, extended by slice `looks` (more `Look` values and tokens) and by nothing else.

## Navigation

- `tabsFor(step, protectionOn): Tab[]` in `src/navigation.ts` is the only place that decides which destinations
  exist and which one is current. A page slice never adds, removes or reorders a tab.
- Tab accessible names are exactly today's header labels. The existing tests find them by role `button` and name.

## The page area

- `NotebookShell` renders the current screen's element inside one scrolling page area spanning the spread. A
  screen receives no new props from the shell.
- A page slice that lays a screen out as two pages does so inside that screen's own component, using the shell's
  spread classes:
  - `.nb-spread`: a two-column grid matching the notebook's fold;
  - `.nb-page`: one page;
  - `.nb-page--ruled`: a page with rule lines;
  - `.nb-margin`: the left margin line.
  A screen whose content fits one page leaves the right page as `.nb-page--ruled` and empty (FR-031).

## Look tokens

Every page reads colour and type only from CSS custom properties set on the shell's root, `[data-look]`:

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
| `--nb-font-serif` | headings, lists, reflective text |
| `--nb-font-mono` | tab names, small labels, buttons only |

A page slice never hard-codes a colour. That way, slice `looks` can re-light every page by changing tokens only,
and the contrast test (research R6) covers every page by covering the tokens.

## What never changes

- The shell holds no reach data, imports nothing from `ipc/reaches`, and shows no count, badge or streak
  (the `check-no-ambient-counts` rule 3, FR-008).
- With `look === 'current'` the shell is `CurrentShell`, whose output is today's interface byte for byte (SC-009).
