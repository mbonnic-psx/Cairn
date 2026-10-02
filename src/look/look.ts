// The looks the interface can wear. 'midday' and 'night' join in slice `looks`.
// A look is chosen by the person at the switch, never derived from the clock.
export type Look = 'current' | 'morning'

const GREETINGS: Record<Look, string> = {
  current: '',
  morning: 'Good morning.',
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
