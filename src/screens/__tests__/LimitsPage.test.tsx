/**
 * What Cairn covers told it is on a notebook page (slice `quiet-pages`, T002): the same words as before
 * the notebook, laid out as a spread. Rendered inside `NotebookShell`, once per look.
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Disclosures } from '../../ipc';
import type { Look } from '../../look/look';
import { NotebookShell } from '../../shell/NotebookShell';
import { Limits } from '../Limits';
import { baseline, LIMITS } from './beforeTheReveal';
import { disclosureCases } from './quietCases';

const tabs = [{ id: 'limits' as const, label: 'What Cairn covers', current: true }];

let look: Look = 'morning';

function onPage(ui: React.ReactElement) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
      {ui}
    </NotebookShell>,
  );
  const main = view.container.querySelector('main') as HTMLElement;
  const spread = main.querySelector('.nb-spread') as HTMLElement | null;
  const pages = spread ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page')) : [];
  return { ...view, main, spread, pages, left: pages[0]!, right: pages[1]! };
}

/** The words the screen said before the notebook, from the baseline (`beforeTheReveal.ts`), never from a render. */
function wasText(name: string): string {
  return baseline(LIMITS[name]!).textContent ?? '';
}

/** The left page's direct children, as `tag: text` in order. */
const outline = (left: HTMLElement) =>
  Array.from(left.children).map((el) => `${el.tagName.toLowerCase()}: ${el.textContent}`);

const NOT_COVERED = 'What it does not cover in this release';
const KEPT = 'What is kept, and how';

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (lookName) => {
  beforeEach(() => {
    look = lookName;
  });

  describe.each(Object.entries(disclosureCases))('What Cairn covers on a page, %s', (caseName, d: Disclosures) => {
    it('sits in one spread of two pages with the slice\'s own class, and runs no entrance', () => {
      const { spread, pages, main } = onPage(<Limits disclosures={d} />);
      expect(spread).not.toBeNull();
      expect(spread).toHaveClass('nb-limits-leaves');
      expect(pages).toHaveLength(2);
      expect(main.querySelector('.settle')).toBeNull();
      expect(spread!.getAttribute('style')).toBeNull();
      expect(main.querySelector('[style*="height"], [style*="overflow"]')).toBeNull();
    });

    it('holds every word on the left page, in today\'s order', () => {
      const { left } = onPage(<Limits disclosures={d} />);
      const kids = outline(left);
      const lists = Array.from(left.querySelectorAll('ul'));
      expect(lists).toHaveLength(2);
      expect(kids).toEqual([
        'h2: What Cairn covers',
        `ul: ${d.in_force.join('')}`,
        `h3: ${NOT_COVERED}`,
        `ul: ${d.not_covered.join('')}`,
        `h3: ${KEPT}`,
        `p: ${d.encryption}`,
        `p: ${d.administrator}`,
      ]);
      expect(left.querySelector('h2')!.textContent).toBe('What Cairn covers');
    });

    it('gives the two section labels the shell\'s label class, and the other headings none', () => {
      const { left } = onPage(<Limits disclosures={d} />);
      const labels = Array.from(left.querySelectorAll('.nb-label')).map((el) => el.textContent);
      expect(labels).toEqual([NOT_COVERED, KEPT]);
      for (const el of left.querySelectorAll('.nb-label')) expect(el.tagName).toBe('H3');
    });

    it('marks covered lines with a solid dot and not-covered lines with an open ring, both decorative', () => {
      const { left } = onPage(<Limits disclosures={d} />);
      const [covered, notCovered] = Array.from(left.querySelectorAll('ul'));
      const marks = (ul: Element) => Array.from(ul.querySelectorAll('li > span:first-child'));
      expect(marks(covered!)).toHaveLength(d.in_force.length);
      for (const m of marks(covered!)) {
        expect(m).toHaveClass('nb-limits-mark--dot');
        expect(m).not.toHaveClass('nb-limits-mark--ring');
        expect(m).toHaveAttribute('aria-hidden', 'true');
        expect(m.textContent).toBe('');
      }
      expect(marks(notCovered!)).toHaveLength(d.not_covered.length);
      for (const m of marks(notCovered!)) {
        expect(m).toHaveClass('nb-limits-mark--ring');
        expect(m).not.toHaveClass('nb-limits-mark--dot');
        expect(m).toHaveAttribute('aria-hidden', 'true');
      }
    });

    it('sets the note on administrators apart under a hairline', () => {
      const { left } = onPage(<Limits disclosures={d} />);
      const note = left.lastElementChild!;
      expect(note.textContent).toBe(d.administrator);
      expect(note).toHaveClass('nb-limits-note');
    });

    it('leaves the right page ruled, with no text and no control', () => {
      const { right } = onPage(<Limits disclosures={d} />);
      expect(right).toHaveClass('nb-page--ruled');
      expect(right.textContent).toBe('');
      expect(right.querySelector('button, a, input, ul, p, h2, h3')).toBeNull();
    });

    it('says the words it said before the notebook', () => {
      const { main } = onPage(<Limits disclosures={d} />);
      expect(main.textContent).toBe(wasText(caseName));
    });
  });

  it('with nothing covered, shows no covered lines and still the label', () => {
    const d = { ...disclosureCases['the background component can run']!, in_force: [] };
    const { left } = onPage(<Limits disclosures={d} />);
    expect(left.querySelectorAll('ul')[0]!.children).toHaveLength(0);
    expect(left.textContent).toContain(NOT_COVERED);
  });

  it('with nothing uncovered, still shows its label and no lines', () => {
    const d = { ...disclosureCases['the background component can run']!, not_covered: [] };
    const { left } = onPage(<Limits disclosures={d} />);
    expect(left.textContent).toContain(NOT_COVERED);
    expect(left.querySelectorAll('ul')[1]!.children).toHaveLength(0);
  });
});

describe('rendered alone', () => {
  it.each(Object.entries(disclosureCases))('it is its spread, %s', (_name, d: Disclosures) => {
    const { container } = render(<Limits disclosures={d} />);
    const spread = container.querySelector('.nb-spread');
    expect(spread).toHaveClass('nb-limits-leaves');
    expect(spread!.querySelectorAll(':scope > .nb-page')).toHaveLength(2);
    expect(container.querySelector('.settle')).toBeNull();
  });
});
