/**
 * Every state the Today screen (`Reaches`, both views) and Tonight (`CheckIn`) can show, as the data that
 * produces it (slice 004 `tonight-page`). The pin renders each outside any shell; the page tests render each
 * on a notebook page and compare the words.
 *
 * No `Date` is made when this file loads: the tests fix the zone (`Europe/London`) first, and a date made
 * before that would be made in the runner's zone. Reach times are instants in epoch seconds.
 */
import type { DayView } from '../../ipc/journal';
import type { Patterns, Reach, TodaysReaches } from '../../ipc/reaches';
import type { ReachesReader } from '../Reaches';
import { never, type Answer } from './fakeCore';

/** Wednesday 30 September 2026, 20:00 in London: the moment both screens are opened at. */
export const evening = () => new Date(2026, 8, 30, 20, 0);
/** Ten minutes before that day ends, for a Tonight left open across midnight. */
export const lateEvening = () => new Date(2026, 8, 30, 23, 50);

/** Three reaches on 30 September 2026, in the core's order (09:15, 13:40 and 19:05 in London). */
export const reachesOfTheDay: Reach[] = [
  { domain: 'news.example', at: 1_790_756_100 },
  { domain: 'video.example', at: 1_790_772_000 },
  { domain: 'news.example', at: 1_790_791_500 },
];

export const dayCoverageNote =
  'Cairn was not running for 2 hours today, so this may not be everything.';
export const rangeCoverageNote =
  'Cairn was not running for 3 days in this range, so this may not be everything.';
export const sealedSentence =
  'Cairn cannot open your history just now. Protection is unaffected, and nothing has been lost.';

// ---------------------------------------------------------------------------
// Today, the Today view: the `today` prop. `undefined` is looking (the reader never answers).

export const todayCases: Record<string, TodaysReaches | undefined> = {
  looking: undefined,
  'a log, the fallback note': {
    reaches: reachesOfTheDay,
    gaps: [],
    coverage_note: null,
    sealed: null,
  },
  'a log, a coverage note': {
    reaches: reachesOfTheDay,
    gaps: [],
    coverage_note: dayCoverageNote,
    sealed: null,
  },
  'nothing yet, the fallback note': { reaches: [], gaps: [], coverage_note: null, sealed: null },
  'nothing yet, a coverage note': {
    reaches: [],
    gaps: [],
    coverage_note: dayCoverageNote,
    sealed: null,
  },
  sealed: { reaches: [], gaps: [], coverage_note: null, sealed: sealedSentence },
};

// ---------------------------------------------------------------------------
// Today, the Over time view: what the reader answers for the default range (3 to 30 September 2026).

export type OverTimeAnswer = Patterns | 'looking' | 'unreadable';

const sites = [
  { domain: 'news.example', count: 9 },
  { domain: 'video.example', count: 4 },
  { domain: 'shop.example', count: 1 },
];

const range = (over: Partial<Patterns>): Patterns => ({
  by_site: sites,
  gaps: [],
  coverage_note: null,
  estimates_excluded: 0,
  sealed: null,
  ...over,
});

export const overTimeCases: Record<string, OverTimeAnswer> = {
  looking: 'looking',
  'could not read': 'unreadable',
  sealed: range({ by_site: [], sealed: sealedSentence }),
  'a list': range({}),
  'a list, a coverage note': range({ coverage_note: rangeCoverageNote }),
  'a list, one estimate': range({ estimates_excluded: 1 }),
  'a list, a coverage note and several estimates': range({
    coverage_note: rangeCoverageNote,
    estimates_excluded: 3,
  }),
  'nothing here': range({ by_site: [] }),
  'nothing here, a coverage note and several estimates': range({
    by_site: [],
    coverage_note: rangeCoverageNote,
    estimates_excluded: 2,
  }),
};

/** A reader answering `answer` for every range; Today's day is never answered (it is not looked at). */
export function overTimeReader(answer: OverTimeAnswer): ReachesReader {
  return {
    listTodaysReaches: never,
    summarizeReaches: () => {
      if (answer === 'looking') return never();
      if (answer === 'unreadable') return Promise.reject(new Error('no history'));
      return Promise.resolve(answer);
    },
  };
}

/** A reader that never answers: Today looking, when no `today` is passed. */
export const silentReader: ReachesReader = { listTodaysReaches: never, summarizeReaches: never };

// ---------------------------------------------------------------------------
// Tonight: what the core answers, and what the person does once the check-in has loaded.

