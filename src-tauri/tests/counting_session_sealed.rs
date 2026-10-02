//! Time nothing was stored is never read as time Cairn saw (R1; Principle III,
//! FR-022). A session that starts while the history is sealed drops the gap and
//! every reach, so it must not refresh the mark: the next start that can open
//! the history then records the gap covering the whole stretch.
//!
//! One `#[test]`: the counting session and the marking thread are process-wide.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg(all(unix, feature = "history"))]

use std::net::{Ipv4Addr, TcpListener};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use cairn::counting::presence::Mark;
use cairn::counting::session;
use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::{Handover, HelperChannel};
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::protocol::{Request, Response};
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal, Trouble,
};
use cairn::store::config::{ConfigStore, ProtectionIntent};
use cairn::store::history::History;
use cairn::store::key::HistoryKey;

const FIRST: i64 = 1_700_000_000;
const SECOND: i64 = FIRST + 3 * 3600;
const THIRD: i64 = SECOND + 4 * 3600;

static CLOCK: AtomicI64 = AtomicI64::new(FIRST);

fn clock() -> i64 {
    CLOCK.load(Ordering::SeqCst)
}

/// A credential store whose key can be made unavailable and available again.
struct Keychain(Arc<AtomicBool>);

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        if self.0.load(Ordering::SeqCst) {
            Ok(Key::from_bytes([7u8; 32]))
        } else {
            Err(KeyUnavailable::Locked)
        }
    }
    fn delete_history_key(&self) -> Outcome<()> {
        Ok(())
    }
}

struct Handing;

impl HelperChannel for Handing {
    fn ask(&self, _request: Request) -> Result<Response, Trouble> {
        Err(Trouble::new("this test helper answers no verbs"))
    }
    fn take_counting_sockets(&self) -> Result<Handover, Trouble> {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        Ok(Handover::Took(vec![listener]))
    }
}

struct CannotRunHere;

impl ElevationService for CannotRunHere {
    fn helper_status(&self) -> HelperStatus {
        HelperStatus::Unsupported {
            because: "not on this machine".into(),
        }
    }
    fn install_helper(&self) -> Outcome<HelperStatus> {
        Err(Trouble::new("Not on this machine."))
    }
    fn uninstall_helper(&self) -> Outcome<Removal> {
        Ok(Removal::clean())
    }
}

/// Give a marking thread time to do whatever it is going to do.
fn settle() {
    std::thread::sleep(Duration::from_millis(300));
}

#[test]
fn starts_that_could_not_store_leave_the_mark_so_the_next_good_start_records_all_of_it() {
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();

    let key_works = Arc::new(AtomicBool::new(false));
    let state = AppState {
        config: ConfigStore::at(&data),
        data_directory: data.clone(),
        credentials: Box::new(Keychain(Arc::clone(&key_works))),
        categories: CategoryStore::at(&data),
        shipped_categories: PathBuf::from("none"),
        shipped_quotes: PathBuf::from("none.json"),
        hosts: Box::new(SystemHosts::at(directory.path().join("hosts"))),
        helper: Box::new(Handing),
        elevation: Box::new(CannotRunHere),
        reserved: ReservedNames::default(),
        now: clock,
        roll: || 0,
    };
    let mut config = state.config.load().unwrap();
    config.intent = ProtectionIntent::On;
    state.config.save(&config).unwrap();

    // A first run with the key unavailable. Cairn is counting but cannot store
    // anything: the time from here on is time it did not see.
    CLOCK.store(FIRST, Ordering::SeqCst);
    state.start_counting().unwrap();
    assert!(session::is_running());
    settle();
    assert_eq!(
        Mark::at(&data).read(),
        Some(FIRST),
        "the unseen time starts at the first start"
    );
    session::stop();

    // Three hours later, still unavailable. Nothing was stored in between, so
    // the mark must not move to now.
    CLOCK.store(SECOND, Ordering::SeqCst);
    state.start_counting().unwrap();
    settle();
    assert_eq!(
        Mark::at(&data).read(),
        Some(FIRST),
        "a session that stored nothing must not mark the time as seen"
    );
    session::stop();

    // Four hours after that the key is back. The gap covers all of it.
    key_works.store(true, Ordering::SeqCst);
    CLOCK.store(THIRD, Ordering::SeqCst);
    state.start_counting().unwrap();

    let key = HistoryKey::Available(Key::from_bytes([7u8; 32]));
    let History::Open(history) = History::open(&data, &key) else {
        panic!("the history opens once the key is back");
    };
    let gaps = history.gaps_between(FIRST - 1, THIRD + 1).unwrap();
    assert_eq!(
        gaps.iter()
            .map(|gap| (gap.from, gap.to))
            .collect::<Vec<_>>(),
        vec![(FIRST, THIRD)],
        "the whole time nothing was stored is one gap"
    );

    session::stop();
}
