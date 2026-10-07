//! Slice `first-counted`, scenarios 1, 2 (refused sockets) and 3: a counting
//! session that is accepting and storing is the first count.
//!
//! The counting session and the marking thread are process-wide, so these
//! scenarios share one lock and each stops the session it started.
#![allow(clippy::unwrap_used, clippy::expect_used)]
#![cfg(all(unix, feature = "history"))]

use std::net::{Ipv4Addr, TcpListener};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::sync::{Arc, Mutex};

use cairn::counting::session;
use cairn::domain::dates::LocalDate;
use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::{Handover, HelperChannel, NoHelper};
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::protocol::{Request, Response};
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal, Trouble,
};
use cairn::store::config::{ConfigStore, ProtectionIntent};
use cairn::store::history::HISTORY_FILE;

const T0: i64 = 1_790_000_000;
const DAY: i64 = 86_400;

static ONE_SESSION: Mutex<()> = Mutex::new(());
static CLOCK: AtomicI64 = AtomicI64::new(T0);

fn clock() -> i64 {
    CLOCK.load(Ordering::SeqCst)
}

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

fn state(
    directory: &Path,
    data: &Path,
    key_works: &Arc<AtomicBool>,
    helper: Box<dyn HelperChannel>,
) -> AppState {
    let state = AppState {
        config: ConfigStore::at(data),
        data_directory: data.to_path_buf(),
        credentials: Box::new(Keychain(Arc::clone(key_works))),
        categories: CategoryStore::at(data),
        shipped_categories: PathBuf::from("none"),
        shipped_quotes: PathBuf::from("none.json"),
        hosts: Box::new(SystemHosts::at(directory.join("hosts"))),
        helper,
        elevation: Box::new(CannotRunHere),
        reserved: ReservedNames::default(),
        now: clock,
        roll: || 0,
    };
    let mut config = state.config.load().unwrap();
    config.intent = ProtectionIntent::On;
    state.config.save(&config).unwrap();
    state
}

fn today_bounds(at: i64) -> (LocalDate, i64, i64) {
    let days = at.div_euclid(DAY);
    (
        LocalDate::from_days_since_epoch(days),
        days * DAY,
        days * DAY + DAY,
    )
}

fn first_counted_by_all_three(state: &AppState, at: i64) -> [Option<i64>; 3] {
    let (day, start, end) = today_bounds(at);
    let offsets = [cairn::ipc::state::OffsetChange {
        from: start - 3 * DAY,
        offset: 0,
    }];
    let range = state.summarize_reaches(
        LocalDate::from_days_since_epoch(day.days_since_epoch() - 3),
        day,
        start - 3 * DAY,
        end,
        &offsets,
    );
    [
        range.first_counted,
        state.list_todays_reaches(start, end).first_counted,
        state.get_day(day, start, end).first_counted,
    ]
}

// Scenario 1
#[test]
fn a_session_that_is_accepting_and_storing_is_the_first_count_and_a_later_one_leaves_it()
{
    let _one = ONE_SESSION.lock().unwrap_or_else(|p| p.into_inner());
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    let key_works = Arc::new(AtomicBool::new(true));
    let state = state(directory.path(), &data, &key_works, Box::new(Handing));

    CLOCK.store(T0, Ordering::SeqCst);
    state.start_counting().unwrap();
    assert!(session::is_running());
    assert_eq!(first_counted_by_all_three(&state, T0), [Some(T0); 3]);
    session::stop();

    CLOCK.store(T0 + DAY, Ordering::SeqCst);
    state.start_counting().unwrap();
    assert!(session::is_running());
    assert_eq!(
        first_counted_by_all_three(&state, T0 + DAY),
        [Some(T0); 3],
        "a second start does not move it"
    );
    session::stop();
}

// Scenario 2: a helper that refuses the sockets
#[test]
fn a_helper_that_refuses_the_sockets_leaves_every_answer_at_null() {
    let _one = ONE_SESSION.lock().unwrap_or_else(|p| p.into_inner());
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    let key_works = Arc::new(AtomicBool::new(true));
    let state = state(directory.path(), &data, &key_works, Box::new(NoHelper));

    CLOCK.store(T0, Ordering::SeqCst);
    state.start_counting().unwrap();

    assert!(!session::is_running());
    assert_eq!(first_counted_by_all_three(&state, T0), [None; 3]);
}

// Scenario 3
#[test]
fn a_sealed_first_run_writes_nothing_and_the_next_start_is_the_first_count() {
    let _one = ONE_SESSION.lock().unwrap_or_else(|p| p.into_inner());
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    let key_works = Arc::new(AtomicBool::new(false));
    let state = state(directory.path(), &data, &key_works, Box::new(Handing));

    CLOCK.store(T0, Ordering::SeqCst);
    state.start_counting().unwrap();
    assert!(session::is_running());
    session::stop();
    assert!(
        !data.join(HISTORY_FILE).exists(),
        "a sealed first run writes no history.db"
    );
    assert_eq!(first_counted_by_all_three(&state, T0), [None; 3]);

    let t1 = T0 + 6 * 3600;
    key_works.store(true, Ordering::SeqCst);
    CLOCK.store(t1, Ordering::SeqCst);
    state.start_counting().unwrap();

    assert_eq!(first_counted_by_all_three(&state, t1), [Some(t1); 3]);
    // The gap [T0, T1) is recorded, and no answer states any of it.
    let (day, start, end) = today_bounds(t1);
    let todays = state.list_todays_reaches(start, end);
    let viewed = state.get_day(day, start, end);
    assert!(todays.gaps.is_empty() && todays.coverage_note.is_none());
    assert!(viewed.gaps.is_empty() && viewed.coverage_note.is_none());
    use cairn::store::history::{History, OpenHistory};
    use cairn::store::key::HistoryKey;
    let History::Open(history) =
        History::open(&data, &HistoryKey::Available(Key::from_bytes([7u8; 32])))
    else {
        panic!("the history opens with this key");
    };
    let _: &OpenHistory = &history;
    let gaps = history.gaps_between(T0 - 1, t1 + 1).unwrap();
    assert_eq!(
        gaps.iter()
            .map(|gap| (gap.from, gap.to))
            .collect::<Vec<_>>(),
        vec![(T0, t1)]
    );
    session::stop();
}
