/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';

// As `protectionPage.test.ts` does: the stylesheets and sources are read from disk through a module name
// TypeScript cannot see, because this project carries no Node typings.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};

const FILE = 'src/styles/setup-pages.css';
const read = (path: string): string => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
};
const slice = read(FILE);
const notebook = read('src/styles/notebook.css');
const main = read('src/main.tsx');
const sources = [
  read('src/screens/Setup/Choosing.tsx'),
  read('src/screens/Setup/Categories.tsx'),
  read('src/screens/Setup/CustomEntry.tsx'),
  read('src/screens/Disclosure.tsx'),
].join('\n');

const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const css = noComments(slice);

interface Rule {
  selector: string;
  body: string;
}
const rules: Rule[] = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: m[1]!.trim(),
  body: m[2]!,
}));
const own = (selector: string) =>
  rules.filter((r) => r.selector.split(',').map((x) => x.trim()).includes(selector)).map((r) => r.body).join('');

/** The colours the sheet may take, each from a look's tokens or the theme palette the shell re-points. */
const COLOURS = [
  '--nb-ink',
  '--nb-ink-body',
  '--nb-ink-quiet',
  '--nb-accent-amber',
  '--nb-rule',
  '--nb-paper',
  '--nb-button',
  '--nb-button-ink',
  '--color-moss-600',
];
const FONTS = ['--nb-font-mono', '--nb-font-serif'];
/** The small labels and buttons set in the typewriter face, and the only places it belongs (FR-014). */
const MONO = [
  '.nb-categories-count',
  '.nb-custom-button',
  '.nb-choosing-turn-on',
  '.nb-disclosure-confirm',
  '.nb-disclosure-back',
];
/** The shell's own spread classes: the sources use them, this stylesheet may add to them. */
const SHELL = ['nb-spread', 'nb-page', 'nb-page--ruled', 'nb-label'];
/** One prefix per screen: a page slice's selectors are its own (contracts/ui-shell.md). */
const OWN = ['nb-choosing-', 'nb-categories-', 'nb-custom-', 'nb-disclosure-'];

const classesIn = (text: string) => new Set(text.match(/\bnb-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*/g) ?? []);
const named = classesIn(sources);
const styled = new Set([...css.matchAll(/\.(nb-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*)/g)].map((m) => m[1]!));

