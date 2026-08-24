//! One module per verb, and every verb that changes the machine sits in the
//! same file as the verb that undoes it.
//!
//! That pairing is a constitutional rule rather than a filing convention:
//!
//! > No privileged write path is merged without a reviewed teardown path and a
//! > test proving it restores.
//!
//! If you add a verb here, its counterpart goes in beside it and
//! `tests/teardown_restoration.rs` grows a case. There is no other way in.

pub mod backup;
pub mod dnsflush;
pub mod hosts;
pub mod uninstall;
pub mod verify;

use std::time::{SystemTime, UNIX_EPOCH};

use cairn::protocol::{Response, TroubleKind};

/// The wall clock, in seconds. Used for recording *when* something was done —
/// never for deciding whether a waiting period has passed, which is what the
/// trusted clock is for (`heartbeat`).
pub fn now_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_secs() as i64)
        .unwrap_or_default()
}

pub(crate) fn trouble(kind: TroubleKind, message: impl Into<String>) -> Response {
    Response::Trouble {
        message: message.into(),
        kind,
    }
}

/// The sentence shown when Cairn could not reach a system file at all.
pub(crate) fn unreachable(error: impl std::fmt::Display) -> Response {
    trouble(
        TroubleKind::Unreachable,
        format!(
            "Cairn could not open the system's list of site addresses ({error}). \
             Nothing on this machine has been changed."
        ),
    )
}
