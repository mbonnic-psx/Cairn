/**
 * One day, whole, and what the person wrote for it.
 *
 * In a file of its own so the restriction can be stated where it is enforced:
 * **only the check-in and the single-day screen may import this** (FR-033). An
 * ESLint rule refuses the import anywhere else. What someone wrote is theirs to
 * go and find, never something put in front of them unasked.
 *
 * The wrapper is `getDayView`, not `getDay`: `getDay` is a `Date` method, and a
 * guard that cannot tell the two apart would cry wolf on every date calculation
 * (`contracts/ui-ipc.md`).
 */
import { invoke } from '@tauri-apps/api/core';

import type { Gap, Reach } from './reaches';

export interface DayView {
  reaches: Reach[];
  gaps: Gap[];
  /** Shown beside the reaches when part of the day was not observed. */
  coverage_note: string | null;
  /** What the person wrote for this day, if anything. */
  entry: string | null;
  /** The person's own estimate for a silent day. */
  estimate: number | null;
  /** Present when the history could not be opened. Then nothing else is, and no space is offered. */
  sealed: string | null;
  /**
   * The moment Cairn first counted, in epoch seconds; `null` when it never has. A reader treats an answer
   * without the key as not yet known (an answer from before this field).
   */
  first_counted?: number | null;
}

/** `day` is the local date as YYYY-MM-DD; the bounds are its local midnights, in epoch seconds. */
export const getDayView = (day: string, dayStart: number, dayEnd: number) =>
  invoke<DayView>('get_day', { day, dayStart, dayEnd });

/** Rejects with a plain sentence when the entry could not be kept. Nothing is stored then. */
export const saveJournalEntry = (day: string, dayStart: number, dayEnd: number, text: string) =>
  invoke<DayView>('save_journal_entry', { day, dayStart, dayEnd, text });

/**
 * A line for the check-in of `day` (YYYY-MM-DD), or null — a complete answer
 * (FR-008). The same line comes back for the same day, across restarts.
 */
export const getQuote = (day: string) => invoke<string | null>('get_quote', { day });

/** Whether the person wants quotes on the check-in. */
export const getQuotesShown = () => invoke<boolean>('get_quotes_shown');

/** The quiet switch on the check-in. Resolves with the setting as it now stands. */
export const setQuotesShown = (shown: boolean) => invoke<boolean>('set_quotes_shown', { shown });
