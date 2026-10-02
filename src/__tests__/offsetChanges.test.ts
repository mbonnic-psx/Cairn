/**
 * The offsets the computer's clock has across a range of days, and the label of an hour
 * (slice `history-by-hour`, plan scenario 17).
 *
 * The zone is fixed before any date is made. Europe/London changes its clocks at 01:00 UTC
 * (2026-03-29 forward, 2026-10-25 back).
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Europe/London';

import { describe, expect, it } from 'vitest';

import { hourInWords, offsetChanges, rangeBounds } from '../localDays';

/** 2026-03-29 01:00 UTC: the clocks go forward, 0 to +3 600. */
const SPRING = 1_774_746_000;
/** 2026-10-25 01:00 UTC: the clocks go back, +3 600 to 0. */
const AUTUMN = 1_792_890_000;

const first = (a: string, b: string) => rangeBounds(a, b).start;

describe('offsetChanges, in London', () => {
  it('finds the clocks going back, at the instant, with the offset from then on', () => {
    expect(offsetChanges('2026-10-19', '2026-11-01')).toEqual([
      { from: first('2026-10-19', '2026-11-01'), offset: 3600 },
      { from: AUTUMN, offset: 0 },
    ]);
  });

  it('finds the clocks going forward', () => {
    expect(offsetChanges('2026-03-23', '2026-04-05')).toEqual([
      { from: first('2026-03-23', '2026-04-05'), offset: 0 },
      { from: SPRING, offset: 3600 },
    ]);
  });

  it('is one entry across a winter month', () => {
    expect(offsetChanges('2026-01-05', '2026-02-01')).toEqual([
      { from: first('2026-01-05', '2026-02-01'), offset: 0 },
    ]);
  });

  it('is one entry across the summer weeks the 4-week range opens on', () => {
    expect(offsetChanges('2026-09-03', '2026-09-30')).toEqual([
      { from: first('2026-09-03', '2026-09-30'), offset: 3600 },
    ]);
  });

  it('is three entries across a calendar year whose two ends agree', () => {
    expect(offsetChanges('2026-01-01', '2026-12-31')).toEqual([
      { from: first('2026-01-01', '2026-12-31'), offset: 0 },
      { from: SPRING, offset: 3600 },
      { from: AUTUMN, offset: 0 },
    ]);
  });

  it('holds a change on the last day, and on the first', () => {
    expect(offsetChanges('2026-10-19', '2026-10-25').map((c) => c.from)).toEqual([
      first('2026-10-19', '2026-10-25'),
      AUTUMN,
    ]);
    expect(offsetChanges('2026-10-25', '2026-10-25').map((c) => c.from)).toEqual([
      first('2026-10-25', '2026-10-25'),
      AUTUMN,
    ]);
  });

  it('holds no change from the day before it, nor from the day after it', () => {
    expect(offsetChanges('2026-10-19', '2026-10-24')).toHaveLength(1);
    expect(offsetChanges('2026-10-26', '2026-11-02')).toEqual([
      { from: first('2026-10-26', '2026-11-02'), offset: 0 },
    ]);
  });

  it('begins at the range start, increases, and stays inside the range', () => {
    for (const [a, b] of [
      ['2026-10-19', '2026-11-01'],
      ['2026-03-23', '2026-04-05'],
      ['2025-10-01', '2027-09-30'],
      ['2026-10-25', '2026-10-25'],
      ['2026-03-29', '2026-03-29'],
    ] as const) {
      const changes = offsetChanges(a, b);
      const { start, end } = rangeBounds(a, b);
      expect(changes[0].from).toBe(start);
      for (let i = 1; i < changes.length; i += 1) {
        expect(changes[i].from).toBeGreaterThan(changes[i - 1].from);
        expect(changes[i].offset).not.toBe(changes[i - 1].offset);
      }
      expect(changes[changes.length - 1].from).toBeLessThan(end);
    }
  });

  it('finds four changes in two years', () => {
    expect(offsetChanges('2025-10-01', '2027-09-30')).toEqual([
      { from: first('2025-10-01', '2027-09-30'), offset: 3600 },
      { from: 1_761_440_400, offset: 0 },
      { from: SPRING, offset: 3600 },
      { from: AUTUMN, offset: 0 },
      { from: 1_806_195_600, offset: 3600 },
    ]);
  });

  it('gives whole seconds east of UTC', () => {
    for (const change of offsetChanges('2025-10-01', '2027-09-30')) {
      expect(Number.isInteger(change.from)).toBe(true);
      expect(Number.isInteger(change.offset)).toBe(true);
    }
  });

  it('refuses what is not a calendar date, as every day string here is', () => {
    expect(() => offsetChanges('2026-02-30', '2026-03-01')).toThrow(RangeError);
    expect(() => offsetChanges('2026-03-01', '2026-3-2')).toThrow(RangeError);
  });
});

describe('hourInWords', () => {
  const asTheLogPrintsIt = (hour: number) =>
    new Date(2000, 0, 1, hour).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  it('names 24 distinct hours in order from midnight, in the form the Today log prints a time', () => {
    const labels = Array.from({ length: 24 }, (_, hour) => hourInWords(hour));
    expect(labels).toEqual(
      Array.from({ length: 24 }, (_, hour) => asTheLogPrintsIt(hour)),
    );
    expect(new Set(labels).size).toBe(24);
  });

  it('does not depend on the zone: no clock change skips or doubles a label', () => {
    // Midnight to 23:00 on any day is the same 24 labels; the spring and autumn
    // nights of 2026 are only dates, not an input.
    expect(hourInWords(1)).toBe(asTheLogPrintsIt(1));
    expect(hourInWords(2)).toBe(asTheLogPrintsIt(2));
  });
});
