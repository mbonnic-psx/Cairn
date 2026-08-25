//! `Uninstall` — everything Cairn did, undone in reverse.
//!
//! The inventory is walked backwards, each removal is *verified* rather than
//! assumed, and what could not be removed is reported as residue rather than
//! rounded down to success (FR-043, FR-044).
//!
//! One thing this verb deliberately does not do: remove the helper itself. A
//! process cannot reliably delete the service it is running as, so that step
//! belongs to `ElevationService` in the unelevated app, which runs it last. The
//! record of the installation stays in the inventory until that happens — it is
//! not quietly dropped, and it is not reported as residue while it is still on
//! the list to be done.

use cairn::protocol::Response;
use cairn::store::inventory::{Change, Target};

use super::backup::remove_backup;
use super::hosts::remove_hosts_section;
use super::trouble;
use crate::machine::Machine;

pub fn uninstall(machine: &Machine) -> Response {
    let store = machine.inventory();
    let inventory = match store.load() {
        Ok(inventory) => inventory,
        Err(problem) => {
            return trouble(cairn::protocol::TroubleKind::Unreachable, problem.message)
        }
    };

    let mut residue: Vec<String> = Vec::new();

    for change in inventory.in_teardown_order().cloned().collect::<Vec<_>>() {
        match change {
            Change::HostsSection { .. } => match remove_hosts_section(machine) {
                Response::HostsRemoved {
                    removed: true,
                    residue: none,
                } if none.is_empty() => {}
                Response::HostsRemoved { residue: some, .. } => residue.extend(some),
                Response::Trouble { message, .. } => residue.push(message),
                _ => residue.push(change.label()),
            },
            Change::BackupWritten { target, .. } => {
                match remove_backup(machine, target) {
                    Response::BackupRemoved {
                        removed: true,
                        restored_sha256_match: true,
                    } => {}
                    Response::BackupRemoved {
                        removed: true,
                        restored_sha256_match: false,
                    } => residue.push(format!(
                    "{} is not exactly as it was before Cairn — the copy Cairn kept has \
                     been left in place so nothing is lost",
                    Target::SystemHosts.label()
                )),
                    _ => residue.push(change.label()),
                }
            }
            // Left for the unelevated app to finish; see the module note.
            Change::HelperInstalled { .. } => {}
        }
    }

    Response::Uninstalled {
        removed: residue.is_empty(),
        residue,
    }
}
