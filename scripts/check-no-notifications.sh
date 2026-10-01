#!/usr/bin/env bash
# Guard: Cairn raises no notification of any kind, ever (FR-023, SC-007).
# Principle V: no interruption, ever.
#
# Not at a reach, not at a repair, and not in the evening either: the check-in
# waits to be opened and says nothing to announce itself. So the capability is
# not requested at all — the absence is the guarantee, not UI discipline, and
# this guard's whole job is to keep that absence. There is no permitted
# notification path for it to reason about, so it permits none.
#
# Slice 003 briefly relaxed this file to fence in a single daily announcement.
# That announcement is gone, and so is the relaxation. What survives from that
# version is only what forbids more: comment stripping, the ambient surfaces,
# and the helper rule. The lockfile and workspace-manifest checks are new, and
# forbid more again.
#
#   1. No notification permission in any capability file or the Tauri config.
#   2. No notification plugin or crate in any manifest, or in the resolved
#      build graph.
#   3. No import of the notification plugin, and no call into it, in src/.
#   4. No browser notification route in src/.
#   5. No badge, tray, or dock surface in src/.
#   6. The privileged helper has no notification machinery at all.
set -euo pipefail

status=0
report() { printf '  %s\n' "$1" >&2; status=1; }
fail() { echo "no-notifications: $1" >&2; status=1; }

# Tests do not ship, and a test asserting a surface is absent has to name it.
# Same exemption the streak and ambient-count guards make.
not_a_test() { ! printf '%s' "$1" | grep -qE '__tests__|\.(test|spec)\.[jt]sx?$'; }

# Prose that says "notification" is not a capability — a helper test comment
# asserting that repair sends none once tripped an earlier version of this
# guard. So line comments come off before source is matched. Line numbers
# survive because the comment text is blanked rather than the line removed.
# The `[^:]` guard keeps `https://` intact.
#
# Block comments spanning several lines are not handled. A notification call
# hidden inside one would be missed here and caught by ESLint, by review, and by
# the fact that commented-out code does not run.
uncommented() { sed -E 's@(^|[^:])//.*@\1@' "$1"; }

# ── 1. No notification permission ─────────────────────────────────────────────
for f in src-tauri/tauri.conf.json src-tauri/capabilities/*.json; do
    [ -f "$f" ] || continue
    # A permission id or plugin name is a bare token in quotes. Prose that
    # merely says the word "notification" — like the capability file's own
    # description — is not a capability.
    if hits=$(grep -nE '"[A-Za-z0-9:_-]*notification[A-Za-z0-9:_-]*"' "$f" || true); [ -n "$hits" ]; then
        fail "notification capability declared in $f"
        while IFS= read -r line; do report "$line"; done <<< "$hits"
    fi
done

# ── 2. No notification dependency, declared or resolved ───────────────────────
#
# Every manifest in the workspace, the privileged helper's included. The
# lockfile is checked as well, because a crate that pulls a notifier in
# transitively grants the capability as surely as declaring it would.
NOTIFIER_CRATES='tauri-plugin-notification|notify-rust|tauri-winrt-notification|mac-notification-sys'
while IFS= read -r manifest; do
    if hits=$(grep -nE "^[[:space:]]*\"?(${NOTIFIER_CRATES}|[a-z0-9_-]*toast[a-z0-9_-]*)\"?[[:space:]]*=" "$manifest" || true); [ -n "$hits" ]; then
        fail "$manifest declares a notification dependency"
        while IFS= read -r line; do report "$line"; done <<< "$hits"
    fi
    if hits=$(grep -nE "dep:(${NOTIFIER_CRATES})" "$manifest" || true); [ -n "$hits" ]; then
        fail "$manifest enables a notification dependency through a feature"
        while IFS= read -r line; do report "$line"; done <<< "$hits"
    fi
done < <(find src-tauri -name Cargo.toml -not -path '*/target/*' 2>/dev/null)

if [ -f src-tauri/Cargo.lock ]; then
    if hits=$(grep -nE "^name = \"(${NOTIFIER_CRATES})\"" src-tauri/Cargo.lock || true); [ -n "$hits" ]; then
        fail 'a notification crate is in the resolved build graph (src-tauri/Cargo.lock)'
        while IFS= read -r line; do report "$line"; done <<< "$hits"
    fi
fi

for f in package.json package-lock.json; do
    [ -f "$f" ] || continue
    if grep -qE '@tauri-apps/plugin-notification' "$f"; then
        fail "$f declares @tauri-apps/plugin-notification"
    fi
done

if [ -d src ]; then
    while IFS= read -r file; do
        # ── 3. No import of the plugin, and no call into it ──────────────────
        #
        # Tests included: no test has a reason to load the plugin, and one that
        # did would need the package installed, which rule 2 already refuses.
        if hits=$(uncommented "$file" | grep -nE 'plugin-notification|\bsendNotification\(|\bisPermissionGranted\(' || true); [ -n "$hits" ]; then
            fail "the notification plugin is reached from $file"
            while IFS= read -r line; do report "$line"; done <<< "$hits"
        fi

        not_a_test "$file" || continue

        # ── 4. No browser notification route ─────────────────────────────────
        if hits=$(uncommented "$file" | grep -nE 'new Notification\(|\bwindow\.Notification\b|Notification\.(requestPermission|permission)\b|\.showNotification\(' || true); [ -n "$hits" ]; then
            fail "a browser notification route in $file"
            while IFS= read -r line; do report "$line"; done <<< "$hits"
        fi

        # ── 5. No ambient surface ─────────────────────────────────────────────
        if hits=$(uncommented "$file" | grep -nE 'setAppBadge|clearAppBadge|setBadgeCount|badgeCount|TrayIcon|setOverlayIcon|setProgressBar' || true); [ -n "$hits" ]; then
            fail "an ambient surface in $file"
            while IFS= read -r line; do report "$line"; done <<< "$hits"
        fi
    done < <(find src -type f \( -name '*.ts' -o -name '*.tsx' \))
fi

# ── 6. The privileged helper may never notify ─────────────────────────────────
#
# It is elevated and has deliberately no channel to the interface. Giving it one
# so that it could interrupt somebody would hand the component with the most
# power the ability to interrupt the person at a moment nobody chose. Its
# manifest is already covered by rule 2; this looks at what it would call.
if [ -d src-tauri/helper/src ]; then
    while IFS= read -r file; do
        if hits=$(uncommented "$file" | grep -nE 'notify_rust|ToastNotification|NSUserNotification|UserNotifications|send_notification|Notification::' || true); [ -n "$hits" ]; then
            fail "notification machinery in the privileged helper: $file"
            while IFS= read -r line; do report "$line"; done <<< "$hits"
        fi
    done < <(find src-tauri/helper/src -type f -name '*.rs')
fi

if [ "$status" -ne 0 ]; then
    cat >&2 <<'MSG'

Nothing in Cairn may interrupt the person — not at a reach, not at a repair,
not in the evening, not at all. The check-in waits to be opened. Remove it
rather than gating it behind a setting.
MSG
    exit 1
fi

echo "no-notifications: clean"
