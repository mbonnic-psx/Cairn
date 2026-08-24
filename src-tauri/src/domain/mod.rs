//! Pure domain logic. No I/O, no clock, no platform conditionals.
//!
//! Four functions here each guard a constitutional principle, and each has its
//! own dedicated test (data-model.md, "Constitution-critical functions"):
//!
//! | Function | Guards |
//! | --- | --- |
//! | [`normalize::normalize`] | one entry, one form (FR-004 – FR-007) |
//! | [`splice::apply`] | bytes outside Cairn's markers are never touched (IV) |
//! | [`sni::parse_destination_name`] | the destination name and nothing beyond it (II) |
//! | [`gate::is_eligible`] | a reduction waits, whatever the clock says (I) |
//!
//! Purity is enforced by `scripts/check-domain-purity.sh`, not by convention.
//! Nothing here reads a file, a clock, or an environment variable: callers pass
//! those in as plain values, which is what makes these four testable to the
//! standard the constitution sets.

pub mod entries;
pub mod gate;
pub mod normalize;
pub mod sni;
pub mod splice;
