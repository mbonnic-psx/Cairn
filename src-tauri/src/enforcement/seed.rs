//! The shipped category lists, and the person's own copy of them.
//!
//! Cairn ships a starting point. On first run it is copied into the person's
//! own data, and from then on the copy is theirs: Cairn never writes over an
//! edited list, and never quietly re-adds something someone took out
//! (FR-002).
//!
//! The lists here are deliberately modest. FR-008 asks for protection to hold
//! at 10,000 entries, and that scale is reached through presets — but how large
//! these can safely be is what the R7 measurement decides. Growing them before
//! that number exists would be guessing with someone's browsing speed.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::domain::entries::CategoryId;
use crate::services::Trouble;

pub const CATEGORY_DIRECTORY: &str = "categories";

/// A category list as shipped.
#[derive(Clone, PartialEq, Eq, Debug, Deserialize)]
pub struct CategorySeed {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub note: String,
    pub domains: Vec<String>,
}

/// A category list as the person has it.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct CategoryList {
    pub id: String,
    pub label: String,
    pub domains: Vec<String>,
    /// True once the person has changed their copy. The shipped list is never
    /// applied over it again.
    #[serde(default)]
    pub edited: bool,
}

impl CategoryList {
    fn from_seed(seed: CategorySeed) -> Self {
        CategoryList {
            id: seed.id,
            label: seed.label,
            domains: seed.domains,
            edited: false,
        }
    }
}

/// Reads and writes the person's own copies.
pub struct CategoryStore {
    directory: PathBuf,
}

impl CategoryStore {
    pub fn at(data_directory: &Path) -> Self {
        CategoryStore {
            directory: data_directory.join(CATEGORY_DIRECTORY),
        }
    }

    pub fn path_for(&self, category: CategoryId) -> PathBuf {
        self.directory.join(format!("{}.json", category.slug()))
    }

    pub fn load(&self, category: CategoryId) -> Result<Option<CategoryList>, Trouble> {
        match std::fs::read(self.path_for(category)) {
            Ok(bytes) => serde_json::from_slice(&bytes).map(Some).map_err(|error| {
                Trouble::new(format!(
                    "Cairn could not read your {} list ({error}). Your protection is \
                     unaffected.",
                    category.label()
                ))
            }),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(Trouble::new(format!(
                "Cairn could not open your {} list ({error}). Your protection is \
                 unaffected.",
                category.label()
            ))),
        }
    }

    pub fn save(&self, category: CategoryId, list: &CategoryList) -> Result<(), Trouble> {
        let bytes = serde_json::to_vec_pretty(list).map_err(|error| {
            Trouble::new(format!(
                "Cairn could not write your {} list ({error}).",
                category.label()
            ))
        })?;
        crate::store::write_atomically(&self.path_for(category), &bytes).map_err(
            |error| {
                Trouble::new(format!(
                    "Cairn could not save your {} list ({error}).",
                    category.label()
                ))
            },
        )
    }
}

/// Copy anything that is not there yet, and leave everything that is.
///
/// Idempotent, and safe to call on every start: a list the person has edited —
/// or simply already has — is never replaced.
pub fn seed_missing_lists(
    shipped: &Path,
    store: &CategoryStore,
) -> Result<Vec<CategoryId>, Trouble> {
    let mut copied = Vec::new();

    for category in CategoryId::ALL {
        if store.load(category)?.is_some() {
            continue;
        }

        let seed_path = shipped.join(format!("{}.json", category.slug()));
        let bytes = std::fs::read(&seed_path).map_err(|error| {
            Trouble::new(format!(
                "Cairn could not read its own starting list for {} ({error}).",
                category.label()
            ))
        })?;
        let seed: CategorySeed = serde_json::from_slice(&bytes).map_err(|error| {
            Trouble::new(format!(
                "Cairn could not read its own starting list for {} ({error}).",
                category.label()
            ))
        })?;

        store.save(category, &CategoryList::from_seed(seed))?;
        copied.push(category);
    }

    Ok(copied)
}
