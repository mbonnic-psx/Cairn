# Benchmark — 004-notebook-landscape

Drawn 2026-10-02T13:45:44Z at `ae01fc5` from 8 record(s) under `specs/004-notebook-landscape/` by `scripts/agents/benchmark.py overview`; `/benchmark` redraws it, and so does closing a slice. Regenerated whole, never edited: the records beside each slice are the source.

## Slices

7 slice(s) recorded, 7h09m+ in all.

| slice | delegate/cycle | wall | in | out | models | sessions | converge | +tasks | gaps | mutation | adversary | demo | verify✗ | rework | tasks | files | ±lines |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| (feature) | — | 3m31s | 1.1M | 4.6k | claude-opus-5-5 | 1 | 0 | 0 | 5/0 | — | 0 | — | 0 | 0 | — | — | — |
| frame | rule/rule, story/rule, task/example | 1h01m | 28.3M (+1 unread) | 57.9k | claude-opus-5-5, claude-sonnet-5-5 | 2 | 1 | 9 | 0/0 | 90.39 | 5 | implementation | 0 | 0 | — | — | — |
| looks | story/rule, task/rule | 33m07s+ | 19.9M (+3 unread) | 46.3k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 2 | 6 | 2/0 | 95.07 | 0 | accepted | 0 | 0 | 24 | 48 | +2043/-92 |
| loose-ends | task/rule | 59m02s+ | 32.7M (+1 unread) | 59.4k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 2 | 8 | 3/6 | 100.00 | 0 | accepted | 0 | 0 | 19 | 84 | +104189/-12 |
| protection-page | story/rule, task/rule | 1h00m+ | 36.7M (+2 unread) | 64.2k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 2 | 8 | 4/0 | 81.70 | 0 | accepted | 0 | 0 | 26 | 64 | +3338/-16 |
| quiet-pages | story/rule | 40m58s+ | 46.1M (+1 unread) | 86.3k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 1 | 1 | 1/5 | 100.00 | 0 | accepted | 0 | 0 | 13 | 114 | +6995/-20 |
| setup-pages | story/rule, task/rule | 1h11m | 58.7M | 86.3k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 2 | 3 | 3/4 | 93.80 | 0 | accepted | 0 | 0 | 23 | 69 | +4353/-11 |
| tonight-page | story/rule, task/rule | 1h39m+ | 50.3M (+2 unread) | 69.2k | claude-opus-5-5, claude-sonnet-5-5 | 1 | 1 | 3 | 4/3 | 96.43 | 0 | accepted | 1 | 0 | 27 | 138 | +10499/-103 |

delegate/cycle = how implementation was delegated and driven; in = input + cache read + cache creation tokens; gaps = before/after converge; +tasks = tasks converge appended; sessions = harness sessions read; a stage's tokens are a floor (the turn that ends it is partly uncounted); a trailing + makes wall a floor because an unbracketed stage is missing; tokens are not prices.

## Stages

### The feature, above the slice loop — 3m31s

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| gaps | 2026-10-02 02:39 | 3m31s | 1.1M | 4.6k | claude-opus-5-5 | — | no | gaps=5 |

### frame — 1h01m

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| plan | 2026-10-02 02:54 | 2m46s | 3.1M | 16.1k | claude-opus-5-5 | — | no | — |
| tasks | 2026-10-02 02:57 | 1m59s | 2.8M | 5.3k | claude-opus-5-5, claude-sonnet-5-5 | drive-tasks | yes | — |
| implement | 2026-10-02 02:59 | 10m49s | 8.4M | 11.3k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=story, cycle=rule, split=0 |
| converge | 2026-10-02 03:10 | 13m14s | 7M | 7.6k | claude-opus-5-5, claude-sonnet-5-5 | drive-converge, drive-implement | yes | — |
| demo | 2026-10-02 03:38 | 1s | 0 | 0 | — | — | no | outcome=implementation |
| adversary | 2026-10-02 03:39 | 21m07s | 5.5M | 8.4k | claude-opus-5-5 | drive-adversary | yes | findings=5, seams=2 |
| implement | 2026-10-02 04:01 | 2m12s | 537.2k | 3.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=rule, cycle=rule, split=0 |
| mutation | 2026-10-02 04:04 | 7m20s | 468.7k | 3.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-mutation | yes | mutation_score=90.39 |
| implement | 2026-10-02 04:11 | 2m00s | 496.1k | 3.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=task, cycle=example, split=0 |

