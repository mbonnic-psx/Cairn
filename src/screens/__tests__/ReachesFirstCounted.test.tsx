/**
 * The reaches screen and the first count (slice `first-counted`, plan scenarios 23 to 35).
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module. The zone is fixed before any
 * date is made, and every expected string is made through the same calls the screen makes, so the runner's locale
 * does not matter.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { MovementRow, Patterns, TodaysReaches } from '../../ipc/reaches';
import { Reaches, type ReachesReader } from '../Reaches';

/** Friday 2 October 2026, 20:00 in London. */
const NOW = new Date(2026, 9, 2, 20, 0);
const seconds = (d: Date) => Math.round(d.getTime() / 1000);

/** Thursday 1 October 2026, 14:14: inside the opening range. */
const FIRST = seconds(new Date(2026, 9, 1, 14, 14));
/** 1 January 2025: before the opening range. */
const EARLY = seconds(new Date(2025, 0, 1, 9, 30));

const quietDay: TodaysReaches = { reaches: [], gaps: [], coverage_note: null, sealed: null };

const patterns = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [{ domain: 'a.example', count: 5 }],
  by_hour: [],
  by_weekday: [],
  movement: [] as MovementRow[],
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
  ...over,
});

type Call = [string, string, number, number];

/** A reader that answers by the order of the call. A call past the answers given is answered with the last. */
function fakeRead(answers: Patterns[]) {
  const calls: Call[] = [];
  const read: ReachesReader = {
    listTodaysReaches: async () => quietDay,
    summarizeReaches: async (firstDay, lastDay, rangeStart, rangeEnd) => {
      calls.push([firstDay, lastDay, rangeStart, rangeEnd]);
      return answers[Math.min(calls.length, answers.length) - 1]!;
    },
  };
  return { calls, read };
}

async function openOverTime(read: ReachesReader, now: Date = NOW) {
  const user = userEvent.setup();
  render(<Reaches read={read} now={() => now} />);
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  return user;
}

describe('From is never earlier than the day Cairn first counted (rule 10)', () => {
  it('moves the opening range up to the first count and draws only the second answer (scenario 23)', async () => {
    const { calls, read } = fakeRead([
      patterns({ first_counted: FIRST, by_site: [{ domain: 'first.example', count: 1 }] }),
      patterns({ first_counted: FIRST, by_site: [{ domain: 'second.example', count: 2 }] }),
    ]);
    await openOverTime(read);
    await screen.findByText('second.example');

    expect(calls.map(([from, to]) => [from, to])).toEqual([
      ['2026-09-05', '2026-10-02'],
      ['2026-10-01', '2026-10-02'],
    ]);
    expect(screen.queryByText('first.example')).toBeNull();
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-01');
    expect(screen.getByLabelText('From')).toHaveAttribute('min', '2026-10-01');
  });

  it('keeps Looking… until the second answer arrives (scenario 23)', async () => {
    let release: (answer: Patterns) => void = () => undefined;
    let calls = 0;
    const read: ReachesReader = {
      listTodaysReaches: async () => quietDay,
      summarizeReaches: () => {
        calls += 1;
        return calls === 1
          ? Promise.resolve(patterns({ first_counted: FIRST, by_site: [{ domain: 'first.example', count: 1 }] }))
          : new Promise<Patterns>((resolve) => (release = resolve));
      },
    };
    await openOverTime(read);
    await waitFor(() => expect(calls).toBe(2));

    expect(screen.getByText('Looking…')).toBeInTheDocument();
    expect(screen.queryByText('first.example')).toBeNull();
    release(patterns({ first_counted: FIRST }));
    expect(await screen.findByText('a.example')).toBeInTheDocument();
  });

  it('has nothing to move when the first count is before the range (scenario 24)', async () => {
    const { calls, read } = fakeRead([patterns({ first_counted: EARLY })]);
    await openOverTime(read);
    await screen.findByText('a.example');

    expect(calls).toHaveLength(1);
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-05');
    expect(screen.getByLabelText('From')).toHaveAttribute('min', '2025-01-01');
  });

  it('moves a typed date up to the limit and asks for nothing earlier (scenario 25)', async () => {
    const { calls, read } = fakeRead([patterns({ first_counted: FIRST })]);
    await openOverTime(read);
    await screen.findByText('a.example');
    const before = calls.length;

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-20' } });

    expect(screen.getByLabelText('From')).toHaveValue('2026-10-01');
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toHaveLength(before);
    expect(calls.some(([from]) => from === '2026-09-20')).toBe(false);
  });

  it('takes a typed date on or after the limit as before (scenario 26)', async () => {
    const { calls, read } = fakeRead([patterns({ first_counted: EARLY })]);
    await openOverTime(read);
    await screen.findByText('a.example');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-06-01' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]![0]).toBe('2025-06-01');
    expect(screen.getByLabelText('From')).toHaveValue('2025-06-01');
  });

  it('has no limit and one call for an answer without the field (scenario 27)', async () => {
    const { calls, read } = fakeRead([patterns()]);
    await openOverTime(read);
    await screen.findByText('a.example');

    expect(calls).toHaveLength(1);
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-05');
    expect(screen.getByLabelText('From')).not.toHaveAttribute('min');
  });

  it('caps the limit at today when the first count is after it (a clock moved back)', async () => {
    const after = seconds(new Date(2026, 9, 5, 9, 0));
    const { calls, read } = fakeRead([patterns({ first_counted: after })]);
    await openOverTime(read);
    await screen.findByText('a.example');

    expect(calls.map(([from, to]) => [from, to])).toEqual([
      ['2026-09-05', '2026-10-02'],
      ['2026-10-02', '2026-10-02'],
    ]);
    expect(screen.getByLabelText('From')).toHaveAttribute('min', '2026-10-02');
  });

  it('leaves From as it was for a sealed answer (scenario 33)', async () => {
    const { calls, read } = fakeRead([patterns({ by_site: [], sealed: 'Cairn could not read your history just now.' })]);
    await openOverTime(read);
    await screen.findByText(/could not read your history/);

    expect(calls).toHaveLength(1);
    expect(screen.getByLabelText('From')).not.toHaveAttribute('min');
  });
});
