//! Saving what the person wrote (T030).

use crate::domain::dates::LocalDate;
use crate::services::Trouble;
use crate::store::history::OpenHistory;

/// Save `text` as the entry for `day`, replacing any entry it had.
///
/// Refuses empty or whitespace-only text, which stores nothing and leaves an
/// entry already there as it was (FR-014; the store proves it). There is no
/// way to call this with a sealed history: it takes an open one.
pub fn save(
    history: &OpenHistory,
    day: LocalDate,
    text: &str,
    written_at: i64,
) -> Result<(), Trouble> {
    history.save_entry(day, text, written_at)
}
