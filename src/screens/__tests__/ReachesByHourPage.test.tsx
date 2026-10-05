/**
 * The reaches screen, over time, by hour, on a notebook page (slice `history-by-hour`, plan scenario
 * 26; 004 `tonight-page` D21, D22). The choice is on the left page under the date boxes; the hours
 * are on the right page, ruled, one hour to a line, as a site's line is. The reader and the clock
 * are plain objects passed as props.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Patterns } from '../../ipc/reaches';
import { NotebookShell } from '../../shell/NotebookShell';
import { Reaches } from '../Reaches';
import { BY_DAY_DELTA, BY_HOUR_WORDS, DAY_BY_DAY_DELTA } from './beforeTheReveal';
import { evening, rangeCoverageNote, sealedSentence, todayCases } from './tonightCases';
import { never } from './fakeCore';

const tabs = [{ id: 'reaches' as const, label: 'Today', current: true }];
const now = evening;

const hours = (counts: Record<number, number> = {}) =>
  Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts[hour] ?? 0 }));

const answer = (over: Partial<Patterns> = {}): Patterns => ({
  by_site: [
    { domain: 'news.example', count: 9 },
    { domain: 'video.example', count: 4 },
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

const readerOf = (patterns: Patterns) => ({
  listTodaysReaches: never,
  summarizeReaches: () => Promise.resolve(patterns),
});

/** The time as the Today log prints it. */
const label = (hour: number) =>
  new Date(2000, 0, 1, hour).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

function words(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('*'))
    .filter((el) => el.children.length === 0 && el.textContent)
    .map((el) => el.textContent as string)
    .sort();
}

async function byHourOnPage(patterns: Patterns) {
  const user = userEvent.setup();
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look="midday">
      <Reaches today={todayCases.sealed} read={readerOf(patterns)} now={now} />
    </NotebookShell>,
  );
  const main = view.container.querySelector('main') as HTMLElement;
  const spread = main.querySelector<HTMLElement>('.nb-spread') as HTMLElement;
  await user.click(
    within(spread.firstElementChild as HTMLElement).getByRole('button', {
      name: 'Over time',
    }),
  );
  await waitFor(() => expect(within(spread).queryByText('Looking…')).toBeNull());
  const pages = () =>
    Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page'));
  return { user, view, main, spread, pages };
}

const choose = (name: 'By site' | 'By hour') => screen.getByRole('button', { name });

describe('Seen by, on a notebook page', () => {
  it('sits on the left page under the date boxes, in the Which days buttons classes', async () => {
    const { pages } = await byHourOnPage(answer());
    const [left] = pages();

    const [heading, range, seen] = Array.from(left!.children) as HTMLElement[];
    expect(heading!.tagName).toBe('H2');
    expect(within(range!).getByLabelText('From')).toBeInTheDocument();
    expect(seen).toHaveAttribute('role', 'group');
    expect(seen).toHaveAttribute('aria-label', 'Seen by');
    expect(seen).toHaveClass('nb-reaches-seen');
    const buttons = within(seen!).getAllByRole('button');
    expect(buttons.map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
      ['By site', 'true'],
      ['By hour', 'false'],
      ['By day', 'false'],
      ['Day by day', 'false'],
    ]);
    for (const button of buttons) expect(button).toHaveClass('nb-reaches-which__button');
  });

  it('is on the left page while looking, sealed and unreadable, and never on the right', async () => {
    const sealed = await byHourOnPage(
      answer({ by_site: [], by_hour: [], sealed: sealedSentence }),
    );
    const [left, right] = sealed.pages();
    expect(within(left!).getByRole('group', { name: 'Seen by' })).toBeInTheDocument();
    expect(within(right!).queryAllByRole('button')).toHaveLength(0);
  });

  it('keeps Which days the first child of the spread, and focus on the button just pressed', async () => {
    const { user, spread, pages } = await byHourOnPage(answer());
    const which = spread.firstElementChild;
    const seen = within(pages()[0]!).getByRole('group', { name: 'Seen by' });

    await user.click(choose('By hour'));
    expect(document.activeElement).toBe(choose('By hour'));
    expect(spread.firstElementChild).toBe(which);
    expect(within(pages()[0]!).getByRole('group', { name: 'Seen by' })).toBe(seen);

    await user.click(choose('By site'));
    expect(document.activeElement).toBe(choose('By site'));
    expect(spread.firstElementChild).toBe(which);
  });

  it('keeps the date boxes the same nodes when the choice changes', async () => {
    const { user, pages } = await byHourOnPage(answer());
    const from = within(pages()[0]!).getByLabelText('From');

    await user.click(choose('By hour'));

    expect(within(pages()[0]!).getByLabelText('From')).toBe(from);
  });
});

