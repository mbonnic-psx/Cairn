/**
 * The reaches screen, over time, by hour (slice `history-by-hour`, plan scenarios 18 to 25).
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module. The zone is
 * fixed before any date is made: London changes its clocks at 01:00 UTC on 25 October 2026, so
 * the 4 weeks ending 2 November hold a change.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { OffsetChange, Patterns, TodaysReaches } from '../../ipc/reaches';
import { shown } from './countText';
import { Reaches, type ReachesReader } from '../Reaches';

/** Monday 2 November 2026, 20:00 in London. */
const NOW = new Date(2026, 10, 2, 20, 0);
const seconds = (d: Date) => Math.round(d.getTime() / 1000);
/** 2026-10-25 01:00 UTC: the clocks go back. */
const AUTUMN = 1_792_890_000;

const quietDay: TodaysReaches = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  sealed: null,
};

/** 24 hours, from midnight, with `counts` at the hours named and zero everywhere else. */
const hours = (counts: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts[hour] ?? 0 }));

const patterns = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'a.example', count: 5 },
    { domain: 'b.example', count: 2 },
  ],
  by_hour: hours({ 2: 2, 14: 6, 15: 3 }),
  by_weekday: [],
  movement: [],
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

async function openByHour(read: ReachesReader) {
  const opened = await openOverTime(read);
  await screen.findByRole('button', { name: 'By hour' });
  await opened.user.click(screen.getByRole('button', { name: 'By hour' }));
  return opened;
}

const text = () => document.body.textContent ?? '';
/** The time as the Today log prints it: the same call, made for the hour in London. */
const label = (hour: number) =>
  new Date(2000, 0, 1, hour).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const NO_HOUR = 'because an estimate has no hour.';

