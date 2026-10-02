#!/usr/bin/env node
/**
 * Guard: a Rust test that uses Unix-only APIs is gated to Unix.
 *
 * CI builds and runs every test on Windows, and cross-checks the other
 * platforms. `std::os::unix`, `PermissionsExt`, `Permissions::from_mode` and
 * the Unix sockets do not exist there, so one ungated use breaks the whole
 * test target on Windows. The machine this project is developed on can only
 * build for Linux (the bundled SQLCipher does not cross-compile), so nothing
 * local catches it, and it reached CI twice in one day (PRs #17 and #22).
 *
 * Accepted: the file is `#![cfg(unix)]`, or the use sits inside a top-level
 * item (a `fn`, `use`, `mod`, `impl`, `const` or `static` at column 0) whose
 * attributes include `#[cfg(unix)]`. `target_family = "unix"`, `not(windows)`
 * and the Unix target OSes count as Unix. Integration tests only: a module
 * under `src/` is gated where it is declared, which this does not follow.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src-tauri/tests', 'src-tauri/helper/tests'];

const UNIX_ONLY = /std::os::unix|os::unix::|\bPermissionsExt\b|\bfrom_mode\s*\(|\bUnix(Listener|Stream|Datagram)\b/;

const UNIX_CFG =
  /cfg\((?:[^)]*\b(?:unix|target_family\s*=\s*"unix"|not\(windows\)|target_os\s*=\s*"(?:linux|macos|freebsd|openbsd)")\b)/;

const TOP_LEVEL_ITEM = /^(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:fn|use|mod|impl|const|static|struct|enum|trait)\b/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith('.rs')) out.push(path);
  }
  return out;
}

/** The attribute lines directly above line `index`, skipping comments and blanks. */
function attributesAbove(lines, index) {
  const attributes = [];
  for (let i = index - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('//')) continue;
    if (line.startsWith('#[')) {
      attributes.push(line);
      continue;
    }
    break;
  }
  return attributes;
}

let hits = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const fileGated = lines.some((line) => /^\s*#!\[/.test(line) && UNIX_CFG.test(line));
    if (fileGated) continue;

    let itemStart = -1;
    lines.forEach((line, index) => {
      if (TOP_LEVEL_ITEM.test(line)) itemStart = index;
      const code = line.replace(/\/\/.*$/, '');
      if (!UNIX_ONLY.test(code)) return;
      const gated =
        itemStart >= 0 && attributesAbove(lines, itemStart).some((attribute) => UNIX_CFG.test(attribute));
      if (gated) return;
      console.error(`${file}:${index + 1}  a Unix-only API outside a #[cfg(unix)] item`);
      console.error(`  ${line.trim().slice(0, 90)}\n`);
      hits += 1;
    });
  }
}

if (hits > 0) {
  console.error(
    `unix-gated tests: ${hits} use(s). Gate the test, its import and its helpers with #[cfg(unix)], ` +
      'or the file with #![cfg(unix)]: Windows CI cannot build them otherwise.',
  );
  process.exit(1);
}
console.log('unix-gated tests: clean');
