//! What the interface can ask for, as plain Rust.
//!
//! Deliberately free of Tauri: the commands in `ipc::commands` are one-line
//! wrappers over these methods, so everything the interface can do is testable
//! without a window.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::counting::availability::Counting;
use crate::domain::dates::LocalDate;
use crate::domain::entries::{CategoryId, Domain, ReachMode, Trail};
use crate::domain::gate::{PendingChange, PendingKind, TrustedClock};
use crate::domain::normalize::{Rejection, ReservedNames};
use crate::domain::patterns::MovementRow;
use crate::enforcement::apply::{apply, current_state};
use crate::enforcement::reach_mode;
use crate::enforcement::reduce;
use crate::enforcement::seed::{seed_missing_lists, CategoryStore};
use crate::enforcement::state::ProtectionState;
use crate::enforcement::teardown::{tear_down, TeardownReport};
use crate::enforcement::trail::{add_custom_entry, enable_category};
use crate::helper::HelperChannel;
use crate::protocol::{Request, Response};
use crate::services::{
    Capability, ElevationService, HelperStatus, HostsService, Trouble,
};
use crate::store::config::{
    ChosenBy, Config, ConfigStore, ProtectionIntent, QuoteOfTheDay, ReachModeSetting,
};
use crate::store::gaps::Gap;

/// The reach history's file name. Known here without the history feature so
/// deleting a person's data never depends on whether this build can read it.
const HISTORY_FILE: &str = "history.db";

/// A category as the interface shows it.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct CategoryPreset {
    pub id: CategoryId,
    pub label: String,
    pub enabled: bool,
    /// How many addresses are in the person's own copy.
    pub entry_count: usize,
    /// True once they have changed it.
    pub edited: bool,
}

/// What Cairn says plainly about what it does and does not cover.
///
/// Principle III, FR-009a, FR-017, FR-018. This is not a footnote: it is a
/// first-class part of the interface, and it is assembled from what is actually
/// true on this machine rather than from a fixed string.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Disclosures {
    /// Protections in force in this release.
    pub in_force: Vec<String>,
    /// What is not covered, named rather than implied.
    pub not_covered: Vec<String>,
    /// Whether the background component is installed, and what it is for.
    pub helper: String,
    /// What encryption at rest protects against, and what it does not.
    pub encryption: String,
    /// The administrator caveat, stated plainly (FR-017).
    pub administrator: String,
}

/// A change that is waiting, as the interface shows it.
///
/// The time left is a rough phrase rather than a countdown: a ticking number is
/// something to come back and watch, which is the opposite of what a waiting
/// period is for (FR-047e).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct PendingView {
    pub id: String,
    /// What it would do, in plain words.
    pub what: String,
    pub time_remaining: String,
    pub eligible_now: bool,
}

/// One reach, as the interface shows it: where, and when. Nothing else exists
/// to show.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct ReachView {
    pub domain: String,
    pub at: i64,
}

/// A day's reaches, with what Cairn did not see.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct TodaysReaches {
    pub reaches: Vec<ReachView>,
    pub gaps: Vec<Gap>,
    /// Shown above the list when part of the day was not observed (FR-030).
    pub coverage_note: Option<String>,
    /// When Cairn first counted, in epoch seconds; `null` when it never has,
    /// or the history is sealed (slice `first-counted`).
    pub first_counted: Option<i64>,
    /// Present when the history could not be opened. Protection is unaffected,
    /// and the sentence says so (FR-036).
    pub sealed: Option<String>,
}

/// One day, whole, as the check-in shows it (`contracts/ui-ipc.md`, `get_day`).
///
/// It carries only what this build can state truthfully. `is_skipped` and
/// `needs_estimate` join it when the single-day screen derives them (T052);
/// until then their absence says nothing was computed, where a `false` would
/// claim it had been.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct DayView {
    pub reaches: Vec<ReachView>,
    pub gaps: Vec<Gap>,
    /// Shown beside the reaches when part of the day was not observed (FR-030).
    pub coverage_note: Option<String>,
    /// What the person wrote for this day, if anything. Never when it was
    /// written (FR-026a).
    pub entry: Option<String>,
    /// The person's own estimate for a silent day.
    pub estimate: Option<u32>,
    /// When Cairn first counted, in epoch seconds; `null` when it never has,
    /// or the history is sealed (slice `first-counted`).
    pub first_counted: Option<i64>,
    /// Present when the history could not be opened or read. Then nothing
    /// else is, and the interface shows this sentence and offers no space to
    /// write (FR-029).
    pub sealed: Option<String>,
}

impl DayView {
    fn sealed(sentence: String) -> Self {
        DayView {
            reaches: Vec::new(),
            gaps: Vec::new(),
            coverage_note: None,
            entry: None,
            estimate: None,
            first_counted: None,
            sealed: Some(sentence),
        }
    }
}

/// One site and how many times it was reached for in a range.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct SiteCount {
    pub domain: String,
    pub count: u32,
}

/// One hour of the day and how many times a site was reached for in it.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct HourCount {
    /// 0 to 23, by the computer's clock at the reach's own instant.
    pub hour: u8,
    pub count: u32,
}

