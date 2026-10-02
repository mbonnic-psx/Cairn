/**
 * Today's reaches, and a range of days by site.
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

/**
 * A range of days, by site. Only what Cairn can state truthfully is here:
 * by hour, by day of week and movement join it when a slice computes them.
 */
export interface Patterns {
  /** Most first; equal counts by domain name. */
  by_site: SiteCount[];
  /** Each cut to the part inside the range. */
  gaps: Gap[];
  /** The gaps in one sentence, about the range. */
  coverage_note: string | null;
  /** How many days in the range hold the person's own estimate, which has no site. */
  estimates_excluded: number;
  /** Present when the history could not be read, or the range was not one Cairn could place. */
  sealed: string | null;
}

/**
 * `firstDay` and `lastDay` are local dates (`YYYY-MM-DD`); `rangeStart` is the
 * local midnight that begins the first, `rangeEnd` the local midnight after the
 * last, in epoch seconds. Returns what the command returns: a thrown error is
 * the screen's to turn into a sentence of its own.
 */
export const summarizeReaches = (
  firstDay: string,
  lastDay: string,
  rangeStart: number,
  rangeEnd: number,
) =>
  invoke<Patterns>('summarize_reaches', {
    firstDay,
    lastDay,
    rangeStart,
    rangeEnd,
  });

/** The largest count among the sites, never less than 1: what each bar is a share of. */
export const largestCount = (sites: SiteCount[]): number =>
  sites.reduce((largest, site) => Math.max(largest, site.count), 1);
