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

import {
  acrossInWords,
  addDays,
  dayBounds,
  firstWeekday,
  hourInWords,
  isLocalDate,
  localToday,
  offsetChanges,
  rangeBounds,
  rangeInWords,
  weekdayInWords,
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

// The words, once: the page and the tests that hold them both read them.
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
const BY_DAY = 'By day';
const DAY_BY_DAY = 'Day by day';
/**
 * Why an estimate is left out of the view it is left out of: it has no site and no hour, and it is not
 * something Cairn saw, which is all a day of the week is counted from (W6).
 */
const estimatesSentence = (days: number, view: Seen) => {
  const reason =
    view === 'weekday' || view === 'movement' ? 'Cairn counts only what it saw' : `an estimate has no ${view}`;
  return days === 1
    ? `Your own estimate for 1 day is not counted here, because ${reason}.`
    : `Your own estimates for ${days} days are not counted here, because ${reason}.`;
};

/** The four ways to see a range: by the sites reached, the hours of the day, the days of the week, or day by day. */
type Seen = 'site' | 'hour' | 'weekday' | 'movement';

/** One line of a range's list: a site, an hour or a day of the week, with its count. */
interface Row {
  key: string;
  name: string;
  count: number;
  /** How many of that day the range holds (`across 4 Mondays`): only a day of the week has one. */
  clause?: string;
  /** A day the range does not hold: its name and clause, with no count and no bar (W7). */
  absent?: boolean;
}

/**
 * The lines of the range in the view chosen: sites most first, all 24 hours from midnight, or the seven
 * days of the week from `weekStart`. Each day is picked by its own `weekday`, not by its place in the
 * answer.
 */
const rowsOf = (answer: Patterns, seen: Seen, weekStart: number): Row[] => {
  if (seen === 'site') {
    return answer.by_site.map((site) => ({
      key: site.domain,
      name: site.domain,
      count: site.count,
    }));
  }
  if (seen === 'hour') {
    return answer.by_hour.map((one) => ({
      key: String(one.hour),
      name: hourInWords(one.hour),
      count: one.count,
    }));
  }
  // Day by day: the rows come from the answer; the names and clauses are V13 onward.
  if (seen === 'movement') return [];
  // An answer with no days at all (sealed) draws none; otherwise all seven are drawn (W3), a weekday
  // the answer left out as a name with no count known.
  if (answer.by_weekday.length === 0) return [];
  return Array.from({ length: 7 }, (_, place) => (weekStart + place) % 7).map(
    (weekday) => {
      const day = answer.by_weekday.find((one) => one.weekday === weekday);
      return {
        key: String(weekday),
        name: weekdayInWords(weekday),
        count: day?.count ?? 0,
        // Nor is a reach called "not in these days": with no days to count by, the name stands with its count.
        clause:
          day && (day.days > 0 || day.count === 0)
            ? acrossInWords(weekday, day.days)
            : undefined,
        // Only a weekday that holds no days and no reach is "not in these days": a count is never hidden (Y23).
        absent: day !== undefined && day.days === 0 && day.count === 0,
      };
    },
  );
};

/** Whether the view has nothing to count: no sites, or no reach in any hour. */
const isQuiet = (rows: Row[]) => rows.every((row) => row.count === 0);

/** Where a view sits: the two pages of a spread (the right one ruled and empty for now). */
function Frame({ children }: { children: ReactNode }) {
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
  firstDay,
}: {
  today?: TodaysReaches;
  read?: ReachesReader;
  now?: () => Date;
  /** The day the week begins on, 0 (Monday) to 6 (Sunday): the computer's own unless a test says. */
  firstDay?: number;
}) {
  // Read once: the order of the week does not change while the screen is open.
  const [weekStart] = useState(() => firstDay ?? firstWeekday());
  const [view, setView] = useState<'today' | 'over-time'>('today');

  const which = (
    <div className="nb-reaches-which" role="group" aria-label={WHICH_DAYS}>
      <ViewButton current={view === 'today'} onClick={() => setView('today')}>
        {TODAY}
      </ViewButton>
      <ViewButton current={view === 'over-time'} onClick={() => setView('over-time')}>
        {OVER_TIME}
      </ViewButton>
    </div>
  );
  const shown =
    view === 'today' ? (
      <TodayView today={today} read={read} now={now} />
    ) : (
      <OverTimeView read={read} now={now} weekStart={weekStart} />
    );

  // The group is the spread's first child and the view a fragment of its two pages, so a change of
  // view keeps the button just pressed, and focus with it.
  return (
    <div className="nb-spread nb-reaches-leaves">
      {which}
      {shown}
    </div>
  );
}

