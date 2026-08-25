//! The files this helper is allowed to touch, and how it touches them.
//!
//! Two rules live here rather than in each verb, because a verb that forgets
//! either of them is a constitutional problem:
//!
//! 1. **Same-directory atomic rename.** Write a neighbour, `fsync` it, rename
//!    over the target. Rename is atomic only within a filesystem, so the
//!    temporary file goes in the target's own directory (research R6).
//! 2. **Permissions are the file's own.** A hosts file that comes back
//!    world-writable would be a security hole Cairn opened.

use std::io;
use std::path::{Path, PathBuf};

use cairn::store::inventory::{InventoryStore, Target};

/// Where a target lives on this machine.
///
/// The caller never names a path — it names a [`Target`], and this decides.
pub fn system_path(target: Target) -> PathBuf {
    match target {
        Target::SystemHosts => hosts_path(),
    }
}

#[cfg(windows)]
fn hosts_path() -> PathBuf {
    let root = std::env::var_os("SystemRoot").unwrap_or_else(|| r"C:\Windows".into());
    PathBuf::from(root).join(r"System32\drivers\etc\hosts")
}

#[cfg(not(windows))]
fn hosts_path() -> PathBuf {
    PathBuf::from("/etc/hosts")
}

/// The machine the helper is acting on.
///
/// Constructed from real paths in production and from a temporary directory in
/// tests — the verbs cannot tell the difference, which is what makes the
/// restoration test meaningful.
#[derive(Clone)]
pub struct Machine {
    hosts: PathBuf,
    data: PathBuf,
}

impl Machine {
    /// The real machine.
    pub fn real(data_directory: impl Into<PathBuf>) -> Self {
        Machine {
            hosts: hosts_path(),
            data: data_directory.into(),
        }
    }

    /// A machine made of temporary files, for tests.
    pub fn at(hosts: impl Into<PathBuf>, data_directory: impl Into<PathBuf>) -> Self {
        Machine {
            hosts: hosts.into(),
            data: data_directory.into(),
        }
    }

    pub fn path_of(&self, target: Target) -> &Path {
        match target {
            Target::SystemHosts => &self.hosts,
        }
    }

    pub fn inventory(&self) -> InventoryStore {
        InventoryStore::at(&self.data)
    }

    pub fn data_directory(&self) -> &Path {
        &self.data
    }

    pub fn read(&self, target: Target) -> io::Result<Vec<u8>> {
        match std::fs::read(self.path_of(target)) {
            // A hosts file that is not there is an empty one for splicing
            // purposes; Cairn will create it and can remove it again.
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(Vec::new()),
            other => other,
        }
    }

    /// Replace a system file's contents, keeping its permissions and leaving no
    /// window in which it is half-written.
    pub fn write(&self, target: Target, bytes: &[u8]) -> io::Result<()> {
        let path = self.path_of(target);
        let directory = path
            .parent()
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "no directory"))?;
        std::fs::create_dir_all(directory)?;

        let existing_permissions =
            std::fs::metadata(path).ok().map(|data| data.permissions());

        let temporary = directory.join(".cairn-writing");
        {
            use io::Write as _;
            let mut file = std::fs::File::create(&temporary)?;
            file.write_all(bytes)?;
            file.sync_all()?;
        }
        if let Some(permissions) = existing_permissions {
            std::fs::set_permissions(&temporary, permissions)?;
        }

        // On Windows, rename over an existing file needs the destination gone
        // first; everywhere else the replace is the atomic step.
        #[cfg(windows)]
        {
            let _ = std::fs::remove_file(path);
        }
        std::fs::rename(&temporary, path)
    }
}
