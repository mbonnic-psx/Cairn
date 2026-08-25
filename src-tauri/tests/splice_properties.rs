//! Byte-identity outside Cairn's markers — the second of the four mandatory
//! coverage areas, and the test the constitution names explicitly:
//!
//! > content outside Cairn's markers is byte-identical before and after apply,
//! > repair, and teardown.
//!
//! Property-based rather than example-based on purpose. The surroundings that
//! matter are the ones nobody thought to write down: a file with no trailing
//! newline, mixed line endings, a byte-order mark, an entry someone else added
//! for a domain Cairn also protects.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use proptest::prelude::*;

use cairn::domain::entries::{emit_hosts_body, LineEnding, ReachMode};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::domain::splice::{
    apply, detect_line_ending_outside, find_section, outside, remove, SpliceError,
    BEGIN_MARKER, END_MARKER,
};

/// The body as the enforcement layer would produce it: the same line ending the
/// file already uses (research R6).
fn body_for(original: &[u8], domains: &[&str]) -> Vec<u8> {
    let reserved = ReservedNames::default();
    let mut all = Vec::new();
    for input in domains {
        all.extend(normalize(input, &reserved).unwrap());
    }
    emit_hosts_body(
        &all,
        ReachMode::Counted,
        detect_line_ending_outside(original),
    )
}

fn body(domains: &[&str]) -> Vec<u8> {
    body_for(b"", domains)
}

/// Surroundings a real hosts file might have. Deliberately awkward.
fn surroundings() -> impl Strategy<Value = Vec<u8>> {
    prop::collection::vec(
        prop_oneof![
            Just(b"127.0.0.1 localhost\n".to_vec()),
            Just(b"::1 localhost\r\n".to_vec()),
            Just(b"# a comment somebody wrote\n".to_vec()),
            Just(b"\n".to_vec()),
            Just(b"\r\n".to_vec()),
            Just(b"   \t  \n".to_vec()),
            Just(b"\xef\xbb\xbf".to_vec()),
            Just(b"0.0.0.0 example.com\n".to_vec()),
            Just(b"10.0.0.5 build-server".to_vec()),
            Just(vec![0xff, 0xfe, 0x00]),
        ],
        0..12,
    )
    .prop_map(|chunks| chunks.concat())
}

proptest! {
    /// Apply, then repair with a different list, then tear down. At every step
    /// the bytes that are not Cairn's are exactly the bytes they were.
    #[test]
    fn surroundings_survive_apply_repair_and_teardown(original in surroundings()) {
        let first = apply(&original, &body_for(&original, &["example.com"])).unwrap();
        prop_assert_eq!(outside(&first.bytes, first.separator_added).unwrap(), original.clone());

        let repaired = apply(
            &first.bytes,
            &body_for(&first.bytes, &["example.com", "another.example"]),
        )
        .unwrap();
        prop_assert_eq!(
            outside(&repaired.bytes, first.separator_added).unwrap(),
            original.clone()
        );

        let torn_down = remove(&repaired.bytes, first.separator_added).unwrap();
        prop_assert_eq!(torn_down, original);
    }

    /// Applying twice yields one section, never two (FR-042).
    #[test]
    fn applying_twice_leaves_one_section(original in surroundings()) {
        let once = apply(&original, &body_for(&original, &["example.com"])).unwrap();
        let twice = apply(&once.bytes, &body_for(&once.bytes, &["example.com"])).unwrap();

        prop_assert_eq!(count(&twice.bytes, BEGIN_MARKER), 1);
        prop_assert_eq!(count(&twice.bytes, END_MARKER), 1);
        prop_assert_eq!(once.bytes, twice.bytes);
    }

    /// Removing twice is not an error, and the second removal changes nothing.
    #[test]
    fn removing_twice_is_not_an_error(original in surroundings()) {
        let applied = apply(&original, &body_for(&original, &["example.com"])).unwrap();
        let once = remove(&applied.bytes, applied.separator_added).unwrap();
        let twice = remove(&once, applied.separator_added).unwrap();

        prop_assert_eq!(once, twice);
    }

    /// Whatever line ending the file uses, Cairn's own lines use it too — and
    /// the surrounding lines are never converted.
    #[test]
    fn line_endings_are_adopted_never_normalised(original in surroundings()) {
        let applied = apply(&original, &body_for(&original, &["example.com"])).unwrap();
        let section_ending = detect_line_ending_outside(&original);

        let section = find_section(&applied.bytes).unwrap().unwrap();
        let region = &applied.bytes[section.start..section.end];
        match section_ending {
            LineEnding::Crlf => prop_assert!(region.windows(2).any(|pair| pair == b"\r\n")),
            LineEnding::Lf => prop_assert!(region.contains(&b'\n')),
        }
        prop_assert_eq!(outside(&applied.bytes, applied.separator_added).unwrap(), original);
    }
}

