import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Moon, Sun, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import type { HkCheck, HkTask } from '@/lib/housekeeping'
import { REMIND, momentProgress, reminderDue, timeLabel, type ShopHours } from '@/lib/shop-hours'
import { checkHousekeeping, getHousekeeping, undoHousekeeping } from '@/server/housekeeping.functions'
import { getSchedules } from '@/server/scan-check.functions'
import type { Schedule } from '@/lib/scan-check'

const dayKeyOf = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const first = (n: string) => n.trim().split(/\s+/)[0] ?? n

/** What this person said about today's reminder on this device: snoozed until a time, or skipped. */
const stateKey = (userId: number, day: string, moment: string) => `bintro.cleanupReminder.${userId}.${day}.${moment}`
function readState(key: string): 'skip' | number | null {
  try {
    const v = window.localStorage.getItem(key)
    if (!v) return null
    return v === 'skip' ? 'skip' : Number(v) || null
  } catch {
    return null
  }
}
function writeState(key: string, v: 'skip' | number) {
  try {
    window.localStorage.setItem(key, String(v))
  } catch {
    /* private mode: the reminder just comes back next check */
  }
}

/**
 * The signed-in person's own opening / closing pop-up. Comes up from 30 minutes before the
 * shop opens (or closes) until two hours after, while that list still has jobs open, and
 * lets them tick jobs right there. Their ticks count for the whole shop, like the Team page.
 */
