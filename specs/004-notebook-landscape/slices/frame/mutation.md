# Mutation report: slice `frame` (interface, Stryker)

Command: `npx stryker run --mutate src/App.tsx,src/look/LookSwitch.tsx,src/look/contrast.ts,src/look/look.ts,src/navigation.ts,src/shell/CairnMark.tsx,src/shell/CurrentShell.tsx,src/shell/Greeting.tsx,src/shell/Landscape.tsx,src/shell/NotebookShell.tsx`
(config `stryker.config.json`, vitest runner, perTest coverage). Wall time: 6m 07s. 11.28 tests per mutant on average.

Tool's own line:

```
All files           |  90.39 |   90.71 |      226 |        28 |         26 |        1 |        0 |
```

Columns: % total, % covered, killed, timeout, survived, no cov, errors. 27 mutants did not die (26 survived, 1 no coverage).

| File | total | killed | timeout | survived | no cov |
| --- | --- | --- | --- | --- | --- |
| contrast.ts | 80.65 | 25 | 0 | 5 | 1 |
| look.ts | 90.00 | 8 | 1 | 1 | 0 |
| LookSwitch.tsx | 100.00 | 10 | 5 | 0 | 0 |
| CairnMark.tsx | 60.00 | 3 | 6 | 6 | 0 |
| CurrentShell.tsx | 100.00 | 9 | 6 | 0 | 0 |
| Greeting.tsx | 74.19 | 23 | 0 | 8 | 0 |
| Landscape.tsx | 50.00 | 3 | 0 | 3 | 0 |
| NotebookShell.tsx | 80.00 | 4 | 0 | 1 | 0 |
| App.tsx | 98.32 | 112 | 5 | 2 | 0 |
| navigation.ts | 100.00 | 29 | 5 | 0 | 0 |

## (a) Meaningful behavioural gaps

| Where | Mutant | Test that kills it |
| --- | --- | --- |
| src/shell/Greeting.tsx:20 | `if (timer !== undefined) clearTimeout(timer)` -> `;` (clearTimeout removed) | Fake timers. Mount, fire a `focus` event, assert `vi.getTimerCount() === 1`. A re-sync must replace the pending wake, not stack a second one. |
| src/shell/Greeting.tsx:20 | same condition -> `false` | Same test. |
| src/shell/Greeting.tsx:20 | `!==` -> `===` | Same test. |
| src/shell/Greeting.tsx:23 | `getSeconds()*1000 + getMilliseconds()` -> `- getMilliseconds()` | Fake timers set to a time with non-zero ms, e.g. 10:00:30.500. Advance 29_499 ms and assert the clock text has not changed. Advance 1 ms more and assert it has. A clock at :00.000 hides the sign. |
| src/look/contrast.ts:4 | `.trim()` removed | `' #aabbcc '` parses the same as `'#aabbcc'`. Skip it if padded input is not a supported contract. |
| src/look/contrast.ts:4 | `/^#/` -> `/#/` | `'12#3456'` must throw. The mutant strips the interior `#` and accepts it. |
| src/look/contrast.ts:6 | condition -> `false`, and the two regex anchor mutants (`^` and `$` dropped) | One table-driven test of invalid input, each case asserting `toThrow(/Not a hex colour/)`: `'zz112233'`, `'112233zz'`, `'12345'`, `''`, `'#12345g'`. This also covers the NoCoverage mutant at 6:52, the error message string. |
| src/look/look.ts:23 | `.replace(..., '$1 ')` -> `""` | Assert `formatWeekdayTime(date, 'en-US')` equals `'Monday 9:05 AM'` exactly. The comma is dropped and a space kept, so "Monday9:05 AM" must fail. Assert the full string. |
| src/shell/Landscape.tsx:17 | `.reverse()` removed | The stones must stack in order. Assert the `stone` elements' classes in DOM order: first is `nb-stone--<top tone>`, last is the base. |
| src/shell/CairnMark.tsx:29-30, 6-8 | `style={{ fill: s.fill }}` -> `{}`; the stone objects emptied; the fill emptied | Assert each `stone` rect has its fill (`rect.style.fill === 'var(--nb-stone-base)'` and so on, five in order) and non-empty x/y/width/height. Today the test counts stones and checks nothing else. |
| src/shell/CairnMark.tsx:29 | `rx={s.h / 2}` -> `s.h * 2` | Assert `rx` is half of `height` on every rect. |

## (b) Equivalent, or no observable difference

| Where | Mutant | Why |
| --- | --- | --- |
| src/shell/Greeting.tsx:12 | `useState(() => new Date())` -> `() => undefined` | The effect calls `sync()` before first paint settles, so `now` is set at once. It differs only for one render that tests do not observe. It could be killed by rendering to a string with `renderToString`, which is not worth it. |
| src/shell/Greeting.tsx:20 | condition -> `true` | `clearTimeout(undefined)` is a no-op. |
| src/shell/Greeting.tsx:34 | condition -> `true` (cleanup) | Same no-op. The `if` guard is cosmetic. |
| src/shell/Greeting.tsx:38 | `[]` -> `["Stryker was here"]` | A constant dependency array behaves as `[]`. |
| src/App.tsx:40 | `'current'` -> `""` for the non-dev look | `Shell = look === 'morning' ? NotebookShell : CurrentShell`, so any non-`morning` value picks the current shell. |
| src/App.tsx:147 | `state?.status` -> `state.status` | `setStep('trail')` at line 92 is only reached after `state` is set, so `state` cannot be undefined at the trail step. Re-check this if that ordering changes. |

## (c) Not worth a test

| Where | Mutant | Why |
| --- | --- | --- |
| src/shell/Landscape.tsx:18 | className template -> `` | CSS class string. It is covered only if the (a) test above also asserts class names. |
| src/shell/Landscape.tsx:18 | `nb-stone--${i + 1}` -> `i - 1` | CSS class index. Same. |
| src/shell/NotebookShell.tsx:40 | `nb-tab nb-tab--${tab.id}` -> `` | CSS class string. |

## Notes

- The tool ran with the repository's own config. The only flag beyond it was `--mutate`.
- Stryker's temp dir `.stryker-tmp` was removed (it is also in `.gitignore`). The full log is at `~/.cache/cairn-scratch/frame-stryker.log`.
- `git status` also showed two files modified before this run and not touched by it: `specs/004-notebook-landscape/adversary-log.md` and `specs/004-notebook-landscape/slices/frame/benchmark.json`.

## Acted on (host, 2026-10-01)

- Items 1, 2, 3, 5, 6: killed by tests in `9a06b67` (`Greeting.test.tsx`, `contrast.test.ts`, `look.test.ts`), each mutant hand-applied and seen to fail.
- Item 4 (`.trim()`): not a gap. `contrastRatio` is called only by tests with literal tokens, and padded input is not part of its contract.
- Items 7, 8, 9 (the stone order and shapes in `Landscape.tsx` and `CairnMark.tsx`): not pinned. They are artwork, judged by eye in the demo of all three looks, and a test of each rect's geometry would pin a drawing rather than a behaviour.
