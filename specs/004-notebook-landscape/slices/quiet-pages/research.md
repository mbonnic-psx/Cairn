# Research — slice `quiet-pages`

## Q1. Where each piece sits on the spreads

**Decision** (FR-018, FR-031; the owner's answer before the split, spec Clarifications):

| Screen | Left page | Right page |
|---|---|---|
| What Cairn covers | `h2` "What Cairn covers"; the covered lines; `h3` "What it does not cover in this release" and its lines; `h3` "What is kept, and how" and the encryption sentence; the note on administrators under a hairline | blank, ruled |
| This machine is as it was, complete | `h2` "This machine is as it was"; its sentence; the checked lines, when there are any; *Still here* and its lines, when there are any | blank, ruled |
| Almost everything is undone | `h2` "Almost everything is undone"; its sentence; the checked lines, when there are any; `h3` "Still here" and what is left | blank, ruled |

The branches follow today's code exactly: the heading and sentence follow `report.complete`; the checked list renders
when `confirmed` is not empty; *Still here* renders when `residue` is not empty, whatever `complete` says
(`src/screens/Teardown.tsx` as of `b73df5b`). `Disclosures.helper` is not shown today and is not shown here. A complete report that still carries residue is a
shape the interface type allows and the core never sends: the core sets `complete: residue.is_empty()`
(`src-tauri/src/enforcement/teardown.rs:89`). The spread renders it as today's code does, and it raises no question
of honesty (Principle III) because it cannot occur.

**The pages**: each spread is the shell's `.nb-spread` inside the shell's one scrolling page area, `.nb-page` for the
left page and `.nb-page .nb-page--ruled` for the right, exactly as protection-page's `Spread` does
(`src/screens/Protection.tsx`). The slice adds a class of its own to the spread (`.nb-limits-leaves`,
`.nb-teardown-leaves`) for the column gap and the spread's `min-height: 100%`, so the ruled page reaches the foot of
the page area; a left page longer than the page area grows the spread, the page area scrolls (FR-025), and the ruled
page grows with it. The ruling is the shell's one-pitch tile (`notebook.css`, `.nb-page--ruled`,
`background-size: 100% 32px`; protection-page T025), so the seam protection-page's design review met cannot recur.

**Today's `Card`** is not used on a page: the page is the paper, and its entrance animation (`.settle`) does not run
there (D3, FR-023), as on protection-page's spreads.

## Q2. Colour, type and marks on the left page

**Decision**: the slice's stylesheet names no colour and reads only these tokens, each already held at its floor on
every look's paper by `tokens.test.ts`: `--nb-ink` (the heading), `--nb-ink-body` (lines and sentences),
`--nb-ink-quiet` (section labels, the note on administrators, the quiet marks), `--nb-accent-amber` (the mark beside
what is still here), `--nb-rule` (the hairline). Fonts: `--nb-font-serif` everywhere a person reads; the section
labels ("What it does not cover in this release", "What is kept, and how", "Still here") carry the shell's
`.nb-label` (typewriter face, 12px, uppercase, `--nb-ink-quiet`: `notebook.css`), since today they are small
uppercase labels and FR-014 and Principle VI put small labels in that face. They stay `h3`: the outline is today's.

**The marks beside each line** (decorative, `aria-hidden`, as today): today they are palette dots — moss for covered
and checked, sand for not covered, amber for still here. On the paper there is no moss token, and the contract says a
page slice takes colour only from the look tokens. So: covered and checked lines take a solid dot in
`--nb-ink-quiet`; not-covered lines take an open ring in `--nb-ink-quiet`, so "not covered" never reads like
"covered" by shape alone; what is still here takes a solid dot in `--nb-accent-amber` (FR-016: amber, never red; the
gaps review: "amber dots kept"). No new token.

**Alternatives rejected**: the theme's `--color-moss-600` for covered dots (it is re-pointed in every look, but the
precedent's stylesheet test admits only the `--nb-` tokens, and adding a palette name to a page stylesheet would make
the next slice ask the same question); a new `--nb-accent-moss` token (a `notebook.css` edit outside the carried
tasks, which the brief does not allow).

