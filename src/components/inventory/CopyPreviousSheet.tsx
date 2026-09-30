import { useMemo, useState } from 'react'
import { Copy, Search } from 'lucide-react'
import type { Product } from './types'
import { rankPreviousEntries, type EntryContext } from '@/lib/entry-predictions'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { Thumb, centsToDollars } from '@/components/ui/bits'

export const COPY_PROMPT_OFF_KEY = 'shagnoir-copy-prompt-off'

/**
 * "Copy a previous entry?" pop-up for new products. Lists entries that look like
 * the one being added (same brand, name words, category…) and then the most
 * recent ones, styled like the Products list. Picking one copies its details.
 */
export function CopyPreviousSheet({
  open,
  products,
  context,
  onPick,
  onClose,
}: {
  open: boolean
  products: Product[]
  context: Partial<EntryContext>
  onPick: (product: Product) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [dontAsk, setDontAsk] = useState(() => {
    try {
      return localStorage.getItem(COPY_PROMPT_OFF_KEY) === '1'
    } catch {
      return false
    }
  })
  const entries = useMemo(() => rankPreviousEntries(products, context, query), [products, context, query])
  const anySimilar = !query && entries.some((e) => e.similar)

  function toggleDontAsk(v: boolean) {
    setDontAsk(v)
    try {
      if (v) localStorage.setItem(COPY_PROMPT_OFF_KEY, '1')
      else localStorage.removeItem(COPY_PROMPT_OFF_KEY)
    } catch {
      // Private mode: the choice just lasts for this visit.
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={anySimilar ? 'Looks like something you’ve added' : 'Copy a previous entry?'}
      subtitle="Pick one and Bintro copies its brand, category, size, supplier, reorder level and prices. You only add the name and barcode."
    >
      <label className="flex items-center gap-2.5 bg-surface rounded-full px-4 mb-2">
        <Search size={18} className="text-ink-2 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find another entry"
          aria-label="Search previous entries"
          className="flex-1 border-0 bg-transparent py-3 text-base outline-none"
        />
      </label>

      {entries.length === 0 ? (
        <p className="text-ink-2 text-sm text-center py-6 m-0">Nothing matches “{query}”.</p>
      ) : (
        <ul className="list-none m-0 p-0">
          {entries.map(({ product: p, similar }) => (
            <li key={p.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onPick(p)}
                className="w-full flex items-center gap-3 py-3 text-left border-0 bg-transparent cursor-pointer rounded-xl hover:bg-surface px-1 -mx-1"
              >
                <Thumb imageUrl={p.imageUrl} label={p.brand || p.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {p.name}
                    {similar && (
                      <span className="ml-2 align-middle inline-block text-[11px] font-semibold px-2 rounded-full bg-action-tint text-action">
                        Similar
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-ink-2 truncate">
                    {[p.brand, p.category, p.size, p.vendor].filter(Boolean).join(', ') || p.barcode}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap num">
                  <div className="text-[15px] font-bold leading-tight">
                    {p.unitCostCents > 0 ? `$${centsToDollars(p.unitCostCents)}` : '—'}
                    <span className="text-[12px] font-semibold text-ink-2"> cost</span>
                  </div>
                  {p.retailPriceCents > 0 && (
                    <div className="text-[13px] text-ink-2">sells ${centsToDollars(p.retailPriceCents)}</div>
                  )}
                </div>
                <Copy size={16} className="text-ink-2 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="flex items-center gap-2 text-sm text-ink-2 mt-3 cursor-pointer">
        <input type="checkbox" checked={dontAsk} onChange={(e) => toggleDontAsk(e.target.checked)} />
        Don’t pop this up automatically (the Copy button stays on the form)
      </label>

      <SheetActions>
        <button type="button" className="btn btn-tonal" onClick={onClose}>
          Start blank
        </button>
      </SheetActions>
    </Sheet>
  )
}
