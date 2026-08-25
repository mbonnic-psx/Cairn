//! A loss of counting never reduces blocking.
//!
//! FR-028 and SC-010, and one of the four coverage areas the constitution names.
//! Silent mode is not a lesser kind of protection: it protects exactly the same
//! addresses, and the only difference is that nothing is listening on the other
//! end.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::counting::availability::Counting;
use cairn::domain::entries::{emit_hosts_body, Domain, LineEnding, ReachMode};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::enforcement::reach_mode::{choose, settle};
use cairn::store::config::{ChosenBy, ReachModeSetting};

fn protected() -> Vec<Domain> {
    let reserved = ReservedNames::default();
    ["example.com", "news.example", "social.example"]
        .iter()
        .flat_map(|input| normalize(input, &reserved).unwrap())
        .collect()
}

fn taken() -> Counting {
    Counting::Unavailable {
        because: "Something else on this machine is already using port 443, so Cairn is \
                  not counting the sites you reach for. Everything you have protected is \
                  still protected."
            .into(),
    }
}

#[test]
fn silent_mode_protects_exactly_the_same_addresses() {
    let entries = protected();
    let counted = emit_hosts_body(&entries, ReachMode::Counted, LineEnding::Lf);
    let silent = emit_hosts_body(&entries, ReachMode::Silent, LineEnding::Lf);

    let counted_names = names(&counted);
    let silent_names = names(&silent);

    assert_eq!(
        counted_names, silent_names,
        "the same addresses, either way"
    );
    assert_eq!(
        counted.iter().filter(|byte| **byte == b'\n').count(),
        silent.iter().filter(|byte| **byte == b'\n').count(),
        "and the same number of lines — IPv4 and IPv6 for each"
    );
}

fn names(body: &[u8]) -> Vec<String> {
    String::from_utf8_lossy(body)
        .lines()
        .filter_map(|line| line.split_whitespace().nth(1).map(str::to_string))
        .collect()
}

#[test]
fn silent_mode_points_nowhere_anything_can_answer() {
    let body = emit_hosts_body(&protected(), ReachMode::Silent, LineEnding::Lf);
    let text = String::from_utf8(body).unwrap();

    assert!(text.contains("0.0.0.0 example.com"));
    assert!(
        !text.contains("127.0.0.1"),
        "nothing is listening in silent mode"
    );
}

#[test]
fn a_port_conflict_drops_counting_and_nothing_else() {
    let settled = settle(&ReachModeSetting::default(), &taken());

    assert_eq!(settled.mode, ReachMode::Silent);
    assert_eq!(settled.chosen_by, ChosenBy::Automatic);
    assert!(settled.fallback_reason.is_some(), "and it says why");
}

#[test]
fn the_explanation_says_protection_is_untouched() {
    let settled = settle(&ReachModeSetting::default(), &taken());
    let reason = settled.fallback_reason.unwrap();

    assert!(
        reason.to_lowercase().contains("still protected"),
        "the sentence has to answer the real question: {reason}"
    );
    // One sentence, as FR-027 asks.
    assert_eq!(reason.matches(". ").count(), 1, "{reason}");
}

#[test]
fn choosing_silence_is_not_overturned_when_the_ports_free_up() {
    // FR-029: a person's own choice is not silently overwritten by a later
    // automatic check.
    let theirs = choose(ReachMode::Silent);
    let settled = settle(&theirs, &Counting::Available);

    assert_eq!(settled.mode, ReachMode::Silent);
    assert_eq!(settled.chosen_by, ChosenBy::Person);
}

#[test]
fn choosing_counting_is_honoured_when_the_ports_are_free() {
    let theirs = choose(ReachMode::Counted);
    let settled = settle(&theirs, &Counting::Available);

    assert_eq!(settled.mode, ReachMode::Counted);
    assert!(settled.fallback_reason.is_none());
}

#[test]
fn asking_for_counting_when_the_ports_are_taken_falls_back_rather_than_pretending() {
    let theirs = choose(ReachMode::Counted);
    let settled = settle(&theirs, &taken());

    assert_eq!(
        settled.mode,
        ReachMode::Silent,
        "it does not pretend to count"
    );
    assert_eq!(settled.chosen_by, ChosenBy::Automatic);
    assert!(settled.fallback_reason.is_some());
}
