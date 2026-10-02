//! Slice `history-by-site`: a range of days, by site, through the driving port.
//!
//! `specs/003-reflection-and-history/slices/history-by-site/plan.md`, *Acceptance,
//! as scenarios through the driving port*, 1 to 8, 10 and 12. Each **When**
//! enters through `AppState::summarize_reaches`, as the IPC command serves it,
//! and each **Then** is observed in what it returns. Scenario 9 (each bound at
//! its edge) is in `range_bounds.rs`; the screen's are in `src/`.
//!
//! The history-reading scenarios need the history store and are compiled only
//! with it; the build that keeps none has its own, at the end.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use cairn::domain::dates::LocalDate;
use cairn::domain::normalize::ReservedNames;
use cairn::enforcement::seed::CategoryStore;
use cairn::helper::NoHelper;
use cairn::ipc::state::{OffsetChange, Patterns};
use cairn::ipc::AppState;
use cairn::platform::hosts::SystemHosts;
use cairn::services::{
    CredentialStore, ElevationService, HelperStatus, Key, KeyUnavailable, Outcome,
    Removal,
};
use cairn::store::config::ConfigStore;

const A_KEY: [u8; 32] = [7u8; 32];

#[cfg(feature = "history")]
const HOUR: i64 = 3600;
const DAY: i64 = 86_400;

fn date(text: &str) -> LocalDate {
    serde_json::from_str(&format!("\"{text}\"")).unwrap()
}

fn midnight(day: LocalDate) -> i64 {
    day.days_since_epoch() * DAY
}

/// The plan's fixed range: 2026-09-03 to 2026-09-30, bounds as the interface
/// computes them (here in UTC).
fn first_day() -> LocalDate {
    date("2026-09-03")
}
fn last_day() -> LocalDate {
    date("2026-09-30")
}
fn range_start() -> i64 {
    midnight(first_day())
}
fn range_end() -> i64 {
    midnight(date("2026-10-01"))
}
#[derive(Clone)]
struct Keychain {
    available: Arc<AtomicBool>,
}

impl Keychain {
    fn available() -> Self {
        Keychain {
            available: Arc::new(AtomicBool::new(true)),
        }
    }
    #[cfg(feature = "history")]
    fn set_available(&self, on: bool) {
        self.available.store(on, Ordering::SeqCst);
    }
}

impl CredentialStore for Keychain {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        if self.available.load(Ordering::SeqCst) {
            Ok(Key::from_bytes(A_KEY))
        } else {
            Err(KeyUnavailable::Locked)
        }
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

struct Setup {
    directory: tempfile::TempDir,
    data: PathBuf,
}

fn setup() -> Setup {
    let directory = tempfile::tempdir().unwrap();
    let data = directory.path().join("cairn-data");
    std::fs::create_dir_all(&data).unwrap();
    Setup { directory, data }
}

fn app(setup: &Setup, keychain: &Keychain) -> AppState {
    let shipped = Path::new(env!("CARGO_MANIFEST_DIR")).join("resources/categories");
    AppState {
        config: ConfigStore::at(&setup.data),
        data_directory: setup.data.clone(),
        credentials: Box::new(keychain.clone()),
        categories: CategoryStore::at(&setup.data),
        shipped_categories: shipped,
        shipped_quotes: PathBuf::from("no-quotes-here.json"),
        hosts: Box::new(SystemHosts::at(setup.directory.path().join("hosts"))),
        helper: Box::new(NoHelper),
        elevation: Box::new(NoElevation),
        reserved: ReservedNames::default(),
        now: || 1_790_726_400 + 20 * 3600,
        roll: || 0,
    }
}

/// The offsets of a range in UTC: one entry, the offset `range_start` implies.
fn offsets_of(range_start: i64) -> Vec<OffsetChange> {
    vec![OffsetChange {
        from: range_start,
        offset: 0,
    }]
}

fn summarize(state: &AppState) -> Patterns {
    state.summarize_reaches(
        first_day(),
        last_day(),
        range_start(),
        range_end(),
        &offsets_of(range_start()),
    )
}

#[cfg(feature = "history")]
fn sites(patterns: &Patterns) -> Vec<(&str, u32)> {
    patterns
        .by_site
        .iter()
        .map(|site| (site.domain.as_str(), site.count))
        .collect()
}

/// The voice rule (SC-019, FR-031) and the ranking words (H3): every sentence
/// these tests see.
#[cfg(feature = "history")]
fn assert_in_voice(sentence: &str) {
    assert!(!sentence.trim().is_empty(), "a sentence says something");
    let lower = sentence.to_lowercase();
    for banned in [
        "failed",
        "fail",
        "denied",
        "violation",
        "relapse",
        "forbidden",
        "you lost",
        "worst",
        "top ",
        "rank",
    ] {
        assert!(
            !lower.contains(banned),
            "{sentence:?} carries the word {banned:?}"
        );
    }
}

// --- Scenario 12: the wire shape ---------------------------------------------

#[test]
fn the_answer_serialises_to_exactly_eight_keys() {
    let state_setup = setup();
    let state = app(&state_setup, &Keychain::available());
    let value = serde_json::to_value(summarize(&state)).unwrap();
    let mut keys: Vec<&str> = value
        .as_object()
        .expect("an object")
        .keys()
        .map(String::as_str)
        .collect();
    keys.sort_unstable();
    assert_eq!(
        keys,
        [
            "by_hour",
            "by_site",
            "by_weekday",
            "coverage_note",
            "dst_approximate",
            "estimates_excluded",
            "gaps",
            "sealed"
        ],
        "no movement: nothing computed it"
    );
}

// --- Scenarios 1–9, against the history ----------------------------------------

#[cfg(feature = "history")]
mod with_history {
    use super::*;

