//! Raising the one quiet evening announcement — the platform seam for all
//! three desktops (plan.md, Platform abstraction).
//!
//! This file needs no per-operating-system conditional compilation of its
//! own: the three types below are plain Rust and compile everywhere, and the
//! one place their behaviour genuinely diverges — how a notification is
//! delivered — is handled inside the notification plugin itself, not here.
//! The one place Cairn's *own* code diverges by platform is [`LinuxAnnounce`]
//! deciding whether a notification daemon is even listening, which is a real
//! question on a minimal desktop and not on the other two.
//!
//! **Feature gating.** [`AnnounceService::announce`] can only ever do
//! something real through `tauri-plugin-notification`, and that dependency is
//! optional and gated behind the `app` feature so the pure domain, store, and
//! enforcement layers keep building and testing with no GUI toolchain and no
//! window (`src-tauri/Cargo.toml`, `scripts/check-no-notifications.sh` rule
//! 6). This module is compiled unconditionally — it is part of `platform/`,
//! which the privileged helper links too — so every item in it must compile
//! with that dependency absent. The split is inside each type: whatever does
//! not need the plugin (construction, [`AnnounceService::capability`]) is
//! unconditional; the one call that needs a live application handle is
//! behind `app`, and without it [`AnnounceService::announce`] answers
//! honestly that there is no window to raise anything through, rather than
//! pretending to have tried.
//!
//! **What `Accepted` does not mean.** As [`crate::services::Announced`]
//! already says: the platform took the notification, not that anyone saw
//! it. Do-not-disturb can still swallow it, and this module has no way to
//! learn that happened.

use std::process::Command;

use crate::services::{AnnounceService, Announced, Capability, Outcome, Trouble};

#[cfg(feature = "app")]
use tauri::AppHandle;
#[cfg(feature = "app")]
use tauri_plugin_notification::{NotificationExt, PermissionState};

/// There is no window open to raise anything through. This only happens in a
/// build with no `app` feature — the pure library the privileged helper
/// links, and the configuration these types are tested under. It is not a
/// state a person using Cairn ever sees.
const NO_WINDOW: &str = "Cairn has no window open right now, so there is nothing to \
                          raise this notice through. The check-in is still there \
                          whenever you open Cairn.";

/// The platform withheld permission, or was asked and did not grant it.
/// Shared across all three desktops, because the plugin reports the same
/// permission model on each of them. Only reachable with `app` — without it
/// there is no window to have asked through in the first place.
#[cfg(feature = "app")]
const NOT_ALLOWED: &str = "This device isn't set to show notices for Cairn, so this \
                            evening's reminder won't appear. The check-in is still there \
                            whenever you open Cairn.";

/// Windows: notification support has shipped with every supported desktop
/// release since Windows 10, so this reports [`Capability::Available`]
/// outright rather than trying to detect the presence of something that is,
/// in practice, always there.
#[cfg_attr(not(feature = "app"), derive(Default))]
pub struct WindowsAnnounce {
    #[cfg(feature = "app")]
    handle: AppHandle,
}

#[cfg(feature = "app")]
impl WindowsAnnounce {
    /// The composition root's only way to build one: a live application
    /// handle is the one thing this type cannot invent for itself.
    pub fn new(handle: AppHandle) -> Self {
        WindowsAnnounce { handle }
    }
}

impl AnnounceService for WindowsAnnounce {
    fn capability(&self) -> Capability {
        Capability::Available
    }

    fn announce(&self, title: &str, body: &str) -> Outcome<Announced> {
        #[cfg(feature = "app")]
        return raise(&self.handle, title, body);
        #[cfg(not(feature = "app"))]
        return raise(title, body);
    }
}

/// macOS: Notification Center has been part of every supported release since
/// 10.8, so — exactly as on Windows — this reports [`Capability::Available`]
/// outright.
#[cfg_attr(not(feature = "app"), derive(Default))]
pub struct MacosAnnounce {
    #[cfg(feature = "app")]
    handle: AppHandle,
}

#[cfg(feature = "app")]
impl MacosAnnounce {
    pub fn new(handle: AppHandle) -> Self {
        MacosAnnounce { handle }
    }
}

impl AnnounceService for MacosAnnounce {
    fn capability(&self) -> Capability {
        Capability::Available
    }

    fn announce(&self, title: &str, body: &str) -> Outcome<Announced> {
        #[cfg(feature = "app")]
        return raise(&self.handle, title, body);
        #[cfg(not(feature = "app"))]
        return raise(title, body);
    }
}

