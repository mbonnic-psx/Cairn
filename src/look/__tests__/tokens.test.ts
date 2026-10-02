/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';

// Vitest blanks CSS imports, and this project carries no Node typings, so the
// stylesheets are read from disk through a module name TypeScript cannot see.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const notebook = readFileSync('src/styles/notebook.css', 'utf8');
const theme = readFileSync('src/styles/theme.css', 'utf8');

const vendored = Object.keys(import.meta.glob('../../assets/fonts/*.woff2'));

// Every screen and component the notebook can wear, read as text (tests excluded).
const sources = import.meta.glob(
  ['../../screens/**/*.tsx', '../../components/**/*.tsx', '!**/__tests__/**'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
interface Rule {
  selector: string;
  body: string;
}
/** Every rule, nested ones included, with comments gone and at-rule headers skipped. */
function rulesOf(css: string): Rule[] {
  const out: Rule[] = [];
  for (const m of noComments(css).matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    out.push({ selector: m[1]!.trim(), body: m[2]! });
  }
  return out;
}
const rules = rulesOf(notebook);
const ruleFor = (selector: string) => rules.filter((r) => r.selector.split(',').map((x) => x.trim()).includes(selector));
const forcedBlock = noComments(notebook).match(/@media \(forced-colors: active\)\s*\{([\s\S]*?\n\})\s*$/m)?.[1] ?? '';

type LookName = 'morning' | 'midday' | 'night';

/** The text of one look's token block, `[data-look="…"] { … }`, or '' if it has none. */
function blockOf(look: LookName): string {
  return noComments(notebook).match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

/** A colour token from a named look's block (morning by default). */
function token(name: string, look: LookName = 'morning'): string {
  const m = blockOf(look).match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!m) throw new Error(`token ${name} is not a hex colour in the ${look} block of notebook.css`);
  return m[1]!;
}

const TEXT = 4.5;
const LARGE = 3;

describe('morning look contrast (FR-021, SC-003)', () => {
  const onPaper: Array<[string, number]> = [
    ['--nb-ink', TEXT],
    ['--nb-ink-body', TEXT],
    ['--nb-ink-quiet', TEXT],
    ['--nb-accent-amber', TEXT],
  ];
  it.each(onPaper)('%s on the paper', (name, floor) => {
    expect(contrastRatio(token(name), token('--nb-paper'))).toBeGreaterThanOrEqual(floor);
  });

  it('the primary button text on its fill', () => {
    expect(contrastRatio(token('--nb-button-ink'), token('--nb-button'))).toBeGreaterThanOrEqual(TEXT);
  });

  const skies = ['--nb-sky-top', '--nb-sky-mid', '--nb-sky-bottom'];
  it.each(skies)('greeting text on the sky at %s', (sky) => {
    expect(contrastRatio(token('--nb-greeting-ink'), token(sky))).toBeGreaterThanOrEqual(LARGE);
    expect(contrastRatio(token('--nb-greeting-quiet'), token(sky))).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(token('--nb-greeting-body'), token(sky))).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(['protection', 'trail', 'reaches', 'checkin', 'limits'])('tab text on the %s tab', (id) => {
    expect(contrastRatio(token('--nb-tab-ink'), token(`--nb-tab-${id}`))).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('fonts (FR-014, FR-015)', () => {
  const faces = theme.match(/@font-face\s*\{[^}]*\}/g) ?? [];

  it('declares five @font-face rules', () => {
    expect(faces).toHaveLength(5);
  });

  it.each(faces.map((f: string, i: number) => ({ i, face: f })))('rule %i resolves to a vendored file, swaps, and names no network', ({ face }) => {
    const url = face.match(/url\(['"]?([^'")]+)['"]?\)/);
    expect(url).not.toBeNull();
    expect(url![1]).not.toMatch(/^https?:/);
    expect(vendored).toContain(url![1]!.replace('../assets', '../../assets'));
    expect(face).toMatch(/font-display:\s*swap/);
  });

  it('has fallback stacks and no http URL anywhere', () => {
    expect(theme).toMatch(/--font-notebook-serif:[^;]*Georgia[^;]*serif/);
    expect(theme).toMatch(/--font-notebook-mono:[^;]*monospace/);
    expect(theme).not.toMatch(/https?:\/\//);
    expect(notebook).not.toMatch(/https?:\/\//);
  });
});

describe('notebook.css behaviour rules', () => {
  it('removes every animation and transition under reduced motion, in the notebook only', () => {
    const block = noComments(notebook).match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\n\})\s*\n/);
    expect(block).not.toBeNull();
    expect(block![1]).toMatch(/animation:\s*none/);
    expect(block![1]).toMatch(/transition:\s*none/);
    for (const r of rulesOf(block![1]!)) {
      for (const one of r.selector.split(',')) expect(one.trim()).toMatch(/^\[data-look\]/);
    }
  });

  it('scopes every selector to the notebook, so Current stays untouched (SC-009)', () => {
    expect(rules.length).toBeGreaterThan(10);
    for (const r of rules) {
      for (const one of r.selector.split(',')) expect(one.trim()).toMatch(/^(\.nb-|\[data-look)/);
    }
  });

  it('has a forced-colors block, the 1100px breakpoint and visible focus', () => {
    expect(notebook).toMatch(/@media \(forced-colors: active\)/);
    expect(notebook).toMatch(/@media \(max-width: 1099px\)/);
    expect(notebook).toMatch(/\.nb-tab:focus-visible/);
    // The <select> takes focus, not the label around it.
    expect(ruleFor('.nb-switch select:focus-visible').some((r) => /outline:\s*2px solid/.test(r.body))).toBe(true);
    expect(ruleFor('.nb-switch:focus-visible')).toHaveLength(0);
  });

  it('uses mono only on tab names, labels and buttons, never on the page body', () => {
    const mono = rules.filter((r) => /var\(--nb-font-mono\)/.test(r.body) && !r.selector.startsWith('['));
    expect(mono.length).toBeGreaterThan(0);
    const allowed = /(\.nb-tab|\.nb-label|\.nb-button|\.nb-switch|\.nb-greeting__time|\.nb-titlebar__name|button)/;
    for (const { selector } of mono) {
      for (const one of selector.split(',')) expect(one.trim()).toMatch(allowed);
    }
    const bodyRule = ruleFor('.nb-page-area').find((r) => /font-family:\s*var\(--nb-font-serif\)/.test(r.body));
    expect(bodyRule).toBeDefined();
    expect(notebook).toMatch(/\.nb-root\s*\{[^}]*font-family:\s*var\(--nb-font-serif\)/);
  });

  it('keeps every colour in a token', () => {
    const outsideTokens = notebook
      .replace(/\[data-look="[a-z]+"\]\s*\{[^}]*\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(outsideTokens).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('every colour a screen draws as text, on the paper (FR-021, SC-003)', () => {
  const colourOf = (css: string) => {
    const out = new Map<string, string>();
    for (const m of css.matchAll(/--color-([a-z]+-\d+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out.set(m[1]!, m[2]!);
    return out;
  };
  const base = colourOf(theme);
  const lookBlock = notebook.match(/\[data-look="morning"\]\s*\{[^}]*\}/)![0];
  const onPaper = new Map([...base, ...colourOf(lookBlock)]);

  // A text class is read when it stands alone: variants (disabled:, hover:) mark
  // states that sit on another fill. text-sand-50 is the button's label on its own fill.
  const used = new Set<string>();
  for (const src of Object.values(sources)) {
    for (const m of src.matchAll(/(?<![\w:-])text-((?:ink|amber|moss|clay|sand)-\d+)(?![\w-])/g)) used.add(m[1]!);
  }
  used.delete('sand-50');

  it('finds the text colours the screens use', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
    expect([...used].sort()).toEqual(expect.arrayContaining(['ink-400', 'ink-500', 'ink-700', 'ink-900', 'amber-600', 'moss-600']));
  });

  it.each([...used].sort())('text-%s meets 4.5:1 on the paper', (name) => {
    const colour = onPaper.get(name);
    expect(colour, `no colour for ${name}`).toBeDefined();
    expect(contrastRatio(colour!, token('--nb-paper'))).toBeGreaterThanOrEqual(TEXT);
  });

  it('keeps the status badges readable on their own tints', () => {
    for (const [fg, bg] of [['moss-600', 'moss-100'], ['amber-600', 'amber-100'], ['ink-500', 'sand-100']] as const) {
      expect(contrastRatio(onPaper.get(fg)!, onPaper.get(bg)!)).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it('leaves the Current look to the theme: the overrides sit under [data-look]', () => {
    expect(theme).not.toMatch(/data-look/);
    expect(lookBlock).toMatch(/--color-ink-400:/);
  });
});

describe('forced colours over the scene (FR-021, FR-024)', () => {
  const covered = rulesOf(forcedBlock).filter((r) => /background:\s*Canvas\b/.test(r.body)).map((r) => r.selector);

  it('gives text that sits outside the notebook a system background', () => {
    const carriers = rules
      .flatMap((r) => r.selector.split(',').map((x) => x.trim()))
      .filter((sel) => /^\.nb-(titlebar|greeting|switch)/.test(sel));
    expect(carriers.length).toBeGreaterThan(0);
    for (const sel of carriers) {
      const root = sel.match(/^\.nb-[a-z]+/)![0];
      expect(covered.some((c) => c.split(',').some((x) => x.trim() === root)), `${sel} is not covered`).toBe(true);
    }
  });
});

describe('the shell contract in the stylesheet (contracts/ui-shell.md)', () => {
  it('bounds the tab column by the notebook so no tab can leave it', () => {
    const col = ruleFor('.nb-tabs').map((r) => r.body).join('');
    expect(col).toMatch(/position:\s*absolute/);
    expect(col).toMatch(/top:\s*\d+px/);
    expect(col).toMatch(/bottom:\s*\d+px/);
    expect(ruleFor('.nb-tab')[0]!.body).toMatch(/flex:\s*0 1 auto/);
    expect(ruleFor('.nb-tab')[0]!.body).toMatch(/min-height:\s*min-content/);
  });

  it('draws the margin line in one place, .nb-margin, from --nb-margin', () => {
    const drawers = rules.filter((r) => /background:\s*var\(--nb-margin\)/.test(r.body));
    expect(drawers.map((r) => r.selector)).toEqual(['.nb-margin']);
    expect(ruleFor('.nb-margin')[0]!.body).toMatch(/left:\s*38px/);
    expect(notebook).not.toMatch(/\.nb-page-area::before/);
  });

  it('draws rule lines on .nb-page--ruled from --nb-rule', () => {
    const body = ruleFor('.nb-page--ruled')[0]!.body;
    expect(body).toMatch(/repeating-linear-gradient/);
    expect(body).toMatch(/var\(--nb-rule\)/);
  });

  it('names no fold: the spread is two equal columns and nothing more', () => {
    expect(notebook).not.toMatch(/--nb-fold/);
    expect(ruleFor('.nb-spread')[0]!.body).toMatch(/grid-template-columns:\s*1fr 1fr/);
  });
});

describe('the notebook renders the same on every platform', () => {
  it('turns the tab label, not the button, sideways', () => {
    expect(ruleFor('.nb-tab-label').some((r) => /writing-mode:\s*vertical-rl/.test(r.body))).toBe(true);
    expect(ruleFor('.nb-tab').every((r) => !/writing-mode/.test(r.body))).toBe(true);
  });

  it("points the screens' serif at the bundled face, so no platform font stands in", () => {
    const shared = ruleFor('[data-look]').map((r) => r.body).join('\n');
    expect(shared).toMatch(/--font-serif:\s*var\(--font-notebook-serif\)/);
  });
});

describe('tokens: what differs per look, and what every look shares (FR-009, FR-021; research L2)', () => {
  const shared = () => ruleFor('[data-look]').map((r) => r.body).join('\n');

  it('puts the sun size and place in the morning block as tokens', () => {
    for (const name of ['--nb-sun-size', '--nb-sun-left', '--nb-sun-top']) {
      expect(blockOf('morning')).toMatch(new RegExp(`${name}:\\s*[^;]+;`));
    }
  });

  it('draws the sun from those tokens, with no literal size or place', () => {
    const body = ruleFor('.nb-sun').map((r) => r.body).join('');
    expect(body).toMatch(/width:\s*var\(--nb-sun-size\)/);
    expect(body).toMatch(/height:\s*var\(--nb-sun-size\)/);
    expect(body).toMatch(/left:\s*var\(--nb-sun-left\)/);
    expect(body).toMatch(/top:\s*var\(--nb-sun-top\)/);
    expect(body).not.toMatch(/(width|height|left|top):\s*[\d.]+(px|%)/);
  });

  it('keeps the fonts in one shared block, not in any look', () => {
    for (const name of ['--font-serif', '--nb-font-serif', '--nb-font-mono']) {
      expect(shared()).toContain(`${name}:`);
      expect(blockOf('morning')).not.toContain(`${name}:`);
    }
  });
});
