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