/// One day of the week, how many times a site was reached for on it, and how
/// many of that day the range holds (gaps review W4).
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct WeekdayCount {
    /// 0 (Monday) to 6 (Sunday), as `LocalDate::weekday` numbers them: not
    /// `Date.getDay`'s Sunday-first. Which day a week begins on is the
    /// interface's to choose, and is never sent (W2).
    pub weekday: u8,
    /// Reaches on this weekday, by the computer's clock at each reach's own
    /// instant.
    pub count: u32,
    /// How many days of this weekday the range holds, so that the count and
    /// its evenness describe the same range. 0 when the range holds none.
    pub days: u32,
}

/// The offset the computer's clock takes from `from` on, as the interface
/// sends it (`contracts/ui-ipc.md`, amended in slice `history-by-hour`). Whole
/// seconds east of UTC. Wide integers, so that a value no zone has is refused
/// as a range Cairn cannot place rather than failing to be read at all.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct OffsetChange {
    pub from: i64,
    pub offset: i64,
}

/// A range of days, by site, by hour and by day of the week
/// (`contracts/ui-ipc.md`, `summarize_reaches`, as amended in slices
/// `history-by-site`, `history-by-hour` and `history-by-weekday`).
///
/// It carries only what this build can state truthfully. `movement` is the
/// rows of the days (slice `history-movement`).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Patterns {
    /// Most first; equal counts by domain name, A to Z.
    pub by_site: Vec<SiteCount>,
    /// Exactly 24, hour 0 to 23 ascending, zeros included; empty only when
    /// `sealed`, where 24 zeros would read as a quiet range.
    pub by_hour: Vec<HourCount>,
    /// Exactly 7, `weekday` 0 (Monday) to 6 (Sunday) ascending, zeros
    /// included; empty only when `sealed`, where seven zeros would read as a
    /// quiet range (W6, FR-024).
    pub by_weekday: Vec<WeekdayCount>,
    /// One row per date (or per week for a long range), oldest first, each
    /// with its count, how much of it Cairn saw and whether it is not over;
    /// empty only when `sealed`, where rows at zero would read as a quiet range.
    pub movement: Vec<MovementRow>,
    /// Each cut to the part inside the range.
    pub gaps: Vec<Gap>,
    /// The gaps in one sentence, about the range.
    pub coverage_note: Option<String>,
    /// How many days in the range hold the person's own estimate, which has
    /// no site and no hour, and so is in no list (FR-023).
    pub estimates_excluded: u32,
    /// When Cairn first counted, in epoch seconds; `null` when it never has,
    /// or the history is sealed (slice `first-counted`).
    pub first_counted: Option<i64>,
    /// Always `false`. It was R4's flag for one offset applied across a clock
    /// change; under gaps review B4 every hour is bucketed by the offset in
    /// force at its instant, so none is approximate. It stays on the wire so
    /// that it says so. The interface does not read it.
    pub dst_approximate: bool,
    /// Present when the history could not be opened or read, or the range was
    /// not one Cairn could place. Then nothing else is.
    pub sealed: Option<String>,
}

impl Patterns {
    fn sealed(sentence: String) -> Self {
        Patterns {
            by_site: Vec::new(),
            by_hour: Vec::new(),
            by_weekday: Vec::new(),
            movement: Vec::new(),
            gaps: Vec::new(),
            coverage_note: None,
            estimates_excluded: 0,
            first_counted: None,
            dst_approximate: false,
            sealed: Some(sentence),
        }
    }
}

/// What a build without the history says wherever a day would be.
#[cfg(not(feature = "history"))]
const NO_HISTORY: &str =
    "This build of Cairn does not keep a history. Protection is unaffected.";

/// Everything the interface talks to.
pub struct AppState {
    pub config: ConfigStore,
    /// The person's own data directory. Reach history lives here, encrypted.
    pub data_directory: PathBuf,
    pub credentials: Box<dyn crate::services::CredentialStore>,
    pub categories: CategoryStore,
    pub shipped_categories: PathBuf,
    /// The set of lines Cairn ships for the check-in, beside the application.
    /// Read, never written, and never copied into the person's data.
    pub shipped_quotes: PathBuf,
    pub hosts: Box<dyn HostsService>,
    pub helper: Box<dyn HelperChannel>,
    pub elevation: Box<dyn ElevationService>,
    pub reserved: ReservedNames,
    /// Supplied rather than read, so the same journey can be replayed in a test.
    pub now: fn() -> i64,
    /// A fresh random number on each call, supplied for the same reason: a
    /// test chooses the line (slice `quote`, Q1).
    pub roll: fn() -> u64,
}

impl AppState {
    /// Copy the shipped lists on first run, and answer with what is there.
    pub fn ensure_seeded(&self) -> Result<(), Trouble> {
        let mut config = self.config.load()?;
        seed_missing_lists(&self.shipped_categories, &self.categories)?;
        if !config.seeded {
            config.seeded = true;
            self.config.save(&config)?;
        }
        Ok(())
    }

    pub fn get_trail(&self) -> Result<Trail, Trouble> {
        Ok(self.config.load()?.trail)
    }

