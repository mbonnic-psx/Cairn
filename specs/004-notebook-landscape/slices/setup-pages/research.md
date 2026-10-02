# Research — slice `setup-pages`

## S1. Where the choosing step's composition goes (D13, contract "A step of more than one screen")

**Decision**: a new component, `Choosing`, in `src/screens/Setup/Choosing.tsx`, taking exactly what the inline block
uses today: `categories`, `onToggle`, `note` and `onTurnOn` (what "Turn protection on" does, which `App` passes as
`() => setStep('disclosure')`). `App` renders `{step === 'choosing' && <Choosing … />}` in place of today's fragment.
`Choosing` calls `useNotebookPage()` once. Not told, it returns today's fragment, element for element:
`<Categories …/>`, `<CustomEntry />`, then `<div className="flex justify-end"><Button …>Turn protection on</Button></div>`.
Told, it returns the spread (S3).

**Why**: the contract says the step's composition moves out of `App` into one component beside the setup screens,
and that the two screens inside it keep their own components and state. A React fragment adds no element, so moving
the same three children into a component's fragment leaves Current's DOM byte-identical (the Pin proves it through
`App`, not by reasoning).

**State**: unchanged. `categories` and `note` stay in `App` (they survive a walk round the tabs today and must
still); `CustomEntry` keeps its own `input`, `added`, `status` and `reason`. Between morning, midday and night the
notebook shell stays mounted, so `CustomEntry`'s typed address is kept (FR-010). A move to or from Current swaps the
shell and may empty the box, which D5 allows until the reveal.

