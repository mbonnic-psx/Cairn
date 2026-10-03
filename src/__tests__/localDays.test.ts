/**
 * Local calendar days: the arithmetic the screens share.
 *
 * A day is the time between two local midnights, so it can be 23 or 25 hours long.
 * The zone is fixed before any date is made.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { describe, expect, it } from 'vitest';

import {
  addDays,
  dayBounds,
  dayInWords,
  isLocalDate,
  localToday,
  rangeBounds,
  rangeInWords,
} from '../localDays';

const seconds = (d: Date) => Math.round(d.getTime() / 1000);

describe('localToday', () => {
  it('is the local date as YYYY-MM-DD, zero padded', () => {
    expect(localToday(new Date(2026, 2, 5, 20, 0))).toBe('2026-03-05');
  });

  it('is still the local date a minute before local midnight, and the next just after', () => {
    expect(localToday(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30');
    expect(localToday(new Date(2026, 9, 1, 0, 1))).toBe('2026-10-01');
  });
});

describe('dayBounds', () => {
  it('is the two local midnights, 24 hours apart on an ordinary day', () => {
    const b = dayBounds('2026-09-30');
    expect(b.start).toBe(seconds(new Date(2026, 8, 30)));
    expect(b.end).toBe(seconds(new Date(2026, 9, 1)));
    expect(b.end - b.start).toBe(86_400);
  });

  it('is 23 hours on a spring-forward day', () => {
    const b = dayBounds('2026-03-29');
    expect(b.end - b.start).toBe(23 * 3600);
  });

  it('is 25 hours on a fall-back day', () => {
    const b = dayBounds('2026-10-25');
    expect(b.end - b.start).toBe(25 * 3600);
  });
});

describe('rangeBounds', () => {
  it('begins at the first day midnight and ends at the midnight after the last day', () => {
    const b = rangeBounds('2026-09-03', '2026-09-30');
    expect(b.start).toBe(seconds(new Date(2026, 8, 3)));
    expect(b.end).toBe(seconds(new Date(2026, 9, 1)));
  });

  it('is one day when the first and last are the same', () => {
    expect(rangeBounds('2026-10-25', '2026-10-25')).toEqual(dayBounds('2026-10-25'));
  });

  it('is not a count of 86 400 seconds across a clock change', () => {
    const b = rangeBounds('2026-10-24', '2026-10-26');
    expect(b.end - b.start).toBe(3 * 86_400 + 3600);
  });
});

describe('addDays', () => {
  it('goes back 27 days from the end of September', () => {
    expect(addDays('2026-09-30', -27)).toBe('2026-09-03');
  });

  it('crosses a month end', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('crosses a year end', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('knows 29 February', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('does not move across a clock change', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });
});

describe('isLocalDate', () => {
  it('accepts a real calendar date with a four-digit year', () => {
    expect(isLocalDate('2026-09-30')).toBe(true);
    expect(isLocalDate('2028-02-29')).toBe(true);
  });

  it('refuses what is not one', () => {
    for (const s of [
      '2026-02-30',
      '2027-02-29',
      '2026-09-0',
      '1',
      '',
      '26-09-10',
      '0026-09-10',
      '12026-09-10',
      '2026-9-10',
      '2026-13-01',
      ' 2026-09-10',
    ]) {
      expect(isLocalDate(s), s).toBe(false);
    }
  });

  it('is what every entry point demands: none makes a day of a refused string', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
    expect(() => dayBounds('1')).toThrow(RangeError);
    expect(() => rangeBounds('2026-09-10', '2026-09-0')).toThrow(RangeError);
    expect(() => rangeBounds('26-09-10', '2026-09-10')).toThrow(RangeError);
  });
});

describe('dayInWords', () => {
  it('names every month, without the year unless asked', () => {
    const names = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    names.forEach((name, month) => {
      const day = `2026-${String(month + 1).padStart(2, '0')}-03`;
      expect(dayInWords(day)).toBe(`3 ${name}`);
      expect(dayInWords(day, true)).toBe(`3 ${name} 2026`);
    });
  });

  it('refuses what is not a calendar date, and says which', () => {
    expect(() => dayInWords('2026-02-30')).toThrow(RangeError);
    expect(() => dayInWords('2026-02-30')).toThrow('not a calendar date: "2026-02-30"');
  });
});

describe('rangeInWords', () => {
  it('names a range inside one year without the year', () => {
    expect(rangeInWords('2026-09-03', '2026-09-30')).toBe('From 3 September to 30 September');
  });

  it('names no year for a range wholly in another year, since only a crossing names one', () => {
    expect(rangeInWords('2025-09-03', '2025-09-30')).toBe('From 3 September to 30 September');
  });

  it('names the year on both dates where the range crosses one', () => {
    expect(rangeInWords('2025-12-20', '2026-09-30')).toBe(
      'From 20 December 2025 to 30 September 2026',
    );
  });
});
