// The unelevated application, and the composition root.
//
// It never writes a system file: every privileged action goes to the helper
// over a peer-authenticated channel, and the helper exposes a closed verb list
// (contracts/helper-ipc.md). The platform implementations are chosen here and
// nowhere else — nothing above this file knows which operating system it is on.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::HelperChannel;
#[cfg(not(unix))]
use cairn::helper::NoHelper;
use cairn::ipc::{commands, AppState};
use cairn::platform::{PlatformElevation, SystemHosts};
use cairn::store::config::ConfigStore;

fn main() {
    let data = data_directory();

    let state = AppState {
        config: ConfigStore::at(&data),
        data_directory: data.clone(),
        credentials: Box::new(cairn::platform::PlatformCredentials),
        categories: CategoryStore::at(&data),
        shipped_categories: shipped_categories(),
        shipped_quotes: shipped_quotes(),
        hosts: Box::new(SystemHosts::default()),
        helper: helper_channel(),
        elevation: Box::new(PlatformElevation::default()),
        reserved: ReservedNames {
            own_hostname: hostname(),
        },
        now: now_seconds,
        roll,
    };

    // First run copies the shipped lists into the person's own data. A machine
    // that cannot do that has nothing changed on it; the interface says so.
    let _ = state.ensure_seeded();

    // A change that served its day takes effect because time passed, not
    // because someone came back and asked again. This is the only caller.
    let _ = state.apply_due_reduction();

    // Counting is threads accepting on Cairn's ports, and closing the window
    // ends it — there is no autostart and no tray yet. So it starts here, the
    // gap since Cairn was last running goes into the record first, and the reach
    // mode settles to whatever this actually achieved rather than to what was
    // intended (Principle III).
    let _ = state.start_counting();

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::get_protection_state,
            commands::get_trail,
            commands::list_categories,
            commands::set_category_enabled,
            commands::add_custom_entry,
            commands::turn_protection_on,
            commands::get_reach_mode,
            commands::set_reach_mode,
            commands::list_todays_reaches,
            commands::get_disclosures,
            commands::request_protection_off,
            commands::remove_custom_entry,
            commands::cancel_pending_change,
            commands::get_pending_change,
            commands::delete_all_data,
            commands::get_day,
            commands::save_journal_entry,
            commands::get_quote,
            commands::get_quotes_shown,
            commands::set_quotes_shown,
        ])
        .run(tauri::generate_context!())
        .expect("Cairn could not open its window");
}

fn now_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs() as i64)
        .unwrap_or_default()
}

/// A fresh random number for each check-in's line (slice `quote`, Q1). A
/// quote is not a secret, so a machine whose random source will not answer
/// falls back to the clock's nanoseconds, which still differ per opening.
fn roll() -> u64 {
    getrandom::u64().unwrap_or_else(|_| {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|elapsed| u64::from(elapsed.subsec_nanos()))
            .unwrap_or_default()
    })
}

#[cfg(unix)]
fn helper_channel() -> Box<dyn HelperChannel> {
    Box::new(cairn::helper::InstalledHelper::default())
}

/// Windows talks to the helper over a named pipe, which is still to come. Until
/// then the app says it cannot reach the helper rather than pretending it can.
#[cfg(not(unix))]
fn helper_channel() -> Box<dyn HelperChannel> {
    Box::new(NoHelper)
}

/// The person's own data, never anywhere shared (FR-032).
fn data_directory() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Cairn")
}

/// The lists Cairn ships, beside the application.
fn shipped_categories() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(std::path::Path::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("resources/categories")
}

/// The lines Cairn ships for the check-in, beside the application.
fn shipped_quotes() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(std::path::Path::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("resources/quotes/quotes.json")
}

/// This machine's own name, so protecting it can be refused (FR-007).
fn hostname() -> Option<String> {
    std::env::var("HOSTNAME")
        .ok()
        .or_else(|| std::env::var("COMPUTERNAME").ok())
        .or_else(|| std::fs::read_to_string("/etc/hostname").ok())
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty())
}
