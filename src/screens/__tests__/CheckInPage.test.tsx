/**
 * Tonight (`CheckIn`) told it is on a notebook page (slice `tonight-page`): the same words as outside any
 * shell, laid out as a spread. The core is the IPC fake and the clock is Vitest's fake timers, as the pin does.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { act, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotebookLook } from '../../look/look';
import { NotebookShell } from '../../shell/NotebookShell';
import { CheckIn } from '../CheckIn';
import { installFakeCore, type FakeCore } from './fakeCore';
import {
  dayCoverageNote,
  evening,
  loadRefusal,
  reachesOfTheDay,
  tonightCases,
  tonightCore,
  type TonightCase,
} from './tonightCases';

const tabs = [{ id: 'reaches' as const, label: 'Tonight', current: true }];

/** The look the cases below run in: every case runs in all three. */
let look: NotebookLook = 'morning';
let core: FakeCore | undefined;

/** Lets every answer the fake core has given reach the screen. */
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

/** Renders a case, on a page when `shell` is true, and does what the person does in it. */
async function show(c: TonightCase, shell: boolean) {
  vi.setSystemTime(evening());
  core = installFakeCore(tonightCore(c));
  const ui = <CheckIn />;
  const view = render(
    shell ? (
      <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
        {ui}
      </NotebookShell>
    ) : (
      ui
    ),
  );
  await settle();
  const main = (view.container.querySelector('main') ?? view.container) as HTMLElement;
  const spread = main.querySelector<HTMLElement>('.nb-spread');
  const pages = spread
    ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page'))
    : [];
  return { ...view, main, spread, left: pages[0], right: pages[1], pages };
}

/** The text of every element with no element inside it, sorted: the words, wherever they sit. */
function words(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('*'))
    .filter((el) => el.children.length === 0 && el.textContent)
    .map((el) => el.textContent as string)
    .sort();
}

async function wordsOutside(c: TonightCase): Promise<string[]> {
  const view = await show(c, false);
  const found = words(view.container);
  view.unmount();
  core?.remove();
  return found;
}

/** The time as Current writes it: the same call. */
const timeOf = (seconds: number) =>
  new Date(seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** What an open day's right page says in the cases of the left page's tests, with quotes hidden. */
const RIGHT_WORDS = ['How the day went', 'Keep this', 'Show quotes'];

const withoutRight = (found: string[]) => {
  const rest = [...found];
  for (const word of RIGHT_WORDS) rest.splice(rest.indexOf(word), 1);
  return rest;
};

const OPEN_DAYS = [
  'reaches, no coverage note, quotes hidden',
  'no reaches, no coverage note, quotes hidden',
  'reaches, a coverage note, quotes hidden',
  'no reaches, a coverage note, quotes hidden',
];

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (name) => {
  beforeEach(() => {
    look = name;
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    core?.remove();
    core = undefined;
    vi.useRealTimers();
  });

  describe('Tonight while loading, or after a load that could not be made', () => {
    it('looking: "Looking…" and no heading on the left, a ruled empty page on the right, nothing announced', async () => {
      const { spread, left, right } = await show(tonightCases.looking!, true);
      expect(spread).toHaveClass('nb-spread', 'nb-checkin-leaves');
      expect(within(left!).getByText('Looking…')).toBeInTheDocument();
      expect(within(left!).queryByRole('heading')).toBeNull();
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(right!.querySelectorAll('*')).toHaveLength(0);
      expect(spread!.querySelector('[role="status"], [aria-live]')).toBeNull();
    });

    it('a load that could not be made: the core’s sentence as a plain paragraph, a ruled empty page', async () => {
      const c = tonightCases['a load that could not be made']!;
      const { spread, left, right, main } = await show(c, true);
      expect(spread).not.toBeNull();
      expect(left!.textContent).toBe(loadRefusal);
      const sentence = left!.querySelector('p')!;
      expect(sentence).toHaveTextContent(loadRefusal);
      expect(spread!.querySelector('[role="status"], [aria-live]')).toBeNull();
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(right!.querySelectorAll('*')).toHaveLength(0);
      expect(main.querySelector('.settle')).toBeNull();
      for (const el of Array.from(main.querySelectorAll<HTMLElement>('*'))) {
        expect(el.style.height).toBe('');
        expect(el.style.overflow).toBe('');
      }
    });

    it.each(['looking', 'a load that could not be made'])(
      '%s: the words equal the same state outside any shell, which is the Pin’s card',
      async (key) => {
        const c = tonightCases[key]!;
        const onPage = await show(c, true);
        expect(onPage.spread).not.toBeNull();
        const found = words(onPage.spread!);
        onPage.unmount();
        core?.remove();
        expect(found).toEqual(await wordsOutside(c));
        const outside = await show(c, false);
        expect(outside.container.querySelector('section.settle')).not.toBeNull();
        expect(outside.container.querySelector('[class*="nb-"]')).toBeNull();
      },
    );
  });

  describe('an open day, the left page', () => {
    it.each(OPEN_DAYS)('%s: the heading, then the log or the empty sentence, then the coverage note', async (key) => {
      const c = tonightCases[key]!;
      const { spread, left, right, main } = await show(c, true);
      expect(spread).not.toBeNull();
      const day = c.day as Exclude<TonightCase['day'], string | { refused: string }>;
      const heading = within(left!).getByRole('heading', { level: 2, name: 'Tonight' });
      expect(left!.firstElementChild).toBe(heading);
      expect(within(main).getAllByRole('heading', { level: 2 })).toEqual([heading]);
      expect(right).toHaveClass('nb-page--ruled');

      if (day.reaches.length > 0) {
        const lines = Array.from(left!.querySelectorAll('li'));
        expect(lines.map((li) => li.parentElement!.tagName)).toEqual(
          lines.map(() => 'UL'),
        );
        expect(
          lines.map((li) => Array.from(li.children).map((el) => el.textContent)),
        ).toEqual(reachesOfTheDay.map((r) => [r.domain, timeOf(r.at)]));
        for (const li of lines) {
          expect(li).toHaveClass('nb-checkin-line');
          expect(li.children[0]).toHaveClass('nb-checkin-site');
          expect(li.children[1]).toHaveClass('nb-checkin-time');
        }
        expect(left!.textContent).not.toContain('Nothing here');
      } else {
        const empty = within(left!).getByText('Nothing here for today.');
        expect(empty).toHaveClass('nb-checkin-empty');
        expect(left!.querySelector('li')).toBeNull();
      }
      if (day.coverage_note) {
        const note = within(left!).getByText(dayCoverageNote);
        expect(left!.lastElementChild).toBe(note);
        expect(note).toHaveClass('nb-checkin-note');
      } else {
        expect(left!.querySelector('.nb-checkin-note')).toBeNull();
      }
    });

    it.each(OPEN_DAYS)('%s: the left page\u2019s words equal the same part outside any shell', async (key) => {
      const c = tonightCases[key]!;
      const onPage = await show(c, true);
      expect(onPage.left).toBeDefined();
      const found = words(onPage.left!);
      onPage.unmount();
      core?.remove();
      expect(found).toEqual(withoutRight(await wordsOutside(c)));
    });

    it('outside any shell the open day is the Pin\u2019s card', async () => {
      const outside = await show(tonightCases[OPEN_DAYS[0]!]!, false);
      expect(outside.container.querySelector('section.settle')).not.toBeNull();
      expect(outside.container.querySelector('[class*="nb-"]')).toBeNull();
    });
  });
});
