import { useEffect, useMemo, useState } from 'react'
import type { Product } from './types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { bulkUpdateProducts } from '@/server/inventory.functions'
import { SHELF_LIFE_OPTIONS, expiryLabel, isExpiryDate, monthsFromToday } from '@/lib/expiry'

type Expiry = { mode: 'keep' } | { mode: 'none' } | { mode: 'clear' } | { mode: 'date'; value: string }

const toCents = (v: string) => Math.max(0, Math.round((Number(v.replace(/[$,\s]/g, '')) || 0) * 100))
const toInt = (v: string, min: number) => Math.max(min, Math.trunc(Number(v) || 0))

/**
 * Bulk edit: set the same details on every selected product. Anything left blank
 * stays as it is on each product. Counts are never changed here.
 */
export function BulkEditSheet({
  open,
  products,
  onClose,
  onDone,
}: {
  open: boolean
  products: Product[]
  onClose: () => void
  onDone: () => void | Promise<void>
}) {
  const toast = useToast()
  const [category, setCategory] = useState('')
  const [vendor, setVendor] = useState('')
  const [brand, setBrand] = useState('')
  const [par, setPar] = useState('')
  const [maxQty, setMaxQty] = useState('')
  const [pack, setPack] = useState('')
  const [cost, setCost] = useState('')
  const [retail, setRetail] = useState('')
  const [expiry, setExpiry] = useState<Expiry>({ mode: 'keep' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategory('')
    setVendor('')
    setBrand('')
    setPar('')
    setMaxQty('')
    setPack('')
    setCost('')
    setRetail('')
    setExpiry({ mode: 'keep' })
  }, [open])

  const options = useMemo(() => {
    const uniq = (k: 'category' | 'vendor' | 'brand') => Array.from(new Set(products.map((p) => p[k]).filter(Boolean))).sort()
    return { category: uniq('category'), vendor: uniq('vendor'), brand: uniq('brand') }
  }, [products])

  const changes = useMemo(() => {
    const c: Record<string, string | number> = {}
    if (category.trim()) c.category = category.trim()
    if (vendor.trim()) c.vendor = vendor.trim()
    if (brand.trim()) c.brand = brand.trim()
    if (par.trim() !== '') c.reorderThreshold = toInt(par, 0)
    if (maxQty.trim() !== '') c.maxQty = toInt(maxQty, 0)
    if (pack.trim() !== '') c.packSize = toInt(pack, 1)
    if (cost.trim() !== '') c.unitCostCents = toCents(cost)
    if (retail.trim() !== '') c.retailPriceCents = toCents(retail)
    if (expiry.mode === 'none') c.expiresOn = 'none'
    if (expiry.mode === 'clear') c.expiresOn = ''
    if (expiry.mode === 'date' && isExpiryDate(expiry.value)) c.expiresOn = expiry.value
    return c
  }, [category, vendor, brand, par, maxQty, pack, cost, retail, expiry])
  const count = Object.keys(changes).length

  async function save() {
    setSaving(true)
    try {
      const r = await bulkUpdateProducts({ data: { productIds: products.map((p) => p.id), changes } })
      await onDone()
      toast(`Updated ${r.updated} product${r.updated === 1 ? '' : 's'}`)
      onClose()
    } catch {
      toast("Couldn't save the changes. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  const text = (id: string, label: string, value: string, set: (v: string) => void, list?: string[], placeholder = 'Leave as is') => (
    <label className="block text-sm font-semibold" htmlFor={id}>
      {label}
      <input
        id={id}
        className="field-input !py-2 mt-1 font-normal"
        value={value}
        placeholder={placeholder}
        list={list ? `${id}-list` : undefined}
        onChange={(e) => set(e.target.value)}
      />
      {list && (
        <datalist id={`${id}-list`}>
          {list.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </label>
  )

  const num = (id: string, label: string, value: string, set: (v: string) => void, placeholder = 'Leave as is', decimal = false) => (
    <label className="block text-sm font-semibold" htmlFor={id}>
      {label}
      <input
        id={id}
        className="field-input num !py-2 mt-1 font-normal"
        inputMode={decimal ? 'decimal' : 'numeric'}
        type={decimal ? 'text' : 'number'}
        min={0}
        value={value}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Edit ${products.length} product${products.length === 1 ? '' : 's'}`}
      subtitle="Fill in only what you want to change on all of them. Blank fields stay as they are. Counts never change here."
    >
      <div className="grid gap-3 max-h-[56vh] overflow-auto pr-1">
        {text('bulk-category', 'Category', category, setCategory, options.category)}
        <div className="grid grid-cols-2 gap-3">
          {text('bulk-vendor', 'Vendor', vendor, setVendor, options.vendor)}
          {text('bulk-brand', 'Brand', brand, setBrand, options.brand)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {num('bulk-par', 'Reorder at', par, setPar)}
          {num('bulk-max', 'Order up to', maxQty, setMaxQty)}
          {num('bulk-pack', 'Case pack', pack, setPack)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {num('bulk-cost', 'Your cost $', cost, setCost, 'Leave as is', true)}
          {num('bulk-retail', 'Sells for $', retail, setRetail, 'Leave as is', true)}
        </div>
        <div>
          <p className="m-0 mb-1.5 text-sm font-semibold">Expires</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Expiry">
            <button type="button" className="chip" aria-pressed={expiry.mode === 'keep'} onClick={() => setExpiry({ mode: 'keep' })}>
              Leave as is
            </button>
            {SHELF_LIFE_OPTIONS.map((m) => {
              const date = monthsFromToday(m)
              return (
                <button
                  key={m}
                  type="button"
                  className="chip"
                  aria-pressed={expiry.mode === 'date' && expiry.value === date}
                  onClick={() => setExpiry({ mode: 'date', value: date })}
                >
                  {m} months
                </button>
              )
            })}
            <button type="button" className="chip" aria-pressed={expiry.mode === 'none'} onClick={() => setExpiry({ mode: 'none' })}>
              No expiration
            </button>
            <button type="button" className="chip" aria-pressed={expiry.mode === 'clear'} onClick={() => setExpiry({ mode: 'clear' })}>
              Clear expiry
            </button>
          </div>
          <input
            type="date"
            className="field-input !py-2 mt-2"
            aria-label="Or enter the expiry date"
            value={expiry.mode === 'date' ? expiry.value : ''}
            onChange={(e) => setExpiry(e.target.value ? { mode: 'date', value: e.target.value } : { mode: 'keep' })}
          />
          {expiry.mode === 'date' && isExpiryDate(expiry.value) && (
            <p className="m-0 mt-1 text-[12px] text-ink-2">All selected products will expire {expiryLabel(expiry.value)}.</p>
          )}
        </div>
      </div>
      <SheetActions>
        <button type="button" className="btn btn-tonal" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={count === 0 || saving} onClick={save}>
          {saving ? 'Saving…' : count === 0 ? 'Choose a change' : `Apply to ${products.length}`}
        </button>
      </SheetActions>
    </Sheet>
  )
}
