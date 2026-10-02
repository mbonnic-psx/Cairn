import { describe, expect, it } from 'vitest'
import { formatWeekdayTime, greetingFor } from '../look'

// Thursday 2026-10-01, 07:48 and 19:05 local time (constructed from parts, so
// no time zone shifts them).
const morning = new Date(2026, 9, 1, 7, 48)
const evening = new Date(2026, 9, 1, 19, 5)

describe('greetingFor', () => {
  it('greets the morning look', () => {
    expect(greetingFor('morning')).toBe('Good morning.')
  })

  it('does not read the clock to choose the words', () => {
    expect(greetingFor('morning')).toBe(greetingFor('morning'))
  })
})

describe('formatWeekdayTime', () => {
  it('uses 24-hour time for en-GB', () => {
    expect(formatWeekdayTime(morning, 'en-GB')).toBe('Thursday 07:48')
    expect(formatWeekdayTime(evening, 'en-GB')).toBe('Thursday 19:05')
  })

  it('uses 12-hour time for en-US', () => {
    const text = formatWeekdayTime(morning, 'en-US')
    expect(text).toMatch(/^Thursday,? 7:48\sAM$/)
    expect(formatWeekdayTime(evening, 'en-US')).toMatch(/^Thursday,? 7:05\sPM$/)
  })
})

describe('formatWeekdayTime, whole string', () => {
  it('joins weekday and time with one space and no comma', () => {
    // 2026-10-05 is a Monday.
    // Newer ICU puts a narrow no-break space before AM; compare with plain spaces.
    const text = formatWeekdayTime(new Date(2026, 9, 5, 9, 5), 'en-US').replace(/\s/g, ' ')
    expect(text).toBe('Monday 9:05 AM')
  })
  it('drops the comma some locales put after the weekday, keeping one space', () => {
    // de-DE formats "Montag, 09:05"; the comma goes, the space stays.
    expect(formatWeekdayTime(new Date(2026, 9, 5, 9, 5), 'de-DE')).toBe('Montag 09:05')
  })
})
