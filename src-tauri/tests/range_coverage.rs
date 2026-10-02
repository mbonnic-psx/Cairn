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
    let longest = note(2 * DAY - 2 * HOUR);
    assert!(longest.contains("46 hours"), "{longest}");
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
    assert!(more.contains("6 days"), "{more}");
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

#[test]
fn a_clipped_sliver_never_says_zero() {
    for text in [note(30), coverage_note(&gap_of(30)).unwrap()] {
        assert!(text.contains("less than a minute"), "{text}");
        assert!(!text.contains(" 0 "), "{text}");
        assert!(!text.contains("about less"), "{text}");
    }
}

#[test]
fn a_span_is_rounded_toward_more_blindness() {
    // 71 hours is held; "about 2 days" (48 hours) would say less.
    let text = note(71 * HOUR);
    assert!(text.contains("3 days"), "{text}");
    // 47 h 59 m is no fewer than 48 hours.
    let edge = note(2 * DAY - MINUTE);
    assert!(edge.contains("2 days"), "{edge}");
    // 61 minutes is more than an hour.
    let over = note(HOUR + MINUTE);
    assert!(over.contains("2 hours"), "{over}");
    // 90 seconds is more than a minute.
    let minute = note(90);
    assert!(minute.contains("2 minutes"), "{minute}");
}

#[test]
fn the_day_note_is_rounded_the_same_way_and_has_no_hour_parenthesis() {
    let text = coverage_note(&gap_of(2 * HOUR + MINUTE)).unwrap();
    assert!(text.contains("about 3 hours of today"), "{text}");
    assert!(!text.contains("(s)"), "{text}");
    let one = coverage_note(&gap_of(HOUR)).unwrap();
    assert!(one.contains("about 1 hour of today"), "{one}");
}

#[test]
fn of_these_days_never_follows_days() {
    for seconds in [30, 20 * MINUTE, 71 * HOUR, 4 * DAY] {
        let text = note(seconds);
        assert!(!text.contains("days of these days"), "{text}");
    }
}

// --- R3: time is counted once ------------------------------------------------

/// Two Cairn processes at once, or a clock moved back, can leave rows that
/// cover the same time. The same hours are not unseen twice.
#[test]
fn gaps_over_the_same_time_are_counted_once_in_a_range() {
    let start = 1_000_000;
    let gaps = vec![
        Gap {
            from: start,
            to: start + 2 * DAY,
        },
        Gap {
            from: start,
            to: start + 2 * DAY,
        },
        Gap {
            from: start + DAY,
            to: start + 3 * DAY,
        },
    ];
    // Three days of time, however many rows say so.
    let said = range_coverage_note(&gaps).unwrap();
    assert!(said.contains("about 3 days across these days"), "{said}");
}

#[test]
fn gaps_over_the_same_time_are_counted_once_in_a_day() {
    let start = 1_000_000;
    let gaps = vec![
        Gap {
            from: start,
            to: start + 3 * HOUR,
        },
        Gap {
            from: start + HOUR,
            to: start + 4 * HOUR,
        },
    ];
    let said = coverage_note(&gaps).unwrap();
    assert!(said.contains("about 4 hours"), "{said}");
}

#[test]
fn clipped_gaps_that_overlap_are_one_gap() {
    use cairn::store::gaps::clipped;
    let gaps = vec![
        Gap { from: 0, to: 600 },
        Gap {
            from: 300,
            to: 1_200,
        },
        Gap {
            from: 2_000,
            to: 2_100,
        },
    ];
    let cut: Vec<(i64, i64)> = clipped(&gaps, 100, 5_000)
        .iter()
        .map(|gap| (gap.from, gap.to))
        .collect();
    assert_eq!(cut, vec![(100, 1_200), (2_000, 2_100)]);
}

#[test]
fn a_minute_is_the_edge_between_brief_and_minutes() {
    let just_under = note(MINUTE - 1);
    assert!(just_under.contains("less than a minute"), "{just_under}");
    let exactly = note(MINUTE);
    assert!(exactly.contains("1 minute"), "{exactly}");
    assert!(!exactly.contains("less than"), "{exactly}");
    let day = coverage_note(&gap_of(MINUTE)).unwrap();
    assert!(day.contains("about 1 minute of today"), "{day}");
}
