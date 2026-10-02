/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';

const nodeFs = 'node:' + 'fs';
const { readFileSync, readdirSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
  readdirSync: (path: string) => string[];
};
const notebook = readFileSync('src/styles/notebook.css', 'utf8');

const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
interface Rule {
  selector: string;
  body: string;
}
function rulesOf(css: string): Rule[] {
  const out: Rule[] = [];
  for (const m of noComments(css).matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    out.push({ selector: m[1]!.trim(), body: m[2]! });
  }
  return out;
}
const ruleIn = (css: string, selector: string) =>
  rulesOf(css).filter((r) => r.selector.split(',').map((x) => x.trim()).includes(selector));

const css = noComments(notebook);
const narrowBlock = css.match(/@media \(max-width: 1099px\)\s*\{([\s\S]*?\n\})\s*\n/)?.[1] ?? '';
const forcedBlock = css.match(/@media \(forced-colors: active\)\s*\{([\s\S]*?\n\})\s*$/m)?.[1] ?? '';
const baseCss = css.replace(narrowBlock, '').replace(forcedBlock, '');

type LookName = 'morning' | 'midday' | 'night';
const blockOf = (look: LookName) => css.match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
function token(name: string, look: LookName): string {
  const m = blockOf(look).match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!m) throw new Error(`token ${name} is not a hex colour in the ${look} block of notebook.css`);
  return m[1]!;
}

/** (left − right) / 2 from a `padding: top right bottom left` declaration. */
function offsetOf(scope: string): number {
  const body = ruleIn(scope, '.nb-page-area').find((r) => /padding:/.test(r.body))?.body ?? '';
  const v = body.match(/padding:\s*(\d+)px\s+(\d+)px\s+(\d+)px\s+(\d+)px/);
  if (!v) throw new Error('.nb-page-area has no four-value padding in this scope');
  return (Number(v[4]) - Number(v[2])) / 2;
}

describe('the fold (FR-034)', () => {
  const expected: Array<[LookName, string]> = [
    ['morning', '#e3d6bf'],
    ['midday', '#e3d6bf'],
    ['night', '#dccdb1'],
  ];
  it.each(expected)('the %s look defines --nb-fold as the canvas colour, held visibly apart from the paper', (look, hex) => {
    expect(token('--nb-fold', look).toLowerCase()).toBe(hex);
    expect(contrastRatio(token('--nb-fold', look), token('--nb-paper', look))).toBeGreaterThanOrEqual(1.2);
  });

  it('is drawn in one rule, .nb-fold, as a 1px line from --nb-fold, full height and inert', () => {
    const reading = rulesOf(notebook).filter((r) => /var\(--nb-fold\)/.test(r.body) && !/forced/.test(r.selector));
    expect(reading).toHaveLength(1);
    expect(reading[0]!.selector).toBe('.nb-fold');
    const body = reading[0]!.body;
    expect(body).toMatch(/border-left:\s*1px solid var\(--nb-fold\)/);
    expect(body).toMatch(/position:\s*absolute/);
    expect(body).toMatch(/top:\s*0\b/);
    expect(body).toMatch(/bottom:\s*0\b/);
    expect(body).toMatch(/pointer-events:\s*none/);
  });

  it('sits on the centre of the gap between the leaves, whatever the page area pads', () => {
    const base = ruleIn(baseCss, '.nb-fold')[0]!.body.match(/left:\s*calc\(50%\s*\+\s*(\d+)px\)/);
    expect(base, 'base .nb-fold left is calc(50% + Npx)').not.toBeNull();
    expect(Number(base![1])).toBe(offsetOf(baseCss));
    const narrow = ruleIn(narrowBlock, '.nb-fold')[0]?.body.match(/left:\s*calc\(50%\s*\+\s*(\d+)px\)/);
    expect(narrow, 'narrow .nb-fold left is calc(50% + Npx)').toBeTruthy();
    expect(Number(narrow![1])).toBe(offsetOf(narrowBlock));
  });

  it('rests on equal columns, so the gap centre is the content centre (R1)', () => {
    expect(ruleIn(css, '.nb-spread')[0]!.body).toMatch(/grid-template-columns:\s*1fr 1fr/);
    const dir = 'src/styles';
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.css'))) {
      for (const r of rulesOf(readFileSync(`${dir}/${file}`, 'utf8'))) {
        if (!/grid-template-columns/.test(r.body)) continue;
        for (const one of r.selector.split(',').map((x) => x.trim())) {
          if (!/nb-spread|-leaves$/.test(one)) continue;
          expect(r.body, `${file} sets unequal columns on ${one}`).toMatch(/grid-template-columns:\s*1fr 1fr\s*;/);
        }
      }
    }
  });

  it('is drawn in a system colour under forced colours', () => {
    const r = ruleIn(forcedBlock, '.nb-fold');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]!.body).toMatch(/(GrayText|CanvasText)/);
  });
});
