//! Handing a listening socket to the unelevated process.
//!
//! Ports below 1024 need privilege to bind, and the parser that reads whatever
//! a client sends is the riskiest code in the slice. So the helper binds and
//! hands the descriptors over, and the parsing happens outside the privileged
//! process entirely (research R3).
//!
//! This is the only unsafe code in Cairn that touches a buffer. It is kept to
//! two functions, both bounded, both here.

use std::io;
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd, RawFd};
use std::os::unix::net::UnixStream;

/// The most descriptors that will ever be sent at once: the two loopback ports
/// Cairn listens on.
pub const MAX_FDS: usize = 4;

/// Send descriptors alongside one byte of ordinary data.
///
/// A control message needs at least one byte of payload to travel with, which
/// is what the single `0` is for — it carries no meaning.
#[allow(unsafe_code)]
pub fn send_fds(stream: &UnixStream, fds: &[RawFd]) -> io::Result<()> {
    if fds.is_empty() || fds.len() > MAX_FDS {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "that is not a number of sockets Cairn sends",
        ));
    }

    let mut payload = [0u8; 1];
    let mut iov = libc::iovec {
        iov_base: payload.as_mut_ptr().cast(),
        iov_len: payload.len(),
    };

    let space = unsafe { libc::CMSG_SPACE(std::mem::size_of_val(fds) as u32) };
    let mut control = vec![0u8; space as usize];

    let mut message: libc::msghdr = unsafe { std::mem::zeroed() };
    message.msg_iov = &mut iov;
    message.msg_iovlen = 1;
    message.msg_control = control.as_mut_ptr().cast();
    message.msg_controllen = control.len() as _;

    // SAFETY: `control` is sized by CMSG_SPACE for exactly `fds.len()`
    // descriptors, and the header is filled in before the descriptors are
    // copied into the space CMSG_DATA points at.
    unsafe {
        let header = libc::CMSG_FIRSTHDR(&message);
        (*header).cmsg_level = libc::SOL_SOCKET;
        (*header).cmsg_type = libc::SCM_RIGHTS;
        (*header).cmsg_len = libc::CMSG_LEN(std::mem::size_of_val(fds) as u32) as _;

        std::ptr::copy_nonoverlapping(
            fds.as_ptr(),
            libc::CMSG_DATA(header).cast::<RawFd>(),
            fds.len(),
        );

        if libc::sendmsg(stream.as_raw_fd(), &message, 0) < 0 {
            return Err(io::Error::last_os_error());
        }
    }
    Ok(())
}

/// Receive descriptors sent by [`send_fds`].
///
/// Returns owned descriptors, so they close when they are dropped rather than
/// leaking if the caller gives up.
#[allow(unsafe_code)]
pub fn receive_fds(stream: &UnixStream, expected: usize) -> io::Result<Vec<OwnedFd>> {
    if expected == 0 || expected > MAX_FDS {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "that is not a number of sockets Cairn expects",
        ));
    }

    let mut payload = [0u8; 1];
    let mut iov = libc::iovec {
        iov_base: payload.as_mut_ptr().cast(),
        iov_len: payload.len(),
    };

    let space =
        unsafe { libc::CMSG_SPACE((std::mem::size_of::<RawFd>() * expected) as u32) };
    let mut control = vec![0u8; space as usize];

    let mut message: libc::msghdr = unsafe { std::mem::zeroed() };
    message.msg_iov = &mut iov;
    message.msg_iovlen = 1;
    message.msg_control = control.as_mut_ptr().cast();
    message.msg_controllen = control.len() as _;

    // SAFETY: the control buffer is sized for `expected` descriptors, and only
    // the descriptors the kernel actually reports are read back out of it.
    let received = unsafe {
        let read = libc::recvmsg(stream.as_raw_fd(), &mut message, 0);
        if read < 0 {
            return Err(io::Error::last_os_error());
        }

        let header = libc::CMSG_FIRSTHDR(&message);
        if header.is_null() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "no sockets came with that",
            ));
        }
        if (*header).cmsg_level != libc::SOL_SOCKET
            || (*header).cmsg_type != libc::SCM_RIGHTS
        {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "that control message is not a set of sockets",
            ));
        }

        let bytes = (*header).cmsg_len as usize - libc::CMSG_LEN(0) as usize;
        let count = bytes / std::mem::size_of::<RawFd>();
        let data = libc::CMSG_DATA(header).cast::<RawFd>();

        (0..count.min(expected))
            .map(|index| OwnedFd::from_raw_fd(*data.add(index)))
            .collect::<Vec<_>>()
    };

    Ok(received)
}
