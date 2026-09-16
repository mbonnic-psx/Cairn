//! Whether the once-a-day reflection announcement is due right now.
//!
//! Constitution-critical (Principle V, FR-001, FR-002, FR-004, FR-006).
//! Isolated here for the reason `research.md` (R2) gives: slice `002` kept the
//! interface silent by refusing it a notification capability at all; this
//! slice has to grant that capability, so the guarantee — at most one
//! reminder a day — can no longer rest on absence. It has to rest on proof.
//! A pure function over an explicit clock is provable by unit test at any
//! call frequency: called a thousand times in one day, it answers *due* at
//! most once. A timer living in the interface proves nothing, because a
//! reopened window resets it and a test would have to simulate the window to
//! say otherwise.
//!
//! This function decides. It never writes, and it never reads a clock of its
//! own — `now`, `day_start`, and `last_announced` all arrive as arguments.
//! The caller is expected to record its answer durably before raising
//! anything: a crash between those two steps then costs a missed reminder
//! rather than a duplicate one (research R2), an ordering this module cannot
//! itself enforce, since it has no write to place on either side of it.

use super::dates::LocalDate;

const SECONDS_PER_HOUR: i64 = 3_600;
const SECONDS_PER_DAY: i64 = 86_400;

/// Whether the reflection announcement should fire right now.
///
/// True only when every one of these holds:
/// - `switched_on` — the person has not turned the reminder off;
/// - the chosen hour has arrived on `day`: `now >= day_start + chosen_hour *
///   3600`;
/// - `now` has not yet left `day`: `now < day_start + 86_400`;
/// - `last_announced` is not already `Some(day)`.
///
/// # Why "has not yet left `day`" matters
///
/// Drop this condition and an hour that passed while Cairn was closed would
/// announce the instant the app next opens, however much later that is — a
/// launch at noon would still ring the previous evening's reminder. FR-006
/// says the opposite: a missed hour is missed, not queued. Once `now` has
/// moved past the end of `day`, that day's window is closed for good; the
/// only thing that can still become due is the *current* day's own
/// announcement, judged against its own `day_start` on a later call. A future
/// reader tempted to drop this bound as redundant with `last_announced` is
/// the exact failure mode FR-006 exists to name: nothing in `last_announced`
/// prevents a late announcement for a day nothing has recorded yet.
///
/// # Purity and overflow
///
/// No clock is read here; every input the decision needs is a parameter,
/// which is what makes "at most once per day" a property a test can hold to
/// exhaustively rather than trust a running timer to honor.
///
/// `day_start` is supplied by the caller and, at the extremes this type
/// permits (a calendar day very far from the epoch), may already sit close to
/// either end of `i64`. Adding `chosen_hour * 3600` or a day's length to it
/// with plain `+` could then overflow and panic, or — worse — wrap silently
/// into a bogus, possibly negative bound and answer the comparisons below
/// with nonsense. Both additions instead saturate. Saturating both the "hour
/// has arrived" bound and the "day has ended" bound the same way keeps them
/// coherent even out there: if `day_start` is close enough to `i64::MAX` that
/// either bound would overflow, both collapse toward the same ceiling and the
/// window between them closes to nothing, so the function still answers
/// `false` rather than panicking or answering `true` on a corrupted bound.
pub fn announcement_due(
    day: LocalDate,
    day_start: i64,
    chosen_hour: u8,
    now: i64,
    last_announced: Option<LocalDate>,
    switched_on: bool,
) -> bool {
    if !switched_on || last_announced == Some(day) {
        return false;
    }

    // `chosen_hour` is at most 23, so this widening multiply is always exact;
    // it is the addition to `day_start` below that can reach the extremes.
    let hour_offset = i64::from(chosen_hour) * SECONDS_PER_HOUR;

    let due_at = day_start.saturating_add(hour_offset);
    let day_end = day_start.saturating_add(SECONDS_PER_DAY);

    now >= due_at && now < day_end
}
