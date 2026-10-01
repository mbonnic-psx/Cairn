//! What the helper says travels back to the window as written, so it is Cairn's
//! sentence and never the operating system's.
//!
//! "Permission denied (os error 13)" carries a banned word the static check
//! cannot see, because it only exists at runtime, and an io error can carry a
//! path. Each test plants the real state against a machine made of temporary
//! files and reads the `Response::Trouble` a verb gives back.
#![cfg(unix)]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use cairn::domain::entries::ReachMode;
use cairn::protocol::Response;
use cairn::store::inventory::{InventoryStore, Target};
use cairn_helper::machine::Machine;
use cairn_helper::verbs::backup::{remove_backup, write_backup_once};
use cairn_helper::verbs::hosts::{apply_hosts_section, remove_hosts_section};
use cairn_helper::verbs::verify::verify_hosts_section;

fn assert_plain(said: &str, planted: &Path) {
    let lowered = said.to_lowercase();
    for word in [
        "fail",
        "denied",
        "violation",
        "relapse",
        "forbidden",
        "you lost",
        "os error",
        "error",
    ] {
        assert!(!lowered.contains(word), "{word:?} in: {said}");
    }
    assert!(!said.contains('/'), "a path separator in: {said}");
    assert!(!said.contains('\\'), "a path separator in: {said}");
    assert!(!said.contains("tmp"), "a temporary path in: {said}");
    assert!(
        !said.contains(&*planted.to_string_lossy()),
        "the planted path in: {said}"
    );
    if let Some(home) = std::env::var_os("HOME") {
        let home = home.to_string_lossy();
        if !home.is_empty() && home != "/" {
            assert!(!said.contains(&*home), "the home directory in: {said}");
        }
    }
    assert!(!said.contains('('), "a raw aside in: {said}");
    assert!(said.ends_with('.'), "not a sentence: {said}");
}

fn trouble_in(response: Response) -> String {
    match response {
        Response::Trouble { message, .. } => message,
        other => panic!("expected trouble, got {other:?}"),
    }
}

/// Mode 000 means nothing to root, so a test that relies on it says so
/// instead of passing for the wrong reason.
fn permissions_hold() -> bool {
    #[allow(unsafe_code)]
    let uid = unsafe { libc::geteuid() };
    uid != 0
}

fn lock(path: &Path, mode: u32) {
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(mode)).unwrap();
}

struct Fixture {
    directory: tempfile::TempDir,
    machine: Machine,
    hosts: PathBuf,
    data: PathBuf,
}

fn fixture() -> Fixture {
    let directory = tempfile::tempdir().unwrap();
    let hosts = directory.path().join("hosts");
    std::fs::write(&hosts, b"127.0.0.1 localhost\n").unwrap();
    let data = directory.path().join("cairn-data");
    let machine = Machine::at(&hosts, &data);
    Fixture {
        directory,
        machine,
        hosts,
        data,
    }
}

#[test]
fn a_hosts_file_that_cannot_be_read_is_explained_plainly_by_every_verb() {
    if !permissions_hold() {
        return;
    }
    let fixture = fixture();
    // A backup is on record, so apply reaches its own read of the file.
    assert!(matches!(
        write_backup_once(&fixture.machine, Target::SystemHosts),
        Response::BackupWritten { .. }
    ));
    lock(&fixture.hosts, 0o000);

    let answers = [
        apply_hosts_section(&fixture.machine, &[], ReachMode::Silent),
        remove_hosts_section(&fixture.machine),
        verify_hosts_section(&fixture.machine, &[]),
        remove_backup(&fixture.machine, Target::SystemHosts),
    ];
    lock(&fixture.hosts, 0o600);

    for answer in answers {
        let said = trouble_in(answer);
        assert_plain(&said, fixture.directory.path());
        assert!(
            said.contains("Nothing on this machine has been changed"),
            "{said}"
        );
    }
}

#[test]
fn a_backup_that_cannot_be_written_is_explained_plainly() {
    let fixture = fixture();
    // A file where the backups' own directory belongs.
    std::fs::create_dir_all(&fixture.data).unwrap();
    std::fs::write(fixture.data.join("backups"), b"").unwrap();

    let said = trouble_in(write_backup_once(&fixture.machine, Target::SystemHosts));
    assert_plain(&said, fixture.directory.path());
    assert!(
        said.contains("Nothing on this machine has been changed"),
        "{said}"
    );
}

#[test]
fn an_earlier_backup_that_cannot_be_read_is_explained_plainly() {
    if !permissions_hold() {
        return;
    }
    let fixture = fixture();
    assert!(matches!(
        write_backup_once(&fixture.machine, Target::SystemHosts),
        Response::BackupWritten { .. }
    ));
    let backup = InventoryStore::at(&fixture.data).backup_path(Target::SystemHosts);
    lock(&backup, 0o000);

    let said = trouble_in(write_backup_once(&fixture.machine, Target::SystemHosts));
    lock(&backup, 0o600);
    assert_plain(&said, fixture.directory.path());
    assert!(said.contains("Nothing has been changed"), "{said}");
}

#[test]
fn a_record_that_cannot_be_read_is_explained_plainly_by_the_helper() {
    let fixture = fixture();
    std::fs::create_dir_all(&fixture.data).unwrap();
    std::fs::write(fixture.data.join("inventory.json"), b"[ not the record").unwrap();

    let said = trouble_in(write_backup_once(&fixture.machine, Target::SystemHosts));
    assert_plain(&said, fixture.directory.path());
}