**Alternatives rejected**: the spread laid out in `App` (the contract moves it out); one merged setup component (the
contract keeps the two screens' own components and state); the "Turn protection on" button moved into `CustomEntry`
(it is the step's way forward, not the address box's).

## S2. Categories and CustomEntry on a page (D6)

**Decision**: each screen calls `useNotebookPage()` once, at the top, before any other branch. On a page it returns a
`section` carrying its own words with the slice's classes, and never today's `Card`: the page is the paper, and
`Card`'s `.settle` entrance must not run in the notebook (D3, FR-023). Off a page it returns today's `Card` markup,
untouched.

**Categories on a page** (left page): `h2` "What would you like to protect?", the sentence, a single-column list of
the categories (the page is about 337px wide at 1280×800, too narrow for today's two columns), each a `label`
wrapping a checkbox, the category's name (serif) and its count with "· edited by you" when edited (a small label,
typewriter face, FR-014), then the note, when there is one. The checkbox keeps today's `checked` and `onChange`
(`onToggle(category.id, event.target.checked)`), so `SetupUntick.test.tsx`'s rules hold on a page too.

**CustomEntry on a page** (right page): `h2` "Anywhere else?", the sentence, the form (the visually hidden label
"Address to protect", the box with its `example.com` placeholder, "Protect it", disabled while the box is empty),
then the sentence after an address is added, or the reason it could not be taken, with `role="status"` as today. The
same `submit`, `verifiedStatus`, `addedSentence` and `reasonFrom`; the only branch is the returned markup. The box's
`id="address"` stays, so the label still names it.

**Buttons on a page**: plain `<button>` elements carrying the slice's classes, not `Button`. `Button` always adds
`transition-colors duration-200` and the clay and sand palette fills (`src/components/Button.tsx:13-20`), which the
shell does not re-point and which would fade (looks T024). `Button` itself is not edited, because Current renders it
(SC-009).

## S3. Where each piece sits on the spreads

**The choosing step (D13)**:

| Left page | Right page |
|---|---|
| What would you like to protect?, its sentence, the categories, the note a change leaves (when there is one) | Anywhere else?, its sentence, the address box and "Protect it", what comes back; "Turn protection on" at the foot |

**Before Cairn changes anything (D14)**:

| Details | Left page | Right page |
|---|---|---|
| there | the heading, the opening paragraph, what Cairn will change (`in_force`), the background component's paragraph (`helper`) | What this does not cover (`not_covered`), the note on administrators (`administrator`); "Yes, set this up" and "Not yet" at the foot |
| loading, or could not be read | the heading and the opening paragraph | only "Yes, set this up" and "Not yet", at the foot |

`encryption` is not shown today and is not shown here (FR-018: nothing invented).

**The pages**: each spread is the shell's `.nb-spread` (two equal columns) inside the shell's one scrolling page
area, with `.nb-page` for each page. A page holding controls is not ruled: FR-031 rules a *blank* right page, and
neither right page here is ever blank (the choosing step always has the address box; the disclosure always has its
two buttons). The margin line stays the shell's (`.nb-margin`); the slice adds none. The spread is at least as tall
as the page area (`min-height: 100%`, as `protection-page`'s leaves are), and the right page is a column whose last
item, the foot, takes the remaining height (`margin-top: auto`), so the way forward sits at the foot of the right
page where the eye ends (D13, D14).

**"The same place" (D14)**: the buttons are the last item of the right page in both states, at its foot. Where the
whole spread fits the page area (1280×800 with today's disclosure lines), the foot is the foot of the page area in
both states, so the buttons do not move when the details arrive. Where the left page is longer than the page area
(800×600 with the details), the spread grows, the page area scrolls (FR-025), and the buttons stay at the foot of
the right page, after the limits, which is the order D14 asks for. That is checked by eye in the demo, since no
browser runner is in the tree (frame T024).

**What the page slices share**: the 22px start of the shell's ruling (`src/styles/notebook.css`) is not needed here,
since no page in this slice is ruled.

## S4. Colour, type, edges, focus and motion on the spreads

**Colour**: the slice's stylesheet names no colour. Text takes `--nb-ink` (headings, a category's name, the typed
address), `--nb-ink-body` (sentences, the disclosure's lines), `--nb-ink-quiet` (a category's count, the note a change
leaves, the placeholder, the note on administrators) and `--nb-accent-amber` (a reason an address could not be
taken, FR-016); lines take `--nb-rule`. The sentence after an address is added is moss today (`text-moss-600`); on a
page it reads `--color-moss-600`, which the shell re-points inside `[data-look]` to a value `tokens.test.ts` already
proves at 4.5:1 on every look's paper (its palette sweep reads every `text-*` class the screens use). The
disclosure's two bullet dots are decoration (`aria-hidden`): the in-force dot `--color-moss-600`, the not-covered dot
`--nb-ink-quiet`.

**Buttons**: "Turn protection on" and "Yes, set this up" are filled from `--nb-button` with `--nb-button-ink` words
(the contract's primary button; `tokens.test.ts` holds that pair at 4.5:1 in every look). "Protect it" is drawn in
ink: an `--nb-ink` edge and words, no fill, so the step's one filled button is its way forward. "Not yet" is quiet:
`--nb-ink-quiet` words, no edge. Disabled "Protect it" keeps its words at `--nb-ink-quiet` (FR-021 asks 4.5:1 of all
text) with an `--nb-ink-quiet` edge and `cursor: not-allowed`. Every button is set in the typewriter face (FR-014).

**Control edges (D15)**: the address box has a 1px `--nb-ink-quiet` edge on a transparent ground (the paper). Each
checkbox is drawn by the stylesheet (`appearance: none`): an 18px box with a 1.5px `--nb-ink-quiet` edge; checked, it
fills with `--nb-ink` and shows a tick drawn in `--nb-paper` by its `::after`. `--nb-ink-quiet` against `--nb-paper`
is held at 4.5:1 in every look as text, so its edge clears 3:1; the slice's own test computes the ratio per look from
`notebook.css` so a later token change cannot slip under 3:1 unseen. A native checkbox's edge is drawn by the
webview in a colour no token sets, so nothing could hold it to 3:1; that is why it is drawn.

**Focus (looks T021)**: every control on the two spreads (each checkbox, the address box, "Protect it", "Turn
protection on", "Yes, set this up", "Not yet") has a `:focus-visible` rule drawing `outline: 2px solid var(--nb-ink)`
with a 2px offset. `--nb-ink` on `--nb-paper` is at least 3:1 in every look (`tokens.test.ts`, "focus inside the paper
keeps --nb-ink"). The address box on a page no longer carries today's `focus:border-clay-500 focus:outline-none`
(clay-500 is 3.25:1 on night's paper and held by nothing). The vacuous assertion in `tokens.test.ts` (a filter over
`.nb-page … :focus-visible` rules, of which none exists in `notebook.css`) is removed; the slice's own test asserts
the real rules. `CheckIn.tsx:410` carries the same clay focus and belongs to `tonight-page` (D10).

**Motion (looks T024)**: nothing on these spreads declares `transition`, `animation` or `@keyframes`, in the slice's
stylesheet or as a Tailwind class (`transition-*`, `duration-*`, `animate-*`, `settle`) on any element the on-page
branches render. A rendered test sweeps every element of each spread in every state. Today, Categories' label
(`transition-colors duration-200`, `Categories.tsx:33`) and `Button` (`Button.tsx:20`) carry fades; on a page neither
is rendered. Protection's "Keep things as they are" still renders `Button` on its spread (`Protection.tsx`), whose
colours are the same in every look, so no look change fades it; that is `protection-page`'s screen, not swept here,
and noted for its owner.

**Type**: headings, sentences, the categories' names, the disclosure's lines and the typed address in the page's
serif. The typewriter face (`--nb-font-mono`) only on a category's count, every button, and nothing else. "What
this does not cover" is a heading (`h3`), so it is serif (FR-014), at a small size, not today's uppercase label.

**Hover**: on-page controls take their hover colours from the look tokens only. A category's row has no hover fill
(today's `hover:bg-sand-100` is a palette fill no look re-points).

## S5. Standing in for the core in tests

**Decision**: `installFakeCore` from `src/screens/__tests__/fakeCore.ts` (written by `protection-page`), which sets
`window.__TAURI_INTERNALS__ = { invoke }` and answers each command from a plain function, recording the calls.

**Source**: `@tauri-apps/api` 2.11.1, `core.js:201-203`: `invoke(cmd, args, options)` returns
`window.__TAURI_INTERNALS__.invoke(cmd, args, options)`. Every IPC function in `src/ipc/index.ts` is a thin call to
it (`:65-124`).

**Commands this slice's tests answer**: `get_protection_state` (`off`), `list_categories`, `get_disclosures`,
`set_category_enabled` (`null`, or a pending change), `add_custom_entry` (the stored forms, or a rejection),
`turn_protection_on`, `get_trail` (after turning on). `CustomEntry`'s `add` and `check` props, and `Disclosure`'s
`disclosures` prop, already exist and are used where a test renders a screen alone.

## S6. Reaching each state in a demo

**Found**: in a browser alone (`npm run dev`), every IPC call throws (no `window.__TAURI_INTERNALS__`): `App` keeps
`state` undefined and opens on choosing, with no categories (`list_categories` threw) and no disclosure details. So
the choosing spread and the disclosure's "not there" state are reachable in a plain browser, but empty of
categories, and an address cannot be added (the reason "Cairn could not add that just now. Nothing has changed."
comes back, which is itself a state worth seeing).

**Decision**: a demo fake core, `slices/setup-pages/demo/fake-core.js`, loaded as a browser init script before the
page (as `protection-page`'s is), answering in the page itself: protection off; the nine categories with counts,
some on, one edited; the disclosures with today's lines from `src-tauri/src/ipc/state.rs` (`disclosures`);
`add_custom_entry` returning the address and its `www.` form, or the localhost reason for `localhost`;
`set_category_enabled` returning `null`, or with `?wait=1` a pending change when a category is turned off (so
the note a waiting change leaves shows on the left page); `turn_protection_on` answering protection in force. Flags:
`?details=none` (the disclosure without its details), `?readback=in_force|not_verified` (what an added address
reads back as; off by default). Nothing is written or sent. It is named by nothing in `src`, `index.html` or the
Vite config, so it is not in the build.

**Out of reach in any browser**: the disclosure's details while they are still loading (they arrive at once from
the fake); the tests carry it, and it renders the same as `?details=none`.
