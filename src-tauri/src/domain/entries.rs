//! What Cairn protects, and the hosts lines that put it into force.
//!
//! A `Domain` only exists if it came through [`crate::domain::normalize`]: the
//! type is the guarantee that every entry in the system is in one form.

use std::collections::BTreeSet;
use std::fmt;

use serde::{Deserialize, Serialize};

/// A normalized, validated domain. Lowercase, ASCII (punycode if the person
/// typed a non-ASCII name), no scheme, no port, no path, no trailing dot.
///
/// There is deliberately no public constructor from a raw string. Everything
/// that becomes a `Domain` passes the same validation.
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct Domain(String);

impl Domain {
    /// Only `normalize` may mint one of these.
    pub(super) fn from_validated(value: String) -> Self {
        Domain(value)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// True when this is the `www.` form of another entry.
    pub fn is_www(&self) -> bool {
        self.0.starts_with("www.")
    }
}

impl fmt::Display for Domain {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl fmt::Debug for Domain {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Domain({})", self.0)
    }
}

/// The nine preset categories (FR-001). Named for what a person recognises,
/// never for a mechanism.
#[derive(
    Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, Serialize, Deserialize,
)]
#[serde(rename_all = "snake_case")]
pub enum CategoryId {
    Adult,
    Ai,
    Gambling,
    Gaming,
    Messenger,
    News,
    Shopping,
    Social,
    Streaming,
}

impl CategoryId {
    pub const ALL: [CategoryId; 9] = [
        CategoryId::Adult,
        CategoryId::Ai,
        CategoryId::Gambling,
        CategoryId::Gaming,
        CategoryId::Messenger,
        CategoryId::News,
        CategoryId::Shopping,
        CategoryId::Social,
        CategoryId::Streaming,
    ];

    /// The name a person sees.
    pub fn label(self) -> &'static str {
        match self {
            CategoryId::Adult => "Adult",
            CategoryId::Ai => "AI",
            CategoryId::Gambling => "Gambling",
            CategoryId::Gaming => "Gaming",
            CategoryId::Messenger => "Messenger",
            CategoryId::News => "News",
            CategoryId::Shopping => "Shopping",
            CategoryId::Social => "Social",
            CategoryId::Streaming => "Streaming",
        }
    }

    /// The seed file this category's shipped contents live in.
    pub fn slug(self) -> &'static str {
        match self {
            CategoryId::Adult => "adult",
            CategoryId::Ai => "ai",
            CategoryId::Gambling => "gambling",
            CategoryId::Gaming => "gaming",
            CategoryId::Messenger => "messenger",
            CategoryId::News => "news",
            CategoryId::Shopping => "shopping",
            CategoryId::Social => "social",
            CategoryId::Streaming => "streaming",
        }
    }
}

/// Why an entry is protected. An entry with no sources is removed, never
/// orphaned (FR-006).
#[derive(
    Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, Serialize, Deserialize,
)]
#[serde(rename_all = "snake_case", tag = "kind", content = "id")]
pub enum SourceRef {
    /// The person typed it themselves.
    Custom,
    /// It came from a preset category.
    Category(CategoryId),
    /// Cairn added it as the `www.` form of a root the person chose (FR-005).
    /// It is never a *sole* reason to keep an entry: it is carried alongside
    /// whatever source produced the root.
    AutoWww,
}

/// One protected entry, with every reason it is protected.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct ProtectedEntry {
    pub domain: Domain,
    pub sources: BTreeSet<SourceRef>,
    /// True when Cairn generated this as the `www.` form of a root entry.
    pub auto_www: bool,
}

impl ProtectedEntry {
    pub fn new(domain: Domain, source: SourceRef) -> Self {
        let auto_www = source == SourceRef::AutoWww;
        let mut sources = BTreeSet::new();
        sources.insert(source);
        ProtectedEntry {
            domain,
            sources,
            auto_www,
        }
    }

