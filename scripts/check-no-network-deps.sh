#!/usr/bin/env bash
# Guard: nothing Cairn builds can speak to the network.
# Constitution Principle II — no analytics, no crash reports, no update checks,
# no license checks. Not "we do not call it": it is not in the binary.
#
# This reads the resolved build graph per desktop target rather than Cargo.lock.
# The lockfile lists every dependency of every target, including the mobile-only
# ones Cairn never builds — a lockfile check reports `tauri`'s Android/iOS
# `reqwest` as a violation when nothing on a desktop target links it.
set -euo pipefail

MANIFEST="${MANIFEST:-src-tauri/Cargo.toml}"

# The three platforms Cairn ships to. A crate reaching the network on any one of
# them is a violation on all of them.
TARGETS=(
    x86_64-unknown-linux-gnu
    x86_64-pc-windows-msvc
    aarch64-apple-darwin
)

# Crates whose purpose is outbound traffic, or that exist to report on the person.
BANNED='^(reqwest|hyper|hyper-util|ureq|isahc|curl|curl-sys|surf|attohttpc|awc|hyper-tls|http-body|sentry|sentry-core|posthog|mixpanel|segment|amplitude|opentelemetry|opentelemetry-otlp|tracing-opentelemetry|self_update|tauri-plugin-updater|tauri-plugin-http)$'

if ! command -v cargo >/dev/null 2>&1; then
    echo "no-network-deps: cargo not on PATH — cannot resolve the build graph" >&2
    exit 1
fi

status=0
for target in "${TARGETS[@]}"; do
    graph=$(cargo tree --manifest-path "$MANIFEST" --workspace --target "$target" \
        -e normal,build --prefix none --format '{p}' 2>/dev/null |
        awk '{print $1}' | sort -u)

    hits=$(printf '%s\n' "$graph" | grep -E "$BANNED" || true)
    if [ -n "$hits" ]; then
        echo "no-network-deps: network-capable crates build on $target:" >&2
        while IFS= read -r crate; do
            printf '  %s\n' "$crate" >&2
            cargo tree --manifest-path "$MANIFEST" --workspace --target "$target" \
                -i "$crate" -e normal,build --prefix depth 2>/dev/null | sed 's/^/    /' >&2 || true
        done <<< "$hits"
        status=1
    fi
done

if [ "$status" -ne 0 ]; then
    cat >&2 <<'MSG'

Cairn makes no outbound calls of any kind. Remove the dependency, or turn off the
feature that pulls it in. If it is genuinely unreachable on every desktop target,
say why here rather than widening the allowance.
MSG
    exit 1
fi

echo "no-network-deps: clean on ${#TARGETS[@]} desktop targets"
