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

// The narrow block as it stood on main when slice board-scale began (T001): it must not change (D37).
const NARROW_AT_T001 =
  '\n  .nb-root {\n    grid-template-columns: minmax(0, 1fr);\n    grid-template-rows: auto minmax(0, 1fr);\n    row-gap: 12px;\n    padding: 44px 64px 24px 16px;\n  }\n  .nb-aside {\n    padding-top: 0;\n  }\n  .nb-greeting {\n    gap: 4px;\n  }\n  .nb-greeting__words {\n    font-size: 30px;\n  }\n  .nb-notebook {\n    max-height: 100%;\n    min-height: 0;\n  }\n  .nb-page-area {\n    padding: 28px 32px 28px 52px;\n  }\n  .nb-fold {\n    left: calc(50% + 10px);\n  }\n}';

const look = ruleIn(base, '[data-look]');
const root = ruleIn(base, '.nb-root');
const nb = ruleIn(base, '.nb-notebook');
const aside = ruleIn(base, '.nb-aside');
const nbNarrow = ruleIn(narrowBlock, '.nb-notebook');
const rootNarrow = ruleIn(narrowBlock, '.nb-root');

const num = (v: string | undefined) => Number(v);
const px = (v: string | undefined) => Number(v?.match(/^(-?[\d.]+)px$/)?.[1]);
const vh = (v: string | undefined) => Number(v?.match(/^([\d.]+)vh$/)?.[1]);

// The two shared lengths, read from the sheet.
const U = declOf(look, '--nb-u')?.match(/^clamp\(([\d.]+)px, min\(100vw \/ ([\d.]+), 100vh \/ ([\d.]+)\), ([\d.]+)px\)$/);
const G = declOf(look, '--nb-g')?.match(/^max\(([\d.]+)px, 100vw \/ ([\d.]+)\)$/);
/** D39's s: the length `--nb-u` resolves to, in px, at a window. */
const sOf = (w: number, h: number) => Math.min(Math.max(num(U?.[1]), Math.min(w / num(U?.[2]), h / num(U?.[3]))), num(U?.[4]));
/** The greeting's factor `--nb-g`, in px. */
const gOf = (w: number) => Math.max(num(G?.[1]), w / num(G?.[2]));

const columns = declOf(root, 'grid-template-columns') ?? '';
const track = columns.match(/^([\d.]+)vw minmax\(0, min\(([\d.]+)vw, ([\d.]+)vh\)\)$/);
const gapVw = Number(declOf(root, 'column-gap')?.match(/^([\d.]+)vw$/)?.[1]);
const wideDecl = declOf(root, 'padding')?.match(/^([\d.]+)vh 0 0 ([\d.]+)vw$/);
const narrowPadM = declOf(rootNarrow, 'padding')?.match(/^(\d+)px (\d+)px (\d+)px (\d+)px$/);
const narrowPad = { right: Number(narrowPadM?.[2]), left: Number(narrowPadM?.[4]) };
const [aspectW, aspectH] = (declOf(nb, 'aspect-ratio') ?? '').split('/').map((x) => Number(x.trim()));
const breakpoint = Number(css.match(/@media \(max-width: (\d+)px\)/)?.[1]) + 1;

interface Placed {
  left: number;
  top: number;
  width: number;
  height: number;
  greetingLeft: number;
  greetingTop: number;
}
/** The notebook and the greeting, placed from the parsed numbers (the grid, its gap and padding). */
function place(w: number, h: number): Placed {
  if (w >= breakpoint) {
    const padLeft = (num(wideDecl?.[2]) * w) / 100;
    const asideW = (num(track?.[1]) * w) / 100;
    const gap = (gapVw * w) / 100;
    const width = Math.min((num(track?.[2]) * w) / 100, (num(track?.[3]) * h) / 100);
    const height = Math.max(px(declOf(nb, 'min-height')), Math.min((vh(declOf(nb, 'max-height')) * h) / 100, (width * aspectH!) / aspectW!));
    const top = (num(wideDecl?.[1]) * h) / 100;
    return {
      left: padLeft + asideW + gap,
      top,
      width,
      height,
      greetingLeft: padLeft,
      greetingTop: top + (vh(declOf(aside, 'padding-top')) * h) / 100,
    };
  }
  const room = w - narrowPad.left - narrowPad.right;
  return { left: narrowPad.left, top: 0, width: room, height: room / (aspectW! / aspectH!), greetingLeft: narrowPad.left, greetingTop: 0 };
}
const size = (w: number, h: number) => place(w, h);
/** D39's s as the notebook's own size gives it. */
const sFromNotebook = (w: number, h: number) => {
  const p = place(w, h);
  return Math.min(Math.max(1, Math.min(p.width / aspectW!, p.height / aspectH!)), 2);
};

