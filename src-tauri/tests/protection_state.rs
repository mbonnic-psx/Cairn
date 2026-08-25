//! What the interface is told about protection, and when.
//!
//! FR-011 and FR-012: the state is visible at a glance, and it comes from the
//! machine. The states have to be right at both ends — "not confirmed" is a
//! real answer, but it is the wrong one for someone who has simply not turned
//! protection on yet.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{emit_hosts_body, Domain, LineEnding, ReachMode};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::domain::splice;
use cairn::enforcement::apply::current_state;
use cairn::enforcement::state::{ProtectionState, ProtectionStatus};
use cairn::platform::hosts::SystemHosts;
use cairn::services::{HostsService, Verification};

fn protected() -> Vec<Domain> {
    let reserved = ReservedNames::default();
    ["example.com"]
        .iter()
        .flat_map(|input| normalize(input, &reserved).unwrap())
        .collect()
}

fn hosts_with_section(entries: &[Domain]) -> (tempfile::TempDir, SystemHosts) {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("hosts");
    let body = emit_hosts_body(entries, ReachMode::Counted, LineEnding::Lf);
    let spliced = splice::apply(b"127.0.0.1 localhost\n", &body).unwrap();
    std::fs::write(&path, spliced.bytes).unwrap();
    (directory, SystemHosts::at(&path))
}

#[test]
fn a_matching_read_back_is_the_only_thing_that_reads_as_protected() {
    let entries = protected();
    let (_directory, hosts) = hosts_with_section(&entries);

    let state = current_state(&hosts, &entries, 1_700_000_000, None);
    assert_eq!(state.status, ProtectionStatus::InForce);
    assert_eq!(state.entry_count_verified, entries.len());
}

#[test]
fn anything_short_of_a_match_is_not_protected() {
    let entries = protected();
    // The file carries only half of what should be there.
    let (_directory, hosts) = hosts_with_section(&entries[..1]);

    let state = current_state(&hosts, &entries, 1_700_000_000, None);
    assert_eq!(state.status, ProtectionStatus::NotVerified);
}

#[test]
fn a_file_that_cannot_be_read_is_not_protected_either() {
    // No optimism when Cairn cannot see the machine.
    let directory = tempfile::tempdir().unwrap();
    let hosts = SystemHosts::at(directory.path().join("nothing-here"));

    let state = current_state(&hosts, &protected(), 1_700_000_000, None);
    assert_eq!(state.status, ProtectionStatus::NotVerified);
}

#[test]
fn nothing_expected_and_nothing_there_is_simply_off() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("hosts");
    std::fs::write(&path, b"127.0.0.1 localhost\n").unwrap();
    let hosts = SystemHosts::at(&path);

    assert!(!hosts.section_present().unwrap());
    let state = current_state(&hosts, &[], 1_700_000_000, None);
    assert_eq!(state.status, ProtectionStatus::Off);
}

#[test]
fn the_words_for_each_state_never_blame_anyone() {
    for status in [
        ProtectionStatus::Off,
        ProtectionStatus::InForce,
        ProtectionStatus::NotVerified,
    ] {
        let state = ProtectionState {
            status,
            since: None,
            verified_at: None,
            entry_count_verified: 0,
        };
        let said = state.summary().to_lowercase();

        for word in ["failed", "denied", "violation", "forbidden", "error"] {
            assert!(!said.contains(word), "{status:?}: {said}");
        }
        assert!(!said.is_empty());
    }
}

#[test]
fn a_verification_that_matches_but_counts_differently_is_not_in_force() {
    // Belt and braces around the count: matching sets with a different total
    // means something is in the file twice, and Cairn does not call that on.
    let verification = Verification {
        section_present: true,
        entry_count: 3,
        missing: Vec::new(),
        unexpected: Vec::new(),
    };
    let state = ProtectionState::from_verification(&verification, 2, 1_700_000_000, None);

    assert_eq!(state.status, ProtectionStatus::NotVerified);
}
