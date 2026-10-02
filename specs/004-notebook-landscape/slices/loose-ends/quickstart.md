# Quickstart: slice `loose-ends`

Run from the worktree root after `npm ci`. The tests need no seed data: each brings its own fake core or none.

## The tests, per item

| Item | Run | Expect |
|---|---|---|
| 1. No switch in a release (SC-002) | `npx vitest run src/shell/__tests__/releasedBuild.test.ts` | green: the release build has none of the switch's words; the development build has all of them; nothing left under `~/.cache/cairn-scratch` |
| 2. The left page by keyboard (D30) | `npx vitest run src/screens/__tests__/TrailPageKeyboard.test.tsx` | green in every look: the left page is the very next stop after the page area, named by its heading |
| 3. "Yes, set this up" (setup-pages T024) | `npx vitest run src/shell/__tests__/AppSetupConfirm.test.tsx` | green: success opens Protection; a refusal returns to choosing with the core's sentence and the boxes as they were |
| 4. Edges in forced colours (setup-pages T025) | `npx vitest run src/look/__tests__/forcedColoursEdges.test.tsx` | green: every control on every page screen has an edge in forced colours |
| 5. Nothing fades (looks T024) | `npx vitest run src/look/__tests__/nothingFades.test.tsx` | green: no fading class on any page screen, no transition in any sheet beyond the tabs' hover |
| 6. Guards read every rule (quiet-pages T013) | `npx vitest run src/look/__tests__/tabFocusRing.test.ts src/look/__tests__/hilltopCairn.test.ts src/look/__tests__/tokens.test.ts` | green; a planted night override of the tab ring, in any sheet, turns them red by name |
| 7. The platform's frame (FR-007) | `npx vitest run src/shell/__tests__/windowFrame.test.ts` | green |
| Current unchanged (SC-009) | `npx vitest run src/screens/__tests__/ProtectionCurrentPin.test.tsx src/screens/__tests__/SetupCurrentPin.test.tsx src/shell/__tests__/AppLook.test.tsx` | green, files unedited |
| Whole gate | `npm test && npm run lint && npm run build && npm run check` | green |

## What a person can see, and what only the tests can show

Most of this slice changes nothing on screen. Two things can be seen in a browser, with the dev server running
(`npm run dev`, port 1420) and protection-page's demo fake core loaded before the page:

```sh
agent-browser --init-script specs/004-notebook-landscape/slices/protection-page/demo/fake-core.js \
  open 'http://127.0.0.1:1420/?core=not_verified'
```

- **Item 2.** Choose a look at **Look (testing)**, open **What you chose**, press Tab until the page area shows its
  ring, then press Tab once more. The left page shows the same ring. In a development build the first Tab lands on
  the look switch. Where the left page is taller than the window (try 800×600), the arrow keys scroll it. Where it
  fits, it is still a tab stop, with nothing to scroll (research R2). This is checked in Chromium only. WebKit, the
  webview on macOS and Linux, is untested here, as D19's page area is. Showing the page in the real app needs
  protection on, which a smoke run does not turn on.
- **Item 4, by emulation.** In Chromium DevTools, open Rendering and set "Emulate CSS media feature
  forced-colors: active". The buttons on the setup spreads (setup-pages' fake core:
  `--init-script specs/004-notebook-landscape/slices/setup-pages/demo/fake-core.js`) then show an outline. So do the
  check-in's quotes switch and Today's "Which days" buttons.

Only the tests show these:

- **Protection's "Keep things as they are"** (items 4 and 5). The app never fetches a waiting change (D11), so the
  note does not appear through the app or either fake core.
- **The refusal half of item 3.** setup-pages' fake core always succeeds at turning protection on.
- **Items 1, 6 and 7.** They hold the build, the stylesheets and the window configuration, and nothing about them
  shows on screen.
