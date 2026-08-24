# Contract: Tauri Command Surface

**Feature**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md)

The only boundary between the React frontend and the Rust core. Frontend code calls nothing
else — no direct filesystem, no direct helper channel.

| Command | Returns | Notes |
| --- | --- | --- |
| `get_protection_state()` | `ProtectionState` | Always from verified read-back; `NotVerified` is a distinct status |
| `get_trail()` | `Trail` | Categories, custom entries, reach mode |
| `list_categories()` | `[CategoryPreset]` | |
| `set_category_enabled(id, on)` | `Result` | Enabling applies immediately; disabling is a reduction → pending change |
| `add_custom_entry(input)` | `Result<[ProtectedEntry], RejectionReason>` | One address at a time; rejection carries a plain-language reason |
| `remove_custom_entry(domain)` | `Result<PendingChange>` | A reduction — never immediate |
| `turn_protection_on()` | `Result<ProtectionState, Denied>` | May prompt once for helper install |
| `request_protection_off()` | `Result<PendingChange>` | **The single reduction path** |
| `cancel_pending_change(id)` | `Result` | Always available while pending (FR-047c) |
| `get_pending_change()` | `PendingChange \| null` | Includes remaining time for display |
| `get_reach_mode()` / `set_reach_mode(mode)` | `ReachMode` | Override in either direction |
| `list_todays_reaches()` | `[Reach] + [CoverageGap]` | Called **only** by the Reaches screen |
| `delete_all_data()` | `Result<Report>` | |
| `get_disclosures()` | `Disclosures` | Coverage limits, helper presence, encryption scope, admin caveat |

## Rules

- **No command reduces protection immediately.** `request_protection_off`,
  `remove_custom_entry`, and disabling a category all return a `PendingChange`. There is no
  command that turns protection off now.
- **No command is callable from a blocked-request context.** The counting listener has no
  channel to the frontend at all (FR-019).
- **`list_todays_reaches` has exactly one caller.** Wiring it into any ambient surface —
  header, tray, badge, or a background poll — breaks FR-030a. A lint restricts the import to
  the Reaches screen.
- **`get_protection_state` never reports optimistically.** If the last verification did not
  succeed, it returns `NotVerified` even if the last write returned success.
- **Errors carry plain language.** Every `Result` error is a message that can be shown as
  written, checked against the banned-word list (FR-050).
