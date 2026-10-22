import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Product } from './types'
import { emailPurchaseOrder } from '@/server/inventory.functions'
import { Download, Mail, Printer } from 'lucide-react'
import { EmptyState, PageHead, StatGrid, StatTile, Thumb, centsToDollars } from '@/components/ui/bits'
import { MAX_ORDER_QTY, clampOrderQty, onHandQty, stockStatus, suggestedOrderQty } from '@/lib/inventory-defaults'
import {
  buildPurchaseOrderCsv,
  groupPurchaseOrderLines,
  lineTotalCents,
  purchaseOrderFilename,
  purchaseOrderTotals,
  type PurchaseOrderGroup,
  type PurchaseOrderLine,
} from '@/lib/purchase-order'
import { businessSlug } from '@/lib/business-types'
import { useBusiness } from '@/components/business/BusinessContext'

/** The in-progress order lives on the device, so switching tabs never loses it. */
const DRAFT_KEY = 'shagnoir-po-draft'

/** Per-product order state. `qty` stays a string so the field is comfortable to type in. */
type DraftRow = { selected: boolean; qty: string }
type Draft = Record<number, DraftRow>

type MailState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; message: string }
  | { kind: 'error'; message: string }

function resolveQty(raw: string) {
  return clampOrderQty(Number(raw))
}

function toLine(product: Product, qty: number): PurchaseOrderLine {
  return {
    productId: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    vendor: product.vendor,
    size: product.size,
    category: product.category,
    qty,
    onHand: Math.max(0, onHandQty(product)),
    reorderThreshold: product.reorderThreshold,
    unitCostCents: product.unitCostCents,
  }
}

function readDraft(): Draft {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, { selected?: unknown; qty?: unknown }>
    const draft: Draft = {}
    for (const [id, row] of Object.entries(parsed)) {
      const productId = Number(id)
      if (!Number.isInteger(productId)) continue
      draft[productId] = {
        selected: row?.selected === true,
        qty: String(clampOrderQty(Number(row?.qty))),
      }
    }
    return draft
  } catch {
    return {}
  }
}

