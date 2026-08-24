#!/usr/bin/env bash
# Guard: this release produces zero unsolicited notifications (FR-023, SC-007).
#
# Principle V allows exactly one quiet notification per day, and the evening
# check-in that would send it is not in this slice. So the capability is not
# requested at all — the absence is the guarantee, not UI discipline.
set -euo pipefail

status=0
report() { printf '  %s\n' "$1" >&2; status=1; }

# Tauri notification permission or plugin.
for f in src-tauri/tauri.conf.json src-tauri/capabilities/*.json; do
    [ -f "$f" ] || continue
    # A permission id or plugin name is a bare token in quotes. Prose that
    # merely says the word "notification" — like this file's own description —
    # is not a capability.
    if hits=$(grep -nE '"[A-Za-z0-9:_-]*notification[A-Za-z0-9:_-]*"' "$f" || true); [ -n "$hits" ]; then
        echo "no-notifications: notification capability declared in $f" >&2
        while IFS= read -r line; do report "$line"; done <<< "$hits"
    fi
done

# The plugin crate or npm package anywhere in the tree.
if [ -f src-tauri/Cargo.toml ] && grep -qE 'tauri-plugin-notification' src-tauri/Cargo.toml; then
    report "src-tauri/Cargo.toml declares tauri-plugin-notification"
fi
if [ -f package.json ] && grep -qE '@tauri-apps/plugin-notification' package.json; then
    report "package.json declares @tauri-apps/plugin-notification"
fi

# Browser-level notification and badge APIs in the frontend.
if [ -d src ]; then
    if hits=$(grep -rnE 'new Notification\(|Notification\.requestPermission|navigator\.setAppBadge|setBadgeCount' src || true); [ -n "$hits" ]; then
        echo "no-notifications: notification or badge API used in the frontend" >&2
        while IFS= read -r line; do report "$line"; done <<< "$hits"
    fi
fi

if [ "$status" -ne 0 ]; then
    cat >&2 <<'MSG'

Nothing in this release may interrupt the person — not at a reach, not at a
repair, not at all. Remove it rather than gating it behind a setting.
MSG
    exit 1
fi

echo "no-notifications: clean"
