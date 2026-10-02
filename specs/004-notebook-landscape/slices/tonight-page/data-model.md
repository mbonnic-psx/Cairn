# Data model — slice `tonight-page`

No stored data, no new data from the core, no new command.

## On a notebook page

`boolean`, read with `useNotebookPage()` from `src/shell/notebookPage.ts` (protection-page, D6). Unchanged by this
slice: `true` inside `NotebookShell`; `false` inside `CurrentShell` and outside any shell, where each screen renders
today's markup element for element. `Reaches` asks once at its top; `CheckIn` asks once at its top. `useCheckInSession`
does not ask: the session is the same in both layouts.

## What the Today screen reads (unchanged)

- **View** — `'today' | 'over-time'`, `Reaches`' own state, starting on `'today'` (`src/screens/Reaches.tsx:59`).
- **Today view** — `TodaysReaches` (`src/ipc/reaches.ts:27`): `reaches: { domain, at }[]`, `gaps`, `coverage_note:
  string | null`, `sealed: string | null`. From the `today` prop, or `list_todays_reaches` for this local day.
- **Over time view** — `firstDay`, `lastDay` (local dates, `YYYY-MM-DD`; 28 days ending today to start; forgotten on
  leaving the view, H2) and `Answer = Patterns | 'looking' | 'unreadable'`. `Patterns` (`src/ipc/reaches.ts:48`):
  `by_site: { domain, count }[]` (most first), `gaps`, `coverage_note: string | null`, `estimates_excluded: number`,
  `sealed: string | null`. From `summarize_reaches`.

| View | State | Condition | Left page | Right page |
|---|---|---|---|---|
| Today | looking | no `day` yet | Which days, "Looking…" | blank, ruled |
| Today | sealed | `day.sealed` | Which days, "Today", sealed sentence | blank, ruled |
| Today | nothing yet | `reaches` empty | Which days, "Today", coverage note or fallback | "Nothing here for today." |
| Today | a log | `reaches` not empty | Which days, "Today", coverage note or fallback | the log, one reach a line |
| Over time | looking | `'looking'` | Which days, range, From/To, "Looking…" | blank, ruled |
| Over time | could not read | `'unreadable'` | Which days, range, From/To, could-not-read sentence | blank, ruled |
| Over time | sealed | `answer.sealed` | Which days, range, From/To, sealed sentence | blank, ruled |
| Over time | nothing here | `by_site` empty | Which days, range, From/To, coverage note?, estimates line?, counted-only-while-running | "Nothing here for these days." |
| Over time | a list | `by_site` not empty | as above | the sites, one a line, count and bar |

The estimates line reads "Your own estimate for 1 day is not counted here, because an estimate has no site." for one,
and "Your own estimates for N days are not counted here, because an estimate has no site." for more; absent at zero.

## What Tonight reads (unchanged)

- **Session** — `CheckInSession` (`src/screens/CheckIn.tsx:112`), held in `App`: `opened` (the day), `draft`, `note`
  (a refused save), `kept`, `keeping`, `quote` (held per day), `type`, `keep`, `open`.
- **Screen state** — `view: DayView | undefined`, `loadNote`, `quotesShown: boolean | undefined`, `switchNote`.
  `DayView` (`src/ipc/journal.ts:17`): `reaches`, `gaps`, `coverage_note`, `entry`, `estimate`, `sealed`.
- **Derived** — `ended` (the opened day's end has passed), `thisDay` ("today" or the date in words), `note` (the save's
  or load's refusal and the switch's, joined), `draft` (typed, else the saved entry, else empty).

| State | Condition | Left page | Right page |
|---|---|---|---|
| looking | no `view`, no `loadNote` | "Looking…" | blank, ruled |
| could not load | no `view`, `loadNote` | the core's sentence | blank, ruled |
| sealed | `view.sealed` | heading, sealed sentence | quote?, status (the refusal or nothing), switch? |
| open | otherwise | heading, log or "Nothing here for {thisDay}.", coverage note? | quote?, "How the day went" + writing space, "Keep this", status, switch? |

The heading is "Tonight" until the opened day ends, then the date in words ("Wednesday 30 September"). The quote shows
when `quotesShown && quote`; the switch when `quotesShown !== undefined`, reading "Hide quotes" or "Show quotes". The
open day's status reads the joined refusal, else "Kept for {thisDay}." when kept, else nothing; the sealed day's reads the
joined refusal or nothing, never "Kept for …", whatever the session holds (Current's sealed branch reads the same).
