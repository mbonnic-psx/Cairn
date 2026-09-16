#!/usr/bin/env bash
# Guard: exactly one quiet announcement a day, and nothing else, ever.
# Principle V, FR-002, FR-004, FR-005.
#
# ── Why this check changed shape ────────────────────────────────────────────
#
# Slice 002 guaranteed silence by refusing the capability to notify at all. The
# absence was the proof: there was no plugin, no permission, no API call, and so
# nothing to reason about. This guard's whole job was to keep that absence.
#
# Slice 003 needs the capability. Principle V always allowed exactly one quiet
# notice per day — the evening check-in that sends it simply did not exist yet.
# So the guarantee cannot rest on absence any more, and this guard cannot be the
# thing that establishes it. The once-a-day bound is now a property of behaviour,
# proved by tests over a pure decision function (domain/checkin.rs, and the
# announcement tests) that returns "due" at most once per local day however many
# times it is asked.
#
# What is left for a static check is everything that would make that proof
# meaningless — a second way to notify, a way that skips the decision, or a
# surface that interrupts someone without one. Those are structural, so they are
# checkable, and they are what this file now checks:
#
#   1. The browser notification routes, forbidden everywhere.
#   2. Badge, tray, and dock surfaces, forbidden everywhere.
#   3. The plugin importable from exactly one module, which must be the one that
#      asks the core whether an announcement is due — a module that imports the
#      plugin but never asks is deciding for itself.
#   4. At most one capability file declaring a notification permission.
#   5. The privileged helper may never notify, on any path, at all.
#   6. The dependency stays optional and behind `app`, so the pure layers keep
#      building with no GUI toolchain.
#
# A rule here that starts permitting more than it forbids has gone wrong. This
# file forbids strictly more than the version it replaced; the one thing it now
# permits is named, singular, and checked for being singular.
set -euo pipefail

status=0
report() { printf '  %s\n' "$1" >&2; status=1; }
fail() { echo "no-notifications: $1" >&2; status=1; }

# The single module permitted to raise the announcement.
ANNOUNCER='src/announce.ts'
# The command it must ask. Anything that notifies without asking this has
# escaped the once-a-day decision.
DECISION='announce_check_in_if_due'

# Tests do not ship, and a test asserting a surface is absent has to name it.
# Same exemption the streak and ambient-count guards make.
not_a_test() { ! printf '%s' "$1" | grep -qE '__tests__|\.(test|spec)\.[jt]sx?$'; }

# Prose that says "notification" is not a capability — the version of this guard
# that slice 002 shipped said so in its own header, and this rewrite fired on a
# helper test comment asserting that repair sends none. So line comments come off
# before anything is matched. Line numbers survive because the comment text is
# blanked rather than the line removed. The `[^:]` guard keeps `https://` intact.
#
# Block comments spanning several lines are not handled. A notification call
# hidden inside one would be missed here and caught by ESLint, by review, and by
# the fact that commented-out code does not run.
uncommented() { sed -E 's@(^|[^:])//.*@\1@' "$1"; }

# ── 1 & 2. The browser routes and the ambient surfaces, forbidden everywhere ──
#
# ESLint covers src/ as well, and deliberately so: this runs in CI where a
# misconfigured lint would otherwise take the guarantee with it.
if [ -d src ]; then
    while IFS= read -r file; do
        not_a_test "$file" || continue
        if hits=$(uncommented "$file" | grep -nE 'new Notification\(|Notification\.requestPermission|\.showNotification\(' || true); [ -n "$hits" ]; then
            fail "a browser notification route in $file"
            while IFS= read -r line; do report "$line"; done <<< "$hits"
        fi
        if hits=$(uncommented "$file" | grep -nE 'setAppBadge|clearAppBadge|setBadgeCount|badgeCount|TrayIcon|setOverlayIcon|setProgressBar' || true); [ -n "$hits" ]; then
            fail "an ambient surface in $file"
            while IFS= read -r line; do report "$line"; done <<< "$hits"
        fi
    done < <(find src -type f \( -name '*.ts' -o -name '*.tsx' \))
fi

