//! The key for the reach history, kept where the platform keeps secrets.
//!
//! Credential Manager on Windows, Keychain on macOS, Secret Service on Linux.
//! The person never sees a passphrase and is never asked for one to read their
//! own entries (FR-034, SC-015).
//!
//! When the store is absent or locked, this returns [`KeyUnavailable`] and the
//! caller fails closed: keep protecting, keep recording, never overwrite what
//! cannot be read (FR-036). Cairn does not invent a keystore, and it does not
//! ask for a passphrase instead.

use keyring::Entry;

use crate::services::{CredentialStore, Key, KeyUnavailable, Outcome, Trouble};

/// The service name the key is filed under. Namespaced, and inventoried as a
/// thing Cairn created (Principle IV).
pub const SERVICE: &str = "app.cairn.desktop";
pub const ACCOUNT: &str = "reach-history-key";

#[derive(Default)]
pub struct PlatformCredentials;

impl PlatformCredentials {
    fn entry(&self) -> Result<Entry, KeyUnavailable> {
        Entry::new(SERVICE, ACCOUNT).map_err(|error| KeyUnavailable::NoCredentialStore {
            because: error.to_string(),
        })
    }
}

impl CredentialStore for PlatformCredentials {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable> {
        let entry = self.entry()?;

        match entry.get_secret() {
            Ok(bytes) => {
                let bytes: [u8; 32] = bytes.as_slice().try_into().map_err(|_| {
                    KeyUnavailable::Unreadable {
                        because: "the stored key is not the right length".into(),
                    }
                })?;
                Ok(Key::from_bytes(bytes))
            }
            Err(keyring::Error::NoEntry) => {
                // First run: make one, and never show it to anybody.
                let mut bytes = [0u8; 32];
                getrandom::fill(&mut bytes).map_err(|error| {
                    KeyUnavailable::Unreadable {
                        because: error.to_string(),
                    }
                })?;

                entry.set_secret(&bytes).map_err(|error| classify(&error))?;
                Ok(Key::from_bytes(bytes))
            }
            Err(error) => Err(classify(&error)),
        }
    }

    fn delete_history_key(&self) -> Outcome<()> {
        let entry = self
            .entry()
            .map_err(|unavailable| Trouble::new(unavailable.message()))?;
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(Trouble::new(format!(
                "Cairn could not remove the key it kept for your history ({error})."
            ))),
        }
    }
}

fn classify(error: &keyring::Error) -> KeyUnavailable {
    match error {
        keyring::Error::NoStorageAccess(_) => KeyUnavailable::Locked,
        keyring::Error::PlatformFailure(inner) => KeyUnavailable::NoCredentialStore {
            because: inner.to_string(),
        },
        other => KeyUnavailable::Unreadable {
            because: other.to_string(),
        },
    }
}
