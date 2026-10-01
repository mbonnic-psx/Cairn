//! What each platform must be able to do, stated once.
//!
//! Every trait here can answer [`Capability::Unsupported`], and that answer is
//! a real one: a platform that cannot do something is reported honestly rather
//! than treated as a silent success or a hard error (Principle III, FR-018).
//!
//! No platform type crosses this boundary. These traits deal in domains, bytes,
//! and outcomes — never in a registry handle, a launchd label, or a systemd
//! unit name (contracts/platform-services.md).

pub mod layers;

use std::fmt;

use crate::domain::entries::Domain;

/// Whether a platform can do a thing at all.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Capability {
    Available,
    /// Not possible on this platform, in words that can be shown to a person.
    Unsupported {
        because: String,
    },
}

impl Capability {
    pub fn is_available(&self) -> bool {
        matches!(self, Capability::Available)
    }

    pub fn unsupported(because: impl Into<String>) -> Self {
        Capability::Unsupported {
            because: because.into(),
        }
    }
}

/// Something Cairn could not do, in words a person can read (FR-050).
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Trouble {
    pub message: String,
}

impl Trouble {
    pub fn new(message: impl Into<String>) -> Self {
        Trouble {
            message: message.into(),
        }
    }
}

impl fmt::Display for Trouble {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for Trouble {}

pub type Outcome<T> = Result<T, Trouble>;

/// Whether the privileged helper is installed and reachable.
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum HelperStatus {
    NotInstalled,
    Installed {
        version: String,
    },
    /// This platform cannot run the helper — repair will be limited, and the
    /// limit is stated in the interface rather than hidden (research R1).
    Unsupported {
        because: String,
    },
}

/// Installs and manages the privileged helper. Elevation happens here and
/// nowhere else, and it prompts exactly once (FR-014).
pub trait ElevationService: Send + Sync {
    fn helper_status(&self) -> HelperStatus;
    fn install_helper(&self) -> Outcome<HelperStatus>;
    /// Removing the helper is part of teardown: its installation is an
    /// inventoried change like any other (FR-041, FR-043).
    fn uninstall_helper(&self) -> Outcome<Removal>;
}

/// What a removal actually left behind. Residue is reported, never rounded down
/// to success (FR-043, FR-044).
#[derive(Clone, PartialEq, Eq, Debug, Default)]
pub struct Removal {
    pub removed: bool,
    pub residue: Vec<String>,
}

impl Removal {
    pub fn clean() -> Self {
        Removal {
            removed: true,
            residue: Vec::new(),
        }
    }

    pub fn is_clean(&self) -> bool {
        self.removed && self.residue.is_empty()
    }
}

/// Reads system state. Every write goes through the helper.
pub trait HostsService: Send + Sync {
    fn read_raw(&self) -> Outcome<Vec<u8>>;
    fn section_present(&self) -> Outcome<bool>;
    /// Compare what is on the machine with what should be there. This is the
    /// only thing protection state may be derived from (FR-012).
    fn verify(&self, expected: &[Domain]) -> Outcome<Verification>;
}

/// What was actually found in the system file — not what was written.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Verification {
    pub section_present: bool,
    /// Distinct domains found, counted from the file — not lines. Each domain
    /// occupies two lines, IPv4 and IPv6.
    pub entry_count: usize,
    /// Expected entries that were not there.
    pub missing: Vec<Domain>,
    /// Entries in Cairn's section that are not expected any more.
    pub unexpected: Vec<String>,
}

impl Verification {
    pub fn matches(&self) -> bool {
        self.section_present && self.missing.is_empty() && self.unexpected.is_empty()
    }
}

/// Flushing the resolver cache after a change. Failure is non-fatal, and is
/// reported rather than swallowed (research R8).
pub trait DnsFlushService: Send + Sync {
    fn flush(&self) -> FlushOutcome;
}

#[derive(Clone, PartialEq, Eq, Debug)]
pub enum FlushOutcome {
    Flushed {
        mechanism: String,
    },
    /// Nothing on this machine is caching, so there was nothing to clear.
    NothingCaching,
    /// The change still takes effect as caches expire; protection is reported
    /// in force only if verification passes independently.
    NotFlushed {
        mechanism: String,
        note: String,
    },
}

/// The key for the reach history, held by the platform's own credential store.
///
/// The person never sees it and is never asked for a passphrase to read their
/// own entries (FR-034, SC-015).
pub trait CredentialStore: Send + Sync {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable>;
    fn delete_history_key(&self) -> Outcome<()>;
}

/// A 256-bit key. Its bytes are deliberately hard to print by accident: a key
/// in a diagnostic log would be exactly the leak FR-038b rules out.
#[derive(Clone, PartialEq, Eq)]
pub struct Key([u8; 32]);

impl Key {
    pub fn from_bytes(bytes: [u8; 32]) -> Self {
        Key(bytes)
    }

    pub fn expose(&self) -> &[u8; 32] {
        &self.0
    }
}

impl fmt::Debug for Key {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Key(held)")
    }
}

/// Why history cannot be opened.
///
/// Every variant here means the same thing operationally: keep protecting, keep
/// recording, never overwrite what cannot be read (FR-036, research R5).
#[derive(Clone, PartialEq, Eq, Debug)]
#[allow(clippy::enum_variant_names)]
pub enum KeyUnavailable {
    /// No credential store on this machine — some minimal Linux setups.
    NoCredentialStore { because: String },
    /// The store is there but locked.
    Locked,
    /// The store answered, but not with a usable key.
    Unreadable { because: String },
}

impl KeyUnavailable {
    /// One sentence, shown as written.
    pub fn message(&self) -> String {
        match self {
            KeyUnavailable::NoCredentialStore { .. } => {
                "This machine has no place to keep the key that protects your history, \
                 so your entries stay sealed. Protection is unaffected, and Cairn keeps \
                 recording."
                    .into()
            }
            KeyUnavailable::Locked => {
                "Your keychain is locked, so your history stays sealed until it is \
                 unlocked. Protection is unaffected, and Cairn keeps recording."
                    .into()
            }
            KeyUnavailable::Unreadable { .. } => {
                "Cairn could not read the key that protects your history, so your \
                 entries stay sealed and untouched. Protection is unaffected."
                    .into()
            }
        }
    }
}

/// Starting with the machine. Declared now, used by a later slice.
pub trait AutostartService: Send + Sync {
    fn capability(&self) -> Capability;
    fn is_enabled(&self) -> Outcome<bool>;
    fn set_enabled(&self, on: bool) -> Outcome<()>;
}
