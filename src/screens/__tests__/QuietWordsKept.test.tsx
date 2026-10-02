/**
 * What Cairn covers and This machine is as it was keep every word, control and state they had before the notebook
 * became the only layout (slice `reveal`, Increment 1b, D43, FR-018). Each pin case is rendered inside
 * `NotebookShell`, in each look, and its words, controls and states must equal the baseline's
 * (`beforeTheReveal.ts`).
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotebookShell } from '../../shell/NotebookShell';
import { Limits } from '../Limits';
import { Teardown } from '../Teardown';
import { baseline, controlsOf, wordsOf, LIMITS, TEARDOWN, TEARDOWN_COMPLETE_WITH_RESIDUE } from './beforeTheReveal';
import { disclosureCases, teardownCases } from './quietCases';

function onPage(ui: React.ReactElement, look: 'morning' | 'midday' | 'night', tab: 'limits' | 'protection') {
  const tabs = [{ id: tab, label: tab === 'limits' ? 'What Cairn covers' : 'Protection', current: true }];
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
      {ui}
    </NotebookShell>,
  );
  return view.container.querySelector('main') as HTMLElement;
}

describe('the states the baseline holds', () => {
  it('are two shapes of What Cairn covers', () => {
    expect(Object.keys(LIMITS).sort()).toEqual(Object.keys(disclosureCases).sort());
    expect(Object.keys(LIMITS)).toHaveLength(2);
  });

  it('are four shapes of the teardown report', () => {
    expect(Object.keys(TEARDOWN).sort()).toEqual(Object.keys(teardownCases).sort());
    expect(Object.keys(TEARDOWN)).toHaveLength(4);
  });
});

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (look) => {
  it.each(Object.keys(disclosureCases))('What Cairn covers, %s, keeps its words and controls', (name) => {
    const main = onPage(<Limits disclosures={disclosureCases[name]!} />, look, 'limits');
    const was = baseline(LIMITS[name]!);
    expect(wordsOf(main)).toEqual(wordsOf(was));
    expect(controlsOf(main)).toEqual(controlsOf(was));
  });

  it.each(Object.keys(teardownCases))('This machine is as it was, %s, keeps its words and controls', (name) => {
    const main = onPage(<Teardown report={teardownCases[name]!} />, look, 'protection');
    const was = baseline(TEARDOWN[name]!);
    expect(wordsOf(main)).toEqual(wordsOf(was));
    expect(controlsOf(main)).toEqual(controlsOf(was));
  });

  it('This machine is as it was, complete but with something left, keeps its words and controls', () => {
    const report = {
      complete: true,
      confirmed: ['The background component is removed.'],
      residue: ['a browser policy file Cairn wrote is still there'],
    };
    const main = onPage(<Teardown report={report} />, look, 'protection');
    const was = baseline(TEARDOWN_COMPLETE_WITH_RESIDUE);
    expect(wordsOf(main)).toEqual(wordsOf(was));
    expect(controlsOf(main)).toEqual(controlsOf(was));
  });
});

describe('the baseline itself', () => {
  it('offers no control: both screens only report', () => {
    for (const html of [...Object.values(LIMITS), ...Object.values(TEARDOWN)]) {
      expect(controlsOf(baseline(html))).toEqual([]);
    }
  });
});
