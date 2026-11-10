import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import type { Product } from './types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { centsToDollars } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { mergeProducts } from '@/server/inventory.functions'
import {
  getCategoryGroups,
  getDuplicateGroups,
  getSmartPars,
  mergeCategories,
  saveCounts,
  setPars,
  undoPars,
  getCategoryList,
  deleteCategory,
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

/* ------------------------------------------------------------------ Smart par */

const ORDER_CYCLES = [
  { days: 3, label: 'Two times a week' },
  { days: 7, label: 'Every week' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 30, label: 'Every month' },
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
  const [undoing, setUndoing] = useState(false)

  function load() {
    setData(null)
    getSmartPars()
      .then((d) => {
        setData(d)
        // "Not used in 90 days" may only mean it isn't scanned out (back bar), so those start unticked.
        setSkip(new Set(d.suggestions.filter((i) => i.suggested === 0).map((i) => i.productId)))
      })
      .catch(() => setData({ suggestions: [], overstock: [], orderEveryDays: profile.orderEveryDays || 7, lastChange: null }))
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
      toast('Could not save that. Try again.')
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

  async function undo(batchId: string, count: number) {
    setUndoing(true)
    try {
      const r = await undoPars({ data: { batchId } })
      toast(`Put ${r.restored || count} product${(r.restored || count) === 1 ? '' : 's'} back the way they were`)
      await onDone()
      load()
    } catch {
      toast("Couldn't undo. Check your connection and try again.")
    } finally {
      setUndoing(false)
    }
  }

  async function apply() {
    setSaving(true)
    try {
      const r = await setPars({ data: { items: chosen.map((i) => ({ productId: i.productId, par: i.suggested, max: i.suggestedMax })) } })
      await onDone()
      onClose()
      toast(`Saved ${r.updated} product${r.updated === 1 ? '' : 's'}. Your counts stayed the same.`, r.batchId ? () => undo(r.batchId, r.updated) : undefined)
    } catch {
      toast('Something went wrong. Try again. If some saved, tap Undo in Smart par.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Smart par"
      subtitle="Bintro looks at how much you use and how long your orders take to come. Then it tells you when to order and how many to keep, so you don’t run out and don’t buy too much."
    >
      <div className="mb-3">
        <p className="m-0 mb-1.5 text-sm font-semibold">How often do you order?</p>
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
        <p className="m-0 mt-1.5 text-[12px] text-ink-2">Ordering more often means less stuff on the shelf and more money in your pocket.</p>
      </div>

      {data?.lastChange && (
        <div className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 mb-3 text-sm">
          <span className="flex-1">
            You changed <b>{data.lastChange.products}</b> product{data.lastChange.products === 1 ? '' : 's'} on{' '}
            {new Date(data.lastChange.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Your counts stayed the same.
          </span>
          <button
            type="button"
            className="btn btn-tonal btn-sm shrink-0"
            disabled={undoing}
            onClick={() => undo(data.lastChange!.batchId, data.lastChange!.products)}
          >
            {undoing ? 'Undoing…' : 'Undo'}
          </button>
        </div>
      )}

      {!data ? (
        <p className="text-ink-2 text-sm">Looking at what you use…</p>
      ) : (
        <div className="max-h-[50vh] overflow-auto">
          {data.overstock.length > 0 && (
            <div className="rounded-xl bg-warn-tint p-3 mb-3 text-sm">
              <p className="m-0 font-semibold text-warn">
                You have about ${centsToDollars(tiedUp)} of extra stock
              </p>
              <p className="m-0 mt-0.5 text-[13px]">Don’t order more of these yet. Use them or sell them first.</p>
              <ul className="list-none m-0 mt-2 p-0">
                {data.overstock.slice(0, 6).map((o) => (
                  <li key={o.productId} className="flex justify-between gap-2 py-0.5">
                    <span className="truncate">{o.name}</span>
                    <span className="whitespace-nowrap text-[13px] num">
                      {o.onHand} on the shelf · lasts about {o.daysOfStock} days · ${centsToDollars(o.extraCents)} extra
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-ink-2 text-sm">Your numbers already look right. Nothing to change.</p>
          ) : (
            <>
              <p className="text-sm mt-0">
                {items.length - unused} product{items.length - unused === 1 ? '' : 's'} can be better. Uncheck any you want to leave alone.
                <span className="block mt-1 text-[13px] text-ink-2">
                  <b>Order at</b> = order more when you get down to this many. <b>Fill to</b> = how many to have after the order comes.
                </span>
                {unused > 0 && (
                  <span className="block mt-1 text-[13px] text-ink-2">
                    {unused} more were not scanned out in 90 days, so they are unchecked. If you still use them but forget to scan them, leave them unchecked.
                    Check only the ones you don’t use anymore{quieted > 0 ? ` (${quieted} checked)` : ''}.
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
                        Order at {i.current !== i.suggested && <span className="text-ink-2 line-through mr-1">{i.current}</span>}
                        <b>{i.suggested}</b>
                      </div>
                      {i.suggestedMax > 0 && (
                        <div className="text-ink-2">
                          Fill to <b className="text-ink">{i.suggestedMax}</b>
                          {i.packSize > 1 && ` (boxes of ${i.packSize})`}
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
          {saving ? 'Saving…' : `Save ${chosen.length}`}
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

/* ------------------------------------------------------------ All categories */

/**
 * Settings → Categories: every category in use, with a Delete that moves its
 * products to another category first (or leaves them with none).
 */
export function CategoryList({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const toast = useToast()
  const [list, setList] = useState<{ name: string; products: number; saved: boolean }[] | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [moveTo, setMoveTo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getCategoryList()
      .then(setList)
      .catch(() => setList([]))
  }, [])

  async function confirm(name: string) {
    setBusy(true)
    try {
      const r = await deleteCategory({ data: { name, moveTo } })
      setList(r.list)
      setDeleting(null)
      toast(
        r.moved
          ? `Deleted “${name}”. ${r.moved} product${r.moved === 1 ? '' : 's'} moved to ${moveTo ? `“${moveTo}”` : 'no category'}.`
          : `Deleted “${name}”.`,
      )
      await onChanged?.()
    } catch {
      toast("Couldn't delete that category. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (!list || list.length === 0) return null

  return (
    <section className="bg-white border border-line rounded-2xl p-4 mb-5">
      <h3 className="m-0 mb-1 text-base font-bold">All categories in use</h3>
      <p className="m-0 mb-3 text-sm text-ink-2">Delete one you don't need. Its products move to the category you pick, so nothing is lost.</p>
      <ul className="list-none m-0 p-0">
        {list.map((c) => (
          <li key={c.name} className="py-2.5 border-b border-line last:border-b-0">
            <div className="flex items-center gap-3">
              <span className="flex-1 min-w-0">
                <span className="font-semibold block truncate">{c.name}</span>
                <span className="text-[12px] text-ink-2">{c.products ? `${c.products} product${c.products === 1 ? '' : 's'}` : 'No products'}</span>
              </span>
              {deleting !== c.name && (
                <button
                  type="button"
                  className="btn btn-text btn-sm !text-bad"
                  onClick={() => {
                    setDeleting(c.name)
                    setMoveTo('')
                  }}
                >
                  Delete
                </button>
              )}
            </div>
            {deleting === c.name && (
              <div className="mt-2 rounded-xl bg-bad-tint p-3 text-sm">
                {c.products > 0 && (
                  <label className="block mb-2">
                    Move its {c.products} product{c.products === 1 ? '' : 's'} to
                    <select className="field-input !py-2 mt-1" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                      <option value="">No category</option>
                      {list
                        .filter((o) => o.name !== c.name)
                        .map((o) => (
                          <option key={o.name} value={o.name}>
                            {o.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <div className="flex gap-2">
                  <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => confirm(c.name)}>
                    {busy ? 'Deleting…' : `Delete “${c.name}”`}
                  </button>
                  <button type="button" className="btn btn-tonal btn-sm" disabled={busy} onClick={() => setDeleting(null)}>
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
