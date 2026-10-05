/**
 * When the reaches screen draws a list for a range, on today's card and on a notebook page: the
 * guard on the list is that there are rows and that either the view is by hour or by day (a quiet
 * range keeps its 24 zero hours, or its seven days, under the sentence) or the range is not quiet.
 * Each case below is one corner of that guard, so no part of it can be changed without a case
 * failing.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { MovementRow, Patterns } from '../../ipc/reaches';
import { NotebookShell } from '../../shell/NotebookShell';
import { Reaches, type ReachesReader } from '../Reaches';
import { evening, sealedSentence, todayCases } from './tonightCases';
import { never } from './fakeCore';

const NOTHING = 'Nothing here for these days.';
const hours = (counts: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts[hour] ?? 0 }));

/** Seven days from Monday, with `counts` at the weekdays named; each is held by 4 days. */
const week = (counts: Record<number, number> = {}) =>
  Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    count: counts[weekday] ?? 0,
    days: 4,
  }));

/** Three days, each held by one date, with `counts` by place. */
const days = (counts: number[] = [0, 0, 0]): MovementRow[] =>
  counts.map((count, place) => ({
    day: `2026-09-0${place + 1}`,
    days: 1,
    span: 'day' as const,
    count,
    seen: 'whole' as const,
    so_far: false,
  }));

const patterns = (over: Partial<Patterns>): Patterns => ({
  by_site: [{ domain: 'a.example', count: 5 }],
  by_hour: hours({ 14: 6 }),
  by_weekday: week({ 2: 3 }),
  movement: days([0, 2, 0]),
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  dst_approximate: false,
  sealed: null,
  ...over,
});

const readerOf = (answer: Patterns): ReachesReader => ({
  listTodaysReaches: never,
  summarizeReaches: () => Promise.resolve(answer),
});

type Where = 'card' | 'page';

async function open(
  where: Where,
  answer: Patterns,
  view: 'By site' | 'By hour' | 'By day' | 'Day by day',
) {
  const user = userEvent.setup();
  if (where === 'card') {
    render(<Reaches read={readerOf(answer)} now={evening} />);
  } else {
    render(
      <NotebookShell
        tabs={[{ id: 'reaches' as const, label: 'Today', current: true }]}
        onSelect={vi.fn()}
        look="midday"
      >
        <Reaches today={todayCases.sealed} read={readerOf(answer)} now={evening} />
      </NotebookShell>,
    );
  }
  await user.click(await screen.findByRole('button', { name: 'Over time' }));
  await waitFor(() => expect(screen.queryByText('Looking…')).toBeNull());
  if (view !== 'By site') await user.click(screen.getByRole('button', { name: view }));
}

const lines = () => screen.queryAllByRole('listitem');

describe.each<Where>(['card', 'page'])('the list of a range, on the %s', (where) => {
  it('is not drawn in the site view when there are no sites, though the hours hold reaches', async () => {
    await open(where, patterns({ by_site: [] }), 'By site');
    expect(screen.getByText(NOTHING)).toBeInTheDocument();
    expect(lines()).toHaveLength(0);
  });

  it('is not drawn in the site view when every site counts none', async () => {
    await open(where, patterns({ by_site: [{ domain: 'a.example', count: 0 }] }), 'By site');
    expect(screen.getByText(NOTHING)).toBeInTheDocument();
    expect(lines()).toHaveLength(0);
  });

  it('is drawn in the site view when a site has reaches', async () => {
    await open(where, patterns({}), 'By site');
    expect(screen.queryByText(NOTHING)).toBeNull();
    expect(lines().map((li) => li.textContent)).toEqual(['a.example5']);
  });

  it('keeps all 24 zero hours under the sentence in the hour view of a quiet range', async () => {
    await open(where, patterns({ by_site: [], by_hour: hours() }), 'By hour');
    expect(screen.getByText(NOTHING)).toBeInTheDocument();
    expect(lines()).toHaveLength(24);
  });

  it('draws the 24 hours with no sentence in the hour view of a range with reaches', async () => {
    await open(where, patterns({}), 'By hour');
    expect(screen.queryByText(NOTHING)).toBeNull();
    expect(lines()).toHaveLength(24);
  });

  it('is not drawn in the hour view when the answer holds no hours at all', async () => {
    await open(where, patterns({ by_hour: [] }), 'By hour');
    expect(lines()).toHaveLength(0);
    expect(document.querySelector('ul')).toBeNull();
  });

  it('keeps all seven days under the sentence in the day view of a quiet range', async () => {
    await open(
      where,
      patterns({ by_site: [], by_hour: hours(), by_weekday: week() }),
      'By day',
    );
    expect(screen.getByText(NOTHING)).toBeInTheDocument();
    expect(lines()).toHaveLength(7);
  });

  it('draws the seven days with no sentence in the day view of a range with reaches', async () => {
    await open(where, patterns({}), 'By day');
    expect(screen.queryByText(NOTHING)).toBeNull();
    expect(lines()).toHaveLength(7);
  });

  it('is not drawn in the day view when the answer holds no days at all', async () => {
    await open(where, patterns({ by_weekday: [] }), 'By day');
    expect(lines()).toHaveLength(0);
    expect(document.querySelector('ul')).toBeNull();
  });

  it('keeps every row under the sentence in the day-by-day view of a quiet range', async () => {
    await open(
      where,
      patterns({ by_site: [], by_hour: hours(), movement: days() }),
      'Day by day',
    );
    expect(screen.getByText(NOTHING)).toBeInTheDocument();
    expect(lines()).toHaveLength(3);
  });

  it('draws every row with no sentence in the day-by-day view of a range with reaches', async () => {
    await open(where, patterns({}), 'Day by day');
    expect(screen.queryByText(NOTHING)).toBeNull();
    expect(lines()).toHaveLength(3);
  });

  it('is not drawn in the day-by-day view when the answer holds no rows at all', async () => {
    await open(where, patterns({ movement: [] }), 'Day by day');
    expect(lines()).toHaveLength(0);
    expect(document.querySelector('ul')).toBeNull();
  });

  it('is not drawn in the site view when the answer holds nothing at all', async () => {
    await open(where, patterns({ by_site: [], by_hour: [] }), 'By site');
    expect(lines()).toHaveLength(0);
    expect(document.querySelector('ul')).toBeNull();
  });

  it('is not drawn, in either view, when the answer is sealed', async () => {
    const sealed = patterns({
      by_site: [],
      by_hour: [],
      by_weekday: [],
      movement: [],
      sealed: sealedSentence,
    });
    for (const view of ['By hour', 'By day', 'Day by day'] as const) {
      cleanup();
      await open(where, sealed, view);
      expect(screen.getAllByText(sealedSentence).length).toBeGreaterThan(0);
      expect(lines()).toHaveLength(0);
      expect(document.querySelector('ul')).toBeNull();
      expect(within(document.body).queryByText(NOTHING)).toBeNull();
    }
  });
});
