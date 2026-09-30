# Architecture view

Written by `slipwai adopt` (1.4.0.dev0) from the tree, its Git history and — where `.codegraph/` holds an index —
CodeGraph's graph; `/survey` rewrites it. Nothing here is inferred: a file is an entry point because a manifest or
its own name says so, a hotspot because commits touched it, a dependency because the graph holds the edge.
Experimental: see `../docs/adoption.md`.

## `cairn` — `.`

### Where anything starts

- nothing in the tree names one: no start script, main package, program, container command or Procfile. Something starts this some way nobody has written down — a question for the person, and a line for `docs/deployment.md` once answered.

### What it is made of

| Directory | Files | Mostly |
|---|---|---|
| `scripts/` | 9 | javascript, shell |
| `specs/` | 21 | markdown |
| `src/` | 21 | typescript, css |
| `src-tauri/` | 128 | json |

### What it declares it depends on

3 declared in `package.json`: `@tauri-apps/api`, `react`, `react-dom`.

### What it runs on

Nothing the survey can date: no runtime pin, no framework version it knows in the manifest, no image in a `Dockerfile`. `/ground` asks which version this actually runs on; the answer goes in `toolchain.version` with `confirmed` provenance, and the next `/survey` dates it here.

### Where change happens

16 of the 42 commits before the method arrived (since 2026-08-18; 3 author(s)) touched this application. The files they touched most:

| File | Commits |
|---|---|
| `eslint.config.js` | 4 |
| `scripts/acceptance/non-browser-client.sh` | 3 |
| `scripts/check-banned-words.mjs` | 3 |
| `scripts/check-no-notifications.sh` | 3 |
| `src/App.tsx` | 3 |
| `src/ipc/index.ts` | 3 |
| `README.md` | 2 |
| `package.json` | 2 |


### What the graph says

Not read: not indexed: `./init --extension codegraph` builds the index, then `/survey` reads it.

## `src-tauri` — `src-tauri`

### Where anything starts

- nothing in the tree names one: no start script, main package, program, container command or Procfile. Something starts this some way nobody has written down — a question for the person, and a line for `docs/deployment.md` once answered.

### What it is made of

| Directory | Files | Mostly |
|---|---|---|
| `src-tauri/capabilities/` | 1 | json |
| `src-tauri/helper/` | 18 | other |
| `src-tauri/icons/` | 15 | other |
| `src-tauri/resources/` | 10 | json |
| `src-tauri/src/` | 49 | other |
| `src-tauri/tests/` | 29 | other |

### What it declares it depends on

No dependency manifest this survey can read.

### What it runs on

Nothing the survey can date: no runtime pin, no framework version it knows in the manifest, no image in a `Dockerfile`. `/ground` asks which version this actually runs on; the answer goes in `toolchain.version` with `confirmed` provenance, and the next `/survey` dates it here.

### Where change happens

22 of the 42 commits before the method arrived (since 2026-08-18; 3 author(s)) touched this application. The files they touched most:

| File | Commits |
|---|---|
| `src-tauri/src/lib.rs` | 8 |
| `src-tauri/src/main.rs` | 6 |
| `src-tauri/Cargo.toml` | 5 |
| `src-tauri/helper/src/main.rs` | 5 |
| `src-tauri/src/ipc/state.rs` | 5 |
| `src-tauri/Cargo.lock` | 4 |
| `src-tauri/src/helper.rs` | 4 |
| `src-tauri/src/services/mod.rs` | 4 |


### What the graph says

Not read: not indexed: `./init --extension codegraph` builds the index, then `/survey` reads it.

## What this means for the map

The Structure row of `delivery/docs/convergence.md` stands at `named`
(detected; cairn: tool, src-tauri: tool; not under apps/: ., src-tauri). The ladder, and what
each rung asks of this repository:

- `as-found`: to move on, record what each application is — the entry points above say it: a `start` script, a main package or a web SDK is a service, a `bin` a tool, a test directory a suite — as `kind` on its record in `project.json` with provenance `confirmed`, then `/survey`; the row moves to `named`
- **`named`** — here: to move on, move each application under `apps/<name>/`, the layout a generated project has, as a slice of its own — the wrappers and recorded commands follow the path in `project.json`; the row moves to `laid-out`
- `laid-out`: to move on, give each application the hexagonal layers a generated service has — `domain/`, `ports/`, `adapters/` — and declare `"layout": "hexagonal"` on its record, which puts it under `make check-imports`; the row moves to `hexagonal`
- `hexagonal`: to move on, record a `typecheck` command for every application and make it green through the ratchet; the row moves to `typed`
- `typed`: nothing: this is where a generated project sits

The Platform row stands at `unknown` (unrecorded;
no runtime pin, framework version or image the survey can date). It climbs `unknown` → `inventoried` → `supported` → `audited`
as *What it runs on* above is dated, brought into support product by product — each an option above, offered as a
method slice, never a version the factory bumps — and given an `audit` command the gate runs. `/survey` reads every
product against the table on the day it runs, so a runtime that leaves support while the work goes on moves this row
by itself — and re-dates the reading only when a product, a version, a status or the table moved, so the date above
is the day something last changed and not the day somebody last looked.

A rung is claimed only once the fact behind it holds; `make check-convergence` fails a row the tree contradicts.

## Where to cut

For `/strangle`: a capability's seam is one of the entry points above — a route, a command, a job, a process — with
as few of the most-depended-on files behind it as possible. The files every other file depends on are the last to
move and the first to pin (`/characterise`, `delivery/survey/pinned.md`). The hotspots are where the next
change lands anyway, so a seam there pays for itself; a capability nothing has touched in the whole window is a
candidate to leave where it is (`docs/change-strategy.md`).