    use cairn::ipc::state::{HourCount, WeekdayCount};
    use cairn::store::history::{CoverageGap, History, OpenHistory};
    use cairn::store::key::HistoryKey;

    fn seed(data: &Path) -> OpenHistory {
        let History::Open(open) =
            History::open(data, &HistoryKey::Available(Key::from_bytes(A_KEY)))
        else {
            panic!("a fresh directory with a good key should open");
        };
        open
    }

    /// Reaches at a site: `count` of them, spread through the day `day`.
    fn reach(history: &OpenHistory, domain: &str, day: &str, count: i64) {
        let start = midnight(date(day));
        for index in 0..count {
            history.record(domain, start + 60 * (index + 1)).unwrap();
        }
    }

    /// The plan's history: `a.example` x5, `c.example` x2, `b.example` x2 in
    /// the range, one reach a second before it and one at its end.
    fn the_plans_reaches(history: &OpenHistory) {
        reach(history, "a.example", "2026-09-05", 3);
        reach(history, "a.example", "2026-09-28", 2);
        reach(history, "c.example", "2026-09-10", 2);
        reach(history, "b.example", "2026-09-29", 2);
        history.record("a.example", range_start() - 1).unwrap();
        history.record("a.example", range_end()).unwrap();
    }

    // Scenario 1
    #[test]
    fn sites_come_most_first_with_the_edges_of_the_range_left_out() {
        let setup = setup();
        the_plans_reaches(&seed(&setup.data));
        let state = app(&setup, &Keychain::available());

        let patterns = summarize(&state);

        assert_eq!(
            sites(&patterns),
            [("a.example", 5), ("b.example", 2), ("c.example", 2)],
            "most first, equal counts by name; the reaches outside \
             [range_start, range_end) are in no count"
        );
        assert_eq!(patterns.sealed, None);
    }

    // Scenario 2
    #[test]
    fn changing_the_range_and_back_gives_the_first_answer_again() {
        let setup = setup();
        the_plans_reaches(&seed(&setup.data));
        let state = app(&setup, &Keychain::available());

        let four_weeks = summarize(&state);
        let last_week = state.summarize_reaches(
            date("2026-09-24"),
            last_day(),
            midnight(date("2026-09-24")),
            range_end(),
            &offsets_of(midnight(date("2026-09-24"))),
        );
        let again = summarize(&state);

        assert_eq!(sites(&last_week), [("a.example", 2), ("b.example", 2)]);
        assert_eq!(again, four_weeks);
        assert_eq!(sites(&again)[0], ("a.example", 5));
    }

    // Scenario 3
    #[test]
    fn the_answer_is_the_same_with_and_without_journal_entries() {
        let setup = setup();
        let history = seed(&setup.data);
        the_plans_reaches(&history);
        let state = app(&setup, &Keychain::available());
        let without = summarize(&state);
        assert_eq!(
            sites(&without).len(),
            3,
            "complete with no entry ever written"
        );

        for day in ["2026-09-05", "2026-09-10", "2026-09-29"] {
            history
                .save_entry(date(day), "Something I wrote.", 1)
                .unwrap();
        }

        assert_eq!(summarize(&state), without);
    }

