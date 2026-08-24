//! User story 4: protection comes off deliberately, or not at all.
//!
//! The waiting period is the thing standing between someone at 11pm and an
//! instant off-switch. These tests are about the ways it could be got around —
//! restarting the app, restarting the machine, moving the clock, asking again
//! and again — and about it being cancellable the whole time (FR-047a–e).
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{CategoryId, ProtectedEntry, SourceRef, Trail};
use cairn::domain::gate::{PendingKind, TrustedClock, WAITING_PERIOD_SECONDS};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::enforcement::reduce;
use cairn::store::config::{Config, ProtectionIntent};

const DAY: u64 = WAITING_PERIOD_SECONDS;

fn a_config() -> Config {
    let mut trail = Trail::default();
    for input in ["example.com", "social.example"] {
        for domain in normalize(input, &ReservedNames::default()).unwrap() {
            trail.insert(ProtectedEntry::new(
                domain,
                SourceRef::Category(CategoryId::Social),
            ));
        }
    }
    trail.enabled_categories.insert(CategoryId::Social);

    Config {
        trail,
        intent: ProtectionIntent::On,
        ..Config::default()
    }
}

fn clock(trusted: u64) -> TrustedClock {
    TrustedClock {
        trusted_seconds: trusted,
        last_wall_seconds: 1_700_000_000,
        last_monotonic_seconds: 0,
    }
}

#[test]
fn asking_changes_nothing_on_the_machine() {
    // FR-047b: protection stays fully in force for the whole wait.
    let mut config = a_config();
    let before = config.trail.clone();

    reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &clock(0),
        1_700_000_000,
    );

    assert_eq!(config.trail, before, "nothing is unprotected by asking");
    assert_eq!(config.intent, ProtectionIntent::On);
    assert!(config.pending_change.is_some());
}

#[test]
fn a_reduction_does_not_apply_early() {
    let mut config = a_config();
    reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &clock(0),
        1_700_000_000,
    );

    for elapsed in [0, 60, 3600, DAY - 1] {
        let refused = reduce::apply_reduction(&mut config.clone(), elapsed);
        assert!(refused.is_err(), "it applied after {elapsed} seconds");
    }

    let applied = reduce::apply_reduction(&mut config, DAY);
    assert!(applied.is_ok(), "and it does apply once the day is served");
}

#[test]
fn restarting_the_app_does_not_restart_or_shorten_the_wait() {
    let mut config = a_config();
    let pending = reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &clock(0),
        1_700_000_000,
    );

    // The app closes and opens: the pending change comes back off disk exactly
    // as it was, because eligibility is a stored number rather than a timer.
    let round_tripped: Config =
        serde_json::from_slice(&serde_json::to_vec(&config).unwrap()).unwrap();
    let after_restart = round_tripped.pending_change.clone().unwrap();

    assert_eq!(after_restart, pending);
    assert_eq!(after_restart.eligible_after_trusted, DAY);
}

#[test]
fn asking_again_does_not_start_the_clock_over() {
    // Nor does it shorten it. Someone who asks five times in an evening has one
    // change waiting, with the time it always had.
    let mut config = a_config();
    let first = reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &clock(0),
        1_700_000_000,
    );

    let later = reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &clock(12 * 3600),
        1_700_043_200,
    );

    assert_eq!(later, first, "the same change, still waiting");
    assert!(reduce::apply_reduction(&mut config, 12 * 3600).is_err());
}

#[test]
fn the_wait_is_measured_on_the_trusted_clock_not_the_system_one() {
    // Moving the system clock forward while Cairn runs credits nothing: the
    // trusted clock only counts what the machine could corroborate (research
    // R4). Here the wall clock jumps two days and the trusted clock does not.
    let mut config = a_config();
    reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &clock(0),
        1_700_000_000,
    );

    let running =
        TrustedClock::started(1_700_000_000, 0).heartbeat(1_700_000_000 + 2 * 86_400, 60);

    assert_eq!(running.trusted_seconds, 60);
    assert!(reduce::apply_reduction(&mut config, running.trusted_seconds).is_err());
}

#[test]
fn cancelling_is_available_the_whole_time_and_costs_nothing() {
    let mut config = a_config();
    let pending = reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &clock(0),
        1_700_000_000,
    );
    let before = config.trail.clone();

    reduce::cancel(&mut config, pending.id).unwrap();

    assert!(config.pending_change.is_none());
    assert_eq!(
        config.trail, before,
        "cancelling protects exactly what it did"
    );
    assert_eq!(config.intent, ProtectionIntent::On);

    // And there is nothing left to apply.
    assert!(reduce::apply_reduction(&mut config, DAY * 10).is_err());
}

#[test]
fn nothing_reduces_protection_without_a_change_that_waited() {
    // Principle I in one assertion: with no pending change, there is no
    // argument that removes anything.
    let mut config = a_config();
    let before = config.trail.clone();

    assert!(reduce::apply_reduction(&mut config, u64::MAX).is_err());
    assert_eq!(config.trail, before);
}

#[test]
fn removing_one_address_leaves_what_another_source_still_needs() {
    let mut config = a_config();
    let domain = config.trail.entries[0].domain.clone();

    // The person also added it themselves, so two sources need it.
    config
        .trail
        .insert(ProtectedEntry::new(domain.clone(), SourceRef::Custom));

    reduce::request(
        &mut config,
        PendingKind::RemoveEntries {
            domains: vec![domain.clone()],
        },
        &clock(0),
        1_700_000_000,
    );
    reduce::apply_reduction(&mut config, DAY).unwrap();

    assert!(
        config.trail.domains().any(|kept| *kept == domain),
        "the category still protects it (FR-006)"
    );
}

#[test]
fn switching_a_category_off_removes_only_what_that_category_needed() {
    let mut config = a_config();
    let reserved = ReservedNames::default();
    for domain in normalize("mine.example", &reserved).unwrap() {
        config
            .trail
            .insert(ProtectedEntry::new(domain, SourceRef::Custom));
    }

    reduce::request(
        &mut config,
        PendingKind::DisableCategory {
            category: CategoryId::Social,
        },
        &clock(0),
        1_700_000_000,
    );
    reduce::apply_reduction(&mut config, DAY).unwrap();

    let left: Vec<String> = config.trail.domains().map(|d| d.to_string()).collect();
    assert!(left.contains(&"mine.example".to_string()), "{left:?}");
    assert!(!left.contains(&"example.com".to_string()), "{left:?}");
    assert!(!config
        .trail
        .enabled_categories
        .contains(&CategoryId::Social));
}

#[test]
fn the_time_remaining_is_a_phrase_not_a_countdown() {
    // FR-047e: visible wherever protection is shown, and never something to
    // come back and watch tick.
    assert_eq!(reduce::plain_duration(DAY), "24 hours");
    assert_eq!(reduce::plain_duration(90 * 60), "about an hour");
    assert_eq!(reduce::plain_duration(45 * 60), "45 minutes");
    assert_eq!(reduce::plain_duration(0), "no time");

    for seconds in [0, 59, 60, 3600, DAY] {
        let phrase = reduce::plain_duration(seconds);
        assert!(!phrase.contains(':'), "{phrase} looks like a clock");
    }
}
