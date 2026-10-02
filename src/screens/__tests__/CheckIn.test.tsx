/**
 * The check-in: today's reaches beside a space to write, and nothing else.
 *
 * Slice `write-tonight` — T027 without the quote, plus the gaps review G1 and
 * G3 (`specs/003-reflection-and-history/spec.md`). Slice `quote` — T027's
 * quote half, and the gaps review Q1 and Q2: one line, in serif, asked for
 * once and kept while the check-in is open; none is a complete check-in.
 *
 * The quote, when there is one, is the check-in's only `figure`, so "nothing in
 * its place" can be asserted as no figure at all.
 *
 * Accessible names the screen must use, so these tests can find it:
 *   - the journaling space: the only element with role `textbox`
 *     (a <textarea>; any label is fine, e.g. "Tonight").
 *   - the save control: role `button`, name matching /save|keep/i.
 *   - at least one `heading`, or the textbox itself, carries the `reflective`
 *     class (serif), as Reaches.tsx does.
 *
 * The screen fixes the day when it opens: it computes today's date as
 * YYYY-MM-DD and its bounds in epoch seconds, from this local midnight to the
 * next one (not + 86 400, which is an hour out on a daylight-saving day), and
 * passes that same date to every call.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckIn } from '../CheckIn';
import {
  getDayView,
  getQuote,
  getQuotesShown,
  saveJournalEntry,
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

const mockedGetDayView = vi.mocked(getDayView);
const mockedSave = vi.mocked(saveJournalEntry);
const mockedGetQuote = vi.mocked(getQuote);
const mockedGetQuotesShown = vi.mocked(getQuotesShown);
const mockedSetQuotesShown = vi.mocked(setQuotesShown);

const A_LINE = 'The window is either open or it isn’t.';
const ANOTHER_LINE = 'Somewhere it is already tomorrow.';

// 8pm local time on 30 September 2026.
const NOW = new Date(2026, 8, 30, 20, 0, 0);
const TODAY = '2026-09-30';
const DAY_START = Math.round(new Date(2026, 8, 30, 0, 0, 0).getTime() / 1000);
// The next local midnight: the same as +86 400 on this date, and right on a 23- or 25-hour day too.
const DAY_END = Math.round(new Date(2026, 9, 1, 0, 0, 0).getTime() / 1000);

const COVERAGE_NOTE =
  'Cairn was not running for about 1 hour(s) of today, so anything you reached for then is not here. This is what Cairn saw, not everything that happened.';

const SEALED =
  'Your keychain is locked, so your history stays sealed until it is unlocked. Protection is unaffected, and Cairn keeps recording.';

const REFUSED =
  'Your keychain is locked, so this could not be kept yet. What you wrote is still here.';

const withReaches: DayView = {
  reaches: [
    { domain: 'example.com', at: DAY_START + 3_600 },
    { domain: 'news.example', at: DAY_START + 7_200 },
  ],
  gaps: [{ from: DAY_START + 10_000, to: DAY_START + 13_600 }],
  coverage_note: COVERAGE_NOTE,
  entry: null,
  estimate: null,
  sealed: null,
};

const noReaches: DayView = { ...withReaches, reaches: [], gaps: [], coverage_note: null };

const sealed: DayView = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  entry: null,
  estimate: null,
  sealed: SEALED,
};

function bodyText(): string {
  return document.body.textContent ?? '';
}

/** Everything a person could read: visible text plus what sits in the space. */
function allText(): string {
  const values = Array.from(document.querySelectorAll('textarea, input')).map(
    (el) => (el as HTMLTextAreaElement | HTMLInputElement).value,
  );
  return [bodyText(), ...values].join(' ');
}

const BANNED = [/\bfail/i, /\bdenied\b/i, /\bviolation/i, /\brelapse/i, /\bforbidden\b/i, /you lost/i];

