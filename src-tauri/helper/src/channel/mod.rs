//! The channel the unelevated application talks to the helper over.
//!
//! Every request is rejected unless the peer check passes
//! (contracts/helper-ipc.md):
//!
//! | Platform | Channel | Peer check |
//! | --- | --- | --- |
//! | Linux | Unix socket in a root-owned directory | `SO_PEERCRED` uid match |
//! | macOS | Unix socket in a root-owned directory | `LOCAL_PEERCRED` uid match |
//! | Windows | Named pipe, DACL to the installing user's SID | pipe ACL + client process id |
//!
//! Encoding is length-prefixed JSON with a hard frame cap. The helper parses
//! bytes from a less-privileged process, so the cap and the closed verb enum
//! are the whole of its input surface.

#[cfg(unix)]
pub mod unix;

// Descriptor passing lives in the shared crate: the helper sends and the
// application receives, and one copy keeps the two halves from drifting.
#[cfg(unix)]
pub use cairn::fds;

use std::io::{self, Read, Write};

/// The largest request the helper will read. A protected list of 10,000 entries
/// is the biggest legitimate payload (FR-008), and this leaves generous room
/// above it while keeping the surface bounded.
pub const MAX_FRAME_BYTES: usize = 4 * 1024 * 1024;

/// Read one length-prefixed frame.
pub fn read_frame(source: &mut impl Read) -> io::Result<Vec<u8>> {
    let mut length = [0u8; 4];
    source.read_exact(&mut length)?;
    let length = u32::from_be_bytes(length) as usize;

    if length > MAX_FRAME_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "that request is larger than the helper will read",
        ));
    }

    let mut payload = vec![0u8; length];
    source.read_exact(&mut payload)?;
    Ok(payload)
}

/// Write one length-prefixed frame.
pub fn write_frame(sink: &mut impl Write, payload: &[u8]) -> io::Result<()> {
    if payload.len() > MAX_FRAME_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "that answer is larger than the channel carries",
        ));
    }
    sink.write_all(&(payload.len() as u32).to_be_bytes())?;
    sink.write_all(payload)?;
    sink.flush()
}
