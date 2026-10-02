/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';
import { PENDING_OUTSIDE_MANIFEST, unscaledLengths } from './boardScale.test';

// Vitest blanks CSS imports, and this project carries no Node typings, so the
// stylesheets are read from disk through a module name TypeScript cannot see.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const notebook = readFileSync('src/styles/notebook.css', 'utf8');
const theme = readFileSync('src/styles/theme.css', 'utf8');

const vendored = Object.keys(import.meta.glob('../../assets/fonts/*.woff2'));

// Every screen the notebook can wear, read as text (tests excluded).
const sources = import.meta.glob(
  ['../../screens/**/*.tsx', '!**/__tests__/**'],
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

  it('scopes every selector to the notebook, so nothing outside the notebook is styled', () => {
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

describe.each(['morning', 'midday', 'night'] as const)('%s: every colour drawn as text, on the paper (FR-021, SC-003)', (look) => {
  const colourOf = (css: string) => {
    const out = new Map<string, string>();
    for (const m of css.matchAll(/--color-([a-z]+-\d+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out.set(m[1]!, m[2]!);
    return out;
  };
  const base = colourOf(theme);
  const lookBlock = notebook.match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{[^}]*\\}`))![0];
  const repointed = colourOf(lookBlock);
  const onPaper = new Map([...base, ...repointed]);

  it('has no screen source that carries a palette text class: the page sheets colour the text', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
    const carriers = Object.entries(sources)
      .filter(([, src]) => /(?<![\w-])text-(?:ink|amber|moss|clay|sand)-\d+(?![\w-])/.test(src))
      .map(([file]) => file);
    expect(carriers).toEqual([]);
  });

  it('re-points only --color-moss-600, the one palette value a page sheet draws as text', () => {
    expect([...repointed.keys()]).toEqual(['moss-600']);
    expect(theme).toMatch(/--color-moss-600:/);
  });

  it('reads that value, and the body ink the theme sets, on the paper at 4.5:1', () => {
    expect(contrastRatio(onPaper.get('moss-600')!, token('--nb-paper', look))).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(onPaper.get('ink-700')!, token('--nb-paper', look))).toBeGreaterThanOrEqual(TEXT);
  });

  it('leaves the theme without a look: the one re-point sits under [data-look]', () => {
    expect(theme).not.toMatch(/data-look/);
    expect(lookBlock).toMatch(/--color-moss-600:/);
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
    expect(col).toMatch(/top:\s*calc\(\d+ \* var\(--nb-u\)\)/);
    expect(col).toMatch(/bottom:\s*calc\(\d+ \* var\(--nb-u\)\)/);
    expect(ruleFor('.nb-tab')[0]!.body).toMatch(/flex:\s*0 1 auto/);
    expect(ruleFor('.nb-tab')[0]!.body).toMatch(/min-height:\s*min-content/);
  });

  it('draws the margin line in one place, .nb-margin, from --nb-margin', () => {
    const drawers = rules.filter((r) => /background:\s*var\(--nb-margin\)/.test(r.body));
    expect(drawers.map((r) => r.selector)).toEqual(['.nb-margin']);
    expect(ruleFor('.nb-margin')[0]!.body).toMatch(/left:\s*calc\(38 \* var\(--nb-u\)\)/);
    expect(notebook).not.toMatch(/\.nb-page-area::before/);
  });

  it('draws rule lines on .nb-page--ruled from --nb-rule', () => {
    const body = ruleFor('.nb-page--ruled')[0]!.body;
    expect(body).toMatch(/repeating-linear-gradient/);
    expect(body).toMatch(/var\(--nb-rule\)/);
  });

  it('tiles the rules at exactly one pitch, so no seam skips or doubles a rule (T025)', () => {
    const body = ruleFor('.nb-page--ruled')[0]!.body;
    // The pitch and the offset are N x s (D39); the rule itself stays a 1px line at the end of each pitch.
    expect(body).toMatch(/background-size:\s*100%\s+calc\(32 \* var\(--nb-u\)\)/);
    expect(body).toMatch(/var\(--nb-rule\)\s+calc\(32 \* var\(--nb-u\) - 1px\),\s*var\(--nb-rule\)\s+calc\(32 \* var\(--nb-u\)\)/);
    const y = Number(body.match(/background-position:\s*0\s+calc\((\d+) \* var\(--nb-u\)\)/)?.[1]);
    expect(y % 32, 'the ruling starts 22 units into the pitch, where the first line of writing sits').toBe(22);
  });

  it('draws the fold in one place, .nb-fold, from --nb-fold', () => {
    const reading = rules.filter((r) => /var\(--nb-fold\)/.test(r.body));
    expect(reading).toHaveLength(1);
    expect(reading[0]!.selector).toBe('.nb-fold');
    expect(ruleFor('.nb-spread')[0]!.body).toMatch(/grid-template-columns:\s*1fr 1fr/);
  });
});

describe('the published shell contract says what the stylesheet and the shell do (contracts/ui-shell.md)', () => {
  const contract = readFileSync('specs/004-notebook-landscape/contracts/ui-shell.md', 'utf8');
  const shellSource = readFileSync('src/shell/NotebookShell.tsx', 'utf8');
  // The scene is grouped by the table's own rows or lives in the look's sky, hills, stones and tabs.
  const scene = /^--nb-(sky-|greeting-|hill-|shadow-|tab-|star|sun$|sun-glow$|stone-(base|moss|amber|pale)$)/;
  const tableRows = contract.slice(contract.indexOf('| Token |'));

  it('lists in its token table every token a look block defines, apart from the scene', () => {
    const defined = new Set(
      [...noComments(notebook).matchAll(/(--nb-[a-z-]+)\s*:/g)].map((m) => m[1]!),
    );
    const missing = [...defined].filter((t) => !scene.test(t) && !tableRows.includes('`' + t + '`'));
    expect(missing, 'tokens the contract does not name').toEqual([]);
  });

  // board-scale T008 (FR-036, D39): the lengths the shared block defines, and what a page sheet does with them.
  /** The custom properties the shared `[data-look]` block defines that are not fonts: its lengths. */
  const sharedLengths = (sheet: string) => {
    const block = noComments(sheet).match(/(?:^|\n)\[data-look\]\s*\{([^}]*)\}/)?.[1] ?? '';
    return [...block.matchAll(/(--nb-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!).filter((name) => !/^--nb-font-/.test(name));
  };
  /** The shared lengths no row of the contract's token table names. */
  const withoutRow = (sheet: string, text: string) => {
    const rows = text.slice(text.indexOf('| Token |'));
    return sharedLengths(sheet).filter((name) => !rows.includes('`' + name + '`'));
  };
  const rowOf = (name: string) => tableRows.split('\n').find((line) => line.startsWith('| `' + name + '`')) ?? '';

  it('names every shared length the stylesheet defines, derived from the sheet (--nb-u and --nb-g among them)', () => {
    expect(sharedLengths(notebook)).toEqual(expect.arrayContaining(['--nb-u', '--nb-g']));
    expect(withoutRow(notebook, contract), 'shared lengths with no row').toEqual([]);
  });

  it('fails when a shared length is added to the sheet without a row', () => {
    const planted = notebook.replace(/(\[data-look\]\s*\{)/, '$1\n  --nb-planted: 7px;');
    expect(withoutRow(planted, contract)).toEqual(['--nb-planted']);
  });

  it('says --nb-u is the shared length page sheets size by, and --nb-g the shell\'s own, for the greeting', () => {
    expect(rowOf('--nb-u')).toMatch(/clamp\(1px, min\(100vw ?\/ ?1280, 100vh ?\/ ?800\), 2px\)/);
    expect(rowOf('--nb-u')).toMatch(/page sheets/i);
    expect(rowOf('--nb-u')).toMatch(/N ?(×|x|\*) ?this/);
    expect(rowOf('--nb-g')).toMatch(/greeting/i);
    expect(rowOf('--nb-g')).toMatch(/not for page sheets/i);
  });

  it('states the sizing rule: calc(N * var(--nb-u)), lines and rings keep their px', () => {
    expect(contract).toContain('calc(N * var(--nb-u))');
    expect(contract).toMatch(/`border\*`, `outline\*` and `box-shadow`/);
    expect(contract).toMatch(/keep their px/);
    expect(contract).toMatch(/viewport units/);
  });

  it('states the measure the shell holds a page\'s text column to, and that a page never sets its own', () => {
    expect(contract).toContain('383');
    expect(contract).toMatch(/383 ?(×|x|\*) ?s/);
    expect(contract).toMatch(/never sets\s+its own measure/);
    expect(contract).toContain('max-inline-size');
  });

  it('is extended by board-scale, in its opening line', () => {
    const opening = contract.split('\n## ')[0]!;
    expect(opening).toMatch(/`board-scale`/);
    expect(opening).toMatch(/the scale length, the measure/);
  });

  it('holds no page sheet length that ignores --nb-u (the sweep of the page sheets, called here)', () => {
    const pending = PENDING_OUTSIDE_MANIFEST.map((entry) => `${entry.sheet}: ${entry.found}`);
    const unscaled = ['protection-page.css', 'quiet-pages.css', 'setup-pages.css', 'tonight-page.css'].flatMap((name) =>
      unscaledLengths(readFileSync(`src/styles/${name}`, 'utf8'), /./).map((found) => `${name}: ${found}`),
    );
    expect(unscaled.filter((found) => !pending.includes(found)), 'page lengths that ignore --nb-u').toEqual([]);
  });

  it('names every aria-hidden element the shell draws inside the notebook as the shell\'s', () => {
    const drawn = [...shellSource.matchAll(/className="(nb-[a-z-]+)"\s+aria-hidden="true"/g)].map((m) => m[1]!);
    expect(drawn).toEqual(expect.arrayContaining(['nb-margin', 'nb-fold']));
    for (const name of drawn) {
      expect(contract, `.${name} is not named`).toMatch(new RegExp('`\\.' + name + '`[^\\n]*|[^\\n]*`\\.' + name + '`'));
      expect(contract, `.${name} is not called the shell's`).toMatch(
        new RegExp('`\\.' + name + '`[^.]*shell|shell[^.]*`\\.' + name + '`'),
      );
    }
  });

  it('does not say the notebook draws no fold', () => {
    expect(contract).not.toContain('draws no fold');
  });

  it('says the notebook is a size container whenever the stylesheet makes it one', () => {
    const containing = [...noComments(notebook).matchAll(/([^{};]+)\{([^{}]*container-type\s*:[^{}]*)\}/g)];
    expect(containing.some((m) => m[1]!.trim() === '.nb-notebook')).toBe(true);
    expect(contract, 'the contract does not name container-type').toContain('container-type');
    expect(contract).toMatch(/size container/);
    expect(contract).toMatch(/names? its own/);
  });
});

describe.each(['morning', 'midday', 'night'] as const)('the state badge\'s pill in the %s look (T026)', (look) => {
  it('is visibly a different surface from the paper', () => {
    expect(contrastRatio(token('--nb-rule', look), token('--nb-paper', look))).toBeGreaterThanOrEqual(1.1);
  });

  it('holds the badge\'s words (--nb-ink) at the text floor', () => {
    expect(contrastRatio(token('--nb-ink', look), token('--nb-rule', look))).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('the notebook renders the same on every platform', () => {
  it('turns the tab label, not the button, sideways', () => {
    expect(ruleFor('.nb-tab-label').some((r) => /writing-mode:\s*vertical-rl/.test(r.body))).toBe(true);
    expect(ruleFor('.nb-tab').every((r) => !/writing-mode/.test(r.body))).toBe(true);
  });

  it("points the page sheets' serif at the bundled face, so no platform font stands in", () => {
    const shared = ruleFor('[data-look]').map((r) => r.body).join('\n');
    expect(shared).toMatch(/--nb-font-serif:\s*var\(--font-notebook-serif\)/);
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
    for (const name of ['--nb-font-serif', '--nb-font-mono']) {
      expect(shared()).toContain(`${name}:`);
      expect(blockOf('morning')).not.toContain(`${name}:`);
    }
  });
});

// ---------------------------------------------------------------------------
// Midday and night: each is a complete block, readable on its own sky.
// ---------------------------------------------------------------------------
const SKIES = ['--nb-sky-top', '--nb-sky-mid', '--nb-sky-bottom'] as const;
const TABS = ['protection', 'trail', 'reaches', 'checkin', 'limits'] as const;
const namesIn = (look: LookName) => [...blockOf(look).matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]!);

/** Hue in degrees and saturation 0..1 of a #rrggbb colour. */
function hueSat(hex: string): { h: number; s: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s };
}

function completeAndReadable(look: Exclude<LookName, 'morning'>) {
  const t = (name: string) => token(name, look);

  it('defines every token the morning block defines', () => {
    const have = new Set(namesIn(look));
    expect(namesIn('morning').filter((n) => !have.has(n))).toEqual([]);
  });

  it.each([
    ['--nb-ink', TEXT],
    ['--nb-ink-body', TEXT],
    ['--nb-ink-quiet', TEXT],
    ['--nb-accent-amber', TEXT],
  ] as Array<[string, number]>)('%s on the paper', (name, floor) => {
    expect(contrastRatio(t(name), t('--nb-paper'))).toBeGreaterThanOrEqual(floor);
  });

  it('the primary button text on its fill', () => {
    expect(contrastRatio(t('--nb-button-ink'), t('--nb-button'))).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(SKIES)('the greeting and the title bar name on the sky at %s', (sky) => {
    expect(contrastRatio(t('--nb-greeting-ink'), t(sky))).toBeGreaterThanOrEqual(LARGE);
    expect(contrastRatio(t('--nb-greeting-quiet'), t(sky))).toBeGreaterThanOrEqual(TEXT);
    // The title bar name and the switch both use the greeting's body ink.
    expect(contrastRatio(t('--nb-greeting-body'), t(sky))).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(TABS)('tab text on the %s tab', (id) => {
    expect(contrastRatio(t('--nb-tab-ink'), t(`--nb-tab-${id}`))).toBeGreaterThanOrEqual(TEXT);
  });

  it('the current tab (paper) reads in --nb-ink', () => {
    expect(contrastRatio(t('--nb-ink'), t('--nb-paper'))).toBeGreaterThanOrEqual(TEXT);
  });

  it('the theme palette overrides read on the paper', () => {
    const overrides = [...blockOf(look).matchAll(/(--color-[a-z]+-\d+):\s*(#[0-9a-fA-F]{6})/g)];
    expect(overrides.length).toBeGreaterThan(0);
    for (const [, name, colour] of overrides) {
      expect(contrastRatio(colour!, t('--nb-paper')), name).toBeGreaterThanOrEqual(TEXT);
    }
  });

  it.each(SKIES)('the mark and the cairn base stone hold 3:1 on the sky at %s (FR-033, D4)', (sky) => {
    expect(contrastRatio(t('--nb-stone-base'), t(sky))).toBeGreaterThanOrEqual(3);
  });

  it('uses no red: no strong saturation near hue 0 or 360 (FR-016)', () => {
    const colours = [...blockOf(look).matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)];
    for (const [, name, hex] of colours) {
      const { h, s } = hueSat(hex!);
      expect(s > 0.5 && (h < 15 || h > 345), `${name} ${hex}`).toBe(false);
    }
  });
}

describe('midday look (US2; FR-009, FR-021, FR-016, FR-033)', () => {
  completeAndReadable('midday');
});

describe('night look (US2; FR-009, FR-021, FR-016, FR-033, D4)', () => {
  completeAndReadable('night');

  it('reads the amber "not confirmed" text on the lamp-lit paper at 4.5:1 (FR-016)', () => {
    expect(contrastRatio(token('--nb-accent-amber', 'night'), token('--nb-paper', 'night'))).toBeGreaterThanOrEqual(TEXT);
  });
});

/** Split a selector list at its top-level commas, so `:is(.a, .b)` stays whole. */
function splitList(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < list.length; i += 1) {
    const c = list[i];
    if (c === '(' || c === '[') depth += 1;
    else if (c === ')' || c === ']') depth -= 1;
    else if (c === ',' && depth === 0) {
      parts.push(list.slice(from, i).trim());
      from = i + 1;
    }
  }
  parts.push(list.slice(from).trim());
  return parts.filter(Boolean);
}
/** One selector with every `:is(…)` / `:where(…)` unwrapped, one result per alternative. */
function unwrapped(item: string): string[] {
  const m = /:(?:is|where)\(([^()]*)\)/.exec(item);
  if (!m) return [item];
  return splitList(m[1]!).flatMap((alt) => unwrapped(item.slice(0, m.index) + alt + item.slice(m.index + m[0].length)));
}
/** True when some form of `item`, its last compound (attributes dropped) holds every simple selector of `selector`. */
function appliesTo(item: string, selector: string): boolean {
  const simple = (s: string) => new Set(s.match(/::?[\w-]+(?:\([^()]*\))?|[.#][\w-]+|[\w-]+/g) ?? []);
  const want = simple(selector);
  return unwrapped(item).some((form) => {
    const last = form.replace(/\[[^\]]*\]/g, '').trim().split(/[\s>+~]+/).pop()!;
    const have = simple(last);
    return [...want].every((token) => have.has(token));
  });
}

describe('text laid over the scene meets its floor against the sun or moon behind it (FR-021, SC-003)', () => {
  // The disc sits behind text only where it shares a horizontal band with the
  // greeting. No layout engine runs here, so the band is arithmetic from the
  // tokens: the greeting's text (its time, then up to two lines of words) ends
  // by GREETING_BOTTOM px from the top of the window, at the two sizes the
  // window is proved at, and the disc's top edge is its place token of that
  // height. A disc whose top is below that never sits behind the greeting.
  const SIZES = [
    { name: '1280x800', height: 800, greetingBottom: 280 },
    { name: '800x600', height: 600, greetingBottom: 200 },
  ];
  const discTop = (look: LookName, height: number) => (parseFloat(blockOf(look).match(/--nb-sun-top:\s*([\d.]+)%/)![1]!) / 100) * height;
  const looks: LookName[] = ['morning', 'midday', 'night'];

  it.each(looks.flatMap((look) => SIZES.map((size) => [look, size] as const)))(
    '%s at %o: every text token holds its floor on the disc, wherever the disc can sit behind the greeting',
    (look, size) => {
      if (discTop(look, size.height) >= size.greetingBottom) return;
      const sun = token('--nb-sun', look);
      expect(contrastRatio(token('--nb-greeting-ink', look), sun), 'greeting ink').toBeGreaterThanOrEqual(LARGE);
      for (const name of ['--nb-greeting-body', '--nb-greeting-quiet']) {
        expect(contrastRatio(token(name, look), sun), name).toBeGreaterThanOrEqual(TEXT);
      }
    },
  );

  it('still has a look whose disc sits behind the greeting, so the check is live', () => {
    expect(looks.some((look) => SIZES.some((size) => discTop(look, size.height) < size.greetingBottom))).toBe(true);
  });

  // T020 (research Q4): every line of text over the sky is its own band, from the
  // stylesheet's own values, for the wide and the narrow layout at every height the window allows,
  // and each band's own ink is checked only against what can sit behind it.
  const pct = (look: LookName, name: string) => parseFloat(blockOf(look).match(new RegExp(`${name}:\\s*([\\d.]+)%`))![1]!) / 100;
  /** N of a look token written `calc(N * var(--nb-u))`: the sun's diameter at s = 1 (the token still means the diameter). */
  const sunN = (look: LookName) => {
    const m = blockOf(look).match(/--nb-sun-size:\s*calc\(([\d.]+) \* var\(--nb-u\)\)\s*;/);
    if (!m) throw new Error(`--nb-sun-size in the ${look} block is not calc(N * var(--nb-u))`);
    return Number(m[1]);
  };
  /** The raw value a selector's rules give a property: the base rule's for the wide layout, the last rule's (the narrow
   * override, else the base) for the narrow one. The guard below holds the rules to those two, in that order. */
  const raw = (selector: string, prop: string, wide: boolean) => {
    const hits = ruleFor(selector).flatMap((r) => {
      const m = r.body.match(new RegExp(`(?:^|[;\\s])${prop}:\\s*([^;]+?)\\s*(?:;|$)`));
      return m ? [m[1]!] : [];
    });
    if (hits.length === 0) throw new Error(`${selector} sets no ${prop}`);
    return wide ? hits[0]! : hits[hits.length - 1]!;
  };
  /** The greeting's factor, from the shared block's own declaration: max(Npx, 100vw / D). */
  const growth = (() => {
    const m = noComments(notebook).match(/--nb-g:\s*max\(([\d.]+)px, 100vw \/ ([\d.]+)\)/)!;
    return (width: number) => Math.max(Number(m[1]), width / Number(m[2]));
  })();
  /** s, the length `--nb-u` resolves to in px at a window: clamp(Lpx, min(100vw / A, 100vh / B), Upx). */
  const scale = (() => {
    const m = noComments(notebook).match(/--nb-u:\s*clamp\(([\d.]+)px, min\(100vw \/ ([\d.]+), 100vh \/ ([\d.]+)\), ([\d.]+)px\)/)!;
    return (width: number, height: number) => Math.min(Math.max(Number(m[1]), Math.min(width / Number(m[2]), height / Number(m[3]))), Number(m[4]));
  })();
  /** A length as the window gives it: `Npx`, `0`, `Nvh` of the height, or `calc(N * var(--nb-g))`. */
  const lengthAt = (value: string, width: number, height: number) => {
    const g = value.match(/^calc\(([\d.]+) \* var\(--nb-g\)\)$/);
    if (g) return Number(g[1]) * growth(width);
    const vh = value.match(/^([\d.]+)vh$/);
    if (vh) return (Number(vh[1]) * height) / 100;
    const vw = value.match(/^([\d.]+)vw$/);
    if (vw) return (Number(vw[1]) * width) / 100;
    const n = value.match(/^([\d.]+)(?:px)?$/);
    if (n) return Number(n[1]);
    throw new Error(`cannot read the length ${value}`);
  };
  const rootPadTop = (wide: boolean, width: number, height: number) => lengthAt(raw('.nb-root', 'padding', wide).split(/\s+/)[0]!, width, height);
  /** preflight's html line-height, which nothing in notebook.css overrides on the 12px lines. */
  const preflight = readFileSync('node_modules/tailwindcss/preflight.css', 'utf8');
  const lineHeight = parseFloat(preflight.match(/html,\s*:host\s*\{[^}]*?line-height:\s*([\d.]+)/)![1]!);
  const line12 = 12 * lineHeight;

  /** Composite an 8-digit hex colour over a 6-digit one. */
  const over = (top: string, under: string) => {
    const a = parseInt(top.slice(7, 9), 16) / 255;
    const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return '#' + [0, 1, 2].map((i) => Math.round(ch(top, i) * a + ch(under, i) * (1 - a)).toString(16).padStart(2, '0')).join('');
  };
  const glowToken = (look: LookName) => {
    const m = blockOf(look).match(/--nb-sun-glow:\s*(#[0-9a-fA-F]{8})\s*;/);
    if (!m) throw new Error(`--nb-sun-glow is not an 8-digit hex colour in the ${look} block`);
    return m[1]!;
  };
  /** The glow's blur plus spread at s = 1, from `0 0 calc(B * var(--nb-u)) calc(S * var(--nb-u))`. */
  const glowN = (() => {
    const m = ruleFor('.nb-sun')[0]!.body.match(/box-shadow:\s*0\s+0\s+calc\(([\d.]+) \* var\(--nb-u\)\)\s+calc\(([\d.]+) \* var\(--nb-u\)\)/);
    return m ? Number(m[1]) + Number(m[2]) : NaN; // NaN until the glow is written so: the tests below name it
  })();

  const bandCache = new Map<string, Array<{ text: string; ink: string; floor: number; top: number; bottom: number; from: number; to: number }>>();
  const greetings = [...readFileSync('src/look/look.ts', 'utf8').matchAll(/(?:morning|midday|night):\s*'([^']+)'/g)].map((m) => m[1]!);
  const bandsOf = (wide: boolean, width: number, height: number) => {
    const key = `${wide}/${width}/${height}`;
    const known = bandCache.get(key);
    if (known) return known;
    const at = (selector: string, prop: string) => lengthAt(raw(selector, prop, wide), width, height);
    const titleTop = at('.nb-titlebar', 'top');
    const timeSize = at('.nb-greeting__time', 'font-size');
    const timeTop = rootPadTop(wide, width, height) + at('.nb-aside', 'padding-top');
    const timeBottom = timeTop + timeSize * lineHeight;
    const wordsSize = at('.nb-greeting__words', 'font-size');
    const wordsTop = timeBottom + at('.nb-greeting', 'gap');
    const wordsHeight = 2 * wordsSize * Number(raw('.nb-greeting__words', 'line-height', wide));
    // The greeting's text runs from the root's left padding to the widest word. Research R3 measured "morning." at
    // 170px in 40px type (0.53em a letter, the widest of the three greetings' words), so the extent is that, read
    // at the size the words have in this window. The title bar and the time line are not bounded: the whole width.
    const left = lengthAt(raw('.nb-root', 'padding', wide).split(/\s+/).pop()!, width, height);
    const widest = Math.max(...greetings.flatMap((g) => g.split(' ').map((word) => word.length)));
    const wordsRight = left + widest * (170 / 8 / 40) * wordsSize;
    const bands = [
      { text: 'title bar name', ink: '--nb-greeting-body', floor: TEXT, top: titleTop, bottom: titleTop + line12, from: 0, to: width },
      { text: 'weekday and time', ink: '--nb-greeting-quiet', floor: TEXT, top: timeTop, bottom: timeBottom, from: 0, to: width },
      { text: 'greeting words', ink: '--nb-greeting-ink', floor: LARGE, top: wordsTop, bottom: wordsTop + wordsHeight, from: left, to: wordsRight },
    ];
    bandCache.set(key, bands);
    return bands;
  };

  it('keeps the band model honest: a 12px line is 18px, and a greeting is at most two words that fit the column', () => {
    expect(line12).toBe(18);
    const greetings = [...readFileSync('src/look/look.ts', 'utf8').matchAll(/(?:morning|midday|night):\s*'([^']+)'/g)].map((m) => m[1]!);
    expect(greetings).toHaveLength(3);
    for (const g of greetings) {
      const words = g.split(' ');
      expect(words.length, g).toBeLessThanOrEqual(2);
      // 0.6em a letter is wider than any letter of the serif: a generous bound on a word at 40px.
      for (const w of words) expect(w.length * 0.6 * 40, w).toBeLessThan(250);
    }
  });

  // T005 (loose-ends; quiet-pages T013, research R6): `decl` and `rootPadTop` index the rules for a selector by
  // position (the base rule, then the narrow layout), so a third rule shifts the index with no error. Every rule
  // that can apply to a selector read above, bare, look-scoped or inside any at-rule but forced colours, is one
  // of those two, in that order, or the guard fails naming it.
  const NARROW = '@media (max-width: 1099px)';
  const READ: Array<[string, string[]]> = [
    ['.nb-root', ['', NARROW]],
    ['.nb-aside', ['', NARROW]],
    ['.nb-greeting', ['', NARROW]],
    ['.nb-greeting__words', ['', NARROW]],
    ['.nb-greeting__time', ['']],
    ['.nb-titlebar', ['']],
    ['.nb-sun', ['']],
  ];
  // T011: every sheet is global once its screen is imported, so every sheet under src/styles/ is read.
  const sheetNames = Object.keys(import.meta.glob('../../styles/*.css'))
    .map((path) => path.slice(path.lastIndexOf('/') + 1))
    .sort();
  const loaded = [...readFileSync('src/main.tsx', 'utf8').matchAll(/import\s+'\.\/styles\/([\w-]+\.css)'/g)].map((m) => m[1]!);
  const applying = (selector: string, synthetic?: Record<string, string>) => {
    const found: Array<{ item: string; scope: string; sheet: string }> = [];
    for (const sheet of synthetic ? Object.keys(synthetic) : sheetNames) {
      const scope: string[] = [];
      const re = /([^{}]*)\{|\}/g;
      const source = noComments(synthetic ? synthetic[sheet]! : readFileSync(`src/styles/${sheet}`, 'utf8'));
      let m: RegExpExecArray | null;
      while ((m = re.exec(source))) {
        if (m[0] === '}') {
          scope.pop();
          continue;
        }
        const header = m[1]!.trim();
        if (header.startsWith('@')) {
          scope.push(header);
          continue;
        }
        for (const item of splitList(header)) {
          if (appliesTo(item, selector)) found.push({ item, scope: scope.join(' > '), sheet });
        }
        re.lastIndex = source.indexOf('}', re.lastIndex) + 1;
      }
    }
    return found.filter((r) => !r.scope.includes('forced-colors'));
  };

  it('reads every sheet the app loads, and every sheet in the directory', () => {
    expect(loaded.length, 'main.tsx imports its sheets from ./styles/').toBeGreaterThanOrEqual(1);
    expect(sheetNames, 'a sheet under src/styles/ that main.tsx does not import, or the reverse').toEqual([...loaded].sort());
    expect(sheetNames).toContain('notebook.css');
  });

  it.each(READ)('%s: the rules that can apply to it are exactly the ones the band model reads, in notebook.css', (selector, scopes) => {
    const found = applying(selector).map((r) => `${r.sheet}: ${r.item === selector ? r.scope : `${r.scope} { ${r.item} }`}`);
    expect(found, `${selector} has a rule the band model does not read`).toEqual(scopes.map((scope) => `notebook.css: ${scope}`));
  });

  // T016: a rule counts as applying when its last compound holds every simple selector of the modelled one,
  // whatever the form. Synthetic plants stand in for a sheet; none is written under src/styles/.
  it.each([
    ['.nb-root', '.nb-root.nb-root--x'],
    ['.nb-root', ':is(.nb-root)'],
    ['.nb-sun', ':where(.nb-sun)'],
    ['.nb-aside', '.nb-aside:not(.nb-other)'],
    ['.nb-titlebar', '.nb-page :is(.nb-titlebar, .nb-other)'],
  ])('%s: names the plant %s by sheet and selector', (selector, plant) => {
    const found = applying(selector, { 'zz.css': `${plant} { opacity: 0; }` });
    expect(found.map((r) => `${r.sheet}: ${r.item}`)).toEqual([`zz.css: ${plant}`]);
  });

  // The window grid: wide windows 1100-3840 by 600-2160 in 20px steps, and the narrow layout at its two ends.
  const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
  const WINDOWS = [
    ...range(1100, 3840, 20).flatMap((w) => range(600, 2160, 20).map((h) => ({ w, h, wide: true }))),
    ...[800, 1099].flatMap((w) => range(600, 2160, 20).map((h) => ({ w, h, wide: false }))),
  ];

  it.each(looks)(
    '%s, every window of the grid: each line of text holds its floor on the disc and glow that reach it',
    (look) => {
      const sunBase = sunN(look);
      const sun = token('--nb-sun', look);
      const glow = glowToken(look);
      const glows = [over(glow, token('--nb-sky-top', look)), over(glow, token('--nb-sky-mid', look))];
      let reached = 0;
      for (const { w, h, wide } of WINDOWS) {
        const top = pct(look, '--nb-sun-top') * h;
        const size = sunBase * scale(w, h);
        const glowReach = glowN * scale(w, h);
        for (const band of bandsOf(wide, w, h)) {
          const ink = token(band.ink, look);
          const at = `${band.text} at ${w}x${h}`;
          const discLeft = pct(look, '--nb-sun-left') * w;
          const beside = (reach: number) => discLeft - reach < band.to && discLeft + size + reach > band.from;
          if (top < band.bottom && top + size > band.top && beside(0)) {
            reached += 1;
            expect(contrastRatio(ink, sun), `${at} on the disc`).toBeGreaterThanOrEqual(band.floor);
          }
          if (top - glowReach < band.bottom && top + size + glowReach > band.top && beside(glowReach)) {
            reached += 1;
            for (const g of glows) expect(contrastRatio(ink, g), `${at} on the glow`).toBeGreaterThanOrEqual(band.floor);
          }
        }
      }
      // Every look's disc or glow reaches some line somewhere on the grid, so the sweep is never vacuous.
      expect(reached, 'the sweep reaches some band').toBeGreaterThan(0);
    },
    30_000,
  );

  it('a change of the greeting\'s size or place changes the band a line is measured on', () => {
    const wordsAt = (w: number, h: number) => bandsOf(true, w, h).find((b) => b.text === 'greeting words')!;
    expect(wordsAt(1920, 1080).bottom - wordsAt(1920, 1080).top).toBeGreaterThan(wordsAt(1280, 800).bottom - wordsAt(1280, 800).top);
    expect(wordsAt(1280, 1600).top).toBeGreaterThan(wordsAt(1280, 800).top);
  });

  describe('the scenery keeps its places and grows by the same factor (FR-036, research R3)', () => {
    const looksN: Array<[LookName, number]> = [['morning', 96], ['midday', 84], ['night', 56]];
    it.each(looksN)('%s: the sun is calc(%i * var(--nb-u)), and the glow too', (look, n) => {
      expect(blockOf(look)).toContain(`--nb-sun-size: calc(${n} * var(--nb-u));`);
      expect(ruleFor('.nb-sun')[0]!.body).toContain('box-shadow: 0 0 calc(80 * var(--nb-u)) calc(30 * var(--nb-u)) var(--nb-sun-glow);');
    });
    it.each(looksN)('%s: at s = 1 the sun is today\'s %ipx, and at 3840x2160 twice that', (look, n) => {
      expect(sunN(look) * scale(1280, 800)).toBe(n);
      expect(sunN(look) * scale(800, 600)).toBe(n);
      expect(sunN(look) * scale(3840, 2160)).toBe(2 * n);
    });
    it('sizes the stones and the cairn\'s gap by calc(N * var(--nb-u)), with today\'s N', () => {
      const today: Record<string, string> = {
        '.nb-cairn': 'gap: calc(4 * var(--nb-u));',
        '.nb-stone--1': 'width: calc(18 * var(--nb-u)); height: calc(12 * var(--nb-u));',
        '.nb-stone--2': 'width: calc(30 * var(--nb-u)); height: calc(15 * var(--nb-u));',
        '.nb-stone--3': 'width: calc(44 * var(--nb-u)); height: calc(17 * var(--nb-u));',
        '.nb-stone--4': 'width: calc(58 * var(--nb-u)); height: calc(19 * var(--nb-u));',
        '.nb-stone--5': 'width: calc(74 * var(--nb-u)); height: calc(21 * var(--nb-u));',
      };
      for (const [selector, text] of Object.entries(today)) {
        const body = ruleFor(selector)[0]!.body.replace(/\s+/g, ' ');
        for (const decl of text.split('; ').map((d) => d.replace(/;$/, ''))) expect(body, selector).toContain(decl);
      }
    });
    it('writes every length the scenery has as calc(N * var(--nb-u)), apart from a short list of fixed ones', () => {
      // Stars are 3px points, and a stone's own roundness and soft glow are not lengths of the picture.
      const FIXED = new Set(['--nb-star-size: 3px', '.nb-stone border-radius: 999px', '.nb-stone box-shadow: 0 0 14px 2px']);
      const scenery = /^\.nb-(sun|moon|star|hill|cairn|stone)/;
      const found: string[] = [];
      for (const r of rules.filter((x) => scenery.test(x.selector.split(',')[0]!.trim()))) {
        for (const d of r.body.split(';').map((x) => x.trim()).filter(Boolean)) {
          const rest = d.replace(/calc\([\d.]+ \* var\(--nb-u\)\)/g, '');
          const px = rest.match(/[\d.]+px/);
          if (px) found.push(`${r.selector.split(',')[0]!.trim()} ${d}`);
        }
      }
      for (const look of ['morning', 'midday', 'night'] as const) {
        for (const d of blockOf(look).split(';').map((x) => x.trim()).filter(Boolean)) {
          if (/^--nb-[a-z0-9-]*(size|glow)[a-z0-9-]*:/.test(d) && /[\d.]+px/.test(d.replace(/calc\([\d.]+ \* var\(--nb-u\)\)/g, ''))) found.push(d);
        }
      }
      const unscaled = found.filter((d) => ![...FIXED].some((f) => d.startsWith(f)));
      expect(unscaled, 'scenery lengths still in plain px').toEqual([]);
    });
  });

  describe('the greeting grows with the window and never below today\'s size (FR-036, research R3)', () => {
    const wordsRule = (wide: boolean) => raw('.nb-greeting__words', 'font-size', wide);
    it('declares its size, time and gap by the greeting factor, and the narrow layout keeps 30px and 4px', () => {
      expect(raw('.nb-greeting__words', 'font-size', true)).toBe('calc(40 * var(--nb-g))');
      expect(raw('.nb-greeting__time', 'font-size', true)).toBe('calc(12 * var(--nb-g))');
      expect(raw('.nb-greeting', 'gap', true)).toBe('calc(10 * var(--nb-g))');
      expect(wordsRule(false)).toBe('30px');
      expect(raw('.nb-greeting', 'gap', false)).toBe('4px');
    });
    it.each([
      [1100, 700, 40],
      [1280, 800, 40],
      [1920, 1080, 60],
      [2560, 1080, 80],
      [3840, 2160, 120],
    ])('at %ix%i the words are %fpx', (w, h, words) => {
      expect(lengthAt(wordsRule(true), w, h)).toBeCloseTo(words, 6);
    });
    it('at 2560x1080 the whole greeting ends above the far hill\'s top', () => {
      const hillTop = (Number(ruleFor('.nb-hill--far')[0]!.body.match(/top:\s*([\d.]+)%/)![1]) / 100) * 1080;
      const lines = bandsOf(true, 2560, 1080);
      expect(Math.max(...lines.map((b) => b.bottom))).toBeLessThan(hillTop);
    });
  });
});

describe('the mark on every look\'s own sky (FR-033, D4)', () => {
  const looks: LookName[] = ['morning', 'midday', 'night'];
  it.each(looks.flatMap((look) => SKIES.map((sky) => [look, sky] as const)))(
    '%s: --nb-stone-base holds 3:1 on %s',
    (look, sky) => {
      expect(contrastRatio(token('--nb-stone-base', look), token(sky, look))).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('night\'s scene: moon, stars, glow and lamp, all static (FR-001, FR-023, D3; research L3, L4)', () => {
  const outsideReduced = rulesOf(noComments(notebook).replace(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}\s*\n/, ''));

  it('draws the moon from the sun\'s tokens, as the one body in the sky', () => {
    const body = ruleFor('.nb-moon').map((r) => r.body).join('');
    expect(body).toMatch(/width:\s*var\(--nb-sun-size\)/);
    expect(body).toMatch(/left:\s*var\(--nb-sun-left\)/);
    expect(body).toMatch(/top:\s*var\(--nb-sun-top\)/);
    expect(body).toMatch(/background:\s*var\(--nb-sun\)/);
    expect(body).toMatch(/box-shadow:[^;]*var\(--nb-sun-glow\)/);
  });

  it('draws six stars whose colour, size and place are all tokens', () => {
    const star = ruleFor('.nb-star').map((r) => r.body).join('');
    expect(star).toMatch(/background:\s*var\(--nb-star\)/);
    expect(star).toMatch(/width:\s*var\(--nb-star-size\)/);
    expect(star).not.toMatch(/#[0-9a-fA-F]{3,8}\b|(width|height|left|top):\s*[\d.]+/);
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const body = ruleFor(`.nb-star--${n}`).map((r) => r.body).join('');
      expect(body).toContain(`left: var(--nb-star-${n}-left)`);
      expect(body).toContain(`top: var(--nb-star-${n}-top)`);
      expect(blockOf('night')).toContain(`--nb-star-${n}-left:`);
      expect(blockOf('night')).toContain(`--nb-star-${n}-top:`);
    }
    expect(token('--nb-star', 'night')).toBeDefined();
  });

  it('lights the stones and the notebook with night\'s glow tokens, and no other look has them', () => {
    expect(token('--nb-stone-glow', 'night')).toBeDefined();
    expect(token('--nb-lamp-glow', 'night')).toBeDefined();
    for (const look of ['morning', 'midday'] as const) {
      expect(blockOf(look)).not.toMatch(/--nb-(stone|lamp)-glow/);
    }
    expect(ruleFor('.nb-stone').map((r) => r.body).join('')).toMatch(/box-shadow:[^;]*var\(--nb-stone-glow/);
    expect(ruleFor('.nb-notebook').map((r) => r.body).join('')).toMatch(/box-shadow:[^;]*var\(--nb-lamp-glow/);
  });

  it('animates nothing, and transitions only the tab\'s hover filter', () => {
    expect(outsideReduced.filter((r) => /animation/.test(r.body))).toEqual([]);
    const transitioning = outsideReduced.filter((r) => /transition/.test(r.body));
    expect(transitioning.map((r) => r.selector)).toEqual(['.nb-tab']);
    expect(transitioning[0]!.body).toMatch(/transition:\s*filter\b[^;,]*;/);
  });

  it('keeps the reduced-motion block scoped to [data-look]', () => {
    const block = noComments(notebook).match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\n\})\s*\n/);
    expect(block).not.toBeNull();
    for (const r of rulesOf(block![1]!)) for (const one of r.selector.split(',')) expect(one.trim()).toMatch(/^\[data-look\]/);
  });
});

describe('focus is visible on every sky and on the paper (FR-022, FR-021; research L5)', () => {
  const looks: LookName[] = ['morning', 'midday', 'night'];
  it.each(looks.flatMap((look) => SKIES.map((sky) => [look, sky] as const)))(
    '%s: --nb-focus-sky holds 3:1 on %s',
    (look, sky) => {
      expect(contrastRatio(token('--nb-focus-sky', look), token(sky, look))).toBeGreaterThanOrEqual(3);
    },
  );

  it('is dark by day and light at night', () => {
    const lightness = (hex: string) => contrastRatio(hex, '#000000');
    expect(lightness(token('--nb-focus-sky', 'night'))).toBeGreaterThan(lightness(token('--nb-sky-top', 'night')));
    for (const look of ['morning', 'midday'] as const) {
      expect(lightness(token('--nb-focus-sky', look))).toBeLessThan(lightness(token('--nb-sky-top', look)));
    }
  });

  it.each(['.nb-tab:focus-visible', '.nb-switch select:focus-visible'])('%s draws its outline from --nb-focus-sky', (selector) => {
    expect(ruleFor(selector).some((r) => /outline:\s*2px solid var\(--nb-focus-sky\)/.test(r.body))).toBe(true);
  });

  it.each(looks)('%s: focus inside the paper keeps --nb-ink, at 3:1 on the paper', (look) => {
    expect(contrastRatio(token('--nb-ink', look), token('--nb-paper', look))).toBeGreaterThanOrEqual(3);
  });

  it('keeps the forced-colors block covering every selector with text outside the notebook', () => {
    for (const root of ['.nb-titlebar', '.nb-greeting', '.nb-switch']) {
      expect(forcedBlock).toContain(root);
    }
  });
});

describe('the switch is readable on every look\'s sky (FR-021, FR-011, FR-012; research L5)', () => {
  it('takes its text colour from the greeting body token', () => {
    expect(ruleFor('.nb-switch').some((r) => /color:\s*var\(--nb-greeting-body\)/.test(r.body))).toBe(true);
  });

  it.each(['morning', 'midday', 'night'] as const)('%s: that colour holds 4.5:1 on the top of the sky, where the switch sits', (look) => {
    expect(contrastRatio(token('--nb-greeting-body', look), token('--nb-sky-top', look))).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('the released build\'s first paint (D45)', () => {
  it('paints html and body in the morning sky\'s top colour until React mounts, not sand', () => {
    const morning = notebook.match(/\[data-look="morning"\]\s*\{[^}]*\}/)![0];
    const skyTop = morning.match(/--nb-sky-top:\s*(#[0-9a-fA-F]{6})/)![1]!;
    const paint = (sel: string) =>
      rulesOf(theme)
        .filter((r) => r.selector.split(',').map((x) => x.trim()).includes(sel))
        .map((r) => r.body.match(/background:\s*([^;]+);/)?.[1]?.trim())
        .find(Boolean);
    expect(paint('html')?.toLowerCase()).toBe(skyTop.toLowerCase());
    expect(paint('body')?.toLowerCase()).toBe(skyTop.toLowerCase());
  });
});
