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

const NOT_YET: &str = "On this Mac, Cairn cannot yet keep protection in force on its own \
                       between restarts. Everything else works, and what is protected stays \
                       protected.";

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
