//! The channel: framing, the closed verb list, and who is allowed to speak.
//!
//! The peer check itself can only be exercised properly with two processes
//! running as different people, which is a per-platform acceptance step rather
//! than a unit test. What is testable here is everything around it: that a
//! request round-trips, that bytes which are not a verb are rejected rather
//! than ignored, and that an oversized frame is refused before it is read.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg(unix)]

use std::io::Write;
use std::os::unix::net::UnixStream;

use cairn::protocol::{Request, Response, TroubleKind};
use cairn_helper::channel::unix::{serve, socket_path, REQUEST_TIMEOUT};
use cairn_helper::channel::{read_frame, write_frame, MAX_FRAME_BYTES};
use cairn_helper::heartbeat::ClockKeeper;
use cairn_helper::machine::Machine;

/// Start a helper on a temporary machine and return the socket to talk to it.
fn helper() -> (tempfile::TempDir, std::path::PathBuf) {
    let directory = tempfile::tempdir().unwrap();
    let hosts = directory.path().join("hosts");
    std::fs::write(&hosts, b"127.0.0.1 localhost\n").unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();

    let socket = socket_path(&data);
    let machine = Machine::at(&hosts, &data);
    let clock = ClockKeeper::at(&data);
    let uid = unsafe { libc::getuid() };

    std::thread::spawn(move || {
        let _ = serve(&machine, &clock, uid);
    });

    // The listener is up once the socket exists.
    for _ in 0..200 {
        if socket.exists() {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    (directory, socket)
}

fn ask(socket: &std::path::Path, request: &Request) -> Response {
    let mut stream = UnixStream::connect(socket).unwrap();
    write_frame(&mut stream, &serde_json::to_vec(request).unwrap()).unwrap();
    let payload = read_frame(&mut stream).unwrap();
    serde_json::from_slice(&payload).unwrap()
}

#[test]
fn a_request_round_trips() {
    let (_directory, socket) = helper();

    let answer = ask(&socket, &Request::Ping);
    assert!(
        matches!(answer, Response::Pong { healthy: true, .. }),
        "{answer:?}"
    );
}

#[test]
fn bytes_that_are_not_a_verb_are_rejected_rather_than_ignored() {
    let (_directory, socket) = helper();

    let mut stream = UnixStream::connect(&socket).unwrap();
    write_frame(&mut stream, b"{\"verb\":\"unblock_everything\"}").unwrap();

    let payload = read_frame(&mut stream).unwrap();
    let answer: Response = serde_json::from_slice(&payload).unwrap();
    assert!(
        matches!(
            answer,
            Response::Trouble {
                kind: TroubleKind::UnknownVerb,
                ..
            }
        ),
        "{answer:?}"
    );
}

#[test]
fn the_socket_is_readable_by_its_owner_alone() {
    use std::os::unix::fs::PermissionsExt as _;

    let (_directory, socket) = helper();
    let mode = std::fs::metadata(&socket).unwrap().permissions().mode();

    assert_eq!(mode & 0o777, 0o600, "no one else may even open it");
}

#[test]
fn an_oversized_frame_is_refused_before_it_is_read() {
    // The helper parses bytes from a less-privileged process. The cap is the
    // whole of its input surface, alongside the closed verb enum.
    let mut sink: Vec<u8> = Vec::new();
    let too_big = vec![0u8; 8];
    let mut framed = ((MAX_FRAME_BYTES + 1) as u32).to_be_bytes().to_vec();
    framed.extend_from_slice(&too_big);

    let refused = read_frame(&mut framed.as_slice());
    assert!(refused.is_err(), "an oversized frame must not be read");

    sink.write_all(b"").unwrap();
}

#[test]
fn a_connection_that_says_nothing_cannot_wedge_the_helper() {
    // Found in review: any process running as the same person could connect,
    // send nothing, and the helper would answer nobody else — for as long as it
    // held the connection open.
    use std::sync::mpsc;
    use std::time::Duration;

    let (_directory, socket) = helper();

    let _stalled = UnixStream::connect(&socket).unwrap();
    std::thread::sleep(Duration::from_millis(100));

    let (sender, receiver) = mpsc::channel();
    let asking = socket.clone();
    std::thread::spawn(move || {
        let answer = ask(&asking, &Request::Ping);
        let _ = sender.send(answer);
    });

    let answer = receiver
        .recv_timeout(Duration::from_secs(5))
        .expect("the helper has to keep answering while a connection sits idle");
    assert!(matches!(answer, Response::Pong { .. }), "{answer:?}");
}

#[test]
fn a_connection_that_stops_talking_is_dropped_rather_than_waited_on() {
    use std::time::{Duration, Instant};

    let (_directory, socket) = helper();

    // Announce a frame and then never send it.
    let mut stream = UnixStream::connect(&socket).unwrap();
    stream.write_all(&64u32.to_be_bytes()).unwrap();
    stream.flush().unwrap();

    let started = Instant::now();
    let mut answer = Vec::new();
    use std::io::Read as _;
    let _ = stream.read_to_end(&mut answer);

    assert!(
        started.elapsed() < REQUEST_TIMEOUT + Duration::from_secs(3),
        "the helper waited {:?} on a connection that stopped talking",
        started.elapsed()
    );
    assert!(answer.is_empty(), "and it answered nothing");
}

#[test]
fn the_helper_answers_one_request_per_connection() {
    let (_directory, socket) = helper();

    // A second request on the same connection gets nothing: the helper answered
    // once and closed. Nothing is kept open waiting for a second thought.
    let mut stream = UnixStream::connect(&socket).unwrap();
    write_frame(&mut stream, &serde_json::to_vec(&Request::Ping).unwrap()).unwrap();
    let _ = read_frame(&mut stream).unwrap();

    let second = write_frame(&mut stream, &serde_json::to_vec(&Request::Ping).unwrap())
        .and_then(|()| read_frame(&mut stream));
    assert!(second.is_err(), "the connection is finished");
}