export interface TonightCase {
  /** `get_day`: a day, a sentence the core refuses with, or no answer yet. */
  day: DayView | { refused: string } | 'looking';
  /** `get_quotes_shown`: the setting, or `'unknown'` when it cannot be read. */
  quotesShown: boolean | 'unknown';
  /** `get_quote`: the day's line, or none to be had. */
  quote: string | null;
  /** Typed into the space, then Keep this pressed; `save_journal_entry` answers `saved`. */
  keep?: { typed: string; saved: DayView | { refused: string } };
  /** The quotes switch pressed, and `set_quotes_shown` refusing with this sentence. */
  switchRefused?: string;
  /** Opened at `lateEvening`, then the clock moved past midnight with the check-in still open. */
  endsWhileOpen?: true;
}

const openDay = (over: Partial<DayView> = {}): DayView => ({
  reaches: reachesOfTheDay,
  gaps: [],
  coverage_note: null,
  entry: null,
  estimate: null,
  sealed: null,
  ...over,
});

export const quoteLine = 'The path is made by walking.';
export const loadRefusal = 'Cairn could not open today just now. Protection is unaffected.';
export const saveRefusal = 'The entry was not kept. What you wrote is still here.';
export const switchRefusal = 'Cairn could not keep that choice.';

export const tonightCases: Record<string, TonightCase> = {
  looking: { day: 'looking', quotesShown: false, quote: null },
  'a load that could not be made': {
    day: { refused: loadRefusal },
    quotesShown: false,
    quote: null,
  },
  'reaches, no coverage note, quotes hidden': {
    day: openDay(),
    quotesShown: false,
    quote: null,
  },
  'no reaches, no coverage note, quotes hidden': {
    day: openDay({ reaches: [] }),
    quotesShown: false,
    quote: null,
  },
  'reaches, a coverage note, quotes hidden': {
    day: openDay({ coverage_note: dayCoverageNote }),
    quotesShown: false,
    quote: null,
  },
  'no reaches, a coverage note, quotes hidden': {
    day: openDay({ reaches: [], coverage_note: dayCoverageNote }),
    quotesShown: false,
    quote: null,
  },
  'reaches, with a quote': { day: openDay(), quotesShown: true, quote: quoteLine },
  'reaches, quotes shown and none to be had': { day: openDay(), quotesShown: true, quote: null },
  'reaches, the quotes setting unknown': { day: openDay(), quotesShown: 'unknown', quote: quoteLine },
  'an entry written before': {
    day: openDay({ entry: 'A slow morning, a better afternoon.' }),
    quotesShown: false,
    quote: null,
  },
  'an entry kept': {
    day: openDay(),
    quotesShown: false,
    quote: null,
    keep: { typed: 'Back on the trail.', saved: openDay({ entry: 'Back on the trail.' }) },
  },
  'a refused save': {
    day: openDay(),
    quotesShown: false,
    quote: null,
    keep: { typed: 'Back on the trail.', saved: { refused: saveRefusal } },
  },
  'a refused switch': {
    day: openDay(),
    quotesShown: true,
    quote: quoteLine,
    switchRefused: switchRefusal,
  },
  'sealed, quotes hidden': {
    day: openDay({ reaches: [], sealed: sealedSentence }),
    quotesShown: false,
    quote: null,
  },
  'sealed, with a quote': {
    day: openDay({ reaches: [], sealed: sealedSentence }),
    quotesShown: true,
    quote: quoteLine,
  },
  'a day that ended while open': {
    day: openDay({ reaches: [] }),
    quotesShown: false,
    quote: null,
    endsWhileOpen: true,
  },
};

const refusing = (sentence: string): Answer => () => {
  throw sentence;
};

/** The core's answers for a case, for `installFakeCore`. */
export function tonightCore(c: TonightCase): Record<string, Answer> {
  return {
    get_day:
      c.day === 'looking' ? never : 'refused' in c.day ? refusing(c.day.refused) : () => c.day,
    get_quotes_shown:
      c.quotesShown === 'unknown' ? refusing('Cairn could not read that just now.') : () => c.quotesShown,
    get_quote: () => c.quote,
    save_journal_entry: !c.keep
      ? never
      : 'refused' in c.keep.saved
        ? refusing(c.keep.saved.refused)
        : () => c.keep!.saved,
    set_quotes_shown: c.switchRefused ? refusing(c.switchRefused) : (args) => args.shown,
  };
}
