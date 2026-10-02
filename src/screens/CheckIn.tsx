/**
 * The check-in: today's reaches beside a space to write.
 *
 * Reached by navigation and no other way in this slice; the one quiet evening
 * notice arrives with `evening-notice`. The writing is the point, so the space
 * is offered whether today held reaches or none, and nothing here scores the
 * day, congratulates it, or calls it anything (FR-032).
 *
 * The day is fixed when the check-in opens. Left open across midnight, it stays
 * attached to the day it was opened for rather than becoming tomorrow's.
 *
 * So is the quote: one line from the set Cairn ships, asked for once when the
 * check-in opens and kept while it stays open (slice `quote`, Q1). None is a
 * complete check-in, with nothing in its place (FR-008). It is not about the
 * day, so it shows on a sealed check-in too. A quiet switch at the foot of the
 * check-in hides quotes, remembered across restarts (Q2); hidden, nothing
 * stands where the line was. When Cairn cannot tell whether they were hidden,
 * it shows neither the line nor the switch rather than guess.
 *
 * Nothing here leads to a change in protection (Principle I).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  getDayView,
  getQuote,
  getQuotesShown,
  saveJournalEntry,
  setQuotesShown,
  type DayView,
} from '../ipc/journal';
import { dayBounds, localToday } from '../localDays';
import { useNotebookPage } from '../shell/notebookPage';

/**
 * Text that shows nothing is empty (G4), here as in the store: the same
 * definition as `shows_nothing` in `src-tauri/src/domain/visible.rs`, and both
 * are tested against `src-tauri/tests/fixtures/nothing_visible.json`.
 *
 * Every character is White_Space (PropList.txt), a control (Cc), a
 * Default_Ignorable_Code_Point (DerivedCoreProperties.txt, Unicode 15) or one
 * of the blank-looking letters. Ranges are written out rather than taken from
 * `\p{...}` so the answer does not move with the browser's Unicode version.
 */
// The class holds combining and joining characters on purpose: they are what it names.
const NOTHING_VISIBLE = new RegExp(
  // eslint-disable-next-line no-misleading-character-class
  '^[' +
    // White_Space
    '\\u0009-\\u000D\\u0020\\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000' +
    // Cc: C0 and C1 controls, NUL included
    '\\u0000-\\u001F\\u007F-\\u009F' +
    // Default_Ignorable_Code_Point
    '\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180F\\u200B-\\u200F' +
    '\\u202A-\\u202E\\u2060-\\u206F\\u3164\\uFE00-\\uFE0F\\uFEFF\\uFFA0\\uFFF0-\\uFFF8' +
    '\\u{1BCA0}-\\u{1BCA3}\\u{1D173}-\\u{1D17A}\\u{E0000}-\\u{E0FFF}' +
    // Blank-looking letters: the braille blank (the Hangul fillers are above)
    '\\u2800' +
    ']*$',
  'u',
);

// The words, once: Current and the notebook page both read them.
const TONIGHT = 'Tonight';
const LOOKING = 'Looking…';
const HOW_THE_DAY_WENT = 'How the day went';
const KEEP_THIS = 'Keep this';
const HIDE_QUOTES = 'Hide quotes';
const SHOW_QUOTES = 'Show quotes';
const COULD_NOT_CHANGE =
  'Cairn could not change that just now. The quotes are as they were.';
const nothingHereFor = (thisDay: string) => `Nothing here for ${thisDay}.`;
const keptFor = (thisDay: string) => `Kept for ${thisDay}.`;

export function showsNothing(text: string): boolean {
  return NOTHING_VISIBLE.test(text);
}

export interface Today {
  day: string;
  start: number;
  end: number;
}

