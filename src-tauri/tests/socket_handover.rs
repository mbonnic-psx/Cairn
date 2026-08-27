//! The descriptors survive the crossing.
//!
//! `send_fds` and `receive_fds` were written together and called by nobody, so
//! nothing established that a socket sent by the privileged process is a working
//! listener on the other side. This sends a real listener across a real
//! connection and accepts on what comes out.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg(unix)]

use std::io::Write;
use std::net::{Ipv4Addr, TcpListener, TcpStream};
use std::os::fd::AsRawFd;
use std::os::unix::net::UnixStream;

use cairn::fds::{receive_fds, send_fds};

#[test]
fn a_listener_sent_across_the_channel_still_accepts() {
    let (near, far) = UnixStream::pair().unwrap();

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
    let address = listener.local_addr().unwrap();

    send_fds(&near, &[listener.as_raw_fd()]).unwrap();

    let received = receive_fds(&far, 1).unwrap();
    assert_eq!(
        received.len(),
        1,
        "one socket was sent, so one should arrive"
    );

    // The far side's copy is what the unelevated process would accept on. The
    // original is dropped first, so what follows can only work through the copy.
    let handed = TcpListener::from(received.into_iter().next().unwrap());
    drop(listener);

    let client = std::thread::spawn(move || {
        let mut stream = TcpStream::connect(address).unwrap();
        stream.write_all(b"hello").unwrap();
    });

    let (accepted, _) = handed.accept().unwrap();
    assert!(accepted.peer_addr().is_ok());
    client.join().unwrap();
}

#[test]
fn nothing_is_sent_when_there_is_nothing_to_send() {
    let (near, _far) = UnixStream::pair().unwrap();
    assert!(
        send_fds(&near, &[]).is_err(),
        "an empty handover is a mistake, not a quiet no-op"
    );
}

/// The hazard the layout actually carries.
///
/// The descriptors travel on the same connection as the answer, *after* it. On a
/// stream socket the ancillary data rides on one particular byte, and an
/// ordinary read that swallowed that byte would discard the sockets with it —
/// leaving a caller that was told `Bound` holding nothing, which is precisely
/// the "said it was counting, was not counting" failure this whole change exists
/// to remove. So the framed answer and the handover are exercised in the order
/// the channel really uses.
#[test]
fn descriptors_survive_being_sent_after_a_framed_answer() {
    use std::io::Read;

    let (near, mut far) = UnixStream::pair().unwrap();

    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
    let address = listener.local_addr().unwrap();

    // Exactly what the helper does: the answer, then the sockets.
    let answer = br#"{"CountingSockets":{"Bound":{"ports":[80,443]}}}"#;
    let mut framed = (answer.len() as u32).to_be_bytes().to_vec();
    framed.extend_from_slice(answer);
    {
        let mut sender = &near;
        sender.write_all(&framed).unwrap();
        sender.flush().unwrap();
    }
    send_fds(&near, &[listener.as_raw_fd()]).unwrap();

    // Exactly what the application does: read the frame exactly, then take the
    // descriptors off the connection.
    let mut length = [0u8; 4];
    far.read_exact(&mut length).unwrap();
    let mut body = vec![0u8; u32::from_be_bytes(length) as usize];
    far.read_exact(&mut body).unwrap();
    assert_eq!(body, answer);

    let received = receive_fds(&far, 1).unwrap();
    assert_eq!(
        received.len(),
        1,
        "reading the answer must not consume the sockets that follow it"
    );

    let handed = TcpListener::from(received.into_iter().next().unwrap());
    drop(listener);

    let client = std::thread::spawn(move || {
        TcpStream::connect(address).unwrap();
    });
    assert!(
        handed.accept().is_ok(),
        "what arrived must be a live listener"
    );
    client.join().unwrap();
}
