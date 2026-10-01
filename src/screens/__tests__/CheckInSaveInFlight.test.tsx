/**
 * What a person typed is never lost to a save returning or to a walk round the
 * header (adversary findings T1 and T2; gaps review G1).
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckIn } from '../CheckIn';
import { getDayView, saveJournalEntry, type DayView } from '../../ipc/journal';

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

function deferred<T>() {
  let res!: (v: T) => void;
  let rej!: (e: unknown) => void;
  const p = new Promise<T>((a, b) => {
    res = a;
    rej = b;
  });
  return { p, res, rej };
}

afterEach(() => {
  get.mockReset();
  save.mockReset();
});

describe('text typed while a save is in flight', () => {
  it('survives the save returning, and the screen does not say it was kept', async () => {
    get.mockResolvedValue(empty);
    const d = deferred<DayView>();
    save.mockReturnValue(d.p);
    const user = userEvent.setup();
    render(<CheckIn />);
    const box = (await screen.findByRole('textbox')) as HTMLTextAreaElement;
    await user.type(box, 'first part');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    await user.type(box, ' and more');
    await act(async () => d.res({ ...empty, entry: 'first part' }));
    expect(box.value).toBe('first part and more');
    expect(screen.getByRole('status').textContent).not.toMatch(/kept/i);
  });

  it('still says it was kept when nothing more was typed', async () => {
    get.mockResolvedValue(empty);
    save.mockResolvedValue({ ...empty, entry: 'all of it' });
    const user = userEvent.setup();
    render(<CheckIn />);
    await user.type(await screen.findByRole('textbox'), 'all of it');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(await screen.findByText('Kept for today.')).toBeTruthy();
  });
});

