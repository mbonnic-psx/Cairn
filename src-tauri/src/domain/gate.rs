//! A reduction waits, whatever the clock says.
//!
//! Constitution-critical (Principle I, FR-047a, FR-047d). Turning protection
//! off, removing an entry, and switching a category off are all reductions, and
//! every one of them waits the same fixed period with protection fully in force
//! throughout (FR-047b). Increases never wait (FR-048).
//!
//! The waiting period is measured on a *trusted clock*: a value that only ever
//! moves forward, advanced by the helper's heartbeat. While Cairn is running, a
//! wall-clock jump is credited only as far as the monotonic clock corroborates
//! it, so moving the system clock forward for an afternoon buys nothing. Time
//! while the machine is off is credited from the wall clock in full, because
//! nothing on the machine can measure it independently.
//!
//! What this does not do is stop someone with administrator access who shuts
//! down, changes the clock, and boots. That is stated plainly rather than
//! implied away (research R4, Principle III).

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::entries::{CategoryId, Domain};

/// Fixed at 24 hours. Not configurable — a length a person can choose is a
/// length a person can choose in the wrong moment (FR-047a).
pub const WAITING_PERIOD_SECONDS: u64 = 24 * 60 * 60;

/// The advance-only clock a pending change is measured against.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
pub struct TrustedClock {
    /// Seconds credited so far. Never decreases.
    pub trusted_seconds: u64,
    /// The wall clock at the last heartbeat, for crediting downtime.
    pub last_wall_seconds: i64,
    /// The monotonic reading at the last heartbeat, for corroborating uptime.
    pub last_monotonic_seconds: u64,
}

impl TrustedClock {
    /// Start a fresh clock from the current readings.
    pub fn started(wall_seconds: i64, monotonic_seconds: u64) -> Self {
        TrustedClock {
            trusted_seconds: 0,
            last_wall_seconds: wall_seconds,
            last_monotonic_seconds: monotonic_seconds,
        }
    }

    /// A heartbeat while Cairn is running.
    ///
    /// Credits the smaller of what the wall clock claims and what the monotonic
    /// clock can vouch for. A backward wall-clock change credits nothing and
    /// takes nothing away.
    #[must_use]
    pub fn heartbeat(self, wall_seconds: i64, monotonic_seconds: u64) -> Self {
        let wall_delta =
            wall_seconds.saturating_sub(self.last_wall_seconds).max(0) as u64;
        let monotonic_delta =
            monotonic_seconds.saturating_sub(self.last_monotonic_seconds);
        let credit = wall_delta.min(monotonic_delta);

        TrustedClock {
            trusted_seconds: self.trusted_seconds.saturating_add(credit),
            last_wall_seconds: wall_seconds.max(self.last_wall_seconds),
            last_monotonic_seconds: monotonic_seconds,
        }
    }

    /// A start after the machine was off.
    ///
    /// Nothing on this machine was awake to measure the gap, so the wall clock
    /// is all there is and its advance is credited in full. Someone determined
    /// enough to shut down and change the clock can shorten a wait this way;
    /// that limit is disclosed rather than papered over.
    #[must_use]
    pub fn resumed(self, wall_seconds: i64, monotonic_seconds: u64) -> Self {
        let downtime = wall_seconds.saturating_sub(self.last_wall_seconds).max(0) as u64;
        TrustedClock {
            trusted_seconds: self.trusted_seconds.saturating_add(downtime),
            last_wall_seconds: wall_seconds.max(self.last_wall_seconds),
            last_monotonic_seconds: monotonic_seconds,
        }
    }
}

/// What a pending change would do once it applies.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum PendingKind {
    /// Protection off entirely.
    TurnOffProtection,
    /// Specific entries the person typed.
    RemoveEntries { domains: Vec<Domain> },
    /// A whole preset category.
    DisableCategory { category: CategoryId },
}

/// The only route to reducing protection (FR-047).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct PendingChange {
    pub id: Uuid,
    pub kind: PendingKind,
    /// For display only. Never used to decide eligibility.
    pub requested_at_wall: i64,
    /// The trusted clock when the change was asked for.
    pub trusted_clock_at_request: u64,
    /// The trusted-clock reading this change becomes eligible at.
    pub eligible_after_trusted: u64,
}

impl PendingChange {
    /// Open a request. The waiting period starts now, on the trusted clock.
    pub fn request(kind: PendingKind, clock: &TrustedClock, wall_seconds: i64) -> Self {
        PendingChange {
            id: Uuid::new_v4(),
            kind,
            requested_at_wall: wall_seconds,
            trusted_clock_at_request: clock.trusted_seconds,
            eligible_after_trusted: clock
                .trusted_seconds
                .saturating_add(WAITING_PERIOD_SECONDS),
        }
    }
}

/// Whether a pending change may apply yet.
///
/// This is the whole gate. Nothing else in the system may decide that a
/// reduction is allowed, and there is no argument that skips it.
pub fn is_eligible(pending: &PendingChange, trusted_now: u64) -> bool {
    trusted_now >= pending.eligible_after_trusted
}

/// How long is left, for showing wherever protection state is shown (FR-047e).
///
/// Zero means it is eligible now.
pub fn remaining_seconds(pending: &PendingChange, trusted_now: u64) -> u64 {
    pending.eligible_after_trusted.saturating_sub(trusted_now)
}
