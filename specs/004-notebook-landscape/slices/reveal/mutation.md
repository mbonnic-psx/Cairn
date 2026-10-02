# Mutation report: slice `reveal` (interface, Stryker)

Command: `TZ=Europe/London npx stryker run --mutate src/App.tsx,src/look/look.ts,src/look/LookSwitch.tsx,src/shell/NotebookShell.tsx`
(config `stryker.config.json`, vitest runner, perTest coverage). Wall time: 3m 59.8s (initial test run 1m 11s, 2127 tests). 51.48 tests per mutant on average. Branch `slice/reveal`, HEAD 40af911.

Tool's own line:

```
All files           |  99.37 |   99.37 |      140 |        18 |          1 |        0 |        0 |
```

Columns: % total, % covered, killed, timeout, survived, no cov, errors. Of 159 mutants, 140 were killed and 18 timed out (counted as detected by the tool); 1 survived, 0 had no coverage, 0 errors.

| File | total | covered | killed | timeout | survived | no cov |
| --- | --- | --- | --- | --- | --- | --- |
| App.tsx | 99.15 | 99.15 | 109 | 8 | 1 | 0 |
| look/look.ts | 100.00 | 100.00 | 7 | 4 | 0 | 0 |
| look/LookSwitch.tsx | 100.00 | 100.00 | 17 | 1 | 0 | 0 |
| shell/NotebookShell.tsx | 100.00 | 100.00 | 7 | 5 | 0 | 0 |

## Surviving mutant

One, `src/App.tsx:140:66`, mutator `OptionalChaining`:

```
-         {step === 'trail' && trail && <Trail trail={trail} status={state?.status} />}
+         {step === 'trail' && trail && <Trail trail={trail} status={state.status} />}
```

Classification: (b) equivalent. `state` is undefined only until `getProtectionState` resolves (or if it rejects). The step `trail` is entered only from the Trail tab (`select`, App.tsx:88) or after `setState(current)` (App.tsx:107-108). `tabsFor` (src/navigation.ts:29) offers the Trail tab only when `protectionOn`, and `protectionOn` is `state !== undefined && state.status !== 'off'` (App.tsx:65). So whenever `step === 'trail'` and `trail` is set, `state` is defined, and `state.status` and `state?.status` give the same value. No input reaches the difference. The `?.` is a type-level guard, not behaviour. This was reasoned from the code, not run.

## (a) Meaningful behavioural gaps

None.

## (b) Equivalent

The one mutant above.

## (c) Artwork or styling

None.

## Screens not mutated

The slice's change to these is deletion only (lines removed, none changed or added), so there is nothing left to mutate and they are not in the command: Protection, Trail, Limits, Teardown, Disclosure, Setup/*, Reaches, CheckIn. `src/shell/CurrentShell.tsx` and `src/shell/notebookPage.ts` were deleted outright.

## Notes

- First attempt, without `TZ`: Stryker stopped at its initial test run (no mutant tested, no score). The test `CheckInPage.test.tsx:317` ("pressing it asks save_journal_entry with the arguments it asked before the notebook") failed on three tries. Cause: the fixture sets `process.env.TZ = 'Europe/London'` at load, which does not take effect inside Stryker's worker threads, and `SAVE_CALLS_OUTSIDE` holds London-midnight timestamps, while the host zone is CDT. The zone is now set in the environment of the command (`TZ=Europe/London` prefix); no test, fixture or config was changed.
- The 18 timeouts are counted by the tool as detected. They were not individually examined.
- A failed dry run in the first attempt left `.stryker-tmp`; it was removed. After this run there is no `.stryker-tmp` and no `reports/` directory. The full log is at `~/.cache/cairn-scratch/reveal-stryker4.log`.
- `git status` showed `specs/004-notebook-landscape/slices/reveal/benchmark.json` modified before this run; it was not touched by it.
