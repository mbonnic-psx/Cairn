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
const MONO = [
  '.nb-protection-badge',
  '.nb-protection-figure__label',
  '.nb-trail-inventory__caption',
  '.nb-protection-note__button',
];
/** The shell's own spread classes: the sources use them, this stylesheet may add to them. */
const SHELL = ['nb-spread', 'nb-page', 'nb-page--ruled', 'nb-label'];
/** One prefix per screen: a page slice's selectors are its own (contracts/ui-shell.md). */
const OWN = ['nb-protection-', 'nb-trail-'];

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

  it('names only the shell\'s classes and classes under this slice\'s own prefixes', () => {
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

  describe('an address reads whole, one to a line (T013)', () => {
    const body = (selector: string) =>
      rules.filter((r) => r.selector.split(',').map((x) => x.trim()).includes(selector)).map((r) => r.body).join('');
    const line = body('.nb-trail-inventory__line');
    const address = body('.nb-trail-inventory__address');

    it('lets the aside move to its own line before an address breaks', () => {
      expect(line).toMatch(/display:\s*flex/);
      expect(line).toMatch(/flex-wrap:\s*wrap/);
    });

    it('pins no item of a row to its full width: nothing here is flex: none or flex-shrink: 0', () => {
      expect(css).not.toMatch(/flex:\s*none/);
      expect(css).not.toMatch(/flex-shrink:\s*0/);
    });

    it('breaks an address only when it alone is wider than the page', () => {
      expect(address).toMatch(/overflow-wrap:\s*break-word/);
      expect(address).not.toMatch(/anywhere/);
      for (const { selector, body: b } of rules) {
        if (/overflow-wrap:\s*anywhere/.test(b)) {
          expect(selector, 'anywhere belongs on the ruled page only').toContain('.nb-page--ruled');
        }
      }
    });

    it('marks a continuation line with a hanging indent on the address', () => {
      const pad = address.match(/padding-left:\s*([\d.]+)(em|px)/);
      const indent = address.match(/text-indent:\s*-([\d.]+)(em|px)/);
      expect(pad).not.toBeNull();
      expect(indent).not.toBeNull();
      expect(indent![1]! + indent![2]!).toBe(pad![1]! + pad![2]!);
    });

    it('keeps the rule pitch: a line is 32px', () => {
      expect(line).toMatch(/line-height:\s*32px/);
    });
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
