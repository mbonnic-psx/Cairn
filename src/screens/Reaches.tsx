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
  isLocalDate,
  localToday,
  rangeBounds,
  rangeInWords,
} from '../localDays';
import {
  largestCount,
  listTodaysReaches,
  summarizeReaches,
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
  ) => Promise<Patterns>;
}

// Wrappers, not references: the real functions are looked up when called, not when the screen loads.
const realReader: ReachesReader = {
  listTodaysReaches: (dayStart, dayEnd) => listTodaysReaches(dayStart, dayEnd),
  summarizeReaches: (firstDay, lastDay, rangeStart, rangeEnd) =>
    summarizeReaches(firstDay, lastDay, rangeStart, rangeEnd),
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
const ESTIMATE_ONE =
  'Your own estimate for 1 day is not counted here, because an estimate has no site.';
const estimatesMany = (days: number) =>
  `Your own estimates for ${days} days are not counted here, because an estimate has no site.`;

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
        <p className="text-ink-400">{LOOKING}</p>
      </Frame>
    );
  }

  if (day.sealed) {
    return (
      <Frame onPage={onPage}>
        <h2 className="reflective text-3xl text-ink-900">{TODAY}</h2>
        <p className="reflective mt-4 max-w-prose text-lg text-ink-700">{day.sealed}</p>
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

  useEffect(() => {
    let current = true;
    const { start, end } = rangeBounds(firstDay, lastDay);
    setAnswer('looking');
    read
      .summarizeReaches(firstDay, lastDay, start, end)
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

  return (
    <Frame onPage={onPage}>
      <h2 className="reflective text-3xl text-ink-900">
        {rangeInWords(firstDay, lastDay)}
      </h2>

      <div className="mt-6 flex flex-wrap gap-6 text-sm text-ink-500">
        <label className="flex items-center gap-2">
          From
          <input
            type="date"
            value={firstDay}
            max={lastDay}
            onChange={(event) => changeFirst(event.target.value)}
            className="rounded-lg border border-sand-300 bg-white/70 px-2 py-1 text-ink-700"
          />
        </label>
        <label className="flex items-center gap-2">
          To
          <input
            type="date"
            value={lastDay}
            min={firstDay}
            max={todayDay}
            onChange={(event) => changeLast(event.target.value)}
            className="rounded-lg border border-sand-300 bg-white/70 px-2 py-1 text-ink-700"
          />
        </label>
      </div>

      <RangeBody answer={answer} />
    </Frame>
  );
}

function RangeBody({ answer }: { answer: Answer }) {
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

  const largest = largestCount(answer.by_site);

  return (
    <>
      {answer.coverage_note && (
        <p className="reflective mt-8 max-w-prose text-ink-500">{answer.coverage_note}</p>
      )}
      {answer.estimates_excluded > 0 && (
        <p className="reflective mt-4 max-w-prose text-ink-500">
          {answer.estimates_excluded === 1
            ? ESTIMATE_ONE
            : estimatesMany(answer.estimates_excluded)}
        </p>
      )}

      {answer.by_site.length === 0 ? (
        <p className="reflective mt-8 max-w-prose text-lg text-ink-700">
          {NOTHING_THESE_DAYS}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-sand-200">
          {answer.by_site.map((site) => (
            <li key={site.domain} className="py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-900">{site.domain}</span>
                <span className="text-sm text-ink-500">{site.count}</span>
              </div>
              <div aria-hidden="true" className="mt-2 h-1.5 rounded-full bg-sand-100">
                <div
                  data-testid="bar"
                  className="h-1.5 rounded-full bg-moss-500"
                  style={{ width: `${Math.round((site.count / largest) * 100)}%` }}
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