    /// Drop one reason. Returns false when nothing needs this entry any more,
    /// which is the only condition under which it may be unprotected (FR-006).
    #[must_use]
    pub fn remove_source(&mut self, source: &SourceRef) -> bool {
        self.sources.remove(source);
        !self.sources.is_empty()
    }
}

/// Everything a person has chosen to protect, plus how reaches are handled.
#[derive(Clone, PartialEq, Eq, Debug, Default, Serialize, Deserialize)]
pub struct Trail {
    pub entries: Vec<ProtectedEntry>,
    pub enabled_categories: BTreeSet<CategoryId>,
}

impl Trail {
    /// Merge an entry in, keeping every reason both copies carried. This is the
    /// deduplication FR-006 requires: one entry, however many sources.
    pub fn insert(&mut self, incoming: ProtectedEntry) {
        match self
            .entries
            .binary_search_by(|existing| existing.domain.cmp(&incoming.domain))
        {
            Ok(at) => {
                let entry = &mut self.entries[at];
                entry.sources.extend(incoming.sources);
                // An entry the person typed themselves is no longer merely a
                // generated `www.` form.
                entry.auto_www = entry.auto_www && incoming.auto_www;
            }
            Err(at) => self.entries.insert(at, incoming),
        }
    }

    /// Remove one reason from every entry that carries it, dropping only the
    /// entries nothing else needs.
    pub fn remove_source(&mut self, source: &SourceRef) {
        self.entries.retain_mut(|entry| entry.remove_source(source));
    }

    pub fn domains(&self) -> impl Iterator<Item = &Domain> {
        self.entries.iter().map(|entry| &entry.domain)
    }
}

/// Where protected names are sent.
///
/// Counted mode points them at loopback so the listener can note that a reach
/// happened and close the connection (research R2). Silent mode points them at
/// an unroutable address: the block is identical, nothing is recorded, and
/// nothing listens (FR-027, FR-028).
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReachMode {
    Counted,
    Silent,
}

impl ReachMode {
    fn addresses(self) -> (&'static str, &'static str) {
        match self {
            ReachMode::Counted => ("127.0.0.1", "::1"),
            ReachMode::Silent => ("0.0.0.0", "::"),
        }
    }
}

/// How lines are terminated in the file being written. Cairn adopts whatever
/// the file already uses and never normalises it (research R6).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum LineEnding {
    Lf,
    Crlf,
}

impl LineEnding {
    pub fn as_bytes(self) -> &'static [u8] {
        match self {
            LineEnding::Lf => b"\n",
            LineEnding::Crlf => b"\r\n",
        }
    }
}

/// Render the body of Cairn's hosts section: two lines per entry, IPv4 and
/// IPv6.
///
/// The pair is not optional. A name that resolves over IPv6 is not blocked by
/// an IPv4 line alone, so the line count is twice the entry count — which is
/// the number the scale spike has to measure (research R7).
pub fn emit_hosts_body<'a, I>(domains: I, mode: ReachMode, ending: LineEnding) -> Vec<u8>
where
    I: IntoIterator<Item = &'a Domain>,
{
    let (v4, v6) = mode.addresses();
    let eol = ending.as_bytes();
    let mut out = Vec::new();
    for domain in domains {
        out.extend_from_slice(v4.as_bytes());
        out.push(b' ');
        out.extend_from_slice(domain.as_str().as_bytes());
        out.extend_from_slice(eol);
        out.extend_from_slice(v6.as_bytes());
        out.push(b' ');
        out.extend_from_slice(domain.as_str().as_bytes());
        out.extend_from_slice(eol);
    }
    out
}

/// Read back the domains Cairn's section actually contains, so protection can
/// be reported from what is on the machine rather than from what was written
/// (FR-012).
pub fn parse_hosts_body(body: &[u8]) -> Vec<String> {
    let mut found = Vec::new();
    for line in body.split(|byte| *byte == b'\n') {
        let text = String::from_utf8_lossy(line);
        let trimmed = text.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let mut parts = trimmed.split_whitespace();
        let (Some(_address), Some(name)) = (parts.next(), parts.next()) else {
            continue;
        };
        found.push(name.to_string());
    }
    found
}
