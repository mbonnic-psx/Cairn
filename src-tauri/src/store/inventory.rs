//! Every change Cairn made to this machine, and how to undo it.
//!
//! Principle IV. Teardown walks this list in reverse, verifies each removal,
//! and reports what it could not remove (FR-041, FR-043, FR-044). The helper's
//! own installation is in here: it is not exempt from teardown.
//!
//! Two properties this file has to keep, and neither is negotiable:
//!
//! 1. **It is readable without a key.** If the credential store is unavailable,
//!    Cairn must still be able to put the machine back.
//! 2. **It is append-only.** A change is recorded before it is made, so an
//!    interrupted write leaves a record of something that might be there rather
//!    than no record of something that is.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::services::Trouble;

pub const INVENTORY_FILE: &str = "inventory.json";
pub const BACKUP_DIRECTORY: &str = "backups";

/// A system file Cairn is allowed to touch.
///
/// An enum rather than a path: the helper takes no path from a caller, so
/// nothing outside this list can ever be written or restored
/// (contracts/helper-ipc.md).
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Target {
    /// The system's own address list.
    SystemHosts,
}

impl Target {
    /// The file name a backup of this target is kept under.
    pub fn backup_name(self) -> &'static str {
        match self {
            Target::SystemHosts => "hosts.before-cairn",
        }
    }

    /// What this is called in front of a person.
    pub fn label(self) -> &'static str {
        match self {
            Target::SystemHosts => "the system's list of site addresses",
        }
    }
}

/// One thing Cairn did.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum Change {
    /// A one-time copy of a file's true pre-Cairn contents (FR-039).
    BackupWritten {
        target: Target,
        captured_at: i64,
        /// Of the pre-Cairn content, so restoration can be checked rather than
        /// assumed.
        sha256: String,
    },
    /// Cairn's marked region, written into a file it does not own.
    HostsSection {
        target: Target,
        applied_at: i64,
        /// Whether Cairn contributed the newline in front of its region. Without
        /// this, removal cannot be exact on a file that never ended in one
        /// (`domain::splice`).
        separator_added: bool,
    },
    /// The privileged helper itself.
    HelperInstalled {
        installed_at: i64,
        /// Enough to find and remove it: a service name, a launchd label, a unit
        /// name. Which of those it is belongs to the platform layer.
        identifier: String,
    },
}

impl Change {
    /// What this change is called in a teardown report.
    pub fn label(&self) -> String {
        match self {
            Change::BackupWritten { target, .. } => {
                format!("a copy of {} as it was before Cairn", target.label())
            }
            Change::HostsSection { target, .. } => {
                format!("Cairn's own section in {}", target.label())
            }
            Change::HelperInstalled { .. } => {
                "the background component that keeps protection in force".into()
            }
        }
    }
}

/// The append-only record.
#[derive(Clone, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
pub struct ChangeInventory {
    #[serde(default)]
    pub changes: Vec<Change>,
}

impl ChangeInventory {
    /// Teardown order: the reverse of the order things were done in (FR-043).
    pub fn in_teardown_order(&self) -> impl Iterator<Item = &Change> {
        self.changes.iter().rev()
    }

    /// Whether a backup already exists for a target. A second backup would
    /// capture Cairn's own work as if it were the machine's, which is exactly
    /// what FR-039 forbids.
    pub fn has_backup(&self, target: Target) -> bool {
        self.changes.iter().any(|change| {
            matches!(change, Change::BackupWritten { target: recorded, .. } if *recorded == target)
        })
    }

    /// What Cairn recorded about its own region in a file.
    pub fn hosts_section(&self, target: Target) -> Option<&Change> {
        self.changes.iter().rev().find(|change| {
            matches!(change, Change::HostsSection { target: recorded, .. } if *recorded == target)
        })
    }

    /// Whether Cairn contributed the separator newline in front of its region.
    pub fn separator_added(&self, target: Target) -> bool {
        matches!(
            self.hosts_section(target),
            Some(Change::HostsSection {
                separator_added: true,
                ..
            })
        )
    }
}

/// Reads and writes the inventory, and holds the one-time backups beside it.
pub struct InventoryStore {
    path: PathBuf,
    backups: PathBuf,
}

impl InventoryStore {
    pub fn at(directory: &Path) -> Self {
        InventoryStore {
            path: directory.join(INVENTORY_FILE),
            backups: directory.join(BACKUP_DIRECTORY),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn backup_path(&self, target: Target) -> PathBuf {
        self.backups.join(target.backup_name())
    }

    pub fn load(&self) -> Result<ChangeInventory, Trouble> {
        match std::fs::read(&self.path) {
            Ok(bytes) => serde_json::from_slice(&bytes).map_err(|error| {
                Trouble::new(format!(
                    "Cairn could not read its record of what it has changed on this \
                     machine ({error}). Nothing has been undone."
                ))
            }),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                Ok(ChangeInventory::default())
            }
            Err(error) => Err(Trouble::new(format!(
                "Cairn could not open its record of what it has changed on this machine \
                 ({error}). Nothing has been undone."
            ))),
        }
    }

    /// Append one change and write immediately.
    ///
    /// Called *before* the change is made. A record of something that might be
    /// there is recoverable; a change with no record is not.
    pub fn record(&self, change: Change) -> Result<ChangeInventory, Trouble> {
        let mut inventory = self.load()?;
        inventory.changes.push(change);
        self.save(&inventory)?;
        Ok(inventory)
    }

    pub fn save(&self, inventory: &ChangeInventory) -> Result<(), Trouble> {
        let bytes = serde_json::to_vec_pretty(inventory).map_err(|error| {
            Trouble::new(format!(
                "Cairn could not write its record of changes ({error})."
            ))
        })?;
        super::write_atomically(&self.path, &bytes).map_err(|error| {
            Trouble::new(format!(
                "Cairn could not save its record of changes ({error})."
            ))
        })
    }

    /// Remove one recorded change from the inventory once it has actually been
    /// undone and verified.
    pub fn forget(&self, change: &Change) -> Result<(), Trouble> {
        let mut inventory = self.load()?;
        inventory.changes.retain(|recorded| recorded != change);
        self.save(&inventory)
    }
}

/// The digest a backup and a restoration are compared against.
pub fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}
