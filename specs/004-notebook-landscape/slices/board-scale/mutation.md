# Mutation report: slice `board-scale` (interface)

No run. `git diff --stat main -- 'src/**/*.ts' 'src/**/*.tsx' ':!src/**/__tests__/**'` is empty: the slice changed no
TypeScript production code, only stylesheets (`src/styles/notebook.css` and the four page sheets), which Stryker does
not mutate. Score: not applicable, no mutable production code changed.

The stylesheets are held by the stylesheet tests' own teeth, break-and-restore, recorded in the commits and in
`tasks.md`: T007 and T011 (the measure moved to `calc(450 * var(--nb-u))`: 9 tests fail), T012 (radii and shadows
left unscaled: five sweeps fail; the protection note button's radius: `nothingFades.test.tsx` fails), T013
(`text-sm` planted in five page branches: each fails in all three looks), T010 (the Tonight status capped by the
measure: the paper sweep fails).
