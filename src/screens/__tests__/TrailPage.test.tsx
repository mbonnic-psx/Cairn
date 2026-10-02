/**
 * What is protected told it is on a notebook page (slice `protection-page`, T007): the same words as
 * before the notebook, laid out as a spread with the list on the right.
 */
import { render, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trail as TrailData } from '../../ipc';
import { NotebookShell } from '../../shell/NotebookShell';
import type { Look } from '../../look/look';
import { Trail } from '../Trail';
import { baseline, wordsOf, TRAIL } from './beforeTheReveal';
import { trailCases } from './pinCases';

const tabs = [{ id: 'trail' as const, label: 'What is protected', current: true }];

/** The look the cases below run in: every case runs in all three (the quickstart says so). */
let look: Look = 'morning';

function onPage(ui: React.ReactElement) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
      {ui}
    </NotebookShell>,
  );
  const spread = view.container.querySelector('main .nb-spread') as HTMLElement | null;
  const pages = spread ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page')) : [];
  const main = view.container.querySelector('main') as HTMLElement;
  return { ...view, spread, left: pages[0], right: pages[1], pages, main };
}

const inForce = trailCases['list in force']!;
const notConfirmed = trailCases['list not confirmed']!;
const off = trailCases['list off']!;

const NOTE = /^Cairn has not confirmed this is in force just now\./;
const TAKING_OUT = /^Taking something out protects you less/;

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (name) => {
  beforeEach(() => {
    look = name;
  });

  describe('What is protected on a notebook page', () => {
    it('is one spread of two pages', () => {
      const { spread, pages } = onPage(<Trail {...inForce} />);
      expect(spread).not.toBeNull();
      expect(pages).toHaveLength(2);
    });

    it('names itself for what is verified', () => {
      const a = onPage(<Trail {...inForce} />);
      expect(within(a.left!).getByRole('heading', { level: 2, name: 'What you are protecting' })).toBeInTheDocument();
      a.unmount();
      const b = onPage(<Trail {...off} />);
      expect(within(b.left!).getByRole('heading', { level: 2, name: 'What you have chosen' })).toBeInTheDocument();
    });

    it('puts the count sentence and the note on taking things out on the left page', () => {
      const { left, right } = onPage(<Trail {...inForce} />);
      expect(
        within(left!).getByText('3 addresses, across 2 lists and whatever you have added yourself.'),
      ).toBeInTheDocument();
      expect(within(left!).getByText(TAKING_OUT)).toBeInTheDocument();
      expect(within(right!).queryByText(TAKING_OUT)).toBeNull();
    });

    it('shows the not-confirmed note only when not confirmed, in amber, on the left', () => {
      const a = onPage(<Trail {...notConfirmed} />);
      const note = within(a.left!).getByText(NOTE);
      expect(note).toHaveClass('nb-trail-note');
      expect(note.outerHTML).not.toMatch(/red/i);
      a.unmount();
      for (const c of [inForce, off]) {
        const b = onPage(<Trail {...c} />);
        expect(within(b.left!).queryByText(NOTE)).toBeNull();
        b.unmount();
      }
    });

    it('keeps the left page sticky', () => {
      const { left } = onPage(<Trail {...inForce} />);
      expect(left).toHaveClass('nb-trail-sticky');
    });

    it('lists one address a line, in order, on a ruled right page', () => {
      const { right } = onPage(<Trail {...inForce} />);
      expect(right).toHaveClass('nb-page--ruled');
      const items = within(right!).getAllByRole('listitem');
      expect(items.map((li) => li.textContent)).toEqual([
        'example.com',
        'www.example.comadded with its root address',
        'news.example',
      ]);
    });

    it('shows "added with its root address" only beside an address that has its companion', () => {
      const { right } = onPage(<Trail {...inForce} />);
      const lines = within(right!).getAllByText('added with its root address');
      expect(lines).toHaveLength(1);
      expect(lines[0]!.closest('li')).toHaveTextContent('www.example.com');
    });

    it('renders three hundred entries as list items, with no inline height or overflow', () => {
      const entries = Array.from({ length: 300 }, (_, i) => ({
        domain: `site-${i}.example`,
        sources: [],
        auto_www: false,
      }));
      const trail: TrailData = { entries, enabled_categories: [] };
      const { right, main } = onPage(<Trail trail={trail} status="in_force" />);
      expect(within(right!).getAllByRole('listitem')).toHaveLength(300);
      for (const el of [right!, main, ...Array.from(right!.querySelectorAll<HTMLElement>('*'))]) {
        expect(el.style.height).toBe('');
        expect(el.style.overflow).toBe('');
      }
    });

    it('leaves the right page ruled and empty when the list is', () => {
      const { right } = onPage(<Trail {...trailCases['list in force, empty']!} />);
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
    });

    it('runs no entrance on a page', () => {
      const { main } = onPage(<Trail {...inForce} />);
      expect(main.querySelector('.settle')).toBeNull();
    });

    for (const [name, c] of [
      ['in force', inForce],
      ['not confirmed', notConfirmed],
      ['off', off],
    ] as const) {
      it(`says the words it said before the notebook: ${name}`, () => {
        const { main } = onPage(<Trail {...c} />);
        expect(wordsOf(main)).toEqual(wordsOf(baseline(TRAIL[`list ${name}`]!)));
      });
    }
  });
});

describe('What is protected rendered alone, with no shell, is its spread', () => {
  for (const name of ['list in force', 'list not confirmed', 'list off']) {
    it(`${name}: one spread of two pages`, () => {
      const { container } = render(<Trail {...trailCases[name]!} />);
      const spread = container.querySelector('.nb-spread');
      expect(spread).not.toBeNull();
      expect(spread!.querySelectorAll(':scope > .nb-page')).toHaveLength(2);
    });
  }
});
