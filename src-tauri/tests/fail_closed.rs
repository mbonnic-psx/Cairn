//! Without the key, Cairn fails closed.
//!
//! FR-036, and the case that decides whether a person can trust Cairn with
//! anything: the keychain is locked, or there is no credential store on this
//! machine at all. What must happen is that Cairn keeps protecting, keeps the
//! existing history exactly as it found it, and says so plainly. What must
//! never happen is a fresh database written over entries nobody could read.
//!
//! The policy half of this runs everywhere. The half that opens a database
//! needs the SQLCipher build, so it runs where that is available.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::services::{CredentialStore, Key, KeyUnavailable, Outcome};
use cairn::store::key::HistoryKey;

/// A machine whose credential store cannot help.
struct NoKey(KeyUnavailable);

impl CredentialStore for NoKey {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        Err(self.0.clone())
    }
    fn delete_history_key(&self) -> Outcome<()> {
        Ok(())
    }
}

fn every_way_it_can_go_wrong() -> Vec<KeyUnavailable> {
    vec![
        KeyUnavailable::Locked,
        KeyUnavailable::NoCredentialStore {
            because: "no Secret Service on this machine".into(),
        },
        KeyUnavailable::Unreadable {
            because: "the stored key is not the right length".into(),
        },
    ]
}

#[test]
fn a_missing_key_seals_the_history_rather_than_replacing_it() {
    for unavailable in every_way_it_can_go_wrong() {
        let key = HistoryKey::obtain(&NoKey(unavailable.clone()));

        assert!(!key.is_available(), "{unavailable:?}");
        assert!(key.explanation().is_some(), "it has to say something");
    }
}

#[test]
fn what_it_says_is_that_protection_is_unaffected() {
    // The person's first question is whether they are still protected. The
    // answer is yes, and it is in the first sentence rather than implied.
    for unavailable in every_way_it_can_go_wrong() {
        let key = HistoryKey::obtain(&NoKey(unavailable));
        let said = key.explanation().unwrap();

        assert!(
            said.to_lowercase().contains("protection is unaffected"),
            "{said}"
        );
    }
}

#[test]
fn it_never_asks_for_a_passphrase() {
    // FR-034, SC-015. Cairn does not invent a keystore, and it does not fall
    // back to asking the person to remember something.
    for unavailable in every_way_it_can_go_wrong() {
        let said = HistoryKey::obtain(&NoKey(unavailable))
            .explanation()
            .unwrap();
        let lowered = said.to_lowercase();

        for asking in ["passphrase", "password", "enter your", "type your"] {
            assert!(!lowered.contains(asking), "{said}");
        }
    }
}

#[test]
fn it_does_not_blame_anyone() {
    for unavailable in every_way_it_can_go_wrong() {
        let said = HistoryKey::obtain(&NoKey(unavailable))
            .explanation()
            .unwrap();
        let lowered = said.to_lowercase();

        for word in ["failed", "denied", "error", "invalid", "forbidden"] {
            assert!(!lowered.contains(word), "{said}");
        }
    }
}

/// The half that needs a database. Runs wherever SQLCipher can be built.
#[cfg(feature = "history")]
mod with_a_database {
    use super::*;
    use cairn::store::history::History;

    /// Entries from a previous run that nobody can currently read.
    const EXISTING: &[u8] = b"SQLite format 3\x00-- not really, but it is theirs";

    #[test]
    fn an_unreadable_history_is_left_byte_for_byte_as_it_was() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join(cairn::store::history::HISTORY_FILE);
        std::fs::write(&path, EXISTING).unwrap();

        let key = HistoryKey::obtain(&NoKey(KeyUnavailable::Locked));
        let history = History::open(directory.path(), &key);

        assert!(!history.is_open());
        assert_eq!(
            std::fs::read(&path).unwrap(),
            EXISTING,
            "the existing history must not be touched, let alone replaced"
        );
    }

    #[test]
    fn recording_a_reach_into_a_sealed_history_changes_nothing_and_raises_nothing() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join(cairn::store::history::HISTORY_FILE);
        std::fs::write(&path, EXISTING).unwrap();

        let key = HistoryKey::obtain(&NoKey(KeyUnavailable::Locked));
        let history = History::open(directory.path(), &key);

        // A reach happens. Blocking is unaffected, nothing is shown, and
        // nothing is written over.
        history.record("example.com", 1_700_000_000);

        assert_eq!(std::fs::read(&path).unwrap(), EXISTING);
    }

    #[test]
    fn a_reach_is_a_domain_and_a_time_and_nothing_else() {
        // The schema is the guarantee: no code change can start recording a
        // path or a process without a migration someone has to review.
        let directory = tempfile::tempdir().unwrap();
        let key = Key::from_bytes([7u8; 32]);
        let history = History::open(directory.path(), &HistoryKey::Available(key));

        let History::Open(open) = history else {
            panic!("a fresh directory with a good key should open");
        };

        let mut columns = open.columns_of_reaches().unwrap();
        columns.sort();
        assert_eq!(columns, vec!["at".to_string(), "domain".to_string()]);
    }

    #[test]
    fn what_was_recorded_comes_back() {
        let directory = tempfile::tempdir().unwrap();
        let key = Key::from_bytes([7u8; 32]);
        let History::Open(open) =
            History::open(directory.path(), &HistoryKey::Available(key))
        else {
            panic!("should open");
        };

        open.record("example.com", 1_700_000_100).unwrap();
        open.record("news.example", 1_700_000_200).unwrap();

        let found = open.between(1_700_000_000, 1_700_000_300).unwrap();
        assert_eq!(found.len(), 2);
        assert_eq!(found[0].domain, "example.com");
    }

    #[test]
    fn the_file_on_disk_is_not_readable_as_a_database() {
        // SC-014: opaque at rest. Page-level encryption means the header itself
        // is encrypted — a plain SQLite file starts with "SQLite format 3".
        let directory = tempfile::tempdir().unwrap();
        let key = Key::from_bytes([7u8; 32]);
        let History::Open(open) =
            History::open(directory.path(), &HistoryKey::Available(key))
        else {
            panic!("should open");
        };
        open.record("example.com", 1_700_000_100).unwrap();
        drop(open);

        let bytes =
            std::fs::read(directory.path().join(cairn::store::history::HISTORY_FILE))
                .unwrap();
        assert!(
            !bytes.starts_with(b"SQLite format 3"),
            "the file is not encrypted"
        );

        let text = String::from_utf8_lossy(&bytes);
        assert!(
            !text.contains("example.com"),
            "a domain is readable on disk"
        );
    }

    #[test]
    fn a_wrong_key_seals_rather_than_starting_again() {
        let directory = tempfile::tempdir().unwrap();

        let History::Open(open) = History::open(
            directory.path(),
            &HistoryKey::Available(Key::from_bytes([7u8; 32])),
        ) else {
            panic!("should open");
        };
        open.record("example.com", 1_700_000_100).unwrap();
        drop(open);

        let path = directory.path().join(cairn::store::history::HISTORY_FILE);
        let before = std::fs::read(&path).unwrap();

        let with_wrong_key = History::open(
            directory.path(),
            &HistoryKey::Available(Key::from_bytes([9u8; 32])),
        );

        assert!(!with_wrong_key.is_open(), "a wrong key must not open it");
        assert_eq!(
            std::fs::read(&path).unwrap(),
            before,
            "and must not write over what is there"
        );
    }
}
