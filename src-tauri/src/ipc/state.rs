//! What the interface can ask for, as plain Rust.
//!
//! Deliberately free of Tauri: the commands in `ipc::commands` are one-line
//! wrappers over these methods, so everything the interface can do is testable
//! without a window.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::domain::entries::{CategoryId, Domain, ReachMode, Trail};
use crate::domain::normalize::{Rejection, ReservedNames};
use crate::enforcement::apply::{apply, current_state};
use crate::enforcement::seed::{seed_missing_lists, CategoryStore};
use crate::enforcement::state::ProtectionState;
use crate::enforcement::trail::{add_custom_entry, enable_category};
use crate::helper::HelperChannel;
use crate::services::{Capability, ElevationService, HelperStatus, HostsService, Trouble};
use crate::store::config::{Config, ConfigStore, ProtectionIntent};

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

/// Everything the interface talks to.
pub struct AppState {
    pub config: ConfigStore,
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
    /// Turning one off protects less. That is a reduction, it has one route,
    /// and it waits — which is `request_protection_reduction`, not this.
    pub fn set_category_enabled(&self, id: CategoryId, on: bool) -> Result<(), Trouble> {
        if !on {
            return Err(Trouble::new(
                "Switching a category off protects you less, so it waits a day before \
                 it takes effect. You can ask for that from the protection screen, and \
                 cancel it at any time.",
            ));
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
        self.reapply(&config)
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

        if config.intent == ProtectionIntent::Off && entries.is_empty() {
            return Ok(ProtectionState::off());
        }
        Ok(current_state(
            self.hosts.as_ref(),
            &entries,
            (self.now)(),
            None,
        ))
    }

    pub fn get_reach_mode(&self) -> Result<ReachMode, Trouble> {
        Ok(self.config.load()?.reach_mode.mode)
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
            encryption: "What Cairn records is encrypted on this machine. That protects \
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
            BrowserPolicyNotInThisRelease, BrowserPolicyService, ResolverRulesNotInThisRelease,
            ResolverRulesService,
        };
        vec![
            ResolverRulesNotInThisRelease.capability(),
            BrowserPolicyNotInThisRelease.capability(),
        ]
    }

    /// Put the current trail into force, if protection is meant to be on.
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
