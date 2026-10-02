//! The check-in's orchestration: a day assembled from the history, an entry
//! saved into it, and the quote beside them.
//!
//! Above the stores and below `ipc`. It reads and writes only through an
//! `OpenHistory`, so a sealed history never reaches it: `ipc::state` turns
//! that into a sentence first, and nothing here can write to a history it
//! could not open (FR-029). The rules themselves (an empty entry is not an
//! entry, a revision keeps no old text) live in the store, where they are
//! proved.
//!
//! The quote is the one part that does not touch the history, so it is built
//! whether or not this build keeps one.

#[cfg(feature = "history")]
pub mod checkin;
#[cfg(feature = "history")]
pub mod journal;
#[cfg(feature = "history")]
pub mod over_time;
pub mod quote;
