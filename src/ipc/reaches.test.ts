import { describe, expect, it } from 'vitest';

import { largestCount, type SiteCount } from './reaches';

describe('largestCount', () => {
  it('is never less than 1, so an empty list or zeros divide safely', () => {
    expect(largestCount([])).toBe(1);
    expect(largestCount([{ domain: 'a.example', count: 0 }])).toBe(1);
  });

  it('is the largest count', () => {
    const sites: SiteCount[] = [
      { domain: 'a.example', count: 2 },
      { domain: 'b.example', count: 9 },
      { domain: 'c.example', count: 4 },
    ];
    expect(largestCount(sites)).toBe(9);
  });

  it('answers for a very great number of sites, where spreading them into one call throws (R4)', () => {
    const sites: SiteCount[] = Array.from({ length: 200_000 }, (_, i) => ({
      domain: `site${i}.example`,
      count: i === 150_000 ? 7 : 1,
    }));
    expect(() => largestCount(sites)).not.toThrow();
    expect(largestCount(sites)).toBe(7);
  });
});
