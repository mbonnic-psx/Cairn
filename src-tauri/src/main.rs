// The unelevated application. It never writes a system file: every privileged
// action goes to the helper over a peer-authenticated channel, and the helper
// exposes a closed verb list (contracts/helper-ipc.md).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Cairn could not open its window");
}
