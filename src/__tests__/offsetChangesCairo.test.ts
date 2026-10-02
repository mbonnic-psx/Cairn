/**
 * A zone that changes at midnight (convergence K23, K24): Africa/Cairo puts its clocks forward from
 * +02:00 to +03:00 at 00:00 on 2026-04-24, so that midnight does not happen; `new Date(2026, 3, 24)`
 * is 01:00 at the new offset. Expected instants are fixed constants, found independently with
 * Node under this `TZ`, not computed by `offsetChanges`.
 *
 * The zone is fixed before any date is made.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Africa/Cairo';

import { describe, expect, it } from 'vitest';

import { offsetChanges, rangeBounds } from '../localDays';

const CHANGE = 1_776_981_600; // 2026-04-23 22:00 UTC, 2026-04-24 01:00 at +03:00
const NEW = 10_800;
const OLD = 7200;

describe('offsetChanges, in a zone that changes at midnight', () => {
  it('a range starting on the skipped midnight begins at the change, with the offset in force', () => {
    expect(rangeBounds('2026-04-24', '2026-04-30').start).toBe(CHANGE);
    expect(offsetChanges('2026-04-24', '2026-04-30')).toEqual([
      { from: CHANGE, offset: NEW },
    ]);
  });

  it("a change at the range's end is outside it: the range gives exactly one entry", () => {
    // 2026-04-20 to 2026-04-23 ends at 2026-04-24 00:00, which is the change's instant.
    expect(rangeBounds('2026-04-20', '2026-04-23')).toEqual({
      start: 1_776_636_000,
      end: CHANGE,
    });
    expect(offsetChanges('2026-04-20', '2026-04-23')).toEqual([
      { from: 1_776_636_000, offset: OLD },
    ]);
  });

  it('a change at a midnight inside the range is one entry, to the second', () => {
    expect(offsetChanges('2026-04-20', '2026-04-30')).toEqual([
      { from: 1_776_636_000, offset: OLD },
      { from: CHANGE, offset: NEW },
    ]);
    expect(offsetChanges('2026-04-23', '2026-04-24')).toEqual([
      { from: 1_776_895_200, offset: OLD },
      { from: CHANGE, offset: NEW },
    ]);
  });

  it('a range ending on the day after the change holds it, and a range after it holds none', () => {
    expect(offsetChanges('2026-04-20', '2026-04-24')).toEqual([
      { from: 1_776_636_000, offset: OLD },
      { from: CHANGE, offset: NEW },
    ]);
    expect(offsetChanges('2026-04-25', '2026-04-30')).toEqual([
      { from: 1_777_064_400, offset: NEW },
    ]);
  });
});
