import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock, Moon, Pencil, Plus, Sparkles, Sun, Trash2 } from 'lucide-react'
import { useBusiness } from '@/components/business/BusinessContext'
import { DEFAULT_DAY, WEEKDAYS, timeLabel as hourLabel, type ShopHours } from '@/lib/shop-hours'
import { updateBusinessProfile } from '@/server/business.functions'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { TOOL_TONES } from '@/components/ui/ToolButton'
import {
  DEFAULT_REPEAT,
  HK_MOMENTS,
  WEEKDAY_SHORT,
  momentOf,
  periodOf,
  type HkCadence,
  type HkCheck,
  type HkMoment,
  type HkRepeat,
  type HkTask,
} from '@/lib/housekeeping'
import {
  addHousekeepingTask,
  checkHousekeeping,
  deleteHousekeepingTask,
  getHousekeeping,
  undoHousekeeping,
  updateHousekeepingTask,
} from '@/server/housekeeping.functions'

const LOOK: Record<HkMoment, { icon: typeof Sun; tone: keyof typeof TOOL_TONES; hint: string }> = {
  arrive: { icon: Sun, tone: 'yellow', hint: 'Opening the shop' },
  client: { icon: Sparkles, tone: 'garnet', hint: 'Reset between clients' },
  close: { icon: Moon, tone: 'royal', hint: 'Closing the shop' },
}
const CADENCE_FOR: Record<HkMoment, HkCadence> = { arrive: 'open', client: 'client', close: 'close' }
/** Today on this device, YYYY-MM-DD. */
function localDayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const first = (n: string) => n.trim().split(/\s+/)[0] ?? n

type HowOften = 'daily' | 'days' | 'weekly' | 'monthly'
function howOftenOf(r: HkRepeat): HowOften {
  if (r.kind === 'days') return 'days'
  if (r.kind === 'weeks') return 'weekly'
  if (r.kind === 'monthly') return 'monthly'
  return 'daily'
}
function repeatFor(h: HowOften, days: number[], today: string): HkRepeat {
  if (h === 'days') return { ...DEFAULT_REPEAT, kind: 'days', days: days.length ? days : [1, 2, 3, 4, 5] }
  if (h === 'weekly') return { ...DEFAULT_REPEAT, kind: 'weeks', every: 1, anchor: today, flex: true }
  if (h === 'monthly') return { ...DEFAULT_REPEAT, kind: 'monthly', monthDay: 1, flex: true }
  return { ...DEFAULT_REPEAT }
}
const HOW_LABEL: Record<HowOften, string> = { daily: 'Every day', days: 'On certain days', weekly: 'Once a week', monthly: 'Once a month' }

/**
 * Team page → Shop clean-up: three shared checklists, Arrive / Client done / Close out.
 * Anyone working ticks a job and it's done for the whole shop today (or this week /
 * month for less frequent jobs), with who did it and when. No turns, no assignments,
 * no personal lists or phone reminders. Owners edit the list.
 */
