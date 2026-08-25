//! User story 2: the block holds, and says nothing.
//!
//! Something outside Cairn changes the system file. Cairn notices on its next
//! beat, puts its own section back, and tells nobody — being told would itself
//! be a reminder of protection, which is close to the ambient surface FR-030a
//! rules out (FR-013, SC-008).
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{Domain, ReachMode};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::protocol::Response;
use cairn::store::inventory::Target;
use cairn_helper::heartbeat::{cycle, ClockKeeper, HEARTBEAT_SECONDS};
use cairn_helper::machine::Machine;
use cairn_helper::verbs::backup::write_backup_once;
use cairn_helper::verbs::hosts::apply_hosts_section;
use cairn_helper::verbs::verify::verify_hosts_section;

const ORIGINAL: &[u8] = b"127.0.0.1 localhost\n::1 localhost\n";

struct Fixture {
    _directory: tempfile::TempDir,
    machine: Machine,
    clock: ClockKeeper,
    hosts: std::path::PathBuf,
}

fn protected() -> Vec<Domain> {
    let reserved = ReservedNames::default();
    ["example.com", "news.example"]
        .iter()
        .flat_map(|input| normalize(input, &reserved).unwrap())
        .collect()
}

fn in_force() -> Fixture {
    let directory = tempfile::tempdir().unwrap();
    let hosts = directory.path().join("hosts");
    std::fs::write(&hosts, ORIGINAL).unwrap();
    let data = directory.path().join("cairn-data");

    let machine = Machine::at(&hosts, &data);
    write_backup_once(&machine, Target::SystemHosts);
    apply_hosts_section(&machine, &protected(), ReachMode::Counted);

    Fixture {
        clock: ClockKeeper::at(&data),
        machine,
        hosts,
        _directory: directory,
    }
}

#[test]
fn a_section_deleted_by_hand_is_put_back_on_the_next_beat() {
    let fixture = in_force();
    let expected = std::fs::read(&fixture.hosts).unwrap();

    // Someone edits the file and removes Cairn's work entirely.
    std::fs::write(&fixture.hosts, ORIGINAL).unwrap();

    let beat = cycle(&fixture.machine, &fixture.clock);

    assert!(beat.repaired, "drift has to be noticed and put back");
    assert_eq!(std::fs::read(&fixture.hosts).unwrap(), expected);
}

#[test]
fn one_entry_removed_by_hand_is_put_back_too() {
    let fixture = in_force();

    let tampered = String::from_utf8(std::fs::read(&fixture.hosts).unwrap())
        .unwrap()
        .lines()
        .filter(|line| !line.contains("news.example"))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(&fixture.hosts, tampered).unwrap();

    cycle(&fixture.machine, &fixture.clock);

    let state = verify_hosts_section(&fixture.machine, &protected());
    assert!(
        matches!(&state, Response::HostsVerified(state) if !state.drift),
        "{state:?}"
    );
}

/// SC-008: repair within 60 seconds of an external change. The interval *is*
/// the bound, so changing it past 60 stops the build rather than quietly
/// widening the window.
const _: () = assert!(HEARTBEAT_SECONDS <= 60);

#[test]
fn a_file_that_is_already_right_is_not_rewritten() {
    let fixture = in_force();
    let before = std::fs::read(&fixture.hosts).unwrap();

    let beat = cycle(&fixture.machine, &fixture.clock);

    assert!(
        !beat.repaired,
        "nothing had changed, so nothing was written"
    );
    assert_eq!(std::fs::read(&fixture.hosts).unwrap(), before);
}

#[test]
fn a_beat_carries_nothing_that_could_be_shown_to_anyone() {
    // FR-019 and FR-013: repair produces no page, no notification, no toast, no
    // sound, no badge. There is nowhere for a message to come back through —
    // a beat reports a boolean and a number of seconds, and nothing else.
    let fixture = in_force();
    std::fs::write(&fixture.hosts, ORIGINAL).unwrap();

    let beat = cycle(&fixture.machine, &fixture.clock);
    let rendered = format!("{beat:?}");

    assert!(beat.repaired);
    for name in ["example.com", "news.example", "www."] {
        assert!(!rendered.contains(name), "a beat must not carry a domain");
    }
}

#[test]
fn nothing_the_helper_prints_can_carry_a_domain() {
    // FR-038b: a diagnostic may say that something happened, by kind — never
    // which site, and never a recorded reach.
    for source in [
        include_str!("../src/main.rs"),
        include_str!("../src/heartbeat.rs"),
        include_str!("../src/dispatch.rs"),
        include_str!("../src/verbs/hosts.rs"),
        include_str!("../src/verbs/verify.rs"),
        include_str!("../src/verbs/backup.rs"),
        include_str!("../src/verbs/uninstall.rs"),
    ] {
        for line in source.lines() {
            let line = line.trim();
            if !line.contains("println!") && !line.contains("eprintln!") {
                continue;
            }
            for leak in ["domain", "entries", "entry", "host", "name", "reach"] {
                assert!(
                    !line.to_lowercase().contains(&format!("{{{leak}")),
                    "a diagnostic interpolates {leak}: {line}"
                );
            }
        }
    }
}
