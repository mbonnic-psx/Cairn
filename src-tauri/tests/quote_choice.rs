//! Which line a check-in shows, as a pure rule (slice `quote`, gaps review Q1).
//!
//! The roll is passed in, so this is the whole of the choice and a test can
//! name the line it expects. Nothing here knows the date: a line tied to the
//! date would give a reason to come back for the quote (research R6).
//!
//! # The API this file requires
//!
//! ```text
//! cairn::domain::quotes::choose(lines: &[String], roll: u64) -> Option<&str>
//! ```
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::collections::HashSet;

use cairn::domain::quotes::choose;

fn lines(texts: &[&str]) -> Vec<String> {
    texts.iter().map(|text| (*text).to_string()).collect()
}

#[test]
fn no_lines_is_no_quote() {
    assert_eq!(choose(&[], 0), None);
    assert_eq!(choose(&[], 41), None);
}

#[test]
fn the_roll_names_the_line() {
    let set = lines(&["first", "second", "third"]);
    assert_eq!(choose(&set, 0), Some("first"));
    assert_eq!(choose(&set, 1), Some("second"));
    assert_eq!(choose(&set, 2), Some("third"));
    assert_eq!(choose(&set, 3), Some("first"));
    assert_eq!(choose(&set, 7), Some("second"));
}

#[test]
fn every_line_can_come_up() {
    let set = lines(&["a", "b", "c", "d", "e"]);
    let seen: HashSet<&str> = (0..set.len() as u64)
        .filter_map(|roll| choose(&set, roll))
        .collect();
    assert_eq!(seen.len(), set.len());
}

#[test]
fn any_roll_is_a_line() {
    let set = lines(&["only", "two"]);
    assert_eq!(choose(&set, u64::MAX), Some("two"));
    assert_eq!(choose(&set, u64::MAX - 1), Some("only"));
}
