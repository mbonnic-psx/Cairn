//! Configuration: what is protected, and what Cairn intends.
//!
//! Plain JSON, and it holds no reach data — not a domain someone reached for,
//! not a count, not a timestamp of one. That is what makes it safe to leave
//! readable, and it is asserted by a test rather than by intent (FR-032).

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::domain::dates::LocalDate;
use crate::domain::entries::{ReachMode, Trail};
use crate::domain::gate::{PendingChange, TrustedClock};
use crate::services::Trouble;

/// The file name inside the person's own user-data directory.
pub const CONFIG_FILE: &str = "config.json";

/// Whether protection is meant to be on. What is actually in force is a
/// different question, and is only ever answered by reading the machine
/// (FR-012).
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProtectionIntent {
    #[default]
    Off,
    On,
}

/// How the reach mode was arrived at. A person's own choice is not quietly
/// overwritten by a later automatic check (FR-027, FR-029).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct ReachModeSetting {
    pub mode: ReachMode,
    pub chosen_by: ChosenBy,
    /// One sentence, shown when Cairn made the choice.
    pub fallback_reason: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChosenBy {
    Person,
    Automatic,
}

impl Default for ReachModeSetting {
    fn default() -> Self {
        // Counted by default (FR-026).
        ReachModeSetting {
            mode: ReachMode::Counted,
            chosen_by: ChosenBy::Automatic,
            fallback_reason: None,
        }
    }
}

/// The day's one line, remembered with the day it was chosen for (slice
/// `quote`, Q1 revised again). A setting, not a record of anything: it names a
/// bundled line and a day, never a reach.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct QuoteOfTheDay {
    pub day: LocalDate,
    pub line: String,
}

/// Everything Cairn remembers that is not a reach.
#[derive(Clone, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub trail: Trail,
    #[serde(default)]
    pub intent: ProtectionIntent,
    #[serde(default)]
    pub reach_mode: ReachModeSetting,
    /// The one pending reduction, if there is one. There is never more than
    /// one route out (FR-047).
    #[serde(default)]
    pub pending_change: Option<PendingChange>,
    /// The advance-only clock the waiting period is measured against.
    #[serde(default)]
    pub trusted_clock: TrustedClock,
    /// True once the shipped category seeds have been copied into the person's
    /// own editable data (FR-002).
    #[serde(default)]
    pub seeded: bool,
    /// True once the person has hidden quotes on the check-in (slice `quote`,
    /// Q2). Stored this way round so a file from before the switch, which has
    /// no such key, means quotes are shown. A setting, not a record of
    /// anything, so it is readable with no key.
    #[serde(default)]
    pub quotes_hidden: bool,
    /// The line chosen for a local day, kept so it holds across restarts. A
    /// file from before this has no such key, and means none chosen yet.
    #[serde(default)]
    pub quote_of_the_day: Option<QuoteOfTheDay>,
}

/// Reads and writes [`Config`] in the person's own user-data directory.
pub struct ConfigStore {
    path: PathBuf,
}

impl ConfigStore {
    pub fn at(directory: &Path) -> Self {
        ConfigStore {
            path: directory.join(CONFIG_FILE),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// A missing file is not a problem: it is a first run.
    pub fn load(&self) -> Result<Config, Trouble> {
        match std::fs::read(&self.path) {
            // Sentences Cairn wrote, never the system's or the parser's own
            // words: those can carry a banned word or a path with the
            // person's name in it, and they arrive too late for any check.
            Ok(bytes) => serde_json::from_slice(&bytes).map_err(|_| {
                Trouble::new(
                    "Cairn could not make sense of its settings, so it has left them \
                     exactly as they are. Your protection is unaffected.",
                )
            }),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                Ok(Config::default())
            }
            Err(_) => Err(Trouble::new(
                "Cairn could not open its settings. Your protection is unaffected.",
            )),
        }
    }

    pub fn save(&self, config: &Config) -> Result<(), Trouble> {
        let bytes = serde_json::to_vec_pretty(config).map_err(|_| not_saved())?;
        super::write_atomically(&self.path, &bytes).map_err(|_| not_saved())
    }
}

/// The settings on disk are the ones that were there before: the write goes to a
/// neighbour and is renamed over only once it is whole.
fn not_saved() -> Trouble {
    Trouble::new(
        "Cairn could not save its settings, so that change has not been kept. Your \
         protection is unaffected.",
    )
}
