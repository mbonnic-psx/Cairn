//! Cairn edits only the bytes it owns.
//!
//! Constitution-critical (Principle IV, FR-040, FR-042). The file being edited
//! belongs to the machine and to whatever else writes to it. Cairn marks a
//! region, writes inside it, and leaves every other byte exactly as it found
//! them — including line endings it did not choose, a byte-order mark it did
//! not write, and a missing final newline.
//!
//! This module works on raw bytes and never on lines of text. A hosts file is
//! not guaranteed to be UTF-8, and decoding it would be a way to change it.

use super::entries::LineEnding;

/// The line that opens Cairn's region. Namespaced, and readable by whoever
/// opens the file wondering what wrote this.
pub const BEGIN_MARKER: &[u8] =
    b"# >>> Cairn: protected sites. Managed automatically. >>>";
/// The line that closes it.
pub const END_MARKER: &[u8] = b"# <<< Cairn: end of protected sites. <<<";

/// Why a file was left alone.
///
/// Every variant here means Cairn did not write. When the region cannot be
/// understood, the answer is to report it and touch nothing — never to guess,
/// and never to start a second region (FR-042).
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum SpliceError {
    /// An opening marker with no closing marker after it.
    Unclosed,
    /// A closing marker before any opening marker.
    Unopened,
    /// More than one opening marker. A previous write was interrupted, or
    /// something else copied the region.
    Duplicated,
}

impl std::fmt::Display for SpliceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SpliceError::Unclosed => {
                f.write_str("Cairn's section in the system file has no closing line")
            }
            SpliceError::Unopened => {
                f.write_str("Cairn's section in the system file has no opening line")
            }
            SpliceError::Duplicated => {
                f.write_str("the system file contains more than one Cairn section")
            }
        }
    }
}

impl std::error::Error for SpliceError {}

/// A located Cairn region, as a byte range over the original.
///
/// `start` reaches back over the newline in front of the opening marker when
/// there is one. Whether that newline was Cairn's or the file's own cannot be
/// told by looking — the change inventory records it, and [`remove`] is told
/// which it was.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Section {
    /// The newline in front of the marker, if any; otherwise the marker.
    pub start: usize,
    /// One past the end of the closing marker's line.
    pub end: usize,
    /// True when `start` reaches back over a newline.
    pub preceded_by_newline: bool,
}

/// The result of writing the region.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Spliced {
    pub bytes: Vec<u8>,
    /// True when Cairn added a newline to separate its region from a file that
    /// did not end with one. Recorded in the change inventory so teardown can
    /// remove exactly what was added (data-model.md, ChangeInventory).
    pub separator_added: bool,
}

/// Whichever line ending the file already uses. A Windows hosts file is CRLF
/// and stays CRLF, including the lines Cairn writes into it (research R6).
///
/// A file with no line ending at all is treated as LF: nothing is being
/// normalised, because there is nothing there to normalise.
///
/// Counted over the *surroundings* only. Counting Cairn's own lines would make
/// the answer depend on how many entries are protected — apply enough of them
/// and a CRLF file would start being written as LF, rewriting a region that had
/// not changed.
pub fn detect_line_ending_outside(original: &[u8]) -> LineEnding {
    // `false`: a newline in front of the region counts as the file's own for
    // this purpose. It is one byte either way, and the answer is a majority.
    match outside(original, false) {
        Ok(surroundings) => detect_line_ending(&surroundings),
        // A region we cannot read is a region we will not write; the caller is
        // about to get the same error from `apply`.
        Err(_) => detect_line_ending(original),
    }
}

/// Count line endings in a byte string exactly as given.
pub fn detect_line_ending(original: &[u8]) -> LineEnding {
    let mut crlf = 0usize;
    let mut lf = 0usize;
    for (index, byte) in original.iter().enumerate() {
        if *byte != b'\n' {
            continue;
        }
        if index > 0 && original[index - 1] == b'\r' {
            crlf += 1;
        } else {
            lf += 1;
        }
    }
    if crlf > lf {
        LineEnding::Crlf
    } else {
        LineEnding::Lf
    }
}

/// Locate Cairn's region, if it is there.
pub fn find_section(original: &[u8]) -> Result<Option<Section>, SpliceError> {
    let opens = find_all(original, BEGIN_MARKER);
    let closes = find_all(original, END_MARKER);

    if opens.len() > 1 {
        return Err(SpliceError::Duplicated);
    }
    let Some(&open) = opens.first() else {
        return if closes.is_empty() {
            Ok(None)
        } else {
            Err(SpliceError::Unopened)
        };
    };
    let Some(&close) = closes.iter().find(|at| **at > open) else {
        return Err(SpliceError::Unclosed);
    };

    // The region runs to the end of the closing marker's own line, so the
    // newline that terminates it belongs to Cairn and leaves with it.
    let mut end = close + END_MARKER.len();
    if original.get(end) == Some(&b'\r') {
        end += 1;
    }
    if original.get(end) == Some(&b'\n') {
        end += 1;
    }

    // If Cairn appended its region to a file that did not end in a newline, it
    // contributed the separator. Claiming it here is what makes removal exact.
    let mut start = open;
    let mut preceded_by_newline = false;
    if start > 0 && original[start - 1] == b'\n' {
        start -= 1;
        if start > 0 && original[start - 1] == b'\r' {
            start -= 1;
        }
        preceded_by_newline = true;
    }

    Ok(Some(Section {
        start,
        end,
        preceded_by_newline,
    }))
}

