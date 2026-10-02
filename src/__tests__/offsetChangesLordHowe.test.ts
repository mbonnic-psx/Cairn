/**
 * Half-hour changes (slice `history-by-hour`, plan scenario 17): Lord Howe Island keeps +10:30
 * and puts its clocks forward by 30 minutes, to +11:00. No offset is assumed to be a whole hour.
 *
 * The zone is fixed before any date is made.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Australia/Lord_Howe';

import { describe, expect, it } from 'vitest';

import { offsetChanges, rangeBounds } from '../localDays';

describe('offsetChanges, on Lord Howe Island', () => {
  it('finds the four half-hour changes of two years, each to the second', () => {
    expect(offsetChanges('2025-10-01', '2027-04-30')).toEqual([
      { from: rangeBounds('2025-10-01', '2027-04-30').start, offset: 37_800 },
      { from: 1_759_591_800, offset: 39_600 }, // 2025-10-04 15:30 UTC
      { from: 1_775_314_800, offset: 37_800 }, // 2026-04-04 15:00 UTC
      { from: 1_791_041_400, offset: 39_600 }, // 2026-10-03 15:30 UTC
      { from: 1_806_764_400, offset: 37_800 }, // 2027-04-03 15:00 UTC
    ]);
  });

  it('is one entry with the half-hour offset when no change falls in the range', () => {
    expect(offsetChanges('2026-06-01', '2026-06-30')).toEqual([
      { from: rangeBounds('2026-06-01', '2026-06-30').start, offset: 37_800 },
    ]);
  });
});
