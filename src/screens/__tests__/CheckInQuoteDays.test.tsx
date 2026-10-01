/**
 * The quote line and choosing Tonight (slice `quote` with G5): pressing Tonight
 * on the day already open keeps the line; Tonight opening a new day is a new
 * opening, and a fresh line is asked for.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import { getDayView, getQuote, type DayView } from '../../ipc/journal';

vi.mock('../../ipc/journal', () => ({
  getDayView: vi.fn(),
  saveJournalEntry: vi.fn(),
  getQuote: vi.fn(),
  getQuotesShown: vi.fn().mockResolvedValue(true),
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
    getProtectionState: vi.fn().mockResolvedValue({
      status: 'off',
      since: null,
      verified_at: null,
      entry_count_verified: 0,
    }),
  };
});

const get = vi.mocked(getDayView);
const quote = vi.mocked(getQuote);
const empty: DayView = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  entry: null,
  estimate: null,
  sealed: null,
};

beforeEach(() => {
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    toFake: ['Date', 'setTimeout', 'clearTimeout'],
  });
  vi.setSystemTime(new Date(2026, 8, 30, 20, 0));
  get.mockResolvedValue(empty);
  quote
    .mockResolvedValueOnce('The first line.')
    .mockResolvedValueOnce('The second line.');
});

afterEach(() => {
  vi.useRealTimers();
  get.mockReset();
  quote.mockReset();
});

async function openTonight(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Tonight' }));
  await screen.findByRole('textbox');
}

describe('the line and choosing Tonight', () => {
  it('on the same day keeps the line it has', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTonight(user);
    expect(await screen.findByText('The first line.')).toBeInTheDocument();

    await openTonight(user);
    expect(screen.getByText('The first line.')).toBeInTheDocument();
    expect(quote).toHaveBeenCalledTimes(1);
  });

  it('on a new day is a new opening, with a line asked for again', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTonight(user);
    await screen.findByText('The first line.');

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
    });
    await openTonight(user);
    expect(await screen.findByText('The second line.')).toBeInTheDocument();
    expect(screen.queryByText('The first line.')).toBeNull();
  });

  it('shows the same line under the date of a day that has ended', async () => {
    vi.setSystemTime(new Date(2026, 8, 30, 23, 59, 50));
    render(<App />);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Tonight' }));
    await screen.findByText('The first line.');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(
      await screen.findByRole('heading', { name: 'Wednesday 30 September' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The first line.')).toBeInTheDocument();
  });
});
