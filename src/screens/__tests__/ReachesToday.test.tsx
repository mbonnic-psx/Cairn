/**
 * Pin: the reaches screen opens on Today, and asks for this local day.
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Reaches } from '../Reaches';
import type { Patterns, TodaysReaches } from '../../ipc/reaches';

const quietDay: TodaysReaches = { reaches: [], gaps: [], coverage_note: null, sealed: null };
const quietRange: Patterns = {
  by_site: [],
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
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
});
