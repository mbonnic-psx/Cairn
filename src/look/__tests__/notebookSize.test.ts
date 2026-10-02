/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const css = readFileSync('src/styles/notebook.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

interface Rule {
  selector: string;
  body: string;
}
const rulesOf = (text: string): Rule[] =>
  [...text.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));
const ruleIn = (text: string, selector: string) =>
  rulesOf(text).find((r) => r.selector.split(',').map((x) => x.trim()).includes(selector));
const declOf = (rule: Rule | undefined, prop: string): string | undefined =>
  rule?.body.match(new RegExp(`(?:^|[;\\s])${prop}:\\s*([^;]+);`))?.[1]?.trim();

const narrowBlock = css.match(/@media \(max-width: 1099px\)\s*\{([\s\S]*?\n\})\s*\n/)?.[1] ?? '';
const forcedBlock = css.match(/@media \(forced-colors: active\)\s*\{([\s\S]*?\n\})\s*$/m)?.[1] ?? '';
const base = css.replace(narrowBlock, '').replace(forcedBlock, '');

const root = ruleIn(base, '.nb-root');
const nb = ruleIn(base, '.nb-notebook');
const nbNarrow = ruleIn(narrowBlock, '.nb-notebook');
const rootNarrow = ruleIn(narrowBlock, '.nb-root');

const TRACK = /^(\d+)px minmax\(0, min\((\d+)px, max\((\d+)px, calc\(\(100vh - (\d+)px\) \* (\d+) \/ (\d+)\)\)\)\)$/;
const columns = declOf(root, 'grid-template-columns') ?? '';
const track = columns.match(TRACK);
const px = (v: string | undefined) => Number(v?.match(/^(\d+)px$/)?.[1]);
const pad = (v: string | undefined) => {
  const m = v?.match(/^(\d+)px (\d+)px (\d+)px (\d+)px$/);
  return { right: Number(m?.[2]), left: Number(m?.[4]) };
};

describe('the notebook sheet declares the sizing (FR-035)', () => {
  it('the side-by-side track is exactly the capped, height-widened width', () => {
    expect(columns).toBe('250px minmax(0, min(1200px, max(830px, calc((100vh - 120px) * 830 / 680))))');
    expect(track).not.toBeNull();
  });
  it('the notebook is a landscape box, sized by its width', () => {
    expect(declOf(nb, 'width')).toBe('100%');
    expect(declOf(nb, 'aspect-ratio')).toBe('830 / 680');
    expect(declOf(nb, 'max-height')).toBe('calc(100vh - 120px)');
    expect(declOf(nb, 'min-height')).toBe('480px');
    expect(declOf(nb, 'height')).toBeUndefined();
  });
  it('the narrow notebook keeps the ratio and takes the room left', () => {
    expect(declOf(nbNarrow, 'max-height')).toBe('100%');
    expect(declOf(nbNarrow, 'min-height')).toBe('0');
    expect(declOf(nbNarrow, 'height')).toBeUndefined();
  });
});

/** The body of every block opened by `header`, braces matched. */
function blocksOf(text: string, header: RegExp): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(new RegExp(header.source, 'g'))) {
    const start = m.index! + m[0].length;
    let depth = 1;
    let i = start;
    while (i < text.length && depth > 0) {
      depth += text[i] === '{' ? 1 : text[i] === '}' ? -1 : 0;
      i++;
    }
    out.push(text.slice(start, i - 1));
  }
  return out;
}

