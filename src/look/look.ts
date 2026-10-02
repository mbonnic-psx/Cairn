// The looks the interface can wear.
// A look is chosen by the person at the switch, never derived from the clock.
export type Look = 'morning' | 'midday' | 'night'
// Every look wears the notebook shell; the alias keeps the name the shell and the screens already use.
export type NotebookLook = Look

const GREETINGS: Record<Look, string> = {
  morning: 'Good morning.',
  midday: 'Midday.',
  night: 'Good evening.',
}

export function greetingFor(look: Look): string {
  return GREETINGS[look]
}

// Weekday plus time, in the computer's locale: its default hour cycle decides
// between 12- and 24-hour time. `locale` is a seam for tests; callers omit it.
export function formatWeekdayTime(when: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(when)
    .replace(/^(\p{L}+),\s*/u, '$1 ')
}
