//! The announcement seam, on its own — capability and the `app`-less answer.
//!
//! A real notification cannot be raised in CI, so these prove what can be
//! proved with no desktop session: what each platform reports through
//! [`AnnounceService::capability`], and that a build with no window is
//! honest about having nothing to raise a notification through, rather than
//! silently pretending to have tried.
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
