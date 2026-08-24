//! Normalization and deduplication — the first of the four mandatory coverage
//! areas the constitution names.
//!
//! Table-driven on purpose: every row is a form a person might actually type,
//! and the table is the specification of what "one entry, one form" means.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{
    emit_hosts_body, CategoryId, Domain, LineEnding, ProtectedEntry, ReachMode,
    SourceRef, Trail,
};
use cairn::domain::normalize::{normalize, Rejection, RejectionKind, ReservedNames};

fn plain() -> ReservedNames {
    ReservedNames::default()
}

fn names(result: Result<Vec<Domain>, Rejection>) -> Vec<String> {
    result
        .expect("entry should be accepted")
        .into_iter()
        .map(|domain| domain.to_string())
        .collect()
}

#[test]
fn strips_scheme_port_path_and_case() {
    let cases = [
        ("example.com", vec!["example.com", "www.example.com"]),
        (
            "https://example.com",
            vec!["example.com", "www.example.com"],
        ),
        (
            "http://example.com/",
            vec!["example.com", "www.example.com"],
        ),
        (
            "https://EXAMPLE.com:8443/some/path?q=1#frag",
            vec!["example.com", "www.example.com"],
        ),
        ("  Example.COM  ", vec!["example.com", "www.example.com"]),
        ("example.com.", vec!["example.com", "www.example.com"]),
        (
            "https://user:secret@example.com/x",
            vec!["example.com", "www.example.com"],
        ),
    ];

    for (input, expected) in cases {
        assert_eq!(
            names(normalize(input, &plain())),
            expected,
            "input: {input}"
        );
    }
}

#[test]
fn a_root_entry_brings_its_www_form() {
    assert_eq!(
        names(normalize("example.com", &plain())),
        vec!["example.com", "www.example.com"]
    );
}

#[test]
fn typing_the_www_form_yields_the_same_pair() {
    // The two forms can never drift apart, whichever one was typed.
    assert_eq!(
        names(normalize("www.example.com", &plain())),
        names(normalize("example.com", &plain()))
    );
}

#[test]
fn a_subdomain_is_protected_as_typed() {
    // Cairn does not invent www.m.example.com — nobody asked for it.
    assert_eq!(
        names(normalize("m.example.com", &plain())),
        vec!["m.example.com"]
    );
}

#[test]
fn a_non_ascii_name_is_stored_the_way_the_resolver_sees_it() {
    let stored = names(normalize("café.example", &plain()));
    assert!(
        stored.iter().all(|name| name.is_ascii()),
        "punycode expected, got {stored:?}"
    );
    // And the same name typed in its encoded form is the same entry.
    assert_eq!(stored, names(normalize("xn--caf-dma.example", &plain())));
}

#[test]
fn entries_that_are_not_addresses_are_turned_away_with_a_reason() {
    let cases = [
        ("", RejectionKind::Empty),
        ("   ", RejectionKind::Empty),
        ("notadomain", RejectionKind::SingleWord),
        ("192.168.1.1", RejectionKind::IpAddress),
        ("[::1]", RejectionKind::IpAddress),
        ("*.example.com", RejectionKind::Wildcard),
        ("exa mple.com", RejectionKind::NotAnAddress),
        ("-example.com", RejectionKind::NotAnAddress),
        ("example-.com", RejectionKind::NotAnAddress),
        ("example..com", RejectionKind::NotAnAddress),
    ];

    for (input, kind) in cases {
        let rejection = normalize(input, &plain())
            .expect_err(&format!("{input} should not be taken"));
        assert_eq!(rejection.kind, kind, "input: {input}");
        assert!(!rejection.reason.is_empty());
    }
}

#[test]
fn a_rejection_reason_can_be_shown_to_a_person_as_written() {
    // FR-050: the vocabulary of failure is not available to us.
    const BANNED: [&str; 6] = [
        "failed",
        "denied",
        "violation",
        "relapsed",
        "forbidden",
        "invalid",
    ];

    for input in [
        "",
        "notadomain",
        "192.168.1.1",
        "*.example.com",
        "exa mple.com",
    ] {
        let reason = normalize(input, &plain())
            .expect_err("should not be taken")
            .reason;
        let lowered = reason.to_lowercase();
        for word in BANNED {
            assert!(
                !lowered.contains(word),
                "reason for {input:?} says {word:?}: {reason}"
            );
        }
    }
}

