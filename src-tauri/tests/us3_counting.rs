//! User story 3: reaches are counted quietly, or honestly not at all.
//!
//! What is recorded is a domain and a time. What is shown at the moment of a
//! reach is nothing. What is served on the connection is nothing.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::io::{Read, Write};
use std::net::{Ipv4Addr, TcpListener, TcpStream};
use std::sync::Mutex;

use cairn::counting::listener::{handle_connection, NoteReach};

/// Somewhere to put what was noted, for the test to look at.
#[derive(Default)]
struct Noted(Mutex<Vec<(String, i64)>>);

impl NoteReach for Noted {
    fn note(&self, domain: &str, at: i64) {
        self.0.lock().unwrap().push((domain.to_string(), at));
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

/// One connection to a listener Cairn is holding, and what came back.
fn reach_with(bytes: &[u8]) -> (Noted, Vec<u8>) {
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
    let address = listener.local_addr().unwrap();
    let bytes = bytes.to_vec();

    let client = std::thread::spawn(move || {
        let mut stream = TcpStream::connect(address).unwrap();
        stream.write_all(&bytes).unwrap();
        stream.flush().unwrap();

        // Whatever Cairn sends back. The answer should be nothing at all.
        let mut answer = Vec::new();
        let _ = stream.read_to_end(&mut answer);
        answer
    });

    let (connection, _) = listener.accept().unwrap();
    let noted = Noted::default();
    handle_connection(connection, &noted, 1_700_000_123);

    let answer = client.join().unwrap();
    (noted, answer)
}

#[test]
fn a_reach_is_recorded_as_a_domain_and_a_time() {
    let (noted, _) = reach_with(&client_hello("example.com"));
    let recorded = noted.0.lock().unwrap().clone();

    assert_eq!(recorded, vec![("example.com".to_string(), 1_700_000_123)]);
}

#[test]
fn nothing_is_served_on_the_connection() {
    // The constitution's counting rule, literally: serve no content, drop the
    // connection after counting.
    let (_, answer) = reach_with(&client_hello("example.com"));

    assert!(
        answer.is_empty(),
        "Cairn answered with {} bytes",
        answer.len()
    );
}

#[test]
fn a_plain_request_records_the_host_and_nothing_from_the_path() {
    let request = b"GET /a/private/path?token=secret HTTP/1.1\r\n\
                    Host: news.example\r\n\
                    Cookie: session=do-not-read-this\r\n\r\n";
    let (noted, answer) = reach_with(request);
    let recorded = noted.0.lock().unwrap().clone();

    assert_eq!(recorded.len(), 1);
    assert_eq!(recorded[0].0, "news.example");
    assert!(answer.is_empty());

    let rendered = format!("{recorded:?}");
    for leaked in ["private", "path", "token", "secret", "Cookie", "session"] {
        assert!(!rendered.contains(leaked), "{leaked} reached the record");
    }
}

#[test]
fn a_connection_that_names_nowhere_records_nothing() {
    let (noted, answer) = reach_with(b"\x00\x01\x02\x03");

    assert!(noted.0.lock().unwrap().is_empty());
    assert!(answer.is_empty(), "and it is treated exactly the same way");
}

#[test]
fn a_connection_that_says_nothing_at_all_is_dropped() {
    // No hello, no bytes. The read times out and the connection closes; nothing
    // is recorded, and nothing hangs.
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
    let address = listener.local_addr().unwrap();

    let client = std::thread::spawn(move || {
        let stream = TcpStream::connect(address).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(400));
        drop(stream);
    });

    let (connection, _) = listener.accept().unwrap();
    let noted = Noted::default();
    let found = handle_connection(connection, &noted, 1_700_000_123);

    assert!(found.is_none());
    assert!(noted.0.lock().unwrap().is_empty());
    client.join().unwrap();
}
