//! Verb dispatch.
//!
//! Every request the helper will ever answer is matched here, exhaustively. An
//! unknown verb is rejected rather than ignored — and because [`Request`] is a
//! closed enum, "unknown" means bytes that did not parse, not a verb someone
//! added at runtime.

use cairn::protocol::{Request, Response, TroubleKind};
use cairn::store::inventory::Target;

use crate::heartbeat::ClockKeeper;
use crate::machine::Machine;
use crate::verbs;

pub fn handle(machine: &Machine, clock: &ClockKeeper, request: Request) -> Response {
    match request {
        Request::Ping => Response::Pong {
            version: crate::VERSION.to_string(),
            healthy: true,
        },

        Request::WriteBackupOnce { target } => {
            verbs::backup::write_backup_once(machine, target)
        }
        Request::RemoveBackup { target } => verbs::backup::remove_backup(machine, target),

        Request::ApplyHostsSection { entries, mode } => {
            verbs::hosts::apply_hosts_section(machine, &entries, mode)
        }
        Request::RemoveHostsSection => verbs::hosts::remove_hosts_section(machine),

        Request::VerifyHostsSection { expected } => {
            verbs::verify::verify_hosts_section(machine, &expected)
        }
        Request::RepairHostsSection { entries, mode } => {
            verbs::verify::repair_hosts_section(machine, &entries, mode)
        }

        Request::FlushDnsCache => verbs::dnsflush::flush_dns_cache(),

        Request::ReadTrustedClock => {
            let state = clock.read();
            Response::TrustedClock {
                trusted_seconds: state.clock.trusted_seconds,
                running_seconds: state.running_seconds,
                last_heartbeat_wall: state.clock.last_wall_seconds,
            }
        }

        Request::Uninstall => verbs::uninstall::uninstall(machine),

        // Not built yet. Said plainly rather than answered with a conflict,
        // which would drop reach counting to silent mode as though a port were
        // taken — true in effect, dishonest in reason (Principle III).
        Request::BindCountingSockets | Request::ReleaseCountingSockets => {
            Response::Trouble {
                message: "Counting reaches is not part of this build yet. Protection is \
                      unaffected."
                    .into(),
                kind: TroubleKind::Unsupported,
            }
        }
    }
}

/// The one target this build knows about. Kept as a function so adding a second
/// one is a deliberate change in one place.
pub fn known_targets() -> &'static [Target] {
    &[Target::SystemHosts]
}
