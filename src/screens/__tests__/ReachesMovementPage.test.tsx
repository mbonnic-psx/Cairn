/**
 * The reaches screen, over time, day by day, on a notebook page (slice `history-movement`, plan
 * scenario 41; 004 `tonight-page` D21, D22). The choice is on the left page under the date boxes; the
 * rows are on the right page, ruled, one row to a line: its name, its clause, its bar and its count,
 * or its name and clause alone for a row Cairn did not count for. The reader and the clock are plain
 * objects passed as props.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { MovementRow, Patterns } from '../../ipc/reaches';
import { shortDateInWords, weekOfInWords } from '../../localDays';
import { NotebookShell } from '../../shell/NotebookShell';
import { Reaches } from '../Reaches';
import { evening, rangeCoverageNote, sealedSentence, todayCases } from './tonightCases';
import { never } from './fakeCore';

const tabs = [{ id: 'reaches' as const, label: 'Today', current: true }];
const now = evening;

const hours = (counts: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts[hour] ?? 0 }));

const week = () =>
  Array.from({ length: 7 }, (_, weekday) => ({ weekday, count: 0, days: 4 }));

/** Nine weeks from 7 August 2026, the last holding one date; `over` changes rows by place. */
const weeks = (over: Record<number, Partial<MovementRow>> = {}): MovementRow[] =>
  Array.from({ length: 9 }, (_, place) => ({
    day: new Date(Date.UTC(2026, 7, 7 + place * 7)).toISOString().slice(0, 10),
    days: place === 8 ? 1 : 7,
    span: 'week' as const,
    count: ({ 0: 4, 2: 2 } as Record<number, number>)[place] ?? 0,
    seen: 'whole' as const,
    so_far: place === 8,
    ...over[place],
  }));

const answer = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'news.example', count: 9 },
    { domain: 'video.example', count: 4 },
  ],
  by_hour: hours({ 14: 6 }),
  by_weekday: week(),
  movement: weeks(),
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

async function onPage(patterns: Patterns) {
  const user = userEvent.setup();
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look="midday">
      <Reaches today={todayCases.sealed} read={readerOf(patterns)} now={now} firstDay={0} />
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

const choose = (name: 'By site' | 'Day by day') => screen.getByRole('button', { name });

describe('Seen by, with Day by day, on a notebook page', () => {
  it('sits on the left page under the date boxes, four buttons in the Which days classes', async () => {
    const { pages } = await onPage(answer());
    const [left] = pages();

    const [heading, range, seen] = Array.from(left!.children) as HTMLElement[];
    expect(heading!.tagName).toBe('H2');
    expect(within(range!).getByLabelText('From')).toBeInTheDocument();
    expect(seen).toHaveAttribute('role', 'group');
    expect(seen).toHaveAttribute('aria-label', 'Seen by');
    expect(seen).toHaveClass('nb-reaches-seen');
    const buttons = within(seen!).getAllByRole('button');
    expect(buttons.map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
      ['By site', 'true'],
      ['By hour', 'false'],
      ['By day', 'false'],
      ['Day by day', 'false'],
    ]);
    for (const button of buttons) expect(button).toHaveClass('nb-reaches-which__button');
  });

  it('keeps Which days the first child of the spread, and focus on Day by day once pressed', async () => {
    const { user, spread, pages } = await onPage(answer());
    const which = spread.firstElementChild;
    const seen = within(pages()[0]!).getByRole('group', { name: 'Seen by' });
    const from = within(pages()[0]!).getByLabelText('From');

    await user.click(choose('Day by day'));

    expect(document.activeElement).toBe(choose('Day by day'));
    expect(choose('Day by day')).toHaveAttribute('aria-pressed', 'true');
    expect(spread.firstElementChild).toBe(which);
    expect(within(pages()[0]!).getByRole('group', { name: 'Seen by' })).toBe(seen);
    expect(within(pages()[0]!).getByLabelText('From')).toBe(from);
  });
});

