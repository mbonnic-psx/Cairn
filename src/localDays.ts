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
