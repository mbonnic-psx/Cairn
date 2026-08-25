//! A blocked request produces no Cairn interface at all.
//!
//! Principle I, FR-019, SC-005. No page, no notification, no toast, no sound,
//! no badge change. The guarantee is structural rather than behavioural: the
//! counting path has no channel to the frontend, so there is nothing for a
//! future change to accidentally wire up.
#![allow(clippy::unwrap_used, clippy::expect_used)]

/// Everything the counting path is made of.
const COUNTING_PATH: [(&str, &str); 4] = [
    ("counting/mod.rs", include_str!("../src/counting/mod.rs")),
    (
        "counting/listener.rs",
        include_str!("../src/counting/listener.rs"),
    ),
    (
        "counting/availability.rs",
        include_str!("../src/counting/availability.rs"),
    ),
    ("domain/sni.rs", include_str!("../src/domain/sni.rs")),
];

#[test]
fn the_counting_path_cannot_reach_the_frontend() {
    // If none of this is in scope, none of it can be called.
    for (name, source) in COUNTING_PATH {
        for reaching_out in [
            "tauri::",
            "use tauri",
            "emit(",
            "emit_all",
            "AppHandle",
            "WebviewWindow",
            "Window",
            "Notification",
            "notify",
        ] {
            assert!(
                !source.contains(reaching_out),
                "{name} mentions {reaching_out}: the counting path must have no way to \
                 reach the interface"
            );
        }
    }
}

#[test]
fn the_counting_path_serves_nothing_back() {
    let (_, listener) = COUNTING_PATH[1];

    for writing_back in ["write_all", "write(", "respond", "send("] {
        assert!(
            !listener.contains(writing_back),
            "the listener must never write to the connection: {writing_back}"
        );
    }
}

#[test]
fn a_reach_can_only_be_noted_and_nothing_else() {
    // The one thing the listener can do with what it read. A second method here
    // would be the beginning of a second destination for it.
    let (_, listener) = COUNTING_PATH[1];
    let trait_body = listener
        .split("pub trait NoteReach")
        .nth(1)
        .expect("the sink trait")
        .split('}')
        .next()
        .expect("its body");

    assert_eq!(trait_body.matches("fn ").count(), 1, "{trait_body}");
    assert!(trait_body.contains("fn note("));
}

#[test]
fn no_command_gives_the_interface_a_way_to_watch_for_reaches() {
    // FR-030b: nothing draws the person toward their reaches. In particular
    // there is no subscription, no poll, and no event.
    let commands = include_str!("../src/ipc/commands.rs");

    for watching in ["subscribe", "listen", "on_reach", "watch", "poll"] {
        assert!(!commands.contains(watching), "{watching}");
    }
}
