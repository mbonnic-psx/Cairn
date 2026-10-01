//! `WriteBackupOnce` and `RemoveBackup`.
//!
//! The backup is the thing that makes every other privileged write reversible,
//! so it is written before anything is modified and **never** overwritten —
//! including when a previous install left one behind (FR-039, FR-042). A second
//! backup would capture Cairn's own work as though it were the machine's, which
//! is the one way to lose the true original for good.

use cairn::protocol::{Response, TroubleKind};
use cairn::store::inventory::{sha256_hex, Change, Target};

use super::{now_seconds, trouble, unreachable};
use crate::machine::Machine;

pub fn write_backup_once(machine: &Machine, target: Target) -> Response {
    let store = machine.inventory();
    let inventory = match store.load() {
        Ok(inventory) => inventory,
        Err(problem) => return trouble(TroubleKind::Unreachable, problem.message),
    };

    let backup_path = store.backup_path(target);

    // Already safe. That is a success, not a problem.
    if inventory.has_backup(target) || backup_path.exists() {
        return match std::fs::read(&backup_path) {
            Ok(existing) => Response::BackupWritten {
                written: false,
                sha256: sha256_hex(&existing),
            },
            Err(_) => trouble(
                TroubleKind::Unreachable,
                format!(
                    "Cairn has a record of an earlier copy of {} but cannot read it. \
                     Nothing has been changed.",
                    target.label()
                ),
            ),
        };
    }

    let original = match machine.read(target) {
        Ok(bytes) => bytes,
        Err(_) => return unreachable(),
    };
    let sha256 = sha256_hex(&original);

    if let Some(directory) = backup_path.parent() {
        if std::fs::create_dir_all(directory).is_err() {
            return no_copy_kept(target);
        }
    }
    if std::fs::write(&backup_path, &original).is_err() {
        return no_copy_kept(target);
    }

    if let Err(problem) = store.record(Change::BackupWritten {
        target,
        captured_at: now_seconds(),
        sha256: sha256.clone(),
    }) {
        return trouble(TroubleKind::Unreachable, problem.message);
    }

    Response::BackupWritten {
        written: true,
        sha256,
    }
}

/// Remove the backup, and say whether the file it protected is genuinely back
/// to its pre-Cairn contents.
///
/// The check is a comparison against the recorded digest, not an assumption
/// that removal worked (FR-044).
pub fn remove_backup(machine: &Machine, target: Target) -> Response {
    let store = machine.inventory();
    let inventory = match store.load() {
        Ok(inventory) => inventory,
        Err(problem) => return trouble(TroubleKind::Unreachable, problem.message),
    };

    let recorded = inventory.changes.iter().find_map(|change| match change {
        Change::BackupWritten {
            target: recorded,
            sha256,
            ..
        } if *recorded == target => Some((change.clone(), sha256.clone())),
        _ => None,
    });

    let current = match machine.read(target) {
        Ok(bytes) => bytes,
        Err(_) => return unreachable(),
    };

    let restored_sha256_match = match &recorded {
        Some((_, sha256)) => sha256_hex(&current) == *sha256,
        // Nothing was ever backed up, so nothing was ever changed.
        None => true,
    };

    let backup_path = store.backup_path(target);
    let removed = match std::fs::remove_file(&backup_path) {
        Ok(()) => true,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => true,
        Err(_) => false,
    };

    if removed {
        if let Some((change, _)) = recorded {
            if let Err(problem) = store.forget(&change) {
                return trouble(TroubleKind::Unreachable, problem.message);
            }
        }
    }

    Response::BackupRemoved {
        removed,
        restored_sha256_match,
    }
}

/// The original was read but Cairn's copy of it could not be kept. Nothing is
/// modified without that copy (invariant 1), so nothing was.
fn no_copy_kept(target: Target) -> Response {
    trouble(
        TroubleKind::Unreachable,
        format!(
            "Cairn could not keep its copy of {} as it is now, so it has not gone on \
             to change anything. Nothing on this machine has been changed.",
            target.label()
        ),
    )
}
