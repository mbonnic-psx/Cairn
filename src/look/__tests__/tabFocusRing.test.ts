/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';

// T023 (looks; research Q6): a tab's focus ring has two contiguous bands, so on every side one band holds
// 3:1 against whatever lies under it: the notebook's paper on the tab's left edge, the sky and the hills
// elsewhere. At night no single colour can hold 3:1 on the paper and on the sky at once.

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

const LOOKS = ['morning', 'midday', 'night'] as const;
type Look = (typeof LOOKS)[number];
const FLOOR = 3;

// The forced-colors block is the last at-rule; the ring is read from everything before it.
const forcedStart = css.indexOf('@media (forced-colors: active)');
const base = forcedStart === -1 ? css : css.slice(0, forcedStart);
const forced = forcedStart === -1 ? '' : css.slice(forcedStart);

const bodiesFor = (source: string, selector: string) =>
  [...source.matchAll(/([^{};]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1]!.split(',').map((x) => x.trim()).includes(selector))
    .map((m) => m[2]!)
    .join(';');

const token = (look: Look, name: string): string => {
  const block = css.match(new RegExp(`\\[data-look="${look}"\\]\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  const m = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`token ${name} is not a #rrggbb colour in the ${look} block`);
  return m[1]!;
};

const ring = bodiesFor(base, '.nb-tab:focus-visible');
const outline = ring.match(/outline:\s*(\d+)px\s+solid\s+var\((--[a-z-]+)\)/);
const offset = ring.match(/outline-offset:\s*(\d+)px/);
const shadow = ring.match(/box-shadow:\s*0\s+0\s+0\s+(\d+)px\s+var\((--[a-z-]+)\)/);

const SURFACES = ['--nb-paper', '--nb-sky-top', '--nb-sky-mid', '--nb-sky-bottom', '--nb-hill-far', '--nb-hill-mid', '--nb-hill-near'];

describe('a tab\'s focus ring is two contiguous bands (FR-022, FR-021; looks T023)', () => {
  it('has an outline and a box-shadow, both drawn only on :focus-visible of a tab', () => {
    expect(outline, 'the tab rule has `outline: Npx solid var(--token)`').not.toBeNull();
    expect(offset, 'the tab rule has an outline-offset').not.toBeNull();
    expect(shadow, 'the tab rule has `box-shadow: 0 0 0 Npx var(--token)`').not.toBeNull();
    expect(bodiesFor(base, '.nb-tab')).not.toMatch(/box-shadow/);
  });

  it('has bands that touch: the shadow fills exactly the gap between the tab and the outline', () => {
    expect(shadow, 'the ring has a shadow band').not.toBeNull();
    expect(Number(shadow?.[1])).toBe(Number(offset?.[1]));
  });

  it.each(LOOKS.flatMap((look) => SURFACES.map((surface) => [look, surface] as const)))(
    '%s: at least one band holds 3:1 on %s',
    (look, surface) => {
      const under = token(look, surface);
      // Whatever bands the rule draws: a rule with no shadow has the outline alone.
      const bands = [outline?.[2], shadow?.[2]].filter((name): name is string => !!name).map((name) => token(look, name));
      const best = Math.max(...bands.map((band) => contrastRatio(band, under)));
      expect(best).toBeGreaterThanOrEqual(FLOOR);
    },
  );

  it('drops the box-shadow in forced colours, where the outline takes the system colour', () => {
    expect(bodiesFor(forced, '.nb-tab:focus-visible')).toMatch(/box-shadow:\s*none/);
  });
});

// T005 (loose-ends; quiet-pages T013, research R6): the ring is read from the bare rules for the tab's
// selector, so a look-scoped or media-scoped rule for it would change what is drawn with no change here.
// Every rule that can apply to the tab's focus ring, outside forced colours, is either one the model reads
// above or fails the guard by name.
interface Found {
  item: string;
  scope: string;
}
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
/** Every selector in the sheet whose last compound (attributes dropped, `:is(…)` unwrapped) holds every simple selector of `selector`, with the at-rules around it. */
function rulesApplyingTo(source: string, selector: string): Found[] {
  const found: Found[] = [];
  const scope: string[] = [];
  const re = /([^{}]*)\{|\}/g;
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
      if (appliesTo(item, selector)) found.push({ item, scope: scope.join(' > ') });
    }
    re.lastIndex = source.indexOf('}', re.lastIndex) + 1;
  }
  return found;
}

describe('every rule that can apply to a tab\'s focus ring is one the guard models (FR-022, FR-021; quiet-pages T013, loose-ends T011)', () => {
  const SELECTOR = '.nb-tab:focus-visible';
  // Every sheet is global once its screen is imported, so every sheet under src/styles/ is read.
  const outsideForced = sheets.flatMap((sheet) =>
    rulesApplyingTo(sheet.text, SELECTOR)
      .filter((r) => !r.scope.includes('forced-colors'))
      .map((r) => ({ ...r, sheet: sheet.name })),
  );

  it('reads every sheet the app loads, and every sheet in the directory', () => {
    expect(loaded.length, 'main.tsx imports its sheets from ./styles/').toBeGreaterThanOrEqual(1);
    expect(sheetNames, 'a sheet under src/styles/ that main.tsx does not import, or the reverse').toEqual([...loaded].sort());
    expect(sheets.map((s) => s.name)).toContain('notebook.css');
  });

  it('finds the bare rules the ring is read from, so the check is live', () => {
    expect(outsideForced.filter((r) => r.sheet === 'notebook.css').length).toBeGreaterThanOrEqual(1);
    expect(ring).not.toBe('');
  });

  it('finds no look-scoped rule, no rule inside an at-rule and no rule in another sheet that it does not model', () => {
    const unmodelled = outsideForced
      .filter((r) => r.sheet !== 'notebook.css' || r.item !== SELECTOR || r.scope !== '')
      .map((r) => `${r.sheet}: ${r.scope ? r.scope + ' { ' : ''}${r.item}${r.scope ? ' }' : ''}`);
    expect(unmodelled, `${SELECTOR} has a rule this guard does not model`).toEqual([]);
  });
});

// T016 (loose-ends; quiet-pages T013, FR-022): a rule counts as applying when its last compound contains every
// simple selector of the modelled one, whatever the form, so a more specific compound, `:is(…)` or `:where(…)`
// is seen. Synthetic plants stand in for a sheet; none is written under src/styles/.
describe('the matcher sees a rule whatever the form of its selector (T016)', () => {
  const SELECTOR = '.nb-tab:focus-visible';
  const PLANTS = [
    '.nb-tab.nb-tab--x:focus-visible',
    ':is(.nb-tab):focus-visible',
    '.nb-tab:is(:focus-visible)',
    ':where(.nb-tab):where(:focus-visible)',
    '.nb-tab:focus-visible:not(.nb-tab--y)',
    '.nb-page :is(.nb-tab, .nb-other):focus-visible',
  ];
  it.each(PLANTS)('names the plant %s by sheet and selector', (plant) => {
    const found = rulesApplyingTo(`${plant} { box-shadow: none; }`, SELECTOR);
    expect(found.map((r) => r.item)).toEqual([plant]);
  });
  it('still passes over rules for other tabs and other states', () => {
    const source = '.nb-tab { color: red; } .nb-tab--x:focus-visible { color: red; } .nb-tab:hover { color: red; } .nb-tabs:focus-visible { color: red; }';
    expect(rulesApplyingTo(source, SELECTOR)).toEqual([]);
  });
});
