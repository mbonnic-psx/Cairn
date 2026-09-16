//! The store contract for journal entries and reach estimates.
//!
//! `data-model.md` gives `journal_entries` and `reach_estimates` their columns
//! and, more importantly, its rationale: one entry per day because `day` is
//! the primary key and an entry *is* a day rather than an instant; no empty
//! entry stored (FR-014); a save that replaces a day's entry leaves no trace
//! of what was there before, because the writing is the person's to revise;
//! and the two tables independent of one another, because folding them into
//! one row would make one imply the other.
//!
//! # This file does not compile yet, and that is correct
//!
//! T017–T019 have not added `journal_entries`, `reach_estimates`, or any of
//! the methods this file calls to `src-tauri/src/store/history.rs`. This test
//! is written first, against the contract in `data-model.md`, so that the
//! store built afterward is built to what the design promised rather than to
//! whatever shape was convenient to write a passing test against. The
//! compiler errors this file should produce are exactly: unresolved imports
//! for `JournalEntry` and `ReachEstimate`, and no method named `save_entry`,
//! `entry_for`, `save_estimate`, `estimate_for`, `journal_entry_count`,
//! `reach_estimate_count`, `columns_of_journal_entries`,
//! `columns_of_reach_estimates`, or `table_names` on `OpenHistory`. Anything
//! else — a syntax error, a type mismatch on something already built — is a
//! mistake in this file, not a gap T017–T019 are meant to fill.
//!
//! # The API this file requires
//!
//! On `OpenHistory`:
//!
//! - `save_entry(&self, day: LocalDate, text: &str, written_at: i64) -> Result<(), Trouble>`
//!   — refuses (returns `Err`, stores nothing) when `text` is empty or
//!   whitespace-only; otherwise replaces whatever entry `day` already had.
//! - `entry_for(&self, day: LocalDate) -> Result<Option<JournalEntry>, Trouble>`
//! - `save_estimate(&self, day: LocalDate, count: u32) -> Result<(), Trouble>`
//!   — replaces whatever estimate `day` already had.
//! - `estimate_for(&self, day: LocalDate) -> Result<Option<ReachEstimate>, Trouble>`
//! - `journal_entry_count(&self) -> Result<i64, Trouble>` and
//!   `reach_estimate_count(&self) -> Result<i64, Trouble>` — total rows in
//!   each table, test-support only, in the spirit of the existing
//!   `columns_of_reaches`.
//! - `columns_of_journal_entries(&self) -> Result<Vec<String>, Trouble>` and
//!   `columns_of_reach_estimates(&self) -> Result<Vec<String>, Trouble>` —
//!   same idea as `columns_of_reaches`, one per new table.
//! - `table_names(&self) -> Result<Vec<String>, Trouble>` — every table this
//!   database has, so a side table for holding a previous entry cannot be
//!   added without a test noticing.
//!
//! On `cairn::store::history`, two new public types:
//!
//! - `JournalEntry { day: LocalDate, text: String }` — nothing else. No
//!   `written_at`: the column exists in storage for ordering, per
//!   `data-model.md`, and this type is what makes it impossible for a read to
//!   hand it out.
//! - `ReachEstimate { day: LocalDate, count: u32 }` — nothing else. No field
//!   exists for a site or an hour, which is what makes it structurally
//!   impossible for a caller to attach either, rather than a rule a caller
//!   has to remember (FR-023).
//!
//! Both derive at least `Clone, PartialEq, Eq, Debug` — this file compares
//! them with `assert_eq!`.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::Path;

use cairn::domain::dates::LocalDate;
use cairn::services::Key;
use cairn::store::history::{History, JournalEntry, OpenHistory, ReachEstimate};
use cairn::store::key::HistoryKey;

/// The same key across a whole test, so "close and reopen" opens the same
/// history rather than a different one.
const A_KEY: [u8; 32] = [7u8; 32];

const WRITTEN_AT: i64 = 1_700_000_000;
const WRITTEN_LATER: i64 = 1_700_050_000;

fn open_store(directory: &Path) -> OpenHistory {
    let History::Open(open) =
        History::open(directory, &HistoryKey::Available(Key::from_bytes(A_KEY)))
    else {
        panic!("a fresh directory with a good key should open");
    };
    open
}

fn a_day() -> LocalDate {
    LocalDate::new(2026, 8, 15).unwrap()
}

fn a_different_day() -> LocalDate {
    LocalDate::new(2026, 8, 16).unwrap()
}

// --- One entry per day --------------------------------------------------

#[test]
fn saving_twice_for_the_same_day_leaves_one_entry_not_two() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_entry(a_day(), "the first thing I wrote", WRITTEN_AT)
        .unwrap();
    open.save_entry(a_day(), "the second thing I wrote", WRITTEN_LATER)
        .unwrap();

    assert_eq!(
        open.journal_entry_count().unwrap(),
        1,
        "day is the primary key; a second save for the same day must not add a row"
    );
}

