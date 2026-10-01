//! G4: "empty" means nothing visible, the same on both sides of the screen.
//!
//! The cases live in `fixtures/nothing_visible.json`, which the screen's own
//! test reads too, so the two predicates cannot drift apart unnoticed.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::visible::shows_nothing;

fn cases(list: &str) -> Vec<(String, String)> {
    let file: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/nothing_visible.json")).unwrap();
    file[list]
        .as_array()
        .unwrap()
        .iter()
        .map(|pair| {
            (
                pair[0].as_str().unwrap().to_string(),
                pair[1].as_str().unwrap().to_string(),
            )
        })
        .collect()
}

#[test]
fn text_that_shows_nothing_is_nothing() {
    for (name, text) in cases("nothing") {
        assert!(shows_nothing(&text), "{name} should show nothing");
    }
}

#[test]
fn text_with_anything_visible_in_it_is_something() {
    for (name, text) in cases("something") {
        assert!(!shows_nothing(&text), "{name} should count as writing");
    }
}

#[cfg(feature = "history")]
mod store {
    use super::cases;
    use cairn::domain::dates::LocalDate;
    use cairn::services::Key;
    use cairn::store::history::{History, OpenHistory};
    use cairn::store::key::HistoryKey;

    fn open_store(directory: &std::path::Path) -> OpenHistory {
        let History::Open(open) = History::open(
            directory,
            &HistoryKey::Available(Key::from_bytes([7u8; 32])),
        ) else {
            panic!("a fresh directory with a good key should open");
        };
        open
    }

    fn day() -> LocalDate {
        LocalDate::new(2026, 8, 15).unwrap()
    }

    #[test]
    fn invisible_text_is_refused_over_a_kept_entry_which_stays() {
        let directory = tempfile::tempdir().unwrap();
        let open = open_store(directory.path());
        open.save_entry(day(), "kept", 1).unwrap();
        for (name, text) in cases("nothing") {
            assert!(
                open.save_entry(day(), &text, 2).is_err(),
                "{name} was saved"
            );
            assert_eq!(
                open.entry_for(day()).unwrap().unwrap().text,
                "kept",
                "{name} replaced the kept entry"
            );
        }
        assert_eq!(open.journal_entry_count().unwrap(), 1);
    }

    #[test]
    fn writing_with_invisible_characters_among_visible_ones_is_saved_unchanged() {
        let directory = tempfile::tempdir().unwrap();
        let open = open_store(directory.path());
        for (name, text) in cases("something") {
            open.save_entry(day(), &text, 3).unwrap();
            assert_eq!(
                open.entry_for(day()).unwrap().unwrap().text,
                text,
                "{name} was altered"
            );
        }
    }
}
