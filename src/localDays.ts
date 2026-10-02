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

function parse(day: string): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number);
  return [y, m - 1, d];
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
