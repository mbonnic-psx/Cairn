/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// As `tokens.test.ts` does: the stylesheets and sources are read from disk through a module name
// TypeScript cannot see, because this project carries no Node typings.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};

const FILE = 'src/styles/protection-page.css';
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
const protection = read('src/screens/Protection.tsx');
const trail = read('src/screens/Trail.tsx');

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

const COLOURS = ['--nb-ink', '--nb-ink-body', '--nb-ink-quiet', '--nb-accent-amber', '--nb-rule', '--nb-paper'];
const FONTS = ['--nb-font-mono', '--nb-font-serif'];
/** The only places a typewriter face belongs on these spreads (research P5). */
const MONO = ['.nb-state', '.nb-figure__label', '.nb-inventory__caption', '.nb-note__button'];
/** The shell's own spread classes: the sources use them, this stylesheet may add to them. */
const SHELL = ['nb-spread', 'nb-page', 'nb-page--ruled', 'nb-label'];

const classesIn = (text: string) => new Set(text.match(/\bnb-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*/g) ?? []);
const named = new Set([...classesIn(protection), ...classesIn(trail)]);
const styled = new Set(
  [...css.matchAll(/\.(nb-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*)/g)].map((m) => m[1]!),
);

function lookBlock(look: string): string {
  return noComments(notebook).match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

describe('the protection-page stylesheet', () => {
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

  it('names no colour literal', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(/i);
  });

  it('takes colour only from the five ink and rule tokens (and paper), each defined in every look', () => {
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

  it('has no animation, transition or keyframes', () => {
    expect(css).not.toMatch(/animation|transition|@keyframes/);
  });

  it('wraps a long domain rather than overflowing a page', () => {
    const address = rules.filter((r) => r.selector.includes('.nb-inventory'));
    expect(address.some((r) => /overflow-wrap:\s*anywhere/.test(r.body))).toBe(true);
  });

  it('has a rule for every slice class the screens name, and names no class they do not', () => {
    for (const name of named) {
      if (SHELL.includes(name)) continue;
      expect(styled, `no rule for .${name}`).toContain(name);
    }
    for (const name of styled) expect(named, `.${name} is named by neither screen`).toContain(name);
  });
});

describe('the stylesheet import', () => {
  it('is in main.tsx exactly once, on the line after notebook.css', () => {
    const lines = main.split('\n');
    const at = lines.findIndex((l) => l.includes("'./styles/notebook.css'"));
    expect(at).toBeGreaterThan(-1);
    expect(lines[at + 1]!.trim()).toBe("import './styles/protection-page.css';");
    expect(main.match(/protection-page\.css/g)).toHaveLength(1);
  });
});
