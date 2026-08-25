//! The waiting period holds — across a restart, a clock moved forward, a clock
//! moved back, and a machine that was switched off.
//!
//! Principle I and FR-047a – FR-047d. What this cannot defeat is stated in the
//! last test, because Principle III means saying so rather than implying
//! tamper-proofing (research R4).
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::gate::{
    is_eligible, remaining_seconds, PendingChange, PendingKind, TrustedClock,
    WAITING_PERIOD_SECONDS,
};

const HOUR: u64 = 3600;
const MINUTE: i64 = 60;

/// A day of ordinary running: a heartbeat every minute, wall and monotonic
/// clocks agreeing.
fn run_for(mut clock: TrustedClock, seconds: u64) -> TrustedClock {
    let beats = seconds / 60;
    for beat in 1..=beats {
        clock = clock.heartbeat(
            clock.last_wall_seconds + MINUTE,
            clock.last_monotonic_seconds + 60,
        );
        let _ = beat;
    }
    clock
}

fn request(clock: &TrustedClock) -> PendingChange {
    PendingChange::request(
        PendingKind::TurnOffProtection,
        clock,
        clock.last_wall_seconds,
    )
}

#[test]
fn a_reduction_waits_a_full_day() {
    let clock = TrustedClock::started(1_700_000_000, 0);
    let pending = request(&clock);

    assert_eq!(pending.eligible_after_trusted, WAITING_PERIOD_SECONDS);
    assert!(!is_eligible(&pending, clock.trusted_seconds));

    let after_23h = run_for(clock, 23 * HOUR);
    assert!(!is_eligible(&pending, after_23h.trusted_seconds));

    let after_24h = run_for(after_23h, HOUR);
    assert!(is_eligible(&pending, after_24h.trusted_seconds));
}

#[test]
fn moving_the_clock_forward_while_running_buys_nothing() {
    // The wall clock jumps two days; the monotonic clock says one minute passed.
    let clock = TrustedClock::started(1_700_000_000, 0);
    let pending = request(&clock);

    let jumped = clock.heartbeat(clock.last_wall_seconds + 2 * 86_400, 60);

    assert_eq!(
        jumped.trusted_seconds, 60,
        "only what the machine could vouch for"
    );
    assert!(!is_eligible(&pending, jumped.trusted_seconds));
}

#[test]
fn moving_the_clock_backward_does_not_lose_the_request() {
    let clock = TrustedClock::started(1_700_000_000, 0);
    let pending = request(&clock);
    let after_12h = run_for(clock, 12 * HOUR);

    // The clock goes back a week.
    let moved_back = after_12h.heartbeat(
        after_12h.last_wall_seconds - 7 * 86_400,
        after_12h.last_monotonic_seconds + 60,
    );

    assert!(
        moved_back.trusted_seconds >= after_12h.trusted_seconds,
        "the trusted clock never goes backwards"
    );
    assert!(!is_eligible(&pending, moved_back.trusted_seconds));

    // And the remaining time is still counted from where it really was.
    let finished = run_for(moved_back, 12 * HOUR);
    assert!(is_eligible(&pending, finished.trusted_seconds));
}

#[test]
fn the_request_survives_the_app_and_the_machine_restarting() {
    let clock = TrustedClock::started(1_700_000_000, 0);
    let pending = request(&clock);
    let before_shutdown = run_for(clock, 6 * HOUR);

    // Machine off for six hours: the monotonic clock restarts at zero, and the
    // wall clock is the only witness to the gap.
    let resumed =
        before_shutdown.resumed(before_shutdown.last_wall_seconds + 6 * 3600, 0);
    assert_eq!(resumed.trusted_seconds, 12 * HOUR);
    assert!(!is_eligible(&pending, resumed.trusted_seconds));

    let finished = run_for(resumed, 12 * HOUR);
    assert!(is_eligible(&pending, finished.trusted_seconds));
}

#[test]
fn a_machine_left_off_for_a_week_comes_back_with_the_wait_served() {
    // The alternative — crediting only uptime — would punish someone for
    // switching their computer off, and would be inaccurate about what is left.
    let clock = TrustedClock::started(1_700_000_000, 0);
    let pending = request(&clock);

    let resumed = clock.resumed(clock.last_wall_seconds + 7 * 86_400, 0);
    assert!(is_eligible(&pending, resumed.trusted_seconds));
}

#[test]
fn time_remaining_is_reported_from_the_trusted_clock() {
    let clock = TrustedClock::started(1_700_000_000, 0);
    let pending = request(&clock);

    assert_eq!(
        remaining_seconds(&pending, clock.trusted_seconds),
        WAITING_PERIOD_SECONDS
    );

    let after_18h = run_for(clock, 18 * HOUR);
    assert_eq!(
        remaining_seconds(&pending, after_18h.trusted_seconds),
        6 * HOUR
    );

    let finished = run_for(after_18h, 6 * HOUR);
    assert_eq!(remaining_seconds(&pending, finished.trusted_seconds), 0);
}

#[test]
fn a_missed_heartbeat_credits_only_what_the_monotonic_clock_saw() {
    // The app was asleep, or busy, and beats were missed. Elapsed time is real,
    // and the monotonic clock corroborates it.
    let clock = TrustedClock::started(1_700_000_000, 0);
    let pending = request(&clock);

    let long_beat = clock.heartbeat(clock.last_wall_seconds + 20 * 3600, 20 * 3600);
    assert_eq!(long_beat.trusted_seconds, 20 * HOUR);
    assert!(!is_eligible(&pending, long_beat.trusted_seconds));
}

#[test]
fn an_increase_in_protection_is_not_a_pending_change_at_all() {
    // FR-048. There is no constructor here for "add entries" — increases never
    // enter the gate, and this test exists so that stays true by construction.
    let kinds = [
        PendingKind::TurnOffProtection,
        PendingKind::RemoveEntries { domains: vec![] },
        PendingKind::DisableCategory {
            category: cairn::domain::entries::CategoryId::Social,
        },
    ];
    for kind in kinds {
        let clock = TrustedClock::started(1_700_000_000, 0);
        let pending = PendingChange::request(kind, &clock, clock.last_wall_seconds);
        assert!(
            !is_eligible(&pending, clock.trusted_seconds),
            "every kind that exists here reduces protection, and every one waits"
        );
    }
}

#[test]
fn shutting_down_and_changing_the_clock_is_the_limit_cairn_states_plainly() {
    // Someone with administrator access can shut the machine down, move the
    // clock forward, and boot. Nothing on the machine can tell that apart from
    // a week having passed. Cairn does not pretend otherwise — this is
    // disclosed in the interface (FR-017, research R4).
    let clock = TrustedClock::started(1_700_000_000, 0);
    let pending = request(&clock);

    let after_tampering = clock.resumed(clock.last_wall_seconds + 86_400, 0);

    assert!(
        is_eligible(&pending, after_tampering.trusted_seconds),
        "documented limit: downtime is credited from the wall clock"
    );
}
