//! Deleting a range of reach history and what happens to the coverage gaps
//! that overlap it.
//!
//! **This file currently covers gap clipping only.** T059–T063 (the
//! no-residue test, the trail/protection-state test, the full-deletion
//! extension to `delete_all_data.rs`, the retention test, and the
//! independent-deletion-of-entries-and-reaches test) have not been written
//! yet and will extend this file — see `specs/003-reflection-and-history/tasks.md`.
//!
//! `data-model.md` bounds a deletion's removal of coverage gaps to "within
//! the range the person chose": a gap that extends beyond `[from, to)` is
//! data about a period the person never asked to remove, and deleting the
//! whole row would make a later read claim Cairn was watching over that
//! surrounding period when it was not (Principle III — never claim coverage
//! you don't have). So `delete_reach_history` clips a gap rather than
//! deleting it outright: nothing survives if the range swallows the gap
//! whole; one shortened gap survives if the range eats only one end; two
//! gaps survive, either side of the hole cut out of it, if the range falls
//! entirely inside the original gap.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::Path;

use cairn::services::Key;
use cairn::store::history::{CoverageGap, History, OpenHistory};
use cairn::store::key::HistoryKey;

const A_KEY: [u8; 32] = [7u8; 32];

fn open_store(directory: &Path) -> OpenHistory {
    let History::Open(open) =
        History::open(directory, &HistoryKey::Available(Key::from_bytes(A_KEY)))
    else {
        panic!("a fresh directory with a good key should open");
    };
    open
}

fn gap(from: i64, to: i64) -> CoverageGap {
    CoverageGap { from, to }
}

/// The bounds of every gap `gaps_between` returns for `0..1_000_000`, wide
/// enough to see the whole file's worth of fixtures at once. Sorted by
/// `from` so the assertions read as a plain list rather than depending on
/// storage order.
fn surviving_gaps(open: &OpenHistory) -> Vec<(i64, i64)> {
    let mut found: Vec<(i64, i64)> = open
        .gaps_between(0, 1_000_000)
        .unwrap()
        .into_iter()
        .map(|g| (g.from, g.to))
        .collect();
    found.sort();
    found
}

// --- A gap entirely inside the deleted range is gone --------------------

#[test]
fn a_gap_entirely_inside_the_deleted_range_is_deleted() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.record_gap(&gap(200, 300)).unwrap();

    open.delete_reach_history(100, 400).unwrap();

    assert_eq!(surviving_gaps(&open), Vec::<(i64, i64)>::new());
}

#[test]
fn a_gap_exactly_coincident_with_the_deleted_range_is_deleted() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.record_gap(&gap(100, 400)).unwrap();

    open.delete_reach_history(100, 400).unwrap();

    assert_eq!(surviving_gaps(&open), Vec::<(i64, i64)>::new());
}

// --- A gap the range only eats one end of is trimmed, not deleted -------

#[test]
fn a_gap_overlapping_the_start_of_the_range_keeps_what_runs_past_it() {
    // g_from < to <= g_to: the range's end falls inside (or at the edge of)
    // the gap, so everything at or after `to` survives.
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.record_gap(&gap(100, 500)).unwrap();

    open.delete_reach_history(100, 300).unwrap();

    assert_eq!(surviving_gaps(&open), vec![(300, 500)]);
}

#[test]
fn a_gap_overlapping_the_end_of_the_range_keeps_what_came_before_it() {
    // g_from < from < g_to: the range's start falls inside the gap, so
    // everything before `from` survives.
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.record_gap(&gap(100, 500)).unwrap();

    open.delete_reach_history(300, 600).unwrap();

    assert_eq!(surviving_gaps(&open), vec![(100, 300)]);
}

// --- A gap that strictly contains the range splits in two ---------------

#[test]
fn a_gap_that_strictly_contains_the_deleted_range_splits_into_two() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.record_gap(&gap(100, 900)).unwrap();

    open.delete_reach_history(300, 600).unwrap();

    assert_eq!(surviving_gaps(&open), vec![(100, 300), (600, 900)]);
}

// --- Boundary cases -------------------------------------------------------

#[test]
fn a_gap_only_touching_the_range_at_its_far_boundary_survives_untouched() {
    // The gap ends exactly where the deleted range begins (`g_to == from`):
    // they meet but do not overlap, so nothing about the gap changes.
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.record_gap(&gap(100, 300)).unwrap();

    open.delete_reach_history(300, 500).unwrap();

    assert_eq!(surviving_gaps(&open), vec![(100, 300)]);
}

#[test]
fn a_gap_only_touching_the_range_at_its_near_boundary_survives_untouched() {
    // The gap begins exactly where the deleted range ends (`g_from == to`):
    // they meet but do not overlap either.
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.record_gap(&gap(300, 500)).unwrap();

    open.delete_reach_history(100, 300).unwrap();

    assert_eq!(surviving_gaps(&open), vec![(300, 500)]);
}

#[test]
fn deleting_a_range_with_no_gaps_at_all_does_nothing_and_does_not_error() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.delete_reach_history(100, 400).unwrap();

    assert_eq!(surviving_gaps(&open), Vec::<(i64, i64)>::new());
}

// --- A gap wholly outside the range is left alone, and multiple gaps are
// --- resolved independently of one another ---------------------------------

#[test]
fn a_gap_outside_the_deleted_range_is_left_alone_while_an_overlapping_one_is_clipped() {
    let directory = tempfile::tempdir().unwrap();
    let open = open_store(directory.path());

    open.record_gap(&gap(0, 50)).unwrap();
    open.record_gap(&gap(100, 500)).unwrap();
    open.record_gap(&gap(900, 950)).unwrap();

    open.delete_reach_history(100, 300).unwrap();

    assert_eq!(surviving_gaps(&open), vec![(0, 50), (300, 500), (900, 950)]);
}
