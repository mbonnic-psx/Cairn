/**
 * Which line the check-in keeps, and which it lets go: a line belongs to the
 * day it was asked for and to the opening that asked (Q1, A4, A5, G5), and a
 * sealed day's status line says nothing unless there is something to say.
 */
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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

function Screen() {
  const session = useCheckInSession();
  return (
    <>
      <button onClick={session.open}>Tonight</button>
      <CheckIn session={session} />
    </>
  );
}

it('keeps a line for the day now open, and not one held for another day', () => {
  const { result } = renderHook(() => useCheckInSession());
  const day = result.current.opened.day;
  act(() => {
    result.current.holdQuote('1999-01-01', 'AN OLD LINE');
  });
  expect(result.current.quote).toBeUndefined();
  act(() => {
    result.current.holdQuote(day, 'TODAY LINE');
  });
  expect(result.current.quote).toEqual({ day, line: 'TODAY LINE' });
});

it('lets nothing of the old day’s line come with a new day', () => {
  const { result } = renderHook(() => useCheckInSession());
  act(() => {
    result.current.holdQuote(result.current.opened.day, 'OLD LINE');
  });
  act(() => {
    vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
  });
  act(() => {
    result.current.open();
  });
  expect(result.current.opened.day).toBe('2026-10-01');
  expect(result.current.quote).toBeUndefined();
});

it('does not keep a line for an old day that arrives through the Show quotes switch', async () => {
  vi.mocked(getQuotesShown).mockResolvedValueOnce(false).mockResolvedValue(true);
  vi.mocked(setQuotesShown).mockResolvedValue(true);
  let late: (line: string) => void = () => undefined;
  vi.mocked(getQuote)
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          late = resolve;
        }),
    )
    .mockResolvedValue('NEW DAY LINE');
  const user = userEvent.setup();
  render(<Screen />);
  await user.click(await screen.findByRole('button', { name: 'Show quotes' }));
  await waitFor(() => expect(getQuote).toHaveBeenCalledTimes(1));

  act(() => {
    vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
  });
  await user.click(screen.getByRole('button', { name: 'Tonight' }));
  expect(await screen.findByText('NEW DAY LINE')).toBeInTheDocument();

  await act(async () => {
    late('OLD DAY LINE');
  });
  expect(screen.queryByText('OLD DAY LINE')).toBeNull();
  expect(screen.getByText('NEW DAY LINE')).toBeInTheDocument();
});

it('lets a setting read for an old opening land nowhere once a new day is open', async () => {
  let late: (shown: boolean) => void = () => undefined;
  vi.mocked(getQuotesShown)
    .mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          late = resolve;
        }),
    )
    .mockResolvedValue(true);
  vi.mocked(getQuote).mockResolvedValue('NEW DAY LINE');
  const user = userEvent.setup();
  render(<Screen />);
  await waitFor(() => expect(getQuotesShown).toHaveBeenCalledTimes(1));

  act(() => {
    vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
  });
  await user.click(screen.getByRole('button', { name: 'Tonight' }));
  expect(await screen.findByText('NEW DAY LINE')).toBeInTheDocument();

  await act(async () => {
    late(false);
  });
  expect(screen.getByText('NEW DAY LINE')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hide quotes' })).toBeInTheDocument();
});

it('keeps no line whose asking was left before it came back, and asks again on return', async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(true);
  let first: (line: string) => void = () => undefined;
  vi.mocked(getQuote)
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          first = resolve;
        }),
    )
    .mockResolvedValue('SECOND LINE');
  function Away() {
    const session = useCheckInSession();
    const [here, setHere] = useState(true);
    return (
      <>
        <button onClick={() => setHere((h) => !h)}>Walk</button>
        {here && <CheckIn session={session} />}
      </>
    );
  }
  const user = userEvent.setup();
  render(<Away />);
  await waitFor(() => expect(getQuote).toHaveBeenCalledTimes(1));
  await user.click(screen.getByRole('button', { name: 'Walk' }));
  await act(async () => {
    first('FIRST LINE');
  });
  await user.click(screen.getByRole('button', { name: 'Walk' }));

  expect(await screen.findByText('SECOND LINE')).toBeInTheDocument();
  expect(screen.queryByText('FIRST LINE')).toBeNull();
  expect(getQuote).toHaveBeenCalledTimes(2);
});

it('leaves the sealed day’s status line empty when there is nothing to say', async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(true);
  vi.mocked(getQuote).mockResolvedValue(null);
  vi.mocked(getDayView).mockResolvedValue({ ...empty, sealed: 'What was written.' });
  render(<CheckIn />);
  await screen.findByText('What was written.');
  expect(screen.getByRole('status').textContent).toBe('');
});

it('says the switch’s sentence in the sealed day’s status line', async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(true);
  vi.mocked(getQuote).mockResolvedValue('A LINE');
  vi.mocked(setQuotesShown).mockRejectedValue('Cairn could not keep that choice.');
  vi.mocked(getDayView).mockResolvedValue({ ...empty, sealed: 'What was written.' });
  const user = userEvent.setup();
  render(<CheckIn />);
  await user.click(await screen.findByRole('button', { name: 'Hide quotes' }));
  await waitFor(() => {
    expect(screen.getByRole('status').textContent).toBe('Cairn could not keep that choice.');
  });
});

it('clears an earlier refusal when the switch is pressed again', async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(true);
  vi.mocked(getQuote).mockResolvedValue('A LINE');
  vi.mocked(setQuotesShown)
    .mockRejectedValueOnce('Cairn could not keep that choice.')
    .mockResolvedValue(false);
  const user = userEvent.setup();
  render(<CheckIn />);
  await user.click(await screen.findByRole('button', { name: 'Hide quotes' }));
  expect(await screen.findByText('Cairn could not keep that choice.')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Hide quotes' }));
  expect(await screen.findByRole('button', { name: 'Show quotes' })).toBeInTheDocument();
  expect(screen.queryByText('Cairn could not keep that choice.')).toBeNull();
});

it('says a save refusal and a switch refusal as two sentences, side by side', async () => {
  vi.mocked(getQuotesShown).mockResolvedValue(true);
  vi.mocked(getQuote).mockResolvedValue('A LINE');
  vi.mocked(setQuotesShown).mockRejectedValue('Cairn could not keep that choice.');
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
  const user = userEvent.setup();
  render(<CheckIn session={session} />);
  await user.click(await screen.findByRole('button', { name: 'Hide quotes' }));
  expect(
    await screen.findByText('The entry was not kept. Cairn could not keep that choice.'),
  ).toBeInTheDocument();
});
