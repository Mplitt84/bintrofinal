import { useEffect, useState } from 'react'
import { BadgeCheck, Minus, Plus } from 'lucide-react'
import type { Product } from '@/components/inventory/types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { Thumb, centsToDollars } from '@/components/ui/bits'
import { COUNT_REASONS, lastCountedLabel } from '@/lib/counts'

/**
 * Check mode on the Scan tab: shows what a scanned SKU is (nothing changes),
 * then lets staff confirm the shelf count ("Matches") or save a different one
 * with a reason. Saved checks go to Count history as a one-item "Spot check".
 */
export function CheckProductSheet({
  product,
  matchedCode,
  onClose,
  onSave,
}: {
  product: Product | null
  /** The code that was scanned (main barcode or an extra SKU). */
  matchedCode: string
  onClose: () => void
  onSave: (product: Product, counted: number, reason: string) => Promise<void>
}) {
  const [counted, setCounted] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setCounted('')
    setReason('')
    setBusy(false)
  }, [product?.id, matchedCode])

  if (!product) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const onHand = product.qty
  const n = counted.trim() === '' ? null : Math.max(0, Math.trunc(Number(counted)))
  const diff = n == null || Number.isNaN(n) ? null : n - onHand
  const viaExtra = matchedCode && matchedCode !== product.barcode
  const save = async (value: number, why: string) => {
    setBusy(true)
    try {
      await onSave(product, value, why)
    } finally {
      setBusy(false)
    }
  }
  const step = (d: number) => setCounted(String(Math.max(0, (n ?? onHand) + d)))

  return (
    <Sheet open onClose={onClose} title="Check SKU" subtitle="Nothing changes until you save a count.">
      <div className="flex items-center gap-3 mb-3">
        <Thumb imageUrl={product.imageUrl} label={product.brand || product.name} size="lg" />
        <div className="min-w-0">
          <div className="font-bold text-[17px] leading-tight">{product.name}</div>
          <div className="text-[13px] text-ink-2 truncate">{[product.brand, product.size, product.category].filter(Boolean).join(' · ')}</div>
        </div>
      </div>

      <div className="bg-good-tint text-good rounded-xl px-3.5 py-2 text-sm flex items-center gap-2 mb-3">
        <BadgeCheck size={17} />
        <span>
          SKU matches <b className="num">{matchedCode}</b>
          {viaExtra && <span className="text-ink-2"> (extra SKU; main {product.barcode})</span>}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 m-0 mb-3 text-center">
        <Stat label="On hand" value={String(onHand)} strong />
        <Stat label="Reorder at" value={String(product.reorderThreshold)} />
        <Stat label="Order up to" value={product.maxQty ? String(product.maxQty) : '—'} />
        <Stat label="Cost" value={product.unitCostCents ? `$${centsToDollars(product.unitCostCents)}` : '—'} />
        <Stat label="Retail" value={product.retailPriceCents ? `$${centsToDollars(product.retailPriceCents)}` : '—'} />
        <Stat label="Vendor" value={product.vendor || '—'} />
      </dl>
      <p className="text-[12px] text-ink-2 mt-0 mb-4">{lastCountedLabel(product)}</p>

      <h3 className="text-[15px] font-bold m-0 mb-2">Verify the count</h3>
      <div className="flex items-center gap-2 mb-3">
        <button type="button" aria-label="One fewer" className="w-11 h-11 rounded-full border border-line bg-white grid place-items-center cursor-pointer" onClick={() => step(-1)}>
          <Minus size={18} />
        </button>
        <input
          className="field-input num text-center text-xl !w-28"
          inputMode="numeric"
          placeholder={String(onHand)}
          aria-label="How many are on the shelf"
          value={counted}
          onChange={(e) => setCounted(e.target.value.replace(/[^\d]/g, ''))}
        />
        <button type="button" aria-label="One more" className="w-11 h-11 rounded-full border border-line bg-white grid place-items-center cursor-pointer" onClick={() => step(1)}>
          <Plus size={18} />
        </button>
        <span className="text-sm text-ink-2 ml-1">
          {diff == null ? 'on the shelf' : diff === 0 ? 'Matches' : `${diff > 0 ? '+' : ''}${diff} vs Bintro`}
        </span>
      </div>

      {diff != null && diff !== 0 && (
        <>
          <p className="text-[13px] font-semibold m-0 mb-1.5">Why is it different?</p>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {COUNT_REASONS.map((r) => (
              <button key={r} type="button" className="chip !text-[12px] !py-1" aria-pressed={reason === r} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
        </>
      )}

      <SheetActions>
        {diff == null || diff === 0 ? (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(onHand, '')}>
            <BadgeCheck size={17} /> {busy ? 'Saving…' : `Count matches · ${onHand}`}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy || !reason} onClick={() => save(n!, reason)}>
            {busy ? 'Saving…' : reason ? `Save count · ${n}` : 'Pick a reason'}
          </button>
        )}
        <button type="button" className="btn btn-tonal" onClick={onClose}>
          Done
        </button>
      </SheetActions>
    </Sheet>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bg-surface rounded-xl px-2 py-2 min-w-0">
      <dt className="text-[11px] text-ink-2">{label}</dt>
      <dd className={`m-0 num truncate ${strong ? 'text-xl font-bold' : 'text-sm font-semibold'}`}>{value}</dd>
    </div>
  )
}
