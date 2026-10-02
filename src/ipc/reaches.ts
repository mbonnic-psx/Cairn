/**
 * Today's reaches, and a range of days by site, by hour, by day of week and day by day.
 *
 * In a file of its own so the restriction can be stated where it is enforced:
 * **the Reaches screen is the only thing that may import this** (FR-030a). An
 * ESLint rule refuses the import anywhere else, and
 * `scripts/check-no-ambient-counts.mjs` fails the build if a count appears on
 * any other surface.
 *
 * The reason is not tidiness. A number that follows someone around — in a
 * header, a tray, a badge — is a reminder of the thing they are trying to walk
 * away from. Reaches are there for someone who goes looking, and for nobody
 * else (FR-030b).
 */
import { invoke } from '@tauri-apps/api/core';

export interface Reach {
  domain: string;
  at: number;
}

export interface Gap {
  from: number;
  to: number;
}

export interface TodaysReaches {
  reaches: Reach[];
  gaps: Gap[];
  /** Shown above the list when part of the day was not observed. */
  coverage_note: string | null;
  /** Present when the history could not be opened. Protection is unaffected. */
  sealed: string | null;
}

export const listTodaysReaches = (dayStart: number, dayEnd: number) =>
  invoke<TodaysReaches>('list_todays_reaches', { dayStart, dayEnd });

export interface SiteCount {
  domain: string;
  count: number;
}

export interface HourCount {
  /** 0 to 23, by the computer's clock at the reach's own instant. */
  hour: number;
  count: number;
}

export interface WeekdayCount {
  /**
   * 0 (Monday) to 6 (Sunday), as the core numbers them: not `Date.getDay`'s, which begins on
   * Sunday. Which day a week begins on is the screen's to choose and is never sent.
   */
  weekday: number;
  /** Reaches on this weekday, by the computer's clock at each reach's own instant. */
  count: number;
  /** How many days of this weekday the range holds; 0 when it holds none. */
  days: number;
}

/** The offset the computer's clock takes from `from` on: epoch seconds, and whole seconds east of UTC. */
export interface OffsetChange {
  from: number;
  offset: number;
}

/** Whether Cairn counted for a whole row, part of it, or none of it (the core's `seen`). */
export type SeenOf = 'whole' | 'part' | 'none';

/** One row of a range day by day: a date, or a week of dates when the range is long. */
export interface MovementRow {
  /** The row's first date, `YYYY-MM-DD`. */
  day: string;
  /** How many dates the row holds: 1 for a day, 7 for a week, fewer for a last short week. */
  days: number;
  /** `day` when the range holds 56 dates or fewer, `week` when it holds more. The screen reads it, never re-derives it. */
  span: 'day' | 'week';
  count: number;
  /** Whether Cairn was counting for the row. A `none` row is shown as not seen, never as a zero. */
  seen: SeenOf;
  /** True for the row holding the present, and any row after it. */
  so_far: boolean;
}

/**
 * A range of days, by site, by hour, by day of week and day by day. Only what Cairn can state
 * truthfully is here.
 */
export interface Patterns {
  /** Most first; equal counts by domain name. */
  by_site: SiteCount[];
  /** Exactly 24, hour 0 to 23 ascending, zeros included; empty only when `sealed`. */
  by_hour: HourCount[];
  /** Exactly 7, weekday 0 (Monday) to 6 (Sunday) ascending, zeros included; empty only when `sealed`. */
  by_weekday: WeekdayCount[];
  /** Oldest first, contiguous over the range; empty only when `sealed`. */
  movement: MovementRow[];
  /** Each cut to the part inside the range. */
  gaps: Gap[];
  /** The gaps in one sentence, about the range. */
  coverage_note: string | null;
  /** How many days in the range hold the person's own estimate, which has no site and no hour. */
  estimates_excluded: number;
  /**
   * Always false: every hour is counted by the offset in force at its instant, so none is
   * approximate. It is on the wire to say so. The screen does not read it.
   */
  dst_approximate: boolean;
  /** Present when the history could not be read, or the range was not one Cairn could place. */
  sealed: string | null;
}

/**
 * `firstDay` and `lastDay` are local dates (`YYYY-MM-DD`); `rangeStart` is the
 * local midnight that begins the first, `rangeEnd` the local midnight after the
 * last, in epoch seconds. `offsets` are the offsets the computer's clock has across
 * the range (`offsetChanges` in `localDays.ts`). Returns what the command returns: a
 * thrown error is the screen's to turn into a sentence of its own.
 */
export const summarizeReaches = (
  firstDay: string,
  lastDay: string,
  rangeStart: number,
  rangeEnd: number,
  offsets: OffsetChange[],
) =>
  invoke<Patterns>('summarize_reaches', {
    firstDay,
    lastDay,
    rangeStart,
    rangeEnd,
    offsets,
  });

/** The largest count among the sites, hours or days, never less than 1: what each bar is a share of. */
export const largestCount = <T extends { count: number }>(counts: T[]): number =>
  counts.reduce((largest, one) => Math.max(largest, one.count), 1);
