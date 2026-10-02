# Mutation report: slice `fold-and-width` (interface, Stryker)

Command: `npx stryker run --mutate src/shell/NotebookShell.tsx` (config `stryker.config.json`, vitest runner,
perTest coverage). Done in 2 minutes 4 seconds. Branch `slice/fold-and-width`. Stryker does not mutate CSS, so
`notebook.css` — most of this slice — is held by the stylesheet tests' own teeth (break-and-restore, recorded in
the commits for T002, T003, T006, T012, T013), not by this score.

Tool's own line:

```
All files          |  76.92 |   76.92 |       10 |         0 |          3 |        0 |        0 |
```

## Lines this slice changed

`NotebookShell.tsx:49`, the `aria-hidden` `.nb-fold` span: every mutant on it was killed.

## (a) Meaningful behavioural gaps

- `NotebookShell.tsx:58`, the tab's `className` emptied: no test checked that each tab carries `nb-tab--<id>`,
  the class its paper colour hangs on (frame's line). Killed by a new test, "names every tab by its id"
  (`NotebookShell.test.tsx`), seen failing on the mutant and passing on the tree.

## (b) Equivalent

- `NotebookShell.tsx:32`, `?.id` to `.id`: `tabsFor` always marks one tab current, so the optional chain never
  short-circuits in the app (frame's line).
- `NotebookShell.tsx:34`, `if (pageArea.current)` to `if (true)`: the effect runs after mount, when the ref is
  always set (frame's line).

Score after the follow-up test: 11 of 13 detected, the 2 left equivalent.
