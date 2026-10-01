/**
 * Details of the check-in a person would notice if they were wrong: the name
 * of a day that has ended, the hour a reach is shown at, a history that would
 * not load, a day that ends under an open screen, and what a new day leaves
 * behind (nothing of the old one).
 */
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import { CheckIn, type CheckInSession } from '../CheckIn';
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
    getProtectionState: vi.fn().mockResolvedValue({
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
const secondsOf = (date: Date) => Math.round(date.getTime() / 1000);

function sessionFor(year: number, month: number, date: number): CheckInSession {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    opened: {
      day: `${year}-${pad(month + 1)}-${pad(date)}`,
      start: secondsOf(new Date(year, month, date)),
      end: secondsOf(new Date(year, month, date + 1)),
    },
    open: () => undefined,
    draft: undefined,
    note: undefined,
    kept: false,
    keeping: false,
    type: () => undefined,
    keep: () => Promise.resolve(undefined),
  };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date(2026, 8, 30, 20, 0));
  get.mockResolvedValue(empty);
  save.mockResolvedValue({ ...empty, entry: 'saved' });
});

afterEach(() => {
  vi.useRealTimers();
  get.mockReset();
  save.mockReset();
});

describe('a day that has ended is named in words', () => {
  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  it.each(MONTHS.map((name, month) => [name, month] as const))(
    'names %s',
    async (name, month) => {
      const weekday = new Date(2025, month, 17).toLocaleDateString('en-US', {
        weekday: 'long',
      });
      render(<CheckIn session={sessionFor(2025, month, 17)} />);
      expect(
        await screen.findByText(`Nothing here for ${weekday} 17 ${name}.`),
      ).toBeInTheDocument();
    },
  );
});

describe('the sealed history', () => {
  it('is headed Tonight while the day is still going', async () => {
    get.mockResolvedValue({ ...empty, sealed: 'Your keychain is locked.' });
    render(<CheckIn />);
    expect(await screen.findByRole('heading', { name: 'Tonight' })).toBeInTheDocument();
  });
});

describe('the reaches of the day', () => {
  const start = secondsOf(new Date(2026, 8, 30));
  const reaches = [
    { domain: 'one.example', at: start + 14 * 3600 + 30 * 60 + 45 },
    { domain: 'one.example', at: start + 14 * 3600 + 30 * 60 + 45 },
    { domain: 'late.example', at: start + 21 * 3600 + 5 * 60 },
  ];

  it('shows each at its own hour and minute, without seconds', async () => {
    get.mockResolvedValue({ ...empty, reaches });
    render(<CheckIn />);
    await screen.findByText('late.example');

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toMatch(/^one\.example(02:30\s?PM|14:30)$/);
    expect(rows[2].textContent).toMatch(/^late\.example(09:05\s?PM|21:05)$/);
    expect(within(rows[2]).queryByText(/:\d\d:\d\d/)).toBeNull();
  });

  it('lists the same reach twice without confusing the two', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    get.mockResolvedValue({ ...empty, reaches });
    render(<CheckIn />);
    await screen.findByText('late.example');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('a history that would not load', () => {
  it('says so in its own words instead of looking for ever', async () => {
    get.mockRejectedValue('Your history could not be opened just now.');
    render(<CheckIn />);
    expect(
      await screen.findByText('Your history could not be opened just now.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Looking…')).toBeNull();
  });
});

describe('a day that ends under an open check-in', () => {
  it('stops calling itself today, without a click', async () => {
    vi.setSystemTime(new Date(2026, 8, 30, 23, 59, 50));
    render(<CheckIn />);
    expect(await screen.findByRole('heading', { name: 'Tonight' })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000);
    });

    expect(
      screen.getByRole('heading', { name: 'Wednesday 30 September' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tonight' })).toBeNull();
  });

  it('does not rename itself early', async () => {
    vi.setSystemTime(new Date(2026, 8, 30, 23, 59, 50));
    render(<CheckIn />);
    await screen.findByRole('heading', { name: 'Tonight' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(screen.getByRole('heading', { name: 'Tonight' })).toBeInTheDocument();
  });
});

describe('choosing Tonight again', () => {
  async function openTonight(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: 'Tonight' }));
    return (await screen.findByRole('textbox')) as HTMLTextAreaElement;
  }

  it('on the same day keeps what is in the space and does not read the day again', async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = await openTonight(user);
    await user.type(box, 'still here');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    await screen.findByText('Kept for today.');

    const again = await openTonight(user);
    expect(again.value).toBe('saved');
    expect(get).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Kept for today.')).toBeInTheDocument();
  });

  it('on a new day leaves nothing of a kept day behind', async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = await openTonight(user);
    await user.type(box, 'last night');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    await screen.findByText('Kept for today.');

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
    });
    await openTonight(user);
    expect(screen.getByText('Nothing here for today.')).toBeInTheDocument();
    expect(screen.queryByText(/Kept for/)).toBeNull();
  });

  it('on a new day leaves a refusal from the old one behind', async () => {
    save.mockRejectedValue('Your keychain is locked, so this could not be kept yet.');
    const user = userEvent.setup();
    render(<App />);
    const box = await openTonight(user);
    await user.type(box, 'x');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    await screen.findByText(/could not be kept yet/);
    // Nothing is left in the space, so nothing is waiting to be kept.
    await user.clear(box);

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
    });
    await openTonight(user);
    expect(screen.getByText('Nothing here for today.')).toBeInTheDocument();
    expect(screen.queryByText(/could not be kept yet/)).toBeNull();
  });
});

function deferred<T>() {
  let res!: (v: T) => void;
  const p = new Promise<T>((a) => {
    res = a;
  });
  return { p, res };
}

