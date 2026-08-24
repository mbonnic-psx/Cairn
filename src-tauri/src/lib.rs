//! Cairn's core.
//!
//! The library exists so the privileged helper can link `domain` — the pure,
//! platform-free code the constitution cares most about — without linking the
//! unelevated application's dependencies. Everything the UI process needs sits
//! behind the `app` feature; `domain` needs nothing at all.

pub mod domain;
pub mod platform;
pub mod protocol;
pub mod services;
pub mod store;
