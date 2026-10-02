# Mutation report: slice `setup-pages` (interface, Stryker)

Command: `npx stryker run --mutate src/screens/Setup/Choosing.tsx,src/screens/Setup/Categories.tsx,src/screens/Setup/CustomEntry.tsx,src/screens/Disclosure.tsx`
(config `stryker.config.json`, vitest runner, perTest coverage). Wall time: 1m 50s (the tool reports 1m 47s for the mutation run). 15.83 tests per mutant on average. Branch `slice/setup-pages`, HEAD b417bea.

Tool's own line:

```
All files         |  93.80 |   93.80 |      117 |         4 |          8 |        0 |        0 |
```

Columns: % total, % covered, killed, timeout, survived, no cov, errors. 8 mutants did not die (8 survived, 0 no coverage, 0 errors).

| File | total | covered | killed | timeout | survived | no cov |
| --- | --- | --- | --- | --- | --- | --- |
| Categories.tsx | 100.00 | 100.00 | 17 | 1 | 0 | 0 |
| Choosing.tsx | 100.00 | 100.00 | 4 | 0 | 0 | 0 |
| CustomEntry.tsx | 91.76 | 91.76 | 78 | 0 | 7 | 0 |
| Disclosure.tsx | 95.45 | 95.45 | 18 | 3 | 1 | 0 |

## (a) Meaningful behavioural gaps

All five sit in `CustomEntry.tsx` `submit` and its two submit buttons (6 mutants). No test types whitespace, and none fails an add and then succeeds.

| Where | Mutant | Test that would kill it |
| --- | --- | --- |
| CustomEntry.tsx:49 | `!input.trim()` -> `!input`; and the whole guard -> `false` (2 mutants) | Type `"   "` and submit; assert the add seam is not called and no sentence or reason appears. |
| CustomEntry.tsx:86 | page button `disabled={!input.trim()}` -> `!input` | Type `"   "`; assert the "add" button is disabled. |
| CustomEntry.tsx:126 | non-page button `disabled={!input.trim()}` -> `!input` | Same, rendered outside any shell. |
| CustomEntry.tsx:55 | `setReason(undefined)` removed after a successful add | Make the add seam reject once (reason shown), then resolve; assert the reason is gone. A stale "could not add" sitting beside "added" misstates what happened. |
| CustomEntry.tsx:48 | `event.preventDefault()` removed | Submit through the form and assert `event.defaultPrevented` (fireEvent.submit returns false when it was prevented), so the form never navigates or reloads. |

## (b) Equivalent

| Where | Mutant | Why |
| --- | --- | --- |
| CustomEntry.tsx:43 | initial `'not_verified'` -> `""` | `status` is read only when `added` is non-empty (lines 93-95, 133), and `setStatus` runs before `setAdded` in the same handler, so the initial value is never rendered. |
| Disclosure.tsx:30 | `.catch(() => setDetails(undefined))` -> `.catch(() => undefined)` | `details` is already `undefined` whenever the effect fetches (no `disclosures` prop), so the reset changes nothing. |

## (c) Artwork / styling

None. No survivor is a class string or visual constant.

## Notes

- The tool ran with the repository's own config. The only flag beyond it was `--mutate`.
- Categories.tsx and Choosing.tsx are fully killed. Disclosure.tsx has 3 timeouts, counted as killed by the tool.
- `.stryker-tmp` was cleaned by the tool; no `reports/` directory was left. The full log is at `~/.cache/cairn-scratch/setup-pages-stryker.log`.
- `specs/004-notebook-landscape/slices/setup-pages/benchmark.json` showed as modified before this run; the run did not touch it.

## After the follow-up tests

`fa16577` adds `src/screens/__tests__/CustomEntryGuards.test.tsx` (both layouts, fakes in the test), each test observed failing on its surviving mutant applied by hand. Re-run of `npx stryker run --mutate src/screens/Setup/CustomEntry.tsx`:

```
 CustomEntry.tsx | 100.00 |  100.00 |       84 |         1 |          0 |        0 |        0 |
```

Every (a) survivor is killed; the two (b) survivors are equivalent and stay.
