# Data model — slice `quiet-pages`

No stored data, and no new data from the core.

## On a notebook page

`boolean`, read with `useNotebookPage()` from `src/shell/notebookPage.ts` (protection-page, D6). Unchanged by this
slice: `true` inside `NotebookShell`; `false` inside `CurrentShell` and outside any shell, where each screen renders
today's markup element for element.

## What the two screens read (unchanged)

- `Limits`: `Disclosures` (`src/ipc/index.ts`) — `in_force: string[]`, `not_covered: string[]`, `encryption`,
  `administrator`. `helper` is carried but not shown, today or here. Served by `get_disclosures`; `App` renders the
  screen only once it holds them.
- `Teardown`: `TeardownReport` — `complete: boolean`, `confirmed: string[]`, `residue: string[]`. Not served to the
  interface by any command today; the screen is rendered only by tests (D16).

| `complete` | `confirmed` | `residue` | Heading | Left page holds |
|---|---|---|---|---|
| true | any | empty | This machine is as it was | sentence; checked lines if any |
| false | any | any | Almost everything is undone | sentence; checked lines if any; Still here and its lines if any |
| true | any | not empty | This machine is as it was | as today: sentence, checked lines if any, Still here and its lines |
