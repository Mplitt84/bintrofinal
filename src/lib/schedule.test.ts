import { describe, expect, it } from 'vitest'
import { arriveDue, closeDue, localDay, scheduleSummary, shiftFromSchedule, tzOffsetMinutes, zonedInstant } from './schedule'

const TZ = 'America/Chicago'

describe('time zones', () => {
  it('knows Chicago is behind UTC, and by how much in winter and summer', () => {
    expect(tzOffsetMinutes(new Date('2026-01-15T12:00:00Z'), TZ)).toBe(-360)
    expect(tzOffsetMinutes(new Date('2026-07-15T12:00:00Z'), TZ)).toBe(-300)
  })

  it('turns a shop wall-clock time into the right instant', () => {
    expect(zonedInstant('2026-11-17', '10:00', TZ).toISOString()).toBe('2026-11-17T16:00:00.000Z')
    expect(zonedInstant('2026-07-17', '10:00', TZ).toISOString()).toBe('2026-07-17T15:00:00.000Z')
  })

  it('reads the local day, not the UTC one', () => {
    // 11pm in Chicago is already tomorrow in UTC.
    expect(localDay(new Date('2026-11-17T05:00:00Z'), TZ)).toEqual({ dayKey: '2026-11-16', weekday: 1 })
  })
})

describe('reminder timing', () => {
  const week = [{ weekday: 2, start: '10:00', end: '18:00' }]

  it('makes a shift only on working days', () => {
    expect(shiftFromSchedule(week, '2026-11-16', 1, TZ)).toBeNull()
    const s = shiftFromSchedule(week, '2026-11-17', 2, TZ)!
    expect(s.start.toISOString()).toBe('2026-11-17T16:00:00.000Z')
    expect(s.end.toISOString()).toBe('2026-11-18T00:00:00.000Z')
  })

  it('reminds on arrival from 10 minutes early to 90 minutes late', () => {
    const s = shiftFromSchedule(week, '2026-11-17', 2, TZ)!
    expect(arriveDue(new Date('2026-11-17T15:45:00Z'), s)).toBe(false)
    expect(arriveDue(new Date('2026-11-17T15:52:00Z'), s)).toBe(true)
    expect(arriveDue(new Date('2026-11-17T17:31:00Z'), s)).toBe(false)
  })

  it('reminds to close out 15 minutes before a scheduled end, or when the last booking ends', () => {
    const s = shiftFromSchedule(week, '2026-11-17', 2, TZ)!
    expect(closeDue(new Date('2026-11-17T23:40:00Z'), s)).toBe(false)
    expect(closeDue(new Date('2026-11-17T23:46:00Z'), s)).toBe(true)
    const square = { ...s, source: 'square' as const }
    expect(closeDue(new Date('2026-11-17T23:46:00Z'), square)).toBe(false)
    expect(closeDue(new Date('2026-11-18T00:01:00Z'), square)).toBe(true)
  })

  it('sums up a week in plain words', () => {
    expect(scheduleSummary([{ weekday: 6, start: '11:00', end: '17:00' }, { weekday: 2, start: '10:00', end: '18:30' }])).toBe(
      'Tue 10am–6:30pm · Sat 11am–5pm',
    )
  })
})
