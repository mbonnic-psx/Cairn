# Contract: Platform Service Interfaces

**Feature**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

Traits defined in `domain`/`services`, implemented once per platform under `platform/`.
Selected at the composition root. No `cfg!(target_os)` appears in domain or UI code.

Signatures are shown in Rust for precision; they are the contract, not the implementation.

```rust
/// Installs and manages the privileged helper. Elevation happens here and nowhere else.
trait ElevationService {
    fn helper_status(&self) -> HelperStatus;                 // NotInstalled | Installed | Unsupported
    fn install_helper(&self) -> Result<Installed, Denied>;   // prompts exactly once
    fn uninstall_helper(&self) -> Result<Removed, Residue>;
}

/// Reads system state. All writes go through the helper.
trait HostsService {
    fn read_raw(&self) -> Result<Vec<u8>>;
    fn section_present(&self) -> Result<bool>;
    fn verify(&self, expected: &[Domain]) -> Result<Verification>;
}

trait DnsFlushService {
    fn flush(&self) -> FlushOutcome;   // failure is non-fatal and reported, never silent
}

trait CredentialStore {
    fn get_or_create_history_key(&self) -> Result<Key, KeyUnavailable>;
    fn delete_history_key(&self) -> Result<()>;
}

trait AutostartService {          // declared now, used by a later slice
    fn is_enabled(&self) -> Result<bool>;
    fn set_enabled(&self, on: bool) -> Result<()>;
}

/// Declared, deliberately unimplemented in this slice. Layers 2 and 3 attach here
/// without the applier changing.
trait ResolverRulesService { fn capability(&self) -> Capability; }
trait BrowserPolicyService  { fn capability(&self) -> Capability; }
```

## Rules

- **`Unsupported` is a real answer.** Every trait can report that a platform cannot do the
  thing. Callers must render that honestly rather than treating it as failure or success
  (Principle III, FR-018).
- **Degradation direction is fixed.** A `ResolverRulesService` or `BrowserPolicyService` that
  reports `Unsupported` degrades to layer 1. Nothing degrades to no blocking (FR-028).
- **No platform type crosses the boundary.** These traits deal in domains, bytes, and
  outcomes — never in `HKEY`, `SCDynamicStore`, or a systemd unit name.
- **Counting is not a platform service.** Socket binding is a helper verb; parsing is pure
  domain code. Nothing about counting is platform-conditional above the socket.