fn count(haystack: &[u8], needle: &[u8]) -> usize {
    let mut found = 0;
    let mut at = 0;
    while at + needle.len() <= haystack.len() {
        if &haystack[at..at + needle.len()] == needle {
            found += 1;
            at += needle.len();
        } else {
            at += 1;
        }
    }
    found
}

#[test]
fn a_file_with_no_trailing_newline_is_restored_exactly() {
    // The single case that makes removal ambiguous unless what Cairn added is
    // recorded: the newline in front of the section might be the file's own.
    let original = b"10.0.0.5 build-server".to_vec();

    let applied = apply(&original, &body(&["example.com"])).unwrap();
    assert!(applied.separator_added, "a separator had to be added");

    let restored = remove(&applied.bytes, applied.separator_added).unwrap();
    assert_eq!(restored, original, "including the missing final newline");
}

#[test]
fn a_file_that_ends_in_a_newline_keeps_it() {
    let original = b"10.0.0.5 build-server\n".to_vec();

    let applied = apply(&original, &body(&["example.com"])).unwrap();
    assert!(
        !applied.separator_added,
        "the file already ended in a newline"
    );

    assert_eq!(
        remove(&applied.bytes, applied.separator_added).unwrap(),
        original
    );
}

#[test]
fn an_empty_file_gains_only_the_section() {
    let applied = apply(b"", &body(&["example.com"])).unwrap();
    assert!(!applied.separator_added);
    assert_eq!(
        remove(&applied.bytes, applied.separator_added).unwrap(),
        b"".to_vec()
    );
}

#[test]
fn a_malformed_section_is_reported_and_the_file_is_left_alone() {
    // Cairn does not guess at a half-written section. It says so and stops.
    let mut unclosed = b"127.0.0.1 localhost\n".to_vec();
    unclosed.extend_from_slice(BEGIN_MARKER);
    unclosed.extend_from_slice(b"\n127.0.0.1 example.com\n");

    assert_eq!(
        apply(&unclosed, &body(&["example.com"])).unwrap_err(),
        SpliceError::Unclosed
    );

    let mut duplicated = Vec::new();
    for _ in 0..2 {
        duplicated.extend_from_slice(BEGIN_MARKER);
        duplicated.extend_from_slice(b"\n");
        duplicated.extend_from_slice(END_MARKER);
        duplicated.extend_from_slice(b"\n");
    }
    assert_eq!(
        apply(&duplicated, &body(&["example.com"])).unwrap_err(),
        SpliceError::Duplicated
    );

    let mut unopened = b"# nothing here\n".to_vec();
    unopened.extend_from_slice(END_MARKER);
    unopened.extend_from_slice(b"\n");
    assert_eq!(
        apply(&unopened, &body(&["example.com"])).unwrap_err(),
        SpliceError::Unopened
    );
}

#[test]
fn an_entry_someone_else_added_for_the_same_domain_is_left_where_it_is() {
    // Cairn owns what is inside its markers and nothing else — even a line that
    // duplicates its own work.
    let original = b"0.0.0.0 example.com # added by hand, months ago\n".to_vec();

    let applied = apply(&original, &body(&["example.com"])).unwrap();

    assert_eq!(
        outside(&applied.bytes, applied.separator_added).unwrap(),
        original
    );
    assert_eq!(
        remove(&applied.bytes, applied.separator_added).unwrap(),
        original
    );
}
