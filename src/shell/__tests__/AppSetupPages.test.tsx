/**
 * Through the real `App` (slice `setup-pages`, T011): in a notebook look, choosing what to protect and Before
 * Cairn changes anything open as spreads, the step's state survives a walk between looks, and Current is
 * unchanged. The core is a fake written in the test tree at the one seam the interface calls it through.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import type { CategoryPreset } from '../../ipc';
import { SETUP_CALLS_CURRENT } from '../../screens/__tests__/beforeTheReveal';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';
import {
  categories as cases,
  disclosures,
  nineCategories,
  pendingChange,
  pendingSentence,
  readBack,
} from '../../screens/__tests__/setupCases';

let core: FakeCore;
let list: CategoryPreset[];
/** How the core answers a toggle; each test sets it, and `beforeEach` puts it back to "at once". */
let toggleAnswer: (args: Record<string, unknown>) => unknown;
const applyAtOnce = (args: Record<string, unknown>) => {
  const category = list.find((c) => c.id === args.id)!;
  category.enabled = Boolean(args.on);
  return null;
};

beforeEach(() => {
  list = cases.map((c) => ({ ...c }));
  toggleAnswer = applyAtOnce;
  core = installFakeCore({
    get_protection_state: () => readBack('off'),
    list_categories: () => list.map((c) => ({ ...c })),
    get_disclosures: () => disclosures,
    set_category_enabled: (args) => toggleAnswer(args),
    add_custom_entry: () => ['example.com', 'www.example.com'],
    turn_protection_on: () => ({ ...readBack('in_force'), since: 1_700_000_000 }),
    get_trail: () => ({ entries: [], enabled_categories: [] }),
  });
});
afterEach(() => core.remove());

const switchControl = () => screen.getByLabelText('Look (testing)');
const headings = () => screen.getAllByRole('heading').map((h) => h.textContent);

async function choosing(look: 'Morning' | 'Midday' | 'Night' = 'Morning') {
  const view = render(<App devBuild />);
  await screen.findByText('Gambling');
  await userEvent.selectOptions(switchControl(), look);
  const pagesOf = () =>
    Array.from(view.container.querySelectorAll<HTMLElement>('.nb-page-area > .nb-spread > .nb-page'));
  return { ...view, pagesOf };
}

