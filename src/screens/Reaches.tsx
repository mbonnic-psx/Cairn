/**
 * What you reached for today.
 *
 * Reached here on purpose and no other way. Nothing brings someone to this
 * screen — no prompt, no hint, no highlight suggesting there is something new
 * to look at (FR-030a, FR-030b).
 *
 * The tone is the whole design. A reach is information, not a failure: no
 * congratulation for a short list, no shame for a long one, no comparison with
 * yesterday, no total to beat. Just what happened, and what Cairn did not see.
 */
import { useEffect, useState, type ReactNode } from 'react';

import { Card } from '../components/Card';
import { useNotebookPage } from '../shell/notebookPage';
import {
  addDays,
  dayBounds,
  hourInWords,
  isLocalDate,
  localToday,
  offsetChanges,
  rangeBounds,
  rangeInWords,
} from '../localDays';
import {
  largestCount,
  listTodaysReaches,
  summarizeReaches,
  type OffsetChange,
  type Patterns,
  type TodaysReaches,
} from '../ipc/reaches';

/** What the screen reads from. A test passes its own; the screen defaults to the real wrappers. */
export interface ReachesReader {
  listTodaysReaches: (dayStart: number, dayEnd: number) => Promise<TodaysReaches>;
  summarizeReaches: (
    firstDay: string,
    lastDay: string,
    rangeStart: number,
    rangeEnd: number,
    offsets: OffsetChange[],
  ) => Promise<Patterns>;
}

// Wrappers, not references: the real functions are looked up when called, not when the screen loads.
const realReader: ReachesReader = {
  listTodaysReaches: (dayStart, dayEnd) => listTodaysReaches(dayStart, dayEnd),
  summarizeReaches: (firstDay, lastDay, rangeStart, rangeEnd, offsets) =>
    summarizeReaches(firstDay, lastDay, rangeStart, rangeEnd, offsets),
};
const realNow = () => new Date();

// The words, once: Current and the notebook page both read them.
const WHICH_DAYS = 'Which days';
const TODAY = 'Today';
const OVER_TIME = 'Over time';
const LOOKING = 'Looking…';
const NOTHING_TODAY = 'Nothing here for today.';
const NOTHING_THESE_DAYS = 'Nothing here for these days.';
const COUNTED_ONLY_TODAY =
  'Cairn counts only while it is running. This is what it saw today.';
const COUNTED_ONLY_WHILE_RUNNING =
  'Cairn counts only while it is running. This is what it saw over these days.';
const COULD_NOT_READ =
  'Cairn could not read your history just now. Protection is unaffected.';
const SEEN_BY = 'Seen by';
const BY_SITE = 'By site';
const BY_HOUR = 'By hour';
/** What an estimate has none of, in the view it is left out of. */
const estimatesSentence = (days: number, view: Seen) =>
  days === 1
    ? `Your own estimate for 1 day is not counted here, because an estimate has no ${view}.`
    : `Your own estimates for ${days} days are not counted here, because an estimate has no ${view}.`;

/** The two ways to see a range: by the sites reached, or by the hours of the day. */
type Seen = 'site' | 'hour';

/** One line of a range's list: a site or an hour, with its count. */
interface Row {
  key: string;
  name: string;
  count: number;
}

/** The lines of the range in the view chosen: sites most first, or all 24 hours from midnight. */
const rowsOf = (answer: Patterns, seen: Seen): Row[] =>
  seen === 'site'
    ? answer.by_site.map((site) => ({
        key: site.domain,
        name: site.domain,
        count: site.count,
      }))
    : answer.by_hour.map((one) => ({
        key: String(one.hour),
        name: hourInWords(one.hour),
        count: one.count,
      }));

/** Whether the view has nothing to count: no sites, or no reach in any hour. */
const isQuiet = (rows: Row[]) => rows.every((row) => row.count === 0);

/** Where a view sits: today's card, or the two pages of a spread (the right one ruled and empty for now). */
function Frame({ onPage, children }: { onPage: boolean; children: ReactNode }) {
  if (!onPage) return <Card>{children}</Card>;
  return (
    <>
      <div className="nb-page">{children}</div>
      <div className="nb-page nb-page--ruled" />
    </>
  );
}

