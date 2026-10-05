/**
 * The sentences about when Cairn started counting, on a notebook page (slice `first-counted`, plan scenarios 40 and
 * 41; 004 `tonight-page`). Each sentence is on the left page it belongs to, in the class its neighbours use, with no
 * inline height or overflow; *Which days* stays the spread's first child. jsdom lays nothing out, so how tall a
 * sentence is, at each width and region, is measured in the demo (N26) and not claimed here.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DayView } from '../../ipc/journal';
import type { Patterns, TodaysReaches } from '../../ipc/reaches';
import { clockTimeInWords, shortDateInWords } from '../../localDays';
import { NotebookShell } from '../../shell/NotebookShell';
import { CheckIn } from '../CheckIn';
import { Reaches, type ReachesReader } from '../Reaches';
import {
  baseline,
  controlsOf,
  wordsOf,
  BY_DAY_DELTA,
  COUNT_UNIT_DELTA,
  DAY_BY_DAY_DELTA,
  OVER_TIME,
  TODAY,
} from './beforeTheReveal';
import { installFakeCore, type FakeCore } from './fakeCore';
import { expectStartVoice, startSentences } from './startSentences';
import {
  evening,
  overTimeCases,
  overTimeReader,
  rangeCoverageNote,
  reachesOfTheDay,
  silentReader,
  todayCases,
  tonightCore,
} from './tonightCases';

const tabs = [{ id: 'reaches' as const, label: 'Today', current: true }];
const seconds = (d: Date) => Math.round(d.getTime() / 1000);

/** 30 September 2026, 09:07: the day `evening` is on. */
const TODAY_FIRST = seconds(new Date(2026, 8, 30, 9, 7));
/** 12 September 2026: inside the opening range, not today. */
const INSIDE = seconds(new Date(2026, 8, 12, 14, 14));
/** 1 January 2025: before the opening range. */
const EARLY = seconds(new Date(2025, 0, 1, 9, 30));

const quiet: TodaysReaches = { reaches: [], gaps: [], coverage_note: null, sealed: null };
const patterns = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [{ domain: 'a.example', count: 1234 }],
  by_hour: [],
  by_weekday: [],
  movement: [],
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
  ...over,
});
const readerOf = (answer: Patterns): ReachesReader => ({
  listTodaysReaches: async () => quiet,
  summarizeReaches: async () => answer,
});

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
  vi.useRealTimers();
});

const shell = (ui: React.ReactElement) => {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look="midday">
      {ui}
    </NotebookShell>,
  );
  const main = view.container.querySelector('main') as HTMLElement;
  const spread = main.querySelector<HTMLElement>('.nb-spread') as HTMLElement;
  const pages = () => Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page'));
  return { main, spread, pages };
};

async function overTime(answer: Patterns) {
  const user = userEvent.setup();
  const page = shell(
    <Reaches today={todayCases.sealed} read={readerOf(answer)} now={evening} firstDay={0} />,
  );
  await user.click(within(page.spread.firstElementChild as HTMLElement).getByRole('button', { name: 'Over time' }));
  await waitFor(() => expect(within(page.spread).queryByText('Looking…')).toBeNull());
  await screen.findByText(/Cairn counts only while it is running/);
  return { user, ...page };
}

function expectNoInlineLayout(main: HTMLElement) {
  for (const el of [main, ...Array.from(main.querySelectorAll<HTMLElement>('*'))]) {
    expect(el.style.height).toBe('');
    expect(el.style.overflow).toBe('');
  }
}

