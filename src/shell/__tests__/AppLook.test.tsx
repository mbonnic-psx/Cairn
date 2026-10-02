/**
 * The look switch at the App level: dev builds only, starts on Morning,
 * and changing the look loses neither the step nor the check-in's text.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import * as ipc from '../../ipc';
import { getDayView, getQuotesShown, type DayView } from '../../ipc/journal';

vi.mock('../../ipc/journal', () => ({
  getDayView: vi.fn(),
  saveJournalEntry: vi.fn(),
  getQuote: vi.fn(),
  getQuotesShown: vi.fn(),
  setQuotesShown: vi.fn(),
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
    getProtectionState: vi.fn(),
  };
});

const empty: DayView = {
  reaches: [],
  gaps: [],
  coverage_note: null,
  entry: null,
  estimate: null,
  sealed: null,
};

beforeEach(() => {
  vi.mocked(ipc.getProtectionState).mockResolvedValue({
    status: 'off',
    since: null,
    verified_at: null,
    entry_count_verified: 0,
  });
  vi.mocked(getDayView).mockResolvedValue(empty);
  vi.mocked(getQuotesShown).mockResolvedValue(false);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const switchControl = () => screen.getByLabelText('Look (testing)');

describe('the look switch in a dev build', () => {
  it('shows, starts on Morning, and wears the morning notebook', async () => {
    const { container } = render(<App devBuild />);
    await screen.findByText('What would you like to protect?');
    expect(switchControl()).toHaveValue('morning');
    expect(container.querySelector('.nb-root')).toHaveAttribute('data-look', 'morning');
    expect(screen.getByText('Good morning.')).toBeInTheDocument();
  });

  it('starts on Morning on every fresh render and reads and writes no storage', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem');
    const set = vi.spyOn(Storage.prototype, 'setItem');
    const first = render(<App devBuild />);
    await screen.findByText('What would you like to protect?');
    await userEvent.selectOptions(switchControl(), 'Night');
    first.unmount();
    const second = render(<App devBuild />);
    await screen.findByText('What would you like to protect?');
    expect(switchControl()).toHaveValue('morning');
    expect(second.container.querySelector('.nb-root')).toHaveAttribute('data-look', 'morning');
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    get.mockRestore();
    set.mockRestore();
  });

  it('shows the matching shell and greeting for every choice in turn', async () => {
    const { container } = render(<App devBuild />);
    await screen.findByText('What would you like to protect?');
    const expected: [string, string, string][] = [
      ['Midday', 'midday', 'Midday.'],
      ['Night', 'night', 'Good evening.'],
      ['Morning', 'morning', 'Good morning.'],
    ];
    for (const [choice, look, words] of expected) {
      await userEvent.selectOptions(switchControl(), choice);
      expect(container.querySelector('.nb-root')).toHaveAttribute('data-look', look);
      expect(screen.getByText(words)).toBeInTheDocument();
      expect(screen.getByText('What would you like to protect?')).toBeInTheDocument();
    }
  });

  // Between the looks the screen is never rebuilt, so what a screen holds itself survives too.
  it('keeps the screen itself, and what it holds, across every pair of the three looks', async () => {
    render(<App devBuild />);
    await screen.findByText('What would you like to protect?');
    const field = screen.getByLabelText('Address to protect');
    await userEvent.type(field, 'typed.example');
    const looks = ['Morning', 'Midday', 'Night'];
    for (const from of looks) {
      for (const to of looks) {
        if (from === to) continue;
        await userEvent.selectOptions(switchControl(), from);
        await userEvent.selectOptions(switchControl(), to);
        expect(screen.getByLabelText('Address to protect')).toBe(field);
        expect(field).toHaveValue('typed.example');
      }
    }
  });

  it('keeps the step and the text typed in Tonight across every pair of the three looks', async () => {
    render(<App devBuild />);
    await screen.findByText('What would you like to protect?');
    await userEvent.click(screen.getByRole('button', { name: 'Tonight' }));
    await userEvent.type(await screen.findByLabelText('How the day went'), 'a quiet day');
    const looks = ['Morning', 'Midday', 'Night'];
    for (const from of looks) {
      for (const to of looks) {
        if (from === to) continue;
        await userEvent.selectOptions(switchControl(), from);
        await userEvent.selectOptions(switchControl(), to);
        expect(await screen.findByLabelText('How the day went')).toHaveValue('a quiet day');
        expect(screen.queryByText('What would you like to protect?')).toBeNull();
      }
    }
  });

  it('keeps the step and the text typed in Tonight across the round trip through Night', async () => {
    render(<App devBuild />);
    await screen.findByText('What would you like to protect?');
    await userEvent.click(screen.getByRole('button', { name: 'Tonight' }));
    const box = await screen.findByLabelText('How the day went');
    await userEvent.type(box, 'a quiet day');

    await userEvent.selectOptions(switchControl(), 'Night');
    expect(await screen.findByLabelText('How the day went')).toHaveValue('a quiet day');
    await userEvent.selectOptions(switchControl(), 'Morning');
    expect(await screen.findByLabelText('How the day went')).toHaveValue('a quiet day');
    expect(screen.queryByText('What would you like to protect?')).toBeNull();
  });
});

describe('the production build', () => {
  it('has no switch, cannot focus one, and equals the dev build on Morning minus its switch (devBuild false)', async () => {
    const dev = render(<App devBuild />);
    await screen.findByText('What would you like to protect?');
    const devWithoutSwitch = dev.container.cloneNode(true) as HTMLElement;
    devWithoutSwitch.querySelector('.nb-switch')?.remove();
    dev.unmount();

    const { container } = render(<App devBuild={false} />);
    await screen.findByText('What would you like to protect?');
    expect(screen.queryByLabelText('Look (testing)')).toBeNull();
    expect(screen.queryByText('Look (testing)')).toBeNull();
    expect(container.querySelector('[data-look="morning"]')).not.toBeNull();
    expect(screen.getByText('Good morning.')).toBeInTheDocument();
    expect(screen.queryByText('Midday.')).toBeNull();
    expect(screen.queryByText('Good evening.')).toBeNull();
    expect(container.innerHTML).toBe(devWithoutSwitch.innerHTML);
  });

  it('under vi.stubEnv("DEV", false) the default is the morning notebook with no switch', async () => {
    vi.stubEnv('DEV', false);
    const { container } = render(<App />);
    await screen.findByText('What would you like to protect?');
    expect(screen.queryByLabelText('Look (testing)')).toBeNull();
    expect(screen.queryByText('Look (testing)')).toBeNull();
    expect(container.querySelector('[data-look="morning"]')).not.toBeNull();
    expect(screen.getByText('Good morning.')).toBeInTheDocument();
    expect(screen.queryByText('Midday.')).toBeNull();
    expect(screen.queryByText('Good evening.')).toBeNull();
    // Tab never lands on a look switch: every focus stop is a header button or page control.
    for (let i = 0; i < 12; i += 1) {
      await userEvent.tab();
      expect(document.activeElement?.closest('.nb-switch')).toBeNull();
    }
  });
});