### looks — 33m07s+

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| gaps | 2026-10-02 04:31 | 22s | 180.9k | 2.3k | claude-opus-5-5 | — | no | gaps=2, driver=cruise |
| plan | 2026-10-02 04:36 | unbracketed | unknown | unknown | — | — | no | driver=cruise |
| tasks | 2026-10-02 04:36 | 2m02s | 601.5k | 1.4k | claude-opus-5-5, claude-sonnet-5-5 | drive-tasks | yes | driver=cruise |
| implement | 2026-10-02 04:38 | 7m03s | 3.6M | 8.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=story, cycle=rule, split=0, driver=cruise |
| converge | 2026-10-02 04:45 | 6m23s | 3.8M | 6k | claude-opus-5-5 | drive-converge | yes | driver=cruise |
| implement | 2026-10-02 04:52 | 5m04s | 2M | 4.4k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=task, cycle=rule, split=0, driver=cruise |
| skipper | 2026-10-02 04:57 | 1m46s | 1.1M | 5.9k | claude-opus-5-5 | drive-skipper | yes | driver=cruise |
| converge | 2026-10-02 04:58 | 3m17s | 1.3M | 3.3k | claude-opus-5-5 | drive-converge | yes | driver=cruise |
| gaps | 2026-10-02 05:02 | unbracketed | unknown | unknown | — | — | no | — |
| demo | 2026-10-02 05:02 | 4m46s | 6.6M | 12k | claude-opus-5-5 | drive-gaps, drive-hand | yes | outcome=accepted, driver=cruise |
| adversary | 2026-10-02 05:07 | unbracketed | unknown | unknown | — | — | no | findings=0, seams=0, driver=cruise |
| mutation | 2026-10-02 05:07 | 2m24s | 726.3k | 2.9k | claude-opus-5-5, claude-sonnet-5-5 | drive-mutation | yes | mutation_score=95.07, driver=cruise |

### loose-ends — 59m02s+

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| gaps | 2026-10-02 12:21 | 26s | 102.5k | 181 | claude-opus-5-5 | — | no | gaps=3, driver=cruise |
| plan | 2026-10-02 12:26 | 3m36s | 1.2M | 1.5k | claude-opus-5-5 | drive-slice | yes | — |
| tasks | 2026-10-02 12:30 | 2m08s | 1.2M | 3.5k | claude-opus-5-5, claude-sonnet-5-5 | drive-slice, drive-tasks | yes | — |
| implement | 2026-10-02 12:35 | 5m29s | 5.7M | 10.5k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-slice | yes | verify_failures=0, delegate=task, cycle=rule, split=3 |
| converge | 2026-10-02 12:41 | 6m49s | 3.4M | 2.9k | claude-opus-5-5 | drive-converge, drive-slice | yes | — |
| implement | 2026-10-02 12:48 | 4m50s | 4.6M | 8.2k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-slice | yes | verify_failures=0, delegate=task, cycle=rule, split=3 |
| converge | 2026-10-02 12:53 | 5m22s | 2.1M | 5k | claude-opus-5-5 | drive-converge, drive-slice | yes | — |
| gaps | 2026-10-02 12:58 | 6m10s | 4.3M | 4.2k | claude-opus-5-5 | drive-gaps, drive-slice | yes | gaps=6 |
| demo | 2026-10-02 13:06 | 8m39s | 2.7M | 6.1k | claude-opus-5-5 | drive-hand | yes | outcome=accepted, driver=cruise |
| adversary | 2026-10-02 13:15 | unbracketed | unknown | unknown | claude-opus-5-5 | — | no | findings=0, seams=0, driver=cruise |
| implement | 2026-10-02 13:15 | 13m25s | 7M | 15.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | delegate=task, cycle=rule, split=3, verify_failures=0, driver=cruise |
| mutation | 2026-10-02 13:29 | 2m08s | 438.1k | 2.1k | claude-opus-5-5, claude-sonnet-5-5 | drive-mutation | yes | mutation_score=100.00, driver=cruise |

