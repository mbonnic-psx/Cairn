//! `ApplyHostsSection` and `RemoveHostsSection`.
//!
//! Cairn writes inside its own markers and nowhere else, and it re-reads the
//! file afterwards to say what is actually there rather than what it meant to
//! put there (FR-040, FR-012).
//!
//! Applying refuses to run before a backup exists. The backup is not written
//! implicitly as a convenience: the ordering is the guarantee.

use cairn::domain::entries::{emit_hosts_body, parse_hosts_body, Domain, ReachMode};
use cairn::domain::splice::{self, detect_line_ending_outside};
use cairn::protocol::{Response, TroubleKind};
use cairn::store::inventory::{sha256_hex, Change, Target};

use super::{now_seconds, trouble, unreachable};
use crate::machine::Machine;

const TARGET: Target = Target::SystemHosts;

pub fn apply_hosts_section(
    machine: &Machine,
    entries: &[Domain],
    mode: ReachMode,
) -> Response {
    let store = machine.inventory();
    let inventory = match store.load() {
        Ok(inventory) => inventory,
        Err(problem) => return trouble(TroubleKind::Unreachable, problem.message),
    };

    // Invariant 1 (contracts/helper-ipc.md): nothing is written until the true
    // original is safe.
    if !inventory.has_backup(TARGET) {
        return trouble(
            TroubleKind::NoBackupYet,
            "Cairn keeps a copy of the system's list of site addresses before it \
             changes anything, and it has not made that copy yet. Nothing has been \
             changed.",
        );
    }

    let original = match machine.read(TARGET) {
        Ok(bytes) => bytes,
        Err(error) => return unreachable(error),
    };

    let ending = detect_line_ending_outside(&original);
    let body = emit_hosts_body(entries, mode, ending);

    let spliced = match splice::apply(&original, &body) {
        Ok(spliced) => spliced,
        Err(problem) => return section_unreadable(problem),
    };

    // Recorded *before* the write. A record of a change that might be there is
    // recoverable; a change with no record is not. On a re-apply the original
    // record stands: it carries whether Cairn ever contributed the separator
    // newline, which is what makes removal exact.
    if inventory.hosts_section(TARGET).is_none() {
        if let Err(problem) = store.record(Change::HostsSection {
            target: TARGET,
            applied_at: now_seconds(),
            separator_added: spliced.separator_added,
        }) {
            return trouble(TroubleKind::Unreachable, problem.message);
        }
    }

    if let Err(error) = machine.write(TARGET, &spliced.bytes) {
        return unreachable(error);
    }

    // Verified, not intended.
    let after = match machine.read(TARGET) {
        Ok(bytes) => bytes,
        Err(error) => return unreachable(error),
    };
    let found = match section_domains(&after) {
        Ok(found) => found,
        Err(problem) => return section_unreadable(problem),
    };

    if found.len() != entries.len() * 2 {
        return trouble(
            TroubleKind::NotVerified,
            "Cairn wrote your protected sites but could not confirm them by reading \
             the file back. Protection is shown as not confirmed until it can.",
        );
    }

    Response::HostsApplied {
        verified_count: entries.len(),
        sha256_after: sha256_hex(&after),
    }
}

/// Remove Cairn's region, leaving every byte around it as it was.
pub fn remove_hosts_section(machine: &Machine) -> Response {
    let store = machine.inventory();
    let inventory = match store.load() {
        Ok(inventory) => inventory,
        Err(problem) => return trouble(TroubleKind::Unreachable, problem.message),
    };

    let current = match machine.read(TARGET) {
        Ok(bytes) => bytes,
        Err(error) => return unreachable(error),
    };

    let separator_added = inventory.separator_added(TARGET);
    let without = match splice::remove(&current, separator_added) {
        Ok(bytes) => bytes,
        Err(problem) => return section_unreadable(problem),
    };

    if let Err(error) = machine.write(TARGET, &without) {
        return unreachable(error);
    }

    // Report what is actually there now.
    let after = match machine.read(TARGET) {
        Ok(bytes) => bytes,
        Err(error) => return unreachable(error),
    };
    let still_present = matches!(splice::find_section(&after), Ok(Some(_)));

    let mut residue = Vec::new();
    if still_present {
        residue.push("Cairn's own section in the system's list of site addresses".into());
    } else if let Some(change) = inventory.hosts_section(TARGET).cloned() {
        if let Err(problem) = store.forget(&change) {
            return trouble(TroubleKind::Unreachable, problem.message);
        }
    }

    Response::HostsRemoved {
        removed: !still_present,
        residue,
    }
}

/// The domains inside Cairn's region, as the file has them.
pub(crate) fn section_domains(bytes: &[u8]) -> Result<Vec<String>, splice::SpliceError> {
    let Some(section) = splice::find_section(bytes)? else {
        return Ok(Vec::new());
    };
    // Between the markers, minus the marker lines themselves.
    let region = &bytes[section.start..section.end];
    Ok(parse_hosts_body(region))
}

fn section_unreadable(problem: splice::SpliceError) -> Response {
    trouble(
        TroubleKind::SectionUnreadable,
        format!(
            "Cairn left the system's list of site addresses alone, because {problem}. \
             Nothing has been changed."
        ),
    )
}
