import { momentOf, periodOf, type HkCheck, type HkMoment, type HkTask } from './housekeeping'

/** Shop hours by weekday ("0" = Sunday … "6" = Saturday), HH:MM 24-hour. A missing day is closed. */
export type ShopHours = Record<string, { open: string; close: string }>

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

/** Until the owner saves hours, reminders assume 9–6 every day. */
export const DEFAULT_DAY = { open: '09:00', close: '18:00' }

/** When the reminders come up, in minutes around opening and closing time. */
export const REMIND = {
  /** From this long before opening… */
  beforeOpen: 30,
  /** …until this long after it. */
  afterOpen: 120,
  beforeClose: 30,
  afterClose: 120,
  /** "Remind me later" waits this long. */
  snooze: 15,
  /** A shift starting up to an hour after opening still opens; one ending up to an hour before closing still closes. */
  openerSlack: 60,
  closerSlack: 60,
}

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function hoursFor(hours: ShopHours, weekday: number): { open: string; close: string } | null {
  if (!hours || Object.keys(hours).length === 0) return DEFAULT_DAY
  return hours[String(weekday)] ?? null
}

/** "10:00" → "10am", "17:30" → "5:30pm". */
export function timeLabel(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`
}

/** What's still open in each of the three checklists today (pure; the same rule the Team page uses). */
export function momentProgress(tasks: HkTask[], history: HkCheck[], today: string) {
  const out: Record<HkMoment, { task: HkTask; done: HkCheck[] }[]> = { arrive: [], client: [], close: [] }
  for (const t of tasks) {
    if (!t.active) continue
    const p = periodOf(t.repeat, today)
    if (!p.due) continue
    const done = history.filter((c) => c.taskId === t.id && (t.cadence === 'client' ? c.dayKey === today : c.dayKey >= p.start && c.dayKey <= today))
    out[momentOf(t.cadence)].push({ task: t, done })
  }
  return out
}

/**
 * Which reminder (if any) is due right now: opening jobs from 30 minutes before opening to
 * two hours after, closing jobs from 30 minutes before closing to two hours after — only while
 * something on that list is still open. Closed days get none.
 */
export function reminderDue(
  hours: ShopHours,
  now: Date,
  left: { arrive: number; close: number },
  /** This person's shift today. Omitted = don't check (the Team page uses that); null = not scheduled, no reminder. */
  shift?: { start: string; end: string } | null,
): { moment: 'arrive' | 'close'; at: string } | null {
  if (shift === null) return null
  const day = hoursFor(hours, now.getDay())
  if (!day) return null
  const t = now.getHours() * 60 + now.getMinutes()
  const open = mins(day.open)
  const close = mins(day.close)
  // Openers get the opening list, closers the closing one: a shift that starts within an hour
  // of opening opens; one that ends within an hour of closing closes.
  const opens = !shift || mins(shift.start) <= open + REMIND.openerSlack
  const closes = !shift || mins(shift.end) >= close - REMIND.closerSlack
  if (opens && left.arrive > 0 && t >= open - REMIND.beforeOpen && t < open + REMIND.afterOpen) return { moment: 'arrive', at: day.open }
  if (closes && left.close > 0 && t >= close - REMIND.beforeClose && t < close + REMIND.afterClose) return { moment: 'close', at: day.close }
  return null
}
