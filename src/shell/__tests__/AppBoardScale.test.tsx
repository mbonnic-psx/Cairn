/**
 * Through the real `App` (slice `board-scale`, T006): nothing rendered inside the notebook's page area carries a
 * Tailwind size utility, which would not grow with the board (D39). Every notebook screen the shell shows is opened
 * in each look; the screen the shell does not open by itself (This machine is as it was) is rendered on a notebook
 * page the way its own tests do. The core is a fake written in the test tree at the one seam the interface calls it through.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import type { ProtectionState } from '../../ipc';
import { Teardown } from '../../screens/Teardown';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';
import { teardownCases } from '../../screens/__tests__/quietCases';
import { categories, disclosures } from '../../screens/__tests__/setupCases';
import { reachesOfTheDay } from '../../screens/__tests__/tonightCases';
import { NotebookShell } from '../NotebookShell';

/** A class that sets a size and would not grow with --nb-u: a width, height, size, spacing, line height or text size. */
const SIZE_UTILITY =
  /^-?(?:(?:min-|max-)?[wh]-|size-|(?:p|m)[xytblrse]?-(?:\d|\[|px\b)|(?:gap|space)-(?:[xy]-)?(?:\d|\[|px\b)|leading-|(?:top|right|bottom|left|start|end)-(?:\d|\[|px\b|full|1\/2)|inset(?:-[xy])?-(?:\d|\[|px\b|full|1\/2)|translate-[xy]-|basis-|text-(?:xs|sm|base|lg|xl|\dxl|\[))/;

describe('the helper recognises a Tailwind size utility', () => {
  it.each(['w-4', 'h-12', 'size-6', 'min-w-0', 'max-w-md', 'min-h-screen', 'max-h-64', 'p-4', 'px-5', 'py-2.5', 'mt-3', 'gap-2', 'gap-x-4', 'space-y-3', 'leading-6', 'text-sm', 'text-2xl', 'text-[13px]', 'w-[40px]', '-mt-2', 'top-4', 'left-1/2', '-right-2', 'bottom-[10px]', 'inset-0', 'inset-x-4', '-translate-x-1/2', 'translate-y-2', 'basis-1/3', 'basis-[40px]'])(
    'names %s',
    (name) => expect(name).toMatch(SIZE_UTILITY),
  );
  it.each(['nb-protection-title', 'text-ink-500', 'text-amber-600', 'font-medium', 'flex', 'items-center', 'rounded-lg', 'p', 'nb-page--ruled', 'underline', 'hidden', 'top', 'left', 'inset', 'translate-none', 'start'])(
    'leaves %s',
    (name) => expect(name).not.toMatch(SIZE_UTILITY),
  );
});

describe('the page check has teeth', () => {
  it('names a size utility and an inline length planted inside the page area, and not one outside it', () => {
    const { container } = render(
      <div className="w-4">
        <div className="nb-page-area">
          <p className="mt-2 text-sm nb-ok" style={{ width: '12px' }}>
            planted
          </p>
        </div>
      </div>,
    );
    const found = sizesOnPage(container);
    expect(found.classes.sort()).toEqual(['mt-2', 'text-sm']);
    expect(found.inline).toHaveLength(1);
  });
});

const state = (status: 'off' | 'in_force'): ProtectionState =>
  status === 'off'
    ? { status: 'off', since: null, verified_at: null, entry_count_verified: 0 }
    : { status: 'in_force', since: 1_700_000_000, verified_at: null, entry_count_verified: 3 };

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

function fakeCore(status: 'off' | 'in_force') {
  core = installFakeCore({
    get_protection_state: () => state(status),
    list_categories: () => categories.map((c) => ({ ...c })),
    get_disclosures: () => disclosures,
    get_trail: () => ({
      entries: [
        { domain: 'example.com', sources: [], auto_www: false },
        { domain: 'www.example.com', sources: [], auto_www: true },
      ],
      enabled_categories: ['social'],
    }),
    list_todays_reaches: () => ({ reaches: reachesOfTheDay, gaps: [], coverage_note: null, sealed: null }),
    summarize_reaches: () => ({
      by_site: [{ domain: 'news.example', count: 9 }],
      gaps: [],
      coverage_note: null,
      estimates_excluded: 0,
      sealed: null,
    }),
    get_day: () => ({ reaches: reachesOfTheDay, gaps: [], coverage_note: null, entry: null, estimate: null, sealed: null }),
    get_quote: () => 'The path is made by walking.',
    get_quotes_shown: () => false,
    set_quotes_shown: (args) => args.shown,
    cancel_pending_change: () => null,
  });
}

/** Every class and inline length on every element inside the page area: what a page's markup can carry. */
function sizesOnPage(container: HTMLElement): { classes: string[]; inline: string[]; areas: number } {
  const areas = Array.from(container.querySelectorAll('.nb-page-area'));
  const elements = areas.flatMap((area) => [area, ...Array.from(area.querySelectorAll('*'))]);
  const classes = elements.flatMap((el) => Array.from(el.classList)).filter((c) => SIZE_UTILITY.test(c));
  const inline = elements.flatMap((el) => {
    const style = el.getAttribute('style') ?? '';
    return /[\d.]+(px|rem|em)\b/.test(style) ? [`${el.tagName.toLowerCase()}[style="${style}"]`] : [];
  });
  return { classes: [...new Set(classes)], inline, areas: areas.length };
}

const LOOKS = ['Morning', 'Midday', 'Night'] as const;

describe.each(LOOKS)('every notebook screen the shell shows, in %s', (look) => {
  const switchControl = () => screen.getByLabelText('Look (testing)');
  const check = (container: HTMLElement, screenName: string) => {
    const found = sizesOnPage(container);
    expect(found.areas, `${screenName}: a page area is on screen`).toBe(1);
    expect(found.classes, `${screenName}: Tailwind size utilities inside .nb-page-area`).toEqual([]);
    expect(found.inline, `${screenName}: inline lengths inside .nb-page-area`).toEqual([]);
  };
  const tab = (name: string) => userEvent.click(screen.getByRole('button', { name }));

  it('Choosing and Disclosure (protection off)', async () => {
    fakeCore('off');
    const { container } = render(<App devBuild />);
    await screen.findByText('Gambling');
    await userEvent.selectOptions(switchControl(), look);
    check(container, 'Choosing');
    await tab('Turn protection on');
    await screen.findByRole('heading', { level: 2, name: 'Before Cairn changes anything' });
    check(container, 'Disclosure');
  });

  it('Protection, What is protected, Today, Over time, Tonight and What Cairn covers (protection on)', async () => {
    fakeCore('in_force');
    const { container } = render(<App devBuild />);
    await screen.findByRole('heading', { level: 2, name: 'Protection is on' });
    await userEvent.selectOptions(switchControl(), look);
    check(container, 'Protection');
    await tab('What is protected');
    await screen.findByRole('heading', { level: 2, name: 'What you are protecting' });
    check(container, 'What is protected');
    await tab('Today');
    await screen.findByText('video.example');
    check(container, 'Today');
    await tab('Over time');
    await screen.findByText('9');
    check(container, 'Over time');
    await tab('Tonight');
    await screen.findByRole('textbox', { name: 'How the day went' });
    check(container, 'Tonight');
    await tab('What Cairn covers');
    await screen.findByRole('heading', { level: 2, name: 'What Cairn covers' });
    check(container, 'What Cairn covers');
  });

  it.each(Object.entries(teardownCases))('This machine is as it was, %s (on a notebook page)', (_name, report) => {
    const { container } = render(
      <NotebookShell tabs={[{ id: 'protection' as const, label: 'Protection', current: true }]} onSelect={vi.fn()} look={look.toLowerCase() as 'morning' | 'midday' | 'night'}>
        <Teardown report={report} />
      </NotebookShell>,
    );
    check(container, 'This machine is as it was');
  });
});
