import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ExternalLink, Search, Sparkles } from 'lucide-react'
import type { Product } from './types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { Thumb, centsToDollars } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { applyWebPrice, checkWebPrice } from '@/server/insights.functions'
import type { WebPriceResult } from '@/lib/insights'

type Found = Extract<WebPriceResult, { ok: true }>
type RowState = {
  cost: string
  /** AI result shown on the row (applied only when staff tap Use / Save). */
  found?: Found
  /** "Not found" / error message from the last AI check. */
  note?: string
  checking?: boolean
  saving?: boolean
}

const toCents = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0
}
const SOURCE_LABEL: Record<string, string> = {
  manufacturer: 'Brand site',
  distributor: 'Pro distributor',
  amazon: 'Marketplace',
}

/**
 * Products → Missing costs: every product with no cost in one list. Tap an item
 * to type its cost, or "Find with AI" for that item; or "Find all with AI" to
 * look the list up. AI only reports real listed costs (no guesses), never fills
 * retail, and nothing is saved until staff approve it (per row, or "Save N found").
 */
export function MissingCostsSheet({
  open,
  onClose,
  products,
  onDone,
}: {
  open: boolean
  onClose: () => void
  products: Product[]
  onDone: () => void | Promise<void>
}) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const [rows, setRows] = useState<Record<number, RowState>>({})
  // Saved while the sheet is open: hidden right away, before products refresh.
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number; found: number; message: string }>({
    running: false,
    done: 0,
    total: 0,
    found: 0,
    message: '',
  })
  const stop = useRef(false)

  useEffect(() => {
    if (open) return
    stop.current = true
    setQuery('')
    setOpenId(null)
    setRows({})
    setSaved(new Set())
    setBulk({ running: false, done: 0, total: 0, found: 0, message: '' })
  }, [open])

  const missing = useMemo(
    () =>
      products
        .filter((p) => !p.unitCostCents && !saved.has(p.id))
        .sort((a, b) => (a.brand || a.name).localeCompare(b.brand || b.name) || a.name.localeCompare(b.name)),
    [products, saved],
  )
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return missing
    return missing.filter((p) => [p.name, p.brand, p.vendor, p.category, p.barcode].join(' ').toLowerCase().includes(q))
  }, [missing, query])

  const row = (p: Product): RowState => rows[p.id] ?? { cost: '' }
  const patch = (id: number, next: Partial<RowState>) => setRows((r) => ({ ...r, [id]: { ...(r[id] ?? { cost: '' }), ...next } }))

  async function findOne(p: Product) {
    patch(p.id, { checking: true, note: undefined })
    try {
      const r = await checkWebPrice({
        data: { productId: p.id, name: p.name, brand: p.brand, size: p.size, category: p.category, vendor: p.vendor, barcode: p.barcode },
      })
      if (r.ok && r.unitCostCents > 0) {
        patch(p.id, { checking: false, found: r, cost: centsToDollars(r.unitCostCents) })
      } else {
        patch(p.id, { checking: false, note: r.ok ? 'No cost found. Type it in from your invoice.' : r.message })
      }
    } catch {
      patch(p.id, { checking: false, note: 'The AI check didn’t answer. Try again or type it in.' })
    }
  }

  async function saveOne(p: Product) {
    const st = row(p)
    const cost = toCents(st.cost)
    if (!cost) return toast('Type a cost first.')
    patch(p.id, { saving: true })
    try {
      await saveCost(p.id, cost, st.found && cost === st.found.unitCostCents ? st.found.checkId : undefined)
      setSaved((s) => new Set(s).add(p.id))
      setOpenId(null)
      toast(`${p.name}: cost $${centsToDollars(cost)} saved`)
    } catch {
      patch(p.id, { saving: false })
      toast('Couldn’t save that cost. Try again.')
    }
  }

  /** Cost only; retail is never touched here. Keeps the AI source on record when its number is what's saved. */
  async function saveCost(productId: number, cost: number, checkId?: number) {
    await applyWebPrice({ data: { productId, checkId: checkId || undefined, unitCostCents: cost } })
  }

  const foundRows = shown.filter((p) => {
    const st = rows[p.id]
    return st?.found && toCents(st.cost) > 0 && !st.saving
  })

  async function saveFound() {
    let n = 0
    for (const p of foundRows) {
      const st = rows[p.id]!
      const cost = toCents(st.cost)
      try {
        await saveCost(p.id, cost, st.found && cost === st.found.unitCostCents ? st.found.checkId : undefined)
        setSaved((s) => new Set(s).add(p.id))
        n++
      } catch {
        patch(p.id, { note: 'Couldn’t save this one. Try again.' })
      }
    }
    if (n) toast(`${n} cost${n === 1 ? '' : 's'} saved`)
    await onDone()
  }

  async function findAll() {
    stop.current = false
    const queue = [...shown]
    let done = 0
    let found = 0
    let unreachable = 0
    setBulk({ running: true, done: 0, total: queue.length, found: 0, message: '' })
    const worker = async () => {
      while (queue.length && !stop.current) {
        const p = queue.shift()!
        patch(p.id, { checking: true, note: undefined })
        try {
          const r = await checkWebPrice({
            data: { productId: p.id, name: p.name, brand: p.brand, size: p.size, category: p.category, vendor: p.vendor, barcode: p.barcode },
          })
          if (r.ok && r.unitCostCents > 0) {
            // Shown for review, not saved: staff check the source first.
            patch(p.id, { checking: false, found: r, cost: centsToDollars(r.unitCostCents) })
            found++
          } else {
            patch(p.id, { checking: false, note: r.ok ? 'No cost found' : r.message })
            if (!r.ok && /couldn't check|isn't available/i.test(r.message)) unreachable++
          }
        } catch {
          unreachable++
          patch(p.id, { checking: false, note: 'The AI check didn’t answer' })
        }
        done++
        setBulk((b) => ({ ...b, done, found }))
        if (unreachable >= 3 && found === 0) {
          stop.current = true
          setBulk((b) => ({ ...b, message: "The AI price service isn't answering right now. Nothing was changed — you can still type costs in." }))
        }
      }
    }
    await Promise.all([worker(), worker()])
    setBulk((b) => ({ ...b, running: false }))
    if (found) toast(`AI found ${found} listed cost${found === 1 ? '' : 's'}. Check them, then save.`)
  }

  const close = async () => {
    stop.current = true
    onClose()
    if (saved.size) await onDone()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Missing costs"
      subtitle="Tap an item to type its cost from your invoice, or let AI look for a real listed price (your supplier, pro distributors, the brand’s site). AI never guesses and never fills retail; you approve before anything saves."
    >
      <div className="flex items-center gap-2 mb-3">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
          <input
            className="field-input !pl-9"
            placeholder={`Search ${missing.length} item${missing.length === 1 ? '' : 's'}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search items missing a cost"
          />
        </label>
      </div>

      {(bulk.running || bulk.done > 0) && (
        <p className="text-sm mt-0">
          AI checked {bulk.done} of {bulk.total} · <b className="text-good">{bulk.found} found to review</b>
          {bulk.running && ' · keep this open while it runs (20–40 seconds each)'}
        </p>
      )}
      {bulk.message && <p className="text-bad text-sm font-semibold">{bulk.message}</p>}

      {missing.length === 0 ? (
        <p className="text-sm text-good font-semibold">Every product has a cost. Nice.</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-ink-2">Nothing matches that search.</p>
      ) : (
        <ul className="list-none m-0 p-0">
          {shown.map((p) => {
            const st = row(p)
            const isOpen = openId === p.id
            return (
              <li key={p.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 py-2.5 bg-transparent border-0 text-left cursor-pointer"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : p.id)}
                >
                  <Thumb imageUrl={p.imageUrl} label={p.brand || p.name} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{p.name}</span>
                    <span className="block text-[12px] text-ink-2 truncate">
                      {[p.brand, p.size, p.vendor].filter(Boolean).join(' · ') || 'No brand or vendor yet'}
                    </span>
                  </span>
                  {st.checking ? (
                    <span className="text-[12px] text-ink-2">Checking…</span>
                  ) : st.found ? (
                    <span className="text-[12px] text-good font-semibold">Found ${centsToDollars(st.found.unitCostCents)} · review</span>
                  ) : st.note ? (
                    <span className="text-[12px] text-ink-2">Not found</span>
                  ) : null}
                  <ChevronDown size={18} className={`text-ink-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="pb-3 pl-[52px]">
                    <label className="block max-w-[220px] mb-2">
                      <span className="text-[12px] text-ink-2">Your cost $</span>
                      <input
                        className="field-input !py-2"
                        inputMode="decimal"
                        placeholder="0.00"
                        autoFocus
                        value={st.cost}
                        onChange={(e) => patch(p.id, { cost: e.target.value })}
                      />
                    </label>

                    {st.found && (
                      <p className="text-[12px] text-ink-2 mt-0 mb-2">
                        Listed at {st.found.sourceName}
                        {SOURCE_LABEL[st.found.sourceType] ? ` (${SOURCE_LABEL[st.found.sourceType].toLowerCase()})` : ''}
                        {st.found.sourceUrl && (
                          <a href={st.found.sourceUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5">
                            view <ExternalLink size={11} />
                          </a>
                        )}
                        {st.found.note && <span className="block">{st.found.note}</span>}
                      </p>
                    )}
                    {st.note && <p className="text-[12px] text-ink-2 mt-0 mb-2">{st.note}</p>}

                    <div className="flex gap-2 flex-wrap">
                      <button type="button" className="btn btn-primary btn-sm" disabled={st.saving || st.checking || !st.cost.trim()} onClick={() => saveOne(p)}>
                        {st.saving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="btn btn-tonal btn-sm" disabled={st.checking || bulk.running} onClick={() => findOne(p)}>
                        <Sparkles size={15} /> {st.checking ? 'Checking…' : st.found || st.note ? 'Check again' : 'Find with AI'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <SheetActions>
        {!bulk.running && foundRows.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={saveFound}>
            Save {foundRows.length} found
          </button>
        )}
        {bulk.running ? (
          <button type="button" className="btn btn-tonal" onClick={() => (stop.current = true)}>
            Stop AI
          </button>
        ) : (
          <button type="button" className={`btn ${foundRows.length ? 'btn-tonal' : 'btn-primary'}`} disabled={shown.length === 0} onClick={findAll}>
            <Sparkles size={16} /> Find {query.trim() ? `these ${shown.length}` : `all ${shown.length}`} with AI
          </button>
        )}
        <button type="button" className="btn btn-tonal" onClick={close}>
          Done
        </button>
      </SheetActions>
    </Sheet>
  )
}
