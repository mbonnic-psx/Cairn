//! `FlushDnsCache`.
//!
//! A change has to take effect within 60 seconds without restarting the machine
//! or a browser (FR-010, SC-004), and a stale resolver cache is the main thing
//! that would miss that. So Cairn flushes after every apply, repair, and
//! teardown.
//!
//! Failure is **non-fatal and reported**, never silent (research R8): the
//! change still takes effect as caches expire, and protection is reported in
//! force only if verification passed on its own. Browsers keep their own
//! internal caches that a system flush does not clear — a known limit, stated
//! rather than papered over.

use std::process::Command;

use cairn::protocol::Response;

pub fn flush_dns_cache() -> Response {
    for (mechanism, program, arguments) in candidates() {
        match Command::new(program).args(arguments).output() {
            Ok(output) if output.status.success() => {
                return Response::DnsFlushed {
                    flushed: true,
                    mechanism: mechanism.to_string(),
                    note: None,
                }
            }
            // Not installed on this machine: try the next one.
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Ok(_) | Err(_) => continue,
        }
    }

    // Nothing on this machine is caching addresses, or nothing Cairn can ask.
    // Either way the change stands and takes effect as anything cached expires.
    Response::DnsFlushed {
        flushed: false,
        mechanism: "none".into(),
        note: Some(
            "Nothing on this machine keeps a cache of site addresses that Cairn can \
             clear, so a site you have just protected may still load from a cache for \
             a short while."
                .into(),
        ),
    }
}

#[cfg(target_os = "linux")]
fn candidates() -> Vec<(&'static str, &'static str, Vec<&'static str>)> {
    vec![
        ("systemd-resolved", "resolvectl", vec!["flush-caches"]),
        (
            "systemd-resolved",
            "systemd-resolve",
            vec!["--flush-caches"],
        ),
        ("nscd", "nscd", vec!["-i", "hosts"]),
    ]
}

#[cfg(target_os = "macos")]
fn candidates() -> Vec<(&'static str, &'static str, Vec<&'static str>)> {
    vec![
        (
            "directory service cache",
            "dscacheutil",
            vec!["-flushcache"],
        ),
        ("mDNSResponder", "killall", vec!["-HUP", "mDNSResponder"]),
    ]
}

#[cfg(windows)]
fn candidates() -> Vec<(&'static str, &'static str, Vec<&'static str>)> {
    vec![("DNS Client service", "ipconfig", vec!["/flushdns"])]
}
