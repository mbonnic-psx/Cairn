//! The Tauri commands themselves.
//!
//! One line each, over [`AppState`]. Everything they can do is testable without
//! a window, because everything they do is there and not here.
//!
//! Errors come back as the sentence a person reads. There is no error code, no
//! stack, and no domain in any of them (FR-038b, FR-050).

use tauri::State;

use crate::domain::dates::LocalDate;
use crate::domain::entries::{CategoryId, Domain, ReachMode, Trail};
use crate::domain::normalize::Rejection;
use crate::enforcement::state::ProtectionState;

use crate::store::config::ReachModeSetting;

use super::state::{
    AppState, CategoryPreset, DayView, Disclosures, OffsetChange, Patterns, PendingView,
    TodaysReaches,
};

#[tauri::command]
pub fn get_protection_state(
    state: State<'_, AppState>,
) -> Result<ProtectionState, String> {
    state
        .get_protection_state()
        .map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn get_trail(state: State<'_, AppState>) -> Result<Trail, String> {
    state.get_trail().map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn list_categories(
    state: State<'_, AppState>,
) -> Result<Vec<CategoryPreset>, String> {
    state.list_categories().map_err(|trouble| trouble.message)
}

/// Enabling protects more and applies at once. Disabling protects less, so it
/// goes through the waiting period instead — this command says so rather than
/// doing it (FR-047, FR-048). Before anything is in force there is no wall to
/// weaken, and disabling applies at once; the answer is then `None`.
#[tauri::command]
pub fn set_category_enabled(
    state: State<'_, AppState>,
    id: CategoryId,
    on: bool,
) -> Result<Option<PendingView>, String> {
    state
        .set_category_enabled(id, on)
        .map_err(|trouble| trouble.message)
}

/// **The single reduction path** (FR-047). There is no command that turns
/// protection off now, and no privileged verb that could implement one.
#[tauri::command]
pub fn request_protection_off(state: State<'_, AppState>) -> Result<PendingView, String> {
    state
        .request_protection_off()
        .map_err(|trouble| trouble.message)
}

/// Removing an address is a reduction, so it waits like the rest — unless
/// nothing is in force yet, when it applies at once and the answer is `None`.
#[tauri::command]
pub fn remove_custom_entry(
    state: State<'_, AppState>,
    domain: Domain,
) -> Result<Option<PendingView>, String> {
    state
        .remove_custom_entry(domain)
        .map_err(|trouble| trouble.message)
}

/// Always available while a change is waiting (FR-047c).
#[tauri::command]
pub fn cancel_pending_change(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    state
        .cancel_pending_change(&id)
        .map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn get_pending_change(
    state: State<'_, AppState>,
) -> Result<Option<PendingView>, String> {
    state
        .get_pending_change()
        .map_err(|trouble| trouble.message)
}

// There is deliberately no `apply_due_reduction` command either.
//
// It refuses anything that has not served its day, so exposing it could not
// skip the wait — but the interface has no business asking for a reduction to
// land. It runs from the app's own start and heartbeat, so a change takes
// effect because time passed, not because someone came back and pressed
// something.

// There is deliberately no `tear_down` command.
//
// Teardown removes all protection at once, so exposing it to the interface
// would be an in-moment escape hatch spelled a different way — ask to remove
// Cairn, and protection is gone now. Principle I has no exception for that.
//
// Teardown runs from `apply_due_reduction`, after a change has served its day,
// and from removing the application itself, which is a later slice.

#[tauri::command]
pub fn delete_all_data(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    state.delete_all_data().map_err(|trouble| trouble.message)
}

/// One address at a time. A rejection carries a sentence, shown as written.
#[tauri::command]
pub fn add_custom_entry(
    state: State<'_, AppState>,
    input: String,
) -> Result<Vec<Domain>, Rejection> {
    state.add_custom_entry(&input)
}

#[tauri::command]
pub fn turn_protection_on(state: State<'_, AppState>) -> Result<ProtectionState, String> {
    state
        .turn_protection_on()
        .map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn get_reach_mode(state: State<'_, AppState>) -> Result<ReachModeSetting, String> {
    state.get_reach_mode().map_err(|trouble| trouble.message)
}

/// In either direction (FR-029). Choosing silence is honoured; choosing
/// counting depends on whether the ports are free, and says so if they are not.
#[tauri::command]
pub fn set_reach_mode(
    state: State<'_, AppState>,
    mode: ReachMode,
) -> Result<ReachModeSetting, String> {
    state
        .set_reach_mode(mode)
        .map_err(|trouble| trouble.message)
}

/// **The Reaches screen is the only caller** (FR-030a).
#[tauri::command]
pub fn list_todays_reaches(
    state: State<'_, AppState>,
    day_start: i64,
    day_end: i64,
) -> TodaysReaches {
    state.list_todays_reaches(day_start, day_end)
}

/// A range of days, by site and by hour, with the offsets the computer's clock
/// had across it. **The Reaches screen is the only caller**
/// (FR-030a): an ESLint rule restricts `src/ipc/reaches.ts`.
#[tauri::command]
pub fn summarize_reaches(
    state: State<'_, AppState>,
    first_day: LocalDate,
    last_day: LocalDate,
    range_start: i64,
    range_end: i64,
    offsets: Vec<OffsetChange>,
) -> Patterns {
    state.summarize_reaches(first_day, last_day, range_start, range_end, &offsets)
}

/// One day, whole. **The check-in and the single-day screen are the only
/// callers** (FR-033): an ESLint rule restricts `src/ipc/journal.ts`.
#[tauri::command]
pub fn get_day(
    state: State<'_, AppState>,
    day: LocalDate,
    day_start: i64,
    day_end: i64,
) -> DayView {
    state.get_day(day, day_start, day_end)
}

/// The Err is a sentence shown to the person exactly as written.
#[tauri::command]
pub fn save_journal_entry(
    state: State<'_, AppState>,
    day: LocalDate,
    day_start: i64,
    day_end: i64,
    text: String,
) -> Result<DayView, String> {
    state.save_journal_entry(day, day_start, day_end, &text)
}

/// A line for the check-in, or nothing. **The check-in is the only caller**:
/// the wrapper lives in `src/ipc/journal.ts`, which an ESLint rule restricts.
#[tauri::command]
pub fn get_quote(state: State<'_, AppState>, day: LocalDate) -> Option<String> {
    state.get_quote(day)
}

/// Whether quotes are shown on the check-in. A setting, readable without the key.
#[tauri::command]
pub fn get_quotes_shown(state: State<'_, AppState>) -> Result<bool, String> {
    state.get_quotes_shown().map_err(|trouble| trouble.message)
}

/// The quiet switch on the check-in. Changes nothing about protection.
#[tauri::command]
pub fn set_quotes_shown(state: State<'_, AppState>, shown: bool) -> Result<bool, String> {
    state
        .set_quotes_shown(shown)
        .map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn get_disclosures(state: State<'_, AppState>) -> Disclosures {
    state.get_disclosures()
}
