//! The two stores that must keep working when everything else does not.
//!
//! Configuration holds no reach data, and the inventory is readable without a
//! key — both are what make teardown possible on a machine where the credential
//! store is missing or locked (data-model.md, Principle IV).
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{CategoryId, ProtectedEntry, SourceRef, Trail};
use cairn::domain::gate::{PendingChange, PendingKind, TrustedClock};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::store::config::{Config, ConfigStore, ProtectionIntent};
use cairn::store::inventory::{sha256_hex, Change, InventoryStore, Target};

fn a_trail() -> Trail {
    let mut trail = Trail::default();
    for domain in normalize("example.com", &ReservedNames::default()).unwrap() {
        trail.insert(ProtectedEntry::new(
            domain,
            SourceRef::Category(CategoryId::Social),
        ));
    }
    trail.enabled_categories.insert(CategoryId::Social);
    trail
}

#[test]
fn configuration_survives_a_round_trip() {
    let directory = tempfile::tempdir().unwrap();
    let store = ConfigStore::at(directory.path());

    let clock = TrustedClock::started(1_700_000_000, 0);
    let config = Config {
        trail: a_trail(),
        intent: ProtectionIntent::On,
        pending_change: Some(PendingChange::request(
            PendingKind::TurnOffProtection,
            &clock,
            1_700_000_000,
        )),
        trusted_clock: clock,
        seeded: true,
        ..Config::default()
    };

    store.save(&config).unwrap();
    assert_eq!(store.load().unwrap(), config);
}

#[test]
fn a_first_run_is_not_a_problem() {
    let directory = tempfile::tempdir().unwrap();
    let store = ConfigStore::at(directory.path());
    assert_eq!(store.load().unwrap(), Config::default());
}

#[test]
fn a_configuration_from_the_announcement_era_still_loads() {
    // An earlier build of slice 003 wrote three keys for an evening announcement
    // that Cairn no longer raises — it interrupts no one, ever (FR-023,
    // Principle V). A file that still carries them must load as though they
    // were never there: an upgrade must not cost a person their trail, their
    // pending change, or their trusted clock over a setting that went away.
    // This is also the tripwire for `deny_unknown_fields`, which would turn
    // that file into an error.
    let directory = tempfile::tempdir().unwrap();
    let store = ConfigStore::at(directory.path());

    let clock = TrustedClock::started(1_700_000_000, 0);
    let expected = Config {
        trail: a_trail(),
        intent: ProtectionIntent::On,
        seeded: true,
        trusted_clock: clock,
        ..Config::default()
    };

    let mut value = serde_json::to_value(&expected).unwrap();
    let object = value.as_object_mut().unwrap();
    object.insert("evening_hour".into(), serde_json::Value::from(21));
    object.insert("announce_check_in".into(), serde_json::Value::Bool(true));
    object.insert(
        "last_announced_day".into(),
        serde_json::Value::from("2026-09-30"),
    );
    std::fs::write(store.path(), serde_json::to_vec_pretty(&value).unwrap()).unwrap();

    let loaded = store.load().unwrap();
    assert_eq!(loaded, expected);

    // And the next save leaves the retired keys behind.
    store.save(&loaded).unwrap();
    let rewritten: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(store.path()).unwrap()).unwrap();
    let rewritten = rewritten.as_object().unwrap();
    assert!(!rewritten.contains_key("evening_hour"));
    assert!(!rewritten.contains_key("announce_check_in"));
    assert!(!rewritten.contains_key("last_announced_day"));
}

