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

use super::state::{AppState, CategoryPreset, Disclosures};

#[tauri::command]
pub fn get_protection_state(state: State<'_, AppState>) -> Result<ProtectionState, String> {
    state.get_protection_state().map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn get_trail(state: State<'_, AppState>) -> Result<Trail, String> {
    state.get_trail().map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn list_categories(state: State<'_, AppState>) -> Result<Vec<CategoryPreset>, String> {
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
) -> Result<(), String> {
    state
        .set_category_enabled(id, on)
        .map_err(|trouble| trouble.message)
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
    state.turn_protection_on().map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn get_reach_mode(state: State<'_, AppState>) -> Result<ReachMode, String> {
    state.get_reach_mode().map_err(|trouble| trouble.message)
}

#[tauri::command]
pub fn get_disclosures(state: State<'_, AppState>) -> Disclosures {
    state.get_disclosures()
}