#[test]
fn entries_that_would_break_the_machine_are_refused_and_explained() {
    let reserved = ReservedNames::with_hostname("my-laptop");
    let cases = [
        "localhost",
        "LOCALHOST",
        "localhost.localdomain",
        "broadcasthost",
        "ip6-localhost",
        "printer.local",
        "something.localhost",
        "my-laptop",
    ];

    for input in cases {
        let rejection = normalize(input, &reserved).expect_err(&format!(
            "{input} keeps the machine working and must be refused"
        ));
        assert_eq!(
            rejection.kind,
            RejectionKind::KeepsTheMachineWorking,
            "input: {input}"
        );
        assert!(rejection.reason.contains("Cairn keeps"), "input: {input}");
    }
}

#[test]
fn the_same_entry_from_two_sources_is_one_entry_with_two_reasons() {
    let mut trail = Trail::default();
    for domain in normalize("example.com", &plain()).unwrap() {
        trail.insert(ProtectedEntry::new(
            domain,
            SourceRef::Category(CategoryId::Social),
        ));
    }
    for domain in normalize("https://EXAMPLE.com/feed", &plain()).unwrap() {
        trail.insert(ProtectedEntry::new(domain, SourceRef::Custom));
    }

    assert_eq!(trail.entries.len(), 2, "example.com and www.example.com");
    let root = trail
        .entries
        .iter()
        .find(|entry| entry.domain.as_str() == "example.com")
        .expect("root entry");
    assert_eq!(root.sources.len(), 2, "two reasons to protect it");
}

#[test]
fn removing_one_source_does_not_unprotect_what_another_still_needs() {
    let mut trail = Trail::default();
    let domains = normalize("example.com", &plain()).unwrap();
    for domain in &domains {
        trail.insert(ProtectedEntry::new(
            domain.clone(),
            SourceRef::Category(CategoryId::Social),
        ));
        trail.insert(ProtectedEntry::new(domain.clone(), SourceRef::Custom));
    }

    trail.remove_source(&SourceRef::Category(CategoryId::Social));

    assert_eq!(trail.entries.len(), 2, "the custom entry still needs both");

    trail.remove_source(&SourceRef::Custom);
    assert!(trail.entries.is_empty(), "nothing needs them now");
}

#[test]
fn every_entry_is_written_as_an_ipv4_and_ipv6_pair() {
    // A name that resolves over IPv6 is not blocked by an IPv4 line alone.
    let domains = normalize("example.com", &plain()).unwrap();
    let body = emit_hosts_body(&domains, ReachMode::Counted, LineEnding::Lf);
    let text = String::from_utf8(body).unwrap();

    assert_eq!(text.lines().count(), 4, "two entries, two lines each");
    assert!(text.contains("127.0.0.1 example.com"));
    assert!(text.contains("::1 example.com"));
    assert!(text.contains("127.0.0.1 www.example.com"));
    assert!(text.contains("::1 www.example.com"));
}

#[test]
fn silent_mode_blocks_with_an_address_nothing_listens_on() {
    let domains = normalize("example.com", &plain()).unwrap();
    let text =
        String::from_utf8(emit_hosts_body(&domains, ReachMode::Silent, LineEnding::Lf))
            .unwrap();

    assert!(text.contains("0.0.0.0 example.com"));
    assert!(text.contains(":: example.com"));
    assert!(
        !text.contains("127.0.0.1"),
        "nothing to connect to in silent mode"
    );
}

#[test]
fn hosts_lines_follow_the_files_own_line_endings() {
    let domains = normalize("example.com", &plain()).unwrap();
    let crlf = emit_hosts_body(&domains, ReachMode::Counted, LineEnding::Crlf);
    assert!(crlf.windows(2).any(|pair| pair == b"\r\n"));
    assert!(
        !emit_hosts_body(&domains, ReachMode::Counted, LineEnding::Lf).contains(&b'\r')
    );
}
