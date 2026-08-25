//! The test the constitution requires before any of this may merge:
//!
//! > No privileged write path is merged without a reviewed teardown path and a
//! > test proving it restores.
//!
//! Every verb that changes the machine is exercised here together with the verb
//! that undoes it, against real files in a temporary directory. The verbs
//! cannot tell this from the real machine — `Machine` is the only thing that
//! knows where the files are.
//!
//! What is asserted is byte-level restoration, not "no error was returned".
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{Domain, ReachMode};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::domain::splice;
use cairn::protocol::{Response, TroubleKind};
use cairn::store::inventory::Target;
use cairn_helper::machine::Machine;
use cairn_helper::verbs::backup::{remove_backup, write_backup_once};
use cairn_helper::verbs::hosts::{apply_hosts_section, remove_hosts_section};
use cairn_helper::verbs::uninstall::uninstall;
use cairn_helper::verbs::verify::{repair_hosts_section, verify_hosts_section};

/// A hosts file as it might really be found, awkward parts included.
const ORIGINALS: [(&str, &[u8]); 5] = [
    ("an ordinary file", b"127.0.0.1 localhost\n::1 localhost\n"),
    (
        "windows line endings",
        b"127.0.0.1 localhost\r\n::1 localhost\r\n",
    ),
    (
        "no trailing newline",
        b"127.0.0.1 localhost\n10.0.0.5 build-server",
    ),
    ("a byte-order mark", b"\xef\xbb\xbf127.0.0.1 localhost\n"),
    ("an empty file", b""),
];

struct Fixture {
    _directory: tempfile::TempDir,
    machine: Machine,
    hosts: std::path::PathBuf,
}

fn fixture(original: &[u8]) -> Fixture {
    let directory = tempfile::tempdir().unwrap();
    let hosts = directory.path().join("hosts");
    std::fs::write(&hosts, original).unwrap();
    let machine = Machine::at(&hosts, directory.path().join("cairn-data"));
    Fixture {
        _directory: directory,
        machine,
        hosts,
    }
}

fn entries(inputs: &[&str]) -> Vec<Domain> {
    let reserved = ReservedNames::default();
    inputs
        .iter()
        .flat_map(|input| normalize(input, &reserved).unwrap())
        .collect()
}

fn read(path: &std::path::Path) -> Vec<u8> {
    std::fs::read(path).unwrap()
}

#[test]
fn every_verb_pair_puts_the_file_back_exactly() {
    for (description, original) in ORIGINALS {
        let fixture = fixture(original);
        let protected = entries(&["example.com", "news.example"]);

        let backed_up = write_backup_once(&fixture.machine, Target::SystemHosts);
        assert!(
            matches!(backed_up, Response::BackupWritten { written: true, .. }),
            "{description}: the original had to be captured first, got {backed_up:?}"
        );

        let applied =
            apply_hosts_section(&fixture.machine, &protected, ReachMode::Counted);
        assert!(
            matches!(applied, Response::HostsApplied { verified_count, .. }
                     if verified_count == protected.len()),
            "{description}: {applied:?}"
        );
        assert_ne!(
            read(&fixture.hosts),
            original,
            "{description}: something changed"
        );

        let removed = remove_hosts_section(&fixture.machine);
        assert!(
            matches!(&removed, Response::HostsRemoved { removed: true, residue }
                     if residue.is_empty()),
            "{description}: {removed:?}"
        );
        assert_eq!(
            read(&fixture.hosts),
            original,
            "{description}: the file is not byte-for-byte what it was"
        );

        let backup_removed = remove_backup(&fixture.machine, Target::SystemHosts);
        assert!(
            matches!(
                backup_removed,
                Response::BackupRemoved {
                    removed: true,
                    restored_sha256_match: true
                }
            ),
            "{description}: {backup_removed:?}"
        );
        assert!(
            !fixture
                .machine
                .inventory()
                .backup_path(Target::SystemHosts)
                .exists(),
            "{description}: the copy Cairn kept is gone too"
        );
    }
}

