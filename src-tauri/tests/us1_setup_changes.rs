//! Changing your mind before protection is on.
//!
//! The waiting period exists to slow down weakening a wall that is up
//! (FR-047). Before protection has been turned on there is no wall: nothing on
//! the machine is protected, so taking something off the list weakens nothing,
//! and making someone wait a day to untick a box they ticked a moment ago only
//! makes setup look broken (owner's decision, 2026-10-01).
//!
//! The other half matters as much. "Off" here means *verified* off: Cairn's
//! section is not on the machine. Where it is — a teardown that left residue,
//! or protection that is on — every reduction still waits, and asking still
//! changes nothing on the machine.
//!
//! Every **When** below enters through `AppState`, which is what the interface
//! calls. The helper is the real one, in-process, pointed at a temporary
//! machine, and it records every request it is asked.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use cairn::domain::entries::{CategoryId, Domain};
use cairn::domain::normalize::{normalize, ReservedNames};
use cairn::enforcement::apply::apply;
use cairn::enforcement::seed::{seed_missing_lists, CategoryStore};
use cairn::helper::HelperChannel;
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::protocol::{Request, Response};
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal, Trouble,
};
use cairn::store::config::{ConfigStore, ProtectionIntent};
use cairn_helper::dispatch;
use cairn_helper::heartbeat::ClockKeeper;
use cairn_helper::machine::Machine;

const ORIGINAL_HOSTS: &[u8] = b"127.0.0.1 localhost\n::1 localhost\n";

/// The real helper, remembering everything it was asked.
#[derive(Clone)]
struct RecordingHelper {
    machine: Arc<Machine>,
    clock: Arc<ClockKeeper>,
    asked: Arc<Mutex<Vec<Request>>>,
}

impl HelperChannel for RecordingHelper {
    fn ask(&self, request: Request) -> Result<Response, Trouble> {
        self.asked.lock().unwrap().push(request.clone());
        Ok(dispatch::handle(&self.machine, &self.clock, request))
    }
}

struct Keychain;

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        Ok(Key::from_bytes([7u8; 32]))
    }
    fn delete_history_key(&self) -> Outcome<()> {
        Ok(())
    }
}

struct Installed;

impl ElevationService for Installed {
    fn helper_status(&self) -> HelperStatus {
        HelperStatus::Installed {
            version: "test".into(),
        }
    }
    fn install_helper(&self) -> Outcome<HelperStatus> {
        Ok(self.helper_status())
    }
    fn uninstall_helper(&self) -> Outcome<Removal> {
        Ok(Removal::clean())
    }
}

struct Setup {
    _directory: tempfile::TempDir,
    state: AppState,
    helper: RecordingHelper,
    hosts_path: PathBuf,
}

impl Setup {
    fn hosts(&self) -> Vec<u8> {
        std::fs::read(&self.hosts_path).unwrap()
    }

    fn asked(&self) -> Vec<Request> {
        self.helper.asked.lock().unwrap().clone()
    }

    fn forget_what_was_asked(&self) {
        self.helper.asked.lock().unwrap().clear();
    }

    fn enabled(&self, id: CategoryId) -> bool {
        self.state
            .list_categories()
            .unwrap()
            .into_iter()
            .find(|preset| preset.id == id)
            .unwrap()
            .enabled
    }

    fn protected(&self, name: &str) -> bool {
        self.state
            .get_trail()
            .unwrap()
            .domains()
            .any(|domain| domain.as_str() == name)
    }

    /// Put the current trail into force on the machine, as turning protection
    /// on does, without starting a counting session this test has no use for.
    fn put_into_force(&self) {
        let mut config = self.state.config.load().unwrap();
        config.intent = ProtectionIntent::On;
        self.state.config.save(&config).unwrap();

        let entries: Vec<Domain> = config.trail.domains().cloned().collect();
        apply(
            &self.helper,
            &SystemHosts::at(&self.hosts_path),
            &entries,
            config.reach_mode.mode,
            1_700_000_000,
            Some(1_700_000_000),
        )
        .unwrap();
    }

    /// Protection was asked off, and the teardown left Cairn's section behind.
    fn intent_off_with_residue(&self) {
        self.put_into_force();
        let mut config = self.state.config.load().unwrap();
        config.intent = ProtectionIntent::Off;
        self.state.config.save(&config).unwrap();
    }
}

