/**
 * The reaches screen at its edges: which button is pressed, what a late answer may
 * not overwrite, which dates are allowed, the time of a reach, and the note's own line.
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module.
 * The zone is fixed before any date is made.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Reaches, type ReachesReader } from '../Reaches';
import type { Patterns, TodaysReaches } from '../../ipc/reaches';

const NOW = new Date(2026, 8, 30, 20, 0);
const seconds = (d: Date) => Math.round(d.getTime() / 1000);

const day = (over: Partial<TodaysReaches> = {}): TodaysReaches => ({
  reaches: [],
  gaps: [],
  coverage_note: null,
  sealed: null,
  ...over,
});
const range = (domain: string, over: Partial<Patterns> = {}): Patterns => ({
  by_site: [{ domain, count: 1 }],
  by_hour: [],
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
  ...over,
});

type Call = [string, string, number, number];

function fakeRead(
  answer: (call: Call) => Promise<Patterns> = async () => range('a.example'),
) {
  const calls: Call[] = [];
  const todayCalls: Array<[number, number]> = [];
  const read: ReachesReader = {
    listTodaysReaches: async (start, end) => {
      todayCalls.push([start, end]);
      return day();
    },
    summarizeReaches: (firstDay, lastDay, rangeStart, rangeEnd) => {
      const call: Call = [firstDay, lastDay, rangeStart, rangeEnd];
      calls.push(call);
      return answer(call);
    },
  };
  return { calls, todayCalls, read };
}

async function openOverTime(read: ReachesReader) {
  const user = userEvent.setup();
  render(<Reaches read={read} now={() => NOW} />);
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  return user;
}

describe('which view is pressed', () => {
  it('presses Over time and not Today once Over time is chosen', async () => {
    const { read } = fakeRead();
    await openOverTime(read);

    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Over time' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('the day handed in', () => {
  it('is shown as it is, and the reader is not asked for another', async () => {
    const { read, todayCalls } = fakeRead();
    render(
      <Reaches
        read={read}
        now={() => NOW}
        today={day({ reaches: [{ domain: 'handed.example', at: seconds(NOW) }] })}
      />,
    );

    expect(await screen.findByText('handed.example')).toBeInTheDocument();
    expect(todayCalls).toEqual([]);
  });
});

describe('the time of a reach', () => {
  it('is the local hour and minute, with no seconds and no date', () => {
    const at = seconds(new Date(2026, 8, 30, 21, 5, 7));
    render(<Reaches today={day({ reaches: [{ domain: 'x.example', at }] })} />);

    const time = screen.getByText('x.example').nextElementSibling;
    expect(time?.textContent).toMatch(/^(09:05 PM|21:05)$/);
  });
});

describe('a late answer', () => {
  it('does not replace the answer for the range now shown', async () => {
    const waiting: Array<(patterns: Patterns) => void> = [];
    const { calls, read } = fakeRead(
      () => new Promise<Patterns>((resolve) => waiting.push(resolve)),
    );
    await openOverTime(read);
    await waitFor(() => expect(calls).toHaveLength(1));

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    await waitFor(() => expect(calls).toHaveLength(2));

    waiting[1](range('newer.example'));
    expect(await screen.findByText('newer.example')).toBeInTheDocument();
    waiting[0](range('older.example'));
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.queryByText('older.example')).not.toBeInTheDocument();
    expect(screen.getByText('newer.example')).toBeInTheDocument();
  });

  it('does not turn into a sentence of its own once the range has moved on', async () => {
    const waiting: Array<{
      reject: (error: Error) => void;
      resolve: (p: Patterns) => void;
    }> = [];
    const { calls, read } = fakeRead(
      () => new Promise<Patterns>((resolve, reject) => waiting.push({ resolve, reject })),
    );
    await openOverTime(read);
    await waitFor(() => expect(calls).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    await waitFor(() => expect(calls).toHaveLength(2));

    waiting[1].resolve(range('newer.example'));
    await screen.findByText('newer.example');
    waiting[0].reject(new Error('late'));
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.queryByText(/could not read your history/i)).not.toBeInTheDocument();
    expect(screen.getByText('newer.example')).toBeInTheDocument();
  });
});

describe('the dates that may be chosen', () => {
  it('lets From be the same day as To', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-30' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].slice(0, 2)).toEqual(['2026-09-30', '2026-09-30']);
  });

  it('lets To be the same day as From', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-03' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].slice(0, 2)).toEqual(['2026-09-03', '2026-09-03']);
  });

  it('lets To come back to today', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-20' } });
    await waitFor(() => expect(calls).toHaveLength(2));

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30' } });

    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[2].slice(0, 2)).toEqual(['2026-09-03', '2026-09-30']);
  });
});

describe('the coverage note over these days', () => {
  it('is its own paragraph when there is one, and there is no empty one when there is not', async () => {
    const note = 'Cairn was not running for about 3 hours of these days, so nothing.';
    const { read } = fakeRead(async () => range('a.example', { coverage_note: note }));
    await openOverTime(read);

    expect((await screen.findByText(note)).tagName).toBe('P');
  });

  it('leaves no empty paragraph when nothing was unobserved', async () => {
    const { read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    const empty = Array.from(document.querySelectorAll('p')).filter(
      (p) => (p.textContent ?? '').trim() === '',
    );
    expect(empty).toHaveLength(0);
  });
});
