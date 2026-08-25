//! Cairn's privileged helper.
//!
//! This is the only elevated component. It exists because FR-013 requires Cairn
//! to repair its own entries automatically and forbids interrupting the person
//! to do it — and an elevation prompt is an interruption (research R1).
//!
//! Everything it will ever do to the machine is enumerated in
//! [`cairn::protocol::Request`]. It takes no path from a caller, runs no
//! command a caller names, and has no verb that reduces protection.
//!
//! The library half exists so the verbs can be tested directly against a
//! temporary file, which is what the constitution requires before any of this
//! merges: *no privileged write path without a reviewed teardown path and a
//! test proving it restores*.

pub mod dispatch;
pub mod heartbeat;
pub mod machine;
pub mod verbs;

#[cfg(unix)]
pub mod channel;

/// Reported by `Ping`, and recorded when the helper is installed.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
