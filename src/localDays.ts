/**
 * Local calendar days and their midnights.
 *
 * Built from the calendar (`new Date(y, m, d)`), never by adding seconds: a local day
 * is 23 or 25 hours long twice a year, and a day's end is the next local midnight.
 * Holds no reach data.
 */
export interface Bounds {
  /** The local midnight that begins it, in epoch seconds. */
  start: number;
  /** The local midnight after it, in epoch seconds. */
  end: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

const format = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function split(day: string): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number);
  return [y, m - 1, d];
}

/**
 * Whether `day` is a real calendar date written `YYYY-MM-DD` with a four-digit year:
 * it survives a round trip through the calendar unchanged. A text field standing in
 * for a date input can yield `2026-09-0`, `1` or `2026-02-30`; none is a day.
 */
export function isLocalDate(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [y, m, d] = split(day);
  return format(new Date(y, m, d)) === day;
}

/** The parts of a day that passed `isLocalDate`; anything else is a mistake of the caller. */
function parse(day: string): [number, number, number] {
  if (!isLocalDate(day))
    throw new RangeError(`not a calendar date: ${JSON.stringify(day)}`);
  return split(day);
}

const seconds = (d: Date) => Math.round(d.getTime() / 1000);

/** The local date of an instant, as `YYYY-MM-DD`. */
export const localToday = (now: Date): string => format(now);

/** The day `n` calendar days from `day` (negative goes back). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = parse(day);
  return format(new Date(y, m, d + n));
}

/** A day's two local midnights. */
export const dayBounds = (day: string): Bounds => rangeBounds(day, day);

/** The local midnight that begins `firstDay` and the one after `lastDay`. */
export function rangeBounds(firstDay: string, lastDay: string): Bounds {
  const [fy, fm, fd] = parse(firstDay);
  const [ly, lm, ld] = parse(lastDay);
  return {
    start: seconds(new Date(fy, fm, fd)),
    end: seconds(new Date(ly, lm, ld + 1)),
  };
}

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

/** A day in words, `3 September`, with the year (`3 September 2026`) when asked. */
export function dayInWords(day: string, withYear = false): string {
  const [y, m, d] = parse(day);
  return `${d} ${MONTHS[m]}${withYear ? ` ${y}` : ''}`;
}

/** A range in words: `From 3 September to 30 September`, the years named only across one. */
export function rangeInWords(firstDay: string, lastDay: string): string {
  const crossesYears = firstDay.slice(0, 4) !== lastDay.slice(0, 4);
  return `From ${dayInWords(firstDay, crossesYears)} to ${dayInWords(lastDay, crossesYears)}`;
}

/** An offset taking effect: from `from` (epoch seconds) the clock is `offset` seconds east of UTC. */
export interface OffsetChange {
  from: number;
  offset: number;
}

/**
 * How far east of UTC the computer's clock is at an instant, in whole seconds: exactly the offset
 * `Date`'s own local fields use. Taken from those fields (the local reading as if it were UTC, less
 * the instant), not from `getTimezoneOffset()`, which is whole minutes and so is wrong by up to 30
 * seconds where a zone kept a mean time not on a minute (Monrovia before 1972, -00:44:30). The
 * `+ 0` turns a negative zero, which UTC itself would give, into zero.
 */
function offsetAt(epochSeconds: number): number {
  const d = new Date(epochSeconds * 1000);
  // `setUTCFullYear` rather than `Date.UTC`, which reads years 0 to 99 as 1900 to 1999.
  const asUtc = new Date(0);
  asUtc.setUTCFullYear(d.getFullYear(), d.getMonth(), d.getDate());
  asUtc.setUTCHours(d.getHours(), d.getMinutes(), d.getSeconds(), 0);
  return Math.round(asUtc.getTime() / 1000) - epochSeconds + 0;
}

