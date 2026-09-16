# Phase 1 — Data Model: The evening check-in and honest history

**Feature**: `003-reflection-and-history` | **Date**: 2026-08-27

Slice `002` established two stores and the reason for the split: configuration is plain JSON
and holds no reach data, so it stays readable during teardown; history is encrypted with no
opt-out. This slice adds to both and founds neither.

## Where each new thing lives, and why

| New data | Store | Why there |
| --- | --- | --- |
| Journal entries | Encrypted history | Principle II names journal entries and reach history together. Same file, same key, one fail-closed path |
| Reach estimates | Encrypted history | A day-level count of reaches is reach data, whatever its provenance |
| The evening hour | Configuration | A setting, not a reach. Must be readable without the key |
| The announcement switch | Configuration | As above |
| The last day announced | Configuration | Must survive a missing key, or a sealed history would produce a second announcement |

**The last one matters more than it looks.** If the record of what was announced lived in the
encrypted store, then a person whose key was unavailable would be announced at every check —
the durability that makes "at most once per day" true would be gone in exactly the situation
where the product is already having a bad day. It holds no reach data: a local date and
nothing else.

## Additions to the encrypted store

Two tables join `reaches` and `coverage_gaps` in the same SQLCipher file under the same key.

### `journal_entries`

| Column | Type | Rules |
| --- | --- | --- |
| `day` | text, primary key | The person's local calendar date, `YYYY-MM-DD`. One entry per day |
| `text` | text, not null | What they wrote. Never empty — an empty entry is not stored (FR-014) |
| `written_at` | integer | When it was saved. **Never displayed** (FR-026a) |

`day` is a local calendar date rather than a timestamp because that is what an entry *is* —
"Tuesday's entry" survives the person moving timezones, where a stored instant would drift
into the day before or after.

`written_at` exists for ordering and for nothing else. It is deliberately not exposed by any
command, because showing it is exactly how an entry written later becomes visibly an entry
written later — the distinction FR-026a forbids. The column is kept because a debugging need
is foreseeable and a reconstruction is not; the contract is what withholds it.

### `reach_estimates`

| Column | Type | Rules |
| --- | --- | --- |
| `day` | text, primary key | Local calendar date, as above |
| `count` | integer, not null | What the person remembers. Their number, never a measurement (FR-012) |

Separate from `journal_entries` because the two are independent: a silent day may carry an
estimate and no writing, or writing and no estimate. Folding them into one row would make
one imply the other.

An estimate carries **no site and no hour**, which is the whole reason FR-023 exists. It can
answer "how much" for a day and can never contribute to "which site" or "which hour", and the
type reflects that rather than relying on a caller to remember.

## Additions to configuration

Three fields join the existing `Config`. All three take `serde` defaults, so an existing
configuration file from slice `002` loads unchanged — a person upgrading is not asked
anything.

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `evening_hour` | 0–23 | `21` | The hour the person chose. A stated default so the feature is coherent before they choose (FR-007) |
| `announce_check_in` | bool | `true` | FR-003's switch. Turning it off never affects reachability of the check-in |
| `last_announced_day` | local date, optional | none | The day an announcement was last raised *for*. The durable half of "at most once per day" |

## Entities the design deliberately does not store

Recording these would be easier than deriving them. Each is derived on purpose.

**A skipped day.** There is no `skipped` column and no record that a day was missed. A day
in the past, after Cairn began recording, with no entry, is a skipped day — derived at read
time. The reason is not storage economy: a stored flag is a countable field, and a countable
field eventually gets counted. Something would sum it, and the sum would appear somewhere,
and FR-026b would be broken by an implementation detail rather than by a decision. Nothing
can tally what does not exist.

**Whether a check-in was opened.** FR-014 makes closing without writing neither a completed
day nor a skipped one, which means there is nothing to record. An "opened" flag would create
a third state the product has no use for and a progress notion it must not have.

**A streak, a run, or a consecutive-day count.** Slice `004`. The guard forbidding them stays
absolute for this slice's duration.

**Anything derived from patterns.** Breakdowns by site, hour, and day of week are computed on
demand from the reaches in range. A stored summary is a score, and a score is what the spec
says the history must not be.

## Deletion

FR-018 permits deletion at any granularity — a day, a range, or all of it — and FR-018a
requires it to leave nothing behind.

Within the range the person chose, deletion removes **both the reaches and the coverage
gaps**. Removing the reaches alone would leave the gaps as residue of the deletion, and
residue is precisely what FR-018a forbids. This is the one place the gap record is discarded
rather than preserved, and the justification is narrow: the person asked for that period to
be gone, and a gap is data about that period.

Journal entries are deleted independently of reaches. Deleting a day's reaches leaves its
entry; deleting an entry leaves the day's reaches. They are the person's to remove in either
order, and neither implies the other.

**What deletion must not do**, each of which has a test:

- produce a gap, or any marker, in the deleted range (FR-018a, FR-022a)
- report how much was removed (FR-018b)
- alter the trail, protection state, or anything the enforcement layer reads
- leave a row whose absence could be inferred from a sequence, a count, or an index

## Relationship to teardown

Slice `002`'s full deletion removes the history file and then the key, in that order. Both
new tables live inside that file, so both are covered — but "covered by construction" is the
claim that fails quietly when someone later moves a table. A test asserts that journal
entries and estimates are gone after a full deletion, for the same reason the teardown
restoration tests exist: the property is cheap to state and expensive to discover missing.

The unencrypted inventory is untouched by this slice, preserving `002`'s property that a
machine can be put back exactly as it was even when the key cannot be had.