describe('the hours, on the right page', () => {
  it('are 24 ruled lines from midnight, each the hour, its bar, then its count', async () => {
    const { user, pages } = await byHourOnPage(answer());
    await user.click(choose('By hour'));
    const [, right] = pages();

    expect(right).toHaveClass('nb-page--ruled');
    const lines = within(right!).getAllByRole('listitem');
    expect(lines).toHaveLength(24);
    lines.forEach((line, hour) => {
      expect(line).toHaveClass('nb-reaches-line');
      const [name, bar, count] = Array.from(line.children) as HTMLElement[];
      expect(name).toHaveTextContent(label(hour));
      expect(name).toHaveClass('nb-reaches-site');
      expect(bar).toHaveClass('nb-reaches-bar');
      expect(bar).toHaveAttribute('aria-hidden', 'true');
      expect(count).toHaveClass('nb-reaches-count');
      expect(count.textContent).toBe(String({ 2: 2, 14: 6, 15: 3 }[hour] ?? 0));
      expect(line.children).toHaveLength(3);
    });
    const widths = lines.map((line) => within(line).getByTestId('bar').style.width);
    expect(widths[14]).toBe('100%');
    expect(widths[15]).toBe('50%');
    expect(widths[0]).toBe('0%');
  });

  it('keeps every note off the right page', async () => {
    const { user, pages } = await byHourOnPage(
      answer({ coverage_note: rangeCoverageNote, estimates_excluded: 2 }),
    );
    await user.click(choose('By hour'));
    const [left, right] = pages();

    for (const note of [
      rangeCoverageNote,
      'Your own estimates for 2 days are not counted here, because an estimate has no hour.',
      'Cairn counts only while it is running. This is what it saw over these days.',
    ]) {
      expect(within(left!).getByText(note)).toBeInTheDocument();
      expect(within(right!).queryByText(note)).toBeNull();
    }
    const [, , , coverage, estimates, standing] = Array.from(left!.children);
    expect(coverage).toHaveTextContent(rangeCoverageNote);
    expect(estimates).toHaveTextContent('has no hour');
    expect(standing).toHaveClass('nb-reaches-note');
  });

  it('begin under "Nothing here for these days." on a quiet range', async () => {
    const { user, pages } = await byHourOnPage(answer({ by_site: [], by_hour: hours() }));
    await user.click(choose('By hour'));
    const [, right] = pages();

    expect(right!.firstElementChild).toHaveTextContent('Nothing here for these days.');
    expect(right!.firstElementChild).toHaveClass('nb-reaches-empty');
    expect(within(right!).getAllByRole('listitem')).toHaveLength(24);
  });

  it('are none, with the sentence on the left, when sealed', async () => {
    const { user, pages } = await byHourOnPage(
      answer({ by_site: [], by_hour: [], sealed: sealedSentence }),
    );
    await user.click(choose('By hour'));
    const [left, right] = pages();

    expect(left).toHaveTextContent(sealedSentence);
    expect(right!.textContent).toBe('');
  });

  it('scroll the page area: no inline height or overflow anywhere', async () => {
    const { user, main, pages } = await byHourOnPage(answer());
    await user.click(choose('By hour'));
    expect(within(pages()[1]!).getAllByRole('listitem')).toHaveLength(24);

    for (const el of [main, ...Array.from(main.querySelectorAll<HTMLElement>('*'))]) {
      expect(el.style.height).toBe('');
      expect(el.style.overflow).toBe('');
    }
  });

  it('carry no Tailwind utility class, and run no entrance', async () => {
    const { user, spread, main } = await byHourOnPage(answer());
    await user.click(choose('By hour'));

    const notOurs = Array.from(spread.querySelectorAll('*')).flatMap((el) =>
      Array.from(el.classList).filter((c) => !c.startsWith('nb-')),
    );
    expect(notOurs).toEqual([]);
    expect(main.querySelector('.settle')).toBeNull();
  });
});

describe('the words it said before the notebook', () => {
  it.each([
    ['a list', answer()],
    [
      'a note and estimates',
      answer({ coverage_note: rangeCoverageNote, estimates_excluded: 1 }),
    ],
    ['a quiet range', answer({ by_site: [], by_hour: hours() })],
  ])('by hour: %s', async (name, patterns) => {
    const { spread, user: pageUser } = await byHourOnPage(patterns);
    await pageUser.click(choose('By hour'));

    expect(words(spread)).toEqual(
      [...BY_HOUR_WORDS[name]!, ...BY_DAY_DELTA.words!.added!, ...DAY_BY_DAY_DELTA.words!.added!].sort(),
    );
  });
});