/**
 * The offsets the computer's clock has across `firstDay` to `lastDay`: the one in force where the
 * range begins, then one entry for every instant inside the range at which it changes.
 *
 * Found by asking `Date` for the offset at each local midnight, as `rangeBounds` finds the
 * midnights; where neighbouring midnights differ, the first instant of the new offset is searched
 * to the second. The core buckets each reach by the offset in force at its instant from this list
 * (in the core's domain layer), so every hour agrees with the times the Today log prints. Holds no
 * reach data.
 */
export function offsetChanges(firstDay: string, lastDay: string): OffsetChange[] {
  const [fy, fm, fd] = parse(firstDay);
  const [ly, lm, ld] = parse(lastDay);
  const days =
    Math.round(Date.UTC(ly, lm, ld) / 86_400_000) -
    Math.round(Date.UTC(fy, fm, fd) / 86_400_000);
  const { start, end } = rangeBounds(firstDay, lastDay);

  const changes: OffsetChange[] = [{ from: start, offset: offsetAt(start) }];
  let before = start;
  for (let day = 1; day <= days + 1; day += 1) {
    const midnight = day === days + 1 ? end : seconds(new Date(fy, fm, fd + day));
    const old = changes[changes.length - 1].offset;
    if (offsetAt(midnight) !== old) {
      // `before` has the old offset and `midnight` has not: the first second of the new one.
      let low = before;
      let high = midnight;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (offsetAt(middle) === old) low = middle;
        else high = middle;
      }
      if (high < end) changes.push({ from: high, offset: offsetAt(high) });
    }
    before = midnight;
  }
  return changes;
}

/**
 * An hour of the day by its start, `14:00`, in the form the Today log prints a time. Made from a
 * fixed instant in UTC, so no zone's clock change can skip or double a label.
 */
export const hourInWords = (hour: number): string =>
  new Date(Date.UTC(2000, 0, 1, hour)).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

/** What a locale reports of its week, in the two forms the platforms have given it. */
interface LocaleWeek {
  /** The current form: a method. */
  getWeekInfo?: () => { firstDay?: unknown };
  /** The older form: an accessor. */
  weekInfo?: { firstDay?: unknown };
}

/**
 * The day a locale begins its week on, in the core's numbering (0 = Monday ... 6 = Sunday): the
 * platform's `firstDay` runs 1 (Monday) to 7 (Sunday). `getWeekInfo()` is preferred, then
 * `weekInfo`, and a webview with neither, or a `firstDay` that is not an integer from 1 to 7, begins
 * on Monday (W2). Pure: it is given the object, so a test can give it any.
 */
export function firstWeekdayOf(locale: LocaleWeek): number {
  const info = typeof locale.getWeekInfo === 'function' ? locale.getWeekInfo() : locale.weekInfo;
  const first = info?.firstDay;
  return typeof first === 'number' && Number.isInteger(first) && first >= 1 && first <= 7
    ? first - 1
    : 0;
}

/**
 * The first day of the computer's week, from its region (W9). With no `locale`, the one the days are
 * named in (`Intl.DateTimeFormat().resolvedOptions().locale`), so the order and the names come from
 * one place. Holds no reach data.
 */
export function firstWeekday(locale?: string): number {
  return firstWeekdayOf(
    new Intl.Locale(locale ?? new Intl.DateTimeFormat().resolvedOptions().locale) as LocaleWeek,
  );
}

/**
 * A day of the week as the computer names it, `Monday`: 0 = Monday ... 6 = Sunday. Made from a fixed
 * instant in UTC (2024-01-01 was a Monday), so no zone can move a name to another day.
 */
export const weekdayInWords = (weekday: number): string =>
  new Date(Date.UTC(2024, 0, 1 + weekday)).toLocaleDateString([], {
    weekday: 'long',
    timeZone: 'UTC',
  });

/**
 * How many of a weekday a range holds, in words: `across 1 Monday`, `across 4 Mondays`, and
 * `not in these days` for a weekday the range does not hold (W4, W7). The plural adds an `s`, which is
 * right for English day names; plural forms in other languages belong to a translation (W8).
 */
export function acrossInWords(weekday: number, days: number): string {
  if (days === 0) return 'not in these days';
  return `across ${days} ${weekdayInWords(weekday)}${days === 1 ? '' : 's'}`;
}