function expectNoBannedWord() {
  const text = allText();
  for (const word of BANNED) {
    expect(text).not.toMatch(word);
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  mockedGetDayView.mockReset();
  mockedSave.mockReset();
  // Quotes shown, and no line to show, unless a test says otherwise: the
  // write-tonight tests below read the check-in as it was.
  mockedGetQuotesShown.mockReset().mockResolvedValue(true);
  mockedGetQuote.mockReset().mockResolvedValue(null);
  mockedSetQuotesShown.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the check-in', () => {
  it('shows today’s reaches beside a space to write', async () => {
    mockedGetDayView.mockResolvedValue(withReaches);
    render(<CheckIn />);

    expect(await screen.findByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('news.example')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText(/not everything that happened/i)).toBeInTheDocument();
    expect(mockedGetDayView).toHaveBeenCalledWith(TODAY, DAY_START, DAY_END);
  });

  it('saves what was written for today and shows it afterwards', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedSave.mockResolvedValue({ ...withReaches, entry: 'A long day.' });
    render(<CheckIn />);

    await user.type(await screen.findByRole('textbox'), 'A long day.');
    await user.click(screen.getByRole('button', { name: /save|keep/i }));

    expect(mockedSave).toHaveBeenCalledWith(TODAY, DAY_START, DAY_END, 'A long day.');
    await waitFor(() => {
      const shown =
        screen.queryByDisplayValue('A long day.') ?? screen.queryByText('A long day.');
      expect(shown).not.toBeNull();
    });
  });

  it('reopens tonight’s entry in the space, ready to revise', async () => {
    mockedGetDayView.mockResolvedValue({ ...withReaches, entry: 'Earlier tonight.' });
    render(<CheckIn />);

    const space = await screen.findByRole('textbox');
    await waitFor(() => expect(space).toHaveValue('Earlier tonight.'));
  });

  it('shows the plain sentence and offers no space when the history is sealed', async () => {
    mockedGetDayView.mockResolvedValue(sealed);
    render(<CheckIn />);

    expect(await screen.findByText(/protection is unaffected/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save|keep/i })).not.toBeInTheDocument();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('keeps what was typed when a save cannot be kept, and does not call it saved', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedSave.mockRejectedValue(REFUSED);
    render(<CheckIn />);

    const space = await screen.findByRole('textbox');
    await user.type(space, 'Something I do not want to lose.');
    await user.click(screen.getByRole('button', { name: /save|keep/i }));

    expect(await screen.findByText(REFUSED)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Something I do not want to lose.');
    expect(bodyText()).not.toMatch(/\bsaved\b/i);
  });

  it('offers the space on a day with no reaches, and congratulates nobody', async () => {
    mockedGetDayView.mockResolvedValue(noReaches);
    render(<CheckIn />);

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save|keep/i })).toBeInTheDocument();

    const text = bodyText();
    expect(text).not.toMatch(/great|well done|congrat|clean|streak|proud|perfect/i);
    expect(text).not.toMatch(/\b0\s+reach/i);
    expect(text).not.toMatch(/\bzero\b/i);
  });

  it('uses no banned word, whether open, sealed, or refusing a save', async () => {
    const user = userEvent.setup();

    mockedGetDayView.mockResolvedValue(withReaches);
    const open = render(<CheckIn />);
    await screen.findByText('example.com');
    expectNoBannedWord();
    open.unmount();

    mockedGetDayView.mockResolvedValue(sealed);
    const closed = render(<CheckIn />);
    await screen.findByText(/protection is unaffected/i);
    expectNoBannedWord();
    closed.unmount();

    mockedGetDayView.mockResolvedValue(withReaches);
    mockedSave.mockRejectedValue(REFUSED);
    render(<CheckIn />);
    await user.type(await screen.findByRole('textbox'), 'Tonight.');
    await user.click(screen.getByRole('button', { name: /save|keep/i }));
    await screen.findByText(REFUSED);
    expectNoBannedWord();
  });

  it('offers nothing that changes protection', async () => {
    mockedGetDayView.mockResolvedValue(withReaches);
    render(<CheckIn />);
    await screen.findByText('example.com');

    const controls = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')];
    for (const control of controls) {
      expect(control.textContent ?? '').not.toMatch(
        /turn (protection )?off|pause|disable|unblock|allow/i,
      );
    }
  });

  it('sets the reflective surface in serif', async () => {
    mockedGetDayView.mockResolvedValue(withReaches);
    render(<CheckIn />);

    const space = await screen.findByRole('textbox');
    const surfaces = [...screen.queryAllByRole('heading'), space];
    expect(surfaces.some((el) => el.classList.contains('reflective'))).toBe(true);
  });

  it('keeps an entry on the day it was opened for, across midnight', async () => {
    const user = userEvent.setup();
    vi.setSystemTime(new Date(2026, 8, 30, 23, 58, 0));
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedSave.mockResolvedValue({ ...withReaches, entry: 'Late.' });
    render(<CheckIn />);
    const space = await screen.findByRole('textbox');

    vi.setSystemTime(new Date(2026, 9, 1, 0, 1, 0));
    await user.type(space, 'Late.');
    await user.click(screen.getByRole('button', { name: /save|keep/i }));

    await waitFor(() => expect(mockedSave).toHaveBeenCalledWith(TODAY, DAY_START, DAY_END, 'Late.'));
  });

  it('cannot clear a saved entry by saving nothing over it', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue({ ...withReaches, entry: 'Kept from earlier.' });
    render(<CheckIn />);
    const space = await screen.findByRole('textbox');
    expect(space).toHaveValue('Kept from earlier.');

    await user.clear(space);
    await user.type(space, '   ');
    const keep = screen.getByRole('button', { name: /save|keep/i });
    expect(keep).toBeDisabled();
    await user.click(keep);

    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('says what happened to a save where a screen reader will hear it', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedSave.mockRejectedValueOnce(REFUSED).mockResolvedValueOnce({ ...withReaches, entry: 'Tonight.' });
    render(<CheckIn />);
    await user.type(await screen.findByRole('textbox'), 'Tonight.');

    await user.click(screen.getByRole('button', { name: /save|keep/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(REFUSED);

    await user.click(screen.getByRole('button', { name: /save|keep/i }));
    await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent(REFUSED));
    expect(screen.getByRole('status').textContent ?? '').not.toBe('');
  });
});

