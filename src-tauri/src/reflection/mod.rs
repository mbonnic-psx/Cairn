//! The check-in's orchestration: a day assembled from the history, and an
//! entry saved into it.
//!
//! Above the stores and below `ipc`. It reads and writes only through an
//! `OpenHistory`, so a sealed history never reaches it: `ipc::state` turns
//! that into a sentence first, and nothing here can write to a history it
//! could not open (FR-029). The rules themselves (an empty entry is not an
//! entry, a revision keeps no old text) live in the store, where they are
//! proved.

pub mod checkin;
pub mod journal;
