/**
 * The Today screen told it is on a notebook page (slice `tonight-page`): the same words as before the
 * notebook, laid out as a spread, in both views. The reader and the clock are plain objects passed as props.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rangeInWords } from '../../localDays';
import type { OffsetChange, Patterns } from '../../ipc/reaches';
import type { Look } from '../../look/look';
import { NotebookShell } from '../../shell/NotebookShell';
import { Reaches } from '../Reaches';
import {
  evening,
  overTimeCases,
  overTimeReader,
  rangeCoverageNote,
  sealedSentence,
  silentReader,
  todayCases,
} from './tonightCases';
import {
  baseline,
  wordsOf,
  BY_DAY_DELTA,
  DAY_BY_DAY_DELTA,
  OVER_TIME,
  TODAY,
} from './beforeTheReveal';

const tabs = [{ id: 'reaches' as const, label: 'Today', current: true }];

/** The look the cases below run in: every case runs in all three. */
let look: Look = 'morning';

function onPage(ui: React.ReactElement) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
      {ui}
    </NotebookShell>,
  );
  const main = view.container.querySelector('main') as HTMLElement;
  const spread = main.querySelector<HTMLElement>('.nb-spread');
  const pages = spread
    ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page'))
    : [];
  return { ...view, main, spread, left: pages[0], right: pages[1], pages };
}

/** The words, wherever they sit: the same reading the baseline gets, so text beside a child element counts on both sides. */
function words(root: HTMLElement): string[] {
  return wordsOf(root);
}

const now = evening;

