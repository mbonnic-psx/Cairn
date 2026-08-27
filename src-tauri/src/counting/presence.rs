//! Whether anyone was watching, and when they were not.
//!
//! A count is only ever a count of what Cairn saw (FR-030). Slice 002 defined
//! coverage gaps, stored them, and read them beside a day's reaches — but
//! nothing ever wrote one, so the record was always empty and every count
//! presented itself as complete. That is the failure mode Principle III exists
//! to prevent, and it matters more now that counting has actually started.
//!
//! So Cairn leaves a mark while it is running, and works out on the next start
//! how long it was away.
//!
//! There is no autostart and no tray yet, so closing the window ends counting.
//! Gaps are therefore ordinary, frequent, and often large. Recording them
//! honestly is what lets the history say "this is what I saw" rather than "this
//! is what happened".

use std::path::{Path, PathBuf};
use std::time::Duration;

/// How often the mark is refreshed while Cairn is running.
///
/// The cost of the interval is that up to this much running time is counted as
/// away on the next start. A minute is short enough to be well inside what
/// `gaps::WORTH_MENTIONING` would bother anyone with, and long enough that this
/// is not a file being written at any rate worth thinking about.
pub const REFRESH: Duration = Duration::from_secs(60);

pub const MARK_FILE: &str = "last-seen";

/// The last moment Cairn is known to have been running.
///
/// A plain file, deliberately: it records a fact about the counter, not about
/// what was counted. Nothing here names a domain or a reach, so there is
/// nothing here to encrypt (FR-038b).
pub struct Mark {
    path: PathBuf,
}

impl Mark {
    pub fn at(data_directory: &Path) -> Self {
        Mark {
            path: data_directory.join(MARK_FILE),
        }
    }

    /// When Cairn was last seen, or nothing on a first run.
    ///
    /// An unreadable or nonsense mark reads as nothing rather than as a gap
    /// since the epoch: the honest answer to "what happened while I was not
    /// looking" is never fifty years.
    pub fn read(&self) -> Option<i64> {
        std::fs::read_to_string(&self.path)
            .ok()?
            .trim()
            .parse::<i64>()
            .ok()
            .filter(|seconds| *seconds > 0)
    }

    /// Leave the mark. Failure is not worth reporting: the consequence is a gap
    /// that looks slightly longer than it was, which errs toward admitting more
    /// blindness rather than less.
    pub fn write(&self, at: i64) {
        if let Some(directory) = self.path.parent() {
            let _ = std::fs::create_dir_all(directory);
        }
        let _ = std::fs::write(&self.path, at.to_string());
    }
}

/// Keep the mark fresh for as long as the process lives.
///
/// The thread is deliberately never joined: it holds nothing that needs
/// releasing, and the process exiting is exactly the event the mark is there to
/// record the far side of.
pub fn keep_marking(mark: Mark, now: fn() -> i64) {
    std::thread::spawn(move || loop {
        mark.write(now());
        std::thread::sleep(REFRESH);
    });
}

/// Record the period between the last mark and now, if it was long enough to
/// matter.
///
/// Called once, at start, before counting begins — so that the gap is in the
/// record before any reach that follows it.
#[cfg(feature = "history")]
pub fn record_gap_since_last_seen(
    history: &crate::store::history::History,
    mark: &Mark,
    now: i64,
) -> Option<crate::store::gaps::Gap> {
    use crate::store::history::CoverageGap;

    let gap = crate::store::gaps::infer(mark.read(), now)?;
    history.record_gap(&CoverageGap {
        from: gap.from,
        to: gap.to,
    });
    Some(gap)
}