// --- Empty text refused ---------------------------------------------------
//
// FR-014 says an empty entry is not stored. This file reads "empty" to
// include whitespace-only text: spaces, tabs, and newlines with nothing else
// convey nothing written, in the same way a literal empty string does, and a
// store that accepted one but not the other would be drawing a distinction
// the product has no use for.

#[test]
fn an_entirely_empty_entry_is_refused_and_nothing_is_stored() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    assert!(
        open.save_entry(a_day(), "", WRITTEN_AT).is_err(),
        "an empty entry must be refused, not silently accepted"
    );
    assert_eq!(open.entry_for(a_day()).unwrap(), None);
    assert_eq!(open.journal_entry_count().unwrap(), 0);
}

#[test]
fn an_entry_of_only_whitespace_is_treated_as_empty_and_refused() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    assert!(
        open.save_entry(a_day(), "   \n\t  \n", WRITTEN_AT).is_err(),
        "whitespace with nothing else is not writing"
    );
    assert_eq!(open.entry_for(a_day()).unwrap(), None);
    assert_eq!(open.journal_entry_count().unwrap(), 0);
}

#[test]
fn refusing_an_empty_save_leaves_an_existing_entry_untouched() {
    // Refusing an empty save is not the same operation as deleting an entry
    // (FR-015 keeps those separate). A person clearing the box and closing
    // without meaning to erase what was there must not lose it.
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_entry(a_day(), "what I actually wrote", WRITTEN_AT)
        .unwrap();
    assert!(open.save_entry(a_day(), "   ", WRITTEN_LATER).is_err());

    assert_eq!(
        open.entry_for(a_day()).unwrap(),
        Some(JournalEntry {
            day: a_day(),
            text: "what I actually wrote".to_string(),
        })
    );
    assert_eq!(open.journal_entry_count().unwrap(), 1);
}

// --- Replace-on-save retains nothing ---------------------------------------

#[test]
fn saving_new_text_replaces_the_old_text_completely() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_entry(a_day(), "a private first draft", WRITTEN_AT)
        .unwrap();
    open.save_entry(a_day(), "a wholly different second version", WRITTEN_LATER)
        .unwrap();

    let after = open.entry_for(a_day()).unwrap().expect("an entry is there");
    assert_eq!(after.text, "a wholly different second version");
    assert!(
        !after.text.contains("private first draft"),
        "no trace of the previous text may survive inside the new row"
    );
}

#[test]
fn the_journal_entries_table_has_exactly_the_columns_the_design_names() {
    // No `version`, no `superseded`, no `deleted` — a soft-delete or
    // versioning column would be a place the old text could still live.
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());
    open.save_entry(a_day(), "something written", WRITTEN_AT)
        .unwrap();

    let mut columns = open.columns_of_journal_entries().unwrap();
    columns.sort();
    assert_eq!(
        columns,
        vec![
            "day".to_string(),
            "text".to_string(),
            "written_at".to_string()
        ]
    );
}

#[test]
fn the_reach_estimates_table_has_exactly_the_columns_the_design_names() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());
    open.save_estimate(a_day(), 4).unwrap();

    let mut columns = open.columns_of_reach_estimates().unwrap();
    columns.sort();
    assert_eq!(columns, vec!["count".to_string(), "day".to_string()]);
}

#[test]
fn no_side_table_exists_to_hold_a_previous_version_of_an_entry() {
    // The whole database, not just one table: a place to keep what a person
    // asked to have replaced would be residue of exactly the kind FR-018a
    // forbids for deletion, and replacement deserves the same guarantee.
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_entry(a_day(), "first version", WRITTEN_AT)
        .unwrap();
    open.save_entry(a_day(), "second version", WRITTEN_LATER)
        .unwrap();
    open.save_estimate(a_day(), 2).unwrap();
    open.save_estimate(a_day(), 9).unwrap();

    let mut tables = open.table_names().unwrap();
    tables.sort();
    assert_eq!(
        tables,
        vec![
            "coverage_gaps".to_string(),
            "journal_entries".to_string(),
            "reach_estimates".to_string(),
            "reaches".to_string(),
        ]
    );
}

// --- Estimates independent of entries --------------------------------------

#[test]
fn a_day_can_carry_an_entry_and_no_estimate() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_entry(a_day(), "writing with no number attached", WRITTEN_AT)
        .unwrap();

    assert!(open.entry_for(a_day()).unwrap().is_some());
    assert_eq!(open.estimate_for(a_day()).unwrap(), None);
}

#[test]
fn a_day_can_carry_an_estimate_and_no_entry() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_estimate(a_day(), 3).unwrap();

    assert_eq!(
        open.estimate_for(a_day()).unwrap(),
        Some(ReachEstimate {
            day: a_day(),
            count: 3,
        })
    );
    assert_eq!(open.entry_for(a_day()).unwrap(), None);
}

