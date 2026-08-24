//! The privileged helper process.
//!
//! It keeps the trusted clock advancing and Cairn's section in force. The
//! peer-authenticated channel the unelevated app talks to it over arrives with
//! the channel work; until then this binary runs the heartbeat only, and
//! answers nothing.

use std::path::PathBuf;
use std::time::Duration;

use cairn_helper::heartbeat::{ClockKeeper, HEARTBEAT_SECONDS};

fn main() {
    let data = data_directory();
    let clock = ClockKeeper::at(&data);
    clock.start();

    loop {
        std::thread::sleep(Duration::from_secs(HEARTBEAT_SECONDS));
        clock.beat();
    }
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
