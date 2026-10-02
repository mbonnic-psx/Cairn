/**
 * What a person typed is never lost to a save returning or to a walk round the
 * header (adversary findings T1 and T2; gaps review G1).
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
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
    getProtectionState: vi
      .fn()
      .mockResolvedValue({ status: 'off', since: null, verified_at: null, entry_count_verified: 0 }),
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
const REFUSED =
  'Your keychain is locked, so this could not be kept yet. What you wrote is still here.';

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

describe('leaving the check-in and coming back', () => {
  async function toTonight(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: 'Tonight' }));
    return (await screen.findByRole('textbox')) as HTMLTextAreaElement;
  }

  it('shows the same unsaved text', async () => {
    get.mockResolvedValue(empty);
    const user = userEvent.setup();
    render(<App />);
    const box = await toTonight(user);
    await user.type(box, 'not sent yet');
    await user.click(screen.getByRole('button', { name: 'What Cairn covers' }));
    const back = await toTonight(user);
    expect(back.value).toBe('not sent yet');
  });

  it('shows a refusal that arrived while away, beside the untouched text', async () => {
    get.mockResolvedValue(empty);
    const d = deferred<DayView>();
    save.mockReturnValue(d.p);
    const user = userEvent.setup();
    render(<App />);
    const box = await toTonight(user);
    await user.type(box, 'what I wrote tonight');
    await user.click(screen.getByRole('button', { name: /keep/i }));
    await user.click(screen.getByRole('button', { name: 'What Cairn covers' }));
    await act(async () => d.rej(REFUSED));
    const back = await toTonight(user);
    expect(back.value).toBe('what I wrote tonight');
    expect(screen.getByRole('status').textContent).toBe(REFUSED);
  });

  it('puts nothing in the header to say there is unsaved text', async () => {
    get.mockResolvedValue(empty);
    const user = userEvent.setup();
    render(<App />);
    const before = screen.getByRole('navigation', { name: 'Pages' }).textContent;
    const box = await toTonight(user);
    await user.type(box, 'not sent yet');
    expect(screen.getByRole('navigation', { name: 'Pages' }).textContent).toBe(before);
  });
});
