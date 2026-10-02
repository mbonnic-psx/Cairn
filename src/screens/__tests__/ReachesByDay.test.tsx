/**
 * The reaches screen, over time, by day of the week (slice `history-by-weekday`, plan scenarios 22
 * to 29; gaps review W1 to W9).
 *
 * The reader, the clock and the week's first day are passed in as props, so nothing here mocks a
 * module. The zone is fixed before any date is made: London changes its clocks at 01:00 UTC on 25
 * October 2026, so the 4 weeks ending 2 November hold a change. Every name is made by the same
 * `weekdayInWords` the screen uses, and every clause by `acrossInWords`, so the runner's locale
 * does not matter.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { OffsetChange, Patterns, TodaysReaches } from '../../ipc/reaches';
import { acrossInWords, weekdayInWords } from '../../localDays';
import { Reaches, type ReachesReader } from '../Reaches';

/** Monday 2 November 2026, 20:00 in London. */
const NOW = new Date(2026, 10, 2, 20, 0);
const seconds = (d: Date) => Math.round(d.getTime() / 1000);
/** 2026-10-25 01:00 UTC: the clocks go back. */
const AUTUMN = 1_792_890_000;

const MONDAY = 0;
const SATURDAY = 5;
const SUNDAY = 6;

const quietDay: TodaysReaches = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  sealed: null,
};

const hours = (counts: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts[hour] ?? 0 }));

/** Seven entries in the core's order, Monday first; `held` is how many of each day the range holds. */
const week = (counts: Record<number, number> = {}, held: number | number[] = 4) =>
  Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    count: counts[weekday] ?? 0,
    days: typeof held === 'number' ? held : held[weekday],
  }));

const patterns = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'a.example', count: 5 },
    { domain: 'b.example', count: 2 },
  ],
  by_hour: hours({ 14: 6 }),
  by_weekday: week({ 0: 2, 2: 1 }),
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

async function openOverTime(read: ReachesReader, firstDay = MONDAY) {
  const user = userEvent.setup();
  const view = render(<Reaches read={read} now={() => NOW} firstDay={firstDay} />);
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  return { user, view };
}

async function openByDay(read: ReachesReader, firstDay = MONDAY) {
  const opened = await openOverTime(read, firstDay);
  await opened.user.click(await screen.findByRole('button', { name: 'By day' }));
  return opened;
}

const text = () => document.body.textContent ?? '';
const lines = () => screen.queryAllByRole('listitem');

/** What a line says, in the order it says it: the leaves of its markup. */
const leaves = (line: HTMLElement) =>
  Array.from(line.querySelectorAll('*'))
    .filter((el) => el.children.length === 0 && el.textContent)
    .map((el) => el.textContent as string);

const barOf = (line: HTMLElement) => within(line).queryByTestId('bar');