describe('the rows, on the right page', () => {
  it('are ruled lines, each the name, its clause where it has one, its bar, then its count', async () => {
    const { user, pages } = await onPage(answer());
    await user.click(choose('Day by day'));
    const [, right] = pages();

    expect(right).toHaveClass('nb-page--ruled');
    const lines = within(right!).getAllByRole('listitem');
    expect(lines).toHaveLength(9);
    const first = lines[0]!;
    expect(first).toHaveClass('nb-reaches-line');
    const [name, bar, count] = Array.from(first.children) as HTMLElement[];
    expect(name).toHaveClass('nb-reaches-site');
    expect(name).toHaveTextContent(weekOfInWords('2026-08-07', false));
    expect(bar).toHaveClass('nb-reaches-bar');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(count).toHaveClass('nb-reaches-count');
    expect(count.textContent).toBe('4');
    expect(first.children).toHaveLength(3);

    const last = lines[8]!;
    expect(last.children).toHaveLength(4);
    const [, clause] = Array.from(last.children) as HTMLElement[];
    expect(clause).toHaveClass('nb-reaches-time');
    expect(clause).toHaveTextContent('across 1 day, so far');
  });

  it('give a row Cairn did not count for its name and clause alone: no count, no bar', async () => {
    const { user, pages } = await onPage(
      answer({ movement: weeks({ 3: { seen: 'none', count: 0 } }) }),
    );
    await user.click(choose('Day by day'));
    const [, right] = pages();

    const line = within(right!).getAllByRole('listitem')[3]!;
    expect(line).toHaveClass('nb-reaches-line');
    expect(line.children).toHaveLength(2);
    const [name, clause] = Array.from(line.children) as HTMLElement[];
    expect(name).toHaveClass('nb-reaches-site');
    expect(name).toHaveTextContent(weekOfInWords('2026-08-28', false));
    expect(clause).toHaveClass('nb-reaches-time');
    expect(clause).toHaveTextContent('not seen');
    expect(within(line).queryByTestId('bar')).toBeNull();
  });

  it('name a day by its date when the range is short', async () => {
    const days: MovementRow[] = [
      { day: '2026-10-01', days: 1, span: 'day', count: 2, seen: 'whole', so_far: false },
      { day: '2026-10-02', days: 1, span: 'day', count: 0, seen: 'part', so_far: true },
    ];
    const { user, pages } = await onPage(answer({ movement: days }));
    await user.click(choose('Day by day'));

    const lines = within(pages()[1]!).getAllByRole('listitem');
    expect(lines[0]).toHaveTextContent(shortDateInWords('2026-10-01', false));
    expect(lines[1]).toHaveTextContent('partly seen, so far');
  });

  it('keep every note off the right page', async () => {
    const { user, pages } = await onPage(
      answer({ coverage_note: rangeCoverageNote, estimates_excluded: 2 }),
    );
    await user.click(choose('Day by day'));
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
    const { user, pages } = await onPage(
      answer({ movement: weeks().map((row) => ({ ...row, count: 0 })) }),
    );
    await user.click(choose('Day by day'));
    const [, right] = pages();

    expect(right!.firstElementChild).toHaveTextContent('Nothing here for these days.');
    expect(right!.firstElementChild).toHaveClass('nb-reaches-empty');
    expect(within(right!).getAllByRole('listitem')).toHaveLength(9);
  });

  it('are none, with the sentence on the left, when sealed', async () => {
    const { user, pages } = await onPage(
      answer({ by_site: [], by_hour: [], by_weekday: [], movement: [], sealed: sealedSentence }),
    );
    await user.click(choose('Day by day'));
    const [left, right] = pages();

    expect(left).toHaveTextContent(sealedSentence);
    expect(right!.textContent).toBe('');
  });

  it('sit on the ruling: no inline height or overflow anywhere', async () => {
    const { user, main, pages } = await onPage(answer());
    await user.click(choose('Day by day'));
    expect(within(pages()[1]!).getAllByRole('listitem')).toHaveLength(9);

    for (const el of [main, ...Array.from(main.querySelectorAll<HTMLElement>('*'))]) {
      expect(el.style.height).toBe('');
      expect(el.style.overflow).toBe('');
    }
  });

  it('carry no Tailwind utility class, and run no entrance', async () => {
    const { user, spread, main } = await onPage(answer());
    await user.click(choose('Day by day'));

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
    ['a note and estimates', answer({ coverage_note: rangeCoverageNote, estimates_excluded: 1 })],
    ['not seen and so far', answer({ movement: weeks({ 2: { seen: 'none', count: 0 } }) })],
  ])('day by day: %s', async (_name, patterns) => {
    const user = userEvent.setup();
    const outside = render(
      <Reaches today={todayCases.sealed} read={readerOf(patterns)} now={now} firstDay={0} />,
    );
    await user.click(screen.getByRole('button', { name: 'Over time' }));
    await user.click(await screen.findByRole('button', { name: 'Day by day' }));
    await screen.findAllByRole('listitem');
    const expected = words(outside.container);
    outside.unmount();

    const { spread, user: pageUser } = await onPage(patterns);
    await pageUser.click(choose('Day by day'));

    expect(words(spread)).toEqual(expected);
  });
});
