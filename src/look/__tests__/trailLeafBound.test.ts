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
  body.match(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`))?.[1]?.trim();
const ruleFor = (selector: string) => rules.find((r) => r.selector === selector);

const LEAF = '.nb-trail-leaves > .nb-trail-sticky';

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
