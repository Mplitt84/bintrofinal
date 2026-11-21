/**
 * Schedules and the scan check (pure, tested): which scans were made in someone's name
 * by a different signed-in person, or at a time that person wasn't scheduled to work.
 * A flag is a question to ask, never proof — someone may have covered a shift.
 */

export type ScheduleDay = { weekday: number; start: string; end: string }
export type Schedule = { staffName: string; days: ScheduleDay[] }

export type ScanRow = {
  id: number
  productName: string
  type: string
  delta: number
  staffName: string
  signedInAs: string
  /** ISO time the scan was made. */
  at: string
  note: string
}

export type ScanFlag = 'other-login' | 'off-schedule'
export type FlaggedScan = ScanRow & { flags: ScanFlag[]; why: string[] }

/** Minutes either side of a shift that still count as on shift (setting up, running late). */
export const SHIFT_GRACE_MIN = 30

/** Names that aren't people: never flagged. */
export const SYSTEM_NAMES = new Set(['square pos', 'email', 'not recorded', 'formulas', 'team', ''])

const key = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const first = (n: string) => n.trim().split(/\s+/)[0] ?? n
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "Mon 10am–6pm · Tue 10am–6pm"-style short label for a schedule. */
export function scheduleLabel(days: ScheduleDay[]) {
  const t = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`
  }
  return [...days]
    .sort((a, b) => a.weekday - b.weekday)
    .map((d) => `${DAY_NAMES[d.weekday].slice(0, 3)} ${t(d.start)}–${t(d.end)}`)
    .join(' · ')
}

/** Is `at` (a local time on this device) inside the person's schedule, with grace? null = they have no schedule. */
export function onShift(schedule: Schedule | undefined, at: Date, graceMin = SHIFT_GRACE_MIN): boolean | null {
  if (!schedule || schedule.days.length === 0) return null
  const day = schedule.days.find((d) => d.weekday === at.getDay())
  if (!day) return false
  const t = at.getHours() * 60 + at.getMinutes()
  return t >= mins(day.start) - graceMin && t <= mins(day.end) + graceMin
}

export function flagScans(rows: ScanRow[], schedules: Schedule[], graceMin = SHIFT_GRACE_MIN): FlaggedScan[] {
  const byName = new Map(schedules.map((s) => [key(s.staffName), s]))
  const out: FlaggedScan[] = []
  for (const r of rows) {
    if (SYSTEM_NAMES.has(key(r.staffName))) continue
    const flags: ScanFlag[] = []
    const why: string[] = []
    if (r.signedInAs && key(r.signedInAs) !== key(r.staffName)) {
      flags.push('other-login')
      why.push(`${first(r.signedInAs)} was signed in, but it was saved under ${first(r.staffName)}`)
    }
    const at = new Date(r.at)
    if (onShift(byName.get(key(r.staffName)), at, graceMin) === false) {
      flags.push('off-schedule')
      why.push(`${first(r.staffName)} wasn’t scheduled ${DAY_NAMES[at.getDay()]} at ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`)
    }
    if (flags.length) out.push({ ...r, flags, why })
  }
  return out
}

/** Per person: how many of their scans were flagged, worst first. */
export function flagsByPerson(flagged: FlaggedScan[]) {
  const m = new Map<string, { name: string; otherLogin: number; offSchedule: number; total: number }>()
  for (const f of flagged) {
    const row = m.get(key(f.staffName)) ?? { name: f.staffName, otherLogin: 0, offSchedule: 0, total: 0 }
    if (f.flags.includes('other-login')) row.otherLogin++
    if (f.flags.includes('off-schedule')) row.offSchedule++
    row.total++
    m.set(key(f.staffName), row)
  }
  return [...m.values()].sort((a, b) => b.total - a.total)
}

/** Cleans a typed schedule: one entry per weekday, valid times, end after start. */
export function cleanSchedule(days: ScheduleDay[]): ScheduleDay[] {
  const seen = new Set<number>()
  const ok = /^\d{2}:\d{2}$/
  return days
    .filter((d) => d.weekday >= 0 && d.weekday <= 6 && ok.test(d.start) && ok.test(d.end) && mins(d.end) > mins(d.start))
    .filter((d) => (seen.has(d.weekday) ? false : (seen.add(d.weekday), true)))
    .sort((a, b) => a.weekday - b.weekday)
}
