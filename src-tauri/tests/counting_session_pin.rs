//! Pinned, not specified: what starting a counting session does today, with a
//! history that opens.
//!
//! `begin_counting_session` was here before the delivery method. Slice
//! `history-by-site` changes what it does when the history cannot be opened
//! (R1), so what it does when it can is recorded first. Seam: `AppState::
//! start_counting`, the file the mark lives in, and the history read back.
//!
//! One `#[test]`: the counting session and the marking thread are process-wide.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg(all(unix, feature = "history"))]

use std::net::{Ipv4Addr, TcpListener};
use std::path::PathBuf;
use std::time::Duration;

use cairn::counting::presence::{Mark, MARK_FILE};
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

const LAST_SEEN: i64 = 1_700_000_000;
const NOW: i64 = LAST_SEEN + 5 * 3600;

struct Keychain;

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        Ok(Key::from_bytes([7u8; 32]))
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

#[test]
fn a_session_with_an_open_history_records_the_gap_since_the_last_mark_and_keeps_marking()
{
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();

    // Cairn was last seen five hours ago.
    Mark::at(&data).write(LAST_SEEN);

    let state = AppState {
        config: ConfigStore::at(&data),
        data_directory: data.clone(),
        credentials: Box::new(Keychain),
        categories: CategoryStore::at(&data),
        shipped_categories: PathBuf::from("none"),
        shipped_quotes: PathBuf::from("none.json"),
        hosts: Box::new(SystemHosts::at(&directory.path().join("hosts"))),
        helper: Box::new(Handing),
        elevation: Box::new(CannotRunHere),
        reserved: ReservedNames::default(),
        now: || NOW,
        roll: || 0,
    };
    let mut config = state.config.load().unwrap();
    config.intent = ProtectionIntent::On;
    state.config.save(&config).unwrap();

    state.start_counting().unwrap();
    assert!(session::is_running(), "the ports were handed over");

    // The gap since the last mark is in the record.
    let key = HistoryKey::Available(Key::from_bytes([7u8; 32]));
    let History::Open(history) = History::open(&data, &key) else {
        panic!("the history opens with this key");
    };
    let gaps = history.gaps_between(LAST_SEEN - 1, NOW + 1).unwrap();
    assert_eq!(gaps.len(), 1);
    assert_eq!((gaps[0].from, gaps[0].to), (LAST_SEEN, NOW));

    // And the mark is refreshed to now: Cairn is marking.
    let mut marked = None;
    for _ in 0..100 {
        marked = Mark::at(&data).read();
        if marked == Some(NOW) {
            break;
        }
        std::thread::sleep(Duration::from_millis(20));
    }
    assert_eq!(marked, Some(NOW), "{MARK_FILE} should be refreshed");

    session::stop();
}
