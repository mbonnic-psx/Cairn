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

# In CI this check is the only automated evidence for SC-002, so a skip there is
# a failure: a job that goes green having verified nothing is worse than a red
# one. Run by hand, a skip is just a skip.
REQUIRE="${CAIRN_ACCEPTANCE_REQUIRED:-0}"

skipped() {
    echo "acceptance: SKIPPED — $1"
    echo "            hosts file looked at: $(hosts_file)"
    if [ "$REQUIRE" = "1" ]; then
        echo "acceptance: this run required the check to happen, so that is a failure." >&2
        exit 1
    fi
    exit 0
}

# Where this platform keeps the file.
#
# On Windows the variable naming is not dependable: bash on a GitHub runner may
# expose SYSTEMROOT rather than SystemRoot, and taking the /etc/hosts fallback
# there silently points at Git Bash's own copy — a real file, with no Cairn
# section, which reads exactly like "protection is not in force". That is how
# this check skipped on Windows while the job stayed green.
hosts_file() {
    local root="${SystemRoot:-${SYSTEMROOT:-${WINDIR:-}}}"

    if [ -z "$root" ]; then
        case "$(uname -s 2>/dev/null)" in
            MINGW* | MSYS* | CYGWIN*) root='C:\Windows' ;;
            *)
                printf '%s\n' /etc/hosts
                return
                ;;
        esac
    fi

    # A Windows path — C:\Windows — and the shell tools here read a backslash as
    # an escape. cygpath is what Git Bash ships for exactly this.
    if command -v cygpath >/dev/null 2>&1; then
        cygpath -u "$root\\System32\\drivers\\etc\\hosts"
    else
        printf '%s\n' "${root//\\//}/System32/drivers/etc/hosts"
    fi
}

if [ ! -r "$(hosts_file)" ]; then
    skipped "Cairn cannot read this machine's list of site addresses."
fi

if ! grep -qF "$MARKER" "$(hosts_file)" 2>/dev/null; then
    skipped "Cairn is not in force on this machine, so there is nothing to check."
fi

if ! grep -qF " $DOMAIN" "$(hosts_file)" 2>/dev/null; then
    skipped "$DOMAIN is not one of the protected addresses here."
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
