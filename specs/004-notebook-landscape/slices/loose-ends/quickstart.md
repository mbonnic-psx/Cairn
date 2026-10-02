# Quickstart: slice `loose-ends`

Run from the worktree root after `npm ci`. No seed data: every test brings its own fake core or none.

| Item | Run | Expect |
|---|---|---|
| 1. No switch in a release (SC-002) | `npx vitest run src/shell/__tests__/releasedBuild.test.ts` | green: the release build has none of the switch's words; the development build has all of them |
| 2. The left page by keyboard (D30) | `npx vitest run src/screens/__tests__/TrailPageKeyboard.test.tsx` | green in every look; by eye: `npm run dev`, choose a look at "Look (testing)", turn protection on with the demo fake core, open What is protected, Tab twice: the left page shows the ink ring and the arrow keys scroll it |
| 3. "Yes, set this up" (setup-pages T024) | `npx vitest run src/shell/__tests__/AppSetupConfirm.test.tsx` | green: success opens Protection; a refusal returns to choosing with the core's sentence |
| 4. Edges in forced colours (setup-pages T025) | `npx vitest run src/look/__tests__/forcedColoursEdges.test.tsx` | green; by eye on Windows: High Contrast on, every button on the setup and Protection spreads has an outline |
| 5. Nothing fades (looks T024) | `npx vitest run src/look/__tests__/nothingFades.test.tsx` | green: no fading class on any page screen in any look |
| 6. Guards read every rule (quiet-pages T013) | `npx vitest run src/look/__tests__/tabFocusRing.test.ts src/look/__tests__/hilltopCairn.test.ts src/look/__tests__/tokens.test.ts` | green; a planted night override of the tab ring turns them red |
| 7. The platform's frame (FR-007) | `npx vitest run src/shell/__tests__/windowFrame.test.ts` | green |
| Current unchanged (SC-009) | `npx vitest run src/screens/__tests__/ProtectionCurrentPin.test.tsx src/screens/__tests__/SetupCurrentPin.test.tsx src/shell/__tests__/AppLook.test.tsx` | green, files unedited |
| Whole gate | `npm test && npm run lint && npm run build && npm run check` | green |
