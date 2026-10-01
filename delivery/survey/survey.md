# Survey

Written by `slipwai adopt` (1.4.0.dev0) from the tree as it was; `/survey` refreshes it. Every line names the
file that said so. Experimental: see `../docs/adoption.md`.

## Builds

- `.` — node, typescript, from `package.json`; what it is for, nothing here says
- `src-tauri` — cargo, rust, from `src-tauri/Cargo.toml`; what it is for, nothing here says

Wrapped as: `cairn` (`.`), `src-tauri` (`src-tauri`).

## Continuous integration

- `.github/workflows`

Proposed forge: `github`, from `.github/workflows`.

## How a change reaches production

- none found

Proposed: `unknown` — nothing in the tree says, so it stays unrecorded until somebody does.

## Containers

- none found

## Infrastructure as code

- none found

Proposed home: `unmanaged`.

## Database

Schema tools:

- none found

Drivers in dependency manifests:

- none found

Proposed schema home: `none`.

## Also here

- root `Makefile`: no
- `README`: yes

## Big issues that are quick wins

None the survey can see: no credential written in a file it reads, no IDE or build output tracked, no dependency source over plain HTTP, no missing lockfile, no archive under version control, no directory named to be read as code.
