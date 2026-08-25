#!/usr/bin/env node
/**
 * Guard: nothing here can charge anybody (FR-054, SC-021).
 *
 * Everything in the v1 specification is free, permanently, with no account, no
 * trial, and no usage limit — and no feature may move from free to paid. The
 * way to keep that true is for there to be no code path that could implement
 * it: no payment, no entitlement, no licence check, no trial clock, no tier.
 *
 * Cairn's users include people in genuine recovery. A paywall in front of a
 * wall someone is leaning on is not a business model.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SCAN = [
  { dir: 'src', exts: ['.ts', '.tsx'] },
  { dir: 'src-tauri/src', exts: ['.rs'] },
  { dir: 'src-tauri/helper/src', exts: ['.rs'] },
];

const FORBIDDEN = [
  { pattern: /\b(stripe|paddle|lemonsqueezy|paypal|braintree)\b/i, why: 'a payment provider' },
  { pattern: /\b(subscription|subscribe_to_plan|billing|invoice)\b/i, why: 'billing' },
  { pattern: /\b(entitlement|licen[cs]e_key|licen[cs]e_check|activation_key)\b/i, why: 'a licence check' },
  { pattern: /\b(free_trial|trial_ends|trial_days|is_trial)\b/i, why: 'a trial clock' },
  { pattern: /\b(premium|pro_tier|paid_tier|upgrade_to|paywall)\b/i, why: 'a tier' },
  { pattern: /\b(sign_?in|sign_?up|create_account|log_?in_required)\b/i, why: 'an account' },
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
  console.error(`free: ${hits} occurrence(s). Everything in v1 is free, permanently.`);
  process.exit(1);
}
console.log('free: clean');
