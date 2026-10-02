# Mutation report: slice `loose-ends` (interface, Stryker)

Command: `npx stryker run --mutate src/screens/Trail.tsx,src/screens/Protection.tsx`
(config `stryker.config.json`, vitest runner, perTest coverage). Wall time: 1m 33s (the tool reports 1m 31s for the mutation run). 23.90 tests per mutant on average. Branch `slice/loose-ends`, HEAD d3b89b7.

Tool's own line:

```
All files       | 100.00 |  100.00 |      112 |         3 |          0 |        0 |        0 |
```

Columns: % total, % covered, killed, timeout, survived, no cov, errors. Of 115 mutants, 112 were killed and 3 timed out (counted as detected by the tool); 0 survived, 0 had no coverage, 0 errors.

| File | total | covered | killed | timeout | survived | no cov |
| --- | --- | --- | --- | --- | --- | --- |
| Protection.tsx | 100.00 | 100.00 | 73 | 3 | 0 | 0 |
| Trail.tsx | 100.00 | 100.00 | 39 | 0 | 0 | 0 |

## Lines this slice changed

`git diff main` touches `Trail.tsx` (the `useId` title id, and `tabIndex={0}`, `role="region"`, `aria-labelledby`, `id` on the sticky page and its heading) and `Protection.tsx` (the cancel `Button` replaced by a plain `<button type="button">`). No mutant survived on any of those lines.

## (a) Meaningful behavioural gaps

None. No mutant survived.

## (b) Equivalent

None. No mutant survived.

## (c) Artwork or styling

None. No mutant survived.

## Notes

- The tool ran with the repository's own config. The only flag beyond it was `--mutate`.
- The 3 timeouts are all in `Protection.tsx`. The tool counts a timeout as detected. They were not individually examined.
- `.stryker-tmp` was cleaned by the tool; no `reports/` directory was left. The full log is at `~/.cache/cairn-scratch/loose-ends-stryker.log`.
- `git status` showed `specs/004-notebook-landscape/slices/loose-ends/benchmark.json` modified before this run; it was not touched by it.
