# Running cairn

What is proven about running each application that existed before the delivery method did — the command, the
port, what has to be seeded first, the runtime it actually needs and the ones it cannot run on — written by
whoever proved it, with the date. This file is the repository's own: `slipwai migrate` and `/survey` never
rewrite it, and `skills/run-the-app/SKILL.md` points here. Record what was proven, not what a README promises,
and record the run that failed too: a runtime the gate compiles on and the application cannot load is the kind
of fact that is only ever learned once if it is written down.

## `.` (typescript)

Proven 2026-09-30, on WSL2 (Ubuntu 26.04, WSLg) with Node 22.

- **Start:** `npm run dev` serves the interface with Vite on `127.0.0.1:1420`. The port is fixed
  (`strictPort` in `vite.config.ts`) because `src-tauri/tauri.conf.json` loads it as `devUrl`.
- **Proof:** `scripts/smoke.sh interface` starts Vite, waits up to 30 s for `/` to return a page that holds
  `<div id="root">`, then stops it. It exits 1 when the port is already taken, for example by a running
  `npm run tauri dev`.
- **Seeded first:** nothing. `npm ci`.
- **Alone it is not the product:** in a browser, every IPC call has no core to answer it. The app below is
  what a person runs.

## `src-tauri` (rust)

Proven 2026-09-30, on WSL2 (Ubuntu 26.04, WSLg) with rustc 1.98.0 and Node 22.

- **Start:** `npm run tauri dev`. It serves the interface (above), then runs `cargo run --no-default-features
  --features app` in `src-tauri/` and opens the window. The first build took about a minute.
- **Needs:** the webview toolchain, the packages Cairn's CI installs for its `core` job, plus the D-Bus
  headers `keyring` builds against: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  libssl-dev libdbus-1-dev pkg-config`. Without `libdbus-1-dev`, `libdbus-sys`'s build script stops the
  build. That is why the gate's `lint`, `typecheck` and `test` use `--no-default-features`, as CI's `domain`
  job does.
- **Proof:** `scripts/smoke.sh app` serves the interface, builds the app, and runs it against a throwaway
  `XDG_DATA_HOME`, so first-run seeding never touches the person's own `~/.local/share/Cairn`. It passes
  when the process is still up after 20 s (`SETTLE`). When the window cannot open, `main.rs` panics and the
  process exits, and so does the smoke test.
- **Seen failing, on purpose:** with `GDK_BACKEND=x11 DISPLAY=:99` (no display) the app exited 101 with
  `Failed to initialize GTK`, and the smoke test exited 1. Unsetting `WAYLAND_DISPLAY` alone is not enough
  to reproduce that: GTK falls back to WSLg's `wayland-0`.
- **Seen on WSLg, harmless:** `libEGL warning` and `MESA: error: ZINK: failed to choose pdev`. There is no
  GPU, so the webview renders in software.
- **Protection stays off in a smoke run:** nothing is written to the hosts file, and no counting port is held.
- **Not proven:** the privileged helper's install and elevation path, and Windows and macOS. Those still need
  a run on each platform.