    pub fn list_categories(&self) -> Result<Vec<CategoryPreset>, Trouble> {
        let config = self.config.load()?;
        let mut presets = Vec::with_capacity(CategoryId::ALL.len());

        for id in CategoryId::ALL {
            let list = self.categories.load(id)?;
            presets.push(CategoryPreset {
                id,
                label: id.label().to_string(),
                enabled: config.trail.enabled_categories.contains(&id),
                entry_count: list.as_ref().map(|list| list.domains.len()).unwrap_or(0),
                edited: list.map(|list| list.edited).unwrap_or(false),
            });
        }
        Ok(presets)
    }

    /// Turning a category on protects more, so it applies at once (FR-048).
    ///
    /// Turning one off protects less, so it becomes a pending change and waits
    /// (FR-047) — unless nothing is in force yet, in which case there is no
    /// wall to weaken and it comes off at once (see [`Self::reduce`]). The
    /// same command handles every case, and the answer says which happened.
    pub fn set_category_enabled(
        &self,
        id: CategoryId,
        on: bool,
    ) -> Result<Option<PendingView>, Trouble> {
        if !on {
            return self.reduce(PendingKind::DisableCategory { category: id });
        }

        let mut config = self.config.load()?;
        let list = self.categories.load(id)?.ok_or_else(|| {
            Trouble::new(format!(
                "Cairn does not have your {} list yet. It will be there next time you \
                 open Cairn.",
                id.label()
            ))
        })?;

        enable_category(&mut config.trail, id, &list.domains, &self.reserved);
        self.config.save(&config)?;
        self.reapply(&config)?;
        Ok(None)
    }

    /// The single reduction path (FR-047).
    ///
    /// Every way of protecting less arrives here: turning protection off,
    /// removing an address, switching a category off. Nothing on the machine
    /// changes — protection stays fully in force for the whole wait (FR-047b).
    /// The only list edits that do not are the ones made while nothing is in
    /// force at all ([`Self::reduce`]).
    pub fn request_reduction(&self, kind: PendingKind) -> Result<PendingView, Trouble> {
        let mut config = self.config.load()?;
        let clock = self.trusted_clock()?;

        let pending = reduce::request(&mut config, kind, &clock, (self.now)()).map_err(
            |waiting| {
                Trouble::new(format!(
                    "One change is already waiting: {}. It takes effect in {}. You can \
                     keep things as they are on the protection screen, and then ask for \
                     this instead.",
                    what_it_would_do(&waiting.existing.kind),
                    reduce::plain_duration(crate::domain::gate::remaining_seconds(
                        &waiting.existing,
                        clock.trusted_seconds
                    ))
                ))
            },
        )?;
        self.config.save(&config)?;

        Ok(self.view(&pending, clock.trusted_seconds))
    }

    /// Turning protection off. One command, one route, and it waits.
    pub fn request_protection_off(&self) -> Result<PendingView, Trouble> {
        self.request_reduction(PendingKind::TurnOffProtection)
    }

    /// Removing an address someone added. A reduction: it waits while
    /// anything is in force, and applies at once while nothing is.
    pub fn remove_custom_entry(
        &self,
        domain: Domain,
    ) -> Result<Option<PendingView>, Trouble> {
        self.reduce(PendingKind::RemoveEntries {
            domains: vec![domain],
        })
    }

    /// A list edit that protects less.
    ///
    /// With a wall up it waits, through the one reduction path. With nothing
    /// in force — protection meant to be off, *and* Cairn's section not on the
    /// machine — there is nothing to weaken, so it applies to the list at once
    /// and nothing on the machine is touched: no helper request, no write.
    /// A section left behind, or a file that cannot be read, means it waits.
    fn reduce(&self, kind: PendingKind) -> Result<Option<PendingView>, Trouble> {
        let mut config = self.config.load()?;
        let on_machine = self.hosts.section_present().ok();

        if !reduce::nothing_in_force(config.intent, on_machine) {
            return self.request_reduction(kind).map(Some);
        }

        reduce::apply_at_once(&mut config, kind)?;
        self.config.save(&config)?;
        Ok(None)
    }

    /// Always available, for the whole wait (FR-047c).
    pub fn cancel_pending_change(&self, id: &str) -> Result<(), Trouble> {
        let parsed = uuid::Uuid::parse_str(id)
            .map_err(|_| Trouble::new("That change is not waiting any more."))?;

        let mut config = self.config.load()?;
        reduce::cancel(&mut config, parsed)?;
        self.config.save(&config)
    }

    pub fn get_pending_change(&self) -> Result<Option<PendingView>, Trouble> {
        let config = self.config.load()?;
        let Some(pending) = config.pending_change.clone() else {
            return Ok(None);
        };
        // A helper that cannot be reached cannot vouch for the time, so the
        // change is shown as waiting rather than as ready.
        let trusted = self
            .trusted_clock()
            .map(|clock| clock.trusted_seconds)
            .unwrap_or(0);
        Ok(Some(self.view(&pending, trusted)))
    }

