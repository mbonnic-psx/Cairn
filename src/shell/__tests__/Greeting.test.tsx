import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatWeekdayTime } from '../../look/look';
import { Greeting } from '../Greeting';

// 2026-10-01 is a Thursday. 07:48:20 local time.
const START = new Date(2026, 9, 1, 7, 48, 20);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Greeting', () => {
  it('shows the words and the true weekday and time', () => {
    render(<Greeting />);
    expect(screen.getByText('Good morning.')).toBeInTheDocument();
    expect(screen.getByText(formatWeekdayTime(START))).toBeInTheDocument();
  });

  it('first updates at the next minute boundary', () => {
    render(<Greeting />);
    const before = formatWeekdayTime(START);
    act(() => {
      vi.advanceTimersByTime(39_000);
    });
    expect(screen.getByText(before)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText(formatWeekdayTime(new Date(2026, 9, 1, 7, 49, 0)))).toBeInTheDocument();
  });

  it('keeps up, minute by minute', () => {
    render(<Greeting />);
    act(() => {
      vi.advanceTimersByTime(40_000 + 60_000);
    });
    expect(screen.getByText(formatWeekdayTime(new Date(2026, 9, 1, 7, 50, 0)))).toBeInTheDocument();
  });

  it('clears its timer on unmount', () => {
    const { unmount } = render(<Greeting />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows no count, badge or streak', () => {
    const { container } = render(<Greeting />);
    expect(container.textContent).not.toMatch(/streak|badge|\bday \d|\bchain\b|reach/i);
  });
});
