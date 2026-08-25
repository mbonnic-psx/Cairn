//! Platform code, and the only place it lives.
//!
//! Nothing above this module knows which operating system it is on: domain and
//! UI code never see a `cfg(target_os)`, a registry handle, a launchd label, or
//! a systemd unit name. The composition root picks the implementations here and
//! everything else talks to the traits in [`crate::services`].

pub mod credentials;
pub mod hosts;

#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "macos")]
pub mod macos;
#[cfg(windows)]
pub mod windows;

pub use credentials::PlatformCredentials;
pub use hosts::SystemHosts;

#[cfg(target_os = "linux")]
pub use linux::elevation::LinuxElevation as PlatformElevation;
#[cfg(target_os = "macos")]
pub use macos::elevation::MacosElevation as PlatformElevation;
#[cfg(windows)]
pub use windows::elevation::WindowsElevation as PlatformElevation;