#[test]
fn a_configuration_from_before_quotes_could_be_hidden_shows_them() {
    // Slice `quote` added the switch. A file written before it has no key for
    // it, and must load with quotes shown and everything else it held intact:
    // stored contracts change additively (constitution, *Versioning and
    // Compatibility*).
    let directory = tempfile::tempdir().unwrap();
    let store = ConfigStore::at(directory.path());

    let clock = TrustedClock::started(1_700_000_000, 0);
    let held = Config {
        trail: a_trail(),
        intent: ProtectionIntent::On,
        pending_change: Some(PendingChange::request(
            PendingKind::TurnOffProtection,
            &clock,
            1_700_000_000,
        )),
        trusted_clock: clock,
        seeded: true,
        ..Config::default()
    };
    let mut value = serde_json::to_value(&held).unwrap();
    value.as_object_mut().unwrap().remove("quotes_hidden");
    std::fs::write(store.path(), serde_json::to_vec_pretty(&value).unwrap()).unwrap();

    let loaded = store.load().unwrap();
    assert!(
        !loaded.quotes_hidden,
        "an older file means quotes are shown"
    );
    assert_eq!(loaded, held);

    // And the smallest file an early build could have left.
    std::fs::write(store.path(), r#"{ "intent": "on", "seeded": true }"#).unwrap();
    let loaded = store.load().unwrap();
    assert!(!loaded.quotes_hidden);
    assert_eq!(loaded.intent, ProtectionIntent::On);
}

#[test]
fn a_configuration_from_before_the_days_line_was_kept_loads_with_none() {
    let directory = tempfile::tempdir().unwrap();
    let store = ConfigStore::at(directory.path());
    let held = Config {
        trail: a_trail(),
        intent: ProtectionIntent::On,
        seeded: true,
        quotes_hidden: true,
        ..Config::default()
    };
    let mut value = serde_json::to_value(&held).unwrap();
    value.as_object_mut().unwrap().remove("quote_of_the_day");
    std::fs::write(store.path(), serde_json::to_vec_pretty(&value).unwrap()).unwrap();

    let loaded = store.load().unwrap();
    assert_eq!(loaded.quote_of_the_day, None);
    assert_eq!(loaded, held);
}

#[test]
fn configuration_holds_no_reach_data() {
    // FR-032 and the reason config is plain JSON at all: there is nothing
    // sensitive in it. If a reach ever appears here, this test is the tripwire.
    let directory = tempfile::tempdir().unwrap();
    let store = ConfigStore::at(directory.path());

    let clock = TrustedClock::started(1_700_000_000, 0);
    store
        .save(&Config {
            trail: a_trail(),
            intent: ProtectionIntent::On,
            trusted_clock: clock,
            ..Config::default()
        })
        .unwrap();

    let written = std::fs::read_to_string(store.path()).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&written).unwrap();

    // `reach_mode` is a setting — which mode is in use — and is expected. What
    // must never appear is a *record* of a reach: a domain with a time on it.
    let mode = parsed
        .get("reach_mode")
        .expect("the reach mode is a setting");
    let mut mode_keys: Vec<&str> = mode
        .as_object()
        .unwrap()
        .keys()
        .map(String::as_str)
        .collect();
    mode_keys.sort_unstable();
    assert_eq!(
        mode_keys,
        vec!["chosen_by", "fallback_reason", "mode"],
        "the reach mode carries a choice, never a record"
    );

    for recording in [
        "reaches", "history", "visits", "visited", "attempts", "gaps",
    ] {
        assert!(
            find_key(&parsed, recording).is_none(),
            "settings must not carry recorded reaches, found {recording:?}"
        );
    }
}

/// Any key by this name, at any depth.
fn find_key<'a>(
    value: &'a serde_json::Value,
    name: &str,
) -> Option<&'a serde_json::Value> {
    match value {
        serde_json::Value::Object(fields) => {
            if let Some(found) = fields.get(name) {
                return Some(found);
            }
            fields.values().find_map(|nested| find_key(nested, name))
        }
        serde_json::Value::Array(items) => {
            items.iter().find_map(|item| find_key(item, name))
        }
        _ => None,
    }
}

