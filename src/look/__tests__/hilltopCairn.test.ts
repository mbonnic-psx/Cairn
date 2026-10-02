/// <reference types="vite/client" />
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Landscape } from '../../shell/Landscape';
import { contrastRatio } from '../contrast';
import type { Look } from '../look';

// T022 (looks; research Q5): the hilltop cairn's outline stones hold 3:1 against whatever is painted
// behind them, in every look, at every window from 800x600 up. The geometry comes from notebook.css,
// the tone from the rendered Landscape, and the surface is the topmost thing painted at each sample.

// Vitest blanks CSS imports, and this project carries no Node typings, so the stylesheet is read from
// disk through a module name TypeScript cannot see.
const nodeFs = 'node:' + 'fs';
const { readFileSync, readdirSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
  readdirSync: (path: string) => string[];
};
const css = readFileSync('src/styles/notebook.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const sheetNames: string[] = readdirSync('src/styles').filter((f) => f.endsWith('.css')).sort();
const loaded = [...readFileSync('src/main.tsx', 'utf8').matchAll(/import\s+'\.\/styles\/([\w-]+\.css)'/g)].map((m) => m[1]!);
const sheets = sheetNames.map((name) => ({ name, text: readFileSync(`src/styles/${name}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') }));

const LOOKS: Look[] = ['morning', 'midday', 'night'];
const FLOOR = 3;

const bodyOf = (selector: string): string => {
  for (const m of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    if (m[1]!.split(',').map((x) => x.trim()).includes(selector)) return m[2]!;
  }
  throw new Error(`notebook.css has no rule for ${selector}`);
};
/** s, the length `--nb-u` resolves to in px at a window, from the shared block's own declaration. */
const scale = (() => {
  const m = css.match(/--nb-u:\s*clamp\(([\d.]+)px, min\(100vw \/ ([\d.]+), 100vh \/ ([\d.]+)\), ([\d.]+)px\)/);
  if (!m) throw new Error('notebook.css defines no --nb-u');
  return (w: number, h: number) => Math.min(Math.max(Number(m[1]), Math.min(w / Number(m[2]), h / Number(m[3]))), Number(m[4]));
})();
/** N of a length written `calc(N * var(--nb-u))`: the length at s = 1, today's px. */
const scaled = (selector: string, prop: string): number => {
  const m = bodyOf(selector).match(new RegExp(`(?:^|[;\\s])${prop}:\\s*calc\\(([\\d.]+) \\* var\\(--nb-u\\)\\)\\s*;`));
  return m ? Number(m[1]) : NaN; // NaN where the length is not written so: the first test below names it
};
const num = (selector: string, prop: string, unit: string): number => {
  const m = bodyOf(selector).match(new RegExp(`(?:^|[;\\s])${prop}:\\s*(-?[\\d.]+)${unit}\\s*;`));
  if (!m) throw new Error(`${selector} sets no ${prop} in ${unit}`);
  return Number(m[1]);
};

function tokenOf(look: Look, name: string): string {
  const block = css.match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  const m = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`token ${name} is not a #rrggbb colour in the ${look} block`);
  return m[1]!;
}

const mix = (a: string, b: string, t: number) =>
  '#' +
  [0, 1, 2]
    .map((i) => {
      const x = parseInt(a.slice(1 + i * 2, 3 + i * 2), 16);
      const y = parseInt(b.slice(1 + i * 2, 3 + i * 2), 16);
      return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
    })
    .join('');

/** The sky: top at 0%, mid at 60%, bottom at 100%, as `.nb-sky` declares. */
const skyAt = (look: Look, fraction: number) =>
  fraction <= 0.6
    ? mix(tokenOf(look, '--nb-sky-top'), tokenOf(look, '--nb-sky-mid'), fraction / 0.6)
    : mix(tokenOf(look, '--nb-sky-mid'), tokenOf(look, '--nb-sky-bottom'), (fraction - 0.6) / 0.4);

// The hills, far to near (paint order): an ellipse inscribed in a box of vw width, % height, vw left, % top.
const HILLS = (['far', 'mid', 'near'] as const).map((name) => ({
  name,
  token: `--nb-hill-${name}`,
  width: num(`.nb-hill--${name}`, 'width', 'vw'),
  height: num(`.nb-hill--${name}`, 'height', '%'),
  left: num(`.nb-hill--${name}`, 'left', 'vw'),
  top: num(`.nb-hill--${name}`, 'top', '%'),
}));

const insideHill = (h: (typeof HILLS)[number], x: number, y: number, w: number, hgt: number) => {
  const a = (h.width / 100) * w / 2;
  const b = (h.height / 100) * hgt / 2;
  const cx = (h.left / 100) * w + a;
  const cy = (h.top / 100) * hgt + b;
  return ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1;
};

// The cairn: a column at left/top (% of the window), stones centred on the widest, in a gap.
const CAIRN_LEFT = num('.nb-cairn', 'left', '%');
const CAIRN_TOP = num('.nb-cairn', 'top', '%');
const GAP = scaled('.nb-cairn', 'gap');
const STONE = [1, 2, 3, 4, 5].map((n) => ({
  width: scaled(`.nb-stone--${n}`, 'width'),
  height: scaled(`.nb-stone--${n}`, 'height'),
}));
const WIDEST = Math.max(...STONE.map((s) => s.width));

/** The tone class of the first (top) and last (bottom) stone, as the rendered Landscape paints them. */
function outlineTokens(look: Look): string[] {
  const html = renderToStaticMarkup(createElement(Landscape, { look }));
  const stones = [...html.matchAll(/class="nb-stone nb-stone--(\w+) nb-stone--(\d)"/g)];
  expect(stones).toHaveLength(5);
  const byIndex = (n: number) => stones.find((m) => m[2] === String(n))![1]!;
  return [byIndex(1), byIndex(5)].map((tone) => `--nb-stone-${tone}`);
}

function stoneBox(index: number, w: number, h: number) {
  const s = scale(w, h); // every stone length is N x s
  const x0 = (CAIRN_LEFT / 100) * w + ((WIDEST - STONE[index]!.width) * s) / 2;
  let y0 = (CAIRN_TOP / 100) * h;
  for (let i = 0; i < index; i++) y0 += (STONE[i]!.height + GAP) * s;
  return { x0, y0, x1: x0 + STONE[index]!.width * s, y1: y0 + STONE[index]!.height * s };
}

const WINDOWS: Array<[number, number]> = [];
for (let h = 600; h <= 1440; h += 20) for (let w = 800; w <= 2560; w += 40) WINDOWS.push([w, h]);

describe('the hilltop cairn\'s outline stones hold 3:1 on what lies behind them (FR-021, SC-003; looks T022)', () => {
  it('sizes every stone and the gap as calc(N * var(--nb-u)), so the model reads today\'s N', () => {
    expect(GAP).toBe(4);
    expect(STONE).toEqual([[18, 12], [30, 15], [44, 17], [58, 19], [74, 21]].map(([width, height]) => ({ width, height })));
  });

  it('renders the first and last stone in the base tone, the outline', () => {
    for (const look of LOOKS) expect(outlineTokens(look)).toEqual(['--nb-stone-base', '--nb-stone-base']);
  });

  it.each(LOOKS)('%s: each outline stone holds 3:1 on the topmost surface at its corners and centre, from 800x600 up', (look) => {
    const surfaces = new Set<string>();
    for (const [index, tokenName] of [[0, outlineTokens(look)[0]!], [4, outlineTokens(look)[1]!]] as const) {
      const ink = tokenOf(look, tokenName);
      for (const [w, h] of WINDOWS) {
        const { x0, y0, x1, y1 } = stoneBox(index, w, h);
        const points: Array<[number, number]> = [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2]];
        for (const [x, y] of points) {
          const hill = [...HILLS].reverse().find((candidate) => insideHill(candidate, x, y, w, h));
          const ground = hill ? tokenOf(look, hill.token) : skyAt(look, y / h);
          if (index === 4) surfaces.add(hill ? hill.name : 'sky');
          expect(
            contrastRatio(ink, ground),
            `stone ${index + 1} at ${w}x${h}, (${x.toFixed(0)},${y.toFixed(0)}) on ${hill ? hill.name + ' hill' : 'sky'}`,
          ).toBeGreaterThanOrEqual(FLOOR);
        }
      }
    }
    // Liveness: the sweep finds the bottom stone on a hill, so the check cannot pass vacuously.
    expect([...surfaces].some((s) => s !== 'sky'), `surfaces found under the bottom stone: ${[...surfaces].join(', ')}`).toBe(true);
  });
});

// T005 (loose-ends; quiet-pages T013, research R6): `bodyOf` returns the first rule for a selector, so a
// second rule for any selector the model reads, scoped to a look or inside a media query, would change the
// scene with no change here. T011: every sheet is global once its screen is imported, so every sheet under
// src/styles/ is read. Each selector the model reads has exactly one rule, bare, in notebook.css, or the guard
// fails by sheet and selector.
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

describe('every rule that can apply to what the cairn guard models is the one it reads (FR-021, SC-003; quiet-pages T013, loose-ends T011)', () => {
  const MODELLED = [
    ...(['far', 'mid', 'near'] as const).map((n) => `.nb-hill--${n}`),
    '.nb-cairn',
    ...[1, 2, 3, 4, 5].map((n) => `.nb-stone--${n}`),
  ];
  const rulesFor = (selector: string, from: Array<{ name: string; text: string }> = sheets) => {
    const found: Array<{ item: string; scope: string }> = [];
    for (const sheet of from) {
      const scope: string[] = [];
      const re = /([^{}]*)\{|\}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(sheet.text))) {
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
          if (appliesTo(item, selector)) found.push({ item: `${sheet.name}: ${scope.length ? scope.join(' > ') + ' { ' + item + ' }' : item}`, scope: sheet.name });
        }
        re.lastIndex = sheet.text.indexOf('}', re.lastIndex) + 1;
      }
    }
    return found;
  };

  it('reads every sheet the app loads, and every sheet in the directory', () => {
    expect(loaded.length, 'main.tsx imports its sheets from ./styles/').toBeGreaterThanOrEqual(1);
    expect(sheetNames, 'a sheet under src/styles/ that main.tsx does not import, or the reverse').toEqual([...loaded].sort());
    expect(sheets.map((s) => s.name)).toContain('notebook.css');
  });

  it.each(MODELLED)('%s has one bare rule, the one the model reads, and no other, in any sheet', (selector) => {
    const found = rulesFor(selector).map((r) => r.item);
    expect(found, `${selector} has a rule this guard does not model`).toEqual([`notebook.css: ${selector}`]);
  });

  // T016: a rule counts as applying when its last compound holds every simple selector of the modelled one,
  // whatever the form. Synthetic plants stand in for a sheet; none is written under src/styles/.
  it.each([
    '.nb-cairn.nb-cairn--x',
    ':is(.nb-cairn)',
    ':where(.nb-cairn)',
    '.nb-hill--far:not(.nb-other)',
    '.nb-page :is(.nb-stone--3, .nb-other)',
  ])('names the plant %s by sheet and selector', (plant) => {
    const modelled = ['.nb-hill--far', '.nb-cairn', '.nb-stone--3'].filter((m) => rulesFor(m, [{ name: 'zz.css', text: `${plant} { opacity: 0; }` }]).length > 0);
    expect(modelled.length, 'some modelled selector sees the plant').toBe(1);
    expect(rulesFor(modelled[0]!, [{ name: 'zz.css', text: `${plant} { opacity: 0; }` }]).map((r) => r.item)).toEqual([`zz.css: ${plant}`]);
  });
});
