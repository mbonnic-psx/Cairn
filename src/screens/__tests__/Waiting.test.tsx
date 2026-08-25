/**
 * A change that is waiting, and the teardown report.
 *
 * The waiting period is the thing standing between someone at 11pm and an
 * instant off-switch, so how it is *shown* matters as much as how it works: no
 * countdown to watch, and a way out that is always there.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Protection } from '../Protection';
import { Teardown } from '../Teardown';
import type { PendingChange, ProtectionState, TeardownReport } from '../../ipc';

vi.mock('../../ipc', async () => {
  const actual = await vi.importActual<typeof import('../../ipc')>('../../ipc');
  return { ...actual, cancelPendingChange: vi.fn().mockResolvedValue(undefined) };
});

const state: ProtectionState = {
  status: 'in_force',
  since: 1_700_000_000,
  verified_at: Math.round(Date.now() / 1000),
  entry_count_verified: 12,
};

const pending: PendingChange = {
  id: 'abc',
  what: 'Turn protection off',
  time_remaining: '23 hours',
  eligible_now: false,
};

describe('a change that is waiting', () => {
  it('says protection stays on until it takes effect', () => {
    render(<Protection state={state} pending={pending} />);

    expect(screen.getByText(/protection stays on until then/i)).toBeInTheDocument();
    expect(screen.getAllByText(/protection is on/i).length).toBeGreaterThan(0);
  });

  it('shows a phrase, never a countdown', () => {
    render(<Protection state={state} pending={pending} />);
    const text = document.body.textContent ?? '';

    expect(text).toContain('23 hours');
    // A clock is something to sit and watch.
    expect(text).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('always offers a way to keep things as they are', () => {
    render(<Protection state={state} pending={pending} />);

    expect(
      screen.getByRole('button', { name: /keep things as they are/i }),
    ).toBeEnabled();
  });

  it('offers nothing that would take protection off now', () => {
    render(<Protection state={state} pending={pending} />);
    const buttons = screen.getAllByRole('button').map((button) => button.textContent ?? '');

    for (const label of buttons) {
      expect(label.toLowerCase()).not.toMatch(/now|immediately|skip|anyway|just this once/);
    }
  });
});

describe('the teardown report', () => {
  const complete: TeardownReport = {
    complete: true,
    residue: [],
    confirmed: ['The system’s list of site addresses is exactly as it was before Cairn.'],
  };

  it('states what was checked rather than celebrating', () => {
    render(<Teardown report={complete} />);
    const text = (document.body.textContent ?? '').toLowerCase();

    expect(text).toContain('checked');
    expect(text).not.toMatch(/congratulations|well done|great job|🎉/);
  });

  it('names residue instead of rounding it down to success', () => {
    const partial: TeardownReport = {
      complete: false,
      residue: ['the background component is still installed'],
      confirmed: [],
    };
    render(<Teardown report={partial} />);

    expect(screen.getByRole('heading', { name: /still here/i })).toBeInTheDocument();
    expect(screen.getByText(/background component is still installed/i)).toBeInTheDocument();
  });
});
