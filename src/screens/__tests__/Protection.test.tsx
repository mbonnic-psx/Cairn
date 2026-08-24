/**
 * The protection screen says what is true, in words that never blame.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Protection } from '../Protection';
import { protectionWords, type ProtectionState } from '../../ipc';

const NEVER: string[] = ['failed', 'denied', 'violation', 'relapsed', 'forbidden', 'you lost'];

function state(overrides: Partial<ProtectionState> = {}): ProtectionState {
  return {
    status: 'in_force',
    since: 1_700_000_000,
    verified_at: Math.round(Date.now() / 1000),
    entry_count_verified: 42,
    ...overrides,
  };
}

describe('protection state', () => {
  it('shows what was actually found on the machine', () => {
    render(<Protection state={state()} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getAllByText(/protection is on/i).length).toBeGreaterThan(0);
  });

  it('never renders not-confirmed as protected', () => {
    render(<Protection state={state({ status: 'not_verified' })} />);

    expect(screen.queryByText(/protection is on/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/not confirmed/i).length).toBeGreaterThan(0);
  });

  it('does not blame the person when it cannot confirm', () => {
    render(<Protection state={state({ status: 'not_verified' })} />);
    const text = document.body.textContent?.toLowerCase() ?? '';

    for (const word of NEVER) {
      expect(text).not.toContain(word);
    }
  });

  it('has no streak, no day count, and no chain anywhere', () => {
    // FR-053, SC-020. Streaks are a later slice and opt-in; nothing in this
    // release counts days at a person.
    for (const status of ['in_force', 'not_verified', 'off'] as const) {
      const { unmount } = render(<Protection state={state({ status })} />);
      const text = document.body.textContent ?? '';

      expect(text).not.toMatch(/streak/i);
      expect(text).not.toMatch(/\bday \d+\b/i);
      expect(text).not.toMatch(/chain/i);
      unmount();
    }
  });

  it('uses the same words everywhere it is shown', () => {
    // One source for the sentences, so the banned-word check has one place to
    // look and two screens can never disagree.
    expect(Object.keys(protectionWords).sort()).toEqual([
      'in_force',
      'not_verified',
      'off',
    ]);
  });
});