function ViewButton({
  current,
  onClick,
  children,
}: {
  current: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={current}
      onClick={onClick}
      className="nb-reaches-which__button"
    >
      {children}
    </button>
  );
}

function TodayView({
  today,
  read,
  now,
}: {
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
      <Frame>
        <p className="nb-reaches-sentence">{LOOKING}</p>
      </Frame>
    );
  }

  if (day.sealed) {
    return (
      <Frame>
        <h2 className="nb-reaches-title">{TODAY}</h2>
        <p className="nb-reaches-sentence">{day.sealed}</p>
      </Frame>
    );
  }

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

/** What the view holds: the answer for a range, nothing yet, or one sentence for a read that threw. */
type Answer = Patterns | 'looking' | 'unreadable';

function OverTimeView({
  read,
  now,
  weekStart,
}: {
  read: ReachesReader;
  now: () => Date;
  weekStart: number;
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
      firstDay={firstDay}
      lastDay={lastDay}
      todayDay={todayDay}
      onFirst={changeFirst}
      onLast={changeLast}
    />
  );

  const choice = <SeenByChoice seen={seen} onChoose={setSeen} />;

  const sentence =
    answer === 'looking'
      ? LOOKING
      : answer === 'unreadable'
        ? COULD_NOT_READ
        : answer.sealed;
  // The answer to draw as a list: none while looking, unreadable or sealed.
  const list = typeof answer === 'string' || answer.sealed ? null : answer;
  const rows = list ? rowsOf(list, seen, weekStart) : [];
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
            {rows.length > 0 && (seen !== 'site' || !isQuiet(rows)) && (
              <ul className="nb-reaches-log">
                {rows.map((row) => (
                  <li key={row.key} className="nb-reaches-line">
                    <span className="nb-reaches-site">{row.name}</span>
                    {row.clause !== undefined && (
                      <span className="nb-reaches-time">{row.clause}</span>
                    )}
                    {!row.absent && (
                      <>
                        <div aria-hidden="true" className="nb-reaches-bar">
                          <div
                            data-testid="bar"
                            className="nb-reaches-bar__fill"
                            style={{
                              width: `${Math.round((row.count / largest) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="nb-reaches-count">{row.count}</span>
                      </>
                    )}
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

/** By site | By hour | By day | Day by day, under the date boxes in every state, so it never moves when an answer arrives. */
function SeenByChoice({
  seen,
  onChoose,
}: {
  seen: Seen;
  onChoose: (seen: Seen) => void;
}) {
  return (
    <div className="nb-reaches-seen" role="group" aria-label={SEEN_BY}>
      <ViewButton current={seen === 'site'} onClick={() => onChoose('site')}>
        {BY_SITE}
      </ViewButton>
      <ViewButton current={seen === 'hour'} onClick={() => onChoose('hour')}>
        {BY_HOUR}
      </ViewButton>
      <ViewButton current={seen === 'weekday'} onClick={() => onChoose('weekday')}>
        {BY_DAY}
      </ViewButton>
      <ViewButton current={seen === 'movement'} onClick={() => onChoose('movement')}>
        {DAY_BY_DAY}
      </ViewButton>
    </div>
  );
}

/** From and To: the one set of rules (`min`, `max`, what a change does) for the page. */
function DateBoxes({
  firstDay,
  lastDay,
  todayDay,
  onFirst,
  onLast,
}: {
  firstDay: string;
  lastDay: string;
  todayDay: string;
  onFirst: (value: string) => void;
  onLast: (value: string) => void;
}) {
  return (
    <div className="nb-reaches-range">
      <label className="nb-reaches-field">
        From
        <input
          type="date"
          value={firstDay}
          max={lastDay}
          onChange={(event) => onFirst(event.target.value)}
          className="nb-reaches-date"
        />
      </label>
      <label className="nb-reaches-field">
        To
        <input
          type="date"
          value={lastDay}
          min={firstDay}
          max={todayDay}
          onChange={(event) => onLast(event.target.value)}
          className="nb-reaches-date"
        />
      </label>
    </div>
  );
}

function timeOfDay(seconds: number): string {
  return new Date(seconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
