# Data model — slice `looks`

No stored data. One value, held in memory by `App`.

## Look

`'current' | 'morning' | 'midday' | 'night'` (`src/look/look.ts`).

| Value | Shell | Greeting words | Sky | Light |
|---|---|---|---|---|
| `current` | `CurrentShell`, today's interface | none | none | none |
| `morning` | `NotebookShell`, `data-look="morning"` | Good morning. | peach | low sun |
| `midday` | `NotebookShell`, `data-look="midday"` | Midday. | golden | high sun |
| `night` | `NotebookShell`, `data-look="night"` | Good evening. | dark, starry | moon, glowing stones, lamp-lit notebook |

- Starts on `current` every time Cairn starts; never stored (FR-011).
- Outside a development build it is always `current` (FR-012).
- Changes only when a person chooses at the switch; nothing reads the clock to choose it (FR-013).
- Changing it keeps the current step and the check-in's unsaved text, which `App` holds whichever shell renders
  (FR-010).

## Look tokens

The set every look block defines, each with the same name in all three: see `contracts/ui-shell.md`, *Look tokens*,
and research L1 and L5 for the values.
