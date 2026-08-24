//! The destination name, and nothing beyond it.
//!
//! Constitution-critical (Principle II, FR-024, FR-025). This is the most
//! privacy-sensitive function in the product: it is the one place where Cairn
//! looks at bytes a person's own machine sent.
//!
//! It reads exactly the field that names where the client was going — the TLS
//! `server_name` extension, or the HTTP `Host` header — and returns it. No
//! path, no method, no other header, no body, and never a response. Input is
//! capped at [`MAX_INSPECT`] bytes and nothing beyond the name is copied
//! anywhere (research R2).
//!
//! The connection this parses is closed immediately afterwards. Cairn serves no
//! content on it, ever.

use super::entries::Domain;
use super::normalize::accept_wire_name;

/// The hard cap on what may be read from a connection. A ClientHello that names
/// its destination does so well inside this; anything larger is not something
/// Cairn needs to see.
pub const MAX_INSPECT: usize = 2048;

/// The longest name that may be returned. Longer is not a domain.
const MAX_NAME: usize = 253;

/// Read the destination name a client volunteered.
///
/// Returns `None` when the bytes do not name a destination — in which case
/// nothing is recorded, and the connection is closed exactly the same way.
pub fn parse_destination_name(bytes: &[u8]) -> Option<Domain> {
    let capped = &bytes[..bytes.len().min(MAX_INSPECT)];
    match capped.first()? {
        // TLS handshake record.
        0x16 => parse_tls_server_name(capped),
        // Anything else that might be a plain HTTP request line.
        _ => parse_http_host(capped),
    }
}

/// Walk a ClientHello to its `server_name` extension.
///
/// Every step is bounds-checked against the capped slice; a truncated or
/// malformed hello yields `None` rather than a guess.
fn parse_tls_server_name(bytes: &[u8]) -> Option<Domain> {
    let mut at = 0usize;

    // TLS record header: type(1) version(2) length(2).
    let record_len = usize::from(u16::from_be_bytes([*bytes.get(3)?, *bytes.get(4)?]));
    at += 5;
    let end = (at + record_len).min(bytes.len());
    let body = bytes.get(at..end)?;

    // Handshake header: type(1) must be ClientHello, length(3).
    if *body.first()? != 0x01 {
        return None;
    }
    let mut at = 4usize;

    // client_version(2) random(32).
    at += 34;

    // session_id.
    let session_len = usize::from(*body.get(at)?);
    at += 1 + session_len;

    // cipher_suites.
    let suites_len =
        usize::from(u16::from_be_bytes([*body.get(at)?, *body.get(at + 1)?]));
    at += 2 + suites_len;

    // compression_methods.
    let compression_len = usize::from(*body.get(at)?);
    at += 1 + compression_len;

    // extensions.
    let extensions_len =
        usize::from(u16::from_be_bytes([*body.get(at)?, *body.get(at + 1)?]));
    at += 2;
    let extensions_end = (at + extensions_len).min(body.len());

    while at + 4 <= extensions_end {
        let kind = u16::from_be_bytes([*body.get(at)?, *body.get(at + 1)?]);
        let len =
            usize::from(u16::from_be_bytes([*body.get(at + 2)?, *body.get(at + 3)?]));
        at += 4;
        if kind == 0x0000 {
            return parse_server_name_extension(
                body.get(at..(at + len).min(body.len()))?,
            );
        }
        at += len;
    }
    None
}

/// `server_name` extension body: list_length(2), then entries of
/// name_type(1) name_length(2) name.
fn parse_server_name_extension(bytes: &[u8]) -> Option<Domain> {
    let mut at = 2usize; // skip the list length
    while at + 3 <= bytes.len() {
        let name_type = *bytes.get(at)?;
        let len = usize::from(u16::from_be_bytes([
            *bytes.get(at + 1)?,
            *bytes.get(at + 2)?,
        ]));
        at += 3;
        if name_type == 0 {
            if len > MAX_NAME {
                return None;
            }
            let raw = bytes.get(at..at + len)?;
            // The name is ASCII on the wire; anything else is not one.
            let text = std::str::from_utf8(raw).ok()?;
            return accept_wire_name(text);
        }
        at += len;
    }
    None
}

/// Read the `Host` header of a plain HTTP request, and nothing else on the
/// request line or in any other header.
fn parse_http_host(bytes: &[u8]) -> Option<Domain> {
    for line in bytes.split(|byte| *byte == b'\n') {
        let line = line.strip_suffix(b"\r").unwrap_or(line);
        if line.is_empty() {
            // End of headers. The body is never read.
            return None;
        }
        // The request line carries no colon-separated name, and neither does a
        // malformed header. Neither is the one being looked for, and neither is
        // a reason to stop looking.
        let Some((name, value)) = split_header(line) else {
            continue;
        };
        if !name.eq_ignore_ascii_case("host") {
            continue;
        }
        // A `Host` may carry a port. Everything after the name is dropped here
        // and never copied further.
        let host = value.trim();
        let host = match host.rsplit_once(':') {
            Some((before, port)) if port.chars().all(|c| c.is_ascii_digit()) => before,
            _ => host,
        };
        if host.len() > MAX_NAME {
            return None;
        }
        return accept_wire_name(host);
    }
    None
}

fn split_header(line: &[u8]) -> Option<(&str, &str)> {
    let colon = line.iter().position(|byte| *byte == b':')?;
    let name = std::str::from_utf8(line.get(..colon)?).ok()?;
    let value = std::str::from_utf8(line.get(colon + 1..)?).ok()?;
    Some((name, value))
}
