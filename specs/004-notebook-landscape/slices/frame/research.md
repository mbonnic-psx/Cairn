# Research — slice `frame`

Each decision cites what it was read from. A statement with no citation would read *assumed*, and none of the
decisions below rests on one.

## R1. Hiding the switch from released builds

**Decision**: Render `LookSwitch` only when `import.meta.env.DEV` is true. `App` takes the value as a prop
defaulted from `import.meta.env.DEV`, so tests can render both ways, and treats a non-DEV build as permanently
`current`.

**Rationale**: Vite types `import.meta.env.DEV` as a boolean (`node_modules/vite/types/importMeta.d.ts`, line 18,
Vite 6.4.3). Its documentation ("Env Variables and Modes", *Built-in constants*) says these constants are
statically replaced in production, so the branch is dead code and the minifier drops it. **To be verified, not
assumed:** the quickstart's step 4 builds for production and searches `dist/` for `Look (testing)`. SC-002 rests
on that search, not on the documentation.

**Alternatives considered**: A Cargo feature or a Tauri command reporting the build type. That adds IPC surface
(`ipc_surface.rs` would have to classify it) for something the bundler already knows. A runtime query string
(`?look=morning`). A released build would still contain the switch's code and could be reached by editing a URL,
which FR-012 forbids.

## R2. Shipping the fonts

**Decision**: Vendor the latin-subset `woff2` files from Fontsource 5.3.0 into `src/assets/fonts/`:
Libre Caslon Text 400, 400 italic and 700, and IBM Plex Mono 400 and 500. Ship them with `OFL.txt` and declare
them with `@font-face` in `theme.css`, `font-display: swap`. Fallbacks: `Georgia, 'Iowan Old Style', serif` and
`ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace`.

**Rationale**: Both families are SIL OFL 1.1 (`npm view @fontsource/libre-caslon-text license` and
`npm view @fontsource/ibm-plex-mono license`, both `OFL-1.1`, version 5.3.0, read 2026-10-01). The OFL allows
bundling with software when the licence travels with the fonts. The CSP in `src-tauri/tauri.conf.json` is
`font-src 'self'`, so the fonts have to come from the bundle. Vite imports a `url(...)` in CSS as a hashed asset
in the bundle. Vendoring rather than adding the npm packages keeps `package.json` and the lock unchanged: the
delivery method's shared-surface rule says manifests are not a slice's to write.

**Alternatives considered**: Adding `@fontsource/*` as dependencies. That is cleaner to update, but it changes the
manifest and would have to land on `main` first as its own change. Recorded as a later tidy-up if the owner
prefers it. Google Fonts at runtime is forbidden by Principle II and blocked by the CSP.

## R3. Testing the production path

**Decision**: Use `vi.stubEnv('DEV', false)` in the tests that prove a production build has no switch, alongside
the prop seam from R1.

**Rationale**: Vitest 3.2.7 declares `stubEnv(name, value)` with a boolean for `"PROD" | "DEV" | "SSR"`, changing
`import.meta.env` (`node_modules/vitest/dist/index.d.ts`, lines 464–468). It is undone with `vi.unstubAllEnvs`.

## R4. The greeting's time

**Decision**: Format with `Intl.DateTimeFormat(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })`,
so the computer's locale decides 12- or 24-hour time (FR-030). Re-render on a timer set to the next minute
boundary, then every 60 s. Clear it on unmount.

**Rationale**: The locale's default `hourCycle` applies when `hour12` and `hourCycle` are not given (ECMA-402,
`Intl.DateTimeFormat`, *ResolveOptions*: the locale data supplies the default hour cycle). Tauri's webview takes
its locale from the operating system. Where it does not, it is the webview's locale, which is a limit of the
webview, recorded here and not worked around. The look is never derived from this time (FR-013).

## R5. The window's opening size

**Decision**: In `src-tauri/tauri.conf.json`, set `app.windows[0].width` to 1280 and `height` to 800. Leave
`minWidth` 800 and `minHeight` 600.

**Rationale**: These are the existing keys in the file (lines 16–19). The Tauri 2 window config takes logical
pixels for `width` and `height`.

## R6. Contrast, measured rather than eyeballed

**Decision**: A pure `contrastRatio(hexA, hexB)` following WCAG 2.2's relative-luminance formula. One test lists
every text and background pair the morning look uses and asserts the floor of FR-021 for each.

**Rationale**: WCAG 2.2, *Understanding SC 1.4.3*, gives the formula and the 4.5:1 and 3:1 floors. A test that
names each pair is what makes SC-003 checkable on every commit, and it is the same check the `looks` slice will
need for midday and night.

## R7. One rule for the tabs

**Decision**: Move today's header rules into `tabsFor(step, protectionOn)` in `src/navigation.ts`. It returns the
ordered destinations (id, label, current). `CurrentShell` and `NotebookShell` both render from it.

**Rationale**: `App.tsx` lines 95–140 (on `main` at `669fdda`) hold the rules inline: Protection is always present
and is current for choosing, disclosure and protected; What is protected and Today appear once protection is on;
Tonight and What Cairn covers always appear. Two shells each keeping their own copy would let the notebook drift
from the header (FR-003). One function makes drift impossible, and the existing `Navigation.test.tsx` keeps
pinning it through `CurrentShell`.

## R8. Narrow windows

**Decision**: At a viewport narrower than 1100px, the greeting moves above the notebook (a grid row instead of a
column), and the notebook takes the remaining width. The page area scrolls inside the notebook. The tabs stay
fixed to its edge.

**Rationale**: The reference board (`G-Morning`) puts a 250px greeting column and a 830px notebook, plus 44px of
tabs, in 1280px. Below about 1100px the notebook would fall under a comfortable reading width. At 800×600, the
smallest window, the stacked layout still fits a notebook about 720px wide (FR-025, FR-029).
