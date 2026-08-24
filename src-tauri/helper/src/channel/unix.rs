//! The Unix end of the channel: Linux and macOS.
//!
//! The socket lives in a root-owned directory, and every connection's peer
//! credentials are read from the kernel rather than taken from the connection's
//! own claims. A process that is not the person who installed Cairn is refused
//! before a single byte of its request is parsed.

use std::io;
use std::os::unix::net::{UnixListener, UnixStream};
use std::path::{Path, PathBuf};

use cairn::protocol::{Request, Response, TroubleKind};

use super::{read_frame, write_frame};
use crate::dispatch;
use crate::heartbeat::ClockKeeper;
use crate::machine::Machine;

pub const SOCKET_NAME: &str = "helper.sock";

/// Where the socket lives. The directory is the helper's own, owned by root.
pub fn socket_path(data_directory: &Path) -> PathBuf {
    data_directory.join(SOCKET_NAME)
}

/// Listen, and answer one request per connection.
pub fn serve(machine: &Machine, clock: &ClockKeeper, allowed_uid: u32) -> io::Result<()> {
    let path = socket_path(machine.data_directory());
    if let Some(directory) = path.parent() {
        std::fs::create_dir_all(directory)?;
    }
    // A socket left behind by a previous run would refuse the bind.
    let _ = std::fs::remove_file(&path);

    let listener = UnixListener::bind(&path)?;
    restrict(&path)?;

    for connection in listener.incoming() {
        match connection {
            Ok(stream) => {
                // One request, one answer, one connection. Nothing is kept open
                // waiting for a second thought.
                let _ = answer(machine, clock, stream, allowed_uid);
            }
            Err(_) => continue,
        }
    }
    Ok(())
}

fn answer(
    machine: &Machine,
    clock: &ClockKeeper,
    mut stream: UnixStream,
    allowed_uid: u32,
) -> io::Result<()> {
    let peer = peer_uid(&stream)?;
    if peer != allowed_uid && peer != 0 {
        // Refused before the request is even read.
        return Ok(());
    }

    let payload = read_frame(&mut stream)?;
    let response = match serde_json::from_slice::<Request>(&payload) {
        Ok(request) => dispatch::handle(machine, clock, request),
        // Unknown verbs are rejected, never ignored.
        Err(_) => Response::Trouble {
            message: "Cairn did not recognise that request.".into(),
            kind: TroubleKind::UnknownVerb,
        },
    };

    let answer = serde_json::to_vec(&response)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    write_frame(&mut stream, &answer)
}

/// Only the owner may connect. Belt and braces alongside the peer check: the
/// filesystem refuses, and the kernel-reported uid refuses.
fn restrict(path: &Path) -> io::Result<()> {
    use std::os::unix::fs::PermissionsExt as _;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
}

/// The connecting process's real uid, from the kernel.
#[cfg(target_os = "linux")]
fn peer_uid(stream: &UnixStream) -> io::Result<u32> {
    use std::os::fd::AsRawFd as _;

    let mut credentials = libc::ucred {
        pid: 0,
        uid: u32::MAX,
        gid: u32::MAX,
    };
    let mut length = std::mem::size_of::<libc::ucred>() as libc::socklen_t;

    // SAFETY: the socket is open for the duration of the call, and the buffer
    // and its length are the pair the kernel expects for SO_PEERCRED.
    let outcome = unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            libc::SOL_SOCKET,
            libc::SO_PEERCRED,
            (&mut credentials as *mut libc::ucred).cast(),
            &mut length,
        )
    };

    if outcome != 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(credentials.uid)
}

#[cfg(target_os = "macos")]
fn peer_uid(stream: &UnixStream) -> io::Result<u32> {
    use std::os::fd::AsRawFd as _;

    let mut uid: libc::uid_t = u32::MAX;
    let mut gid: libc::gid_t = u32::MAX;

    // SAFETY: both out-parameters are valid for the duration of the call.
    let outcome = unsafe { libc::getpeereid(stream.as_raw_fd(), &mut uid, &mut gid) };

    if outcome != 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(uid)
}
