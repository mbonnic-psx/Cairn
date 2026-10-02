//! Cairn's own cost of a range at two years of history (SC-006, T041; slice
//! `history-by-site`, scenario 11).
//!
//! Two years at 50 reaches a day across 300 sites, read through
//! `AppState::summarize_reaches` for the whole two years.
//!
//! This measures the part Cairn controls: reading the range from the
//! encrypted history and counting it by site. It does **not** measure what
//! SC-006 is actually about, which is how fast the screen feels to a person on
//! their own machine: that needs the screen, a real window and a real disk, and
//! nothing here should be read as having answered it. What it does catch is an
//! accidentally quadratic path, where two years take minutes.
//!
//! The hours (slice `history-by-hour`, scenario 15) are counted in the same
//! pass, against London's five offsets for the two years, and the bound is
//! unchanged. So are the days of the week and how many of each the range holds
//! (slice `history-by-weekday`, scenario 18): the days are counted in the same
//! pass, and the bound is unchanged. So are the rows of the days (slice
//! `history-movement`, scenario 23): 105 weekly rows, in the same pass and under
//! the same bound.
//!
//! The history is written before the clock starts, through the store's own
//! connection layer, and the bound is 1 000 ms, as `at_scale.rs` bounds its
//! own cost. In a debug build the bound is the same as in release.
#![cfg(feature = "history")]
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::{Path, PathBuf};
use std::time::Instant;

use cairn::domain::dates::LocalDate;
use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::state::OffsetChange;
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal,
};
use cairn::store::config::ConfigStore;
use cairn::store::history::{History, HISTORY_FILE};
use cairn::store::key::HistoryKey;

const A_KEY: [u8; 32] = [7u8; 32];
const HOUR: i64 = 3_600;
const DAY: i64 = 86_400;
const DAYS: i64 = 730;
const REACHES_A_DAY: i64 = 50;
const SITES: i64 = 300;

struct Keychain;

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        Ok(Key::from_bytes(A_KEY))
    }
    fn delete_history_key(&self) -> Outcome<()> {
        Ok(())
    }
}

struct NoElevation;

impl ElevationService for NoElevation {
    fn helper_status(&self) -> HelperStatus {
        HelperStatus::NotInstalled
    }
    fn install_helper(&self) -> Outcome<HelperStatus> {
        Ok(HelperStatus::NotInstalled)
    }
    fn uninstall_helper(&self) -> Outcome<Removal> {
        Ok(Removal::clean())
    }
}

fn date(text: &str) -> LocalDate {
    serde_json::from_str(&format!("\"{text}\"")).unwrap()
}

/// Two years of history, written in one transaction so that seeding is not
/// what the test spends its time on.
fn seed(data: &Path, first_midnight: i64) {
    let History::Open(open) =
        History::open(data, &HistoryKey::Available(Key::from_bytes(A_KEY)))
    else {
        panic!("a fresh directory with a good key should open");
    };
    drop(open);

    let mut connection = rusqlite::Connection::open(data.join(HISTORY_FILE)).unwrap();
    let hex: String = A_KEY.iter().map(|byte| format!("{byte:02x}")).collect();
    connection
        .pragma_update(None, "key", format!("x'{hex}'"))
        .unwrap();
    let transaction = connection.transaction().unwrap();
    {
        let mut insert = transaction
            .prepare("INSERT INTO reaches (domain, at) VALUES (?1, ?2)")
            .unwrap();
        for day in 0..DAYS {
            for reach in 0..REACHES_A_DAY {
                // Spread across the day and across the 300 sites, so no one
                // site holds them all.
                let site = (day * 7 + reach * 13) % SITES;
                let at = first_midnight + day * DAY + reach * 60 + 1;
                insert
                    .execute(rusqlite::params![format!("site{site}.example"), at])
                    .unwrap();
            }
        }
    }
    transaction.commit().unwrap();
}

#[test]
fn two_years_by_site_and_hour_are_read_quickly() {
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();

    let first_day = date("2024-10-01");
    let last_day = date("2026-09-30");
    // London's local midnights: both ends are in summer time, so the range is
    // exactly 730 days of seconds, with four clock changes inside it.
    let range_start = first_day.days_since_epoch() * DAY - HOUR;
    let range_end = range_start + DAYS * DAY;
    assert_eq!(
        range_end,
        date("2026-10-01").days_since_epoch() * DAY - HOUR,
        "two years, from the first midnight to the one after the last"
    );
    let london = [
        (range_start, HOUR),
        (1_729_990_800, 0),
        (1_743_296_400, HOUR),
        (1_761_440_400, 0),
        (1_774_746_000, HOUR),
    ]
    .map(|(from, offset)| OffsetChange { from, offset });
    seed(&data, range_start);

    let shipped = Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");
    let state = AppState {
        config: ConfigStore::at(&data),
        data_directory: data.clone(),
        credentials: Box::new(Keychain),
        categories: CategoryStore::at(&data),
        shipped_categories: shipped,
        shipped_quotes: PathBuf::from("no-quotes-here.json"),
        hosts: Box::new(SystemHosts::at(directory.path().join("hosts"))),
        helper: Box::new(NoHelper),
        elevation: Box::new(NoElevation),
        reserved: ReservedNames::default(),
        now: || 1_790_726_400 + 20 * 3600,
        roll: || 0,
    };

    let started = Instant::now();
    let patterns =
        state.summarize_reaches(first_day, last_day, range_start, range_end, &london);
    let elapsed = started.elapsed();

    assert_eq!(patterns.sealed, None);
    let total: u32 = patterns.by_site.iter().map(|site| site.count).sum();
    assert_eq!(
        i64::from(total),
        DAYS * REACHES_A_DAY,
        "every reach in the range is in a count"
    );
    assert_eq!(patterns.by_site.len() as i64, SITES);
    assert_eq!(patterns.by_hour.len(), 24);
    let in_hours: u32 = patterns.by_hour.iter().map(|hour| hour.count).sum();
    assert_eq!(
        i64::from(in_hours),
        DAYS * REACHES_A_DAY,
        "every reach in the range is in an hour"
    );
    assert_eq!(patterns.by_weekday.len(), 7);
    let in_weekdays: u32 = patterns.by_weekday.iter().map(|day| day.count).sum();
    assert_eq!(
        i64::from(in_weekdays),
        DAYS * REACHES_A_DAY,
        "every reach in the range is on a day of the week"
    );
    let days_held: u32 = patterns.by_weekday.iter().map(|day| day.days).sum();
    assert_eq!(i64::from(days_held), DAYS, "the two years' 730 days");
    // Two years are 105 weekly rows, holding every reach.
    assert_eq!(patterns.movement.len() as i64, (DAYS + 6) / 7);
    assert!(patterns
        .movement
        .iter()
        .all(|row| row.span == cairn::domain::patterns::Span::Week));
    let in_rows: u32 = patterns.movement.iter().map(|row| row.count).sum();
    assert_eq!(
        i64::from(in_rows),
        DAYS * REACHES_A_DAY,
        "every reach in the range is in a row"
    );
    assert!(
        elapsed.as_millis() < 1_000,
        "two years by site, hour and day took {elapsed:?} - something is quadratic"
    );
}
