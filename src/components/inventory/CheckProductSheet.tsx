import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Minus, Plus } from 'lucide-react'
import type { Product } from '@/components/inventory/types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { Thumb, centsToDollars } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { useBusiness } from '@/components/business/BusinessContext'
import { CHECK_REASONS, lastCountedLabel } from '@/lib/counts'
import { updateProduct } from '@/server/inventory.functions'

type Details = {
  name: string
  brand: string
  size: string
  category: string
  vendor: string
  reorderThreshold: string
  maxQty: string
  cost: string
  retail: string
}

const toDetails = (p: Product): Details => ({
  name: p.name,
  brand: p.brand,
  size: p.size,
  category: p.category,
  vendor: p.vendor,
  reorderThreshold: String(p.reorderThreshold),
  maxQty: p.maxQty ? String(p.maxQty) : '',
  cost: p.unitCostCents ? centsToDollars(p.unitCostCents) : '',
  retail: p.retailPriceCents ? centsToDollars(p.retailPriceCents) : '',
})

const cents = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
const whole = (v: string) => Math.max(0, Math.trunc(Number(v.replace(/[^\d]/g, '')) || 0))

/**
 * Check mode on the Scan tab: what a scanned SKU is, with its details editable
 * in place, then "verify the count". Nothing changes until staff save. Saved
 * counts go to Count history as a one-item "Spot check".
 */
export function CheckProductSheet({
  product,
  matchedCode,
  onClose,
  onSave,
  onUpdated,
}: {
  product: Product | null
  /** The code that was scanned (main barcode or an extra SKU). */
  matchedCode: string
  onClose: () => void
  onSave: (product: Product, counted: number, reason: string) => Promise<void>
  /** Product details were edited and saved. */
  onUpdated: (product: Product) => void
}) {
  const toast = useToast()
  const { categories } = useBusiness()
  const [current, setCurrent] = useState<Product | null>(product)
  const [details, setDetails] = useState<Details | null>(product ? toDetails(product) : null)
  const [counted, setCounted] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)

  useEffect(() => {
    setCurrent(product)
    setDetails(product ? toDetails(product) : null)
    setCounted('')
    setReason('')
    setBusy(false)
    // Only a new scan resets the sheet; saving details here mustn't clear a count in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, matchedCode])

  const dirty = useMemo(() => {
    if (!current || !details) return false
    const base = toDetails(current)
    return (Object.keys(base) as (keyof Details)[]).some((k) => base[k].trim() !== details[k].trim())
  }, [current, details])

  if (!current || !details) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const onHand = current.qty
  const n = counted.trim() === '' ? null : Math.max(0, Math.trunc(Number(counted)))
  const diff = n == null || Number.isNaN(n) ? null : n - onHand
  const viaExtra = matchedCode && matchedCode !== current.barcode
  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDetails((d) => (d ? { ...d, [k]: e.target.value } : d))
  const categoryNames = Array.from(new Set([...categories.map((c) => c.name), current.category].filter(Boolean))).sort()

  const saveDetails = async () => {
    if (!details.name.trim()) return toast('The product needs a name.')
    setSavingDetails(true)
    try {
      const updated = (await updateProduct({
        data: {
          productId: current.id,
          name: details.name.trim(),
          brand: details.brand.trim(),
          size: details.size.trim(),
          category: details.category.trim(),
          vendor: details.vendor.trim(),
          reorderThreshold: whole(details.reorderThreshold),
          maxQty: whole(details.maxQty),
          unitCostCents: cents(details.cost),
          retailPriceCents: cents(details.retail),
        },
      })) as Product | null
      if (updated) {
        setCurrent(updated)
        setDetails(toDetails(updated))
        onUpdated(updated)
      }
      toast('Product details saved')
    } catch {
      toast('Couldn’t save the details. Try again.')
    } finally {
      setSavingDetails(false)
    }
  }

  const saveCount = async (value: number, why: string) => {
    if (dirty) await saveDetails()
    setBusy(true)
    try {
      await onSave(current, value, why)
    } finally {
      setBusy(false)
    }
  }
  const step = (d: number) => setCounted(String(Math.max(0, (n ?? onHand) + d)))

  return (
    <Sheet open onClose={onClose} title="Check SKU" subtitle="Edit anything that’s wrong. Stock only changes if you save a different count.">
      <div className="flex items-center gap-3 mb-3">
        <Thumb imageUrl={current.imageUrl} label={details.brand || details.name} size="lg" />
        <div className="bg-good-tint text-good rounded-xl px-3 py-2 text-sm flex items-center gap-2 flex-1 min-w-0">
          <BadgeCheck size={17} className="shrink-0" />
          <span className="min-w-0">
            SKU matches <b className="num break-all">{matchedCode}</b>
            {viaExtra && <span className="text-ink-2 block text-[12px]">Extra SKU · main {current.barcode}</span>}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input label="Product name" value={details.name} onChange={set('name')} wide />
        <Input label="Brand" value={details.brand} onChange={set('brand')} />
        <Input label="Size" value={details.size} onChange={set('size')} />
        <label className="block">
          <span className="text-[12px] text-ink-2">Category</span>
          <select className="field-input !py-2" value={details.category} onChange={set('category')}>
            <option value="">No category</option>
            {categoryNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <Input label="Vendor" value={details.vendor} onChange={set('vendor')} />
        <Input label="Reorder at" value={details.reorderThreshold} onChange={set('reorderThreshold')} numeric />
        <Input label="Order up to" value={details.maxQty} onChange={set('maxQty')} numeric placeholder="Back to par" />
        <Input label="Cost $" value={details.cost} onChange={set('cost')} decimal />
        <Input label="Retail $" value={details.retail} onChange={set('retail')} decimal />
      </div>
      {dirty && (
        <button type="button" className="btn btn-tonal btn-sm w-full mb-2" disabled={savingDetails} onClick={saveDetails}>
          {savingDetails ? 'Saving…' : 'Save details'}
        </button>
      )}
      <p className="text-[12px] text-ink-2 mt-0 mb-4">{lastCountedLabel(current)}</p>

      <h3 className="text-[15px] font-bold m-0 mb-2">
        Verify the count <span className="text-ink-2 font-normal text-sm">· Bintro says {onHand}</span>
      </h3>
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
            {CHECK_REASONS.map((r) => (
              <button key={r} type="button" className="chip !text-[13px]" aria-pressed={reason === r} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
        </>
      )}

      <SheetActions>
        {diff == null || diff === 0 ? (
          <button type="button" className="btn btn-primary" disabled={busy || savingDetails} onClick={() => saveCount(onHand, '')}>
            <BadgeCheck size={17} /> {busy ? 'Saving…' : `Count matches · ${onHand}`}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy || savingDetails || !reason} onClick={() => saveCount(n!, reason)}>
            {busy ? 'Saving…' : reason ? `Save count · ${n}` : 'Pick a reason'}
          </button>
        )}
        <button type="button" className="btn btn-tonal" onClick={onClose}>
          {dirty ? 'Close without saving' : 'Done'}
        </button>
      </SheetActions>
    </Sheet>
  )
}

function Input({
  label,
  value,
  onChange,
  wide,
  numeric,
  decimal,
  placeholder,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  wide?: boolean
  numeric?: boolean
  decimal?: boolean
  placeholder?: string
}) {
  return (
    <label className={`block min-w-0 ${wide ? 'col-span-2' : ''}`}>
      <span className="text-[12px] text-ink-2">{label}</span>
      <input
        className="field-input !py-2"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={numeric ? 'numeric' : decimal ? 'decimal' : undefined}
      />
    </label>
  )
}
