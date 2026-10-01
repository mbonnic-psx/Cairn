# Tasks — slice `quote`

Numbered `Q`, and each names the feature task it carries out (`../../tasks.md`) or the gaps review decision it
holds (`../../spec.md`, *Gaps reviewed — slice `quote`*). One increment per pair: the RED task is written and seen
failing for the reason it states, then the GREEN task makes it pass, then the increment is committed. Scenario
numbers are `plan.md`'s.

No task here is `[P]`: each increment starts from the green, committed suite the one before it left, and the
Rust increments and the screen increments meet in `contracts/ui-ipc.md`'s names, which the earlier ones settle.

## Increment 1 — the choice (domain)

- [x] Q1 [T031, Q1] RED: `src-tauri/tests/quote_choice.rs` — `domain::quotes::choose(lines, roll)`: no lines is
  nothing; roll *k* is line *k mod n*; every line is reachable; a huge roll does not overflow.
- [x] Q2 [T031] GREEN: `src-tauri/src/domain/quotes.rs`, pure (`check-domain-purity.sh`).

## Increment 2 — `get_quote` through the driving port

- [x] Q3 [T031, T032, T033; scenarios 1–3, 6 (quote half)] RED: `src-tauri/tests/us1_quote.rs` against
  `AppState` over the real bundled `resources/quotes/quotes.json`: roll *k* gives line *k*; two rolls differ on
  one date and one roll is the same on two dates; a missing, an empty, and a malformed set each give nothing; the
  key unavailable changes nothing. `ipc_surface.rs` `CLASSIFIED` 17 → 18 with `get_quote`, `Effect::Reads`.
- [x] Q4 [T031, T032] GREEN: `reflection/quote.rs` (read the set, drop blank lines, choose), `reflection` built
  without `history`; `AppState.shipped_quotes` and `AppState.roll`; `AppState::get_quote`; the command; `main.rs`
  supplies the path beside the app and `getrandom::u64()`, and registers the handler. Every `AppState` literal in
  the test tree gains the two fields.

## Increment 3 — the switch, remembered

- [x] Q5 [Q2; scenarios 4–7] RED: in `us1_quote.rs` — shown by default; hidden means `get_quote` is nothing;
  remembered by a fresh `AppState`; shown again brings a line back; works with the key unavailable; leaves trail,
  intent, pending change and trusted clock unchanged; refused with the file byte-identical when `config.json` is
  unreadable. In `stores.rs` — a `config.json` written before this slice loads with quotes shown and all it held.
  `CLASSIFIED` 18 → 20 with `get_quotes_shown` and `set_quotes_shown`, `Effect::Reads`.
- [x] Q6 [Q2] GREEN: `Config.quotes_hidden` (`#[serde(default)]`); `AppState::get_quotes_shown`,
  `AppState::set_quotes_shown`; `get_quote` returns nothing when hidden; the two commands; `main.rs` registers them.

## Increment 4 — the line on the check-in

- [x] Q7 [T027 quote half; scenarios 8, 9, 11, 12] RED: `CheckIn.test.tsx` — one line in serif, asked for once,
  the same after a save; shown with nothing returned is no quote and nothing in its place, the space still there;
  the sealed check-in shows the line too; no banned word with a line showing.
- [x] Q8 [T034 quote half, T036 quote half] GREEN: `getQuote`, `getQuotesShown`, `setQuotesShown` in
  `src/ipc/journal.ts` (already import-restricted to the check-in); `CheckIn.tsx` asks once at open and keeps the
  line.

## Increment 5 — the quiet switch on the check-in

- [x] Q9 [Q2; scenario 10] RED: `CheckIn.test.tsx` — *Hide quotes* removes the line, leaves nothing in its place
  and becomes *Show quotes*; *Show quotes* brings a line back; opened hidden asks for no quote and offers *Show
  quotes*; a switch that cannot be kept leaves the line and says so in the status region; the switch is on the
  sealed check-in; its label names what it does and no protection change.
- [x] Q10 [Q2] GREEN: the switch in `CheckIn.tsx`, small, sans, at the foot of the check-in.

## Phase 3 — Hold it

- [x] Q11 The gate in the slice brief, `make -f delivery/Makefile verify`, and `make smoke` (`main.rs` changed).
- [ ] Q12 After the merge, on `main` (the feature's `tasks.md` and `delivery/survey/pinned.md` are the host's;
  `check-slice-scope` refuses them on this branch): tick T031 in `../../tasks.md`; note T027, T032, T033 as the
  quote half done; add the pin row `plan.md` *Pin* hands back.

## Done notes
- Q1–Q2: RED first as a build error (no `domain::quotes`), then against a stub returning nothing: 3 of 4 failed
  on their assertions (`no_lines_is_no_quote` passes on the stub by design). GREEN 4/4; domain purity clean.
