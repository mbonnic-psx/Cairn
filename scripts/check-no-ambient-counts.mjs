#!/usr/bin/env node
/**
 * Guard: nothing may put a reach in front of someone who did not ask (FR-030a,
 * FR-030b, SC-006 of slice 002; FR-033 of slice 003).
 *
 * Reaches are there for someone who goes looking, and for nobody else. A number
 * that follows a person around — in a header, a tray, a badge, a dock — is a
 * reminder of the thing they are trying to walk away from.
 *
 * # Why this replaced a simpler check
 *
 * Slice 002 could state the rule as *one screen may show reaches*, because there
 * was one. Slice 003 adds three more places a person deliberately navigates to —
 * the check-in, the history, and a single day — and the rule has to go back to
 * being about the intent rather than the count of screens.
 *
 * So the check now says three things where it used to say one:
 *
 *   1. Reach data may appear on the screens someone navigated to, and be
 *      declared in the typed IPC wrappers. Nowhere else.
 *   2. A badge, a tray, a dock overlay, or a progress surface is forbidden
 *      **everywhere, with no exceptions** — including on the screens in (1).
 *      The old check exempted its one allowed screen from every rule at once, so
 *      `navigator.setAppBadge(3)` inside Reaches.tsx passed. Verified: it did.
 *      Widening the allowlist to four screens would have multiplied that hole
 *      by four rather than closing it.
 *   3. The application shell — App.tsx, main.tsx, and the shared components —
 *      may not touch reach data by any name at all. Not a count, not a call, not
 *      an import. The shell is what a person sees on the way past, and the way
 *      past is exactly where none of this belongs.
 *
 * The rule set is therefore strictly larger than the one it replaces, which is
 * the only acceptable direction for a guard to move.
 *
 * # A note on `getDay`
 *
 * The `get_day` command's frontend wrapper is deliberately named `getDayView`.
 * `getDay` is a `Date` method, so guarding the shorter name would false-positive
 * on every date calculation in the codebase and the guard would be edited into
 * uselessness within a week.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, sep, normalize } from 'node:path';

const ROOT = 'src';

/** Screens a person reaches by deliberate navigation. Reach data may appear here. */
const NAVIGATED_TO = [
  join('src', 'screens', 'Reaches.tsx'),
  join('src', 'screens', 'CheckIn.tsx'),
  join('src', 'screens', 'History.tsx'),
  join('src', 'screens', 'Day.tsx'),
];

/** The shell. Reach data may not appear here under any name. */
const SHELL = [join('src', 'App.tsx'), join('src', 'main.tsx'), join('src', 'components') + sep];

/** Reach data: allowed on the navigated-to screens, declarable in `src/ipc/`. */
const REACH_DATA = [
  { pattern: /list_todays_reaches|listTodaysReaches/, why: 'reach data' },
  { pattern: /list_reaches|listReaches/, why: 'reach data' },
  { pattern: /summarize_reaches|summarizeReaches/, why: 'a reach summary' },
  { pattern: /\bget_day\b|getDayView/, why: "a day's reaches" },
  { pattern: /reachCount|reach_count|todaysReaches/, why: 'a reach count' },
  { pattern: /estimates_excluded|estimatesExcluded/, why: 'reach summary data' },
  { pattern: /\bby_hour\b|\bby_site\b|\bby_weekday\b/, why: 'a reach breakdown' },
];

/**
 * Ambient surfaces. Forbidden everywhere — there is no screen on which putting
 * a number into the operating system's furniture is acceptable, because the
 * point of the furniture is that it is visible without being visited.
 */
const ALWAYS_FORBIDDEN = [
  { pattern: /setAppBadge|clearAppBadge|badgeCount|setBadge/, why: 'a badge' },
  { pattern: /TrayIcon|api\/tray|plugin-tray/, why: 'a tray surface' },
  { pattern: /setOverlayIcon/, why: 'a taskbar overlay' },
  { pattern: /setProgressBar/, why: 'a dock or taskbar progress surface' },
];

const isTest = (p) => p.includes('__tests__') || /\.(test|spec)\.[jt]sx?$/.test(p);
const under = (p, list) => list.some((entry) => p.endsWith(entry) || p.includes(entry));

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
const report = (file, index, why, line) => {
  console.error(`${file}:${index + 1}  ${why}`);
  console.error(`  ${line.trim().slice(0, 80)}\n`);
  hits += 1;
};

for (const file of walk(ROOT)) {
  // Tests do not ship, and a test asserting a surface is absent has to name it.
  // Same exemption the streak guard makes, for the same reason.
  if (isTest(file)) continue;

  const path = normalize(file);
  const navigatedTo = under(path, NAVIGATED_TO);
  const isShell = under(path, SHELL);
  const isIpcWrapper = path.includes(join('src', 'ipc') + sep);

  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      // (2) Ambient surfaces: no file is exempt, navigated-to screens included.
      for (const { pattern, why } of ALWAYS_FORBIDDEN) {
        if (pattern.test(line)) report(file, index, `${why} — forbidden on every surface`, line);
      }

      // (1) and (3) Reach data: the navigated-to screens and the typed wrappers
      // may hold it. The shell may not, and neither may anything else.
      for (const { pattern, why } of REACH_DATA) {
        if (!pattern.test(line)) continue;
        if (navigatedTo || isIpcWrapper) continue;
        const where = isShell ? 'in the application shell' : 'outside the screens someone navigates to';
        report(file, index, `${why} ${where}`, line);
      }
    });
}

if (hits > 0) {
  console.error(`ambient counts: ${hits} surface(s) that nobody asked to see.`);
  console.error('Someone must have to walk to their reaches. Nothing may walk them there.');
  process.exit(1);
}
console.log('ambient counts: clean');
