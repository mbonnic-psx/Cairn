/**
 * The switch's failure note (A5): only a sentence in Cairn's voice, beside a
 * save refusal rather than behind it, and gone when Tonight opens a new day.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { CheckIn, useCheckInSession, type CheckInSession } from '../CheckIn';
import {
  getDayView,
  getQuote,
  getQuotesShown,
  setQuotesShown,
  type DayView,
} from '../../ipc/journal';

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
});
afterEach(() => {
  vi.useRealTimers();
  vi.mocked(getQuote).mockReset();
  vi.mocked(getQuotesShown).mockReset();
  vi.mocked(setQuotesShown).mockReset();
});

it('shows a fixed Cairn sentence, never a raw error, when the switch is refused oddly', async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(true);
  vi.mocked(getQuote).mockResolvedValue('A LINE');
  vi.mocked(setQuotesShown).mockRejectedValue(
    new Error('Command set_quotes_shown not found'),
  );
  const user = userEvent.setup();
  render(<CheckIn />);
  await user.click(await screen.findByRole('button', { name: 'Hide quotes' }));
  const note = await screen.findByText(/quotes/i, { selector: '[role="status"]' });
  expect(note.textContent).not.toMatch(/Error|not found|set_quotes/);
  expect(note.textContent).toBe(
    'Cairn could not change that just now. The quotes are as they were.',
  );
  expect(screen.getByText('A LINE')).toBeInTheDocument();
});

it("passes the core's own sentence through, beside a save refusal", async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(true);
  vi.mocked(getQuote).mockResolvedValue('A LINE');
  vi.mocked(setQuotesShown).mockRejectedValue('Cairn could not keep that choice.');
  const user = userEvent.setup();
  const session: CheckInSession = {
    opened: { day: '2099-01-01', start: 1, end: 86401 },
    open: () => undefined,
    draft: undefined,
    note: 'The entry was not kept.',
    kept: false,
    keeping: false,
    quote: undefined,
    holdQuote: () => undefined,
    type: () => undefined,
    keep: () => Promise.resolve(undefined),
  };
  render(<CheckIn session={session} />);
  await user.click(await screen.findByRole('button', { name: 'Hide quotes' }));
  await waitFor(() => {
    const text = screen
      .getAllByRole('status')
      .map((s) => s.textContent)
      .join(' | ');
    expect(text).toContain('The entry was not kept.');
    expect(text).toContain('Cairn could not keep that choice.');
  });
});

it('clears the switch note when Tonight opens a new day', async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(true);
  vi.mocked(getQuote).mockResolvedValue('A LINE');
  vi.mocked(setQuotesShown).mockRejectedValue('Cairn could not keep that choice.');
  function Screen() {
    const session = useCheckInSession();
    return (
      <>
        <button onClick={session.open}>Tonight</button>
        <CheckIn session={session} />
      </>
    );
  }
  const user = userEvent.setup();
  render(<Screen />);
  await user.click(await screen.findByRole('button', { name: 'Hide quotes' }));
  expect(
    await screen.findByText('Cairn could not keep that choice.'),
  ).toBeInTheDocument();

  act(() => {
    vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
  });
  await user.click(screen.getByRole('button', { name: 'Tonight' }));
  await waitFor(() => {
    expect(screen.queryByText('Cairn could not keep that choice.')).toBeNull();
  });
});
