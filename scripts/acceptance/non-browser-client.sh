#!/usr/bin/env bash
# SC-002: a protected address fails to resolve for something that is not a
# browser.
#
# The browser matrix is a manual run (see README.md in this directory); this is
# the part that can be checked on every push, on every platform, without a
# desktop session.
#
# It asserts a *resolution* outcome rather than a network one: Cairn's job is to
# make the address not resolve to the real site. A machine with no network at
# all would pass a "cannot connect" check for the wrong reason.
set -uo pipefail

DOMAIN="${1:-example.com}"
MARKER="# >>> Cairn: protected sites."

# Nothing to check if Cairn is not in force. Said out loud: a check that
# silently passes when it did not run is worse than no check.
hosts_file() {
    if [ -n "${SystemRoot:-}" ]; then
        printf '%s\n' "$SystemRoot/System32/drivers/etc/hosts"
    else
        printf '%s\n' /etc/hosts
    fi
}

if ! grep -qF "$MARKER" "$(hosts_file)" 2>/dev/null; then
    echo "acceptance: SKIPPED — Cairn is not in force on this machine, so there is"
    echo "            nothing to check. Apply protection first, then run this."
    exit 0
fi

if ! grep -qF " $DOMAIN" "$(hosts_file)" 2>/dev/null; then
    echo "acceptance: SKIPPED — $DOMAIN is not one of the protected addresses here."
    exit 0
fi

resolve() {
    # Whatever this platform has. Each prints the address a name resolves to.
    if command -v getent >/dev/null 2>&1; then
        getent hosts "$1" | awk '{print $1}' | head -1
    elif command -v dscacheutil >/dev/null 2>&1; then
        dscacheutil -q host -a name "$1" | awk '/^ip_address:/{print $2}' | head -1
    elif command -v powershell.exe >/dev/null 2>&1; then
        powershell.exe -NoProfile -Command \
            "(Resolve-DnsName -Name '$1' -Type A -ErrorAction SilentlyContinue |
              Select-Object -First 1).IPAddress" 2>/dev/null | tr -d '\r'
    else
        echo "no resolver tool available" >&2
        return 2
    fi
}

address=$(resolve "$DOMAIN")

if [ -z "$address" ]; then
    echo "acceptance: $DOMAIN does not resolve at all"
    exit 0
fi

case "$address" in
    127.0.0.1 | ::1 | 0.0.0.0 | ::)
        echo "acceptance: $DOMAIN resolves to $address — protection is in force for a"
        echo "            client that is not a browser"
        exit 0
        ;;
    *)
        echo "acceptance: $DOMAIN resolves to $address — not protected on this machine" >&2
        echo "            (run this with protection on, and with $DOMAIN protected)" >&2
        exit 1
        ;;
esac
