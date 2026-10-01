/**
 * Unticking a list during setup.
 *
 * Before protection is on, nothing is protected, so an untick comes off at
 * once and the box stays unticked. When something is in force it waits a day,
 * and the screen says so in one plain sentence rather than letting the box
 * snap back with no word about why.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import * as ipc from '../../ipc';
import type { CategoryPreset, PendingChange } from '../../ipc';

vi.mock('../../ipc', async () => {
  const actual = await vi.importActual<typeof import('../../ipc')>('../../ipc');
  return {
    ...actual,
    listCategories: vi.fn(),
    setCategoryEnabled: vi.fn(),
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

const streaming = (enabled: boolean): CategoryPreset => ({
  id: 'streaming',
  label: 'Streaming',
  enabled,
  entry_count: 40,
  edited: false,
});

describe('unticking a list during setup', () => {
  beforeEach(() => {
    vi.mocked(ipc.listCategories).mockReset();
    vi.mocked(ipc.setCategoryEnabled).mockReset();
  });

  it('leaves the box unticked when it comes off at once', async () => {
    vi.mocked(ipc.listCategories)
      .mockResolvedValueOnce([streaming(true)])
      .mockResolvedValue([streaming(false)]);
    vi.mocked(ipc.setCategoryEnabled).mockResolvedValue(null);
    render(<App />);

    const box = await screen.findByRole('checkbox', { name: /streaming/i });
    expect(box).toBeChecked();
    await userEvent.click(box);

    expect(ipc.setCategoryEnabled).toHaveBeenCalledWith('streaming', false);
    await vi.waitFor(() => expect(box).not.toBeChecked());
    expect(document.body.textContent).not.toMatch(/takes effect/i);
  });

  it('says plainly when the change has to wait', async () => {
    const pending: PendingChange = {
      id: 'abc',
      what: 'Switch the Streaming list off',
      time_remaining: '24 hours',
      eligible_now: false,
    };
    vi.mocked(ipc.listCategories).mockResolvedValue([streaming(true)]);
    vi.mocked(ipc.setCategoryEnabled).mockResolvedValue(pending);
    render(<App />);

    await userEvent.click(await screen.findByRole('checkbox', { name: /streaming/i }));

    const sentence = await screen.findByText(
      'Switch the Streaming list off: this takes effect in 24 hours, and protection stays on until then.',
    );
    expect(sentence).toBeInTheDocument();
    // Still protected, so still ticked.
    expect(screen.getByRole('checkbox', { name: /streaming/i })).toBeChecked();

    const text = (document.body.textContent ?? '').toLowerCase();
    for (const word of ['failed', 'denied', 'violation', 'relapsed', 'forbidden', 'you lost']) {
      expect(text).not.toContain(word);
    }
  });
});
