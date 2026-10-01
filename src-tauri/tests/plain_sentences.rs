//! A sentence Cairn shows a person is written by Cairn, never by the operating
//! system or a library.
//!
//! Formatting a raw error into a sentence puts the machine's own words on
//! screen: "Permission denied (os error 13)" carries a banned word that the
//! static check cannot see, because it only arrives at runtime, and a path can
//! carry the person's own name. The IPC contract says errors are plain
//! sentences with no error code. Every test here plants the real state —
//! an unreadable file, a directory that cannot be written, a file that is not
//! JSON — and reads what the person would be shown.
#![cfg(unix)]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use cairn::store::config::{Config, ConfigStore};
use cairn::store::inventory::InventoryStore;

/// No banned word, nothing the OS wrote, and nothing that names a place on disk.
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
    // The shape every raw error took: a parenthesised aside, or a parser's
    // location in a file the person never opened.
    assert!(!said.contains('('), "a raw aside in: {said}");
    assert!(!lowered.contains("column"), "a parser location in: {said}");
    assert!(said.ends_with('.'), "not a sentence: {said}");
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

mod settings {
    use super::*;

    #[test]
    fn settings_that_are_not_json_are_explained_plainly() {
        let directory = tempfile::tempdir().unwrap();
        let store = ConfigStore::at(directory.path());
        std::fs::write(store.path(), b"{ this is not json").unwrap();

        let said = store.load().unwrap_err().message;
        assert_plain(&said, directory.path());
        assert!(said.contains("Your protection is unaffected"), "{said}");
    }

    #[test]
    fn settings_that_cannot_be_opened_are_explained_plainly() {
        if !permissions_hold() {
            return;
        }
        let directory = tempfile::tempdir().unwrap();
        let store = ConfigStore::at(directory.path());
        store.save(&Config::default()).unwrap();
        lock(store.path(), 0o000);

        let said = store.load().unwrap_err().message;
        lock(store.path(), 0o600);
        assert_plain(&said, directory.path());
        assert!(said.contains("Your protection is unaffected"), "{said}");
    }

    #[test]
    fn settings_that_cannot_be_saved_are_explained_plainly() {
        if !permissions_hold() {
            return;
        }
        let directory = tempfile::tempdir().unwrap();
        let store = ConfigStore::at(directory.path());
        lock(directory.path(), 0o500);

        let said = store.save(&Config::default()).unwrap_err().message;
        lock(directory.path(), 0o700);
        assert_plain(&said, directory.path());
        assert!(said.contains("Your protection is unaffected"), "{said}");
    }

    #[test]
    fn settings_whose_directory_is_a_file_are_explained_plainly() {
        let directory = tempfile::tempdir().unwrap();
        let not_a_directory = directory.path().join("cairn");
        std::fs::write(&not_a_directory, b"").unwrap();
        let store = ConfigStore::at(&not_a_directory);

        let said = store.save(&Config::default()).unwrap_err().message;
        assert_plain(&said, directory.path());
    }
}

mod inventory {
    use super::*;

    #[test]
    fn a_record_that_is_not_json_is_explained_plainly() {
        let directory = tempfile::tempdir().unwrap();
        let store = InventoryStore::at(directory.path());
        std::fs::write(store.path(), b"[ not the record").unwrap();

        let said = store.load().unwrap_err().message;
        assert_plain(&said, directory.path());
        assert!(said.contains("Nothing has been undone"), "{said}");
    }

    #[test]
    fn a_record_that_cannot_be_opened_is_explained_plainly() {
        if !permissions_hold() {
            return;
        }
        let directory = tempfile::tempdir().unwrap();
        let store = InventoryStore::at(directory.path());
        store.save(&Default::default()).unwrap();
        lock(store.path(), 0o000);

        let said = store.load().unwrap_err().message;
        lock(store.path(), 0o600);
        assert_plain(&said, directory.path());
        assert!(said.contains("Nothing has been undone"), "{said}");
    }

    #[test]
    fn a_record_that_cannot_be_saved_is_explained_plainly() {
        if !permissions_hold() {
            return;
        }
        let directory = tempfile::tempdir().unwrap();
        let store = InventoryStore::at(directory.path());
        lock(directory.path(), 0o500);

        let said = store.save(&Default::default()).unwrap_err().message;
        lock(directory.path(), 0o700);
        assert_plain(&said, directory.path());
    }
}
