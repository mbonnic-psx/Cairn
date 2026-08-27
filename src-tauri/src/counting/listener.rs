//! Accept, note where the client was going, and close.
//!
//! The bytes read here come from whatever is running on this machine, so the
//! read is bounded twice: by a byte cap and by a short timeout. Nothing is ever
//! written back (research R2, FR-024, FR-025).

use std::io::Read;
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
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

/// How often an accept that is waiting looks up to see whether counting has
/// been stopped.
///
/// Short, because the person turning counting off is entitled to have the port
/// given back promptly; a poll rather than a blocking accept, because the
/// alternative is waking a blocked accept with a connection to itself, and a
/// trick in the counting path is a thing to explain forever.
pub const STOP_CHECK: Duration = Duration::from_millis(100);

/// Accept until told to stop.
///
/// Each connection is handled and dropped. A connection that says nothing
/// useful costs nothing and is treated identically — there is no error path
/// that behaves differently, because a difference in behaviour is a signal.
///
/// The listener is taken by value: when this returns, it drops, and the port
/// goes back. That is what makes turning counting off actually release the port
/// rather than leaving Cairn holding one it has stopped using.
pub fn serve_until(
    listener: TcpListener,
    sink: &dyn NoteReach,
    now: fn() -> i64,
    stop: &AtomicBool,
) {
    if listener.set_nonblocking(true).is_err() {
        return;
    }

    while !stop.load(Ordering::Relaxed) {
        match listener.accept() {
            Ok((stream, _)) => {
                // Back to blocking for the read, which is bounded by
                // READ_TIMEOUT rather than by polling.
                if stream.set_nonblocking(false).is_err() {
                    continue;
                }
                let _ = handle_connection(stream, sink, now());
            }
            // Nothing waiting, or something went wrong with one connection.
            // Neither is worth treating differently, and neither is worth
            // spinning over.
            Err(_) => std::thread::sleep(STOP_CHECK),
        }
    }
}
