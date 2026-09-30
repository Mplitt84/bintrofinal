import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Repeat as RepeatIcon,
  Trash2,
  Truck,
  ClipboardCheck,
} from 'lucide-react'
import type { Product } from '@/components/inventory/types'
import {
  EVENT_KINDS,
  REPEATS,
  buildIcs,
  estimatedTaxDates,
  eventKind,
  formatTime,
  googleCalendarUrl,
  occurrences,
  outlookCalendarUrl,
  parseDay,
  subscribeUrls,
  toDay,
  type CalendarEvent,
  type EventInput,
  type EventKind,
  type Repeat,
} from '@/lib/calendar'
import { businessSlug } from '@/lib/business-types'
import { unitsToPar } from '@/lib/inventory-defaults'
import { Sheet, Field, SheetActions } from '@/components/ui/Sheet'
import { EmptyState, PageHead } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { useBusiness } from './BusinessContext'
import {
  addCalendarEvents,
  editCalendarEvent,
  getCalendarFeedPath,
  listCalendarEvents,
  removeCalendarEvent,
} from '@/server/calendar.functions'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const UPCOMING_DAYS = 45

type Occurrence = { event: CalendarEvent; day: string }

function addDays(day: string, n: number) {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return toDay(d)
}

function dayLabel(day: string, style: 'long' | 'short' = 'long') {
  const today = toDay(new Date())
  if (day === today) return 'Today'
  if (day === addDays(today, 1)) return 'Tomorrow'
  return parseDay(day).toLocaleDateString('en-US', style === 'long' ? { weekday: 'long', month: 'long', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Next weekday (0 = Sunday) on or after tomorrow. */
function nextWeekday(weekday: number) {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1)
  return toDay(d)
}

/**
 * Calendar tab: the business's reorders, deliveries, bills, stock counts and
 * tax dates in one place. Any event can be added to Google Calendar or Outlook
 * with a tap, and the whole calendar can be subscribed to so it stays in sync.
 */
export function CalendarView({ belowPar, staffName }: { belowPar: Product[]; staffName: string }) {
  const toast = useToast()
  const { name: businessName } = useBusiness()
  const today = toDay(new Date())
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const [selected, setSelected] = useState(today)
  const [viewing, setViewing] = useState<Occurrence | null>(null)
  const [editing, setEditing] = useState<{ event?: CalendarEvent; draft?: Partial<EventInput> } | null>(null)
  const [syncOpen, setSyncOpen] = useState(false)

  useEffect(() => {
    listCalendarEvents()
      .then((e) => setEvents(e as CalendarEvent[]))
      .catch(() => setEvents([]))
  }, [])

  /** The month grid: whole weeks from the Sunday before the 1st to the Saturday after the last day. */
  const grid = useMemo(() => {
    const first = parseDay(`${month}-01`)
    const start = addDays(`${month}-01`, -first.getDay())
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    const end = addDays(toDay(last), 6 - last.getDay())
    const days: string[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
    return { days, start, end }
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>()
    const from = grid.start < today ? grid.start : today
    const to = addDays(today, UPCOMING_DAYS) > grid.end ? addDays(today, UPCOMING_DAYS) : grid.end
    for (const event of events ?? []) {
      for (const day of occurrences(event, from, to)) {
        const list = map.get(day) ?? []
        list.push({ event, day })
        map.set(day, list)
      }
    }
    for (const list of map.values()) list.sort((a, b) => (a.event.startTime || '00:00').localeCompare(b.event.startTime || '00:00'))
    return map
  }, [events, grid, today])

  const upcoming = useMemo(() => {
    const out: Occurrence[] = []
    for (let i = 0; i <= UPCOMING_DAYS && out.length < 12; i++) out.push(...(byDay.get(addDays(today, i)) ?? []))
    return out.slice(0, 12)
  }, [byDay, today])

  const selectedItems = byDay.get(selected) ?? []
  const monthDate = parseDay(`${month}-01`)

  function shiftMonth(n: number) {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth() + n, 1)
    setMonth(toDay(d).slice(0, 7))
  }

  async function quickAdd(items: EventInput[], message: string) {
    try {
      setEvents((await addCalendarEvents({ data: { items } })) as CalendarEvent[])
      toast(message)
    } catch {
      toast('Could not add. Try again.')
    }
  }

  const hasTaxDates = (events ?? []).some((e) => e.kind === 'tax' && /estimated tax/i.test(e.title))
  const hasCount = (events ?? []).some((e) => e.kind === 'count' && e.repeat !== 'none')
  const hasPriceCheck = (events ?? []).some((e) => e.kind === 'task' && /price check/i.test(e.title))
  const hasReorderDay = (events ?? []).some((e) => e.kind === 'reorder' && e.repeat === 'weekly')

  const base = { startTime: '', durationMinutes: 60, notes: '', staffName, repeat: 'none' as Repeat }
  const starters = [
    !hasTaxDates && {
      key: 'tax',
      Icon: Landmark,
      title: 'Estimated tax dates',
      sub: 'The four US quarterly due dates, every year',
      run: () =>
        quickAdd(
          estimatedTaxDates().map((t) => ({
            ...base,
            kind: 'tax' as const,
            title: t.title,
            date: t.date,
            repeat: 'yearly' as const,
            notes: 'Federal estimated tax (Form 1040-ES). Check your state’s dates with your accountant.',
          })),
          'Added the quarterly tax dates',
        ),
    },
    !hasCount && {
      key: 'count',
      Icon: ClipboardCheck,
      title: 'Monthly stock count',
      sub: 'Last day of each month, for your books',
      run: () => {
        const d = new Date()
        const last = toDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))
        quickAdd(
          [{ ...base, kind: 'count', title: 'Monthly stock count', date: last, repeat: 'monthly', startTime: '17:00', notes: 'Count on-hand stock in Bintro so month-end inventory value is accurate.' }],
          'Monthly stock count added',
        )
      },
    },
    !hasReorderDay && {
      key: 'reorder',
      Icon: RepeatIcon,
      title: 'Weekly reorder day',
      sub: 'Every Monday at 10 AM, check Restock',
      run: () =>
        quickAdd(
          [{ ...base, kind: 'reorder', title: 'Reorder day', date: nextWeekday(1), repeat: 'weekly', startTime: '10:00', durationMinutes: 30, notes: 'Open Bintro → Restock and send this week’s order.' }],
          'Weekly reorder day added',
        ),
    },
    !hasPriceCheck && {
      key: 'prices',
      Icon: Tag,
      title: 'Quarterly price check',
      sub: 'Every 3 months, confirm your costs',
      run: () =>
        quickAdd(
          [{ ...base, kind: 'task', title: 'Price check', date: nextWeekday(2), repeat: 'quarterly', startTime: '10:00', durationMinutes: 30, notes: 'Open Bintro → Activity → Sales insights → Prices and check costs online.' }],
          'Quarterly price check added',
        ),
    },
  ].filter(Boolean) as { key: string; Icon: typeof Landmark; title: string; sub: string; run: () => void }[]

  function scheduleRestock() {
    const lines = belowPar.slice(0, 25).map((p) => `• ${p.name}${p.brand ? ` (${p.brand})` : ''}: order ${unitsToPar(p) || 1}+`)
    setEditing({
      draft: {
        kind: 'reorder',
        title: `Reorder ${belowPar.length} item${belowPar.length === 1 ? '' : 's'}`,
        date: addDays(today, 1),
        startTime: '10:00',
        durationMinutes: 30,
        notes: lines.join('\n') + (belowPar.length > 25 ? `\n…and ${belowPar.length - 25} more` : ''),
      },
    })
  }

  return (
    <div>
      <PageHead
        title="Calendar"
        lead="Reorders, deliveries, bills and tax dates in one place, synced to Google Calendar and Outlook."
        action={
          <div className="flex gap-2">
            <button className="btn btn-tonal btn-sm" onClick={() => setSyncOpen(true)}>
              <RefreshCw size={16} />
              Sync
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setEditing({ draft: { date: selected >= today ? selected : today } })}>
              <Plus size={16} />
              Add event
            </button>
          </div>
        }
      />

      {belowPar.length > 0 && (
        <button
          onClick={scheduleRestock}
          className="w-full text-left flex items-center gap-3 bg-action-tint rounded-2xl px-4 py-3 mb-4 border-0 cursor-pointer"
        >
          <Truck size={20} className="text-action shrink-0" />
          <span className="text-sm flex-1">
            <b>{belowPar.length} item{belowPar.length === 1 ? ' is' : 's are'} below par.</b> Put the reorder on the calendar
            with the list attached.
          </span>
          <CalendarPlus size={18} className="text-action shrink-0" />
        </button>
      )}

      <div className="grid min-[900px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-5 items-start">
        <section aria-label="Month">
          <div className="flex items-center gap-2 mb-3">
            <button className="btn btn-tonal btn-sm !px-2.5" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <h2 className="m-0 text-lg font-bold flex-1 text-center" aria-live="polite">
              {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button className="btn btn-tonal btn-sm !px-2.5" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
            {(month !== today.slice(0, 7) || selected !== today) && (
              <button
                className="btn btn-text btn-sm"
                onClick={() => {
                  setMonth(today.slice(0, 7))
                  setSelected(today)
                }}
              >
                Today
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-ink-2 mb-1" aria-hidden="true">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Days">
            {grid.days.map((day) => {
              const items = byDay.get(day) ?? []
              const inMonth = day.startsWith(month)
              const isToday = day === today
              const isSelected = day === selected
              return (
                <button
                  key={day}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${dayLabel(day)}${items.length ? `, ${items.length} event${items.length === 1 ? '' : 's'}` : ''}`}
                  onClick={() => {
                    setSelected(day)
                    if (!inMonth) setMonth(day.slice(0, 7))
                  }}
                  onDoubleClick={() => setEditing({ draft: { date: day } })}
                  className={`relative min-h-[54px] min-[560px]:min-h-[76px] rounded-xl border p-1 text-left flex flex-col cursor-pointer transition-colors ${
                    isSelected ? 'border-action bg-action-tint' : 'border-transparent bg-surface hover:bg-surface-2'
                  } ${inMonth ? '' : 'opacity-45'}`}
                >
                  <span
                    className={`num text-[13px] font-semibold w-6 h-6 grid place-items-center rounded-full ${
                      isToday ? 'bg-action text-white' : ''
                    }`}
                  >
                    {Number(day.slice(8))}
                  </span>
                  <span className="hidden min-[560px]:flex flex-col gap-0.5 mt-0.5 min-w-0 w-full">
                    {items.slice(0, 2).map((o) => (
                      <span key={o.event.id} className={`truncate rounded px-1 text-[11px] font-semibold leading-[16px] ${eventKind(o.event.kind).tint}`}>
                        {o.event.title}
                      </span>
                    ))}
                    {items.length > 2 && <span className="text-[11px] text-ink-2 px-1">+{items.length - 2} more</span>}
                  </span>
                  {items.length > 0 && (
                    <span className="min-[560px]:hidden flex gap-0.5 mt-auto mx-auto pb-0.5">
                      {items.slice(0, 3).map((o) => (
                        <span key={o.event.id} className={`w-1.5 h-1.5 rounded-full ${eventKind(o.event.kind).dot}`} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[12px] text-ink-2">
            {EVENT_KINDS.map((k) => (
              <span key={k.id} className="inline-flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${k.dot}`} />
                {k.label}
              </span>
            ))}
          </div>
        </section>

        <div className="grid gap-4">
          <section aria-label={dayLabel(selected)}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="m-0 text-lg font-bold">{dayLabel(selected)}</h2>
              <button className="btn btn-text btn-sm" onClick={() => setEditing({ draft: { date: selected } })}>
                <Plus size={16} />
                Add
              </button>
            </div>
            {events === null ? (
              <div className="bg-surface rounded-2xl p-4">
                <div className="skel w-[60%]" />
                <div className="skel w-[40%]" />
              </div>
            ) : selectedItems.length === 0 ? (
              <p className="m-0 text-sm text-ink-2 bg-surface rounded-2xl px-4 py-4">Nothing planned.</p>
            ) : (
              <EventList items={selectedItems} onOpen={setViewing} showDay={false} />
            )}
          </section>

          <section aria-label="Coming up">
            <h2 className="m-0 mb-2 text-lg font-bold">Coming up</h2>
            {events === null ? null : upcoming.length === 0 ? (
              <EmptyState title="Your calendar is clear">
                Add deliveries, bill due dates and reorders, or start with one of the suggestions below.
              </EmptyState>
            ) : (
              <EventList items={upcoming} onOpen={setViewing} showDay />
            )}
          </section>

          {events !== null && starters.length > 0 && (
            <section aria-label="Suggestions" className="rounded-2xl border border-line p-3.5">
              <h2 className="m-0 text-[15px] font-bold">Quick start</h2>
              <p className="m-0 mb-2 text-[13px] text-ink-2">One tap each. Edit or delete them any time.</p>
              <div className="grid gap-2">
                {starters.map(({ key, Icon, title, sub, run }) => (
                  <button key={key} onClick={run} className="flex items-center gap-3 text-left bg-surface hover:bg-surface-2 rounded-xl px-3 py-2.5 border-0 cursor-pointer">
                    <Icon size={18} className="text-action shrink-0" />
                    <span className="flex-1 min-w-0 text-sm">
                      <b className="block">{title}</b>
                      <span className="text-ink-2 text-[13px]">{sub}</span>
                    </span>
                    <Plus size={18} className="text-ink-2 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <Sheet
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.event.title ?? ''}
        subtitle={viewing ? `${dayLabel(viewing.day)} · ${formatTime(viewing.event.startTime)}` : undefined}
      >
        {viewing && (
          <EventDetails
            occurrence={viewing}
            businessName={businessName}
            onEdit={() => {
              setEditing({ event: viewing.event })
              setViewing(null)
            }}
            onDelete={async () => {
              const gone = viewing.event
              try {
                setEvents((await removeCalendarEvent({ data: { id: gone.id } })) as CalendarEvent[])
                setViewing(null)
                toast(`Deleted ${gone.title}`, async () => {
                  const { id: _id, ...rest } = gone
                  setEvents((await addCalendarEvents({ data: { items: [rest] } })) as CalendarEvent[])
                })
              } catch {
                toast('Could not delete. Try again.')
              }
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.event ? 'Edit event' : 'New event'}
        subtitle={editing?.event ? undefined : 'It shows here and in any Google or Outlook calendar synced to Bintro.'}
      >
        {editing && (
          <EventForm
            event={editing.event}
            draft={editing.draft}
            staffName={staffName}
            onCancel={() => setEditing(null)}
            onSaved={(next, message, day) => {
              setEvents(next)
              setEditing(null)
              setSelected(day)
              setMonth(day.slice(0, 7))
              toast(message)
            }}
          />
        )}
      </Sheet>

      <SyncSheet open={syncOpen} onClose={() => setSyncOpen(false)} businessName={businessName} />
    </div>
  )
}

function EventList({ items, onOpen, showDay }: { items: Occurrence[]; onOpen: (o: Occurrence) => void; showDay: boolean }) {
  return (
    <ul className="list-none m-0 p-0 bg-white border border-line rounded-2xl px-3">
      {items.map((o) => {
        const kind = eventKind(o.event.kind)
        return (
          <li key={`${o.event.id}-${o.day}`}>
            <button
              onClick={() => onOpen(o)}
              className="w-full flex items-center gap-3 py-2.5 border-0 border-b border-line bg-transparent text-left cursor-pointer text-ink"
            >
              <span className={`w-1 self-stretch rounded-full ${kind.dot}`} aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">{o.event.title}</span>
                <span className="block text-[13px] text-ink-2 truncate">
                  {[showDay && dayLabel(o.day, 'short'), formatTime(o.event.startTime), kind.label, o.event.repeat !== 'none' && REPEATS.find((r) => r.id === o.event.repeat)?.label]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <ChevronRight size={16} className="text-ink-2 shrink-0" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function downloadIcs(event: CalendarEvent, businessName: string) {
  const text = buildIcs([event], businessName, window.location.host)
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${businessSlug(event.title)}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function EventDetails({
  occurrence,
  businessName,
  onEdit,
  onDelete,
}: {
  occurrence: Occurrence
  businessName: string
  onEdit: () => void
  onDelete: () => void
}) {
  const { event, day } = occurrence
  const kind = eventKind(event.kind)
  const [confirm, setConfirm] = useState(false)
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${kind.tint}`}>{kind.label}</span>
        {event.repeat !== 'none' && (
          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-surface text-ink-2 inline-flex items-center gap-1">
            <RepeatIcon size={12} />
            {REPEATS.find((r) => r.id === event.repeat)?.label}
          </span>
        )}
        {event.staffName && <span className="text-[12px] px-2 py-0.5 rounded-full bg-surface text-ink-2">Added by {event.staffName}</span>}
      </div>
      {event.notes && <p className="whitespace-pre-line text-sm bg-surface rounded-2xl p-3 m-0 mb-4">{event.notes}</p>}

      <h3 className="text-[13px] font-semibold text-ink-2 m-0 mb-2">Add to your calendar</h3>
      <div className="grid grid-cols-2 gap-2">
        <a className="btn btn-tonal btn-sm no-underline" href={googleCalendarUrl(event, day)} target="_blank" rel="noreferrer">
          <GoogleMark />
          Google
        </a>
        <a className="btn btn-tonal btn-sm no-underline" href={outlookCalendarUrl(event, false, day)} target="_blank" rel="noreferrer">
          <OutlookMark />
          Outlook.com
        </a>
        <a className="btn btn-tonal btn-sm no-underline" href={outlookCalendarUrl(event, true, day)} target="_blank" rel="noreferrer">
          <OutlookMark />
          Outlook (work)
        </a>
        <button className="btn btn-tonal btn-sm" onClick={() => downloadIcs(event, businessName)}>
          <Download size={16} />
          Apple / .ics
        </button>
      </div>

      <SheetActions>
        <button className={`btn ${confirm ? 'bg-bad text-white' : 'bg-bad-tint text-bad'}`} onClick={() => (confirm ? onDelete() : setConfirm(true))} onBlur={() => setConfirm(false)}>
          <Trash2 size={16} />
          {confirm ? (event.repeat !== 'none' ? 'Delete all repeats' : 'Tap to confirm') : 'Delete'}
        </button>
        <button className="btn btn-primary" onClick={onEdit}>
          <Pencil size={16} />
          Edit
        </button>
      </SheetActions>
    </div>
  )
}

const DURATIONS = [15, 30, 60, 90, 120, 240]

function EventForm({
  event,
  draft,
  staffName,
  onCancel,
  onSaved,
}: {
  event?: CalendarEvent
  draft?: Partial<EventInput>
  staffName: string
  onCancel: () => void
  onSaved: (events: CalendarEvent[], message: string, day: string) => void
}) {
  const init = { ...draft, ...event }
  const [title, setTitle] = useState(init.title ?? '')
  const [kind, setKind] = useState<EventKind>(init.kind ?? 'task')
  const [date, setDate] = useState(init.date ?? toDay(new Date()))
  const [allDay, setAllDay] = useState(!(init.startTime ?? ''))
  const [time, setTime] = useState(init.startTime || '10:00')
  const [duration, setDuration] = useState(init.durationMinutes ?? 60)
  const [repeat, setRepeat] = useState<Repeat>(init.repeat ?? 'none')
  const [notes, setNotes] = useState(init.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const placeholder = {
    reorder: 'e.g. Order from SalonCentric',
    delivery: 'e.g. Delivery arriving',
    count: 'e.g. Backbar count',
    bill: 'e.g. Rent due',
    tax: 'e.g. Sales tax filing',
    task: 'e.g. Clean the color bar',
  }[kind]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Give the event a title.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Pick a date.')
      return
    }
    setSaving(true)
    setError('')
    const values: EventInput = {
      title: title.trim(),
      kind,
      date,
      startTime: allDay ? '' : time,
      durationMinutes: duration,
      repeat,
      notes: notes.trim(),
      staffName: event?.staffName || staffName,
    }
    try {
      const next = event
        ? await editCalendarEvent({ data: { id: event.id, ...values } })
        : await addCalendarEvents({ data: { items: [values] } })
      onSaved(next as CalendarEvent[], event ? 'Event saved' : `Added ${values.title}`, date)
    } catch {
      setError('Could not save. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Type">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Event type">
          {EVENT_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              aria-pressed={kind === k.id}
              className="chip !px-3 !py-1.5 !text-[13px] inline-flex items-center gap-1.5"
              onClick={() => setKind(k.id)}
            >
              <span className={`w-2 h-2 rounded-full ${k.dot}`} />
              {k.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Title" htmlFor="ev-title">
        <input id="ev-title" className="field-input" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 140))} placeholder={placeholder} autoFocus={!event && !draft?.title} />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Date" htmlFor="ev-date">
          <input id="ev-date" type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={allDay ? 'Time' : 'Starts'} htmlFor="ev-time">
          {allDay ? (
            <button type="button" id="ev-time" className="field-input text-left text-ink-2 cursor-pointer" onClick={() => setAllDay(false)}>
              All day · add a time
            </button>
          ) : (
            <input id="ev-time" type="time" className="field-input" value={time} onChange={(e) => setTime(e.target.value)} />
          )}
        </Field>
      </div>
      {!allDay && (
        <div className="flex items-center gap-2 flex-wrap -mt-1 mb-3">
          <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Length">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className="chip !px-2.5 !py-1 !text-[13px]" aria-pressed={duration === d} onClick={() => setDuration(d)}>
                {d < 60 ? `${d} min` : `${d / 60} hr`}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-text btn-sm !py-1" onClick={() => setAllDay(true)}>
            Make all day
          </button>
        </div>
      )}
      <Field label="Repeats">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Repeats">
          {REPEATS.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={repeat === r.id} aria-pressed={repeat === r.id} className="chip !px-3 !py-1.5 !text-[13px]" onClick={() => setRepeat(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Notes" htmlFor="ev-notes">
        <textarea id="ev-notes" rows={4} className="field-input resize-y" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 2000))} placeholder="Order list, account number, who's handling it…" />
      </Field>
      {error && <p className="text-bad text-sm mt-1 mb-0">{error}</p>}
      <SheetActions>
        <button type="button" className="btn btn-tonal" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : event ? 'Save' : 'Add event'}
        </button>
      </SheetActions>
    </form>
  )
}

/** Subscribe Google, Outlook or Apple Calendar to the live feed so every Bintro event appears there. */
function SyncSheet({ open, onClose, businessName }: { open: boolean; onClose: () => void; businessName: string }) {
  const toast = useToast()
  const [feedUrl, setFeedUrl] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open || feedUrl) return
    getCalendarFeedPath({ data: {} })
      .then((r) => setFeedUrl(`${window.location.origin}${r.path}`))
      .catch(() => toast('Could not load the calendar link. Try again.'))
  }, [open, feedUrl, toast])

  const links = feedUrl ? subscribeUrls(feedUrl, `${businessName} · Bintro`) : null

  async function reset() {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    try {
      const r = await getCalendarFeedPath({ data: { reset: true } })
      setFeedUrl(`${window.location.origin}${r.path}`)
      setConfirmReset(false)
      toast('New link made. Calendars using the old one stop updating.')
    } catch {
      toast('Could not reset the link. Try again.')
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sync with your calendar"
      subtitle="Subscribe once and every Bintro event shows up in your calendar app, updating on its own. Google refreshes every few hours; Outlook and Apple more often."
    >
      <div className="grid gap-2">
        <SyncButton href={links?.google} icon={<GoogleMark />} title="Google Calendar" sub="Opens Google Calendar to add it" />
        <SyncButton href={links?.outlook} icon={<OutlookMark />} title="Outlook.com" sub="Personal Microsoft accounts" />
        <SyncButton href={links?.outlookWork} icon={<OutlookMark />} title="Outlook for work or school" sub="Microsoft 365 accounts" />
        <SyncButton href={links?.apple} icon={<CalendarDays size={18} />} title="Apple Calendar" sub="iPhone, iPad and Mac" external={false} />
      </div>

      <Field label="Or paste this link into any calendar app" htmlFor="feed-url">
        <div className="flex gap-2">
          <input id="feed-url" readOnly className="field-input !text-[13px]" value={feedUrl || 'Loading…'} onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="btn btn-tonal btn-sm shrink-0"
            disabled={!feedUrl}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(feedUrl)
                toast('Calendar link copied')
              } catch {
                toast('Select the link and copy it')
              }
            }}
          >
            <Copy size={16} />
            Copy
          </button>
        </div>
      </Field>
      <p className="text-[13px] text-ink-2 m-0">
        Anyone with this link can see your Bintro events, so share it only with your team.{' '}
        <button type="button" className="border-0 bg-transparent p-0 text-bad font-semibold cursor-pointer" onClick={reset} onBlur={() => setConfirmReset(false)}>
          {confirmReset ? 'Tap again to make a new link' : 'Reset link'}
        </button>
      </p>
      <SheetActions>
        <button className="btn btn-tonal" onClick={onClose}>
          Done
        </button>
      </SheetActions>
    </Sheet>
  )
}

function SyncButton({ href, icon, title, sub, external = true }: { href?: string; icon: React.ReactNode; title: string; sub: string; external?: boolean }) {
  return (
    <a
      href={href}
      aria-disabled={!href}
      target={external ? '_blank' : undefined}
      rel="noreferrer"
      className={`flex items-center gap-3 rounded-2xl bg-surface hover:bg-surface-2 px-4 py-3 no-underline text-ink ${href ? '' : 'pointer-events-none opacity-50'}`}
    >
      <span className="w-9 h-9 rounded-full bg-white grid place-items-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 text-sm">
        <b className="block">{title}</b>
        <span className="text-ink-2 text-[13px]">{sub}</span>
      </span>
      <ChevronRight size={16} className="text-ink-2" />
    </a>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" />
    </svg>
  )
}

function OutlookMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="4" width="13" height="16" rx="2" fill="#0A64C8" />
      <path fill="#fff" d="M8.5 8c-2 0-3.2 1.7-3.2 4s1.2 4 3.2 4 3.2-1.7 3.2-4-1.2-4-3.2-4zm0 6.3c-.9 0-1.4-1-1.4-2.3s.5-2.3 1.4-2.3 1.4 1 1.4 2.3-.5 2.3-1.4 2.3z" />
      <path fill="#28A8EA" d="M15 7h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-6z" />
    </svg>
  )
}
