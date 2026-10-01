/**
 * The check-in: today's reaches beside a space to write, and nothing else.
 *
 * Slice `write-tonight` — T027 without the quote, plus the gaps review G1 and
 * G3 (`specs/003-reflection-and-history/spec.md`).
 *
 * Accessible names the screen must use, so these tests can find it:
 *   - the journaling space: the only element with role `textbox`
 *     (a <textarea>; any label is fine, e.g. "Tonight").
 *   - the save control: role `button`, name matching /save|keep/i.
 *   - at least one `heading`, or the textbox itself, carries the `reflective`
 *     class (serif), as Reaches.tsx does.
 *
 * The screen fixes the day when it opens: it computes today's date as
 * YYYY-MM-DD and its bounds in epoch seconds the way Reaches.tsx does (local
 * midnight, plus 86 400), and passes that same date to every call.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckIn } from '../CheckIn';
import { getDayView, saveJournalEntry, type DayView } from '../../ipc/journal';

vi.mock('../../ipc/journal', () => ({
  getDayView: vi.fn(),
  saveJournalEntry: vi.fn(),
}));

const mockedGetDayView = vi.mocked(getDayView);
const mockedSave = vi.mocked(saveJournalEntry);

// 8pm local time on 30 September 2026.
const NOW = new Date(2026, 8, 30, 20, 0, 0);
const TODAY = '2026-09-30';
const DAY_START = Math.round(new Date(2026, 8, 30, 0, 0, 0).getTime() / 1000);
const DAY_END = DAY_START + 86_400;

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
});
