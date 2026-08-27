#!/usr/bin/env node
/**
 * Guard: banned words never reach a person (FR-050, SC-019).
 *
 * Constitution VI. A reach is information, not failure — so the vocabulary of
 * failure is not available to us, anywhere a person can read it.
 *
 *   failed · denied · violation · relapsed · forbidden · you lost
 *
 * Write instead: protected, you reached for this, a slip, back on the trail.
 *
 * Scope is deliberately the strings a person can actually see: the frontend, the
 * IPC layer whose Result errors are shown as written (contracts/ui-ipc.md), and
 * shipped resource text. Internal Rust error text elsewhere is not user-facing
 * and is not scanned; if you route one of those to the UI, it must come through
 * ipc/ and it will be checked here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const BANNED = [
  { word: 'failed', instead: 'did not hold / could not be verified' },
  { word: 'fail', instead: 'did not hold' },
  { word: 'denied', instead: 'not available' },
  { word: 'violation', instead: 'a slip' },
  { word: 'relapsed', instead: 'a slip' },
  { word: 'relapse', instead: 'a slip' },
  { word: 'forbidden', instead: 'protected' },
  { word: 'you lost', instead: 'back on the trail' },
];

const SCAN = [
  { dir: 'src', exts: ['.ts', '.tsx'] },
  // All of the core, not just the command layer. A sentence shown to a person
  // is shipped text wherever it is written, and scanning only `ipc` made that a
  // question of which file it landed in: the sentence Windows shows when Cairn
  // cannot count lives in `helper.rs`, and went unchecked for exactly that
  // reason.
  { dir: 'src-tauri/src', exts: ['.rs'] },
  { dir: 'src-tauri/resources', exts: ['.json', '.txt'] },
];

/** Lines carrying this marker are code, not copy — e.g. a Rust variant name. */
const ALLOW_MARKER = 'cairn-allow-banned-word';

/**
 * Tests are not shipped text. They are also where the banned words legitimately
 * appear, as the thing being asserted against — a test that checks Cairn never
 * says "denied" has to write "denied" somewhere.
 */
const isTest = (path) =>
  path.includes('__tests__') || /\.(test|spec)\.[jt]sx?$/.test(path);

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

/**
 * User-visible text only: string and template literals, and JSX text between
 * tags. Identifiers, imports, and type names are code and are left alone.
 */
function extractStrings(source) {
  const found = [];
  const patterns = [
    /"((?:[^"\\\n]|\\.)*)"/g, // double-quoted
    /'((?:[^'\\\n]|\\.)*)'/g, // single-quoted
    /`((?:[^`\\]|\\.)*)`/g, // template
    />([^<>{}\n]{2,})</g, // JSX text between tags
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const before = source.slice(0, match.index);
      found.push({ text: match[1], line: before.split('\n').length });
    }
  }
  return found;
}

let hits = 0;
for (const { dir, exts } of SCAN) {
  for (const file of walk(dir, exts)) {
    const source = readFileSync(file, 'utf8');
    const lines = source.split('\n');
    for (const { text, line } of extractStrings(source)) {
      if ((lines[line - 1] ?? '').includes(ALLOW_MARKER)) continue;
      for (const { word, instead } of BANNED) {
        const boundary = new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`, 'i');
        if (boundary.test(text)) {
          console.error(`${file}:${line}  "${word}" in: ${text.trim().slice(0, 70)}`);
          console.error(`  write instead: ${instead}\n`);
          hits += 1;
        }
      }
    }
  }
}

if (hits > 0) {
  console.error(`banned words: ${hits} occurrence(s) in shipped text.`);
  console.error('A reach is information, not failure. Rewrite the sentence.');
  process.exit(1);
}
console.log('banned words: clean');
