/**
 * Through the real `App` (slice `protection-page`, T009): in a notebook look the Protection tab and the
 * What is protected tab open as spreads under the notebook's heading outline, and Current is unchanged.
 * The core is a fake written in the test tree at the one seam the interface calls it through.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import App from '../../App';
import type { ProtectionState, Trail as TrailData } from '../../ipc';
import { Protection } from '../../screens/Protection';
import { Trail } from '../../screens/Trail';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';

const state: ProtectionState = {
  status: 'in_force',
  since: 1_700_000_000,
  verified_at: null,
  entry_count_verified: 42,
};
const trail: TrailData = {
  entries: [
    { domain: 'example.com', sources: [], auto_www: false },
    { domain: 'www.example.com', sources: [], auto_www: true },
    { domain: 'news.example', sources: [], auto_www: false },
  ],
  enabled_categories: ['social', 'news'],
};

let core: FakeCore;
beforeEach(() => {
  core = installFakeCore({
    get_protection_state: () => state,
    get_trail: () => trail,
    list_categories: () => [],
    get_disclosures: () => ({
      in_force: [],
      not_covered: [],
      helper: '',
      encryption: '',
      administrator: '',
    }),
    cancel_pending_change: () => null,
  });
});
afterEach(() => core.remove());

const switchControl = () => screen.getByLabelText('Look (testing)');
const headings = () => screen.getAllByRole('heading').map((h) => h.textContent);

/** The markup a screen has outside any shell: what Current must show. */
function outside(ui: React.ReactElement): string {
  const view = render(ui);
  const html = view.container.innerHTML;
  view.unmount();
  return html;
}

async function open(tab: string, heading: string) {
  const view = render(<App devBuild />);
  await screen.findByRole('heading', { level: 2, name: 'Protection is on' });
  await userEvent.selectOptions(switchControl(), 'Morning');
  await userEvent.click(await screen.findByRole('button', { name: tab }));
  await screen.findByRole('heading', { level: 2, name: heading });
  return view;
}

describe('the notebook looks through App', () => {
  it('Protection opens a spread: two pages in the page area, the right one ruled and empty', async () => {
    const { container } = render(<App devBuild />);
    await screen.findByRole('heading', { level: 2, name: 'Protection is on' });
    await userEvent.selectOptions(switchControl(), 'Morning');
    const area = container.querySelector('.nb-page-area') as HTMLElement;
    const spread = area.querySelector('.nb-spread') as HTMLElement;
    const pages = Array.from(spread.querySelectorAll(':scope > .nb-page'));
    expect(pages).toHaveLength(2);
    expect(pages[1]).toHaveClass('nb-page--ruled');
    expect(pages[1]!.textContent).toBe('');
    expect(within(pages[0] as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Protection is on',
    );
    expect(headings()).toEqual(['Cairn', 'Protection is on']);
  });

  it('What is protected opens its spread with every entry, under the same outline', async () => {
    const { container } = await open('What is protected', 'What you are protecting');
    const right = container.querySelectorAll('.nb-page-area .nb-spread > .nb-page')[1] as HTMLElement;
    expect(right).toHaveClass('nb-page--ruled');
    expect(within(right).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'example.com',
      'www.example.comadded with its root address',
      'news.example',
    ]);
    expect(headings()).toEqual(['Cairn', 'What you are protecting']);
  });

  it('Current shows today’s markup for both screens', async () => {
    const { container } = await open('What is protected', 'What you are protecting');
    await userEvent.selectOptions(switchControl(), 'Current');
    expect(container.querySelector('.nb-root')).toBeNull();
    const shown = () => (container.querySelector('main > div.mx-auto') as HTMLElement).innerHTML;
    expect(shown()).toBe(outside(<Trail trail={trail} status="in_force" />));
    await userEvent.click(screen.getByRole('button', { name: 'Protection' }));
    await screen.findByRole('heading', { level: 2, name: 'Protection is on' });
    expect(shown()).toBe(outside(<Protection state={state} />));
  });

  it('asks the core nothing the screens did not ask before', async () => {
    await open('What is protected', 'What you are protecting');
    const asked = new Set(core.calls.map((c) => c.cmd));
    for (const cmd of asked) {
      expect(['get_protection_state', 'get_trail', 'list_categories', 'get_disclosures']).toContain(cmd);
    }
  });
});
