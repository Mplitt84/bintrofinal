import { useMemo, useState } from 'react'
import { GitMerge, Search } from 'lucide-react'
import type { Product } from './types'

/** Words that don't tell two products apart ("GM Reverie Mare" vs "Reverie Mare"). */
const NOISE = new Set(['gm', 'the', 'and', 'oz', 'ml', 'fl', 'sm', 'lg', 'refill', 'new'])

function words(p: Pick<Product, 'name' | 'brand'>) {
  return new Set(
    `${p.brand} ${p.name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 1 && !NOISE.has(w)),
  )
}

/** How alike two products' names are, 0–1 (share of words in common). */
function likeness(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const w of a) if (b.has(w)) shared++
  return shared / Math.max(a.size, b.size)
}

/**
 * "This is a duplicate": pick the product it really is and fold this one into it.
 * The closest name matches are listed first so most merges are one tap.
 */
export function MergePanel({
  product,
  products,
  onMerge,
}: {
  product: Product
  products: Product[]
  onMerge: (target: Product) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<Product | null>(null)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState('')

  const options = useMemo(() => {
    const mine = words(product)
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => p.id !== product.id)
      .filter((p) => !q || `${p.brand} ${p.name} ${p.barcode}`.toLowerCase().includes(q))
      .map((p) => ({ p, score: likeness(mine, words(p)) }))
      .filter((o) => q || o.score > 0)
      .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
      .slice(0, 8)
      .map((o) => o.p)
  }, [product, products, query])

  if (!open) {
    return (
      <button type="button" className="btn btn-text btn-sm mt-3" onClick={() => setOpen(true)}>
        <GitMerge size={16} />
        Duplicate? Merge into another product
      </button>
    )
  }

  return (
    <div className="bg-surface rounded-2xl p-3 mt-3">
      <p className="text-sm font-semibold m-0">Which product is this really?</p>
      <p className="text-[12px] text-ink-2 m-0 mt-0.5 mb-2">
        {product.name} will be folded into the one you pick: its barcode, Square link and sales history move over, the
        product you pick keeps its own count, and this copy is removed.
      </p>
      <label className="relative block mb-2">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
        <input
          className="field-input !pl-9"
          placeholder="Search products"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setTarget(null)
          }}
        />
      </label>
      {options.length === 0 ? (
        <p className="text-[13px] text-ink-2 m-0">No close matches. Search by name, brand or barcode.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {options.map((p) => (
            <button
              key={p.id}
              type="button"
              className="chip !justify-start !text-left !rounded-xl !px-3 !py-2"
              aria-pressed={target?.id === p.id}
              onClick={() => setTarget(p)}
            >
              <span className="flex flex-col">
                <span className="font-semibold">{p.name}</span>
                <span className={`text-[12px] font-normal ${target?.id === p.id ? 'text-white/70' : 'text-ink-2'}`}>
                  {[p.brand, p.category, `${p.qty} on hand`].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-bad text-sm mt-2 mb-0">{error}</p>}
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          className="btn btn-tonal btn-sm"
          onClick={() => {
            setOpen(false)
            setTarget(null)
            setError('')
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!target || merging}
          onClick={async () => {
            if (!target) return
            setMerging(true)
            setError('')
            try {
              await onMerge(target)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not merge. Try again.')
              setMerging(false)
            }
          }}
        >
          <GitMerge size={15} />
          {merging ? 'Merging…' : target ? `Merge into ${target.name}` : 'Pick a product'}
        </button>
      </div>
    </div>
  )
}
