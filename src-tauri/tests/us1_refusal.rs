//! An entry that would break the machine, or Cairn itself, is turned away — and
//! the sentence that comes back can be shown to a person exactly as written.
//!
//! FR-007 and FR-050. The refusal has to be useful: it says what to try
//! instead, and it never uses the vocabulary of failure.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::Trail;
use cairn::domain::normalize::{RejectionKind, ReservedNames};
use cairn::enforcement::trail::add_custom_entry;

fn this_machine() -> ReservedNames {
    ReservedNames::with_hostname("someones-laptop")
}

#[test]
fn the_names_the_machine_needs_are_refused_with_an_explanation() {
    let mut trail = Trail::default();

    for input in [
        "localhost",
        "http://localhost:3000",
        "ip6-localhost",
        "broadcasthost",
        "someones-laptop",
        "printer.local",
    ] {
        let rejection = add_custom_entry(&mut trail, input, &this_machine())
            .expect_err(&format!("{input} keeps this machine working"));

        assert_eq!(
            rejection.kind,
            RejectionKind::KeepsTheMachineWorking,
            "{input}"
        );
        assert!(
            rejection.reason.contains("Cairn keeps"),
            "{input}: {}",
            rejection.reason
        );
        assert!(trail.entries.is_empty(), "{input}: nothing was protected");
    }
}

#[test]
fn a_refusal_never_uses_the_vocabulary_of_failure() {
    // SC-019 as a runtime check on the strings that reach a person from here.
    const NEVER: [&str; 7] = [
        "failed",
        "fail",
        "denied",
        "violation",
        "relapsed",
        "forbidden",
        "you lost",
    ];

    let mut trail = Trail::default();
    for input in [
        "",
        "localhost",
        "not a domain",
        "192.168.0.1",
        "*.example.com",
    ] {
        let rejection = add_custom_entry(&mut trail, input, &this_machine()).unwrap_err();
        let lowered = rejection.reason.to_lowercase();
        for word in NEVER {
            assert!(
                !lowered.contains(word),
                "the reason for {input:?} says {word:?}: {}",
                rejection.reason
            );
        }
    }
}

#[test]
fn a_refusal_says_what_to_try_instead() {
    let mut trail = Trail::default();

    let rejection =
        add_custom_entry(&mut trail, "notadomain", &this_machine()).unwrap_err();
    assert!(
        rejection.reason.contains("example.com"),
        "a refusal without a way forward is just a wall: {}",
        rejection.reason
    );
}

#[test]
fn an_address_that_is_taken_is_protected_along_with_its_www_form() {
    let mut trail = Trail::default();

    let taken = add_custom_entry(
        &mut trail,
        "  HTTPS://Example.com/some/path  ",
        &this_machine(),
    )
    .unwrap();

    let names: Vec<&str> = taken.iter().map(|domain| domain.as_str()).collect();
    assert_eq!(names, vec!["example.com", "www.example.com"]);
    assert_eq!(trail.entries.len(), 2);
}

#[test]
fn nothing_is_half_added_when_an_entry_is_turned_away() {
    let mut trail = Trail::default();
    add_custom_entry(&mut trail, "example.com", &this_machine()).unwrap();
    let before = trail.clone();

    let _ = add_custom_entry(&mut trail, "localhost", &this_machine()).unwrap_err();

    assert_eq!(trail, before, "the trail is exactly as it was");
}