### protection-page — 1h00m+

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| gaps | 2026-10-02 05:25 | 1m01s | 559.7k | 5.6k | claude-opus-5-5 | — | no | gaps=4, driver=cruise |
| plan | 2026-10-02 05:30 | 3m11s | 2.8M | 1.3k | claude-opus-5-5 | drive-slice | yes | driver=cruise |
| tasks | 2026-10-02 05:33 | 2m36s | 1.2M | 1.5k | claude-opus-5-5, claude-sonnet-5-5 | drive-slice, drive-tasks | yes | driver=cruise |
| pin | 2026-10-02 05:36 | 1m28s | 1.5M | 480 | claude-opus-5-5 | drive-slice | yes | driver=cruise |
| implement | 2026-10-02 05:38 | 8m27s | 3.7M | 7.5k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-slice | yes | verify_failures=0, delegate=story, cycle=rule, split=0, driver=cruise |
| converge | 2026-10-02 05:47 | 13m07s | 10M | 9.5k | claude-opus-5-5 | drive-converge, drive-slice | yes | driver=cruise |
| implement | 2026-10-02 06:01 | 7m42s | 3.8M | 5.8k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-slice | yes | verify_failures=0, delegate=story, cycle=rule, split=0, driver=cruise |
| converge | 2026-10-02 06:08 | 4m39s | 2.7M | 4.4k | claude-opus-5-5 | drive-converge, drive-slice | yes | driver=cruise |
| gaps | 2026-10-02 06:15 | unbracketed | unknown | unknown | — | — | no | — |
| skipper | 2026-10-02 06:15 | 2m32s | 1.4M | 5.3k | claude-opus-5-5 | drive-gaps, drive-skipper | yes | driver=cruise |
| demo | 2026-10-02 06:26 | 5m33s | 3.7M | 10.3k | claude-opus-5-5 | drive-hand | yes | outcome=accepted, driver=cruise |
| implement | 2026-10-02 06:32 | 6m33s | 4.2M | 5.7k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=task, cycle=rule, split=0, driver=cruise |
| adversary | 2026-10-02 06:39 | unbracketed | unknown | unknown | claude-opus-5-5 | — | no | findings=0, seams=0, driver=cruise |
| mutation | 2026-10-02 06:39 | 2m19s | 406.1k | 3.9k | claude-opus-5-5, claude-sonnet-5-5 | drive-mutation | yes | mutation_score=81.70, driver=cruise |
| implement | 2026-10-02 06:42 | 1m49s | 665.6k | 3k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=task, cycle=rule, split=0, driver=cruise |

### quiet-pages — 40m58s+

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| gaps | 2026-10-02 07:10 | 50s | 671.7k | 5.1k | claude-opus-5-5 | — | no | gaps=1, driver=cruise |
| plan | 2026-10-02 07:16 | 2m42s | 2.3M | 762 | claude-opus-5-5 | drive-slice | yes | driver=cruise |
| tasks | 2026-10-02 07:18 | 2m21s | 2.5M | 9.3k | claude-opus-5-5, claude-sonnet-5-5 | drive-slice, drive-tasks | yes | driver=cruise |
| pin | 2026-10-02 07:21 | 59s | 1.2M | 74 | claude-opus-5-5 | drive-slice | yes | driver=cruise |
| implement | 2026-10-02 07:22 | 12m00s | 15.7M | 37.2k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-slice, drive-tasks | yes | verify_failures=0, delegate=story, cycle=rule, split=0, driver=cruise |
| converge | 2026-10-02 07:34 | 6m49s | 10.9M | 8.8k | claude-opus-5-5, claude-sonnet-5-5 | drive-converge, drive-implement, drive-slice | yes | driver=cruise |
| gaps | 2026-10-02 07:41 | 3m36s | 3.6M | 3.4k | claude-opus-5-5 | drive-converge, drive-gaps, drive-slice | yes | gaps=5, driver=cruise |
| demo | 2026-10-02 07:51 | 8m56s | 8.4M | 16k | claude-opus-5-5, claude-sonnet-5-5 | drive-converge, drive-gaps, drive-hand, drive-implement, drive-slice | yes | outcome=accepted, driver=cruise |
| adversary | 2026-10-02 08:25 | unbracketed | unknown | unknown | — | — | no | findings=0, seams=0, driver=cruise |
| mutation | 2026-10-02 08:25 | 2m45s | 933.4k | 5.8k | claude-opus-5-5, claude-sonnet-5-5 | drive-mutation | yes | mutation_score=100.00, driver=cruise |

