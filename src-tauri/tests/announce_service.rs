//! The announcement seam, on its own — capability and the `app`-less answer.
//!
//! A real notification cannot be raised in CI, so these prove what can be
//! proved with no desktop session: what each platform reports through
//! [`AnnounceService::capability`], and that a build with no window is
//! honest about having nothing to raise a notification through, rather than
//! silently pretending to have tried.
//!
//! # Why this file is gated to builds without `app`
//!
//! With `app` on, all three types hold a live `AppHandle` and the only way to
//! build one is `new(handle)` — a handle is the one thing these types cannot
//! invent for themselves, and CI has no running application to take one from.
//! The unconditional constructors (`Default`, `assuming_daemon`) exist only
//! without `app` for exactly that reason, so the whole file is scoped to that
//! configuration rather than each test repeating the condition.
//!
//! What this leaves untested is the `app` path of `raise` — the permission
//! check and the plugin call. That is not reachable from a test at all
//! without a desktop session, and the seam is shaped so the untested part is
//! as small as possible: everything that does not need a handle, including
//! every `capability` answer above, is unconditional and proved here.
#![cfg(not(feature = "app"))]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::platform::{LinuxAnnounce, MacosAnnounce, WindowsAnnounce};
use cairn::services::{AnnounceService, Capability};

#[test]
fn windows_reports_available() {
    let announce = WindowsAnnounce::default();
    assert_eq!(announce.capability(), Capability::Available);
}

#[test]
fn macos_reports_available() {
    let announce = MacosAnnounce::default();
    assert_eq!(announce.capability(), Capability::Available);
}

#[test]
fn linux_reports_available_when_a_daemon_is_listening() {
    let announce = LinuxAnnounce::assuming_daemon(true);
    assert_eq!(announce.capability(), Capability::Available);
}

#[test]
fn linux_reports_unsupported_with_no_daemon_listening() {
    let announce = LinuxAnnounce::assuming_daemon(false);
    let capability = announce.capability();

    assert!(!capability.is_available());
    match capability {
        Capability::Unsupported { because } => {
            assert!(!because.is_empty());
            // The banned-word guard already forbids these in shipped text;
            // this is the same rule pinned locally so a regression here
            // fails fast, right next to the string it is about.
            for word in ["failed", "fail", "denied", "forbidden"] {
                assert!(
                    !because.to_lowercase().contains(word),
                    "unsupported reason used a banned word: {word}"
                );
            }
        }
        Capability::Available => {
            panic!("no daemon was asserted; this must not read as available")
        }
    }
}

#[test]
fn a_build_with_no_window_is_honest_about_having_nothing_to_raise_through() {
    for outcome in [
        WindowsAnnounce::default()
            .announce("Evening check-in", "Tonight's reaches are ready."),
        MacosAnnounce::default()
            .announce("Evening check-in", "Tonight's reaches are ready."),
        LinuxAnnounce::assuming_daemon(true)
            .announce("Evening check-in", "Tonight's reaches are ready."),
    ] {
        let trouble = outcome
            .expect_err("no window exists in this build to raise anything through");
        let message = trouble.to_string().to_lowercase();
        for word in ["failed", "fail", "denied", "forbidden"] {
            assert!(
                !message.contains(word),
                "trouble message used a banned word: {word}"
            );
        }
    }
}