    /// Apply a waiting change if it has served its time.
    ///
    /// Called on start and on the heartbeat. Nothing else may reduce
    /// protection, and this refuses anything that is not eligible on the
    /// helper's advance-only clock (FR-047a).
    pub fn apply_due_reduction(&self) -> Result<Option<PendingKind>, Trouble> {
        let mut config = self.config.load()?;
        if config.pending_change.is_none() {
            return Ok(None);
        }

        let clock = self.trusted_clock()?;
        let kind = reduce::apply_reduction(&mut config, clock.trusted_seconds)?;
        self.config.save(&config)?;

        match kind {
            // Protection off means the machine goes back to how it was.
            PendingKind::TurnOffProtection => {
                tear_down(self.helper.as_ref(), self.elevation.as_ref())?;
            }
            _ => self.reapply(&config)?,
        }
        Ok(Some(kind))
    }

    /// Remove everything Cairn did to this machine, and report residue rather
    /// than success (FR-043, FR-044).
    pub fn tear_down_now(&self) -> Result<TeardownReport, Trouble> {
        tear_down(self.helper.as_ref(), self.elevation.as_ref())
    }

    /// Delete everything Cairn keeps about this person, permanently (FR-045).
    ///
    /// It refuses while protection is in force, and that is deliberate. If
    /// deleting data could take protection with it, deleting data would be an
    /// instant off-switch — and Principle I does not have an exception for one
    /// spelled a different way. Protection comes off the way everything else
    /// does: through the waiting period.
    pub fn delete_all_data(&self) -> Result<Vec<String>, Trouble> {
        let config = self.config.load()?;
        if config.intent == ProtectionIntent::On {
            return Err(Trouble::new(
                "You turned protection on, so Cairn is keeping what it needs for that. \
                 Ask to turn protection off on the protection screen — it takes a day — \
                 and you can delete everything after that.",
            ));
        }

        // Only what was actually removed is reported. Saying a thing is gone
        // when it is still on the disk is the same kind of dishonesty as
        // reporting protection from a write that was never verified.
        let mut deleted = Vec::new();

        if remove_if_present(self.config.path()) {
            deleted.push("your settings and what you chose to protect".into());
        }

        let mut lists_removed = false;
        for id in CategoryId::ALL {
            lists_removed |= remove_if_present(&self.categories.path_for(id));
        }
        if lists_removed {
            deleted.push("your own copies of the category lists".into());
        }

        // The history itself, and then the key. In that order: a key removed
        // first would leave a file nothing could ever open, which is residue
        // rather than deletion.
        if remove_if_present(&self.data_directory.join(HISTORY_FILE)) {
            deleted
                .push("everything Cairn recorded about the sites you reached for".into());
        }

        match self.credentials.delete_history_key() {
            Ok(()) => deleted.push("the key that kept your history sealed".into()),
            Err(trouble) => return Err(trouble),
        }

        Ok(deleted)
    }

    /// The advance-only clock the waiting period is measured against.
    ///
    /// It comes from the helper, never from the system clock. If the helper
    /// cannot be reached, no reduction can be applied — a missing helper is not
    /// a way to skip the wait.
    pub fn trusted_clock(&self) -> Result<TrustedClock, Trouble> {
        match self.helper.ask(Request::ReadTrustedClock)? {
            Response::TrustedClock {
                trusted_seconds,
                last_heartbeat_wall,
                ..
            } => Ok(TrustedClock {
                trusted_seconds,
                last_wall_seconds: last_heartbeat_wall,
                last_monotonic_seconds: 0,
            }),
            Response::Trouble { message, .. } => Err(Trouble::new(message)),
            _ => Err(crate::helper::not_reachable()),
        }
    }

    fn view(&self, pending: &PendingChange, trusted_now: u64) -> PendingView {
        let remaining = crate::domain::gate::remaining_seconds(pending, trusted_now);
        PendingView {
            id: pending.id.to_string(),
            what: what_it_would_do(&pending.kind),
            time_remaining: reduce::plain_duration(remaining),
            eligible_now: remaining == 0,
        }
    }

    /// One address at a time, in whatever form it was typed (FR-003).
    pub fn add_custom_entry(&self, input: &str) -> Result<Vec<Domain>, Rejection> {
        let mut config = match self.config.load() {
            Ok(config) => config,
            Err(problem) => {
                return Err(Rejection {
                    kind: crate::domain::normalize::RejectionKind::NotAnAddress,
                    reason: problem.message,
                })
            }
        };

        let added = add_custom_entry(&mut config.trail, input, &self.reserved)?;

        if self.config.save(&config).is_ok() {
            // Protecting more takes effect immediately.
            let _ = self.reapply(&config);
        }
        Ok(added)
    }

    /// Install the helper if it is not there — one prompt, once — and put
    /// protection into force.
    pub fn turn_protection_on(&self) -> Result<ProtectionState, Trouble> {
        if matches!(self.elevation.helper_status(), HelperStatus::NotInstalled) {
            self.elevation.install_helper()?;
        }

        let mut config = self.config.load()?;
        config.intent = ProtectionIntent::On;
        self.config.save(&config)?;

        let entries: Vec<Domain> = config.trail.domains().cloned().collect();
        let applied = apply(
            self.helper.as_ref(),
            self.hosts.as_ref(),
            &entries,
            config.reach_mode.mode,
            (self.now)(),
            Some((self.now)()),
        )?;

        // Protection is in force, so the addresses now point at Cairn. Start
        // accepting on them — and let the reach mode settle to whatever that
        // attempt actually achieved. A failure to count never affects what was
        // just applied (FR-028).
        let _ = self.start_counting();

        Ok(applied.state)
    }