const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Over time: the sentence is on the left page, among the asides', () => {
  it('F2 stands under the date boxes and the Seen by buttons, before every other note, in the aside class', async () => {
    const { main, pages } = await overTime(
      patterns({ first_counted: EARLY, coverage_note: rangeCoverageNote, estimates_excluded: 1 }),
    );
    const [left, right] = pages();

    const found = startSentences(main);
    expect(found).toHaveLength(1);
    const [sentence] = found;
    expect(left!.contains(sentence!)).toBe(true);
    expect(right!.contains(sentence!)).toBe(false);
    expect(sentence).toHaveClass('nb-reaches-aside');
    expect(sentence!.textContent).toBe(`Cairn started counting on ${shortDateInWords('2025-01-01', true)}.`);
    const boxes = within(left!).getByLabelText('From').closest('.nb-reaches-range') as HTMLElement;
    const seen = within(left!).getByRole('group', { name: 'Seen by' });
    expect(follows(boxes, sentence!)).toBe(true);
    expect(follows(seen, sentence!)).toBe(true);
    expect(follows(sentence!, within(left!).getByText(rangeCoverageNote))).toBe(true);
    expect(follows(sentence!, within(left!).getByText(/is not counted here/))).toBe(true);
    expect(sentence!.getAttribute('style')).toBeNull();
    expectNoInlineLayout(main);
  });

  it.each(['By site', 'By hour', 'By day', 'Day by day'])(
    'F3 stands in the same place, in the same class, in %s',
    async (view) => {
      const { user, main, pages } = await overTime(
        patterns({ first_counted: INSIDE, coverage_note: rangeCoverageNote }),
      );
      await user.click(screen.getByRole('button', { name: view }));
      const [left, right] = pages();

      const found = startSentences(main);
      expect(found).toHaveLength(1);
      expect(left!.contains(found[0]!)).toBe(true);
      expect(right!.contains(found[0]!)).toBe(false);
      expect(found[0]).toHaveClass('nb-reaches-aside');
      expect(found[0]!.textContent).toBe(
        `Cairn started counting at ${clockTimeInWords(INSIDE)} on ${shortDateInWords('2026-09-12', false)}.`,
      );
      expect(follows(found[0]!, within(left!).getByText(rangeCoverageNote))).toBe(true);
      expect(found[0]!.getAttribute('style')).toBeNull();
      expectNoInlineLayout(main);
    },
  );

  it('keeps Which days the spread\'s first child, the same node, as the sentence arrives and the choice changes', async () => {
    const user = userEvent.setup();
    const { spread } = shell(
      <Reaches today={todayCases.sealed} read={readerOf(patterns({ first_counted: INSIDE }))} now={evening} firstDay={0} />,
    );
    const which = spread.firstElementChild;
    await user.click(within(which as HTMLElement).getByRole('button', { name: 'Over time' }));
    expect(spread.firstElementChild).toBe(which);
    await screen.findByText(/Cairn started counting at/);
    expect(spread.firstElementChild).toBe(which);
    const seen = within(spread).getByRole('group', { name: 'Seen by' });
    await user.click(screen.getByRole('button', { name: 'Day by day' }));
    expect(spread.firstElementChild).toBe(which);
    expect(within(spread).getByRole('group', { name: 'Seen by' })).toBe(seen);
  });
});

describe('Today and the check-in: the sentence is on the left page', () => {
  it("Today's stands under its title, in the aside class, and the ruled page holds none", () => {
    const { main, pages } = shell(
      <Reaches today={{ ...quiet, first_counted: TODAY_FIRST }} read={silentReader} now={evening} />,
    );
    const [left, right] = pages();

    const found = startSentences(main);
    expect(found).toHaveLength(1);
    expect(left!.contains(found[0]!)).toBe(true);
    expect(right!.contains(found[0]!)).toBe(false);
    expect(found[0]).toHaveClass('nb-reaches-aside');
    expect(found[0]!.getAttribute('style')).toBeNull();
    expect(right).toHaveClass('nb-page--ruled');
    expectNoInlineLayout(main);
  });

  it("the check-in's stands on its left page before the coverage note, in the note class", async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(evening());
    const day: DayView = {
      reaches: reachesOfTheDay,
      gaps: [],
      coverage_note: 'Cairn was not counting for 2 hours.',
      entry: null,
      estimate: null,
      sealed: null,
      first_counted: TODAY_FIRST,
    };
    core = installFakeCore(tonightCore({ day, quotesShown: false, quote: null }));
    const { main, pages } = shell(<CheckIn />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const [left, right] = pages();

    const found = startSentences(main);
    expect(found).toHaveLength(1);
    expect(left!.contains(found[0]!)).toBe(true);
    expect(right!.contains(found[0]!)).toBe(false);
    expect(found[0]).toHaveClass('nb-checkin-note');
    expect(follows(found[0]!, within(left!).getByText('Cairn was not counting for 2 hours.'))).toBe(true);
    expect(found[0]!.getAttribute('style')).toBeNull();
    expectNoInlineLayout(main);
  });
});