function lookBlock(look: string): string {
  return noComments(notebook).match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

describe('the setup-pages stylesheet', () => {
  it('exists and has rules', () => {
    expect(slice).not.toBe('');
    expect(rules.length).toBeGreaterThan(0);
  });

  it('starts every selector with .nb- (or sits under [data-look])', () => {
    for (const { selector } of rules) {
      for (const one of selector.split(',').map((s) => s.trim())) {
        expect(one, one).toMatch(/^(\.nb-|\[data-look)/);
      }
    }
  });

  it("names only the shell's classes and classes under this slice's own prefixes", () => {
    for (const name of styled) {
      if (SHELL.includes(name)) continue;
      expect(OWN.some((p) => name.startsWith(p)), `.${name}`).toBe(true);
    }
    for (const name of named) {
      if (SHELL.includes(name)) continue;
      expect(OWN.some((p) => name.startsWith(p)), `.${name} in a screen`).toBe(true);
    }
  });

  it('names no colour literal', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(/i);
  });

  it('takes colour only from the look tokens (and the re-pointed moss), each defined in every look', () => {
    // --nb-u is the one length a page sheet sizes by, defined once for every look (boardScale.test.ts holds its use).
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!).filter((name) => name !== '--nb-u');
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect([...COLOURS, ...FONTS], name).toContain(name);
    for (const look of ['morning', 'midday', 'night']) {
      for (const name of new Set(used.filter((u) => COLOURS.includes(u)))) {
        expect(lookBlock(look), `${name} in ${look}`).toMatch(new RegExp(`${name}:\\s*#`));
      }
    }
  });

  it('has no red', () => {
    expect(css).not.toMatch(/--nb-accent-red|\bred\b|crimson|scarlet|vermilion/i);
  });

  it('uses the typewriter face only where it belongs, never on a sentence, heading or address', () => {
    const withMono = rules.filter((r) => /font-family:[^;]*--nb-font-mono/.test(r.body));
    expect(withMono.length).toBeGreaterThan(0);
    for (const { selector } of withMono) {
      for (const one of selector.split(',').map((s) => s.trim())) expect(MONO, one).toContain(one);
    }
  });

  it('sets a category count and every button in the typewriter face, each one a class a screen renders', () => {
    for (const selector of MONO) {
      expect(own(selector), `${selector} is not in the sheet`).not.toBe('');
      expect(own(selector), selector).toMatch(/font-family:[^;]*--nb-font-mono/);
      expect(named, `${selector} is rendered by no on-page branch`).toContain(selector.slice(1));
    }
  });

  it('has no animation, transition or keyframes', () => {
    expect(css).not.toMatch(/animation|transition|@keyframes/);
  });

  it('has a rule for every slice class the screens name, and names no class they do not', () => {
    for (const name of named) {
      if (SHELL.includes(name)) continue;
      expect(styled, `no rule for .${name}`).toContain(name);
    }
    for (const name of styled) expect(named, `.${name} is named by no on-page branch`).toContain(name);
  });

  it('gives the right page a foot and the spread the height of the page area', () => {
    for (const foot of ['.nb-choosing-foot', '.nb-disclosure-foot']) {
      expect(own(foot), foot).toMatch(/margin-top:\s*auto/);
    }
    for (const right of ['.nb-choosing-right', '.nb-disclosure-right']) {
      expect(own(right), right).toMatch(/display:\s*flex/);
      expect(own(right), right).toMatch(/flex-direction:\s*column/);
    }
    for (const spread of ['.nb-choosing-spread', '.nb-disclosure-spread']) {
      expect(own(spread), spread).toMatch(/min-height:\s*100%/);
    }
    // No page or spread is sized from a fixed figure; a control's own 40px floor is not a page's height.
    for (const { selector, body } of rules.filter((r) => /-(spread|left|right|foot)\b/.test(r.selector))) {
      expect(body, selector).not.toMatch(/(?:^|[;\s])(?:min-)?height:\s*[\d.]+px/);
    }
  });

  it('balances the lines of every heading, so none ends on a lone word', () => {
    for (const heading of ['.nb-categories-title', '.nb-custom-title', '.nb-disclosure-title', '.nb-disclosure-subtitle']) {
      expect(own(heading), heading).toMatch(/text-wrap:\s*balance/);
    }
  });

  it('names no palette shade in a hover rule: only the look tokens', () => {
    for (const { selector, body } of rules.filter((r) => /:hover/.test(r.selector))) {
      for (const m of body.matchAll(/var\((--[a-z0-9-]+)/g)) expect(m[1], selector).toMatch(/^--nb-/);
    }
  });
});

const LOOKS = ['morning', 'midday', 'night'] as const;
/** A colour token from a named look's block of notebook.css. */
function token(name: string, look: (typeof LOOKS)[number]): string {
  const m = lookBlock(look).match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!m) throw new Error(`token ${name} is not a hex colour in the ${look} block of notebook.css`);
  return m[1]!;
}
/** The token a rule's `border` (or `border-color`) names, and its width. */
function edgeOf(selector: string): { width: number; token: string } {
  const m = own(selector).match(/border:\s*([\d.]+)px solid var\((--[a-z-]+)\)/);
  if (!m) throw new Error(`${selector} draws no edge from a token`);
  return { width: Number(m[1]), token: m[2]! };
}

