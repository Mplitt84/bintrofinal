import { useRef, useState } from 'react'
import { Check, Download, FileUp, RefreshCw, Sparkles, X } from 'lucide-react'
import type { Product } from '@/components/inventory/types'
import { centsToDollars } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { useBusiness } from '@/components/business/BusinessContext'
import { shrinkImage } from '@/lib/images'
import {
  MAX_IMPORT_BYTES,
  PRICE_BATCH,
  needsPrice,
  type ImportLine,
  type ImportMode,
  type ImportSummary,
  type PriceSource,
} from '@/lib/bulk-import'
import { applyImport, estimateImportPrices, parseImport } from '@/server/import.functions'

type Step =
  | { kind: 'pick'; error?: string }
  | { kind: 'reading'; fileName: string }
  | { kind: 'review'; fileName: string; vendor: string; date: string }
  | { kind: 'done'; fileName: string; mode: ImportMode; summary: ImportSummary }

const TEMPLATE = 'Barcode,Name,Brand,Size,Category,Vendor,Qty,Unit cost,Retail price\n'

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Settings → Import: upload an inventory spreadsheet (CSV), or a PDF / photo of a
 * stock list, vendor invoice or receipt. Every line is matched to an existing
 * product or becomes a new one, missing prices are estimated by AI line by line,
 * and staff review everything before counts and prices are saved.
 */
