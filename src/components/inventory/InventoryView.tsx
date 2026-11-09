import { useMemo, useState } from 'react'
import { CheckSquare, CircleMinus, ClipboardCheck, Copy, Gauge, Pencil, Search, Tag, Trash2, X } from 'lucide-react'
import type { Product, Stats } from './types'
import { bulkDeleteProducts, createProduct, deleteProduct, linkBarcodeToProduct, mergeProducts, updateProduct } from '@/server/inventory.functions'
import { BulkEditSheet } from './BulkEditSheet'
import { Sheet } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { CountSheet, DuplicatesSheet, FillCostsSheet, SmartParSheet } from './TidyTools'
import { EmptyState, PageHead, StatGrid, StatTile, Thumb, centsToDollars, dollarsShort } from '@/components/ui/bits'
import { ProductForm } from './ProductForm'
import { ToolButton } from '@/components/ui/ToolButton'
import { daysToExpiry, expiryLabel, expiryState } from '@/lib/expiry'
import { isBelowPar, stockStatus } from '@/lib/inventory-defaults'

type StockFilter = 'all' | 'below' | 'out' | 'expiring'

export function InventoryView({
  products,
  stats,
  staffName,
  onProduct,
  onChanged,
}: {
  products: Product[]
  stats: Stats
  staffName: string
  /** Puts a saved product's new numbers on every tab immediately. */
  onProduct?: (product: Product) => void
  onChanged: () => void | Promise<void>
}) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StockFilter>('all')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState<Product | null>(null)
  const [adding, setAdding] = useState(false)
  // Clean-up tools: count a shelf, fix negatives, duplicates, missing costs.
  const [tool, setTool] = useState<null | 'count' | 'negatives' | 'duplicates' | 'costs' | 'smartpar'>(null)
  // Bulk edit: select products, then edit or delete them together.
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const expiringCount = useMemo(() => products.filter((p) => ['soon', 'expired'].includes(expiryState(p.expiresOn))).length, [products])
  const negativeIds = useMemo(() => products.filter((p) => p.qty < 0).map((p) => p.id), [products])
  const missingCosts = useMemo(() => products.filter((p) => !p.unitCostCents).length, [products])

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products],
  )

  const filtered = products.filter((p) => {
    if (filter === 'below' && !isBelowPar(p)) return false
    if (filter === 'out' && stockStatus(p) !== 'out') return false
    if (filter === 'expiring' && !['soon', 'expired'].includes(expiryState(p.expiresOn))) return false
    if (category !== 'all' && p.category !== category) return false
    if (query.trim()) {
      const q = query.toLowerCase()
      const haystack = [p.name, p.brand, p.barcode, ...(p.extraBarcodes ?? []), p.vendor, p.category].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  const selectedProducts = products.filter((p) => selected.has(p.id))
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  function toggle(id: number) {
    setDeleteArmed(false)
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function stopSelecting() {
    setSelecting(false)
    setSelected(new Set())
    setDeleteArmed(false)
  }

  async function deleteSelected() {
    if (!deleteArmed) {
      setDeleteArmed(true)
      return
    }
    setBulkBusy(true)
    try {
      const r = await bulkDeleteProducts({ data: { productIds: [...selected] } })
      toast(`Deleted ${r.deleted} product${r.deleted === 1 ? '' : 's'}`)
      stopSelecting()
      await onChanged()
    } catch {
      toast("Couldn't delete those. Check your connection and try again.")
    } finally {
      setBulkBusy(false)
      setDeleteArmed(false)
    }
  }

  return (
    <div className={selecting ? 'pb-24' : ''}>
      <PageHead
        title="Products"
        lead="Everything on the shelf, and everything Bintro recognizes when you scan."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            Add product
          </button>
        }
      />

      <StatGrid>
        <StatTile label="Units on hand" value={stats.totalItems} />
        <StatTile label="Stock value" value={dollarsShort(stats.totalValueCents)} />
        <StatTile label="Below par" value={stats.belowPar} tone={stats.belowPar > 0 ? 'warn' : 'good'} />
        <StatTile label="Out of stock" value={stats.outOfStock} tone={stats.outOfStock > 0 ? 'bad' : 'good'} />
      </StatGrid>

      <div className="flex gap-4 overflow-x-auto pb-2 mb-3 -mx-1 px-1" role="group" aria-label="Keep your stock accurate">
        <ToolButton icon={<ClipboardCheck size={24} />} color="bg-action" label="Count stock" onClick={() => setTool('count')} />
        <ToolButton icon={<Gauge size={24} />} color="bg-gold" label="Smart par" onClick={() => setTool('smartpar')} />
        {negativeIds.length > 0 && (
          <ToolButton icon={<CircleMinus size={24} />} color="bg-bad" label="Fix negatives" badge={negativeIds.length} onClick={() => setTool('negatives')} />
        )}
        {missingCosts > 0 && (
          <ToolButton icon={<Tag size={24} />} color="bg-warn" label="Missing costs" badge={missingCosts} onClick={() => setTool('costs')} />
        )}
        <ToolButton icon={<Copy size={24} />} color="bg-royal-2" label="Duplicates" onClick={() => setTool('duplicates')} />
      </div>

      <CountSheet
        open={tool === 'count' || tool === 'negatives'}
        onClose={() => setTool(null)}
        products={products}
        staffName={staffName}
        prefillIds={tool === 'negatives' ? negativeIds : undefined}
        onDone={onChanged}
      />
      <SmartParSheet open={tool === 'smartpar'} onClose={() => setTool(null)} onDone={onChanged} />
      <DuplicatesSheet open={tool === 'duplicates'} onClose={() => setTool(null)} onDone={onChanged} />
      <FillCostsSheet open={tool === 'costs'} onClose={() => setTool(null)} products={products} onDone={onChanged} />

      <label className="flex items-center gap-2.5 bg-surface rounded-full px-4 mb-3.5">
        <Search size={20} className="text-ink-2 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brand, product, vendor or barcode"
          aria-label="Search products"
          className="flex-1 border-0 bg-transparent py-3.5 text-base outline-none"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 items-center">
        <button
          type="button"
          className="chip !bg-royal !text-white"
          aria-pressed={selecting}
          onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
        >
          {selecting ? <X size={14} /> : <CheckSquare size={14} />}
          {selecting ? 'Done selecting' : 'Select'}
        </button>
        {(['all', 'below', 'out', 'expiring'] as const)
          .filter((f) => f !== 'expiring' || expiringCount > 0)
          .map((f) => (
            <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all'
                ? `All ${stats.skuCount}`
                : f === 'below'
                  ? `Below par${stats.belowPar ? ` ${stats.belowPar}` : ''}`
                  : f === 'out'
                    ? `Out of stock${stats.outOfStock ? ` ${stats.outOfStock}` : ''}`
                    : `Expiring ${expiringCount}`}
            </button>
          ))}
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
            className="chip"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={products.length === 0 ? 'No products yet' : 'No products match'}>
          {products.length === 0
            ? 'Scan a product on the Scan tab and Bintro adds it here.'
            : 'Try a brand name, part of the barcode, or a different filter.'}
        </EmptyState>
      ) : (
        <ul className="list-none m-0 p-0">
          {filtered.map((p) => {
            const status = stockStatus(p)
            const out = status === 'out'
            const low = status === 'low'
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 py-3 border-b border-line last:border-b-0 ${selecting && selected.has(p.id) ? 'bg-action-tint/50 -mx-2 px-2 rounded-xl' : ''}`}
              >
                {selecting && (
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Select ${p.name}`}
                    className="w-5 h-5 accent-[var(--color-action)] cursor-pointer shrink-0"
                  />
                )}
                <Thumb imageUrl={p.imageUrl} label={p.brand || p.name} />
                <button
                  onClick={() => (selecting ? toggle(p.id) : setEditing(p))}
                  className="flex-1 min-w-0 text-left border-0 bg-transparent p-0 cursor-pointer"
                >
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-[13px] text-ink-2 truncate">
                    <ExpiryTag value={p.expiresOn} />
                    {[p.brand, p.size, p.vendor].filter(Boolean).join(', ') || p.barcode}
                    {p.retailPriceCents > 0 && <span className="num"> · sells ${centsToDollars(p.retailPriceCents)}</span>}
                  </div>
                </button>
                <div className="text-right whitespace-nowrap">
                  <div className={`num text-lg font-bold leading-tight ${out ? 'text-bad' : low ? 'text-warn' : ''}`}>
                    {p.qty}
                    <span className="text-[12px] font-semibold text-ink-2"> on hand</span>
                  </div>
                  <div className="num text-[13px] text-ink-2">
                    {out ? (
                      <span className="inline-block text-[12px] font-semibold px-2 rounded-full bg-bad-tint text-bad">Out</span>
                    ) : low ? (
                      <span className="inline-block text-[12px] font-semibold px-2 rounded-full bg-warn-tint text-warn">
                        Par {p.reorderThreshold}
                      </span>
                    ) : (
                      `$${centsToDollars(p.qty * p.unitCostCents)}`
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(p)}
                  aria-label={`Edit ${p.name}`}
                  className="w-10 h-10 rounded-full border-0 bg-transparent grid place-items-center text-ink-2 cursor-pointer hover:bg-surface"
                >
                  <Pencil size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selecting && (
        <div className="fixed left-0 right-0 bottom-[76px] z-[45] px-3 pointer-events-none">
          <div className="pointer-events-auto max-w-[760px] mx-auto bg-white border border-line rounded-2xl shadow-lift px-3 py-2.5 flex items-center gap-2 flex-wrap">
            <b className="text-sm mr-1">{selected.size} selected</b>
            <button
              type="button"
              className="btn btn-text btn-sm"
              onClick={() => {
                setDeleteArmed(false)
                setSelected(allFilteredSelected ? new Set() : new Set([...selected, ...filtered.map((p) => p.id)]))
              }}
            >
              {allFilteredSelected ? 'Clear' : `Select all ${filtered.length}`}
            </button>
            <span className="flex-1" />
            <button type="button" className="btn btn-primary btn-sm" disabled={selected.size === 0 || bulkBusy} onClick={() => setBulkOpen(true)}>
              <Pencil size={15} />
              Edit {selected.size || ''}
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={selected.size === 0 || bulkBusy} onClick={deleteSelected}>
              <Trash2 size={15} />
              {bulkBusy ? 'Deleting…' : deleteArmed ? `Tap again to delete ${selected.size}` : 'Delete'}
            </button>
          </div>
          {deleteArmed && (
            <p className="pointer-events-auto max-w-[760px] mx-auto mt-1 text-center text-[12px] text-bad font-semibold bg-white/90 rounded-lg py-1">
              Deleting removes these products and their scan history for good. Tap again to confirm.
            </p>
          )}
        </div>
      )}

      <BulkEditSheet
        open={bulkOpen}
        products={selectedProducts}
        onClose={() => setBulkOpen(false)}
        onDone={async () => {
          await onChanged()
          stopSelecting()
        }}
      />

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit product"
        subtitle="Changes apply to future scans and orders. Editing the on-hand count is logged as an adjustment."
      >
        {editing && (
          <ProductForm
            key={editing.id}
            product={editing}
            products={products}
            saveLabel="Save"
            onCancel={() => setEditing(null)}
            onSave={async ({ barcode, ...values }) => {
              let saved = (await updateProduct({ data: { productId: editing.id, ...values, staffName } })) as Product
              // The barcode has its own update path so a relink never touches stock.
              if (barcode !== editing.barcode) {
                saved = (await linkBarcodeToProduct({ data: { productId: editing.id, barcode } })) as Product
              }
              if (saved) onProduct?.(saved)
              setEditing(null)
              await onChanged()
              toast(`Saved ${values.name}`)
            }}
            onDelete={async () => {
              await deleteProduct({ data: { productId: editing.id } })
              setEditing(null)
              await onChanged()
              toast(`Deleted ${editing.name}`)
            }}
            onMerge={async (target) => {
              const r = (await mergeProducts({ data: { sourceId: editing.id, targetId: target.id } })) as { product: Product }
              if (r?.product) onProduct?.(r.product)
              setEditing(null)
              await onChanged()
              toast(`Merged ${editing.name} into ${target.name}`)
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add product"
        subtitle="Add it by hand, look the barcode up, or scan it from the Scan tab."
      >
        {adding && (
          <ProductForm
            products={products}
            qtyLabel="Starting qty"
            saveLabel="Add product"
            onCancel={() => setAdding(false)}
            onSave={async (values) => {
              const created = (await createProduct({ data: values })) as Product
              if (created) onProduct?.(created)
              setAdding(false)
              await onChanged()
              toast(`Added ${values.name}`)
            }}
          />
        )}
      </Sheet>
    </div>
  )
}


/** Small expiry marker in a product row: red once expired, amber within 60 days. */
function ExpiryTag({ value }: { value: string }) {
  const state = expiryState(value)
  if (state !== 'soon' && state !== 'expired') return null
  const days = daysToExpiry(value) ?? 0
  return (
    <span
      className={`inline-block mr-1.5 text-[11px] font-bold px-1.5 rounded-full ${state === 'expired' ? 'bg-bad-tint text-bad' : 'bg-warn-tint text-warn'}`}
      title={`Expires ${expiryLabel(value)}`}
    >
      {state === 'expired' ? 'Expired' : days === 0 ? 'Expires today' : `Expires in ${days}d`}
    </span>
  )
}