describe('the edge of every control on the paper meets 3:1 in every look (D15, T012)', () => {
  it.each(LOOKS)('%s: the address box and each checkbox draw an edge held at 3:1 against the paper', (look) => {
    for (const selector of ['.nb-custom-input', '.nb-categories-box']) {
      const edge = edgeOf(selector);
      expect(contrastRatio(token(edge.token, look), token('--nb-paper', look)), selector).toBeGreaterThanOrEqual(3);
    }
  });

  it('sits the address box on the paper: its ground is transparent, its edge 1px', () => {
    expect(own('.nb-custom-input')).toMatch(/background-color:\s*transparent/);
    expect(edgeOf('.nb-custom-input').width).toBe(1);
  });

  it('draws the checkbox itself: appearance none, an 18-unit box, a 1.5px edge', () => {
    const box = own('.nb-categories-box');
    expect(box).toMatch(/(?:^|[;\s])appearance:\s*none/);
    expect(box).toMatch(/(?:^|[;\s])width:\s*calc\(18 \* var\(--nb-u\)\)/);
    expect(box).toMatch(/(?:^|[;\s])height:\s*calc\(18 \* var\(--nb-u\)\)/);
    expect(edgeOf('.nb-categories-box').width).toBe(1.5);
  });

  it('fills a checked box with --nb-ink and draws its tick in --nb-paper', () => {
    expect(own('.nb-categories-box:checked')).toMatch(/background-color:\s*var\(--nb-ink\)/);
    expect(own('.nb-categories-box:checked::after')).toMatch(/border-color:\s*var\(--nb-paper\)/);
  });

  it('keeps a disabled "Protect it" legible: quiet words and a quiet edge', () => {
    const disabled = own('.nb-custom-button:disabled');
    expect(disabled).toMatch(/(?:^|[;\s])color:\s*var\(--nb-ink-quiet\)/);
    expect(disabled).toMatch(/border-color:\s*var\(--nb-ink-quiet\)/);
    expect(disabled).toMatch(/cursor:\s*not-allowed/);
  });

  it('draws "Protect it" in ink: an --nb-ink edge, no fill', () => {
    expect(edgeOf('.nb-custom-button').token).toBe('--nb-ink');
    expect(own('.nb-custom-button')).toMatch(/background-color:\s*transparent/);
  });

  it('fills the way forward from --nb-button with --nb-button-ink words, and quiets "Not yet"', () => {
    for (const selector of ['.nb-choosing-turn-on', '.nb-disclosure-confirm']) {
      expect(own(selector), selector).toMatch(/background-color:\s*var\(--nb-button\)/);
      expect(own(selector), selector).toMatch(/(?:^|[;\s])color:\s*var\(--nb-button-ink\)/);
    }
    expect(own('.nb-disclosure-back')).toMatch(/(?:^|[;\s])color:\s*var\(--nb-ink-quiet\)/);
    expect(own('.nb-disclosure-back')).toMatch(/border:\s*0/);
  });

  it.each(LOOKS)('%s: --nb-button-ink on --nb-button holds 4.5:1', (look) => {
    expect(contrastRatio(token('--nb-button-ink', look), token('--nb-button', look))).toBeGreaterThanOrEqual(4.5);
  });
});

/** The last value a rule set for a property, or undefined where it does not set it. */
function last(body: string, property: string): string | undefined {
  const found = [...body.matchAll(new RegExp(`(?:^|[;\\s])${property}:\\s*([^;]+)`, 'g'))];
  return found.at(-1)?.[1]!.trim();
}
const tokenOf = (value: string | undefined): string | undefined => value?.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];
/** `.a:hover` and `.a::placeholder` sit on the element `.a`, whose own rules they refine. */
const baseOf = (selector: string) => selector.replace(/::?[a-z-]+(?:\([^)]*\))?$/, '');

/** WCAG 1.4.3 exempts the text of an inactive control; this is the one place the sheet uses it. */
const INACTIVE = ['.nb-custom-button:disabled'];

interface Text {
  selector: string;
  colour: string;
  ground: string;
  large: boolean;
}
/** Every selector in the sheet whose rule sets the colour of text, or the ground one sits on. */
const texts: Text[] = [];
for (const selector of new Set(rules.flatMap((r) => r.selector.split(',').map((x) => x.trim())))) {
  const body = own(selector);
  const base = own(baseOf(selector));
  if (last(body, 'color') === undefined && last(body, 'background-color') === undefined) continue;
  const colour = tokenOf(last(body, 'color') ?? last(base, 'color'));
  if (!colour) continue; // no text on this selector: a dot, a box, a tick
  const ground = tokenOf(last(body, 'background-color')) ?? tokenOf(last(base, 'background-color')) ?? '--nb-paper';
  const size = last(body, 'font-size') ?? last(base, 'font-size');
  texts.push({ selector, colour, ground, large: size !== undefined && parseFloat(size) >= 24 });
}

