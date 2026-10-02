/**
 * Through the real `App` (slice `setup-pages`, T011): in a notebook look, choosing what to protect and Before
 * Cairn changes anything open as spreads, the step's state survives a walk between looks, and Current is
 * unchanged. The core is a fake written in the test tree at the one seam the interface calls it through.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '../../App';
import type { CategoryPreset } from '../../ipc';
import { Disclosure } from '../../screens/Disclosure';
import { Choosing } from '../../screens/Setup/Choosing';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';
import { categories as cases, disclosures, readBack } from '../../screens/__tests__/setupCases';

let core: FakeCore;
let list: CategoryPreset[];

beforeEach(() => {
  list = cases.map((c) => ({ ...c }));
  core = installFakeCore({
    get_protection_state: () => readBack('off'),
    list_categories: () => list.map((c) => ({ ...c })),
    get_disclosures: () => disclosures,
    set_category_enabled: (args) => {
      const category = list.find((c) => c.id === args.id)!;
      category.enabled = Boolean(args.on);
      return null;
    },
    add_custom_entry: () => ['example.com', 'www.example.com'],
    turn_protection_on: () => ({ ...readBack('in_force'), since: 1_700_000_000 }),
    get_trail: () => ({ entries: [], enabled_categories: [] }),
  });
});
afterEach(() => core.remove());

const noop = () => undefined;
const switchControl = () => screen.getByLabelText('Look (testing)');
const headings = () => screen.getAllByRole('heading').map((h) => h.textContent);

function outside(ui: React.ReactElement): string {
  const view = render(ui);
  const html = view.container.innerHTML;
  view.unmount();
  return html;
}

async function choosing(look: 'Morning' | 'Midday' | 'Night' | 'Current' = 'Morning') {
  const view = render(<App devBuild />);
  await screen.findByText('Gambling');
  if (look !== 'Current') await userEvent.selectOptions(switchControl(), look);
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

  it('asks the core the same things, with the same arguments, as Current does', async () => {
    const script = async (look: 'Morning' | 'Current') => {
      const view = await choosing(look);
      await userEvent.click(screen.getByRole('checkbox', { name: /News/ }));
      await userEvent.type(screen.getByLabelText('Address to protect'), 'Example.com/path');
      await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
      await screen.findByText(/example\.com, www\.example\.com/);
      const asked = core.calls.map((c) => `${c.cmd} ${JSON.stringify(c.args)}`);
      core.calls.length = 0;
      view.unmount();
      list = cases.map((c) => ({ ...c }));
      return asked;
    };
    const current = await script('Current');
    const morning = await script('Morning');
    expect(current).toContain('set_category_enabled {"id":"news","on":true}');
    expect(current).toContain('add_custom_entry {"input":"Example.com/path"}');
    expect([...morning].sort()).toEqual([...current].sort());
  });

  it('shows the sentence that comes back under the box on the right page', async () => {
    const { pagesOf } = await choosing();
    await userEvent.type(screen.getByLabelText('Address to protect'), 'example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Protect it' }));
    const sentence = await screen.findByText(/example\.com, www\.example\.com/);
    expect(pagesOf()[1]!.contains(sentence)).toBe(true);
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

describe('Current is unchanged', () => {
  it("shows today's markup for both steps", async () => {
    const { container } = await choosing('Current');
    expect(container.querySelector('.nb-root')).toBeNull();
    const shown = () => (container.querySelector('main > div.mx-auto') as HTMLElement).innerHTML;
    expect(shown()).toBe(outside(<Choosing categories={cases} onToggle={noop} onTurnOn={noop} />));
    await userEvent.click(screen.getByRole('button', { name: 'Turn protection on' }));
    await screen.findByRole('heading', { level: 2, name: 'Before Cairn changes anything' });
    expect(shown()).toBe(outside(<Disclosure disclosures={disclosures} onConfirm={noop} onBack={noop} />));
  });

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