## Q3. One component, words once

**Decision**: each screen calls `useNotebookPage()` once at the top and returns the spread when told, today's `Card`
otherwise (D6; contract, *Knowing it is on a page*). The literal words today's markup carries — the two section
labels of What Cairn covers, and Teardown's two headings and two sentences and *Still here* — move into constants at
the top of each file, read by both branches, so the two layouts cannot drift in words (FR-018). The pin proves the
`Card` output is byte-identical after the move.

## Q4. T020: the sun-overlap guard over every window

**Found** (`src/look/__tests__/tokens.test.ts`, the T016 `describe`): the greeting's band is one typed constant per
height (280px at 800 tall, 200px at 600), and the disc's reach ignores its glow.

**Decision**: inside that same `describe`, model each line of text over the sky as its own band, from the
stylesheet's own values, for both layouts at every height from 600px upwards (the window's minimum,
`tauri.conf.json`; heights swept to 2160 in 20px steps), and check each band's own ink only against what can sit
behind it:

| Text | Ink token | Floor | Band, wide layout (≥1100px) | Band, narrow layout (<1100px) |
|---|---|---|---|---|
| the title bar's name | `--nb-greeting-body` | 4.5 | `.nb-titlebar` top 12 + one 12px line | the same |
| the weekday and time | `--nb-greeting-quiet` | 4.5 | `.nb-root` padding-top 70 + `.nb-aside` padding-top 18, one 12px line | padding-top 44 + 0, one 12px line |
| the greeting's words | `--nb-greeting-ink` | 3 (large) | after the time line and `.nb-greeting` gap 10, two lines of 40px × 1.1 | after gap 4, two lines of 30px × 1.1 |

A 12px line is 18px: neither `.nb-greeting__time` nor `.nb-titlebar__name` sets a line-height and no ancestor in
`notebook.css` does, so they inherit Tailwind's preflight `html { line-height: 1.5 }`
(`node_modules/tailwindcss/preflight.css:30`, Tailwind 4.3.3). Two lines of words is the bound because every greeting
is at most two words and the longest ("evening.") is narrower than the 250px column at 40px (asserted by the test,
not assumed).

The disc's reach: from `--nb-sun-top` × height to that plus `--nb-sun-size`, where text is checked against `--nb-sun`;
and the glow, the `.nb-sun` rule's `box-shadow` blur plus spread (80px + 30px) beyond each edge, where text is checked
against the glow colour (`--nb-sun-glow`, its alpha composited) over the sky stops that can lie behind the greeting
(`--nb-sky-top` and `--nb-sky-mid`: the band ends well above 60% of the height, where `--nb-sky-mid` sits).

**Figures** (computed from `notebook.css` at `b73df5b` with the WCAG formula `src/look/contrast.ts` implements):

- Morning, 600 tall, wide: the disc's top is at 222px and its glow at 112px. The words' band (116–204px) meets the
  glow: `--nb-greeting-ink` on the glow over the sky is 10.13:1 or more. The time line (88–106px) is reached by
  nothing. If it were, `--nb-greeting-quiet` holds 4.54:1 on the glow over `--nb-sky-mid`, but only 3.52:1 on the
  disc itself, which is why per-band checking matters.