export function ShopCleanup({ staffName, isOwner }: { staffName: string; isOwner: boolean }) {
  const toast = useToast()
  const [today, setToday] = useState(() => localDayKey())
  const [tasks, setTasks] = useState<HkTask[] | null>(null)
  const [history, setHistory] = useState<HkCheck[]>([])
  const [open, setOpen] = useState<HkMoment | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState<number | 'all' | null>(null)
  const [hoursOpen, setHoursOpen] = useState(false)
  const { profile } = useBusiness()
  const who = staffName.trim() || 'Team'
  const noHours = !profile.hours || Object.keys(profile.hours).length === 0

  const load = useCallback(async () => {
    const day = localDayKey()
    setToday(day)
    try {
      const b = await getHousekeeping({ data: { dayKey: day, weekday: new Date(`${day}T12:00:00`).getDay() } })
      setTasks(b.tasks)
      setHistory(b.history)
    } catch {
      setTasks([])
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  /** Today's jobs per moment, with who did each (in its stretch: today, this week or this month). */
  const byMoment = useMemo(() => {
    const out: Record<HkMoment, { task: HkTask; done: HkCheck[] }[]> = { arrive: [], client: [], close: [] }
    for (const t of tasks ?? []) {
      if (!t.active) continue
      const p = periodOf(t.repeat, today)
      if (!p.due) continue
      const done = history.filter((c) => c.taskId === t.id && (t.cadence === 'client' ? c.dayKey === today : c.dayKey >= p.start && c.dayKey <= today))
      out[momentOf(t.cadence)].push({ task: t, done })
    }
    return out
  }, [tasks, history, today])

  async function tick(task: HkTask) {
    setBusy(task.id)
    try {
      const r = await checkHousekeeping({ data: { taskId: task.id, staffName: who, dayKey: today } })
      if (!r.ok) return toast(r.message)
      await load()
      if (r.checkId) {
        const id = r.checkId
        toast(`${task.name} · done`, async () => {
          await undoHousekeeping({ data: { checkId: id, staffName: who, dayKey: today } })
          await load()
        })
      }
    } finally {
      setBusy(null)
    }
  }

  async function finishAll(moment: HkMoment) {
    const rows = byMoment[moment].filter((r) => moment === 'client' || r.done.length === 0)
    if (rows.length === 0) return
    setBusy('all')
    const ids: number[] = []
    try {
      for (const r of rows) {
        const res = await checkHousekeeping({ data: { taskId: r.task.id, staffName: who, dayKey: today } })
        if (res.ok && res.checkId) ids.push(res.checkId)
      }
      await load()
      toast(moment === 'client' ? 'Station reset. Thank you!' : `${HK_MOMENTS.find((m) => m.id === moment)!.label} done. Thank you!`, async () => {
        for (const id of ids) await undoHousekeeping({ data: { checkId: id, staffName: who, dayKey: today } })
        await load()
      })
      setOpen(null)
    } finally {
      setBusy(null)
    }
  }

  async function untick(check: HkCheck) {
    const r = await undoHousekeeping({ data: { checkId: check.id, staffName: who, dayKey: today } })
    if (!r.ok) return toast(r.message)
    await load()
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="m-0 text-lg font-bold">Shop clean-up</h2>
        {isOwner && (
          <span className="flex gap-1">
            <button type="button" className="btn btn-text btn-sm" onClick={() => setHoursOpen(true)}>
              <Clock size={14} /> Shop hours
            </button>
            <button type="button" className="btn btn-text btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit the list
            </button>
          </span>
        )}
      </div>
      {isOwner && noHours && (
        <p className="text-[13px] bg-gold-tint text-gold-ink rounded-xl px-3 py-2 mb-2">
          Everyone who signs in gets a pop-up for the opening and closing jobs. Set your{' '}
          <button type="button" className="underline font-semibold bg-transparent border-0 p-0 cursor-pointer text-inherit" onClick={() => setHoursOpen(true)}>
            shop hours
          </button>{' '}
          so they come at the right time (until then: 9am–6pm every day).
        </p>
      )}
      {!tasks ? (
        <div className="skel h-24 rounded-2xl" />
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {HK_MOMENTS.map((m) => {
            const rows = byMoment[m.id]
            const done = rows.filter((r) => r.done.length > 0).length
            const L = LOOK[m.id]
            const Icon = L.icon
            const t = TOOL_TONES[L.tone]
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setOpen(m.id)}
                className="rounded-2xl border-0 p-3 text-left cursor-pointer min-h-[104px] flex flex-col justify-between"
                style={{ background: t.bg, color: t.fg }}
              >
                <Icon size={26} />
                <span>
                  <b className="block text-[15px] leading-tight">{m.label}</b>
                  <span className="text-[12px] opacity-90">
                    {rows.length === 0 ? 'Nothing today' : m.id === 'client' ? `${rows.length} jobs` : `${done} of ${rows.length} done`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? HK_MOMENTS.find((m) => m.id === open)!.label : ''}
        subtitle={open ? `${LOOK[open].hint}. Tick a job and it's done for the whole shop.` : ''}
      >
        {open && (
          <>
            {byMoment[open].length === 0 ? (
              <p className="text-sm text-ink-2">Nothing on this list today.{isOwner ? ' Add jobs with Edit the list.' : ''}</p>
            ) : (
              <ul className="list-none m-0 p-0 grid gap-2">
                {byMoment[open].map(({ task, done }) => {
                  const last = done.at(-1)
                  const isDone = open !== 'client' && Boolean(last)
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => (isDone && last ? untick(last) : tick(task))}
                        className={`w-full flex items-center gap-3 rounded-2xl p-3.5 border-0 text-left cursor-pointer ${isDone ? 'bg-good-tint' : 'bg-surface'}`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${isDone ? 'bg-good text-white' : 'bg-white border-2 border-line'}`}
                          aria-hidden
                        >
                          {isDone && <Check size={18} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <b className={`block text-[15px] ${isDone ? 'line-through opacity-70' : ''}`}>{task.name}</b>
                          <span className="text-[12px] text-ink-2">
                            {isDone && last
                              ? `${first(last.staffName)} · ${timeLabel(last.at)} · tap to undo`
                              : open === 'client' && done.length
                                ? `Done ${done.length}× today`
                                : task.why || (task.repeat.kind === 'daily' ? '' : HOW_LABEL[howOftenOf(task.repeat)])}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <SheetActions>
              <button type="button" className="btn btn-text" onClick={() => setOpen(null)}>
                Close
              </button>
              <button type="button" className="btn btn-primary" disabled={busy !== null || byMoment[open].length === 0} onClick={() => finishAll(open)}>
                {open === 'client' ? 'Reset done' : 'All done'}
              </button>
            </SheetActions>
          </>
        )}
      </Sheet>

      {isOwner && hoursOpen && <ShopHoursSheet hours={profile.hours ?? {}} onClose={() => setHoursOpen(false)} />}
      {isOwner && editing && tasks && (
        <EditListSheet
          tasks={tasks}
          today={today}
          onClose={() => setEditing(false)}
          onTasks={(t) => setTasks(t)}
        />
      )}
    </section>
  )
}

type Draft = { id?: number; name: string; moment: HkMoment; how: HowOften; days: number[] }

function EditListSheet({ tasks, today, onClose, onTasks }: { tasks: HkTask[]; today: string; onClose: () => void; onTasks: (t: HkTask[]) => void }) {
  const toast = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!draft || !draft.name.trim()) return
    setSaving(true)
    const fields = {
      name: draft.name.trim().slice(0, 40),
      cadence: CADENCE_FOR[draft.moment],
      repeat: repeatFor(draft.how, draft.days, today),
    }
    try {
      const r = draft.id
        ? await updateHousekeepingTask({ data: { id: draft.id, patch: fields } })
        : await addHousekeepingTask({
            data: { ...fields, icon: 'sparkles', tone: 'garnet', scope: 'shop', role: 'artist', assign: 'everyone', assignees: [], why: '' },
          })
      if (!r.ok) return toast(r.message)
      onTasks(r.tasks)
      toast(draft.id ? 'Saved' : `Added “${fields.name}”`)
      setDraft(null)
    } finally {
      setSaving(false)
    }
  }

  async function setActive(t: HkTask, active: boolean) {
    const r = await updateHousekeepingTask({ data: { id: t.id, patch: { active } } })
    if (r.ok) {
      onTasks(r.tasks)
      toast(active ? `${t.name} is back on the list` : `${t.name} is off the list`, async () => {
        const back = await updateHousekeepingTask({ data: { id: t.id, patch: { active: !active } } })
        if (back.ok) onTasks(back.tasks)
      })
    }
  }

  async function remove(t: HkTask) {
    const r = await deleteHousekeepingTask({ data: { id: t.id } })
    onTasks(r.tasks)
    toast(`Removed ${t.name}`, async () => {
      const back = await addHousekeepingTask({
        data: { name: t.name, cadence: t.cadence, repeat: t.repeat, icon: t.icon, tone: t.tone, scope: 'shop', role: 'artist', assign: 'everyone', assignees: [], why: t.why },
      })
      if (back.ok) onTasks(back.tasks)
    })
  }

  return (
    <Sheet open onClose={onClose} title="Edit the clean-up list" subtitle="What gets done when you open, between clients and when you close.">
      {draft ? (
        <div className="grid gap-3">
          <label className="text-sm font-semibold">
            Job
            <input className="field-input mt-1" maxLength={40} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Wipe down mirrors" />
          </label>
          <div>
            <span className="text-sm font-semibold block mb-1">When</span>
            <div className="flex gap-1.5 flex-wrap">
              {HK_MOMENTS.map((m) => (
                <button key={m.id} type="button" className="chip" aria-pressed={draft.moment === m.id} onClick={() => setDraft({ ...draft, moment: m.id })}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold block mb-1">How often</span>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(HOW_LABEL) as HowOften[]).map((h) => (
                <button key={h} type="button" className="chip" aria-pressed={draft.how === h} onClick={() => setDraft({ ...draft, how: h })}>
                  {HOW_LABEL[h]}
                </button>
              ))}
            </div>
            {draft.how === 'days' && (
              <div className="flex gap-1 flex-wrap mt-2">
                {WEEKDAY_SHORT.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    className="chip !px-2.5"
                    aria-pressed={draft.days.includes(i)}
                    onClick={() => setDraft({ ...draft, days: draft.days.includes(i) ? draft.days.filter((x) => x !== i) : [...draft.days, i].sort() })}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
          <SheetActions>
            <button type="button" className="btn btn-text" onClick={() => setDraft(null)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" disabled={saving || !draft.name.trim()} onClick={save}>
              {draft.id ? 'Save' : 'Add job'}
            </button>
          </SheetActions>
        </div>
      ) : (
        <>
          {HK_MOMENTS.map((m) => {
            const list = tasks.filter((t) => momentOf(t.cadence) === m.id)
            return (
              <section key={m.id} className="mb-4">
                <h3 className="m-0 mb-1.5 text-sm font-bold">{m.label}</h3>
                {list.length === 0 && <p className="m-0 text-[13px] text-ink-2">No jobs yet.</p>}
                <ul className="list-none m-0 p-0">
                  {list.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 py-2 border-b border-line last:border-b-0">
                      <span className={`flex-1 min-w-0 text-sm ${t.active ? '' : 'opacity-50 line-through'}`}>
                        {t.name}
                        <span className="block text-[12px] text-ink-2 no-underline">{HOW_LABEL[howOftenOf(t.repeat)]}</span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-text btn-sm"
                        onClick={() => setDraft({ id: t.id, name: t.name, moment: momentOf(t.cadence), how: howOftenOf(t.repeat), days: t.repeat.days ?? [] })}
                      >
                        Edit
                      </button>
                      <button type="button" className="btn btn-text btn-sm" onClick={() => setActive(t, !t.active)}>
                        {t.active ? 'Turn off' : 'Turn on'}
                      </button>
                      {(
                        <button type="button" className="btn btn-text btn-sm !text-bad" aria-label={`Remove ${t.name}`} onClick={() => remove(t)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          <SheetActions>
            <button type="button" className="btn btn-text" onClick={onClose}>
              Done
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setDraft({ name: '', moment: 'close', how: 'daily', days: [] })}>
              <Plus size={16} /> Add a job
            </button>
          </SheetActions>
        </>
      )}
    </Sheet>
  )
}

/** Owner: the days and times the shop opens. Reminders come 30 minutes before opening and before closing. */
function ShopHoursSheet({ hours, onClose }: { hours: ShopHours; onClose: () => void }) {
  const toast = useToast()
  const { onProfile } = useBusiness()
  const start = Object.keys(hours).length ? hours : Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), { ...DEFAULT_DAY }]))
  const [h, setH] = useState<ShopHours>(start)
  const [saving, setSaving] = useState(false)
  const set = (d: number, v: { open: string; close: string } | null) =>
    setH((cur) => {
      const next = { ...cur }
      if (v) next[String(d)] = v
      else delete next[String(d)]
      return next
    })
  async function save() {
    if (Object.values(h).some((d) => d.close <= d.open)) return toast('Closing time has to be after opening time.')
    setSaving(true)
    try {
      const p = await updateBusinessProfile({ data: { hours: h } })
      onProfile?.(p)
      toast('Shop hours saved')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save the hours.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Sheet open onClose={onClose} title="Shop hours" subtitle="Opening and closing reminders pop up 30 minutes before, for everyone signed in.">
      <ul className="list-none m-0 p-0 grid gap-2">
        {WEEKDAYS.map((name, d) => {
          const day = h[String(d)]
          return (
            <li key={name} className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 w-32 text-sm font-semibold">
                <input type="checkbox" checked={Boolean(day)} onChange={(e) => set(d, e.target.checked ? { ...DEFAULT_DAY } : null)} />
                {name}
              </label>
              {day ? (
                <span className="flex items-center gap-1.5 text-sm">
                  <input className="field-input !w-auto !py-1.5" type="time" value={day.open} onChange={(e) => set(d, { ...day, open: e.target.value })} aria-label={`${name} opens`} />
                  to
                  <input className="field-input !w-auto !py-1.5" type="time" value={day.close} onChange={(e) => set(d, { ...day, close: e.target.value })} aria-label={`${name} closes`} />
                  <span className="text-ink-2 text-[12px] hidden min-[500px]:inline">{hourLabel(day.open)}–{hourLabel(day.close)}</span>
                </span>
              ) : (
                <span className="text-sm text-ink-2">Closed</span>
              )}
            </li>
          )
        })}
      </ul>
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          Save hours
        </button>
      </SheetActions>
    </Sheet>
  )
}
