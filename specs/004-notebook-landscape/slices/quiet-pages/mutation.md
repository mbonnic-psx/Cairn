# Mutation report: slice `quiet-pages` (interface, Stryker)

Command: `npx stryker run --mutate src/screens/Limits.tsx,src/screens/Teardown.tsx`
(config `stryker.config.json`, vitest runner, perTest coverage). Wall time: 1m 16s (the tool reports 1m 10s for the mutation run). 10.81 tests per mutant on average. Branch `slice/quiet-pages`, HEAD 752fe34.

Tool's own line:

```
All files     | 100.00 |  100.00 |       47 |         0 |          0 |        0 |        0 |
```

Columns: % total, % covered, killed, timeout, survived, no cov, errors. Every one of the 47 mutants died (0 survived, 0 no coverage, 0 errors).

| File | total | covered | killed | timeout | survived | no cov |
| --- | --- | --- | --- | --- | --- | --- |
| Limits.tsx | 100.00 | 100.00 | 10 | 0 | 0 | 0 |
| Teardown.tsx | 100.00 | 100.00 | 37 | 0 | 0 | 0 |

## (a) Meaningful behavioural gaps

None. No mutant survived.

## (b) Equivalent

None. No mutant survived.

## (c) Artwork or styling

None. No mutant survived.

## Notes

- The tool ran with the repository's own config. The only flag beyond it was `--mutate`.
- `.stryker-tmp` was cleaned by the tool; no `reports/` directory was left. The full log is at `~/.cache/cairn-scratch/quiet-pages-stryker.log`.
- `git status` showed `specs/004-notebook-landscape/slices/quiet-pages/benchmark.json` modified before this run; it was not touched by it.
