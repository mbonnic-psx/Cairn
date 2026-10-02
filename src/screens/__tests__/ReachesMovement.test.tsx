/**
 * The reaches screen, over time, day by day (slice `history-movement`, plan scenarios 28 to 40).
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module. The zone is fixed
 * before any date is made. Every name is made by the same `shortDateInWords` and `weekOfInWords` the
 * screen uses, so the runner's locale does not matter.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { MovementRow, OffsetChange, Patterns, TodaysReaches } from '../../ipc/reaches';
import { shortDateInWords } from '../../localDays';
import { Reaches, type ReachesReader } from '../Reaches';

/** Friday 2 October 2026, 20:00 in London. */
const NOW = new Date(2026, 9, 2, 20, 0);
const seconds = (d: Date) => Math.round(d.getTime() / 1000);

const quietDay: TodaysReaches = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  sealed: null,
};

const hours = (counts: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts[hour] ?? 0 }));

const week = () =>
  Array.from({ length: 7 }, (_, weekday) => ({ weekday, count: 0, days: 4 }));

/** The rows of the answer: 28 days ending 2 October, with the counts given by place. */
const dayRows = (counts: Record<number, number> = {}): MovementRow[] =>
  Array.from({ length: 28 }, (_, place) => ({
    day: new Date(Date.UTC(2026, 8, 5 + place)).toISOString().slice(0, 10),
    days: 1,
    span: 'day' as const,
    count: counts[place] ?? 0,
    seen: 'whole' as const,
    so_far: place === 27,
  }));

const patterns = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'a.example', count: 5 },
    { domain: 'b.example', count: 2 },
  ],
  by_hour: hours({ 14: 6 }),
  by_weekday: week(),
  movement: dayRows({ 3: 2, 10: 5 }),
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
  ...over,
});

type Call = [string, string, number, number, OffsetChange[]];

function fakeRead(answer: () => Promise<Patterns> = async () => patterns()) {
  const calls: Call[] = [];
  const read: ReachesReader = {
    listTodaysReaches: async () => quietDay,
    summarizeReaches: (firstDay, lastDay, rangeStart, rangeEnd, offsets) => {
      calls.push([firstDay, lastDay, rangeStart, rangeEnd, offsets]);
      return answer();
    },
  };
  return { calls, read };
}

async function openOverTime(read: ReachesReader) {
  const user = userEvent.setup();
  const view = render(<Reaches read={read} now={() => NOW} />);
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  return { user, view };
}

async function openDayByDay(read: ReachesReader) {
  const opened = await openOverTime(read);
  await opened.user.click(await screen.findByRole('button', { name: 'Day by day' }));
  return opened;
}

const lines = () => screen.queryAllByRole('listitem');
const text = () => document.body.textContent ?? '';

/** What a line says, in the order it says it: the leaves of its markup. */
const leaves = (line: HTMLElement) =>
  Array.from(line.querySelectorAll('*'))
    .filter((el) => el.children.length === 0 && el.textContent)
    .map((el) => el.textContent as string);

const barOf = (line: HTMLElement) => within(line).queryByTestId('bar');

const NOTHING = 'Nothing here for these days.';
const STANDING = 'Cairn counts only while it is running. This is what it saw over these days.';
const SEALED = 'Your history is sealed for now.';

/** What Day by day never says (M4, scenario 5, scenario 40): a reusable scan of the whole page. */
function expectNoVerdict() {
  expect(text()).not.toMatch(
    /\b(up|down|more|fewer|better|worse|rising|falling|trend|average|per day|peak|worst|best|busiest|quietest|top|rank|than last week)\b/i,
  );
  expect(text()).not.toMatch(/\bday \d|streak|in a row|chain/i);
  expect(text()).not.toMatch(/failed|denied|violation|relapse|forbidden|you lost/i);
  expect(text()).not.toMatch(/\b(unblock|pause|turn off|allow|snooze|disable)\b/i);
  for (const line of lines()) expect(line.textContent).not.toMatch(/^\s*\d+[.)]/);
  expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
    'Today',
    'Over time',
    'By site',
    'By hour',
    'By day',
    'Day by day',
  ]);
}

