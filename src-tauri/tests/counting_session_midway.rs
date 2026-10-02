//! Time nothing was stored is never read as time Cairn saw, mid-session (R1;
//! Principle III, FR-022). Once a reach cannot be stored, the mark stops moving
//! and stays stopped: a later reach that does land does not make the time in
//! between look watched.
//!
//! One `#[test]`: the counting session is process-wide.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg(all(unix, feature = "history"))]

use std::io::Write;
use std::net::{Ipv4Addr, TcpListener, TcpStream};
use std::os::unix::fs::PermissionsExt;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use cairn::counting::presence::{mark_if_storing, Mark};
use cairn::counting::session;
use cairn::counting::sink::RecordReach;
use cairn::helper::{Handover, HelperChannel};
use cairn::protocol::{Request, Response};
use cairn::services::{Key, Trouble};
use cairn::store::history::History;
use cairn::store::key::HistoryKey;

const SEEN: i64 = 1_700_000_000;
const LATER: i64 = SEEN + 600;

struct HandsOver(Mutex<Option<TcpListener>>);

impl HelperChannel for HandsOver {
    fn ask(&self, _request: Request) -> Result<Response, Trouble> {
        Err(Trouble::new("this test helper answers no verbs"))
    }
    fn take_counting_sockets(&self) -> Result<Handover, Trouble> {
        let taken = self.0.lock().unwrap().take();
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

fn reach(address: std::net::SocketAddr) {
    let mut stream = TcpStream::connect(address).unwrap();
    stream.write_all(&client_hello("example.com")).unwrap();
    stream.flush().unwrap();
}

fn wait_until(mut done: impl FnMut() -> bool) -> bool {
    for _ in 0..200 {
        if done() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(10));
    }
    done()
}

#[test]
fn once_a_reach_cannot_be_stored_the_mark_stops_for_good() {
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    let key = HistoryKey::Available(Key::from_bytes([7u8; 32]));
    let history = History::open(&data, &key);
    assert!(history.is_open());

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
    let address = listener.local_addr().unwrap();
    let helper = HandsOver(Mutex::new(Some(listener)));

    let sink = Arc::new(RecordReach::over(history));
    let storing = sink.storing();
    session::start(&helper, sink, || LATER);

    let mark = Mark::at(&data);
    mark.write(SEEN);

    // While reaches are being stored the mark moves.
    reach(address);
    assert!(wait_until(|| {
        History::open(&data, &key)
            .is_open()
            .then(|| {
                let History::Open(open) = History::open(&data, &key) else {
                    return false;
                };
                !open.between(0, i64::MAX).unwrap().is_empty()
            })
            .unwrap_or(false)
    }));
    assert!(storing.load(Ordering::SeqCst));
    mark_if_storing(&mark, SEEN + 60, &storing);
    assert_eq!(mark.read(), Some(SEEN + 60));

    // The place the history lives stops taking writes, and a reach arrives.
    std::fs::set_permissions(&data, std::fs::Permissions::from_mode(0o500)).unwrap();
    reach(address);
    let stopped = wait_until(|| !storing.load(Ordering::SeqCst));
    std::fs::set_permissions(&data, std::fs::Permissions::from_mode(0o700)).unwrap();
    assert!(stopped, "a reach that could not be stored says so");

    // The mark stays where it was...
    mark_if_storing(&mark, LATER, &storing);
    assert_eq!(mark.read(), Some(SEEN + 60));

    // ...and a reach that does land afterwards does not start it again.
    reach(address);
    std::thread::sleep(Duration::from_millis(300));
    mark_if_storing(&mark, LATER + 60, &storing);
    assert_eq!(mark.read(), Some(SEEN + 60));

    session::stop();
}