#[test]
fn a_day_can_carry_both_an_entry_and_an_estimate() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_entry(a_day(), "both at once", WRITTEN_AT)
        .unwrap();
    open.save_estimate(a_day(), 6).unwrap();

    assert_eq!(
        open.entry_for(a_day()).unwrap(),
        Some(JournalEntry {
            day: a_day(),
            text: "both at once".to_string(),
        })
    );
    assert_eq!(
        open.estimate_for(a_day()).unwrap(),
        Some(ReachEstimate {
            day: a_day(),
            count: 6,
        })
    );
}

#[test]
fn saving_an_entry_never_touches_that_days_estimate() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_estimate(a_day(), 5).unwrap();
    open.save_entry(a_day(), "arrived after the estimate", WRITTEN_AT)
        .unwrap();
    open.save_entry(a_day(), "and revised afterward", WRITTEN_LATER)
        .unwrap();

    assert_eq!(
        open.estimate_for(a_day()).unwrap(),
        Some(ReachEstimate {
            day: a_day(),
            count: 5,
        }),
        "neither the first save nor the revision may create, change, or remove the estimate"
    );
}

#[test]
fn saving_an_estimate_never_touches_that_days_entry() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_entry(a_day(), "arrived before any estimate", WRITTEN_AT)
        .unwrap();
    open.save_estimate(a_day(), 1).unwrap();
    open.save_estimate(a_day(), 8).unwrap();

    assert_eq!(
        open.entry_for(a_day()).unwrap(),
        Some(JournalEntry {
            day: a_day(),
            text: "arrived before any estimate".to_string(),
        }),
        "neither the first estimate nor its replacement may create, change, or remove the entry"
    );
}

#[test]
fn saving_a_new_estimate_for_a_day_that_already_has_one_replaces_it() {
    // `reach_estimates.day` is a primary key exactly as `journal_entries.day`
    // is; the estimate gets the same one-per-day guarantee the entry does.
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_estimate(a_day(), 2).unwrap();
    open.save_estimate(a_day(), 9).unwrap();

    assert_eq!(
        open.estimate_for(a_day()).unwrap(),
        Some(ReachEstimate {
            day: a_day(),
            count: 9,
        })
    );
    assert_eq!(open.reach_estimate_count().unwrap(), 1);
}

// --- `written_at` is never exposed, and an estimate carries no site or hour -

#[test]
fn a_read_entry_carries_no_written_at_field() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());
    open.save_entry(a_day(), "kept private as to when", WRITTEN_AT)
        .unwrap();

    let entry = open.entry_for(a_day()).unwrap().expect("an entry is there");

    // Deliberately exhaustive, with no `..`: this line stops compiling the
    // day `JournalEntry` gains a third field, which is the guarantee FR-026a
    // asks for stated as a fact the compiler checks rather than one this
    // assertion merely declines to look past.
    let JournalEntry { day, text } = entry;
    assert_eq!(day, a_day());
    assert_eq!(text, "kept private as to when");
}

#[test]
fn a_read_estimate_carries_no_site_and_no_hour() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());
    open.save_estimate(a_day(), 7).unwrap();

    let estimate = open
        .estimate_for(a_day())
        .unwrap()
        .expect("an estimate is there");

    // Same technique as above: exhaustive, no `..`. `ReachEstimate` cannot
    // gain a `site` or an `hour` field without this line failing to compile —
    // the type is what makes attaching either structurally impossible, not a
    // convention a caller has to remember (FR-023).
    let ReachEstimate { day, count } = estimate;
    assert_eq!(day, a_day());
    assert_eq!(count, 7);
}

// --- Round-trip under encryption -------------------------------------------

#[test]
fn entries_and_estimates_survive_closing_and_reopening_the_store() {
    let directory = tempfile::tempdir().unwrap();

    {
        let open = open_store(directory.path());
        open.save_entry(a_day(), "written before the store closed", WRITTEN_AT)
            .unwrap();
        open.save_estimate(a_day(), 4).unwrap();
    }

    let reopened = open_store(directory.path());
    assert_eq!(
        reopened.entry_for(a_day()).unwrap(),
        Some(JournalEntry {
            day: a_day(),
            text: "written before the store closed".to_string(),
        })
    );
    assert_eq!(
        reopened.estimate_for(a_day()).unwrap(),
        Some(ReachEstimate {
            day: a_day(),
            count: 4,
        })
    );
}

// --- Absence reads as absence, never as empty writing -----------------------

#[test]
fn a_day_with_no_entry_reads_as_absent_not_as_empty_text() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_entry(a_day(), "the only day with anything written", WRITTEN_AT)
        .unwrap();

    assert_eq!(
        open.entry_for(a_different_day()).unwrap(),
        None,
        "a day nobody wrote for is absent, not an entry whose text happens to be empty"
    );
}

#[test]
fn a_day_with_no_estimate_reads_as_absent() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.save_estimate(a_day(), 5).unwrap();

    assert_eq!(open.estimate_for(a_different_day()).unwrap(), None);
}
