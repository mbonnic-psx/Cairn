/**
 * Two behaviours of Tonight on a notebook page that the page tests did not pin (slice `tonight-page`,
 * mutation follow-up): where Keep this leaves the view, and a day-end timer that is set again for a
 * second day. The core is the IPC fake and the clock is Vitest's fake timers.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DayView } from '../../ipc/journal';
import { NotebookShell } from '../../shell/NotebookShell';
import { CheckIn, type CheckInSession } from '../CheckIn';
import { installFakeCore, type FakeCore } from './fakeCore';
import { dayCoverageNote, evening, reachesOfTheDay, saveRefusal } from './tonightCases';

const tabs = [{ id: 'reaches' as const, label: 'Tonight', current: true }];
let core: FakeCore | undefined;

const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

const day = (over: Partial<DayView> = {}): DayView => ({
  reaches: reachesOfTheDay,
  gaps: [],
  coverage_note: null,
  entry: null,
  estimate: null,
  sealed: null,
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  core?.remove();
  core = undefined;
  vi.useRealTimers();
});

const onPage = (ui: React.ReactElement) => (
  <NotebookShell tabs={tabs} onSelect={vi.fn()} look="morning">
    {ui}
  </NotebookShell>
);

describe('Keep this, on a page, moves the view to what the core sends back', () => {
  async function keepWith(saved: () => DayView) {
    vi.setSystemTime(evening());
    core = installFakeCore({
      get_day: () => day(),
      get_quotes_shown: () => false,
      get_quote: () => null,
      save_journal_entry: saved,
    });
    const { container } = render(onPage(<CheckIn />));
    await settle();
    expect(container.textContent).not.toContain(dayCoverageNote);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Back on the trail.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Keep this' }));
    await settle();
    return container;
  }

  it('shows the day the core answered with', async () => {
    const container = await keepWith(() => day({ coverage_note: dayCoverageNote }));
    expect(within(container).getByText(dayCoverageNote)).toBeInTheDocument();
  });

  it('a refused save leaves the view as it was, and says so', async () => {
    const container = await keepWith(() => {
      throw saveRefusal;
    });
    expect(container.textContent).not.toContain(dayCoverageNote);
    expect(container.querySelectorAll('.nb-checkin-site')).toHaveLength(reachesOfTheDay.length);
    expect(container.textContent).toContain(saveRefusal);
  });
});

describe('the day-end timer is set again when a new day is opened', () => {
  const secondsOf = (d: Date) => Math.round(d.getTime() / 1000);
  /** A session opened on 30 September 2026, or on 1 October. */
  const forDay = (month: number, date: number): CheckInSession => ({
    opened: {
      day: `2026-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
      start: secondsOf(new Date(2026, month, date)),
      end: secondsOf(new Date(2026, month, date + 1)),
    },
    open: () => undefined,
    draft: undefined,
    note: undefined,
    kept: false,
    keeping: false,
    quote: undefined,
    holdQuote: () => undefined,
    type: () => undefined,
    keep: () => Promise.resolve(undefined),
  });

  it.each([
    ['on a page', true],
    ['outside any shell', false],
  ])('each day, when it ends under the open check-in, is named %s', async (_name, shell) => {
    core = installFakeCore({
      get_day: () => day({ reaches: [] }),
      get_quotes_shown: () => false,
      get_quote: () => null,
    });
    const render1 = (session: CheckInSession) =>
      shell ? onPage(<CheckIn session={session} />) : <CheckIn session={session} />;
    vi.setSystemTime(new Date(2026, 8, 30, 23, 50));
    const view = render(render1(forDay(8, 30)));
    await settle();
    expect(view.container.textContent).toContain('Nothing here for today.');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    });
    expect(view.container.textContent).toContain('Nothing here for Wednesday 30 September.');

    // The next day is opened; it too ends under the open check-in.
    vi.setSystemTime(new Date(2026, 9, 1, 8, 0));
    view.rerender(render1(forDay(9, 1)));
    await settle();
    expect(view.container.textContent).toContain('Nothing here for today.');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(17 * 60 * 60 * 1000);
    });
    expect(view.container.textContent).toContain('Nothing here for Thursday 1 October.');
  });
});