fn setup() -> Setup {
    let directory = tempfile::tempdir().unwrap();
    let hosts_path = directory.path().join("hosts");
    std::fs::write(&hosts_path, ORIGINAL_HOSTS).unwrap();

    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();

    let shipped =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");
    seed_missing_lists(&shipped, &CategoryStore::at(&data)).unwrap();

    let helper = RecordingHelper {
        machine: Arc::new(Machine::at(&hosts_path, &data)),
        clock: Arc::new(ClockKeeper::at(&data)),
        asked: Arc::default(),
    };

    let state = AppState {
        config: ConfigStore::at(&data),
        data_directory: data.clone(),
        credentials: Box::new(Keychain),
        categories: CategoryStore::at(&data),
        shipped_categories: shipped,
        hosts: Box::new(SystemHosts::at(&hosts_path)),
        helper: Box::new(helper.clone()),
        elevation: Box::new(Installed),
        reserved: ReservedNames::default(),
        now: || 1_700_000_000,
    };

    Setup {
        _directory: directory,
        state,
        helper,
        hosts_path,
    }
}

fn domain(name: &str) -> Domain {
    normalize(name, &ReservedNames::default())
        .unwrap()
        .into_iter()
        .next()
        .unwrap()
}

// --- Protection is off: nothing is protected, so nothing waits ------------------

#[test]
fn unticking_a_category_before_protection_is_on_takes_it_off_at_once() {
    // Given protection has never been turned on, and Streaming is ticked
    let setup = setup();
    setup
        .state
        .set_category_enabled(CategoryId::Streaming, true)
        .unwrap();
    assert!(setup.enabled(CategoryId::Streaming));
    setup.forget_what_was_asked();

    // When it is unticked
    let answer = setup
        .state
        .set_category_enabled(CategoryId::Streaming, false)
        .unwrap();

    // Then it is off, nothing waits, and the machine was not touched
    assert_eq!(answer, None, "nothing waits");
    assert!(
        !setup.enabled(CategoryId::Streaming),
        "the box stays unticked"
    );
    assert!(setup.state.get_trail().unwrap().entries.is_empty());
    assert_eq!(setup.state.get_pending_change().unwrap(), None);
    assert_eq!(setup.hosts(), ORIGINAL_HOSTS);
    assert!(
        setup.asked().is_empty(),
        "the helper was asked {:?}",
        setup.asked()
    );
}

#[test]
fn removing_an_address_before_protection_is_on_takes_it_off_at_once() {
    // Given protection has never been turned on, and an address was added
    let setup = setup();
    setup.state.add_custom_entry("example.com").unwrap();
    assert!(setup.protected("www.example.com"));
    setup.forget_what_was_asked();

    // When it is removed
    let answer = setup
        .state
        .remove_custom_entry(domain("example.com"))
        .unwrap();

    // Then it is gone with its www. form, nothing waits, and the machine was
    // not touched
    assert_eq!(answer, None, "nothing waits");
    assert!(!setup.protected("example.com"));
    assert!(!setup.protected("www.example.com"));
    assert_eq!(setup.state.get_pending_change().unwrap(), None);
    assert_eq!(setup.hosts(), ORIGINAL_HOSTS);
    assert!(
        setup.asked().is_empty(),
        "the helper was asked {:?}",
        setup.asked()
    );
}

#[test]
fn ticking_and_unticking_during_setup_leaves_nothing_behind_on_the_machine() {
    // Given protection has never been turned on
    let setup = setup();

    // When a category is ticked, an address added, and both taken back
    setup
        .state
        .set_category_enabled(CategoryId::Social, true)
        .unwrap();
    setup.state.add_custom_entry("example.com").unwrap();
    setup
        .state
        .set_category_enabled(CategoryId::Social, false)
        .unwrap();
    setup
        .state
        .remove_custom_entry(domain("example.com"))
        .unwrap();

    // Then the list is empty, and the machine is exactly as it was: the helper
    // was never asked anything, no backup was taken, nothing was inventoried
    let trail = setup.state.get_trail().unwrap();
    assert!(trail.entries.is_empty(), "{:?}", trail.entries);
    assert!(trail.enabled_categories.is_empty());
    assert_eq!(setup.hosts(), ORIGINAL_HOSTS);
    assert!(
        setup.asked().is_empty(),
        "the helper was asked {:?}",
        setup.asked()
    );
    assert!(!setup.helper.machine.inventory().path().exists());
    assert!(!setup
        .helper
        .machine
        .inventory()
        .backup_path(cairn::store::inventory::Target::SystemHosts)
        .exists());
}

