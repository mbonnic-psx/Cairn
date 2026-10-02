/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// Read from disk as `protectionPage.test.ts` does: this project carries no Node typings.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};

const css = readFileSync('src/styles/protection-page.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: m[1]!.trim(),
  body: m[2]!,
}));
const decl = (body: string, prop: string): string | undefined =>
  // The last declaration is the one that applies; an earlier one is a fallback for a webview that drops it.
  [...body.matchAll(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`, 'g'))].at(-1)?.[1]?.trim();
const ruleFor = (selector: string) => rules.find((r) => r.selector === selector);

const LEAF = '.nb-trail-leaves > .nb-trail-sticky';
/** N of a length written `calc(N * var(--nb-u))`: the length at s = 1, today's px. NaN where it is not written so. */
const unitsOf = (length: string): number => Number(length.match(/^calc\((-?[\d.]+) \* var\(--nb-u\)\)$/)?.[1]);

describe('What is protected: the left leaf is bounded by the page area (D30, D8, FR-025)', () => {
  const leaf = ruleFor(LEAF);
  const leaves = ruleFor('.nb-protection-leaves,\n.nb-trail-leaves');

  it('scrolls inside itself', () => {
    expect(leaf && decl(leaf.body, 'overflow-y')).toBe('auto');
  });

  it('is bounded by a length that resolves against a definite height, not a percentage of its content-sized row', () => {
    const bound = leaf && decl(leaf.body, 'max-height');
    expect(bound).toBeDefined();
    expect(bound).not.toMatch(/^\d+(\.\d+)?%$/);
    expect(bound).toMatch(/cqh/);
  });

  it('takes that length from the spread, whose own height is the page area is', () => {
    const own = ruleFor('.nb-trail-leaves');
    const body = (own?.body ?? '') + (leaves?.body ?? '');
    expect(decl(body, 'container-type')).toBe('size');
    expect(decl(body, 'height')).toBe('100%');
  });
});

describe('What is protected: the left leaf gives its focus ring room (D30, D19)', () => {
  const leaf = ruleFor(LEAF);
  const ring = ruleFor(`${LEAF}:focus-visible`);

  it('draws the ring 4px inside the leaf', () => {
    expect(ring && decl(ring.body, 'outline-offset')).toBe('-4px');
  });

  it('pads the leaf on both inline sides past the inset and the ring, so the ring never crosses its text', () => {
    const padding = leaf && decl(leaf.body, 'padding-inline');
    expect(padding).toBeDefined();
    expect(unitsOf(padding!)).toBeGreaterThanOrEqual(6);
  });

  it('keeps the text where it was: a margin takes back what the padding gives', () => {
    const padding = leaf && decl(leaf.body, 'padding-inline');
    const margin = leaf && decl(leaf.body, 'margin-inline');
    expect(margin).toBeDefined();
    expect(unitsOf(margin!)).toBe(-unitsOf(padding!));
  });
});
