/**
 * The quotes switch (Q2) under hostile timing: one request at a time (A3).
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { CheckIn } from '../CheckIn';
import { getDayView, getQuote, getQuotesShown, setQuotesShown, type DayView } from '../../ipc/journal';

vi.mock('../../ipc/journal', () => ({
  getDayView: vi.fn(),
  saveJournalEntry: vi.fn(),
  getQuote: vi.fn(),
  getQuotesShown: vi.fn(),
  setQuotesShown: vi.fn(),
}));

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
});
afterEach(() => {
  vi.mocked(getQuote).mockReset();
  vi.mocked(getQuotesShown).mockReset();
  vi.mocked(setQuotesShown).mockReset();
});

it('asks once when Show quotes is pressed twice while the save is in flight', async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(false);
  let release: (v: boolean) => void = () => undefined;
  vi.mocked(setQuotesShown).mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        release = resolve;
      }),
  );
  vi.mocked(getQuote).mockResolvedValueOnce('FIRST LINE').mockResolvedValueOnce('SECOND LINE');
  const user = userEvent.setup();
  render(<CheckIn />);
  await user.dblClick(await screen.findByRole('button', { name: 'Show quotes' }));
  await act(async () => {
    release(true);
  });
  expect(await screen.findByText('FIRST LINE')).toBeInTheDocument();
  expect(setQuotesShown).toHaveBeenCalledTimes(1);
  expect(getQuote).toHaveBeenCalledTimes(1);
});
