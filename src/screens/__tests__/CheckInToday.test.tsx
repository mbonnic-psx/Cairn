/**
 * Opening Tonight opens today (gaps review G5; adversary finding T3).
 *
 * The clock is faked and moved on between presses, so "the next morning" is
 * real to the screen without a test waiting for it.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import { getDayView, saveJournalEntry, type DayView } from '../../ipc/journal';

vi.mock('../../ipc/journal', () => ({
  getDayView: vi.fn(),
  saveJournalEntry: vi.fn(),
  getQuote: vi.fn().mockResolvedValue(null),
  getQuotesShown: vi.fn().mockResolvedValue(false),
}));
vi.mock('../../ipc', async () => {
  const actual = await vi.importActual<typeof import('../../ipc')>('../../ipc');
  return {
    ...actual,
    listCategories: vi.fn().mockResolvedValue([]),
    getDisclosures: vi.fn().mockResolvedValue({
      in_force: [],
      not_covered: [],
      helper: '',
      encryption: '',
      administrator: '',
    }),
    getProtectionState: vi
      .fn()
      .mockResolvedValue({
        status: 'off',
        since: null,
        verified_at: null,
        entry_count_verified: 0,
      }),
  };
});

const get = vi.mocked(getDayView);
const save = vi.mocked(saveJournalEntry);
const empty: DayView = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  entry: null,
  estimate: null,
  sealed: null,
};

const LATE_EVENING = new Date(2026, 8, 30, 23, 50);
const NEXT_MORNING = new Date(2026, 9, 1, 9, 0);
const secondsOf = (date: Date) => Math.round(date.getTime() / 1000);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(LATE_EVENING);
  get.mockResolvedValue(empty);
  save.mockResolvedValue({ ...empty, entry: 'saved' });
});

afterEach(() => {
  vi.useRealTimers();
  get.mockReset();
  save.mockReset();
});

async function openTonight(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Tonight' }));
  return (await screen.findByRole('textbox')) as HTMLTextAreaElement;
}

describe('pressing Tonight the next morning', () => {
  it('opens the new day, and a save goes to it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTonight(user);
    expect(get.mock.calls.map((call) => call[0])).toEqual(['2026-09-30']);

    act(() => {
      vi.setSystemTime(NEXT_MORNING);
    });
    const box = await openTonight(user);
    expect(get).toHaveBeenLastCalledWith(
      '2026-10-01',
      secondsOf(new Date(2026, 9, 1)),
      secondsOf(new Date(2026, 9, 2)),
    );
    expect(screen.getByText('Nothing here for today.')).toBeInTheDocument();

    await user.type(box, 'this morning');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(save).toHaveBeenCalledWith(
      '2026-10-01',
      secondsOf(new Date(2026, 9, 1)),
      secondsOf(new Date(2026, 9, 2)),
      'this morning',
    );
    expect(await screen.findByText('Kept for today.')).toBeInTheDocument();
  });

  it('opens the new day after a walk round the header, too', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTonight(user);
    await user.click(screen.getByRole('button', { name: 'What Cairn covers' }));
    act(() => {
      vi.setSystemTime(NEXT_MORNING);
    });
    await openTonight(user);
    expect(get.mock.calls.map((call) => call[0])).toEqual(['2026-09-30', '2026-10-01']);
  });

  it('opens the new day when the last save was kept, without carrying the old text over', async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = await openTonight(user);
    await user.type(box, 'last night');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    await screen.findByText('Kept for today.');
    act(() => {
      vi.setSystemTime(NEXT_MORNING);
    });
    const morning = await openTonight(user);
    expect(get).toHaveBeenLastCalledWith(
      '2026-10-01',
      expect.any(Number),
      expect.any(Number),
    );
    expect(morning.value).toBe('');
  });
});

describe('unsaved writing stays on the day it was written for', () => {
  it('keeps the old day, names its date, and files the save under it', async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = await openTonight(user);
    await user.type(box, 'before midnight');

    act(() => {
      vi.setSystemTime(NEXT_MORNING);
    });
    const same = await openTonight(user);

    expect(get.mock.calls.map((call) => call[0])).toEqual(['2026-09-30']);
    expect(same.value).toBe('before midnight');
    expect(
      screen.getByText('Nothing here for Wednesday 30 September.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/today/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(save).toHaveBeenCalledWith(
      '2026-09-30',
      secondsOf(new Date(2026, 8, 30)),
      secondsOf(new Date(2026, 9, 1)),
      'before midnight',
    );
    expect(
      await screen.findByText('Kept for Wednesday 30 September.'),
    ).toBeInTheDocument();
  });

  it('still says today while the day is still going', async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = await openTonight(user);
    await user.type(box, 'still tonight');
    expect(screen.getByText('Nothing here for today.')).toBeInTheDocument();
  });
});
