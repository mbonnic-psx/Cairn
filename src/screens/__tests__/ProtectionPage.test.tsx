/**
 * Protection told it is on a notebook page (slice `protection-page`, T004–T006): the same words as outside
 * any shell, laid out as a spread. Rendered inside `NotebookShell`; the core is a fake written in this tree.
 */
import { render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { protectionWords } from '../../ipc';
import { NotebookShell } from '../../shell/NotebookShell';
import { Protection } from '../Protection';
import type { FakeCore } from './fakeCore';
import { cases } from './pinCases';

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];

function onPage(ui: React.ReactElement) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look="morning">
      {ui}
    </NotebookShell>,
  );
  const spread = view.container.querySelector('main .nb-spread') as HTMLElement | null;
  const pages = spread ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page')) : [];
  const main = view.container.querySelector('main') as HTMLElement;
  return { ...view, spread, left: pages[0], right: pages[1], pages, main };
}

function outside(ui: React.ReactElement): string {
  const view = render(ui);
  const text = view.container.textContent ?? '';
  view.unmount();
  return text;
}

describe('Protection on a notebook page, with a state', () => {
  for (const name of ['off', 'in force', 'not confirmed']) {
    const { state } = cases[name]!;
    const words = protectionWords[state.status];

    describe(name, () => {
      it('sits in one spread of two pages', () => {
        const { spread, pages } = onPage(<Protection state={state} />);
        expect(spread).not.toBeNull();
        expect(pages).toHaveLength(2);
      });

      it('holds the badge, the heading and the sentence on the left page', () => {
        const { left } = onPage(<Protection state={state} />);
        expect(within(left!).getByRole('heading', { level: 2, name: words.title })).toBeInTheDocument();
        expect(within(left!).getByText(words.detail)).toBeInTheDocument();
        expect(within(left!).getAllByText(words.title)).toHaveLength(2);
      });

      it('leaves the right page ruled, with no text and no control', () => {
        const { right } = onPage(<Protection state={state} />);
        expect(right).toHaveClass('nb-page--ruled');
        expect(right!.textContent).toBe('');
        expect(right!.querySelector('button, a, input')).toBeNull();
      });

      it('says the same words as outside any shell, and runs no entrance', () => {
        const { main } = onPage(<Protection state={state} />);
        expect(main.textContent).toBe(outside(<Protection state={state} />));
        expect(main.querySelector('.settle')).toBeNull();
      });
    });
  }

  for (const name of ['in force', 'not confirmed']) {
    it(`${name} holds both figures on the left page`, () => {
      const { state } = cases[name]!;
      const { left } = onPage(<Protection state={state} />);
      expect(within(left!).getByText('Addresses in force').nextElementSibling).toHaveTextContent(
        String(state.entry_count_verified),
      );
      expect(within(left!).getByText('Last checked').nextElementSibling).toHaveTextContent('not yet');
    });
  }

  it('off holds neither figure', () => {
    const { left } = onPage(<Protection state={cases['off']!.state} />);
    expect(within(left!).queryByText('Addresses in force')).toBeNull();
    expect(within(left!).queryByText('Last checked')).toBeNull();
  });
});
