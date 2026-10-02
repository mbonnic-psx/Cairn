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
  evening,
  loadRefusal,
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
});
