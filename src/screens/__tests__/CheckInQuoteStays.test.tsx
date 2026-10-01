/**
 * Q1 revised: one line for the whole day. Leaving the check-in for another
 * screen and coming back keeps the line, and hiding then showing quotes within
 * the day brings back the same line.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import App from '../../App';
import { getDayView, getQuote, setQuotesShown, type DayView } from '../../ipc/journal';

vi.mock('../../ipc/journal', () => ({
  getDayView: vi.fn(),
  saveJournalEntry: vi.fn(),
  getQuote: vi.fn(),
  getQuotesShown: vi.fn().mockResolvedValue(true),
  setQuotesShown: vi.fn(),
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

const empty: DayView = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  entry: null,
  estimate: null,
  sealed: null,
};

beforeEach(() => {
  vi.mocked(getDayView).mockResolvedValue(empty);
  vi.mocked(getQuote)
    .mockResolvedValueOnce('The first line.')
    .mockResolvedValueOnce('The second line.');
});

afterEach(() => {
  vi.mocked(getQuote).mockReset();
  vi.mocked(setQuotesShown).mockReset();
});

it('keeps the line when the person leaves the check-in and comes back', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Tonight' }));
  expect(await screen.findByText('The first line.')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'What Cairn covers' }));
  await user.click(screen.getByRole('button', { name: 'Tonight' }));
  expect(await screen.findByText('The first line.')).toBeInTheDocument();
  expect(getQuote).toHaveBeenCalledTimes(1);
});

it('brings back the same line when quotes are hidden and shown again', async () => {
  vi.mocked(setQuotesShown).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Tonight' }));
  await screen.findByText('The first line.');

  await user.click(screen.getByRole('button', { name: 'Hide quotes' }));
  await user.click(await screen.findByRole('button', { name: 'Show quotes' }));
  expect(await screen.findByText('The first line.')).toBeInTheDocument();
  expect(getQuote).toHaveBeenCalledTimes(1);
});
