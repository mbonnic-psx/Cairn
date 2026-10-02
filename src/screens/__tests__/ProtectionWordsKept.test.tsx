/**
 * Protection and What is protected keep every word, control and state they had before the notebook became the only
 * layout (slice `reveal`, Increment 1a, D43, FR-018). The baseline is the markup the screens gave outside any shell,
 * kept in `beforeTheReveal.ts`; each case is rendered inside `NotebookShell`, in each look, and its words, controls
 * and states must equal the baseline's. The core is a fake written in this tree.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotebookShell } from '../../shell/NotebookShell';
import { Protection } from '../Protection';
import { Trail } from '../Trail';
import { baseline, controlsOf, wordsOf, PROTECTION, TRAIL } from './beforeTheReveal';
import { installFakeCore, never, type FakeCore } from './fakeCore';
import { cases, trailCases } from './pinCases';

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

const TROUBLE = 'Cairn could not read its settings just now.';

function onPage(ui: React.ReactElement, look: 'morning' | 'midday' | 'night', tab: 'protection' | 'trail') {
  const tabs = [{ id: tab, label: tab === 'trail' ? 'What is protected' : 'Protection', current: true }];
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
      {ui}
    </NotebookShell>,
  );
  return view.container.querySelector('main') as HTMLElement;
}

describe('the states the baseline holds', () => {
  it('are the checking state, the unreadable state and every pin case of Protection', () => {
    expect(Object.keys(PROTECTION).sort()).toEqual(['checking', 'trouble', ...Object.keys(cases)].sort());
    expect(Object.keys(PROTECTION)).toHaveLength(11);
  });

  it('are every pin case of What is protected', () => {
    expect(Object.keys(TRAIL).sort()).toEqual(Object.keys(trailCases).sort());
    expect(Object.keys(TRAIL)).toHaveLength(9);
  });
});

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (look) => {
  it('Protection, while the machine is being checked, keeps its words and controls', () => {
    core = installFakeCore({ get_protection_state: never });
    const main = onPage(<Protection />, look, 'protection');
    const was = baseline(PROTECTION['checking']!);
    expect(wordsOf(main)).toEqual(wordsOf(was));
    expect(controlsOf(main)).toEqual(controlsOf(was));
  });

  it('Protection, when the read could not be made, keeps its words and controls', async () => {
    core = installFakeCore({
      get_protection_state: () => {
        throw TROUBLE;
      },
    });
    const main = onPage(<Protection />, look, 'protection');
    await screen.findByText(TROUBLE);
    const was = baseline(PROTECTION['trouble']!);
    expect(wordsOf(main)).toEqual(wordsOf(was));
    expect(controlsOf(main)).toEqual(controlsOf(was));
  });

  it.each(Object.keys(cases))('Protection, %s, keeps its words and controls', (name) => {
    const main = onPage(<Protection {...cases[name]!} />, look, 'protection');
    const was = baseline(PROTECTION[name]!);
    expect(wordsOf(main)).toEqual(wordsOf(was));
    expect(controlsOf(main)).toEqual(controlsOf(was));
  });

  it.each(Object.keys(trailCases))('What is protected, %s, keeps its words and controls', (name) => {
    const main = onPage(<Trail {...trailCases[name]!} />, look, 'trail');
    const was = baseline(TRAIL[name]!);
    expect(wordsOf(main)).toEqual(wordsOf(was));
    expect(controlsOf(main)).toEqual(controlsOf(was));
  });
});

describe('the baseline itself', () => {
  it('holds the one control the screens ever offered, where a change is waiting', () => {
    expect(controlsOf(baseline(PROTECTION['off, a change waiting']!))).toEqual([
      'button | Keep things as they are | disabled=false | pressed=null',
    ]);
    expect(controlsOf(baseline(PROTECTION['in force']!))).toEqual([]);
  });
});
