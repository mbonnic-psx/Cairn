//! The app talking to the helper over the real channel.
//!
//! Both halves were tested separately — the client's framing, and the helper's
//! serving — which proves neither of them agrees with the other. This drives
//! `InstalledHelper` against `serve`, over a real socket, against a real file.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg(unix)]

use cairn::domain::entries::{Domain, ReachMode};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::enforcement::apply::apply;
use cairn::helper::{HelperChannel, InstalledHelper};
use cairn::platform::hosts::SystemHosts;
use cairn::protocol::{Request, Response};
use cairn::store::inventory::Target;
use cairn_helper::channel::unix::{serve, socket_path};
use cairn_helper::heartbeat::ClockKeeper;
use cairn_helper::machine::Machine;

struct Running {
    _directory: tempfile::TempDir,
    client: InstalledHelper,
    hosts: std::path::PathBuf,
}

fn a_helper() -> Running {
    let directory = tempfile::tempdir().unwrap();
    let hosts = directory.path().join("hosts");
    std::fs::write(&hosts, b"127.0.0.1 localhost\n::1 localhost\n").unwrap();

    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    let socket = socket_path(&data);

    let machine = Machine::at(&hosts, &data);
    let clock = ClockKeeper::at(&data);
    #[allow(unsafe_code)]
    let uid = unsafe { libc::getuid() };

    std::thread::spawn(move || {
        let _ = serve(&machine, &clock, uid);
    });
    for _ in 0..200 {
        if socket.exists() {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    Running {
        client: InstalledHelper::at(&socket),
        hosts,
        _directory: directory,
    }
}

fn protected() -> Vec<Domain> {
    let reserved = ReservedNames::default();
    ["example.com", "news.example"]
        .iter()
        .flat_map(|input| normalize(input, &reserved).unwrap())
        .collect()
}

#[test]
fn the_two_ends_of_the_channel_agree() {
    let running = a_helper();

    let answer = running.client.ask(Request::Ping).unwrap();
    assert!(
        matches!(answer, Response::Pong { healthy: true, .. }),
        "{answer:?}"
    );
}

#[test]
fn a_request_carrying_ten_thousand_entries_fits_through() {
    // The frame cap has to be above the largest legitimate payload (FR-008), or
    // protection at scale would fail at the channel rather than at the file.
    let running = a_helper();
    let reserved = ReservedNames::default();
    let many: Vec<Domain> = (0..10_000)
        .map(|index| {
            normalize(&format!("site{index}.example.test"), &reserved)
                .unwrap()
                .remove(0)
        })
        .collect();

    running
        .client
        .ask(Request::WriteBackupOnce {
            target: Target::SystemHosts,
        })
        .unwrap();

    let answer = running
        .client
        .ask(Request::ApplyHostsSection {
            entries: many.clone(),
            mode: ReachMode::Silent,
        })
        .unwrap();

    assert!(
        matches!(answer, Response::HostsApplied { verified_count, .. }
                 if verified_count == many.len()),
        "{answer:?}"
    );
}

#[test]
fn the_whole_journey_works_over_the_channel() {
    // What the application actually does: back up, apply, verify, flush — with
    // every privileged step crossing a real socket.
    let running = a_helper();
    let hosts = SystemHosts::at(&running.hosts);
    let original = std::fs::read(&running.hosts).unwrap();
    let entries = protected();

    let applied = apply(
        &running.client,
        &hosts,
        &entries,
        ReachMode::Counted,
        1_700_000_000,
        Some(1_700_000_000),
    )
    .unwrap();

    assert_eq!(
        applied.state.status,
        cairn::enforcement::state::ProtectionStatus::InForce
    );
    assert_eq!(applied.state.entry_count_verified, entries.len());

    // And it comes off again, leaving the file as it was.
    let removed = running.client.ask(Request::Uninstall).unwrap();
    assert!(
        matches!(&removed, Response::Uninstalled { removed: true, residue } if residue.is_empty()),
        "{removed:?}"
    );
    assert_eq!(std::fs::read(&running.hosts).unwrap(), original);
}

#[test]
fn the_trusted_clock_can_be_read_across_the_channel() {
    // The gate depends on this answer arriving. A helper that cannot be read is
    // a helper that cannot let a reduction through, which is the safe direction
    // — but it has to work when the helper is there.
    let running = a_helper();

    let answer = running.client.ask(Request::ReadTrustedClock).unwrap();
    assert!(
        matches!(answer, Response::TrustedClock { .. }),
        "{answer:?}"
    );
}

#[test]
fn a_helper_that_is_not_there_is_said_plainly() {
    let client = InstalledHelper::at("/nonexistent/cairn/helper.sock");
    let trouble = client.ask(Request::Ping).unwrap_err();

    assert!(trouble
        .message
        .contains("Nothing on this machine has been changed"));
    for word in ["failed", "denied", "error", "refused"] {
        assert!(
            !trouble.message.to_lowercase().contains(word),
            "{}",
            trouble.message
        );
    }
}
