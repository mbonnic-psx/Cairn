/**
 * Pin: the reaches screen opens on Today, and asks for this local day.
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module.
 * The zone is fixed before any date is made: the clock-change case needs a zone with one.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Reaches } from '../Reaches';
import type { Patterns, TodaysReaches } from '../../ipc/reaches';

const quietDay: TodaysReaches = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  sealed: null,
};
const quietRange: Patterns = {
  by_site: [],
  by_hour: [],
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
};

function fakeRead() {
  const calls: Array<[number, number]> = [];
  return {
    calls,
    read: {
      listTodaysReaches: async (dayStart: number, dayEnd: number) => {
        calls.push([dayStart, dayEnd]);
        return quietDay;
      },
      summarizeReaches: async () => quietRange,
    },
  };
}

const seconds = (d: Date) => Math.round(d.getTime() / 1000);

describe('the reaches screen opens on Today', () => {
  it('asks for this local midnight to that instant plus 86 400 on an ordinary day', async () => {
    const { calls, read } = fakeRead();
    const now = new Date(2026, 8, 30, 20, 0);

    render(<Reaches read={read} now={() => now} />);

    expect(await screen.findByText(/nothing here for today/i)).toBeInTheDocument();
    const midnight = seconds(new Date(2026, 8, 30));
    expect(calls).toEqual([[midnight, midnight + 86_400]]);
  });

  it('asks for this local midnight to the next one on a 25-hour day', async () => {
    const { calls, read } = fakeRead();
    const now = new Date(2026, 9, 25, 20, 0);

    render(<Reaches read={read} now={() => now} />);

    expect(await screen.findByText(/nothing here for today/i)).toBeInTheDocument();
    const start = seconds(new Date(2026, 9, 25));
    const next = seconds(new Date(2026, 9, 26));
    expect(next - start).toBe(25 * 3600);
    expect(calls).toEqual([[start, next]]);
  });
});
