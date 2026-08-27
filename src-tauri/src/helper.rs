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

// The client is the Unix end of the channel; Windows talks to the helper over a
// named pipe, which is still to come.
#[cfg(unix)]
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

/// Listening sockets the helper bound and handed over, or why there are none.
///
/// Counting needs the ports *and* something accepting on them. Anything other
/// than [`Handover::Took`] means Cairn is not counting, and carries the sentence
/// that says so.
pub enum Handover {
    /// The ports are Cairn's. These are the listeners to accept on.
    Took(Vec<std::net::TcpListener>),
    /// Something else on this machine holds a port. Blocking is unaffected.
    Conflict { reason: String },
    /// This build cannot take a handover at all. Blocking is unaffected.
    Unsupported { reason: String },
}

impl Handover {
    /// The sentence to show, or none because counting is running.
    pub fn because(&self) -> Option<&str> {
        match self {
            Handover::Took(_) => None,
            Handover::Conflict { reason } | Handover::Unsupported { reason } => {
                Some(reason)
            }
        }
    }
}

/// Somewhere to send a verb.
pub trait HelperChannel: Send + Sync {
    fn ask(&self, request: Request) -> Result<Response, Trouble>;

    /// Ask for the counting ports and take the listening sockets that come back
    /// with them.
    ///
    /// Separate from [`HelperChannel::ask`] because this is the one exchange
    /// that carries descriptors alongside its answer, and because a channel that
    /// cannot carry them must say so rather than report a bind as if counting
    /// had started (Principle III).
    ///
    /// The default is to take nothing. That is the honest answer for a channel
    /// with no descriptor passing — an in-process double, or a platform whose
    /// channel is not built yet — and it means a new channel counts nothing
    /// until it deliberately implements this, rather than counting nothing while
    /// claiming otherwise.
    fn take_counting_sockets(&self) -> Result<Handover, Trouble> {
        Ok(Handover::Unsupported {
            reason: NOT_COUNTING_HERE.into(),
        })
    }
}

/// Said when this build cannot take the handover. It names what is still true,
/// because that is the part that matters to the person reading it.
pub const NOT_COUNTING_HERE: &str = "Cairn is not counting the sites you reach for on this machine yet. Everything you have protected is still protected.";

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

    /// One request, one answer, and the connection kept open.
    ///
    /// The stream comes back because one exchange — the counting handover — has
    /// descriptors following the answer on the same connection. Every other
    /// caller drops it.
    fn exchange(
        &self,
        request: Request,
    ) -> Result<(std::os::unix::net::UnixStream, Response), Trouble> {
        use std::io::{Read, Write};
        use std::os::unix::net::UnixStream;

        let mut stream =
            UnixStream::connect(&self.socket).map_err(|_| not_reachable())?;

        // The interface never hangs on a component that has stopped answering.
        let _ = stream.set_read_timeout(Some(ANSWER_TIMEOUT));
        let _ = stream.set_write_timeout(Some(ANSWER_TIMEOUT));

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

        let response = serde_json::from_slice(&answer).map_err(|error| {
            Trouble::new(format!(
                "Cairn could not read the answer from its background component ({error})."
            ))
        })?;
        Ok((stream, response))
    }
}

#[cfg(unix)]
impl HelperChannel for InstalledHelper {
    fn ask(&self, request: Request) -> Result<Response, Trouble> {
        self.exchange(request).map(|(_, response)| response)
    }

    /// Take the listening sockets the helper bound.
    ///
    /// The descriptors arrive after the answer that announced them, on the same
    /// connection (contracts/helper-ipc.md). Anything short of receiving them is
    /// reported as not counting, never as counting — the ports being bound is
    /// not the same fact as Cairn accepting on them, and only the second one
    /// means a reach will be recorded.
    fn take_counting_sockets(&self) -> Result<Handover, Trouble> {
        use crate::protocol::CountingSockets;

        let (stream, response) = self.exchange(Request::BindCountingSockets)?;

        let ports = match response {
            Response::CountingSockets(CountingSockets::Bound { ports }) => ports,
            Response::CountingSockets(CountingSockets::Conflict { reason }) => {
                return Ok(Handover::Conflict { reason })
            }
            Response::Trouble { message, .. } => {
                return Ok(Handover::Conflict { reason: message })
            }
            _ => {
                return Ok(Handover::Conflict {
                    reason: NOT_COUNTING_HERE.into(),
                })
            }
        };

        if ports.is_empty() {
            return Ok(Handover::Conflict {
                reason: NOT_COUNTING_HERE.into(),
            });
        }

        let received = match crate::fds::receive_fds(&stream, ports.len()) {
            Ok(received) if !received.is_empty() => received,
            // The helper said it bound them and then did not hand them over.
            // Cairn is not counting, and says so rather than assuming.
            _ => {
                return Ok(Handover::Conflict {
                    reason: NOT_COUNTING_HERE.into(),
                })
            }
        };

        Ok(Handover::Took(
            received
                .into_iter()
                .map(std::net::TcpListener::from)
                .collect(),
        ))
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
