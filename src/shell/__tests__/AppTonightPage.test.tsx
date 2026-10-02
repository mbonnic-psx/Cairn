/**
 * Through the real `App` (slice `tonight-page`, T018): in a notebook look the Today tab opens the Today spread
 * and "Over time" switches the view inside the notebook, the Tonight tab opens the Tonight spread, what is
 * typed in the writing space survives a trip to another tab and a change of look, as it did before the reveal.
 * The core is a fake written in the test tree at the one seam the interface calls it through.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import { TONIGHT_CALLS_CURRENT } from '../../screens/__tests__/beforeTheReveal';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';
import { reachesOfTheDay } from '../../screens/__tests__/tonightCases';

let core: FakeCore;
beforeEach(() => {
  core = installFakeCore({
    get_protection_state: () => ({ status: 'off', since: null, verified_at: null, entry_count_verified: 0 }),
    list_categories: () => [],
    get_disclosures: () => ({ in_force: [], not_covered: [], helper: '' }),
    get_trail: () => ({ entries: [], enabled_categories: [] }),
    list_todays_reaches: () => ({ reaches: reachesOfTheDay, gaps: [], coverage_note: null, sealed: null }),
    summarize_reaches: () => ({
      by_site: [
        { domain: 'news.example', count: 9 },
        { domain: 'video.example', count: 4 },
      ],
      gaps: [],
      coverage_note: null,
      estimates_excluded: 0,
      sealed: null,
    }),
    get_day: () => ({ reaches: reachesOfTheDay, gaps: [], coverage_note: null, entry: null, estimate: null, sealed: null }),
    get_quote: () => 'The path is made by walking.',
    get_quotes_shown: () => false,
    set_quotes_shown: (args) => args.shown,
    save_journal_entry: () => {
      throw 'not asked in these tests';
    },
  });
});
afterEach(() => core.remove());

const switchControl = () => screen.getByLabelText('Look (testing)');
const headings = () =>
  screen
    .getAllByRole('heading')
    .filter((h) => [1, 2, 3].includes(Number(h.tagName.slice(1))))
    .map((h) => `${h.tagName.toLowerCase()}:${h.textContent}`);
const tab = (name: string) => userEvent.click(screen.getByRole('button', { name }));
const writingSpace = () => screen.findByRole('textbox', { name: 'How the day went' }) as Promise<HTMLTextAreaElement>;

async function start(look: 'Morning' | 'Midday' | 'Night' = 'Morning') {
  const view = render(<App devBuild />);
  await screen.findByRole('button', { name: 'Turn protection on' });
  await userEvent.selectOptions(switchControl(), look);
  const pages = () => Array.from(view.container.querySelectorAll<HTMLElement>('.nb-page-area > .nb-spread > .nb-page'));
  return { ...view, pages };
}

describe('Today and Tonight through App, in a notebook look', () => {
  it('opens the Today tab as one spread, the right page ruled and holding the log', async () => {
    const { pages, container } = await start();
    await tab('Today');
    await screen.findByText('video.example');
    expect(container.querySelectorAll('.nb-page-area > .nb-spread')).toHaveLength(1);
    expect(container.querySelectorAll('.nb-page-area > .nb-spread > .nb-page')).toHaveLength(2);
    const [, right] = pages();
    expect(right).toHaveClass('nb-page--ruled');
    expect(right!.querySelectorAll('li')).toHaveLength(reachesOfTheDay.length);
    expect(headings()).toEqual(['h1:Cairn', 'h2:Today']);
  });

  it('switches to Over time inside the notebook, keeping the Which days group', async () => {
    const { pages, container } = await start();
    await tab('Today');
    await screen.findByText('video.example');
    await userEvent.click(screen.getByRole('button', { name: 'Over time' }));
    await screen.findByText('9');
    expect(container.querySelectorAll('.nb-page-area > .nb-spread')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Which days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Over time' })).toHaveAttribute('aria-pressed', 'true');
    const [left, right] = pages();
    expect(left!.querySelector('h2')).not.toBeNull();
    expect(right!.textContent).toContain('news.example');
    expect(right!.textContent).toContain('video.example');
    expect(headings().filter((h) => h.startsWith('h2:'))).toHaveLength(1);
    expect(headings()[0]).toBe('h1:Cairn');
  });

  it('opens the Tonight tab as a spread with the writing space on the right', async () => {
    const { pages } = await start();
    await tab('Tonight');
    const write = await writingSpace();
    const [left, right] = pages();
    expect(right!.contains(write)).toBe(true);
    expect(right).toHaveClass('nb-page--ruled');
    expect(left!.textContent).toContain('news.example');
    expect(headings()).toEqual(['h1:Cairn', 'h2:Tonight']);
  });

  it('keeps what was typed in the writing space across a trip to another tab and back', async () => {
    await start();
    await tab('Tonight');
    await userEvent.type(await writingSpace(), 'Half a thought');
    await tab('Today');
    await screen.findByText('video.example');
    await tab('Tonight');
    expect((await writingSpace()).value).toBe('Half a thought');
  });

  it('keeps it through Morning, Midday and Night, and back round', async () => {
    await start('Morning');
    await tab('Tonight');
    await userEvent.type(await writingSpace(), 'Half a thought');
    for (const look of ['Midday', 'Night', 'Morning']) {
      await userEvent.selectOptions(switchControl(), look);
      expect((await writingSpace()).value, look).toBe('Half a thought');
    }
  });
});

describe('the core is asked nothing new through App', () => {
  it('asks the core the same things, with the same arguments, as Current did', async () => {
    // The clock is held where the log was captured; the zone is the fixture's (Europe/London).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 30, 20, 0));
    try {
      const view = await start('Morning');
      await tab('Today');
      await screen.findByText('video.example');
      await userEvent.click(screen.getByRole('button', { name: 'Over time' }));
      await screen.findByText('9');
      await tab('Tonight');
      await userEvent.type(await writingSpace(), 'x');
      await tab('Today');
      await screen.findByText('Over time');
      const asked = core.calls.map((c) => `${c.cmd} ${JSON.stringify(c.args)}`);
      view.unmount();
      for (const cmd of ['list_todays_reaches', 'summarize_reaches', 'get_day', 'get_quotes_shown']) {
        expect(TONIGHT_CALLS_CURRENT.some((c) => c.startsWith(`${cmd} `)), cmd).toBe(true);
      }
      expect([...asked].sort()).toEqual([...TONIGHT_CALLS_CURRENT].sort());
    } finally {
      vi.useRealTimers();
    }
  });
});
