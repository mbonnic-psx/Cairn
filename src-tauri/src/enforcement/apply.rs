//! Putting protection into force, and keeping it there.
//!
//! The order is the guarantee (FR-009, FR-010, FR-039):
//!
//! 1. **Back up** the true pre-Cairn state, once, before anything is modified.
//! 2. **Apply** Cairn's own marked section.
//! 3. **Verify** by reading the file back — this is the only thing protection
//!    state is derived from.
//! 4. **Flush** the resolver cache so the change takes effect without a restart.
//!    Failure here is reported and non-fatal: the change stands and takes hold
//!    as caches expire.
//!
//! Nothing here reduces protection. Reductions have exactly one route, and it
//! passes a waiting period (`enforcement::reduce`).

use crate::domain::entries::{Domain, ReachMode};
use crate::helper::HelperChannel;
use crate::protocol::{Request, Response};
use crate::services::{HostsService, Trouble, Verification};
use crate::store::inventory::Target;

use super::state::{ProtectionState, ProtectionStatus};

/// What happened, in enough detail to show and to log without naming a domain
/// (FR-038b).
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Applied {
    pub state: ProtectionState,
    /// Present when the resolver cache could not be cleared. The change still
    /// takes effect; a site may load from a cache for a short while.
    pub flush_note: Option<String>,
}

/// Apply the protected list.
pub fn apply(
    helper: &dyn HelperChannel,
    hosts: &dyn HostsService,
    entries: &[Domain],
    mode: ReachMode,
    now: i64,
    since: Option<i64>,
) -> Result<Applied, Trouble> {
    // 1. The original, before anything is touched.
    match helper.ask(Request::WriteBackupOnce {
        target: Target::SystemHosts,
    })? {
        Response::BackupWritten { .. } => {}
        Response::Trouble { message, .. } => return Err(Trouble::new(message)),
        other => return Err(unexpected(other)),
    }

    // 2. Cairn's own section, and nothing outside it.
    match helper.ask(Request::ApplyHostsSection {
        entries: entries.to_vec(),
        mode,
    })? {
        Response::HostsApplied { .. } => {}
        Response::Trouble { message, .. } => return Err(Trouble::new(message)),
        other => return Err(unexpected(other)),
    }

    // 3. What is actually there. Read by the unelevated process itself rather
    //    than taken on the helper's word.
    let verification = hosts.verify(entries)?;
    let state =
        ProtectionState::from_verification(&verification, entries.len(), now, since);

    // 4. Caches. Non-fatal by design (research R8).
    let flush_note = match helper.ask(Request::FlushDnsCache) {
        Ok(Response::DnsFlushed { note, .. }) => note,
        Ok(Response::Trouble { message, .. }) => Some(message),
        Ok(_) | Err(_) => Some(
            "Cairn could not clear this machine's cache of site addresses, so a site \
             you have just protected may still load for a short while."
                .into(),
        ),
    };

    Ok(Applied { state, flush_note })
}

/// Check what is in force, without changing anything.
///
/// Used by the interface and by the repair cycle. It answers from the file, so
/// a helper that has stopped answering shows as `NotVerified` rather than as
/// protected.
pub fn current_state(
    hosts: &dyn HostsService,
    entries: &[Domain],
    now: i64,
    since: Option<i64>,
) -> ProtectionState {
    match hosts.verify(entries) {
        Ok(verification) => {
            ProtectionState::from_verification(&verification, entries.len(), now, since)
        }
        Err(_) => ProtectionState {
            status: ProtectionStatus::NotVerified,
            since,
            verified_at: None,
            entry_count_verified: 0,
        },
    }
}

/// Whether what is on the machine has drifted from what should be there.
pub fn has_drifted(verification: &Verification, expected_count: usize) -> bool {
    !verification.matches() || verification.entry_count != expected_count
}

fn unexpected(response: Response) -> Trouble {
    // Never shows the raw answer to a person: it would say nothing useful and
    // could carry a domain (FR-038b).
    let _ = response;
    Trouble::new(
        "Cairn got an answer it did not understand from its background component. \
         Nothing on this machine has been changed.",
    )
}
