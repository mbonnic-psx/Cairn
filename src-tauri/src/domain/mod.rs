//! Pure domain logic. No I/O, no clock, no platform conditionals.
//!
//! Six functions here each guard a constitutional principle, and each has
//! its own dedicated test — the first four cataloged in `data-model.md`,
//! "Constitution-critical functions" (feature 002); the fifth and sixth in
//! `specs/003-reflection-and-history/contracts/patterns.md`:
//!
//! | Function | Guards |
//! | --- | --- |
//! | [`normalize::normalize`] | one entry, one form (FR-004 – FR-007) |
//! | [`splice::apply`] | bytes outside Cairn's markers are never touched (IV) |
//! | [`sni::parse_destination_name`] | the destination name and nothing beyond it (II) |
//! | [`gate::is_eligible`] | a reduction waits, whatever the clock says (I) |
//! | [`checkin::announcement_due`] | at most one reminder a day, never late, never while off (V) |
//! | [`patterns::summarize`] | an estimate never fills a reach-derived bucket, and its exclusion is stated rather than silent (FR-023, SC-008; III) |
//!
//! Purity is enforced by `scripts/check-domain-purity.sh`, not by convention.
//! Nothing here reads a file, a clock, or an environment variable: callers pass
//! those in as plain values, which is what makes these six testable to the
//! standard the constitution sets.

pub mod checkin;
pub mod dates;
pub mod entries;
pub mod gate;
pub mod normalize;
pub mod patterns;
pub mod sni;
pub mod splice;
