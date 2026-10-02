# Data model — slice `setup-pages`

No stored data, no new data from the core, and no new state. The one value read is the context `protection-page`
landed.

## On a notebook page

`boolean`, read with `useNotebookPage()` from `src/shell/notebookPage.ts` (unchanged).

| Where the screen is | Value | Layout |
|---|---|---|
| inside `NotebookShell` (morning, midday, night) | `true` | the spread: `.nb-spread` with two `.nb-page`s |
| inside `CurrentShell` | `false` | today's markup, element for element |
| outside any shell (the existing screen tests) | `false` | today's markup, element for element |

## `Choosing` (new component, no state of its own)

| Prop | From `App` | Today |
|---|---|---|
| `categories: CategoryPreset[]` | `categories` | passed to `Categories` |
| `onToggle(id, on)` | `toggle` | passed to `Categories` |
| `note?: string` | `note` | passed to `Categories` |
| `onTurnOn()` | `() => setStep('disclosure')` | the "Turn protection on" button's `onClick` |

## What the three screens read (unchanged)

- `Categories`: `CategoryPreset` (`id`, `label`, `enabled`, `entry_count`, `edited`), `onToggle`, an optional `note`.
- `CustomEntry`: its own `input`, `added`, `status`, `reason`; the `add` and `check` seams (defaults
  `addCustomEntry`, `getProtectionState`); `onAdded`.
- `Disclosure`: `Disclosures` (`in_force`, `not_covered`, `helper`, `administrator`; `encryption` is not shown),
  given or fetched once with `getDisclosures`; `onConfirm`, `onBack`.
