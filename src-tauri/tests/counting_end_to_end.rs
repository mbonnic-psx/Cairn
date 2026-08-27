//! A reach on an address Cairn holds becomes a row in the history.
//!
//! This is the test slice 002 did not have, and its absence is why the counting
//! path shipped unwired: the listener was tested, the parser was tested, the
//! store was tested, the helper's bind was tested — and nothing tested that any
//! of them were connected to each other. Every piece passed while the record
//! stayed empty.
//!
//! So this deliberately starts at a TCP connection and finishes at a row read
//! back out of the encrypted database, touching every seam in between.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg(all(unix, feature = "history"))]

use std::io::Write;
use std::net::{Ipv4Addr, TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use cairn::counting::session;
use cairn::counting::sink::RecordReach;
use cairn::helper::{Handover, HelperChannel};
use cairn::protocol::{Request, Response};
use cairn::services::{Key, Trouble};
use cairn::store::history::History;
use cairn::store::key::HistoryKey;

const WHEN: i64 = 1_700_000_123;

fn when() -> i64 {
    WHEN
}

/// A helper that has already bound a port and will hand it over.
///
/// The real one binds 80 and 443, which a test is not allowed to take. What is
/// being proved here is everything downstream of the handover; the handover's
/// own transport is proved in `socket_handover.rs`.
struct HandsOver {
    listener: Mutex<Option<TcpListener>>,
}

impl HelperChannel for HandsOver {
    fn ask(&self, _request: Request) -> Result<Response, Trouble> {
        Err(Trouble::new("this test helper answers no verbs"))
    }

    fn take_counting_sockets(&self) -> Result<Handover, Trouble> {
        let taken = self.listener.lock().unwrap().take();
        Ok(match taken {
            Some(listener) => Handover::Took(vec![listener]),
            None => Handover::Conflict {
                reason: "already handed over".into(),
            },
        })
    }
}

/// A ClientHello naming where it was going.
fn client_hello(server_name: &str) -> Vec<u8> {
    let mut list = vec![0x00];
    list.extend_from_slice(&(server_name.len() as u16).to_be_bytes());
    list.extend_from_slice(server_name.as_bytes());

    let mut extension = (list.len() as u16).to_be_bytes().to_vec();
    extension.extend_from_slice(&list);

    let mut extensions = 0x0000u16.to_be_bytes().to_vec();
    extensions.extend_from_slice(&(extension.len() as u16).to_be_bytes());
    extensions.extend_from_slice(&extension);

    let mut hello = 0x0303u16.to_be_bytes().to_vec();
    hello.extend(std::iter::repeat_n(0x41u8, 32));
    hello.push(0);
    hello.extend_from_slice(&2u16.to_be_bytes());
    hello.extend_from_slice(&0x1301u16.to_be_bytes());
    hello.push(1);
    hello.push(0);
    hello.extend_from_slice(&(extensions.len() as u16).to_be_bytes());
    hello.extend_from_slice(&extensions);

    let mut handshake = vec![0x01];
    handshake.extend_from_slice(&(hello.len() as u32).to_be_bytes()[1..]);
    handshake.extend_from_slice(&hello);

    let mut record = vec![0x16];
    record.extend_from_slice(&0x0301u16.to_be_bytes());
    record.extend_from_slice(&(handshake.len() as u16).to_be_bytes());
    record.extend_from_slice(&handshake);
    record
}

/// One `#[test]`, deliberately: the counting session is process-wide, because
/// the sockets are. Two tests starting sessions in one binary would be two
/// things holding the same port.
#[test]
fn a_reach_is_accepted_recorded_and_readable_and_the_port_comes_back() {
    let directory = tempfile::tempdir().unwrap();
    let key = HistoryKey::Available(Key::from_bytes([7u8; 32]));

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
    let address = listener.local_addr().unwrap();
    let helper = HandsOver {
        listener: Mutex::new(Some(listener)),
    };

    let history = History::open(directory.path(), &key);
    assert!(history.is_open(), "the test needs a readable history");

    let counting = session::start(&helper, Arc::new(RecordReach::over(history)), when);
    assert_eq!(
        counting,
        cairn::counting::availability::Counting::Available,
        "the handover succeeded, so Cairn is counting"
    );
    assert!(session::is_running());

    // Somebody reaches for something protected.
    let mut stream = TcpStream::connect(address).unwrap();
    stream.write_all(&client_hello("example.com")).unwrap();
    stream.flush().unwrap();
    drop(stream);

    // The accept happens on another thread; give it a moment to land.
    let mut recorded = Vec::new();
    for _ in 0..200 {
        std::thread::sleep(Duration::from_millis(10));
        let reading = History::open(directory.path(), &key);
        if let History::Open(open) = reading {
            recorded = open.between(WHEN - 60, WHEN + 60).unwrap_or_default();
            if !recorded.is_empty() {
                break;
            }
        }
    }

    assert_eq!(
        recorded.len(),
        1,
        "the reach must be in the history, not merely have been parsed"
    );
    assert_eq!(recorded[0].domain, "example.com");
    assert_eq!(recorded[0].at, WHEN);

    // Turning counting off gives the port back. Cairn does not hold a port it
    // has stopped using.
    session::stop();
    assert!(!session::is_running());

    let rebound = TcpListener::bind(address);
    assert!(
        rebound.is_ok(),
        "stopping must release the port, or silent mode is a claim rather than a fact"
    );
}