describe('the quote on the check-in', () => {
  it('shows one line in serif, asked for once, and keeps it while the check-in is open', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuote.mockResolvedValueOnce(A_LINE).mockResolvedValue(ANOTHER_LINE);
    mockedSave.mockResolvedValue({ ...withReaches, entry: 'A long day.' });
    render(<CheckIn />);

    const line = await screen.findByText(A_LINE);
    expect(line.closest('.reflective')).not.toBeNull();
    expect(screen.getAllByRole('figure')).toHaveLength(1);

    await user.type(screen.getByRole('textbox'), 'A long day.');
    await user.click(screen.getByRole('button', { name: /save|keep/i }));
    await screen.findByText('Kept for today.');

    expect(screen.getByText(A_LINE)).toBeInTheDocument();
    expect(screen.queryByText(ANOTHER_LINE)).not.toBeInTheDocument();
    expect(mockedGetQuote).toHaveBeenCalledTimes(1);
  });

  it('reads as complete with no line: nothing in its place, the space as always', async () => {
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuote.mockResolvedValue(null);
    render(<CheckIn />);

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    await waitFor(() => expect(mockedGetQuote).toHaveBeenCalled());
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(bodyText()).not.toMatch(/no quote|unavailable|could not|loading/i);
  });

  it('reads as complete when the line cannot be had at all', async () => {
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuote.mockRejectedValue('Something went sideways.');
    render(<CheckIn />);

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    await waitFor(() => expect(mockedGetQuote).toHaveBeenCalled());
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(bodyText()).not.toMatch(/sideways/i);
  });

  it('shows the line on a sealed check-in too: a quote is not about the day', async () => {
    mockedGetDayView.mockResolvedValue(sealed);
    mockedGetQuote.mockResolvedValue(A_LINE);
    render(<CheckIn />);

    expect(await screen.findByText(/protection is unaffected/i)).toBeInTheDocument();
    expect(await screen.findByText(A_LINE)).toBeInTheDocument();
  });

  it('shows the same line whether today held reaches or none', async () => {
    mockedGetDayView.mockResolvedValue(noReaches);
    mockedGetQuote.mockResolvedValue(A_LINE);
    render(<CheckIn />);

    expect(await screen.findByText(A_LINE)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('uses no banned word with a line showing', async () => {
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuote.mockResolvedValue(A_LINE);
    render(<CheckIn />);

    await screen.findByText(A_LINE);
    expectNoBannedWord();
  });
});

describe('the quiet switch for quotes', () => {
  const SWITCH_REFUSED = 'Cairn could not save its settings (disk full). Your protection is unaffected.';

  it('hides the line, leaves nothing in its place, and offers to show quotes again', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuote.mockResolvedValue(A_LINE);
    mockedSetQuotesShown.mockResolvedValue(false);
    render(<CheckIn />);
    await screen.findByText(A_LINE);

    await user.click(screen.getByRole('button', { name: 'Hide quotes' }));

    expect(mockedSetQuotesShown).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByText(A_LINE)).not.toBeInTheDocument());
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show quotes' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('brings the same line back when quotes are shown again', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuote.mockResolvedValueOnce(A_LINE).mockResolvedValue(ANOTHER_LINE);
    mockedSetQuotesShown.mockImplementation(async (shown) => shown);
    render(<CheckIn />);
    await screen.findByText(A_LINE);

    await user.click(screen.getByRole('button', { name: 'Hide quotes' }));
    await user.click(await screen.findByRole('button', { name: 'Show quotes' }));

    expect(mockedSetQuotesShown).toHaveBeenLastCalledWith(true);
    expect(await screen.findByText(A_LINE)).toBeInTheDocument();
    expect(screen.queryByText(ANOTHER_LINE)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide quotes' })).toBeInTheDocument();
  });

  it('opened with quotes hidden, asks for no line and offers to show them', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuotesShown.mockResolvedValue(false);
    mockedGetQuote.mockResolvedValue(A_LINE);
    mockedSetQuotesShown.mockResolvedValue(true);
    render(<CheckIn />);

    const show = await screen.findByRole('button', { name: 'Show quotes' });
    expect(mockedGetQuote).not.toHaveBeenCalled();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();

    await user.click(show);
    expect(await screen.findByText(A_LINE)).toBeInTheDocument();
    expect(mockedGetQuote).toHaveBeenCalledTimes(1);
  });

  it('leaves the line where it was when the switch cannot be kept, and says so', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuote.mockResolvedValue(A_LINE);
    mockedSetQuotesShown.mockRejectedValue(SWITCH_REFUSED);
    render(<CheckIn />);
    await screen.findByText(A_LINE);

    await user.click(screen.getByRole('button', { name: 'Hide quotes' }));

    expect(await screen.findByRole('status')).toHaveTextContent(SWITCH_REFUSED);
    expect(screen.getByText(A_LINE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide quotes' })).toBeInTheDocument();
    expectNoBannedWord();
  });

  it('is on the sealed check-in too', async () => {
    const user = userEvent.setup();
    mockedGetDayView.mockResolvedValue(sealed);
    mockedGetQuote.mockResolvedValue(A_LINE);
    mockedSetQuotesShown.mockResolvedValue(false);
    render(<CheckIn />);
    await screen.findByText(A_LINE);

    await user.click(screen.getByRole('button', { name: 'Hide quotes' }));

    await waitFor(() => expect(screen.queryByText(A_LINE)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Show quotes' })).toBeInTheDocument();
    expect(screen.getByText(/protection is unaffected/i)).toBeInTheDocument();
  });

  it('offers no switch when Cairn cannot tell whether quotes were hidden', async () => {
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuotesShown.mockRejectedValue('Cairn could not read its settings. Your protection is unaffected.');
    render(<CheckIn />);

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    await waitFor(() => expect(mockedGetQuotesShown).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /quotes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    expect(mockedGetQuote).not.toHaveBeenCalled();
  });

  it('says what it does in plain words, set apart from the reflective surface', async () => {
    mockedGetDayView.mockResolvedValue(withReaches);
    mockedGetQuote.mockResolvedValue(A_LINE);
    render(<CheckIn />);
    await screen.findByText(A_LINE);

    const toggle = screen.getByRole('button', { name: 'Hide quotes' });
    expect(toggle.classList.contains('reflective')).toBe(false);
    expect(toggle.textContent ?? '').not.toMatch(/turn (protection )?off|pause|disable|unblock|allow/i);
    expect(screen.getByRole('button', { name: /save|keep/i })).toBeInTheDocument();
  });
});
