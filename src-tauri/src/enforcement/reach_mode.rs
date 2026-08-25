//! Counted or silent, and who decided.
//!
//! Counted by default (FR-026). The check runs at setup and at every start of
//! protection, and a conflict drops Cairn to silent with a one-sentence
//! explanation (FR-027).
//!
//! **A loss of counting never reduces protection** (FR-028). Silent mode blocks
//! exactly the same addresses; the only difference is that nothing listens on
//! the other end, so nothing is noted.
//!
//! A person's own choice is not silently overwritten. If they asked for silence,
//! it stays silent. If they asked for counting and the ports are taken, Cairn
//! falls back and says why — it does not pretend to be counting.

use crate::counting::availability::Counting;
use crate::domain::entries::ReachMode;
use crate::store::config::{ChosenBy, ReachModeSetting};

/// Work out the mode to run in, given what the person chose and what the
/// machine allows.
pub fn settle(chosen: &ReachModeSetting, found: &Counting) -> ReachModeSetting {
    match (chosen.chosen_by, chosen.mode) {
        // They asked for silence. Nothing about the machine changes that.
        (ChosenBy::Person, ReachMode::Silent) => ReachModeSetting {
            mode: ReachMode::Silent,
            chosen_by: ChosenBy::Person,
            fallback_reason: None,
        },
        // They asked for counting, or never said. Then it depends on the ports.
        _ => match found {
            Counting::Available => ReachModeSetting {
                mode: ReachMode::Counted,
                chosen_by: chosen.chosen_by,
                fallback_reason: None,
            },
            Counting::Unavailable { because } => ReachModeSetting {
                mode: ReachMode::Silent,
                chosen_by: ChosenBy::Automatic,
                fallback_reason: Some(because.clone()),
            },
        },
    }
}

/// A person changing the mode themselves, in either direction (FR-029).
pub fn choose(mode: ReachMode) -> ReachModeSetting {
    ReachModeSetting {
        mode,
        chosen_by: ChosenBy::Person,
        fallback_reason: None,
    }
}
