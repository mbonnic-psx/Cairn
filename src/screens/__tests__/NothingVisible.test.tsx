/**
 * G4: "empty" means nothing visible, on the screen as in the store.
 *
 * The cases are read from the file the Rust test reads, so the two predicates
 * are held to one list.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import cases from '../../../src-tauri/tests/fixtures/nothing_visible.json';
import { getDayView, saveJournalEntry, type DayView } from '../../ipc/journal';
import { CheckIn, showsNothing } from '../CheckIn';

vi.mock('../../ipc/journal', () => ({
  getDayView: vi.fn(),
  saveJournalEntry: vi.fn(),
}));

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

afterEach(() => {
  get.mockReset();
  save.mockReset();
});

describe('what counts as nothing', () => {
  it.each(cases.nothing)('%s shows nothing', (_name, text) => {
    expect(showsNothing(text)).toBe(true);
  });

  it.each(cases.something)('%s is writing', (_name, text) => {
    expect(showsNothing(text)).toBe(false);
  });
});

describe('the Keep button', () => {
  it('stays disabled over a kept entry when the text is only invisible characters', async () => {
    get.mockResolvedValue({ ...empty, entry: 'kept' });
    const user = userEvent.setup();
    render(<CheckIn />);
    const box = await screen.findByRole('textbox');
    await user.clear(box);
    // userEvent.paste because typing NUL or a lone surrogate is not a keystroke.
    await user.click(box);
    await user.paste('​ㅤ⠀');
    expect(screen.getByRole('button', { name: /keep/i })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('is enabled for writing that has invisible characters among visible ones', async () => {
    get.mockResolvedValue(empty);
    const user = userEvent.setup();
    render(<CheckIn />);
    const box = await screen.findByRole('textbox');
    await user.click(box);
    await user.paste('​hello​');
    expect(screen.getByRole('button', { name: /keep/i })).toBeEnabled();
  });
});
