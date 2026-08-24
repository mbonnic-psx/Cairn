//! Reading the system's list of site addresses.
//!
//! Read-only, and unelevated. Every write goes through the helper — this is the
//! half of the story the UI process is allowed to know.

use std::path::PathBuf;

use crate::domain::entries::Domain;
use crate::domain::splice;
use crate::services::{HostsService, Outcome, Trouble, Verification};

/// Where the file lives. The only platform difference in this module.
pub fn system_hosts_path() -> PathBuf {
    #[cfg(windows)]
    {
        let root = std::env::var_os("SystemRoot").unwrap_or_else(|| r"C:\Windows".into());
        PathBuf::from(root).join(r"System32\drivers\etc\hosts")
    }
    #[cfg(not(windows))]
    {
        PathBuf::from("/etc/hosts")
    }
}

pub struct SystemHosts {
    path: PathBuf,
}

impl Default for SystemHosts {
    fn default() -> Self {
        SystemHosts {
            path: system_hosts_path(),
        }
    }
}

impl SystemHosts {
    /// Point at a file that is not the system's. Tests only — the composition
    /// root always uses [`Default`].
    pub fn at(path: impl Into<PathBuf>) -> Self {
        SystemHosts { path: path.into() }
    }
}

impl HostsService for SystemHosts {
    fn read_raw(&self) -> Outcome<Vec<u8>> {
        match std::fs::read(&self.path) {
            Ok(bytes) => Ok(bytes),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(Vec::new()),
            Err(error) => Err(Trouble::new(format!(
                "Cairn could not read the system's list of site addresses ({error})."
            ))),
        }
    }

    fn section_present(&self) -> Outcome<bool> {
        let raw = self.read_raw()?;
        match splice::find_section(&raw) {
            Ok(section) => Ok(section.is_some()),
            Err(problem) => Err(Trouble::new(format!(
                "Cairn could not read its own section confidently, because {problem}."
            ))),
        }
    }

    /// What is actually there, compared with what should be. Never "we wrote it,
    /// so it worked" (FR-012).
    fn verify(&self, expected: &[Domain]) -> Outcome<Verification> {
        use std::collections::BTreeSet;

        let raw = self.read_raw()?;
        let section = splice::find_section(&raw).map_err(|problem| {
            Trouble::new(format!(
                "Cairn could not read its own section confidently, because {problem}."
            ))
        })?;

        let Some(section) = section else {
            return Ok(Verification {
                section_present: false,
                entry_count: 0,
                missing: expected.to_vec(),
                unexpected: Vec::new(),
            });
        };

        let found =
            crate::domain::entries::parse_hosts_body(&raw[section.start..section.end]);
        let found_set: BTreeSet<&str> = found.iter().map(String::as_str).collect();

        let missing = expected
            .iter()
            .filter(|domain| !found_set.contains(domain.as_str()))
            .cloned()
            .collect();

        let expected_set: BTreeSet<&str> = expected.iter().map(Domain::as_str).collect();
        let unexpected = found
            .iter()
            .filter(|name| !expected_set.contains(name.as_str()))
            .cloned()
            .collect();

        Ok(Verification {
            section_present: true,
            // Domains, not lines. Every domain is written as an IPv4 and an
            // IPv6 line, so counting lines would report double what is
            // protected (data-model.md).
            entry_count: found_set.len(),
            missing,
            unexpected,
        })
    }
}
