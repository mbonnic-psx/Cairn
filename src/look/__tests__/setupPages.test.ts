/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

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
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!);
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

  it('names no palette shade in a hover rule: only the look tokens', () => {
    for (const { selector, body } of rules.filter((r) => /:hover/.test(r.selector))) {
      for (const m of body.matchAll(/var\((--[a-z0-9-]+)/g)) expect(m[1], selector).toMatch(/^--nb-/);
    }
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