describe('every text colour the sheet declares meets its floor against what is behind it (FR-021, SC-003, T019)', () => {
  it('finds the sheet\'s text rules, each of the kinds the screens draw', () => {
    const found = texts.map((t) => t.selector);
    for (const expected of [
      '.nb-categories-title',
      '.nb-categories-lead',
      '.nb-categories-name',
      '.nb-categories-count',
      '.nb-categories-note',
      '.nb-custom-input',
      '.nb-custom-input::placeholder',
      '.nb-custom-added--in-force',
      '.nb-custom-added--waiting',
      '.nb-custom-reason',
      '.nb-custom-button',
      '.nb-custom-button:hover',
      '.nb-choosing-turn-on',
      '.nb-choosing-turn-on:hover',
      '.nb-disclosure-confirm',
      '.nb-disclosure-confirm:hover',
      '.nb-disclosure-back',
      '.nb-disclosure-back:hover',
      '.nb-disclosure-line',
      '.nb-disclosure-helper',
      '.nb-disclosure-subtitle',
      '.nb-disclosure-administrator',
    ]) {
      expect(found, expected).toContain(expected);
    }
  });

  it('exempts only the inactive "Protect it"', () => {
    const exempt = texts.filter((t) => INACTIVE.includes(t.selector));
    expect(exempt.map((t) => t.selector)).toEqual(INACTIVE);
  });

  it.each(LOOKS)('%s: each is held at 4.5:1 (3:1 at 24px and up) against its ground', (look) => {
    for (const { selector, colour, ground, large } of texts.filter((t) => !INACTIVE.includes(t.selector))) {
      const ratio = contrastRatio(token(colour, look), token(ground, look));
      expect(ratio, `${selector}: ${colour} on ${ground}`).toBeGreaterThanOrEqual(large ? 3 : 4.5);
    }
  });
});

describe('a colour that carries a meaning is its token and no other (FR-016, T020)', () => {
  const colourOf = (selector: string) => tokenOf(last(own(selector), 'color'));
  const fillOf = (selector: string) => tokenOf(last(own(selector), 'background-color'));
  const edgeOfLeft = (selector: string) => last(own(selector), 'border-left')?.match(/^([\d.]+)px solid var\((--[a-z0-9-]+)\)$/);

  it('draws the reason an address could not be taken in amber: its words and its left edge', () => {
    expect(colourOf('.nb-custom-reason')).toBe('--nb-accent-amber');
    const edge = edgeOfLeft('.nb-custom-reason');
    expect(edge, 'a left edge from a token').not.toBeNull();
    expect(edge![2]).toBe('--nb-accent-amber');
  });

  it('draws the sentence for an address that was added in moss when in force, in amber when not confirmed or off (D17)', () => {
    expect(colourOf('.nb-custom-added--in-force')).toBe('--color-moss-600');
    expect(colourOf('.nb-custom-added--waiting')).toBe('--nb-accent-amber');
  });

  it('draws the dot of what is in force in moss, and the dot of what is not covered in quiet ink', () => {
    expect(fillOf('.nb-disclosure-dot--in-force')).toBe('--color-moss-600');
    expect(fillOf('.nb-disclosure-dot--not-covered')).toBe('--nb-ink-quiet');
  });

  it('draws the waiting note beside the categories in amber (D17)', () => {
    expect(colourOf('.nb-categories-note')).toBe('--nb-accent-amber');
  });

  it.each(LOOKS)('%s: amber holds 4.5:1 on the paper', (look) => {
    expect(contrastRatio(token('--nb-accent-amber', look), token('--nb-paper', look))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the stylesheet import', () => {
  it('is in main.tsx exactly once, after notebook.css and protection-page.css', () => {
    const lines = main.split('\n').map((l) => l.trim());
    const at = lines.indexOf("import './styles/setup-pages.css';");
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeGreaterThan(lines.indexOf("import './styles/notebook.css';"));
    expect(at).toBeGreaterThan(lines.indexOf("import './styles/protection-page.css';"));
    expect(main.match(/setup-pages\.css/g)).toHaveLength(1);
  });
});
