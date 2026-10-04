declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Pacific/Kiritimati';

import { describe, expect, it } from 'vitest';
import { shortDateInWords, weekOfInWords } from '../localDays';

function expected(y: number, m: number, d: number, withYear: boolean): string {
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

describe('the date in words', () => {
  it('writes the date as the computer writes it short', () => {
    expect(shortDateInWords('2026-10-06', false)).toBe(expected(2026, 10, 6, false));
    expect(shortDateInWords('2026-10-06', false)).toContain('Oct');
  });

  it('carries the year when asked', () => {
    expect(shortDateInWords('2025-12-29', true)).toBe(expected(2025, 12, 29, true));
    expect(shortDateInWords('2025-12-29', true)).toContain('2025');
  });

  it('names year 100, not 1900 or 2000', () => {
    const text = shortDateInWords('0100-01-04', true);
    expect(text).toBe(expected(100, 1, 4, true));
    expect(text).toContain('100');
    expect(text).not.toMatch(/1900|2000/);
  });

  it('names the date given in a zone fourteen hours ahead', () => {
    expect(new Date(2026, 9, 6).getTimezoneOffset()).toBe(-840);
    expect(shortDateInWords('2026-10-06', false)).toMatch(/\b6\b/);
    expect(shortDateInWords('2026-10-01', false)).toMatch(/\b1\b/);
  });

  it('refuses a day that is not written as YYYY-MM-DD', () => {
    for (const day of ['2026-9-1', 'x2026-09-01', '2026-09-011'])
      expect(() => shortDateInWords(day, false)).toThrow(/not a calendar date/);
  });

  it('names a week by its first date', () => {
    expect(weekOfInWords('2026-10-06', false)).toBe(`week of ${expected(2026, 10, 6, false)}`);
    expect(weekOfInWords('2025-12-29', true)).toBe(`week of ${expected(2025, 12, 29, true)}`);
  });
});