describe('Seen by: By site | By hour | By day', () => {
  it('stands under the range with By site pressed, and By hour not', async () => {
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
    // Under the date boxes, and not in the header.
    const boxes = screen.getByLabelText('To').closest('div') as HTMLElement;
    expect(
      boxes.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it.each([
    ['looking', () => new Promise<Patterns>(() => undefined)],
    ['could not read', () => Promise.reject(new Error('no history'))],
    [
      'sealed',
      async () => patterns({ by_site: [], by_hour: [], sealed: 'Sealed for now.' }),
    ],
  ])('is there while the screen is %s, and never moves', async (_state, answer) => {
    const { read } = fakeRead(answer);
    await openOverTime(read);
    const group = screen.getByRole('group', { name: 'Seen by' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole('group', { name: 'Seen by' })).toBe(group);
  });

  it('shows the hours when By hour is chosen, for the same range, with no second read', async () => {
    const { calls, read } = fakeRead();
    const { user } = await openOverTime(read);
    await screen.findByText('a.example');

    await user.click(screen.getByRole('button', { name: 'By hour' }));

    expect(screen.getByRole('button', { name: 'By hour' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'By site' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByText('a.example')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(24);
    expect(calls).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'By site' }));
    expect(screen.getByText('a.example')).toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it('reads again when From changes, and stays on By hour', async () => {
    const { calls, read } = fakeRead();
    await openByHour(read);
    await screen.findAllByRole('listitem');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-10' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].slice(0, 2)).toEqual(['2026-10-10', '2026-11-02']);
    expect(screen.getByRole('button', { name: 'By hour' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findAllByRole('listitem')).toHaveLength(24);
  });

  it('is forgotten on going to Today and back: 4 weeks and By site again', async () => {
    const { read } = fakeRead();
    const { user } = await openByHour(read);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-10' } });
    await screen.findAllByRole('listitem');

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
  it('sends the range, its bounds and the offsets the clock has across it', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

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

  it('sends the offsets of the new range when From changes', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-26' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1][4]).toEqual([{ from: seconds(new Date(2026, 9, 26)), offset: 0 }]);
  });
});

describe('how the hours read', () => {
  it('lists 24 hours in order from midnight, each named, counted as text and barred against the largest', async () => {
    const { read } = fakeRead();
    await openByHour(read);

    const lines = await screen.findAllByRole('listitem');
    expect(lines).toHaveLength(24);
    lines.forEach((line, hour) => {
      expect(within(line).getByText(label(hour))).toBeInTheDocument();
    });
    const counts = { 2: 2, 14: 6, 15: 3 } as Record<number, number>;
    lines.forEach((line, hour) => {
      const count = counts[hour] ?? 0;
      expect(shown(line)).toBe(`${label(hour)}${count}`);
      const bar = within(line).getByTestId('bar');
      expect(bar.style.width).toBe(`${Math.round((count / 6) * 100)}%`);
      expect(bar.parentElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('shows an hour with nothing as plainly as any other: 0 and an empty bar', async () => {
    const { read } = fakeRead();
    await openByHour(read);

    const lines = await screen.findAllByRole('listitem');
    const midnight = lines[0];
    expect(shown(midnight)).toBe(`${label(0)}0`);
    expect(within(midnight).getByTestId('bar').style.width).toBe('0%');
    // And not marked in any way that the others are not.
    expect(midnight.className).toBe(lines[14].className);
  });

  it('has no ranking, comparing or praising word', async () => {
    const { read } = fakeRead();
    await openByHour(read);
    await screen.findAllByRole('listitem');

    expect(text()).not.toMatch(
      /peak|worst|best|busiest|quietest|\btop\b|rank|most|least|more than|less than|compared|well done|great|good|calm|quiet hour/i,
    );
  });
});

describe('what is said above the hours', () => {
  it('puts the coverage note above them, the standing sentence last on the left page, the hours on the right', async () => {
    const { read } = fakeRead(async () =>
      patterns({ coverage_note: 'Cairn was not running for 3 days in this range.' }),
    );
    await openByHour(read);
    const lines = await screen.findAllByRole('listitem');

    const note = screen.getByText('Cairn was not running for 3 days in this range.');
    expect(
      note.compareDocumentPosition(lines[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const standing = screen.getByText(
      'Cairn counts only while it is running. This is what it saw over these days.',
    );
    const [left, right] = Array.from(
      document.querySelectorAll<HTMLElement>('.nb-spread > .nb-page'),
    );
    expect(left!.lastElementChild).toBe(standing);
    expect(right!.querySelectorAll('li')).toHaveLength(24);
    expect(left!.querySelector('li')).toBeNull();
  });

  it('says several estimates have no hour, above the hours', async () => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: 2 }));
    await openByHour(read);
    const lines = await screen.findAllByRole('listitem');

    const sentence = screen.getByText(
      `Your own estimates for 2 days are not counted here, ${NO_HOUR}`,
    );
    expect(
      sentence.compareDocumentPosition(lines[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('says one estimate has no hour', async () => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: 1 }));
    await openByHour(read);
    await screen.findAllByRole('listitem');

    expect(
      screen.getByText(`Your own estimate for 1 day is not counted here, ${NO_HOUR}`),
    ).toBeInTheDocument();
  });

  it('keeps saying no site on By site, and says nothing when there are none', async () => {
    const withEstimates = fakeRead(async () => patterns({ estimates_excluded: 2 }));
    const { user } = await openOverTime(withEstimates.read);
    expect(
      await screen.findByText(
        'Your own estimates for 2 days are not counted here, because an estimate has no site.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'By hour' }));
    expect(text()).not.toMatch(/has no site/);
  });

  it('says nothing of estimates when there are none', async () => {
    const { read } = fakeRead();
    await openByHour(read);
    await screen.findAllByRole('listitem');

    expect(text()).not.toMatch(/estimate/i);
  });

  it('closes the view with the standing sentence on both views', async () => {
    const { read } = fakeRead();
    const { user } = await openOverTime(read);
    const standing =
      'Cairn counts only while it is running. This is what it saw over these days.';
    expect(await screen.findByText(standing)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'By hour' }));
    expect(screen.getByText(standing)).toBeInTheDocument();
  });
});

describe('a quiet range', () => {
  it('says there is nothing here where the list begins, with the 24 hours under it, each 0', async () => {
    const { read } = fakeRead(async () => patterns({ by_site: [], by_hour: hours() }));
    await openByHour(read);

    const sentence = await screen.findByText('Nothing here for these days.');
    const lines = screen.getAllByRole('listitem');
    expect(lines).toHaveLength(24);
    expect(
      sentence.compareDocumentPosition(lines[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    lines.forEach((line, hour) => expect(shown(line)).toBe(`${label(hour)}0`));
    expect(text()).not.toMatch(/well done|great|good|calm|nothing to worry|keep it up/i);
  });
});

describe('sealed, and a read that throws', () => {
  it('shows the sentence and no hours when sealed, as By site does', async () => {
    const { read } = fakeRead(async () =>
      patterns({
        by_site: [],
        by_hour: [],
        sealed: 'Cairn cannot open your history just now.',
      }),
    );
    const { user } = await openOverTime(read);
    await screen.findByText('Cairn cannot open your history just now.');
    const bySite = document.body.textContent;

    await user.click(screen.getByRole('button', { name: 'By hour' }));

    expect(
      screen.getByText('Cairn cannot open your history just now.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(document.body.textContent).toBe(bySite);
  });

  it('shows the same could-not-read sentence and no hours when the read throws', async () => {
    const { read } = fakeRead(() => Promise.reject(new Error('no history')));
    const { user } = await openOverTime(read);
    await screen.findByText(
      'Cairn could not read your history just now. Protection is unaffected.',
    );
    const bySite = document.body.textContent;

    await user.click(screen.getByRole('button', { name: 'By hour' }));

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(document.body.textContent).toBe(bySite);
  });
});

describe('what it never says', () => {
  it('does not speak of approximation, whatever the field holds', async () => {
    const { read } = fakeRead(async () => patterns({ dst_approximate: true }));
    await openByHour(read);
    await screen.findAllByRole('listitem');

    expect(text()).not.toMatch(
      /approximate|approximately|roughly|daylight|clock change|may be off/i,
    );
  });

  it('holds no streak, day count, chain or banned word, and no control over protection', async () => {
    const { read } = fakeRead(async () =>
      patterns({ coverage_note: null, estimates_excluded: 2 }),
    );
    await openByHour(read);
    await screen.findAllByRole('listitem');

    expect(text()).not.toMatch(
      /streak|day \d|days? in a row|in a row|chain|failed|denied|violation|relapse|forbidden|you lost/i,
    );
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Today',
      'Over time',
      'By site',
      'By hour',
      'By day',
      'Day by day',
    ]);
  });
});
