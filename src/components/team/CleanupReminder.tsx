import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Moon, Sun, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { lockScroll } from '@/lib/scroll-lock'
import type { HkCheck, HkTask } from '@/lib/housekeeping'
import { REMIND, momentProgress, reminderDue, timeLabel, type ShopHours } from '@/lib/shop-hours'
import { checkHousekeeping, getHousekeeping, undoHousekeeping } from '@/server/housekeeping.functions'

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
  const lastFetch = useRef(0)
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
        const b = await getHousekeeping({ data: { dayKey: day, weekday: now.getDay() } })
        const p = momentProgress(b.tasks, b.history, day)
        const open = { arrive: p.arrive.filter((r) => !r.done.length), close: p.close.filter((r) => !r.done.length) }
        const d = reminderDue(hours, now, { arrive: open.arrive.length, close: open.close.length })
        if (!d) return setDue(null)
        const st = readState(stateKey(userId, day, d.moment))
        if (st === 'skip' || (typeof st === 'number' && st > Date.now())) return setDue(null)
        setJobs(p[d.moment])
        setDue({ ...d, day })
      } catch {
        /* offline or signed out: try again on the next check */
      }
    },
    [enabled, hours, userId],
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
    if (!due) return
    return lockScroll()
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

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="cleanup-reminder-title">
      <div className="bg-white rounded-3xl w-full max-w-[420px] max-h-[85vh] overflow-y-auto p-5 shadow-xl">
        <div className="flex items-start gap-3 mb-3">
          <span className={`w-11 h-11 rounded-full grid place-items-center shrink-0 ${due.moment === 'arrive' ? 'bg-gold-tint text-gold-ink' : 'bg-surface text-ink'}`}>
            <Icon size={22} />
          </span>
          <div className="flex-1">
            <h2 id="cleanup-reminder-title" className="m-0 text-lg font-bold">
              {hello}
            </h2>
            <p className="m-0 text-sm text-ink-2">
              {what} · {left.length} {due.moment === 'arrive' ? 'opening' : 'closing'} job{left.length === 1 ? '' : 's'} left
            </p>
          </div>
          <button
            type="button"
            className="btn btn-text btn-sm !p-1"
            aria-label="Remind me later"
            onClick={() => {
              writeState(key, Date.now() + REMIND.snooze * 60_000)
              setDue(null)
            }}
          >
            <X size={18} />
          </button>
        </div>
        <ul className="list-none m-0 p-0 grid gap-2 mb-4">
          {jobs.map((row) => {
            const done = row.done.length > 0
            const last = row.done.at(-1)
            return (
              <li key={row.task.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => tick(row)}
                  className={`w-full flex items-center gap-3 rounded-2xl p-3 border-0 text-left cursor-pointer ${done ? 'bg-good-tint' : 'bg-surface'}`}
                >
                  <span className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${done ? 'bg-good text-white' : 'bg-white border-2 border-line'}`} aria-hidden>
                    {done && <Check size={16} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <b className={`block text-[15px] ${done ? 'line-through opacity-70' : ''}`}>{row.task.name}</b>
                    {done && last && <span className="text-[12px] text-ink-2">{first(last.staffName)} did it</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="grid gap-2">
          <button type="button" className="btn btn-primary" disabled={busy || left.length === 0} onClick={allDone}>
            All done
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-tonal flex-1"
              onClick={() => {
                writeState(key, Date.now() + REMIND.snooze * 60_000)
                setDue(null)
              }}
            >
              In {REMIND.snooze} min
            </button>
            <button
              type="button"
              className="btn btn-text flex-1"
              onClick={() => {
                writeState(key, 'skip')
                setDue(null)
              }}
            >
              Not working today
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