#[test]
fn a_full_teardown_leaves_no_residue_and_no_record() {
    for (description, original) in ORIGINALS {
        let fixture = fixture(original);

        write_backup_once(&fixture.machine, Target::SystemHosts);
        apply_hosts_section(
            &fixture.machine,
            &entries(&["example.com"]),
            ReachMode::Counted,
        );

        let torn_down = uninstall(&fixture.machine);
        assert!(
            matches!(&torn_down, Response::Uninstalled { removed: true, residue }
                     if residue.is_empty()),
            "{description}: {torn_down:?}"
        );

        assert_eq!(read(&fixture.hosts), original, "{description}");
        assert!(
            fixture
                .machine
                .inventory()
                .load()
                .unwrap()
                .changes
                .is_empty(),
            "{description}: nothing is left on the list of things Cairn changed"
        );
    }
}

#[test]
fn nothing_is_written_before_the_original_is_safe() {
    let original = b"127.0.0.1 localhost\n";
    let fixture = fixture(original);

    let refused = apply_hosts_section(
        &fixture.machine,
        &entries(&["example.com"]),
        ReachMode::Counted,
    );
    assert!(
        matches!(
            refused,
            Response::Trouble {
                kind: TroubleKind::NoBackupYet,
                ..
            }
        ),
        "{refused:?}"
    );
    assert_eq!(read(&fixture.hosts), original);
}

#[test]
fn a_second_backup_never_replaces_the_first() {
    // FR-039: a backup taken after Cairn has written would capture Cairn's own
    // work as though it were the machine's.
    let original = b"127.0.0.1 localhost\n";
    let fixture = fixture(original);

    let first = write_backup_once(&fixture.machine, Target::SystemHosts);
    let Response::BackupWritten { sha256: before, .. } = first else {
        panic!("{first:?}");
    };

    apply_hosts_section(
        &fixture.machine,
        &entries(&["example.com"]),
        ReachMode::Counted,
    );

    let second = write_backup_once(&fixture.machine, Target::SystemHosts);
    assert!(
        matches!(&second, Response::BackupWritten { written: false, sha256 } if *sha256 == before),
        "the copy is still of the machine as Cairn found it: {second:?}"
    );

    let backup =
        std::fs::read(fixture.machine.inventory().backup_path(Target::SystemHosts))
            .unwrap();
    assert_eq!(backup, original);
}

#[test]
fn applying_twice_leaves_one_section_and_still_restores() {
    let original = b"127.0.0.1 localhost\n10.0.0.5 build-server";
    let fixture = fixture(original);

    write_backup_once(&fixture.machine, Target::SystemHosts);
    apply_hosts_section(
        &fixture.machine,
        &entries(&["example.com"]),
        ReachMode::Counted,
    );
    apply_hosts_section(
        &fixture.machine,
        &entries(&["example.com", "news.example"]),
        ReachMode::Counted,
    );

    let current = read(&fixture.hosts);
    assert_eq!(
        current
            .windows(splice::BEGIN_MARKER.len())
            .filter(|window| *window == splice::BEGIN_MARKER)
            .count(),
        1,
        "one section, never two"
    );

    uninstall(&fixture.machine);
    assert_eq!(read(&fixture.hosts), original);
}

#[test]
fn silent_repair_puts_the_section_back_and_teardown_still_restores() {
    // Something outside Cairn deleted its section. Cairn notices on its next
    // beat and puts it back without saying anything (FR-013).
    let original = b"127.0.0.1 localhost\n";
    let fixture = fixture(original);
    let protected = entries(&["example.com"]);

    write_backup_once(&fixture.machine, Target::SystemHosts);
    apply_hosts_section(&fixture.machine, &protected, ReachMode::Counted);

    std::fs::write(&fixture.hosts, original).unwrap();

    let state = verify_hosts_section(&fixture.machine, &protected);
    assert!(
        matches!(&state, Response::HostsVerified(state) if state.drift),
        "drift has to be noticed: {state:?}"
    );

    let repaired = repair_hosts_section(&fixture.machine, &protected, ReachMode::Counted);
    assert!(
        matches!(repaired, Response::HostsRepaired { repaired: true, .. }),
        "{repaired:?}"
    );

    let after = verify_hosts_section(&fixture.machine, &protected);
    assert!(matches!(&after, Response::HostsVerified(state) if !state.drift));

    uninstall(&fixture.machine);
    assert_eq!(read(&fixture.hosts), original);
}

