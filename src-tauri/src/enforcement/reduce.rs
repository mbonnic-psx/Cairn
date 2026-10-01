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
//!
//! One exception, and it is not a way round the wait: with nothing in force —
//! protection meant to be off, and Cairn's section not on the machine — there
//! is no wall to weaken, so a list edit applies at once ([`apply_at_once`]).
//! Turning protection off is never part of it.

use uuid::Uuid;

use crate::domain::entries::{Domain, SourceRef};
use crate::domain::gate::{
    is_eligible, remaining_seconds, PendingChange, PendingKind, TrustedClock,
};
use crate::services::Trouble;
use crate::store::config::{Config, ProtectionIntent};

/// Something else is already waiting.
///
/// One change at a time, and the person is told which — being handed back a
/// different change than the one they asked for, with no word about it, would
/// look like their request had been registered when it had not.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct AlreadyWaiting {
    pub existing: PendingChange,
}

/// Ask for a reduction. Nothing on the machine changes.
///
/// Asking again for the *same* thing returns the change already waiting rather
/// than starting its clock over — restarting the wait on every ask would turn
/// the gate into something to be worn down. Asking for something *different*
/// while one waits is refused and says so.
pub fn request(
    config: &mut Config,
    kind: PendingKind,
    clock: &TrustedClock,
    wall_seconds: i64,
) -> Result<PendingChange, AlreadyWaiting> {
    if let Some(existing) = &config.pending_change {
        if existing.kind == kind {
            return Ok(existing.clone());
        }
        return Err(AlreadyWaiting {
            existing: existing.clone(),
        });
    }

    let pending = PendingChange::request(kind, clock, wall_seconds);
    config.pending_change = Some(pending.clone());
    Ok(pending)
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

    take_effect(config, &pending.kind);
    config.pending_change = None;
    Ok(pending.kind)
}

/// Whether there is a wall up for a reduction to weaken.
///
/// Nothing is in force only when protection is meant to be off *and* the
/// machine agrees: Cairn's section is not there. `section_on_machine` is what
/// a read of the machine found, or `None` if it could not be read. A teardown
/// that left residue, or a file that cannot be read, is treated as a wall
/// that is up — the gate errs towards waiting, never towards skipping it.
pub fn nothing_in_force(
    intent: ProtectionIntent,
    section_on_machine: Option<bool>,
) -> bool {
    intent == ProtectionIntent::Off && section_on_machine == Some(false)
}

/// Take something off the list at once, because nothing is in force.
///
/// Before protection is turned on there is no wall, so editing the list
/// weakens nothing and there is nothing to wait for (owner's decision,
/// 2026-10-01). The caller establishes that from the machine with
/// [`nothing_in_force`]; this refuses outright while protection is meant to be
/// on, and never turns protection off — that waits, always.
///
/// If the same change was already waiting, it is settled here rather than left
/// to land a day later on a list that may have been changed again since.
pub fn apply_at_once(config: &mut Config, kind: PendingKind) -> Result<(), Trouble> {
    if config.intent == ProtectionIntent::On {
        return Err(Trouble::new(
            "Protection is on, so taking something out waits a day. Nothing has \
             changed.",
        ));
    }
    if kind == PendingKind::TurnOffProtection {
        return Err(Trouble::new(
            "Turning protection off waits a day. Nothing has changed.",
        ));
    }

    take_effect(config, &kind);
    if config
        .pending_change
        .as_ref()
        .is_some_and(|pending| pending.kind == kind)
    {
        config.pending_change = None;
    }
    Ok(())
}

/// What a reduction does to the configuration. Nothing here touches the
/// machine; putting the result into force is the caller's job.
fn take_effect(config: &mut Config, kind: &PendingKind) {
    match kind {
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
}

/// Remove what the person typed, and nothing another source still needs
/// (FR-006).
///
/// A root brings its generated `www.` form with it. That form exists only
/// because the root does (FR-005), so leaving it behind would half-protect a
/// site someone waited a day to stop protecting — and would tell them the
/// change had been made.
fn remove_entries(config: &mut Config, domains: &[Domain]) {
    let targets = with_generated_www_forms(config, domains);

    config.trail.entries.retain_mut(|entry| {
        if !targets.contains(&entry.domain) {
            return true;
        }
        // Their own reason goes, and the generated one with it; a category that
        // also protects this keeps it. The answer that matters is whether
        // anything still needs the entry after both are gone.
        let _ = entry.remove_source(&SourceRef::Custom);
        entry.remove_source(&SourceRef::AutoWww)
    });
}

/// The domains asked for, plus the `www.` forms Cairn generated for them.
///
/// A `www.` entry someone typed themselves is not swept up by removing the
/// root: it is theirs, and it carries its own reason.
fn with_generated_www_forms(config: &Config, domains: &[Domain]) -> Vec<Domain> {
    let mut targets = domains.to_vec();

    for entry in &config.trail.entries {
        if !entry.auto_www {
            continue;
        }
        let Some(root) = entry.domain.as_str().strip_prefix("www.") else {
            continue;
        };
        if domains.iter().any(|asked| asked.as_str() == root) {
            targets.push(entry.domain.clone());
        }
    }

    targets
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
