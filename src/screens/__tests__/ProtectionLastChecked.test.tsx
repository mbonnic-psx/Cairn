/**
 * Two small promises on the Protection screen, pinned as they already are.
 *
 * "Last checked" states verified state, so a wrong unit or sign would misstate
 * how fresh the check is. And "Keep things as they are" must reach the core
 * whether or not the caller asked to hear about it.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Protection } from '../Protection';
import type { PendingChange, ProtectionState } from '../../ipc';
import { installFakeCore, type FakeCore } from './fakeCore';

type NodeLikeProcess = {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
};

const NOW_MS = 1_800_000_000_000;
const NOW = NOW_MS / 1000;

const stateAt = (verified_at: number): ProtectionState => ({
  status: 'in_force',
  since: 1_700_000_000,
  verified_at,
  entry_count_verified: 12,
});

function lastChecked(): string {
  const label = screen.getByText('Last checked');
  return label.nextElementSibling?.textContent ?? '';
}

describe('Last checked', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW_MS);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const cases: [string, number, string][] = [
    ['just now, at the moment of the check', 0, 'just now'],
    ['just now, 30 seconds on', 30, 'just now'],
    ['just now, one second short of 90', 89, 'just now'],
    ['minutes, from 90 seconds', 90, '2 minutes ago'],
    ['minutes, 5 minutes on', 300, '5 minutes ago'],
    ['minutes, one second short of an hour', 3599, '60 minutes ago'],
    ['hours, from exactly an hour', 3600, '1 hours ago'],
    ['hours, 3 hours on', 3 * 3600, '3 hours ago'],
    ['hours, one second short of a day', 86399, '24 hours ago'],
    ['days, from exactly a day', 86400, '1 days ago'],
    ['days, 3 days on', 3 * 86400, '3 days ago'],
  ];

  it.each(cases)('says %s', (_name, secondsAgo, words) => {
    render(<Protection state={stateAt(NOW - secondsAgo)} pending={null} />);

    expect(lastChecked()).toBe(words);
  });

  it('says just now for a check stamped in the future, never a negative age', () => {
    render(<Protection state={stateAt(NOW + 3 * 3600)} pending={null} />);

    expect(lastChecked()).toBe('just now');
  });
});

describe('Keep things as they are, with nobody listening', () => {
  let core: FakeCore;
  afterEach(() => core.remove());

  it('still reaches the core and does not throw', async () => {
    core = installFakeCore({ cancel_pending_change: () => undefined });
    const pending: PendingChange = {
      id: 'abc',
      what: 'Turn protection off',
      time_remaining: '23 hours',
      eligible_now: false,
    };
    const unhandled = vi.fn();
    // Node's process, reached without the Node type definitions the app's tsconfig leaves out.
    const proc = (globalThis as unknown as { process: NodeLikeProcess }).process;
    proc.on('unhandledRejection', unhandled);

    render(<Protection state={stateAt(NOW)} pending={pending} />);
    fireEvent.click(screen.getByRole('button', { name: /keep things as they are/i }));

    await waitFor(() =>
      expect(core.calls).toEqual([{ cmd: 'cancel_pending_change', args: { id: 'abc' } }]),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    proc.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
