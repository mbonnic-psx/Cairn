# Plan — slice `quote`

**Feature**: `003-reflection-and-history` | **Slice**: 4 of `story-split.md` | **Date**: 2026-10-01

A person opens the check-in and, at the top of it, may find one quiet line from the set Cairn ships. It is
chosen at random each time the check-in opens and stays the same while it is open. A quiet switch on the
check-in hides quotes, and the choice is remembered; hidden, nothing stands in the quote's place. The check-in
reads as complete either way, whether today held reaches or none, and whether the journal is sealed.

**How this plan was made.** As for `write-tonight` (`../write-tonight/plan.md`): 003 was planned whole before the
delivery method arrived, and `../../plan.md`, `../../research.md`, `../../data-model.md` and `../../contracts/`
are committed and stand. This plan takes this slice's part of them, and of the gaps review
`### Gaps reviewed — slice \`quote\`` in `../../spec.md` (Q1, Q2), and does not repeat them. It does not run Spec
Kit's plan command through the links `/drive` prescribes, because those links would write over the feature's
committed plan (*Complexity Tracking*).

## Scope

In, from `../../tasks.md`: T031 (reading a quote from the bundled set; it lands in a module of its own, see
*Structure Decision*), T032 (`get_quote` only), T033 (that command, plus the two the switch adds), T027 (the
quote half: optional, and absent without degrading). The bundled set itself is T007, done.

Added by the gaps review, so not in the feature's task list: the switch (Q2), as two commands on the
configuration, `get_quotes_shown` and `set_quotes_shown`. They are added to `contracts/ui-ipc.md` additively.

Out: everything of `history`, `one-day` and `theirs`. Editing the set of lines, which is content, not this slice.

Acceptance: US1 scenario 1 (the optional quote); FR-008, FR-009; Q1 and Q2.

## Acceptance, as scenarios through the driving port

Constitution v1.4.0, *Acceptance-Driven Development*: each **When** enters through an IPC command as `AppState`
serves it, or through the check-in screen that calls it, and each **Then** is observed there.

1. **Given** the bundled set and a random source that rolls *k*, **When** `get_quote()` is called, **Then** it
   returns line *k* of the set (mod its length), exactly as shipped (FR-009).
2. **Given** two different rolls on the same date, **When** `get_quote()` is called with each, **Then** the lines
   differ; **and given** one roll on two different dates, **then** the line is the same — it is never tied to the
   date (Q1, R6).
3. **Given** the bundled file is missing, empty or unreadable, **When** `get_quote()` is called, **Then** it
   returns nothing, and that is the whole answer — no sentence, no placeholder (FR-008).
4. **Given** a configuration that has never mentioned quotes, **When** `get_quotes_shown()` is called, **Then**
   it is `true`; **and** a `config.json` written before this slice loads with quotes shown and everything else
   it held intact (*Versioning and Compatibility*: stored contracts change additively).
5. **Given** quotes are shown, **When** `set_quotes_shown(false)` is called, **Then** `get_quotes_shown()` is
   `false` and `get_quote()` returns nothing; **and when** a fresh `AppState` over the same data directory asks,
   **then** they are still hidden (remembered across restarts); **and when** `set_quotes_shown(true)` is called,
   **then** a line comes back (Q2).
6. **Given** the key is unavailable, **When** the quote and the switch are used, **Then** both work as they do
   with the key: the switch is a setting, readable without it (Q2).
7. **Given** a trail, an intent, a pending change and a trusted clock in the configuration, **When**
   `set_quotes_shown` is called, **Then** each of them is unchanged — the switch changes no protection
   (Principle I); **and given** a configuration Cairn cannot read, **then** the switch is refused with a plain
   sentence and the file is byte-identical afterwards (data Cairn cannot read is never overwritten).
8. **Given** the check-in opens with quotes shown, **When** it renders, **Then** one line appears in serif, it is
   asked for once, and it is still the same line after the person saves an entry (Q1: stable while open).
9. **Given** quotes are shown and the set yields nothing, **When** the check-in renders, **Then** there is no
   quote and nothing in its place, and the space to write is there as always (FR-008).