# ── 3. One announcer, and it must ask before it speaks ────────────────────────
if [ -d src ]; then
    importers=$(grep -rlE "from '@tauri-apps/plugin-notification'|from \"@tauri-apps/plugin-notification\"" src 2>/dev/null || true)
    count=$(printf '%s' "$importers" | grep -c . || true)

    if [ "$count" -gt 1 ]; then
        fail "$count modules import the notification plugin. There is one announcement path."
        while IFS= read -r f; do report "$f"; done <<< "$importers"
    elif [ "$count" -eq 1 ] && [ "$importers" != "$ANNOUNCER" ]; then
        fail "the notification plugin is imported by $importers, not $ANNOUNCER"
    fi

    # A module that can notify but never asks whether an announcement is due is
    # making that decision itself, which is exactly what the tests cannot then
    # prove anything about.
    if [ -f "$ANNOUNCER" ] && grep -qE "plugin-notification" "$ANNOUNCER"; then
        grep -q "$DECISION" "$ANNOUNCER" ||
            fail "$ANNOUNCER can notify but never asks $DECISION — it is deciding for itself"
    fi

    # Nothing may send a notification from outside the announcer.
    if hits=$(grep -rnE '\bsendNotification\(|\bisPermissionGranted\(|\brequestPermission\(' src 2>/dev/null | grep -v "^$ANNOUNCER:" | grep -vE '__tests__|\.(test|spec)\.' || true); [ -n "$hits" ]; then
        fail "a notification call outside $ANNOUNCER"
        while IFS= read -r line; do report "$line"; done <<< "$hits"
    fi
fi

# ── 4. At most one capability file may declare a notification permission ──────
declaring=''
for f in src-tauri/tauri.conf.json src-tauri/capabilities/*.json; do
    [ -f "$f" ] || continue
    if grep -qE '"[A-Za-z0-9:_-]*notification[A-Za-z0-9:_-]*"' "$f"; then
        declaring="${declaring}${f} "
    fi
done
declaring_count=$(printf '%s' "$declaring" | wc -w | tr -d ' ')
if [ "$declaring_count" -gt 1 ]; then
    fail "$declaring_count files declare a notification permission: $declaring"
    report 'One capability declares it. A second is a second way in.'
fi

# ── 5. The privileged helper may never notify ─────────────────────────────────
#
# It is elevated and has deliberately no channel to the interface. Giving it one
# so that it could interrupt somebody would be the worst trade available in this
# feature: the component with the most power gaining the ability to interrupt the
# person at a moment nobody chose.
if [ -f src-tauri/helper/Cargo.toml ]; then
    if hits=$(grep -nE '^[a-z0-9_-]*(notification|notify|toast)[a-z0-9_-]*\s*=' src-tauri/helper/Cargo.toml || true); [ -n "$hits" ]; then
        fail 'the privileged helper declares a notification dependency'
        while IFS= read -r line; do report "$line"; done <<< "$hits"
    fi
fi
if [ -d src-tauri/helper/src ]; then
    while IFS= read -r file; do
        if hits=$(uncommented "$file" | grep -nE 'notify_rust|ToastNotification|NSUserNotification|UserNotifications|send_notification|Notification::' || true); [ -n "$hits" ]; then
            fail "notification machinery in the privileged helper: $file"
            while IFS= read -r line; do report "$line"; done <<< "$hits"
        fi
    done < <(find src-tauri/helper/src -type f -name '*.rs')
fi

# ── 6. The dependency stays optional and behind `app` ─────────────────────────
#
# A non-optional dependency here would quietly end the property that the pure
# domain, store, and enforcement layers build and test with no GUI toolchain.
MANIFEST=src-tauri/Cargo.toml
if [ -f "$MANIFEST" ] && grep -q '^tauri-plugin-notification' "$MANIFEST"; then
    grep -E '^tauri-plugin-notification.*optional = true' "$MANIFEST" >/dev/null ||
        fail 'tauri-plugin-notification must be declared optional = true'
    grep -E '^app = \[.*dep:tauri-plugin-notification' "$MANIFEST" >/dev/null ||
        fail 'tauri-plugin-notification must be gated behind the `app` feature'
fi

if [ "$status" -ne 0 ]; then
    cat >&2 <<'MSG'

There is one announcement: once a day, at an hour the person chose, and it can
be switched off. Everything else that could interrupt them stays absent — not
gated behind a setting, not reachable from a second module, not sent by the
elevated helper. Remove it rather than permitting it.
MSG
    exit 1
fi

echo "no-notifications: clean"
