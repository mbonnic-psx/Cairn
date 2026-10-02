/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// As `protectionPage.test.ts` does: the stylesheets and sources are read from disk through a module name
// TypeScript cannot see, because this project carries no Node typings.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};

const FILE = 'src/styles/quiet-pages.css';
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
const limits = read('src/screens/Limits.tsx');
const teardown = read('src/screens/Teardown.tsx');

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
const selectorsOf = (r: Rule) => r.selector.split(',').map((s) => s.trim());
const bodyOf = (selector: string) =>
  rules.filter((r) => selectorsOf(r).includes(selector)).map((r) => r.body).join('');

const COLOURS = ['--nb-ink', '--nb-ink-body', '--nb-ink-quiet', '--nb-accent-amber', '--nb-rule', '--nb-paper'];
const FONTS = ['--nb-font-serif'];
/** The shell's own spread classes: the sources use them, this stylesheet may add to them. */
const SHELL = ['nb-spread', 'nb-page', 'nb-page--ruled', 'nb-label'];
/** One prefix per screen: a page slice's selectors are its own (contracts/ui-shell.md). */
const OWN = ['nb-limits-', 'nb-teardown-'];

const classesIn = (text: string) => new Set(text.match(/\bnb-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*/g) ?? []);
const named = new Set([...classesIn(limits), ...classesIn(teardown)]);
const styled = new Set([...css.matchAll(/\.(nb-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*)/g)].map((m) => m[1]!));

function lookBlock(look: string): string {
  return noComments(notebook).match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

describe('the quiet-pages stylesheet', () => {
  it('exists and has rules', () => {
    expect(slice).not.toBe('');
    expect(rules.length).toBeGreaterThan(0);
  });

  it('starts every selector with .nb-limits- or .nb-teardown-, apart from the shell\'s published classes', () => {
    for (const r of rules) {
      for (const one of selectorsOf(r)) {
        const classes = [...one.matchAll(/\.(nb-[a-z0-9_-]+)/g)].map((m) => m[1]!);
        expect(classes.length, one).toBeGreaterThan(0);
        // The subject of the selector (its last compound) is one of ours.
        expect(OWN.some((p) => classes[classes.length - 1]!.startsWith(p)), one).toBe(true);
        for (const c of classes) {
          expect(OWN.some((p) => c.startsWith(p)) || SHELL.includes(c), `.${c} in ${one}`).toBe(true);
        }
      }
    }
  });

  it('names only the shell\'s classes and classes under this slice\'s own prefixes, in the sheet and the screens', () => {
    for (const name of styled) {
      if (SHELL.includes(name)) continue;
      expect(OWN.some((p) => name.startsWith(p)), `.${name}`).toBe(true);
    }
    for (const name of named) {
      if (SHELL.includes(name)) continue;
      expect(OWN.some((p) => name.startsWith(p)), `.${name} in a screen`).toBe(true);
    }
  });

  it('has a rule for every class the two screens emit, and no rule for a class neither names', () => {
    expect(named.size).toBeGreaterThan(0);
    for (const name of named) {
      if (SHELL.includes(name)) continue;
      expect(styled, `.${name} has no rule`).toContain(name);
    }
    for (const name of styled) {
      if (SHELL.includes(name)) continue;
      expect(named, `.${name} is named by neither screen`).toContain(name);
    }
  });

  it('names no colour literal', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(/i);
  });

  it('takes colour only from the ink, amber and rule tokens (and paper), each defined in every look', () => {
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

  describe('the marks beside each line', () => {
    it('reads the amber token for what is still here', () => {
      const body = bodyOf('.nb-teardown-mark--amber');
      expect(body).toMatch(/var\(--nb-accent-amber\)/);
      expect(body).toMatch(/background(-color)?:/);
    });

    it('reads the quiet ink for the covered and the checked dot, filled', () => {
      for (const selector of ['.nb-limits-mark--dot', '.nb-teardown-mark--dot']) {
        const body = bodyOf(selector);
        expect(body, selector).toMatch(/background(-color)?:\s*var\(--nb-ink-quiet\)/);
      }
    });

    it('draws the not-covered mark as an outline, a ring, not a fill', () => {
      const body = bodyOf('.nb-limits-mark--ring');
      expect(body).toMatch(/border:\s*[\d.]+px solid var\(--nb-ink-quiet\)/);
      expect(body).toMatch(/background(-color)?:\s*transparent/);
      expect(body).not.toMatch(/background(-color)?:\s*var\(/);
    });

    it('gives both screens\' marks one round shape each, sized alike so the ring and the dot differ by fill alone', () => {
      const dot = bodyOf('.nb-limits-mark');
      const dotT = bodyOf('.nb-teardown-mark');
      for (const body of [dot, dotT]) {
        expect(body).toMatch(/border-radius:\s*50%/);
        expect(body).toMatch(/flex-shrink:\s*0/);
      }
      expect(dot.match(/width:\s*([\d.]+px)/)?.[1]).toBe(dotT.match(/width:\s*([\d.]+px)/)?.[1]);
    });
  });

  it('sets what a person reads in the page\'s serif and uses no typewriter face (the labels get it from .nb-label)', () => {
    expect(css).not.toMatch(/--nb-font-mono|monospace/);
    const title = bodyOf('.nb-limits-title') + bodyOf('.nb-teardown-title');
    expect(title).toMatch(/font-family:\s*var\(--nb-font-serif\)/);
    for (const selector of ['.nb-limits-note', '.nb-limits-kept', '.nb-teardown-sentence']) {
      expect(bodyOf(selector), selector).toMatch(/color:\s*var\(--nb-ink/);
    }
    expect(limits + teardown).toMatch(/nb-label/);
  });

  it('sets the hairline above the note on administrators from the rule token', () => {
    expect(bodyOf('.nb-limits-note')).toMatch(/border-top:\s*1px solid var\(--nb-rule\)/);
  });

  it('has no animation, transition or keyframes', () => {
    expect(css).not.toMatch(/animation|transition|@keyframes/);
  });

  describe('the ruled page reaches the foot of the page area', () => {
    it.each(['.nb-limits-leaves', '.nb-teardown-leaves'])('%s sets min-height: 100%', (selector) => {
      expect(bodyOf(selector)).toMatch(/min-height:\s*100%/);
    });

    it('gives no leaf, and no ruled sibling, a fixed pixel height', () => {
      for (const r of rules) {
        if (/leaves|--ruled/.test(r.selector)) {
          expect(r.body, r.selector).not.toMatch(/(?<![a-z-])(min-|max-)?height:\s*[\d.]+px/);
        }
      }
    });
  });

  it('draws any focus indicator from --nb-ink (none is expected: the spreads hold no control)', () => {
    const focus = rules.filter((r) => /:focus-visible/.test(r.selector));
    for (const r of focus) expect(r.body, r.selector).toMatch(/var\(--nb-ink\)/);
    expect(limits + teardown).not.toMatch(/<(button|a|input|select|textarea)\b|Button|onClick|tabIndex/);
  });
});

describe('the stylesheet import', () => {
  it('is in main.tsx exactly once, after notebook.css', () => {
    const lines = main.split('\n').map((l) => l.trim());
    const at = lines.indexOf("import './styles/notebook.css';");
    expect(at).toBeGreaterThan(-1);
    const mine = lines.indexOf("import './styles/quiet-pages.css';");
    expect(mine).toBeGreaterThan(at);
    expect(main.match(/quiet-pages\.css/g)).toHaveLength(1);
  });
});
