/**
 * The week the reaches screen draws (slice `history-by-weekday`, gaps review W2, W4, W8, W9; plan
 * scenarios 20 and 21): which day it begins on, what each day is called, and the clause that says how
 * many of that day the range holds.
 *
 * The zone is fixed far from UTC before any date is made, so that no name can owe its answer to the
 * runner's zone. Names are compared with what the platform itself gives for a fixed instant, never with
 * a hard-coded word, so the runner's locale does not matter either.
 */
declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'Pacific/Kiritimati';

import { describe, expect, it } from 'vitest';

import {
  acrossInWords,
  firstWeekday,
  firstWeekdayOf,
  weekdayInWords,
} from '../localDays';

/** The platform's own name for the weekday of a UTC noon, reached without 2024-01-01. */
const named = (isoDay: string) =>
  new Date(`${isoDay}T12:00:00Z`).toLocaleDateString([], {
    weekday: 'long',
    timeZone: 'UTC',
  });

/** 2026-09-07 is a Monday; 2026-09-13 is the Sunday after it. */
const MONDAY = named('2026-09-07');
const SUNDAY = named('2026-09-13');

describe('firstWeekday: the day the computer’s region begins its week', () => {
  it('is Monday for Great Britain, France and the Emirates', () => {
    expect(firstWeekday('en-GB')).toBe(0);
    expect(firstWeekday('fr-FR')).toBe(0);
    expect(firstWeekday('en-AE')).toBe(0);
  });

  it('is Sunday for the United States, Israel and Brazil', () => {
    expect(firstWeekday('en-US')).toBe(6);
    expect(firstWeekday('he-IL')).toBe(6);
    expect(firstWeekday('pt-BR')).toBe(6);
  });

  it('is Saturday for Egypt and Iran', () => {
    expect(firstWeekday('ar-EG')).toBe(5);
    expect(firstWeekday('fa-IR')).toBe(5);
  });

  it('with no locale given, takes the one the computer names its days in', () => {
    const own = new Intl.DateTimeFormat().resolvedOptions().locale;
    expect(firstWeekday()).toBe(firstWeekday(own));
  });
});

describe('firstWeekdayOf: the parser, given plain objects', () => {
  it('reads getWeekInfo(), numbered from Monday 1 to Sunday 7, as the core numbers from 0', () => {
    expect(firstWeekdayOf({ getWeekInfo: () => ({ firstDay: 7 }) })).toBe(6);
    expect(firstWeekdayOf({ getWeekInfo: () => ({ firstDay: 1 }) })).toBe(0);
    expect(firstWeekdayOf({ getWeekInfo: () => ({ firstDay: 6 }) })).toBe(5);
  });

  it('reads the older weekInfo when getWeekInfo is absent', () => {
    expect(firstWeekdayOf({ weekInfo: { firstDay: 7 } })).toBe(6);
  });

  it('prefers getWeekInfo() when both are present and differ', () => {
    expect(
      firstWeekdayOf({
        getWeekInfo: () => ({ firstDay: 7 }),
        weekInfo: { firstDay: 1 },
      }),
    ).toBe(6);
    expect(
      firstWeekdayOf({
        getWeekInfo: () => ({ firstDay: 1 }),
        weekInfo: { firstDay: 7 },
      }),
    ).toBe(0);
  });

  it('falls back to Monday when neither is there', () => {
    expect(firstWeekdayOf({})).toBe(0);
  });

  it('refuses a firstDay that is not an integer from 1 to 7, and takes Monday', () => {
    for (const bad of [0, 8, 1.5, '7', null, undefined, NaN, -1]) {
      expect(firstWeekdayOf({ getWeekInfo: () => ({ firstDay: bad }) }), String(bad)).toBe(0);
      expect(firstWeekdayOf({ weekInfo: { firstDay: bad } }), String(bad)).toBe(0);
    }
  });
});

describe('weekdayInWords: a day as the computer names it', () => {
  it('gives seven distinct names', () => {
    const names = [0, 1, 2, 3, 4, 5, 6].map(weekdayInWords);
    expect(new Set(names).size).toBe(7);
    for (const name of names) expect(name.trim()).not.toBe('');
  });

  it('names 0 as a Monday and 6 as a Sunday, as the platform names them for fixed instants', () => {
    expect(weekdayInWords(0)).toBe(MONDAY);
    expect(weekdayInWords(6)).toBe(SUNDAY);
  });

  it('names every day as the platform names that day of the week', () => {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = String(7 + weekday).padStart(2, '0');
      expect(weekdayInWords(weekday)).toBe(named(`2026-09-${day}`));
    }
  });

  it('does not change in a zone fourteen hours ahead of UTC', () => {
    // This file’s zone is Pacific/Kiritimati, +14: a name made from local time would be a day out.
    expect(new Date().getTimezoneOffset()).toBe(-840);
    expect(weekdayInWords(0)).toBe(MONDAY);
  });
});

describe('acrossInWords: how many of that day the range holds (W4, W7, W8)', () => {
  it('says across 1 and the name for one', () => {
    expect(acrossInWords(0, 1)).toBe(`across 1 ${weekdayInWords(0)}`);
  });

  it('adds an s to the name for more than one, in English only', () => {
    expect(acrossInWords(0, 4)).toBe(`across 4 ${weekdayInWords(0)}s`);
    expect(acrossInWords(3, 2)).toBe(`across 2 ${weekdayInWords(3)}s`);
  });

  it('names the weekday it is given, not Monday', () => {
    expect(acrossInWords(3, 2)).toContain(weekdayInWords(3));
    expect(acrossInWords(3, 2)).not.toContain(weekdayInWords(0));
  });

  it('says not in these days when the range holds none, for every weekday', () => {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      expect(acrossInWords(weekday, 0)).toBe('not in these days');
    }
  });
});
