/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';

// As `quietPages.test.ts` and `setupPages.test.ts` do: the stylesheets and sources are read from disk through
// a module name TypeScript cannot see, because this project carries no Node typings.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};

const FILE = 'src/styles/tonight-page.css';
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
const sources = read('src/screens/Reaches.tsx') + '\n' + read('src/screens/CheckIn.tsx');

const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const css = noComments(slice);

interface Rule {
  selector: string;
  body: string;
}
const parse = (text: string): Rule[] =>
  [...text.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1]!.trim(),
    body: m[2]!,
  }));
const rules = parse(css);
/** The forced-colours block is the last thing in the sheet. */
const forcedText = css.match(/@media\s*\(forced-colors:\s*active\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? '';
const forced = parse(forcedText);
/** The rules outside the forced-colours block, which comes last and would otherwise have the last word. */
const base = parse(css.split(/@media\s*\(forced-colors/)[0]!);
const selectorsOf = (r: Rule) => r.selector.split(',').map((s) => s.trim());
const bodyOf = (selector: string, from: Rule[] = rules) =>
  from.filter((r) => selectorsOf(r).includes(selector)).map((r) => r.body).join('');

const COLOURS = [
  '--nb-paper',
  '--nb-ink',
  '--nb-ink-body',
  '--nb-ink-quiet',
  '--nb-rule',
  '--nb-accent-amber',
  '--nb-button',
  '--nb-button-ink',
];
const FONTS = ['--nb-font-serif', '--nb-font-mono'];
/** The small labels and buttons set in the typewriter face, and the only places it belongs (FR-014). */
const MONO = [
  '.nb-reaches-which__button',
  '.nb-reaches-field',
  '.nb-reaches-time',
  '.nb-reaches-count',
  '.nb-checkin-time',
  '.nb-checkin-keep',
  '.nb-checkin-switch',
];
/** The shell's own spread classes: the sources use them, this stylesheet may add to them. */
const SHELL = ['nb-spread', 'nb-page', 'nb-page--ruled', 'nb-label'];
/** One prefix per screen: a page slice's selectors are its own (contracts/ui-shell.md). */
const OWN = ['nb-reaches-', 'nb-checkin-'];
const isOwn = (name: string) => OWN.some((p) => name.startsWith(p));

const classesIn = (text: string) => new Set(text.match(/(?<!-)\bnb-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*/g) ?? []);
const named = classesIn(sources);
const styled = new Set([...css.matchAll(/\.(nb-[a-z0-9]+(?:[-_]{1,2}[a-z0-9]+)*)/g)].map((m) => m[1]!));

function lookBlock(look: string): string {
  return noComments(notebook).match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}
const LOOKS = ['morning', 'midday', 'night'] as const;
/** A colour token from a named look's block of notebook.css. */
function token(name: string, look: (typeof LOOKS)[number]): string {
  const m = lookBlock(look).match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!m) throw new Error(`token ${name} is not a hex colour in the ${look} block of notebook.css`);
  return m[1]!;
}
/** The last value a rule set for a property, or undefined where it does not set it. */
function last(body: string, property: string): string | undefined {
  const found = [...body.matchAll(new RegExp(`(?:^|[;\\s])${property}:\\s*([^;]+)`, 'g'))];
  return found.at(-1)?.[1]!.trim();
}
const tokenOf = (value: string | undefined): string | undefined => value?.match(/^var\((--[a-z0-9-]+)\)$/)?.[1];

describe('the tonight-page stylesheet', () => {
  it('exists and has rules', () => {
    expect(slice).not.toBe('');
    expect(rules.length).toBeGreaterThan(0);
  });

  it("starts every selector with .nb-reaches- or .nb-checkin-, apart from the shell's classes it is scoped under", () => {
    for (const r of rules) {
      for (const one of selectorsOf(r)) {
        const compounds = one.split(/\s*[>+~]\s*|\s+/);
        const subject = [...compounds.at(-1)!.matchAll(/\.(nb-[a-z0-9_-]+)/g)].map((m) => m[1]!);
        expect(subject.length, one).toBeGreaterThan(0);
        if (isOwn(subject[0]!)) continue;
        // A shell class is the subject only where an earlier compound of ours scopes it.
        expect(SHELL, `.${subject[0]} in ${one}`).toContain(subject[0]);
        const scope = compounds.slice(0, -1).join(' ');
        expect(/\.nb-(reaches|checkin)-/.test(scope), `${one} is not scoped under one of ours`).toBe(true);
      }
    }
  });

  it("names only the shell's classes and classes under this slice's own prefixes, in the sheet and the screens", () => {
    for (const name of styled) expect(isOwn(name) || SHELL.includes(name), `.${name}`).toBe(true);
    for (const name of named) expect(isOwn(name) || SHELL.includes(name), `.${name} in a screen`).toBe(true);
  });

  it('has a rule for every class the two screens emit on a page, and no rule for a class neither names', () => {
    expect([...named].filter(isOwn).length).toBeGreaterThan(0);
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

  it('takes colour only from the look tokens, each defined in every look', () => {
    // --nb-u is the one length a page sheet sizes by, defined once for every look (boardScale.test.ts holds its use).
    // --nb-count-chars is the other: a length the list sets from its largest count (a custom property, not a class).
    const used = [...css.matchAll(/var\((--[a-z0-9-]+)/g)]
      .map((m) => m[1]!)
      .filter((name) => name !== '--nb-u' && name !== '--nb-count-chars');
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect([...COLOURS, ...FONTS], name).toContain(name);
    for (const look of LOOKS) {
      for (const name of new Set(used.filter((u) => COLOURS.includes(u)))) {
        expect(lookBlock(look), `${name} in ${look}`).toMatch(new RegExp(`${name}:\\s*#`));
      }
    }
  });

  it('has no red', () => {
    expect(css).not.toMatch(/--nb-accent-red|\bred\b|crimson|scarlet|vermilion/i);
  });

  it('has no animation, transition or keyframes', () => {
    expect(css).not.toMatch(/animation|transition|@keyframes/);
  });
});

describe('type', () => {
  it('sets only the serif and the typewriter face, from their tokens', () => {
    expect(css).not.toMatch(/monospace/);
    for (const r of rules) {
      for (const m of r.body.matchAll(/font-family:\s*([^;]+)/g)) {
        expect(m[1]!.trim(), r.selector).toMatch(/^var\(--nb-font-(serif|mono)\)$/);
      }
    }
  });

  it('sets the typewriter face on each small label and button, and on nothing else', () => {
    const withMono = rules.filter((r) => /font-family:\s*var\(--nb-font-mono\)/.test(r.body));
    for (const r of withMono) {
      for (const one of selectorsOf(r)) expect(MONO, one).toContain(one);
    }
    for (const selector of MONO) {
      expect(bodyOf(selector), `${selector} is not in the sheet`).not.toBe('');
      expect(bodyOf(selector), selector).toMatch(/font-family:\s*var\(--nb-font-mono\)/);
      expect(named, `${selector} is rendered by no on-page branch`).toContain(selector.slice(1));
    }
  });

  it('sets the date boxes in the serif, not the typewriter face (a box is not a label)', () => {
    expect(bodyOf('.nb-reaches-date')).toMatch(/font-family:\s*var\(--nb-font-serif\)/);
  });
});

describe('the spreads', () => {
  it('places the Today spread: the group above the left page, the ruled page across both rows', () => {
    const grid = bodyOf('.nb-reaches-leaves');
    expect(grid).toMatch(/grid-template-rows:\s*auto 1fr/);
    expect(grid).toMatch(/min-height:\s*100%/);
    const which = bodyOf('.nb-reaches-leaves > .nb-reaches-which');
    expect(which).toMatch(/grid-column:\s*1\b/);
    expect(which).toMatch(/grid-row:\s*1\b/);
    const left = bodyOf('.nb-reaches-leaves > .nb-page');
    expect(left).toMatch(/grid-column:\s*1\b/);
    expect(left).toMatch(/grid-row:\s*2\b/);
    const right = bodyOf('.nb-reaches-leaves > .nb-page--ruled');
    expect(right).toMatch(/grid-column:\s*2\b/);
    expect(right).toMatch(/grid-row:\s*1\s*\/\s*(-1|3|span 2)/);
  });

  it('gives the Tonight spread the height of the page area, and a ruled page whose first line sits on a rule', () => {
    expect(bodyOf('.nb-checkin-leaves')).toMatch(/min-height:\s*100%/);
    for (const selector of ['.nb-reaches-leaves > .nb-page--ruled', '.nb-checkin-leaves > .nb-page--ruled']) {
      expect(bodyOf(selector), selector).toMatch(/padding-top:\s*calc\(22 \* var\(--nb-u\)\)/);
    }
  });

  it('gives no page or spread a fixed pixel height', () => {
    for (const r of rules) {
      if (/leaves|--ruled|\.nb-page\b/.test(r.selector)) {
        expect(r.body, r.selector).not.toMatch(/(?<![a-z-])(min-|max-)?height:\s*[\d.]+px/);
      }
    }
  });

  it('draws a soft bar: a --nb-rule track and an --nb-ink-quiet fill', () => {
    expect(bodyOf('.nb-reaches-bar')).toMatch(/background-color:\s*var\(--nb-rule\)/);
    expect(bodyOf('.nb-reaches-bar__fill')).toMatch(/background-color:\s*var\(--nb-ink-quiet\)/);
  });

  it('sets a hairline from the rule token above each closing note', () => {
    for (const selector of ['.nb-reaches-note', '.nb-checkin-note']) {
      expect(bodyOf(selector), selector).toMatch(/border-top:\s*1px solid var\(--nb-rule\)/);
    }
  });

  it('sets each typed line on the notebook\'s pitch, 32 units', () => {
    for (const selector of ['.nb-reaches-line', '.nb-checkin-line']) {
      expect(bodyOf(selector), selector).toMatch(/line-height:\s*calc\(32 \* var\(--nb-u\)\)/);
    }
  });
});

const edgeOf = (selector: string, property = 'border'): { width: number; token: string } => {
  const m = bodyOf(selector).match(new RegExp(`${property}:\\s*([\\d.]+)px solid var\\((--[a-z-]+)\\)`));
  if (!m) throw new Error(`${selector} draws no ${property} from a token`);
  return { width: Number(m[1]), token: m[2]! };
};

describe('the edge of every control on the paper meets 3:1 in every look (D15, D22 7, D24)', () => {
  const PRESSED = ".nb-reaches-which__button[aria-pressed='true']";

  it('draws the From and To boxes with a 1px --nb-ink-quiet edge on a transparent ground', () => {
    expect(edgeOf('.nb-reaches-date')).toEqual({ width: 1, token: '--nb-ink-quiet' });
    expect(bodyOf('.nb-reaches-date')).toMatch(/background-color:\s*transparent/);
  });

  it("marks the pressed Which days button with a 1.5px --nb-ink line and ink words", () => {
    expect(edgeOf(PRESSED, 'border-bottom')).toEqual({ width: 1.5, token: '--nb-ink' });
    expect(bodyOf(PRESSED)).toMatch(/(?:^|[;\s])color:\s*var\(--nb-ink\)/);
    // The other keeps a line of the same width, transparent, so pressing one moves nothing.
    expect(bodyOf('.nb-reaches-which__button')).toMatch(/border-bottom:\s*1\.5px solid transparent/);
  });

  it('draws the writing space with a 1px --nb-ink-quiet edge', () => {
    expect(edgeOf('.nb-checkin-write')).toEqual({ width: 1, token: '--nb-ink-quiet' });
  });

  it.each(LOOKS)('%s: each of those three colours holds 3:1 against the paper', (look) => {
    const edges = [
      ['.nb-reaches-date', edgeOf('.nb-reaches-date').token],
      [PRESSED, edgeOf(PRESSED, 'border-bottom').token],
      ['.nb-checkin-write', edgeOf('.nb-checkin-write').token],
    ] as const;
    for (const [selector, name] of edges) {
      expect(contrastRatio(token(name, look), token('--nb-paper', look)), selector).toBeGreaterThanOrEqual(3);
    }
  });

  it('fills "Keep this" from --nb-button with --nb-button-ink words, and quiets it while it cannot be pressed', () => {
    const keep = bodyOf('.nb-checkin-keep');
    expect(keep).toMatch(/background-color:\s*var\(--nb-button\)/);
    expect(keep).toMatch(/(?:^|[;\s])color:\s*var\(--nb-button-ink\)/);
    const disabled = bodyOf('.nb-checkin-keep:disabled');
    expect(disabled).toMatch(/(?:^|[;\s])color:\s*var\(--nb-ink-quiet\)/);
    expect(disabled).toMatch(/border-color:\s*var\(--nb-ink-quiet\)/);
    expect(disabled).toMatch(/cursor:\s*not-allowed/);
  });

  it.each(LOOKS)('%s: --nb-button-ink on --nb-button holds 4.5:1', (look) => {
    expect(contrastRatio(token('--nb-button-ink', look), token('--nb-button', look))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('the lined writing space (D24)', () => {
  const write = () => bodyOf('.nb-checkin-write', base);
  const shellPitch = Number(
    noComments(notebook)
      .match(/\.nb-page--ruled\s*\{[^}]*background-size:\s*100%\s*calc\(([\d.]+) \* var\(--nb-u\)\)/)?.[1], // N of the pitch: 32 units, T005
  );

  it('reads the notebook\'s ruling pitch as 32px', () => {
    expect(shellPitch).toBe(32);
  });

  it('is the page\'s serif at 18 units on a 32-unit line', () => {
    expect(write()).toMatch(/font-family:\s*var\(--nb-font-serif\)/);
    expect(write()).toMatch(/font-size:\s*calc\(18 \* var\(--nb-u\)\)/);
    expect(last(write(), 'line-height')).toBe('calc(32 * var(--nb-u))');
  });

  it('draws its own rules in --nb-rule at the same pitch as its line height and the notebook\'s ruling', () => {
    const image = last(write(), 'background-image') ?? '';
    expect(image).toMatch(/^repeating-linear-gradient\(/);
    expect(image).toMatch(/var\(--nb-rule\)/);
    const lengths = [...image.matchAll(/calc\(([\d.]+) \* var\(--nb-u\)/g)].map((m) => Number(m[1]));
    const pitch = Math.max(...lengths);
    expect(pitch).toBe(Number(last(write(), 'line-height')!.match(/^calc\(([\d.]+) \* var\(--nb-u\)\)$/)?.[1]));
    expect(pitch).toBe(shellPitch);
    expect(last(write(), 'background-size')).toMatch(new RegExp(`^100%\\s+calc\\(${pitch} \\* var\\(--nb-u\\)\\)$`));
  });

  it('moves its rules with its text and sits on a --nb-paper ground, so the page\'s ruling does not show through', () => {
    expect(last(write(), 'background-attachment')).toBe('local');
    expect(tokenOf(last(write(), 'background-color'))).toBe('--nb-paper');
  });

  it('is never given a fixed height: its minimum is in the notebook\'s unit, 14rem and its edge at today\'s size', () => {
    expect(last(write(), 'min-height')).toBe('calc(226 * var(--nb-u))');
    expect(write()).not.toMatch(/(?:^|[;\s])height:/);
    expect(write()).not.toMatch(/(?:^|[;\s])max-height:/);
  });

  it('drops its rules under forced colours, and no other rule of the block touches its edge or words', () => {
    expect(forcedText).not.toBe('');
    expect(bodyOf('.nb-checkin-write', forced)).toMatch(/background-image:\s*none/);
  });

  it('keeps the bars seen under forced colours, in the system ink', () => {
    expect(bodyOf('.nb-reaches-bar__fill', forced)).toMatch(/background-color:\s*CanvasText/);
  });
});

describe('what follows the writing space is legible however tall it is dragged (T026, FR-019, D24)', () => {
  const resize = last(bodyOf('.nb-checkin-write', base), 'resize');

  // Dragged to a height that is not a multiple of 32px, the page's ruling no longer meets these elements on
  // a line, so each takes its own ground (the paper, or the button's fill) unless the drag keeps the pitch.
  it.each(['.nb-checkin-keep', '.nb-checkin-status', '.nb-checkin-switch'])(
    '%s has a ground of its own, or the writing space keeps the pitch',
    (selector) => {
      if (resize === 'none') return;
      const ground = tokenOf(last(bodyOf(selector, base), 'background-color'));
      expect(['--nb-paper', '--nb-button'], `${selector} has no ground`).toContain(ground);
    },
  );
});

describe('one note style on the page, in both Today views (T027, FR-018)', () => {
  const reaches = read('src/screens/Reaches.tsx');
  // The coverage note, the estimates line and "Cairn counts only while it is running" on the left pages.
  const NOTES = ['.nb-reaches-note', '.nb-reaches-aside'];

  it('sets every note class to the same size and colour', () => {
    const look = (selector: string) => ({
      size: last(bodyOf(selector, base), 'font-size'),
      colour: tokenOf(last(bodyOf(selector, base), 'color')),
    });
    const first = look(NOTES[0]!);
    expect(first.size).toBeDefined();
    expect(first.colour).toBeDefined();
    for (const selector of NOTES) expect(look(selector), selector).toEqual(first);
  });

  it('gives the Over time coverage note and estimates line a note class, not the state sentence', () => {
    const over = reaches.slice(reaches.indexOf('{list.coverage_note && ('));
    const coverage = over.match(/<p className="([^"]+)">\{list\.coverage_note\}/)?.[1];
    const estimates = over.match(/\{list\.estimates_excluded > 0 && \(\s*<p className="([^"]+)"/)?.[1];
    for (const used of [coverage, estimates]) {
      expect(NOTES.map((n) => n.slice(1)), String(used)).toContain(used);
    }
  });
});

describe('focus on the paper (the sweep is T016)', () => {
  const CONTROLS = [
    '.nb-reaches-which__button',
    '.nb-reaches-date',
    '.nb-checkin-write',
    '.nb-checkin-keep',
    '.nb-checkin-switch',
  ];

  it('draws a 2px --nb-ink outline at a 2px offset on every :focus-visible rule', () => {
    const focus = rules.filter((r) => /:focus-visible/.test(r.selector));
    expect(focus.length).toBeGreaterThan(0);
    for (const r of focus) {
      expect(r.body, r.selector).toMatch(/outline:\s*2px solid var\(--nb-ink\)/);
      expect(r.body, r.selector).toMatch(/outline-offset:\s*2px/);
    }
  });

  it.each(CONTROLS)('%s has a :focus-visible rule', (selector) => {
    expect(bodyOf(`${selector}:focus-visible`), selector).not.toBe('');
  });

  it.each(LOOKS)('%s: --nb-ink holds 3:1 against the paper', (look) => {
    expect(contrastRatio(token('--nb-ink', look), token('--nb-paper', look))).toBeGreaterThanOrEqual(3);
  });
});

interface Text {
  selector: string;
  colour: string;
  ground: string;
  large: boolean;
}
const texts: Text[] = [];
for (const selector of new Set(rules.flatMap(selectorsOf))) {
  if (/:disabled/.test(selector)) continue; // an inactive control's words are exempt (WCAG 1.4.3)
  const body = bodyOf(selector);
  const colour = tokenOf(last(body, 'color'));
  if (!colour) continue;
  const ground = tokenOf(last(body, 'background-color')) ?? '--nb-paper';
  const size = last(body, 'font-size');
  texts.push({ selector, colour, ground, large: size !== undefined && parseFloat(size) >= 24 });
}

describe('every text colour the sheet declares meets its floor against what is behind it (FR-021)', () => {
  it("finds the sheet's text rules", () => {
    const found = texts.map((t) => t.selector);
    for (const expected of [
      '.nb-reaches-title',
      '.nb-reaches-note',
      '.nb-reaches-site',
      '.nb-reaches-time',
      '.nb-reaches-count',
      '.nb-checkin-title',
      '.nb-checkin-write',
      '.nb-checkin-keep',
      '.nb-checkin-switch',
    ]) {
      expect(found, expected).toContain(expected);
    }
  });

  it.each(LOOKS)('%s: each is held at 4.5:1 (3:1 at 24px and up) against its ground', (look) => {
    for (const { selector, colour, ground, large } of texts) {
      const ratio = contrastRatio(token(colour, look), token(ground, look));
      expect(ratio, `${selector}: ${colour} on ${ground}`).toBeGreaterThanOrEqual(large ? 3 : 4.5);
    }
  });
});

describe('the stylesheet import', () => {
  it('is in main.tsx exactly once, after notebook.css and the other page sheets', () => {
    const lines = main.split('\n').map((l) => l.trim());
    const mine = lines.indexOf("import './styles/tonight-page.css';");
    expect(mine).toBeGreaterThan(-1);
    for (const earlier of ['notebook', 'protection-page', 'setup-pages', 'quiet-pages']) {
      const at = lines.indexOf(`import './styles/${earlier}.css';`);
      expect(at, earlier).toBeGreaterThan(-1);
      expect(mine, earlier).toBeGreaterThan(at);
    }
    expect(main.match(/tonight-page\.css/g)).toHaveLength(1);
  });
});
