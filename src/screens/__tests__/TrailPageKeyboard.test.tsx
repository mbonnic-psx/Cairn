/// <reference types="vite/client" />
/**
 * What is protected's left leaf scrolls inside itself, so on a notebook page it is a tab stop of its own
 * (loose-ends T006; FR-022, FR-025, SC-004, D19, D30): named by the heading already on screen, with the
 * page area's focus ring. Outside any shell (Current) the leaf is as it was.
 */
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NotebookShell } from '../../shell/NotebookShell';
import { Trail } from '../Trail';
import { trailCases } from './pinCases';

const nodeFs = 'node:' + 'fs';
const { readFileSync, readdirSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
  readdirSync: (path: string) => string[];
};
const noComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const ruleList = (css: string) =>
  [...noComments(css).matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));

const tabs = [{ id: 'trail' as const, label: 'What is protected', current: true }];
const LEAF = '.nb-trail-sticky';

const titles = [
  ['list in force', 'What you are protecting'],
  ['list off', 'What you have chosen'],
] as const;

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (look) => {
  describe.each(titles)('%s', (caseName, title) => {
    const props = trailCases[caseName]!;
    const onPage = () =>
      render(
        <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
          <Trail {...props} />
        </NotebookShell>,
      );

    it('has a left leaf that is a tab stop, a region named by its heading', () => {
      const { container, getByRole } = onPage();
      const leaf = container.querySelector(LEAF) as HTMLElement;
      expect(leaf.tabIndex).toBe(0);
      expect(leaf.getAttribute('role')).toBe('region');
      const heading = leaf.querySelector('h2')!;
      expect(heading.textContent).toBe(title);
      expect(getByRole('region', { name: title })).toBe(leaf);
    });

    it('is the very next stop after the page area', async () => {
      const { container } = onPage();
      const main = container.querySelector('main') as HTMLElement;
      const leaf = container.querySelector(LEAF) as HTMLElement;
      // Tab until the page area holds focus, then once more: the left leaf, nothing in between.
      for (let i = 0; i < 20 && document.activeElement !== main; i += 1) await userEvent.tab();
      expect(document.activeElement, 'the page area is reached').toBe(main);
      await userEvent.tab();
      expect(document.activeElement).toBe(leaf);
    });

    it('says what it said before', () => {
      const { container } = onPage();
      const leaf = container.querySelector(LEAF) as HTMLElement;
      expect(leaf.textContent).toContain(title);
      expect(leaf.textContent).toContain(
        'Taking something out protects you less, so it waits a day before it takes effect.',
      );
      expect(leaf.querySelectorAll('h2')).toHaveLength(1);
    });
  });
});

describe('outside any shell (Current)', () => {
  it('has no sticky leaf, so nothing is a tab stop or a region that was not before', () => {
    const { container } = render(<Trail {...trailCases['list in force']!} />);
    expect(container.querySelector(LEAF)).toBeNull();
    expect(container.querySelector('[tabindex], [role="region"], [aria-labelledby]')).toBeNull();
  });
});

describe('the sheet', () => {
  const rules = ruleList(readFileSync('src/styles/protection-page.css', 'utf8'));

  it('rings the focused leaf like the page area: 2px of the look ink, inside the edge', () => {
    const rule = rules.find((r) => r.selector === '.nb-trail-leaves > .nb-trail-sticky:focus-visible');
    expect(rule, 'a focus-visible rule for the leaf').toBeDefined();
    expect(rule!.body).toMatch(/outline:\s*2px solid var\(--nb-ink\)/);
    expect(rule!.body).toMatch(/outline-offset:\s*-4px/);
  });

  // Every sheet is global once its screen is imported (loose-ends T011), so the sweep reads every sheet the
  // app loads: the four slice sheets, notebook.css and theme.css. notebook.css scrolls `.nb-page-area`,
  // which is already a tab stop (the page area takes focus, D19), so it is named here and nowhere else.
  const sheetNames = readdirSync('src/styles').filter((f) => f.endsWith('.css')).sort();
  const loaded = [...readFileSync('src/main.tsx', 'utf8').matchAll(/import\s+'\.\/styles\/([\w-]+\.css)'/g)].map((m) => m[1]!);
  const TAB_STOPS = ['notebook.css: .nb-page-area', 'protection-page.css: .nb-trail-leaves > .nb-trail-sticky'];

  it('reads every sheet the app loads, and every sheet in the directory', () => {
    expect(loaded.length, 'main.tsx imports its sheets from ./styles/').toBeGreaterThanOrEqual(1);
    expect(sheetNames, 'a sheet under src/styles/ that main.tsx does not import, or the reverse').toEqual([...loaded].sort());
    expect(sheetNames).toEqual(expect.arrayContaining(['notebook.css', 'theme.css']));
  });

  it('leaves no other scrolling element on a page without being a tab stop', () => {
    const scrolling = sheetNames.flatMap((name) =>
      ruleList(readFileSync(`src/styles/${name}`, 'utf8'))
        .filter((r) => /overflow(-[xy])?:\s*(auto|scroll)/.test(r.body))
        .map((r) => `${name}: ${r.selector}`),
    );
    expect(scrolling.sort()).toEqual(TAB_STOPS);
  });
});
