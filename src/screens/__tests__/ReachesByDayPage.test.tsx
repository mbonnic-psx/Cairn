/**
 * The reaches screen, over time, by day of the week, on a notebook page (slice `history-by-weekday`,
 * plan scenario 30; 004 `tonight-page` D21, D22). The choice is on the left page under the date
 * boxes; the days are on the right page, ruled, one day to a line: its name, its clause, its bar and
 * its count, or its name and the clause alone for a weekday the range does not hold. The reader, the
 * clock and the week's first day are plain objects passed as props.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Patterns } from '../../ipc/reaches';
import { acrossInWords, weekdayInWords } from '../../localDays';
import { NotebookShell } from '../../shell/NotebookShell';
import { Reaches } from '../Reaches';
import { evening, rangeCoverageNote, sealedSentence, todayCases } from './tonightCases';
import { never } from './fakeCore';

const tabs = [{ id: 'reaches' as const, label: 'Today', current: true }];
const now = evening;
const SUNDAY = 6;

const hours = (counts: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts[hour] ?? 0 }));

const week = (counts: Record<number, number> = {}, held: number | number[] = 4) =>
  Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    count: counts[weekday] ?? 0,
    days: typeof held === 'number' ? held : held[weekday],
  }));

const answer = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'news.example', count: 9 },
    { domain: 'video.example', count: 4 },
  ],
  by_hour: hours({ 14: 6 }),
  by_weekday: week({ 0: 4, 2: 2 }),
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
  ...over,
});

const readerOf = (patterns: Patterns) => ({
  listTodaysReaches: never,
  summarizeReaches: () => Promise.resolve(patterns),
});

function words(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('*'))
    .filter((el) => el.children.length === 0 && el.textContent)
    .map((el) => el.textContent as string)
    .sort();
}

async function byDayOnPage(patterns: Patterns, firstDay = 0) {
  const user = userEvent.setup();
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look="midday">
      <Reaches
        today={todayCases.sealed}
        read={readerOf(patterns)}
        now={now}
        firstDay={firstDay}
      />
    </NotebookShell>,
  );
  const main = view.container.querySelector('main') as HTMLElement;
  const spread = main.querySelector<HTMLElement>('.nb-spread') as HTMLElement;
  await user.click(
    within(spread.firstElementChild as HTMLElement).getByRole('button', {
      name: 'Over time',
    }),
  );
  await waitFor(() => expect(within(spread).queryByText('Looking…')).toBeNull());
  const pages = () =>
    Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page'));
  return { user, view, main, spread, pages };
}

const choose = (name: 'By site' | 'By hour' | 'By day') =>
  screen.getByRole('button', { name });

describe('Seen by, with By day, on a notebook page', () => {
  it('sits on the left page under the date boxes, three buttons in the Which days classes', async () => {
    const { pages } = await byDayOnPage(answer());
    const [left] = pages();

    const [heading, range, seen] = Array.from(left!.children) as HTMLElement[];
    expect(heading!.tagName).toBe('H2');
    expect(within(range!).getByLabelText('From')).toBeInTheDocument();
    expect(seen).toHaveAttribute('aria-label', 'Seen by');
    const buttons = within(seen!).getAllByRole('button');
    expect(buttons.map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
      ['By site', 'true'],
      ['By hour', 'false'],
      ['By day', 'false'],
    ]);
    for (const button of buttons) expect(button).toHaveClass('nb-reaches-which__button');
  });

  it('keeps Which days the first child of the spread, and focus on By day once pressed', async () => {
    const { user, spread, pages } = await byDayOnPage(answer());
    const which = spread.firstElementChild;
    const seen = within(pages()[0]!).getByRole('group', { name: 'Seen by' });
    const from = within(pages()[0]!).getByLabelText('From');

    await user.click(choose('By day'));

    expect(document.activeElement).toBe(choose('By day'));
    expect(choose('By day')).toHaveAttribute('aria-pressed', 'true');
    expect(spread.firstElementChild).toBe(which);
    expect(within(pages()[0]!).getByRole('group', { name: 'Seen by' })).toBe(seen);
    expect(within(pages()[0]!).getByLabelText('From')).toBe(from);
  });
});

describe('the days, on the right page', () => {
  it('are seven ruled lines, each the name, its clause, its bar, then its count', async () => {
    const { user, pages } = await byDayOnPage(answer());
    await user.click(choose('By day'));
    const [, right] = pages();

    expect(right).toHaveClass('nb-page--ruled');
    const lines = within(right!).getAllByRole('listitem');
    expect(lines).toHaveLength(7);
    lines.forEach((line, weekday) => {
      expect(line).toHaveClass('nb-reaches-line');
      const [name, clause, bar, count] = Array.from(line.children) as HTMLElement[];
      expect(name).toHaveTextContent(weekdayInWords(weekday));
      expect(name).toHaveClass('nb-reaches-site');
      expect(clause).toHaveTextContent(acrossInWords(weekday, 4));
      expect(clause).toHaveClass('nb-reaches-time');
      expect(bar).toHaveClass('nb-reaches-bar');
      expect(bar).toHaveAttribute('aria-hidden', 'true');
      expect(count).toHaveClass('nb-reaches-count');
      expect(count.textContent).toBe(String({ 0: 4, 2: 2 }[weekday as 0 | 2] ?? 0));
      expect(line.children).toHaveLength(4);
    });
    const widths = lines.map((line) => within(line).getByTestId('bar').style.width);
    expect(widths).toEqual(['100%', '0%', '50%', '0%', '0%', '0%', '0%']);
  });

  it('begin from the first day of the week, whichever it is', async () => {
    const { user, pages } = await byDayOnPage(answer(), SUNDAY);
    await user.click(choose('By day'));
    const [, right] = pages();

    const names = within(right!)
      .getAllByRole('listitem')
      .map((line) => line.firstElementChild?.textContent);
    expect(names).toEqual([6, 0, 1, 2, 3, 4, 5].map(weekdayInWords));
  });

  it('give a weekday the range does not hold its name and clause alone: no count, no bar', async () => {
    const { user, pages } = await byDayOnPage(
      answer({ by_weekday: week({ 4: 2, 6: 1 }, [0, 0, 0, 0, 1, 1, 1]) }),
    );
    await user.click(choose('By day'));
    const [, right] = pages();

    const lines = within(right!).getAllByRole('listitem');
    for (const weekday of [0, 1, 2, 3]) {
      const line = lines[weekday];
      expect(line).toHaveClass('nb-reaches-line');
      expect(line.children).toHaveLength(2);
      const [name, clause] = Array.from(line.children) as HTMLElement[];
      expect(name).toHaveClass('nb-reaches-site');
      expect(name).toHaveTextContent(weekdayInWords(weekday));
      expect(clause).toHaveClass('nb-reaches-time');
      expect(clause).toHaveTextContent('not in these days');
      expect(within(line).queryByTestId('bar')).toBeNull();
    }
    for (const weekday of [4, 5, 6]) expect(lines[weekday].children).toHaveLength(4);
  });

  it('keep every note off the right page', async () => {
    const { user, pages } = await byDayOnPage(
      answer({ coverage_note: rangeCoverageNote, estimates_excluded: 2 }),
    );
    await user.click(choose('By day'));
    const [left, right] = pages();

    for (const note of [
      rangeCoverageNote,
      'Your own estimates for 2 days are not counted here, because Cairn counts only what it saw.',
      'Cairn counts only while it is running. This is what it saw over these days.',
    ]) {
      expect(within(left!).getByText(note)).toBeInTheDocument();
      expect(within(right!).queryByText(note)).toBeNull();
    }
    const [, , , coverage, estimates, standing] = Array.from(left!.children);
    expect(coverage).toHaveTextContent(rangeCoverageNote);
    expect(estimates).toHaveTextContent('counts only what it saw');
    expect(standing).toHaveClass('nb-reaches-note');
  });

  it('begin under "Nothing here for these days." on a quiet range', async () => {
    const { user, pages } = await byDayOnPage(
      answer({ by_site: [], by_hour: hours(), by_weekday: week() }),
    );
    await user.click(choose('By day'));
    const [, right] = pages();

    expect(right!.firstElementChild).toHaveTextContent('Nothing here for these days.');
    expect(right!.firstElementChild).toHaveClass('nb-reaches-empty');
    expect(within(right!).getAllByRole('listitem')).toHaveLength(7);
  });

  it('are none, with the sentence on the left, when sealed', async () => {
    const { user, pages } = await byDayOnPage(
      answer({ by_site: [], by_hour: [], by_weekday: [], sealed: sealedSentence }),
    );
    await user.click(choose('By day'));
    const [left, right] = pages();

    expect(left).toHaveTextContent(sealedSentence);
    expect(right!.textContent).toBe('');
  });

  it('sit on the ruling: no inline height or overflow anywhere', async () => {
    const { user, main, pages } = await byDayOnPage(
      answer({ by_weekday: week({ 4: 2 }, [0, 0, 0, 0, 1, 1, 1]) }),
    );
    await user.click(choose('By day'));
    expect(within(pages()[1]!).getAllByRole('listitem')).toHaveLength(7);

    for (const el of [main, ...Array.from(main.querySelectorAll<HTMLElement>('*'))]) {
      expect(el.style.height).toBe('');
      expect(el.style.overflow).toBe('');
    }
  });

  it('carry no Tailwind utility class, and run no entrance', async () => {
    const { user, spread, main } = await byDayOnPage(answer());
    await user.click(choose('By day'));

    const notOurs = Array.from(spread.querySelectorAll('*')).flatMap((el) =>
      Array.from(el.classList).filter((c) => !c.startsWith('nb-')),
    );
    expect(notOurs).toEqual([]);
    expect(main.querySelector('.settle')).toBeNull();
  });
});

describe('the same words as outside any shell', () => {
  it.each([
    ['a list', answer()],
    [
      'a note and estimates',
      answer({ coverage_note: rangeCoverageNote, estimates_excluded: 1 }),
    ],
    ['days the range does not hold', answer({ by_weekday: week({ 4: 2 }, [0, 0, 0, 0, 1, 1, 1]) })],
    ['a quiet range', answer({ by_site: [], by_hour: hours(), by_weekday: week() })],
  ])('by day: %s', async (_name, patterns) => {
    const user = userEvent.setup();
    const outside = render(
      <Reaches
        today={todayCases.sealed}
        read={readerOf(patterns)}
        now={now}
        firstDay={SUNDAY}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Over time' }));
    await user.click(await screen.findByRole('button', { name: 'By day' }));
    await screen.findAllByRole('listitem');
    const expected = words(outside.container);
    outside.unmount();

    const { spread, user: pageUser } = await byDayOnPage(patterns, SUNDAY);
    await pageUser.click(choose('By day'));

    expect(words(spread)).toEqual(expected);
  });
});

describe('a count the core sent is never hidden, on the page (Y23; W3, W7)', () => {
  it('draws the count and the bar of a weekday that holds 0 days but 1 reach', async () => {
    const { user, pages } = await byDayOnPage(
      answer({ by_weekday: week({ 2: 1 }, [0, 1, 0, 0, 0, 0, 0]) }),
    );
    await user.click(choose('By day'));
    const [, right] = pages();

    const wednesday = within(right!).getAllByRole('listitem')[2];
    // name, bar, count: no clause, for it would say "not in these days" beside a reach.
    expect(wednesday.children).toHaveLength(3);
    expect(wednesday).not.toHaveTextContent('not in these days');
    expect(within(wednesday).getByText('1')).toBeInTheDocument();
    expect(within(wednesday).getByTestId('bar')).toBeInTheDocument();
  });

  it('draws all seven days when the answer holds only some of them', async () => {
    const { user, pages } = await byDayOnPage(
      answer({ by_weekday: [{ weekday: 2, count: 3, days: 4 }] }),
    );
    await user.click(choose('By day'));
    const [, right] = pages();

    expect(within(right!).getAllByRole('listitem')).toHaveLength(7);
  });
});
