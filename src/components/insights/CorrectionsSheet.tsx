import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useMoney } from '@/components/business/BusinessContext'
import { useToast } from '@/components/ui/Toast'
import { toastUndo } from '@/components/ui/undo'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { EDITABLE_REASONS, KIND_LABEL, correctionKind, reasonFor, sourceLabel, splitNote, type CorrectionKind } from '@/lib/corrections'
import { getCorrections, refileCorrectionsFn } from '@/server/corrections.functions'
import { undoStockCount } from '@/server/counts.functions'

type Row = Awaited<ReturnType<typeof getCorrections>>['rows'][number]
type Classified = Row & { kind: CorrectionKind; reason: string; cents: number; units: number; source: string; countId: number | null }

/** A single correction worth a second look: a big one, or a loss with no reason. */
const BIG_CENTS = 10_000
const BIG_UNITS = 10

/**
 * Reports → Lost to corrections: every correction that lowered stock in the period, so the
 * owner can double-check it. Losses first and biggest first; each can be re-filed under the
 * right reason (a record fix, used / sold but not scanned, or a real loss), a whole count can
 * be undone, and everything undoes from the toast.
 */
export function CorrectionsSheet({
  start,
  end,
  title,
  staffName,
  onClose,
  onChanged,
}: {
  start: Date
  end: Date
  title: string
  staffName: string
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const { money } = useMoney()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [show, setShow] = useState<CorrectionKind | 'check'>('loss')
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setRows((await getCorrections({ data: { start: start.toISOString(), end: end.toISOString() } })).rows)
    } catch {
      setFailed(true)
    }
  }, [start, end])
  useEffect(() => {
    load()
  }, [load])

  const all: Classified[] = useMemo(
    () =>
      (rows ?? []).map((r) => {
        const units = -r.delta
        const source = splitNote(r.note).source
        return {
          ...r,
          units,
          cents: units * r.unitCostCents,
          kind: correctionKind(r.note, r.delta) ?? 'fix',
          reason: reasonFor(r.note),
          source,
          countId: Number(/^Count #(\d+)/.exec(source)?.[1]) || null,
        }
      }),
    [rows],
  )
  const totals = useMemo(() => {
    const t: Record<CorrectionKind, { n: number; cents: number }> = { loss: { n: 0, cents: 0 }, used: { n: 0, cents: 0 }, sold: { n: 0, cents: 0 }, fix: { n: 0, cents: 0 } }
    for (const r of all) {
      t[r.kind].n++
      t[r.kind].cents += r.cents
    }
    return t
  }, [all])
  const toCheck = all.filter((r) => r.kind === 'loss' && (r.cents >= BIG_CENTS || r.units >= BIG_UNITS || r.reason === 'No reason given' || r.unitCostCents <= 0))
  const shown = (show === 'check' ? toCheck : all.filter((r) => r.kind === show)).sort((a, b) => b.cents - a.cents)

  async function refile(ids: number[], reason: (typeof EDITABLE_REASONS)[number]) {
    setBusy(true)
    try {
      const r = await refileCorrectionsFn({ data: { ids, reason } })
      setPicked(new Set())
      await load()
      onChanged()
      toastUndo(toast, `${r.changed} correction${r.changed === 1 ? '' : 's'} filed as “${reason}”`, r.undoId, async () => {
        await load()
        onChanged()
      })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Only owners can re-file corrections.')
    } finally {
      setBusy(false)
    }
  }

  async function undoCount(countId: number) {
    const r = await undoStockCount({ data: { countId, staffName } })
    if (!r.ok) return toast(r.message)
    await load()
    onChanged()
    toast(`Count #${countId} undone — its changes were reversed.`)
  }

  const toggle = (id: number) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <Sheet open onClose={onClose} title="Lost to corrections" subtitle={`${title}. Every time a count or edit lowered stock — check each one is really a loss.`} wide>
      {failed ? (
        <p className="text-sm text-ink-2">Couldn’t load the corrections. Only owners can open this.</p>
      ) : !rows ? (
        <div className="skel h-40 rounded-xl" />
      ) : (
        <>
          <div className="grid grid-cols-2 min-[600px]:grid-cols-4 gap-2 mb-3">
            {(['loss', 'used', 'sold', 'fix'] as CorrectionKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setShow(k)}
                className={`rounded-xl px-3 py-2 text-left border-0 cursor-pointer ${show === k ? 'bg-ink text-white' : 'bg-surface'}`}
              >
                <span className="block text-[11px] uppercase font-semibold opacity-80">{KIND_LABEL[k]}</span>
                <b className="block text-[16px]">{money(totals[k].cents)}</b>
                <span className="block text-[11px] opacity-80">{totals[k].n} correction{totals[k].n === 1 ? '' : 's'}</span>
              </button>
            ))}
          </div>
          {toCheck.length > 0 && (
            <button type="button" className={`chip mb-3 ${show === 'check' ? '' : ''}`} aria-pressed={show === 'check'} onClick={() => setShow('check')}>
              <AlertTriangle size={13} className="inline -mt-0.5" /> Check these first · {toCheck.length}
            </button>
          )}
          <p className="text-[12px] text-ink-2 mt-0 mb-2">
            Only “Lost” counts toward Lost to corrections. Re-filing never changes the shelf count — it says why it changed. Big ones (over {money(BIG_CENTS)} or {BIG_UNITS}+
            units), ones with no reason and items with no cost are in “Check these first”.
          </p>

          {picked.size > 0 && (
            <div className="sticky top-0 z-10 bg-white border border-line rounded-xl p-2 mb-2 flex flex-wrap items-center gap-2">
              <b className="text-sm">{picked.size} picked — file as</b>
              <select
                className="field-input !w-auto !py-1.5 text-sm"
                defaultValue=""
                disabled={busy}
                onChange={(e) => e.target.value && refile([...picked], e.target.value as (typeof EDITABLE_REASONS)[number])}
                aria-label="File picked corrections as"
              >
                <option value="">Choose…</option>
                {EDITABLE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-text btn-sm" onClick={() => setPicked(new Set())}>
                Clear
              </button>
            </div>
          )}

          {shown.length === 0 ? (
            <p className="text-sm text-ink-2">None here.</p>
          ) : (
            <ul className="list-none m-0 p-0 divide-y divide-line">
              {shown.slice(0, 400).map((r) => (
                <li key={r.id} className="py-2.5 flex gap-2.5 items-start">
                  <input type="checkbox" className="mt-1" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Pick ${r.name}`} />
                  <span className="flex-1 min-w-0">
                    <b className="block text-[14px] truncate">{r.name}</b>
                    <span className="block text-[12px] text-ink-2">
                      −{r.units} · {sourceLabel(r.note)}
                      {r.countId ? ` #${r.countId}` : ''} · {r.staffName || 'no name'}
                      {r.signedInAs && r.signedInAs !== r.staffName ? ` (signed in: ${r.signedInAs})` : ''} ·{' '}
                      {new Date(r.at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 mt-1">
                      <select
                        className="field-input !w-auto !py-1 text-[13px]"
                        value={(EDITABLE_REASONS as readonly string[]).includes(r.reason) ? r.reason : ''}
                        disabled={busy}
                        onChange={(e) => e.target.value && refile([r.id], e.target.value as (typeof EDITABLE_REASONS)[number])}
                        aria-label={`Reason for ${r.name}`}
                      >
                        <option value="">{r.reason || 'No reason'}</option>
                        {EDITABLE_REASONS.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                      {r.countId && (
                        <button type="button" className="btn btn-text btn-sm !px-1" onClick={() => undoCount(r.countId!)}>
                          Undo count #{r.countId}
                        </button>
                      )}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <b className="block text-[14px] tabular-nums">{r.unitCostCents > 0 ? money(r.cents) : '—'}</b>
                    {r.unitCostCents <= 0 && <span className="block text-[11px] text-warn">no cost</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <SheetActions>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </SheetActions>
    </Sheet>
  )
}
