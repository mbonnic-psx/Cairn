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
import { clockTimeInWords, shortDateInWords } from '../../localDays';
import { Reaches, type ReachesReader } from '../Reaches';
import { expectStartVoice, startSentences } from './startSentences';

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
    // The sentence is made from the first count's own date, not the capped limit.
    expect(screen.getByText('Cairn started counting on Oct 5, 2026.')).toBeInTheDocument();
    expect(screen.queryByText(/started counting on Oct 2/)).toBeNull();
  });

  it('leaves From as it was for a sealed answer (scenario 33)', async () => {
    const { calls, read } = fakeRead([patterns({ by_site: [], sealed: 'Cairn could not read your history just now.' })]);
    await openOverTime(read);
    await screen.findByText(/could not read your history/);

    expect(calls).toHaveLength(1);
    expect(screen.getByLabelText('From')).not.toHaveAttribute('min');
  });
});

describe('where Cairn has never counted, From and To are held at today (rule 11, scenario 28)', () => {
  it('asks for today alone and reads today in both boxes', async () => {
    const { calls, read } = fakeRead([patterns({ first_counted: null, by_site: [] })]);
    await openOverTime(read);
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(calls.map(([from, to]) => [from, to])).toEqual([
      ['2026-09-05', '2026-10-02'],
      ['2026-10-02', '2026-10-02'],
    ]);
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-02');
    expect(screen.getByLabelText('To')).toHaveValue('2026-10-02');
    expect(screen.getByLabelText('From')).toHaveAttribute('min', '2026-10-02');
    expect(document.body.textContent).not.toMatch(/started counting/);
  });

  it('keeps M13 where every row is unseen', async () => {
    const unseen: MovementRow = { day: '2026-10-02', days: 1, span: 'day', count: 0, seen: 'none', so_far: true };
    const { read } = fakeRead([patterns({ first_counted: null, by_site: [], movement: [unseen] })]);
    await openOverTime(read);

    expect(await screen.findByText("Cairn wasn't counting on these days.")).toBeInTheDocument();
  });
});

const STANDING = 'Cairn counts only while it is running. This is what it saw over these days.';
const VIEWS = ['By site', 'By hour', 'By day', 'Day by day'];

describe('one sentence names the start, and M16 stays (rule 12)', () => {
  it("says the day beside the date boxes when the range does not hold the first count (scenario 29)", async () => {
    const { read } = fakeRead([patterns({ first_counted: EARLY })]);
    await openOverTime(read);
    await screen.findByText('a.example');

    const found = startSentences();
    expect(found).toHaveLength(1);
    expect(found[0]!.textContent).toBe(`Cairn started counting on ${shortDateInWords('2025-01-01', true)}.`);
    expectStartVoice(found[0]!.textContent!);
    expect(screen.queryByText(/Cairn started counting at/)).toBeNull();
  });

  it.each(VIEWS)('says the time and day among the notes, before a coverage note, in %s (scenario 30)', async (view) => {
    const { read } = fakeRead([
      patterns({ first_counted: FIRST, coverage_note: 'Cairn was not counting for 2 hours.' }),
    ]);
    const user = await openOverTime(read);
    await screen.findByText(STANDING);
    await user.click(screen.getByRole('button', { name: view }));

    const found = startSentences();
    expect(found).toHaveLength(1);
    expect(found[0]!.textContent).toBe(
      `Cairn started counting at ${clockTimeInWords(FIRST)} on ${shortDateInWords('2026-10-01', false)}.`,
    );
    expectStartVoice(found[0]!.textContent!);
    const note = screen.getByText('Cairn was not counting for 2 hours.');
    expect(found[0]!.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/Cairn started counting on/)).toBeNull();
  });

  it('writes the year when the range names it (scenario 31)', async () => {
    const first = seconds(new Date(2026, 11, 20, 9, 5));
    const { read } = fakeRead([patterns({ first_counted: first })]);
    await openOverTime(read, new Date(2027, 0, 10, 20, 0));
    await screen.findByText(STANDING);

    expect(startSentences()[0]!.textContent).toBe(
      `Cairn started counting at ${clockTimeInWords(first)} on ${shortDateInWords('2026-12-20', true)}.`,
    );
  });

  it('reads the time before the first count as not seen, with no clause about the start (scenario 32)', async () => {
    const row = (day: string, seen: MovementRow['seen'], count: number): MovementRow => ({
      day,
      days: 1,
      span: 'day',
      count,
      seen,
      so_far: false,
    });
    const { read } = fakeRead([
      patterns({
        first_counted: FIRST,
        movement: [row('2026-09-30', 'none', 0), row('2026-10-01', 'part', 3), row('2026-10-02', 'whole', 1)],
      }),
    ]);
    const user = await openOverTime(read);
    await screen.findByText(STANDING);
    await user.click(screen.getByRole('button', { name: 'Day by day' }));

    const lines = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(lines[0]).toContain('not seen');
    expect(lines[1]).toContain('partly seen');
    expect(lines[1]).toContain('3');
    for (const line of lines) expect(line).not.toMatch(/started/i);
  });

  it('draws neither sentence while looking, when unreadable or sealed (scenario 33)', async () => {
    const never = new Promise<Patterns>(() => undefined);
    const looking: ReachesReader = { listTodaysReaches: async () => quietDay, summarizeReaches: () => never };
    await openOverTime(looking);
    expect(startSentences()).toHaveLength(0);
  });

  it('closes every state that draws a list with the standing sentence, unchanged (scenario 34)', async () => {
    for (const first of [FIRST, EARLY]) {
      const { read } = fakeRead([patterns({ first_counted: first })]);
      const { unmount } = render(<Reaches read={read} now={() => NOW} />);
      await userEvent.setup().click(await screen.findByRole('button', { name: 'Over time' }));
      expect(await screen.findByText(STANDING)).toBeInTheDocument();
      unmount();
    }
  });
});

describe('Today says when Cairn started counting, on the first day only (rule 9, scenario 35)', () => {
  const SAME_DAY = new Date(2026, 9, 1, 20, 0);
  const idle: ReachesReader = {
    listTodaysReaches: async () => quietDay,
    summarizeReaches: async () => patterns(),
  };
  const today = (over: Partial<TodaysReaches>): TodaysReaches => ({ ...quietDay, ...over });

  it('stands under the title and before the standing note', () => {
    render(<Reaches today={today({ first_counted: FIRST })} read={idle} now={() => SAME_DAY} />);

    const found = startSentences();
    expect(found).toHaveLength(1);
    expect(found[0]!.textContent).toBe(`Cairn started counting at ${clockTimeInWords(FIRST)} today.`);
    expectStartVoice(found[0]!.textContent!);
    const title = screen.getByRole('heading', { name: 'Today' });
    const standing = screen.getByText(/Cairn counts only while it is running/);
    expect(title.compareDocumentPosition(found[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(found[0]!.compareDocumentPosition(standing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    ['another day', today({ first_counted: FIRST }), NOW],
    ['an earlier first count', today({ first_counted: EARLY }), SAME_DAY],
    ['never counted', today({ first_counted: null }), SAME_DAY],
    ['no field', today({}), SAME_DAY],
    ['a sealed answer', today({ first_counted: FIRST, sealed: 'Cairn could not read your history just now.' }), SAME_DAY],
  ])('shows none for %s', (_name, answer, now) => {
    render(<Reaches today={answer} read={idle} now={() => now} />);

    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(startSentences()).toHaveLength(0);
  });
});