    // Scenario 4
    #[test]
    fn a_quiet_range_is_empty_and_says_nothing_else() {
        let setup = setup();
        let _ = seed(&setup.data);
        let state = app(&setup, &Keychain::available());

        let patterns = summarize(&state);

        assert_eq!(
            patterns,
            Patterns {
                by_site: Vec::new(),
                by_hour: (0..24).map(|hour| HourCount { hour, count: 0 }).collect(),
                // Four weeks: four of each day, none reached.
                by_weekday: (0..7)
                    .map(|weekday| WeekdayCount {
                        weekday,
                        count: 0,
                        days: 4
                    })
                    .collect(),
                gaps: Vec::new(),
                coverage_note: None,
                estimates_excluded: 0,
                dst_approximate: false,
                sealed: None,
            }
        );
    }

    // Scenario 5
    #[test]
    fn gaps_are_cut_to_the_range_and_stated_as_about_these_days() {
        let setup = setup();
        let history = seed(&setup.data);
        // Two days before the range to six hours into it; and three hours
        // inside it.
        history
            .record_gap(&CoverageGap {
                from: range_start() - 2 * DAY,
                to: range_start() + 6 * HOUR,
            })
            .unwrap();
        let inside = range_start() + 10 * DAY;
        history
            .record_gap(&CoverageGap {
                from: inside,
                to: inside + 3 * HOUR,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = summarize(&state);

        let spans: Vec<(i64, i64)> =
            patterns.gaps.iter().map(|gap| (gap.from, gap.to)).collect();
        assert_eq!(
            spans,
            [
                (range_start(), range_start() + 6 * HOUR),
                (inside, inside + 3 * HOUR)
            ],
            "the first cut to begin at range_start"
        );
        let note = patterns.coverage_note.expect("a note");
        assert!(note.contains("9 hours"), "about nine hours: {note}");
        assert!(note.to_lowercase().contains("these days"), "{note}");
        assert!(!note.to_lowercase().contains("today"), "{note}");
        assert_in_voice(&note);
    }

    #[test]
    fn a_range_wholly_inside_a_gap_is_not_answered_as_a_zero() {
        let setup = setup();
        let history = seed(&setup.data);
        history
            .record_gap(&CoverageGap {
                from: range_start() - 5 * DAY,
                to: range_end() + 5 * DAY,
            })
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = summarize(&state);

        assert!(patterns.by_site.is_empty());
        assert_eq!(patterns.gaps.len(), 1);
        assert_eq!(
            (patterns.gaps[0].from, patterns.gaps[0].to),
            (range_start(), range_end())
        );
        let note = patterns.coverage_note.expect("a note");
        assert!(note.contains("28 days"), "{note}");
    }

    // Scenario 6
    #[test]
    fn an_estimate_is_counted_by_its_date_and_is_in_no_site() {
        let setup = setup();
        let history = seed(&setup.data);
        the_plans_reaches(&history);
        let state = app(&setup, &Keychain::available());
        let reaches_alone = summarize(&state);

        // On the first and last days of the range, and the day either side.
        history.save_estimate(date("2026-09-03"), 4).unwrap();
        history.save_estimate(date("2026-09-30"), 9).unwrap();
        history.save_estimate(date("2026-09-02"), 6).unwrap();
        history.save_estimate(date("2026-10-01"), 7).unwrap();

        let patterns = summarize(&state);

        assert_eq!(patterns.estimates_excluded, 2);
        assert_eq!(patterns.by_site, reaches_alone.by_site);
        assert_eq!(reaches_alone.estimates_excluded, 0);
    }

    // Scenario 7
    #[test]
    fn a_deleted_day_is_not_a_gap() {
        let setup = setup();
        let history = seed(&setup.data);
        the_plans_reaches(&history);
        let deleted = date("2026-09-05");
        history
            .delete_reach_history(midnight(deleted), midnight(deleted) + DAY)
            .unwrap();
        let state = app(&setup, &Keychain::available());

        let patterns = summarize(&state);

        assert_eq!(
            sites(&patterns),
            [("a.example", 2), ("b.example", 2), ("c.example", 2)],
            "only what remains"
        );
        assert!(patterns.gaps.is_empty());
        assert_eq!(patterns.coverage_note, None);
    }

    // Scenario 8
    #[test]
    fn a_sealed_history_says_so_and_shows_no_range() {
        let setup = setup();
        the_plans_reaches(&seed(&setup.data));
        let keychain = Keychain::available();
        keychain.set_available(false);
        let state = app(&setup, &keychain);

        let patterns = summarize(&state);

        let sentence = patterns.sealed.expect("the sealed sentence");
        assert_in_voice(&sentence);
        assert!(patterns.by_site.is_empty());
        assert!(patterns.gaps.is_empty());
        assert_eq!(patterns.coverage_note, None);
        assert_eq!(patterns.estimates_excluded, 0);
    }

    #[test]
    fn a_history_that_opens_but_cannot_be_read_is_sealed_never_empty() {
        let setup = setup();
        let history = seed(&setup.data);
        the_plans_reaches(&history);
        drop(history);
        // A reach whose time is not a whole number: it opens, and the read of
        // the range cannot make sense of it.
        let connection = rusqlite::Connection::open(
            setup.data.join(cairn::store::history::HISTORY_FILE),
        )
        .unwrap();
        let hex: String = A_KEY.iter().map(|byte| format!("{byte:02x}")).collect();
        connection
            .pragma_update(None, "key", format!("x'{hex}'"))
            .unwrap();
        connection
            .execute(
                "INSERT INTO reaches (domain, at) VALUES ('odd.example', ?1)",
                [range_start() as f64 + 0.5],
            )
            .unwrap();
        drop(connection);
        let state = app(&setup, &Keychain::available());

        let patterns = summarize(&state);

        let sentence = patterns
            .sealed
            .expect("a read that does not go through is never an empty range");
        assert_in_voice(&sentence);
        assert!(patterns.by_site.is_empty());
        assert!(patterns.gaps.is_empty());
        assert_eq!(patterns.coverage_note, None);
    }

    // Scenario 9, through the port (the edges are held in `range_bounds.rs`)
    #[test]
    fn a_range_that_is_not_the_range_is_refused_with_one_plain_sentence() {
        let setup = setup();
        the_plans_reaches(&seed(&setup.data));
        let state = app(&setup, &Keychain::available());
        let refused = |patterns: Patterns| {
            let sentence = patterns.sealed.expect("refused");
            assert_in_voice(&sentence);
            assert!(patterns.by_site.is_empty(), "nothing else is returned");
            assert!(patterns.gaps.is_empty());
            assert_eq!(patterns.coverage_note, None);
            sentence
        };

        let first_after_last = state.summarize_reaches(
            last_day(),
            first_day(),
            range_start(),
            range_end(),
            &offsets_of(range_start()),
        );
        let bad_start = state.summarize_reaches(
            first_day(),
            last_day(),
            range_start() + 13 * HOUR,
            range_end(),
            &offsets_of(range_start() + 13 * HOUR),
        );
        let a_day_short = state.summarize_reaches(
            first_day(),
            last_day(),
            range_start(),
            range_end() - DAY,
            &offsets_of(range_start()),
        );
        let offsets_over_three_hours_apart = state.summarize_reaches(
            first_day(),
            last_day(),
            range_start(),
            range_end() + 3 * HOUR + 1,
            &offsets_of(range_start()),
        );
        let tomorrow = date("2026-10-01");
        let not_begun = state.summarize_reaches(
            tomorrow,
            tomorrow,
            midnight(tomorrow),
            midnight(tomorrow) + DAY,
            &offsets_of(midnight(tomorrow)),
        );

        let sentences: Vec<String> = [
            first_after_last,
            bad_start,
            a_day_short,
            offsets_over_three_hours_apart,
            not_begun,
        ]
        .into_iter()
        .map(refused)
        .collect();
        assert!(sentences.iter().all(|one| one == &sentences[0]));

        // And a range holding a 23-hour day is accepted: offsets one hour apart.
        let accepted = state.summarize_reaches(
            first_day(),
            last_day(),
            range_start(),
            range_end() - HOUR,
            &offsets_of(range_start()),
        );
        assert_eq!(accepted.sealed, None);
    }
}

// --- Scenario 10: a build without the history -----------------------------------

#[cfg(not(feature = "history"))]
#[test]
fn a_build_without_the_history_says_so() {
    let setup = setup();
    let state = app(&setup, &Keychain::available());

    let patterns = summarize(&state);

    assert_eq!(
        patterns.sealed.as_deref(),
        Some("This build of Cairn does not keep a history. Protection is unaffected.")
    );
    assert!(patterns.by_site.is_empty());
    assert!(patterns.gaps.is_empty());
    assert_eq!(patterns.coverage_note, None);
}
