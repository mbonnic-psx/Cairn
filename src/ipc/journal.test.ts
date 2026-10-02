/**
 * The wrappers name the core's commands and pass the day exactly as given.
 * The names are also checked against the Rust side by `ipc_surface.rs`.
 */
import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDayView, getQuote, getQuotesShown, saveJournalEntry, setQuotesShown } from './journal';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

beforeEach(() => {
  vi.mocked(invoke).mockReset().mockResolvedValue({ entry: null });
});

describe('the journal wrappers', () => {
  it('asks for a day by its date and bounds', async () => {
    await getDayView('2026-09-30', 100, 200);
    expect(invoke).toHaveBeenCalledWith('get_day', {
      day: '2026-09-30',
      dayStart: 100,
      dayEnd: 200,
    });
  });

  it('keeps an entry under its date and bounds, with its text', async () => {
    await saveJournalEntry('2026-09-30', 100, 200, 'how it went');
    expect(invoke).toHaveBeenCalledWith('save_journal_entry', {
      day: '2026-09-30',
      dayStart: 100,
      dayEnd: 200,
      text: 'how it went',
    });
  });

  it('asks for the day’s line by its date and returns what the core says', async () => {
    vi.mocked(invoke).mockResolvedValue('a line');
    await expect(getQuote('2026-09-30')).resolves.toBe('a line');
    expect(invoke).toHaveBeenCalledWith('get_quote', { day: '2026-09-30' });
  });

  it('reads the quotes setting with no arguments and returns it', async () => {
    vi.mocked(invoke).mockResolvedValue(true);
    await expect(getQuotesShown()).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith('get_quotes_shown');
  });

  it('sets the quotes setting by its key and returns the setting as it stands', async () => {
    vi.mocked(invoke).mockResolvedValue(false);
    await expect(setQuotesShown(false)).resolves.toBe(false);
    expect(invoke).toHaveBeenCalledWith('set_quotes_shown', { shown: false });
  });
});
