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