/// Write `body` into Cairn's region, creating the region if it is not there.
///
/// An existing region is spliced in place — never duplicated (FR-042). Bytes
/// outside the region are copied through untouched, which is the property the
/// `proptest` in `tests/splice_properties.rs` asserts.
pub fn apply(original: &[u8], body: &[u8]) -> Result<Spliced, SpliceError> {
    let ending = detect_line_ending_outside(original);
    let eol = ending.as_bytes();

    let mut region =
        Vec::with_capacity(body.len() + BEGIN_MARKER.len() + END_MARKER.len() + 8);
    region.extend_from_slice(BEGIN_MARKER);
    region.extend_from_slice(eol);
    region.extend_from_slice(body);
    region.extend_from_slice(END_MARKER);
    region.extend_from_slice(eol);

    match find_section(original)? {
        Some(section) => {
            // Splice in place. Whatever sits in front of the marker — including
            // a newline a previous apply contributed — is surroundings now and
            // is copied through untouched.
            let marker_start = find_marker_start(original, section.start);
            let mut bytes = Vec::with_capacity(original.len() + region.len());
            bytes.extend_from_slice(&original[..marker_start]);
            bytes.extend_from_slice(&region);
            bytes.extend_from_slice(&original[section.end..]);
            Ok(Spliced {
                bytes,
                // This call added nothing new; the original apply recorded
                // whether a separator was ever contributed.
                separator_added: false,
            })
        }
        None => {
            let mut bytes = Vec::with_capacity(original.len() + region.len() + 2);
            bytes.extend_from_slice(original);
            // A region must begin on its own line. If the file does not end
            // with one, Cairn adds it — and records that it did.
            let separator_added = !original.is_empty() && !original.ends_with(b"\n");
            if separator_added {
                bytes.extend_from_slice(eol);
            }
            bytes.extend_from_slice(&region);
            Ok(Spliced {
                bytes,
                separator_added,
            })
        }
    }
}

/// Remove Cairn's region entirely.
///
/// `separator_added` comes from the change inventory: it says whether the
/// newline in front of the region was Cairn's or the file's. Without it, the
/// two are indistinguishable, and removal would be one byte off on a file that
/// never ended in a newline.
pub fn remove(current: &[u8], separator_added: bool) -> Result<Vec<u8>, SpliceError> {
    let Some(section) = find_section(current)? else {
        // Removing twice is not an error (FR-042).
        return Ok(current.to_vec());
    };

    let start = region_start(current, section, separator_added);

    let mut bytes = Vec::with_capacity(current.len());
    bytes.extend_from_slice(&current[..start]);
    bytes.extend_from_slice(&current[section.end..]);
    Ok(bytes)
}

/// Everything that is not Cairn's, as one byte string.
///
/// `separator_added` has the same meaning as in [`remove`]: it says whether the
/// newline in front of the region belongs to Cairn. The property test compares
/// this before and after every operation, so getting it wrong here would hide
/// exactly the byte the constitution cares about.
pub fn outside(bytes: &[u8], separator_added: bool) -> Result<Vec<u8>, SpliceError> {
    match find_section(bytes)? {
        None => Ok(bytes.to_vec()),
        Some(section) => {
            let start = region_start(bytes, section, separator_added);
            let mut out = Vec::with_capacity(bytes.len());
            out.extend_from_slice(&bytes[..start]);
            out.extend_from_slice(&bytes[section.end..]);
            Ok(out)
        }
    }
}

/// Where Cairn's region really begins: at the marker, or one newline earlier
/// when that newline was Cairn's own.
fn region_start(bytes: &[u8], section: Section, separator_added: bool) -> usize {
    if separator_added && section.preceded_by_newline {
        section.start
    } else {
        find_marker_start(bytes, section.start)
    }
}

/// Step forward from a region start that may include a separator, to the
/// marker itself.
fn find_marker_start(bytes: &[u8], from: usize) -> usize {
    if bytes[from..].starts_with(BEGIN_MARKER) {
        return from;
    }
    let mut at = from;
    while at < bytes.len() && !bytes[at..].starts_with(BEGIN_MARKER) {
        at += 1;
    }
    at
}

fn find_all(haystack: &[u8], needle: &[u8]) -> Vec<usize> {
    let mut found = Vec::new();
    if needle.is_empty() || haystack.len() < needle.len() {
        return found;
    }
    let mut at = 0usize;
    while at + needle.len() <= haystack.len() {
        if &haystack[at..at + needle.len()] == needle {
            found.push(at);
            at += needle.len();
        } else {
            at += 1;
        }
    }
    found
}
