//! The only boundary between the interface and the core.
//!
//! The frontend calls nothing else: no filesystem, no helper channel, no
//! network of any kind. Everything it can ask for is here
//! (contracts/ui-ipc.md).
//!
//! # No command reduces protection immediately
//!
//! Checked by review against the contract, and by the shape of this module:
//! `turn_protection_on` and `add_custom_entry` are increases and apply at once
//! (FR-048). Turning protection off, removing an entry, and switching a
//! category off are reductions — they return a pending change and wait
//! (FR-047). There is no command that turns protection off now, and there is no
//! privileged verb that could implement one (Principle I).
//!
//! # `list_todays_reaches` has exactly one caller
//!
//! Wiring it into a header, a tray, a badge, or a background poll would break
//! FR-030a. A lint restricts the import to the Reaches screen, and
//! `scripts/check-no-ambient-counts.mjs` fails the build if it appears anywhere
//! else.
//!
//! # Errors are product copy
//!
//! Every error returned from here is a sentence shown to a person exactly as
//! written, and is checked against the banned-word list (FR-050, SC-019).

pub mod state;

#[cfg(feature = "app")]
pub mod commands;

pub use state::AppState;