#[test]
fn repairing_a_file_that_is_already_right_changes_nothing() {
    let fixture = fixture(b"127.0.0.1 localhost\n");
    let protected = entries(&["example.com"]);

    write_backup_once(&fixture.machine, Target::SystemHosts);
    apply_hosts_section(&fixture.machine, &protected, ReachMode::Counted);
    let before = read(&fixture.hosts);

    let repaired = repair_hosts_section(&fixture.machine, &protected, ReachMode::Counted);
    assert!(matches!(
        repaired,
        Response::HostsRepaired {
            repaired: false,
            ..
        }
    ));
    assert_eq!(read(&fixture.hosts), before);
}

#[test]
fn a_malformed_section_leaves_the_file_alone() {
    // A half-written section from an interrupted write. Cairn reports it and
    // touches nothing rather than guessing where the region ends.
    let mut original = b"127.0.0.1 localhost\n".to_vec();
    original.extend_from_slice(splice::BEGIN_MARKER);
    original.extend_from_slice(b"\n127.0.0.1 example.com\n");

    let fixture = fixture(&original);
    write_backup_once(&fixture.machine, Target::SystemHosts);

    let refused = apply_hosts_section(
        &fixture.machine,
        &entries(&["example.com"]),
        ReachMode::Counted,
    );
    assert!(
        matches!(
            refused,
            Response::Trouble {
                kind: TroubleKind::SectionUnreadable,
                ..
            }
        ),
        "{refused:?}"
    );
    assert_eq!(read(&fixture.hosts), original, "untouched");
}

#[test]
fn teardown_survives_a_machine_with_no_credential_store() {
    // Nothing in the teardown path reads a key: the inventory and the backups
    // are plain files beside each other. This is the case that would otherwise
    // leave a machine unrecoverable (data-model.md).
    let original = b"127.0.0.1 localhost\n";
    let fixture = fixture(original);

    write_backup_once(&fixture.machine, Target::SystemHosts);
    apply_hosts_section(
        &fixture.machine,
        &entries(&["example.com"]),
        ReachMode::Counted,
    );

    // A brand new Machine over the same data, as a fresh process would be, with
    // no key material of any kind available to it.
    let fresh = Machine::at(&fixture.hosts, fixture.machine.data_directory());
    let torn_down = uninstall(&fresh);

    assert!(
        matches!(&torn_down, Response::Uninstalled { removed: true, residue }
                 if residue.is_empty()),
        "{torn_down:?}"
    );
    assert_eq!(read(&fixture.hosts), original);
}

#[test]
fn what_cairn_did_not_write_is_never_touched() {
    // The promise FR-040 makes about surrounding content, checked end to end
    // rather than only at the splicing layer.
    let original =
        b"# my own notes\n127.0.0.1 localhost\n0.0.0.0 example.com # mine\n\n\n";
    let fixture = fixture(original);
    let protected = entries(&["example.com", "another.example"]);

    write_backup_once(&fixture.machine, Target::SystemHosts);
    apply_hosts_section(&fixture.machine, &protected, ReachMode::Counted);

    let with_section = read(&fixture.hosts);
    let separator_added = fixture
        .machine
        .inventory()
        .load()
        .unwrap()
        .separator_added(Target::SystemHosts);
    assert_eq!(
        splice::outside(&with_section, separator_added).unwrap(),
        original.to_vec(),
        "everything that is not Cairn's is exactly as it was"
    );

    uninstall(&fixture.machine);
    assert_eq!(read(&fixture.hosts), original);
}
