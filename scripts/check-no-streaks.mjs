#!/usr/bin/env node
/**
 * Guard: no streak, no day count, no chain (FR-053, SC-020).
 *
 * Streaks are opt-in, reversible, and a later slice. In this release there is
 * no counter, no "day N", and no chain imagery anywhere — and turning streaks
 * off must never produce a loss moment, which starts with there being nothing
 * to lose.
 *
 * The deeper reason: a chain you can break is a thing to be broken. Cairn does
 * not build one and then ask someone to be careful with it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SCAN = [
  { dir: 'src', exts: ['.ts', '.tsx', '.css'] },
  { dir: 'src-tauri/src', exts: ['.rs'] },
];

const FORBIDDEN = [
  { pattern: /\bstreak/i, why: 'a streak' },
  { pattern: /\bday\s+\{?\d|\bday\s+\{count|\bday\s+\{n\b/i, why: 'a day count' },
  { pattern: /\bchain\b/i, why: 'chain imagery' },
  { pattern: /\bin a row\b/i, why: 'a run to keep going' },
  { pattern: /\bdon'?t break\b/i, why: 'something to break' },
  { pattern: /\bbest\s+(run|streak)\b/i, why: 'a record to beat' },
];

const isTest = (path) => path.includes('__tests__') || /\.(test|spec)\.[jt]sx?$/.test(path);

function walk(dir, exts, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === 'node_modules' || entry === 'target') continue;
      walk(path, exts, out);
    } else if (exts.includes(extname(path)) && !isTest(path)) {
      out.push(path);
    }
  }
  return out;
}

let hits = 0;
for (const { dir, exts } of SCAN) {
  for (const file of walk(dir, exts)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        for (const { pattern, why } of FORBIDDEN) {
          if (!pattern.test(line)) continue;
          console.error(`${file}:${index + 1}  ${why}`);
          console.error(`  ${line.trim().slice(0, 80)}\n`);
          hits += 1;
        }
      });
  }
}

if (hits > 0) {
  console.error(`streaks: ${hits} occurrence(s). Nothing in this release counts days.`);
  process.exit(1);
}
console.log('streaks: clean');
