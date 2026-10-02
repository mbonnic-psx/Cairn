/**
 * The reaches screen, over time: a calm list of sites for a range of days.
 *
 * The reader and the clock are passed in as props, so nothing here mocks a module.
 * The zone is fixed before any date is made.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Reaches, type ReachesReader } from '../Reaches';
import type { Patterns, TodaysReaches } from '../../ipc/reaches';

const NOW = new Date(2026, 8, 30, 20, 0);
const seconds = (d: Date) => Math.round(d.getTime() / 1000);

const quietDay: TodaysReaches = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  sealed: null,
};
const patterns = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'a.example', count: 5 },
    { domain: 'b.example', count: 2 },
    { domain: 'c.example', count: 2 },
  ],
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  sealed: null,
  ...over,
});

type Call = [string, string, number, number];

function fakeRead(answer: () => Promise<Patterns> = async () => patterns()) {
  const calls: Call[] = [];
  const read: ReachesReader = {
    listTodaysReaches: async () => quietDay,
    summarizeReaches: (firstDay, lastDay, rangeStart, rangeEnd) => {
      calls.push([firstDay, lastDay, rangeStart, rangeEnd]);
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

const text = () => document.body.textContent ?? '';

describe('Today | Over time', () => {
  it('opens on Today, with a choice of Today and Over time', async () => {
    const { read } = fakeRead();
    render(<Reaches read={read} now={() => NOW} />);

    expect(await screen.findByText(/nothing here for today/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Over time' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('replaces the day with the over-time view on the same screen', async () => {
    const { read } = fakeRead();
    await openOverTime(read);

    expect(await screen.findByText('a.example')).toBeInTheDocument();
    expect(screen.queryByText(/nothing here for today/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Over time' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('the range it opens on', () => {
  it('is the last 4 weeks ending today, asked for with local midnights', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    expect(calls).toEqual([
      [
        '2026-09-03',
        '2026-09-30',
        seconds(new Date(2026, 8, 3)),
        seconds(new Date(2026, 9, 1)),
      ],
    ]);
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-03');
    expect(screen.getByLabelText('To')).toHaveValue('2026-09-30');
  });

  it('asks again for the new range when From changes', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toEqual([
      '2026-09-10',
      '2026-09-30',
      seconds(new Date(2026, 8, 10)),
      seconds(new Date(2026, 9, 1)),
    ]);
  });

  it('asks again for the new range when To changes', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-20' } });

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toEqual([
      '2026-09-03',
      '2026-09-20',
      seconds(new Date(2026, 8, 3)),
      seconds(new Date(2026, 8, 21)),
    ]);
  });

  it('is forgotten on going to Today and back', async () => {
    const { calls, read } = fakeRead();
    const { user } = await openOverTime(read);
    await screen.findByText('a.example');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    await waitFor(() => expect(calls).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: 'Today' }));
    await user.click(screen.getByRole('button', { name: 'Over time' }));

    expect(screen.getByLabelText('From')).toHaveValue('2026-09-03');
    expect(screen.getByLabelText('To')).toHaveValue('2026-09-30');
  });

  it('is forgotten on leaving the screen and returning', async () => {
    const { read } = fakeRead();
    const first = await openOverTime(read);
    await screen.findByText('a.example');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-10' } });
    first.view.unmount();

    await openOverTime(read);

    expect(screen.getByLabelText('From')).toHaveValue('2026-09-03');
  });

  it('bounds To by today and From by To', async () => {
    const { calls, read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    expect(screen.getByLabelText('To')).toHaveAttribute('max', '2026-09-30');
    expect(screen.getByLabelText('To')).toHaveAttribute('min', '2026-09-03');
    expect(screen.getByLabelText('From')).toHaveAttribute('max', '2026-09-30');

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-02' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } });

    expect(calls).toHaveLength(1);
    expect(screen.getByLabelText('To')).toHaveValue('2026-09-30');
    expect(screen.getByLabelText('From')).toHaveValue('2026-09-03');
  });
});

describe('how it reads', () => {
  it('keeps the order given, each site with its count and a bar', async () => {
    const { read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'a.example5',
      'b.example2',
      'c.example2',
    ]);
    for (const li of items) {
      expect(within(li).getAllByTestId('bar')).toHaveLength(1);
    }
  });

  it('makes each bar as long as its count against the largest, all one colour, hidden from readers', async () => {
    const { read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    const bars = screen.getAllByTestId('bar');
    expect(bars.map((b) => b.style.width)).toEqual(['100%', '40%', '40%']);
    expect(new Set(bars.map((b) => b.className)).size).toBe(1);
    for (const bar of bars) {
      expect(bar.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('uses no ranking word, no comparison, and no praise', async () => {
    const { read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    expect(text().toLowerCase()).not.toMatch(
      /\b(top|worst|best|most problematic|rank|ranking|well done|congratulations|good job|only \d|compared|last month|previous|than before|total)\b/,
    );
  });

  it('says a quiet range is quiet, plainly, with the standing sentence', async () => {
    const { read } = fakeRead(async () => patterns({ by_site: [] }));
    await openOverTime(read);

    expect(await screen.findByText('Nothing here for these days.')).toBeInTheDocument();
    expect(screen.getByText(/counts only while it is running/i)).toBeInTheDocument();
    expect(text().toLowerCase()).not.toMatch(/great|proud|perfect|clean|warning|careful/);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('puts the standing sentence under the list', async () => {
    const { read } = fakeRead();
    await openOverTime(read);
    const list = await screen.findByRole('list');
    const standing = screen.getByText(/counts only while it is running/i);

    expect(
      list.compareDocumentPosition(standing) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('what Cairn did not see, above the list', () => {
  it('states the coverage note above the list', async () => {
    const note =
      'Cairn was not running for about 3 hours of these days, so anything you reached for then is not here.';
    const { read } = fakeRead(async () => patterns({ coverage_note: note }));
    await openOverTime(read);
    const list = await screen.findByRole('list');
    const noteEl = screen.getByText(note);

    expect(
      noteEl.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('says own estimates for 2 days are not in the list, above it', async () => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: 2 }));
    await openOverTime(read);
    const list = await screen.findByRole('list');
    const sentence = screen.getByText(
      /your own estimates for 2 days are not counted here/i,
    );

    expect(sentence.textContent).toMatch(/an estimate has no site/i);
    expect(
      sentence.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('says one day in the singular', async () => {
    const { read } = fakeRead(async () => patterns({ estimates_excluded: 1 }));
    await openOverTime(read);

    expect(
      await screen.findByText(/your own estimate for 1 day is not counted here/i),
    ).toBeInTheDocument();
  });

  it('says nothing of estimates when there are none', async () => {
    const { read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    expect(text().toLowerCase()).not.toContain('estimate');
  });
});

describe('when it cannot be shown', () => {
  it('shows the sealed sentence and no list', async () => {
    const sealed =
      'Your keychain is locked, so your history stays sealed until it is unlocked. Protection is unaffected, and Cairn keeps recording.';
    const { read } = fakeRead(async () => patterns({ sealed, by_site: [] }));
    await openOverTime(read);

    expect(await screen.findByText(sealed)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/nothing here for these days/i)).not.toBeInTheDocument();
  });

  it('shows one plain sentence when the read throws, never the error', async () => {
    const { read } = fakeRead(async () => {
      throw new Error('ECONNRESET at ipc://summarize_reaches');
    });
    await openOverTime(read);

    expect(
      await screen.findByText(
        'Cairn could not read your history just now. Protection is unaffected.',
      ),
    ).toBeInTheDocument();
    expect(text()).not.toContain('ECONNRESET');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('what the view never holds', () => {
  const states: Array<[string, Patterns]> = [
    ['a list', patterns()],
    ['a quiet range', patterns({ by_site: [] })],
    [
      'a note and estimates',
      patterns({
        coverage_note: 'Cairn was not running for about 2 days across these days.',
        estimates_excluded: 3,
      }),
    ],
    [
      'sealed',
      patterns({
        sealed: 'Your history stays sealed until the keychain is unlocked.',
        by_site: [],
      }),
    ],
  ];

  for (const [name, answer] of states) {
    it(`has no streak, day count, chain or banned word: ${name}`, async () => {
      const { read } = fakeRead(async () => answer);
      await openOverTime(read);
      await waitFor(() => expect(screen.queryByText('Looking…')).not.toBeInTheDocument());

      expect(text()).not.toMatch(/streak|\bday \d|\bchain\b|in a row|consecutive/i);
      expect(text()).not.toMatch(/failed|denied|violation|relapsed|forbidden|you lost/i);
    });
  }

  it('offers nothing that changes protection', async () => {
    const { read } = fakeRead();
    await openOverTime(read);
    await screen.findByText('a.example');

    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Today', 'Over time']);
    expect(text()).not.toMatch(/\b(unblock|pause|turn off|allow|snooze|disable)\b/i);
  });
});
