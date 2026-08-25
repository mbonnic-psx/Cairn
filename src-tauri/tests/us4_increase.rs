//! Protecting more is not a reduction, and never waits (FR-048).
//!
//! It also must not disturb a change that is already waiting: someone who asks
//! to turn protection off and then protects one more site has done two
//! different things, and only one of them waits.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{CategoryId, ProtectedEntry, SourceRef, Trail};
use cairn::domain::gate::{PendingKind, TrustedClock};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::enforcement::reduce;
use cairn::enforcement::trail::{add_custom_entry, enable_category};
use cairn::store::config::{Config, ProtectionIntent};

fn a_config() -> Config {
    let mut trail = Trail::default();
    for domain in normalize("example.com", &ReservedNames::default()).unwrap() {
        trail.insert(ProtectedEntry::new(
            domain,
            SourceRef::Category(CategoryId::Social),
        ));
    }
    Config {
        trail,
        intent: ProtectionIntent::On,
        ..Config::default()
    }
}

fn clock() -> TrustedClock {
    TrustedClock::started(1_700_000_000, 0)
}

#[test]
fn adding_an_address_takes_effect_at_once() {
    let mut config = a_config();
    let before = config.trail.entries.len();

    add_custom_entry(&mut config.trail, "news.example", &ReservedNames::default())
        .unwrap();

    assert!(config.trail.entries.len() > before);
    assert!(
        config.pending_change.is_none(),
        "an increase never enters the gate"
    );
}

#[test]
fn turning_a_category_on_takes_effect_at_once() {
    let mut config = a_config();

    let skipped = enable_category(
        &mut config.trail,
        CategoryId::Gambling,
        &["bet.example".into(), "casino.example".into()],
        &ReservedNames::default(),
    );

    assert!(skipped.is_empty());
    assert!(config
        .trail
        .enabled_categories
        .contains(&CategoryId::Gambling));
    assert!(config.pending_change.is_none());
}

#[test]
fn protecting_more_does_not_disturb_a_change_that_is_waiting() {
    let mut config = a_config();
    let pending = reduce::request(
        &mut config,
        PendingKind::TurnOffProtection,
        &clock(),
        1_700_000_000,
    )
    .unwrap();

    add_custom_entry(&mut config.trail, "news.example", &ReservedNames::default())
        .unwrap();

    assert_eq!(
        config.pending_change.as_ref().unwrap(),
        &pending,
        "the wait is untouched — it neither restarts nor shortens"
    );
}

#[test]
fn an_entry_that_cannot_be_normalized_is_named_rather_than_dropped_silently() {
    let mut config = a_config();

    let skipped = enable_category(
        &mut config.trail,
        CategoryId::News,
        &["good.example".into(), "not a domain".into()],
        &ReservedNames::default(),
    );

    assert_eq!(skipped, vec!["not a domain".to_string()]);
}
