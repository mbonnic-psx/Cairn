//! One entry, one form — whatever the person typed.
//!
//! Constitution-critical (FR-004 – FR-007). Everything that becomes protected
//! comes through here, so this is the only place that decides what a valid
//! entry is, what the `www.` rule means, and what Cairn refuses to touch.
//!
//! Rejections carry a sentence that can be shown to a person exactly as
//! written. That constrains the vocabulary: this file may not say *failed*,
//! *denied*, *forbidden*, or *invalid* at a person (FR-050).

use serde::{Deserialize, Serialize};

use super::entries::Domain;

/// The longest a domain name may be, in its ASCII form.
const MAX_DOMAIN_LEN: usize = 253;
/// The longest a single label may be.
const MAX_LABEL_LEN: usize = 63;

/// Why an entry was not taken, in words a person can read.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Rejection {
    /// Shown as written (FR-050, contracts/ui-ipc.md).
    pub reason: String,
    /// A stable tag for tests and for the UI to key on. Never shown.
    pub kind: RejectionKind,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RejectionKind {
    Empty,
    NotAnAddress,
    SingleWord,
    IpAddress,
    Wildcard,
    TooLong,
    KeepsTheMachineWorking,
}

impl Rejection {
    fn new(kind: RejectionKind, reason: impl Into<String>) -> Self {
        Rejection {
            kind,
            reason: reason.into(),
        }
    }
}

/// Names that must keep working for the machine, and for Cairn, to function
/// (FR-007).
///
/// The machine's own hostname is passed in rather than read here: this module
/// does no I/O. The composition root supplies it.
#[derive(Clone, PartialEq, Eq, Debug, Default)]
pub struct ReservedNames {
    /// This machine's own name, if the platform reports one.
    pub own_hostname: Option<String>,
}

impl ReservedNames {
    pub fn with_hostname(hostname: impl Into<String>) -> Self {
        ReservedNames {
            own_hostname: Some(hostname.into()),
        }
    }

    fn is_reserved(&self, candidate: &str) -> bool {
        /// Loopback and broadcast names an ordinary hosts file carries, plus the
        /// names Cairn's own counting listener depends on.
        const RESERVED: [&str; 7] = [
            "localhost",
            "localhost.localdomain",
            "broadcasthost",
            "ip6-localhost",
            "ip6-loopback",
            "ip6-allnodes",
            "ip6-allrouters",
        ];
        /// Suffixes that name the local machine or the local network rather than
        /// somewhere on the internet. Protecting one of these breaks name
        /// resolution people rely on and blocks nothing they chose.
        const RESERVED_SUFFIXES: [&str; 4] =
            [".localhost", ".local", ".localdomain", ".arpa"];

        if RESERVED.contains(&candidate) {
            return true;
        }
        if RESERVED_SUFFIXES
            .iter()
            .any(|suffix| candidate.ends_with(suffix))
        {
            return true;
        }
        match &self.own_hostname {
            Some(name) => candidate.eq_ignore_ascii_case(name),
            None => false,
        }
    }
}

/// Normalize one typed entry into everything it protects.
///
/// Returns the entry itself, plus its `www.` form when the entry is a root
/// (FR-005). Typing `www.example.com` yields the same pair as typing
/// `example.com`, so the two forms can never drift apart.
pub fn normalize(
    input: &str,
    reserved: &ReservedNames,
) -> Result<Vec<Domain>, Rejection> {
    let host = extract_host(input)?;
    let ascii = to_ascii(&host)?;

    // Before shape. `localhost` and a machine's own name are often single
    // labels, and being told they look like a single word would be true but
    // useless — the reason they cannot be protected is that the machine needs
    // them.
    if reserved.is_reserved(&ascii) {
        return Err(Rejection::new(
            RejectionKind::KeepsTheMachineWorking,
            format!(
                "Cairn keeps {ascii} working — the machine and Cairn itself use it \
                 to reach things on this computer. Try the address of a site instead."
            ),
        ));
    }

    validate(&ascii)?;
    Ok(with_www_form(ascii))
}

/// Strip everything that is not the host: scheme, credentials, port, path,
/// query, fragment, and a trailing dot (FR-004).
fn extract_host(input: &str) -> Result<String, Rejection> {
    let mut rest = input.trim();
    if rest.is_empty() {
        return Err(Rejection::new(
            RejectionKind::Empty,
            "Type an address to protect, like example.com.",
        ));
    }

    // Scheme.
    if let Some(at) = rest.find("://") {
        rest = &rest[at + 3..];
    }
    // Credentials — anything before an `@` belongs to the URL, not the host.
    if let Some(at) = rest.rfind('@') {
        rest = &rest[at + 1..];
    }
    // Path, query, fragment.
    rest = rest.split(['/', '?', '#']).next().unwrap_or_default();

    // An IPv6 literal arrives in brackets. Cairn protects names, not addresses.
    if rest.starts_with('[') {
        return Err(ip_rejection());
    }

    // Port.
    if let Some((host, port)) = rest.rsplit_once(':') {
        if port.is_empty() || port.chars().all(|c| c.is_ascii_digit()) {
            rest = host;
        } else {
            return Err(not_an_address(input));
        }
    }

    let host = rest.trim().trim_end_matches('.');
    if host.is_empty() {
        return Err(Rejection::new(
            RejectionKind::Empty,
            "Type an address to protect, like example.com.",
        ));
    }
    Ok(host.to_string())
}

