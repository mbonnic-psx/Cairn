/**
 * The reaches screen, over time, given a range Cairn saw none of (slice `history-movement`, gaps
 * review M13, M15; plan scenarios 43 to 47): the sentence that says so replaces the quiet one, and
 * By hour and By day draw no rows under it.
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

import type { MovementRow, Patterns, TodaysReaches } from '../../ipc/reaches';
import { shortDateInWords } from '../../localDays';
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
const unseenRows = (): MovementRow[] =>
  Array.from({ length: 28 }, (_, place) => ({
    day: new Date(Date.UTC(2026, 8, 5 + place)).toISOString().slice(0, 10),
    days: 1,
    span: 'day' as const,
    count: 0,
    seen: 'none' as const,
    so_far: place === 27,
  }));

const sawNone = (movement: MovementRow[] = unseenRows()): Patterns => ({
  by_site: [],
  by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
  by_weekday: Array.from({ length: 7 }, (_, weekday) => ({ weekday, count: 0, days: 4 })),
  movement,
  gaps: [],
  coverage_note: COVERAGE,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
});

const readOf = (answer: () => Patterns): ReachesReader => ({
  listTodaysReaches: async () => quietDay,
  summarizeReaches: async () => answer(),
});

type View = 'By site' | 'By hour' | 'By day' | 'Day by day';

async function openView(view: View, read: ReachesReader = readOf(() => sawNone())) {
  const user = userEvent.setup();
  render(<Reaches read={read} now={() => NOW} firstDay={0} />);
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  await screen.findByText(COVERAGE);
  if (view !== 'By site') await user.click(screen.getByRole('button', { name: view }));
  return user;
}

const rightPage = () => {
  const pages = document.querySelectorAll<HTMLElement>('.nb-spread > .nb-page');
  return pages[pages.length - 1]!;
};
const lines = () => screen.queryAllByRole('listitem');
const QUIET = 'Nothing here for these days.';
const NOT_COUNTING = "Cairn wasn't counting on these days.";

describe('a range Cairn saw none of', () => {
  it('By site: says only that Cairn was not counting, with no list item', async () => {
    await openView('By site');

    expect(rightPage().textContent).toBe(NOT_COUNTING);
    expect(rightPage().firstElementChild!.className).toContain('nb-reaches-empty');
    expect(lines()).toHaveLength(0);
    expect(screen.queryByText(QUIET)).toBeNull();
  });

  it('By hour: says it alone, with no hour rows and no 0', async () => {
    await openView('By hour');

    expect(rightPage().textContent).toBe(NOT_COUNTING);
    expect(lines()).toHaveLength(0);
  });

  it('By day: says it alone, with no weekday rows and no across clause', async () => {
    await openView('By day');

    expect(rightPage().textContent).toBe(NOT_COUNTING);
    expect(lines()).toHaveLength(0);
  });

  it('Day by day: says it first, then every row not seen with no count and no bar', async () => {
    await openView('Day by day');
    await waitFor(() => expect(lines()).toHaveLength(28));

    expect(rightPage().firstElementChild!.textContent).toBe(NOT_COUNTING);
    expect(screen.queryByText(QUIET)).toBeNull();
    lines().forEach((line, place) => {
      const so_far = place === 27 ? ', so far' : '';
      expect(line.textContent).toBe(`${shortDateInWords(unseenRows()[place]!.day, false)}not seen${so_far}`);
    });
    expect(screen.queryAllByTestId('bar')).toHaveLength(0);
  });

  it.each(['By site', 'By hour', 'By day', 'Day by day'] as const)(
    'keeps the left page under %s: the coverage note and the standing sentence',
    async (view) => {
      await openView(view);

      expect(screen.getByText(COVERAGE)).toBeInTheDocument();
      expect(
        screen.getByText(
          'Cairn counts only while it is running. This is what it saw over these days.',
        ),
      ).toBeInTheDocument();
    },
  );

  it('says no number, rank or verdict in the sentence', () => {
    expect(NOT_COUNTING).not.toMatch(/\d|top|most|worst|best|failed|denied|violation/i);
  });

  it('makes one read for all four views and says the same in each', async () => {
    let reads = 0;
    const counted = readOf(() => (reads++, sawNone()));
    const user = await openView('By site', counted);
    for (const view of ['By hour', 'By day', 'Day by day'] as const) {
      await user.click(screen.getByRole('button', { name: view }));
      expect(rightPage().textContent).toContain(NOT_COUNTING);
    }

    expect(reads).toBe(1);
  });

  it('never says it of an answer with no rows', async () => {
    await openView('By hour', readOf(() => sawNone([])));
    await waitFor(() => expect(lines()).toHaveLength(24));

    expect(screen.queryByText(NOT_COUNTING)).toBeNull();
    expect(rightPage().firstElementChild!.textContent).toBe(QUIET);
  });

  it('never hides a count: a row sent as none with a reach is partly seen, so the sentence is not said', async () => {
    const rows = unseenRows();
    rows[3] = { ...rows[3]!, count: 2 };
    await openView('By site', readOf(() => ({ ...sawNone(rows), by_site: [{ domain: 'a.example', count: 2 }] })));

    expect(screen.queryByText(NOT_COUNTING)).toBeNull();
    expect(lines()).toHaveLength(1);
  });
});

describe('a range Cairn saw part of, with no reach', () => {
  it.each(['part', 'whole'] as const)('keeps the quiet sentence and its rows when one row is %s', async (seen) => {
    const rows = unseenRows();
    rows[5] = { ...rows[5]!, seen };
    await openView('By hour', readOf(() => sawNone(rows)));
    await waitFor(() => expect(lines()).toHaveLength(24));

    expect(rightPage().firstElementChild!.textContent).toBe(QUIET);
    expect(screen.queryByText(NOT_COUNTING)).toBeNull();
  });

  it('keeps Day by day not seen on the rows it did not see', async () => {
    const rows = unseenRows();
    rows[5] = { ...rows[5]!, seen: 'part' };
    await openView('Day by day', readOf(() => sawNone(rows)));
    await waitFor(() => expect(lines()).toHaveLength(28));

    expect(rightPage().firstElementChild!.textContent).toBe(QUIET);
    expect(lines()[4]!.textContent).toContain('not seen');
  });
});
