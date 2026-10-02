# Mutation report: slice `tonight-page` (interface, Stryker)

Command: `TZ=Europe/London npx stryker run --mutate src/screens/Reaches.tsx,src/screens/CheckIn.tsx`
(config `stryker.config.json`, vitest runner, perTest coverage). `TZ` is set in the environment because the Reaches tests set `process.env.TZ` at the top of the file, which does not take under Stryker's shared-thread runner (003's history-by-site ran the same way). Wall time: 4m 15s (the tool reports 4m 13s for the mutation run). 44.39 tests per mutant on average. Branch `slice/tonight-page`, HEAD 022f9d5. Interface only; Rust untouched.

Tool's own line:

```
All files    |  96.43 |   96.43 |      462 |        24 |         18 |        0 |        0 |
```

Columns: % total, % covered, killed, timeout, survived, no cov, errors. 504 mutants: 462 killed, 24 timed out (counted as detected), 18 survived, 0 no coverage, 0 errors.

| File | total | covered | killed | timeout | survived | no cov |
| --- | --- | --- | --- | --- | --- | --- |
| CheckIn.tsx | 96.54 | 96.54 | 261 | 18 | 10 | 0 |
| Reaches.tsx | 96.28 | 96.28 | 201 | 6 | 8 | 0 |

## (a) Meaningful behavioural gaps

- `src/screens/CheckIn.tsx:481` (3 mutants: `after && setView(after)` replaced by `true`, by `false`, and the callback replaced by `() => undefined`). The Keep button's result handling is untested: no test shows that the view moves to what `keep` returns, nor that nothing happens when `keep` returns nothing.
- `src/screens/CheckIn.tsx:278` (2 mutants: `tick((n) => n + 1)` replaced by `tick(() => undefined)` and by `n - 1`). The timer that makes the screen stop calling the day "today" when it ends under an open check-in does not re-render in any test. A fake-timer test that advances past `opened.end` and checks the wording would kill both.
- `src/screens/Reaches.tsx:328` (`list?.by_site ?? []` replaced by `?? ["Stryker was here"]`). No test covers the fallback for an answer with no `by_site`, so the empty-sites path is unpinned.
- `src/screens/CheckIn.tsx:340` (`.catch(() => null)` replaced by `.catch(() => undefined)`). Weakly meaningful: the "no quote to be had is none shown" path is not distinguished from `undefined`. Worth a test only if `holdQuote` treats the two differently.

## (b) Equivalent or not worth a test

- `src/screens/CheckIn.tsx:50`, `:61`, `:62` (the `NOTHING_VISIBLE` pattern pieces `'^['`, `']*$'` and the flag `'u'` emptied). Each survives only because the other pieces still form a working pattern for the inputs the tests use. The `'u'` mutant is the only one that could matter, since the `\u{...}` ranges need it, but the tests do not use an astral-plane character. A single test with an astral blank (for example U+E0001) would kill it; it is borderline between (a) and (b).
- `src/screens/CheckIn.tsx:455`, `src/screens/Reaches.tsx:225`, `:251` (React `key` template emptied to ``). Keys affect reconciliation only, with no observable output in the tests. Not worth a test.
- `src/screens/Reaches.tsx:94`, `:189`, `:197`, `:202`, `:410` (class-name strings emptied on the `onPage` branch: `nb-reaches-which`, `nb-reaches-sentence` twice, `nb-reaches-title`, `nb-reaches-field`). Styling hooks for the notebook page; no behaviour hangs on them. Not worth a test.

## Notes

- The tool ran with the repository's own config. The only flags beyond it were `--mutate` and `TZ=Europe/London` in the environment.
- The full log is at `~/.cache/cairn-scratch/tonight-page-stryker.log`.
- `git status` showed `specs/004-notebook-landscape/slices/tonight-page/benchmark.json` modified before this run; it was not touched by it and is not in this commit.
