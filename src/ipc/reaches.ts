/**
 * Today's reaches.
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