- Q3–Q4: RED first as a build error (no `shipped_quotes`, `roll`, `get_quote`), then against a stub returning
  nothing: 7 of 10 scenario tests failed on their assertions (the three *no quote* cases pass on the stub by
  design) and `every_classified_command_is_exposed` failed for `get_quote`. GREEN 10/10 and 6/6. The quote reads
  through `reflection::quote`, which is now built without `history`; the other two `reflection` modules still
  are not. `cargo build --features app` clean.
- Q5–Q6: RED first as a build error (no `quotes_hidden`, `get_quotes_shown`, `set_quotes_shown`), then against
  stubs (a field with no `serde(default)`, a getter answering `true`, a setter that kept nothing): 5 of 16
  scenario tests failed on their assertions, the pre-slice `config.json` test failed with the file refused, and
  `every_classified_command_is_exposed` failed for the two commands. GREEN 16/16, 11/11, 6/6. `get_quote` gives
  nothing when the configuration cannot be read: unsure whether quotes were hidden, it shows none.
- Q7–Q8: RED 6 of 6 new screen tests failing (no line rendered; `getQuote` never asked), the 12 write-tonight
  tests still green with the module fake extended. GREEN 18/18. The line is the check-in's only `figure`, under
  the heading, serif and italic, with no marks or attribution (T007: the lines are Cairn's own). A second run of
  the effect under React's development StrictMode is ignored, so the line does not swap under the person.
- Q9–Q10: RED 6 of 7 new screen tests failing (no switch to find); *offers no switch when Cairn cannot tell* passes
  before the switch exists, by design, and holds the GREEN to it. GREEN 25/25. The switch is the quiet `Button`
  tone, sans, at the foot of the check-in and of the sealed check-in. A refusal goes to the `role="status"` region,
  which the sealed check-in now has as well. Shown again in the same opening, the line is the one it had.
- Q11 (2026-10-01): `npm run check` all seven guards clean; `npm run lint` clean; `npm test` 51/51 in 6 files;
  `npm run build` clean. `cargo test -p cairn --no-default-features` 205 passed, with `--features history` 251,
  `cargo test -p cairn-helper` 22; both clippy configurations and `cargo fmt --check` clean;
  `cargo build --features app` with zero warnings. `make verify` green apart from two failures that were there at
  the slice's start, before its first commit: `check-slice-scope` (the branch still carries the adoption and
  `write-tonight` commits not yet on `main`, and the checker places the interface's `src/` outside every
  deployable, as it did for `write-tonight`) and `check-agents` (the harness projection is not generated in this
  worktree). `make smoke` could not run: port 1420 is held by a `write-tonight` `npm run tauri dev` in another
  terminal, which was left running.

## Phase 3b — from convergence pass 1

- [x] Q13 [HIGH, F1, every wrapper] RED on a planted mismatch, then GREEN: `ipc_surface.rs` holds every
  `invoke('<name>', { keys })` in `src/ipc/*.ts` to a `#[tauri::command] pub fn <name>` in `commands.rs` whose
  parameters, apart from `state`, are exactly those keys (camelCase to snake_case). Sweep: all 20 commands.
- [x] Q14 [HIGH, F2, every command and every value `main.rs` supplies] RED on a planted omission, then GREEN:
  `ipc_surface.rs` holds `main.rs`'s `generate_handler!` to exactly the exposed commands; the roll moves into the
  library (`reflection::quote::fresh_roll`) with a test that it varies, and `main.rs` only names it.
- Q13: the guard was seen failing on two planted violations — `set_quotes_shown` renamed with its key changed,
  and `get_day` called without `dayEnd` — and passing on the real tree. Swept: all 20 `invoke` calls across
  `src/ipc/index.ts`, `reaches.ts` and `journal.ts`; none of the 17 earlier ones was out of step.
- Q14: `every_exposed_command_is_registered_with_the_window` failed with `get_quotes_shown` removed from
  `generate_handler!`; the roll test failed against a stub returning 0, then passed with `fresh_roll` in
  `reflection/quote.rs`; `the_application_supplies_the_tested_roll_and_the_bundled_set` failed with `roll: || 0`
  planted in `main.rs`. Swept: all 20 registrations, and the two values this slice has `main.rs` supply.

## Phase 4 — carried from convergence (MEDIUM and below)

- [ ] Q15 [MEDIUM, F3, every shipped resource; a question for the owner] `main.rs` finds `resources/quotes` and
  `resources/categories` beside the executable. That holds in `tauri dev` and on Windows. Installed Linux and
  macOS bundles may keep resources elsewhere (`/usr/lib/<product>/`, `Contents/Resources`), and there the quote
  would be silently absent. This is *assumed*, not read from Tauri's documentation or a bundle. Recommendation:
  resolve every shipped resource through Tauri's resource directory, and verify it against a real bundle on each
  platform. `shipped_categories` predates this slice and has the same pattern.