describe('where aspect-ratio is not read, the notebook still has a definite height (research R3)', () => {
  const noRatio = blocksOf(css, /@supports not \(aspect-ratio: 1 \/ 1\)\s*\{/);
  const afterNarrow = css.indexOf('@supports not (aspect-ratio: 1 / 1)') > css.indexOf(narrowBlock) + narrowBlock.length;
  const baseFallback = noRatio.map((b) => ruleIn(b.replace(/@media[^{]*\{[\s\S]*\}/, ''), '.nb-notebook')).find(Boolean);
  const narrowFallback = noRatio
    .flatMap((b) => blocksOf(b, /@media \(max-width: 1099px\)\s*\{/))
    .map((b) => ruleIn(b, '.nb-notebook'))
    .find(Boolean);

  it('gives the side-by-side notebook the height the ratio gave it before', () => {
    expect(noRatio.length).toBeGreaterThan(0);
    expect(declOf(baseFallback, 'height')).toBe('calc(100vh - 120px)');
  });
  it('gives the narrow notebook the room left, so the page area scrolls', () => {
    expect(declOf(narrowFallback, 'height')).toBe('100%');
  });
  it('comes after the narrow block, so it wins at equal weight', () => {
    expect(afterNarrow).toBe(true);
  });
  it('covers every layout that sizes the notebook by its ratio', () => {
    const sized = [nb, nbNarrow].filter((r) => declOf(r, 'aspect-ratio') !== undefined || declOf(r, 'max-height') !== undefined);
    expect(sized).toHaveLength(2);
    expect([baseFallback, narrowFallback].every((r) => declOf(r, 'height') !== undefined)).toBe(true);
  });
});

// A model built from the parsed numbers.
const [, aside, cap, floor, off, rw, rh] = (track ?? []).map((x, i) => (i === 0 ? 0 : Number(x)));
const gap = px(declOf(root, 'column-gap'));
const wide = pad(declOf(root, 'padding'));
const narrowPad = pad(declOf(rootNarrow, 'padding'));
const ratio = (rw ?? 1) / (rh ?? 1); // width over height
const maxOff = px(declOf(nb, 'max-height')?.match(/(\d+px)\)$/)?.[1]);
const minH = px(declOf(nb, 'min-height'));
const breakpoint = Number(narrowBlock ? css.match(/@media \(max-width: (\d+)px\)/)?.[1] : NaN) + 1;

function size(w: number, h: number): { width: number; height: number; room: number } {
  if (w >= breakpoint) {
    const room = w - wide.left - wide.right - aside! - gap;
    const width = Math.min(room, Math.min(cap!, Math.max(floor!, (h - off!) * ratio)));
    const height = Math.max(minH, Math.min(h - maxOff, width / ratio));
    return { width, height, room };
  }
  const room = w - narrowPad.left - narrowPad.right;
  return { width: room, height: room / ratio, room };
}

describe('the notebook never narrows, never stands upright, and widens with the window (FR-035, D36)', () => {
  const cases: Array<[number, number, number, number]> = [
    [1280, 800, 830, 680],
    [1100, 600, 650, 480],
    [1920, 800, 830, 680],
    [1920, 1080, 1171.8, 960],
    [2560, 1440, 1200, 983] /* 1200 x 680 / 830 = 983.1; the specification says 982 */,
    [1280, 1400, 830, 680],
    [3840, 2160, 1200, 983],
  ];
  it.each(cases)('at %ix%i it is %f by %f', (w, h, ew, eh) => {
    const s = size(w, h);
    expect(Math.abs(s.width - ew)).toBeLessThanOrEqual(1);
    expect(Math.abs(s.height - eh)).toBeLessThanOrEqual(1);
  });

  it('is at least as wide as it is tall, and as wide as before, in every wide window', () => {
    for (let w = 1100; w <= 3840; w += 20) {
      for (let h = 600; h <= 2160; h += 20) {
        const s = size(w, h);
        expect(s.width, `${w}x${h}`).toBeGreaterThanOrEqual(s.height);
        expect(s.width, `${w}x${h}`).toBeGreaterThanOrEqual(Math.min(s.room, 830));
      }
    }
  });

  it.each([
    [800, 600],
    [1099, 1400],
  ])('in the narrow layout at %ix%i it fills the room and is landscape', (w, h) => {
    const s = size(w, h);
    expect(s.width).toBe(w - 80);
    expect(s.height).toBeLessThanOrEqual((s.width * 680) / 830 + 0.001);
  });
});
