//! The privileged helper process.
//!
//! Two things run here and nothing else: the heartbeat that advances the
//! trusted clock and keeps Cairn's section in force (FR-013, FR-047d), and the
//! peer-authenticated channel that answers the closed verb list.
//!
//! It never opens a window, never writes a diagnostic containing a domain
//! (FR-038b), and never speaks to anything off this machine.

use std::path::PathBuf;
use std::time::Duration;

use cairn_helper::heartbeat::{ClockKeeper, HEARTBEAT_SECONDS};
use cairn_helper::machine::Machine;

/// Recorded at install time: the person Cairn was installed for.
const OWNER_FILE: &str = "owner";

fn main() {
    let data = data_directory();
    let machine = Machine::real(&data);
    let clock = ClockKeeper::at(&data);
    clock.start();

    std::thread::spawn({
        let keeper = ClockKeeper::at(&data);
        move || loop {
            std::thread::sleep(Duration::from_secs(HEARTBEAT_SECONDS));
            keeper.beat();
        }
    });

    #[cfg(unix)]
    {
        let owner = owner_uid(&data);
        if let Err(error) = cairn_helper::channel::unix::serve(&machine, &clock, owner) {
            // No domain, no reach, nothing about what is protected (FR-038b).
            eprintln!("cairn-helper: the channel closed ({error})");
            std::process::exit(1);
        }
    }

    #[cfg(not(unix))]
    {
        let _ = &machine;
        eprintln!("cairn-helper: this build has no channel for this platform yet");
        std::process::exit(1);
    }
}

/// Who may talk to the helper. With nothing recorded, only root may — the
/// helper does not guess at an owner.
#[cfg(unix)]
fn owner_uid(data: &std::path::Path) -> u32 {
    std::fs::read_to_string(data.join(OWNER_FILE))
        .ok()
        .and_then(|recorded| recorded.trim().parse().ok())
        .unwrap_or(0)
}

/// Cairn's own directory, owned by the helper and readable without a key.
fn data_directory() -> PathBuf {
    if let Some(from_environment) = std::env::var_os("CAIRN_DATA_DIR") {
        return PathBuf::from(from_environment);
    }

    #[cfg(windows)]
    {
        let root =
            std::env::var_os("ProgramData").unwrap_or_else(|| r"C:\ProgramData".into());
        PathBuf::from(root).join("Cairn")
    }
    #[cfg(target_os = "macos")]
    {
        PathBuf::from("/Library/Application Support/Cairn")
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        PathBuf::from("/var/lib/cairn")
    }
}
