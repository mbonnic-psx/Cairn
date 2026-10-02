# Data model — slice `protection-page`

No stored data, and no new data from the core. One value, held by React.

## On a notebook page

`boolean`, read with `useNotebookPage()` from `src/shell/notebookPage.ts`.

| Where the screen is | Value | Layout |
|---|---|---|
| inside `NotebookShell` (morning, midday, night) | `true` | the spread: `.nb-spread` with two `.nb-page`s |
| inside `CurrentShell` | `false` | today's markup, element for element |
| outside any shell (the existing screen tests) | `false` | today's markup, element for element |

- Set only by `NotebookShell`; nothing else provides it.
- Never a prop, never stored, never read from the clock or the core.

## What the two screens read (unchanged)

- `Protection`: `ProtectionState` (`status`, `entry_count_verified`, `verified_at`), an optional `PendingChange`
  (`id`, `what`, `time_remaining`, `eligible_now`) and `onCancelled`. The words come from `protectionWords`.
- `Trail`: `Trail` (`entries` with `domain` and `auto_www`, `enabled_categories`) and the `ProtectionStatus`.
