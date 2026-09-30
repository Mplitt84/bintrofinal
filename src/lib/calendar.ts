/**
 * Business calendar helpers shared by the Calendar tab and the iCal feed:
 * event kinds, repeat expansion, "add to Google / Outlook" links and the
 * .ics text. Client-safe.
 */

export type EventKind = 'reorder' | 'delivery' | 'bill' | 'tax' | 'count' | 'task'
export type Repeat = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type CalendarEvent = {
  id: number
  title: string
  kind: EventKind
  /** YYYY-MM-DD, local. */
  date: string
  /** HH:MM, local; empty for all day. */
  startTime: string
  durationMinutes: number
  repeat: Repeat
  notes: string
  staffName: string
}

export type EventInput = Omit<CalendarEvent, 'id'>

export const EVENT_KINDS: { id: EventKind; label: string; dot: string; tint: string }[] = [
  { id: 'reorder', label: 'Reorder', dot: 'bg-action', tint: 'bg-action-tint text-action' },
  { id: 'delivery', label: 'Delivery', dot: 'bg-good', tint: 'bg-good-tint text-good' },
  { id: 'count', label: 'Stock count', dot: 'bg-[#3d5a80]', tint: 'bg-[#e6edf5] text-[#3d5a80]' },
  { id: 'bill', label: 'Bill due', dot: 'bg-warn', tint: 'bg-warn-tint text-warn' },
  { id: 'tax', label: 'Tax date', dot: 'bg-bad', tint: 'bg-bad-tint text-bad' },
  { id: 'task', label: 'Task', dot: 'bg-ink-2', tint: 'bg-surface text-ink-2' },
]

export const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'none', label: 'Once' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
]

export function eventKind(id: string) {
  return EVENT_KINDS.find((k) => k.id === id) ?? EVENT_KINDS[EVENT_KINDS.length - 1]!
}

const pad = (n: number) => String(n).padStart(2, '0')

export function parseDay(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function toDay(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Adds months without spilling over, so the 31st repeats on the last day of shorter months. */
function addMonths(base: Date, months: number, day: number) {
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, last))
  return target
}

/** Every date the event falls on between `from` and `to` (inclusive YYYY-MM-DD). */
export function occurrences(event: Pick<CalendarEvent, 'date' | 'repeat'>, from: string, to: string, limit = 400) {
  const start = parseDay(event.date)
  const out: string[] = []
  if (event.repeat === 'none') {
    if (event.date >= from && event.date <= to) out.push(event.date)
    return out
  }
  const step = { weekly: 0, monthly: 1, quarterly: 3, yearly: 12 }[event.repeat]
  for (let i = 0; i < limit; i++) {
    const d =
      event.repeat === 'weekly'
        ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7)
        : addMonths(start, i * step, start.getDate())
    const key = toDay(d)
    if (key > to) break
    if (key >= from) out.push(key)
  }
  return out
}

/** Local start and end of one occurrence. All-day events end at the next midnight. */
export function occurrenceRange(event: Pick<CalendarEvent, 'startTime' | 'durationMinutes'>, day: string) {
  const start = parseDay(day)
  if (!event.startTime) {
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start, end, allDay: true }
  }
  const [h, m] = event.startTime.split(':').map(Number)
  start.setHours(h!, m!)
  return { start, end: new Date(start.getTime() + Math.max(5, event.durationMinutes) * 60_000), allDay: false }
}

export function formatTime(hhmm: string) {
  if (!hhmm) return 'All day'
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: m ? '2-digit' : undefined })
}

