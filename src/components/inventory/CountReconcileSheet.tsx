import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ClipboardCheck, EyeOff, History, RotateCcw } from 'lucide-react'
import type { Product } from './types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { centsToDollars } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { isBelowPar } from '@/lib/inventory-defaults'
import { COUNT_REASONS, lastCountedLabel, needsRecount, type CountLineDetail, type CountSummary } from '@/lib/counts'
import { approveStockCount, getCountHistory, getCountLines } from '@/server/counts.functions'

export type CountScopeKind = 'all' | 'category' | 'vendor' | 'below' | 'negatives' | 'pick'
type Stage = 'setup' | 'count' | 'review' | 'done' | 'history'
type Draft = { kind: CountScopeKind; value: string; blind: boolean; counts: Record<number, string>; picked: number[]; startedAt: string }

const DRAFT_KEY = 'bintro.countDraft'
const money = (cents: number) => `${cents < 0 ? '−' : ''}$${centsToDollars(Math.abs(cents))}`

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}
function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    else localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Storage blocked; the count just won't survive a reload.
  }
}

/**
 * Count & reconcile, in four steps: choose what to count (optionally blind),
 * count it, review only the differences (with a reason for each and a recount
 * prompt for big ones), then approve. Approving adjusts stock with the reason
 * and saves the count to history.
 */