export function ImportView({
  products,
  staffName,
  onChanged,
}: {
  products: Product[]
  staffName: string
  onChanged: () => void | Promise<void>
}) {
  const toast = useToast()
  const { type } = useBusiness()
  const [step, setStep] = useState<Step>({ kind: 'pick' })
  const [mode, setMode] = useState<ImportMode>('inventory')
  const [lines, setLines] = useState<ImportLine[]>([])
  const [pricing, setPricing] = useState<{ done: number; total: number } | null>(null)
  const [pricingError, setPricingError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const run = useRef(0)

  const byId = new Map(products.map((p) => [p.id, p]))

  async function onFile(file: File | undefined) {
    if (!file) return
    const name = file.name || 'Upload'
    const lower = name.toLowerCase()
    if (/\.(xlsx?|numbers|ods)$/.test(lower)) {
      setStep({ kind: 'pick', error: 'Save the spreadsheet as CSV first (File → Download / Export → CSV), then upload that.' })
      return
    }
    if (file.size > MAX_IMPORT_BYTES && !file.type.startsWith('image/')) {
      setStep({ kind: 'pick', error: 'That file is over 4 MB. Split it into smaller files or export it as CSV.' })
      return
    }
    const isCsv = /\.(csv|tsv|txt)$/.test(lower) || file.type === 'text/csv' || file.type === 'text/plain'
    const isPdf = lower.endsWith('.pdf') || file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isCsv && !isPdf && !isImage) {
      setStep({ kind: 'pick', error: 'Upload a CSV, PDF or photo.' })
      return
    }

    const id = ++run.current
    setStep({ kind: 'reading', fileName: name })
    setPricing(null)
    setPricingError('')
    try {
      const r = isCsv
        ? await parseImport({ data: { kind: 'csv', text: await file.text() } })
        : await parseImport({
            data: isPdf
              ? { kind: 'document', data: await readAsBase64(file), mediaType: 'application/pdf' }
              : { kind: 'document', data: await shrinkImage(file, 2000), mediaType: 'image/jpeg' },
          })
      if (id !== run.current) return
      if (!r.ok) {
        setStep({ kind: 'pick', error: r.message })
        return
      }
      setMode(r.mode)
      setLines(r.lines)
      setStep({ kind: 'review', fileName: name, vendor: r.vendor, date: r.date })
      // A price list keeps the file's prices; staff can still ask for AI estimates by hand.
      if (r.mode !== 'prices') estimate(r.lines, id)
    } catch {
      if (id === run.current) setStep({ kind: 'pick', error: 'Couldn’t read that file. Check your connection and try again.' })
    }
  }

  /** Fills missing cost / retail prices with AI estimates, batch by batch, straight into each line. */
  async function estimate(source: ImportLine[], id = run.current) {
    const todo = source.filter((l) => l.include && needsPrice(l) && (l.name || l.brand))
    if (todo.length === 0) return
    setPricingError('')
    setPricing({ done: 0, total: todo.length })
    for (let i = 0; i < todo.length; i += PRICE_BATCH) {
      const batch = todo.slice(i, i + PRICE_BATCH)
      try {
        const r = await estimateImportPrices({
          data: {
            items: batch.map((l) => ({
              name: l.name.slice(0, 200),
              brand: l.brand.slice(0, 160),
              size: l.size.slice(0, 60),
              category: l.category.slice(0, 80),
            })),
          },
        })
        if (id !== run.current) return
        if (!r.ok) {
          setPricingError(r.message)
          break
        }
        const est = new Map(batch.map((l, n) => [l.key, r.prices[n]]))
        setLines((prev) =>
          prev.map((l) => {
            const p = est.get(l.key)
            if (!p) return l
            const next = { ...l }
            if (!next.unitCostCents && p.unitCostCents) {
              next.unitCostCents = p.unitCostCents
              next.costSource = 'ai'
            }
            if (!next.retailPriceCents && p.retailPriceCents) {
              next.retailPriceCents = p.retailPriceCents
              next.retailSource = 'ai'
            }
            return next
          }),
        )
      } catch {
        if (id !== run.current) return
        setPricingError('Price estimates stopped. Check your connection and try again.')
        break
      }
      setPricing({ done: Math.min(i + PRICE_BATCH, todo.length), total: todo.length })
    }
    if (id === run.current) setPricing(null)
  }

  function update(key: number, patch: Partial<ImportLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  /** Re-pointing a line at another product brings in that product's prices where the file had none. */
  function rematch(line: ImportLine, productId: number | null) {
    const p = productId ? byId.get(productId) : undefined
    const keepCost = line.costSource === 'document' || line.costSource === 'manual' || line.costSource === 'ai'
    const keepRetail = line.retailSource === 'document' || line.retailSource === 'manual' || line.retailSource === 'ai'
    update(line.key, {
      productId,
      ...(keepCost ? {} : { unitCostCents: p?.unitCostCents ?? 0, costSource: p?.unitCostCents ? 'current' : 'none' }),
      ...(keepRetail
        ? {}
        : { retailPriceCents: p?.retailPriceCents ?? 0, retailSource: p?.retailPriceCents ? 'current' : 'none' }),
    })
  }

  async function save() {
    if (step.kind !== 'review') return
    const chosen = lines.filter((l) => l.include && (l.productId || (mode !== 'prices' && l.name.trim())))
    if (chosen.length === 0) {
      toast(mode === 'prices' ? 'Match at least one line to a product' : 'Tick at least one line to import')
      return
    }
    setSaving(true)
    try {
      const summary = await applyImport({
        data: {
          mode,
          staffName,
          source: [step.vendor, step.fileName].filter(Boolean).join(' · ').slice(0, 160),
          lines: chosen.map((l) => ({
            productId: l.productId,
            barcode: l.barcode.slice(0, 60),
            name: l.name.slice(0, 200),
            brand: l.brand.slice(0, 160),
            size: l.size.slice(0, 60),
            category: l.category.slice(0, 80),
            vendor: l.vendor.slice(0, 120),
            qty: l.qty,
            unitCostCents: l.unitCostCents,
            retailPriceCents: l.retailPriceCents,
          })),
        },
      })
      run.current++
      setPricing(null)
      await onChanged()
      setStep({ kind: 'done', fileName: step.fileName, mode, summary })
    } catch {
      toast('Could not save the import. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    run.current++
    setLines([])
    setPricing(null)
    setPricingError('')
    setStep({ kind: 'pick' })
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'bintro-inventory-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (step.kind === 'reading') {
    return (
      <div className="bg-surface rounded-2xl p-5" role="status">
        <p className="font-semibold m-0 mb-1">Reading {step.fileName}…</p>
        <p className="text-ink-2 text-sm m-0 mb-4">Finding each product line and matching it to your inventory. Longer PDFs take up to a minute.</p>
        <div className="skel w-[70%]" />
        <div className="skel w-[55%]" />
        <div className="skel w-[62%]" />
      </div>
    )
  }

  if (step.kind === 'done') {
    const s = step.summary
    return (
      <div className="bg-good-tint rounded-2xl p-5">
        <p className="flex items-center gap-2 text-good font-bold text-[17px] m-0 mb-2">
          <Check size={20} /> Imported {step.fileName}
        </p>
        <ul className="m-0 mb-4 pl-5 text-sm flex flex-col gap-1">
          <li>
            {s.created} new {s.created === 1 ? 'product' : 'products'} added, {s.updated} updated
          </li>
          <li>
            {s.priced} {s.priced === 1 ? 'price' : 'prices'} set or changed
          </li>
          {step.mode === 'prices' ? (
            <li>Stock counts left unchanged</li>
          ) : (
            <li>
              {s.units} {s.units === 1 ? 'unit' : 'units'} {step.mode === 'receipt' ? 'received into stock' : 'adjusted to match your count'}
            </li>
          )}
        </ul>
        <p className="text-ink-2 text-[13px] m-0 mb-4">
          {step.mode === 'prices'
            ? 'New prices show on the Products tab and in future orders.'
            : `Every change is in the Activity tab${step.mode === 'receipt' ? ' and counts toward this month on the Budget tab' : ''}.`}
        </p>
        <button className="btn btn-primary" onClick={reset}>
          <FileUp size={18} /> Import another file
        </button>
      </div>
    )
  }

  if (step.kind === 'pick') {
    return (
      <div>
        <label
          htmlFor="import-file"
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            onFile(e.dataTransfer.files[0])
          }}
          className={`flex flex-col items-center text-center gap-2 rounded-2xl border-2 border-dashed px-5 py-8 cursor-pointer transition-colors ${
            dragging ? 'border-action bg-action-tint' : 'border-line bg-surface hover:bg-surface-2'
          }`}
        >
          <FileUp size={32} className="text-action" />
          <b className="text-[17px]">Upload a spreadsheet, invoice or receipt</b>
          <span className="text-ink-2 text-sm">CSV, PDF or a photo · up to 4 MB</span>
          <span className="btn btn-primary btn-sm mt-1">Choose file</span>
        </label>
        <input
          id="import-file"
          type="file"
          accept=".csv,.tsv,.txt,text/csv,application/pdf,image/*,.xlsx,.xls"
          className="sr-only"
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {step.error && <p className="text-bad text-sm mt-3 mb-0">{step.error}</p>}

        <ul className="text-ink-2 text-sm mt-4 mb-3 pl-5 flex flex-col gap-1.5">
          <li>
            <b className="text-ink">Inventory spreadsheet:</b> any column layout works. Bintro works out which column is the name,
            barcode, count, cost and price.
          </li>
          <li>
            <b className="text-ink">Vendor invoice or receipt:</b> each line is added to stock and its unit cost becomes the
            product’s new cost.
          </li>
          <li>
            <b className="text-ink">Price list:</b> a file with prices but no quantities updates cost and retail on matching
            products already in Bintro, without touching stock.
          </li>
          <li>
            Missing prices are estimated by AI on every line, and you review everything before it’s saved.
          </li>
        </ul>
        <button type="button" className="btn btn-text btn-sm !px-0" onClick={downloadTemplate}>
          <Download size={16} /> Download a CSV template
        </button>
      </div>
    )
  }

  const pricesOnly = mode === 'prices'
  const included = lines.filter((l) => l.include && (!pricesOnly || l.productId))
  const matched = included.filter((l) => l.productId).length
  const aiPriced = included.filter((l) => l.costSource === 'ai' || l.retailSource === 'ai').length
  const stillMissing = included.filter((l) => needsPrice(l)).length
  const productOptions = [...products].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-bold m-0 truncate">{step.fileName}</p>
          <p className="text-ink-2 text-sm m-0">
            {[step.vendor, step.date].filter(Boolean).join(' · ') || `${lines.length} line${lines.length === 1 ? '' : 's'} found`}
          </p>
        </div>
        <button className="btn btn-text btn-sm shrink-0" onClick={reset} aria-label="Cancel import">
          <X size={16} /> Cancel
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3" role="radiogroup" aria-label="What is this file?">
        {(
          [
            { id: 'inventory', label: 'Stock count', hint: 'Set on-hand to these numbers' },
            { id: 'receipt', label: 'Delivery / receipt', hint: 'Add these units to stock' },
            { id: 'prices', label: 'Price update', hint: 'Change prices only' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            aria-pressed={mode === m.id}
            className="chip !rounded-xl !py-2.5 text-left flex flex-col items-start"
            onClick={() => setMode(m.id)}
          >
            <b>{m.label}</b>
            <span className="text-[12px] font-normal opacity-80">{m.hint}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2 mb-3">
        <span>
          {pricesOnly ? (
            <>
              <b className="text-ink">{included.length}</b> {included.length === 1 ? 'product' : 'products'} to reprice
              {lines.length - included.length > 0 && <> · {lines.length - included.length} skipped</>}
            </>
          ) : (
            <>
              <b className="text-ink">{included.length}</b> to import · {matched} existing · {included.length - matched} new
            </>
          )}
          {aiPriced > 0 && <> · {aiPriced} AI-priced</>}
        </span>
        {pricing ? (
          <span className="flex items-center gap-1.5 text-action font-semibold" role="status">
            <Sparkles size={15} /> Estimating prices… {pricing.done}/{pricing.total}
          </span>
        ) : (
          stillMissing > 0 && (
            <button className="btn btn-tonal btn-sm" onClick={() => estimate(lines)}>
              <RefreshCw size={15} /> AI price check ({stillMissing})
            </button>
          )
        )}
      </div>
      {pricingError && <p className="text-bad text-sm mt-0 mb-3">{pricingError}</p>}

      <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
        {lines.map((l) => {
          const p = l.productId ? byId.get(l.productId) : undefined
          const active = l.include && (!pricesOnly || Boolean(l.productId))
          const after = l.qty === null ? null : mode === 'receipt' ? (p?.qty ?? 0) + l.qty : l.qty
          return (
            <li
              key={l.key}
              className={`border rounded-2xl p-3 ${active ? 'border-line bg-white' : 'border-line bg-surface opacity-60'}`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-3 w-5 h-5 accent-[var(--color-action)] shrink-0"
                  checked={l.include}
                  onChange={(e) => update(l.key, { include: e.target.checked })}
                  aria-label={`Import ${l.name || l.barcode}`}
                />
                <div className="flex-1 min-w-0">
                  <input
                    className="field-input !py-2 font-semibold"
                    value={l.name}
                    onChange={(e) => update(l.key, { name: e.target.value.slice(0, 200) })}
                    placeholder="Product name"
                    aria-label="Product name"
                  />
                  <p className="text-ink-2 text-[12px] mt-1 mb-2 truncate">
                    {[l.brand, l.size, l.category, l.barcode && `#${l.barcode}`].filter(Boolean).join(' · ') || 'No other details'}
                  </p>
                  <select
                    className="field-input !py-2 text-sm mb-2"
                    value={l.productId ?? ''}
                    onChange={(e) => rematch(l, e.target.value ? Number(e.target.value) : null)}
                    aria-label="Matches product"
                  >
                    <option value="">
                      {pricesOnly ? `No match: skipped (pick a ${type.itemNoun} to update)` : `➕ Add as a new ${type.itemNoun}`}
                    </option>
                    {productOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        Update: {[o.brand, o.name, o.size].filter(Boolean).join(' ')}
                      </option>
                    ))}
                  </select>
                  <div className={`grid gap-2 ${pricesOnly ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {!pricesOnly && (
                      <label className="text-[12px] font-semibold text-ink-2">
                        {mode === 'receipt' ? 'Received' : 'Count'}
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="field-input num !py-2 mt-1"
                          value={l.qty ?? ''}
                          placeholder="—"
                          onChange={(e) =>
                            update(l.key, {
                              qty: e.target.value === '' ? null : Math.max(0, Math.min(1_000_000, Math.round(Number(e.target.value) || 0))),
                            })
                          }
                        />
                        <span className="block font-normal mt-0.5 min-h-[16px]">
                          {after !== null && p ? `${p.qty} → ${after}` : after !== null ? `Starts at ${after}` : 'Stock unchanged'}
                        </span>
                      </label>
                    )}
                    <MoneyField
                      label="Cost"
                      cents={l.unitCostCents}
                      source={l.costSource}
                      was={p && p.unitCostCents !== l.unitCostCents ? p.unitCostCents : 0}
                      onCents={(c) => update(l.key, { unitCostCents: c, costSource: c ? 'manual' : 'none' })}
                    />
                    <MoneyField
                      label="Retail"
                      cents={l.retailPriceCents}
                      source={l.retailSource}
                      was={p && p.retailPriceCents !== l.retailPriceCents ? p.retailPriceCents : 0}
                      onCents={(c) => update(l.key, { retailPriceCents: c, retailSource: c ? 'manual' : 'none' })}
                    />
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-4 mt-4 bg-white/95 backdrop-blur rounded-2xl pt-2">
        {!staffName && (
          <p className="text-warn text-[13px] m-0 mb-2">Tip: pick your name in the header so this import is logged under you.</p>
        )}
        <button className="btn btn-primary w-full" onClick={save} disabled={saving || included.length === 0}>
          {saving
            ? 'Saving…'
            : `${pricesOnly ? 'Update prices on' : 'Import'} ${included.length} ${
                pricesOnly ? (included.length === 1 ? 'product' : 'products') : included.length === 1 ? 'line' : 'lines'
              }${pricing ? ' (prices still estimating)' : ''}`}
        </button>
      </div>
    </div>
  )
}

const SOURCE_LABEL: Record<PriceSource, string> = {
  document: 'From file',
  current: 'Current',
  ai: 'AI estimate',
  manual: 'Edited',
  none: 'Missing',
}

/** Dollar input that stays in sync when AI estimates arrive, with a note on where the price came from. */
function MoneyField({
  label,
  cents,
  source,
  was,
  onCents,
}: {
  label: string
  cents: number
  source: PriceSource
  was: number
  onCents: (cents: number) => void
}) {
  const [text, setText] = useState(cents ? centsToDollars(cents) : '')
  const parsed = Math.max(0, Math.round((Number(text) || 0) * 100))
  // An estimate filled in from outside replaces whatever is shown.
  if (parsed !== cents && !(cents === 0 && text === '')) {
    setText(cents ? centsToDollars(cents) : '')
  }
  return (
    <label className="text-[12px] font-semibold text-ink-2">
      {label}
      <div className="relative mt-1">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-2 font-normal">$</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          className={`field-input num !py-2 !pl-6 ${source === 'ai' ? '!border-action !bg-action-tint' : ''}`}
          value={text}
          placeholder="0.00"
          onChange={(e) => {
            setText(e.target.value)
            onCents(Math.min(100_000_00, Math.max(0, Math.round((Number(e.target.value) || 0) * 100))))
          }}
        />
      </div>
      <span
        className={`block font-normal mt-0.5 min-h-[16px] ${
          source === 'ai' ? 'text-action' : source === 'none' ? 'text-warn' : ''
        }`}
      >
        {source === 'ai' && <Sparkles size={11} className="inline mr-0.5 -mt-0.5" />}
        {SOURCE_LABEL[source]}
        {was > 0 && source !== 'current' && <> · was ${centsToDollars(was)}</>}
      </span>
    </label>
  )
}
