//! Pure domain logic. No I/O, no clock, no platform conditionals.
//!
//! Eight functions here each guard a constitutional principle, and each has
//! its own dedicated test — the first four cataloged in `data-model.md`,
//! "Constitution-critical functions" (feature 002); the fifth in
//! `specs/003-reflection-and-history/contracts/patterns.md`:
//!
//! | Function | Guards |
//! | --- | --- |
//! | [`normalize::normalize`] | one entry, one form (FR-004 – FR-007) |
//! | [`splice::apply`] | bytes outside Cairn's markers are never touched (IV) |
//! | [`sni::parse_destination_name`] | the destination name and nothing beyond it (II) |
//! | [`gate::is_eligible`] | a reduction waits, whatever the clock says (I) |
//! | [`patterns::summarize`] | an estimate never fills a reach-derived bucket, and its exclusion is stated rather than silent (FR-023, SC-008; III) |
//! | [`patterns::by_hour`] | an hour is the one the computer's clock showed at the reach's own instant, across a clock change (B4; III) |
//! | [`patterns::by_weekday`] | a day of the week is the one the computer's calendar showed at the reach's own instant, across a clock change (W5; III) |
//! | [`patterns::weekdays_in`] | how many of each weekday a range holds is stated beside its count, by the calendar alone (W4; III) |
//!
//! Purity is enforced by `scripts/check-domain-purity.sh`, not by convention.
//! Nothing here reads a file, a clock, or an environment variable: callers pass
//! those in as plain values, which is what makes these eight testable to the
//! standard the constitution sets.

pub mod dates;
pub mod entries;
pub mod gate;
pub mod normalize;
pub mod patterns;
pub mod quotes;
pub mod sni;
pub mod splice;
pub mod visible;
