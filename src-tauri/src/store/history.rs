//! The reach history: encrypted at rest, always, with no way to turn it off.
//!
//! FR-033 and SC-014. Page-level encryption through SQLCipher rather than
//! encrypting a column, because a column is something application code can
//! forget to encrypt and a page is not (research R5).
//!
//! # The schema is the guarantee
//!
//! A reach is a domain and a time. There is no column for a path, a query, a
//! header, a process, or a payload — so no change to the code can start
//! recording one without a visible migration to review (FR-024, FR-025).
//!
//! # Failing closed
//!
//! Without the key, Cairn opens nothing and writes nothing here. It keeps
//! protecting and it leaves the existing file exactly as it found it (FR-036).
//! What it does *instead* — whether reaches are spooled somewhere they can be
//! recovered later — is the open question of research spike R5/T013, and is not
//! decided by guessing here.

#![cfg(feature = "history")]

use std::path::{Path, PathBuf};

use rusqlite::{Connection, OptionalExtension};

use crate::domain::dates::LocalDate;
use crate::services::{Key, Trouble};

use super::key::HistoryKey;

pub const HISTORY_FILE: &str = "history.db";

/// `reaches.at` inside `[from, to)`. Shared, word for word, between the read
/// in [`OpenHistory::between`] and the delete in
/// [`OpenHistory::delete_reach_history`] so the two can never silently drift
/// apart — what a range read would have shown is exactly what a delete for
/// that range removes.
const REACHES_IN_RANGE: &str = "at >= ?1 AND at < ?2";

/// `coverage_gaps` overlapping `[from, to)` at all, not merely contained by
/// it — the same predicate [`OpenHistory::gaps_between`] reads with. Reused
/// by [`OpenHistory::delete_reach_history`] to select which gaps to *clip*
/// (never to delete outright): a gap this predicate matches is one the range
/// touches, but only the portion actually inside `[from, to)` is data about
/// the period the person chose to remove — the rest survives, trimmed.
const GAPS_OVERLAPPING_RANGE: &str = "to_at >= ?1 AND from_at < ?2";

/// `journal_entries.day` / `reach_estimates.day` inside `[from, to)`. `day`
/// is stored as zero-padded `YYYY-MM-DD` text (`LocalDate`'s `Display`), so
/// lexicographic and calendar order agree and this reads exactly like the
/// integer ranges above.
const DAY_IN_RANGE: &str = "day >= ?1 AND day < ?2";

/// One reach: where, and when. That is the whole of it.
#[derive(Clone, PartialEq, Eq, Debug, serde::Serialize, serde::Deserialize)]
pub struct Reach {
    pub domain: String,
    pub at: i64,
}

/// A period Cairn was not running, and therefore not counting.
///
/// Exists so a count is never presented as complete for time nobody observed
/// (FR-030).
#[derive(Clone, PartialEq, Eq, Debug, serde::Serialize, serde::Deserialize)]
pub struct CoverageGap {
    pub from: i64,
    pub to: i64,
}

/// A day's writing. Nothing else.
///
/// No `written_at`: `data-model.md` keeps that column in storage, for
/// ordering and a foreseeable debugging need, and withholds it from every
/// read by contract — showing it is exactly how an entry written later
/// becomes visibly an entry written later, the distinction FR-026a forbids.
/// A caller cannot even ask for it; the type has no field to put it in.
#[derive(Clone, PartialEq, Eq, Debug, serde::Serialize, serde::Deserialize)]
pub struct JournalEntry {
    pub day: LocalDate,
    pub text: String,
}

/// The person's own count of their reaches for a day silent mode was active.
///
/// No site, no hour: FR-023 needs a type that cannot carry either, rather
/// than a rule a caller has to remember not to break.
#[derive(Clone, PartialEq, Eq, Debug, serde::Serialize, serde::Deserialize)]
pub struct ReachEstimate {
    pub day: LocalDate,
    pub count: u32,
}

/// The history, open or sealed.
pub enum History {
    Open(OpenHistory),
    /// Unreadable, untouched, and explained.
    Sealed {
        because: String,
    },
}

