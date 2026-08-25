//! What the interface can ask for, as plain Rust.
//!
//! Deliberately free of Tauri: the commands in `ipc::commands` are one-line
//! wrappers over these methods, so everything the interface can do is testable
//! without a window.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::counting::availability;
use crate::domain::entries::{CategoryId, Domain, ReachMode, Trail};
use crate::domain::gate::{PendingChange, PendingKind, TrustedClock};
use crate::domain::normalize::{Rejection, ReservedNames};
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
use crate::store::config::{Config, ConfigStore, ProtectionIntent, ReachModeSetting};
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
    /// Present when the history could not be opened. Protection is unaffected,
    /// and the sentence says so (FR-036).
    pub sealed: Option<String>,
}

/// Everything the interface talks to.
pub struct AppState {
    pub config: ConfigStore,
    /// The person's own data directory. Reach history lives here, encrypted.
    pub data_directory: PathBuf,
    pub credentials: Box<dyn crate::services::CredentialStore>,
    pub categories: CategoryStore,
    pub shipped_categories: PathBuf,
    pub hosts: Box<dyn HostsService>,
    pub helper: Box<dyn HelperChannel>,
    pub elevation: Box<dyn ElevationService>,
    pub reserved: ReservedNames,
    /// Supplied rather than read, so the same journey can be replayed in a test.
    pub now: fn() -> i64,
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
    /// (FR-047). The same command handles both, and the answer says which
    /// happened.
    pub fn set_category_enabled(
        &self,
        id: CategoryId,
        on: bool,
    ) -> Result<Option<PendingView>, Trouble> {
        if !on {
            return self
                .request_reduction(PendingKind::DisableCategory { category: id })
                .map(Some);
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

    /// Removing an address someone added. A reduction — never immediate.
    pub fn remove_custom_entry(&self, domain: Domain) -> Result<PendingView, Trouble> {
        self.request_reduction(PendingKind::RemoveEntries {
            domains: vec![domain],
        })
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
                "Protection is on, so Cairn is keeping what it needs to keep it on. \
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

    /// A person choosing for themselves, in either direction (FR-029).
    ///
    /// Asking for counting when the ports are taken falls back and says so
    /// rather than pretending to count.
    pub fn set_reach_mode(&self, mode: ReachMode) -> Result<ReachModeSetting, Trouble> {
        let mut config = self.config.load()?;
        let chosen = reach_mode::choose(mode);

        let settled = match mode {
            ReachMode::Silent => chosen,
            ReachMode::Counted => {
                reach_mode::settle(&chosen, &availability::check(self.helper.as_ref()))
            }
        };

        config.reach_mode = settled.clone();
        self.config.save(&config)?;

        // Silent means nothing listens, so nothing holds the ports either.
        if settled.mode == ReachMode::Silent {
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
            use crate::store::gaps::coverage_note;
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

                    TodaysReaches {
                        coverage_note: coverage_note(&gaps),
                        gaps,
                        reaches,
                        sealed: None,
                    }
                }
                History::Sealed { because } => TodaysReaches {
                    reaches: Vec::new(),
                    gaps: Vec::new(),
                    coverage_note: None,
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
                sealed: Some(
                    "This build of Cairn does not keep a history. Protection is \
                     unaffected."
                        .into(),
                ),
            }
        }
    }

    /// What is true about coverage on this machine, in this release.
    pub fn get_disclosures(&self) -> Disclosures {
        let helper = match self.elevation.helper_status() {
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
                "On this machine Cairn cannot run its background component, so it \
                 cannot put protection back on its own if something changes it. What \
                 you have protected stays protected."
            }
        };

        Disclosures {
            in_force: vec![
                "Protected sites are blocked for every application on this machine \
                 that uses the system's own address lookup."
                    .into(),
                "Cairn checks its own work every minute and puts it back if something \
                 changes it."
                    .into(),
            ],
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
