# Benchmark — 003-reflection-and-history

Drawn 2026-10-01T20:32:33Z at `849ccde` from 1 record(s) under `specs/003-reflection-and-history/` by `scripts/agents/benchmark.py overview`; `/benchmark` redraws it, and so does closing a slice. Regenerated whole, never edited: the records beside each slice are the source.

## Slices

1 slice(s) recorded, 1h26m in all.

| slice | delegate/cycle | wall | in | out | models | sessions | converge | +tasks | gaps | mutation | adversary | demo | verify✗ | rework | tasks | files | ±lines |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| write-tonight | rule/rule | 1h26m | 42.6M | 45.5k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 0 | 0 | 0/0 | interface 96.96% (Stryker, scoped); core 22/24 viable | 10 | — | 0 | 0 | 16 | 49 | +5816/-604 |

delegate/cycle = how implementation was delegated and driven; in = input + cache read + cache creation tokens; gaps = before/after converge; +tasks = tasks converge appended; sessions = harness sessions read; a stage's tokens are a floor (the turn that ends it is partly uncounted); a trailing + makes wall a floor because an unbracketed stage is missing; tokens are not prices.

## Stages

### write-tonight — 1h26m

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| adversary | 2026-10-01 17:59 | 18m59s | 4.7M | 3.9k | claude-opus-5-5 | drive-adversary | yes | findings=10, seams=2 |
| implement | 2026-10-01 18:18 | 7m56s | 3.3M | 5k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=2 |
| implement | 2026-10-01 18:55 | 5m09s | 5.9M | 5.4k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, general-purpose | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| mutation | 2026-10-01 19:17 | 9m31s | 3.2M | 6k | claude-opus-5-5 | — | no | mutation_score=core 22/24 viable caught (91.7%); 2 left: main and the get_day wrapper, app-only |
| mutation | 2026-10-01 19:45 | 44m50s | 25.5M | 25.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, general-purpose | yes | mutation_score=interface 96.96% (Stryker, scoped); core 22/24 viable |

## Notes

Nothing open, no rework, every stage's tokens read.

## Reading these numbers

These numbers compare the slices of this project on this harness, and one slice before and after a change
to a prompt, a skill or the layout. They are tokens, not prices. They do not compare harnesses, whose transcripts
count different things, or projects, whose slices are not the same size — the shape columns normalise, they do not
equate. A stage's tokens are a floor: the turn that closes the entry is still being written when it is read. A
number the script could not read is written as unknown with its reason, never estimated. A stage whose start and end
were called in the same moment is unbracketed: its wall and tokens are missing, not zero, and a slice containing one
shows its measured wall as a floor with a trailing `+`. Host context grows through a session, so otherwise identical
slices spanning different numbers or lengths of sessions are not directly comparable on host tokens.
