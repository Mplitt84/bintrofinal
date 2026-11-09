import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { centsToDollars } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import type { CountLineDetail, CountSummary } from '@/lib/counts'
import { getCount, undoStockCount } from '@/server/counts.functions'

const money = (cents: number) => `${cents < 0 ? '−' : ''}$${centsToDollars(Math.abs(cents))}`

/**
 * One approved count: what changed and why, and "Undo this count", which puts
 * every product it changed back (two taps) and marks it undone in history.
 */
export function CountDetailSheet({
  countId,
  staffName,
  onClose,
  onUndone,
}: {
  countId: number | null
  staffName: string
  onClose: () => void
  onUndone: () => void | Promise<void>
}) {
  const toast = useToast()
  const [data, setData] = useState<{ count: CountSummary; lines: CountLineDetail[] } | null | 'missing'>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setData(null)
    setConfirm(false)
    if (countId == null) return
    getCount({ data: { countId } })
      .then((d) => setData(d ?? 'missing'))
      .catch(() => setData('missing'))
  }, [countId])

  const undo = async () => {
    if (countId == null) return
    if (!confirm) return setConfirm(true)
    setBusy(true)
    const r = await undoStockCount({ data: { countId, staffName } })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    toast(`Count #${countId} undone. ${r.reversed} product${r.reversed === 1 ? '' : 's'} put back.`)
    await onUndone()
    onClose()
  }

  const changed = data && data !== 'missing' ? data.lines.filter((l) => l.diff !== 0) : []
  const c = data && data !== 'missing' ? data.count : null

  return (
    <Sheet open={countId != null} onClose={onClose} title={countId ? `Count #${countId}` : 'Count'} subtitle={c ? c.scope : undefined}>
      {data === null ? (
        <p className="text-ink-2 text-sm">Loading…</p>
      ) : data === 'missing' || !c ? (
        <p className="text-ink-2 text-sm">That count isn’t in the history any more.</p>
      ) : (
        <>
          <p className="text-[13px] text-ink-2 mt-0">
            {new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            {c.staffName && ` · ${c.staffName}`} · {c.itemsCounted} counted · {c.itemsChanged} adjusted · net {money(c.valueDiffCents)}
            {c.blind && ' · blind'}
          </p>
          {c.undoneAt && (
            <div className="bg-surface rounded-xl px-3.5 py-2.5 text-sm mb-3">
              <b>Undone</b> {new Date(c.undoneAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {c.undoneBy && ` by ${c.undoneBy}`}. These changes were put back.
            </div>
          )}
          {changed.length === 0 ? (
            <p className="text-sm">Everything matched. Nothing was changed.</p>
          ) : (
            <ul className="list-none m-0 p-0 max-h-[46vh] overflow-auto">
              {changed.map((l) => (
                <li key={l.productId} className="flex justify-between gap-3 py-2 border-b border-line last:border-b-0 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{l.name}</span>
                    <span className="text-ink-2 text-[12px]">{l.reason || 'No reason given'}</span>
                  </span>
                  <span className="num whitespace-nowrap text-right">
                    {l.expected} → {l.counted}
                    <span className={`block text-[12px] ${l.diff < 0 ? 'text-bad' : 'text-good'}`}>
                      {l.diff > 0 ? '+' : ''}
                      {l.diff}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!c.undoneAt && changed.length > 0 && (
            <p className="text-[12px] text-ink-2 mb-0">
              Undo puts every product above back by the amount this count changed it. Scans made since then are kept.
            </p>
          )}
        </>
      )}
      <SheetActions>
        <button type="button" className="btn btn-tonal" onClick={onClose}>
          Close
        </button>
        {c && !c.undoneAt && changed.length > 0 && (
          <button type="button" className="btn btn-danger" disabled={busy} onClick={undo}>
            <RotateCcw size={16} /> {busy ? 'Undoing…' : confirm ? `Tap again to undo ${changed.length}` : 'Undo this count'}
          </button>
        )}
      </SheetActions>
    </Sheet>
  )
}