export function CountReconcileSheet({
  open,
  onClose,
  products,
  staffName,
  initialScope,
  onDone,
}: {
  open: boolean
  onClose: () => void
  products: Product[]
  staffName: string
  initialScope?: CountScopeKind
  onDone: () => void | Promise<void>
}) {
  const toast = useToast()
  const [stage, setStage] = useState<Stage>('setup')
  const [kind, setKind] = useState<CountScopeKind>('all')
  const [value, setValue] = useState('')
  const [blind, setBlind] = useState(true)
  const [counts, setCounts] = useState<Record<number, string>>({})
  const [picked, setPicked] = useState<number[]>([])
  const [startedAt, setStartedAt] = useState('')
  const [query, setQuery] = useState('')
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set())
  const [recounting, setRecounting] = useState<Set<number>>(new Set())
  const [uncountedZero, setUncountedZero] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<CountSummary | null>(null)
  const [history, setHistory] = useState<CountSummary[] | null>(null)
  const [openCount, setOpenCount] = useState<{ id: number; lines: CountLineDetail[] | null } | null>(null)
  const [draftFound, setDraftFound] = useState<Draft | null>(null)
  const scanRef = useRef<HTMLInputElement>(null)
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(), [products])
  const vendors = useMemo(() => Array.from(new Set(products.map((p) => p.vendor).filter(Boolean))).sort(), [products])

  useEffect(() => {
    if (!open) return
    setStage('setup')
    setResult(null)
    setQuery('')
    setReasons({})
    setConfirmed(new Set())
    setRecounting(new Set())
    setUncountedZero(false)
    setOpenCount(null)
    const draft = readDraft()
    setDraftFound(draft && Object.keys(draft.counts).length > 0 ? draft : null)
    if (initialScope) {
      setKind(initialScope)
      setValue('')
      setBlind(initialScope !== 'negatives')
    }
    getCountHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const scoped = useMemo(() => {
    const list = products.filter((p) => {
      if (kind === 'category') return p.category === value
      if (kind === 'vendor') return p.vendor === value
      if (kind === 'below') return isBelowPar(p)
      if (kind === 'negatives') return p.qty < 0
      if (kind === 'pick') return picked.includes(p.id)
      return true
    })
    // Anything scanned that wasn't in scope joins the count.
    const extra = Object.keys(counts)
      .map(Number)
      .filter((id) => !list.some((p) => p.id === id))
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p))
    return [...list, ...extra].sort((a, b) => (a.category || '~').localeCompare(b.category || '~') || a.name.localeCompare(b.name))
  }, [products, kind, value, picked, counts, byId])

  const scopeLabel =
    kind === 'all'
      ? 'Everything'
      : kind === 'category'
        ? `Category: ${value}`
        : kind === 'vendor'
          ? `Vendor: ${value}`
          : kind === 'below'
            ? 'Below par'
            : kind === 'negatives'
              ? 'Negative counts'
              : 'Picked products'

  function persist(next: Partial<Draft>) {
    writeDraft({ kind, value, blind, counts, picked, startedAt, ...next })
  }

  function setCount(id: number, v: string) {
    setCounts((c) => {
      const next = { ...c, [id]: v }
      persist({ counts: next })
      return next
    })
  }

  function start() {
    const at = new Date().toISOString()
    setStartedAt(at)
    setCounts({})
    writeDraft({ kind, value, blind, counts: {}, picked, startedAt: at })
    setStage('count')
    setTimeout(() => scanRef.current?.focus(), 50)
  }

  function resume(d: Draft) {
    setKind(d.kind)
    setValue(d.value)
    setBlind(d.blind)
    setCounts(d.counts)
    setPicked(d.picked ?? [])
    setStartedAt(d.startedAt)
    setDraftFound(null)
    setStage('count')
  }

  function discardDraft() {
    writeDraft(null)
    setDraftFound(null)
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return products
      .filter((p) => [p.name, p.brand, p.size, p.barcode, ...(p.extraBarcodes ?? [])].join(' ').toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, products])

  /** Scanning adds one; picking from search jumps to the product's box. */
  function hit(p: Product, addOne: boolean) {
    if (kind === 'pick' && !picked.includes(p.id)) {
      const next = [...picked, p.id]
      setPicked(next)
      persist({ picked: next })
    }
    if (addOne) setCount(p.id, String((Number(counts[p.id]) || 0) + 1))
    setQuery('')
    setTimeout(() => {
      const el = inputRefs.current[p.id]
      if (addOne) scanRef.current?.focus()
      else el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 30)
  }

  function onScanEnter() {
    const q = query.trim()
    const exact = products.find((p) => p.barcode === q || (p.extraBarcodes ?? []).includes(q))
    if (exact) hit(exact, true)
    else if (matches.length === 1) hit(matches[0], false)
  }

  const counted = scoped.filter((p) => (counts[p.id] ?? '').trim() !== '')
  const uncounted = scoped.filter((p) => (counts[p.id] ?? '').trim() === '')

  type Line = { p: Product; expected: number; countedQty: number; diff: number; valueCents: number; flag: boolean }
  const lines: Line[] = useMemo(() => {
    const source = uncountedZero ? scoped : counted
    return source.map((p) => {
      const raw = (counts[p.id] ?? '').trim()
      const countedQty = raw === '' ? 0 : Math.max(0, Math.trunc(Number(raw) || 0))
      const diff = countedQty - p.qty
      return { p, expected: p.qty, countedQty, diff, valueCents: diff * p.unitCostCents, flag: needsRecount(p.qty, countedQty, p.unitCostCents) }
    })
  }, [scoped, counted, counts, uncountedZero])
  const diffs = lines.filter((l) => l.diff !== 0).sort((a, b) => Math.abs(b.valueCents) - Math.abs(a.valueCents) || Math.abs(b.diff) - Math.abs(a.diff))
  const unitsOver = diffs.filter((l) => l.diff > 0).reduce((s, l) => s + l.diff, 0)
  const unitsShort = diffs.filter((l) => l.diff < 0).reduce((s, l) => s - l.diff, 0)
  const netCents = diffs.reduce((s, l) => s + l.valueCents, 0)
  const openFlags = diffs.filter((l) => l.flag && !confirmed.has(l.p.id))
  const missingReasons = diffs.filter((l) => !reasons[l.p.id])

  async function approve() {
    setSaving(true)
    try {
      const r = await approveStockCount({
        data: {
          scope: scopeLabel,
          blind,
          staffName,
          lines: lines.map((l) => ({ productId: l.p.id, counted: l.countedQty, reason: reasons[l.p.id] ?? '' })),
        },
      })
      writeDraft(null)
      setResult(r)
      setStage('done')
      await onDone()
      getCountHistory()
        .then(setHistory)
        .catch(() => undefined)
    } catch {
      toast("Couldn't approve the count. Check your connection and try again. Your counts are still saved here.")
    } finally {
      setSaving(false)
    }
  }

  async function showCount(id: number) {
    setOpenCount({ id, lines: null })
    try {
      setOpenCount({ id, lines: await getCountLines({ data: { countId: id } }) })
    } catch {
      setOpenCount({ id, lines: [] })
    }
  }

  const steps: { id: Stage; label: string }[] = [
    { id: 'setup', label: '1 · Choose' },
    { id: 'count', label: '2 · Count' },
    { id: 'review', label: '3 · Review' },
    { id: 'done', label: '4 · Approved' },
  ]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Count & reconcile"
      subtitle="Count what's really on the shelf, review only what doesn't match, give a reason, then approve. Every count is saved to history."
    >
      {stage !== 'history' && (
        <ol className="list-none m-0 mb-3 p-0 flex gap-1.5 text-[12px] font-semibold" aria-label="Steps">
          {steps.map((s) => (
            <li
              key={s.id}
              className={`flex-1 text-center rounded-full py-1 ${stage === s.id ? 'bg-action text-white' : 'bg-surface text-ink-2'}`}
              aria-current={stage === s.id ? 'step' : undefined}
            >
              {s.label}
            </li>
          ))}
        </ol>
      )}

      {stage === 'setup' && (
        <div className="grid gap-3 max-h-[58vh] overflow-auto">
          {draftFound && (
            <div className="rounded-xl bg-gold-tint p-3 text-sm">
              <b>A count is in progress</b> on this device: {Object.keys(draftFound.counts).length} counted.
              <div className="flex gap-2 mt-2">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => resume(draftFound)}>
                  Pick up where you left off
                </button>
                <button type="button" className="btn btn-text btn-sm" onClick={discardDraft}>
                  Start over
                </button>
              </div>
            </div>
          )}
          <div>
            <p className="m-0 mb-1.5 text-sm font-semibold">What are you counting?</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Everything'],
                  ['category', 'A category'],
                  ['vendor', 'One vendor'],
                  ['below', 'Below par'],
                  ['negatives', 'Negative counts'],
                  ['pick', 'Pick as I go'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className="chip"
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k)
                    setValue(k === 'category' ? (categories[0] ?? '') : k === 'vendor' ? (vendors[0] ?? '') : '')
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {(kind === 'category' || kind === 'vendor') && (
              <select className="field-input !py-2 mt-2" value={value} onChange={(e) => setValue(e.target.value)} aria-label={kind}>
                {(kind === 'category' ? categories : vendors).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            <p className="m-0 mt-1.5 text-[12px] text-ink-2">
              {kind === 'pick' ? 'Scan or search each product as you count it.' : `${scoped.length} product${scoped.length === 1 ? '' : 's'} to count.`} A shelf at a time is easiest: one category or one vendor per count.
            </p>
          </div>
          <label className="flex items-start gap-2.5 rounded-xl bg-surface p-3 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
            <span className="text-sm">
              <b className="flex items-center gap-1.5">
                <EyeOff size={15} /> Blind count (recommended)
              </b>
              <span className="text-ink-2">Hide what Bintro thinks is there, so staff count what's really on the shelf instead of matching a number.</span>
            </span>
          </label>
          {history && history.length > 0 && (
            <button type="button" className="btn btn-text btn-sm justify-start" onClick={() => setStage('history')}>
              <History size={15} /> Count history ({history.length})
            </button>
          )}
        </div>
      )}

      {stage === 'count' && (
        <>
          <input
            ref={scanRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onScanEnter()
              }
            }}
            placeholder="Scan a barcode (each scan adds 1) or type a name"
            aria-label="Scan or search a product"
            className="field-input"
          />
          {matches.length > 0 && (
            <ul className="list-none m-0 mt-1 p-0 border border-line rounded-xl">
              {matches.map((p) => (
                <li key={p.id}>
                  <button type="button" className="w-full text-left px-3 py-2 border-0 bg-transparent cursor-pointer hover:bg-surface text-sm" onClick={() => hit(p, false)}>
                    <b>{p.name}</b> <span className="text-ink-2">{[p.brand, p.size].filter(Boolean).join(' · ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 mt-2 text-[13px]">
            <b>{counted.length}</b> of {scoped.length} counted · {scopeLabel}
            {blind && <span className="text-ink-2"> · blind</span>}
          </p>
          <ul className="list-none m-0 mt-1 p-0 max-h-[44vh] overflow-auto">
            {scoped.map((p, i) => {
              const showHeader = i === 0 || (scoped[i - 1].category || '') !== (p.category || '')
              const done = (counts[p.id] ?? '').trim() !== ''
              return (
                <li key={p.id}>
                  {showHeader && <div className="text-[11px] font-bold uppercase tracking-wider text-ink-2 pt-3 pb-1">{p.category || 'No category'}</div>}
                  <div className="flex items-center gap-2.5 py-2 border-b border-line">
                    {done ? <Check size={16} className="text-good shrink-0" /> : <span className="w-4 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold leading-snug">{p.name}</div>
                      <div className="text-[12px] text-ink-2 truncate">
                        {[p.brand, p.size].filter(Boolean).join(' · ')}
                        {!blind && <span> · Bintro shows {p.qty}</span>}
                      </div>
                      <div className="text-[11px] text-ink-2">{lastCountedLabel(p)}</div>
                    </div>
                    <input
                      ref={(el) => {
                        inputRefs.current[p.id] = el
                      }}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`Counted ${p.name}`}
                      placeholder="#"
                      value={counts[p.id] ?? ''}
                      onChange={(e) => setCount(p.id, e.target.value)}
                      className="field-input !w-[72px] shrink-0 text-center !px-1 !py-1.5"
                    />
                  </div>
                </li>
              )
            })}
            {scoped.length === 0 && <li className="text-ink-2 text-sm py-3">Scan or search the first product.</li>}
          </ul>
          <SheetActions>
            <button type="button" className="btn btn-tonal" onClick={() => setStage('setup')}>
              Back
            </button>
            <button type="button" className="btn btn-primary" disabled={counted.length === 0} onClick={() => setStage('review')}>
              Review differences
            </button>
          </SheetActions>
        </>
      )}

      {stage === 'review' && (
        <>
          <div className="grid grid-cols-4 gap-2 text-center mb-3">
            <div className="rounded-xl bg-good-tint p-2">
              <div className="num text-lg font-extrabold text-good">{lines.length - diffs.length}</div>
              <div className="text-[11px] font-semibold">Match</div>
            </div>
            <div className="rounded-xl bg-surface p-2">
              <div className="num text-lg font-extrabold">+{unitsOver}</div>
              <div className="text-[11px] font-semibold">Over</div>
            </div>
            <div className="rounded-xl bg-bad-tint p-2">
              <div className="num text-lg font-extrabold text-bad">−{unitsShort}</div>
              <div className="text-[11px] font-semibold">Short</div>
            </div>
            <div className={`rounded-xl p-2 ${netCents < 0 ? 'bg-bad-tint' : 'bg-surface'}`}>
              <div className={`num text-lg font-extrabold ${netCents < 0 ? 'text-bad' : ''}`}>{money(netCents)}</div>
              <div className="text-[11px] font-semibold">Net value</div>
            </div>
          </div>

          {uncounted.length > 0 && kind !== 'pick' && (
            <label className="flex items-start gap-2 text-[13px] mb-2">
              <input type="checkbox" className="mt-0.5" checked={uncountedZero} onChange={(e) => setUncountedZero(e.target.checked)} />
              <span>
                {uncounted.length} product{uncounted.length === 1 ? '' : 's'} not counted. Leave them as they are, or tick to mark them as <b>none on the shelf (0)</b>.
              </span>
            </label>
          )}

          {diffs.length === 0 ? (
            <p className="text-sm rounded-xl bg-good-tint text-good font-semibold p-3 m-0">Everything you counted matches. Approve to save the count.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="m-0 text-[13px]">
                  {diffs.length} difference{diffs.length === 1 ? '' : 's'}. Give each a reason{openFlags.length > 0 ? ' and check the flagged ones' : ''}.
                </p>
                <select
                  className="chip !py-1 !text-[12px]"
                  value=""
                  aria-label="Set a reason for all"
                  onChange={(e) => {
                    const r = e.target.value
                    if (r) setReasons((all) => ({ ...all, ...Object.fromEntries(diffs.filter((l) => !all[l.p.id]).map((l) => [l.p.id, r])) }))
                  }}
                >
                  <option value="">Reason for the rest…</option>
                  {COUNT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <ul className="list-none m-0 p-0 max-h-[38vh] overflow-auto">
                {diffs.map((l) => {
                  const flagged = l.flag && !confirmed.has(l.p.id)
                  return (
                    <li key={l.p.id} className={`py-2.5 border-b border-line last:border-b-0 ${flagged ? 'bg-warn-tint/60 -mx-2 px-2 rounded-xl' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold leading-snug">{l.p.name}</div>
                          <div className="text-[12px] text-ink-2">
                            Bintro {l.expected} → counted <b className="text-ink">{l.countedQty}</b>
                            {l.p.unitCostCents > 0 && <> · {money(l.valueCents)}</>}
                          </div>
                        </div>
                        <span className={`num text-sm font-extrabold rounded-full px-2 py-0.5 ${l.diff > 0 ? 'bg-surface' : 'bg-bad-tint text-bad'}`}>
                          {l.diff > 0 ? '+' : '−'}
                          {Math.abs(l.diff)}
                        </span>
                      </div>
                      {flagged && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
                          <span className="flex items-center gap-1 font-semibold text-warn">
                            <AlertTriangle size={14} /> Big difference. Recount before approving.
                          </span>
                          {recounting.has(l.p.id) ? (
                            <>
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                autoFocus
                                aria-label={`Recount ${l.p.name}`}
                                className="field-input !w-[72px] text-center !px-1 !py-1"
                                value={counts[l.p.id] ?? ''}
                                onChange={(e) => setCount(l.p.id, e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => setConfirmed((s) => new Set(s).add(l.p.id))}
                              >
                                Recounted
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="btn btn-tonal btn-sm" onClick={() => setRecounting((s) => new Set(s).add(l.p.id))}>
                                <RotateCcw size={13} /> Recount
                              </button>
                              <button type="button" className="btn btn-text btn-sm" onClick={() => setConfirmed((s) => new Set(s).add(l.p.id))}>
                                Count is right
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      <select
                        className="field-input !py-1.5 mt-1.5 text-sm"
                        value={reasons[l.p.id] ?? ''}
                        aria-label={`Reason for ${l.p.name}`}
                        onChange={(e) => setReasons((r) => ({ ...r, [l.p.id]: e.target.value }))}
                      >
                        <option value="">Why is it different?</option>
                        {COUNT_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          <SheetActions>
            <button type="button" className="btn btn-tonal" onClick={() => setStage('count')}>
              Back to counting
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || lines.length === 0 || openFlags.length > 0 || missingReasons.length > 0}
              onClick={approve}
            >
              {saving
                ? 'Approving…'
                : openFlags.length > 0
                  ? `Check ${openFlags.length} flagged`
                  : missingReasons.length > 0
                    ? `${missingReasons.length} need a reason`
                    : diffs.length
                      ? `Approve ${diffs.length} change${diffs.length === 1 ? '' : 's'}`
                      : 'Approve count'}
            </button>
          </SheetActions>
        </>
      )}

      {stage === 'done' && result && (
        <>
          <div className="rounded-2xl bg-good-tint p-4 text-sm">
            <p className="m-0 font-extrabold text-good flex items-center gap-1.5 text-base">
              <ClipboardCheck size={18} /> Count #{result.id} approved
            </p>
            <p className="m-0 mt-1">
              {result.itemsCounted} counted · {result.itemsChanged} adjusted · +{result.unitsOver} over · −{result.unitsShort} short · net {money(result.valueDiffCents)}
            </p>
            <p className="m-0 mt-1 text-ink-2">Each change is in Activity with its reason, and the full count is in Count history.</p>
          </div>
          <SheetActions>
            <button type="button" className="btn btn-tonal" onClick={() => setStage('history')}>
              Count history
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </SheetActions>
        </>
      )}

      {stage === 'history' && (
        <>
          {!history ? (
            <p className="text-ink-2 text-sm">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-ink-2 text-sm">No counts approved yet.</p>
          ) : (
            <ul className="list-none m-0 p-0 max-h-[56vh] overflow-auto">
              {history.map((c) => (
                <li key={c.id} className="py-2.5 border-b border-line last:border-b-0">
                  <button type="button" className="w-full text-left border-0 bg-transparent p-0 cursor-pointer" onClick={() => (openCount?.id === c.id ? setOpenCount(null) : showCount(c.id))}>
                    <div className="flex justify-between gap-2">
                      <b className="text-sm">
                        #{c.id} · {c.scope}
                        {c.blind && <span className="text-ink-2 font-normal"> · blind</span>}
                      </b>
                      <span className={`num text-sm font-bold ${c.valueDiffCents < 0 ? 'text-bad' : ''}`}>{money(c.valueDiffCents)}</span>
                    </div>
                    <div className="text-[12px] text-ink-2">
                      {new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {c.staffName && ` · ${c.staffName}`} · {c.itemsCounted} counted · {c.itemsChanged} adjusted · +{c.unitsOver} / −{c.unitsShort}
                    </div>
                  </button>
                  {openCount?.id === c.id && (
                    <div className="mt-2 rounded-xl bg-surface p-2.5 text-[13px]">
                      {!openCount.lines ? (
                        'Loading…'
                      ) : openCount.lines.filter((l) => l.diff !== 0).length === 0 ? (
                        'Everything matched.'
                      ) : (
                        openCount.lines
                          .filter((l) => l.diff !== 0)
                          .map((l) => (
                            <div key={l.productId} className="flex justify-between gap-2 py-0.5">
                              <span className="truncate">
                                {l.name} <span className="text-ink-2">· {l.reason || 'no reason'}</span>
                              </span>
                              <span className="num whitespace-nowrap">
                                {l.expected} → {l.counted} ({l.diff > 0 ? '+' : ''}
                                {l.diff})
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <SheetActions>
            <button type="button" className="btn btn-tonal" onClick={() => setStage(result ? 'done' : 'setup')}>
              Back
            </button>
          </SheetActions>
        </>
      )}

      {stage === 'setup' && (
        <SheetActions>
          <button type="button" className="btn btn-tonal" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={(kind === 'category' || kind === 'vendor') && !value} onClick={start}>
            Start counting
          </button>
        </SheetActions>
      )}
    </Sheet>
  )
}
