//! Cairn's own cost at 10,000 protected entries (FR-008).
//!
//! This measures the part Cairn controls: normalizing, emitting, splicing, and
//! verifying a list that size. It does **not** measure what SC-016 is actually
//! about — the resolution latency the operating system adds for an *unprotected*
//! site while 20,000 hosts lines are present. That number can only come from a
//! real machine per platform, and it is what research spike R7 (T011) exists to
//! produce. Nothing here should be read as having answered it.
//!
//! What this does catch is the failure that would make the spike moot: an
//! accidentally quadratic splice or verify, where 10,000 entries take minutes.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::time::Instant;

use cairn::domain::entries::{emit_hosts_body, Domain, LineEnding, ReachMode};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::domain::splice;

const ENTRIES: usize = 10_000;

/// Ten thousand entries, as preset categories would produce them.
fn at_scale() -> Vec<Domain> {
    let reserved = ReservedNames::default();
    let mut domains = Vec::with_capacity(ENTRIES);
    let mut index = 0usize;

    while domains.len() < ENTRIES {
        // Subdomains, so each is one entry rather than a root plus its www form.
        let input = format!("site{index}.example{}.test", index % 97);
        domains.extend(normalize(&input, &reserved).unwrap());
        index += 1;
    }
    domains.truncate(ENTRIES);
    domains
}

#[test]
fn ten_thousand_entries_are_written_and_read_back_quickly() {
    let domains = at_scale();
    let original = b"127.0.0.1 localhost\n::1 localhost\n# something else\n".to_vec();

    let started = Instant::now();
    let body = emit_hosts_body(&domains, ReachMode::Counted, LineEnding::Lf);
    let applied = splice::apply(&original, &body).unwrap();
    let elapsed = started.elapsed();

    // Two lines per entry: IPv4 and IPv6.
    let lines = applied.bytes.iter().filter(|byte| **byte == b'\n').count();
    assert!(lines >= ENTRIES * 2, "{lines} lines for {ENTRIES} entries");

    assert!(
        elapsed.as_millis() < 2_000,
        "writing {ENTRIES} entries took {elapsed:?} — something is quadratic"
    );
}

#[test]
fn the_surroundings_still_survive_at_scale() {
    // The byte-identity property is not something that holds only for small
    // files.
    let domains = at_scale();
    let original = b"127.0.0.1 localhost\n10.0.0.5 build-server".to_vec();

    let body = emit_hosts_body(&domains, ReachMode::Counted, LineEnding::Lf);
    let applied = splice::apply(&original, &body).unwrap();

    assert_eq!(
        splice::outside(&applied.bytes, applied.separator_added).unwrap(),
        original
    );
    assert_eq!(
        splice::remove(&applied.bytes, applied.separator_added).unwrap(),
        original
    );
}

#[test]
fn removing_ten_thousand_entries_is_not_slow_either() {
    let domains = at_scale();
    let original = b"127.0.0.1 localhost\n".to_vec();
    let body = emit_hosts_body(&domains, ReachMode::Counted, LineEnding::Lf);
    let applied = splice::apply(&original, &body).unwrap();

    let started = Instant::now();
    let removed = splice::remove(&applied.bytes, applied.separator_added).unwrap();
    let elapsed = started.elapsed();

    assert_eq!(removed, original);
    assert!(
        elapsed.as_millis() < 2_000,
        "removing {ENTRIES} entries took {elapsed:?}"
    );
}