/// Fold case and encode a non-ASCII name the way the resolver will see it.
/// `Café.example` and `xn--caf-dma.example` are the same entry.
fn to_ascii(host: &str) -> Result<String, Rejection> {
    if host.contains('*') {
        return Err(Rejection::new(
            RejectionKind::Wildcard,
            "Cairn protects one address at a time, so * will not work here. \
             Add the addresses you want protected individually.",
        ));
    }
    match idna::domain_to_ascii(host) {
        Ok(ascii) => Ok(ascii.to_ascii_lowercase()),
        Err(_) => Err(not_an_address(host)),
    }
}

/// Shape rules. Anything that is not a name the resolver could look up is
/// turned away here, with a sentence that says what to try instead.
fn validate(ascii: &str) -> Result<(), Rejection> {
    if ascii.len() > MAX_DOMAIN_LEN {
        return Err(Rejection::new(
            RejectionKind::TooLong,
            "That address is longer than a web address can be. \
             Check it for a typo and try again.",
        ));
    }

    let labels: Vec<&str> = ascii.split('.').collect();
    if labels.len() < 2 {
        return Err(Rejection::new(
            RejectionKind::SingleWord,
            format!("{ascii} looks like a single word rather than a web address. Try example.com."),
        ));
    }

    // An address, not a name. A hosts entry maps a name to an address, so an
    // address on the left has nothing to protect.
    if labels
        .iter()
        .all(|label| !label.is_empty() && label.chars().all(|c| c.is_ascii_digit()))
    {
        return Err(ip_rejection());
    }

    for label in &labels {
        if label.is_empty() || label.len() > MAX_LABEL_LEN {
            return Err(not_an_address(ascii));
        }
        if label.starts_with('-') || label.ends_with('-') {
            return Err(not_an_address(ascii));
        }
        if !label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            return Err(not_an_address(ascii));
        }
    }

    // The last label names the kind of site, and it is never numeric.
    let tld = labels[labels.len() - 1];
    if tld.chars().all(|c| c.is_ascii_digit()) {
        return Err(ip_rejection());
    }

    Ok(())
}

/// Pair a root with its `www.` form (FR-005).
///
/// A root here means a name with exactly two labels. Cairn ships no public
/// suffix list, so `example.co.uk` is treated as already having a subdomain and
/// is protected as typed — it is protected either way, and Cairn does not
/// invent an entry it cannot justify.
fn with_www_form(ascii: String) -> Vec<Domain> {
    let root = ascii.strip_prefix("www.").unwrap_or(&ascii).to_string();

    if root.split('.').count() != 2 {
        // Typed with a subdomain: protect exactly what was asked for.
        return vec![Domain::from_validated(ascii)];
    }

    let www = format!("www.{root}");
    vec![Domain::from_validated(root), Domain::from_validated(www)]
}

fn not_an_address(input: &str) -> Rejection {
    Rejection::new(
        RejectionKind::NotAnAddress,
        format!(
            "{} does not look like a web address. Try it in the form example.com.",
            input.trim()
        ),
    )
}

fn ip_rejection() -> Rejection {
    Rejection::new(
        RejectionKind::IpAddress,
        "That is a numeric address rather than a site name. \
         Cairn protects names like example.com.",
    )
}

/// Accept a name that arrived on the wire, in the form it arrived in.
///
/// Used by the counting listener (`super::sni`) and by read-back of Cairn's own
/// hosts section. There is no `www.` pairing and no rejection message here: the
/// caller is not a person typing, it is bytes that either name a domain Cairn
/// already protects or do not.
pub(super) fn accept_wire_name(candidate: &str) -> Option<Domain> {
    let trimmed = candidate.trim().trim_end_matches('.');
    if trimmed.is_empty() || trimmed.len() > MAX_DOMAIN_LEN {
        return None;
    }
    let ascii = trimmed.to_ascii_lowercase();
    validate(&ascii).ok()?;
    Some(Domain::from_validated(ascii))
}

/// Read back a name Cairn wrote into its own hosts section.
pub fn accept_known_name(candidate: &str) -> Option<Domain> {
    accept_wire_name(candidate)
}
