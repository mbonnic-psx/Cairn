//! `BindCountingSockets` and `ReleaseCountingSockets`.
//!
//! The helper binds the loopback ports because ports below 1024 need privilege,
//! and hands the listening descriptors to the unelevated process, which does
//! all the accepting and parsing (research R3). The hostile bytes never reach
//! the privileged process.
//!
//! A port that something else already holds is not a problem to solve: Cairn
//! drops to silent mode, blocking is entirely unaffected, and the person is
//! told in one sentence why counting is off (FR-027, FR-028).

use std::net::{Ipv4Addr, TcpListener};
use std::sync::{Mutex, OnceLock};

use cairn::protocol::{CountingSockets, Response};

/// Where a protected name is pointed in counted mode, and the two ports a
/// browser would use.
pub const COUNTING_PORTS: [u16; 2] = [80, 443];

/// The listeners, held for the life of the process.
///
/// Process-wide because the sockets are: they are bound once and handed over
/// once, and a second bind would be a second thing holding the port.
fn held() -> &'static Mutex<Vec<TcpListener>> {
    static HELD: OnceLock<Mutex<Vec<TcpListener>>> = OnceLock::new();
    HELD.get_or_init(|| Mutex::new(Vec::new()))
}

/// Bind the counting ports on loopback.
///
/// `ports` is a parameter so the same code can be exercised on ports a test is
/// allowed to bind. Production always passes [`COUNTING_PORTS`].
pub fn bind_counting_sockets(ports: &[u16]) -> Response {
    let mut listeners = match held().lock() {
        Ok(held) => held,
        Err(poisoned) => poisoned.into_inner(),
    };

    if !listeners.is_empty() {
        return Response::CountingSockets(CountingSockets::Bound {
            ports: listeners
                .iter()
                .filter_map(|listener| {
                    listener.local_addr().ok().map(|address| address.port())
                })
                .collect(),
        });
    }

    let mut bound = Vec::new();
    for port in ports {
        match TcpListener::bind((Ipv4Addr::LOCALHOST, *port)) {
            Ok(listener) => bound.push(listener),
            Err(_) => {
                // Nothing is half-held: give back what was taken so whatever
                // owns the port keeps working.
                drop(bound);
                return Response::CountingSockets(CountingSockets::Conflict {
                    reason: format!(
                        "Something else on this machine is already using port {port}, so \
                         Cairn is not counting the sites you reach for. That does not \
                         change what Cairn protects."
                    ),
                });
            }
        }
    }

    let ports = bound
        .iter()
        .filter_map(|listener| listener.local_addr().ok().map(|address| address.port()))
        .collect();
    *listeners = bound;

    Response::CountingSockets(CountingSockets::Bound { ports })
}

/// Give the ports back.
///
/// Part of teardown, and of dropping to silent mode: a port Cairn is not using
/// is a port Cairn does not hold.
pub fn release_counting_sockets() -> Response {
    let mut listeners = match held().lock() {
        Ok(held) => held,
        Err(poisoned) => poisoned.into_inner(),
    };
    let released = !listeners.is_empty();
    listeners.clear();

    Response::SocketsReleased { released }
}

/// The raw descriptors, for handing to the unelevated process.
#[cfg(unix)]
pub fn held_descriptors() -> Vec<std::os::fd::RawFd> {
    use std::os::fd::AsRawFd as _;

    match held().lock() {
        Ok(listeners) => listeners
            .iter()
            .map(|listener| listener.as_raw_fd())
            .collect(),
        Err(poisoned) => poisoned
            .into_inner()
            .iter()
            .map(|listener| listener.as_raw_fd())
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::*;

    #[test]
    fn a_taken_port_says_what_it_does_not_change_not_what_is_protected() {
        // Given something else already holds the port. The helper knows
        // nothing here about what is in force on the machine, so the sentence
        // may speak only for the port.
        let other = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = other.local_addr().unwrap().port();

        let response = bind_counting_sockets(&[port]);

        let Response::CountingSockets(CountingSockets::Conflict { reason }) = response
        else {
            panic!("a held port is a conflict: {response:?}");
        };
        let lowered = reason.to_lowercase();
        assert!(!lowered.contains("still protected"), "{reason}");
        assert!(!lowered.contains("is protected"), "{reason}");
        assert!(
            lowered.contains("does not change what cairn protects"),
            "{reason}"
        );
        // One sentence of why, one of what it means (FR-027).
        assert_eq!(reason.matches(". ").count(), 1, "{reason}");
        assert!(held().lock().unwrap().is_empty(), "nothing is half-held");
    }
}
