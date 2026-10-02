# Mutation report: slice `looks` (interface, Stryker)

Command: `npx stryker run --mutate src/App.tsx,src/look/LookSwitch.tsx,src/look/look.ts,src/shell/Greeting.tsx,src/shell/Landscape.tsx,src/shell/NotebookShell.tsx`
(config `stryker.config.json`, vitest runner, perTest coverage). Wall time: 1m 42s (the tool reports 1m 39s for the mutation run). 10.46 tests per mutant on average.

Tool's own line:

```
All files           |  95.07 |   95.07 |      173 |        20 |         10 |        0 |        0 |
```

Columns: % total, % covered, killed, timeout, survived, no cov, errors. 10 mutants did not die (10 survived, 0 no coverage, 0 errors).

Not measured: the look tokens (palette, paper, ink, focus ring) live in CSS, which Stryker does not mutate. Their proof is the contrast and focus-ring tests, not this score.

| File | total | killed | timeout | survived | no cov |
| --- | --- | --- | --- | --- | --- |
| look.ts | 100.00 | 12 | 0 | 0 | 0 |
| LookSwitch.tsx | 100.00 | 16 | 9 | 0 | 0 |
| Greeting.tsx | 86.67 | 26 | 0 | 4 | 0 |
| Landscape.tsx | 66.67 | 8 | 0 | 4 | 0 |
| NotebookShell.tsx | 80.00 | 4 | 0 | 1 | 0 |
| App.tsx | 99.16 | 107 | 11 | 1 | 0 |

## (a) Meaningful behavioural gaps

None. Every survivor is either an equivalent mutant or class-name and drawing detail that the slice treats as artwork. One is borderline and is listed so the host can decide:

| Where | Mutant | Test that would kill it |
| --- | --- | --- |
| src/shell/Landscape.tsx:30 | `.reverse()` removed (stones stack in the opposite order) | Assert the `stone` elements' classes in DOM order: first is the top tone, last is the base. `frame` judged this artwork and did not pin it; the same call applies here unless the host wants the order pinned. |

## (b) Equivalent, or artwork

| Where | Mutant | Why |
| --- | --- | --- |
| src/shell/Greeting.tsx:12 | `useState(() => new Date())` -> `() => undefined` | The effect calls `sync()` at once, so `now` is set before any test observes a render. Same as `frame`. |
| src/shell/Greeting.tsx:20 | `if (timer !== undefined)` -> `true` | `clearTimeout(undefined)` is a no-op. |
| src/shell/Greeting.tsx:34 | same condition in cleanup -> `true` | Same no-op. |
| src/shell/Greeting.tsx:38 | `[]` -> `["Stryker was here"]` | A constant dependency array behaves as `[]`. |
| src/App.tsx:144 | `state?.status` -> `state.status` | The trail step is reached only after `state` is set. Re-check if that ordering changes. |
| src/shell/Landscape.tsx:20 | star class `nb-star nb-star--${n}` -> empty | CSS class string; star placement is stylesheet artwork. A test would pin the drawing. |
| src/shell/Landscape.tsx:31 | stone class template -> empty | CSS class string, artwork. |
| src/shell/Landscape.tsx:31 | `nb-stone--${i + 1}` -> `i - 1` | CSS class index, artwork. |
| src/shell/Landscape.tsx:30 | `.reverse()` removed | Listed in (a) as borderline; artwork under the `frame` ruling. |
| src/shell/NotebookShell.tsx:43 | `nb-tab nb-tab--${tab.id}` -> empty | CSS class string. |

## Notes

- The tool ran with the repository's own config. The only flag beyond it was `--mutate`.
- Compared with `frame`: the Greeting gaps `frame` reported (timer replacement, millisecond sign) are now killed; no survivor from `frame`'s (a) list recurs except the artwork-ruled stone order.
- `.stryker-tmp` was cleaned by the tool; no `reports/` directory was left. The full log is at `~/.cache/cairn-scratch/looks-stryker.log`.
- `git status` showed `specs/004-notebook-landscape/slices/looks/benchmark.json` modified before this run, and untracked `delivery/scripts/__pycache__/`, `design/` and `specs/cruise-log.jsonl`; none were touched by it.
