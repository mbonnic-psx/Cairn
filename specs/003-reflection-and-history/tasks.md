---

description: "Task list for the evening check-in and honest history"
---

# Tasks: The Evening Check-in and Honest History

**Input**: Design documents from `/specs/003-reflection-and-history/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included and **not optional**. Two of this slice's guarantees exist only as tests.
The once-per-day announcement bound replaces an absent capability that slice `002` could
prove by inspection, and the no-residue property of deletion cannot be seen by reading the
code at all. Test tasks here are requirements, not a chosen style.

**Slice `002` is a prerequisite**, not a parallel effort. This slice reads the reaches, gaps,
encryption key, and reach mode it produced.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are given in each task

## Path Conventions

Per [plan.md](./plan.md), unchanged from slice `002`:

- `src-tauri/src/domain/` — pure, no I/O, no platform conditionals
- `src-tauri/src/` — the unelevated app: stores, orchestration, IPC
- `src/` — React frontend
- `src-tauri/tests/` — integration and property tests
- `scripts/` — the constitutional guards

**No task in this slice touches `src-tauri/helper/`.** This slice makes no privileged write.

---

## Phase 1: Setup — the guards, before the code they govern

**Purpose**: Four standing guards must change. Doing this first means every later task is
written against the constraints that will judge it, rather than discovering them at review.

**⚠️ A widened guard that forbids less than before is a defect, not a trade-off.** Each
modified guard must end up forbidding more.

- [X] T001 **SPIKE (R1) — RESOLVED, GO (2026-08-27).** `scripts/check-no-network-deps.sh` reported `no-network-deps: clean on 3 desktop targets` from all three Core runners with `tauri-plugin-notification` in the tree; the full workspace suite and the privileged acceptance runs passed unchanged. Measured by pushing to a throwaway branch and letting CI resolve the graph, since no local cargo was needed. Recorded in `specs/003-reflection-and-history/research.md`. **T004, T005, and T028 are unblocked.** The dependency declaration itself lands in T005 rather than here — see the note below
- [X] T002 [P] **DONE (2026-08-27).** Extended the ambient-counts guard in `scripts/check-no-ambient-counts.mjs`. It now states three rules where it stated one: reach data on the four navigated-to screens and declarable in `src/ipc/`; ambient surfaces (badge, tray, taskbar overlay, dock progress) forbidden **everywhere with no exemption**; and the shell — `App.tsx`, `main.tsx`, `components/` — barred from reach data under any name. Verified against ten planted cases, seven that must fail and three that must pass. **Found and closed a pre-existing hole**: the old check exempted its one allowed screen from *every* rule at once, so `navigator.setAppBadge(3)` inside `Reaches.tsx` passed — confirmed by planting it. Widening the allowlist to four screens would have multiplied that hole rather than closing it. Also renamed the `get_day` frontend wrapper to `getDayView` in `contracts/ui-ipc.md`, because `getDay` is a `Date` method and guarding the short name would false-positive on every date calculation
- [X] T003 [P] **DONE (2026-08-27).** Extended the reach-data import restriction in `eslint.config.js`. Verified against nine cases, six that must fail and three that must pass. **Two pre-existing holes found and closed, and one addition beyond the task as written:** (a) the restriction listed literal specifiers `../ipc/reaches` and `./ipc/reaches`, so anything nested deeper walked past it — `src/screens/Setup/` imports at `../../ipc/reaches` and already exists, and `Reaches.test.tsx` had been slipping through unnoticed; it is now a glob. (b) The allowlist was `rules: { 'no-restricted-imports': 'off' }`, which exempted `Reaches.tsx` from every restriction that would ever be added rather than the one it needed — the same shape as T002's badge hole; the allowlisted screens now re-declare the rule minus one group. (c) **Added `**/ipc/journal` to the restriction**, allowlisted to the check-in and a single day only. Not in the task text, but `src/ipc/journal.ts` arrives in T034 and no other task restricts it, so leaving it would have shipped the most private data in the product with no import rule at all
- [X] T004 **DONE (2026-08-27).** The `no-restricted-syntax` rule turned out to have **no exemption to narrow** — it was global already. So the work was the reverse: make it say the narrower thing precisely rather than the broad thing loosely, since "no notifications at all" stops being true here. It now forbids three browser routes — `new Notification`, `Notification.requestPermission`, and service-worker `showNotification` — **everywhere including `src/announce.ts`**, because none of them is how Cairn announces and each asks for a permission Cairn has no use for. The announcement itself is an *import* restriction: `@tauri-apps/plugin-notification` is permitted in `src/announce.ts` and nowhere else, and that file stays barred from reaches and journal entries because the announcement carries neither. Verified against the full 17-case matrix. **Found and fixed a hole introduced one task earlier**: T003 left `CheckIn.tsx`/`Day.tsx` as `'no-restricted-imports': 'off'` with a comment warning that a third restricted module would need handling there — T004 added a third, and it inherited the exemption silently. Both blocks now re-declare what still applies. Never `off`, always re-declare
- [X] T005 **DONE (2026-08-27).** Rewrote `scripts/check-no-notifications.sh` and declared the dependency in `src-tauri/Cargo.toml` — optional and gated behind `app`, so the pure layers keep building with `--no-default-features`. The guard no longer establishes the once-a-day bound; it cannot, and its header now says so and points at the tests that do. What it checks instead is everything that would make that proof meaningless. Six rules: the browser routes and ambient surfaces forbidden everywhere; the plugin importable from exactly one module, which **must reference `announce_check_in_if_due`** — a module that can notify but never asks is deciding for itself; no send call outside it; at most one capability file declaring a notification permission; **the privileged helper may never notify, at all** — it is elevated and deliberately has no channel to the interface; and the dependency must stay optional and gated. Verified against 13 cases. **The first draft false-positived immediately** on a helper test comment asserting repair sends no notification — the same trap the slice `002` version warned about in its own header. Line comments are now stripped before matching, and the helper check targets dependency declarations and real identifiers rather than the word

- [X] T006 [P] **DONE (2026-08-28).** Added three permissions to `src-tauri/capabilities/default.json` — `notification:allow-notify`, `notification:allow-is-permission-granted`, `notification:allow-request-permission` — and rewrote the `description`, which had claimed no notification permission of any kind. The plugin defines sixteen and bundles all of them into `notification:default`; that bundle is **deliberately not used**, because it grants scheduling management, action buttons, listeners, batching, and inspection of what the system is holding. The description now names what each refusal buys: no `batch` means no second notice in the same breath, no `register-action-types`/`register-listener` means the notice carries no buttons and so cannot become a route to anything, no `get-active`/`remove-active`/`cancel`/`get-pending` means Cairn neither inspects nor manages what the system is holding. **Two rules added to `scripts/check-no-notifications.sh` beyond the task as written**, because narrowing once is a decision and only a check makes it an invariant: rule 7 asserts every held `notification:*` permission is one of the three, and rule 8 bars scheduling — the plugin's `send` takes a `schedule` option whose `interval` and `every` variants are the escalation FR-004 forbids in the plainest possible form, and whose `at` variant fires without passing the decision that makes an announcement legitimate. Rule 7 verified by planting `notification:default`, which fails with `holds notification:default`. **Rule 8 is inert and therefore unverified**: it is scoped to `src/announce.ts`, which T035 creates, so the `[ -f ]` test skips it entirely today. Scoped narrowly on purpose — "schedule" is an ordinary word here, protection schedules are a v1 feature, and a guard that fires on the wrong `Schedule` gets edited into uselessness. The note is recorded in the guard itself; **T035 owes it a planted violation**. Also reordered the file so its blocks read 1–8 in sequence — the two new ones had landed between rules 4 and 5. Rules 1–6 were not edited; the diff is pure addition
- [X] T007 [P] **DONE (2026-08-28).** Twenty-four lines in `src-tauri/resources/quotes/quotes.json`, registered as `resources/quotes/*.json` beside the category seeds. **They are original observational lines, not attributed quotations** — `get_quote()` returns a bare `string | null` with nowhere to put an attribution, and bundling real quotations would drag copyright into shipped content for no gain. Seven of the first draft's lines were rejected on review and rewritten. Two named devices — a bright phone screen in a dark room, and a laptop "just a rectangle until it's opened again" — which is not neutral observation when the line is shown at the evening check-in to someone recovering from compulsive online behavior; the second described the exact act. One had a dog "waiting by a door for someone to notice", which is reproach wearing the grammar of observation. One kept the shape of a head in a pillow "after it's gone". One ended "both are fine", which is Cairn delivering a verdict on how the day went. One offered stars behind cloud, and a metaphor invites the person to decode it into that same verdict — R6 wants the register literal. One was redundant. **The `note` field also claimed coverage the product does not have**: it said the file is copied into the person's own data on first run and never written over, which is true of the category seeds (`main.rs` copies those) and specified nowhere for quotes — T031 reads straight from the bundle. Cut, per Principle III
- [X] T008 **DONE (2026-08-28).** Re-ran the standing matrix — T008 requires it whenever an allowlist or a restricted module changes, and T006 changed the guard. All four modified guards still pass. **Rule 7 given four planted cases**, three failing and one control passing: `notification:default` substituted in, `allow-batch` added as a fourth, `allow-cancel` added as a fourth, and the three real permissions as the control. The capability file was restored byte-for-byte between cases and the checksum matched across the sweep. **Rule 8 could not be verified for real, and the record says so.** It is scoped to `src/announce.ts`, which T035 creates, so the `[ -f ]` test is false and the block is skipped entirely — the rule cannot fire in the tree as it stands. Its *logic* was demonstrated against two throwaway copies of that file, one scheduling two ways and one not, both deleted immediately; `git status` confirms nothing was left at that path. **T035 owes rule 8 a real planted violation.** Also corrected a row that had gone stale: the table still said the rewritten guard needed its own planted violation, which T005's 13 cases had already supplied, and split that row to scope it to rules 1–6. Recorded two standing limitations rather than leaving them to be rediscovered: `npm run check` halts at `check:no-network-deps` with no cargo on `PATH`, so the other checks were run individually; and `eslint` over the whole repository flags `no-undef` in `scripts/*.mjs`, which predates the slice and reaches neither `npm run lint` — scoped to `eslint src` — nor CI
- [X] T009 [P] **DONE (2026-08-28).** **Deliberately did not name the new test files.** Nine of them arrive in phases 2–5 and do not exist yet; cargo discovers everything in `src-tauri/tests/` and vitest discovers `*.test.tsx` on their own, so a `--test` argument buys nothing and one naming a file that does not exist breaks CI on this commit for every later task in the slice. The correct reading of the task is that the invocations which will pick them up must exist and be right — and one did not. The `domain` job runs `--no-default-features`, which excludes `history` and so never compiles anything behind `#[cfg(feature = "history")]`; the `core` job reaches it only through the full GUI toolchain. This slice puts the journal and estimate stores behind `history`, and `history` is a separate feature precisely so the store is provable without a GUI toolchain, so two steps were added to `domain`: `cargo clippy -p cairn --no-default-features --features history --all-targets` and `cargo test -p cairn --no-default-features --features history`. Frontend needed nothing — `npm test` is `vitest run` with no restricting config. **Also corrected a CI step name that had gone half-false.** It read `No notification capability (FR-023, SC-007)`, and Cairn now holds three narrowly-scoped permissions, so the claim no longer held. On checking the citations: v1 `FR-023` — *never display anything at the moment of a reach* — is real and **still enforced** by rules 1 and 2, so it was kept; v1 `SC-007` is *zero bytes of user data leave the machine*, the no-network criterion, and was a mis-citation from the start, so it was dropped. The replacement states both halves. Note the two numbering spaces collide — slice `003` has its own unrelated FR-023 — so the slice's numbers are written `003 FR-002/FR-004/FR-005` and the v1 number stays bare, matching the convention every other step name in the file already uses

**Checkpoint**: `npm run check` passes, every modified guard has been proven to fail on a
planted violation, and the streak guard is untouched.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure arithmetic both stories depend on, the storage both stories write
through, and the one platform seam. Tests come before implementations here, from the property
tables fixed in [contracts/patterns.md](./contracts/patterns.md), so they cannot be shaped
around an implementation's mistakes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### The pure layer

- [X] **T009a — `domain/dates.rs`, added beyond the task list (2026-08-28).** `contracts/patterns.md` types both new signatures with `LocalDate`, and no such type existed anywhere in the tree. It is needed by `patterns.rs`, by `checkin.rs`, and by the store, so it got its own module rather than hiding inside one of them. It is a **calendar date, not a day-number newtype**, because `data-model.md` lines 37–39 fix that: a day is a local calendar date because that is what an entry *is*, and "Tuesday's entry" must survive the person moving timezones where a stored instant would drift a day either way. Hinnant's `days_from_civil`/`civil_from_days` with `div_euclid`/`rem_euclid` throughout, correct for pre-epoch dates; `YYYY-MM-DD` text form round-tripping through serde; 23 tests with every expected value derived from the calendar rather than from the code. **Two corrections at review.** `weekday()` first returned the raw epoch remainder, so 0 meant Thursday — 1970-01-01 was a Thursday. No spec anywhere defines what 0 means, so T045 would have assumed Monday or Sunday, nothing would have crashed, and every bar in the by-day-of-week breakdown would have read three days wrong while still looking plausible. It now returns **0 = Monday** (ISO 8601, zero-based), with the epoch fact kept in the doc as the basis of the correction, and a note that where a week visually starts is the interface's choice and not this layer's. Second, `check:no-streaks` fired on two doc comments — `/\bday\s+\d/` caught "day 32" and "day 0". **Reworded the comments; the guard was not touched.** `domain/` is exactly where a real day counter would appear, so an exemption there would be a hole for the thing the rule exists to stop
- [X] T010 [P] **DONE (2026-08-28).** 12 tests in `src-tauri/tests/patterns.rs`, written before any implementation and by a different agent than T012. **It settled two semantics the contract left open, and documented both in the file.** Range membership is tested on the raw `at` (`from <= at < to`), never on `at + offset` — this is not a preference, it is forced by property 4: if the offset decided membership, changing the offset would change the total, and property 4 says the total never changes. `by_site` is ordered descending by count with ties ascending by domain, because the contract says ordering is specified rather than incidental so the interface never reorders on refresh. No test rebuilds the bucketing arithmetic to check it against itself — every assertion is a structural invariant, an equality across two calls, or a comparison against a plain filter over inputs the test built by hand. Ended red for exactly one reason: `unresolved import cairn::domain::patterns`
- [X] T011 [P] **DONE (2026-08-28).** 14 tests in `src-tauri/tests/checkin_due.rs` — four proptest sweeps and ten examples — written before any implementation existed and by a different agent than T013, deliberately: this decision is what the rewritten notification guard leans on, and the property tables only judge an implementation if the person writing them is not the person writing the code. Property 1 is swept rather than sampled, since it is the durability guarantee for the whole feature: with `last_announced == Some(day)`, false at every 37th second across a full day for four representative hours, and across a proptest range spanning pre- and post-epoch days. Boundaries where an off-by-one lives are examples: the exact instant the hour arrives is due and the second before is not, the final second of the day is still due, the first second of the next is not, `chosen_hour` 0 and 23, and a `last_announced` on a different date does not suppress today. Ended red for exactly one reason — `unresolved import cairn::domain::checkin`, no error of its own
- [X] T012 **DONE (2026-08-28).** `src-tauri/src/domain/patterns.rs`; all 12 of T010's tests green without touching them, and proptest found no counterexample. `div_euclid`/`rem_euclid` throughout, with a private `shift` that widens `offset_seconds` to `i64` and saturates before adding. The local-day window is computed from `from`/`to` rather than from the reaches, which is what lets `by_hour`, `by_weekday` and `by_day` come back zero-filled on an empty range (FR-024) and lets `estimates_excluded` be counted whether or not any reach exists. The weekday bucket goes through `LocalDate::weekday()` so the Monday-versus-Thursday-epoch correction lives in exactly one place. **Added a sixth row to the `domain/mod.rs` table**, whose citation was weak on first pass — FR-019/FR-020 only say breakdowns exist. It now cites what would actually break: an estimate never fills a reach-derived bucket and its exclusion is stated rather than silent (FR-023, SC-008; III). The prose count was also left saying five with six rows present, and was corrected
- [X] T013 **DONE (2026-08-28).** `src-tauri/src/domain/checkin.rs`; all 14 of T011's tests green without touching them. **Both bounds use `saturating_add`, and saturate the same way on purpose.** `chosen_hour` is capped at 23 so the hour arithmetic cannot overflow alone, but adding it — or a day's length — to a caller-supplied `day_start` near `i64::MAX` can. Saturating `due_at` and `day_end` identically means that at the ceiling the `[due_at, day_end)` window closes to empty and the answer is `false`, rather than a panic or a `true` read off a wrapped bound. **Added a fifth row to the `domain/mod.rs` table** of constitution-critical functions, citing Principle V. It also caught that the table's intro cited `data-model.md`, which lists only feature 002's four, so the citation was split rather than left to silently overclaim a fifth — the table is a claim about what guards what, not decoration
- [X] T014 [P] **DONE (2026-08-28), and it exposed a defect in `contracts/ui-ipc.md`.** The contract declares `summarize_reaches(from, to, offset_seconds) -> Patterns` with `dst_approximate` in the result. **A single offset cannot reveal a change in offset.** The pure layer may not read a clock or consult a timezone database — that is the whole of R4 — so no code in Rust can tell from one `offset_seconds` whether the range crossed a transition. Returning `false` would have been the easy path and is exactly the dishonesty Principle III forbids: a `false` that means *could not tell*. Built instead as a separate pure predicate, `crosses_offset_change(offset_at_from, offset_at_to)`, which the interface can answer because the frontend holds the real timezone rules the pure layer is denied. **`summarize`'s signature was not changed**, so T010's fixed test contract survives, and **no `dst_approximate` field was put on the domain `Patterns`** — a field the producer cannot populate is a trap for the next reader. The struct now carries a note that the domain and IPC `Patterns` are deliberately different shapes, since the IPC one also carries `gaps` and `sealed` from the orchestration layer. Three tests: equal offsets false including at `i32` extremes, differing offsets true, and the sign of the difference irrelevant — spring forward and autumn back are both approximations
- [X] T015 **DONE (2026-08-29).** `domain purity: clean (src-tauri/src/domain)` with `dates.rs`, `checkin.rs`, and `patterns.rs` all present. Worth recording that the guard greps text rather than parsing, so it also fires on the platform-conditional macro name written inside a doc comment — `dates.rs` hit exactly that during T009a and the comment was reworded rather than the guard touched. Full sweep at this checkpoint: 27 test binaries green, zero failures, `cargo clippy --all-targets -D warnings` clean, `cargo fmt --all --check` clean, and all seven guards clean including `check-no-network-deps`, which runs locally now that the toolchain is installed

### Storage

- [X] T016 [P] **DONE (2026-08-31).** 19 tests in `src-tauri/tests/journal_store.rs`, written before the store existed and by a different agent than T017–T019. **The `written_at` and no-site-no-hour properties are proved by exhaustive destructure** — `let JournalEntry { day, text } = entry;` with no `..` — so the day anyone adds a third field the test stops *compiling*. That is stronger than any runtime assertion, which can only fail to look at a field rather than prove it absent. Replace-on-save is checked three ways: the text itself, the column list, and `table_names()` over the whole database, so a shadow table holding a previous version cannot slip in unseen. **Judgment call recorded rather than made silently**: FR-014 says only that an empty entry is not stored, so whitespace-only text is read as empty too, with the reasoning written into the file. Ended red for exactly the right reasons — two unresolved types and nine missing methods
- [X] T017 **DONE (2026-08-31).** Both tables inside the existing `CREATE TABLE IF NOT EXISTS` batch, same store, same key — encryption is not opt-out and nothing here changes that. `day` is `LocalDate`'s `YYYY-MM-DD` form, which sorts in calendar order as text. `written_at` is stored as a column and appears in no type: `JournalEntry` is exactly `day` and `text`, so a read has no path to construct one. Save is a real upsert on the `day` primary key — one row per day, no version column, no soft-delete flag, no shadow table. All 19 of T016's tests green without touching them
- [X] T018 **DONE (2026-08-31).** Generalized the *mechanics* rather than the key type. Reaches and gaps are keyed by epoch seconds, entries and estimates by `LocalDate`-as-text, and forcing one key type on both would have meant a lossy conversion. Instead a private generic `select_range<K: ToSql, T>` carries prepare, bind, map and error-collapse once, and each of the four reads supplies its own SQL, key type and row shape. `between` and `gaps_between` keep their signatures, so every existing caller is untouched, and there is no second way to ask the same question. The three range predicates are named constants, which is what let T019 delete against the exact string a read matches on
- [X] T019 **DONE (2026-08-31), after reversing the gap semantic at review.** Day and range go through `delete_reach_history(from, to)`; all-of-it is its own unconditional method rather than a sentinel range, which avoids `i64::MAX` games. Both tables move inside one transaction, so a mid-failure cannot strand reaches without their gaps. Returns `Result<(), Trouble>` with a unit payload — never a count, never a summary (FR-018b): reporting what was removed puts a reach count outside the Reaches screen at the worst possible moment, just after someone chose to let something go. **The first implementation deleted whole any gap overlapping the range, and that was wrong.** It was chosen for read/delete symmetry, but consider a gap running 1–31 January and a person deleting 15 January alone: the whole gap vanishes and 1–14 and 16–31 then read as *covered*, so Cairn claims a fortnight of watching it never did — the precise claim Principle III forbids, manufactured for a period nobody asked to remove. `data-model.md` bounds the removal twice, to *within the range the person chose* and on a justification it calls *narrow*. FR-018a forbids residue **of the deletion**, and a surviving gap outside the range is not residue; it is a pre-existing fact. **Gaps are now clipped**, branchlessly: a front segment and a back segment each decide independently whether they exist, which collapses all five geometries — including a gap strictly containing the range **splitting into two** — into two `if`s with no case to overlook. **Added `src-tauri/tests/us4_deletion.rs` early** (the file T063 is already slated to use, headed with a note that it covers clipping only) with 9 tests asserting on what `gaps_between` returns rather than on rows. Deletion's hardest proofs — no-residue, independence, retention — remain T059–T063
- [X] T020 [P] **DONE (2026-08-28).** `evening_hour: u8` defaulting to 21, `announce_check_in: bool` defaulting to true, `last_announced_day: Option<LocalDate>` defaulting to none. **`Default` was removed from the derive and written by hand**, because `evening_hour`'s intended default is 21 and `u8`'s primitive default is 0 — deriving it would have let `Config::default()` and a freshly-loaded slice `002` file disagree by construction. Both paths now call the same two named default functions, so they cannot drift. Matches the file's existing habit: `ReachModeSetting` already hand-writes `Default` for the same kind of reason. `last_announced_day` carries a comment recording why it sits in plain configuration rather than encrypted history — `data-model.md` line 17: it must survive the key being unavailable, or a sealed history would re-announce on a date that already had one, in exactly the situation where the product is already having a bad day
- [X] T021 [P] **DONE (2026-08-28).** `configuration_holds_no_reach_data` still passes unchanged, 10/10 in `tests/stores.rs`, and a new `a_slice_002_configuration_loads_unchanged` proves the backward compatibility T020 claims: it builds a non-default config, serializes it, **asserts each of the three new keys is present before deleting it** so the fixture cannot silently degrade, writes that slice-`002`-shaped JSON to the real file the store reads, and asserts the load round-trips. **Recorded finding, deliberately not fixed here.** The existing test is narrower than it looks: it exact-matches six key names — `reaches`, `history`, `visits`, `visited`, `attempts`, `gaps` — at any depth, and inspects no types. A field named `reach_count`, `domain_log`, or `site_timestamps` would carry reach data straight past it, and `data-model.md` counts a day-level estimate as reach data whatever its provenance. It is a tripwire for one vocabulary, not a proof of the property. Left as-is because T021 is a confirmation and strengthening it silently would hide the finding; **it wants its own task**

### The platform seam

- [X] T022 [P] **DONE (2026-08-28).** `AnnounceService` in `src-tauri/src/services/mod.rs`, 31 lines, pure addition. `capability()` for structural incapacity and `announce(&title, &body) -> Outcome<Announced>` for the attempt, reusing the existing `Capability`/`Outcome` types rather than inventing parallel ones. **The return type is deliberately not a bool.** `Announced::Accepted` means the platform took the notification, not that anyone saw it — permission can be granted and do-not-disturb can still swallow it, or no notification daemon may be listening. Cairn cannot see past the platform's own delivery, and Principle III forbids reporting intended state as verified state, so the doc comment says so outright rather than letting a `true` imply a guarantee. `Declined { because }` covers permission withheld; a platform with no notification surface at all answers through `Capability::Unsupported` instead. The trait carries **no schedule, no id, and no way to cancel or list** what came before — it can do nothing the call does not name, matching the three permissions T006 declared rather than the plugin's sixteen. No test double was needed: the existing convention defines fakes inline in the test files that want them, not here. **Note for T023**: the `because` strings it writes are the first user-facing copy on this path and land under `check-banned-words`, so *denied* is unavailable — the platform refusing is not the person doing anything
- [X] T023 **DONE (2026-08-31).** `AnnounceService` for all three platforms in `src-tauri/src/platform/announce.rs`, plus `src-tauri/tests/announce_service.rs` (5 tests). **The platform conditional turned out to be unnecessary rather than merely hidden**: the three types are ordinary Rust compiled everywhere, and the one real per-OS behaviour — Linux's daemon probe — lives inside a method body, not behind a compile-time gate. **The feature gating splits inside the types, not at the module.** The plugin is optional behind `app` so the pure layers keep building with no GUI toolchain, and CI's domain job depends on that directly, so construction and `capability()` are unconditional while `announce()` calls a private `raise()` with two bodies: the real one under `app`, and under `not(app)` an honest error saying there is no window to raise anything through. No stub pretends to have tried. **Linux is the honest-limits case**: it probes for a session bus and asks the bus whether anything owns `org.freedesktop.Notifications`, answering `Capability::Unsupported` when nothing does rather than guessing `Available`. It shells out rather than adding a client library, matching what `linux/elevation.rs` and `windows/elevation.rs` already do. The probe is a swappable function so tests are deterministic — the agent deliberately did **not** assert on the live probe, since this sandbox has a session bus with no notification owner and such a test would pass here and flake elsewhere. Permission is requested at most once and anything short of granted is `Declined`, never an error: that is the platform answering, not Cairn failing. A genuine fault in the call is `Err` instead, because that is Cairn not managing to ask at all. **Copy avoids *denied*** — the platform withholding permission is not the person doing anything — and every string ends by saying the check-in is still there whenever they open Cairn. **⚠ The `app`-gated body has never been compiled anywhere.** Building with `app` needs the GUI toolchain, which this machine does not have; the plugin API was written against the published 2.3.3 docs. CI's `core` job runs `cargo test --workspace` with default features and will be the first thing to compile it — **treat the next push as the real check on that path**

**Checkpoint**: The pure arithmetic is proven by property test, the store round-trips entries
and estimates under encryption, and `cargo test -p cairn --no-default-features` passes with no
GUI toolchain and no database.

**Checkpoint met (2026-08-31), verified locally rather than deferred to CI.** 30 test binaries
green under `--no-default-features` and under `--features history`, zero failures; `cargo clippy
--all-targets -- -D warnings` and `cargo fmt --all --check` clean on both feature sets; all seven
guards clean, `check-no-network-deps` included — it runs locally now that a toolchain is installed
and independently reproduces T001's CI-only result with the notification plugin resolved in the
graph. Two things this checkpoint does **not** cover: the `app`-gated announcement body, which no
build on this machine can compile (T023), and deletion's no-residue, independence and retention
proofs, which are T059–T063. `src-tauri/Cargo.lock` also carries 197 new lines — T005 declared
`tauri-plugin-notification` when no cargo existed to resolve it, and the tree now holds two major
versions of `zbus` as a result. CI never passes `--locked`, so a stale lockfile would have resolved
differently per runner rather than failing; it belongs in the same commit as the code that caused it.

---

## Phase 3: User Story 1 — The evening check-in (Priority: P1) 🎯 MVP

**Goal**: One quiet announcement at the chosen hour, opening onto today's reaches, a space to
write, and perhaps a quote — with nothing else in the day interrupting anyone.

**Independent Test**: Set the hour a few minutes ahead, wait, and get exactly one
notification. Open the check-in, write an entry, save, reopen — the text is intact. Restart
the app and get no second announcement for the day.

### Tests for User Story 1

- [ ] T024 [P] [US1] Write the end-to-end announcement test — called any number of times across a day, at most one announcement is produced, and none before the hour or after the day ends — in `src-tauri/tests/us1_announcement.rs` (SC-001, SC-002)
- [ ] T025 [P] [US1] Write the durability test proving the announcement record survives a restart, so a reopened window cannot produce a second notice, in `src-tauri/tests/us1_announcement.rs` (research R2)
- [ ] T026 [P] [US1] Write the test proving the journaling space is refused rather than offered when the key is unavailable, and that nothing is written, in `src-tauri/tests/fail_closed_journal.rs` (research R5, FR-029)
- [ ] T027 [P] [US1] Write the screen tests for the check-in — reaches shown, entry saved and reopened, quote optional and absent without degrading, no banned words — in `src/screens/__tests__/CheckIn.test.tsx`

### Implementation for User Story 1

- [ ] T028 [US1] Implement the announcement orchestration in `src-tauri/src/reflection/mod.rs` and `src-tauri/src/reflection/checkin.rs`: call the pure decision, **record the answer before raising**, then return it (research R2). Depends on T001
- [ ] T029 [US1] Implement assembling a day — reaches, gaps, coverage note, entry, sealed sentence — into the `DayView` of `contracts/ui-ipc.md` in `src-tauri/src/reflection/checkin.rs` (FR-008, FR-021)
- [ ] T030 [US1] Implement saving a journal entry in `src-tauri/src/reflection/journal.rs`, refusing empty text and refusing outright when the key is unavailable (FR-014, FR-015, FR-029)
- [ ] T031 [US1] Implement reading a quote from the bundled set in `src-tauri/src/reflection/checkin.rs`, returning nothing as a valid complete answer (FR-008, FR-009)
- [ ] T032 [US1] Expose `get_day`, `get_quote`, `save_journal_entry`, `announce_check_in_if_due`, `get_check_in_settings`, `set_evening_hour`, and `set_announce_check_in` in `src-tauri/src/ipc/commands.rs` and `src-tauri/src/ipc/state.rs`
- [ ] T033 [US1] Add all seven new commands to the `CLASSIFIED` array in `src-tauri/tests/ipc_surface.rs`, growing its fixed size, each classified as having no effect on protection
- [ ] T034 [P] [US1] Add the typed command wrappers in `src/ipc/journal.ts`, and extend `src/ipc/reaches.ts` with the range read
- [ ] T035 [US1] Implement the one module permitted to raise a notification in `src/announce.ts`, polling the decision command and rendering nothing itself. Add `@tauri-apps/plugin-notification` to `package.json` **and update `package-lock.json` in the same commit** — `npm ci` fails on a lockfile that disagrees, and CI runs `npm ci`
- [ ] T036 [US1] Build the check-in screen in `src/screens/CheckIn.tsx` — serif for the reflective surface, today's reaches, the journaling space, the optional quote. **No route to any protection change may appear here** (plan.md, Principle I)
- [ ] T037 [P] [US1] Build the evening hour and announcement switch in `src/screens/Settings/EveningHour.tsx`, stating that the reminder needs Cairn to be running (Complexity Tracking C1, Principle III)
- [ ] T038 [US1] Wire the check-in and settings destinations into `src/App.tsx` **without putting reach data, a count, or a hint in the shell** (FR-033)

**Checkpoint**: The evening ritual works end to end. `npm run check` still passes, including
the rewritten notification guard.

---

## Phase 4: User Story 2 — Seeing the pattern (Priority: P2)

**Goal**: Reaches read by site, by hour of day, by day of week, and as movement over a range
the person chooses — fully available with zero journal entries written.

**Independent Test**: Seed four weeks of history, open the history view, break down all three
ways, change the range. Everything works with no entries in existence.

### Tests for User Story 2

- [ ] T039 [P] [US2] Write the test proving every breakdown is fully available with zero journal entries present, in `src-tauri/tests/us2_patterns.rs` (FR-019, spec US2 scenario 3)
- [ ] T040 [P] [US2] Write the test proving a range with no reaches returns zero-filled buckets rather than nothing, so the interface can render a quiet range, in `src-tauri/tests/us2_patterns.rs` (FR-024)
- [ ] T041 [P] [US2] Write the at-scale test measuring summary cost at 10,000 entries and two years of seeded history in `src-tauri/tests/patterns_at_scale.rs`, following slice `002`'s habit of measuring Cairn's own cost so an accidentally quadratic path cannot hide behind an unresolved spike (SC-006)
- [ ] T042 [P] [US2] Write the screen tests for the history view — all three breakdowns, range change, no streak or day-count surface — in `src/screens/__tests__/History.test.tsx` (FR-033)

### Implementation for User Story 2

- [ ] T043 [US2] Implement the summary orchestration over the range read in `src-tauri/src/reflection/mod.rs`, delegating all arithmetic to `domain/patterns.rs` (FR-019, FR-020)
- [ ] T044 [US2] Expose `summarize_reaches` in `src-tauri/src/ipc/commands.rs`, returning `estimates_excluded` as a count so the exclusion can be stated rather than implied, and add it to `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs`. **⚠ Contract defect found at T014, resolve here.** `contracts/ui-ipc.md` types this command as `summarize_reaches(from, to, offset_seconds)` and expects `dst_approximate` in the result, but one offset cannot reveal a change in offset and the pure layer may not consult a timezone database (R4). **The signature needs a second offset** — `(from, to, offset_at_from, offset_at_to)` — with this command calling `domain::patterns::crosses_offset_change` on the pair and passing whichever offset the product deems authoritative into `summarize` for the bucketing itself. Amend `contracts/ui-ipc.md` as part of this task rather than leaving the contract describing something unbuildable
- [ ] T045 [US2] Build the history view in `src/screens/History.tsx` — by site, by hour, by day of week, movement across the range, and the range control (FR-019, FR-020)
- [ ] T046 [P] [US2] Render the DST approximation notice in `src/screens/History.tsx` when the range crosses a change, rather than presenting the buckets as exact (research R4, Principle III)
- [ ] T047 [P] [US2] Write the copy for a quiet range in `src/screens/History.tsx` so it reads as neither an achievement nor a warning (FR-024, FR-032)

**Checkpoint**: Patterns are readable independently of anything written in the check-in.

---

## Phase 5: User Story 3 — A day, whole and honest (Priority: P2)

**Goal**: One day read truthfully — its reaches, its writing, its gaps, its estimate if it was
silent, and its skipped-ness if it was skipped. No count presented as more complete than it is.

**Independent Test**: Seed four days — one with reaches and an entry, one with a gap, one
silent, one skipped — and open each. All four read truthfully with no guilt language.

### Tests for User Story 3

- [ ] T048 [P] [US3] Write the test proving a gap is shown beside any count covering it and a count is never presented as a whole day, in `src-tauri/tests/us3_honest_day.rs` (SC-007, FR-022)
- [ ] T049 [P] [US3] Write the test proving a day-level estimate never enters a by-site or by-hour breakdown and that its exclusion is reported, in `src-tauri/tests/us3_honest_day.rs` (SC-008, FR-023)
- [ ] T050 [P] [US3] Write the test proving skipped days are derived and that **no command, field, or return value anywhere counts or totals them** — the FR-026b guarantee, which is a property of the whole surface rather than of one screen — in `src-tauri/tests/us3_no_debt.rs` (SC-016)
- [ ] T051 [P] [US3] Write the screen tests for one day — reaches and entry together, gap shown, estimate invited when silent, skipped shown as skipped with no guilt language — in `src/screens/__tests__/Day.test.tsx` (FR-021, SC-015)

### Implementation for User Story 3

- [ ] T052 [US3] Derive `is_skipped` and `needs_estimate` at read time in `src-tauri/src/reflection/checkin.rs`, storing neither (data-model.md — a stored flag is a countable field)
- [ ] T053 [US3] Implement saving a reach estimate in `src-tauri/src/reflection/journal.rs`, typed so it carries no site and no hour and therefore cannot reach a breakdown (FR-012, FR-023)
- [ ] T054 [US3] Expose `save_reach_estimate` in `src-tauri/src/ipc/commands.rs` and add it to `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs`
- [ ] T055 [US3] Build the single-day screen in `src/screens/Day.tsx` — reaches and entry together, the gap beside the count, the estimate as the person's own (FR-021, FR-022)
- [ ] T056 [US3] Implement the estimate invitation in `src/screens/CheckIn.tsx` for a day silent mode was active, worded so the number is plainly theirs rather than a measurement (FR-012)
- [ ] T057 [US3] Implement writing an entry for a past day in `src/screens/Day.tsx`, on identical terms to today and **with nothing anywhere inviting, counting, or drawing attention to the days without entries** (FR-026, FR-026a, FR-026b)
- [ ] T058 [P] [US3] Write the skipped-day copy in `src/screens/Day.tsx` and `src/screens/History.tsx` — shown as skipped, nothing to catch up on, no penalty (FR-011, SC-015)

**Checkpoint**: A day cannot be read as more complete, or more damning, than it was.

---

## Phase 6: User Story 4 — The entries are theirs (Priority: P3)

**Goal**: What the person wrote is theirs to keep, revise, or remove; history is theirs to
delete at any granularity; and none of it makes them feel bad for doing so.

**Independent Test**: Write entries, revise one, delete one, restart — the rest survive
untouched. Delete a day, a range, and everything, and confirm each leaves no trace of itself.

### Tests for User Story 4

- [ ] T059 [P] [US4] Write the **no-residue test**: after deleting a day, compare every view against the same data recorded without that day and assert they are indistinguishable — no marker, no gap on the deleted range's behalf, no inferable absence — in `src-tauri/tests/us4_deletion.rs` (SC-017, FR-018a, FR-022a)
- [ ] T060 [P] [US4] Write the test proving no deletion command alters the trail, the protection state, or anything the enforcement layer reads, in `src-tauri/tests/us4_deletion.rs` (contracts/ui-ipc.md)
- [ ] T061 [P] [US4] Write the test proving entries and estimates are gone after a full deletion, extending the existing coverage in `src-tauri/tests/delete_all_data.rs` (data-model.md)
- [ ] T062 [P] [US4] Write the retention test proving nothing is aged out, trimmed, or summarized away across repeated restarts, in `src-tauri/tests/us4_retention.rs` (FR-017, SC-014)
- [ ] T063 [P] [US4] Write the test proving entries and reaches are deleted independently in either order, in `src-tauri/tests/us4_deletion.rs` (data-model.md)
- [ ] T064 [P] [US4] Write the screen tests for deletion — no report of what was removed, and confirmation copy free of loss, cost, or regret — in `src/screens/__tests__/DeleteHistory.test.tsx` (SC-018, FR-018b)

### Implementation for User Story 4

- [ ] T065 [US4] Implement revising and deleting a journal entry in `src-tauri/src/reflection/journal.rs`, retaining no previous text on replace (FR-015)
- [ ] T066 [US4] Expose `delete_journal_entry` and `delete_reach_history` in `src-tauri/src/ipc/commands.rs`, the latter returning nothing at all, and add both to `CLASSIFIED` in `src-tauri/tests/ipc_surface.rs` (FR-018b)
- [ ] T067 [US4] Build the deletion screen in `src/screens/Settings/DeleteHistory.tsx` covering a day, a range, and everything (FR-018)
- [ ] T068 [US4] Write the deletion copy in `src/screens/Settings/DeleteHistory.tsx` with no language of loss, cost, or regret, and no count of what will be or was removed (FR-018b, SC-018)
- [ ] T069 [P] [US4] Implement the sealed-key state in `src/screens/CheckIn.tsx` and `src/screens/Day.tsx`: the plain sentence, the journaling space **not offered**, and what is still true — protection on, reaches still recorded (research R5, SC-012)

**Checkpoint**: All four stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T070 [P] Verify every user-facing string added by this slice passes `node scripts/check-banned-words.mjs` — this slice writes more prose than any before it (FR-031, SC-009)
- [ ] T071 [P] Verify `node scripts/check-no-streaks.mjs` passes **unmodified**, and that this slice added no counter, no day count, and no chain (FR-033, SC-010)
- [ ] T072 [P] Verify `node scripts/check-free.mjs` and `bash scripts/check-no-network-deps.sh` still pass with the notification dependency in the tree (Principle VII, Principle II)
- [ ] T073 [P] Sweep every screen with several skipped days and reaches present, confirming zero surfaces count, list, total, or draw attention to unwritten days or reach counts (SC-016, SC-004)
- [ ] T074 **Measure (R7)** SC-006: change ranges and breakdowns against 10,000 entries and two years of seeded history on all three platforms, and record the result in `specs/003-reflection-and-history/research.md`. A miss is answered with a stated cap or a stated wait, never with silent truncation
- [ ] T075 Run a network capture across ordinary use including several check-ins, asserting zero bytes leave the machine, and record it in `specs/003-reflection-and-history/quickstart.md` (SC-013)
- [ ] T076 Observe the announcement across seven days, confirming exactly one per day on days Cairn was running at the hour and zero at any other time (SC-001, SC-003)
- [ ] T077 Run every [quickstart.md](./quickstart.md) scenario on Windows, macOS, and Linux and record the results
- [ ] T078 [P] Replace the Current State section of `CLAUDE.md` with this slice's commands, the four modified guards, and the two tests that are guards in disguise (T050 and T059)
- [ ] T079 [P] Record the C1 limit — the reminder needs Cairn to be running — in `README.md` alongside the existing administrator caveat (Principle III)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 is a spike and gates T004, T005, and T028
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories**
- **User Stories (Phase 3–6)**: All depend on Foundational
- **Polish (Phase 7)**: Depends on the stories being complete

### Critical path

```text
T001 (R1 spike) ──► T004, T005 ──► T028 (announcement orchestration)
T010, T011 (property tests) ──► T012, T013 (pure modules) ──► everything
T017, T018 (tables and range reads) ──► every story's reads
T019 (deletion) ──► US4
```

### Story dependencies

- **US1 (P1)**: Foundational only. The MVP
- **US2 (P2)**: Foundational only. Genuinely independent of US1 — patterns are readable with
  zero journal entries, which T039 asserts
- **US3 (P2)**: Foundational, plus the `DayView` shape and `get_day` from US1 (T029). US3
  extends what that view *surfaces* — gaps, estimates, skipped-ness — rather than redefining
  it. This is the one cross-story coupling in the slice and is deliberate: two independent
  definitions of a day would drift
- **US4 (P3)**: Foundational, plus journal saving from US1 (T030). There must be entries
  before there is anything to revise, delete, or keep

### Within each story

- Tests are written first, from the property tables in `contracts/patterns.md` and the
  scenarios in `quickstart.md`, and must fail before implementation
- Pure functions before stores; stores before orchestration; orchestration before commands;
  commands before screens
- A new command is classified in `ipc_surface.rs` in the **same task** that exposes it, never
  a follow-up

### Parallel opportunities

- T002, T003, T006, T007, T009 — different files, no shared dependency
- T010, T011, T016 — all test-authoring, all independent
- Every test task inside a single story is `[P]` against the others
- Once Foundational completes, **US1 and US2 can proceed in full parallel**; US3 waits only
  on T029 and US4 only on T030

---

## Parallel Example: Foundational

```bash
# The property tests, authored together before any implementation:
Task: "Property tests for pattern bucketing in src-tauri/tests/patterns.rs"          # T010
Task: "Unit tests for the announcement decision in src-tauri/tests/checkin_due.rs"   # T011
Task: "Store tests for entries and estimates in src-tauri/tests/journal_store.rs"    # T016
```

## Parallel Example: User Story 1

```bash
# All four test tasks together:
Task: "End-to-end announcement test in src-tauri/tests/us1_announcement.rs"          # T024
Task: "Announcement durability across restart, same file"                            # T025
Task: "Fail-closed journal test in src-tauri/tests/fail_closed_journal.rs"            # T026
Task: "Check-in screen tests in src/screens/__tests__/CheckIn.test.tsx"               # T027
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 — the guards, and the R1 spike
2. Phase 2 — Foundational (**blocks everything**)
3. Phase 3 — the evening check-in
4. **Stop and validate**: quickstart Scenarios 1, 2, and 7. The ritual works, nothing
   interrupts outside the hour, and a missing key loses nobody's writing
5. This is a coherent release on its own. The recovery half of the product exists, without
   history views

### Incremental delivery

1. Setup + Foundational → the arithmetic and the store are proven
2. **US1 → the check-in. Ship it.** The product now has both halves
3. US2 → patterns. Independently valuable and independently testable
4. US3 → the honest day. This is where trust is either earned or quietly spent
5. US4 → ownership of the record

### Notes

- **T050 and T059 are guards in disguise** and matter as much as anything in `scripts/`. T050
  proves nothing anywhere counts unwritten days; T059 proves a deletion leaves no trace.
  Neither property can be seen by reading the code, which is why each is a test rather than a
  review note
- The two go/no-go items are T001 (before the announcement is built) and T074 (before SC-006
  is claimed). Neither may be answered by assumption
- `check-no-streaks.mjs` stays untouched for this slice's entire duration. Streaks are slice
  `004`
- Commit after each task or logical group. Stop at any checkpoint to validate a story
  independently
