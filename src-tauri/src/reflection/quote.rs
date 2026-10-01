//! The quote on the check-in (T031; slice `quote`).
//!
//! Read from the set Cairn ships beside the application, never fetched
//! (FR-009), never written, and never copied into the person's data. A set
//! that is missing, unreadable, or holds no line is no quote, and a check-in
//! without one is complete (FR-008): there is nothing to report and nothing to
//! put in its place.
//!
//! Nothing here touches the history, so it is built with or without it.

use std::path::Path;

use serde::Deserialize;

use crate::domain::quotes::choose;

/// The bundled file's shape. Its other keys (`id`, `note`) are for whoever
/// edits the set, and are tolerated rather than read.
#[derive(Deserialize)]
struct Bundled {
    #[serde(default)]
    quotes: Vec<String>,
}

/// The lines of the set at `path`. Any trouble reading it is no lines.
pub fn bundled_lines(path: &Path) -> Vec<String> {
    std::fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<Bundled>(&bytes).ok())
        .map(|set| {
            set.quotes
                .into_iter()
                .filter(|line| !line.trim().is_empty())
                .collect()
        })
        .unwrap_or_default()
}

/// The line `roll` names from the set at `path`, or nothing.
pub fn quote(path: &Path, roll: u64) -> Option<String> {
    choose(&bundled_lines(path), roll).map(str::to_string)
}
