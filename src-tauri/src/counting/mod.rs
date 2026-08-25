//! Counting reaches, quietly or not at all.
//!
//! A reach is information, not a failure, and it produces **no interface**: no
//! page, no notification, no toast, no sound, no badge change (FR-019). The
//! listener has no channel to the frontend — it writes a record and closes the
//! connection, and there is nowhere for it to send anything else.
//!
//! It also serves no content. A connection is accepted, the destination name is
//! read from what the client volunteered, and the connection is dropped without
//! a response.

pub mod availability;
pub mod listener;
