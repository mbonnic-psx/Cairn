/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';

// T023 (looks; research Q6): a tab's focus ring has two contiguous bands, so on every side one band holds
// 3:1 against whatever lies under it: the notebook's paper on the tab's left edge, the sky and the hills
// elsewhere. At night no single colour can hold 3:1 on the paper and on the sky at once.

// Vitest blanks CSS imports, and this project carries no Node typings, so the stylesheet is read from
// disk through a module name TypeScript cannot see.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const css = readFileSync('src/styles/notebook.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

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
