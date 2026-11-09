import { useMemo, useState } from 'react'
import { CircleMinus, ClipboardCheck, Copy, Gauge, Pencil, Search, Tag } from 'lucide-react'
import type { Product, Stats } from './types'
import { createProduct, deleteProduct, linkBarcodeToProduct, mergeProducts, updateProduct } from '@/server/inventory.functions'
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

  return (
    <div>
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
              <li key={p.id} className="flex items-center gap-3 py-3 border-b border-line last:border-b-0">
                <Thumb imageUrl={p.imageUrl} label={p.brand || p.name} />
                <button
                  onClick={() => setEditing(p)}
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