export function Reaches({
  today,
  read = realReader,
  now = realNow,
}: {
  today?: TodaysReaches;
  read?: ReachesReader;
  now?: () => Date;
}) {
  const onPage = useNotebookPage();
  const [view, setView] = useState<'today' | 'over-time'>('today');

  const which = (
    <div
      className={onPage ? 'nb-reaches-which' : 'mb-4 flex gap-2'}
      role="group"
      aria-label={WHICH_DAYS}
    >
      <ViewButton
        onPage={onPage}
        current={view === 'today'}
        onClick={() => setView('today')}
      >
        {TODAY}
      </ViewButton>
      <ViewButton
        onPage={onPage}
        current={view === 'over-time'}
        onClick={() => setView('over-time')}
      >
        {OVER_TIME}
      </ViewButton>
    </div>
  );
  const shown =
    view === 'today' ? (
      <TodayView onPage={onPage} today={today} read={read} now={now} />
    ) : (
      <OverTimeView onPage={onPage} read={read} now={now} />
    );

  // On a page the group is the spread's first child and the view a fragment of its two pages, so a change of
  // view keeps the button just pressed, and focus with it.
  if (onPage) {
    return (
      <div className="nb-spread nb-reaches-leaves">
        {which}
        {shown}
      </div>
    );
  }
  return (
    <div>
      {which}
      {shown}
    </div>
  );
}

