#!/usr/bin/env bash
# Guard: src-tauri/src/domain/ stays pure (Constitution: platform abstraction, T008).
#
# The four constitution-critical functions live here. They take plain values,
# return plain values, and reach for nothing else: no filesystem, no network, no
# clock, no platform conditionals. That is what makes them testable as the
# constitution requires, and what keeps platform differences out of domain code.
set -euo pipefail

DOMAIN_DIR="${1:-src-tauri/src/domain}"
status=0

report() {
    printf '  %s\n' "$1" >&2
    status=1
}

if [ ! -d "$DOMAIN_DIR" ]; then
    echo "domain purity: no such directory: $DOMAIN_DIR" >&2
    exit 1
fi

# Platform conditionals.
if hits=$(grep -rnE 'cfg!?\(\s*(target_os|target_family|windows|unix)' "$DOMAIN_DIR" || true); [ -n "$hits" ]; then
    echo "domain purity: platform conditionals in domain code" >&2
    while IFS= read -r line; do report "$line"; done <<< "$hits"
fi

# I/O, clocks, and randomness — anything that makes a pure function untestable.
patterns='std::fs|std::net|std::process|std::env|std::io::(std|Read|Write)|File::|SystemTime::now|Instant::now|tokio::|rusqlite|keyring|reqwest|print(ln)?!|eprint(ln)?!'
if hits=$(grep -rnE "$patterns" "$DOMAIN_DIR" || true); [ -n "$hits" ]; then
    echo "domain purity: I/O, clock, or environment access in domain code" >&2
    while IFS= read -r line; do report "$line"; done <<< "$hits"
fi

if [ "$status" -ne 0 ]; then
    cat >&2 <<'MSG'

The domain module must stay pure. Move the impure part to store/, platform/, or
enforcement/ and pass the result in as a plain value.
MSG
    exit 1
fi

echo "domain purity: clean ($DOMAIN_DIR)"
