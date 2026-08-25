//! `VerifyHostsSection` and `RepairHostsSection`.
//!
//! Protection state comes from here and from nowhere else. A write that
//! returned success is not evidence: only a read-back that matched is
//! (FR-012, Principle III).
//!
//! Repair is silent. Something outside Cairn changed the file, Cairn puts its
//! own section back, and the person is not told — being interrupted about it
//! would be a reminder of protection, which is close to the ambient surface
//! FR-030a rules out (FR-013).

use std::collections::BTreeSet;

use cairn::domain::entries::{Domain, ReachMode};
use cairn::protocol::{Response, SectionState, TroubleKind};

use super::hosts::{apply_hosts_section, section_domains};
use super::trouble;
use crate::machine::Machine;

pub fn verify_hosts_section(machine: &Machine, expected: &[Domain]) -> Response {
    let current = match machine.read(cairn::store::inventory::Target::SystemHosts) {
        Ok(bytes) => bytes,
        Err(error) => return super::unreachable(error),
    };

    let found = match section_domains(&current) {
        Ok(found) => found,
        Err(problem) => {
            return trouble(
                TroubleKind::SectionUnreadable,
                format!(
                "Cairn could not read its own section confidently, because {problem}."
            ),
            )
        }
    };

    let present = !found.is_empty();
    let found_set: BTreeSet<&str> = found.iter().map(String::as_str).collect();
    let expected_set: BTreeSet<&str> = expected.iter().map(Domain::as_str).collect();

    let missing: Vec<String> = expected_set
        .difference(&found_set)
        .map(|name| (*name).to_string())
        .collect();
    let unexpected: Vec<String> = found_set
        .difference(&expected_set)
        .map(|name| (*name).to_string())
        .collect();

    let drift = (!expected.is_empty() && !present)
        || !missing.is_empty()
        || !unexpected.is_empty();

    Response::HostsVerified(SectionState {
        present,
        // Domains, not lines: each domain is written as an IPv4 and an IPv6
        // line, and reporting double what is protected would be its own kind
        // of dishonesty.
        entry_count: found_set.len(),
        drift,
        missing,
        unexpected,
    })
}

/// Put back what should be there. Idempotent: repairing a file that is already
/// correct changes nothing and says so.
pub fn repair_hosts_section(
    machine: &Machine,
    entries: &[Domain],
    mode: ReachMode,
) -> Response {
    match verify_hosts_section(machine, entries) {
        Response::HostsVerified(state) if !state.drift => Response::HostsRepaired {
            repaired: false,
            verified_count: entries.len(),
        },
        Response::HostsVerified(_) => match apply_hosts_section(machine, entries, mode) {
            Response::HostsApplied { verified_count, .. } => Response::HostsRepaired {
                repaired: true,
                verified_count,
            },
            other => other,
        },
        other => other,
    }
}