describe('Seen by: By site | By hour | By day | Day by day', () => {
  it('stands under the range with By site pressed, then the other three not', async () => {
    const { read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    const group = screen.getByRole('group', { name: 'Seen by' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => [b.textContent, b.getAttribute('aria-pressed')]),
    ).toEqual([
      ['By site', 'true'],
      ['By hour', 'false'],
      ['By day', 'false'],
      ['Day by day', 'false'],
    ]);
  });

  it('shows Day by day when chosen, for the same range, with no second read', async () => {
    const { calls, read } = fakeRead();
    const { user } = await openOverTime(read);
    await screen.findByText('a.example');

    await user.click(screen.getByRole('button', { name: 'Day by day' }));

    expect(screen.getByRole('button', { name: 'Day by day' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'By site' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByText('a.example')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Cairn counts only while it is running. This is what it saw over these days.',
      ),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'By site' }));
    expect(screen.getByText('a.example')).toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it('reads again when From changes, and stays on Day by day', async () => {
    const { calls, read } = fakeRead();
    await openDayByDay(read);
    await waitFor(() => expect(calls).toHaveLength(1));

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]!.slice(0, 2)).toEqual(['2026-09-10', '2026-10-02']);
    expect(screen.getByRole('button', { name: 'Day by day' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('is forgotten on going to Today and back: 4 weeks and By site again', async () => {
    const { read } = fakeRead();
    const { user } = await openDayByDay(read);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });

    await user.click(screen.getByRole('button', { name: 'Today' }));
    await user.click(screen.getByRole('button', { name: 'Over time' }));

    expect(await screen.findByText('a.example')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-05');
    expect(screen.getByRole('button', { name: 'By site' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(lines()).toHaveLength(2);
  });
});

describe('what it asks for', () => {
  it('sends the range, its bounds and the offsets, exactly as the other views do', async () => {
    const { calls, read } = fakeRead();
    await openDayByDay(read);
    await waitFor(() => expect(calls).toHaveLength(1));

    expect(calls).toEqual([
      [
        '2026-09-05',
        '2026-10-02',
        seconds(new Date(2026, 8, 5)),
        seconds(new Date(2026, 9, 3)),
        [{ from: seconds(new Date(2026, 8, 5)), offset: 3600 }],
      ],
    ]);
  });
});

describe('how a day row reads (scenario 31)', () => {
  it('draws 28 lines, oldest first, each named by its date, the count as text and a bar against the largest', async () => {
    const { read } = fakeRead();
    await openDayByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(28));

    const rows = patterns().movement;
    expect(lines().map((line) => leaves(line)[0])).toEqual(
      rows.map((row) => shortDateInWords(row.day, false)),
    );
    expect(lines()[3]).toHaveTextContent(`${shortDateInWords('2026-09-08', false)}2`);
    expect(leaves(lines()[10]!)).toEqual([shortDateInWords('2026-09-15', false), '5']);
    expect(barOf(lines()[10]!)).toHaveStyle({ width: '100%' });
    expect(barOf(lines()[3]!)).toHaveStyle({ width: '40%' });
    expectNoVerdict();
  });

  it('shows a 0 as 0 with an empty bar, as plainly as any other row', async () => {
    const { read } = fakeRead();
    await openDayByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(28));

    expect(leaves(lines()[0]!)).toEqual([shortDateInWords('2026-09-05', false), '0']);
    expect(barOf(lines()[0]!)).toHaveStyle({ width: '0%' });
  });

  it('carries the year on every name when the range crosses one', async () => {
    const rows: MovementRow[] = [
      { day: '2025-12-31', days: 1, span: 'day', count: 1, seen: 'whole', so_far: false },
      { day: '2026-01-01', days: 1, span: 'day', count: 0, seen: 'whole', so_far: true },
    ];
    const { read } = fakeRead(async () => patterns({ movement: rows }));
    await openDayByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(2));

    expect(lines().map((line) => leaves(line)[0])).toEqual([
      shortDateInWords('2025-12-31', true),
      shortDateInWords('2026-01-01', true),
    ]);
  });

  it('stands the coverage note above the rows and the standing sentence at the close', async () => {
    const note = 'Cairn was not running for part of these days.';
    const { read } = fakeRead(async () => patterns({ coverage_note: note }));
    await openDayByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(28));

    const noteEl = screen.getByText(note);
    const list = screen.getByRole('list');
    expect(noteEl.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const standing = screen.getByText(STANDING);
    expect(
      noteEl.compareDocumentPosition(standing) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('a quiet range (scenario 37)', () => {
  it('says there is nothing here and keeps every row under it', async () => {
    const { read } = fakeRead(async () => patterns({ movement: dayRows() }));
    await openDayByDay(read);

    expect(await screen.findByText(NOTHING)).toBeInTheDocument();
    expect(lines()).toHaveLength(28);
    for (const line of lines()) expect(leaves(line)[1]).toBe('0');
    expectNoVerdict();
  });
});

describe('when it cannot be shown (scenario 38)', () => {
  it('shows what By site shows when sealed: the sentence and no rows', async () => {
    const { read } = fakeRead(async () =>
      patterns({ by_site: [], by_hour: [], by_weekday: [], movement: [], sealed: SEALED }),
    );
    await openDayByDay(read);

    expect(await screen.findByText(SEALED)).toBeInTheDocument();
    expect(lines()).toHaveLength(0);
    expect(screen.queryByText(NOTHING)).toBeNull();
    expectNoVerdict();
  });

  it('shows one plain sentence when the read throws', async () => {
    const { read } = fakeRead(async () => {
      throw new Error('boom');
    });
    await openDayByDay(read);

    expect(
      await screen.findByText(
        'Cairn could not read your history just now. Protection is unaffected.',
      ),
    ).toBeInTheDocument();
    expect(lines()).toHaveLength(0);
    expect(text()).not.toContain('boom');
    expectNoVerdict();
  });
});

describe('the estimates sentence (scenarios 30, 36)', () => {
  const reasonFor = (days: number) =>
    days === 1
      ? 'Your own estimate for 1 day is not counted here, because Cairn counts only what it saw.'
      : `Your own estimates for ${days} days are not counted here, because Cairn counts only what it saw.`;

  it.each([2, 1])('says it for %i estimated days, in the singular for 1', async (days) => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: days }));
    await openDayByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(28));

    expect(screen.getByText(reasonFor(days))).toBeInTheDocument();
    expectNoVerdict();
  });

  it('says nothing about estimates when there are none', async () => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: 0 }));
    await openDayByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(28));

    expect(text()).not.toMatch(/estimate/i);
  });

  it('leaves By site and By hour with their own reasons', async () => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: 2 }));
    const { user } = await openOverTime(read);
    await screen.findByText('a.example');
    expect(
      screen.getByText(
        'Your own estimates for 2 days are not counted here, because an estimate has no site.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'By hour' }));
    expect(
      screen.getByText(
        'Your own estimates for 2 days are not counted here, because an estimate has no hour.',
      ),
    ).toBeInTheDocument();
  });
});
