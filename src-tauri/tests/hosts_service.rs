//! Reading the machine, and saying what is actually there.
//!
//! FR-012 and Principle III: protection state comes from a read-back that
//! matched, never from a write that returned success.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{emit_hosts_body, LineEnding, ReachMode};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::domain::splice;
use cairn::platform::hosts::SystemHosts;
use cairn::services::HostsService;

fn protected(inputs: &[&str]) -> Vec<cairn::domain::entries::Domain> {
    let reserved = ReservedNames::default();
    inputs
        .iter()
        .flat_map(|input| normalize(input, &reserved).unwrap())
        .collect()
}

fn hosts_with(
    entries: &[cairn::domain::entries::Domain],
) -> (tempfile::TempDir, SystemHosts) {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("hosts");

    let original = b"127.0.0.1 localhost\n";
    let body = emit_hosts_body(entries, ReachMode::Counted, LineEnding::Lf);
    let spliced = splice::apply(original, &body).unwrap();
    std::fs::write(&path, spliced.bytes).unwrap();

    let service = SystemHosts::at(&path);
    (directory, service)
}

#[test]
fn a_file_with_no_cairn_section_is_reported_as_not_protected() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("hosts");
    std::fs::write(&path, b"127.0.0.1 localhost\n").unwrap();
    let service = SystemHosts::at(&path);

    assert!(!service.section_present().unwrap());

    let expected = protected(&["example.com"]);
    let verification = service.verify(&expected).unwrap();
    assert!(!verification.section_present);
    assert_eq!(verification.missing, expected);
    assert!(!verification.matches());
}

#[test]
fn a_file_that_matches_is_reported_as_matching() {
    let expected = protected(&["example.com", "news.example"]);
    let (_directory, service) = hosts_with(&expected);

    let verification = service.verify(&expected).unwrap();
    assert!(verification.matches());
    assert_eq!(verification.entry_count, expected.len());
    assert!(verification.missing.is_empty());
    assert!(verification.unexpected.is_empty());
}

#[test]
fn an_entry_removed_by_hand_shows_up_as_missing() {
    let expected = protected(&["example.com", "news.example"]);
    let (_directory, service) = hosts_with(&expected[..2]);

    let verification = service.verify(&expected).unwrap();
    assert!(!verification.matches(), "this is drift, and it is reported");
    assert!(!verification.missing.is_empty());
}

#[test]
fn an_entry_nobody_asked_for_shows_up_as_unexpected() {
    let written = protected(&["example.com", "somewhere.else"]);
    let (_directory, service) = hosts_with(&written);

    let expected = protected(&["example.com"]);
    let verification = service.verify(&expected).unwrap();

    assert!(!verification.unexpected.is_empty());
    assert!(!verification.matches());
}

#[test]
fn a_missing_file_is_not_a_crash() {
    let directory = tempfile::tempdir().unwrap();
    let service = SystemHosts::at(directory.path().join("no-such-file"));

    assert!(service.read_raw().unwrap().is_empty());
    assert!(!service.section_present().unwrap());
}

#[test]
fn a_section_that_cannot_be_read_is_said_so_rather_than_guessed_at() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("hosts");

    let mut broken = b"127.0.0.1 localhost\n".to_vec();
    broken.extend_from_slice(splice::BEGIN_MARKER);
    broken.extend_from_slice(b"\n127.0.0.1 example.com\n");
    std::fs::write(&path, broken).unwrap();

    let service = SystemHosts::at(&path);
    assert!(service.section_present().is_err());
    assert!(service.verify(&protected(&["example.com"])).is_err());
}
