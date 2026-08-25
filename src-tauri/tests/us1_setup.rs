//! User story 1, end to end: someone chooses what to protect, turns protection
//! on, and it goes into force.
//!
//! The helper here is the real one — the same verb dispatch the privileged
//! process runs, pointed at a temporary file. Nothing is stubbed between the
//! orchestration and the bytes on disk, so what this proves is what would
//! happen on a machine.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use cairn::domain::entries::{
    CategoryId, Domain, ProtectedEntry, ReachMode, SourceRef, Trail,
};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::enforcement::apply::{apply, current_state};
use cairn::enforcement::seed::{seed_missing_lists, CategoryStore};
use cairn::enforcement::state::ProtectionStatus;
use cairn::helper::HelperChannel;
use cairn::platform::hosts::SystemHosts;
use cairn::protocol::{Request, Response};
use cairn::services::{HostsService, Trouble};
use cairn_helper::dispatch;
use cairn_helper::heartbeat::ClockKeeper;
use cairn_helper::machine::Machine;

/// The real helper, in-process, on a temporary machine.
struct LocalHelper {
    machine: Machine,
    clock: ClockKeeper,
}

impl HelperChannel for LocalHelper {
    fn ask(&self, request: Request) -> Result<Response, Trouble> {
        Ok(dispatch::handle(&self.machine, &self.clock, request))
    }
}

struct Setup {
    _directory: tempfile::TempDir,
    helper: LocalHelper,
    hosts: SystemHosts,
    hosts_path: std::path::PathBuf,
    data: std::path::PathBuf,
}

fn setup() -> Setup {
    let directory = tempfile::tempdir().unwrap();
    let hosts_path = directory.path().join("hosts");
    std::fs::write(&hosts_path, b"127.0.0.1 localhost\n::1 localhost\n").unwrap();

    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();

    Setup {
        helper: LocalHelper {
            machine: Machine::at(&hosts_path, &data),
            clock: ClockKeeper::at(&data),
        },
        hosts: SystemHosts::at(&hosts_path),
        hosts_path,
        data,
        _directory: directory,
    }
}

/// What someone would have chosen: one category, one address they typed
/// themselves — with a scheme, a port, a path, and shouting.
fn a_trail() -> Trail {
    let reserved = ReservedNames::default();
    let mut trail = Trail::default();

    for domain in normalize("social.example", &reserved).unwrap() {
        trail.insert(ProtectedEntry::new(
            domain,
            SourceRef::Category(CategoryId::Social),
        ));
    }
    for domain in normalize("HTTPS://Example.COM:8443/feed?x=1", &reserved).unwrap() {
        trail.insert(ProtectedEntry::new(domain, SourceRef::Custom));
    }
    trail.enabled_categories.insert(CategoryId::Social);
    trail
}

fn domains(trail: &Trail) -> Vec<Domain> {
    trail.domains().cloned().collect()
}

#[test]
fn what_was_typed_is_stored_as_a_bare_domain_with_its_www_form() {
    let trail = a_trail();
    let stored: Vec<&str> = trail.domains().map(Domain::as_str).collect();

    assert!(stored.contains(&"example.com"), "{stored:?}");
    assert!(stored.contains(&"www.example.com"), "{stored:?}");
    assert!(
        !stored
            .iter()
            .any(|name| name.contains(':') || name.contains('/')),
        "no scheme, no port, no path: {stored:?}"
    );
}

#[test]
fn the_same_address_in_another_form_adds_nothing() {
    let mut trail = a_trail();
    let before = trail.entries.len();

    for domain in normalize("example.com./", &ReservedNames::default()).unwrap() {
        trail.insert(ProtectedEntry::new(domain, SourceRef::Custom));
    }

    assert_eq!(
        trail.entries.len(),
        before,
        "one entry, however it was typed"
    );
}

#[test]
fn protection_goes_into_force_and_is_confirmed_by_reading_it_back() {
    let setup = setup();
    let trail = a_trail();
    let entries = domains(&trail);

    let applied = apply(
        &setup.helper,
        &setup.hosts,
        &entries,
        ReachMode::Counted,
        1_700_000_000,
        Some(1_700_000_000),
    )
    .unwrap();

    assert_eq!(applied.state.status, ProtectionStatus::InForce);
    assert_eq!(applied.state.entry_count_verified, entries.len());
    assert!(
        applied.state.verified_at.is_some(),
        "confirmed, not assumed"
    );

    // And the file really does carry both address families for every entry.
    let written = std::fs::read_to_string(&setup.hosts_path).unwrap();
    for domain in &entries {
        assert!(written.contains(&format!("127.0.0.1 {domain}")), "{domain}");
        assert!(written.contains(&format!("::1 {domain}")), "{domain}");
    }
}

