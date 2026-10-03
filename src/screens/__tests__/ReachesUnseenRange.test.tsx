/**
 * The reaches screen, over time, given a range Cairn saw none of: what it shows today, pinned before
 * the change to it (slice `history-movement`, gaps review M13).
 *
 * The answer is every row not seen with no reach, so no site, every hour at 0 and every weekday at 0.
 * The reader and the clock are passed in as props, so nothing here mocks a module. The zone is fixed
 * before any date is made.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { Patterns, TodaysReaches } from '../../ipc/reaches';
import { acrossInWords, weekdayInWords } from '../../localDays';
import { Reaches, type ReachesReader } from '../Reaches';

/** Friday 2 October 2026, 20:00 in London. */
const NOW = new Date(2026, 9, 2, 20, 0);

const quietDay: TodaysReaches = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  sealed: null,
};

const COVERAGE = 'Cairn was not running for part of these days.';

/** 28 rows, one a day, all not seen and holding no reach. */
const unseenRows = () =>
  Array.from({ length: 28 }, (_, place) => ({
    day: new Date(Date.UTC(2026, 8, 5 + place)).toISOString().slice(0, 10),
    days: 1,
    span: 'day' as const,
    count: 0,
    seen: 'none' as const,
    so_far: false,
  }));

const sawNone = (): Patterns => ({
  by_site: [],
  by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
  by_weekday: Array.from({ length: 7 }, (_, weekday) => ({ weekday, count: 0, days: 4 })),
  movement: unseenRows(),
  gaps: [],
  coverage_note: COVERAGE,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
});

const read: ReachesReader = {
  listTodaysReaches: async () => quietDay,
  summarizeReaches: async () => sawNone(),
};

async function openView(view: 'By site' | 'By hour' | 'By day') {
  const user = userEvent.setup();
  render(<Reaches read={read} now={() => NOW} firstDay={0} />);
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  await screen.findByText(COVERAGE);
  if (view !== 'By site') await user.click(screen.getByRole('button', { name: view }));
}

const rightPage = () => {
  const pages = document.querySelectorAll<HTMLElement>('.nb-spread > .nb-page');
  return pages[pages.length - 1]!;
};
const lines = () => screen.queryAllByRole('listitem');
/** The time as the Today log prints it: the same call, made for the hour in London. */
const label = (hour: number) =>
  new Date(2000, 0, 1, hour).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
const QUIET = 'Nothing here for these days.';

describe('a range Cairn saw none of, as it reads today', () => {
  it('By site: says only the quiet sentence on the right page, with no list item', async () => {
    await openView('By site');

    expect(rightPage().textContent).toBe(QUIET);
    expect(lines()).toHaveLength(0);
  });

  it('By hour: says the quiet sentence, then 24 lines each 0', async () => {
    await openView('By hour');
    await waitFor(() => expect(lines()).toHaveLength(24));

    expect(rightPage().firstElementChild!.textContent).toBe(QUIET);
    lines().forEach((line, hour) => expect(line.textContent).toBe(`${label(hour)}0`));
  });

  it('By day: says the quiet sentence, then seven weekdays each across 4 and 0', async () => {
    await openView('By day');
    await waitFor(() => expect(lines()).toHaveLength(7));

    expect(rightPage().firstElementChild!.textContent).toBe(QUIET);
    lines().forEach((line, weekday) => {
      expect(line.textContent).toBe(
        `${weekdayInWords(weekday)}${acrossInWords(weekday, 4)}0`,
      );
    });
  });
});
