//! The Tauri commands themselves.
//!
//! One line each, over [`AppState`]. Everything they can do is testable without
//! a window, because everything they do is there and not here.
//!
//! Errors come back as the sentence a person reads. There is no error code, no
//! stack, and no domain in any of them (FR-038b, FR-050).

use tauri::State;

use crate::domain::entries::{CategoryId, Domain, ReachMode, Trail};
use crate::domain::normalize::Rejection;
use crate::enforcement::state::ProtectionState;

use crate::store::config::ReachModeSetting;

use super::state::{AppState, CategoryPreset, Disclosures, PendingView, TodaysReaches};

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
/// doing it (FR-047, FR-048).
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

/// Removing an address is a reduction, so it waits like the rest.
#[tauri::command]
pub fn remove_custom_entry(
    state: State<'_, AppState>,
    domain: Domain,
) -> Result<PendingView, String> {
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

#[tauri::command]
pub fn get_disclosures(state: State<'_, AppState>) -> Disclosures {
    state.get_disclosures()
}