    /// Always from a read-back that matched. Never from a write that returned
    /// success (FR-012).
    pub fn get_protection_state(&self) -> Result<ProtectionState, Trouble> {
        let config = self.config.load()?;
        let entries: Vec<Domain> = config.trail.domains().cloned().collect();

        // Protection that has not been turned on is off, not unconfirmed.
        // Someone choosing what to protect during setup has not done anything
        // wrong, and telling them Cairn "could not check" would be alarming and
        // untrue. It is still read from the machine: if Cairn's section is
        // there while protection is meant to be off, that is worth saying.
        if config.intent == ProtectionIntent::Off {
            return Ok(match self.hosts.section_present() {
                Ok(false) => ProtectionState::off(),
                Ok(true) | Err(_) => {
                    current_state(self.hosts.as_ref(), &entries, (self.now)(), None)
                }
            });
        }
        Ok(current_state(
            self.hosts.as_ref(),
            &entries,
            (self.now)(),
            None,
        ))
    }

    pub fn get_reach_mode(&self) -> Result<ReachModeSetting, Trouble> {
        Ok(self.config.load()?.reach_mode)
    }

    /// Begin counting, and answer with what is true once the attempt is over.
    ///
    /// Called at start and whenever protection starts. The answer comes from
    /// whether Cairn is accepting on its ports, not from whether the helper
    /// managed to bind them — those are different facts, and reporting the
    /// second as the first is how slice 002 came to claim counting over an empty
    /// record (Principle III).
    ///
    /// A person who chose silence is never started against that choice.
    pub fn start_counting(&self) -> Result<ReachModeSetting, Trouble> {
        let mut config = self.config.load()?;
        let chosen = config.reach_mode.clone();

        // Nothing is pointed at Cairn's ports while protection is off, so there
        // is nothing to accept and no reason to hold a port. The stored mode is
        // an intention for when protection starts; whether Cairn is counting
        // right now is `session::is_running`, and the two are not the same
        // question.
        if config.intent != ProtectionIntent::On {
            return Ok(chosen);
        }

        if chosen.chosen_by == ChosenBy::Person && chosen.mode == ReachMode::Silent {
            return Ok(chosen);
        }

        let settled = reach_mode::settle(&chosen, &self.begin_counting_session());
        config.reach_mode = settled.clone();
        self.config.save(&config)?;
        Ok(settled)
    }

    /// Take the ports and start accepting, recording first how long Cairn was
    /// away.
    ///
    /// The gap goes in before counting starts, so that it sits in the record
    /// ahead of any reach that follows it rather than being interleaved with
    /// them.
    #[cfg(feature = "history")]
    fn begin_counting_session(&self) -> Counting {
        use std::sync::Arc;

        use crate::counting::{presence, session, sink::RecordReach};
        use crate::store::history::History;
        use crate::store::key::HistoryKey;

        // Read once: the gap since the last mark ends at this instant and
        // counting begins at it, so the two agree.
        let now = (self.now)();
        let key = HistoryKey::obtain(self.credentials.as_ref());
        let history = History::open(&self.data_directory, &key);

        let mark = presence::Mark::at(&self.data_directory);
        presence::record_gap_since_last_seen(&history, &mark, now);

        let sink = Arc::new(RecordReach::over(history));
        let storing = sink.storing();

        // With nowhere to put what it counts, Cairn is not watching in any way
        // that lasts. The mark is left where it was, so that the next start
        // that can open the history records all of this time as a gap; on a
        // first run there is no mark yet, and this start is where the unseen
        // time begins.
        if !storing.load(std::sync::atomic::Ordering::SeqCst) && mark.read().is_none() {
            mark.write(now);
        }

        let for_session: Arc<dyn crate::counting::listener::NoteReach> = sink.clone();
        let counting = session::start(self.helper.as_ref(), for_session, self.now);

        // The mark says "Cairn was counting, and keeping it, at this moment", so
        // it is only kept while that is true.
        if counting == Counting::Available {
            // Counting and keeping it: this is a moment Cairn verified, not
            // one it intended (Principle III). Nothing is noted before
            // `session::start`, on a sealed history, or when it did not count.
            if storing.load(std::sync::atomic::Ordering::SeqCst) {
                sink.note_counting(now);
            }
            presence::keep_marking(
                presence::Mark::at(&self.data_directory),
                self.now,
                storing,
            );
        }
        counting
    }

    /// A build with no history has nowhere to put a reach, so it does not
    /// pretend to collect one.
    #[cfg(not(feature = "history"))]
    fn begin_counting_session(&self) -> Counting {
        Counting::Unavailable {
            because:
                "This build of Cairn does not keep a history, so it is not counting \
                      the sites you reach for. That does not change what Cairn protects."
                    .into(),
        }
    }

