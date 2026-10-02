# Mutation report: slice `protection-page` (interface, Stryker)

Command: `npx stryker run --mutate src/screens/Protection.tsx,src/screens/Trail.tsx,src/shell/notebookPage.ts,src/shell/NotebookShell.tsx,src/shell/Greeting.tsx`
(config `stryker.config.json`, vitest runner, perTest coverage). Wall time: 1m 30s (the tool reports 1m 28s for the mutation run). 18.21 tests per mutant on average. Branch `slice/protection-page`, HEAD c7d6530.

Tool's own line:

```
All files           |  81.70 |   89.93 |      110 |        15 |         14 |       14 |        0 |
```

Columns: % total, % covered, killed, timeout, survived, no cov, errors. 28 mutants did not die (14 survived, 14 no coverage, 0 errors).

| File | total | covered | killed | timeout | survived | no cov |
| --- | --- | --- | --- | --- | --- | --- |
| Protection.tsx | 67.11 | 82.26 | 49 | 2 | 11 | 14 |
| Trail.tsx | 100.00 | 100.00 | 37 | 2 | 0 | 0 |
| Greeting.tsx | 93.33 | 93.33 | 17 | 11 | 2 | 0 |
| notebookPage.ts | 100.00 | 100.00 | 2 | 0 | 0 | 0 |
| NotebookShell.tsx | 83.33 | 83.33 | 5 | 0 | 1 | 0 |

## (a) Meaningful behavioural gaps

All but one sit in one function, `whenWas` (src/screens/Protection.tsx:200-205), the "verified N ago" wording. No test gives `current.verified_at` a value, so the function is exercised only on the `'not yet'` side or not at all (14 no-coverage, 8 survived).

| Where | Mutants | Test that would kill them |
| --- | --- | --- |
| Protection.tsx:201 | `Date.now()/1000 - seconds` -> `+`, `*`; `Math.max` -> `Math.min` | Render with a fake clock and `verified_at` a known number of seconds in the past; assert the text. |
| Protection.tsx:202 | `ago < 90` -> true/false/`<=`/`>=`; `'just now'` -> `""` | Same render at 30 s ago ("just now"), at exactly 90 s (not "just now"), and with `verified_at` in the future (clamped to 0, "just now"). |
| Protection.tsx:203 | the `ago < 3600` minutes branch: conditional, boundary (`<=`, `>=`), string, `/60` -> `*60` (all no coverage) | Render at 5 minutes ago ("5 minutes ago") and at exactly 3600 s (hours, not minutes). |
| Protection.tsx:204 | the `ago < 86400` hours branch, same five mutants (no coverage) | Render at 3 hours ago ("3 hours ago") and at exactly 86400 s (days). |
| Protection.tsx:205 | final `days ago` string and `/86400` -> `*86400` (no coverage) | Render at 3 days ago ("3 days ago"). |
| Protection.tsx:169 | `onCancelled?.()` -> `onCancelled()` | Cancel a pending change with no `onCancelled` prop passed; assert no throw and that `cancelPendingChange` was called. |

Honesty note: this text states verified state ("last checked ..."), so a wrong unit or wrong sign would misstate how fresh the verification is. That is why the `whenWas` group is listed here and not under artwork.

## (b) Equivalent, or artwork

| Where | Mutant | Why |
| --- | --- | --- |
| Protection.tsx:87 | `nb-protection-badge ${badgeTone[words.tone]}` -> empty | CSS class string; badge tone is stylesheet artwork. |
| Greeting.tsx:34 | cleanup `if (timer !== undefined)` -> `true` | `clearTimeout(undefined)` is a no-op. Same as `looks`. |
| Greeting.tsx:38 | `[]` -> `["Stryker was here"]` | A constant dependency array behaves as `[]`. Same as `looks`. |
| NotebookShell.tsx:47 | `nb-tab nb-tab--${tab.id}` -> empty | CSS class string. Same as `looks`. |

Note: the `whenWas` BlockStatement mutant (line 200) is counted by the tool among the survivors; it is the same gap as (a), not an artwork call.

## Notes

- The tool ran with the repository's own config. The only flag beyond it was `--mutate`.
- Compared with `looks`: Greeting.tsx and NotebookShell.tsx survivors are the same equivalent ones (Greeting.tsx 2 survivors here against 4 in `looks`; the other two `looks` survivors do not recur). Trail.tsx and notebookPage.ts are fully killed.
- `.stryker-tmp` was cleaned by the tool and is gitignored; no `reports/` directory was left. The full log is at `~/.cache/cairn-scratch/protection-page-stryker.log`.
- `git status` showed `specs/004-notebook-landscape/slices/protection-page/benchmark.json` modified before this run; it was not touched by it.

## After the pass (2026-10-02)

`src/screens/__tests__/ProtectionLastChecked.test.tsx` pins both gaps under (a). Re-run over `src/screens/Protection.tsx`:

```
All files       |  97.37 |   97.37 |       74 |         0 |          2 |        0 |        0 |
```

Left: `Protection.tsx:87` (badge class string, artwork) and `Protection.tsx:50` (the `[state]` dependency array of the read on mount; equivalent in every way the app renders Protection today, since `state` is set once by `App`). Handed back, not this slice's: today's phrase says "1 hours ago", "1 days ago" and "60 minutes ago" at the unit boundaries, in Current as on the page. FR-018 keeps the words; the owner of protection's wording (002) may want it fixed.
