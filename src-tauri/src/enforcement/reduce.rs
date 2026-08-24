//! The one route to protecting less.
//!
//! Principle I, FR-047. Turning protection off, removing an entry, and
//! switching a category off are all *reductions*, and every one of them comes
//! through here. There is no second path, and there is no argument that skips
//! the wait.
//!
//! Three things this module guarantees, each of which is a test in
//! `tests/us4_gate.rs`:
//!
//! 1. **Nothing reduces without an eligible pending change.**
//!    [`apply_reduction`] takes one and checks it. A caller with no pending
//!    change has nothing to pass.
//! 2. **Protection stays fully in force for the whole wait** (FR-047b). Asking
//!    changes nothing on the machine — it writes a record and returns.
//! 3. **Cancelling is always available** (FR-047c), and costs nothing.
//!
//! Increases never come through here (FR-048).

use uuid::Uuid;

use crate::domain::entries::{Domain, SourceRef};
use crate::domain::gate::{
    is_eligible, remaining_seconds, PendingChange, PendingKind, TrustedClock,
};
use crate::services::Trouble;
use crate::store::config::{Config, ProtectionIntent};

/// Ask for a reduction. Nothing on the machine changes.
///
/// One at a time: while a change is pending, asking again returns the one
/// already waiting rather than starting the clock over. Restarting the wait on
/// every ask would turn the gate into something to be worn down.
pub fn request(
    config: &mut Config,
    kind: PendingKind,
    clock: &TrustedClock,
    wall_seconds: i64,
) -> PendingChange {
    if let Some(existing) = &config.pending_change {
        return existing.clone();
    }

    let pending = PendingChange::request(kind, clock, wall_seconds);
    config.pending_change = Some(pending.clone());
    pending
}

/// Call it off. Always available, for the whole wait (FR-047c).
pub fn cancel(config: &mut Config, id: Uuid) -> Result<(), Trouble> {
    match &config.pending_change {
        Some(pending) if pending.id == id => {
            config.pending_change = None;
            Ok(())
        }
        Some(_) | None => Err(Trouble::new(
            "That change is not waiting any more. Nothing has changed.",
        )),
    }
}

/// How long is left, for showing wherever protection is shown (FR-047e).
pub fn time_remaining(config: &Config, trusted_now: u64) -> Option<u64> {
    config
        .pending_change
        .as_ref()
        .map(|pending| remaining_seconds(pending, trusted_now))
}

/// Apply a reduction that has waited.
///
/// The only function in Cairn that removes protection, and it refuses anything
/// that has not served its time. `trusted_now` comes from the helper's
/// advance-only clock — never from the system clock, which a person can set.
pub fn apply_reduction(
    config: &mut Config,
    trusted_now: u64,
) -> Result<PendingKind, Trouble> {
    let pending = config.pending_change.clone().ok_or_else(|| {
        Trouble::new("There is no change waiting, so there is nothing to apply.")
    })?;

    if !is_eligible(&pending, trusted_now) {
        return Err(Trouble::new(format!(
            "That change has {} to wait. Protection stays on until then.",
            plain_duration(remaining_seconds(&pending, trusted_now))
        )));
    }

    match &pending.kind {
        PendingKind::TurnOffProtection => {
            config.intent = ProtectionIntent::Off;
            config.trail.entries.clear();
            config.trail.enabled_categories.clear();
        }
        PendingKind::RemoveEntries { domains } => {
            remove_entries(config, domains);
        }
        PendingKind::DisableCategory { category } => {
            config.trail.remove_source(&SourceRef::Category(*category));
            config.trail.enabled_categories.remove(category);
        }
    }

    config.pending_change = None;
    Ok(pending.kind)
}

/// Remove what the person typed, and nothing another source still needs
/// (FR-006).
fn remove_entries(config: &mut Config, domains: &[Domain]) {
    config.trail.entries.retain_mut(|entry| {
        if !domains.contains(&entry.domain) {
            return true;
        }
        // Their own reason goes; a category that also protects this keeps it.
        let mut still_needed = entry.remove_source(&SourceRef::Custom);
        still_needed = entry.remove_source(&SourceRef::AutoWww) && still_needed;
        still_needed
    });
}

/// "23 hours", "40 minutes" — never a ticking countdown, and never a number
/// that invites someone to come back and watch it (FR-047e).
pub fn plain_duration(seconds: u64) -> String {
    if seconds == 0 {
        return "no time".into();
    }
    let hours = seconds / 3600;
    if hours >= 2 {
        return format!("{hours} hours");
    }
    let minutes = seconds.div_ceil(60);
    if minutes >= 60 {
        return "about an hour".into();
    }
    format!("{minutes} minutes")
}
