/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../contrast';

// Vitest blanks CSS imports, and this project carries no Node typings, so the
// stylesheets are read from disk through a module name TypeScript cannot see.
const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const notebook = readFileSync('src/styles/notebook.css', 'utf8');
const theme = readFileSync('src/styles/theme.css', 'utf8');

const vendored = Object.keys(import.meta.glob('../../assets/fonts/*.woff2'));

function token(name: string): string {
  const m = notebook.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,6})\\s*;`));
  if (!m) throw new Error(`token ${name} is not a hex colour in notebook.css`);
  return m[1]!;
}

const TEXT = 4.5;
const LARGE = 3;

describe('morning look contrast (FR-021, SC-003)', () => {
  const onPaper: Array<[string, number]> = [
    ['--nb-ink', TEXT],
    ['--nb-ink-body', TEXT],
    ['--nb-ink-quiet', TEXT],
    ['--nb-accent-amber', TEXT],
  ];
  it.each(onPaper)('%s on the paper', (name, floor) => {
    expect(contrastRatio(token(name), token('--nb-paper'))).toBeGreaterThanOrEqual(floor);
  });

  it('the primary button text on its fill', () => {
    expect(contrastRatio(token('--nb-button-ink'), token('--nb-button'))).toBeGreaterThanOrEqual(TEXT);
  });

  const skies = ['--nb-sky-top', '--nb-sky-mid', '--nb-sky-bottom'];
  it.each(skies)('greeting text on the sky at %s', (sky) => {
    expect(contrastRatio(token('--nb-greeting-ink'), token(sky))).toBeGreaterThanOrEqual(LARGE);
    expect(contrastRatio(token('--nb-greeting-quiet'), token(sky))).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(token('--nb-greeting-body'), token(sky))).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(['protection', 'trail', 'reaches', 'checkin', 'limits'])('tab text on the %s tab', (id) => {
    expect(contrastRatio(token('--nb-tab-ink'), token(`--nb-tab-${id}`))).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('fonts (FR-014, FR-015)', () => {
  const faces = theme.match(/@font-face\s*\{[^}]*\}/g) ?? [];

  it('declares five @font-face rules', () => {
    expect(faces).toHaveLength(5);
  });

  it.each(faces.map((f: string, i: number) => ({ i, face: f })))('rule %i resolves to a vendored file, swaps, and names no network', ({ face }) => {
    const url = face.match(/url\(['"]?([^'")]+)['"]?\)/);
    expect(url).not.toBeNull();
    expect(url![1]).not.toMatch(/^https?:/);
    expect(vendored).toContain(url![1]!.replace('../assets', '../../assets'));
    expect(face).toMatch(/font-display:\s*swap/);
  });

  it('has fallback stacks and no http URL anywhere', () => {
    expect(theme).toMatch(/--font-notebook-serif:[^;]*Georgia[^;]*serif/);
    expect(theme).toMatch(/--font-notebook-mono:[^;]*monospace/);
    expect(theme).not.toMatch(/https?:\/\//);
    expect(notebook).not.toMatch(/https?:\/\//);
  });
});

describe('notebook.css behaviour rules', () => {
  it('removes every animation and transition under reduced motion', () => {
    const block = notebook.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\n\})\s*\n/);
    expect(block).not.toBeNull();
    expect(block![1]).toMatch(/animation:\s*none/);
    expect(block![1]).toMatch(/transition:\s*none/);
  });

  it('has a forced-colors block, the 1100px breakpoint and visible focus', () => {
    expect(notebook).toMatch(/@media \(forced-colors: active\)/);
    expect(notebook).toMatch(/@media \(max-width: 1099px\)/);
    expect(notebook).toMatch(/\.nb-tab:focus-visible/);
    expect(notebook).toMatch(/\.nb-switch:focus-visible/);
  });

  it('uses mono only on tab names, labels and buttons, never on the page body', () => {
    const rules = [...notebook.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const mono = rules.filter(([, , body]) => /var\(--nb-font-mono\)/.test(body!));
    expect(mono.length).toBeGreaterThan(0);
    const allowed = /(\.nb-tab|\.nb-label|\.nb-button|\.nb-switch|\.nb-greeting__time|\.nb-titlebar__name|button)/;
    for (const [, selector] of mono) {
      for (const one of selector!.split(',')) expect(one.trim()).toMatch(allowed);
    }
    const bodyRule = rules.find(([, sel]) => /\.nb-page-area/.test(sel!) && /font-family/.test(rules.map(String).join()));
    expect(bodyRule).toBeDefined();
    expect(notebook).toMatch(/\.nb-root\s*\{[^}]*font-family:\s*var\(--nb-font-serif\)/);
  });

  it('keeps every colour in a token', () => {
    const outsideTokens = notebook
      .replace(/\[data-look="morning"\]\s*\{[^}]*\}/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(outsideTokens).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