function rrule(repeat: Repeat) {
  switch (repeat) {
    case 'weekly':
      return 'FREQ=WEEKLY'
    case 'monthly':
      return 'FREQ=MONTHLY'
    case 'quarterly':
      return 'FREQ=MONTHLY;INTERVAL=3'
    case 'yearly':
      return 'FREQ=YEARLY'
    default:
      return ''
  }
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const dayStamp = (d: Date) => toDay(d).replace(/-/g, '')

/** "Add to Google Calendar" link for one occurrence (repeats carry over). */
export function googleCalendarUrl(event: CalendarEvent, day = event.date) {
  const { start, end, allDay } = occurrenceRange(event, day)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: allDay ? `${dayStamp(start)}/${dayStamp(end)}` : `${utcStamp(start)}/${utcStamp(end)}`,
    details: event.notes,
  })
  const rule = rrule(event.repeat)
  if (rule) params.set('recur', `RRULE:${rule}`)
  return `https://calendar.google.com/calendar/render?${params}`
}

/** "Add to Outlook" link. `work` targets Microsoft 365 accounts; otherwise Outlook.com. */
export function outlookCalendarUrl(event: CalendarEvent, work: boolean, day = event.date) {
  const { start, end, allDay } = occurrenceRange(event, day)
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.notes,
    startdt: allDay ? toDay(start) : start.toISOString(),
    enddt: allDay ? toDay(end) : end.toISOString(),
  })
  if (allDay) params.set('allday', 'true')
  return `https://outlook.${work ? 'office' : 'live'}.com/calendar/0/deeplink/compose?${params}`
}

/** Links that subscribe a calendar app to the live feed, so new events show up on their own. */
export function subscribeUrls(feedUrl: string, name: string) {
  const webcal = feedUrl.replace(/^https?:/, 'webcal:')
  const outlook = (host: string) =>
    `https://outlook.${host}.com/calendar/0/addfromweb?${new URLSearchParams({ url: feedUrl, name })}`
  return {
    google: `https://calendar.google.com/calendar/r?${new URLSearchParams({ cid: webcal })}`,
    outlook: outlook('live'),
    outlookWork: outlook('office'),
    apple: webcal,
  }
}

function escapeText(v: string) {
  return v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

/** Folds long lines at 75 octets as RFC 5545 asks. */
function fold(line: string) {
  const parts: string[] = []
  let rest = line
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  parts.push(rest)
  return parts.join('\r\n')
}

/**
 * iCalendar text for a set of events. Timed events are written as floating
 * local times so they show at the same clock time the business entered them,
 * in whatever time zone the subscribing calendar uses.
 */
export function buildIcs(events: CalendarEvent[], calendarName: string, host: string) {
  const now = utcStamp(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bintro//Business calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  for (const e of events) {
    const { start, end, allDay } = occurrenceRange(e, e.date)
    const local = (d: Date) => `${dayStamp(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`
    lines.push(
      'BEGIN:VEVENT',
      `UID:bintro-event-${e.id}@${host}`,
      `DTSTAMP:${now}`,
      allDay ? `DTSTART;VALUE=DATE:${dayStamp(start)}` : `DTSTART:${local(start)}`,
      allDay ? `DTEND;VALUE=DATE:${dayStamp(end)}` : `DTEND:${local(end)}`,
      `SUMMARY:${escapeText(e.title)}`,
      `CATEGORIES:${escapeText(eventKind(e.kind).label)}`,
    )
    if (e.notes) lines.push(`DESCRIPTION:${escapeText(e.notes)}`)
    const rule = rrule(e.repeat)
    if (rule) lines.push(`RRULE:${rule}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/**
 * US federal estimated-tax due dates (repeating yearly), for the one-tap
 * "tax dates" set-up. Each starts on its next upcoming date.
 */
export function estimatedTaxDates(today = new Date()) {
  const todayKey = toDay(today)
  const year = today.getFullYear()
  return [
    { md: '04-15', title: 'Q1 estimated tax payment due' },
    { md: '06-15', title: 'Q2 estimated tax payment due' },
    { md: '09-15', title: 'Q3 estimated tax payment due' },
    { md: '01-15', title: 'Q4 estimated tax payment due' },
  ].map(({ md, title }) => {
    const thisYear = `${year}-${md}`
    return { title, date: thisYear >= todayKey ? thisYear : `${year + 1}-${md}` }
  })
}
