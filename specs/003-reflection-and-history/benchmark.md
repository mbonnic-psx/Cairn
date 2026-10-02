# Benchmark — 003-reflection-and-history

Drawn 2026-10-02T17:37:06Z at `0408593` from 4 record(s) under `specs/003-reflection-and-history/` by `scripts/agents/benchmark.py overview`; `/benchmark` redraws it, and so does closing a slice. Regenerated whole, never edited: the records beside each slice are the source.

## Slices

4 slice(s) recorded, 7h58m in all.

| slice | delegate/cycle | wall | in | out | models | sessions | converge | +tasks | gaps | mutation | adversary | demo | verify✗ | rework | tasks | files | ±lines |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| history-by-hour | rule/rule, story/rule | 1h32m | 43.4M | 25.5k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 2 | 3 | 0/0 | interface 94.68% before closing (one gap killed, two equivalent); core 53/54 viable, 1 Tauri wrapper app-only | 3 | — | 0 | 0 | 25 | 39 | +4300/-155 |
| history-by-site | rule/rule, story/rule | 2h03m | 44.7M | 32.9k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 1 | 4 | 0/0 | interface 97.07% (Stryker, scoped, TZ=Europe/London); core 107/108 viable caught, 1 Tauri wrapper app-only | 5 | — | 0 | 0 | 26 | 48 | +4450/-101 |
| quote | none/rule, rule/rule | 2h56m | 53.6M | 43.8k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 2 | 7 | 0/0 | interface 95.86% (Stryker, scoped); core 29/32 live (7 wrappers app-only), dead quote() removed | 6 | — | 1 | 0 | 19 | 94 | +11149/-674 |
| write-tonight | rule/rule | 1h26m | 42.6M | 45.5k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 0 | 0 | 0/0 | interface 96.96% (Stryker, scoped); core 22/24 viable | 10 | — | 0 | 0 | 16 | 49 | +5816/-604 |

delegate/cycle = how implementation was delegated and driven; in = input + cache read + cache creation tokens; gaps = before/after converge; +tasks = tasks converge appended; sessions = harness sessions read; a stage's tokens are a floor (the turn that ends it is partly uncounted); a trailing + makes wall a floor because an unbracketed stage is missing; tokens are not prices.

## Stages

### history-by-hour — 1h32m

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| implement | 2026-10-02 15:15 | 17m37s | 15.3M | 4.3k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=story, cycle=rule, split=0 |
| converge | 2026-10-02 15:33 | 3m45s | 3M | 1.7k | claude-opus-5-5 | drive-converge | yes | — |
| implement | 2026-10-02 15:37 | 4m20s | 2.3M | 2.4k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| converge | 2026-10-02 15:41 | 8m46s | 7.4M | 4.7k | claude-opus-5-5 | drive-converge | yes | — |
| adversary | 2026-10-02 15:58 | 10m03s | 5.3M | 3.9k | claude-opus-5-5, claude-sonnet-5-5 | drive-adversary, drive-implement | yes | findings=3, seams=1 |
| implement | 2026-10-02 16:09 | 7m52s | 4.2M | 3.7k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| mutation | 2026-10-02 16:16 | 40m02s | 6M | 4.7k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-mutation | yes | mutation_score=interface 94.68% before closing (one gap killed, two equivalent); core 53/54 viable, 1 Tauri wrapper app-only |

### history-by-site — 2h03m

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| implement | 2026-10-02 02:16 | 13m56s | 11.9M | 8.3k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=story, cycle=rule, split=0 |
| converge | 2026-10-02 02:30 | 4m43s | 2.6M | 1.8k | claude-opus-5-5 | drive-converge | yes | — |
| implement | 2026-10-02 02:56 | 5m14s | 4.1M | 4.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| adversary | 2026-10-02 03:01 | 19m35s | 6.2M | 6.2k | claude-opus-5-5 | drive-adversary | yes | findings=5, seams=1 |
| implement | 2026-10-02 03:21 | 9m58s | 7.8M | 4.8k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| mutation | 2026-10-02 03:31 | 1h09m | 12.2M | 7.6k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | mutation_score=interface 97.07% (Stryker, scoped, TZ=Europe/London); core 107/108 viable caught, 1 Tauri wrapper app-only |

### quote — 2h56m

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| plan | 2026-10-01 16:24 | 1m31s | 1.5M | 782 | claude-opus-5-5 | general-purpose | yes | — |
| tasks | 2026-10-01 16:25 | 25s | 372.2k | 17 | claude-opus-5-5 | general-purpose | yes | — |
| implement | 2026-10-01 16:37 | 12m28s | 8.1M | 3.4k | claude-opus-5-5 | general-purpose | yes | verify_failures=1, delegate=none, cycle=rule, split=0 |
| converge | 2026-10-01 16:49 | 8m02s | 3.2M | 1.7k | claude-opus-5-5 | general-purpose | yes | — |
| implement | 2026-10-01 16:57 | 25m54s | 3.3M | 3.1k | claude-opus-5-5 | general-purpose | yes | verify_failures=0, delegate=none, cycle=rule, split=0 |
| converge | 2026-10-01 17:23 | 2m27s | 1.5M | 569 | claude-opus-5-5 | general-purpose | yes | — |
| adversary | 2026-10-01 20:39 | 6m11s | 5.3M | 4k | claude-opus-5-5 | drive-adversary | yes | findings=6, seams=1 |
| implement | 2026-10-01 20:51 | 7m54s | 10.8M | 11.8k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| implement | 2026-10-01 22:24 | 4m23s | 3.7M | 3.9k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| mutation | 2026-10-01 22:28 | 1h46m | 15.8M | 14.4k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | mutation_score=interface 95.86% (Stryker, scoped); core 29/32 live (7 wrappers app-only), dead quote() removed |

### write-tonight — 1h26m

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| adversary | 2026-10-01 17:59 | 18m59s | 4.7M | 3.9k | claude-opus-5-5 | drive-adversary | yes | findings=10, seams=2 |
| implement | 2026-10-01 18:18 | 7m56s | 3.3M | 5k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=2 |
| implement | 2026-10-01 18:55 | 5m09s | 5.9M | 5.4k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, general-purpose | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| mutation | 2026-10-01 19:17 | 9m31s | 3.2M | 6k | claude-opus-5-5 | — | no | mutation_score=core 22/24 viable caught (91.7%); 2 left: main and the get_day wrapper, app-only |
| mutation | 2026-10-01 19:45 | 44m50s | 25.5M | 25.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, general-purpose | yes | mutation_score=interface 96.96% (Stryker, scoped); core 22/24 viable |

## Notes

- history-by-hour: implemented as rule/rule and story/rule — its wall compares with neither
- history-by-site: implemented as rule/rule and story/rule — its wall compares with neither
- quote: implemented as none/rule and rule/rule — its wall compares with neither

## Reading these numbers

These numbers compare the slices of this project on this harness, and one slice before and after a change
to a prompt, a skill or the layout. They are tokens, not prices. They do not compare harnesses, whose transcripts
count different things, or projects, whose slices are not the same size — the shape columns normalise, they do not
equate. A stage's tokens are a floor: the turn that closes the entry is still being written when it is read. A
number the script could not read is written as unknown with its reason, never estimated. A stage whose start and end
were called in the same moment is unbracketed: its wall and tokens are missing, not zero, and a slice containing one
shows its measured wall as a floor with a trailing `+`. Host context grows through a session, so otherwise identical
slices spanning different numbers or lengths of sessions are not directly comparable on host tokens.