    /// A person choosing for themselves, in either direction (FR-029).
    ///
    /// Asking for counting when the ports are taken falls back and says so
    /// rather than pretending to count.
    pub fn set_reach_mode(&self, mode: ReachMode) -> Result<ReachModeSetting, Trouble> {
        // Their choice is recorded first, so that starting counting settles
        // against what they just asked for rather than against what was there
        // before.
        let mut config = self.config.load()?;
        config.reach_mode = reach_mode::choose(mode);
        self.config.save(&config)?;

        let settled = match mode {
            ReachMode::Silent => config.reach_mode.clone(),
            // Asking for counting is a request, not a result. What comes back is
            // whether Cairn is actually accepting on its ports.
            ReachMode::Counted => self.start_counting()?,
        };

        let mut config = self.config.load()?;
        config.reach_mode = settled.clone();
        self.config.save(&config)?;

        // Silent means nothing listens, so nothing holds the ports either — and
        // Cairn's own accept threads have to stop before the helper's release
        // can actually free the port, because the descriptors were handed over.
        if settled.mode == ReachMode::Silent {
            crate::counting::session::stop();
            let _ = self.helper.ask(Request::ReleaseCountingSockets);
        }

        self.reapply(&config)?;
        Ok(settled)
    }

    /// Today's reaches, and the periods Cairn was not watching.
    ///
    /// **Called only by the Reaches screen** (FR-030a). Wiring this into a
    /// header, a tray, a badge, or a background poll would put a count in front
    /// of someone who did not ask to see it — an ESLint rule restricts the
    /// import, and `scripts/check-no-ambient-counts.mjs` fails the build if it
    /// appears anywhere else.
    pub fn list_todays_reaches(&self, day_start: i64, day_end: i64) -> TodaysReaches {
        #[cfg(feature = "history")]
        {
            use crate::store::gaps::{clipped, coverage_note};
            use crate::store::history::History;
            use crate::store::key::HistoryKey;

            let key = HistoryKey::obtain(self.credentials.as_ref());
            let sealed = key.explanation();

            match History::open(&self.data_directory, &key) {
                History::Open(history) => {
                    let reaches = history
                        .between(day_start, day_end)
                        .unwrap_or_default()
                        .into_iter()
                        .map(|reach| ReachView {
                            domain: reach.domain,
                            at: reach.at,
                        })
                        .collect();
                    let gaps = history
                        .gaps_between(day_start, day_end)
                        .unwrap_or_default()
                        .into_iter()
                        .map(|gap| Gap {
                            from: gap.from,
                            to: gap.to,
                        })
                        .collect::<Vec<_>>();
                    let gaps = clipped(&gaps, day_start, day_end);

                    TodaysReaches {
                        coverage_note: coverage_note(&gaps),
                        gaps,
                        reaches,
                        first_counted: history.first_count().unwrap_or_default(),
                        sealed: None,
                    }
                }
                History::Sealed { because } => TodaysReaches {
                    reaches: Vec::new(),
                    gaps: Vec::new(),
                    coverage_note: None,
                    first_counted: None,
                    sealed: Some(sealed.unwrap_or(because)),
                },
            }
        }

        #[cfg(not(feature = "history"))]
        {
            let _ = (day_start, day_end);
            TodaysReaches {
                reaches: Vec::new(),
                gaps: Vec::new(),
                coverage_note: None,
                first_counted: None,
                sealed: Some(
                    "This build of Cairn does not keep a history. Protection is \
                     unaffected."
                        .into(),
                ),
            }
        }
    }

    /// One day, whole: its reaches, what Cairn did not see, and what the
    /// person wrote (the check-in, and later the single-day screen; FR-033).
    pub fn get_day(&self, day: LocalDate, day_start: i64, day_end: i64) -> DayView {
        #[cfg(feature = "history")]
        {
            if let Err(trouble) =
                crate::reflection::checkin::check_bounds(day, day_start, day_end)
            {
                return DayView::sealed(trouble.message);
            }
            match self.open_history() {
                Ok(history) => day_view(&history, day, day_start, day_end),
                Err(sentence) => DayView::sealed(sentence),
            }
        }

        #[cfg(not(feature = "history"))]
        {
            let _ = (day, day_start, day_end);
            DayView::sealed(NO_HISTORY.into())
        }
    }

