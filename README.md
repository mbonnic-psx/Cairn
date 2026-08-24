# Cairn

A cross-platform desktop website blocker with a recovery layer. Blocks at the
system level, reflects at the end of the day. Local-first, free forever.

## What Cairn does

You choose what to protect — from nine preset lists, or by typing addresses
yourself — and Cairn puts that in force for the whole machine. Protected sites
fail to load in every application that asks this machine where a site is. Cairn
checks its own work every minute and puts it back if something changes it.

When you reach for something you have protected, Cairn records the address and
the time. Nothing appears: no page, no notification, no sound, no badge. A reach
is information, not a failure, and you see it only if you go and look.

## What Cairn does not do

Being honest about this matters more than sounding capable.

- **A determined person with administrator access to this machine can defeat
  Cairn.** It is a wall to walk away from, not a lock. Everything Cairn changes
  is documented, inventoried, and removable — which necessarily means removable
  by someone who decides to remove it.
- **An application that looks up addresses on its own is not covered in this
  release.** Some browsers can be configured to do that. Closing that gap is a
  later piece of work, and until it lands, Cairn names it rather than implying
  coverage it does not have.
- **A browser that has already loaded a site may keep showing it from its own
  cache** for a short while after you protect it. A system cache flush does not
  reach inside a browser.
- **Turning protection off takes a day.** Every reduction — protection off,
  removing an address, switching a list off — waits 24 hours, with protection
  fully in force throughout. You can cancel at any point in that day. There is no
  way to skip it, and there is no in-moment bypass of any kind.

## What Cairn keeps

Everything stays on this machine. There are no accounts, no sign-in, and no
outbound network calls of any kind — not for analytics, crash reports, feature
flags, licence checks, or update pings. A CI check fails the build if a crate
that can speak to the network enters the dependency tree.

What Cairn records about a reach is the address and the time, and nothing else.
No path, no query string, no page content, no application name. The history is
encrypted at rest with a key held in your platform's own credential store; you
are never asked for a passphrase to read your own entries. That protects your
history if the drive is copied or the machine is lost. It does not protect it
from someone using this machine while it is unlocked.

## What Cairn changes on your machine

Before the first modification, Cairn writes a one-time backup of the true
pre-Cairn state. It edits only inside its own marked section, and everything
outside that section is byte-identical afterwards — asserted by a property-based
test across apply, repair, and teardown.

Every change is recorded in an inventory, including the background component
Cairn installs to keep protection in force. Teardown walks that inventory in
reverse, verifies each removal, and reports anything it could not remove rather
than claiming success.

## Free

Everything described in [`specs/001-cairn-v1/spec.md`](specs/001-cairn-v1/spec.md)
is free, permanently, with no account, trial, or usage limit. No feature moves
from free to paid.

## Building

Requires Rust 1.83+ and Node 20+.

```sh
npm install
npm run check          # the constitutional guards
npm test               # frontend
cd src-tauri
cargo test -p cairn --no-default-features   # domain, stores, enforcement
cargo test -p cairn-helper                  # privileged verbs and teardown
cargo test --workspace                      # everything, needs a GUI toolchain
npm run tauri dev      # the application
```

On Linux the full build additionally needs `libwebkit2gtk-4.1-dev` and
`libssl-dev`.

## Working on Cairn

Read [`VISION.md`](VISION.md) and
[`.specify/memory/constitution.md`](.specify/memory/constitution.md) first. The
constitution is binding, and it wins over convenience.
