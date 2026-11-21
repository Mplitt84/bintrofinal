import { describe, expect, it } from 'vitest'
import { cleanSchedule, flagScans, flagsByPerson, onShift, scheduleLabel, type ScanRow } from './scan-check'

const beth = { staffName: 'Beth E', days: [{ weekday: 1, start: '10:00', end: '18:00' }] }
const row = (over: Partial<ScanRow>): ScanRow => ({
  id: 1, productName: 'Curl cream', type: 'out', delta: -1, staffName: 'Beth E', signedInAs: '', at: new Date('2026-11-23T12:00').toISOString(), note: '', ...over,
})

describe('onShift', () => {
  it('uses the weekday window with 30 minutes of grace', () => {
    expect(onShift(beth, new Date('2026-11-23T09:31'))).toBe(true) // Monday
    expect(onShift(beth, new Date('2026-11-23T09:29'))).toBe(false)
    expect(onShift(beth, new Date('2026-11-23T18:30'))).toBe(true)
    expect(onShift(beth, new Date('2026-11-24T12:00'))).toBe(false) // Tuesday off
    expect(onShift(undefined, new Date())).toBeNull()
  })
})

describe('flagScans', () => {
  it('flags a scan saved under someone else while another person was signed in', () => {
    const f = flagScans([row({ signedInAs: 'KaNesha H' })], [beth])
    expect(f[0].flags).toEqual(['other-login'])
    expect(f[0].why[0]).toMatch(/KaNesha was signed in/)
  })
  it('flags scans outside the schedule, never for people with no schedule or system names', () => {
    const late = new Date('2026-11-23T21:00').toISOString()
    expect(flagScans([row({ at: late })], [beth])[0].flags).toEqual(['off-schedule'])
    expect(flagScans([row({ at: late, staffName: 'Minnie L' })], [beth])).toHaveLength(0)
    expect(flagScans([row({ at: late, staffName: 'Square POS', signedInAs: 'Beth E' })], [beth])).toHaveLength(0)
  })
  it('names match loosely and same-person scans pass', () => {
    expect(flagScans([row({ signedInAs: ' beth  e ' })], [beth])).toHaveLength(0)
  })
  it('adds up per person', () => {
    const f = flagScans([row({ signedInAs: 'KaNesha H' }), row({ id: 2, at: new Date('2026-11-24T12:00').toISOString() })], [beth])
    expect(flagsByPerson(f)).toEqual([{ name: 'Beth E', otherLogin: 1, offSchedule: 1, total: 2 }])
  })
})

describe('schedules', () => {
  it('cleans and labels', () => {
    const c = cleanSchedule([
      { weekday: 2, start: '10:00', end: '18:00' },
      { weekday: 2, start: '11:00', end: '12:00' },
      { weekday: 3, start: '18:00', end: '10:00' },
      { weekday: 6, start: '11:00', end: '17:30' },
    ])
    expect(c).toEqual([{ weekday: 2, start: '10:00', end: '18:00' }, { weekday: 6, start: '11:00', end: '17:30' }])
    expect(scheduleLabel(c)).toBe('Tue 10am–6pm · Sat 11am–5:30pm')
  })
})
