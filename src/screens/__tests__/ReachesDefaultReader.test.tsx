/**
 * With no reader passed, the screen asks the core by the names the core knows.
 * The names are also checked against the Rust side by `ipc_surface.rs`.
 */
import { invoke } from '@tauri-apps/api/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Reaches } from '../Reaches';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const NOW = new Date(2026, 8, 30, 20, 0);

beforeEach(() => {
  vi.mocked(invoke).mockReset();
  vi.mocked(invoke).mockImplementation(async (name: string) =>
    name === 'summarize_reaches'
      ? {
          by_site: [],
          gaps: [],
          coverage_note: null,
          estimates_excluded: 0,
          sealed: null,
        }
      : { reaches: [], gaps: [], coverage_note: null, sealed: null },
  );
});

describe('the screen with the real reader', () => {
  it('asks for today by its two midnights', async () => {
    render(<Reaches now={() => NOW} />);

    await screen.findByText(/nothing here for today/i);
    const midnight = Math.round(new Date(2026, 8, 30).getTime() / 1000);
    expect(invoke).toHaveBeenCalledWith('list_todays_reaches', {
      dayStart: midnight,
      dayEnd: expect.any(Number),
    });
  });

  it('asks for the range by its dates and bounds', async () => {
    const user = userEvent.setup();
    render(<Reaches now={() => NOW} />);
    await user.click(await screen.findByRole('button', { name: 'Over time' }));

    await screen.findByText(/nothing here for these days/i);
    expect(invoke).toHaveBeenCalledWith('summarize_reaches', {
      firstDay: '2026-09-03',
      lastDay: '2026-09-30',
      rangeStart: expect.any(Number),
      rangeEnd: expect.any(Number),
    });
  });
});
