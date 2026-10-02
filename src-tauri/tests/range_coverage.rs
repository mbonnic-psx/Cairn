//! What is said above a range when part of it was not observed (slice
//! `history-by-site`, scenario 5, H4, FR-022).
//!
//! `range_coverage_note` sits beside `coverage_note`, which speaks of one day
//! and is held by `gaps.rs`. A range is never told "today".
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::store::gaps::{coverage_note, range_coverage_note, Gap};

const MINUTE: i64 = 60;
const HOUR: i64 = 3600;
const DAY: i64 = 86_400;

fn gap_of(seconds: i64) -> Vec<Gap> {
    vec![Gap {
        from: 1_000_000,
        to: 1_000_000 + seconds,
    }]
}

fn note(seconds: i64) -> String {
    range_coverage_note(&gap_of(seconds))
        .unwrap_or_else(|| panic!("a gap of {seconds}s should be stated"))
}

fn assert_in_voice(sentence: &str) {
    let lower = sentence.to_lowercase();
    for banned in [
        "failed",
        "fail",
        "denied",
        "violation",
        "relapse",
        "forbidden",
        "you lost",
        "top",
        "worst",
        "sorry",
        "probably",
        "missed",
    ] {
        assert!(!lower.contains(banned), "{sentence:?} carries {banned:?}");
    }
}

#[test]
fn no_gaps_means_no_note() {
    assert!(range_coverage_note(&[]).is_none());
}

#[test]
fn a_span_under_an_hour_is_in_minutes() {
    let text = note(45 * MINUTE);
    assert!(text.contains("45 minutes"), "{text}");
}

#[test]
fn an_hour_is_the_edge_between_minutes_and_hours() {
    let just_under = note(HOUR - MINUTE);
    assert!(just_under.contains("59 minutes"), "{just_under}");
    let exactly = note(HOUR);
    assert!(exactly.contains("1 hour"), "{exactly}");
    assert!(!exactly.contains("minutes"), "{exactly}");
}

#[test]
fn a_span_under_two_days_is_in_hours() {
    let text = note(9 * HOUR);
    assert!(text.contains("9 hours"), "{text}");
    let longest = note(2 * DAY - MINUTE);
    assert!(longest.contains("47 hours"), "{longest}");
    assert!(
        !longest.contains("1 days") && !longest.contains("2 days"),
        "{longest}"
    );
}

#[test]
fn two_days_is_the_edge_between_hours_and_days() {
    let exactly = note(2 * DAY);
    assert!(exactly.contains("2 days"), "{exactly}");
    let more = note(5 * DAY + 3 * HOUR);
    assert!(more.contains("5 days"), "{more}");
}

#[test]
fn several_gaps_are_one_span() {
    let gaps = vec![
        Gap {
            from: 0,
            to: 6 * HOUR,
        },
        Gap {
            from: DAY,
            to: DAY + 3 * HOUR,
        },
    ];
    let text = range_coverage_note(&gaps).unwrap();
    assert!(text.contains("9 hours"), "{text}");
}

#[test]
fn it_speaks_of_these_days_and_never_of_today() {
    for seconds in [20 * MINUTE, 9 * HOUR, 4 * DAY] {
        let text = note(seconds);
        let lower = text.to_lowercase();
        assert!(lower.contains("these days"), "{text}");
        assert!(!lower.contains("today"), "{text}");
    }
}

#[test]
fn it_states_the_limit_and_does_not_guess() {
    for seconds in [20 * MINUTE, 9 * HOUR, 4 * DAY] {
        let text = note(seconds);
        assert!(text.contains("not running"), "{text}");
        assert!(text.contains("not everything that happened"), "{text}");
        assert_in_voice(&text);
    }
}

#[test]
fn the_note_for_a_single_day_still_says_what_it_says() {
    let text = coverage_note(&gap_of(3 * HOUR)).unwrap();
    assert!(text.contains("of today"), "{text}");
}
