//! Take it back off, and say whether the machine is exactly as it was.
//!
//! The other half of the acceptance run (SC-012). Exits non-zero if anything is
//! left behind, so a CI run cannot pass while residue is sitting on the machine.

use cairn::protocol::Response;
use cairn_helper::machine::Machine;
use cairn_helper::verbs::uninstall::uninstall;

fn main() {
    let data =
        std::env::var("CAIRN_DATA_DIR").unwrap_or_else(|_| "/var/lib/cairn".into());
    let machine = Machine::real(&data);

    match uninstall(&machine) {
        Response::Uninstalled {
            removed: true,
            residue,
        } if residue.is_empty() => {
            println!("acceptance: the machine is back to how it was");
        }
        Response::Uninstalled { residue, .. } => {
            eprintln!("acceptance: {} thing(s) left behind:", residue.len());
            for left in residue {
                eprintln!("  {left}");
            }
            std::process::exit(1);
        }
        other => {
            eprintln!("acceptance: teardown could not be confirmed ({other:?})");
            std::process::exit(1);
        }
    }
}
