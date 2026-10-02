/**
 * Before Cairn changes anything, told it is on a notebook page (slice `setup-pages`, T008–T009): the same words
 * as outside any shell, laid out as a spread whose right page ends with the two buttons, whatever the details.
 * The core is a fake written in this tree at the one seam the interface calls it through.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NotebookLook } from '../../look/look';
import { NotebookShell } from '../../shell/NotebookShell';
import { Disclosure } from '../Disclosure';
import { installFakeCore, type FakeCore } from './fakeCore';
import { disclosures } from './setupCases';

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

const noop = () => undefined;
const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];

function onPage(ui: React.ReactElement, look: NotebookLook = 'morning') {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={noop} look={look}>
      {ui}
    </NotebookShell>,
  );
  const main = view.container.querySelector('main') as HTMLElement;
  const spread = main.querySelector(':scope > .nb-spread') as HTMLElement | null;
  const pages = spread ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page')) : [];
  return { ...view, main, spread, pages, left: pages[0]!, right: pages[1]! };
}

function outside(ui: React.ReactElement): string {
  const view = render(ui);
  const text = view.container.textContent ?? '';
  view.unmount();
  return text;
}

describe.each(['morning', 'midday', 'night'] as const)('Disclosure on a notebook page, in the %s look (T008)', (look) => {
  const given = (onConfirm = noop, onBack = noop) => (
    <Disclosure disclosures={disclosures} onConfirm={onConfirm} onBack={onBack} />
  );

  it('is one spread of two pages with no card and no entrance', () => {
    const { spread, pages, main } = onPage(given(), look);
    expect(spread).not.toBeNull();
    expect(pages).toHaveLength(2);
    expect(main.querySelector('.settle')).toBeNull();
    expect(main.querySelector('.rounded-2xl')).toBeNull();
  });

  it('puts the heading, the opening paragraph, what changes and the background component on the left', () => {
    const { left } = onPage(given(), look);
    expect(within(left).getByRole('heading', { level: 2, name: 'Before Cairn changes anything' })).toBeInTheDocument();
    expect(within(left).getByText(/Cairn protects this whole machine/)).toBeInTheDocument();
    for (const line of disclosures.in_force) expect(within(left).getByText(line)).toBeInTheDocument();
    expect(within(left).getByText(disclosures.helper)).toBeInTheDocument();
    expect(within(left).queryByText(disclosures.administrator)).toBeNull();
  });

  it('puts what this does not cover and the note on administrators on the right, before the buttons', () => {
    const { right } = onPage(given(), look);
    const heading = within(right).getByRole('heading', { level: 3, name: 'What this does not cover' });
    for (const line of disclosures.not_covered) expect(within(right).getByText(line)).toBeInTheDocument();
    const note = within(right).getByText(disclosures.administrator);
    const yes = within(right).getByRole('button', { name: 'Yes, set this up' });
    const no = within(right).getByRole('button', { name: 'Not yet' });
    const before = (a: Element, b: Element) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(before(heading, note)).toBeTruthy();
    expect(before(note, yes)).toBeTruthy();
    expect(before(yes, no)).toBeTruthy();
  });

  it('does not show the encryption line, as today', () => {
    const { main } = onPage(given(), look);
    expect(main.textContent).not.toContain(disclosures.encryption);
  });

  it('calls onConfirm once for "Yes, set this up" and onBack once for "Not yet"', async () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();
    const { right } = onPage(given(onConfirm, onBack), look);
    await userEvent.click(within(right).getByRole('button', { name: 'Yes, set this up' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
    await userEvent.click(within(right).getByRole('button', { name: 'Not yet' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hides the bullet dots from assistive technology and draws the buttons plain', () => {
    const { main, right } = onPage(given(), look);
    const dots = Array.from(main.querySelectorAll('.nb-disclosure-dot'));
    expect(dots).toHaveLength(disclosures.in_force.length + disclosures.not_covered.length);
    for (const dot of dots) expect(dot.getAttribute('aria-hidden')).toBe('true');
    for (const button of Array.from(right.querySelectorAll('button'))) {
      expect(button.className).not.toMatch(/transition-colors|duration-200|bg-clay|hover:bg-sand/);
    }
  });

  it('keeps the heading outline: Cairn, the page heading, then the limits', () => {
    onPage(given(), look);
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Cairn',
      'Before Cairn changes anything',
      'What this does not cover',
    ]);
  });

  it('says the same words as the same details outside any shell', () => {
    expect(onPage(given(), look).main.textContent).toBe(outside(given()));
  });

  it('shows the same spread once the details are fetched through the core', async () => {
    core = installFakeCore({ get_disclosures: () => disclosures });
    const ui = <Disclosure onConfirm={noop} onBack={noop} />;
    const { main } = onPage(ui, look);
    await screen.findByRole('heading', { level: 3, name: 'What this does not cover' });
    const [left, right] = Array.from(main.querySelectorAll<HTMLElement>(':scope > .nb-spread > .nb-page'));
    expect(within(left!).getByText(disclosures.helper)).toBeInTheDocument();
    expect(within(right!).getByText(disclosures.administrator)).toBeInTheDocument();
    expect(core.calls.filter((c) => c.cmd === 'get_disclosures')).toHaveLength(1);
  });
});
