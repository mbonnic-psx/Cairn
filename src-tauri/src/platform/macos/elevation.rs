//! Installing the privileged helper on macOS.
//!
//! **This is gated on an unresolved spike (research R1, T012).** `SMAppService`
//! privileged helpers require a Developer ID signature and a hardened runtime,
//! which means a free, local-first, no-account product still needs a paid Apple
//! Developer account to ship a working macOS build. Whether that is available
//! decides which of two designs this file holds:
//!
//! - **Signature available**: install the helper once through `SMAppService`,
//!   exactly as on the other platforms, with silent repair working.
//! - **Signature not available**: macOS degrades to elevation per privileged
//!   write, automatic repair disabled — and that limit is stated in the
//!   interface under FR-018. It does *not* degrade to no blocking.
//!
//! Until the spike resolves, this reports the honest answer rather than a
//! guess. Reporting `Unsupported` means the interface says what is not covered
//! on this platform (Principle III), instead of claiming a coverage Cairn has
//! not proven it has.

use crate::services::{ElevationService, HelperStatus, Outcome, Removal, Trouble};

#[derive(Default)]
pub struct MacosElevation;

/// What cannot happen here, and nothing about what is in force: that is a read
/// of the machine, and this code makes none (Principle III). Every privileged
/// write goes through the helper, so without it Cairn cannot put protection in
/// force here on its own either — "everything else works" would not be true.
const NOT_YET: &str = "On this Mac, Cairn cannot yet install its background component, \
                       and that component is what puts protection in force and keeps it \
                       there.";

impl ElevationService for MacosElevation {
    fn helper_status(&self) -> HelperStatus {
        HelperStatus::Unsupported {
            because: NOT_YET.into(),
        }
    }

    fn install_helper(&self) -> Outcome<HelperStatus> {
        Err(Trouble::new(NOT_YET))
    }

    fn uninstall_helper(&self) -> Outcome<Removal> {
        // Nothing was installed, so nothing is left behind.
        Ok(Removal::clean())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_says_what_cannot_happen_here_and_nothing_about_what_is_in_force() {
        let lowered = NOT_YET.to_lowercase();
        for claim in [
            "stays protected",
            "still protected",
            "is protected",
            "everything else works",
        ] {
            assert!(!lowered.contains(claim), "{claim:?} in: {NOT_YET}");
        }
        assert!(lowered.contains("cannot"), "{NOT_YET}");
    }
}
