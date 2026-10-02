/**
 * An offset that is not a whole minute (adversary A2): before 1972 Liberia kept Monrovia mean time,
 * 44 minutes 30 seconds behind UTC. `Date`'s local fields use the exact offset, so the offsets sent
 * to the core must too, or an hour disagrees with the Today log at its boundary.
 *
 * The zone is fixed before any date is made. The instants are fixed constants, found with Node under
 * this `TZ`.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Africa/Monrovia';

import { describe, expect, it } from 'vitest';

import { offsetChanges } from '../localDays';

const TRUE_OFFSET = -2670;
// 1971-06-15 10:00:00 by the clock: the first second of hour 10.
const TEN = 45_830_670;

/** The hour the core gives an instant from an offset: the offset added, the day's seconds, divided. */
const hourBy = (at: number, offset: number): number =>
  Math.floor(((((at + offset) % 86_400) + 86_400) % 86_400) / 3600);

describe('offsetChanges, where the offset is not a whole minute', () => {
  it('gives the offset in seconds that Date itself uses', () => {
    const [first] = offsetChanges('1971-06-15', '1971-06-15');
    expect(first.offset).toBe(TRUE_OFFSET);
  });

  it('puts the second either side of an hour boundary in the hour Date puts it in', () => {
    const [first] = offsetChanges('1971-06-15', '1971-06-15');
    for (const at of [TEN - 1, TEN, TEN + 1, TEN + 3599, TEN + 3600]) {
      expect(hourBy(at, first.offset)).toBe(new Date(at * 1000).getHours());
    }
    expect(new Date((TEN - 1) * 1000).getHours()).toBe(9);
    expect(new Date(TEN * 1000).getHours()).toBe(10);
  });
});