export function CleanupReminder({
  userId,
  name,
  hours,
  enabled,
  onVisible,
}: {
  userId: number
  /** Their team name: what their ticks are recorded under. */
  name: string
  hours: ShopHours
  enabled: boolean
  onVisible?: (showing: boolean) => void
}) {
  const toast = useToast()
  const [due, setDue] = useState<{ moment: 'arrive' | 'close'; at: string; day: string } | null>(null)
  const [jobs, setJobs] = useState<{ task: HkTask; done: HkCheck[] }[]>([])
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const lastFetch = useRef(0)
  const schedule = useRef<{ at: number; mine: Schedule | null } | null>(null)
  const who = name.trim() || 'Team'

  const check = useCallback(
    async (force = false) => {
      if (!enabled) return setDue(null)
      const now = new Date()
      // Cheap first look with "everything open": no window, nothing to fetch.
      if (!reminderDue(hours, now, { arrive: 1, close: 1 })) return setDue(null)
      if (!force && Date.now() - lastFetch.current < 60_000) return
      lastFetch.current = Date.now()
      const day = dayKeyOf(now)
      try {
        // Only people scheduled today get it (schedule re-read every 10 minutes).
        if (!schedule.current || Date.now() - schedule.current.at > 600_000) {
          const r = await getSchedules()
          const k = who.trim().toLowerCase()
          schedule.current = { at: Date.now(), mine: r.schedules.find((s) => s.staffName.trim().toLowerCase() === k) ?? null }
        }
        const shift = schedule.current.mine?.days.find((d) => d.weekday === now.getDay()) ?? null
        if (!shift) return setDue(null)
        const b = await getHousekeeping({ data: { dayKey: day, weekday: now.getDay() } })
        const p = momentProgress(b.tasks, b.history, day)
        const open = { arrive: p.arrive.filter((r) => !r.done.length), close: p.close.filter((r) => !r.done.length) }
        const d = reminderDue(hours, now, { arrive: open.arrive.length, close: open.close.length }, shift)
        if (!d) return setDue(null)
        const st = readState(stateKey(userId, day, d.moment))
        if (st === 'skip' || (typeof st === 'number' && st > Date.now())) return setDue(null)
        setJobs(p[d.moment])
        setDue({ ...d, day })
      } catch {
        /* offline or signed out: try again on the next check */
      }
    },
    [enabled, hours, userId, who],
  )

  useEffect(() => {
    check(true)
    const t = window.setInterval(() => check(), 60_000)
    const onFocus = () => check(true)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [check])

  useEffect(() => {
    onVisible?.(Boolean(due))
  }, [due, onVisible])

  if (!due) return null
  const left = jobs.filter((j) => !j.done.length)
  const Icon = due.moment === 'arrive' ? Sun : Moon
  const key = stateKey(userId, due.day, due.moment)
  const hello = due.moment === 'arrive' ? `Good morning, ${first(who)}!` : `Almost done, ${first(who)}!`
  const what = due.moment === 'arrive' ? `Opening at ${timeLabel(due.at)}` : `Closing at ${timeLabel(due.at)}`

  async function tick(row: { task: HkTask; done: HkCheck[] }) {
    setBusy(true)
    try {
      if (row.done.length) {
        await undoHousekeeping({ data: { checkId: row.done.at(-1)!.id, staffName: who, dayKey: due!.day } })
      } else {
        const r = await checkHousekeeping({ data: { taskId: row.task.id, staffName: who, dayKey: due!.day } })
        if (!r.ok) toast(r.message)
      }
      await check(true)
    } finally {
      setBusy(false)
    }
  }

  async function allDone() {
    setBusy(true)
    try {
      for (const r of left) await checkHousekeeping({ data: { taskId: r.task.id, staffName: who, dayKey: due!.day } })
      toast(due!.moment === 'arrive' ? 'Shop’s open. Thank you!' : 'All closed up. Thank you!')
      writeState(key, 'skip')
      setDue(null)
    } finally {
      setBusy(false)
    }
  }

  const snooze = () => {
    writeState(key, Date.now() + REMIND.snooze * 60_000)
    setDue(null)
  }

  // A small card above the tab bar: never covers the screen. Tap it to open the list.
  return (
    <div
      className="fixed z-[45] left-3 right-3 bottom-[calc(76px+env(safe-area-inset-bottom))] min-[1060px]:left-auto min-[1060px]:right-6 min-[1060px]:bottom-6 min-[1060px]:w-[380px] print:hidden"
      role="region"
      aria-label="Clean-up reminder"
    >
      <div className="bg-white border border-line rounded-2xl shadow-lg">
        <div className="flex items-center gap-2.5 p-2.5">
          <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${due.moment === 'arrive' ? 'bg-gold-tint text-gold-ink' : 'bg-surface text-ink'}`}>
            <Icon size={18} />
          </span>
          <button type="button" className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <b className="block text-[14px] leading-tight truncate">{hello}</b>
            <span className="block text-[12px] text-ink-2 truncate">
              {what} · {left.length} {due.moment === 'arrive' ? 'opening' : 'closing'} job{left.length === 1 ? '' : 's'} left
            </span>
          </button>
          <button type="button" className="btn btn-text btn-sm !p-1" aria-label={open ? 'Hide jobs' : 'Show jobs'} onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button type="button" className="btn btn-text btn-sm !p-1" aria-label="Remind me in 15 minutes" onClick={snooze}>
            <X size={18} />
          </button>
        </div>
        {open && (
          <div className="px-2.5 pb-2.5">
            <ul className="list-none m-0 p-0 grid gap-1.5 max-h-[40vh] overflow-y-auto mb-2">
              {jobs.map((row) => {
                const done = row.done.length > 0
                const last = row.done.at(-1)
                return (
                  <li key={row.task.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => tick(row)}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 border-0 text-left cursor-pointer ${done ? 'bg-good-tint' : 'bg-surface'}`}
                    >
                      <span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${done ? 'bg-good text-white' : 'bg-white border-2 border-line'}`} aria-hidden>
                        {done && <Check size={14} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[14px] font-semibold ${done ? 'line-through opacity-70' : ''}`}>{row.task.name}</span>
                        {done && last && <span className="text-[11px] text-ink-2">{first(last.staffName)} did it</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="flex gap-2">
              <button type="button" className="btn btn-primary btn-sm flex-1" disabled={busy || left.length === 0} onClick={allDone}>
                All done
              </button>
              <button
                type="button"
                className="btn btn-text btn-sm"
                onClick={() => {
                  writeState(key, 'skip')
                  setDue(null)
                }}
              >
                Not today
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
