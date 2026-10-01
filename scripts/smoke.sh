#!/usr/bin/env bash
# Smoke: prove Cairn starts, without touching the person's own data.
#
#   scripts/smoke.sh interface   the interface is served and answers
#   scripts/smoke.sh app         the desktop app opens its window and stays up
#
# The gate's `make smoke` runs these (project.json, `smoke`); `make verify` never
# does, because the app needs a display and the webview toolchain.
#
# The app runs against a throwaway data directory (XDG_DATA_HOME), so first-run
# seeding never lands in the person's own Cairn data. Protection stays off, so
# nothing is written to a system file and no counting port is held.
#
# "Answers" for the app means it got past opening its window: main.rs panics
# with "Cairn could not open its window" when it cannot, and the process exits.
# Still running after SETTLE seconds is the proof.
set -euo pipefail

cd "$(dirname "$0")/.."

target="${1:-}"
case "$target" in
    interface | app) ;;
    *)
        echo "usage: scripts/smoke.sh interface|app" >&2
        exit 2
        ;;
esac

port=1420 # tauri.conf.json devUrl, and vite.config.ts strictPort
settle="${SETTLE:-20}"
work="$(mktemp -d)"
pids=()

cleanup() {
    for pid in "${pids[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    rm -rf "$work"
}
trap cleanup EXIT

if curl -s -o /dev/null "http://127.0.0.1:$port/"; then
    echo "smoke: port $port is already in use; stop \`npm run tauri dev\` first" >&2
    exit 1
fi

node_modules/.bin/vite --host 127.0.0.1 --port "$port" --strictPort >"$work/vite.log" 2>&1 &
pids+=("$!")

for _ in $(seq 60); do
    curl -sf -o "$work/index.html" "http://127.0.0.1:$port/" && break
    sleep 0.5
done
if ! grep -q '<div id="root">' "$work/index.html" 2>/dev/null; then
    echo "smoke: the interface did not answer on 127.0.0.1:$port within 30 s" >&2
    cat "$work/vite.log" >&2
    exit 1
fi
if [ "$target" = interface ]; then
    echo "smoke: the interface answers on 127.0.0.1:$port"
    exit 0
fi

(cd src-tauri && cargo build --no-default-features --features app)

XDG_DATA_HOME="$work/data" src-tauri/target/debug/cairn >"$work/app.log" 2>&1 &
app="$!"
pids+=("$app")

sleep "$settle"
if ! kill -0 "$app" 2>/dev/null; then
    status=0
    wait "$app" || status=$?
    echo "smoke: Cairn exited (status $status) before it had been up $settle s" >&2
    cat "$work/app.log" >&2
    exit 1
fi
echo "smoke: Cairn opened its window and was still running after $settle s"
