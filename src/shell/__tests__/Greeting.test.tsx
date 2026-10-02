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
    render(<Greeting look="morning" />);
    expect(screen.getByText('Good morning.')).toBeInTheDocument();
    expect(screen.getByText(formatWeekdayTime(START))).toBeInTheDocument();
  });

  it.each([
    ['morning', 'Good morning.'],
    ['midday', 'Midday.'],
    ['night', 'Good evening.'],
  ] as const)('shows the words of the %s look, with the same weekday and time', (look, words) => {
    render(<Greeting look={look} />);
    expect(screen.getByText(words)).toBeInTheDocument();
    expect(screen.getByText(formatWeekdayTime(START))).toBeInTheDocument();
  });

  it('changes the words on a new look without resetting the clock tick', () => {
    const { rerender } = render(<Greeting look="morning" />);
    const timers = vi.getTimerCount();
    rerender(<Greeting look="night" />);
    expect(screen.getByText('Good evening.')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(timers);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText(formatWeekdayTime(new Date(2026, 9, 1, 7, 49, 20)))).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(timers);
  });

  it('first updates at the next minute boundary', () => {
    render(<Greeting look="morning" />);
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
    render(<Greeting look="morning" />);
    act(() => {
      vi.advanceTimersByTime(40_000 + 60_000);
    });
    expect(screen.getByText(formatWeekdayTime(new Date(2026, 9, 1, 7, 50, 0)))).toBeInTheDocument();
  });

  it('clears its timer on unmount', () => {
    const { unmount } = render(<Greeting look="morning" />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  describe('when the clock jumps (sleep, wake, a hand-set clock)', () => {
    const FRIDAY = new Date(2026, 9, 2, 8, 30, 5);

    function jump() {
      act(() => {
        vi.advanceTimersByTime(50_000);
      });
      // The machine slept: the clock moved on, no timer fired.
      vi.setSystemTime(FRIDAY);
    }

    it('shows the true weekday and time at once when the window becomes visible', () => {
      render(<Greeting look="morning" />);
      jump();
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(screen.getByText(formatWeekdayTime(FRIDAY))).toBeInTheDocument();
    });

    it('shows the true weekday and time at once when the window regains focus', () => {
      render(<Greeting look="morning" />);
      jump();
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(screen.getByText(formatWeekdayTime(FRIDAY))).toBeInTheDocument();
    });

    it('ignores visibilitychange while hidden', () => {
      render(<Greeting look="morning" />);
      jump();
      const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      spy.mockRestore();
      expect(screen.queryByText(formatWeekdayTime(FRIDAY))).not.toBeInTheDocument();
    });

    it('lands the next update on the next :00, not 60 s after the jump', () => {
      render(<Greeting look="morning" />);
      jump();
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      act(() => {
        vi.advanceTimersByTime(55_000);
      });
      expect(screen.getByText(formatWeekdayTime(new Date(2026, 9, 2, 8, 31, 0)))).toBeInTheDocument();
    });

    it('re-reads the clock each tick, so a jump with no event still recovers on the next :00', () => {
      render(<Greeting look="morning" />);
      act(() => {
        vi.advanceTimersByTime(40_000); // 07:49:00 tick
      });
      vi.setSystemTime(new Date(2026, 9, 1, 9, 10, 30));
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.getByText(formatWeekdayTime(new Date(2026, 9, 1, 9, 11, 30)))).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(screen.getByText(formatWeekdayTime(new Date(2026, 9, 1, 9, 12, 0)))).toBeInTheDocument();
    });

    it('removes its listeners and timer on unmount', () => {
      const docSpy = vi.spyOn(document, 'removeEventListener');
      const winSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<Greeting look="morning" />);
      unmount();
      expect(docSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(winSpy).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(vi.getTimerCount()).toBe(0);
      docSpy.mockRestore();
      winSpy.mockRestore();
    });
  });

  it('leaves exactly one pending timer after a refresh', () => {
    render(<Greeting look="morning" />);
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(vi.getTimerCount()).toBe(1);
  });

  it('wakes exactly when the minute turns, from a clock with milliseconds', () => {
    vi.setSystemTime(new Date(2026, 9, 1, 7, 48, 30, 500));
    render(<Greeting look="morning" />);
    const before = formatWeekdayTime(new Date(2026, 9, 1, 7, 48));
    const after = formatWeekdayTime(new Date(2026, 9, 1, 7, 49));
    act(() => {
      vi.advanceTimersByTime(29_499);
    });
    expect(screen.getByText(before)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText(after)).toBeInTheDocument();
  });

  it('shows no count, badge or streak', () => {
    const { container } = render(<Greeting look="morning" />);
    expect(container.textContent).not.toMatch(/streak|badge|\bday \d|\bchain\b|reach/i);
  });
});