export function PurchaseOrderView({
  items,
  staffName,
  onChanged,
}: {
  items: Product[]
  staffName: string
  onChanged: () => void | Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>({})
  const [hydrated, setHydrated] = useState(false)
  const [note, setNote] = useState('')
  const [mail, setMail] = useState<MailState>({ kind: 'idle' })
  const business = useBusiness()

  useEffect(() => {
    setDraft(readDraft())
    setHydrated(true)
  }, [])

  // Keep the draft for the products still flagged; drop rows for anything restocked.
  useEffect(() => {
    if (!hydrated) return
    const live = new Set(items.map((p) => p.id))
    const pruned = Object.fromEntries(Object.entries(draft).filter(([id]) => live.has(Number(id))))
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(pruned))
  }, [draft, items, hydrated])

  function rowFor(product: Product): DraftRow {
    return draft[product.id] ?? { selected: false, qty: String(suggestedOrderQty(product)) }
  }

  function patchRows(productIds: number[], patch: (product: Product, row: DraftRow) => DraftRow) {
    setMail({ kind: 'idle' })
    setDraft((current) => {
      const next = { ...current }
      for (const id of productIds) {
        const product = items.find((p) => p.id === id)
        if (!product) continue
        const row = current[id] ?? { selected: false, qty: String(suggestedOrderQty(product)) }
        next[id] = patch(product, row)
      }
      return next
    })
  }

  const allLines = useMemo(
    () => items.map((product) => toLine(product, resolveQty(rowFor(product).qty))),
    [items, draft],
  )
  const groups = useMemo(() => groupPurchaseOrderLines(allLines), [allLines])

  const isSelected = (productId: number) => draft[productId]?.selected === true
  const selectedLines = useMemo(
    () => groups.flatMap((group) => group.lines.filter((line) => isSelected(line.productId))),
    [groups, draft],
  )

  const totals = purchaseOrderTotals(selectedLines)
  const leftOut = items.length - selectedLines.length
  const nothingSelected = selectedLines.length === 0

  function setSelection(productIds: number[], selected: boolean) {
    patchRows(productIds, (_product, row) => ({ ...row, selected }))
  }

  function setQty(product: Product, raw: string) {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, String(MAX_ORDER_QTY).length)
    // Editing a quantity means you want the item, so it ticks itself on.
    patchRows([product.id], (_product, _row) => ({ selected: true, qty: digits }))
  }

  function bumpQty(product: Product, step: number) {
    patchRows([product.id], (_product, row) => ({
      selected: true,
      qty: String(clampOrderQty(resolveQty(row.qty) + step)),
    }))
  }

  function normaliseQty(product: Product) {
    patchRows([product.id], (_product, row) => ({ ...row, qty: String(resolveQty(row.qty)) }))
  }

  function resetQuantities() {
    patchRows(
      items.map((p) => p.id),
      (product, row) => ({ ...row, qty: String(suggestedOrderQty(product)) }),
    )
  }

  function exportCsv() {
    if (nothingSelected) return
    // Excel needs the BOM to read the UTF-8 product names correctly.
    const blob = new Blob(['\ufeff' + buildPurchaseOrderCsv(selectedLines)], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = purchaseOrderFilename(businessSlug(business.name))
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function printOrder() {
    if (nothingSelected) return
    window.print()
  }

  async function emailOrder() {
    if (nothingSelected) return
    setMail({ kind: 'sending' })
    const result = await emailPurchaseOrder({
      data: {
        lines: selectedLines.map((line) => ({ productId: line.productId, qty: clampOrderQty(line.qty) })),
        staffName,
        note: note.trim() || undefined,
      },
    })
    if (result.ok) {
      setMail({
        kind: 'sent',
        message: `Order for ${result.count} item${result.count === 1 ? '' : 's'} sent to ${result.to}.`,
      })
    } else {
      setMail({ kind: 'error', message: result.message })
    }
  }

  const head = (
    <PageHead
      title="Reorder"
      lead="Pick the items to buy, set the quantities, then export, print or email just that order."
    />
  )

  if (items.length === 0) {
    return (
      <div>
        {head}
        <EmptyState title="Nothing to order">
          No product is at or below its par level, so there's nothing to put on a purchase order yet.
        </EmptyState>
      </div>
    )
  }

  return (
    <div>
      {head}
      <StatGrid>
        <StatTile label="Flagged items" value={items.length} />
        <StatTile label="On this order" value={totals.itemCount} tone={totals.itemCount > 0 ? 'warn' : undefined} />
        <StatTile label="Units to order" value={totals.unitCount} />
        <StatTile label="Est. order total" value={`$${centsToDollars(totals.totalCents)}`} />
      </StatGrid>

      <div className="flex flex-wrap gap-2 mb-3">
        <button className="btn btn-primary btn-sm" onClick={emailOrder} disabled={nothingSelected || mail.kind === 'sending'}>
          <Mail size={16} />
          {mail.kind === 'sending' ? 'Sending…' : 'Email order'}
        </button>
        <button className="btn btn-tonal btn-sm" onClick={exportCsv} disabled={nothingSelected}>
          <Download size={16} />
          Download CSV
        </button>
        <button className="btn btn-tonal btn-sm" onClick={printOrder} disabled={nothingSelected}>
          <Printer size={16} />
          Print
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
        <button className="chip" onClick={() => setSelection(items.map((p) => p.id), true)}>
          Select all
        </button>
        <button className="chip" onClick={() => setSelection(items.map((p) => p.id), false)} disabled={nothingSelected}>
          Deselect all
        </button>
        <button className="chip" onClick={resetQuantities}>
          Reset quantities
        </button>
        <button
          className="chip"
          onClick={() => {
            setMail({ kind: 'idle' })
            onChanged()
          }}
        >
          Refresh list
        </button>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 500))}
        placeholder="Note for the vendor (optional)"
        aria-label="Note for the vendor"
        className="field-input mb-3"
      />

      <p className="text-ink-2 text-[13px] mt-0 mb-3 leading-relaxed">
        {nothingSelected ? (
          <>Tick the items you want on this order. The CSV, print sheet and email include only what's ticked.</>
        ) : (
          <>
            This order covers <b className="text-ink">{totals.itemCount}</b> of {items.length} flagged item
            {items.length === 1 ? '' : 's'}
            {leftOut > 0 ? (
              <>
                {' '}
                · <b className="text-ink">{leftOut}</b> left off stay on this list for a future order
              </>
            ) : null}
            .
          </>
        )}
      </p>

      {mail.kind === 'sent' && <p className="text-good text-sm font-semibold mb-3">✓ {mail.message}</p>}
      {mail.kind === 'error' && <p className="text-bad text-sm mb-3 max-w-[560px]">{mail.message}</p>}

      {groups.map((group) => (
        <VendorGroup
          key={group.key}
          group={group}
          isSelected={isSelected}
          qtyFor={(productId) => draft[productId]?.qty}
          products={items}
          onToggleGroup={(selected) => setSelection(group.lines.map((l) => l.productId), selected)}
          onToggleLine={(productId, selected) => setSelection([productId], selected)}
          onQtyChange={setQty}
          onQtyBump={bumpQty}
          onQtyBlur={normaliseQty}
        />
      ))}

      <div className="flex justify-between items-center px-1 py-4 text-lg font-bold">
        <span>Order total</span>
        <span className="num">${centsToDollars(totals.totalCents)}</span>
      </div>

      {hydrated &&
        createPortal(
          <PrintSheet lines={selectedLines} staffName={staffName} note={note.trim()} />,
          document.body,
        )}
    </div>
  )
}

