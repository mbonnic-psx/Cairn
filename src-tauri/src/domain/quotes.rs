//! Which line of the bundled set a check-in shows (slice `quote`, gaps
//! review Q1).
//!
//! The roll is supplied by the caller: a fresh one each time the check-in
//! opens, so the line is random and never tied to the date (research R6 rejects
//! a quote of the day). Nothing here reads a clock or a random source.

/// The line `roll` names, or nothing when there are no lines.
pub fn choose(lines: &[String], roll: u64) -> Option<&str> {
    let count = u64::try_from(lines.len()).ok().filter(|count| *count > 0)?;
    let index = usize::try_from(roll % count).ok()?;
    lines.get(index).map(String::as_str)
}
