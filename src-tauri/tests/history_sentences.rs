//! The sentences the person reads when the history cannot be opened.
//!
//! Adversary J1/J2/J5 (write-tonight): the sentence is Cairn's own words. It
//! never carries the operating system's or SQLite's text, a path, or an error
//! code, and a store that is merely busy is not reported as a wrong key.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use cairn::services::Key;
use cairn::store::history::{History, HISTORY_FILE};
use cairn::store::key::HistoryKey;

const A_KEY: [u8; 32] = [7u8; 32];

fn key() -> HistoryKey {
    HistoryKey::Available(Key::from_bytes(A_KEY))
}

fn because(history: History) -> String {
    match history {
        History::Sealed { because } => because,
        History::Open(_) => panic!("the history should not have opened"),
    }
}

fn assert_plain(sentence: &str, hide: &[&Path]) {
    assert!(!sentence.trim().is_empty());
    let lower = sentence.to_lowercase();
    for banned in [
        "failed",
        "fail",
        "denied",
        "violation",
        "relapse",
        "forbidden",
        "you lost",
        "os error",
        "unable to open",
        "sqlite",
        "errno",
        HISTORY_FILE,
    ] {
        assert!(!lower.contains(banned), "{sentence:?} carries {banned:?}");
    }
    for path in hide {
        assert!(
            !sentence.contains(&*path.to_string_lossy()),
            "{sentence:?} carries a path"
        );
    }
    assert!(
        !sentence.contains('/') && !sentence.contains('\\'),
        "{sentence:?} carries a path separator"
    );
}

#[cfg(unix)]
fn restore(path: &Path) {
    let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700));
}

// Unix permissions plant the state; Windows has no mode bits to set.
#[cfg(unix)]
#[test]
fn a_directory_that_cannot_be_written_gives_a_plain_sentence() {
    let root = tempfile::tempdir().unwrap();
    let data = root.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    std::fs::set_permissions(&data, std::fs::Permissions::from_mode(0o500)).unwrap();

    let sentence = because(History::open(&data, &key()));
    restore(&data);

    assert_plain(&sentence, &[root.path(), &data]);
}

// Unix permissions plant the state; Windows has no mode bits to set.
#[cfg(unix)]
#[test]
fn a_history_file_that_cannot_be_read_gives_a_plain_sentence() {
    let root = tempfile::tempdir().unwrap();
    let data = root.path().join("cairn-data");
    let History::Open(open) = History::open(&data, &key()) else {
        panic!("a fresh directory should open");
    };
    drop(open);
    let file = data.join(HISTORY_FILE);
    std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o000)).unwrap();

    let sentence = because(History::open(&data, &key()));
    restore(&file);

    assert_plain(&sentence, &[root.path(), &data]);
}

#[test]
fn a_data_directory_that_cannot_be_made_gives_a_plain_sentence() {
    let root = tempfile::tempdir().unwrap();
    let blocker = root.path().join("not-a-directory");
    std::fs::write(&blocker, b"x").unwrap();
    let data = blocker.join("cairn-data");

    let sentence = because(History::open(&data, &key()));

    assert_plain(&sentence, &[root.path(), &data]);
}

// --- J5: busy is not a wrong key -------------------------------------------

#[test]
fn a_history_held_by_another_connection_is_busy_not_a_wrong_key() {
    let root = tempfile::tempdir().unwrap();
    let data = root.path().join("cairn-data");
    let History::Open(open) = History::open(&data, &key()) else {
        panic!("a fresh directory should open");
    };
    drop(open);

    // Another connection, with the right key, holds the file exclusively.
    let holder = rusqlite::Connection::open(data.join(HISTORY_FILE)).unwrap();
    let hex: String = A_KEY.iter().map(|b| format!("{b:02x}")).collect();
    holder
        .pragma_update(None, "key", format!("x'{hex}'"))
        .unwrap();
    holder.execute_batch("BEGIN EXCLUSIVE").unwrap();

    let sentence = because(History::open(&data, &key()));
    assert_plain(&sentence, &[root.path(), &data]);
    let lower = sentence.to_lowercase();
    assert!(
        !lower.contains("key") && !lower.contains("sealed"),
        "{sentence:?} reads as a wrong key"
    );
    assert!(
        lower.contains("just now"),
        "{sentence:?} should say it may pass"
    );

    // Nothing was withheld for good: once the holder lets go, it opens.
    holder.execute_batch("ROLLBACK").unwrap();
    drop(holder);
    assert!(
        matches!(History::open(&data, &key()), History::Open(_)),
        "the history should open once nothing holds it"
    );
}

#[test]
fn a_wrong_key_still_reads_as_sealed_and_not_as_busy() {
    // Mutation (write-tonight): `is_busy` answering true for every failure
    // survived. A store opened with the wrong key is sealed, in the sentence
    // that says so — never the "just now" one, which would invite a retry that
    // can only ever give the same answer.
    let directory = tempfile::tempdir().unwrap();
    match History::open(directory.path(), &key()) {
        History::Open(_) => {}
        History::Sealed { because } => panic!("a fresh store should open: {because}"),
    }

    let wrong = HistoryKey::Available(Key::from_bytes([9u8; 32]));
    let sentence = because(History::open(directory.path(), &wrong));
    assert!(
        sentence.contains("with the key it has"),
        "a wrong key reads as {sentence:?}"
    );
    assert_plain(&sentence, &[directory.path()]);
}
