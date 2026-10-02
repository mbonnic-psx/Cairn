# Quickstart — slice `reveal`

How to see the reveal and how to check it. Run paths are the ones `delivery/survey/running.md` proves; the fake cores
are the earlier demos' (`slices/*/demo/fake-core.js`), which answer the IPC calls a browser has no core for.

## Verify

```sh
cd /home/mbonnic/Cairn
npm test          # every interface test, the SC-002 production-build search included
npm run lint
npm run build     # tsc --noEmit, then the production build
npm run check     # the eight constitutional guards, unedited
```

Focused, while working:

```sh
npx vitest run src/shell/__tests__/releasedBuild.test.ts src/shell/__tests__/AppLook.test.tsx src/shell/__tests__/LookSwitch.test.tsx
npx vitest run src/screens/__tests__/*WordsKept.test.tsx     # FR-018: every word, state and control, every look
grep -rn "outside any shell\|wordsOutside\|function outside" src   # expect nothing once Increment 6 is in (plan, "The vacuity check")
```

## A released build: what a person gets

```sh
npx vite build --outDir ~/.cache/cairn-scratch/reveal-dist --emptyOutDir
grep -c "Look (testing)" ~/.cache/cairn-scratch/reveal-dist/assets/*.js        # 0
grep -c "Good morning." ~/.cache/cairn-scratch/reveal-dist/assets/*.js         # 1 or more
grep -c "min-h-screen px-6 py-12\|settle rounded-2xl" ~/.cache/cairn-scratch/reveal-dist/assets/*.js   # 0
npx vite preview --outDir ~/.cache/cairn-scratch/reveal-dist --port 1456 --strictPort
agent-browser --allowed-domains 127.0.0.1 \
  --init-script specs/004-notebook-landscape/slices/protection-page/demo/fake-core.js \
  open 'http://127.0.0.1:1456/'
agent-browser set viewport 1280 800
rm -rf ~/.cache/cairn-scratch/reveal-dist   # afterwards
```

What to see (US2 scenario 6, FR-012, FR-032):

1. The landscape and the notebook in the **morning** look: peach sky, low sun, green hills, the cairn; **"Good
   morning."** with the weekday and time beside the notebook. The same at any hour of the day (FR-013).
2. **No switch** anywhere: nothing at the top right of the sky. Press Tab round the whole window: focus moves through the
   page area, the page's controls and the tabs, never to a switch.
3. Every tab opens its spread with the words it has always had. The one-column interface with the header of buttons is
   nowhere, at any size, 800×600 included.

## A development build: what a tester gets

```sh
npm run dev                     # Vite on 127.0.0.1:1420 (strictPort)
agent-browser --allowed-domains 127.0.0.1 \
  --init-script specs/004-notebook-landscape/slices/protection-page/demo/fake-core.js \
  open 'http://127.0.0.1:1420/'
```

Or the real app, with its core: `npm run tauri dev` (first build about a minute; `scripts/smoke.sh app` proves it opens).
Setup screens read best with `slices/setup-pages/demo/fake-core.js`, Today and Tonight with
`slices/tonight-page/demo/fake-core.js`.

What to see (US2 scenarios 1 and 5, FR-011, D44):

1. It opens on the **morning** notebook, as a released build does.
2. At the top right of the sky, small, **"Look (testing)"**, showing **Morning**. Its choices, in order: **Morning,
   Midday, Night**. There is no Current.
3. Choose Midday, then Night: the sky, sun or moon, hills, cairn, greeting and paper change at once, with no transition;
   the open screen and anything typed on it (Tonight's writing space) stay.
4. Reload the page, or quit and restart `npm run tauri dev`: it is on **Morning** again. Nothing was remembered.

## Not working yet, and not this slice's

- The clock does not choose the look; that feature removes the switch before the first release (FR-013a).
- A real-browser test runner for layout is still the owner's choice (D10, D27); the screenshots above are the proof of
  real layout.
- jsdom cannot compute fonts or sizes; the serif and mono split is held by reading the page sheets
  (`tonightPage.test.ts`, `setupPages.test.ts`), and seen in the runs above.
