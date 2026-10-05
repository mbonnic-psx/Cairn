/**
 * How a count is read and written in the four views of Over time (slice `first-counted`, plan scenarios 37 to 39).
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module. The zone is fixed before any
 * date is made, and every expected string is made through the same calls the screen makes.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { MovementRow, Patterns, TodaysReaches } from '../../ipc/reaches';
import { weekOfInWords } from '../../localDays';
import { Reaches, type ReachesReader } from '../Reaches';

/** Friday 2 October 2026, 20:00 in London. */
const NOW = new Date(2026, 9, 2, 20, 0);

const quietDay: TodaysReaches = { reaches: [], gaps: [], coverage_note: null, sealed: null };

const patterns = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'a.example', count: 5 },
    { domain: 'b.example', count: 1 },
  ],
  by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hour === 14 ? 5 : hour === 9 ? 1 : 0 })),
  by_weekday: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    count: weekday === 0 ? 5 : weekday === 1 ? 1 : 0,
    days: weekday === 6 ? 0 : 4,
  })),
  movement: [
    { day: '2025-11-03', days: 7, span: 'week', count: 5, seen: 'whole', so_far: false },
    { day: '2025-11-10', days: 7, span: 'week', count: 1, seen: 'whole', so_far: false },
    { day: '2025-11-17', days: 7, span: 'week', count: 0, seen: 'none', so_far: false },
  ] as MovementRow[],
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
  ...over,
});

async function open(answer: Patterns, choice: string) {
  const read: ReachesReader = {
    listTodaysReaches: async () => quietDay,
    summarizeReaches: async () => answer,
  };
  const user = userEvent.setup();
  render(<Reaches read={read} now={() => NOW} firstDay={0} />);
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  await user.click(await screen.findByRole('button', { name: choice }));
  const pages = () => Array.from(document.querySelectorAll('.nb-page'));
  return pages()[1] as HTMLElement;
}

const counts = (page: HTMLElement) =>
  Array.from(page.querySelectorAll<HTMLElement>('.nb-reaches-count'));

describe('a count is read with its unit (scenario 37)', () => {
  it.each(['By site', 'By hour', 'By day', 'Day by day'])(
    'in %s every count is its number then a hidden reach or reaches',
    async (choice) => {
      const page = await open(patterns(), choice);
      const found = counts(page);
      expect(found.length).toBeGreaterThan(0);
      for (const one of found) {
        const number = one.firstChild!.textContent!;
        const unit = one.querySelector('.sr-only');
        expect(unit).not.toBeNull();
        expect(one.textContent).toBe(`${number}${unit!.textContent}`);
        expect(unit!.textContent).toBe(number === '1' ? ' reach' : ' reaches');
      }
    },
  );

  it('names the week and the count as two things, so 2025 does not run into 5', async () => {
    const page = await open(patterns(), 'Day by day');
    const first = within(page).getAllByRole('listitem')[0]!;
    const name = first.querySelector('.nb-reaches-site')!;
    const count = first.querySelector('.nb-reaches-count')!;
    expect(name.textContent).toBe(weekOfInWords('2025-11-03', true));
    expect(name.contains(count)).toBe(false);
    expect(count.textContent).toBe('5 reaches');
  });

  it('gives a row that is not seen neither a count nor a unit', async () => {
    const page = await open(patterns(), 'Day by day');
    const last = within(page).getAllByRole('listitem')[2]!;
    expect(last.querySelector('.nb-reaches-count')).toBeNull();
    expect(last.textContent).not.toMatch(/reach/);
  });

  it('gives a day of the week the range does not hold neither a count nor a unit', async () => {
    const page = await open(patterns(), 'By day');
    const sunday = within(page).getAllByRole('listitem').at(-1)!;
    expect(sunday.querySelector('.nb-reaches-count')).toBeNull();
    expect(sunday.textContent).not.toMatch(/reach/);
  });
});
