/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// Slice board-scale (FR-036, D39): everything inside the notebook grows by one length, --nb-u. jsdom runs no
// layout, so the rule is held as a sweep over the sheets' own declarations: every px length that lays out the
// interior is `calc(N * var(--nb-u))` (N today's value) or 0, apart from lines and rings, which keep their px.

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const sheetText = (name: string) => readFileSync(`src/styles/${name}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Split at the commas or semicolons that sit outside every parenthesis. */
function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (c === separator && depth === 0) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** A property that draws a line or a ring: its px lengths are lines, and stay px (D39). */
const LINE_OR_RING = /^(border(-[a-z-]+)?|outline(-[a-z-]+)?|box-shadow)$/;
/** A scaled term: N * var(--nb-u), N signed and possibly fractional. */
const SCALED = /-?[\d.]+ \* var\(--nb-u\)/g;
/** The one px a scaled value may carry: the 1px rule at the end of a scaled pitch, in a background-image. */
const RULING_LINE = /calc\(\s*-?[\d.]+ \* var\(--nb-u\) - 1px\)/g;

export interface SweepOptions {
  /** Text to leave out before reading rules (the narrow block, the forced-colours block, @supports blocks). */
  without?: string[];
}

/**
 * Every declaration in a rule whose selector matches `selector` that carries a px or rem length which is neither
 * a line or a ring (`border*`, `outline*`, `box-shadow`) nor written `calc(N * var(--nb-u))` (or 0). Each entry
 * names the selector, the property and the value. Exported for the sweeps over the page sheets and the contract.
 */
export function unscaledLengths(sheet: string, selector: RegExp, options: SweepOptions = {}): string[] {
  let text = sheet.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const cut of options.without ?? []) text = text.replace(cut, '');
  const found: string[] = [];
  for (const m of text.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    const selectors = splitTop(m[1]!.trim(), ',');
    if (!selectors.some((one) => selector.test(one))) continue;
    for (const decl of splitTop(m[2]!, ';')) {
      const colon = decl.indexOf(':');
      const prop = decl.slice(0, colon).trim();
      if (LINE_OR_RING.test(prop)) continue;
      let value = decl.slice(colon + 1).trim();
      if (prop === 'background-image') value = value.replace(RULING_LINE, '');
      // A box with a 1px edge tiles a ruling one pixel off; the position puts it back by that edge's own 1px.
      if (prop === 'background-position') value = value.replace(/(?<![\w.-])-1px\b/, '');
      value = value.replace(SCALED, '');
      if (/(?<![\w.-])-?[\d.]+(px|rem)\b/.test(value)) found.push(`${selectors.join(', ')} { ${prop}: ${decl.slice(colon + 1).trim()} }`);
    }
  }
  return found;
}

/** Interior classes of notebook.css: the rules that lay out what is inside the notebook (plan Summary 5). */
export const NOTEBOOK_INTERIOR = /\.nb-(page-area|page--ruled|margin|fold|label|button|tabs|tab|tab-label)(?![\w-])/;

describe('the sweep names an unscaled length and passes the scaled forms (the helper)', () => {
  const sweep = (css: string) => unscaledLengths(css, /\.x/);
  it('names a plain px length by selector and property', () => {
    expect(sweep('.x { width: 38px; }')).toEqual(['.x { width: 38px }']);
    expect(sweep('.x { padding: 0 16px; }')).toHaveLength(1);
    expect(sweep('.x { width: calc(2rem + 2px); }')).toHaveLength(1);
    expect(sweep('.x { margin: calc(4 * var(--nb-u)) 3px; }')).toHaveLength(1);
  });
  it('passes calc(N * var(--nb-u)), 0, fractions, negatives, and the scaled term inside a calc', () => {
    expect(sweep('.x { width: calc(38 * var(--nb-u)); padding: 0 calc(16 * var(--nb-u)); font-size: calc(12.5 * var(--nb-u)); right: calc(-44 * var(--nb-u)); left: calc(50% + 6 * var(--nb-u)); top: 0; }')).toEqual([]);
  });
  it('passes the lines and rings, which keep their px', () => {
    expect(sweep('.x { border: 1px solid red; border-radius: 0 6px 6px 0; outline: 2px solid; outline-offset: -4px; box-shadow: 0 0 0 2px red; }')).toEqual([]);
  });
  it('passes the 1px rule at the end of a scaled pitch in a background-image, and only there', () => {
    const line = 'repeating-linear-gradient(to bottom, transparent 0, transparent calc(32 * var(--nb-u) - 1px), red calc(32 * var(--nb-u) - 1px), red calc(32 * var(--nb-u)))';
    expect(sweep(`.x { background-image: ${line}; }`)).toEqual([]);
    expect(sweep('.x { width: calc(32 * var(--nb-u) - 1px); }')).toHaveLength(1);
  });
  it('passes the -1px that puts a 1px-edged box\'s ruling back, in a background-position only', () => {
    expect(sweep('.x { background-position: 0 -1px; }')).toEqual([]);
    expect(sweep('.x { background-position: 0 -2px; }')).toHaveLength(1);
    expect(sweep('.x { margin-top: -1px; }')).toHaveLength(1);
  });
  it('reads only the rules whose selector matches, and not the text it is told to leave out', () => {
    expect(unscaledLengths('.y { width: 3px; } .x { width: 4px; }', /\.x/)).toEqual(['.x { width: 4px }']);
    expect(unscaledLengths('.x { width: 4px; } @media (max-width: 1099px) { .x { width: 5px; } }', /\.x/, { without: ['@media (max-width: 1099px) { .x { width: 5px; } }'] })).toHaveLength(1);
  });
});

describe('everything inside the notebook grows by one factor (D39; notebook.css)', () => {
  const css = sheetText('notebook.css');
  const narrow = css.match(/@media \(max-width: 1099px\)\s*\{([\s\S]*?\n\})\s*\n/)?.[0] ?? '';
  const forced = css.match(/@media \(forced-colors: active\)\s*\{[\s\S]*?\n\}\s*$/m)?.[0] ?? '';

  it('reads the interior rules, so the sweep is never vacuous', () => {
    const rules = [...css.replace(narrow, '').replace(forced, '').matchAll(/([^{};]+)\{/g)].map((m) => m[1]!.trim());
    for (const name of ['.nb-page-area', '.nb-page--ruled', '.nb-margin', '.nb-fold', '.nb-label', '.nb-button', '.nb-tabs', '.nb-tab', '.nb-tab-label']) {
      expect(rules.some((r) => splitTop(r, ',').some((one) => one === name)), name).toBe(true);
    }
    expect(narrow, 'the narrow block').not.toBe('');
  });

  it('writes every px length of an interior rule as calc(N * var(--nb-u)) or 0, apart from lines and rings', () => {
    expect(unscaledLengths(css, NOTEBOOK_INTERIOR, { without: [narrow, forced] }), 'unscaled lengths').toEqual([]);
  });
});

/**
 * Lengths a page sheet still writes in px because the test that pins them is outside this slice's manifest
 * (nothingFades.test.tsx asserts `padding: 10px 20px` on Protection's "Keep things as they are" button). Scale the
 * declaration, update that one assertion, and delete the entry: the test below fails while an entry is stale.
 */
const PENDING_OUTSIDE_MANIFEST: Array<{ sheet: string; found: string }> = [
  { sheet: 'protection-page.css', found: '.nb-protection-note__button { padding: 10px 20px }' },
];

// T006: the same factor sizes every page. Each page sheet is read from disk; a length added to one later fails here.
describe.each(['protection-page.css', 'quiet-pages.css', 'setup-pages.css', 'tonight-page.css'])(
  'every length in %s grows with the notebook (D39)',
  (name) => {
    const css = sheetText(name);
    it('writes every px length as calc(N * var(--nb-u)) or 0, apart from lines and rings', () => {
      const pending = PENDING_OUTSIDE_MANIFEST.filter((entry) => entry.sheet === name).map((entry) => entry.found);
      expect(unscaledLengths(css, /./).filter((found) => !pending.includes(found)), 'unscaled lengths').toEqual([]);
    });
    it('lists no pending length that is no longer there, so the list empties as the lengths are scaled', () => {
      const now = unscaledLengths(css, /./);
      for (const entry of PENDING_OUTSIDE_MANIFEST.filter((e) => e.sheet === name)) expect(now, entry.found).toContain(entry.found);
    });
    it('has no rem length, which would not follow the notebook (an em follows the scaled font it sits in)', () => {
      expect(css.match(/[\d.]+rem\b/g) ?? [], 'rem lengths').toEqual([]);
    });
    it('reads rules, so the sweep is never vacuous', () => {
      expect(css.match(/\{/g)!.length).toBeGreaterThan(5);
    });
  },
);

describe('the writing space\'s minimum is the notebook\'s unit, not the root font (D39)', () => {
  it('is calc(226 * var(--nb-u)): 14rem and 2px at today\'s 16px root', () => {
    expect(sheetText('tonight-page.css')).toMatch(/\.nb-checkin-write\s*\{[^}]*min-height:\s*calc\(226 \* var\(--nb-u\)\)\s*;/);
  });
});
