/**
 * When the reaches screen draws a list for a range, on today's card and on a notebook page: the
 * guard on the list is that there are rows and that either the view is by hour (a quiet range
 * keeps its 24 zero hours under the sentence) or the range is not quiet. Each case below is one
 * corner of that guard, so no part of it can be changed without a case failing.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Patterns } from '../../ipc/reaches';
import { NotebookShell } from '../../shell/NotebookShell';
import { Reaches, type ReachesReader } from '../Reaches';
import { evening, sealedSentence, todayCases } from './tonightCases';
import { never } from './fakeCore';

const NOTHING = 'Nothing here for these days.';
const hours = (counts: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts[hour] ?? 0 }));

const patterns = (over: Partial<Patterns>): Patterns => ({
  by_site: [{ domain: 'a.example', count: 5 }],
  by_hour: hours({ 14: 6 }),
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

async function open(where: Where, answer: Patterns, view: 'By site' | 'By hour') {
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
  if (view === 'By hour') await user.click(screen.getByRole('button', { name: 'By hour' }));
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

  it('is not drawn in the site view when the answer holds nothing at all', async () => {
    await open(where, patterns({ by_site: [], by_hour: [] }), 'By site');
    expect(lines()).toHaveLength(0);
    expect(document.querySelector('ul')).toBeNull();
  });

  it('is not drawn, in either view, when the answer is sealed', async () => {
    const sealed = patterns({ by_site: [], by_hour: [], sealed: sealedSentence });
    await open(where, sealed, 'By hour');
    expect(screen.getAllByText(sealedSentence).length).toBeGreaterThan(0);
    expect(lines()).toHaveLength(0);
    expect(document.querySelector('ul')).toBeNull();
    expect(within(document.body).queryByText(NOTHING)).toBeNull();
  });
});
