//! Getting the key that seals the reach history, or deciding what to do
//! without it.
//!
//! The person never sees this key and is never asked for a passphrase to read
//! their own entries (FR-034, SC-015). It is created on first run and kept in
//! the platform's own credential store.
//!
//! When it cannot be had, Cairn **fails closed** (FR-036): it opens nothing,
//! reports plainly that history cannot be opened, keeps protecting, and never
//! writes over data it cannot read. An unreadable history is a problem to
//! explain, not a file to replace.

use crate::services::{CredentialStore, Key, KeyUnavailable};

/// What Cairn has to work with.
pub enum HistoryKey {
    /// The history can be opened.
    Available(Key),
    /// It cannot. Protection is unaffected, and nothing is overwritten.
    Sealed(KeyUnavailable),
}

impl HistoryKey {
    /// Ask the platform. This is the only place that asks.
    pub fn obtain(credentials: &dyn CredentialStore) -> Self {
        match credentials.get_or_create_history_key() {
            Ok(key) => HistoryKey::Available(key),
            Err(unavailable) => HistoryKey::Sealed(unavailable),
        }
    }

    /// The one sentence shown when history cannot be opened. It says what is
    /// still true — protection is on — because that is the part that matters.
    pub fn explanation(&self) -> Option<String> {
        match self {
            HistoryKey::Available(_) => None,
            HistoryKey::Sealed(unavailable) => Some(unavailable.message()),
        }
    }

    pub fn is_available(&self) -> bool {
        matches!(self, HistoryKey::Available(_))
    }
}