#[test]
fn what_was_already_in_the_file_is_left_exactly_as_it_was() {
    let setup = setup();
    let original = std::fs::read(&setup.hosts_path).unwrap();

    apply(
        &setup.helper,
        &setup.hosts,
        &domains(&a_trail()),
        ReachMode::Counted,
        1_700_000_000,
        None,
    )
    .unwrap();

    let after = std::fs::read(&setup.hosts_path).unwrap();
    let separator_added = setup
        .helper
        .machine
        .inventory()
        .load()
        .unwrap()
        .separator_added(cairn::store::inventory::Target::SystemHosts);

    assert_eq!(
        cairn::domain::splice::outside(&after, separator_added).unwrap(),
        original
    );
}

#[test]
fn protection_is_never_reported_from_a_write_that_returned_success() {
    // FR-012. Something edits the file straight after Cairn wrote it; the next
    // read-back is what the interface shows, and it does not say protected.
    let setup = setup();
    let entries = domains(&a_trail());

    apply(
        &setup.helper,
        &setup.hosts,
        &entries,
        ReachMode::Counted,
        1_700_000_000,
        None,
    )
    .unwrap();

    std::fs::write(&setup.hosts_path, b"127.0.0.1 localhost\n").unwrap();

    let state = current_state(&setup.hosts, &entries, 1_700_000_100, None);
    assert_ne!(state.status, ProtectionStatus::InForce);
    assert!(!state.summary().is_empty());
}

#[test]
fn silent_mode_protects_exactly_the_same_addresses() {
    // FR-028: a loss of counting never reduces protection.
    let setup = setup();
    let entries = domains(&a_trail());

    let applied = apply(
        &setup.helper,
        &setup.hosts,
        &entries,
        ReachMode::Silent,
        1_700_000_000,
        None,
    )
    .unwrap();

    assert_eq!(applied.state.status, ProtectionStatus::InForce);
    assert_eq!(applied.state.entry_count_verified, entries.len());

    let written = std::fs::read_to_string(&setup.hosts_path).unwrap();
    assert!(written.contains("0.0.0.0 example.com"));
    assert!(
        !written.contains("127.0.0.1 example.com"),
        "nothing listens"
    );
}

#[test]
fn the_shipped_lists_are_copied_once_and_then_belong_to_the_person() {
    let setup = setup();
    let store = CategoryStore::at(&setup.data);
    let shipped =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");

    let copied = seed_missing_lists(&shipped, &store).unwrap();
    assert_eq!(copied.len(), 9, "all nine categories: {copied:?}");

    // The person takes something out of their copy.
    let mut theirs = store.load(CategoryId::Social).unwrap().unwrap();
    let removed = theirs.domains.pop().unwrap();
    theirs.edited = true;
    store.save(CategoryId::Social, &theirs).unwrap();

    // Starting again does not put it back.
    let copied_again = seed_missing_lists(&shipped, &store).unwrap();
    assert!(copied_again.is_empty(), "nothing is copied over their copy");

    let after = store.load(CategoryId::Social).unwrap().unwrap();
    assert!(
        !after.domains.contains(&removed),
        "what they removed stays removed"
    );
    assert!(after.edited);
}

#[test]
fn every_shipped_list_normalizes_cleanly() {
    // A seed entry that cannot be normalized would be an entry that silently
    // never protects anything.
    let shipped =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");
    let reserved = ReservedNames::default();

    for category in CategoryId::ALL {
        let bytes =
            std::fs::read(shipped.join(format!("{}.json", category.slug()))).unwrap();
        let seed: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        let domains = seed["domains"].as_array().unwrap();

        assert!(!domains.is_empty(), "{} ships nothing", category.label());
        for domain in domains {
            let name = domain.as_str().unwrap();
            assert!(
                normalize(name, &reserved).is_ok(),
                "{} ships {name}, which Cairn would turn away",
                category.label()
            );
        }
    }
}

#[test]
fn nothing_is_written_to_the_machine_before_the_person_confirms() {
    // The disclosure step is what runs before this; what matters here is that
    // building the trail touches nothing at all.
    let setup = setup();
    let before = std::fs::read(&setup.hosts_path).unwrap();

    let trail = a_trail();
    let _ = setup.hosts.verify(&domains(&trail)).unwrap();

    assert_eq!(std::fs::read(&setup.hosts_path).unwrap(), before);
    assert!(
        !setup.helper.machine.inventory().path().exists(),
        "nothing has been recorded, because nothing has been done"
    );
}