impl History {
    /// Open the history if the key can be had; otherwise seal it.
    ///
    /// Never creates a database over one it could not open.
    pub fn open(directory: &Path, key: &HistoryKey) -> Self {
        let path = directory.join(HISTORY_FILE);

        let HistoryKey::Available(key) = key else {
            return History::Sealed {
                because: key
                    .explanation()
                    .unwrap_or_else(|| "Cairn could not open your history.".into()),
            };
        };

        match OpenHistory::connect(&path, key) {
            Ok(history) => History::Open(history),
            Err(trouble) => History::Sealed {
                because: trouble.message,
            },
        }
    }

    /// Record a reach, if there is anywhere to record it.
    ///
    /// A sealed history is not an error at the moment of a reach: the reach
    /// produces no interface of any kind either way (FR-019), and blocking is
    /// entirely unaffected (FR-028).
    pub fn record(&self, domain: &str, at: i64) {
        if let History::Open(history) = self {
            let _ = history.record(domain, at);
        }
    }

    /// Record a period nobody was watching, if there is anywhere to record it.
    ///
    /// Sealed behaves as it does for a reach: nothing is written, nothing is
    /// overwritten, and blocking is unaffected.
    pub fn record_gap(&self, gap: &CoverageGap) {
        if let History::Open(history) = self {
            let _ = history.record_gap(gap);
        }
    }

    pub fn is_open(&self) -> bool {
        matches!(self, History::Open(_))
    }
}

pub struct OpenHistory {
    connection: Connection,
    #[allow(dead_code)]
    path: PathBuf,
}

impl OpenHistory {
    fn connect(path: &Path, key: &Key) -> Result<Self, Trouble> {
        if let Some(directory) = path.parent() {
            std::fs::create_dir_all(directory).map_err(|error| {
                Trouble::new(format!("Cairn could not open your history ({error})."))
            })?;
        }

        let connection = Connection::open(path).map_err(|error| {
            Trouble::new(format!("Cairn could not open your history ({error})."))
        })?;

        // The key goes in before anything else touches the file.
        let hex: String = key
            .expose()
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect();
        connection
            .pragma_update(None, "key", format!("x'{hex}'"))
            .map_err(|_| sealed())?;

        // Proves the key is the right one. A wrong key makes this fail rather
        // than silently producing an empty database over the old one.
        connection
            .query_row("SELECT count(*) FROM sqlite_master", [], |row| {
                row.get::<_, i64>(0)
            })
            .map_err(|_| sealed())?;

        connection
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS reaches (
                     domain TEXT NOT NULL,
                     at     INTEGER NOT NULL
                 );
                 CREATE INDEX IF NOT EXISTS reaches_at ON reaches (at);
                 CREATE TABLE IF NOT EXISTS coverage_gaps (
                     from_at INTEGER NOT NULL,
                     to_at   INTEGER NOT NULL
                 );
                 CREATE TABLE IF NOT EXISTS journal_entries (
                     day        TEXT PRIMARY KEY,
                     text       TEXT NOT NULL,
                     written_at INTEGER NOT NULL
                 );
                 CREATE TABLE IF NOT EXISTS reach_estimates (
                     day   TEXT PRIMARY KEY,
                     count INTEGER NOT NULL
                 );",
            )
            .map_err(|error| {
                Trouble::new(format!("Cairn could not prepare your history ({error})."))
            })?;

