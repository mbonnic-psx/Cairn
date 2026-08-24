//! Installing the privileged helper on Windows.
//!
//! One elevation prompt at first turn-on — the system's own consent dialog,
//! raised by `Start-Process -Verb RunAs` — and none after that (FR-014). The
//! helper then runs as a `LocalSystem` service so repair can happen without
//! interrupting the person (FR-013).
//!
//! Not yet verified on real hardware: this path is written but untested, and
//! the Windows named-pipe channel it needs is still to come. Until both are
//! exercised on a Windows machine, treat this as unproven.

use std::path::{Path, PathBuf};
use std::process::Command;

use crate::services::{ElevationService, HelperStatus, Outcome, Removal, Trouble};

pub const SERVICE_NAME: &str = "CairnHelper";

pub struct WindowsElevation {
    source: PathBuf,
    installed: PathBuf,
}

impl Default for WindowsElevation {
    fn default() -> Self {
        let program_data =
            std::env::var_os("ProgramData").unwrap_or_else(|| r"C:\ProgramData".into());
        WindowsElevation {
            source: shipped_helper_path(),
            installed: PathBuf::from(program_data).join(r"Cairn\cairn-helper.exe"),
        }
    }
}

fn shipped_helper_path() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(Path::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("cairn-helper.exe")
}

impl ElevationService for WindowsElevation {
    fn helper_status(&self) -> HelperStatus {
        let query = Command::new("sc.exe")
            .args(["query", SERVICE_NAME])
            .output();
        match query {
            Ok(output) if output.status.success() => HelperStatus::Installed {
                version: env!("CARGO_PKG_VERSION").into(),
            },
            _ => HelperStatus::NotInstalled,
        }
    }

    fn install_helper(&self) -> Outcome<HelperStatus> {
        if !self.source.exists() {
            return Err(Trouble::new(
                "Cairn cannot find the background component it needs to install. \
                 Try reinstalling Cairn.",
            ));
        }

        let script = format!(
            r#"
New-Item -ItemType Directory -Force -Path (Split-Path '{installed}') | Out-Null
Copy-Item -Force '{source}' '{installed}'
sc.exe create {service} binPath= '{installed}' start= auto DisplayName= 'Cairn helper' | Out-Null
sc.exe start {service} | Out-Null
"#,
            source = self.source.display(),
            installed = self.installed.display(),
            service = SERVICE_NAME,
        );

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

    fn uninstall_helper(&self) -> Outcome<Removal> {
        if matches!(self.helper_status(), HelperStatus::NotInstalled) {
            return Ok(Removal::clean());
        }

        let script = format!(
            r#"
sc.exe stop {service} | Out-Null
sc.exe delete {service} | Out-Null
Remove-Item -Force -ErrorAction SilentlyContinue '{installed}'
"#,
            service = SERVICE_NAME,
            installed = self.installed.display(),
        );
        run_elevated(&script)?;

        let mut residue = Vec::new();
        if self.installed.exists() {
            residue.push(self.installed.display().to_string());
        }
        Ok(Removal {
            removed: residue.is_empty(),
            residue,
        })
    }
}

/// One consent dialog, raised by Windows itself.
fn run_elevated(script: &str) -> Outcome<()> {
    let output = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            &format!(
                "Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden \
                 -ArgumentList '-NoProfile','-Command','{}'",
                script.replace('\'', "''").replace('\n', "; ")
            ),
        ])
        .output()
        .map_err(|error| {
            Trouble::new(format!(
                "Cairn could not ask for permission to change this machine ({error}). \
                 Nothing has been changed."
            ))
        })?;

    if output.status.success() {
        Ok(())
    } else {
        Err(Trouble::new(
            "Cairn was not given permission to set up protection on this machine, so \
             nothing has been changed. You can try again whenever you like.",
        ))
    }
}
