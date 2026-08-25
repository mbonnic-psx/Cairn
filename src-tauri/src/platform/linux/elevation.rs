//! Installing the privileged helper on Linux.
//!
//! One elevation prompt, once, at the first turn-on (FR-014). After that the
//! helper runs as a systemd system unit and Cairn never prompts again — which
//! is what lets repair happen silently, without interrupting the person
//! (FR-013, research R1).
//!
//! Everything installed here is recorded in the change inventory, including the
//! helper itself, and removed by [`uninstall_helper`] in reverse. A background
//! privileged component is a machine-wide change, so it is disclosed and
//! confirmed before this runs (FR-016).

use std::path::{Path, PathBuf};
use std::process::Command;

use crate::services::{ElevationService, HelperStatus, Outcome, Removal, Trouble};

/// The unit name. Namespaced, and the identifier recorded in the inventory.
pub const UNIT: &str = "cairn-helper.service";
pub const UNIT_PATH: &str = "/etc/systemd/system/cairn-helper.service";
pub const INSTALLED_BINARY: &str = "/usr/local/lib/cairn/cairn-helper";
pub const DATA_DIRECTORY: &str = "/var/lib/cairn";

pub struct LinuxElevation {
    /// Where the helper binary ships, beside the application.
    source: PathBuf,
    /// The person Cairn is being installed for.
    owner_uid: u32,
}

impl Default for LinuxElevation {
    fn default() -> Self {
        LinuxElevation {
            source: shipped_helper_path(),
            owner_uid: current_uid(),
        }
    }
}

/// The helper binary as shipped, next to the application executable.
fn shipped_helper_path() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(Path::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("cairn-helper")
}

// The one unsafe call in the unelevated process. `getuid` cannot fail, takes
// no arguments, and touches no memory of ours; there is no safe wrapper for it
// in std.
#[allow(unsafe_code)]
fn current_uid() -> u32 {
    // SAFETY: no arguments, no memory access, cannot fail.
    unsafe { libc::getuid() }
}

impl ElevationService for LinuxElevation {
    fn helper_status(&self) -> HelperStatus {
        if !Path::new(UNIT_PATH).exists() {
            return HelperStatus::NotInstalled;
        }
        HelperStatus::Installed {
            version: read_installed_version().unwrap_or_else(|| "unknown".into()),
        }
    }

    /// Prompts exactly once, through the desktop's own elevation agent.
    fn install_helper(&self) -> Outcome<HelperStatus> {
        if !self.source.exists() {
            return Err(Trouble::new(
                "Cairn cannot find the background component it needs to install. \
                 Try reinstalling Cairn.",
            ));
        }

        let script = install_script(&self.source, self.owner_uid);
        run_elevated(&script)?;

        match self.helper_status() {
            HelperStatus::Installed { version } => {
                Ok(HelperStatus::Installed { version })
            }
            _ => Err(Trouble::new(
                "Cairn asked to install its background component, but it is not there \
                 afterwards. Nothing has been changed.",
            )),
        }
    }

    /// The last step of teardown: the helper removes everything it did, then
    /// the app removes the helper (FR-043).
    fn uninstall_helper(&self) -> Outcome<Removal> {
        if matches!(self.helper_status(), HelperStatus::NotInstalled) {
            return Ok(Removal::clean());
        }

        run_elevated(UNINSTALL_SCRIPT)?;

        let mut residue = Vec::new();
        for left in [UNIT_PATH, INSTALLED_BINARY] {
            if Path::new(left).exists() {
                residue.push(left.to_string());
            }
        }

        Ok(Removal {
            removed: residue.is_empty(),
            residue,
        })
    }
}

fn read_installed_version() -> Option<String> {
    let output = Command::new("systemctl")
        .args(["show", UNIT, "--property=Description", "--value"])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    text.split_whitespace().last().map(str::to_string)
}

/// Run one script with a single elevation prompt.
///
/// `pkexec` is the desktop's own agent: the person sees their system's dialog,
/// not something Cairn drew to look like one.
fn run_elevated(script: &str) -> Outcome<()> {
    let output = Command::new("pkexec")
        .args(["/bin/sh", "-c", script])
        .output()
        .map_err(|error| {
            Trouble::new(format!(
                "Cairn could not ask for permission to change this machine ({error}). \
                 Nothing has been changed."
            ))
        })?;

    if output.status.success() {
        return Ok(());
    }

    // The person cancelled, or the agent is not there. Either way nothing
    // happened, and that is what is said.
    Err(Trouble::new(
        "Cairn was not given permission to set up protection on this machine, so \
         nothing has been changed. You can try again whenever you like.",
    ))
}

/// Copy the helper into place, write the unit, record the owner, and start it.
///
/// The owner file is what the helper's peer check compares against: only the
/// person Cairn was installed for may talk to it.
fn install_script(source: &Path, owner_uid: u32) -> String {
    format!(
        r#"set -e
install -d -m 0755 /usr/local/lib/cairn
install -m 0755 '{source}' '{binary}'
install -d -m 0700 '{data}'
printf '%s\n' '{owner}' > '{data}/owner'
chmod 0600 '{data}/owner'
cat > '{unit}' <<'UNIT'
[Unit]
Description=Cairn helper {version}
After=network.target

[Service]
Type=simple
ExecStart={binary}
Restart=on-failure
RestartSec=5
# The helper writes system files and binds loopback ports. It needs nothing else.
NoNewPrivileges=yes
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now {unit_name}
"#,
        source = source.display(),
        binary = INSTALLED_BINARY,
        data = DATA_DIRECTORY,
        owner = owner_uid,
        unit = UNIT_PATH,
        unit_name = UNIT,
        version = env!("CARGO_PKG_VERSION"),
    )
}

/// Reverse order: stop, disable, remove the unit, remove the binary.
///
/// The data directory is left for the caller to remove once teardown has been
/// confirmed — it holds the record of what Cairn changed, and deleting it
/// before the machine is verified restored would throw away the only map back.
const UNINSTALL_SCRIPT: &str = r#"set -e
systemctl disable --now cairn-helper.service || true
rm -f /etc/systemd/system/cairn-helper.service
rm -f /usr/local/lib/cairn/cairn-helper
rmdir /usr/local/lib/cairn 2>/dev/null || true
systemctl daemon-reload || true
"#;