/** Today's local date and its two local midnights (a day can be 23 or 25 hours long). */
function today(): Today {
  const day = localToday(new Date());
  return { day, ...dayBounds(day) };
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "Wednesday 30 September": a date, in plain words, for a day that has ended (G5). */
function dateInWords(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const at = new Date(year, month - 1, date);
  return `${WEEKDAYS[at.getDay()]} ${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

/** What the check-in has in hand, kept by whoever holds the hook. */
export interface CheckInSession {
  /** The day this check-in is attached to. */
  opened: Today;
  /**
   * Choosing Tonight. Opens the current local day, unless the space holds
   * writing that has not been kept, which stays on the day it was written for.
   */
  open: () => void;
  /** What is in the space; undefined until the person types, so the saved entry shows. */
  draft: string | undefined;
  /** The core's sentence for a save that was not kept, shown beside the text. */
  note: string | undefined;
  kept: boolean;
  keeping: boolean;
  /**
   * The day's one line (Q1): asked for once per opened day and kept while the
   * person walks round the header. Undefined until asked; a line of `null` is
   * the answer "none to be had", also kept.
   */
  quote: { day: string; line: string | null } | undefined;
  /** Keeps the line asked for `day`; ignored once Tonight has opened another day. */
  holdQuote: (day: string, line: string | null) => void;
  type: (text: string) => void;
  keep: (when: Today, shown: string) => Promise<DayView | undefined>;
}

/**
 * The draft and the outcome of a save, held above the screen so that walking
 * round the header neither loses the text nor a refusal that arrived while
 * away (G1). Nothing here is shown anywhere but the check-in itself (FR-033).
 */
export function useCheckInSession(): CheckInSession {
  const [opened, setOpened] = useState(today);
  // Choosing Tonight reads the clock again, even where nothing else changes.
  const [, setLooked] = useState(0);
  const [draft, setDraft] = useState<string>();
  const [note, setNote] = useState<string>();
  const [kept, setKept] = useState(false);
  const [keeping, setKeeping] = useState(false);
  // The space as it is now, for a save that returns after more was typed.
  const latest = useRef<string>();
  latest.current = draft;
  const [quote, setQuote] = useState<{ day: string; line: string | null }>();
  // The day now open, for a line that arrives after Tonight opened another.
  const openDay = useRef(opened.day);
  openDay.current = opened.day;
  const holdQuote = useCallback((day: string, line: string | null) => {
    if (day === openDay.current) setQuote({ day, line });
  }, []);

  return {
    opened,
    open() {
      const unsaved =
        latest.current !== undefined && !kept && !showsNothing(latest.current);
      setLooked((n) => n + 1);
      const now = today();
      if (unsaved || now.day === opened.day) return;
      // A new day: nothing of the old one comes with it.
      setOpened(now);
      openDay.current = now.day;
      setQuote(undefined);
      setDraft(undefined);
      latest.current = undefined;
      setNote(undefined);
      setKept(false);
    },
    draft,
    note,
    kept,
    keeping,
    quote,
    holdQuote,
    type(text) {
      latest.current = text;
      setDraft(text);
      setKept(false);
    },
    async keep(when, shown) {
      const sent = latest.current ?? shown;
      setKeeping(true);
      setKept(false);
      setNote(undefined);
      try {
        const after = await saveJournalEntry(when.day, when.start, when.end, sent);
        // Whatever is in the space now stays. Only when it is still what was
        // sent does the screen say so; anything typed since is not yet kept,
        // and the screen makes no claim either way.
        if ((latest.current ?? shown) === sent) {
          setDraft(after.entry ?? sent);
          setKept(true);
        }
        return after;
      } catch (problem) {
        // What they typed stays exactly where it is (G1).
        setNote(String(problem));
        return undefined;
      } finally {
        setKeeping(false);
      }
    },
  };
}

export function CheckIn({ session }: { session?: CheckInSession }) {
  const onPage = useNotebookPage();
  const own = useCheckInSession();
  const {
    opened,
    draft: typed,
    note: saveNote,
    kept,
    keeping,
    quote: held,
    holdQuote,
    type,
    keep,
  } = session ?? own;
  const [view, setView] = useState<DayView>();
  const [loadNote, setLoadNote] = useState<string>();
  const [, tick] = useState(0);
  // Whether this day's line has been asked for, readable from the effects.
  const switching = useRef(false);
  const heldDay = useRef<string>();
  heldDay.current = held?.day;
  const quote = held?.day === opened.day ? held.line : null;
  // Why the quotes switch did not take, if it did not; said beside the save's own sentence.
  const [switchNote, setSwitchNote] = useState<string>();
  /** Unknown until the setting is read; then the person's choice. */
  const [quotesShown, setShown] = useState<boolean>();

  useEffect(() => {
    let current = true;
    setView(undefined);
    setLoadNote(undefined);
    getDayView(opened.day, opened.start, opened.end)
      .then((loaded) => current && setView(loaded))
      .catch((problem: unknown) => current && setLoadNote(String(problem)));
    return () => {
      current = false;
    };
  }, [opened]);

  // A note about the switch belongs to the day it was made on.
  useEffect(() => {
    setSwitchNote(undefined);
  }, [opened.day]);

  // When the day ends under an open check-in, the screen stops calling it today.
  useEffect(() => {
    const left = opened.end * 1000 - Date.now();
    if (left <= 0) return;
    const timer = setTimeout(() => {
      tick((n) => n + 1);
    }, left);
    return () => {
      clearTimeout(timer);
    };
  }, [opened]);

  // A date, not a judgement: once the day has ended it is named, not "today".
  const ended = Date.now() >= opened.end * 1000;
  const thisDay = ended ? dateInWords(opened.day) : 'today';

  // Everything the person should hear, together: a refusal of the switch does
  // not hide a refusal of the save, nor the other way round.
  const heard = [saveNote ?? loadNote, switchNote].filter((n) => n !== undefined);
  const note = heard.length > 0 ? heard.join(' ') : undefined;
  const draft = typed ?? view?.entry ?? '';

  useEffect(() => {
    // Asked once per opening: when the check-in opens, or when Tonight opens a
    // new day (G5). `stale` keeps a second run of this effect (React's
    // development double-run) from swapping the line under the person.
    let stale = false;
    const day = opened.day;
    getQuotesShown()
      .then((shown) => {
        if (!stale) setShown(shown);
        // The day's line is asked for once; coming back to it keeps it (Q1).
        if (!shown || heldDay.current === day) return undefined;
        return getQuote(day).then((line) => {
          if (!stale) holdQuote(day, line);
        });
      })
      // A line that cannot be had is no line: nothing to report, nothing in its place.
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [opened.day, holdQuote]);

  async function switchQuotes(shown: boolean) {
    // One request at a time: a second press while the first is out is not asked.
    if (switching.current) return;
    switching.current = true;
    setSwitchNote(undefined);
    let now: boolean;
    try {
      now = await setQuotesShown(shown);
    } catch (problem) {
      // The line stays as it was, and the person hears why.
      setSwitchNote(
        typeof problem === 'string'
          ? problem
          : COULD_NOT_CHANGE,
      );
      return;
    } finally {
      switching.current = false;
    }
    setShown(now);
    // Shown again in the same opening, it is the same line (Q1). Opened hidden,
    // this is the one time a line is asked for; none to be had is none shown.
    if (now && heldDay.current !== opened.day) {
      holdQuote(opened.day, await getQuote(opened.day).catch(() => null));
    }
  }

  const quoteSwitch =
    quotesShown === undefined ? null : (
      <div className="mt-10">
        <Button tone="quiet" className="px-0" onClick={() => switchQuotes(!quotesShown)}>
          {quotesShown ? HIDE_QUOTES : SHOW_QUOTES}
        </Button>
      </div>
    );

  const line =
    quotesShown && quote ? (
      <figure className="mt-6">
        <p className="reflective max-w-prose text-lg italic text-ink-500">{quote}</p>
      </figure>
    ) : null;

  if (!view && onPage) {
    return (
      <div className="nb-spread nb-checkin-leaves">
        <div className="nb-page">
          <p className="nb-checkin-sentence">{loadNote ?? LOOKING}</p>
        </div>
        <div className="nb-page nb-page--ruled" />
      </div>
    );
  }

  if (!view) {
    return (
      <Card>
        <p className="text-ink-400">{loadNote ?? LOOKING}</p>
      </Card>
    );
  }

  if (view.sealed) {
    return (
      <Card>
        <h2 className="reflective text-3xl text-ink-900">
          {ended ? thisDay : TONIGHT}
        </h2>
        {line}
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">{view.sealed}</p>
        {quoteSwitch}
        <p
          role="status"
          aria-live="polite"
          className="reflective mt-4 max-w-prose text-ink-700"
        >
          {note ?? ''}
        </p>
      </Card>
    );
  }

  if (onPage) {
    return (
      <div className="nb-spread nb-checkin-leaves">
        <div className="nb-page">
          <h2 className="nb-checkin-title">{ended ? thisDay : TONIGHT}</h2>
          {view.reaches.length === 0 ? (
            <p className="nb-checkin-empty">{nothingHereFor(thisDay)}</p>
          ) : (
            <ul className="nb-checkin-log">
              {view.reaches.map((reach, index) => (
                <li
                  key={`${reach.domain}-${reach.at}-${index}`}
                  className="nb-checkin-line"
                >
                  <span className="nb-checkin-site">{reach.domain}</span>
                  <span className="nb-checkin-time">{timeOfDay(reach.at)}</span>
                </li>
              ))}
            </ul>
          )}
          {view.coverage_note && <p className="nb-checkin-note">{view.coverage_note}</p>}
        </div>
        <div className="nb-page nb-page--ruled">
          <label className="nb-checkin-label">
            <span className="nb-checkin-label__text">{HOW_THE_DAY_WENT}</span>
            <textarea
              className="nb-checkin-write"
              value={draft}
              onChange={(event) => {
                type(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className="nb-checkin-keep"
            onClick={() => keep(opened, draft).then((after) => after && setView(after))}
            disabled={keeping || showsNothing(draft)}
          >
            {KEEP_THIS}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <h2 className="reflective text-3xl text-ink-900">{ended ? thisDay : TONIGHT}</h2>
      {line}

      {view.reaches.length === 0 ? (
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">
          {nothingHereFor(thisDay)}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-sand-200">
          {view.reaches.map((reach, index) => (
            <li
              key={`${reach.domain}-${reach.at}-${index}`}
              className="flex items-baseline justify-between py-3"
            >
              <span className="text-ink-900">{reach.domain}</span>
              <span className="text-sm text-ink-400">{timeOfDay(reach.at)}</span>
            </li>
          ))}
        </ul>
      )}

      {view.coverage_note && (
        <p className="reflective mt-6 text-ink-500">{view.coverage_note}</p>
      )}

      <label className="mt-10 block">
        <span className="reflective text-xl text-ink-700">{HOW_THE_DAY_WENT}</span>
        <textarea
          className="reflective mt-3 block min-h-48 w-full rounded-lg border border-sand-200 bg-sand-50 p-4 text-lg leading-relaxed text-ink-900 focus:border-clay-500 focus:outline-none"
          value={draft}
          onChange={(event) => {
            type(event.target.value);
          }}
        />
      </label>

      <div className="mt-4 flex items-center gap-4">
        <Button
          onClick={() => keep(opened, draft).then((after) => after && setView(after))}
          disabled={keeping || showsNothing(draft)}
        >
          {KEEP_THIS}
        </Button>
      </div>

      {/* One polite live region for what happened to the save, so a person
          who cannot see the page hears it too: a refusal heard by nobody is
          the lost entry G1 exists to prevent. */}
      <p
        role="status"
        aria-live="polite"
        className="reflective mt-4 max-w-prose text-ink-700"
      >
        {note ?? (kept ? keptFor(thisDay) : '')}
      </p>

      {quoteSwitch}
    </Card>
  );
}

function timeOfDay(seconds: number): string {
  return new Date(seconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
