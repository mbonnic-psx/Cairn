/**
 * A line asked for an old opening must not land on a new day's check-in
 * (A4, Q1, G5), through the real session hook.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { CheckIn, useCheckInSession } from '../CheckIn';
import { getDayView, getQuote, getQuotesShown, type DayView } from '../../ipc/journal';

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
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 30, 20, 0));
  vi.mocked(getDayView).mockResolvedValue(empty);
  vi.mocked(getQuotesShown).mockResolvedValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.mocked(getQuote).mockReset();
});

function Screen() {
  const session = useCheckInSession();
  return (
    <>
      <button onClick={session.open}>Tonight</button>
      <CheckIn session={session} />
    </>
  );
}

it('drops a line that arrives after Tonight opened another day', async () => {
  let late: (line: string) => void = () => undefined;
  vi.mocked(getQuote)
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          late = resolve;
        }),
    )
    .mockResolvedValue('NEW DAY LINE');
  render(<Screen />);
  await waitFor(() => expect(getQuote).toHaveBeenCalledTimes(1));

  act(() => {
    vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
  });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Tonight' }));
  expect(await screen.findByText('NEW DAY LINE')).toBeInTheDocument();

  await act(async () => {
    late('OLD DAY LINE');
  });
  expect(screen.queryByText('OLD DAY LINE')).toBeNull();
  expect(screen.getByText('NEW DAY LINE')).toBeInTheDocument();
});