10. **Given** the check-in is open, **When** the person presses *Hide quotes*, **Then** the line goes, nothing
   takes its place, and the switch reads *Show quotes*; **when** they press *Show quotes*, **then** a line
   returns (Q2). **And given** quotes are hidden when it opens, **then** no quote is asked for.
11. **Given** the journal is sealed, **When** the check-in renders, **Then** the quote and its switch show as
   they do on an open day — a quote is not about the day.
12. **Given** any of these states, **When** the text is read, **Then** no banned word appears, and no control
   leads to a protection change (US1 scenario 6, Principle I). The quote appears nowhere but the check-in: its
   wrappers live in `src/ipc/journal.ts`, which an ESLint rule already restricts to the check-in and the single
   day, and `contracts/ui-ipc.md` says the single day does not ask for one.

## Structure Decision

The one deployable this touches is `src-tauri` (the core: IPC, configuration, the bundled resource), with the
screen in `cairn` (the interface); both purposes in `project.json` cover it, and nothing new is a service. One
vocabulary (a check-in, its quote, a setting), so one bounded context, and saying so is the whole decision.

```text
src-tauri/src/
├── domain/quotes.rs         # NEW — choose(lines, roll): the pure choice, the roll passed in
├── domain/mod.rs            # MODIFIED — `pub mod quotes`
├── reflection/quote.rs      # NEW — read the bundled set (any trouble reads as no lines), then choose
├── reflection/mod.rs        # MODIFIED — `quote` always built; `checkin`, `journal` stay behind `history`
├── lib.rs                   # MODIFIED — `reflection` no longer behind `history` as a whole
├── store/config.rs          # MODIFIED — `quotes_hidden: bool`, `#[serde(default)]`: absent reads as shown
├── ipc/state.rs             # MODIFIED — `shipped_quotes`, `roll`; get_quote, get_quotes_shown, set_quotes_shown
├── ipc/commands.rs          # MODIFIED — the three #[tauri::command]s
└── main.rs                  # MODIFIED — the path beside the app, the roll from getrandom, three handlers
src-tauri/tests/
├── quote_choice.rs          # NEW — the domain rule
├── us1_quote.rs             # NEW — scenarios 1–7 through AppState, under --no-default-features
├── stores.rs                # MODIFIED — a pre-slice config.json loads with quotes shown
├── ipc_surface.rs           # MODIFIED — CLASSIFIED 17 → 20, all three `Effect::Reads`
└── (every AppState literal) # MODIFIED — the two new fields: delete_all_data, fail_closed_journal, us1_write_tonight
src/
├── ipc/journal.ts           # MODIFIED — getQuote, getQuotesShown, setQuotesShown
├── screens/CheckIn.tsx      # MODIFIED — the line in serif, the switch, on the open and the sealed check-in
└── screens/__tests__/CheckIn.test.tsx  # MODIFIED — scenarios 8–12
```

`reflection/quote.rs` sits outside the `history` feature because nothing about a quote touches the history: it
works in a build without one, and its tests run under `--no-default-features` with the rest of the core. That is
why T031's "in `checkin.rs`" is not followed to the letter — `checkin.rs` is behind `history`.

**Randomness.** `AppState.roll: fn() -> u64` is supplied the way `now` is, so a test chooses the line. `main.rs`
supplies `getrandom::u64()` (`getrandom` 0.4.3, already a dependency: `src/lib.rs` line 157 in the crate source),
falling back to the clock's sub-second nanoseconds if the system source is unavailable — a quote is not a secret,
and the fallback still varies per opening. The choice itself is `domain::quotes::choose`, which takes the roll as
a value (`check-domain-purity.sh`).

**Where the set is read from.** `resources/quotes/quotes.json` beside the executable, the way
`shipped_categories` finds `resources/categories` (`tauri.conf.json` already bundles `resources/quotes/*.json`,
T007). Read on each `get_quote`, never written, never copied into the person's data (T007's note: the set is read
straight from the bundle). Blank lines in it are not lines.

**The switch is configuration.** `config.json` is plain JSON, readable with no key, and holds no reach data
(`tests/stores.rs`, `configuration_holds_no_reach_data`). A boolean for whether quotes are hidden is a setting of
exactly that kind. It is stored as `quotes_hidden`, default `false`, so a file from before the slice — which has
no such key — means *shown* without a custom default.

**On the screen.** The check-in asks `get_quotes_shown` once when it opens, and `get_quote` once if they are
shown; the line it gets is kept for as long as the check-in is open, including across a hide and a show (Q1). The
line sits under the heading in the serif face, quiet, with no quotation marks or attribution (T007: the lines are
Cairn's own). The switch is a small sans text control at the foot of the check-in, labelled *Hide quotes* or
*Show quotes*. It appears on the sealed check-in too. A switch that cannot be saved leaves the line as it was and
says so in the existing `role="status"` region.

## Constitution Check (v1.4.0)

- **I. The Wall Holds:** the switch changes a setting about the check-in and nothing about protection; scenario
  7 holds every protection field of the configuration unchanged, and the surface test classifies all three
  commands as `Reads`. No quote or switch appears anywhere a blocked request could reach.
- **II. Local-First:** the set is bundled and never fetched (FR-009); no new dependency (`getrandom` was here).
  The setting is a key in the existing plain configuration and carries no reach data.
- **III. Honest About Limits:** a missing set reads as no quote, which is a complete check-in rather than a claim
  about anything; nothing pretends a line is there.
- **IV. Reversible:** no system file is touched. `delete_all_data` already removes `config.json`.
- **V. Reflection at Distance:** no notification; the quote is reached only by opening the check-in.
- **VI. Voice:** the bundled lines already pass `check-banned-words.mjs` (it scans `src-tauri/resources`) and R6's
  review (T007). The switch names what it does in plain words. Serif for the line, sans for the switch. No count,
  streak or chain (`check-no-streaks.mjs`, `check-no-ambient-counts.mjs`).
- **VII. Free:** nothing is gated.
- **Versioning and Compatibility:** the configuration and the IPC contract change additively; scenario 4 holds an
  older `config.json`.
- **Delivery Method:** trunk-based on `slice/quote`, increments committed locally; each increment RED observed
  before GREEN; scenarios through `AppState` and the screen; the delivery adapters are one-line wrappers whose
  parse, delegate and outcome mapping the scenario and surface tests cover, with the choice proved in `domain/`.

## Pin

This slice changes code that was here: `store/config.rs`, `ipc/state.rs`, `ipc/commands.rs`, `main.rs`,
`lib.rs`. The behaviours at those seams it must not change, and what pins each:

- the exposed command surface and each command's effect on protection — `src-tauri/tests/ipc_surface.rs`, already
  in `delivery/survey/pinned.md`;
- the application starting — `scripts/smoke.sh app` (`make smoke`), already in the ledger, because `main.rs` and
  `AppState` change;
- **an older `config.json` still loading, with nothing it held lost** — `src-tauri/tests/stores.rs`
  (`a_configuration_from_the_announcement_era_still_loads`, `configuration_survives_a_round_trip`,
  `configuration_holds_no_reach_data`). Green before this slice, and this slice adds a case beside them. It is
  **not yet a row** in `delivery/survey/pinned.md`, and that ledger is under `delivery/`, which a slice does not
  write (*the shared-surface rule*). The row is handed back to the host to add on `main`:
  `| 2026-10-01 | An older config.json loads, unknown keys tolerated, nothing it held lost | ConfigStore::load (store/config.rs) | stores | cd src-tauri && cargo test -p cairn --no-default-features --test stores |`.

`CheckIn.tsx` and `src/ipc/journal.ts` were generated under the method (`write-tonight`); their tests are their pin.

## Complexity Tracking

| Deviation | Why | What was done instead |
|---|---|---|
| The plan and tasks were not produced by Spec Kit's commands through `/drive`'s links | `specs/003-…/plan.md` and `tasks.md` are committed feature-level files from before adoption, and the links would write over them | This slice's plan and tasks were written under `slices/quote/` from the committed feature plan, which they cite rather than restate — as `write-tonight` did |
| T031 places the reading in `reflection/checkin.rs` | `checkin.rs` is behind the `history` feature, and a quote has nothing to do with the history | `reflection/quote.rs`, built in every configuration |
| The pin ledger row for the configuration's load is not written here | `delivery/survey/pinned.md` is outside a slice's write surface | The tests that pin it are named above, with the row for the host to add |
