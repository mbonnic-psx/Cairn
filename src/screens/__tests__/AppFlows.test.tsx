/**
 * The journey through the header and the setup screens, end to end through App:
 * what each button leads to, and what the screen says when the core refuses.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import * as ipc from '../../ipc';
import type { CategoryPreset, ProtectionState } from '../../ipc';
import { listTodaysReaches } from '../../ipc/reaches';

vi.mock('../../ipc', async () => {
  const actual = await vi.importActual<typeof import('../../ipc')>('../../ipc');
  return {
    ...actual,
    listCategories: vi.fn(),
    getDisclosures: vi.fn(),
    getProtectionState: vi.fn(),
    getTrail: vi.fn(),
    setCategoryEnabled: vi.fn(),
    turnProtectionOn: vi.fn(),
  };
});
vi.mock('../../ipc/journal', () => ({
  getDayView: vi.fn(() => new Promise(() => undefined)),
  saveJournalEntry: vi.fn(),
}));
vi.mock('../../ipc/reaches', () => ({ listTodaysReaches: vi.fn() }));

const state = (status: ProtectionState['status']): ProtectionState => ({
  status,
  since: null,
  verified_at: null,
  entry_count_verified: 0,
});

const social = (enabled: boolean): CategoryPreset => ({
  id: 'social',
  label: 'Social media',
  enabled,
  entry_count: 12,
  edited: false,
});

const trail = {
  entries: [{ domain: 'trail-entry.example', sources: [], auto_www: false }],
  enabled_categories: ['social' as const],
};

beforeEach(() => {
  vi.mocked(ipc.listCategories).mockReset().mockResolvedValue([social(true)]);
  vi.mocked(ipc.getDisclosures).mockReset().mockResolvedValue({
    in_force: [],
    not_covered: [],
    helper: '',
    encryption: '',
    administrator: '',
  });
  vi.mocked(ipc.getProtectionState).mockReset().mockResolvedValue(state('off'));
  vi.mocked(ipc.getTrail).mockReset().mockResolvedValue(trail);
  vi.mocked(ipc.setCategoryEnabled).mockReset();
  vi.mocked(ipc.turnProtectionOn).mockReset();
  vi.mocked(listTodaysReaches).mockReset().mockResolvedValue({
    reaches: [{ domain: 'reached.example', at: 1_700_000_100 }],
    gaps: [],
    coverage_note: null,
    sealed: null,
  });
});

describe('the header once protection is on', () => {
  it('leads Today to what was reached today', async () => {
    vi.mocked(ipc.getProtectionState).mockResolvedValue(state('in_force'));
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Today' }));

    expect(await screen.findByText('reached.example')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
  });

  it('leads What is protected to the trail, read fresh', async () => {
    vi.mocked(ipc.getProtectionState).mockResolvedValue(state('in_force'));
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'What is protected' }));

    expect(await screen.findByText('trail-entry.example')).toBeInTheDocument();
    expect(ipc.getTrail).toHaveBeenCalled();
  });
});

describe('choosing what to protect', () => {
  it('asks for the change and shows nothing when it applies at once', async () => {
    vi.mocked(ipc.setCategoryEnabled).mockResolvedValue(null);
    vi.mocked(ipc.listCategories)
      .mockResolvedValueOnce([social(true)])
      .mockResolvedValue([social(false)]);
    render(<App />);
    const box = await screen.findByRole('checkbox');
    await userEvent.click(box);

    expect(ipc.setCategoryEnabled).toHaveBeenCalledWith('social', false);
    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });

  it('says why a box stays ticked when the change has to wait, then clears that once it need not', async () => {
    vi.mocked(ipc.setCategoryEnabled).mockResolvedValueOnce({
      id: 'p1',
      what: 'Stop protecting Social media',
      time_remaining: '23 hours',
      eligible_now: false,
    });
    render(<App />);
    await userEvent.click(await screen.findByRole('checkbox'));
    expect(
      await screen.findByText(/Stop protecting Social media: this takes effect in 23 hours/),
    ).toBeInTheDocument();

    vi.mocked(ipc.setCategoryEnabled).mockResolvedValueOnce(null);
    await userEvent.click(screen.getByRole('checkbox'));
    await vi.waitFor(() => {
      expect(screen.queryByText(/takes effect in 23 hours/)).toBeNull();
    });
  });

  it("shows the core's sentence as written when a change is refused", async () => {
    vi.mocked(ipc.setCategoryEnabled).mockRejectedValue('That list could not be changed just now.');
    render(<App />);
    await userEvent.click(await screen.findByRole('checkbox'));

    expect(await screen.findByText('That list could not be changed just now.')).toBeInTheDocument();
  });
});

describe('turning protection on', () => {
  async function toDisclosure() {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Turn protection on' }));
    return screen.findByRole('button', { name: 'Yes, set this up' });
  }

  it('goes through what will change, and back again on Not yet', async () => {
    await toDisclosure();
    expect(screen.queryByText('What would you like to protect?')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Not yet' }));
    expect(await screen.findByText('What would you like to protect?')).toBeInTheDocument();
  });

  it('lands on the protection screen when it is confirmed', async () => {
    vi.mocked(ipc.turnProtectionOn).mockResolvedValue(state('in_force'));
    await userEvent.click(await toDisclosure());

    expect(
      await screen.findByRole('heading', { name: ipc.protectionWords.in_force.title }),
    ).toBeInTheDocument();
    expect(ipc.getTrail).toHaveBeenCalled();
  });

  it("returns to choosing with the core's sentence when it could not be turned on", async () => {
    vi.mocked(ipc.turnProtectionOn).mockRejectedValue('Cairn could not finish setting this up.');
    await userEvent.click(await toDisclosure());

    expect(await screen.findByText('What would you like to protect?')).toBeInTheDocument();
    expect(screen.getByText('Cairn could not finish setting this up.')).toBeInTheDocument();
  });
});

describe('one screen at a time', () => {
  const others = () => ({
    disclosure: screen.queryByRole('button', { name: 'Yes, set this up' }),
    choosing: screen.queryByText('What would you like to protect?'),
    trail: screen.queryByRole('heading', { name: 'What you are protecting' }),
    today: screen.queryByRole('heading', { name: 'Today' }),
    covers: screen.queryByRole('heading', { name: 'What Cairn covers' }),
    tonight: screen.queryByLabelText('How the day went'),
    looking: screen.queryByText('Looking…'),
  });

  it('shows only the choosing screen while choosing', async () => {
    render(<App />);
    await screen.findByText('What would you like to protect?');
    const seen = others();
    expect(seen.choosing).not.toBeNull();
    for (const [name, element] of Object.entries(seen)) {
      if (name !== 'choosing') expect(element, name).toBeNull();
    }
  });

  it('shows only the protection screen once protection is on, even after the trail was read', async () => {
    vi.mocked(ipc.turnProtectionOn).mockResolvedValue(state('in_force'));
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Turn protection on' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, set this up' }));
    await screen.findByRole('heading', { name: ipc.protectionWords.in_force.title });

    for (const [name, element] of Object.entries(others())) expect(element, name).toBeNull();
  });

  it('shows what Cairn covers, from what the core said, when asked', async () => {
    vi.mocked(ipc.getDisclosures).mockResolvedValue({
      in_force: ['Addresses on your lists are blocked on this computer.'],
      not_covered: ['An app that looks addresses up on its own.'],
      helper: '',
      encryption: '',
      administrator: '',
    });
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'What Cairn covers' }));

    expect(
      await screen.findByText('Addresses on your lists are blocked on this computer.'),
    ).toBeInTheDocument();
    expect(screen.getByText('An app that looks addresses up on its own.')).toBeInTheDocument();
  });
});

describe('the header marks where a person is', () => {
  const protectionButton = () => screen.getByRole('button', { name: 'Protection' });

  it('marks Protection on the disclosure and the protection screens, not elsewhere', async () => {
    vi.mocked(ipc.turnProtectionOn).mockResolvedValue(state('in_force'));
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Turn protection on' }));
    await screen.findByRole('button', { name: 'Yes, set this up' });
    expect(protectionButton()).toHaveAttribute('aria-current', 'page');

    await userEvent.click(screen.getByRole('button', { name: 'Yes, set this up' }));
    await screen.findByRole('heading', { name: ipc.protectionWords.in_force.title });
    expect(protectionButton()).toHaveAttribute('aria-current', 'page');

    await userEvent.click(screen.getByRole('button', { name: 'What is protected' }));
    await screen.findByText('trail-entry.example');
    expect(protectionButton()).not.toHaveAttribute('aria-current');
  });
});
