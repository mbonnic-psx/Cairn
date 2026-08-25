//! Whether counting can happen at all, checked at setup and at every start of
//! protection (FR-027).
//!
//! A local development server on port 80 or 443 is the ordinary case. It is not
//! a problem to be solved or a reason to interrupt anyone: Cairn drops to silent
//! mode, blocking is entirely unaffected, and the switch is explained in one
//! sentence (FR-028).

use crate::domain::entries::ReachMode;
use crate::helper::HelperChannel;
use crate::protocol::{CountingSockets, Request, Response};

/// What the check found.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Counting {
    /// The ports are Cairn's, and reaches will be noted.
    Available,
    /// Something else holds a port. One sentence, shown as written.
    Unavailable { because: String },
}

impl Counting {
    pub fn mode(&self) -> ReachMode {
        match self {
            Counting::Available => ReachMode::Counted,
            Counting::Unavailable { .. } => ReachMode::Silent,
        }
    }
}

/// Ask the helper to take the ports, and find out whether it could.
///
/// This is the only thing that decides automatically between counted and silent
/// mode. A person's own choice is handled separately and is never overwritten
/// by this quietly (FR-029).
pub fn check(helper: &dyn HelperChannel) -> Counting {
    match helper.ask(Request::BindCountingSockets) {
        Ok(Response::CountingSockets(CountingSockets::Bound { .. })) => {
            Counting::Available
        }
        Ok(Response::CountingSockets(CountingSockets::Conflict { reason })) => {
            Counting::Unavailable { because: reason }
        }
        Ok(Response::Trouble { message, .. }) => {
            Counting::Unavailable { because: message }
        }
        Ok(_) | Err(_) => Counting::Unavailable {
            because:
                "Cairn is not counting the sites you reach for just now. Everything \
                      you have protected is still protected."
                    .into(),
        },
    }
}