/** The time as the screen writes it: the same call. */
const timeOf = (seconds: number) =>
  new Date(seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const FALLBACK_NOTE = 'Cairn counts only while it is running. This is what it saw today.';

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (name) => {
  beforeEach(() => {
    look = name;
  });

  describe('the Today screen on a notebook page', () => {
    it('is a spread whose first child is the Which days group, then two pages', () => {
      const { spread } = onPage(<Reaches today={todayCases.sealed} now={now} />);
      expect(spread).not.toBeNull();
      expect(spread).toHaveClass('nb-reaches-leaves');
      const group = spread!.firstElementChild as HTMLElement;
      expect(group).toHaveAttribute('role', 'group');
      expect(group).toHaveAttribute('aria-label', 'Which days');
      const buttons = within(group).getAllByRole('button');
      expect(buttons.map((b) => b.textContent)).toEqual(['Today', 'Over time']);
      expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual([
        'true',
        'false',
      ]);
      expect(spread!.querySelectorAll(':scope > .nb-page')).toHaveLength(2);
    });

    it('looking: "Looking…" and no heading on the left, a ruled empty page on the right', () => {
      const { left, right } = onPage(
        <Reaches today={todayCases.looking} read={silentReader} now={now} />,
      );
      expect(within(left!).getByText('Looking…')).toBeInTheDocument();
      expect(within(left!).queryByRole('heading')).toBeNull();
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(within(right!).queryAllByRole('button')).toHaveLength(0);
    });

    it('sealed: the heading and the sealed sentence on the left, a ruled empty page on the right', () => {
      const { left, right, main } = onPage(
        <Reaches today={todayCases.sealed} now={now} />,
      );
      expect(
        within(left!).getByRole('heading', { level: 2, name: 'Today' }),
      ).toBeInTheDocument();
      expect(left).toHaveTextContent(todayCases.sealed!.sealed!);
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(
        within(main)
          .getAllByRole('heading')
          .map((h) => h.textContent),
      ).toEqual(['Today']);
    });

    it('keeps the Which days group and the pressed button focused across a change of view', async () => {
      const user = userEvent.setup();
      const { spread } = onPage(
        <Reaches today={todayCases.sealed} read={silentReader} now={now} />,
      );
      const group = spread!.firstElementChild as HTMLElement;
      const overTime = within(group).getByRole('button', { name: 'Over time' });
      const todayButton = within(group).getByRole('button', { name: 'Today' });
      await user.click(overTime);
      expect(document.activeElement).toBe(overTime);
      expect(spread!.firstElementChild).toBe(group);
      await user.click(todayButton);
      expect(document.activeElement).toBe(todayButton);
      expect(spread!.firstElementChild).toBe(group);
    });

    it('runs no entrance and sets no inline height or overflow', () => {
      const { main } = onPage(<Reaches today={todayCases.sealed} now={now} />);
      expect(main.querySelector('.settle')).toBeNull();
      for (const el of Array.from(main.querySelectorAll<HTMLElement>('*'))) {
        expect(el.style.height).toBe('');
        expect(el.style.overflow).toBe('');
      }
    });

    it.each(['looking', 'sealed'])(
      'carries no Tailwind utility class in the spread, in Today (%s) or in Over time',
      async (state) => {
        const user = userEvent.setup();
        const { spread } = onPage(
          <Reaches today={todayCases[state]} read={silentReader} now={now} />,
        );
        const notOurs = () =>
          Array.from(spread!.querySelectorAll('*')).flatMap((el) =>
            Array.from(el.classList).filter((c) => !c.startsWith('nb-')),
          );
        expect(notOurs()).toEqual([]);
        await user.click(screen.getByRole('button', { name: 'Over time' }));
        expect(notOurs()).toEqual([]);
      },
    );

    it.each(['looking', 'sealed'])(
      'says the words it said before the notebook: %s',
      (state) => {
        const today = todayCases[state];
        const { spread } = onPage(
          <Reaches today={today} read={silentReader} now={now} />,
        );
        expect(words(spread!)).toEqual(wordsOf(baseline(TODAY[state]!)));
      },
    );

    it('says the words it said before the notebook in Over time', async () => {
      const user = userEvent.setup();
      const { spread } = onPage(
        <Reaches today={todayCases.sealed} read={silentReader} now={now} />,
      );
      await user.click(screen.getByRole('button', { name: 'Over time' }));
      expect(words(spread!)).toEqual(
        wordsOf(baseline(OVER_TIME['looking']!), [BY_DAY_DELTA, DAY_BY_DAY_DELTA]),
      );
    });
  });

  describe('Today with a log on a notebook page', () => {
    const logCases = ['a log, a coverage note', 'a log, the fallback note'] as const;

    it.each(logCases)(
      'left page: "Today", then the note last, set off by its rule: %s',
      (state) => {
        const today = todayCases[state]!;
        const { left } = onPage(<Reaches today={today} now={now} />);
        const heading = within(left!).getByRole('heading', { level: 2, name: 'Today' });
        expect(left!.firstElementChild).toBe(heading);
        const note = left!.lastElementChild as HTMLElement;
        expect(note).toHaveTextContent(today.coverage_note ?? FALLBACK_NOTE);
        expect(note).toHaveClass('nb-reaches-note');
        expect(left!.children).toHaveLength(2);
      },
    );

    it('right page: ruled, one line a reach in the core order, the site then its time', () => {
      const today = todayCases['a log, a coverage note']!;
      const { right } = onPage(<Reaches today={today} now={now} />);
      expect(right).toHaveClass('nb-page--ruled');
      const lines = within(right!).getAllByRole('listitem');
      expect(lines).toHaveLength(today.reaches.length);
      lines.forEach((line, i) => {
        const reach = today.reaches[i]!;
        const [site, time] = Array.from(line.children);
        expect(site).toHaveTextContent(reach.domain);
        expect(site).toHaveClass('nb-reaches-site');
        expect(time).toHaveTextContent(timeOf(reach.at));
        expect(time).toHaveClass('nb-reaches-time');
        expect(line.children).toHaveLength(2);
      });
    });

    it('keeps the note off the right page', () => {
      const today = todayCases['a log, a coverage note']!;
      const { right } = onPage(<Reaches today={today} now={now} />);
      expect(within(right!).queryByText(today.coverage_note!)).toBeNull();
    });

    it('lets forty reaches scroll the page area, with no inline height or overflow', () => {
      const reaches = Array.from({ length: 40 }, (_, i) => ({
        domain: `site-${i}.example`,
        at: 1_790_756_100 + i * 60,
      }));
      const today = { ...todayCases['a log, the fallback note']!, reaches };
      const { right, main } = onPage(<Reaches today={today} now={now} />);
      expect(within(right!).getAllByRole('listitem')).toHaveLength(40);
      for (const el of [main, ...Array.from(main.querySelectorAll<HTMLElement>('*'))]) {
        expect(el.style.height).toBe('');
        expect(el.style.overflow).toBe('');
      }
    });

    it.each(logCases)(
      'says the words it said before the notebook, the note moved: %s',
      (state) => {
        const today = todayCases[state];
        const { spread } = onPage(
          <Reaches today={today} read={silentReader} now={now} />,
        );
        // The words are compared as a sorted set, so where the note sits is the one thing allowed to differ.
        expect(words(spread!)).toEqual(wordsOf(baseline(TODAY[state]!)));
      },
    );
  });

  describe('Today with nothing yet on a notebook page', () => {
    const emptyCases = [
      'nothing yet, a coverage note',
      'nothing yet, the fallback note',
    ] as const;

    it.each(emptyCases)(
      'left page as for a log; right page begins with the sentence: %s',
      (state) => {
        const today = todayCases[state]!;
        const { left, right } = onPage(<Reaches today={today} now={now} />);
        expect(left!.firstElementChild).toHaveTextContent('Today');
        const note = left!.lastElementChild as HTMLElement;
        expect(note).toHaveTextContent(today.coverage_note ?? FALLBACK_NOTE);
        expect(note).toHaveClass('nb-reaches-note');
        expect(right).toHaveClass('nb-page--ruled');
        expect(right!.textContent).toBe('Nothing here for today.');
        expect(within(right!).queryAllByRole('listitem')).toHaveLength(0);
      },
    );

    it('does not put the sentence on the left page', () => {
      const { left } = onPage(<Reaches today={todayCases[emptyCases[0]]} now={now} />);
      expect(within(left!).queryByText('Nothing here for today.')).toBeNull();
    });

    it.each(emptyCases)(
      'says the words it said before the notebook, the note moved: %s',
      (state) => {
        const today = todayCases[state];
        const { spread } = onPage(
          <Reaches today={today} read={silentReader} now={now} />,
        );
        expect(words(spread!)).toEqual(wordsOf(baseline(TODAY[state]!)));
      },
    );
  });

  describe('Over time on a notebook page: looking, could not read, sealed', () => {
    const COULD_NOT_READ =
      'Cairn could not read your history just now. Protection is unaffected.';
    const sentenceFor: Record<string, string | null> = {
      looking: 'Looking…',
      'could not read': COULD_NOT_READ,
      sealed: sealedSentence,
    };
    const RANGE = rangeInWords('2026-09-03', '2026-09-30', '2026-09-30');

    async function overTime(answer: string, extra?: { calls?: Array<[string, string]> }) {
      const user = userEvent.setup();
      const reader = overTimeReader(overTimeCases[answer]!);
      const read = {
        ...reader,
        summarizeReaches: (
          a: string,
          b: string,
          c: number,
          d: number,
          e: OffsetChange[],
        ) => {
          extra?.calls?.push([a, b]);
          return reader.summarizeReaches(a, b, c, d, e);
        },
      };
      const view = onPage(<Reaches today={todayCases.sealed} read={read} now={now} />);
      await user.click(
        within(view.spread!.firstElementChild as HTMLElement).getByRole('button', {
          name: 'Over time',
        }),
      );
      // The view's pages are new elements: find them again.
      const pages = Array.from(
        view.spread!.querySelectorAll<HTMLElement>(':scope > .nb-page'),
      );
      return { ...view, left: pages[0], right: pages[1] };
    }

    it.each(Object.keys(sentenceFor))(
      'left page: the range heading, From and To, then one sentence, last: %s',
      async (state) => {
        const { left } = await overTime(state);
        const sentence = sentenceFor[state]!;
        await waitFor(() => expect(left!.lastElementChild).toHaveTextContent(sentence));
        const [heading, range, seen, last] = Array.from(left!.children) as HTMLElement[];
        expect(left!.children).toHaveLength(4);
        expect(seen).toHaveAttribute('aria-label', 'Seen by');
        expect(heading!.tagName).toBe('H2');
        expect(heading).toHaveTextContent(RANGE);
        expect(within(range!).getByLabelText('From')).toBeInTheDocument();
        expect(within(range!).getByLabelText('To')).toBeInTheDocument();
        expect(last).toHaveClass('nb-reaches-sentence');
      },
    );

    it.each(Object.keys(sentenceFor))(
      'right page: ruled, empty, no control: %s',
      async (state) => {
        const { right, left } = await overTime(state);
        await waitFor(() =>
          expect(left!.lastElementChild).toHaveTextContent(sentenceFor[state]!),
        );
        expect(right).toHaveClass('nb-page--ruled');
        expect(right!.textContent).toBe('');
        expect(within(right!).queryAllByRole('button')).toHaveLength(0);
        expect(right!.querySelector('input')).toBeNull();
      },
    );

    it('draws the date boxes as plain date inputs with the slice class and the rules it had before the reveal', async () => {
      const { left } = await overTime('looking');
      const from = within(left!).getByLabelText('From') as HTMLInputElement;
      const to = within(left!).getByLabelText('To') as HTMLInputElement;
      expect(from).toHaveAttribute('type', 'date');
      expect(to).toHaveAttribute('type', 'date');
      for (const box of [from, to]) {
        expect(box).toHaveClass('nb-reaches-date');
        expect(box.className).not.toMatch(/rounded|border|bg-|px-|py-/);
      }
      expect([from.value, from.max, from.min]).toEqual(['2026-09-03', '2026-09-30', '']);
      expect([to.value, to.max, to.min]).toEqual([
        '2026-09-30',
        '2026-09-30',
        '2026-09-03',
      ]);
    });

    it('re-asks the reader and renames the range when From changes', async () => {
      const calls: Array<[string, string]> = [];
      const { left } = await overTime('sealed', { calls });
      await waitFor(() =>
        expect(left!.lastElementChild).toHaveTextContent(sealedSentence),
      );
      expect(calls).toEqual([['2026-09-03', '2026-09-30']]);
      fireEvent.change(within(left!).getByLabelText('From'), {
        target: { value: '2026-09-10' },
      });
      await waitFor(() => expect(calls).toHaveLength(2));
      expect(calls[1]).toEqual(['2026-09-10', '2026-09-30']);
      expect(within(left!).getByRole('heading', { level: 2 })).toHaveTextContent(
        rangeInWords('2026-09-10', '2026-09-30', '2026-09-30'),
      );
    });

    it('keeps the Which days group the same node, and focus on the button just pressed', async () => {
      const { spread } = await overTime('looking');
      const group = spread!.firstElementChild as HTMLElement;
      expect(document.activeElement).toBe(
        within(group).getByRole('button', { name: 'Over time' }),
      );
      expect(within(group).getByRole('button', { name: 'Over time' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it.each(Object.keys(sentenceFor))(
      'says the words it said before the notebook: %s',
      async (state) => {
        const { spread, left } = await overTime(state);
        await waitFor(() =>
          expect(left!.lastElementChild).toHaveTextContent(sentenceFor[state]!),
        );
        expect(words(spread!)).toEqual(
          wordsOf(baseline(OVER_TIME[state]!), [BY_DAY_DELTA, DAY_BY_DAY_DELTA]),
        );
      },
    );
  });

  describe('Over time with sites on a notebook page', () => {
    const CLOSING =
      'Cairn counts only while it is running. This is what it saw over these days.';
    const ONE =
      'Your own estimate for 1 day is not counted here, because an estimate has no site.';
    const MANY =
      'Your own estimates for 3 days are not counted here, because an estimate has no site.';
    const RANGE = rangeInWords('2026-09-03', '2026-09-30', '2026-09-30');

    const listCases: Array<[string, string[]]> = [
      ['a list', [CLOSING]],
      ['a list, one estimate', [ONE, CLOSING]],
      [
        'a list, a coverage note and several estimates',
        [rangeCoverageNote, MANY, CLOSING],
      ],
    ];

    async function listed(answer: Patterns) {
      const user = userEvent.setup();
      const read = {
        listTodaysReaches: silentReader.listTodaysReaches,
        summarizeReaches: async () => answer,
      };
      const view = onPage(<Reaches today={todayCases.sealed} read={read} now={now} />);
      await user.click(
        within(view.spread!.firstElementChild as HTMLElement).getByRole('button', {
          name: 'Over time',
        }),
      );
      const pages = Array.from(
        view.spread!.querySelectorAll<HTMLElement>(':scope > .nb-page'),
      );
      await waitFor(() => expect(pages[1]!.textContent).not.toBe(''));
      return { ...view, left: pages[0]!, right: pages[1]! };
    }

    it.each(listCases)(
      'left page: range, From and To, then the notes, the closing sentence last: %s',
      async (state, notes) => {
        const { left } = await listed(overTimeCases[state] as Patterns);
        const [heading, range, seen, ...rest] = Array.from(
          left.children,
        ) as HTMLElement[];
        expect(heading).toHaveTextContent(RANGE);
        expect(range).toHaveClass('nb-reaches-range');
        expect(seen).toHaveAttribute('aria-label', 'Seen by');
        expect(rest.map((el) => el.textContent)).toEqual(notes);
        expect(rest[rest.length - 1]).toHaveClass('nb-reaches-note');
      },
    );

    it('says nothing about estimates when none are left out', async () => {
      const { left } = await listed(overTimeCases['a list'] as Patterns);
      expect(left.textContent).not.toMatch(/estimate/);
    });

    it('right page: ruled, a line a site in the core order, the site, the bar, the count', async () => {
      const answer = overTimeCases['a list'] as Patterns;
      const { right } = await listed(answer);
      expect(right).toHaveClass('nb-page--ruled');
      const lines = within(right).getAllByRole('listitem');
      expect(lines).toHaveLength(answer.by_site.length);
      lines.forEach((line, i) => {
        const site = answer.by_site[i]!;
        const [name, bar, count] = Array.from(line.children) as HTMLElement[];
        expect(line.children).toHaveLength(3);
        expect(name).toHaveTextContent(site.domain);
        expect(name).toHaveClass('nb-reaches-site');
        expect(bar).toHaveAttribute('aria-hidden', 'true');
        expect(count).toHaveTextContent(String(site.count));
        expect(count).toHaveClass('nb-reaches-count');
      });
    });

    it('keeps each bar as wide as it was drawn before the reveal, from the sheet and no other colour', async () => {
      const { right } = await listed(overTimeCases['a list'] as Patterns);
      const bars = within(right).getAllByTestId('bar');
      expect(bars.map((b) => b.style.width)).toEqual(['100%', '44%', '11%']);
      for (const el of Array.from(right.querySelectorAll<HTMLElement>('*'))) {
        expect(el.className).not.toMatch(
          /transition|duration-|animate-|bg-|text-|settle/,
        );
        expect(el.getAttribute('style') ?? '').not.toMatch(
          /color|background|transition|animation/,
        );
      }
    });

    it('keeps the date boxes the same nodes when the answer arrives', async () => {
      const user = userEvent.setup();
      let answer!: (patterns: Patterns) => void;
      const read = {
        listTodaysReaches: silentReader.listTodaysReaches,
        summarizeReaches: () => new Promise<Patterns>((resolve) => (answer = resolve)),
      };
      const { spread } = onPage(
        <Reaches today={todayCases.sealed} read={read} now={now} />,
      );
      await user.click(
        within(spread!.firstElementChild as HTMLElement).getByRole('button', {
          name: 'Over time',
        }),
      );
      const left = spread!.querySelector<HTMLElement>(':scope > .nb-page')!;
      const from = within(left).getByLabelText('From');
      const to = within(left).getByLabelText('To');
      answer(overTimeCases['a list'] as Patterns);
      await waitFor(() => expect(left.textContent).toContain(CLOSING));
      expect(within(left).getByLabelText('From')).toBe(from);
      expect(within(left).getByLabelText('To')).toBe(to);
    });

    it('updates the heading and the list when From changes', async () => {
      const user = userEvent.setup();
      const read = {
        listTodaysReaches: silentReader.listTodaysReaches,
        summarizeReaches: async (first: string) =>
          first === '2026-09-10'
            ? {
                ...(overTimeCases['a list'] as Patterns),
                by_site: [{ domain: 'later.example', count: 2 }],
              }
            : (overTimeCases['a list'] as Patterns),
      };
      const { spread } = onPage(
        <Reaches today={todayCases.sealed} read={read} now={now} />,
      );
      await user.click(
        within(spread!.firstElementChild as HTMLElement).getByRole('button', {
          name: 'Over time',
        }),
      );
      const [left, right] = Array.from(
        spread!.querySelectorAll<HTMLElement>(':scope > .nb-page'),
      );
      await waitFor(() => expect(right!.textContent).toContain('news.example'));
      fireEvent.change(within(left!).getByLabelText('From'), {
        target: { value: '2026-09-10' },
      });
      await waitFor(() => expect(right!.textContent).toContain('later.example'));
      expect(within(left!).getByRole('heading', { level: 2 })).toHaveTextContent(
        rangeInWords('2026-09-10', '2026-09-30', '2026-09-30'),
      );
    });

    it.each(listCases)(
      'says the words it said before the notebook, notes moved: %s',
      async (state) => {
        const answer = overTimeCases[state] as Patterns;
        const { spread } = await listed(answer);
        expect(words(spread!)).toEqual(
          wordsOf(baseline(OVER_TIME[state]!), [BY_DAY_DELTA, DAY_BY_DAY_DELTA]),
        );
      },
    );
  });

  describe('Over time with no sites on a notebook page', () => {
    const CLOSING =
      'Cairn counts only while it is running. This is what it saw over these days.';
    const RANGE = rangeInWords('2026-09-03', '2026-09-30', '2026-09-30');
    const emptyCases: Array<[string, string[]]> = [
      ['nothing here', [CLOSING]],
      [
        'nothing here, a coverage note and several estimates',
        [
          rangeCoverageNote,
          'Your own estimates for 2 days are not counted here, because an estimate has no site.',
          CLOSING,
        ],
      ],
    ];

    async function empty(state: string) {
      const user = userEvent.setup();
      const answer = overTimeCases[state] as Patterns;
      const read = {
        listTodaysReaches: silentReader.listTodaysReaches,
        summarizeReaches: async () => answer,
      };
      const view = onPage(<Reaches today={todayCases.sealed} read={read} now={now} />);
      await user.click(
        within(view.spread!.firstElementChild as HTMLElement).getByRole('button', {
          name: 'Over time',
        }),
      );
      const pages = Array.from(
        view.spread!.querySelectorAll<HTMLElement>(':scope > .nb-page'),
      );
      await waitFor(() => expect(pages[0]!.textContent).toContain(CLOSING));
      return { ...view, left: pages[0]!, right: pages[1]! };
    }

    it.each(emptyCases)(
      'left page: range, From and To, the notes, the closing sentence last: %s',
      async (state, notes) => {
        const { left } = await empty(state);
        const [heading, range, seen, ...rest] = Array.from(
          left.children,
        ) as HTMLElement[];
        expect(heading).toHaveTextContent(RANGE);
        expect(range).toHaveClass('nb-reaches-range');
        expect(seen).toHaveAttribute('aria-label', 'Seen by');
        expect(rest.map((el) => el.textContent)).toEqual(notes);
        expect(rest[rest.length - 1]).toHaveClass('nb-reaches-note');
      },
    );

    it.each(emptyCases)(
      'right page: ruled, the sentence first and only, no site line, no bar: %s',
      async (state) => {
        const { right, left } = await empty(state);
        expect(right).toHaveClass('nb-page--ruled');
        expect(right.textContent).toBe('Nothing here for these days.');
        expect(right.firstElementChild).toHaveClass('nb-reaches-empty');
        expect(within(right).queryAllByRole('listitem')).toHaveLength(0);
        expect(within(right).queryAllByTestId('bar')).toHaveLength(0);
        expect(within(left).queryByText('Nothing here for these days.')).toBeNull();
      },
    );

    it('leaves the date boxes the same nodes as when it was looking', async () => {
      const user = userEvent.setup();
      let answer!: (patterns: Patterns) => void;
      const read = {
        listTodaysReaches: silentReader.listTodaysReaches,
        summarizeReaches: () => new Promise<Patterns>((resolve) => (answer = resolve)),
      };
      const { spread } = onPage(
        <Reaches today={todayCases.sealed} read={read} now={now} />,
      );
      await user.click(
        within(spread!.firstElementChild as HTMLElement).getByRole('button', {
          name: 'Over time',
        }),
      );
      const left = spread!.querySelector<HTMLElement>(':scope > .nb-page')!;
      const from = within(left).getByLabelText('From');
      const to = within(left).getByLabelText('To');
      answer(overTimeCases['nothing here'] as Patterns);
      await waitFor(() => expect(left.textContent).toContain(CLOSING));
      expect(within(left).getByLabelText('From')).toBe(from);
      expect(within(left).getByLabelText('To')).toBe(to);
    });

    it.each(emptyCases)(
      'says the words it said before the notebook, notes moved: %s',
      async (state) => {
        const { spread } = await empty(state);
        expect(words(spread!)).toEqual(
          wordsOf(baseline(OVER_TIME[state]!), [BY_DAY_DELTA, DAY_BY_DAY_DELTA]),
        );
      },
    );
  });
});

describe('Today and Over time rendered alone, with no shell around them', () => {
  const twoPages = (container: HTMLElement) => {
    const spreads = container.querySelectorAll('.nb-spread');
    expect(spreads).toHaveLength(1);
    expect(spreads[0]!.querySelectorAll(':scope > .nb-page')).toHaveLength(2);
  };

  it.each(Object.keys(todayCases))('Today, %s, is its spread', (state) => {
    const { container } = render(
      <Reaches today={todayCases[state]} read={silentReader} now={now} />,
    );
    twoPages(container);
  });

  it.each(Object.keys(overTimeCases))('Over time, %s, is its spread', async (state) => {
    const user = userEvent.setup();
    const { container } = render(
      <Reaches
        today={todayCases.sealed}
        read={overTimeReader(overTimeCases[state]!)}
        now={now}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Over time' }));
    await waitFor(() => twoPages(container));
  });
});