- [ ] Q16 [MEDIUM, pass 2 M-1, every `AppState` field `main.rs` sets from a helper] The supplied-values test
  checks that the quotes path text appears in `main.rs`, but not that `shipped_quotes` is set to it.
  `shipped_quotes: shipped_categories(),` passes every test (re-run by the host: 9/9 green). GREEN: hold each
  field-to-helper link (`shipped_categories`, `shipped_quotes`, `roll`, `now`, `own_hostname`).
- [ ] Q17 [LOW, pass 2 L1 and L2, every file in `src/ipc/`] The wrapper parser reads three named files and only
  `invoke<…>('…'`. A call written `invoke('x')`, or with double quotes, or in a new file, would be skipped or
  misread, and only the `>= 20` floor would notice. GREEN: count every `invoke(`/`invoke<` token per file against
  the calls parsed, reject a name that is not single-quoted, and list exactly the files in `src/ipc/*.ts`.
- [ ] Q18 [LOW, F4] While the day is loading, or when it cannot be read, the check-in shows neither the line nor
  the switch, where every other state shows both. Recommendation: leave it as it is, and say so in the plan.
- [ ] Q19 [LOW, F5, every command's `map_err`] The `Err` → sentence mapping is not tested at command level for
  any of the 14 commands that map one. It is the same convention as W14 in `write-tonight`.

## Convergence

**Pass 1 (2026-10-01): not converged.** No CRITICAL. Two HIGH, both on the delivery adapter, both closed in this
slice and each seen failing on a planted violation (Q13, Q14):

- **F1, the join across the IPC boundary:** a wrapper in `src/ipc/*.ts` could name a command or a key wrongly
  and pass every test. Now `ipc_surface.rs` (`every_interface_call_names_a_command_and_its_arguments`) holds all
  20 calls to their commands' exact parameters. Swept: the 17 earlier commands were all in step.
- **F2, `main.rs`:** registration and the roll were untested. `every_exposed_command_is_registered_with_the_window`
  now holds `generate_handler!` to exactly the 20 exposed commands. The roll is `reflection::quote::fresh_roll`,
  which `us1_quote.rs` proves varies, and `main.rs` is held to naming it.
- F3 (MEDIUM), F4 and F5 (LOW) were carried as Q15, Q18 and Q19.

Each level, as pass 1 accounted for it:
- domain: clean, mutation-checked;
- use case: clean, with two mutations of `get_quote` and `set_quotes_shown` killed;
- delivery adapter: F1, F2, F3, F5;
- screen: clean apart from F4, with the serif mutation killed;
- published contract: the prose matches Rust and TypeScript.

Constitution, per principle, with where it holds:
- **I:** `set_quotes_shown` touches only `quotes_hidden` (`src-tauri/src/ipc/state.rs`, `set_quotes_shown`), held
  by `us1_quote.rs` `the_switch_leaves_protection_as_it_was` across the whole `Config`. All three commands are
  `Reads` in `ipc_surface.rs`. The switch's label carries no protection words (`CheckIn.test.tsx`).
- **II:** the set is read from disk only (`src-tauri/src/reflection/quote.rs`, `bundled_lines`). No new
  dependency. Data Cairn cannot read is never overwritten: `set_quotes_shown` returns at `load()?` before any
  save, held byte-identical by `a_configuration_cairn_cannot_read_is_never_overwritten`.
- **III:** no set means no line and no placeholder. When Cairn cannot tell whether quotes were hidden, it shows
  neither the line nor the switch (`state.rs` `get_quote`, `unwrap_or(false)`; `CheckIn.tsx`).
- **IV:** no system file is touched.
- **V:** no notification; the quote is asked for only when the check-in opens.
- **VI:** serif line (`CheckIn.tsx`, the `figure`), sans switch, the seven guards clean.
- **VII:** nothing is gated.
- **Versioning and Compatibility:** `quotes_hidden` is `#[serde(default)]` (`src-tauri/src/store/config.rs`), held
  by `stores.rs` `a_configuration_from_before_quotes_could_be_hidden_shows_them`. The contract grew additively.
- **Delivery Method:** RED before GREEN for each increment, recorded in *Done notes* with failure counts. Each
  commit carries its test and its code together, so the RED is attested here rather than visible in history. The
  delivery-adapter MUST (parse, delegate, outcome) is now met for parse and registration. Outcome mapping at the
  command level is Q19.

**Pass 2 (2026-10-01): converged.** The confirming pass re-ran pass 1's mutations against `3ace17d`:
- a key renamed, a command renamed, a handler deleted, and `roll: || 0` each now fail a test;
- one more mutation survived: `shipped_quotes: shipped_categories()`. The host re-ran it and it was still green
  (Q16, MEDIUM);
- two LOW holes in the new wrapper parser (Q17).

There was no new CRITICAL or HIGH. The loop stops here, at its bound of two passes, and the slice goes to its
demo. Not run here: `make smoke`, because port 1420 is held by another terminal's dev server, and the post-converge
`/gaps` as a separate delegate. The two passes' level-by-level findings are what traced the diff.
