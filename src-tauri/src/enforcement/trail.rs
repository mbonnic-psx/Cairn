//! Adding to what is protected.
//!
//! Only additions live here. Taking something out is a reduction, it has one
//! route, and it waits (`enforcement::reduce`, FR-047). Increases apply
//! immediately and never enter that gate (FR-048).

use crate::domain::entries::{CategoryId, Domain, ProtectedEntry, SourceRef, Trail};
use crate::domain::normalize::{normalize, Rejection, ReservedNames};

/// Add one address the person typed.
///
/// Returns everything it protects — the entry and, for a root, its `www.` form
/// — or a sentence saying why it was not taken, which can be shown as written
/// (FR-003, FR-004, FR-007).
pub fn add_custom_entry(
    trail: &mut Trail,
    input: &str,
    reserved: &ReservedNames,
) -> Result<Vec<Domain>, Rejection> {
    let domains = normalize(input, reserved)?;

    for domain in &domains {
        let source = if domain.is_www() && domains.len() > 1 {
            // The `www.` form Cairn generated. It carries its own reason so it
            // is never left orphaned, and never mistaken for something typed.
            SourceRef::AutoWww
        } else {
            SourceRef::Custom
        };
        trail.insert(ProtectedEntry::new(domain.clone(), source));
    }

    Ok(domains)
}

/// Turn a category on, protecting everything in the person's copy of its list.
///
/// Entries that cannot be normalized are skipped rather than allowed to stop
/// the rest — and they are returned, so nothing disappears silently.
pub fn enable_category(
    trail: &mut Trail,
    category: CategoryId,
    domains: &[String],
    reserved: &ReservedNames,
) -> Vec<String> {
    let mut skipped = Vec::new();

    for entry in domains {
        match normalize(entry, reserved) {
            Ok(normalized) => {
                for domain in normalized {
                    trail.insert(ProtectedEntry::new(
                        domain,
                        SourceRef::Category(category),
                    ));
                }
            }
            Err(_) => skipped.push(entry.clone()),
        }
    }

    trail.enabled_categories.insert(category);
    skipped
}
