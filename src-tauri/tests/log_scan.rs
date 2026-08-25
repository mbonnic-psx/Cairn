//! No domain and no reach ever reaches a diagnostic.
//!
//! FR-038b and SC-018. Cairn may write a log on this machine, and it may say
//! that something happened by kind — never which site, and never a recorded
//! reach. A log is a file someone can copy; a domain in it is the whole of what
//! Cairn promised to keep.
#![allow(clippy::unwrap_used, clippy::expect_used)]

/// Every source file that could plausibly write a diagnostic.
const SOURCES: [(&str, &str); 12] = [
    ("main.rs", include_str!("../src/main.rs")),
    ("helper.rs", include_str!("../src/helper.rs")),
    ("ipc/state.rs", include_str!("../src/ipc/state.rs")),
    ("ipc/commands.rs", include_str!("../src/ipc/commands.rs")),
    (
        "enforcement/apply.rs",
        include_str!("../src/enforcement/apply.rs"),
    ),
    (
        "enforcement/reduce.rs",
        include_str!("../src/enforcement/reduce.rs"),
    ),
    (
        "enforcement/teardown.rs",
        include_str!("../src/enforcement/teardown.rs"),
    ),
    (
        "enforcement/seed.rs",
        include_str!("../src/enforcement/seed.rs"),
    ),
    (
        "counting/listener.rs",
        include_str!("../src/counting/listener.rs"),
    ),
    (
        "counting/availability.rs",
        include_str!("../src/counting/availability.rs"),
    ),
    ("store/config.rs", include_str!("../src/store/config.rs")),
    (
        "store/inventory.rs",
        include_str!("../src/store/inventory.rs"),
    ),
];

/// Things that write somewhere a person or a support request could read.
const WRITES_A_DIAGNOSTIC: [&str; 6] = [
    "println!",
    "eprintln!",
    "log::",
    "tracing::",
    "write_log",
    "dbg!",
];

/// Names that hold a domain or a reach.
const CARRIES_A_DOMAIN: [&str; 8] = [
    "{domain", "{entry", "{entries", "{name", "{host", "{reach", "{address", "{site",
];

#[test]
fn nothing_written_to_a_diagnostic_interpolates_a_domain() {
    for (file, source) in SOURCES {
        for (number, line) in source.lines().enumerate() {
            if !WRITES_A_DIAGNOSTIC.iter().any(|call| line.contains(call)) {
                continue;
            }
            for carrier in CARRIES_A_DOMAIN {
                assert!(
                    !line.to_lowercase().contains(carrier),
                    "{file}:{} writes {carrier} to a diagnostic: {}",
                    number + 1,
                    line.trim()
                );
            }
        }
    }
}

#[test]
fn no_debug_macro_survives_anywhere() {
    // `dbg!` prints whatever it is given, which is exactly the problem.
    for (file, source) in SOURCES {
        assert!(!source.contains("dbg!"), "{file}");
    }
}

#[test]
fn the_error_shown_for_an_unexpected_answer_carries_nothing_from_it() {
    // The one place a raw protocol answer could have been formatted into a
    // message a person sees.
    let apply = include_str!("../src/enforcement/apply.rs");
    let unexpected = apply
        .split("fn unexpected")
        .nth(1)
        .expect("the unexpected-answer path");

    assert!(
        unexpected.contains("let _ = response"),
        "the answer must be dropped rather than rendered"
    );
    assert!(
        !unexpected.contains("{response"),
        "and never interpolated into what is shown"
    );
}
