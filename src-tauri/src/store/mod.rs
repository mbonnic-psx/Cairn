//! Where Cairn keeps things, split by what the data is rather than by
//! convenience (data-model.md).
//!
//! | Store | Holds | Why |
//! | --- | --- | --- |
//! | [`config`] | the trail, reach mode, protection intent, pending change | no reach data, and must stay readable during teardown |
//! | [`inventory`] | every change Cairn made, and its one-time backups | must survive a broken database and a missing key |
//! | `history` | reaches and coverage gaps | encrypted at rest, no opt-out (FR-033) |
//!
//! The inventory is deliberately *not* encrypted. If the credential store is
//! unavailable, Cairn must still be able to put the machine back exactly as it
//! was — encrypting the record of what to undo behind a key that may be missing
//! would make a machine unrecoverable, which is a direct conflict with
//! Principle IV. The inventory holds no reach data, so nothing sensitive is
//! exposed by that choice.

pub mod config;
pub mod inventory;

use std::io;
use std::path::Path;

/// Write a file by writing a neighbour and renaming over it.
///
/// Rename is atomic only within a filesystem, so the temporary file is created
/// in the target's own directory — never in a temp directory (research R6).
/// A half-written config or inventory is worse than an old one.
pub fn write_atomically(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let directory = path.parent().ok_or_else(|| {
        io::Error::new(io::ErrorKind::InvalidInput, "that path has no directory")
    })?;
    std::fs::create_dir_all(directory)?;

    let temporary = path.with_extension(format!(
        "{}.writing",
        path.extension().and_then(|e| e.to_str()).unwrap_or("tmp")
    ));

    {
        use std::io::Write as _;
        let mut file = std::fs::File::create(&temporary)?;
        file.write_all(bytes)?;
        file.sync_all()?;
    }

    std::fs::rename(&temporary, path)
}
