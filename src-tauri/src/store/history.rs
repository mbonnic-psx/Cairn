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

use rusqlite::Connection;

use crate::services::{Key, Trouble};

use super::key::HistoryKey;

pub const HISTORY_FILE: &str = "history.db";

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

    /// Reaches between two times, oldest first.
    pub fn between(&self, from: i64, to: i64) -> Result<Vec<Reach>, Trouble> {
        let mut statement = self
            .connection
            .prepare(
                "SELECT domain, at FROM reaches WHERE at >= ?1 AND at < ?2 ORDER BY at",
            )
            .map_err(|_| unreadable())?;

        let rows = statement
            .query_map(rusqlite::params![from, to], |row| {
                Ok(Reach {
                    domain: row.get(0)?,
                    at: row.get(1)?,
                })
            })
            .map_err(|_| unreadable())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| unreadable())
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
        let mut statement = self
            .connection
            .prepare(
                "SELECT from_at, to_at FROM coverage_gaps
                 WHERE to_at >= ?1 AND from_at < ?2 ORDER BY from_at",
            )
            .map_err(|_| unreadable())?;

        let rows = statement
            .query_map(rusqlite::params![from, to], |row| {
                Ok(CoverageGap {
                    from: row.get(0)?,
                    to: row.get(1)?,
                })
            })
            .map_err(|_| unreadable())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| unreadable())
    }

    /// Every column this database has. Used by the test that asserts a reach is
    /// a domain and a time and nothing else.
    pub fn columns_of_reaches(&self) -> Result<Vec<String>, Trouble> {
        let mut statement = self
            .connection
            .prepare("SELECT name FROM pragma_table_info('reaches')")
            .map_err(|_| unreadable())?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|_| unreadable())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| unreadable())
    }
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