/// Linux: the one platform where "cannot announce at all" is a real answer
/// rather than a formality. A minimal desktop can have no notification
/// daemon on the session bus, and reporting [`Capability::Available`] anyway
/// would be exactly the claim Principle III forbids.
pub struct LinuxAnnounce {
    #[cfg(feature = "app")]
    handle: AppHandle,
    /// How to ask whether a daemon is listening. A function pointer rather
    /// than a stored answer, because presence is asked for fresh each call —
    /// a session can gain or lose a notification daemon without Cairn
    /// restarting — and swapped out entirely in tests, the same way
    /// [`crate::platform::hosts::SystemHosts::at`] swaps the path it reads
    /// rather than caching what it once found there.
    probe: fn() -> bool,
}

impl LinuxAnnounce {
    /// Assert an answer directly, bypassing the real probe. Tests only — the
    /// composition root always probes for real, through [`Default`] or
    /// [`LinuxAnnounce::new`].
    #[cfg(not(feature = "app"))]
    pub fn assuming_daemon(present: bool) -> Self {
        LinuxAnnounce {
            probe: if present {
                always_present
            } else {
                always_absent
            },
        }
    }
}

#[cfg(feature = "app")]
impl LinuxAnnounce {
    pub fn new(handle: AppHandle) -> Self {
        LinuxAnnounce {
            handle,
            probe: notification_daemon_present,
        }
    }
}

#[cfg(not(feature = "app"))]
impl Default for LinuxAnnounce {
    fn default() -> Self {
        LinuxAnnounce {
            probe: notification_daemon_present,
        }
    }
}

impl AnnounceService for LinuxAnnounce {
    fn capability(&self) -> Capability {
        if (self.probe)() {
            Capability::Available
        } else {
            Capability::unsupported(
                "This desktop has no notification service running, so Cairn cannot show \
                 the evening reminder here. The check-in is still there whenever you open \
                 Cairn.",
            )
        }
    }

    fn announce(&self, title: &str, body: &str) -> Outcome<Announced> {
        #[cfg(feature = "app")]
        return raise(&self.handle, title, body);
        #[cfg(not(feature = "app"))]
        return raise(title, body);
    }
}

fn always_present() -> bool {
    true
}

fn always_absent() -> bool {
    false
}

/// Whether anything on the session bus is prepared to receive a notification
/// at all. Shells out rather than adding a D-Bus client dependency of its
/// own, matching how the rest of `platform/` reaches for the system's own
/// tools (`pkexec`, `systemctl`, `sc.exe`) instead of a library for each one.
fn notification_daemon_present() -> bool {
    // No session bus at all means nothing could possibly be listening.
    if std::env::var_os("DBUS_SESSION_BUS_ADDRESS").is_none() {
        return false;
    }

    let reply = Command::new("dbus-send")
        .args([
            "--session",
            "--dest=org.freedesktop.DBus",
            "--type=method_call",
            "--print-reply",
            "/org/freedesktop/DBus",
            "org.freedesktop.DBus.NameHasOwner",
            "string:org.freedesktop.Notifications",
        ])
        .output();

    match reply {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).contains("boolean true")
        }
        // No `dbus-send` on this machine, or the call did not come back
        // cleanly. Either way there is nothing to report but absence — never
        // guessed availability (Principle III).
        _ => false,
    }
}

/// The one call that actually asks the platform to raise something,
/// once a live application handle exists to ask through.
///
/// Asks permission first, and only *requests* it — raising the system's own
/// one-time prompt — when it has not already been decided one way or the
/// other, matching "request permission once" rather than re-prompting on
/// every call. Never schedules, cancels, or lists anything: the plugin can
/// do those and this call does not reach for them
/// (`scripts/check-no-notifications.sh` rule 8).
#[cfg(feature = "app")]
fn raise(handle: &AppHandle, title: &str, body: &str) -> Outcome<Announced> {
    let notification = handle.notification();

    let state = notification.permission_state().map_err(|error| {
        Trouble::new(format!(
            "Cairn could not ask whether it may show notices here ({error})."
        ))
    })?;

    let state = match state {
        PermissionState::Granted | PermissionState::Denied => state,
        _ => notification.request_permission().map_err(|error| {
            Trouble::new(format!(
                "Cairn asked whether it may show notices here, and the system did not \
                 answer ({error})."
            ))
        })?,
    };

    if !matches!(state, PermissionState::Granted) {
        return Ok(Announced::Declined {
            because: NOT_ALLOWED.into(),
        });
    }

    notification
        .builder()
        .title(title)
        .body(body)
        .show()
        .map(|()| Announced::Accepted)
        .map_err(|error| {
            Trouble::new(format!(
                "Cairn asked to show tonight's reminder, and the system did not raise it \
                 ({error}). The check-in is still there whenever you open Cairn."
            ))
        })
}

/// The `app`-less answer: honest about having nothing to raise a
/// notification through, rather than a stub that pretends to have tried.
#[cfg(not(feature = "app"))]
fn raise(_title: &str, _body: &str) -> Outcome<Announced> {
    Err(Trouble::new(NO_WINDOW))
}
