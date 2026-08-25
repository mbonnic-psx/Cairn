//! Talking to the privileged helper.
//!
//! The unelevated side of the channel. Everything Cairn does to this machine
//! goes through here, which means this module is the whole of the app's
//! privileged reach — and it is a closed verb list
//! (contracts/helper-ipc.md).
//!
//! The trait exists so the enforcement layer can be tested against a helper
//! that lives in the same process. A test that has to install a system service
//! to run is a test nobody runs.

use std::path::PathBuf;
use std::time::Duration;

use crate::protocol::{Request, Response};
use crate::services::Trouble;

/// How long the application waits for the helper before saying it cannot reach
/// it.
///
/// The interface must never hang on a component that has stopped answering: a
/// window that has frozen tells someone nothing, and Cairn has something true
/// to say instead.
pub const ANSWER_TIMEOUT: Duration = Duration::from_secs(10);

/// Somewhere to send a verb.
pub trait HelperChannel: Send + Sync {
    fn ask(&self, request: Request) -> Result<Response, Trouble>;
}

/// The socket the helper listens on, inside its own root-owned directory.
#[cfg(unix)]
pub const SOCKET: &str = "/var/lib/cairn/helper.sock";

/// The real helper.
#[cfg(unix)]
pub struct InstalledHelper {
    socket: PathBuf,
}

#[cfg(unix)]
impl Default for InstalledHelper {
    fn default() -> Self {
        InstalledHelper {
            socket: PathBuf::from(SOCKET),
        }
    }
}

#[cfg(unix)]
impl InstalledHelper {
    pub fn at(socket: impl Into<PathBuf>) -> Self {
        InstalledHelper {
            socket: socket.into(),
        }
    }
}

#[cfg(unix)]
impl HelperChannel for InstalledHelper {
    fn ask(&self, request: Request) -> Result<Response, Trouble> {
        use std::io::{Read, Write};
        use std::os::unix::net::UnixStream;

        let mut stream =
            UnixStream::connect(&self.socket).map_err(|_| not_reachable())?;

        let payload = serde_json::to_vec(&request).map_err(|error| {
            Trouble::new(format!("Cairn could not form that request ({error})."))
        })?;
        stream
            .write_all(&(payload.len() as u32).to_be_bytes())
            .and_then(|()| stream.write_all(&payload))
            .and_then(|()| stream.flush())
            .map_err(|_| not_reachable())?;

        let mut length = [0u8; 4];
        stream
            .read_exact(&mut length)
            .map_err(|_| not_reachable())?;
        let mut answer = vec![0u8; u32::from_be_bytes(length) as usize];
        stream
            .read_exact(&mut answer)
            .map_err(|_| not_reachable())?;

        serde_json::from_slice(&answer).map_err(|error| {
            Trouble::new(format!(
                "Cairn could not read the answer from its background component ({error})."
            ))
        })
    }
}

/// What Cairn says when the helper is not there.
///
/// Not an internal error: a sentence that can be shown as written, that does
/// not blame the person, and that says what is true — nothing changed.
pub fn not_reachable() -> Trouble {
    Trouble::new(
        "Cairn cannot reach the background component that keeps protection in force. \
         Nothing on this machine has been changed.",
    )
}

/// Stands in when no helper is installed.
pub struct NoHelper;

impl HelperChannel for NoHelper {
    fn ask(&self, _request: Request) -> Result<Response, Trouble> {
        Err(not_reachable())
    }
}
