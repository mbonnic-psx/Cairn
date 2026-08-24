#!/usr/bin/env node
/**
 * Guard: no ambient reach surface anywhere (FR-030a, FR-030b, SC-006).
 *
 * Recorded reaches are visible on exactly one screen, reached by deliberate
 * navigation. Nothing counts up in a header, a tray, a badge, or a card on the
 * way past. Nothing hints that there is something new to look at.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, sep } from 'node:path';

const REACHES_SCREEN = join('src', 'screens', 'Reaches.tsx');
const ROOT = 'src';

/** Anything that would put a reach in front of someone who did not ask. */
const AMBIENT = [
  { pattern: /list_todays_reaches|listTodaysReaches/, why: 'reach data outside the Reaches screen' },
  { pattern: /reachCount|reach_count|todaysReaches/, why: 'a reach count held outside the Reaches screen' },
  { pattern: /setAppBadge|badgeCount|setBadge/, why: 'a badge' },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === 'node_modules') continue;
      walk(path, out);
    } else if (['.ts', '.tsx'].includes(extname(path))) {
      out.push(path);
    }
  }
  return out;
}

let hits = 0;
for (const file of walk(ROOT)) {
  const normalized = file.split('/').join(sep);
  const isReachesScreen = normalized.endsWith(REACHES_SCREEN);
  const isIpcWrapper = normalized.includes(join('src', 'ipc'));
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const { pattern, why } of AMBIENT) {
      if (!pattern.test(line)) continue;
      // The typed wrapper must declare the command; the Reaches screen is its
      // one caller. Everywhere else, this is an ambient surface.
      if (isReachesScreen) continue;
      if (isIpcWrapper && pattern.source.includes('list_todays_reaches')) continue;
      console.error(`${file}:${index + 1}  ${why}`);
      console.error(`  ${line.trim().slice(0, 80)}\n`);
      hits += 1;
    }
  });
}

if (hits > 0) {
  console.error(`ambient counts: ${hits} surface(s) outside the Reaches screen.`);
  console.error('Someone must have to walk to their reaches. Nothing may walk them there.');
  process.exit(1);
}
console.log('ambient counts: clean');
