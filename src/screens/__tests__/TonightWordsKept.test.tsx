/**
 * Today (both views) and Tonight keep every word, control and state they had before the notebook became the only
 * layout (slice `reveal`, Increment 1d, D43, FR-018). Each pin case is brought about the way the pin brought it
 * about, but inside `NotebookShell`, in each look; its words, controls and states must equal the baseline's
 * (`beforeTheReveal.ts`). The core is the IPC fake and the clock is Vitest's fake timers, as the pin does.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotebookShell } from '../../shell/NotebookShell';
import { CheckIn } from '../CheckIn';
import { Reaches } from '../Reaches';
import {
  baseline,
  controlsOf,
  structureOf,
  wordsOf,
  BY_DAY_DELTA,
  DAY_BY_DAY_DELTA,
  OVER_TIME,
  TODAY,
  TONIGHT,
  type Delta,
} from './beforeTheReveal';
import { installFakeCore, type FakeCore } from './fakeCore';
import {
  evening,
  lateEvening,
  overTimeCases,
  overTimeReader,
  silentReader,
  todayCases,
  tonightCases,
  tonightCore,
} from './tonightCases';

type Look = 'morning' | 'midday' | 'night';

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
  vi.useRealTimers();
});

function onPage(ui: React.ReactElement, look: Look) {
  const tabs = [{ id: 'reaches' as const, label: 'Tonight', current: true }];
  const view = render(
    <NotebookShell tabs={tabs} onSelect={vi.fn()} look={look}>
      {ui}
    </NotebookShell>,
  );
  return view.container.querySelector('main') as HTMLElement;
}

/** Lets every answer the fake core has given reach the screen. */
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

function expectKept(shown: HTMLElement, html: string, deltas: Delta[] = []) {
  const was = baseline(html);
  expect(wordsOf(shown)).toEqual(wordsOf(was, deltas));
  expect(controlsOf(shown)).toEqual(controlsOf(was, deltas));
  expect(structureOf(shown)).toEqual(structureOf(was, deltas));
}

describe('the states the baseline holds', () => {
  it('are the 6 of Today, the 9 of Over time and the 16 of Tonight', () => {
    expect(Object.keys(TODAY).sort()).toEqual(Object.keys(todayCases).sort());
    expect(Object.keys(TODAY)).toHaveLength(6);
    expect(Object.keys(OVER_TIME).sort()).toEqual(Object.keys(overTimeCases).sort());
    expect(Object.keys(OVER_TIME)).toHaveLength(9);
    expect(Object.keys(TONIGHT).sort()).toEqual(Object.keys(tonightCases).sort());
    expect(Object.keys(TONIGHT)).toHaveLength(16);
  });
});

describe.each(['morning', 'midday', 'night'] as const)('in the %s look', (look) => {
  it.each(Object.keys(todayCases))('Today, %s, keeps its words and controls', (name) => {
    const main = onPage(<Reaches today={todayCases[name]} read={silentReader} now={evening} />, look);
    expectKept(main, TODAY[name]!);
  });

  it.each(Object.keys(overTimeCases))('Over time, %s, keeps its words and controls', async (name) => {
    const answer = overTimeCases[name]!;
    const main = onPage(
      <Reaches today={todayCases['nothing yet, the fallback note']} read={overTimeReader(answer)} now={evening} />,
      look,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Over time' }));
    if (answer === 'unreadable') {
      await screen.findByText('Cairn could not read your history just now. Protection is unaffected.');
    } else if (answer !== 'looking') {
      await screen.findByText(answer.sealed ?? 'Cairn counts only while it is running. This is what it saw over these days.');
    }
    expectKept(main, OVER_TIME[name]!, [BY_DAY_DELTA, DAY_BY_DAY_DELTA]);
  });

  it.each(Object.keys(tonightCases))('Tonight, %s, keeps its words and controls', async (name) => {
    const c = tonightCases[name]!;
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(c.endsWhileOpen ? lateEvening() : evening());
    core = installFakeCore(tonightCore(c));

    const main = onPage(<CheckIn />, look);
    await settle();

    if (c.keep) {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: c.keep.typed } });
      fireEvent.click(screen.getByRole('button', { name: 'Keep this' }));
      await settle();
    }
    if (c.switchRefused) {
      fireEvent.click(screen.getByRole('button', { name: 'Hide quotes' }));
      await settle();
    }
    if (c.endsWhileOpen) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
      });
    }
    expectKept(main, TONIGHT[name]!);
  });
});

describe('the baseline itself', () => {
  it('holds the writing space and the buttons an open day offers', () => {
    const controls = controlsOf(baseline(TONIGHT['reaches, with a quote']!));
    expect(controls).toContain('button | Keep this | disabled=true | pressed=null');
    expect(controls).toContain('button | Hide quotes | disabled=false | pressed=null');
    expect(controls.some((c) => c.startsWith('textarea | How the day went'))).toBe(true);
  });
});
