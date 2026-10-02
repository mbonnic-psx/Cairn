/**
 * Through the real `App` (slice `quiet-pages`, T006): in a notebook look the What Cairn covers tab opens a
 * spread under the notebook's heading outline, with protection on or off, and Current is unchanged. The core
 * is a fake written in the test tree at the one seam the interface calls it through.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import App from '../../App';
import type { ProtectionState } from '../../ipc';
import { Limits } from '../../screens/Limits';
import { installFakeCore, type FakeCore } from '../../screens/__tests__/fakeCore';
import { disclosureCases } from '../../screens/__tests__/quietCases';

const disclosures = disclosureCases['the background component can run']!;
const inForce: ProtectionState = {
  status: 'in_force',
  since: 1_700_000_000,
  verified_at: null,
  entry_count_verified: 3,
};
const off: ProtectionState = { status: 'off', since: null, verified_at: null, entry_count_verified: 0 };

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

function fakeCore(state: ProtectionState) {
  core = installFakeCore({
    get_protection_state: () => state,
    get_trail: () => ({ entries: [], enabled_categories: [] }),
    list_categories: () => [],
    get_disclosures: () => disclosures,
    cancel_pending_change: () => null,
  });
}

const protectionIsOn = () => screen.findByRole('heading', { level: 2, name: 'Protection is on' });
const choosing = () => screen.findByRole('button', { name: 'Turn protection on' });
const switchControl = () => screen.getByLabelText('Look (testing)');
const headings = (levels = [1, 2, 3]) =>
  screen
    .getAllByRole('heading')
    .filter((h) => levels.includes(Number(h.tagName.slice(1))))
    .map((h) => h.textContent);

/** The markup a screen has outside any shell: what Current must show. */
function outside(ui: React.ReactElement): string {
  const view = render(ui);
  const html = view.container.innerHTML;
  view.unmount();
  return html;
}

/** `ready` waits for the first screen: with protection off App opens on the choosing screen, not a heading. */
async function openLimits(state: ProtectionState, ready: () => Promise<unknown>) {
  fakeCore(state);
  const view = render(<App devBuild />);
  await ready();
  await userEvent.selectOptions(switchControl(), 'Morning');
  await userEvent.click(await screen.findByRole('button', { name: 'What Cairn covers' }));
  await screen.findByRole('heading', { level: 2, name: 'What Cairn covers' });
  return view;
}

describe('What Cairn covers through App, in a notebook look', () => {
  it('opens a spread: two pages in the page area, the right one ruled and empty, every line on the left', async () => {
    const { container } = await openLimits(inForce, protectionIsOn);
    const area = container.querySelector('.nb-page-area') as HTMLElement;
    const spread = area.querySelector('.nb-spread') as HTMLElement;
    const pages = Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page'));
    expect(pages).toHaveLength(2);
    expect(pages[1]).toHaveClass('nb-page--ruled');
    expect(pages[1]!.textContent).toBe('');
    const left = pages[0]!;
    for (const line of [...disclosures.in_force, ...disclosures.not_covered]) {
      expect(within(left).getByText(line)).toBeInTheDocument();
    }
    expect(within(left).getByText(disclosures.encryption)).toBeInTheDocument();
    expect(within(left).getByText(disclosures.administrator)).toBeInTheDocument();
  });

  it('reads as "Cairn" then the page\'s own h2, the section labels beneath it', async () => {
    await openLimits(inForce, protectionIsOn);
    expect(headings([1, 2])).toEqual(['Cairn', 'What Cairn covers']);
    expect(headings()).toEqual([
      'Cairn',
      'What Cairn covers',
      'What it does not cover in this release',
      'What is kept, and how',
    ]);
  });

  it('has its tab with protection off as well', async () => {
    const { container } = await openLimits(off, choosing);
    expect(container.querySelector('.nb-page-area .nb-spread.nb-limits-leaves')).not.toBeNull();
    expect(headings([1, 2])).toEqual(['Cairn', 'What Cairn covers']);
  });

  it('shows today\'s markup in Current', async () => {
    const { container } = await openLimits(inForce, protectionIsOn);
    await userEvent.selectOptions(switchControl(), 'Current');
    expect(container.querySelector('.nb-root')).toBeNull();
    const shown = (container.querySelector('main > div.mx-auto') as HTMLElement).innerHTML;
    expect(shown).toBe(outside(<Limits disclosures={disclosures} />));
    expect(container.querySelector('.nb-spread')).toBeNull();
  });

  it('asks the core nothing the screens did not ask before', async () => {
    await openLimits(inForce, protectionIsOn);
    const asked = new Set(core!.calls.map((c) => c.cmd));
    for (const cmd of asked) {
      expect(['get_protection_state', 'get_trail', 'list_categories', 'get_disclosures']).toContain(cmd);
    }
  });
});
