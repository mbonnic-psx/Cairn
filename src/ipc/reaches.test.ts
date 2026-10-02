import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  largestCount,
  listTodaysReaches,
  summarizeReaches,
  type SiteCount,
} from './reaches';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

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

describe('the reaches wrappers', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset().mockResolvedValue({ reaches: [] });
  });

  it('asks for the day by its bounds and returns what the core says', async () => {
    await expect(listTodaysReaches(100, 200)).resolves.toEqual({ reaches: [] });
    expect(invoke).toHaveBeenCalledWith('list_todays_reaches', {
      dayStart: 100,
      dayEnd: 200,
    });
  });

  it('asks for the range by its dates and bounds and returns what the core says', async () => {
    const offsets = [
      { from: 100, offset: 3600 },
      { from: 150, offset: 0 },
    ];
    await expect(
      summarizeReaches('2026-09-03', '2026-09-30', 100, 200, offsets),
    ).resolves.toEqual({
      reaches: [],
    });
    expect(invoke).toHaveBeenCalledWith('summarize_reaches', {
      firstDay: '2026-09-03',
      lastDay: '2026-09-30',
      rangeStart: 100,
      rangeEnd: 200,
      offsets: [
        { from: 100, offset: 3600 },
        { from: 150, offset: 0 },
      ],
    });
  });
});