### setup-pages — 1h11m

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| gaps | 2026-10-02 07:10 | 50s | 106.5k | 2.9k | claude-opus-5-5 | — | no | gaps=3, driver=cruise |
| plan | 2026-10-02 07:13 | 5m26s | 5M | 5.3k | claude-opus-5-5, claude-sonnet-5-5 | drive-slice, drive-tasks | yes | driver=cruise |
| tasks | 2026-10-02 07:19 | 3m25s | 4M | 10k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-slice, drive-tasks | yes | driver=cruise |
| pin | 2026-10-02 07:23 | 1m00s | 1.8M | 783 | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-slice | yes | driver=cruise |
| implement | 2026-10-02 07:24 | 16m45s | 22.8M | 21.8k | claude-opus-5-5, claude-sonnet-5-5 | drive-converge, drive-implement, drive-slice | yes | verify_failures=0, delegate=story, cycle=rule, split=0, driver=cruise |
| converge | 2026-10-02 07:41 | 8m16s | 5.6M | 2.5k | claude-opus-5-5 | drive-converge, drive-gaps, drive-slice | yes | driver=cruise |
| implement | 2026-10-02 07:49 | 3m10s | 3M | 7.4k | claude-opus-5-5, claude-sonnet-5-5 | drive-hand, drive-implement, drive-slice | yes | verify_failures=0, delegate=story, cycle=rule, split=0, driver=cruise |
| converge | 2026-10-02 07:52 | 4m54s | 4.3M | 3.2k | claude-opus-5-5 | drive-converge, drive-hand, drive-slice | yes | driver=cruise |
| gaps | 2026-10-02 07:57 | 3m34s | 2.8M | 8.4k | claude-opus-5-5 | drive-gaps, drive-hand, drive-slice | yes | gaps=4, driver=cruise |
| implement | 2026-10-02 08:11 | 1m47s | 1.4M | 6.8k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-skipper | yes | delegate=task, cycle=rule, split=0, red=observed, driver=cruise |
| demo | 2026-10-02 08:13 | 11m44s | 5.4M | 5.8k | claude-opus-5-5 | drive-hand | yes | outcome=accepted, driver=cruise |
| adversary | 2026-10-02 08:25 | 1s | 180.7k | 1.6k | claude-opus-5-5 | — | no | findings=0, seams=0, driver=cruise |
| mutation | 2026-10-02 08:25 | 2m45s | 1.1M | 6k | claude-opus-5-5, claude-sonnet-5-5 | drive-mutation | yes | mutation_score=93.80, driver=cruise |
| implement | 2026-10-02 08:28 | 8m13s | 1.2M | 3.8k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | delegate=task, cycle=rule, split=0, red=observed, driver=cruise |

### tonight-page — 1h39m+