describe('the notebook sheet declares the board and its two lengths (FR-036, D37-D39)', () => {
  it('the shared block defines --nb-u and --nb-g once, in the forms the model reads', () => {
    expect(declOf(look, '--nb-u')).toBe('clamp(1px, min(100vw / 1280, 100vh / 800), 2px)');
    expect(declOf(look, '--nb-g')).toBe('max(1px, 100vw / 1280)');
    expect(U).not.toBeNull();
    expect(G).not.toBeNull();
    expect(css.match(/--nb-u:/g)).toHaveLength(1);
    expect(css.match(/--nb-g:/g)).toHaveLength(1);
  });
  it('the root places the greeting and the notebook by the board\'s fractions', () => {
    expect(columns).toBe('19.53125vw minmax(0, min(64.84375vw, 127.5vh))');
    expect(declOf(root, 'column-gap')).toBe('3.4375vw');
    expect(declOf(root, 'padding')).toBe('8.75vh 0 0 4.375vw');
    expect(declOf(root, 'justify-content')).toBe('start');
    expect(declOf(aside, 'padding-top')).toBe('2.25vh');
  });
  it('the notebook is a landscape box, sized by its width and held to 85% of the height', () => {
    expect(declOf(nb, 'width')).toBe('100%');
    expect(declOf(nb, 'aspect-ratio')).toBe('830 / 680');
    expect(declOf(nb, 'container-type')).toBe('size');
    expect(declOf(nb, 'max-height')).toBe('85vh');
    expect(declOf(nb, 'min-height')).toBe('480px');
    expect(declOf(nb, 'height')).toBeUndefined();
  });
  it('the narrow notebook keeps the ratio and takes the room left', () => {
    expect(declOf(nbNarrow, 'max-height')).toBe('100%');
    expect(declOf(nbNarrow, 'min-height')).toBe('0');
    expect(declOf(nbNarrow, 'height')).toBeUndefined();
  });
  it('the narrow block is textually what it was when the slice began', () => {
    expect(narrowBlock).toBe(NARROW_AT_T001);
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

  it('gives the side-by-side notebook the height the ratio gives it, at its most', () => {
    expect(noRatio.length).toBeGreaterThan(0);
    expect(declOf(baseFallback, 'height')).toBe('85vh');
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

describe('the board scaled to the window: places and sizes (FR-036, D37, D38)', () => {
  const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
  const cases: Array<[number, number, number, number, number, number, number]> = [
    // W, H, width, height, left, top, s
    [1280, 800, 830, 680, 350, 70, 1],
    [1920, 1080, 1245, 918, 525, 94.5, 1.35],
    [2560, 1440, 1660, 1224, 700, 126, 1.8],
    [2560, 1080, 1377, 918, 700, 94.5, 1.35],
    [1920, 800, 1020, 680, 525, 70, 1],
    [1100, 700, 713, 584, 300.6, 61.25, 1],
    [1280, 1024, 830, 680, 350, 89.6, 1],
    [3840, 2160, 2490, 1836, 1050, 189, 2],
  ];
  it.each(cases)('at %ix%i the notebook is %f by %f at (%f, %f), s %f', (w, h, ew, eh, el, et, es) => {
    const p = place(w, h);
    expect(near(p.width, ew), `width ${p.width}`).toBe(true);
    expect(near(p.height, eh), `height ${p.height}`).toBe(true);
    expect(near(p.left, el), `left ${p.left}`).toBe(true);
    expect(near(p.top, et), `top ${p.top}`).toBe(true);
    expect(near(sOf(w, h), es, 0.001), `s ${sOf(w, h)}`).toBe(true);
  });

  it('puts the greeting at 56/1280 of the width and 88/800 of the height', () => {
    for (const [w, h] of [
      [1280, 800],
      [1920, 1080],
      [2560, 1440],
    ] as const) {
      const p = place(w, h);
      expect(near(p.greetingLeft, (56 * w) / 1280, 0.01)).toBe(true);
      expect(near(p.greetingTop, (88 * h) / 800, 0.01)).toBe(true);
    }
  });

  it('keeps the notebook inside the window, as wide as it is tall, in every wide window', () => {
    const bad: string[] = [];
    for (let w = 1100; w <= 3840; w += 20) {
      for (let h = 600; h <= 2160; h += 20) {
        const p = place(w, h);
        if (p.width < p.height) bad.push(`${w}x${h} upright`);
        if (p.left < 0 || p.top < 0 || p.left + p.width > w || p.top + p.height > h) bad.push(`${w}x${h} outside`);
        if (p.width > 1.5 * p.height + 1e-6 && p.height < 0.85 * h - 1e-6) bad.push(`${w}x${h} wider than the limit`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('gives s exactly clamp(1, min(W/1280, H/800), 2) from the notebook\'s own size (research R1)', () => {
    const bad: string[] = [];
    for (let w = 1100; w <= 3840; w += 20) {
      for (let h = 600; h <= 2160; h += 20) {
        if (!near(sOf(w, h), sFromNotebook(w, h), 1e-9)) bad.push(`${w}x${h}: ${sOf(w, h)} vs ${sFromNotebook(w, h)}`);
        if ((w < 1280 || h < 800) && sOf(w, h) !== 1) bad.push(`${w}x${h}: s is not 1`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('keeps the greeting factor at 1px below 1280 wide and equal to W/1280 above', () => {
    expect(gOf(1100)).toBe(1);
    expect(gOf(1280)).toBe(1);
    expect(near(gOf(1920), 1.5, 1e-9)).toBe(true);
  });

  it('keeps the tab column inside the window (research R5)', () => {
    const offset = -px(declOf(ruleIn(base, '.nb-tabs'), 'right')); // how far past the notebook's right edge
    expect(offset).toBe(44);
    const bad: string[] = [];
    for (let w = 1100; w <= 3840; w += 20) {
      for (let h = 600; h <= 2160; h += 20) {
        const p = place(w, h);
        if (p.left + p.width + offset > w) bad.push(`${w}x${h}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('in the narrow layout fills the room and is landscape', () => {
    for (const [w, h] of [
      [800, 600],
      [1099, 1400],
    ] as const) {
      const p = place(w, h);
      expect(p.width).toBe(w - 80);
      expect(p.height).toBeLessThanOrEqual((p.width * 680) / 830 + 0.001);
    }
  });

  it('never stands the narrow notebook upright, in any window 800-1099 wide and 600-2160 tall', () => {
    const bad: string[] = [];
    for (let w = 800; w <= 1099; w++) {
      for (let h = 600; h <= 2160; h += 20) {
        const s = size(w, h);
        if (s.height > s.width) bad.push(`${w}x${h}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
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
    const frozen = size.map(() => false);
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
