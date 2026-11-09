import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { Product } from './types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { centsToDollars } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { mergeProducts } from '@/server/inventory.functions'
import { applyWebPrice, checkWebPrice } from '@/server/insights.functions'
import {
  getCategoryGroups,
  getDuplicateGroups,
  getSmartPars,
  mergeCategories,
  saveCounts,
  setPars,
} from '@/server/tidy.functions'
import type { CategoryGroup, DuplicateGroup, SmartParResult } from '@/lib/tidy'
import { useBusiness } from '@/components/business/BusinessContext'
import { updateBusinessProfile } from '@/server/business.functions'

/* ------------------------------------------------------------------ Count stock */

/**
 * Count a shelf: scan (a wand types into the box) or search each product, enter
 * what's there, save. Each count becomes an adjustment, Square sales are pulled
 * first and Square gets the new counts.
 */
export function CountSheet({
  open,
  onClose,
  products,
  staffName,
  prefillIds,
  onDone,
}: {
  open: boolean
  onClose: () => void
  products: Product[]
  staffName: string
  /** Products to start the count with (e.g. everything below zero). */
  prefillIds?: number[]
  onDone: () => void | Promise<void>
}) {
  const toast = useToast()
  const [rows, setRows] = useState<{ id: number; counted: string }[]>([])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  useEffect(() => {
    if (!open) return
    setRows((prefillIds ?? []).map((id) => ({ id, counted: '' })))
    setQuery('')
    // prefillIds is read when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products
      .filter((p) => [p.name, p.brand, p.size, p.barcode, ...(p.extraBarcodes ?? [])].join(' ').toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, products])

  function add(id: number) {
    setRows((all) => {
      const found = all.find((r) => r.id === id)
      // Scanning the same item again adds one to its count.
      if (found) return all.map((r) => (r.id === id ? { ...r, counted: String((Number(r.counted) || 0) + 1) } : r))
      return [{ id, counted: '1' }, ...all]
    })
    setQuery('')
    inputRef.current?.focus()
  }

  function onEnter() {
    const q = query.trim()
    const exact = products.find((p) => p.barcode === q || (p.extraBarcodes ?? []).includes(q))
    if (exact) add(exact.id)
    else if (matches.length === 1) add(matches[0].id)
  }

  async function save() {
    const counts = rows
      .filter((r) => r.counted.trim() !== '' && Number.isFinite(Number(r.counted)))
      .map((r) => ({ productId: r.id, counted: Math.max(0, Math.trunc(Number(r.counted))) }))
    if (counts.length === 0) return
    setSaving(true)
    try {
      await saveCounts({ data: { staffName, counts } })
      await onDone()
      toast(`Saved counts for ${counts.length} product${counts.length === 1 ? '' : 's'}`)
      onClose()
    } catch (error) {
      toast(error instanceof Error && error.message ? `Couldn't save: ${error.message}` : "Couldn't save the count. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  const changed = rows.filter((r) => r.counted.trim() !== '').length
  const fixing = Boolean(prefillIds?.length)

  function setCount(id: number, counted: string) {
    setRows((all) => all.map((x) => (x.id === id ? { ...x, counted } : x)))
  }

  const search = (
    <>
      <input
        ref={inputRef}
        autoFocus={!fixing}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        placeholder={fixing ? 'Add another product: scan or type a name' : 'Scan a barcode or type a name'}
        aria-label="Scan or search a product to count"
        className="field-input"
      />
      {matches.length > 0 && (
        <ul className="list-none m-0 mt-1 p-0 border border-line rounded-xl">
          {matches.map((p) => (
            <li key={p.id}>
              <button type="button" className="w-full text-left px-3 py-2 border-0 bg-transparent cursor-pointer hover:bg-surface text-sm" onClick={() => add(p.id)}>
                <b>{p.name}</b> <span className="text-ink-2">{[p.brand, p.size].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={fixing ? `Fix ${prefillIds!.length} negative count${prefillIds!.length === 1 ? '' : 's'}` : 'Count stock'}
      subtitle={
        fixing
          ? "You can't have less than zero on the shelf. This usually happens when something was used or sold before its delivery was scanned in. Count what's really there and enter it."
          : "Scan or search each product on the shelf and enter what's there."
      }
    >
      {fixing ? (
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="m-0 text-[13px] text-ink-2">Nothing on the shelf? Tap 0, or set them all at once.</p>
          <button type="button" className="btn btn-tonal btn-sm shrink-0" onClick={() => setRows((all) => all.map((r) => ({ ...r, counted: '0' })))}>
            Set all to 0
          </button>
        </div>
      ) : (
        search
      )}
      <ul className="list-none m-0 mt-2 p-0 max-h-[46vh] overflow-auto">
        {rows.map((r) => {
          const p = byId.get(r.id)
          if (!p) return null
          const counted = r.counted.trim() === '' ? null : Math.max(0, Math.trunc(Number(r.counted)))
          const diff = counted === null ? null : counted - p.qty
          return (
            <li key={r.id} className="flex items-center gap-2.5 py-2.5 border-b border-line last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-snug">{p.name}</div>
                <div className="text-[12px] text-ink-2 truncate">{[p.brand, p.size, p.category].filter(Boolean).join(' · ')}</div>
                <div className="text-[12px] mt-0.5">
                  <span className={p.qty < 0 ? 'text-bad font-semibold' : 'text-ink-2'}>Bintro shows {p.qty}</span>
                  {counted !== null && diff !== 0 && (
                    <span className="text-ink-2">
                      {' '}
                      → will be <b className="text-ink">{counted}</b> ({diff! > 0 ? '+' : ''}
                      {diff})
                    </span>
                  )}
                </div>
              </div>
              {p.qty < 0 && (
                <button
                  type="button"
                  className="btn btn-tonal btn-sm shrink-0"
                  aria-pressed={r.counted === '0'}
                  onClick={() => setCount(r.id, '0')}
                  title="None on the shelf"
                >
                  0
                </button>
              )}
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`How many ${p.name} on the shelf`}
                value={r.counted}
                placeholder="#"
                onChange={(e) => setCount(r.id, e.target.value)}
                className="field-input !w-[72px] shrink-0 text-center !px-1 !py-1.5"
              />
            </li>
          )
        })}
        {rows.length === 0 && <li className="text-ink-2 text-sm py-3">Nothing counted yet.</li>}
      </ul>
      {fixing && <div className="mt-3">{search}</div>}
      <SheetActions>
        <button type="button" className="btn btn-tonal" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={changed === 0 || saving} onClick={save}>
          {saving ? 'Saving…' : changed === 0 ? 'Enter a count to save' : `Save ${changed} count${changed === 1 ? '' : 's'}`}
        </button>
      </SheetActions>
    </Sheet>
  )
}

/* ------------------------------------------------------------- Duplicate finder */

/** Products listed twice (same name, size and category): keep one, fold the rest into it. */
export function DuplicatesSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void | Promise<void> }) {
  const toast = useToast()
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null)
  const [keep, setKeep] = useState<Record<number, number>>({})
  const [busy, setBusy] = useState<number | null>(null)

  async function load() {
    const g = await getDuplicateGroups()
    setGroups(g)
    setKeep(Object.fromEntries(g.map((grp, i) => [i, grp.products[0].id])))
  }

  useEffect(() => {
    if (open) load().catch(() => setGroups([]))
  }, [open])

  async function merge(index: number, group: DuplicateGroup) {
    const target = keep[index] ?? group.products[0].id
    setBusy(index)
    try {
      for (const p of group.products) {
        if (p.id !== target) await mergeProducts({ data: { sourceId: p.id, targetId: target } })
      }
      toast(`Merged into ${group.products.find((p) => p.id === target)?.name}`)
      await onDone()
      await load()
    } catch (error) {
      toast(error instanceof Error && error.message ? error.message : "Couldn't merge those. Try from the product's Edit sheet.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Possible duplicates" subtitle="Same name, size and category. Pick the one to keep; the others fold into it with their stock and barcodes.">
      {!groups ? (
        <p className="text-ink-2 text-sm">Looking for duplicates…</p>
      ) : groups.length === 0 ? (
        <p className="text-ink-2 text-sm">No duplicates found. Retail and backbar copies of a product are kept apart on purpose.</p>
      ) : (
        <ul className="list-none m-0 p-0 max-h-[60vh] overflow-auto grid gap-3">
          {groups.map((g, i) => (
            <li key={g.products.map((p) => p.id).join('-')} className="bg-surface rounded-2xl p-3">
              {g.products.map((p) => (
                <label key={p.id} className="flex items-start gap-2 py-1 cursor-pointer">
                  <input type="radio" name={`keep-${i}`} checked={keep[i] === p.id} onChange={() => setKeep((k) => ({ ...k, [i]: p.id }))} className="mt-1" />
                  <span className="text-sm">
                    <b>{p.name}</b>{' '}
                    <span className="text-ink-2">
                      {[p.brand, p.size, p.category, `${p.qty} on hand`, p.linkedToSquare ? 'Square' : ''].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </label>
              ))}
              <button type="button" className="btn btn-primary btn-sm mt-2" disabled={busy !== null} onClick={() => merge(i, g)}>
                {busy === i ? 'Merging…' : 'Keep the selected one and merge'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

/* ---------------------------------------------------------- Fill missing costs */

/**
 * Runs the AI price check (your supplier → pro distributors → brand) for every
 * product with no cost, two at a time, and saves what it finds.
 */
export function FillCostsSheet({
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
  const missing = useMemo(() => products.filter((p) => !p.unitCostCents), [products])
  const [state, setState] = useState<{ running: boolean; done: number; found: number; failed: number; message: string }>({
    running: false,
    done: 0,
    found: 0,
    failed: 0,
    message: '',
  })
  const stop = useRef(false)
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    if (!open) stop.current = true
  }, [open])

  async function run() {
    stop.current = false
    setLog([])
    setState({ running: true, done: 0, found: 0, failed: 0, message: '' })
    const queue = [...missing]
    let unreachable = 0
    let found = 0
    let failed = 0
    let done = 0
    const worker = async () => {
      while (queue.length && !stop.current) {
        const p = queue.shift()!
        try {
          const r = await checkWebPrice({
            data: { productId: p.id, name: p.name, brand: p.brand, size: p.size, category: p.category, vendor: p.vendor, barcode: p.barcode },
          })
          if (r.ok && r.unitCostCents > 0) {
            await applyWebPrice({
              data: {
                productId: p.id,
                checkId: r.checkId || undefined,
                unitCostCents: r.unitCostCents,
                retailPriceCents: p.retailPriceCents ? undefined : r.retailPriceCents || undefined,
              },
            })
            found++
            setLog((l) => [`${p.name}: $${centsToDollars(r.unitCostCents)} (${r.sourceName})`, ...l].slice(0, 30))
          } else {
            failed++
            if (!r.ok && /couldn't check|isn't available/i.test(r.message)) unreachable++
          }
        } catch {
          failed++
          unreachable++
        }
        done++
        setState((s) => ({ ...s, done, found, failed }))
        // The AI service isn't answering at all: stop instead of burning through the list.
        if (unreachable >= 3 && found === 0) {
          stop.current = true
          setState((s) => ({
            ...s,
            message: "The AI price service isn't answering on this site right now. Nothing was changed.",
          }))
        }
      }
    }
    await Promise.all([worker(), worker()])
    setState((s) => ({ ...s, running: false }))
    await onDone()
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        stop.current = true
        onClose()
      }}
      title="Fill missing costs"
      subtitle="Checks your supplier first, then professional distributors, then the brand's site. Resale sites like eBay are never used."
    >
      <p className="text-sm mt-0">
        <b>{missing.length}</b> product{missing.length === 1 ? ' has' : 's have'} no cost. Each check takes 20–40 seconds; keep this open while it runs.
      </p>
      {(state.running || state.done > 0) && (
        <p className="text-sm">
          Checked {state.done} of {missing.length} · <b className="text-good">{state.found} filled</b>
          {state.failed > 0 && ` · ${state.failed} not found`}
        </p>
      )}
      {state.message && <p className="text-bad text-sm font-semibold">{state.message}</p>}
      {log.length > 0 && (
        <ul className="list-none m-0 p-0 text-[13px] text-ink-2 max-h-40 overflow-auto">
          {log.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <SheetActions>
        {state.running ? (
          <button type="button" className="btn btn-tonal" onClick={() => (stop.current = true)}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={missing.length === 0} onClick={run}>
            {state.done > 0 ? 'Run again' : `Fill ${missing.length} cost${missing.length === 1 ? '' : 's'}`}
          </button>
        )}
      </SheetActions>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ Smart par */

const ORDER_CYCLES = [
  { days: 3, label: 'Twice a week' },
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 30, label: 'Monthly' },
]

/**
 * Smart par: reorder points and "order up to" levels from real usage, real delivery
 * times and how often the business orders, rounded to whole cases. Lean on purpose:
 * small shops have little shelf space and little cash for backstock.
 */
export function SmartParSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void | Promise<void> }) {
  const toast = useToast()
  const { profile } = useBusiness()
  const [data, setData] = useState<SmartParResult | null>(null)
  const [skip, setSkip] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [cycleBusy, setCycleBusy] = useState(false)

  function load() {
    setData(null)
    getSmartPars()
      .then((d) => {
        setData(d)
        // "Not used in 90 days" may only mean it isn't scanned out (back bar), so those start unticked.
        setSkip(new Set(d.suggestions.filter((i) => i.suggested === 0).map((i) => i.productId)))
      })
      .catch(() => setData({ suggestions: [], overstock: [], orderEveryDays: profile.orderEveryDays || 7 }))
  }

  useEffect(() => {
    if (!open) return
    setSkip(new Set())
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function setCycle(days: number) {
    setCycleBusy(true)
    try {
      await updateBusinessProfile({ data: { orderEveryDays: days } })
      load()
    } catch {
      toast("Couldn't save how often you order. Try again.")
    } finally {
      setCycleBusy(false)
    }
  }

  const items = data?.suggestions ?? []
  const chosen = items.filter((i) => !skip.has(i.productId))
  const quieted = chosen.filter((i) => i.suggested === 0).length
  const unused = items.filter((i) => i.suggested === 0).length
  const cycle = data?.orderEveryDays ?? profile.orderEveryDays ?? 7
  const tiedUp = (data?.overstock ?? []).reduce((sum, o) => sum + o.extraCents, 0)

  async function apply() {
    setSaving(true)
    try {
      await setPars({ data: { items: chosen.map((i) => ({ productId: i.productId, par: i.suggested, max: i.suggestedMax })) } })
      toast(`Updated ${chosen.length} product${chosen.length === 1 ? '' : 's'}`)
      await onDone()
      onClose()
    } catch {
      toast("Couldn't save the new levels. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Smart par"
      subtitle="Lean stock levels from what you really use and how long your vendors really take. Reorder before you run out, and order only up to what one order cycle needs."
    >
      <div className="mb-3">
        <p className="m-0 mb-1.5 text-sm font-semibold">How often do you place orders?</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="How often you order">
          {ORDER_CYCLES.map((c) => (
            <button
              key={c.days}
              type="button"
              className="chip"
              aria-pressed={cycle === c.days}
              disabled={cycleBusy}
              onClick={() => cycle !== c.days && setCycle(c.days)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="m-0 mt-1.5 text-[12px] text-ink-2">Ordering more often keeps less on the shelf and less cash tied up.</p>
      </div>

      {!data ? (
        <p className="text-ink-2 text-sm">Working out your usage…</p>
      ) : (
        <div className="max-h-[50vh] overflow-auto">
          {data.overstock.length > 0 && (
            <div className="rounded-xl bg-warn-tint p-3 mb-3 text-sm">
              <p className="m-0 font-semibold text-warn">
                About ${centsToDollars(tiedUp)} is sitting on the shelf beyond what you need
              </p>
              <p className="m-0 mt-0.5 text-[13px]">Hold off reordering these until they come down. Consider featuring them or using them first.</p>
              <ul className="list-none m-0 mt-2 p-0">
                {data.overstock.slice(0, 6).map((o) => (
                  <li key={o.productId} className="flex justify-between gap-2 py-0.5">
                    <span className="truncate">{o.name}</span>
                    <span className="whitespace-nowrap text-[13px] num">
                      {o.onHand} on hand · ~{o.daysOfStock} days · ${centsToDollars(o.extraCents)} extra
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-ink-2 text-sm">Your levels already match how fast you use things.</p>
          ) : (
            <>
              <p className="text-sm mt-0">
                {items.length - unused} product{items.length - unused === 1 ? '' : 's'} to tune from real use. Untick any you want to keep as they are.
                {unused > 0 && (
                  <span className="block mt-1 text-[13px] text-ink-2">
                    {unused} more had nothing scanned out in 90 days. They're left unticked: if you use them on clients but don't scan them out, keep their alerts on.
                    Tick only the ones you've truly stopped using{quieted > 0 ? ` (${quieted} ticked)` : ''}.
                  </span>
                )}
              </p>
              <ul className="list-none m-0 p-0">
                {items.map((i) => (
                  <li key={i.productId} className="flex items-start gap-2 py-2.5 border-b border-line last:border-b-0">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!skip.has(i.productId)}
                      aria-label={`Apply to ${i.name}`}
                      onChange={(e) =>
                        setSkip((s) => {
                          const next = new Set(s)
                          if (e.target.checked) next.delete(i.productId)
                          else next.add(i.productId)
                          return next
                        })
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold leading-snug">{i.name}</div>
                      <div className="text-[12px] text-ink-2">{i.reason}</div>
                    </div>
                    <div className="text-right whitespace-nowrap text-[13px] num">
                      <div>
                        Reorder at {i.current !== i.suggested && <span className="text-ink-2 line-through mr-1">{i.current}</span>}
                        <b>{i.suggested}</b>
                      </div>
                      {i.suggestedMax > 0 && (
                        <div className="text-ink-2">
                          Order up to <b className="text-ink">{i.suggestedMax}</b>
                          {i.packSize > 1 && ` (cases of ${i.packSize})`}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <SheetActions>
        <button type="button" className="btn btn-tonal" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={chosen.length === 0 || saving || !data} onClick={apply}>
          {saving ? 'Saving…' : `Apply ${chosen.length}`}
        </button>
      </SheetActions>
    </Sheet>
  )
}

/* ------------------------------------------------------------ Category cleanup */

/** Settings → Categories: one tap to merge spellings of the same category. */
export function CategoryCleanup({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const toast = useToast()
  const [groups, setGroups] = useState<CategoryGroup[] | null>(null)
  const [pick, setPick] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)

  useEffect(() => {
    getCategoryGroups()
      .then((g) => {
        setGroups(g)
        setPick(Object.fromEntries(g.map((grp, i) => [i, grp.names[0].name])))
      })
      .catch(() => setGroups([]))
  }, [])

  if (!groups || groups.length === 0) return null

  async function merge(i: number, g: CategoryGroup) {
    const to = pick[i] ?? g.names[0].name
    setBusy(i)
    try {
      const next = await mergeCategories({ data: { from: g.names.map((n) => n.name), to } })
      setGroups(next)
      setPick(Object.fromEntries(next.map((grp, j) => [j, grp.names[0].name])))
      toast(`Merged into “${to.trim()}”`)
      await onChanged?.()
    } catch {
      toast("Couldn't merge those categories. Try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="bg-warn-tint rounded-2xl p-4 mb-5">
      <h3 className="m-0 mb-1 text-base font-bold">Tidy up categories</h3>
      <p className="m-0 mb-3 text-sm text-ink-2">These look like the same category spelled different ways, which splits your reports and tax totals.</p>
      <ul className="list-none m-0 p-0 grid gap-2.5">
        {groups.map((g, i) => (
          <li key={g.names.map((n) => n.name).join('|')} className="bg-white rounded-xl p-3">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {g.names.map((n) => (
                <button
                  key={n.name}
                  type="button"
                  className="chip"
                  aria-pressed={pick[i] === n.name}
                  onClick={() => setPick((p) => ({ ...p, [i]: n.name }))}
                >
                  {pick[i] === n.name && <Check size={14} />}
                  {n.name.trim() || '(blank)'} · {n.products}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => merge(i, g)}>
              {busy === i ? 'Merging…' : `Use “${(pick[i] ?? g.names[0].name).trim()}” for all ${g.total}`}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
