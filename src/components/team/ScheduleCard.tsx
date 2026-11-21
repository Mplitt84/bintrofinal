import { useEffect, useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { WEEKDAYS } from '@/lib/shop-hours'
import { scheduleLabel, type Schedule, type ScheduleDay } from '@/lib/scan-check'
import { getSchedules, saveScheduleFn } from '@/server/scan-check.functions'

const DEFAULT = { start: '10:00', end: '18:00' }

/**
 * Team page: "My schedule". Each person sets the days and hours they usually work; owners can
 * set anyone's. Reports → Scan check uses it to spot scans made in someone's name off their shift.
 */
export function ScheduleCard({ me, team, isOwner }: { me: string; team: string[]; isOwner: boolean }) {
  const toast = useToast()
  const [schedules, setSchedules] = useState<Schedule[] | null>(null)
  const [who, setWho] = useState(me || team[0] || '')
  const [days, setDays] = useState<ScheduleDay[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSchedules()
      .then((r) => setSchedules(r.schedules))
      .catch(() => setSchedules([]))
  }, [])
  useEffect(() => {
    if (!who && me) setWho(me)
  }, [me, who])

  const current = useMemo(() => schedules?.find((s) => s.staffName.toLowerCase() === who.toLowerCase())?.days ?? [], [schedules, who])
  useEffect(() => {
    setDays(current)
    setDirty(false)
  }, [current])

  if (!who) return null
  const set = (weekday: number, v: { start: string; end: string } | null) => {
    setDirty(true)
    setDays((cur) => {
      const rest = cur.filter((d) => d.weekday !== weekday)
      return v ? [...rest, { weekday, ...v }].sort((a, b) => a.weekday - b.weekday) : rest
    })
  }

  async function save() {
    if (days.some((d) => d.end <= d.start)) return toast('The end time has to be after the start time.')
    setSaving(true)
    try {
      const r = await saveScheduleFn({ data: { staffName: who, days } })
      if (!r.ok) return toast(r.message)
      setSchedules(r.schedules)
      toast(who === me ? 'Your schedule is saved' : `${who}’s schedule is saved`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white border border-line rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <h2 className="m-0 text-lg font-bold flex items-center gap-2 flex-1">
          <CalendarClock size={18} /> {who === me ? 'My schedule' : `${who}’s schedule`}
        </h2>
        {isOwner && team.length > 1 && (
          <select className="field-input !w-auto !py-1.5 text-sm" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Whose schedule">
            {[...new Set([me, ...team].filter(Boolean))].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="text-[13px] text-ink-2 mt-0 mb-3">
        The days and hours {who === me ? 'you usually work' : 'they usually work'}. Scans made in {who === me ? 'your' : 'their'} name outside these hours show up for the owner to
        double-check.
        {current.length > 0 && !dirty && <span className="block mt-1 text-ink">{scheduleLabel(current)}</span>}
      </p>
      {!schedules ? (
        <div className="skel h-24 rounded-xl" />
      ) : (
        <ul className="list-none m-0 p-0 grid gap-1.5">
          {WEEKDAYS.map((name, d) => {
            const day = days.find((x) => x.weekday === d)
            return (
              <li key={name} className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-2 w-32 text-sm font-semibold">
                  <input type="checkbox" checked={Boolean(day)} onChange={(e) => set(d, e.target.checked ? DEFAULT : null)} />
                  {name}
                </label>
                {day ? (
                  <span className="flex items-center gap-1.5 text-sm">
                    <input className="field-input !w-auto !py-1.5" type="time" value={day.start} onChange={(e) => set(d, { start: e.target.value, end: day.end })} aria-label={`${name} start`} />
                    to
                    <input className="field-input !w-auto !py-1.5" type="time" value={day.end} onChange={(e) => set(d, { start: day.start, end: e.target.value })} aria-label={`${name} end`} />
                  </span>
                ) : (
                  <span className="text-sm text-ink-2">Off</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {dirty && (
        <button type="button" className="btn btn-primary btn-sm mt-3" disabled={saving} onClick={save}>
          Save schedule
        </button>
      )}
    </section>
  )
}
