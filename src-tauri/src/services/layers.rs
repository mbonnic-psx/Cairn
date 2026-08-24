//! Layers two and three, declared and deliberately not implemented.
//!
//! This slice is layer 1 — the system hosts file, authoritative and always on.
//! Resolver rules and encrypted-DNS lockdown are the largest engineering item
//! in v1 and carry their own go/no-go checkpoint. They attach here later
//! without the applier changing.
//!
//! What matters constitutionally is the direction of failure: a layer that
//! reports [`Capability::Unsupported`] degrades to layer 1. Nothing degrades to
//! no blocking (FR-028). Nothing in this slice may take a hard dependency on
//! either of these, and the interface must not imply the coverage they would
//! provide (FR-018).

use super::Capability;

/// Resolver-level rules: NRPT on Windows, `/etc/resolver` on macOS, dnsmasq or
/// systemd-resolved on Linux.
pub trait ResolverRulesService: Send + Sync {
    fn capability(&self) -> Capability;
}

/// Preventing browser workarounds: policy files, endpoint blocking, and the
/// Firefox canary domain.
pub trait BrowserPolicyService: Send + Sync {
    fn capability(&self) -> Capability;
}

/// The answer both give in this release.
fn not_in_this_release() -> Capability {
    Capability::unsupported(
        "This release protects at the level of the whole machine through the \
         system's own address list. Applications that look up addresses on their \
         own are not covered yet.",
    )
}

/// Stands in for layer 2 until it is built.
pub struct ResolverRulesNotInThisRelease;

impl ResolverRulesService for ResolverRulesNotInThisRelease {
    fn capability(&self) -> Capability {
        not_in_this_release()
    }
}

/// Stands in for layer 3 until it is built.
pub struct BrowserPolicyNotInThisRelease;

impl BrowserPolicyService for BrowserPolicyNotInThisRelease {
    fn capability(&self) -> Capability {
        not_in_this_release()
    }
}
