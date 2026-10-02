/**
 * Protection told it is on a notebook page (slice `protection-page`, T004–T006): the same words as before the notebook,
 * laid out as a spread. Rendered inside `NotebookShell`; the core is a fake written in this tree.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { protectionWords } from '../../ipc';
import { NotebookShell } from '../../shell/NotebookShell';
import type { NotebookLook } from '../../look/look';
import { Protection } from '../Protection';
import { installFakeCore, never, type FakeCore } from './fakeCore';
import { baseline, wordsOf, PROTECTION } from './beforeTheReveal';
import { cases, ready, waiting } from './pinCases';

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

const tabs = [{ id: 'protection' as const, label: 'Protection', current: true }];

/** The look the cases below run in: every case runs in all three (the quickstart says so). */
let look: NotebookLook = 'morning';

function onPage(ui: React.ReactElement) {
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
      {ui}
    </NotebookShell>,
  );
  const spread = view.container.querySelector('main .nb-spread') as HTMLElement | null;
  const pages = spread ? Array.from(spread.querySelectorAll<HTMLElement>(':scope > .nb-page')) : [];
  const main = view.container.querySelector('main') as HTMLElement;
  return { ...view, spread, left: pages[0], right: pages[1], pages, main };
}

/** The words the screen said before the notebook, from the baseline (`beforeTheReveal.ts`), never from a render. */
function wasText(name: string): string {
  return baseline(PROTECTION[name]!).textContent ?? '';
}

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (name) => {
  beforeEach(() => {
    look = name;
  });

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

        it('says the words it said before the notebook, and runs no entrance', () => {
          const { main } = onPage(<Protection state={state} />);
          expect(main.textContent).toBe(wasText(name));
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

  describe('Protection on a notebook page, with a change waiting', () => {
    for (const name of ['off', 'in force', 'not confirmed']) {
      const { state } = cases[name]!;

      it(`${name}: the waiting note sits on the right page, in the amber language`, () => {
        const { left, right } = onPage(<Protection state={state} pending={waiting} />);
        expect(within(right!).getByText('Turn protection off')).toBeInTheDocument();
        expect(
          within(right!).getByText('This takes effect in 23 hours. Until then, nothing changes.'),
        ).toBeInTheDocument();
        expect(within(right!).getByRole('button', { name: 'Keep things as they are' })).toBeInTheDocument();
        expect(within(left!).queryByText('Turn protection off')).toBeNull();
        const note = right!.querySelector('.nb-protection-note');
        expect(note).not.toBeNull();
        expect(right!.innerHTML).not.toMatch(/red/i);
      });

      it(`${name}: says the words it said before the notebook`, () => {
        const { main } = onPage(<Protection state={state} pending={waiting} />);
        expect(wordsOf(main)).toEqual(wordsOf(baseline(PROTECTION[`${name}, a change waiting`]!)));
      });
    }

    it('a change that is ready says so', () => {
      const { right } = onPage(<Protection state={cases['in force']!.state} pending={ready} />);
      expect(within(right!).getByText('This is ready to take effect.')).toBeInTheDocument();
      expect(within(right!).queryByText(/This takes effect in/)).toBeNull();
    });

    it('with no change waiting, the right page stays blank and ruled', () => {
      const { right } = onPage(<Protection state={cases['in force']!.state} pending={null} />);
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
    });

    it('"Keep things as they are" asks the core once, then says it is cancelled', async () => {
      core = installFakeCore({ cancel_pending_change: () => null });
      const onCancelled = vi.fn();
      const { right } = onPage(
        <Protection state={cases['in force']!.state} pending={waiting} onCancelled={onCancelled} />,
      );
      fireEvent.click(within(right!).getByRole('button', { name: 'Keep things as they are' }));
      await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1));
      expect(core.calls).toEqual([{ cmd: 'cancel_pending_change', args: { id: 'abc' } }]);
    });

    it('the button is reachable by keyboard', () => {
      const { right } = onPage(<Protection state={cases['in force']!.state} pending={waiting} />);
      const button = within(right!).getByRole('button', { name: 'Keep things as they are' });
      button.focus();
      expect(button).toHaveFocus();
      expect(button.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Protection on a notebook page, before it has a state', () => {
    it('checking: the left page says so and the right is blank and ruled', () => {
      core = installFakeCore({ get_protection_state: never });
      const { spread, left, right, main } = onPage(<Protection />);
      expect(spread).not.toBeNull();
      expect(within(left!).getByText('Checking this machine…')).toBeInTheDocument();
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(main.textContent).toBe(wasText('checking'));
      expect(main.querySelector('button, dl, h2')).toBeNull();
    });

    it('a read that could not be made: the core’s sentence, the right page blank and ruled', async () => {
      core = installFakeCore({
        get_protection_state: () => {
          throw 'Cairn could not read its settings just now.';
        },
      });
      const { spread, left, right, main } = onPage(<Protection />);
      expect(spread).not.toBeNull();
      await screen.findByText('Cairn could not read its settings just now.');
      expect(within(left!).getByText('Cairn could not read its settings just now.')).toBeInTheDocument();
      expect(right).toHaveClass('nb-page--ruled');
      expect(right!.textContent).toBe('');
      expect(main.querySelector('button, dl, h2')).toBeNull();
      expect(main.textContent).toBe('Cairn could not read its settings just now.');
    });
  });
});

describe('Protection rendered alone, with no shell, is its spread', () => {
  const alone = (ui: React.ReactElement) => {
    const view = render(ui);
    const spread = view.container.querySelector('.nb-spread');
    return { ...view, spread, pages: spread ? spread.querySelectorAll(':scope > .nb-page') : [] };
  };

  for (const name of ['off', 'in force', 'not confirmed']) {
    it(`${name}: one spread of two pages`, () => {
      const { spread, pages } = alone(<Protection state={cases[name]!.state} />);
      expect(spread).not.toBeNull();
      expect(pages).toHaveLength(2);
    });

    it(`${name}, a change waiting: one spread of two pages, the note on the right`, () => {
      const { spread, pages } = alone(<Protection state={cases[name]!.state} pending={waiting} />);
      expect(spread).not.toBeNull();
      expect(pages).toHaveLength(2);
      expect(within(pages[1] as HTMLElement).getByRole('button', { name: 'Keep things as they are' })).toBeInTheDocument();
    });
  }

  it('checking: one spread of two pages', () => {
    core = installFakeCore({ get_protection_state: never });
    const { spread, pages } = alone(<Protection />);
    expect(spread).not.toBeNull();
    expect(pages).toHaveLength(2);
  });

  it('a read that could not be made: one spread of two pages', async () => {
    core = installFakeCore({
      get_protection_state: () => {
        throw 'Cairn could not read its settings just now.';
      },
    });
    const { spread, pages } = alone(<Protection />);
    await screen.findByText('Cairn could not read its settings just now.');
    expect(spread).not.toBeNull();
    expect(pages).toHaveLength(2);
  });
});
