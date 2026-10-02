# Implementation Plan: The notebook in the landscape — slice `looks`

**Branch**: `slice/looks` | **Date**: 2026-10-02 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 2

**Input**: Feature specification from `specs/004-notebook-landscape/spec.md`, slice `looks` only (US2; FR-009–FR-013b,
FR-016, FR-021, FR-023, FR-033).

## Summary

`frame` built the notebook in its morning look behind a two-way development switch (Current, Morning). This slice
adds the other two looks, **midday** and **night**, and gives the switch its four choices: Current, Morning,
Midday, Night (FR-011). Choosing a look re-lights the sky, the hills, the sun or the moon, the cairn, the
greeting, the tabs and the notebook together and at once, with no transition (D3), and keeps the screen and the
text typed on it (FR-010). Night adds a moon in place of the sun, a few stars, light moonlit stones with a soft
glow, and a lamp-lit notebook. The greeting follows the look: "Good morning.", "Midday.", "Good evening."
(FR-013b). Every text pair meets its contrast floor in every look (FR-021, SC-003), the mark's base and top stones
meet 3:1 against every sky (FR-033), and focus stays visible on the night sky (FR-022). A released build is
unchanged: no switch, today's interface (FR-012).

The approach: the `Look` type grows to four values; `NotebookShell` takes the look and puts it on its root as
`data-look`; every colour, and the sun's place and size, is a token in one block per look in `notebook.css`. The
`Landscape` takes the look so it can draw the moon and stars at night. The contrast test runs once per look. No
new module, no new dependency.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3 (the interface). Rust is untouched.

**Primary Dependencies**: Vite 6.4.3, Tailwind CSS 4, Vitest 3.2.7 with Testing Library. No new package.

**Storage**: None. The look is held in memory and starts on Current every time (FR-011, unchanged from `frame`).

**Testing**: Vitest + Testing Library (jsdom). Fakes written in the test tree where a seam needs one, no mocking
framework (`AGENTS.md`). The token test reads `notebook.css` from disk, as `frame`'s does (frame research R6).

**Target Platform**: Tauri 2 desktop webview on Windows, macOS and Linux.

**Project Type**: Desktop application, interface layer.

**Performance Goals**: The scene stays static CSS. Night's stars are a handful of fixed elements, no animation.

**Constraints**: No network (Principle II). Contrast at least 4.5:1, 3:1 for text 24px and up and for the mark's
outline stones, in every look (FR-021, FR-033). No transition between looks (D3) and nothing moves under reduced
motion (FR-023). Warm palette, no alarm-red (FR-016).

**Scale/Scope**: Edits to `look.ts`, `LookSwitch.tsx`, `Greeting.tsx`, `Landscape.tsx`, `NotebookShell.tsx`,
`App.tsx` (one line), `notebook.css` (two token blocks, the moon and stars, the focus and switch rules), and the
tests beside them. The contract `contracts/ui-shell.md` gains the new tokens.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing here reacts to a blocked request. The looks live only in Cairn's own window (FR-027). | Pass |
| II. Local-first | No new dependency, no font or image fetched. Every look is CSS tokens (FR-015, SC-005). | Pass |
| III. Encryption at rest | No data is touched. | N/A |
| IV. Reversible | No system file is touched. | N/A |
| V. Honest about limits | The greeting keeps showing the true time; the words follow the look, never the clock (FR-013, FR-013b). "Not confirmed" and "waiting" keep their amber meaning in every look (FR-016). | Pass |
| VI. Voice and visuals (v1.5.0) | Warm palette in all three looks, night included; no red, no lock, shield or chain. Serif and mono keep the roles `frame` gave them. Night's stars are scenery, not a count, a chain or a badge (FR-008). The shell still holds no reach data. | Pass |
| VII. Free at the moment of need | The looks are not a paid theme. | Pass |
| Continuous Integration on Trunk | Lands on `main` behind the development switch; Current stays the default (FR-011, FR-032). | Pass |
| Agent change meets the same bar / tests first | One RED-GREEN-REFACTOR increment per rule. All eight guards and every existing test run unchanged (SC-006, SC-009). | Pass |

No violations. Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** still passes. No IPC command added, so `ipc_surface.rs` is untouched;
`App.tsx` gains no import from `ipc/reaches`.

## Project Structure

### Documentation (this slice)

```text
specs/004-notebook-landscape/
├── spec.md, story-split.md, decisions.md      # feature-wide
├── contracts/ui-shell.md                      # extended here: the look tokens of midday and night
└── slices/looks/
    ├── plan.md            # this file
    ├── research.md        # Phase 0
    ├── data-model.md      # Phase 1
    ├── quickstart.md      # Phase 1
    └── tasks.md           # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── App.tsx                      # Shell = look === 'current' ? CurrentShell : NotebookShell, passing look
├── look/
│   ├── look.ts                  # Look = 'current' | 'morning' | 'midday' | 'night'; greetingFor covers all three
│   └── LookSwitch.tsx           # four choices; carries data-look of the look on screen so its text is lit with it
├── shell/
│   ├── NotebookShell.tsx        # takes look; data-look={look}; passes look to Landscape and Greeting
│   ├── Landscape.tsx            # takes look; sun by day, moon and stars at night; aria-hidden as before
│   └── Greeting.tsx             # takes look; greetingFor(look)
└── styles/
    └── notebook.css             # one token block per look; shared [data-look] block; moon, stars, glow; focus tokens

src/look/__tests__/tokens.test.ts   # contrast per look, the mark, focus on the sky, no transition between looks
src/look/__tests__/look.test.ts     # greetingFor for all three looks
src/shell/__tests__/*.test.tsx      # switch choices, shell per look, landscape per look, App round trips
```

**Structure Decision**: The slice lives in the `.` deployable (`cairn`, kind `tool`, the TypeScript interface),
exactly where `frame` put the shell: `src/look/`, `src/shell/`, `src/styles/notebook.css`. `src-tauri` (enforcement
and storage) is not touched. Under the accepted strategy (ADR 0002, leave-it) the code stays in the interface's
existing home. **Bounded context:** one. Look, scene, sky, moon and greeting are presentation words that mean one
thing throughout and share nothing with the core's protection or reflection vocabularies.

**Pin**: no behaviour that existed before the method changes. The code this slice edits was written by `frame`
under the method, and its tests are the pin; the one line in `App.tsx` it changes (which shell renders) is
`frame`'s, covered by `src/shell/__tests__/AppLook.test.tsx`. `delivery/survey/pinned.md` needs no row.

## Complexity Tracking

None.
