# Implementation Plan: The notebook in the landscape — slice `frame`

**Branch**: `slice/frame` | **Date**: 2026-10-01 | **Spec**: [spec.md](../../spec.md) · [story split](../../story-split.md), row 1

**Input**: Feature specification from `specs/004-notebook-landscape/spec.md`, slice `frame` only.

## Summary

This slice puts the notebook on its landscape, in the morning look, behind a development-only switch. With the
switch on **Current** (the default every time Cairn starts), nothing changes: the app is exactly today's. With
it on **Morning**, the window shows the landscape (sky, three hill layers, a low sun, the five-stone cairn), the
greeting with the weekday and time, the Cairn mark at the top left, and the open notebook. Paper tabs on the
notebook's edge replace the header, offering the same destinations under the same rules. Every existing screen
renders inside the notebook with its content unchanged, still in its current single-column layout. The fonts
(Libre Caslon Text, IBM Plex Mono) ship inside the app. Cairn opens at 1280×800.

The approach: one source of truth for which tabs exist (pulled out of today's header, so both shells obey it),
two shells around the same screen content (`CurrentShell`, today's header and column, and `NotebookShell`), and a
`Look` value held in `App`. The switch exists only where Vite's `import.meta.env.DEV` is true, so a production
build has no switch and always renders `CurrentShell`.

## Technical Context

**Language/Version**: TypeScript 5.6, React 18.3 (the interface). Rust is untouched apart from one window
setting in `src-tauri/tauri.conf.json`.

**Primary Dependencies**: Vite 6.4.3, Tailwind CSS 4, Vitest 3.2.7 with Testing Library. No new package: the
font files are vendored into the source tree with their licence (research R2), so `package.json` and the lock
do not change.

**Storage**: None. The look is held in memory and is not remembered between starts (FR-011).

**Testing**: Vitest + Testing Library (jsdom), the runner the interface records. Fakes written in the test tree
where a seam needs one, and no mocking framework (`AGENTS.md`). `vi.useFakeTimers` drives the greeting's clock,
and `vi.stubEnv('DEV', false)` stands in for a production build (research R3).

**Target Platform**: Tauri 2 desktop webview on Windows, macOS and Linux. Build target `chrome110`.

**Project Type**: Desktop application, interface layer.

**Performance Goals**: The scene is static CSS: no canvas, no animation loop. The greeting re-renders at most
once a minute.

**Constraints**: CSP `font-src 'self'` and no network (Principle II). The smallest window is 800×600 (FR-025,
FR-028). Contrast is at least 4.5:1 (3:1 at 24px and up) for every text pair in the morning look (FR-021).
`prefers-reduced-motion` means nothing moves (FR-023).

**Scale/Scope**: About 6 new interface modules, one extracted function, edits to `App.tsx`, `theme.css`
(`@font-face` and look tokens), and `tauri.conf.json`. Eight existing screens render inside the notebook
unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this slice stands | Verdict |
|---|---|---|
| I. The wall holds | Nothing here reacts to a blocked request. The scene, greeting and tabs live only in Cairn's own window (FR-027). | Pass |
| II. Local-first | The fonts are vendored and served from the bundle (`font-src 'self'`). No new dependency, no network call (FR-015, SC-005). | Pass |
| III. Encryption at rest | No data is touched. | N/A |
| IV. Reversible | No system file is touched. The window size is app configuration. | N/A |
| V. Honest about limits | The greeting shows the true weekday and time and keeps up within a minute (FR-030). "Not confirmed" keeps its amber meaning. | Pass |
| VI. Voice and visuals (v1.5.0) | Serif for headings, lists and reflective text. IBM Plex Mono only for tab names, small labels and buttons, never body text. Warm palette, no lock, shield, chain or alarm-red. The shell holds no reach data (the `check-no-ambient-counts` rule 3). No streak imagery. | Pass |
| VII. Free at the moment of need | The look is not a paid theme and has no entitlement path. | Pass |
| Continuous Integration on Trunk | The slice lands on `main` within a day, hidden behind the development switch (Current by default), as the principle prescribes for a feature larger than a day. | Pass |
| Agent change meets the same bar / tests first | One RED-GREEN-REFACTOR increment per task. All eight guards and every existing test run unchanged (SC-006, SC-009). | Pass |

No violations. Complexity Tracking is empty.

**Post-design re-check (after Phase 1):** still passes. The design adds no IPC command, so `ipc_surface.rs` is
untouched. `App.tsx` keeps every reach-free import it has today. The guards' file lists need no edits.

## Project Structure

### Documentation (this slice)

```text
specs/004-notebook-landscape/
├── spec.md, story-split.md, checklists/      # feature-wide
├── contracts/ui-shell.md                     # the shell contract the page slices build against
└── slices/frame/
    ├── plan.md            # this file
    ├── research.md        # Phase 0
    ├── data-model.md      # Phase 1
    ├── quickstart.md      # Phase 1
    └── tasks.md           # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── App.tsx                      # holds the Look; picks CurrentShell or NotebookShell around the same screens
├── navigation.ts                # NEW: tabsFor(step, protectionOn) — the one rule for which destinations exist
├── look/
│   ├── look.ts                  # NEW: Look type, greetingFor(look), formatWeekdayTime(date, locale)
│   ├── contrast.ts              # NEW: WCAG contrast ratio, used by the token test
│   └── LookSwitch.tsx           # NEW: "Look (testing)", rendered only when import.meta.env.DEV
├── shell/
│   ├── CurrentShell.tsx         # today's header and column, moved out of App.tsx, unchanged in output
│   ├── NotebookShell.tsx        # NEW: Landscape + Greeting + mark + notebook paper + tabs + scrolling page
│   ├── Landscape.tsx            # NEW: sky, hills, sun, cairn; aria-hidden
│   ├── Greeting.tsx             # NEW: greeting words + weekday and time, ticking once a minute
│   └── CairnMark.tsx            # NEW: the five-stone mark as inline SVG
├── assets/fonts/                # NEW: LibreCaslonText-{400,400i,700}.woff2, IBMPlexMono-{400,500}.woff2, OFL.txt
└── styles/
    ├── theme.css                # + @font-face, --font-notebook-serif, --font-notebook-mono
    └── notebook.css             # NEW: [data-look="morning"] tokens, scene and notebook layout, narrow breakpoint

src/screens/__tests__/           # existing tests: unchanged, run against the default Current look
src/shell/__tests__/             # NEW: NotebookShell, Greeting, LookSwitch, navigation tests
src/look/__tests__/              # NEW: look and contrast tests
src-tauri/tauri.conf.json        # width 1280, height 800 (minWidth 800, minHeight 600 unchanged)
```

**Structure Decision**: The slice lives in the `.` deployable (`cairn`, kind `tool`, the TypeScript interface).
`project.json` records two deployables. `src-tauri` is the Rust core, whose purpose is enforcement and storage,
and it is touched only for the window's opening size. Under the accepted strategy (ADR 0002, leave-it), the code
goes where the interface already lives: `src/`, beside `components/` and `screens/`. **Bounded context:** one.
The slice's vocabulary (look, scene, notebook, tab, greeting) is presentation only and means one thing
throughout. It shares no word with the protection or reflection vocabularies of the core, so no context
boundary is drawn.

## Complexity Tracking

None.
