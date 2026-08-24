//! The trusted clock, and the sixty-second cycle that keeps protection honest.
//!
//! Two jobs, on the same beat:
//!
//! 1. **Advance the trusted clock** the waiting period is measured against
//!    (FR-047d). While Cairn is running, a wall-clock jump is credited only as
//!    far as the monotonic clock corroborates it. Sixty seconds is the interval
//!    because it bounds the uncredited running time to the granularity FR-010
//!    and SC-004 already require.
//! 2. **Verify Cairn's section is still there**, and repair it silently if it
//!    is not (FR-013).
//!
//! The clock only ever moves forward, and nothing the person can reach can move
//! it: there is no `SetTrustedClock` verb (contracts/helper-ipc.md).

use std::path::{Path, PathBuf};
use std::time::Instant;

use cairn::domain::gate::TrustedClock;
use serde::{Deserialize, Serialize};

use crate::machine::Machine;
use crate::verbs::hosts::read_in_force;
use crate::verbs::now_seconds;
use crate::verbs::verify::repair_hosts_section;

/// How often the helper beats.
pub const HEARTBEAT_SECONDS: u64 = 60;

pub const CLOCK_FILE: &str = "trusted-clock.json";

/// The clock as it is kept on disk. Beside the inventory, unencrypted, for the
/// same reason: a waiting period that cannot be read is a waiting period that
/// cannot be honoured.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
pub struct HelperClock {
    pub clock: TrustedClock,
    /// Total time Cairn has been observed running, for reporting.
    pub running_seconds: u64,
}

/// Reads, advances, and persists the trusted clock.
pub struct ClockKeeper {
    path: PathBuf,
    started: Instant,
}

impl ClockKeeper {
    pub fn at(directory: &Path) -> Self {
        ClockKeeper {
            path: directory.join(CLOCK_FILE),
            started: Instant::now(),
        }
    }

    pub fn read(&self) -> HelperClock {
        std::fs::read(&self.path)
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default()
    }

    /// Called once when the helper starts.
    ///
    /// Time while the machine was off is credited from the wall clock, because
    /// nothing on the machine was awake to measure it (research R4). Crediting
    /// only uptime instead would leave someone who requested a change and shut
    /// down for a week facing a full 24 hours on their return — punitive, and
    /// inaccurate about what is left.
    pub fn start(&self) -> HelperClock {
        let mut state = self.read();
        let wall = now_seconds();

        state.clock = if state.clock.last_wall_seconds == 0 {
            TrustedClock::started(wall, 0)
        } else {
            state.clock.resumed(wall, 0)
        };

        self.write(&state);
        state
    }

    /// One beat.
    pub fn beat(&self) -> HelperClock {
        let mut state = self.read();
        let monotonic = self.started.elapsed().as_secs();

        state.clock = state.clock.heartbeat(now_seconds(), monotonic);
        state.running_seconds = state.running_seconds.saturating_add(HEARTBEAT_SECONDS);

        self.write(&state);
        state
    }
}

/// What one beat did. Returned for tests; never shown to anyone.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub struct Beat {
    pub trusted_seconds: u64,
    /// True when something outside Cairn had changed the file and Cairn put it
    /// back.
    pub repaired: bool,
}

/// One cycle: advance the clock, check Cairn's section, and put it back if it
/// is not what it should be.
///
/// The repair is **silent**. Nothing is shown, nothing is logged that names a
/// domain, and the person is not interrupted to be told their machine was
/// tampered with — being told would itself be a reminder of protection, which
/// is close to the ambient surface FR-030a rules out (FR-013).
pub fn cycle(machine: &Machine, keeper: &ClockKeeper) -> Beat {
    let clock = keeper.beat();

    let Some(in_force) = read_in_force(machine) else {
        // Nothing is meant to be in force, so there is nothing to put back.
        return Beat {
            trusted_seconds: clock.clock.trusted_seconds,
            repaired: false,
        };
    };

    let repaired = matches!(
        repair_hosts_section(machine, &in_force.domains, in_force.mode),
        cairn::protocol::Response::HostsRepaired { repaired: true, .. }
    );

    Beat {
        trusted_seconds: clock.clock.trusted_seconds,
        repaired,
    }
}

impl ClockKeeper {
    fn write(&self, state: &HelperClock) {
        if let Some(directory) = self.path.parent() {
            let _ = std::fs::create_dir_all(directory);
        }
        if let Ok(bytes) = serde_json::to_vec_pretty(state) {
            // Best effort by design: a missed write costs at most one beat of
            // credited time, and never moves the clock backwards.
            let _ = std::fs::write(&self.path, bytes);
        }
    }
}
