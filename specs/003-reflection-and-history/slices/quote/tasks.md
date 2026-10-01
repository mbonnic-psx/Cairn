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