describe('Seen by: By site | By hour | By day', () => {
  it('stands under the range with By site pressed, then By hour and By day not', async () => {
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
    ]);
  });

  it('shows the days when By day is chosen, for the same range, with no second read', async () => {
    const { calls, read } = fakeRead();
    const { user } = await openOverTime(read);
    await screen.findByText('a.example');

    await user.click(screen.getByRole('button', { name: 'By day' }));

    expect(screen.getByRole('button', { name: 'By day' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'By site' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByText('a.example')).not.toBeInTheDocument();
    expect(lines()).toHaveLength(7);
    expect(calls).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'By site' }));
    expect(screen.getByText('a.example')).toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it('reads again when From changes, and stays on By day', async () => {
    const { calls, read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-10' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].slice(0, 2)).toEqual(['2026-10-10', '2026-11-02']);
    expect(screen.getByRole('button', { name: 'By day' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() => expect(lines()).toHaveLength(7));
  });

  it('is forgotten on going to Today and back: 4 weeks and By site again', async () => {
    const { read } = fakeRead();
    const { user } = await openByDay(read);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-10' } });
    await waitFor(() => expect(lines()).toHaveLength(7));

    await user.click(screen.getByRole('button', { name: 'Today' }));
    await user.click(screen.getByRole('button', { name: 'Over time' }));

    expect(await screen.findByText('a.example')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-06');
    expect(screen.getByRole('button', { name: 'By site' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('what it asks for', () => {
  it('sends the range, its bounds and the offsets the clock has across it, as By hour does', async () => {
    const { calls, read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    expect(calls).toEqual([
      [
        '2026-10-06',
        '2026-11-02',
        seconds(new Date(2026, 9, 6)),
        seconds(new Date(2026, 10, 3)),
        [
          { from: seconds(new Date(2026, 9, 6)), offset: 3600 },
          { from: AUTUMN, offset: 0 },
        ],
      ],
    ]);
  });

  it('sends nothing about the week, whichever day it begins on', async () => {
    const { calls, read } = fakeRead();
    await openByDay(read, SUNDAY);
    await waitFor(() => expect(lines()).toHaveLength(7));

    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0])).not.toMatch(/week|first_?day/i);
    expect(calls[0]).toHaveLength(5);
  });
});

describe('the week’s order (W2)', () => {
  const names = (order: number[]) => order.map((weekday) => weekdayInWords(weekday));
  const shown = () => lines().map((line) => leaves(line)[0]);

  it('runs Sunday to Saturday when the week begins on Sunday', async () => {
    const { read } = fakeRead();
    await openByDay(read, SUNDAY);
    await waitFor(() => expect(lines()).toHaveLength(7));
    expect(shown()).toEqual(names([6, 0, 1, 2, 3, 4, 5]));
  });

  it('runs Monday to Sunday when the week begins on Monday', async () => {
    const { read } = fakeRead();
    await openByDay(read, MONDAY);
    await waitFor(() => expect(lines()).toHaveLength(7));
    expect(shown()).toEqual(names([0, 1, 2, 3, 4, 5, 6]));
  });

  it('runs Saturday to Friday when the week begins on Saturday', async () => {
    const { read } = fakeRead();
    await openByDay(read, SATURDAY);
    await waitFor(() => expect(lines()).toHaveLength(7));
    expect(shown()).toEqual(names([5, 6, 0, 1, 2, 3, 4]));
  });

  it('takes each line’s count from its own weekday, even when the answer lists them in another order', async () => {
    // Monday 2, Wednesday 1 - but the entries come in a scrambled order.
    const scrambled = week({ 0: 2, 2: 1 });
    const answer = patterns({
      by_weekday: [3, 6, 0, 5, 1, 4, 2].map((index) => scrambled[index]),
    });
    const { read } = fakeRead(async () => answer);
    await openByDay(read, SUNDAY);
    await waitFor(() => expect(lines()).toHaveLength(7));

    const byName = Object.fromEntries(
      lines().map((line) => [leaves(line)[0], leaves(line)[2]]),
    );
    expect(byName[weekdayInWords(MONDAY)]).toBe('2');
    expect(byName[weekdayInWords(2)]).toBe('1');
    expect(byName[weekdayInWords(SUNDAY)]).toBe('0');
    expect(shown()).toEqual(names([6, 0, 1, 2, 3, 4, 5]));
  });
});

describe('how a day reads (W3, W4, B3)', () => {
  it('has seven lines, each with its name, its clause, its count as text and a bar', async () => {
    const { read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    lines().forEach((line, weekday) => {
      const count = { 0: '2', 2: '1' }[weekday as 0 | 2] ?? '0';
      expect(leaves(line)).toEqual([
        weekdayInWords(weekday),
        acrossInWords(weekday, 4),
        count,
      ]);
      expect(barOf(line)).not.toBeNull();
    });
  });

  it('draws each bar against the largest day', async () => {
    const { read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    const widths = lines().map((line) => barOf(line)?.style.width);
    expect(widths).toEqual(['100%', '0%', '50%', '0%', '0%', '0%', '0%']);
  });

  it('shows a day with no reaches as plainly as any other: 0 and an empty bar', async () => {
    const { read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    const tuesday = lines()[1];
    expect(leaves(tuesday)).toEqual([weekdayInWords(1), 'across 4 ' + weekdayInWords(1) + 's', '0']);
    expect(barOf(tuesday)?.style.width).toBe('0%');
  });

  it('names a weekday the range does not hold, with not in these days, and no count or bar (W7)', async () => {
    // Friday 2026-09-11 to Sunday 2026-09-13: the range holds a Friday, a Saturday and a Sunday.
    const answer = patterns({
      by_weekday: week({ 4: 2, 6: 1 }, [0, 0, 0, 0, 1, 1, 1]),
    });
    const { read } = fakeRead(async () => answer);
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    for (const weekday of [0, 1, 2, 3]) {
      const line = lines()[weekday];
      expect(leaves(line)).toEqual([weekdayInWords(weekday), 'not in these days']);
      expect(barOf(line)).toBeNull();
    }
    expect(leaves(lines()[4])).toEqual([weekdayInWords(4), acrossInWords(4, 1), '2']);
    expect(leaves(lines()[5])).toEqual([weekdayInWords(5), acrossInWords(5, 1), '0']);
    expect(barOf(lines()[5])?.style.width).toBe('0%');
    expect(barOf(lines()[6])?.style.width).toBe('50%');
  });

  it('says across 1 and the name for a one-day range', async () => {
    const answer = patterns({
      by_weekday: week({ 1: 3 }, [0, 1, 0, 0, 0, 0, 0]),
    });
    const { read } = fakeRead(async () => answer);
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    expect(leaves(lines()[1])).toEqual([weekdayInWords(1), `across 1 ${weekdayInWords(1)}`, '3']);
  });

  it('uses no ranking, averaging or comparing word', async () => {
    const { read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    expect(text()).not.toMatch(
      /\b(peak|worst|best|busiest|quietest|top|rank\w*|average|per day|most|least|more than|less than)\b/i,
    );
  });
});

describe('stated above the days (H4, H5, W6)', () => {
  const NOTE = 'Cairn was not running for 3 days in this range, so this may not be everything.';
  const SAW = 'because Cairn counts only what it saw.';

  it('puts the coverage note, then the estimates sentence, above the days', async () => {
    const { read } = fakeRead(async () =>
      patterns({ coverage_note: NOTE, estimates_excluded: 2 }),
    );
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    const note = screen.getByText(NOTE);
    const estimates = screen.getByText(
      `Your own estimates for 2 days are not counted here, ${SAW}`,
    );
    const firstLine = lines()[0];
    for (const above of [note, estimates]) {
      expect(
        above.compareDocumentPosition(firstLine) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(
      note.compareDocumentPosition(estimates) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('says estimate for 1 day', async () => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: 1 }));
    await openByDay(read);
    expect(
      await screen.findByText(`Your own estimate for 1 day is not counted here, ${SAW}`),
    ).toBeInTheDocument();
  });

  it('leaves By site and By hour saying no site and no hour', async () => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: 2 }));
    const { user } = await openOverTime(read);
    expect(
      await screen.findByText(
        'Your own estimates for 2 days are not counted here, because an estimate has no site.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'By hour' }));
    expect(
      screen.getByText(
        'Your own estimates for 2 days are not counted here, because an estimate has no hour.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'By day' }));
    expect(text()).not.toContain('no site');
    expect(text()).not.toContain('no hour');
  });

  it('has no such sentence when there are no estimates', async () => {
    const { read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));
    expect(text()).not.toMatch(/Your own estimate/);
  });

  it('closes with the standing sentence', async () => {
    const { read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));
    expect(
      screen.getByText(
        'Cairn counts only while it is running. This is what it saw over these days.',
      ),
    ).toBeInTheDocument();
  });
});

describe('a quiet range, sealed, and unreadable', () => {
  it('says there is nothing, and still shows the seven days under it', async () => {
    const answer = patterns({ by_site: [], by_hour: hours(), by_weekday: week() });
    const { read } = fakeRead(async () => answer);
    await openByDay(read);
    const sentence = await screen.findByText('Nothing here for these days.');

    await waitFor(() => expect(lines()).toHaveLength(7));
    expect(
      sentence.compareDocumentPosition(lines()[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(leaves(lines()[0])).toEqual([weekdayInWords(0), acrossInWords(0, 4), '0']);
    expect(text()).not.toMatch(/\b(well done|great|good|nice|keep it up|congratulat\w*)\b/i);
  });

  it('shows the sentence and no days when sealed, as By site does', async () => {
    const { read } = fakeRead(async () =>
      patterns({ by_site: [], by_hour: [], by_weekday: [], sealed: 'Sealed for now.' }),
    );
    await openByDay(read);

    expect(await screen.findByText('Sealed for now.')).toBeInTheDocument();
    expect(lines()).toHaveLength(0);
    expect(screen.getByRole('group', { name: 'Seen by' })).toBeInTheDocument();
  });

  it('shows the one sentence and no days when the read throws, as By site does', async () => {
    const { read } = fakeRead(() => Promise.reject(new Error('no history')));
    await openByDay(read);

    expect(
      await screen.findByText(
        'Cairn could not read your history just now. Protection is unaffected.',
      ),
    ).toBeInTheDocument();
    expect(lines()).toHaveLength(0);
  });
});

describe('voice and the wall (US2 scenario 5, SC-010, Principle I)', () => {
  it.each([
    ['a list', () => patterns()],
    ['a note and estimates', () => patterns({ coverage_note: 'Cairn was not running for 1 day in this range, so this may not be everything.', estimates_excluded: 3 })],
    ['a short range', () => patterns({ by_weekday: week({ 4: 1 }, [0, 0, 0, 0, 1, 1, 1]) })],
    ['a quiet range', () => patterns({ by_site: [], by_hour: hours(), by_weekday: week() })],
  ])('has no streak, day count, chain or banned word: %s', async (_name, answer) => {
    const { read } = fakeRead(async () => answer());
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    expect(text()).not.toMatch(/streak|\bday \d|\bchain\b|in a row|consecutive/i);
    expect(text()).not.toMatch(/failed|denied|violation|relapsed|forbidden|you lost/i);
  });

  it('offers nothing that changes protection', async () => {
    const { read } = fakeRead();
    await openByDay(read);
    await waitFor(() => expect(lines()).toHaveLength(7));

    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Today', 'Over time', 'By site', 'By hour', 'By day']);
    expect(text()).not.toMatch(/\b(unblock|pause|turn off|allow|snooze|disable)\b/i);
  });
});