    /// A range of days, by site, by hour and by day of the week.
    ///
    /// **Called only by the Reaches screen** (FR-030a), as `list_todays_reaches`
    /// is. The bounds are checked first, as `get_day`'s are, then the offsets
    /// the computer's clock had across them, then the history is opened; every refusal is the one sealed sentence, and a read that does
    /// not go through is never an empty range.
    pub fn summarize_reaches(
        &self,
        first_day: LocalDate,
        last_day: LocalDate,
        range_start: i64,
        range_end: i64,
        offsets: &[OffsetChange],
    ) -> Patterns {
        #[cfg(feature = "history")]
        {
            use crate::domain::patterns::LocalRange;
            use crate::reflection::over_time::{assemble, check_offsets, check_range};
            use crate::store::gaps::range_coverage_note;

            let now = (self.now)();
            if let Err(trouble) =
                check_range(first_day, last_day, range_start, range_end, now)
            {
                return Patterns::sealed(trouble.message);
            }
            let offsets: Vec<(i64, i64)> = offsets
                .iter()
                .map(|change| (change.from, change.offset))
                .collect();
            let (first_offset, changes) = match check_offsets(
                first_day,
                last_day,
                range_start,
                range_end,
                &offsets,
            ) {
                Ok(checked) => checked,
                Err(trouble) => return Patterns::sealed(trouble.message),
            };
            let history = match self.open_history() {
                Ok(history) => history,
                Err(sentence) => return Patterns::sealed(sentence),
            };
            let local = LocalRange {
                first_day,
                last_day,
                from: range_start,
                to: range_end,
                first_offset,
                changes: &changes,
            };
            match assemble(&history, &local, now) {
                Ok(range) => Patterns {
                    movement: range.movement,
                    by_site: range
                        .by_site
                        .into_iter()
                        .map(|(domain, count)| SiteCount { domain, count })
                        .collect(),
                    by_hour: range
                        .by_hour
                        .into_iter()
                        .zip(0u8..)
                        .map(|(count, hour)| HourCount { hour, count })
                        .collect(),
                    by_weekday: range
                        .by_weekday
                        .into_iter()
                        .zip(range.weekdays)
                        .zip(0u8..)
                        .map(|((count, days), weekday)| WeekdayCount {
                            weekday,
                            count,
                            days,
                        })
                        .collect(),
                    coverage_note: range_coverage_note(&range.gaps),
                    gaps: range.gaps,
                    estimates_excluded: range.estimates_excluded,
                    first_counted: range.first_counted,
                    dst_approximate: false,
                    sealed: None,
                },
                Err(trouble) => Patterns::sealed(trouble.message),
            }
        }

        #[cfg(not(feature = "history"))]
        {
            let _ = (first_day, last_day, range_start, range_end, offsets);
            Patterns::sealed(NO_HISTORY.into())
        }
    }

    /// Save what the person wrote for `day`, and return the day as it now
    /// stands.
    ///
    /// Refuses outright when the history is sealed, with the sentence that
    /// says why, and writes nothing (FR-029). The interface does not offer the
    /// space in that state, so this is the second line of defence: it is what
    /// holds when the key goes between reading the day and saving to it.
    pub fn save_journal_entry(
        &self,
        day: LocalDate,
        day_start: i64,
        day_end: i64,
        text: &str,
    ) -> Result<DayView, String> {
        #[cfg(feature = "history")]
        {
            crate::reflection::checkin::check_bounds(day, day_start, day_end)
                .map_err(|trouble| trouble.message)?;
            let history = self.open_history()?;
            crate::reflection::journal::save(&history, day, text, (self.now)())
                .map_err(|trouble| trouble.message)?;
            Ok(day_view(&history, day, day_start, day_end))
        }

        #[cfg(not(feature = "history"))]
        {
            let _ = (day, day_start, day_end, text);
            Err(NO_HISTORY.into())
        }
    }

    /// The history, or the sentence that says why it cannot be opened.
    #[cfg(feature = "history")]
    fn open_history(&self) -> Result<crate::store::history::OpenHistory, String> {
        use crate::store::history::History;
        use crate::store::key::HistoryKey;

        let key = HistoryKey::obtain(self.credentials.as_ref());
        let explained = key.explanation();
        match History::open(&self.data_directory, &key) {
            History::Open(history) => Ok(history),
            History::Sealed { because } => Err(explained.unwrap_or(because)),
        }
    }

    /// A line for the check-in `day` is for, or nothing, which is a complete
    /// answer (FR-008).
    ///
    /// One line holds for the whole local day, across restarts (Q1, revised
    /// again): the first ask for a day rolls a line at random and remembers it
    /// with the day, as a setting; later asks for that day return it. A
    /// remembered line for another day, one no longer in the bundled set, or
    /// one that shows nothing, is replaced by a fresh roll. Never derived from
    /// the date.
    ///
    /// Nothing, and nothing remembered, when the person has hidden quotes, and
    /// nothing when their configuration cannot be read: unsure whether they
    /// hid them, Cairn shows none rather than guess. If the line cannot be
    /// saved it is still shown; after a restart the day then rolls again.
    pub fn get_quote(&self, day: LocalDate) -> Option<String> {
        let mut config = self.config.load().ok()?;
        if config.quotes_hidden {
            return None;
        }
        let lines = crate::reflection::quote::bundled_lines(&self.shipped_quotes);
        if let Some(kept) = &config.quote_of_the_day {
            if kept.day == day && lines.contains(&kept.line) {
                return Some(kept.line.clone());
            }
        }
        let line = crate::domain::quotes::choose(&lines, (self.roll)())?.to_string();
        config.quote_of_the_day = Some(QuoteOfTheDay {
            day,
            line: line.clone(),
        });
        let _ = self.config.save(&config);
        Some(line)
    }

    /// Whether the person wants a quote on the check-in. Shown until they say
    /// otherwise (Q2).
    pub fn get_quotes_shown(&self) -> Result<bool, Trouble> {
        Ok(!self.config.load()?.quotes_hidden)
    }

    /// The quiet switch on the check-in, either way, remembered. It touches
    /// that one setting and nothing about protection. A configuration that
    /// cannot be read is refused before anything is written, so it is never
    /// overwritten.
    pub fn set_quotes_shown(&self, shown: bool) -> Result<bool, Trouble> {
        let mut config = self.config.load()?;
        if config.quotes_hidden == shown {
            config.quotes_hidden = !shown;
            self.config.save(&config)?;
        }
        Ok(!config.quotes_hidden)
    }

