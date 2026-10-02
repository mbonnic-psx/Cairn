/**
 * The pin (slice 004 `tonight-page`, T001): today's markup of the Today screen, both views, and of
 * Tonight, every state, outside any shell.
 *
 * The records live in `beforeTheReveal.ts`. Captured from the code as it stood before the slice changed either screen (`4e4b76c`), and seen passing
 * there. Outside a notebook page both screens must render exactly this, element for element (SC-009), so
 * Current and every existing screen test are unchanged. A change here is a change to today's interface: it
 * needs its own decision, never a re-capture to make a test pass.
 *
 * Every time of day is interpolated from the same `toLocaleTimeString` call the screens make, so the pin
 * does not depend on the runner's locale; the zone is fixed before any date is made.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckIn } from '../CheckIn';
import { Reaches } from '../Reaches';
import { OVER_TIME, TODAY, TONIGHT } from './beforeTheReveal';
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

describe("Today, the Today view, outside any shell, is today's markup", () => {
  it.each(Object.keys(todayCases))('%s', (name) => {
    const { container } = render(
      <Reaches today={todayCases[name]} read={silentReader} now={evening} />,
    );
    expect(container.innerHTML).toBe(TODAY[name]);
  });

  it('pins every case', () => {
    expect(Object.keys(TODAY).sort()).toEqual(Object.keys(todayCases).sort());
  });
});

describe("Today, the Over time view, outside any shell, is today's markup", () => {
  it.each(Object.keys(overTimeCases))('%s', async (name) => {
    const answer = overTimeCases[name]!;
    const { container } = render(
      <Reaches today={todayCases['nothing yet, the fallback note']} read={overTimeReader(answer)} now={evening} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Over time' }));
    if (answer === 'unreadable') {
      await screen.findByText('Cairn could not read your history just now. Protection is unaffected.');
    } else if (answer !== 'looking') {
      await screen.findByText(answer.sealed ?? 'Cairn counts only while it is running. This is what it saw over these days.');
    }
    expect(container.innerHTML).toBe(OVER_TIME[name]);
  });

  it('pins every case', () => {
    expect(Object.keys(OVER_TIME).sort()).toEqual(Object.keys(overTimeCases).sort());
  });
});

describe("Tonight, outside any shell, is today's markup", () => {
  let core: FakeCore | undefined;
  afterEach(() => {
    core?.remove();
    core = undefined;
    vi.useRealTimers();
  });

  /** Lets every answer the fake core has given reach the screen. */
  const settle = () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

  it.each(Object.keys(tonightCases))('%s', async (name) => {
    const c = tonightCases[name]!;
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(c.endsWhileOpen ? lateEvening() : evening());
    core = installFakeCore(tonightCore(c));

    const { container } = render(<CheckIn />);
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

    expect(container.innerHTML).toBe(TONIGHT[name]);
  });

  it('pins every case', () => {
    expect(Object.keys(TONIGHT).sort()).toEqual(Object.keys(tonightCases).sort());
  });
});
