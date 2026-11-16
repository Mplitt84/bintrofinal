/**
 * Staff schedules and when housekeeping reminders are due. Client-safe and pure
 * (tested in schedule.test.ts). Times in a usual schedule are the shop's wall-clock
 * times (HH:MM) in the team member's own time zone, so "10:00" stays 10 in the
 * morning through daylight saving changes.
 */

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export type ScheduleDay = { weekday: number; start: string; end: string }

export type ReminderPrefs = {
  enabled: boolean
  onArrive: boolean
  onClient: boolean
  onClose: boolean
  /** square = Square Appointments bookings set the day; schedule = the usual week below. */
  source: 'square' | 'schedule'
  timeZone: string
}

export const DEFAULT_PREFS: ReminderPrefs = {
  enabled: true,
  onArrive: true,
  onClient: true,
  onClose: true,
  source: 'schedule',
  timeZone: 'America/Chicago',
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
export const isTime = (s: string) => HHMM.test(s)

/** Minutes the time zone is ahead of UTC at that instant (negative west of Greenwich). */
export function tzOffsetMinutes(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000)
}

/** The local date (YYYY-MM-DD) and weekday (0 = Sunday) at an instant, in a time zone. */
export function localDay(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const dayKey = `${get('year')}-${get('month')}-${get('day')}`
  const weekday = WEEKDAYS.indexOf(get('weekday') as (typeof WEEKDAYS)[number])
  return { dayKey, weekday: weekday < 0 ? new Date(`${dayKey}T12:00:00Z`).getUTCDay() : weekday }
}

/** The instant a wall-clock time happens on a local date in a time zone. */
export function zonedInstant(dayKey: string, hhmm: string, timeZone: string) {
  const [y, m, d] = dayKey.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  const wall = Date.UTC(y, m - 1, d, h, mi)
  // Two passes settle the offset even on a daylight-saving changeover day.
  let at = wall - tzOffsetMinutes(new Date(wall), timeZone) * 60_000
  at = wall - tzOffsetMinutes(new Date(at), timeZone) * 60_000
  return new Date(at)
}

export type Shift = { start: Date; end: Date; source: 'square' | 'schedule' }

/** Today's shift from the usual week, or null when they don't work this weekday. */
export function shiftFromSchedule(days: ScheduleDay[], dayKey: string, weekday: number, timeZone: string): Shift | null {
  const row = days.find((d) => d.weekday === weekday)
  if (!row || !isTime(row.start) || !isTime(row.end)) return null
  return { start: zonedInstant(dayKey, row.start, timeZone), end: zonedInstant(dayKey, row.end, timeZone), source: 'schedule' }
}

/** Arriving reminder: from 10 minutes before the day starts until 90 minutes after. */
export function arriveDue(now: Date, shift: Shift) {
  const t = now.getTime()
  return t >= shift.start.getTime() - 10 * 60_000 && t <= shift.start.getTime() + 90 * 60_000
}

/**
 * Close-out reminder: a usual schedule fires 15 minutes before it ends (time to close
 * out); Square fires when the last booking ends. Either way, up to 3 hours after.
 */
export function closeDue(now: Date, shift: Shift) {
  const lead = shift.source === 'schedule' ? 15 * 60_000 : 0
  const t = now.getTime()
  return t >= shift.end.getTime() - lead && t <= shift.end.getTime() + 3 * 3_600_000
}

/** "Tue–Sat 10:00–6:00 PM"-style summary for the settings card. */
export function scheduleSummary(days: ScheduleDay[]) {
  if (days.length === 0) return 'No usual schedule yet'
  const fmt = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const suffix = h >= 12 ? 'pm' : 'am'
    const hour = h % 12 === 0 ? 12 : h % 12
    return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`
  }
  return [...days]
    .sort((a, b) => a.weekday - b.weekday)
    .map((d) => `${WEEKDAYS[d.weekday]} ${fmt(d.start)}–${fmt(d.end)}`)
    .join(' · ')
}
