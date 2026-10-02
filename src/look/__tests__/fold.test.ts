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

/** The four values of a padding declaration, split outside the parentheses of a calc. */
function fourValues(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i <= text.length; i += 1) {
    const c = text[i];
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if ((c === ' ' || c === undefined) && depth === 0) {
      if (i > from) out.push(text.slice(from, i));
      from = i + 1;
    }
  }
  return out;
}
/** The unit and N of a length: `calc(N * var(--nb-u))` is N of the notebook's own unit, `Npx` is N of px. */
function unitOf(length: string): { unit: 'u' | 'px'; n: number } {
  const scaled = length.match(/^calc\((-?[\d.]+) \* var\(--nb-u\)\)$/);
  if (scaled) return { unit: 'u', n: Number(scaled[1]) };
  const plain = length.match(/^(-?[\d.]+)px$/);
  if (plain) return { unit: 'px', n: Number(plain[1]) };
  throw new Error(`cannot read the length ${length}`);
}
/** (left − right) / 2 from a `padding: top right bottom left` declaration, and the unit both sides are in. */
function offsetOf(scope: string): { unit: 'u' | 'px'; n: number } {
  const body = ruleIn(scope, '.nb-page-area').find((r) => /padding:/.test(r.body))?.body ?? '';
  const v = body.match(/padding:\s*([^;]+);/);
  const sides = v ? fourValues(v[1]!.trim()) : [];
  if (sides.length !== 4) throw new Error('.nb-page-area has no four-value padding in this scope');
  const left = unitOf(sides[3]!);
  const right = unitOf(sides[1]!);
  if (left.unit !== right.unit) throw new Error('.nb-page-area pads its two sides in different units');
  return { unit: left.unit, n: (left.n - right.n) / 2 };
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
    // Wide, both the padding and the fold's offset are N x s (D39), so the fold stays on the gap's centre at every s.
    const base = ruleIn(baseCss, '.nb-fold')[0]!.body.match(/left:\s*calc\(50%\s*\+\s*(\d+) \* var\(--nb-u\)\)/);
    expect(base, 'base .nb-fold left is calc(50% + N * var(--nb-u))').not.toBeNull();
    expect(offsetOf(baseCss).unit).toBe('u');
    expect(Number(base![1])).toBe(offsetOf(baseCss).n);
    // Narrow, nothing scales: s is 1, and the block is as it was.
    const narrow = ruleIn(narrowBlock, '.nb-fold')[0]?.body.match(/left:\s*calc\(50%\s*\+\s*(\d+)px\)/);
    expect(narrow, 'narrow .nb-fold left is calc(50% + Npx)').toBeTruthy();
    expect(offsetOf(narrowBlock).unit).toBe('px');
    expect(Number(narrow![1])).toBe(offsetOf(narrowBlock).n);
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
  it('lets every flex text child the quiet pages lay out beside a mark wrap, so no word crosses the gap (T014)', () => {
    const dir = 'src/styles';
    const lines: string[] = [];
    // Only the quiet pages' sheet: the other page sheets belong to other slices (the disclosure and reaches
    // lines are theirs to guard).
    const all = rulesOf(readFileSync(`${dir}/quiet-pages.css`, 'utf8'));
    for (const r of all) {
      if (!/display:\s*flex\s*;/.test(r.body) || /flex-direction:\s*column/.test(r.body)) continue;
      for (const one of r.selector.split(',').map((x) => x.trim())) if (/^\.nb-[a-z-]+-line$/.test(one)) lines.push(one);
    }
    expect(lines, 'the flex lines found').toEqual(expect.arrayContaining(['.nb-limits-line', '.nb-teardown-line']));
    for (const line of lines) {
      const text = all.find((r) => r.selector.split(',').some((x) => x.trim() === `${line} > span:not([aria-hidden])`));
      expect(text, `${line} has no rule for its text`).toBeDefined();
      expect(text!.body, `${line} text can shrink`).toMatch(/min-width:\s*0\s*;/);
      expect(text!.body, `${line} text wraps anywhere`).toMatch(/overflow-wrap:\s*anywhere\s*;/);
    }
  });

  describe('every spread the screens render keeps the fold on the centre of its gap', () => {
    // The spread selectors come from the markup: every class beside nb-spread in a className under src/screens.
    const screens = import.meta.glob(['../../screens/**/*.tsx', '!**/__tests__/**'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const spreads = new Set<string>(['nb-spread']);
    for (const source of Object.values(screens)) {
      for (const m of source.matchAll(/className="([^"]*\bnb-spread\b[^"]*)"/g)) {
        for (const c of m[1]!.split(/\s+/)) if (c.startsWith('nb-')) spreads.add(c);
      }
    }
    const sheets = readdirSync('src/styles')
      .filter((f) => f.endsWith('.css'))
      .map((f) => ({ file: f, rules: rulesOf(readFileSync(`src/styles/${f}`, 'utf8')) }));
    // The spread is the subject of a selector when its class is on the last compound (after the last combinator).
    const isSubject = (selector: string, name: string) => {
      const last = selector.trim().split(/\s*[\s>+~]\s*/).pop() ?? '';
      return new RegExp(`\\.${name}(?![\\w-])`).test(last);
    };
    const sides = (value: string): { left: string; right: string } | null => {
      const v = value.trim().split(/\s+/);
      if (v.length === 1) return { left: v[0]!, right: v[0]! };
      if (v.length === 2 || v.length === 3) return { left: v[1]!, right: v[1]! };
      if (v.length === 4) return { left: v[3]!, right: v[1]! };
      return null;
    };

    it('finds the spreads in the markup, the two -spread ones included', () => {
      expect([...spreads]).toEqual(expect.arrayContaining(['nb-choosing-spread', 'nb-disclosure-spread', 'nb-protection-leaves']));
      expect(spreads.size).toBeGreaterThanOrEqual(9);
    });

    it.each([...spreads])('.%s has equal columns and equal horizontal room on both sides', (name) => {
      for (const { file, rules } of sheets) {
        for (const r of rules) {
          if (!r.selector.split(',').some((x) => isSubject(x, name))) continue;
          const decl = (prop: string) =>
            [...r.body.matchAll(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`, 'g'))].map((m) => m[1]!.trim());
          for (const prop of ['left', 'right', 'inset', 'inset-inline', 'inset-inline-start', 'inset-inline-end', 'translate', 'transform']) {
            expect(decl(prop), `${file}: .${name} sets ${prop}, which moves the gap off the fold`).toEqual([]);
          }
          for (const cols of decl('grid-template-columns')) {
            expect(cols, `${file}: .${name} columns`).toBe('1fr 1fr');
          }
          for (const kind of ['padding', 'margin']) {
            for (const v of decl(kind)) {
              const e = sides(v);
              expect(e, `${file}: .${name} ${kind}: ${v}`).not.toBeNull();
              expect(e!.left, `${file}: .${name} ${kind}: ${v} is unequal`).toBe(e!.right);
            }
            const l = decl(`${kind}-left`);
            const rt = decl(`${kind}-right`);
            expect(l, `${file}: .${name} ${kind}-left without ${kind}-right`).toEqual(rt);
            for (const v of decl(`${kind}-inline`)) {
              const [start, end = start] = v.split(/\s+/);
              expect(start, `${file}: .${name} ${kind}-inline: ${v}`).toBe(end);
            }
            expect(decl(`${kind}-inline-start`), `${file}: .${name} ${kind}-inline-start`).toEqual(decl(`${kind}-inline-end`));
          }
        }
      }
    });
  });
});
