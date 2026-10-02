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
    [2560, 1440, 1200, 983] /* 1200 x 680 / 830 = 983.1; the specification says 983 */,
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

// The tab column (T008). Each tab is a flex item that may shrink, so a label is whole only if the tab it ends
// in is at least as tall as the label's longest word.
describe('the tab column fits the notebook at every window the model covers (FR-035)', () => {
  const tabRule = (text: string) => ruleIn(text, '.nb-tab');
  const largeHeader = css.match(/@(media|container)\s*\(min-height:\s*(\d+)px\)\s*\{(?=[\s\S]*?min-height:\s*80px)/);
  const largeBlock = largeHeader ? blocksOf(css, new RegExp(largeHeader[0].replace(/[()]/g, '\\$&'))).find((b) => /min-height:\s*80px/.test(b)) ?? '' : '';
  const largeFrom = Number(largeHeader?.[2]);
  const keyedTo = largeHeader?.[1]; // 'media' (the window) or 'container' (the notebook)

  const advance = (ruleBody: Rule | undefined, font: number) => {
    const ls = Number(declOf(ruleBody, 'letter-spacing')?.match(/^([\d.]+)em$/)?.[1]);
    return 0.6 * font + ls * font; // a monospace glyph is 0.6em wide
  };
  const smallRule = tabRule(css.replace(largeBlock, ''));
  const largeRule = tabRule(largeBlock);
  const labels = ['Protection', 'What is protected', 'Today', 'Tonight', 'What Cairn covers'];
  const longest = (l: string) => Math.max(...l.split(' ').map((w) => w.length));

  const small = { adv: advance(smallRule, 11), pad: 8, gap: 4, top: 12, floorMin: 0, wrapAt: 76 };
  const large = { adv: advance(largeRule, 12), pad: 10, gap: 6, top: 40, floorMin: 80, wrapAt: Infinity };

  /** Final tab heights after flex-shrink (weighted by base size, clamped at each floor). */
  function tabs(mode: typeof small, available: number): number[] {
    const base = labels.map((l) => Math.min(l.length * mode.adv, mode.wrapAt) + 2 * mode.pad);
    // min-height: 80px replaces min-height: min-content in the large rules.
    const floor = labels.map((l) => (mode.floorMin > 0 ? mode.floorMin : longest(l) * mode.adv + 2 * mode.pad));
    let size = base.map((b) => Math.max(b, 0));
    let frozen = size.map(() => false);
    for (let pass = 0; pass < 6; pass++) {
      const free = available - mode.gap * (labels.length - 1) - size.reduce((a, b) => a + b, 0);
      if (free >= 0) break;
      const weight = size.reduce((a, b, i) => a + (frozen[i] ? 0 : b), 0);
      let clamped = false;
      size = size.map((b, i) => {
        if (frozen[i]) return b;
        const next = b + (free * b) / weight;
        if (next < floor[i]!) {
          frozen[i] = true;
          clamped = true;
          return floor[i]!;
        }
        return next;
      });
      if (!clamped) break;
    }
    return size;
  }

  function fits(w: number, h: number): string | null {
    const nbHeight = size(w, h).height;
    const isLarge = keyedTo === 'container' ? nbHeight >= largeFrom : h >= largeFrom;
    const mode = isLarge ? large : small;
    const available = nbHeight - mode.top - 12;
    const final = tabs(mode, available);
    const total = final.reduce((a, b) => a + b, 0) + mode.gap * (labels.length - 1);
    if (total > available + 0.5) return `tabs ${total.toFixed(0)} do not fit ${available.toFixed(0)}`;
    const cut = labels.findIndex((l, i) => final[i]! + 0.5 < longest(l) * mode.adv);
    if (cut >= 0) return `${labels[cut]} is ${(longest(labels[cut]!) * mode.adv).toFixed(0)} in a ${final[cut]!.toFixed(0)} tab`;
    return null;
  }

  it('the model reproduces the measured case: Protection runs past its tab at 1100x800', () => {
    expect(largeHeader, 'a min-height block holding the large tab rules').not.toBeNull();
    expect(Math.abs(large.adv - 8.16)).toBeLessThan(0.01);
    expect(Math.abs(small.adv - 7.15)).toBeLessThan(0.01);
  });

  it('keeps every tab whole in every window of the grid', () => {
    const bad: string[] = [];
    for (let w = 800; w <= 3840; w += 20) {
      for (let h = 600; h <= 2160; h += 20) {
        const why = fits(w, h);
        if (why) bad.push(`${w}x${h}: ${why}`);
      }
    }
    expect(bad.slice(0, 12), `${bad.length} windows`).toEqual([]);
  });

  it('is keyed to the notebook\'s own height, which the window no longer fixes', () => {
    expect(keyedTo).toBe('container');
    expect(declOf(nb, 'container-type')).toBe('size');
  });
});
