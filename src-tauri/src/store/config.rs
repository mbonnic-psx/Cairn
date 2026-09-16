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

/// The evening hour used before the person has chosen one: a stated default,
/// not an arbitrary zero, so the check-in behaves correctly from the first
/// run (FR-007). Named so the same value backs both `serde`'s default and the
/// struct's own `Default` impl below, which is what keeps a freshly created
/// `Config` and a slice `002` file with the field missing indistinguishable.
fn default_evening_hour() -> u8 {
    21
}

/// FR-003's switch defaults to on: the announcement is part of the feature
/// until a person turns it off, not something they have to opt into.
fn default_announce_check_in() -> bool {
    true
}

/// Everything Cairn remembers that is not a reach.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
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
    /// The hour, 0–23, at which the check-in becomes reachable and, if
    /// `announce_check_in` is on, announced. A slice `002` file has no such
    /// key and loads with the stated default above rather than an unchosen
    /// zero (FR-007).
    #[serde(default = "default_evening_hour")]
    pub evening_hour: u8,
    /// Whether the single daily announcement is raised at all. Off never
    /// changes whether the check-in can be opened — only whether Cairn says
    /// anything about it (FR-003).
    #[serde(default = "default_announce_check_in")]
    pub announce_check_in: bool,
    /// The local calendar date an announcement was last raised *for* — which
    /// date, never a count of anything. It lives here, in plain configuration,
    /// rather than in the encrypted history, because it has to survive that
    /// store's key being unavailable: were it sealed instead, a missing key
    /// would make every later check look like the date had never been
    /// announced, and the notification would go out a second time for a date
    /// that already had one — right when the encrypted store is already
    /// unreadable and the person can least afford a repeat (data-model.md).
    #[serde(default)]
    pub last_announced_day: Option<LocalDate>,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            trail: Trail::default(),
            intent: ProtectionIntent::default(),
            reach_mode: ReachModeSetting::default(),
            pending_change: None,
            trusted_clock: TrustedClock::default(),
            seeded: false,
            evening_hour: default_evening_hour(),
            announce_check_in: default_announce_check_in(),
            last_announced_day: None,
        }
    }
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
            Ok(bytes) => serde_json::from_slice(&bytes).map_err(|error| {
                Trouble::new(format!(
                    "Cairn could not read its settings ({error}). Your protection is \
                     unaffected."
                ))
            }),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(Config::default()),
            Err(error) => Err(Trouble::new(format!(
                "Cairn could not open its settings ({error}). Your protection is unaffected."
            ))),
        }
    }

    pub fn save(&self, config: &Config) -> Result<(), Trouble> {
        let bytes = serde_json::to_vec_pretty(config).map_err(|error| {
            Trouble::new(format!("Cairn could not write its settings ({error})."))
        })?;
        super::write_atomically(&self.path, &bytes).map_err(|error| {
            Trouble::new(format!("Cairn could not save its settings ({error})."))
        })
    }
}
