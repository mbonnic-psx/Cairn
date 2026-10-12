/**
 * The clock time of an instant, in the computer's own zone.
 *
 * The zone is fixed before any date is made: the furthest ahead of UTC there is, so
 * that London's time and UTC's time are both visibly not the answer.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Pacific/Kiritimati';

import { describe, expect, it } from 'vitest';

import { clockTimeInWords } from '../localDays';

// 2026-09-07 10:30 UTC is 2026-09-08 00:30 in Kiritimati (UTC+14), and 11:30 in London.
const FIRST = Date.UTC(2026, 8, 7, 10, 30) / 1000;
const wording = { hour: 'numeric', minute: '2-digit' } as const;

describe('clockTimeInWords', () => {
  it('is the computer locale\'s time of the instant, exactly', () => {
    expect(clockTimeInWords(FIRST)).toBe(
      new Date(FIRST * 1000).toLocaleTimeString([], wording),
    );
  });

  it('names the +14 zone\'s time, not London\'s and not UTC\'s', () => {
    const said = clockTimeInWords(FIRST);
    const at = (timeZone: string) =>
      new Date(FIRST * 1000).toLocaleTimeString([], { ...wording, timeZone });
    expect(said).toBe(at('Pacific/Kiritimati'));
    expect(said).not.toBe(at('Europe/London'));
    expect(said).not.toBe(at('UTC'));
  });
});
