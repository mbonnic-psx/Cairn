//! What the unelevated application may ask the privileged helper to do.
//!
//! This is a **closed list**. There is no generic "write this file" verb, no
//! "run this command", and no verb that takes a path from the caller — the
//! helper's blast radius is fixed at compile time (contracts/helper-ipc.md).
//!
//! Some absences here are constitutional controls rather than omissions:
//!
//! - No `UnblockDomain`, `PauseProtection`, `SuspendUntil`, or `AllowOnce`.
//!   Principle I forbids an in-moment path around the wall, and because no such
//!   verb exists, no future change to the interface can introduce one without
//!   adding a privileged verb — which cannot pass the review the constitution
//!   already requires.
//! - No verb that reads or returns reach data. The helper never touches history.
//! - No `SetTrustedClock`. The waiting period's clock is advance-only, internal,
//!   and cannot be moved by anything the person can reach.
//!
//! Both processes link this module, so the two ends cannot drift apart.

use serde::{Deserialize, Serialize};

use crate::domain::entries::{Domain, ReachMode};
use crate::store::inventory::Target;

/// Every request the helper will answer. An unknown verb is rejected, never
/// ignored.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "verb")]
pub enum Request {
    /// Is the helper there, and which version.
    Ping,

    /// Capture a file's true pre-Cairn contents, once, before anything is
    /// modified (FR-039). Never overwrites an existing backup.
    WriteBackupOnce { target: Target },

    /// Write Cairn's own marked region. Fails if no backup exists for the
    /// target — the backup is not written implicitly.
    ApplyHostsSection {
        entries: Vec<Domain>,
        mode: ReachMode,
    },

    /// Read back what is actually there.
    VerifyHostsSection { expected: Vec<Domain> },

    /// Put back what should be there, silently (FR-013).
    RepairHostsSection {
        entries: Vec<Domain>,
        mode: ReachMode,
    },

    /// Remove Cairn's region, leaving everything around it byte-identical.
    RemoveHostsSection,

    /// Remove the backup, once the file it protects has been restored.
    RemoveBackup { target: Target },

    /// Bind the loopback ports the counting listener accepts on, and hand the
    /// listening descriptors to the unelevated process (research R3).
    BindCountingSockets,

    /// Give them up again.
    ReleaseCountingSockets,

    /// Clear the resolver cache so a change takes effect without a restart.
    /// Failure here is non-fatal and reported (research R8).
    FlushDnsCache,

    /// The advance-only clock the waiting period is measured against.
    ReadTrustedClock,

    /// Undo everything, in reverse, and report what could not be undone.
    Uninstall,
}

/// What the helper answers. Every mutating verb reports what it actually found
/// on re-reading, never what it intended to write (FR-012).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "answer")]
pub enum Response {
    Pong {
        version: String,
        healthy: bool,
    },

    BackupWritten {
        /// False when a backup was already there — which is a success, not a
        /// problem: the original is already safe.
        written: bool,
        sha256: String,
    },

    HostsApplied {
        /// Counted from the file after writing it.
        verified_count: usize,
        sha256_after: String,
    },

    HostsVerified(SectionState),

    HostsRepaired {
        repaired: bool,
        verified_count: usize,
    },

    HostsRemoved {
        removed: bool,
        residue: Vec<String>,
    },

    BackupRemoved {
        removed: bool,
        /// Whether the file now matches its pre-Cairn contents exactly.
        restored_sha256_match: bool,
    },

    CountingSockets(CountingSockets),

    SocketsReleased {
        released: bool,
    },

    DnsFlushed {
        flushed: bool,
        mechanism: String,
        /// Present when the flush did not happen. The change still takes effect
        /// as caches expire.
        note: Option<String>,
    },

    TrustedClock {
        trusted_seconds: u64,
        running_seconds: u64,
        last_heartbeat_wall: i64,
    },

    Uninstalled {
        removed: bool,
        residue: Vec<String>,
    },

    /// Something did not happen, in words that can be shown as written.
    Trouble {
        message: String,
        kind: TroubleKind,
    },
}

/// What was actually found in the system file.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct SectionState {
    pub present: bool,
    pub entry_count: usize,
    /// True when what is there is not what should be there — the trigger for
    /// silent repair.
    pub drift: bool,
    pub missing: Vec<String>,
    pub unexpected: Vec<String>,
}

/// The listening sockets, handed over rather than kept.
///
/// The parser that reads hostile bytes runs unelevated, which is the whole
/// point of passing them (research R3).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub enum CountingSockets {
    /// Descriptors follow out-of-band, alongside this answer.
    Bound { ports: Vec<u16> },
    /// Something else already holds a port. Cairn drops to silent mode, and
    /// blocking is unaffected (FR-027, FR-028).
    Conflict { reason: String },
}

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TroubleKind {
    /// No backup exists for the target, so nothing may be written yet.
    NoBackupYet,
    /// Cairn's region in the file could not be read confidently, so the file
    /// was left alone.
    SectionUnreadable,
    /// The write happened but could not be confirmed by reading it back.
    NotVerified,
    /// The helper could not reach the file at all.
    Unreachable,
    /// The verb is not one the helper knows.
    UnknownVerb,
    /// This platform cannot do this.
    Unsupported,
}
