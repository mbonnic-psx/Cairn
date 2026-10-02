# Research — slice `protection-page`

## P1. How a screen knows it is on a notebook page

**Decision**: A React context created in `src/shell/notebookPage.ts` with the default value `false`.
`NotebookShell` wraps its children in the provider with `true`; `CurrentShell` is not touched and provides
nothing. A screen calls `useNotebookPage()` once, unconditionally, at the top of its component (the rules of hooks),
and branches on the boolean in its return.

**Why**: D6 and the contract (*Knowing it is on a page*): no new props, Current unchanged, one component and one set
of state. A context's default value is what a consumer reads when no provider is above it (React 18.3,
`createContext(defaultValue)`), so the existing screen tests, which render a screen with no shell, and Current
both read `false` with no change to either.

**Alternatives rejected**: a prop (the contract forbids new props from the shell); a second component per screen
(D6, drift in words or behaviour); CSS over today's markup (cannot split one card onto two pages, D6).

## P2. The heading outline (D9, frame T025)

**Decision**: `NotebookShell` renders `<h1 className="sr-only">Cairn</h1>` as the first child of `.nb-root`. The
greeting's words become a `p` with the same class. The title bar's visible "Cairn" gets `aria-hidden="true"`,
because the hidden `h1` now names the window for assistive technology and the name should be heard once (the
existing shell test "is called Cairn once" moves from "one element" to "one element assistive technology reads").

**Source**: `sr-only` is Tailwind CSS 4's visually-hidden utility, already used in this tree
(`src/screens/Setup/CustomEntry.tsx:70`), so it is generated without a new rule.

**Order heard**: "Cairn" (h1), the greeting's time and words (text), the page area with the screen's own `h2`, then
the tabs (`nav`, after `main` in the DOM, unchanged).

## P3. Where each piece sits on the spreads

**Protection (D7)**, today's content only:

| State | Left page | Right page |
|---|---|---|
| no state yet | "Checking this machine…" | blank, ruled |
| the read could not be made | the core's sentence, as today | blank, ruled |
| off | badge, heading, sentence | blank, ruled (or the waiting change, if one is passed) |
| in force / not confirmed | badge, heading, sentence, the two figures | the waiting change with "Keep things as they are", else blank, ruled |

**What is protected (D8)**: left page: heading, count sentence, the not-confirmed note when not confirmed, the note
on taking things out. Right page: the list, ruled, one address a line, with "added with its root address" beside an
address that came with its `www.` companion.

**The pages**: each spread is the shell's `.nb-spread` (two equal columns) inside the shell's one scrolling page
area, with `.nb-page` for each page and `.nb-page--ruled` for a blank right page and for the list's page. The margin
line stays the shell's (`.nb-margin`); the slice adds none. A long list makes the page area scroll (FR-025); the
left page of What is protected stays at the top of the page area while the list scrolls (`position: sticky`), so a
person reading down the list still sees what it is.

**Today's `Card`** is not used on a page: the page is the paper. Its entrance animation (`.settle`) therefore does
not run on a page, which is also what D3 and FR-023 ask of the notebook.

## P4. Standing in for the core in an App-level test

**Decision**: a fake written in the test tree, installed as `window.__TAURI_INTERNALS__ = { invoke }`, answering
the commands App calls on start and on the tab (`get_protection_state`, `get_trail`, `list_categories`,
`get_disclosures`, `cancel_pending_change`) from plain objects, and recording the commands it was asked.

**Source**: `@tauri-apps/api` 2.11.1, `core.js:201-203`: `invoke(cmd, args, options)` returns
`window.__TAURI_INTERNALS__.invoke(cmd, args, options)` and does nothing else. Every IPC function in `src/ipc/` is
a thin call to it (`src/ipc/index.ts:65-124`).

**Why**: `AGENTS.md` asks new tests to stand in at a seam with a fake, never a mocking framework. The existing
App-level tests use `vi.mock`; this slice's new tests do not add to that.

## P5. Colour, type and motion on the spreads

**Decision**: the slice's stylesheet names no colour. Text takes `--nb-ink` (headings, figures, addresses),
`--nb-ink-body` (sentences), `--nb-ink-quiet` (labels, captions) and `--nb-accent-amber` (the not-confirmed note
and the waiting note's edge); lines take `--nb-rule`. Each of these is already proved at its floor on every
look's paper by `src/look/__tests__/tokens.test.ts`. The state badge keeps today's palette classes
(`bg-moss-100 text-moss-600` and its siblings), which the shell re-points inside `[data-look]` and whose pairs the
same test proves on every look. Mono (`--nb-font-mono`) only on the badge, the figures' labels, the list's caption
and the button; everything else is the page's serif. No `animation` or `transition` in the stylesheet.

**Why amber, not a tint**: today's waiting box is an `amber-100` fill. On the paper the note keeps the amber
meaning with an amber edge and leaves its text on the paper, so every text pair on it is one the token test already
proves (FR-016, FR-021). No red anywhere.

## P6. Reaching each state in a demo

**Found**: `App.tsx` never passes `pending` to `Protection` and never calls `getPendingChange`
(`grep -rn "getPendingChange\|pending=" src --include=*.tsx`, outside tests: the definition at `src/ipc/index.ts:120` and nothing that calls it or passes `pending`; the index was not built in
this worktree, so a text search answered). So **a waiting change cannot be seen on the Protection screen in the
running app today**, in any build, whatever the core holds. It is shown only by the tests. Wiring it is a change of
what Cairn does, outside this feature (D7), and is not made here.

**Found**: in a browser alone (`npm run dev`), every IPC call throws (no `window.__TAURI_INTERNALS__`), `App` keeps
`state` undefined, protection reads as off, and the Protection tab opens setup. **Neither spread can be reached in
a browser alone, in any state.** Both need `npm run tauri dev` with protection on.

**Found**: "not confirmed" comes from the core's read-back of the hosts file: anything short of an exact match of
Cairn's section, or a read that fails, while protection is meant to be on
(`src-tauri/src/enforcement/state.rs:44-70`, `src-tauri/src/enforcement/apply.rs:84-101`). A person sees it by
turning protection on in `npm run tauri dev` and then changing Cairn's section of the hosts file by hand (as an
administrator), and opening Protection before the repair restores it. Turning protection on needs the privileged
helper, whose install and elevation path is *not proven* on any platform (`delivery/survey/running.md`).
