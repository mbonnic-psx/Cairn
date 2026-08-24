//! Put one address into force on this machine, using the real privileged verbs.
//!
//! For the acceptance run in CI (SC-002), and for trying Cairn's enforcement by
//! hand without the application. It writes the same backup, the same marked
//! section, and the same inventory as Cairn does, so what it proves is what
//! Cairn would do.
//!
//! Needs the privilege that writing the system file needs.

use cairn::domain::entries::ReachMode;
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::protocol::Response;
use cairn::store::inventory::Target;
use cairn_helper::machine::Machine;
use cairn_helper::verbs::backup::write_backup_once;
use cairn_helper::verbs::hosts::apply_hosts_section;

fn main() {
    let address = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "cairn-acceptance.example".into());

    let data =
        std::env::var("CAIRN_DATA_DIR").unwrap_or_else(|_| "/var/lib/cairn".into());
    let machine = Machine::real(&data);

    let entries = match normalize(&address, &ReservedNames::default()) {
        Ok(entries) => entries,
        Err(rejection) => {
            eprintln!("acceptance: {}", rejection.reason);
            std::process::exit(2);
        }
    };

    match write_backup_once(&machine, Target::SystemHosts) {
        Response::BackupWritten { .. } => {}
        other => {
            eprintln!("acceptance: could not capture the original ({other:?})");
            std::process::exit(1);
        }
    }

    match apply_hosts_section(&machine, &entries, ReachMode::Silent) {
        Response::HostsApplied { verified_count, .. } => {
            println!("acceptance: {verified_count} address(es) in force");
        }
        other => {
            eprintln!("acceptance: could not put protection in force ({other:?})");
            std::process::exit(1);
        }
    }
}
