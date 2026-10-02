/**
 * The Today screen told it is on a notebook page (slice `tonight-page`): the same words as outside any
 * shell, laid out as a spread, in both views. The reader and the clock are plain objects passed as props.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotebookLook } from '../../look/look';
import { NotebookShell } from '../../shell/NotebookShell';
import { Reaches } from '../Reaches';
import { evening, silentReader, todayCases } from './tonightCases';

const tabs = [{ id: 'reaches' as const, label: 'Today', current: true }];

/** The look the cases below run in: every case runs in all three. */
let look: NotebookLook = 'morning';

function onPage(ui: React.ReactElement) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
      {ui}
    </NotebookShell>,
  );
  const main = view.container.querySelector('main') as HTMLElement;
  const spread = main.querySelector<HTMLElement>('.nb-spread');
  const pages = spread
    ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page'))
    : [];
  return { ...view, main, spread, left: pages[0], right: pages[1], pages };
}

/** The text of every element with no element inside it, sorted: the words, wherever they sit. */
function words(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('*'))
    .filter((el) => el.children.length === 0 && el.textContent)
    .map((el) => el.textContent as string)
    .sort();
}

function wordsOutside(ui: React.ReactElement): string[] {
  const view = render(ui);
  const found = words(view.container);
  view.unmount();
  return found;
}

const now = evening;

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (name) => {
  beforeEach(() => {
    look = name;
  });

  describe('the Today screen on a notebook page', () => {
    it('is a spread whose first child is the Which days group, then two pages', () => {
      const { spread } = onPage(<Reaches today={todayCases.sealed} now={now} />);
      expect(spread).not.toBeNull();
      expect(spread).toHaveClass('nb-reaches-leaves');
      const group = spread!.firstElementChild as HTMLElement;
      expect(group).toHaveAttribute('role', 'group');
      expect(group).toHaveAttribute('aria-label', 'Which days');
      const buttons = within(group).getAllByRole('button');
      expect(buttons.map((b) => b.textContent)).toEqual(['Today', 'Over time']);
      expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual([
        'true',
        'false',
      ]);
      expect(spread!.querySelectorAll(':scope > .nb-page')).toHaveLength(2);
    });

    it('looking: "Looking…" and no heading on the left, a ruled empty page on the right', () => {
      const { left, right } = onPage(
        <Reaches today={todayCases.looking} read={silentReader} now={now} />,
      );
      expect(within(left!).getByText('Looking…')).toBeInTheDocument();
      expect(within(left!).queryByRole('heading')).toBeNull();
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(within(right!).queryAllByRole('button')).toHaveLength(0);
    });

    it('sealed: the heading and the sealed sentence on the left, a ruled empty page on the right', () => {
      const { left, right, main } = onPage(
        <Reaches today={todayCases.sealed} now={now} />,
      );
      expect(
        within(left!).getByRole('heading', { level: 2, name: 'Today' }),
      ).toBeInTheDocument();
      expect(left).toHaveTextContent(todayCases.sealed!.sealed!);
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(
        within(main)
          .getAllByRole('heading')
          .map((h) => h.textContent),
      ).toEqual(['Today']);
    });

    it('keeps the Which days group and the pressed button focused across a change of view', async () => {
      const user = userEvent.setup();
      const { spread } = onPage(
        <Reaches today={todayCases.sealed} read={silentReader} now={now} />,
      );
      const group = spread!.firstElementChild as HTMLElement;
      const overTime = within(group).getByRole('button', { name: 'Over time' });
      const todayButton = within(group).getByRole('button', { name: 'Today' });
      await user.click(overTime);
      expect(document.activeElement).toBe(overTime);
      expect(spread!.firstElementChild).toBe(group);
      await user.click(todayButton);
      expect(document.activeElement).toBe(todayButton);
      expect(spread!.firstElementChild).toBe(group);
    });

    it('runs no entrance and sets no inline height or overflow', () => {
      const { main } = onPage(<Reaches today={todayCases.sealed} now={now} />);
      expect(main.querySelector('.settle')).toBeNull();
      for (const el of Array.from(main.querySelectorAll<HTMLElement>('*'))) {
        expect(el.style.height).toBe('');
        expect(el.style.overflow).toBe('');
      }
    });

    it.each(['looking', 'sealed'])(
      'says the same words as outside any shell: %s',
      (state) => {
        const today = todayCases[state];
        const outside = wordsOutside(
          <Reaches today={today} read={silentReader} now={now} />,
        );
        const { spread } = onPage(
          <Reaches today={today} read={silentReader} now={now} />,
        );
        expect(words(spread!)).toEqual(outside);
      },
    );

    it('says the same words as outside any shell in Over time', async () => {
      const user = userEvent.setup();
      const outside = render(
        <Reaches today={todayCases.sealed} read={silentReader} now={now} />,
      );
      await user.click(screen.getByRole('button', { name: 'Over time' }));
      const expected = words(outside.container);
      outside.unmount();
      const { spread } = onPage(
        <Reaches today={todayCases.sealed} read={silentReader} now={now} />,
      );
      await user.click(screen.getByRole('button', { name: 'Over time' }));
      expect(words(spread!)).toEqual(expected);
    });
  });
});
