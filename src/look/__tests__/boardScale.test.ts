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

/**
 * A property that draws a line: a border's width, style or colour (never its radius, which is a corner and grows),
 * or an outline. Its px lengths are lines, and stay px (D39). A box-shadow is a line only layer by layer: see SHADOW_LINE.
 */
const LINE = /^(border(-(top|right|bottom|left|inline|block)(-(start|end))?)?(-(width|style|color))?|outline(-[a-z-]+)?)$/;
/** A shadow layer that is a ring (`0 0 0 Npx`) or a 1px edge (`0 1px 0`): a line, and it stays px. A soft shadow or glow is not. */
const SHADOW_LINE = /^(inset\s+)?0 (0 0 \d+px|1px 0)(\s|$)/;
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
 * a line or a ring (a border's width, style or colour, an outline, a ring or 1px edge of a shadow) nor written `calc(N * var(--nb-u))` (or 0). Each entry
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
      if (LINE.test(prop)) continue;
      let value = decl.slice(colon + 1).trim();
      if (prop === 'box-shadow') value = splitTop(value, ',').filter((layer) => !SHADOW_LINE.test(layer)).join(', ');
      // A pill's radius is "as round as it goes", not a size.
      if (prop === 'border-radius' && value === '999px') continue;
      // A box one pixel wide or tall draws a 1px line (the margin line), and lines stay 1px (D39).
      if ((prop === 'width' || prop === 'height') && value === '1px') continue;
      if (prop === 'background-image') value = value.replace(RULING_LINE, '');
      // A box with a 1px edge tiles a ruling one pixel off; the position puts it back by that edge's own 1px.
      if (prop === 'background-position') value = value.replace(/(?<![\w.-])-1px\b/, '');
      value = value.replace(SCALED, '');
      if (/(?<![\w.-])-?[\d.]+(px|rem)\b/.test(value)) found.push(`${selectors.join(', ')} { ${prop}: ${decl.slice(colon + 1).trim()} }`);
    }
  }
  return found;
}

/** Every `nb-` class a component writes, in the order it writes them; a trailing `-` is a prefix a template completes. */
const classesIn = (text: string) => [...text.matchAll(/\bnb-[\w-]+/g)].map((m) => m[0]);
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const alternation = (tokens: string[]) =>
  new RegExp(
    `\\.(?:${[...new Set(tokens)]
      .map((t) => (t.endsWith('-') ? `${escapeRe(t)}[\\w-]*` : `${escapeRe(t)}(?![\\w-])`))
      .join('|')})`,
  );
const shellSource = readFileSync('src/shell/NotebookShell.tsx', 'utf8');
const insideTheNotebook = shellSource.slice(shellSource.indexOf('nb-notebook') + 'nb-notebook'.length);
/**
 * The classes of what is inside the notebook, read from the markup that renders it: the shell's from the notebook
 * element on (the page area, the margin, the fold, the tabs), the screens' own, and the scene's (the sun and the
 * stones scale with the same factor). `.nb-notebook` itself is swept for its corner and shadow only.
 */