#[test]
fn a_change_left_waiting_from_setup_is_settled_when_it_is_made_at_once() {
    // Given an untick that was left waiting while protection was off (the
    // behaviour before this was fixed), with Streaming still ticked
    let setup = setup();
    setup
        .state
        .set_category_enabled(CategoryId::Streaming, true)
        .unwrap();
    let mut config = setup.state.config.load().unwrap();
    config.pending_change = Some(cairn::domain::gate::PendingChange::request(
        cairn::domain::gate::PendingKind::DisableCategory {
            category: CategoryId::Streaming,
        },
        &cairn::domain::gate::TrustedClock::default(),
        1_700_000_000,
    ));
    setup.state.config.save(&config).unwrap();

    // When it is unticked again
    let answer = setup
        .state
        .set_category_enabled(CategoryId::Streaming, false)
        .unwrap();

    // Then it is off, and the old request is not left to land a day later on
    // a list that may have been ticked again since
    assert_eq!(answer, None);
    assert!(!setup.enabled(CategoryId::Streaming));
    assert_eq!(setup.state.get_pending_change().unwrap(), None);
}

// --- Protection is on: everything still waits -----------------------------------

#[test]
fn unticking_a_category_while_protection_is_on_waits_and_changes_nothing() {
    // Given Streaming is protected and in force
    let setup = setup();
    setup
        .state
        .set_category_enabled(CategoryId::Streaming, true)
        .unwrap();
    setup.put_into_force();
    let in_force = setup.hosts();
    setup.forget_what_was_asked();

    // When it is unticked
    let answer = setup
        .state
        .set_category_enabled(CategoryId::Streaming, false)
        .unwrap();

    // Then it waits, it is still protected, and nothing on the machine moved
    let pending = answer.expect("a change that waits");
    assert_eq!(pending.what, "Switch the Streaming list off");
    assert!(!pending.eligible_now);
    assert!(setup.enabled(CategoryId::Streaming));
    assert!(setup.state.get_pending_change().unwrap().is_some());
    assert_eq!(setup.hosts(), in_force);
    assert!(
        setup
            .asked()
            .iter()
            .all(|request| matches!(request, Request::ReadTrustedClock)),
        "asking only reads the clock: {:?}",
        setup.asked()
    );
}

#[test]
fn removing_an_address_while_protection_is_on_waits_and_changes_nothing() {
    // Given an address is protected and in force
    let setup = setup();
    setup.state.add_custom_entry("example.com").unwrap();
    setup.put_into_force();
    let in_force = setup.hosts();
    setup.forget_what_was_asked();

    // When it is removed
    let answer = setup
        .state
        .remove_custom_entry(domain("example.com"))
        .unwrap();

    // Then it waits, it is still protected, and nothing on the machine moved
    let pending = answer.expect("a change that waits");
    assert_eq!(pending.what, "Stop protecting example.com");
    assert!(setup.protected("example.com"));
    assert_eq!(setup.hosts(), in_force);
    assert!(
        setup
            .asked()
            .iter()
            .all(|request| matches!(request, Request::ReadTrustedClock)),
        "asking only reads the clock: {:?}",
        setup.asked()
    );
}

// --- Protection is meant to be off, but Cairn's section is still there ----------

#[test]
fn with_cairn_still_on_the_machine_an_untick_waits_even_though_protection_reads_off() {
    // Given protection was asked off, but its section is still on the machine
    let setup = setup();
    setup
        .state
        .set_category_enabled(CategoryId::Streaming, true)
        .unwrap();
    setup.intent_off_with_residue();
    let on_the_machine = setup.hosts();
    assert_ne!(
        on_the_machine, ORIGINAL_HOSTS,
        "the residue is really there"
    );

    // When a category is unticked, and an address removed
    let untick = setup
        .state
        .set_category_enabled(CategoryId::Streaming, false)
        .unwrap();

    // Then it waits: "off" is what the machine says, not what was intended
    assert!(untick.is_some(), "it waits");
    assert!(setup.enabled(CategoryId::Streaming));
    assert_eq!(setup.hosts(), on_the_machine);
}

#[test]
fn with_cairn_still_on_the_machine_removing_an_address_waits_too() {
    let setup = setup();
    setup.state.add_custom_entry("example.com").unwrap();
    setup.intent_off_with_residue();
    let on_the_machine = setup.hosts();

    let answer = setup
        .state
        .remove_custom_entry(domain("example.com"))
        .unwrap();

    assert!(answer.is_some(), "it waits");
    assert!(setup.protected("example.com"));
    assert_eq!(setup.hosts(), on_the_machine);
}
