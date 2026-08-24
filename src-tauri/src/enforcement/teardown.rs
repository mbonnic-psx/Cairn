//! Putting the machine back exactly as it was.
//!
//! The inventory is walked in reverse by the helper, each removal is verified
//! rather than assumed, and what could not be removed is reported as residue —
//! never rounded down to success (FR-043, FR-044).
//!
//! Order matters and is not negotiable: the helper undoes everything it did
//! *first*, and is removed last. A helper removed early is a helper that cannot
//! undo the rest.

use crate::helper::HelperChannel;
use crate::protocol::{Request, Response};
use crate::services::{ElevationService, Trouble};

/// What teardown actually left behind.
#[derive(Clone, PartialEq, Eq, Debug, serde::Serialize, serde::Deserialize)]
pub struct TeardownReport {
    /// True only when nothing at all is left.
    pub complete: bool,
    /// Everything Cairn could not remove, in words a person can act on.
    pub residue: Vec<String>,
    /// What Cairn checked, so the report is a statement rather than a claim.
    pub confirmed: Vec<String>,
}

impl TeardownReport {
    /// The sentence shown after teardown. It reports, it does not congratulate
    /// (FR-044).
    pub fn summary(&self) -> String {
        if self.complete {
            "This machine is back to how it was before Cairn. What Cairn did not write \
             is untouched."
                .into()
        } else {
            format!(
                "Cairn removed what it could. {} thing(s) are still here, listed below, \
                 so you can decide what to do with them.",
                self.residue.len()
            )
        }
    }
}

/// Undo everything.
pub fn tear_down(
    helper: &dyn HelperChannel,
    elevation: &dyn ElevationService,
) -> Result<TeardownReport, Trouble> {
    let mut residue = Vec::new();
    let mut confirmed = Vec::new();

    // 1. Everything the helper did, in reverse, verified by the helper as it
    //    goes.
    match helper.ask(Request::Uninstall)? {
        Response::Uninstalled {
            removed,
            residue: left,
        } => {
            if removed {
                confirmed.push(
                    "The system's list of site addresses is exactly as it was before Cairn."
                        .into(),
                );
            }
            residue.extend(left);
        }
        Response::Trouble { message, .. } => residue.push(message),
        _ => residue.push(
            "Cairn could not confirm that its changes to this machine were undone."
                .into(),
        ),
    }

    // 2. Clear caches, so the machine stops using what Cairn put there.
    let _ = helper.ask(Request::FlushDnsCache);

    // 3. The helper itself, last.
    match elevation.uninstall_helper() {
        Ok(removal) => {
            if removal.is_clean() {
                confirmed.push("The background component has been removed.".into());
            }
            residue.extend(removal.residue);
        }
        Err(trouble) => residue.push(trouble.message),
    }

    Ok(TeardownReport {
        complete: residue.is_empty(),
        residue,
        confirmed,
    })
}