export const NOTEBOOK_INTERIOR = alternation([
  ...classesIn(insideTheNotebook),
  ...classesIn(readFileSync('src/shell/Landscape.tsx', 'utf8')),
  ...classesIn(readFileSync('src/shell/CairnMark.tsx', 'utf8')),
  'nb-page--ruled',
  'nb-label',
  'nb-button',
]);

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
    expect(sweep('.x { border: 1px solid red; border-top-width: 2px; outline: 2px solid; outline-offset: -4px; box-shadow: 0 0 0 2px red; }')).toEqual([]);
    expect(sweep('.x { box-shadow: inset 0 0 0 1px red; }')).toEqual([]);
    expect(sweep('.x { box-shadow: 0 1px 0 red, 0 0 0 2px blue; }')).toEqual([]);
  });
  it('names a corner and a soft shadow or glow, which grow, and passes a pill and the scaled forms', () => {
    expect(sweep('.x { border-radius: 6px; }')).toEqual(['.x { border-radius: 6px }']);
    expect(sweep('.x { border-radius: 0 6px 6px 0; }')).toHaveLength(1);
    expect(sweep('.x { border-top-left-radius: 3px; }')).toHaveLength(1);
    expect(sweep('.x { box-shadow: 0 24px 50px -20px red; }')).toHaveLength(1);
    expect(sweep('.x { box-shadow: 0 0 14px 2px red; }')).toHaveLength(1);
    expect(sweep('.x { box-shadow: 0 1px 0 red, 0 24px 50px -20px red; }')).toHaveLength(1);
    expect(sweep('.x { border-radius: 999px; }')).toEqual([]);
    expect(sweep('.x { border-radius: calc(6 * var(--nb-u)); box-shadow: 0 1px 0 red, 0 calc(24 * var(--nb-u)) calc(50 * var(--nb-u)) calc(-20 * var(--nb-u)) red; }')).toEqual([]);
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
  it('passes a box one pixel wide or tall, which draws a 1px line, and nothing else at 1px (D39: 1px lines stay 1px)', () => {
    expect(sweep('.x { width: 1px; }')).toEqual([]);
    expect(sweep('.x { height: 1px; }')).toEqual([]);
    expect(sweep('.x { padding: 1px; }')).toHaveLength(1);
    expect(sweep('.x { width: 2px; }')).toHaveLength(1);
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

  it('draws the margin line 1px wide at every size, as the fold and the ruling are (D39)', () => {
    expect(css).toMatch(/\.nb-margin\s*\{[^}]*\bwidth:\s*1px\s*;/);
  });

  it('writes every px length of an interior rule as calc(N * var(--nb-u)) or 0, apart from lines and rings', () => {
    expect(unscaledLengths(css, NOTEBOOK_INTERIOR, { without: [narrow, forced] }), 'unscaled lengths').toEqual([]);
  });

  it('grows the notebook\'s own corner and shadow, which are not lines', () => {
    const own = unscaledLengths(css, /\.nb-notebook$/, { without: [narrow, forced] }).filter((f) => /\{ (border-radius|box-shadow):/.test(f));
    expect(own, 'unscaled corner or shadow').toEqual([]);
  });

  it('reads the interior from the markup: the shell\'s classes are in it, and the root, title bar and aside are not', () => {
    for (const name of ['.nb-page-area', '.nb-margin', '.nb-fold', '.nb-tabs', '.nb-tab', '.nb-tab--protection', '.nb-tab-label', '.nb-stone', '.nb-sun']) {
      expect(name, name).toMatch(NOTEBOOK_INTERIOR);
    }
    for (const name of ['.nb-root', '.nb-titlebar', '.nb-aside']) expect(name, name).not.toMatch(NOTEBOOK_INTERIOR);
  });
});

/**
 * Lengths a page sheet may still write in px because the test that pins them is outside the slice's manifest. An entry here must
 * name a length that is still there: the test below fails while an entry is stale.
 */
export const PENDING_OUTSIDE_MANIFEST: Array<{ sheet: string; found: string }> = [
  // nothingFades.test.tsx:312 pins `border-radius: 8px` and is outside board-scale's T012 manifest: scale it with that test.
  { sheet: 'protection-page.css', found: '.nb-protection-note__button { border-radius: 8px }' },
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

// T010 (converge pass 1): the measure stops the writing, not the paper. A leaf child that paints the paper to keep a
// rule of the page from striking through its words must cover that rule the whole leaf wide, or it leaves a stub of
// the rule past the measure. Every page-sheet rule that paints the paper is either uncapped by a rule that beats the
// shell's measure, or named here as a box that was narrower than its leaf before this slice, with the reason.
describe('a box that paints the paper is never cut short by the measure (D39, T010)', () => {
  const NARROWER_BEFORE: Record<string, string> = {
    '.nb-checkin-keep:disabled': 'a button, sized by its own words',
    '.nb-checkin-switch': 'a label, align-self: flex-start, sized by its own words',
    '.nb-checkin-write': 'a bordered box drawing its own ruling, not a band hiding the page\'s',
  };
  const MEASURE = '.nb-page-area .nb-spread > .nb-page > *';
  const specificity = (selector: string) => {
    const classes = (selector.match(/[.:][\w-]+/g) ?? []).length;
    return classes;
  };
  const painters = ['protection-page.css', 'quiet-pages.css', 'setup-pages.css', 'tonight-page.css'].flatMap((name) =>
    [...sheetText(name).matchAll(/([^{};]+)\{([^{}]*)\}/g)]
      .filter((m) => /(?:^|[;\s])background(?:-color)?:\s*var\(--nb-paper\)/.test(m[2]!))
      .flatMap((m) => splitTop(m[1]!.trim(), ',').map((selector) => ({ name, selector }))),
  );
  const uncapping = (target: string) =>
    ['protection-page.css', 'quiet-pages.css', 'setup-pages.css', 'tonight-page.css'].some((name) =>
      [...sheetText(name).matchAll(/([^{};]+)\{([^{}]*)\}/g)].some(
        (m) =>
          /max-inline-size:\s*none/.test(m[2]!) &&
          splitTop(m[1]!.trim(), ',').some((s) => s.trim().endsWith(target) && specificity(s) >= specificity(MEASURE)),
      ),
    );

  it('finds the boxes that paint the paper, so the sweep is never vacuous', () => {
    expect(painters.map((p) => p.selector)).toContain('.nb-checkin-status');
  });

  it.each(painters.map((p) => [p.selector, p.name] as const))('%s (%s) is uncapped, or was narrower than its leaf before', (selector) => {
    if (selector in NARROWER_BEFORE) return;
    expect(uncapping(selector), `${selector} paints the paper and the measure cuts it short`).toBe(true);
  });

  it('the measure is still the shell\'s selector the uncapping rules are weighed against', () => {
    expect(sheetText('notebook.css')).toContain(`${MEASURE} {`);
  });
});