function VendorGroup({
  group,
  products,
  isSelected,
  qtyFor,
  onToggleGroup,
  onToggleLine,
  onQtyChange,
  onQtyBump,
  onQtyBlur,
}: {
  group: PurchaseOrderGroup
  products: Product[]
  isSelected: (productId: number) => boolean
  qtyFor: (productId: number) => string | undefined
  onToggleGroup: (selected: boolean) => void
  onToggleLine: (productId: number, selected: boolean) => void
  onQtyChange: (product: Product, raw: string) => void
  onQtyBump: (product: Product, step: number) => void
  onQtyBlur: (product: Product) => void
}) {
  const selected = group.lines.filter((line) => isSelected(line.productId))
  const allSelected = selected.length === group.lines.length
  const subtotalCents = selected.reduce((sum, line) => sum + lineTotalCents(line), 0)
  const unitCount = selected.reduce((sum, line) => sum + clampOrderQty(line.qty), 0)

  return (
    <section className="bg-white border border-line rounded-2xl px-4 py-1 mb-3.5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[17px] font-bold truncate">{group.vendor}</h3>
          <div className="text-[13px] text-ink-2">
            {group.brand ? `${group.brand} · ` : ''}
            {selected.length} of {group.lines.length} selected
            {selected.length > 0 && ` · ${unitCount} unit${unitCount === 1 ? '' : 's'}`}
          </div>
        </div>
        <span className="num font-bold">${centsToDollars(subtotalCents)}</span>
        <button className="btn btn-text btn-sm !px-2" onClick={() => onToggleGroup(!allSelected)}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </header>

      <ul className="list-none m-0 p-0">
        {group.lines.map((line) => {
          const product = products.find((p) => p.id === line.productId)
          if (!product) return null
          const checked = isSelected(line.productId)
          const out = stockStatus(product) === 'out'
          const suggested = suggestedOrderQty(product)
          const qty = clampOrderQty(line.qty)
          const raw = qtyFor(line.productId)
          const inputId = `po-qty-${line.productId}`

          return (
            <li
              key={line.productId}
              className={`flex items-center gap-3 py-3 border-t border-line flex-wrap min-[560px]:flex-nowrap ${
                checked ? '' : 'opacity-60'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onToggleLine(line.productId, e.target.checked)}
                aria-label={`Include ${line.name} in this purchase order`}
                className="w-5 h-5 accent-[var(--color-action)] cursor-pointer shrink-0"
              />
              <Thumb imageUrl={product.imageUrl} label={line.brand || line.name} />
              <label htmlFor={inputId} className="flex-1 min-w-[140px] cursor-text">
                <div className="font-semibold truncate">{line.name}</div>
                <div className="text-[13px] text-ink-2 truncate">
                  <span className={out ? 'text-bad font-semibold' : 'text-warn font-semibold'}>
                    {out ? 'Out' : `Low · ${line.onHand} on hand`}
                  </span>
                  {' · par '}
                  {line.reorderThreshold}
                  {line.size ? ` · ${line.size}` : ''} · ${centsToDollars(line.unitCostCents)} each
                </div>
              </label>
              <div className="flex flex-col items-center ml-auto">
                <div className="flex items-center bg-surface rounded-full">
                  <StepButton label={`Decrease order quantity for ${line.name}`} onClick={() => onQtyBump(product, -1)}>
                    −
                  </StepButton>
                  <input
                    id={inputId}
                    type="text"
                    inputMode="numeric"
                    value={raw ?? String(suggested)}
                    onChange={(e) => onQtyChange(product, e.target.value)}
                    onBlur={() => onQtyBlur(product)}
                    aria-label={`Order quantity for ${line.name}`}
                    className="num w-10 bg-transparent border-0 text-center font-bold outline-none"
                  />
                  <StepButton label={`Increase order quantity for ${line.name}`} onClick={() => onQtyBump(product, 1)}>
                    +
                  </StepButton>
                </div>
                {qty !== suggested && <div className="text-[11px] text-ink-2 mt-0.5">suggested {suggested}</div>}
              </div>
              <div className={`num text-right w-16 ${checked ? 'font-semibold' : 'text-ink-2'}`}>
                ${centsToDollars(qty * line.unitCostCents)}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function StepButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-[34px] h-[34px] rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer hover:bg-surface-2"
    >
      {children}
    </button>
  )
}

/** Print-only rendering of the order — plain, light and vendor-ready. */
function PrintSheet({
  lines,
  staffName,
  note,
}: {
  lines: PurchaseOrderLine[]
  staffName: string
  note: string
}) {
  const totals = purchaseOrderTotals(lines)
  const groups = groupPurchaseOrderLines(lines)
  const { name, profile } = useBusiness()
  const contact = [profile.address, profile.phone, profile.email, profile.website].map((v) => v.trim()).filter(Boolean)

  return (
    <div className="po-print-sheet" aria-hidden="true">
      <h1>{name} — Purchase Order</h1>
      {contact.length > 0 && <p className="po-meta">{contact.join(' · ')}</p>}
      <p className="po-meta">
        {new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}
        {staffName.trim() ? ` · prepared by ${staffName.trim()}` : ''}
      </p>
      <p className="po-meta">
        {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'} · {totals.unitCount} unit
        {totals.unitCount === 1 ? '' : 's'} · est. total ${centsToDollars(totals.totalCents)}
      </p>
      {note && <p className="po-note">{note}</p>}

      {groups.map((group) => (
        <div className="po-group" key={group.key}>
          <h2>
            {group.vendor}
            {group.brand ? ` · ${group.brand}` : ''}
          </h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th className="po-num">On hand</th>
                <th className="po-num">Par</th>
                <th className="po-num">Order qty</th>
                <th className="po-num">Unit</th>
                <th className="po-num">Line total</th>
              </tr>
            </thead>
            <tbody>
              {group.lines.map((line) => {
                const qty = clampOrderQty(line.qty)
                return (
                  <tr key={line.productId}>
                    <td>
                      <strong>{line.name}</strong>
                      {[line.size, line.category].filter(Boolean).length > 0 && (
                        <div className="po-sub">{[line.size, line.category].filter(Boolean).join(' · ')}</div>
                      )}
                    </td>
                    <td>{line.barcode}</td>
                    <td className="po-num">{line.onHand}</td>
                    <td className="po-num">{line.reorderThreshold}</td>
                    <td className="po-num">
                      <strong>{qty}</strong>
                    </td>
                    <td className="po-num">${centsToDollars(line.unitCostCents)}</td>
                    <td className="po-num">${centsToDollars(qty * line.unitCostCents)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      <p className="po-total">Order total: ${centsToDollars(totals.totalCents)}</p>
      <p className="po-meta">Prepared in Bintro.</p>
    </div>
  )
}