- Midday, every height: the disc and glow reach the title bar, the time and the words; the inks hold 6.47, 4.66 and
  9.73:1 on the disc (T016's move).
- Night, 600 tall: the moon's top is at 246px, its glow at 136px; only the words' band is reached, by the glow, where
  `--nb-greeting-ink` holds 6.90:1 over `--nb-sky-mid`. On the moon itself the night inks are 1.05–1.32:1, so a
  `--nb-sun-top` move of about 9 percentage points (night 41% to 32%, observed) turns the sweep red, as it should.

**Expected outcome**: no overlap that breaks a floor, so the test change is the whole fix and `notebook.css` is not
touched for T020. If the sweep finds one, the GREEN moves only `--nb-sun-top` and records it in
`slices/looks/research.md` L1, as T020 says.

## Q5. T022: the hilltop cairn's outline stones

**Found**: the cairn is drawn by `Landscape.tsx`: five stones, outline tone `base` at the top (`.nb-stone--1`,
18×12) and the bottom (`.nb-stone--5`, 74×21), in a column at `left: 10%`, `top: 69%`, gap 4px, centred on the widest
stone (`notebook.css`, `.nb-cairn`). Behind it: the sky gradient and three elliptical hills (`.nb-hill--far` left
−33vw, width 117vw, top 59%, height 65%; `--mid` left 30vw, width 102vw, top 67%, height 65%; `--near` left −44vw,
width 110vw, top 75%, height 70%), painted far, mid, near.

**Decision**: a new test, `src/look/__tests__/hilltopCairn.test.ts`, reads the outline stones' tone from the rendered
`Landscape` (the classes on its first and last stone) and the geometry from `notebook.css`, sweeps windows from
800×600 upwards, samples each outline stone's corners and centre, finds the topmost surface there (near, mid, far,
else the sky), and asserts `--nb-stone-base` holds 3:1 against it in every look. A liveness assertion holds that the
sweep does find the bottom stone on a hill, so the check cannot pass vacuously.

**Figures**: `--nb-stone-base` against morning's hills, far / mid / near: 8.86, 6.29, 3.71; midday's 6.79, 4.96, 3.03;
night's 7.43, 9.45, 11.57; against each look's sky stops: 9.41 or more by day, 5.08 or more at night. Midday's base
stone on the near hill is the low one (3.03:1), as the finding said: above the floor, and now held. **Expected
outcome**: test only; neither `Landscape.tsx` nor `notebook.css` changes for T022.

## Q6. T023: the tab focus ring on all four sides at night

**Found**: every tab's left edge sits on the notebook's right edge (`.nb-tabs` `right: -44px`, items `flex-start`),
so the left side of `outline: 2px solid var(--nb-focus-sky); outline-offset: 2px` lies on the paper. At night
`--nb-focus-sky` (#f6ecdc) is 1.06:1 on the paper (#f1e6d0). No single colour can hold 3:1 against night's paper and
night's sky at once: 3:1 on the paper needs a relative luminance at or below 0.23, 3:1 on `--nb-sky-bottom` needs one
at or above 0.37.

**Decision**: a two-band ring on `.nb-tab:focus-visible` only — the outline stays (2px of `--nb-focus-sky`, offset
2px), and a `box-shadow: 0 0 0 2px var(--nb-ink)` fills the 2px between the tab and the outline. On every side one
band holds 3:1 against what lies under it: the ink band on the paper (12.76:1 at night, 14.05:1 by day), the
`--nb-focus-sky` band on the sky and the hills (9.16:1 or more at night; by day both bands are the same ink, a 4px
ring). The switch keeps its single outline: it sits over the sky alone. In forced colours the box-shadow is dropped
and the outline takes the system colour, as today.

The new test, `src/look/__tests__/tabFocusRing.test.ts`, reads the bands' tokens from the rule itself and asserts,
for each look and each surface a tab's ring can lie on (the paper, the three sky stops, the three hills), that at
least one band holds 3:1, and that the bands are contiguous (the shadow's spread equals the outline's offset).

## Q7. Reaching each state in a demo

**Found**: What Cairn covers is reached from its tab in any state (`tabsFor`; pinned 2026-10-01). In a browser
(`npm run dev`) there is no core, so `App` never receives disclosures and the tab shows nothing. protection-page's
demo fake core (`slices/protection-page/demo/fake-core.js`) answers `get_disclosures` with empty lists.

**Decision**: this slice's `demo/fake-core.js` is that fake with `get_disclosures` answering the core's own words
(`src-tauri/src/ipc/state.rs:845-881`, the background component able to run, so two covered lines). A browser init
script, as before; nothing is written or sent. Teardown cannot be reached in any build (D16); the tests carry it.
