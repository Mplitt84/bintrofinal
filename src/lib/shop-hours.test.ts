import { describe, expect, it } from 'vitest'
import { DEFAULT_REPEAT, type HkTask } from './housekeeping'
import { hoursFor, momentProgress, reminderDue, timeLabel } from './shop-hours'

const hours = { '1': { open: '10:00', close: '18:00' }, '6': { open: '11:00', close: '17:00' } }
const at = (iso: string) => new Date(iso) // local time, no zone suffix

describe('reminderDue', () => {
  it('opens 30 minutes before opening and lasts two hours after', () => {
    expect(reminderDue(hours, at('2026-11-23T09:29'), { arrive: 2, close: 3 })).toBeNull()
    expect(reminderDue(hours, at('2026-11-23T09:30'), { arrive: 2, close: 3 })).toEqual({ moment: 'arrive', at: '10:00' })
    expect(reminderDue(hours, at('2026-11-23T11:59'), { arrive: 2, close: 3 })?.moment).toBe('arrive')
    expect(reminderDue(hours, at('2026-11-23T12:00'), { arrive: 2, close: 3 })).toBeNull()
  })
  it('stays quiet once the list is done, and on closed days', () => {
    expect(reminderDue(hours, at('2026-11-23T10:05'), { arrive: 0, close: 3 })).toBeNull()
    expect(reminderDue(hours, at('2026-11-22T10:05'), { arrive: 2, close: 3 })).toBeNull() // Sunday not set
  })
  it('closing window', () => {
    expect(reminderDue(hours, at('2026-11-28T16:35'), { arrive: 0, close: 1 })).toEqual({ moment: 'close', at: '17:00' })
    expect(reminderDue(hours, at('2026-11-28T19:01'), { arrive: 0, close: 1 })).toBeNull()
  })
  it('falls back to 9–6 every day with no hours saved', () => {
    expect(hoursFor({}, 0)).toEqual({ open: '09:00', close: '18:00' })
    expect(reminderDue({}, at('2026-11-22T17:45'), { arrive: 0, close: 1 })?.moment).toBe('close')
  })
  it('labels times', () => {
    expect(timeLabel('10:00')).toBe('10am')
    expect(timeLabel('17:30')).toBe('5:30pm')
    expect(timeLabel('00:15')).toBe('12:15am')
  })
})

describe('only people scheduled today', () => {
  it('no shift today means no reminder', () => {
    expect(reminderDue(hours, at('2026-11-23T09:45'), { arrive: 2, close: 3 }, null)).toBeNull()
  })
  it('openers get opening, closers get closing', () => {
    const opener = { start: '10:00', end: '15:00' }
    const closer = { start: '13:00', end: '18:00' }
    expect(reminderDue(hours, at('2026-11-23T09:45'), { arrive: 2, close: 3 }, opener)?.moment).toBe('arrive')
    expect(reminderDue(hours, at('2026-11-23T09:45'), { arrive: 2, close: 3 }, closer)).toBeNull()
    expect(reminderDue(hours, at('2026-11-23T17:45'), { arrive: 0, close: 3 }, closer)?.moment).toBe('close')
    expect(reminderDue(hours, at('2026-11-23T17:45'), { arrive: 0, close: 3 }, opener)).toBeNull()
  })
})

describe('momentProgress', () => {
  const task = (id: number, cadence: HkTask['cadence']): HkTask =>
    ({ id, key: '', name: `Job ${id}`, cadence, repeat: { ...DEFAULT_REPEAT }, active: true }) as HkTask
  it('splits today’s jobs by moment and attaches today’s taps', () => {
    const p = momentProgress([task(1, 'open'), task(2, 'close'), task(3, 'client')], [{ id: 9, taskId: 1, staffName: 'Beth', at: '', dayKey: '2026-11-23' }], '2026-11-23')
    expect(p.arrive[0].done).toHaveLength(1)
    expect(p.close[0].done).toHaveLength(0)
    expect(p.client).toHaveLength(1)
  })
})
