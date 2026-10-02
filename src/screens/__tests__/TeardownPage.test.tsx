/**
 * This machine is as it was told it is on a notebook page (slice `quiet-pages`, T003 and T004): the same
 * words as outside any shell, laid out as a spread. Rendered inside `NotebookShell`, in each look. The
 * screen is reached by tests only (D16), so these are its whole proof.
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotebookLook } from '../../look/look';
import { NotebookShell } from '../../shell/NotebookShell';
import { Teardown } from '../Teardown';
import { teardownCases } from './quietCases';

const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];

let look: NotebookLook = 'morning';

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

function outside(ui: React.ReactElement): string {
  const view = render(ui);
  const text = view.container.textContent ?? '';
  view.unmount();
  return text;
}

const COMPLETE = {
  heading: 'This machine is as it was',
  sentence: 'Cairn checked each change it had made and undid it. What Cairn did not write is untouched.',
};
const PARTIAL = {
  heading: 'Almost everything is undone',
  sentence:
    'Cairn undid what it could and checked each one. These are still here, so you can decide what to do with them.',
};

const marksIn = (list: Element) => Array.from(list.querySelectorAll('li > span:first-child'));

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (lookName) => {
  beforeEach(() => {
    look = lookName;
  });

  describe.each(Object.entries(teardownCases))('This machine is as it was on a page, %s', (_name, report) => {
    const words = report.complete ? COMPLETE : PARTIAL;

    it('sits in one spread of two pages with the slice\'s own class, and runs no entrance', () => {
      const { spread, pages, main } = onPage(<Teardown report={report} />);
      expect(spread).not.toBeNull();
      expect(spread).toHaveClass('nb-teardown-leaves');
      expect(pages).toHaveLength(2);
      expect(main.querySelector('.settle')).toBeNull();
      expect(main.querySelector('[style*="height"], [style*="overflow"]')).toBeNull();
    });

    it('reads the heading and the sentence that follow complete', () => {
      const { left } = onPage(<Teardown report={report} />);
      expect(left.querySelector('h2')!.textContent).toBe(words.heading);
      expect(left.querySelector('h2 + p')!.textContent).toBe(words.sentence);
    });

    it('lists the checked lines only when there are any, each with a decorative solid dot', () => {
      const { left } = onPage(<Teardown report={report} />);
      const list = left.querySelector('ul.nb-teardown-checked');
      if (report.confirmed.length === 0) {
        expect(list).toBeNull();
        return;
      }
      expect(list).not.toBeNull();
      const marks = marksIn(list!);
      expect(marks).toHaveLength(report.confirmed.length);
      for (const m of marks) {
        expect(m).toHaveClass('nb-teardown-mark', 'nb-teardown-mark--dot');
        expect(m).toHaveAttribute('aria-hidden', 'true');
        expect(m.textContent).toBe('');
      }
      expect(list!.textContent).toBe(report.confirmed.join(''));
    });

    it('leaves the right page ruled, with no text and no control', () => {
      const { right } = onPage(<Teardown report={report} />);
      expect(right).toHaveClass('nb-page--ruled');
      expect(right.textContent).toBe('');
      expect(right.querySelector('button, a, input, ul, p, h2, h3')).toBeNull();
    });

    it('says the same words as outside any shell, what is left set aside (T004 holds that)', () => {
      const shown = { ...report, residue: [] };
      const { main } = onPage(<Teardown report={shown} />);
      expect(main.textContent).toBe(outside(<Teardown report={shown} />));
    });

    it('reports and never congratulates', () => {
      const { main } = onPage(<Teardown report={report} />);
      expect(main.textContent).not.toMatch(
        /congrat|well done|great|success|all clear|all done|perfect|nice|good job|clean slate/i,
      );
    });
  });
});

describe('outside any shell', () => {
  it('renders no spread', () => {
    const { container } = render(<Teardown report={teardownCases['as it was, nothing listed']!} />);
    expect(container.querySelector('.nb-spread, .nb-page')).toBeNull();
  });
});
