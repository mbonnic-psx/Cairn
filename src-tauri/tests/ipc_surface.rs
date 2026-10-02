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
const CLASSIFIED: [(&str, Effect); 21] = [
    // Reads. They change nothing.
    ("get_protection_state", Effect::Reads),
    ("get_trail", Effect::Reads),
    ("list_categories", Effect::Reads),
    ("get_reach_mode", Effect::Reads),
    ("get_disclosures", Effect::Reads),
    ("get_pending_change", Effect::Reads),
    // Reach counting. Neither direction touches what is protected: silent mode
    // blocks exactly the same addresses (FR-028).
    ("set_reach_mode", Effect::Reads),
    ("list_todays_reaches", Effect::Reads),
    // The check-in. Reading a day and writing about it touch the history, never
    // what is protected, and nothing in either leads to a protection change
    // (Principle I).
    ("get_day", Effect::Reads),
    ("save_journal_entry", Effect::Reads),
    // The quote on the check-in. A line of bundled text, read; it says nothing
    // about the day and leads nowhere (slice `quote`).
    ("get_quote", Effect::Reads),
    // The quiet switch beside it. A setting about the check-in, kept in the
    // configuration; it leaves the trail, the intent, any pending change and
    // the trusted clock as they were (`us1_quote.rs`).
    ("get_quotes_shown", Effect::Reads),
    ("set_quotes_shown", Effect::Reads),
    // A range of days, by site, for the Reaches screen's *Over time*. It reads
    // the history and nothing else, and says nothing that leads to a
    // protection change (slice `history-by-site`).
    ("summarize_reaches", Effect::Reads),
    // Increases. Immediate, and never gated (FR-048).
    ("add_custom_entry", Effect::Increases),
    ("turn_protection_on", Effect::Increases),
    ("cancel_pending_change", Effect::Increases),
    // Reductions. Each returns a change that waits; none acts now (FR-047).
    ("request_protection_off", Effect::AsksAndWaits),
    // These two wait whenever anything is in force. With nothing in force —
    // protection meant to be off and Cairn's section verified absent from the
    // machine — there is no protection for them to reduce, so they edit the
    // list at once and touch nothing on the machine (owner's decision,
    // 2026-10-01; `tests/us1_setup_changes.rs` proves both halves). That one
    // exception is held to a single guarded path by the test below.
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
fn every_classified_command_is_exposed() {
    // The other direction. A classification for a command that is not there
    // is a claim about the surface that the surface does not make good on.
    let exposed = exposed_commands();
    for (name, _) in &CLASSIFIED {
        assert!(
            exposed.iter().any(|found| found == name),
            "{name} is classified here but not exposed to the interface"
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

#[test]
fn a_list_edit_skips_the_wait_only_when_nothing_is_in_force() {
    // The at-once path for list edits exists in one place, behind one check,
    // and turning protection off is never routed through it. A second caller,
    // or a caller without the check, is a way round the wait.
    let state = include_str!("../src/ipc/state.rs");

    assert_eq!(
        state.matches("reduce::apply_at_once(").count(),
        1,
        "one at-once path, no more"
    );
    assert_eq!(
        state.matches("reduce::nothing_in_force(").count(),
        1,
        "and one check guarding it"
    );

    let guard = state.find("reduce::nothing_in_force(").unwrap();
    let at_once = state.find("reduce::apply_at_once(").unwrap();
    assert!(guard < at_once, "the check comes before the edit");

    let off = state
        .split("pub fn request_protection_off")
        .nth(1)
        .and_then(|rest| rest.split("\n    }").next())
        .expect("request_protection_off exists");
    assert!(
        off.contains("self.request_reduction(") && !off.contains("self.reduce("),
        "turning protection off always waits: {off}"
    );
}

/// Every `invoke('<name>', { keys })` the interface makes, from each wrapper
/// module in `src/ipc/`. Read as text, the way `exposed_commands` reads the
/// Rust side.
fn interface_calls() -> Vec<(String, Vec<String>)> {
    let sources = [
        include_str!("../../src/ipc/index.ts"),
        include_str!("../../src/ipc/reaches.ts"),
        include_str!("../../src/ipc/journal.ts"),
    ];
    let mut calls = Vec::new();
    for source in sources {
        let mut rest = source;
        while let Some(at) = rest.find("invoke<") {
            rest = &rest[at..];
            let open = rest.find("('").expect("a command name after invoke<…>") + 2;
            let close = open + rest[open..].find('\'').expect("the name's closing quote");
            let name = rest[open..close].to_string();
            let after = rest[close + 1..].trim_start();
            let keys = if after.starts_with(',') {
                let from = after.find('{').expect("an argument object") + 1;
                let to = after.find('}').expect("its closing brace");
                after[from..to]
                    .split(',')
                    .map(str::trim)
                    .filter(|key| !key.is_empty())
                    .map(str::to_string)
                    .collect()
            } else {
                Vec::new()
            };
            calls.push((name, keys));
            rest = &rest[close..];
        }
    }
    calls
}

/// A command's parameters as the interface must name them, `state` aside.
fn command_parameters(name: &str) -> Option<Vec<String>> {
    let source = include_str!("../src/ipc/commands.rs");
    let signature = format!("pub fn {name}(");
    let start = source.find(&signature)? + signature.len();
    let end = start + source[start..].find(')')?;
    Some(
        source[start..end]
            .split(',')
            // `State<'_, AppState>` holds a comma of its own; its second half
            // has no `:`, so it is not a parameter.
            .filter(|parameter| parameter.contains(':'))
            .filter_map(|parameter| parameter.split(':').next())
            .map(str::trim)
            .filter(|parameter| !parameter.is_empty() && *parameter != "state")
            .map(str::to_string)
            .collect(),
    )
}

/// Tauri hands `dayStart` to `day_start`: camelCase on the interface's side.
fn snake(key: &str) -> String {
    key.chars()
        .flat_map(|c| {
            if c.is_ascii_uppercase() {
                vec!['_', c.to_ascii_lowercase()]
            } else {
                vec![c]
            }
        })
        .collect()
}

#[test]
fn every_interface_call_names_a_command_and_its_arguments() {
    // A wrapper that names a command wrongly, or passes a key the command does
    // not take, fails only in the running app — and for a quote, by design, it
    // fails as silence (slice `quote`, convergence F1). So the join is held
    // here, for every wrapper.
    let calls = interface_calls();
    assert!(calls.len() >= 20, "the wrappers should be found: {calls:?}");

    for (name, keys) in &calls {
        let parameters = command_parameters(name).unwrap_or_else(|| {
            panic!("the interface calls {name}, which is not a command")
        });
        let mut given: Vec<String> = keys.iter().map(|key| snake(key)).collect();
        let mut taken = parameters.clone();
        given.sort();
        taken.sort();
        assert_eq!(
            given, taken,
            "{name}: the interface passes {keys:?}, the command takes {parameters:?}"
        );
    }
}

#[test]
fn every_exposed_command_is_registered_with_the_window() {
    // A command in `commands.rs` that `main.rs` does not register answers
    // nothing at all (slice `quote`, convergence F2). Both directions.
    let source = include_str!("../src/main.rs");
    let start = source
        .find("generate_handler![")
        .expect("main.rs registers its commands")
        + "generate_handler![".len();
    let end = start + source[start..].find(']').expect("the list closes");
    let mut registered: Vec<String> = source[start..end]
        .split(',')
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(|entry| entry.trim_start_matches("commands::").to_string())
        .collect();
    let mut exposed = exposed_commands();
    registered.sort();
    exposed.sort();
    assert_eq!(registered, exposed);
}

#[test]
fn the_application_supplies_the_tested_roll_and_the_bundled_set() {
    // `main.rs` is built only with the window, so what it hands `AppState` is
    // held here as text: the roll that `us1_quote.rs` proves fresh, and the
    // set `tauri.conf.json` bundles (convergence F2).
    let source = include_str!("../src/main.rs");
    assert!(source.contains("roll: cairn::reflection::quote::fresh_roll,"));
    assert!(source.contains(".join(\"resources/quotes/quotes.json\")"));
    let bundle = include_str!("../tauri.conf.json");
    assert!(bundle.contains("\"resources/quotes/*.json\""));
}
