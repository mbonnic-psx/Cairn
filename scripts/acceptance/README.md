# Acceptance runs

Two of Cairn's success criteria cannot honestly be claimed from unit tests. They
are about what happens on a real machine, in real applications, and they are
checked by running them.

## Scripted, per platform, in CI

`non-browser-client.sh` — SC-002. A protected address resolves to loopback (or
to nothing) for a client that is not a browser. Runs on Windows, macOS, and
Linux on every push.

## Manual, per release

SC-002 and SC-003 also cover browsers, and browsers are exactly where coverage
can be lost through no fault of Cairn's: some ship encrypted DNS that bypasses
the system resolver entirely (research R9). That has to be *seen*, per platform,
per browser.

Run this matrix before a release, and record the result — including the
failures. A row that does not hold is a disclosure to write (FR-009a), not a
result to bury.

| Platform | Browser | Protected site loads? | Notes |
| --- | --- | --- | --- |
| Windows 10+ | Edge (default) | | |
| Windows 10+ | Chrome | | |
| Windows 10+ | Firefox | | check encrypted DNS setting |
| macOS 13+ | Safari (default) | | |
| macOS 13+ | Chrome | | |
| macOS 13+ | Firefox | | check encrypted DNS setting |
| Linux | platform default | | |
| Linux | Chrome | | |
| Linux | Firefox | | check encrypted DNS setting |

For each row:

1. Protect a test address and confirm protection reads as in force.
2. Open the browser **fresh** and attempt the address. A browser that was
   already open may hold its own cache — that is a known limit, and it is why
   SC-002 counts attempts rather than instantaneous transitions.
3. Note what happened. "Loads anyway, browser has encrypted DNS on" is a valid
   and important result.

Then the part that is easy to skip and matters most:

4. Turn protection off — through the waiting period, as a person would — and
   confirm the machine is byte-for-byte as it was, with no residue reported.
