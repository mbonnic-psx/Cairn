//! Turning intent into what is actually on the machine, and back again.
//!
//! Two directions, and they are deliberately not symmetrical:
//!
//! - **Increases** — protecting more — apply immediately (FR-048).
//! - **Reductions** — protecting less — have one route, and it waits
//!   (FR-047, `reduce`).
//!
//! Nothing in this module may reduce protection outside that route. That is
//! Principle I, and it is enforced by the privileged interface having no verb
//! for it rather than by discipline here.

pub mod apply;
pub mod reach_mode;
pub mod reduce;
pub mod seed;
pub mod state;
pub mod teardown;
pub mod trail;
