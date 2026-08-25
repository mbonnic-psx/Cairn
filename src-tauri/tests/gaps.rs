//! Counts are never presented as complete for time nobody watched (FR-030).
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::store::gaps::{coverage_note, infer, overlapping, Gap, WORTH_MENTIONING};

#[test]
fn a_period_the_machine_was_off_becomes_a_gap() {
    let gap = infer(Some(1_700_000_000), 1_700_000_000 + 3 * 3600).unwrap();

    assert_eq!(gap.seconds(), 3 * 3600);
}

#[test]
fn a_moment_between_starting_things_is_not_worth_mentioning() {
    assert!(infer(Some(1_700_000_000), 1_700_000_000 + 30).is_none());
    assert!(infer(Some(1_700_000_000), 1_700_000_000 + WORTH_MENTIONING).is_some());
}

#[test]
fn a_first_run_has_no_gap_to_report() {
    assert!(infer(None, 1_700_000_000).is_none());
}

#[test]
fn a_clock_moved_backwards_does_not_invent_a_negative_gap() {
    assert!(infer(Some(1_700_000_000), 1_699_000_000).is_none());
}

#[test]
fn only_the_gaps_that_touch_the_day_are_shown_with_it() {
    let gaps = vec![
        Gap { from: 100, to: 200 },
        Gap { from: 500, to: 900 },
        Gap {
            from: 5_000,
            to: 6_000,
        },
    ];

    let found = overlapping(&gaps, 400, 1_000);
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].from, 500);
}

#[test]
fn the_note_says_what_is_missing_without_guessing_at_it() {
    let note = coverage_note(&[Gap {
        from: 0,
        to: 3 * 3600,
    }])
    .unwrap();

    assert!(note.contains("not running"));
    assert!(note.contains("not everything that happened"));
    // It does not estimate, apologise, or suggest anything was got away with.
    for wrong in ["probably", "sorry", "missed", "failed", "should have"] {
        assert!(!note.to_lowercase().contains(wrong), "{note}");
    }
}

#[test]
fn a_day_with_no_gaps_gets_no_note() {
    assert!(coverage_note(&[]).is_none());
}
