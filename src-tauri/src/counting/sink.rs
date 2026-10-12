//! Where a noted reach actually goes.
//!
//! The listener knows how to read a destination name and nothing else; this is
//! the other half — the one thing it is allowed to do with what it read
//! (FR-024).
//!
//! A sealed history is not an error here. Slice 002 decided that at the moment
//! of a reach there is nothing to say and nobody to say it to: blocking is
//! unaffected, no interface appears either way, and Cairn does not write over
//! data it cannot read. So a sealed history simply notes nothing, quietly, and
//! the coverage record is what makes that visible later rather than a message
//! at the worst possible moment (FR-036).

#![cfg(feature = "history")]

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use crate::counting::listener::NoteReach;
use crate::store::history::History;

/// Records reaches into the encrypted history.
///
/// The mutex is here because a connection is handled on whichever accept thread
/// took it, and the database connection is not shared between threads on its
/// own. Contention is not a concern: a reach is two integers and a short string,
/// and they arrive at human speed.
pub struct RecordReach {
    history: Mutex<History>,
    /// Whether everything counted so far has been stored. It only ever goes
    /// from true to false: once a reach has been dropped, the time since is not
    /// time Cairn saw, and a later success does not make it so.
    storing: Arc<AtomicBool>,
}

impl RecordReach {
    pub fn over(history: History) -> Self {
        RecordReach {
            storing: Arc::new(AtomicBool::new(history.is_open())),
            history: Mutex::new(history),
        }
    }

    /// Notes that Cairn is counting, and keeping it, at `at` (slice
    /// `first-counted`). Says whether it was noted.
    pub fn note_counting(&self, at: i64) -> bool {
        let history = match self.history.lock() {
            Ok(history) => history,
            Err(poisoned) => poisoned.into_inner(),
        };
        history.note_counting(at)
    }

    /// Whether what Cairn counts has all been stored: the presence mark is
    /// only refreshed while this holds (FR-022).
    pub fn storing(&self) -> Arc<AtomicBool> {
        Arc::clone(&self.storing)
    }
}

impl NoteReach for RecordReach {
    fn note(&self, domain: &str, at: i64) {
        // A poisoned lock means a previous handler panicked mid-record. The
        // reach still deserves recording, and there is nothing here worth
        // failing over: the data behind the lock is a database handle, not an
        // invariant that a panic could have left half-built.
        let history = match self.history.lock() {
            Ok(history) => history,
            Err(poisoned) => poisoned.into_inner(),
        };
        if !history.record(domain, at) {
            self.storing.store(false, Ordering::SeqCst);
        }
    }
}
