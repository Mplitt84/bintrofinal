import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, ShieldAlert, UserCheck } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { toastUndo } from '@/components/ui/undo'
import { EmptyState } from '@/components/ui/bits'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { flagScans, flagsByPerson, scheduleLabel, type FlaggedScan, type Schedule } from '@/lib/scan-check'
import { getScanCheck, reassignScansFn } from '@/server/scan-check.functions'

const DISMISS_KEY = 'bintro.scanCheckOk'
const PERIODS = [7, 14, 30] as const

function readOk(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as number[])
  } catch {
    return new Set()
  }
}
function writeOk(s: Set<number>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...s].slice(-2000)))
  } catch {
    /* storage blocked: the flag just stays */
  }
}

/**
 * Reports → Scan check (owner): scans saved under someone's name while a different person was
 * signed in, and scans at times that person wasn't scheduled. Questions to ask, not proof.
 * Each one can be moved to the right person (undoable) or marked fine on this device.
 */
export function ScanCheckView({ team }: { team: string[] }) {
  const toast = useToast()
  const [days, setDays] = useState<number>(14)
  const [data, setData] = useState<{ rows: Parameters<typeof flagScans>[0]; schedules: Schedule[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [ok, setOk] = useState<Set<number>>(() => new Set())
  const [person, setPerson] = useState<string | null>(null)
  const [moving, setMoving] = useState<FlaggedScan[] | null>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      setData(await getScanCheck({ data: { days } }))
    } catch {
      setFailed(true)
    }
  }, [days])
  useEffect(() => {
    setOk(readOk())
    load()
  }, [load])

  const flagged = useMemo(() => (data ? flagScans(data.rows, data.schedules).filter((f) => !ok.has(f.id)) : []), [data, ok])
  const people = useMemo(() => flagsByPerson(flagged), [flagged])
  const shown = person ? flagged.filter((f) => f.staffName.trim().toLowerCase() === person.toLowerCase()) : flagged
  const signedInScans = data?.rows.filter((r) => r.signedInAs).length ?? 0
  const noSchedule = team.filter((n) => !data?.schedules.some((s) => s.staffName.toLowerCase() === n.toLowerCase()))

  function markFine(ids: number[]) {
    const next = new Set(ok)
    ids.forEach((i) => next.add(i))
    writeOk(next)
    setOk(next)
  }

  return (
    <>
      <p className="text-sm text-ink-2 mt-0 mb-3">
        Scans saved under someone’s name while a different person was signed in, or made when that person wasn’t scheduled. Someone may have covered a shift, so treat these as
        questions to ask, not proof.
      </p>
      <div className="flex gap-1.5 mb-4" role="group" aria-label="Period">
        {PERIODS.map((d) => (
          <button key={d} type="button" className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>
            Last {d} days
          </button>
        ))}
      </div>

      {failed ? (
        <EmptyState title="The scan check didn’t load">Only owners can open it. Try again in a moment.</EmptyState>
      ) : !data ? (
        <div className="skel h-32 rounded-2xl" />
      ) : (
        <>
          {people.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button type="button" className="chip" aria-pressed={person === null} onClick={() => setPerson(null)}>
                Everyone · {flagged.length}
              </button>
              {people.map((p) => (
                <button key={p.name} type="button" className="chip" aria-pressed={person === p.name} onClick={() => setPerson(p.name)}>
                  {p.name} · {p.total}
                </button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <EmptyState title="Nothing to check">
              {signedInScans === 0
                ? 'No scans here were made by someone signed in yet. This fills in as your team signs in and scans.'
                : 'Every scan matches who was signed in and their schedule.'}
            </EmptyState>
          ) : (
            <>
              <div className="flex gap-2 mb-2 flex-wrap">
                <button type="button" className="btn btn-tonal btn-sm" onClick={() => setMoving(shown)}>
                  <UserCheck size={14} /> Move these {shown.length} to…
                </button>
                <button type="button" className="btn btn-text btn-sm" onClick={() => markFine(shown.map((s) => s.id))}>
                  These are fine
                </button>
              </div>
              <ul className="list-none m-0 p-0 grid gap-2">
                {shown.slice(0, 200).map((f) => (
                  <li key={f.id} className="bg-white border border-line rounded-2xl p-3">
                    <div className="flex items-start gap-2">
                      {f.flags.includes('other-login') ? (
                        <ShieldAlert size={18} className="text-bad shrink-0 mt-0.5" />
                      ) : (
                        <CalendarClock size={18} className="text-warn shrink-0 mt-0.5" />
                      )}
                      <span className="flex-1 min-w-0">
                        <b className="block text-[15px] truncate">
                          {f.productName} <span className="font-normal text-ink-2">· {f.type === 'out' ? 'out' : f.type === 'adjust' ? 'count' : 'in'} {Math.abs(f.delta)}</span>
                        </b>
                        <span className="block text-[12px] text-ink-2">
                          Saved as {f.staffName} · {new Date(f.at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {f.why.map((w) => (
                          <span key={w} className="block text-[13px]">
                            {w}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="flex gap-1 justify-end mt-1">
                      {f.signedInAs && f.flags.includes('other-login') && (
                        <button
                          type="button"
                          className="btn btn-text btn-sm"
                          onClick={async () => {
                            const r = await reassignScansFn({ data: { ids: [f.id], staffName: f.signedInAs } })
                            if (!r.ok) return toast(r.message)
                            await load()
                            toastUndo(toast, `Moved to ${f.signedInAs}`, r.undoId, load)
                          }}
                        >
                          It was {f.signedInAs.split(' ')[0]}
                        </button>
                      )}
                      <button type="button" className="btn btn-text btn-sm" onClick={() => setMoving([f])}>
                        Someone else…
                      </button>
                      <button type="button" className="btn btn-text btn-sm" onClick={() => markFine([f.id])}>
                        It’s fine
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <section className="mt-6">
            <h3 className="text-sm font-bold mb-1.5">Schedules on file</h3>
            <ul className="list-none m-0 p-0 text-sm grid gap-1">
              {data.schedules.map((s) => (
                <li key={s.staffName}>
                  <b>{s.staffName}</b> <span className="text-ink-2">· {scheduleLabel(s.days) || 'no days set'}</span>
                </li>
              ))}
            </ul>
            {noSchedule.length > 0 && (
              <p className="text-[13px] text-ink-2 mt-2">
                No schedule yet for {noSchedule.join(', ')} — their scans are only checked against who was signed in. Each person sets theirs on the Team page.
              </p>
            )}
          </section>
        </>
      )}

      {moving && (
        <MoveSheet
          count={moving.length}
          team={team}
          onClose={() => setMoving(null)}
          onPick={async (name) => {
            const r = await reassignScansFn({ data: { ids: moving.map((m) => m.id), staffName: name } })
            setMoving(null)
            if (!r.ok) return toast(r.message)
            await load()
            toastUndo(toast, `Moved ${r.moved} scan${r.moved === 1 ? '' : 's'} to ${name}`, r.undoId, load)
          }}
        />
      )}
    </>
  )
}

function MoveSheet({ count, team, onClose, onPick }: { count: number; team: string[]; onClose: () => void; onPick: (name: string) => void }) {
  return (
    <Sheet open onClose={onClose} title={`Who really made ${count === 1 ? 'this scan' : `these ${count} scans`}?`} subtitle="Their reports and Showstopper will count it. Undo puts it back.">
      <div className="flex flex-wrap gap-2">
        {team.map((n) => (
          <button key={n} type="button" className="chip" onClick={() => onPick(n)}>
            {n}
          </button>
        ))}
      </div>
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
      </SheetActions>
    </Sheet>
  )
}
