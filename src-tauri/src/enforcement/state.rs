//! What protection actually is right now.
//!
//! Derived from the machine, never from intent (FR-012, Principle III).
//! `NotVerified` is a first-class state rather than an error banner on
//! `InForce`: the interface must never render "protected" from a write that
//! returned success, only from a read-back that matched.

use serde::{Deserialize, Serialize};

use crate::services::Verification;

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProtectionStatus {
    Off,
    InForce,
    /// Cairn could not confirm what is on the machine. Shown as its own state,
    /// in its own words — never as protected.
    NotVerified,
}

#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct ProtectionState {
    pub status: ProtectionStatus,
    pub since: Option<i64>,
    /// When the system file was last read back and compared.
    pub verified_at: Option<i64>,
    /// What was actually found, not what was written.
    pub entry_count_verified: usize,
}

impl ProtectionState {
    pub fn off() -> Self {
        ProtectionState {
            status: ProtectionStatus::Off,
            since: None,
            verified_at: None,
            entry_count_verified: 0,
        }
    }

    /// Read a verification into a state.
    ///
    /// Anything short of a match is `NotVerified`. There is no "mostly in
    /// force".
    pub fn from_verification(
        verification: &Verification,
        expected_count: usize,
        at: i64,
        since: Option<i64>,
    ) -> Self {
        if verification.matches() && verification.entry_count == expected_count {
            ProtectionState {
                status: ProtectionStatus::InForce,
                since,
                verified_at: Some(at),
                entry_count_verified: verification.entry_count,
            }
        } else if !verification.section_present && expected_count == 0 {
            ProtectionState::off()
        } else {
            ProtectionState {
                status: ProtectionStatus::NotVerified,
                since,
                verified_at: Some(at),
                entry_count_verified: verification.entry_count,
            }
        }
    }

    /// The sentence shown beside the state. Plain, and never a word of failure
    /// (FR-050).
    pub fn summary(&self) -> &'static str {
        match self.status {
            ProtectionStatus::Off => "Protection is off.",
            ProtectionStatus::InForce => "Protection is on, and Cairn has checked it.",
            ProtectionStatus::NotVerified => {
                "Cairn could not check protection just now, so it is not showing it as on. \
                 It will keep trying."
            }
        }
    }
}