describe('the setup steps through App, in a notebook look', () => {
  it('opens the choosing step as one spread: categories on the left, the box and the way forward on the right', async () => {
    const { pagesOf, container } = await choosing();
    const [left, right] = pagesOf();
    expect(container.querySelectorAll('.nb-page-area > .nb-spread')).toHaveLength(1);
    expect(within(left!).getAllByRole('checkbox')).toHaveLength(cases.length);
    expect(within(right!).getByLabelText('Address to protect')).toBeInTheDocument();
    const foot = right!.lastElementChild as HTMLElement;
    expect(within(foot).getByRole('button', { name: 'Turn protection on' })).toBeInTheDocument();
    expect(headings()).toEqual(['Cairn', 'What would you like to protect?', 'Anywhere else?']);
  });

  it('asks the core the same things, with the same arguments, as Current did', async () => {
    const view = await choosing('Morning');
    await userEvent.click(screen.getByRole('checkbox', { name: /News/ }));
    await userEvent.type(screen.getByLabelText('Address to protect'), 'Example.com/path');
    await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
    await screen.findByText(/example\.com, www\.example\.com/);
    const asked = core.calls.map((c) => `${c.cmd} ${JSON.stringify(c.args)}`);
    view.unmount();
    expect(SETUP_CALLS_CURRENT).toContain('set_category_enabled {"id":"news","on":true}');
    expect(SETUP_CALLS_CURRENT).toContain('add_custom_entry {"input":"Example.com/path"}');
    expect([...asked].sort()).toEqual([...SETUP_CALLS_CURRENT].sort());
  });

  it('shows the sentence that comes back under the box on the right page', async () => {
    const { pagesOf } = await choosing();
    await userEvent.type(screen.getByLabelText('Address to protect'), 'example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
    const sentence = await screen.findByText(/example\.com, www\.example\.com/);
    expect(pagesOf()[1]!.contains(sentence)).toBe(true);
  });

  it('opens Before Cairn changes anything at the top of the page, wherever the choosing step was scrolled to (D19)', async () => {
    const { container } = await choosing();
    const area = container.querySelector('.nb-page-area') as HTMLElement;
    area.scrollTop = 300;
    await userEvent.click(screen.getByRole('button', { name: 'Turn protection on' }));
    await screen.findByRole('heading', { name: 'Before Cairn changes anything' });
    expect(area.scrollTop).toBe(0);
  });

  it('turns to Before Cairn changes anything: limits on the right, the two buttons last, and Not yet comes back', async () => {
    const { pagesOf } = await choosing();
    await userEvent.click(screen.getByRole('checkbox', { name: /News/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Turn protection on' }));
    await screen.findByRole('heading', { level: 2, name: 'Before Cairn changes anything' });
    const [left, right] = pagesOf();
    expect(within(left!).getByText(disclosures.helper)).toBeInTheDocument();
    expect(within(right!).getByRole('heading', { level: 3, name: 'What this does not cover' })).toBeInTheDocument();
    const foot = right!.lastElementChild as HTMLElement;
    expect(Array.from(foot.children).map((b) => b.textContent)).toEqual(['Yes, set this up', 'Not yet']);
    expect(headings()).toEqual(['Cairn', 'Before Cairn changes anything', 'What this does not cover']);

    await userEvent.click(within(foot).getByRole('button', { name: 'Not yet' }));
    await screen.findByRole('heading', { level: 2, name: 'What would you like to protect?' });
    expect(screen.getByRole('checkbox', { name: /News/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Shopping/ })).not.toBeChecked();
  });

  it('keeps what was typed in the box, the same box, through Morning, Midday and Night', async () => {
    await choosing('Morning');
    const box = screen.getByLabelText('Address to protect') as HTMLInputElement;
    await userEvent.type(box, 'half-typed.example');
    for (const look of ['Midday', 'Night', 'Morning']) {
      await userEvent.selectOptions(switchControl(), look);
      expect(screen.getByLabelText('Address to protect')).toBe(box);
      expect(box.value).toBe('half-typed.example');
    }
  });
});

describe.each(['Morning', 'Midday', 'Night'] as const)(
  'the choosing step shows the state it holds, on a page, in %s (T018)',
  (look) => {
    const steps = async () => {
      list = nineCategories.map((c) => ({ ...c }));
      const view = await choosing(look);
      const boxes = () => within(view.pagesOf()[0]!).getAllByRole('checkbox') as HTMLInputElement[];
      expect(boxes()).toHaveLength(9);
      return { ...view, boxes, left: () => view.pagesOf()[0]! };
    };

    it('keeps every ticked box ticked, and says why, when the untick has to wait', async () => {
      toggleAnswer = () => pendingChange;
      const { boxes, left } = await steps();
      for (const box of boxes().filter((b) => b.checked)) {
        await userEvent.click(box);
        await screen.findByText(pendingSentence);
        expect(box, box.id || 'a box').toBeChecked();
        expect(within(left()).getByText(pendingSentence)).toBeInTheDocument();
      }
      expect(boxes().filter((b) => b.checked)).toHaveLength(nineCategories.filter((c) => c.enabled).length);
    });

    it("keeps every box as it was, and shows the core's sentence, when the core refuses", async () => {
      toggleAnswer = () => {
        throw 'Cairn could not change that just now. Nothing has changed.';
      };
      const { boxes, left } = await steps();
      const before = boxes().map((b) => b.checked);
      for (const box of boxes()) {
        await userEvent.click(box);
        await within(left()).findByText('Cairn could not change that just now. Nothing has changed.');
        expect(boxes().map((b) => b.checked)).toEqual(before);
      }
    });

    it('unticks every box that comes off at once, and shows no note', async () => {
      const { boxes, left } = await steps();
      for (const box of boxes().filter((b) => b.checked)) {
        await userEvent.click(box);
        await vi.waitFor(() => expect(box).not.toBeChecked());
      }
      expect(boxes().filter((b) => b.checked)).toHaveLength(0);
      expect(left().querySelector('.nb-categories-note')).toBeNull();
    });

    it('ticks a box at once and keeps it ticked', async () => {
      const { boxes } = await steps();
      for (const box of boxes().filter((b) => !b.checked)) {
        await userEvent.click(box);
        await vi.waitFor(() => expect(box).toBeChecked());
      }
      expect(boxes().every((b) => b.checked)).toBe(true);
    });

    it('empties the address box after an address is taken and disables "Protect it"', async () => {
      const { pagesOf } = await steps();
      const right = () => pagesOf()[1]!;
      const box = () => within(right()).getByLabelText('Address to protect') as HTMLInputElement;
      const button = () => within(right()).getByRole('button', { name: 'Protect it' });

      await userEvent.type(box(), 'example.com');
      await userEvent.click(button());
      await within(right()).findByText(/example\.com, www\.example\.com/);
      expect(box().value).toBe('');
      expect(button()).toBeDisabled();
    });
  },
);

describe('the core is asked nothing new', () => {
  it('asks the core nothing the screens did not ask before', async () => {
    await choosing('Morning');
    await userEvent.click(screen.getByRole('button', { name: 'Turn protection on' }));
    await screen.findByRole('heading', { level: 2, name: 'Before Cairn changes anything' });
    cleanup();
    for (const cmd of new Set(core.calls.map((c) => c.cmd))) {
      expect(['get_protection_state', 'list_categories', 'get_disclosures', 'set_category_enabled', 'add_custom_entry']).toContain(cmd);
    }
  });
});
