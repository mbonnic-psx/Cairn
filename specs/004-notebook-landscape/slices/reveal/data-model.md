# Data model — slice `reveal`

No stored data changes. Nothing is written to configuration, the encrypted stores or anywhere else; no IPC shape changes.

One interface type narrows:

| Type | Before | After | Where |
|---|---|---|---|
| `Look` | `'current' \| 'morning' \| 'midday' \| 'night'` | `'morning' \| 'midday' \| 'night'` | `src/look/look.ts` |
| `NotebookLook` | `Exclude<Look, 'current'>` | removed; `Look` is the same set (research R7) | `src/look/look.ts` |

`App` holds the look as component state: `'morning'` when Cairn starts, changed only by the development switch, never
read from the clock (FR-013) and never remembered (D44). Outside a development build it is always `'morning'`.

State transitions (development build only): any look to any other, at the switch, at once; the screen, its step and any
text typed on it are kept (US2 scenario 1). A released build has no transition.