function ViewButton({
  onPage,
  current,
  onClick,
  children,
}: {
  onPage: boolean;
  current: boolean;
  onClick: () => void;
  children: string;
}) {
  const className = onPage
    ? 'nb-reaches-which__button'
    : `rounded-full px-4 py-1.5 text-sm ${
        current ? 'bg-sand-200 text-ink-900' : 'text-ink-500 hover:bg-sand-100'
      }`;
  return (
    <button type="button" aria-pressed={current} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function TodayView({
  onPage,
  today,
  read,
  now,
}: {
  onPage: boolean;
  today?: TodaysReaches;
  read: ReachesReader;
  now: () => Date;
}) {
  const [day, setDay] = useState<TodaysReaches | undefined>(today);

  useEffect(() => {
    if (today) return;
    const { start, end } = dayBounds(localToday(now()));
    read
      .listTodaysReaches(start, end)
      .then(setDay)
      .catch(() => undefined);
    // The reader and the clock are fixed for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  if (!day) {
    return (
      <Frame onPage={onPage}>
        <p className={onPage ? 'nb-reaches-sentence' : 'text-ink-400'}>{LOOKING}</p>
      </Frame>
    );
  }

  if (day.sealed) {
    return (
      <Frame onPage={onPage}>
        <h2 className={onPage ? 'nb-reaches-title' : 'reflective text-3xl text-ink-900'}>
          {TODAY}
        </h2>
        <p
          className={
            onPage
              ? 'nb-reaches-sentence'
              : 'reflective mt-4 max-w-prose text-lg text-ink-700'
          }
        >
          {day.sealed}
        </p>
      </Frame>
    );
  }

  if (onPage) {
    return (
      <>
        <div className="nb-page">
          <h2 className="nb-reaches-title">{TODAY}</h2>
          <p className="nb-reaches-note">{day.coverage_note ?? COUNTED_ONLY_TODAY}</p>
        </div>
        <div className="nb-page nb-page--ruled">
          {day.reaches.length === 0 ? (
            <p className="nb-reaches-empty">{NOTHING_TODAY}</p>
          ) : (
            <ul className="nb-reaches-log">
              {day.reaches.map((reach, index) => (
                <li
                  key={`${reach.domain}-${reach.at}-${index}`}
                  className="nb-reaches-line"
                >
                  <span className="nb-reaches-site">{reach.domain}</span>
                  <span className="nb-reaches-time">{timeOfDay(reach.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  return (
    <Frame onPage={false}>
      <h2 className="reflective text-3xl text-ink-900">{TODAY}</h2>

      {day.reaches.length === 0 ? (
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">
          {NOTHING_TODAY}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-sand-200">
          {day.reaches.map((reach, index) => (
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

      <p className="reflective mt-8 border-t border-sand-200 pt-6 text-ink-500">
        {day.coverage_note ?? COUNTED_ONLY_TODAY}
      </p>
    </Frame>
  );
}

/** What the view holds: the answer for a range, nothing yet, or one sentence for a read that threw. */
type Answer = Patterns | 'looking' | 'unreadable';

function OverTimeView({
  onPage,
  read,
  now,
}: {
  onPage: boolean;
  read: ReachesReader;
  now: () => Date;
}) {
  // The range is component state and nothing more: leaving the view forgets it (H2).
  const todayDay = localToday(now());
  const [firstDay, setFirstDay] = useState(() => addDays(todayDay, -27));
  const [lastDay, setLastDay] = useState(todayDay);
  const [answer, setAnswer] = useState<Answer>('looking');
  // Which breakdown of the one answer: forgotten with the range on leaving the view.
  const [seen, setSeen] = useState<Seen>('site');

  useEffect(() => {
    let current = true;
    const { start, end } = rangeBounds(firstDay, lastDay);
    setAnswer('looking');
    read
      .summarizeReaches(firstDay, lastDay, start, end, offsetChanges(firstDay, lastDay))
      .then((patterns) => current && setAnswer(patterns))
      .catch(() => current && setAnswer('unreadable'));
    return () => {
      current = false;
    };
    // The reader is fixed for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDay, lastDay]);

  const changeFirst = (value: string) => {
    if (isLocalDate(value) && value <= lastDay) setFirstDay(value);
  };
  const changeLast = (value: string) => {
    if (isLocalDate(value) && value >= firstDay && value <= todayDay) setLastDay(value);
  };

  const boxes = (
    <DateBoxes
      onPage={onPage}
      firstDay={firstDay}
      lastDay={lastDay}
      todayDay={todayDay}
      onFirst={changeFirst}
      onLast={changeLast}
    />
  );

  const choice = <SeenByChoice onPage={onPage} seen={seen} onChoose={setSeen} />;

  if (onPage) {
    const sentence =
      answer === 'looking'
        ? LOOKING
        : answer === 'unreadable'
          ? COULD_NOT_READ
          : answer.sealed;
    // The answer to draw as a list: none while looking, unreadable or sealed.
    const list = typeof answer === 'string' || answer.sealed ? null : answer;
    const rows = list ? rowsOf(list, seen) : [];
    const largest = largestCount(rows);
    return (
      <>
        <div className="nb-page">
          <h2 className="nb-reaches-title">{rangeInWords(firstDay, lastDay)}</h2>
          {boxes}
          {choice}
          {!list ? (
            <p className="nb-reaches-sentence">{sentence}</p>
          ) : (
            <>
              {list.coverage_note && (
                <p className="nb-reaches-aside">{list.coverage_note}</p>
              )}
              {list.estimates_excluded > 0 && (
                <p className="nb-reaches-aside">
                  {estimatesSentence(list.estimates_excluded, seen)}
                </p>
              )}
              <p className="nb-reaches-note">{COUNTED_ONLY_WHILE_RUNNING}</p>
            </>
          )}
        </div>
        <div className="nb-page nb-page--ruled">
          {!list ? null : (
            <>
              {isQuiet(rows) && <p className="nb-reaches-empty">{NOTHING_THESE_DAYS}</p>}
              {rows.length > 0 && (seen === 'hour' || !isQuiet(rows)) && (
                <ul className="nb-reaches-log">
                  {rows.map((row) => (
                    <li key={row.key} className="nb-reaches-line">
                      <span className="nb-reaches-site">{row.name}</span>
                      <div aria-hidden="true" className="nb-reaches-bar">
                        <div
                          data-testid="bar"
                          className="nb-reaches-bar__fill"
                          style={{ width: `${Math.round((row.count / largest) * 100)}%` }}
                        />
                      </div>
                      <span className="nb-reaches-count">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <Frame onPage={false}>
      <h2 className="reflective text-3xl text-ink-900">
        {rangeInWords(firstDay, lastDay)}
      </h2>

      {boxes}

      {choice}

      <RangeBody answer={answer} seen={seen} />
    </Frame>
  );
}

/** By site | By hour, under the date boxes in every state, so it never moves when an answer arrives. */
function SeenByChoice({
  onPage,
  seen,
  onChoose,
}: {
  onPage: boolean;
  seen: Seen;
  onChoose: (seen: Seen) => void;
}) {
  return (
    <div
      className={onPage ? 'nb-reaches-seen' : 'mt-4 flex gap-2'}
      role="group"
      aria-label={SEEN_BY}
    >
      <ViewButton
        onPage={onPage}
        current={seen === 'site'}
        onClick={() => onChoose('site')}
      >
        {BY_SITE}
      </ViewButton>
      <ViewButton
        onPage={onPage}
        current={seen === 'hour'}
        onClick={() => onChoose('hour')}
      >
        {BY_HOUR}
      </ViewButton>
    </div>
  );
}

/** From and To: the one set of rules (`min`, `max`, what a change does) for Current and the page. */
function DateBoxes({
  onPage,
  firstDay,
  lastDay,
  todayDay,
  onFirst,
  onLast,
}: {
  onPage: boolean;
  firstDay: string;
  lastDay: string;
  todayDay: string;
  onFirst: (value: string) => void;
  onLast: (value: string) => void;
}) {
  const wrap = onPage
    ? 'nb-reaches-range'
    : 'mt-6 flex flex-wrap gap-6 text-sm text-ink-500';
  const field = onPage ? 'nb-reaches-field' : 'flex items-center gap-2';
  const box = onPage
    ? 'nb-reaches-date'
    : 'rounded-lg border border-sand-300 bg-white/70 px-2 py-1 text-ink-700';
  return (
    <div className={wrap}>
      <label className={field}>
        From
        <input
          type="date"
          value={firstDay}
          max={lastDay}
          onChange={(event) => onFirst(event.target.value)}
          className={box}
        />
      </label>
      <label className={field}>
        To
        <input
          type="date"
          value={lastDay}
          min={firstDay}
          max={todayDay}
          onChange={(event) => onLast(event.target.value)}
          className={box}
        />
      </label>
    </div>
  );
}

function RangeBody({ answer, seen }: { answer: Answer; seen: Seen }) {
  if (answer === 'looking') {
    return <p className="mt-8 text-ink-400">{LOOKING}</p>;
  }
  if (answer === 'unreadable') {
    return (
      <p className="reflective mt-8 max-w-prose text-lg text-ink-700">{COULD_NOT_READ}</p>
    );
  }
  if (answer.sealed) {
    return (
      <p className="reflective mt-8 max-w-prose text-lg text-ink-700">{answer.sealed}</p>
    );
  }

  const rows = rowsOf(answer, seen);
  const largest = largestCount(rows);

  return (
    <>
      {answer.coverage_note && (
        <p className="reflective mt-8 max-w-prose text-ink-500">{answer.coverage_note}</p>
      )}
      {answer.estimates_excluded > 0 && (
        <p className="reflective mt-4 max-w-prose text-ink-500">
          {estimatesSentence(answer.estimates_excluded, seen)}
        </p>
      )}

      {isQuiet(rows) && (
        <p className="reflective mt-8 max-w-prose text-lg text-ink-700">
          {NOTHING_THESE_DAYS}
        </p>
      )}
      {rows.length > 0 && (seen === 'hour' || !isQuiet(rows)) && (
        <ul className="mt-8 divide-y divide-sand-200">
          {rows.map((row) => (
            <li key={row.key} className="py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-900">{row.name}</span>
                <span className="text-sm text-ink-500">{row.count}</span>
              </div>
              <div aria-hidden="true" className="mt-2 h-1.5 rounded-full bg-sand-100">
                <div
                  data-testid="bar"
                  className="h-1.5 rounded-full bg-moss-500"
                  style={{ width: `${Math.round((row.count / largest) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="reflective mt-8 border-t border-sand-200 pt-6 text-ink-500">
        {COUNTED_ONLY_WHILE_RUNNING}
      </p>
    </>
  );
}

function timeOfDay(seconds: number): string {
  return new Date(seconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
