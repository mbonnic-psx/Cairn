# Research — slice `tonight-page`

Every statement about the code cites the file it was read from, at `main` 94e9bb9. Contrast figures were computed
with `src/look/contrast.ts`'s formula from the tokens in `src/styles/notebook.css` (lines 17–129).

## T1. The Today screen: where each piece sits, and why the Which days buttons never remount

**Decision** (D21, D22 1–6):

| View, state | Left page | Right page |
|---|---|---|
| Today, a log | Which days; `h2` "Today"; the coverage note (the core's, or the fallback "Cairn counts only while it is running. This is what it saw today.") last, above a rule | the log, ruled, one reach a line: the site, then its time |
| Today, nothing yet | as above | "Nothing here for today." at the top, where the log would begin |
| Today, sealed | Which days; "Today"; the sealed sentence | blank, ruled |
| Today, looking | Which days; "Looking…" (no heading, as today) | blank, ruled |
| Over time, a list | Which days; `h2` the range in words; From and To; the coverage note (when there is one); the estimates line (when any are excluded); "Cairn counts only while it is running. This is what it saw over these days." last, above a rule | the sites, ruled, one a line: the site, a soft bar, the count; or "Nothing here for these days." at the top |
| Over time, looking / could not read / sealed | Which days; the heading; From and To; then "Looking…", "Cairn could not read your history just now. Protection is unaffected." or the sealed sentence | blank, ruled |

The branches are today's (`src/screens/Reaches.tsx:125-167` for Today, `:244-302` for Over time). Today's Current puts
the coverage note under the log; on the page it is the last thing on the left page (D22's reading order, recorded with
its reversal condition).

**Why the buttons must stay mounted.** Today the Which days group is rendered by `Reaches` above whichever view is
shown (`Reaches.tsx:61-76`), so pressing "Over time" keeps the pressed button in the DOM and keyboard focus stays on
it. Each view owns its state (`TodayView`'s day, `OverTimeView`'s range and answer, forgotten on leaving: H2,
`:181`), and each page of the spread needs that state. If each view rendered the whole spread with the group inside
its left page, a change of view would unmount the button the person just pressed and drop focus to the document,
which Current never does (FR-022). Lifting the views' state into `Reaches` would change when Over time asks the core
and whether it forgets its range (H2), which this slice must not change (FR-018).

So on a page `Reaches` renders the spread itself — `<div class="nb-spread nb-reaches-leaves">` — with the Which days
group as its first child, and the view after it, returning a fragment of its two pages. React keeps the group (same
element type at the same position) and swaps only the view. The slice's stylesheet places the three grid children:
the group in column 1, row 1; the left `.nb-page` in column 1, row 2; the ruled `.nb-page` in column 2 across both
rows (`grid-template-rows: auto 1fr`, `min-height: 100%`, so the ruled page reaches the foot of the page area). The
group is not a `.nb-page`: it is the top of the left column, and the contract's spread classes are used, never
restyled. Proved by a test that presses "Over time" and "Today" with `user-event` on a page and finds focus still on
the pressed button.

**Alternatives rejected**: a view-local spread (focus lost on every switch); state lifted into `Reaches` (changes
fetching and H2); React portals into slots (refs are null on the first render, so every view would render twice and
the first paint would be empty).

**No sticky page.** What is protected keeps its left leaf sticky (`protection-page.css`, `.nb-trail-sticky`). Here the
left column is two grid items, and the right page is the long one; a long log or site list grows the spread and the
page area scrolls (FR-025). The Which days buttons scroll with it.

## T2. The Over time list and its bars

**Decision**: one site a line on the 32px ruling: the site, a soft bar, the count, in that DOM order, the bar between
them as today's markup places it after the name and count pair. The bar keeps `data-testid="bar"`, its width as today
(`Math.round((count / largest) * 100)%`, `Reaches.tsx:290`) and `aria-hidden` on its track. Colour from tokens only:
the track `--nb-rule`, the fill `--nb-ink-quiet` (5.88:1 on morning's and midday's paper, 5.34:1 on night's, above the
3:1 graphics floor). The count is a small label in the typewriter face, `--nb-ink-quiet`. Warm in every look (FR-016),
no moss token on the paper (the contract's token list has none; quiet-pages research Q2 rejected palette names in a
page stylesheet for the same reason).

## T3. Tonight: where each piece sits, and the status sentence

**Decision** (D23):

| State | Left page | Right page (ruled) |
|---|---|---|
| Looking | "Looking…" | blank |
| A load that could not be made | the core's sentence | blank |
| Open day | `h2` "Tonight" or the date once the day has ended; the log or "Nothing here for {today / the date}."; the coverage note when there is one | the quote (when shown); "How the day went" and the writing space; "Keep this"; the status sentence; the quotes switch (when the setting is known) at the foot |
| Sealed day | the heading; the sealed sentence | the quote (when shown); the status sentence; the quotes switch (when known) |

The branches are today's (`src/screens/CheckIn.tsx:346-434`): the quote only when `quotesShown && quote`; the switch
only when `quotesShown` is known; "Kept for {today / the date}." only when `kept`; a refused save's and a refused
switch's sentences joined as today (`:277-278`). "Keep this" is disabled while keeping or while the space shows
nothing (`showsNothing`, `:415`).

**The status sentence**: D23 says it "stays one polite live region in every state". Today it exists on the open and
the sealed day (`:363-369`, `:424-430`) and not while loading, where a failed load's sentence is a plain paragraph
(`:346-351`). Reading: on a page, each state that has the region today has exactly one, in the same place on the right
page (open and sealed); the loading state gains none, so nothing is announced that Current does not announce. Adding a
region to the loading state would change what a screen reader hears, which FR-018 keeps as today. This reading keeps
every MUST and is not a product question.

**The session is untouched.** `useCheckInSession` (`CheckIn.tsx:143-214`) is held in `App` (`src/App.tsx:46`) and
passed down (`:145`), so the text survives a change of tab (FR-019, US1 scenario 5) and a change of look between
morning, midday and night (FR-010). A move to or from Current keeps the Tonight text (D5). The page branch reads the
same `draft`, `type`, `keep` and `open` values; no state is added.

## T4. The lined writing space (D24)

**Decision**: the writing space is a `textarea` on the right page, in the serif, 18px, with `line-height: 32px` — the
page's ruling pitch (`notebook.css:366-376`, `background-size: 100% 32px`). Its own lines are a
`repeating-linear-gradient` in `--nb-rule` with the same 32px pitch, `background-attachment: local`, so the lines
scroll with the text inside the box and each line of text sits on its own rule; its ground is `--nb-paper`, so the
page's ruling does not show through beside its own. Its padding-top is set so the first baseline sits on the first
line (the test reads the pitch and the line height from the sheet and asserts they are equal). Edge: 1px
`--nb-ink-quiet` (5.88:1 / 5.34:1, above D15's 3:1). Focus: `outline: 2px solid var(--nb-ink)` with a 2px offset
(14.05:1 / 12.76:1), replacing today's `focus:border-clay-500 focus:outline-none` on the page only (`CheckIn.tsx:404`;
`#a5735f` is 3.25:1 on night's paper, looks T021). Under `forced-colors: active` the lines are dropped
(`background-image: none`) and the edge and text take system colours. No `transition`. `min-height` kept generous, as
today's `min-h-48`, in rem or lines, never a fixed height that would clip (FR-025).

## T5. Controls on the paper: edges, focus, no fades (D15, D22 7; looks T021, T024)

**Decision**: on a page, no control is today's `Button` (`src/components/Button.tsx:20` carries `transition-colors
duration-200`) and no spread is today's `Card` (its `.settle` entrance). Plain `<button>`s with slice classes, as
setup-pages did (its research S2):

- **Which days** (both views): small labels in the typewriter face. The pressed one is marked by a 1.5px `--nb-ink`
  underline or edge (14.05:1 / 12.76:1) and `--nb-ink` words; the other by `--nb-ink-quiet` words and no mark.
  `aria-pressed` and `role="group"` `aria-label="Which days"` are today's.
- **From and To**: the labels "From" and "To" in the typewriter face; the boxes on a transparent ground with a 1px
  `--nb-ink-quiet` edge and `--nb-ink-body` text; `min`, `max` and the change rules are today's (`Reaches.tsx:202-207`).
- **Keep this**: filled from `--nb-button` with `--nb-button-ink`, as setup-pages' "Turn protection on"; disabled, its
  words and edge at `--nb-ink-quiet` on the paper.
- **Hide quotes / Show quotes**: a quiet text button in the typewriter face, `--nb-ink-quiet`, `--nb-ink` on hover.
- **Every control** above and the writing space: `:focus-visible { outline: 2px solid var(--nb-ink); outline-offset:
  2px }`, held at 3:1 on every look's paper; no on-page element carries `focus:outline-none` or `focus:border-clay-500`.
- **Nothing fades**: no on-page element carries `transition`, `duration-`, `animate-` or `settle`, and the slice's sheet
  declares no `transition`, `animation` or `@keyframes`. A change of look leaves each element the same DOM node.

The bound sweep (setup-pages T013/T014 precedent, `src/look/__tests__/setupPagesControls.test.tsx`): render both
spreads in every state that has controls, tab through them, and name every focusable element found, so a control added
later with no rule fails it.

## T6. The pin and its seams

**Decision**: `Reaches` is pinned through its props: `today` (a `TodaysReaches`) for the Today view's states, `read` (a
plain object implementing `ReachesReader`, a fake in the test tree) and `now` for looking and Over time. `CheckIn` is
pinned through the IPC fake (`installFakeCore`), answering `get_day`, `get_quotes_shown` and `get_quote`, and
`save_journal_entry` for kept and refused saves; `never` for looking. Time: `process.env.TZ = 'Europe/London'` as the
existing Reaches tests set it, and every time in the literal markup interpolated from the same
`toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })` the screens call, so the pin does not depend on the
runner's locale. The ended day uses Vitest's fake timers (`vi.useFakeTimers({ toFake: ['Date', 'setTimeout',
'clearTimeout'] })`) to move past the opened day's end, as `CheckInToday.test.tsx` moves the clock; that is not a
mocking framework and no module is replaced. The states shared by the pin and the page tests live in
`tonightCases.ts`, as protection-page's `pinCases.ts` and quiet-pages' `quietCases.ts`.

## T7. The stylesheet and the contract

**Decision**: `src/styles/tonight-page.css`, imported once from `src/main.tsx` after the other page sheets. Every
selector starts with `.nb-reaches-` or `.nb-checkin-`, apart from the shell's published classes it is scoped under
(`.nb-reaches-leaves > .nb-page`). Colours only from `--nb-paper`, `--nb-ink`, `--nb-ink-body`, `--nb-ink-quiet`,
`--nb-rule`, `--nb-accent-amber`, `--nb-button`, `--nb-button-ink`; fonts from `--nb-font-serif` and `--nb-font-mono`.
The contract's prefix list gains one sentence: "`tonight-page` uses `.nb-reaches-` and `.nb-checkin-`." Nothing else
in the contract changes.

## T8. App-level proof

**Decision**: `AppTonightPage.test.tsx` renders `App` with `devBuild`, chooses a look through the switch, and stands in
for the core with `installFakeCore` answering every command `App` asks on start (as `AppLimitsPage.test.tsx` does) plus
the reaches and journal commands. It proves: the Today tab opens the Today spread and "Over time" switches the view
inside the notebook; the Tonight tab opens the Tonight spread; text typed in the writing space survives a trip to
another tab and back, and a change between two looks (FR-019, FR-010); the heading list is "Cairn" then the page's own
`h2` (D9); Current renders today's markup (equal to a render outside any shell); no command is asked that the screens
did not ask before.
