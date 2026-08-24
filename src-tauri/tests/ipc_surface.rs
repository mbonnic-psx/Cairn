//! No command reduces protection immediately.
//!
//! T093 asks for this as a review recorded in a doc comment. A comment is a
//! claim; this is the same review as a test, so the next command someone adds
//! has to be classified before it can be exposed.
//!
//! Principle I: every way of protecting less goes through one path and waits
//! (FR-047). Every way of protecting more applies at once (FR-048). A command
//! that fits neither is the one to look at hard.
#![allow(clippy::unwrap_used, clippy::expect_used)]

/// Every command, and what it does to protection.
///
/// Adding a command without adding it here fails this test — which is the
/// point.
const CLASSIFIED: [(&str, Effect); 13] = [
    // Reads. They change nothing.
    ("get_protection_state", Effect::Reads),
    ("get_trail", Effect::Reads),
    ("list_categories", Effect::Reads),
    ("get_reach_mode", Effect::Reads),
    ("get_disclosures", Effect::Reads),
    ("get_pending_change", Effect::Reads),
    // Increases. Immediate, and never gated (FR-048).
    ("add_custom_entry", Effect::Increases),
    ("turn_protection_on", Effect::Increases),
    ("cancel_pending_change", Effect::Increases),
    // Reductions. Each returns a change that waits; none acts now (FR-047).
    ("request_protection_off", Effect::AsksAndWaits),
    ("remove_custom_entry", Effect::AsksAndWaits),
    ("set_category_enabled", Effect::AsksAndWaits),
    // Refuses while protection is on, so it cannot be an off-switch by another
    // name (FR-045).
    ("delete_all_data", Effect::Reads),
];

#[derive(PartialEq, Eq, Debug, Clone, Copy)]
enum Effect {
    Reads,
    Increases,
    AsksAndWaits,
}

fn exposed_commands() -> Vec<String> {
    let source = include_str!("../src/ipc/commands.rs");
    let mut found = Vec::new();
    let mut expect_next = false;

    for line in source.lines() {
        let line = line.trim();
        if line == "#[tauri::command]" {
            expect_next = true;
            continue;
        }
        if expect_next {
            if let Some(rest) = line.strip_prefix("pub fn ") {
                if let Some(name) = rest.split('(').next() {
                    found.push(name.to_string());
                }
            }
            expect_next = false;
        }
    }
    found
}

#[test]
fn every_exposed_command_is_classified() {
    let exposed = exposed_commands();
    assert!(
        !exposed.is_empty(),
        "the commands file should have commands in it"
    );

    for name in &exposed {
        assert!(
            CLASSIFIED.iter().any(|(known, _)| known == name),
            "{name} is exposed to the interface but not classified here. What does it \
             do to protection?"
        );
    }
}

#[test]
fn no_command_reduces_protection_immediately() {
    // Every exposed command either changes nothing, protects more, or asks for
    // something that waits. There is no fourth kind.
    for name in exposed_commands() {
        let (_, effect) = CLASSIFIED
            .iter()
            .find(|(known, _)| *known == name)
            .expect("classified");

        assert!(
            matches!(
                effect,
                Effect::Reads | Effect::Increases | Effect::AsksAndWaits
            ),
            "{name} does something else to protection"
        );
    }
}

#[test]
fn applying_a_reduction_is_not_something_the_interface_can_ask_for() {
    // It refuses anything that has not served its day, so exposing it could not
    // skip the wait. It is still not the interface's to ask for: a change lands
    // because time passed, not because someone came back and pressed something.
    assert!(
        !exposed_commands()
            .iter()
            .any(|name| name.contains("apply_due_reduction")),
        "a reduction lands on the heartbeat, not on a button"
    );
}

#[test]
fn teardown_is_not_a_command() {
    // It removes everything at once. Exposed, it would be an off-switch with a
    // different name.
    let source = include_str!("../src/ipc/commands.rs");
    assert!(
        !exposed_commands()
            .iter()
            .any(|name| name.contains("tear_down")),
        "teardown must not be reachable from the interface"
    );
    assert!(
        source.contains("deliberately no `tear_down` command"),
        "and the reason has to stay written down"
    );
}

#[test]
fn nothing_in_the_interface_offers_an_in_moment_way_through() {
    // Principle I, checked against the words as well as the shape. A command
    // called `allow_once` would pass every other test in this file.
    let source = include_str!("../src/ipc/commands.rs");
    for forbidden in [
        "allow_once",
        "unblock",
        "pause_protection",
        "suspend",
        "snooze",
        "disable_protection",
        "turn_protection_off",
        "override",
    ] {
        assert!(
            !source.contains(forbidden),
            "the interface must never carry {forbidden}"
        );
    }
}
