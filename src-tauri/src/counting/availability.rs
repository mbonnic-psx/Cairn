//! Whether counting is happening, checked at setup and at every start of
//! protection (FR-027).
//!
//! A local development server on port 80 or 443 is the ordinary case. It is not
//! a problem to be solved or a reason to interrupt anyone: Cairn drops to silent
//! mode, blocking is entirely unaffected, and the switch is explained in one
//! sentence (FR-028).
//!
//! # Bound is not counting
//!
//! This type used to be decided by asking the helper to bind the ports and
//! taking a successful bind as the answer. That was wrong, and quietly so: the
//! helper bound the ports, nothing in the application ever accepted on them, and
//! Cairn reported counted mode over a history that stayed empty.
//!
//! Binding is a precondition. Counting is threads accepting on Cairn's ports,
//! and only [`crate::counting::session`] can say whether that is happening. This
//! module holds the answer; it no longer guesses at it.

use crate::domain::entries::ReachMode;

/// What is actually true about counting.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Counting {
    /// Cairn holds the ports and is accepting on them. Reaches will be noted.
    Available,
    /// It is not counting. One sentence, shown as written.
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
