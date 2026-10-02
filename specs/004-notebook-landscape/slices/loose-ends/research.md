# Research: slice `loose-ends`

Each entry: decision, rationale, alternatives, and the artefact a stated fact was read from.

## R1 — How the released interface is built and searched (SC-002, D29)

- **Decision:** The test spawns the installed Vite CLI as a child process — `process.execPath
  node_modules/vite/bin/vite.js build --outDir <scratch> --emptyOutDir --logLevel silent` — with `NODE_ENV`
  **removed** from the child's environment, which is how `npm run build` (`tsc --noEmit && vite build`) runs in a
  release. It then reads every file under the scratch directory and searches for: the label `Look (testing)` (also
  the select's accessible name, since the label wraps it), and each of the switch's four choice names as a quoted
  string literal (`"Current"`, `"Morning"`, `"Midday"`, `"Night"`, in any of `"`, `'`, `` ` ``). The words are read
  from `src/look/LookSwitch.tsx` itself (its `<span>` label and its `CHOICES` names), so a renamed switch is still
  searched for; the test fails if it reads fewer than five. For teeth, the same build with `NODE_ENV=development`
  must contain every one of them. The scratch directory is `~/.cache/cairn-scratch/sc002-<pid>-<prod|dev>`
  (`os.homedir()`, so it resolves on Windows CI too), removed afterwards.
- **Rationale and evidence (runs on this tree, 2026-10-02, Vite 6.4.3):**
  - `NODE_ENV` unset or `production`: label 0, each quoted choice 0.
  - `NODE_ENV=development` or `test`: label 1, each quoted choice 1.
  - Vitest runs with `NODE_ENV=test`, so a build made **in-process** inside the test would carry the switch and
    the test would fail on a correct tree. That is why the build is a child process with `NODE_ENV` removed.
  - `vite build --mode development` without `NODE_ENV` still drops the switch (`import.meta.env.DEV` follows
    `NODE_ENV`, not `--mode`), so `--mode` is not the teeth lever.
  - Each build took about 1.3 s.
- **What is legitimately present and is not searched for:** `"Midday."` (the midday greeting, `look.ts`), the
  word `Current` inside identifiers, and the `.nb-switch` rules in the shipped stylesheet (`notebook.css:294,483,
  493,551`). A class name in CSS is no control, label or announcement a person meets; SC-002 is about those. Noted
  for `reveal`, which removes Current and keeps a switch for testing.
- **Announcement:** the switch has none (no live region in `LookSwitch.tsx`); its label is its only words.
- **Alternatives:** a CI check script (changes the gate, not a slice's to write, D29); asserting on
  `import.meta.env.DEV` alone (what stands today, and proves nothing about what ships).

## R2 — The left page of What is protected as a tab stop (D30)

- **Decision:** In `Trail.tsx`'s page branch, `.nb-trail-sticky` takes `tabIndex={0}`, `role="region"` and
  `aria-labelledby` pointing at its own `h2` (id from `useId`), so its name is the heading already on screen ("What
  you are protecting" or "What you have chosen"). `protection-page.css` gives it
  `.nb-trail-leaves > .nb-trail-sticky:focus-visible { outline: 2px solid var(--nb-ink); outline-offset: -4px; }`,
  the page area's ring (`notebook.css:478-481`).
- **Rationale:** D30 and D19. A focused scroll container scrolls on the arrow keys in every engine; a `region` is
  what `aria-labelledby` needs to name a plain element. Tab order: the page area (`main`, `tabIndex=0`) first, the
  left page second, as the DOM has them.
- **Alternatives:** the left page grows and drops its own scroll (loses D8's sticky leaf); a tab stop only when it
  overflows (needs layout, which jsdom does not have, and changes the tab order with the window size).

## R3 — "Yes, set this up" pressed on the page (setup-pages T024)

- **Decision:** Through `App` with `installFakeCore`, in Morning, Midday and Night (chosen at the switch by its
  label, as `AppSetupPages.test.tsx` does). Success: `turn_protection_on` answers an in-force read-back; the
  Protection spread's heading appears and `get_trail` was asked. Refusal: `turn_protection_on` throws the core's
  sentence (the fake turns a throw into a rejection, `fakeCore.ts`); the choosing spread returns with that sentence
  on its left page and every box as it was. Teeth: change the page branch's `onConfirm` in `Disclosure.tsx`, run,
  restore with `git checkout -- src/screens/Disclosure.tsx`.
- **Evidence:** `App.tsx` `confirm()` sets the note and returns to choosing on a rejection.

## R4 — An edge in forced colours (setup-pages T025)

- **Decision:** Each slice sheet ends with an `@media (forced-colors: active)` block giving every control it draws
  with `border: 0` (or no border) `border: 1px solid CanvasText`: in `setup-pages.css` `.nb-choosing-turn-on`,
  `.nb-disclosure-confirm`, `.nb-disclosure-back`; in `protection-page.css` `.nb-protection-note__button`. Outside
  forced colours nothing changes, so no layout moves.
- **Rationale:** under forced colours backgrounds become the system's and a borderless button is bare words.
  `CanvasText` follows `notebook.css`'s tabs and `tonight-page.css`'s bars, the two forced-colours blocks already
  here. A transparent 1px border would also work but moves every button by 2px outside forced colours.
- **The sweep the test holds:** render the choosing spread (categories with a note, an address added, a reason)
  and the disclosure in all three states, the Protection spread in every `pinCases.ts` state including a waiting
  change, and What is protected; collect the classes of every `button`, `input`, `select` and `textarea`; each
  must either set a border of at least 1px in its sheet's base rules or be named in that sheet's forced-colours
  block with a `border` of at least 1px; a control that does neither fails by its class.

## R5 — Nothing fades (looks T024, D3)

- **Decision:** In `Protection.tsx`'s page branch, "Keep things as they are" becomes `<button type="button"
  className="nb-protection-note__button">`, and `.nb-protection-note__button` takes the box `Button` gives it
  today: `padding: 10px 20px` (`py-2.5 px-5`), `border-radius: 8px` (`rounded-lg`), `font-weight: 500`
  (`font-medium`), `line-height: calc(1.25 / 0.875)` (`text-sm`'s; its font-size is already the sheet's 12.5px).
  Current's branch keeps `Button`, so `ProtectionCurrentPin.test.tsx` stays green unedited.
- **The sweep:** every screen with a page branch (Choosing, Disclosure, Protection, Trail, Reaches with both
  views, CheckIn, Limits, Teardown), rendered inside `NotebookShell` in each look across the states the case files
  already hold (`pinCases.ts`, `setupCases.ts`, `tonightCases.ts`, `quietCases.ts`): no element carries a class
  `transition`, `transition-*`, `duration-*`, `animate-*` or `settle`. Teeth: put `Button` back in Protection's
  page branch and see the sweep fail by screen and class; restore with `git checkout -- src/screens/Protection.tsx`.
- **Evidence:** `grep` of the screens and components: only `Button.tsx:20`, `Card.tsx:7` (`settle`) and
  `Categories.tsx:72` (Current branch) carry them; Protection's page branch is the only page use of `Button`
  (`Protection.tsx:177`).

## R6 — Guards that read every rule (quiet-pages T013)

- **Decision:** as quiet-pages T013 states: each of the three readers collects every rule whose selector list
  names a modelled selector — bare, under `[data-look="…"]`, or inside any at-rule other than forced colours — and
  the model reads them all, or the test fails naming the one it does not model. Teeth: append
  `[data-look="night"] .nb-tab:focus-visible { box-shadow: none; }` to `notebook.css`, see each guard go red,
  restore with `git checkout -- src/styles/notebook.css`. No production change.

## R7 — The platform's own frame (FR-007, D31)

- **Decision:** a node-environment test that holds, for **every** window in `tauri.conf.json`: `decorations` absent
  or `true`, `transparent` absent or `false`, `titleBarStyle` absent or `"Visible"`; for every capability file
  under `src-tauri/capabilities/`: no permission naming `set-decorations` or `set-title-bar-style`;
  and for the sources (`src/**/*.ts(x)` outside tests,
  `src-tauri/src/**/*.rs`): no `setDecorations`, `setTitleBarStyle`, `.decorations(`, `.title_bar_style(`,
  `.transparent(`, `set_decorations`. Teeth: plant `"decorations": false` in `tauri.conf.json`, see it fail,
  restore with `git checkout -- src-tauri/tauri.conf.json`.
- **Evidence:** key names and defaults from `node_modules/@tauri-apps/cli/config.schema.json` (2.11.4):
  `decorations` default `true`, `transparent` default `false`, `titleBarStyle`. Run-time setters from
  `node_modules/@tauri-apps/api/window.d.ts:777,1185`. Today the Rust core builds no window of its own (`grep`
  finds no `WebviewWindowBuilder` in `src-tauri/src`) and the one capability grants `core:default` only.
  Whether `core:default` itself grants the decoration setters: *assumed* not (not read from Tauri's permission
  tables); the test does not rest on it, since it searches for the calls, which no code makes.

## R8 — New tests in new files

- **Decision:** every new test lives in a new file, so no existing test file changes except the three guards T013
  names. `AppSetupPages.test.tsx` and `windowConfig.test.ts` stay unedited.
- **Rationale:** SC-009's "existing tests unedited" read literally, and a concurrent sibling meets nothing of ours.
