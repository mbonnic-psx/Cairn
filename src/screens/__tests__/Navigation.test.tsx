/**
 * Getting back.
 *
 * "Tonight" and "What Cairn covers" are always in the header, so a person can
 * reach them from anywhere. "Protection" is always there too, so the header
 * does not change shape from screen to screen (owner, 2026-10-01). Before
 * protection is on it returns to choosing what to protect, and once it is on
 * it returns to the protection screen. Reported in the write-tonight demo
 * (2026-10-01): from the check-in there was no way back at all.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import * as ipc from '../../ipc';
import type { ProtectionState } from '../../ipc';

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
    getProtectionState: vi.fn(),
  };
});

const state = (status: ProtectionState['status']): ProtectionState => ({
  status,
  since: null,
  verified_at: null,
  entry_count_verified: 0,
});

describe('the way back', () => {
  beforeEach(() => {
    vi.mocked(ipc.getProtectionState).mockReset();
  });

  it('returns to choosing what to protect before protection is on', async () => {
    vi.mocked(ipc.getProtectionState).mockResolvedValue(state('off'));
    render(<App />);

    await screen.findByText('What would you like to protect?');
    await userEvent.click(screen.getByRole('button', { name: 'What Cairn covers' }));
    expect(screen.queryByText('What would you like to protect?')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Protection' }));
    expect(await screen.findByText('What would you like to protect?')).toBeInTheDocument();
  });

  it('returns to the protection screen once protection is on', async () => {
    vi.mocked(ipc.getProtectionState).mockResolvedValue(state('in_force'));
    render(<App />);

    const title = ipc.protectionWords.in_force.title;
    await screen.findByRole('heading', { name: title });
    await userEvent.click(screen.getByRole('button', { name: 'What Cairn covers' }));
    expect(screen.queryByRole('heading', { name: title })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Protection' }));
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('stays in the header on the screen it leads to, marked as the current one', async () => {
    vi.mocked(ipc.getProtectionState).mockResolvedValue(state('off'));
    render(<App />);

    await screen.findByText('What would you like to protect?');
    const here = screen.getByRole('button', { name: 'Protection' });
    expect(here).toHaveAttribute('aria-current', 'page');

    await userEvent.click(screen.getByRole('button', { name: 'What Cairn covers' }));
    expect(screen.getByRole('button', { name: 'Protection' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the protected-only items in the header on every screen once protection is on', async () => {
    vi.mocked(ipc.getProtectionState).mockResolvedValue(state('in_force'));
    render(<App />);

    await screen.findByRole('heading', { name: ipc.protectionWords.in_force.title });
    await userEvent.click(screen.getByRole('button', { name: 'What Cairn covers' }));

    expect(screen.getByRole('button', { name: 'What is protected' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('offers no protected-only items before protection is on', async () => {
    vi.mocked(ipc.getProtectionState).mockResolvedValue(state('off'));
    render(<App />);

    await screen.findByText('What would you like to protect?');
    await userEvent.click(screen.getByRole('button', { name: 'What Cairn covers' }));

    expect(screen.queryByRole('button', { name: 'What is protected' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
  });
});