| stage | started (UTC) | wall | in | out | model | agent | delegated | reported |
|---|---|---|---|---|---|---|---|---|
| gaps | 2026-10-02 09:18 | unbracketed | unknown | unknown | claude-opus-5-5 | — | no | — |
| skipper | 2026-10-02 09:18 | 1m38s | 1.8M | 7.5k | claude-opus-5-5 | drive-skipper | yes | driver=cruise |
| gaps | 2026-10-02 09:19 | 25s | 132.5k | 3.4k | claude-opus-5-5 | — | no | gaps=4, driver=cruise |
| tasks | 2026-10-02 09:48 | 3m33s | 1.3M | 2.2k | claude-opus-5-5, claude-sonnet-5-5 | drive-slice, drive-tasks | yes | driver=cruise |
| pin | 2026-10-02 09:52 | 4m40s | 2.5M | 3.4k | claude-opus-5-5 | drive-implement, drive-slice | yes | driver=cruise |
| implement | 2026-10-02 09:57 | 35m07s | 20.3M | 22.3k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement, drive-slice | yes | verify_failures=1, delegate=story, cycle=rule, split=0, driver=cruise |
| converge | 2026-10-02 10:32 | 14m12s | 7.1M | 8.5k | claude-opus-5-5, claude-sonnet-5-5 | drive-converge, drive-implement, drive-slice | yes | driver=cruise |
| gaps | 2026-10-02 10:46 | 6m26s | 5.7M | 2.1k | claude-opus-5-5 | drive-gaps, drive-slice | yes | gaps=3, driver=cruise |
| demo | 2026-10-02 10:53 | 12m14s | 7.3M | 8k | claude-opus-5-5 | drive-hand | yes | outcome=accepted, driver=cruise |
| adversary | 2026-10-02 11:08 | unbracketed | unknown | unknown | claude-opus-5-5 | — | no | findings=0, seams=0, driver=cruise |
| implement | 2026-10-02 11:08 | 8m39s | 1.7M | 4.7k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=task, cycle=rule, split=0, driver=cruise |
| mutation | 2026-10-02 11:16 | 5m10s | 992k | 3.2k | claude-opus-5-5, claude-sonnet-5-5 | drive-mutation | yes | mutation_score=96.43, driver=cruise |
| implement | 2026-10-02 11:22 | 6m59s | 1.5M | 4k | claude-opus-5-5, claude-sonnet-5-5 | drive-implement | yes | verify_failures=0, delegate=task, cycle=rule, split=0, driver=cruise |

## Notes

- frame: implemented as rule/rule and story/rule and task/example — its wall compares with neither
- looks: implemented as story/rule and task/rule — its wall compares with neither
- protection-page: implemented as story/rule and task/rule — its wall compares with neither
- setup-pages: implemented as story/rule and task/rule — its wall compares with neither
- tonight-page: implemented as story/rule and task/rule — its wall compares with neither
- looks plan: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.
- looks gaps: cut off — a new `demo` entry started while it was open; its wall is real, its signals were never reported
- looks gaps: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.
- looks adversary: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.
- loose-ends adversary: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.
- protection-page gaps: cut off — a new `skipper` entry started while it was open; its wall is real, its signals were never reported
- protection-page gaps: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.
- protection-page adversary: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.
- quiet-pages adversary: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.
- tonight-page gaps: cut off — a new `skipper` entry started while it was open; its wall is real, its signals were never reported
- tonight-page gaps: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.
- tonight-page adversary: not bracketed around its work — start and end were called in the same moment, so this stage's wall and tokens are missing, not zero.

## Reading these numbers

These numbers compare the slices of this project on this harness, and one slice before and after a change
to a prompt, a skill or the layout. They are tokens, not prices. They do not compare harnesses, whose transcripts
count different things, or projects, whose slices are not the same size — the shape columns normalise, they do not
equate. A stage's tokens are a floor: the turn that closes the entry is still being written when it is read. A
number the script could not read is written as unknown with its reason, never estimated. A stage whose start and end
were called in the same moment is unbracketed: its wall and tokens are missing, not zero, and a slice containing one
shows its measured wall as a floor with a trailing `+`. Host context grows through a session, so otherwise identical
slices spanning different numbers or lengths of sessions are not directly comparable on host tokens.