    /// What is true about coverage on this machine, in this release.
    ///
    /// Shown before anything is in force, so nothing here may say that
    /// anything *is* protected or *stays* protected — that is a read of the
    /// machine, and this makes none (Principle III). It says what Cairn does and
    /// what it cannot do here, and where the background component cannot run,
    /// it does not promise the repair only that component performs.
    pub fn get_disclosures(&self) -> Disclosures {
        let status = self.elevation.helper_status();
        let can_repair = !matches!(status, HelperStatus::Unsupported { .. });
        let helper = match status {
            HelperStatus::Installed { .. } => {
                "Cairn runs a small background component so it can keep protection in \
                 force and put it back if something changes it. It is installed once, \
                 with your permission, and removed completely when you remove Cairn."
            }
            HelperStatus::NotInstalled => {
                "Cairn will ask once for permission to install a small background \
                 component. It is what keeps protection in force without asking you \
                 again, and it is removed completely when you remove Cairn."
            }
            HelperStatus::Unsupported { .. } => {
                "On this machine Cairn cannot run its background component yet. That \
                 component is what puts protection in force and repairs it if something \
                 changes it, so until it can run here, Cairn cannot do either on its own."
            }
        };

        let mut in_force = vec![
            "Protected sites are blocked for every application on \
                                 this machine that uses the system's own address lookup."
                .to_string(),
        ];
        // The background component is what checks and repairs. Where it cannot
        // run, saying Cairn puts things back would be a promise nothing keeps.
        if can_repair {
            in_force.push(
                "Cairn checks its own work every minute and puts it back if something \
                 changes it."
                    .into(),
            );
        }

        Disclosures {
            in_force,
            not_covered: vec![
                // FR-009a, verbatim in substance: name it, do not imply coverage.
                "An application that looks up addresses on its own, rather than \
                 asking this machine, is not covered in this release. Some browsers \
                 can be set to do that."
                    .into(),
                "A browser that has already loaded a site may keep showing it from \
                 its own cache for a short while."
                    .into(),
            ],
            helper: helper.into(),
            encryption:
                "What Cairn records is encrypted on this machine. That protects \
                         it if the drive is copied or the machine is lost. It does not \
                         protect it from someone using this machine while it is unlocked."
                    .into(),
            administrator: "Someone with administrator access to this machine can undo \
                            what Cairn does. Cairn is a wall to walk away from, not a \
                            lock."
                .into(),
        }
    }

    /// Layers two and three, honestly reported.
    pub fn layer_capabilities(&self) -> Vec<Capability> {
        use crate::services::layers::{
            BrowserPolicyNotInThisRelease, BrowserPolicyService,
            ResolverRulesNotInThisRelease, ResolverRulesService,
        };
        vec![
            ResolverRulesNotInThisRelease.capability(),
            BrowserPolicyNotInThisRelease.capability(),
        ]
    }

    /// Put the current trail into force, if protection is meant to be on.
    #[allow(clippy::doc_markdown)]
    fn reapply(&self, config: &Config) -> Result<(), Trouble> {
        if config.intent != ProtectionIntent::On {
            return Ok(());
        }
        let entries: Vec<Domain> = config.trail.domains().cloned().collect();
        apply(
            self.helper.as_ref(),
            self.hosts.as_ref(),
            &entries,
            config.reach_mode.mode,
            (self.now)(),
            None,
        )
        .map(|_| ())
    }
}

/// True when a file was there and is not any more. A file that was never there
/// is not something to report as deleted.
fn remove_if_present(path: &std::path::Path) -> bool {
    match std::fs::remove_file(path) {
        Ok(()) => true,
        Err(_) => false,
    }
}

/// What a pending change would do, in words a person would use.
fn what_it_would_do(kind: &PendingKind) -> String {
    match kind {
        PendingKind::TurnOffProtection => "Turn protection off".into(),
        PendingKind::RemoveEntries { domains } => match domains.len() {
            1 => format!("Stop protecting {}", domains[0]),
            other => format!("Stop protecting {other} addresses"),
        },
        PendingKind::DisableCategory { category } => {
            format!("Switch the {} list off", category.label())
        }
    }
}

/// A day from an open history, as the interface shows it. A read that does
/// not go through is the sealed sentence, never an empty day.
#[cfg(feature = "history")]
fn day_view(
    history: &crate::store::history::OpenHistory,
    day: LocalDate,
    day_start: i64,
    day_end: i64,
) -> DayView {
    use crate::store::gaps::coverage_note;

    match crate::reflection::checkin::assemble(history, day, day_start, day_end) {
        Ok(assembled) => DayView {
            reaches: assembled
                .reaches
                .into_iter()
                .map(|reach| ReachView {
                    domain: reach.domain,
                    at: reach.at,
                })
                .collect(),
            coverage_note: coverage_note(&assembled.gaps),
            gaps: assembled.gaps,
            entry: assembled.entry,
            estimate: assembled.estimate,
            first_counted: assembled.first_counted,
            sealed: None,
        },
        Err(trouble) => DayView::sealed(trouble.message),
    }
}
