//! Accept, note where the client was going, and close.
//!
//! The bytes read here come from whatever is running on this machine, so the
//! read is bounded twice: by a byte cap and by a short timeout. Nothing is ever
//! written back (research R2, FR-024, FR-025).

use std::io::Read;
use std::net::{TcpListener, TcpStream};
use std::time::Duration;

use crate::domain::sni::{parse_destination_name, MAX_INSPECT};

/// How long a connection has to say where it was going before Cairn stops
/// listening to it. Short: a client that has connected sends its hello at once.
pub const READ_TIMEOUT: Duration = Duration::from_millis(250);

/// Where a noted reach goes.
///
/// A trait so the listener can be tested without a database, and so the
/// listener has exactly one thing it can do with what it read.
pub trait NoteReach: Send + Sync {
    fn note(&self, domain: &str, at: i64);
}

/// Read one connection, note it if it named somewhere, and drop it.
///
/// Returns what was noted, for tests. Nothing else ever sees this value — in
/// particular, nothing carries it toward the interface.
pub fn handle_connection(
    mut stream: TcpStream,
    sink: &dyn NoteReach,
    now: i64,
) -> Option<String> {
    let _ = stream.set_read_timeout(Some(READ_TIMEOUT));

    // A fixed buffer: the cap is the buffer, so there is no path where more
    // than this is read into memory.
    let mut buffer = [0u8; MAX_INSPECT];
    let read = stream.read(&mut buffer).ok()?;

    let domain = parse_destination_name(&buffer[..read])?;
    sink.note(domain.as_str(), now);

    // No response, ever. The connection closes when `stream` drops.
    Some(domain.as_str().to_string())
}

/// Accept forever on one listener.
///
/// Each connection is handled and dropped. A connection that says nothing
/// useful costs nothing and is treated identically — there is no error path
/// that behaves differently, because a difference in behaviour is a signal.
pub fn serve(listener: &TcpListener, sink: &dyn NoteReach, now: fn() -> i64) {
    for connection in listener.incoming() {
        let Ok(stream) = connection else { continue };
        let _ = handle_connection(stream, sink, now());
    }
}