#[test]
fn the_inventory_is_readable_with_no_key_at_all() {
    // The whole reason it is not encrypted: a machine whose credential store is
    // gone must still be recoverable (data-model.md, deliberate split).
    let directory = tempfile::tempdir().unwrap();
    let store = InventoryStore::at(directory.path());

    store
        .record(Change::BackupWritten {
            target: Target::SystemHosts,
            captured_at: 1_700_000_000,
            sha256: sha256_hex(b"127.0.0.1 localhost\n"),
        })
        .unwrap();

    let raw = std::fs::read_to_string(store.path()).unwrap();
    assert!(raw.contains("backup_written"), "plain JSON, no key needed");
    assert!(serde_json::from_str::<serde_json::Value>(&raw).is_ok());
}

#[test]
fn teardown_walks_the_inventory_backwards() {
    let directory = tempfile::tempdir().unwrap();
    let store = InventoryStore::at(directory.path());

    store
        .record(Change::HelperInstalled {
            installed_at: 1,
            identifier: "app.cairn.helper".into(),
        })
        .unwrap();
    store
        .record(Change::BackupWritten {
            target: Target::SystemHosts,
            captured_at: 2,
            sha256: sha256_hex(b"before"),
        })
        .unwrap();
    let inventory = store
        .record(Change::HostsSection {
            target: Target::SystemHosts,
            applied_at: 3,
            separator_added: true,
        })
        .unwrap();

    let order: Vec<&Change> = inventory.in_teardown_order().collect();
    assert!(
        matches!(order[0], Change::HostsSection { .. }),
        "section first"
    );
    assert!(
        matches!(order[1], Change::BackupWritten { .. }),
        "then the backup"
    );
    assert!(
        matches!(order[2], Change::HelperInstalled { .. }),
        "the helper's own installation goes last, and it does go"
    );
}

#[test]
fn a_backup_is_recognised_as_already_taken() {
    // FR-039: a second backup would capture Cairn's own work as though it were
    // the machine's, which is the one way to lose the true original.
    let directory = tempfile::tempdir().unwrap();
    let store = InventoryStore::at(directory.path());

    assert!(!store.load().unwrap().has_backup(Target::SystemHosts));

    let inventory = store
        .record(Change::BackupWritten {
            target: Target::SystemHosts,
            captured_at: 1,
            sha256: sha256_hex(b"before"),
        })
        .unwrap();

    assert!(inventory.has_backup(Target::SystemHosts));
}

#[test]
fn the_separator_cairn_added_is_remembered() {
    // Without this, teardown is one byte off on a file that never ended in a
    // newline (`domain::splice`).
    let directory = tempfile::tempdir().unwrap();
    let store = InventoryStore::at(directory.path());

    store
        .record(Change::HostsSection {
            target: Target::SystemHosts,
            applied_at: 1,
            separator_added: true,
        })
        .unwrap();

    assert!(store.load().unwrap().separator_added(Target::SystemHosts));
}

#[test]
fn an_undone_change_is_forgotten_only_after_it_is_undone() {
    let directory = tempfile::tempdir().unwrap();
    let store = InventoryStore::at(directory.path());

    let change = Change::HostsSection {
        target: Target::SystemHosts,
        applied_at: 1,
        separator_added: false,
    };
    store.record(change.clone()).unwrap();
    store.forget(&change).unwrap();

    assert!(store.load().unwrap().changes.is_empty());
}

#[test]
fn a_half_written_file_never_replaces_a_good_one() {
    // Writes go to a neighbour and are renamed over the target, in the same
    // directory so the rename is atomic (research R6).
    let directory = tempfile::tempdir().unwrap();
    let store = ConfigStore::at(directory.path());

    store.save(&Config::default()).unwrap();
    let good = std::fs::read(store.path()).unwrap();

    store
        .save(&Config {
            intent: ProtectionIntent::On,
            ..Config::default()
        })
        .unwrap();

    let after = std::fs::read(store.path()).unwrap();
    assert_ne!(good, after);
    assert!(serde_json::from_slice::<Config>(&after).is_ok());

    let leftovers: Vec<_> = std::fs::read_dir(directory.path())
        .unwrap()
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .filter(|name| name.contains("writing"))
        .collect();
    assert!(
        leftovers.is_empty(),
        "no temporary file left behind: {leftovers:?}"
    );
}