describe('the voice, over every sentence the states draw (scenario 40)', () => {
  it('holds in F2, F3 with and without a year, Today and the check-in', async () => {
    const said: string[] = [];
    for (const [first, now] of [
      [EARLY, evening()],
      [INSIDE, evening()],
      [seconds(new Date(2026, 11, 20, 9, 5)), new Date(2027, 0, 10, 20, 0)],
    ] as const) {
      const user = userEvent.setup();
      const view = render(<Reaches today={todayCases.sealed} read={readerOf(patterns({ first_counted: first }))} now={() => now} />);
      await user.click(screen.getByRole('button', { name: 'Over time' }));
      await screen.findByText(/Cairn counts only while it is running/);
      said.push(...startSentences().map((p) => p.textContent!));
      view.unmount();
    }
    const today = render(<Reaches today={{ ...quiet, first_counted: TODAY_FIRST }} read={silentReader} now={evening} />);
    said.push(...startSentences().map((p) => p.textContent!));
    today.unmount();

    expect(said).toHaveLength(4);
    for (const one of said) expectStartVoice(one);
  });
});

describe('the words kept, with the deltas of the count (the Pin, row 6)', () => {
  it.each(Object.keys(todayCases))('Today, %s, still has its captured words', (name) => {
    const { main } = shell(<Reaches today={todayCases[name]} read={silentReader} now={evening} />);
    expect(wordsOf(main)).toEqual(wordsOf(baseline(TODAY[name]!)));
  });

  it.each(Object.keys(overTimeCases))('Over time, %s, still has its captured words and controls', async (name) => {
    const answer = overTimeCases[name]!;
    const { main } = shell(
      <Reaches today={todayCases['nothing yet, the fallback note']} read={overTimeReader(answer)} now={evening} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Over time' }));
    if (answer === 'unreadable') {
      await screen.findByText('Cairn could not read your history just now. Protection is unaffected.');
    } else if (answer !== 'looking') {
      await screen.findByText(answer.sealed ?? 'Cairn counts only while it is running. This is what it saw over these days.');
    }
    const draws = answer !== 'looking' && answer !== 'unreadable' && answer.by_site.length > 0 && !answer.sealed;
    const deltas = [BY_DAY_DELTA, DAY_BY_DAY_DELTA, ...(draws ? [COUNT_UNIT_DELTA] : [])];
    expect(wordsOf(main)).toEqual(wordsOf(baseline(OVER_TIME[name]!), deltas));
    expect(controlsOf(main)).toEqual(controlsOf(baseline(OVER_TIME[name]!), deltas));
    expect(startSentences(main)).toHaveLength(0);
  });
});

const nodeFs = 'node:' + 'fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const sheet = readFileSync('src/styles/tonight-page.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const bodyOf = (selector: string): string =>
  Array.from(sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter((m) => m[1]!.split(',').some((one) => one.trim() === selector))
    .map((m) => m[2]!)
    .join('');

describe("the sentences take their neighbours' look, and the sheet adds none", () => {
  it.each(['.nb-reaches-aside', '.nb-checkin-note'])('%s is in the quiet ink, in the page serif', (selector) => {
    const rule = bodyOf(selector);
    expect(rule).not.toMatch(/font-family/);
    expect(rule).not.toMatch(/monospace|var\(--nb-font-mono\)/);
    expect(rule).not.toMatch(/(^|[^-])color:\s*(#|rgb|hsl)/);
  });

  it('has no selector of its own for the start of counting', () => {
    expect(sheet).not.toMatch(/started|first-count|first_counted|before-the-first/i);
  });
});