describe('the screen before anything has happened', () => {
  it('says it is looking while the day is read', async () => {
    get.mockReturnValue(new Promise(() => undefined));
    render(<CheckIn />);
    expect(await screen.findByText('Looking…')).toBeInTheDocument();
  });

  it('says nothing in the status line, in particular not that anything was kept', async () => {
    render(<CheckIn />);
    await screen.findByRole('textbox');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('names the coverage note as a paragraph, and adds no empty one without it', async () => {
    get.mockResolvedValue({ ...empty, coverage_note: 'Cairn was not running for a while.' });
    const { unmount } = render(<CheckIn />);
    expect((await screen.findByText('Cairn was not running for a while.')).tagName).toBe('P');
    unmount();

    get.mockResolvedValue(empty);
    const { container } = render(<CheckIn />);
    await screen.findByRole('textbox');
    expect(container.querySelectorAll('p:empty:not([role])')).toHaveLength(0);
  });

  it('leaves no timer running once it is closed', async () => {
    const { unmount } = render(<CheckIn />);
    await screen.findByRole('textbox');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('the instant a day ends', () => {
  it('is already named, not still called today', async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date'] });
    const session = sessionFor(2026, 8, 30);
    vi.setSystemTime(session.opened.end * 1000);
    render(<CheckIn session={session} />);
    expect(
      await screen.findByText('Nothing here for Wednesday 30 September.'),
    ).toBeInTheDocument();
  });

  it('is named when the next day ends, too, after the screen moved on a day', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Tonight' }));
    await screen.findByRole('textbox');

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
    });
    await user.click(screen.getByRole('button', { name: 'Tonight' }));
    expect(await screen.findByRole('heading', { name: 'Tonight' })).toBeInTheDocument();

    // Nine in the morning to a second before midnight, then two seconds more.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15 * 3_600_000 - 1_000);
    });
    expect(screen.getByRole('heading', { name: 'Tonight' })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.getByRole('heading', { name: 'Thursday 1 October' })).toBeInTheDocument();
  });
});

describe('moving to a new day while the old one is still being read', () => {
  async function toNextMorning(user: ReturnType<typeof userEvent.setup>) {
    act(() => {
      vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
    });
    await user.click(screen.getByRole('button', { name: 'Tonight' }));
  }

  it('does not let the old day answer for the new one', async () => {
    const slow = deferred<DayView>();
    get.mockReturnValueOnce(slow.p).mockResolvedValue({
      ...empty,
      reaches: [{ domain: 'fresh.example', at: secondsOf(new Date(2026, 9, 1, 8)) }],
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Tonight' }));
    await toNextMorning(user);
    await screen.findByText('fresh.example');

    await act(async () =>
      slow.res({
        ...empty,
        reaches: [{ domain: 'stale.example', at: secondsOf(new Date(2026, 8, 30, 21)) }],
      }),
    );
    expect(screen.getByText('fresh.example')).toBeInTheDocument();
    expect(screen.queryByText('stale.example')).toBeNull();
  });

  it('shows that it is looking, not the old day, while the new one is read', async () => {
    get.mockResolvedValueOnce({
      ...empty,
      reaches: [{ domain: 'old.example', at: secondsOf(new Date(2026, 8, 30, 21)) }],
    });
    get.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Tonight' }));
    await screen.findByText('old.example');
    await toNextMorning(user);

    expect(await screen.findByText('Looking…')).toBeInTheDocument();
    expect(screen.queryByText('old.example')).toBeNull();
  });

  it('forgets a day that would not load once the new one does', async () => {
    get.mockRejectedValueOnce('Your history could not be opened just now.');
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Tonight' }));
    await screen.findByText('Your history could not be opened just now.');
    await toNextMorning(user);

    await screen.findByRole('textbox');
    expect(screen.queryByText('Your history could not be opened just now.')).toBeNull();
  });
});

describe('keeping what was written', () => {
  it('keeps what is already there when nothing was changed', async () => {
    get.mockResolvedValue({ ...empty, entry: 'written earlier' });
    const user = userEvent.setup();
    render(<CheckIn />);
    await screen.findByDisplayValue('written earlier');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(save.mock.calls[0][3]).toBe('written earlier');
  });

  it('is busy while it is being kept, and no longer says the last one was kept', async () => {
    const pending = deferred<DayView>();
    const user = userEvent.setup();
    render(<CheckIn />);
    const box = await screen.findByRole('textbox');
    await user.type(box, 'one');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    await screen.findByText('Kept for today.');

    save.mockReturnValue(pending.p);
    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(screen.getByRole('button', { name: /keep/i })).toBeDisabled();
    expect(screen.queryByText('Kept for today.')).toBeNull();

    await act(async () => pending.res({ ...empty, entry: 'saved' }));
    expect(screen.getByRole('button', { name: /keep/i })).toBeEnabled();
    expect(screen.getByText('Kept for today.')).toBeInTheDocument();
  });

  it('shows the day as the core returned it, and keeps the space when it was refused', async () => {
    const user = userEvent.setup();
    render(<CheckIn />);
    const box = await screen.findByRole('textbox');
    await user.type(box, 'one');
    save.mockResolvedValueOnce({ ...empty, entry: 'one', coverage_note: 'Returned note.' });
    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(await screen.findByText('Returned note.')).toBeInTheDocument();

    save.mockRejectedValueOnce('Your keychain is locked, so this could not be kept yet.');
    await user.type(box, ' more');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(await screen.findByText(/could not be kept yet/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('one more');
    expect(screen.getByText('Returned note.')).toBeInTheDocument();
  });
});
