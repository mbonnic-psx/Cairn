# Data model — slice `frame`

Nothing is stored. These are the in-memory values the interface works with.

## Look

| Field | Values | Notes |
|---|---|---|
| `look` | `'current' \| 'morning'` | `'midday'` and `'night'` join in slice `looks`. |

- Held in `App` state. It starts at `'current'` every time Cairn starts, and is never persisted (FR-011).
- In a production build (`import.meta.env.DEV === false`) it is always `'current'`, and nothing can change it
  (FR-012).
- Changing it re-renders the shell only. The screen, the step and any typed text (the check-in session lives in
  `App`) are untouched (FR-010).

## Tab

| Field | Type | Notes |
|---|---|---|
| `id` | `'protection' \| 'trail' \| 'reaches' \| 'checkin' \| 'limits'` | Destination. |
| `label` | string | The words today's header uses: "Protection", the trail title, "Today", "Tonight", "What Cairn covers". |
| `current` | boolean | True for the destination now showing (FR-005). |

Rules (from `tabsFor(step, protectionOn)`, research R7):

- `protection` is always present. It is current for steps `choosing`, `disclosure` and `protected`.
- `trail` and `reaches` are present only when protection is on.
- `checkin` and `limits` are always present.
- No tab exists for a destination with no screen (FR-004).

## Greeting

| Field | Derived from | Notes |
|---|---|---|
| `words` | `look` | morning → "Good morning." |
| `when` | the clock, locale-formatted | e.g. "Thursday 07:48" or "Thursday 7:48 AM". It ticks within a minute (FR-030). |

The greeting never reads or shows reach data, counts or streaks (FR-006, FR-008).
