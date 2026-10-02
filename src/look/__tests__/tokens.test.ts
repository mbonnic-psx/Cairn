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

describe.each(['morning', 'midday', 'night'] as const)('%s: every colour a screen draws as text, on the paper (FR-021, SC-003)', (look) => {
  const colourOf = (css: string) => {
    const out = new Map<string, string>();
    for (const m of css.matchAll(/--color-([a-z]+-\d+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out.set(m[1]!, m[2]!);
    return out;
  };
  const base = colourOf(theme);
  const lookBlock = notebook.match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{[^}]*\\}`))![0];
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
    expect(contrastRatio(colour!, token('--nb-paper', look))).toBeGreaterThanOrEqual(TEXT);
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

  it('tiles the rules at exactly one pitch, so no seam skips or doubles a rule (T025)', () => {
    const body = ruleFor('.nb-page--ruled')[0]!.body;
    expect(body).toMatch(/background-size:\s*100%\s+32px/);
    expect(body).toMatch(/var\(--nb-rule\)\s+31px,\s*var\(--nb-rule\)\s+32px/);
    const y = Number(body.match(/background-position:\s*0\s+(\d+)px/)?.[1]);
    expect(y % 32, 'the ruling starts 22px into the pitch, where the first line of writing sits').toBe(22);
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

  it('the theme palette overrides read on the paper, and the badges on their tints', () => {
    const overrides = [...blockOf(look).matchAll(/(--color-[a-z]+-\d+):\s*(#[0-9a-fA-F]{6})/g)];
    expect(overrides.length).toBeGreaterThan(0);
    for (const [, name, colour] of overrides) {
      expect(contrastRatio(colour!, t('--nb-paper')), name).toBeGreaterThanOrEqual(TEXT);
    }
    const own = new Map(overrides.map((m) => [m[1]!.replace('--color-', ''), m[2]!]));
    const tints = new Map([...theme.matchAll(/--color-([a-z]+-\d+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1]!, m[2]!]));
    const colour = (n: string) => own.get(n) ?? tints.get(n)!;
    for (const [fg, bg] of [['moss-600', 'moss-100'], ['amber-600', 'amber-100'], ['ink-500', 'sand-100']] as const) {
      expect(contrastRatio(colour(fg), colour(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(TEXT);
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
    expect(contrastRatio(token('--color-amber-600', 'night'), token('--nb-paper', 'night'))).toBeGreaterThanOrEqual(TEXT);
  });
});

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
    expect(rules.filter((r) => /:focus-visible/.test(r.selector) && /\.nb-page/.test(r.selector) && !/--nb-ink\b/.test(r.body))).toEqual([]);
  });

  it('keeps the forced-colors block covering every selector with text outside the notebook', () => {
    for (const root of ['.nb-titlebar', '.nb-greeting', '.nb-switch']) {
      expect(forcedBlock).toContain(root);
    }
  });
});

describe('what applies outside any [data-look]: the switch on Current (FR-022, FR-011)', () => {
  // The switch is the one .nb-element that renders with no [data-look] ancestor
  // (on Current it carries none), so every --nb-* a rule of its own reads is unset there.
  const bare = ruleFor('.nb-switch select:focus-visible');

  it('gives the focused select the browser\'s own ring on Current, where --nb-focus-sky is unset', () => {
    const own = ruleFor('.nb-switch:not([data-look]) select:focus-visible');
    expect(own.some((r) => /outline:\s*auto\b/.test(r.body))).toBe(true);
    // It sits after the look-coloured rule, and is the only way the unset var is answered.
    const order = rules.map((r) => r.selector);
    expect(order.indexOf('.nb-switch:not([data-look]) select:focus-visible')).toBeGreaterThan(
      order.indexOf(bare[0]!.selector),
    );
  });

  it('says plainly what the switch does on Current: its text inherits, it draws the browser\'s ring', () => {
    expect(notebook).not.toMatch(/On Current it has no look and no rule/);
    expect(notebook).toMatch(/On Current[\s\S]{0,120}inherit/);
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
