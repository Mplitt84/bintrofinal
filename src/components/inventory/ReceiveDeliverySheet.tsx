import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCheck, FileText, PackageCheck } from 'lucide-react'
import type { Product } from './types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { centsToDollars } from '@/components/ui/bits'
import { parseImport } from '@/server/import.functions'
import { receiveDeliveryFn } from '@/server/orders.functions'
import { shrinkImage } from '@/lib/images'
import { MAX_IMPORT_BYTES, type ImportLine } from '@/lib/bulk-import'
import type { DeliveryResult, SavedOrder } from '@/lib/orders'

type Row = {
  key: string
  productId: number | null
  name: string
  brand: string
  size: string
  barcode: string
  category: string
  /** Units on the saved order still to arrive, or null when the line isn't on the order. */
  ordered: number | null
  received: string
  /** Invoice cost per unit as typed (dollars), '' when unknown so the product's cost is left alone. */
  cost: string
  /** Product's cost before this delivery, for spotting price changes. */
  currentCostCents: number
  include: boolean
}

type Stage =
  | { kind: 'start'; error?: string }
  | { kind: 'reading'; fileName: string }
  | { kind: 'review'; source: string; fromDocument: boolean }
  | { kind: 'saving' }
  | { kind: 'done'; result: DeliveryResult }

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function toCents(dollars: string) {
  const n = Number(dollars.replace(/[$,\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0
}

function orderRows(order: SavedOrder, receivedAsOrdered: boolean): Row[] {
  return order.lines.map((l) => {
    const left = Math.max(0, l.qtyOrdered - l.qtyReceived)
    return {
      key: `po-${l.id}`,
      productId: l.productId,
      name: l.name,
      brand: l.brand,
      size: l.size,
      barcode: l.barcode,
      category: '',
      ordered: left,
      received: receivedAsOrdered ? String(left) : '0',
      cost: '',
      currentCostCents: l.unitCostCents,
      include: true,
    }
  })
}

/**
 * Checks a delivery in from a photo or PDF of the invoice / packing slip (read by
 * AI and matched to products), or by hand against a saved order. Adds the stock,
 * updates costs from the invoice and records shortages and price changes.
 */
export function ReceiveDeliverySheet({
  open,
  order,
  products,
  staffName,
  onClose,
  onDone,
  initialFile,
}: {
  /** A receipt / invoice photo taken with Snap & log: read it straight away. */
  initialFile?: File | null
  open: boolean
  /** The saved order this delivery is for, or null for a delivery with no order in Bintro. */
  order: SavedOrder | null
  products: Product[]
  staffName: string
  onClose: () => void
  onDone: () => void | Promise<void>
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'start' })
  const [rows, setRows] = useState<Row[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const byId = new Map(products.map((p) => [p.id, p]))

  useEffect(() => {
    if (open) {
      setStage({ kind: 'start' })
      setRows([])
      if (initialFile) readFile(initialFile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id, initialFile])

  async function readFile(file: File | undefined) {
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (isPdf && file.size > MAX_IMPORT_BYTES) {
      setStage({ kind: 'start', error: 'That PDF is over 4 MB. Try a photo of the page instead.' })
      return
    }
    setStage({ kind: 'reading', fileName: file.name })
    try {
      const parsed = await parseImport({
        data: isPdf
          ? { kind: 'document', data: await readAsBase64(file), mediaType: 'application/pdf' }
          : { kind: 'document', data: await shrinkImage(file, 2000), mediaType: 'image/jpeg' },
      })
      if (!parsed.ok) {
        setStage({ kind: 'start', error: parsed.message })
        return
      }
      setRows(mergeDocument(parsed.lines))
      const source = [parsed.vendor || order?.vendor, file.name].filter(Boolean).join(' · ')
      setStage({ kind: 'review', source, fromDocument: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setStage({
        kind: 'start',
        error: /plan|upgrade|feature/i.test(message)
          ? 'Reading invoices is on the Plus plan. You can still check a saved order in by hand.'
          : "Couldn't read that file. Check your connection and try again.",
      })
    }
  }

  /** Lines the invoice shows, laid over the saved order: matches fill the order's lines, the rest are extras. */
  function mergeDocument(lines: ImportLine[]): Row[] {
    const base = order ? orderRows(order, false) : []
    const extras: Row[] = []
    for (const l of lines) {
      const qty = l.qty ?? 0
      const docCost = l.costSource === 'document' && l.unitCostCents > 0 ? centsToDollars(l.unitCostCents) : ''
      const onOrder = l.productId ? base.find((r) => r.productId === l.productId) : undefined
      if (onOrder) {
        onOrder.received = String(Number(onOrder.received) + qty)
        if (docCost) onOrder.cost = docCost
        continue
      }
      const product = l.productId ? byId.get(l.productId) : undefined
      extras.push({
        key: `doc-${l.key}`,
        productId: l.productId,
        name: product?.name ?? l.name,
        brand: product?.brand ?? l.brand,
        size: product?.size ?? l.size,
        barcode: l.barcode,
        category: l.category,
        ordered: null,
        received: String(qty),
        cost: docCost,
        currentCostCents: product?.unitCostCents ?? 0,
        include: qty > 0 && Boolean(l.name.trim()),
      })
    }
    return [...base, ...extras]
  }

  function byHand(asOrdered: boolean) {
    if (!order) return
    setRows(orderRows(order, asOrdered))
    setStage({ kind: 'review', source: `${order.vendor} · checked in by hand`, fromDocument: false })
  }

  function patch(key: string, change: Partial<Row>) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)))
  }

  async function confirm() {
    const lines = rows
      .filter((r) => r.include && Number(r.received) > 0)
      .map((r) => ({
        productId: r.productId,
        barcode: r.barcode,
        name: r.name,
        brand: r.brand,
        size: r.size,
        category: r.category,
        vendor: order?.vendor ?? '',
        qty: Math.max(0, Math.trunc(Number(r.received) || 0)),
        unitCostCents: toCents(r.cost),
        retailPriceCents: 0,
      }))
    if (lines.length === 0 && !order) return
    const source = stage.kind === 'review' ? stage.source : 'Delivery'
    setStage({ kind: 'saving' })
    try {
      const result = await receiveDeliveryFn({
        data: {
          orderId: order?.id ?? null,
          staffName,
          source: `Delivery: ${source}`.slice(0, 160),
          lines: lines.length ? lines : [{ ...emptyLine(), name: 'Nothing arrived' }],
        },
      })
      setStage({ kind: 'done', result })
      await onDone()
    } catch {
      setStage({ kind: 'review', source, fromDocument: false })
      alertLater()
    }
  }

  // Shown on the review screen when saving fails.
  const [saveError, setSaveError] = useState('')
  function alertLater() {
    setSaveError("Couldn't save the delivery. Check your connection and try again.")
  }

  const units = rows.filter((r) => r.include).reduce((s, r) => s + (Number(r.received) || 0), 0)
  const shortCount = rows.filter((r) => r.ordered !== null && (Number(r.received) || 0) < r.ordered).length

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={order ? `Check in ${order.vendor}` : 'Receive a delivery'}
      subtitle={
        order
          ? `Order from ${new Date(order.createdAt).toLocaleDateString()} · ${order.lines.length} item${order.lines.length === 1 ? '' : 's'}`
          : 'Snap or upload the invoice or packing slip. Bintro adds the stock and updates your costs.'
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          readFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {stage.kind === 'start' && (
        <div className="grid gap-2.5">
          {stage.error && <p className="m-0 text-bad text-sm font-semibold">{stage.error}</p>}
          <button type="button" className="btn btn-primary justify-start" onClick={() => fileInput.current?.click()}>
            <FileText size={18} />
            Photo or PDF of the invoice / packing slip
          </button>
          {order && (
            <>
              <button type="button" className="btn btn-tonal justify-start" onClick={() => byHand(true)}>
                <CheckCheck size={18} />
                Everything arrived as ordered
              </button>
              <button type="button" className="btn btn-tonal justify-start" onClick={() => byHand(false)}>
                <PackageCheck size={18} />
                Count it in by hand
              </button>
            </>
          )}
          <p className="m-0 text-[13px] text-ink-2">
            The invoice is matched to your products by barcode and name. You check every line before anything changes.
          </p>
        </div>
      )}

      {stage.kind === 'reading' && <p className="text-ink-2 text-sm">Reading {stage.fileName}…</p>}
      {stage.kind === 'saving' && <p className="text-ink-2 text-sm">Adding the delivery…</p>}

      {stage.kind === 'review' && (
        <>
          {rows.length === 0 ? (
            <p className="text-ink-2 text-sm">No lines found on that invoice.</p>
          ) : (
            <ul className="list-none m-0 p-0 max-h-[52vh] overflow-auto">
              {rows.map((r) => {
                const got = Number(r.received) || 0
                const costCents = toCents(r.cost)
                const short = r.ordered !== null && got < r.ordered
                const over = r.ordered !== null && got > r.ordered
                const priceChange = costCents > 0 && r.currentCostCents > 0 && costCents !== r.currentCostCents
                return (
                  <li key={r.key} className={`py-3 border-b border-line last:border-b-0 ${r.include ? '' : 'opacity-50'}`}>
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => patch(r.key, { include: e.target.checked })}
                        aria-label={`Include ${r.name}`}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{r.name}</div>
                        <div className="text-[12px] text-ink-2 truncate">{[r.brand, r.size].filter(Boolean).join(' · ')}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {r.ordered !== null && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-surface">Ordered {r.ordered}</span>}
                          {r.ordered === null && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-gold-tint text-gold-ink">Not on the order</span>}
                          {!r.productId && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-gold-tint text-gold-ink">New product</span>}
                          {short && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-bad-tint text-bad">Short {r.ordered! - got}</span>}
                          {over && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-warn-tint text-warn">{got - r.ordered!} extra</span>}
                          {priceChange && (
                            <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-warn-tint text-warn">
                              Cost {costCents > r.currentCostCents ? 'up' : 'down'} from ${centsToDollars(r.currentCostCents)}
                            </span>
                          )}
                        </div>
                      </div>
                      <label className="text-[11px] text-ink-2 text-center">
                        Arrived
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={r.received}
                          onChange={(e) => patch(r.key, { received: e.target.value })}
                          className="field-input w-16 text-center px-1 py-1.5 mt-0.5"
                        />
                      </label>
                      <label className="text-[11px] text-ink-2 text-center">
                        Cost $
                        <input
                          inputMode="decimal"
                          value={r.cost}
                          placeholder={r.currentCostCents ? centsToDollars(r.currentCostCents) : '0.00'}
                          onChange={(e) => patch(r.key, { cost: e.target.value })}
                          className="field-input w-20 text-center px-1 py-1.5 mt-0.5"
                        />
                      </label>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {saveError && <p className="text-bad text-sm mt-2 mb-0">{saveError}</p>}
          <p className="text-[13px] text-ink-2 mt-3 mb-0">
            Adds <b className="text-ink">{units}</b> unit{units === 1 ? '' : 's'}
            {shortCount > 0 && (
              <>
                {' '}
                · <b className="text-bad">{shortCount}</b> short (they stay on order)
              </>
            )}
            . A blank cost keeps the product's current cost.
          </p>
          <SheetActions>
            <button type="button" className="btn btn-tonal" onClick={() => setStage({ kind: 'start' })}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={confirm} disabled={units === 0}>
              Add to inventory
            </button>
          </SheetActions>
        </>
      )}

      {stage.kind === 'done' && (
        <>
          <p className="m-0 font-semibold">
            Added {stage.result.summary.units} unit{stage.result.summary.units === 1 ? '' : 's'}
            {stage.result.summary.created > 0 && `, ${stage.result.summary.created} new product${stage.result.summary.created === 1 ? '' : 's'}`}
            {stage.result.status === 'received' && '. Order complete.'}
            {stage.result.status === 'partial' && '. The rest stays on order.'}
          </p>
          {stage.result.short.length > 0 && (
            <div className="mt-3 rounded-xl bg-bad-tint p-3 text-sm">
              <p className="m-0 mb-1 font-semibold text-bad flex items-center gap-1.5">
                <AlertTriangle size={16} /> Short on this delivery
              </p>
              {stage.result.short.map((s) => (
                <p key={s.name} className="m-0">
                  {s.name}: {s.received} of {s.ordered}
                </p>
              ))}
            </div>
          )}
          {stage.result.priceChanges.length > 0 && (
            <div className="mt-3 rounded-xl bg-warn-tint p-3 text-sm">
              <p className="m-0 mb-1 font-semibold text-warn">Price changes (costs updated)</p>
              {stage.result.priceChanges.map((c) => (
                <p key={c.name} className="m-0">
                  {c.name}: ${centsToDollars(c.fromCents)} → ${centsToDollars(c.toCents)}
                </p>
              ))}
            </div>
          )}
          <SheetActions>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </SheetActions>
        </>
      )}
    </Sheet>
  )
}

function emptyLine() {
  return { productId: null, barcode: '', name: '', brand: '', size: '', category: '', vendor: '', qty: 0, unitCostCents: 0, retailPriceCents: 0 }
}