        Ok(OpenHistory {
            connection,
            path: path.to_path_buf(),
        })
    }

    pub fn record(&self, domain: &str, at: i64) -> Result<(), Trouble> {
        self.connection
            .execute(
                "INSERT INTO reaches (domain, at) VALUES (?1, ?2)",
                rusqlite::params![domain, at],
            )
            .map(|_| ())
            .map_err(|_| Trouble::new("Cairn could not record that just now."))
    }

    /// Rows whose key falls in `[from, to)`, generalized over every
    /// range-keyed table this store has.
    ///
    /// Reaches and coverage gaps are keyed by epoch seconds; journal entries
    /// and reach estimates are keyed by a `LocalDate` stored as `YYYY-MM-DD`
    /// text. Those are genuinely different keys, not the same key wearing two
    /// costumes, so this does not collapse them into one shared type —
    /// instead it stays generic over whatever the caller's key already is
    /// (anything `rusqlite` can bind), and each caller below supplies its own
    /// SQL, its own key type, and its own row shape. What is shared is the
    /// seam itself: prepare, bind the two bounds, map every row, and turn any
    /// failure into the one `Trouble` a caller ever sees — the part that was
    /// previously duplicated between `between` and `gaps_between` and would
    /// otherwise be duplicated twice more for entries and estimates.
    fn select_range<K, T>(
        &self,
        sql: &str,
        from: &K,
        to: &K,
        row: impl Fn(&rusqlite::Row) -> rusqlite::Result<T>,
    ) -> Result<Vec<T>, Trouble>
    where
        K: rusqlite::ToSql,
    {
        let mut statement = self.connection.prepare(sql).map_err(|_| unreadable())?;
        let rows = statement
            .query_map(rusqlite::params![from, to], row)
            .map_err(|_| unreadable())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| unreadable())
    }

    /// Reaches between two times, oldest first.
    pub fn between(&self, from: i64, to: i64) -> Result<Vec<Reach>, Trouble> {
        self.select_range(
            &format!(
                "SELECT domain, at FROM reaches WHERE {REACHES_IN_RANGE} ORDER BY at"
            ),
            &from,
            &to,
            |row| {
                Ok(Reach {
                    domain: row.get(0)?,
                    at: row.get(1)?,
                })
            },
        )
    }

    pub fn record_gap(&self, gap: &CoverageGap) -> Result<(), Trouble> {
        self.connection
            .execute(
                "INSERT INTO coverage_gaps (from_at, to_at) VALUES (?1, ?2)",
                rusqlite::params![gap.from, gap.to],
            )
            .map(|_| ())
            .map_err(|_| Trouble::new("Cairn could not record that just now."))
    }

    pub fn gaps_between(&self, from: i64, to: i64) -> Result<Vec<CoverageGap>, Trouble> {
        self.select_range(
            &format!(
                "SELECT from_at, to_at FROM coverage_gaps WHERE {GAPS_OVERLAPPING_RANGE} \
                 ORDER BY from_at"
            ),
            &from,
            &to,
            |row| {
                Ok(CoverageGap {
                    from: row.get(0)?,
                    to: row.get(1)?,
                })
            },
        )
    }

    /// Refuses empty or whitespace-only text and stores nothing (FR-014).
    /// Otherwise replaces whatever entry `day` already had — no version kept,
    /// no trace of the old text (data-model.md).
    pub fn save_entry(
        &self,
        day: LocalDate,
        text: &str,
        written_at: i64,
    ) -> Result<(), Trouble> {
        if text.trim().is_empty() {
            return Err(Trouble::new("An empty entry is not saved."));
        }

        self.connection
            .execute(
                "INSERT INTO journal_entries (day, text, written_at) VALUES (?1, ?2, ?3)
                 ON CONFLICT(day) DO UPDATE SET text = excluded.text, written_at = excluded.written_at",
                rusqlite::params![day.to_string(), text, written_at],
            )
            .map(|_| ())
            .map_err(|_| Trouble::new("Cairn could not save that just now."))
    }

    /// The entry for one day, if there is one. Never carries `written_at`
    /// (FR-026a) — the type it returns has no field to put it in.
    pub fn entry_for(&self, day: LocalDate) -> Result<Option<JournalEntry>, Trouble> {
        self.connection
            .query_row(
                "SELECT text FROM journal_entries WHERE day = ?1",
                rusqlite::params![day.to_string()],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|_| unreadable())
            .map(|found| found.map(|text| JournalEntry { day, text }))
    }

    /// Replaces whatever estimate `day` already had (FR-012).
    pub fn save_estimate(&self, day: LocalDate, count: u32) -> Result<(), Trouble> {
        self.connection
            .execute(
                "INSERT INTO reach_estimates (day, count) VALUES (?1, ?2)
                 ON CONFLICT(day) DO UPDATE SET count = excluded.count",
                rusqlite::params![day.to_string(), count],
            )
            .map(|_| ())
            .map_err(|_| Trouble::new("Cairn could not save that just now."))
    }

    /// The estimate for one day, if there is one.
    pub fn estimate_for(&self, day: LocalDate) -> Result<Option<ReachEstimate>, Trouble> {
        self.connection
            .query_row(
                "SELECT count FROM reach_estimates WHERE day = ?1",
                rusqlite::params![day.to_string()],
                |row| row.get::<_, u32>(0),
            )
            .optional()
            .map_err(|_| unreadable())
            .map(|found| found.map(|count| ReachEstimate { day, count }))
    }

    /// Entries whose day falls in `[from, to)`, oldest first. Same seam as
    /// [`OpenHistory::between`]; `day` is the key rather than `at`.
    pub fn entries_between(
        &self,
        from: LocalDate,
        to: LocalDate,
    ) -> Result<Vec<JournalEntry>, Trouble> {
        let (from, to) = (from.to_string(), to.to_string());
        self.select_range(
            &format!(
                "SELECT day, text FROM journal_entries WHERE {DAY_IN_RANGE} ORDER BY day"
            ),
            &from,
            &to,
            |row| {
                Ok(JournalEntry {
                    day: parse_day(row, 0)?,
                    text: row.get(1)?,
                })
            },
        )
    }

    /// Estimates whose day falls in `[from, to)`, oldest first.
    pub fn estimates_between(
        &self,
        from: LocalDate,
        to: LocalDate,
    ) -> Result<Vec<ReachEstimate>, Trouble> {
        let (from, to) = (from.to_string(), to.to_string());
        self.select_range(
            &format!("SELECT day, count FROM reach_estimates WHERE {DAY_IN_RANGE} ORDER BY day"),
            &from,
            &to,
            |row| {
                Ok(ReachEstimate {
                    day: parse_day(row, 0)?,
                    count: row.get(1)?,
                })
            },
        )
    }

    /// Deletes reaches in `[from, to)` outright, and clips — never deletes
    /// whole — every coverage gap the range touches. A day or an arbitrary
    /// range, depending on the bounds the caller supplies. Returns nothing
    /// but success or failure: not a count, not which rows, per FR-018b (see
    /// `delete_reach_history` in `contracts/ui-ipc.md`).
    ///
    /// `data-model.md` bounds gap removal to "within the range the person
    /// chose": a gap that extends beyond `[from, to)` is data about a period
    /// the person never asked to remove, and discarding the whole row would
    /// make a later read claim Cairn was watching over that surrounding
    /// period when it has no idea (Principle III — never claim coverage you
    /// don't have). So a gap overlapping the range is trimmed to whatever
    /// survives outside it: nothing, if the range swallows the gap whole;
    /// one shortened gap, if the range only eats one end; or two gaps, if
    /// the range falls entirely inside the original one and cuts it in half.
    /// Both tables are cleared/clipped inside one transaction, so a failure
    /// partway through cannot leave reaches gone and their gap still intact
    /// in its old, no-longer-accurate form, or a gap only half clipped.
    pub fn delete_reach_history(&self, from: i64, to: i64) -> Result<(), Trouble> {
        self.connection
            .execute_batch("BEGIN")
            .map_err(|_| unreadable())?;

        let outcome = self.delete_reaches_and_clip_gaps(from, to);

        match outcome {
            Ok(()) => {
                self.connection
                    .execute_batch("COMMIT")
                    .map_err(|_| unreadable())?;
                Ok(())
            }
            Err(_) => {
                let _ = self.connection.execute_batch("ROLLBACK");
                Err(Trouble::new("Cairn could not delete that just now."))
            }
        }
    }

    /// The body of [`OpenHistory::delete_reach_history`], factored out only
    /// so it can return a plain `rusqlite::Error` and let its caller decide
    /// once, in one place, whether to commit or roll back.
    fn delete_reaches_and_clip_gaps(&self, from: i64, to: i64) -> rusqlite::Result<()> {
        self.connection.execute(
            &format!("DELETE FROM reaches WHERE {REACHES_IN_RANGE}"),
            rusqlite::params![from, to],
        )?;

        // Every gap `gaps_between` would have shown for this range — the
        // same predicate, so selection here can never drift from what a
        // read considers "in range" — read out with its `rowid`, since
        // `coverage_gaps` has no primary key of its own to address a row by.
        let mut statement = self.connection.prepare(&format!(
            "SELECT rowid, from_at, to_at FROM coverage_gaps WHERE {GAPS_OVERLAPPING_RANGE}"
        ))?;
        let overlapping: Vec<(i64, i64, i64)> = statement
            .query_map(rusqlite::params![from, to], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        drop(statement);

        for (rowid, g_from, g_to) in overlapping {
            self.connection.execute(
                "DELETE FROM coverage_gaps WHERE rowid = ?1",
                rusqlite::params![rowid],
            )?;

            // What is left of the gap before `from` — empty, and so not
            // reinserted, unless the gap actually started earlier.
            let front_end = from.min(g_to);
            if g_from < front_end {
                self.connection.execute(
                    "INSERT INTO coverage_gaps (from_at, to_at) VALUES (?1, ?2)",
                    rusqlite::params![g_from, front_end],
                )?;
            }

            // What is left of the gap at or after `to` — empty, and so not
            // reinserted, unless the gap actually ran past it.
            let back_start = to.max(g_from);
            if back_start < g_to {
                self.connection.execute(
                    "INSERT INTO coverage_gaps (from_at, to_at) VALUES (?1, ?2)",
                    rusqlite::params![back_start, g_to],
                )?;
            }
        }

        Ok(())
    }

    /// Deletes every reach and every coverage gap — the "all of it"
    /// granularity FR-018 requires, spelled as its own unconditional
    /// operation rather than a range wide enough to hope it covers
    /// everything.
    pub fn delete_all_reach_history(&self) -> Result<(), Trouble> {
        self.connection
            .execute_batch("DELETE FROM reaches; DELETE FROM coverage_gaps;")
            .map_err(|_| Trouble::new("Cairn could not delete that just now."))
    }

    /// Every column a table has. Shared by the column-list assertions for
    /// each table this store holds.
    fn columns_of(&self, table: &str) -> Result<Vec<String>, Trouble> {
        let mut statement = self
            .connection
            .prepare(&format!("SELECT name FROM pragma_table_info('{table}')"))
            .map_err(|_| unreadable())?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|_| unreadable())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| unreadable())
    }

    /// Used by the test that asserts a reach is a domain and a time and
    /// nothing else.
    pub fn columns_of_reaches(&self) -> Result<Vec<String>, Trouble> {
        self.columns_of("reaches")
    }

    /// Used by the test that asserts an entry is a day and its text and
    /// nothing else — no `version`, no `superseded`, no `deleted`.
    pub fn columns_of_journal_entries(&self) -> Result<Vec<String>, Trouble> {
        self.columns_of("journal_entries")
    }

    /// Used by the test that asserts an estimate carries no site and no
    /// hour.
    pub fn columns_of_reach_estimates(&self) -> Result<Vec<String>, Trouble> {
        self.columns_of("reach_estimates")
    }

    /// Total rows in `journal_entries`. Test-support only, in the spirit of
    /// `columns_of_reaches`.
    pub fn journal_entry_count(&self) -> Result<i64, Trouble> {
        self.connection
            .query_row("SELECT count(*) FROM journal_entries", [], |row| row.get(0))
            .map_err(|_| unreadable())
    }

    /// Total rows in `reach_estimates`. Test-support only.
    pub fn reach_estimate_count(&self) -> Result<i64, Trouble> {
        self.connection
            .query_row("SELECT count(*) FROM reach_estimates", [], |row| row.get(0))
            .map_err(|_| unreadable())
    }

    /// Every table this database has. A side table for holding a previous
    /// entry, or anything else, cannot be added without this test noticing.
    pub fn table_names(&self) -> Result<Vec<String>, Trouble> {
        let mut statement = self
            .connection
            .prepare(
                "SELECT name FROM sqlite_master \
                 WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
            )
            .map_err(|_| unreadable())?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|_| unreadable())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| unreadable())
    }
}

/// Reads a `YYYY-MM-DD` text column back into a [`LocalDate`], turning a
/// malformed value into the same kind of error every other read failure
/// becomes rather than panicking on data this store itself always writes in
/// the one valid form.
fn parse_day(row: &rusqlite::Row, index: usize) -> rusqlite::Result<LocalDate> {
    let text: String = row.get(index)?;
    text.parse::<LocalDate>().map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            index,
            rusqlite::types::Type::Text,
            Box::new(error),
        )
    })
}

fn sealed() -> Trouble {
    Trouble::new(
        "Cairn could not open your history with the key it has, so your entries stay \
         sealed and exactly as they are. Protection is unaffected.",
    )
}

fn unreadable() -> Trouble {
    Trouble::new("Cairn could not read your history just now. Protection is unaffected.")
}
