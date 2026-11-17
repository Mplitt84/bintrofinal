import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ChevronDown, FileUp, TrendingDown, TrendingUp } from 'lucide-react'
import type { Product } from './types'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { useMoney } from '@/components/business/BusinessContext'
import { centsToDollars } from '@/components/ui/bits'
import { shrinkImage } from '@/lib/images'
import { MAX_IMPORT_BYTES, type ImportLine } from '@/lib/bulk-import'
import { lineSiblings } from '@/lib/entry-predictions'
import type { PriceMove, PriceWatch } from '@/lib/price-trends'
import { applyImport, parseImport } from '@/server/import.functions'
import { getPriceWatch } from '@/server/price-watch.functions'

type Row = ImportLine & { pick: boolean; matchName: string; newCents: number; oldCents: number; withLine: boolean }
type Stage =
  | { kind: 'start'; error?: string }
  | { kind: 'reading'; fileName: string }
  | { kind: 'review'; fileName: string }
  | { kind: 'saving' }
  | { kind: 'done'; changed: number; up: number; down: number; historical: number }
type Watch = PriceWatch & { recorded: number; lastInvoiceAt: string | null }

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
const toCents = (v: string) => {
  const n = Number(v.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0
}
const pct = (from: number, to: number) => (from > 0 ? Math.round(((to - from) / from) * 1000) / 10 : 0)
const monthName = (key: string) => new Date(`${key}-15T12:00:00Z`).toLocaleDateString(undefined, { month: 'short' })
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/**
 * Products → Invoice prices. Upload: photo or PDF of a supplier invoice → AI reads the
 * line items → each matched product shows old cost → invoice cost; tick, then Update.
 * Only costs change (never stock or retail), dated with the invoice date, and every
 * change lands in price_history. Price watch: what those prices have done over time.
 */
export function InvoicePricesSheet({
  open,
  onClose,
  products,
  staffName,
  onDone,
}: {
  open: boolean
  onClose: () => void
  products: Product[]
  staffName: string
  onDone: () => void | Promise<void>
}) {
  const toast = useToast()
  const { money } = useMoney()
  const [view, setView] = useState<'upload' | 'watch'>('upload')
  const [stage, setStage] = useState<Stage>({ kind: 'start' })
  const [rows, setRows] = useState<Row[]>([])
  const [vendor, setVendor] = useState('')
  const [date, setDate] = useState('')
  const [showSame, setShowSame] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setStage({ kind: 'start' })
    setRows([])
    setShowSame(false)
  }, [open])

  const byName = useMemo(() => new Map(products.map((p) => [`${p.name}${p.size ? ` · ${p.size}` : ''}`, p])), [products])
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  async function read(file: File | undefined) {
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (isPdf && file.size > MAX_IMPORT_BYTES) return setStage({ kind: 'start', error: 'That PDF is over 4 MB. Try a photo of each page instead.' })
    setStage({ kind: 'reading', fileName: file.name })
    try {
      const parsed = await parseImport({
        data: isPdf
          ? { kind: 'document', data: await readAsBase64(file), mediaType: 'application/pdf' }
          : { kind: 'document', data: await shrinkImage(file, 2000), mediaType: 'image/jpeg' },
      })
      if (!parsed.ok) return setStage({ kind: 'start', error: parsed.message })
      setVendor(parsed.vendor)
      setDate(/^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : new Date().toISOString().slice(0, 10))
      const next = parsed.lines
        .filter((l) => l.unitCostCents > 0 && l.costSource === 'document')
        .map((l) => {
          const p = l.productId ? byId.get(l.productId) : undefined
          const oldCents = p?.unitCostCents ?? 0
          return { ...l, pick: Boolean(p) && oldCents !== l.unitCostCents, matchName: '', newCents: l.unitCostCents, oldCents, withLine: true }
        })
      if (next.length === 0) return setStage({ kind: 'start', error: "Bintro couldn't find any unit prices on that invoice. Try a sharper photo of the line items." })
      setRows(next)
      setStage({ kind: 'review', fileName: file.name })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setStage({
        kind: 'start',
        error: /plan|upgrade|feature/i.test(message) ? 'Reading invoices comes with Plus.' : "That invoice couldn't be read. Try again, or a clearer photo.",
      })
    }
  }

  const patch = (key: number, next: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...next } : x)))
  function link(row: Row, label: string) {
    const p = byName.get(label)
    patch(row.key, p ? { productId: p.id, oldCents: p.unitCostCents, matchName: label, pick: p.unitCostCents !== row.newCents } : { productId: null, matchName: label, pick: false })
  }

  const matched = rows.filter((r) => r.productId)
  const changed = matched.filter((r) => r.oldCents !== r.newCents)
  const same = matched.filter((r) => r.oldCents === r.newCents)
  const unmatched = rows.filter((r) => !r.productId)
  const picked = changed.filter((r) => r.pick)

  /** Other shades in each changed product's line that were at the same old price (or had none): they move with it. */
  const siblings = useMemo(() => {
    const onInvoice = new Set(rows.map((r) => r.productId).filter((id): id is number => Boolean(id)))
    const taken = new Set<number>()
    const out = new Map<number, Product[]>()
    for (const r of changed) {
      const p = byId.get(r.productId!)
      if (!p) continue
      const list = lineSiblings(products, p, r.oldCents, onInvoice).filter((s) => !taken.has(s.id))
      list.forEach((s) => taken.add(s.id))
      if (list.length) out.set(r.key, list)
    }
    return out
  }, [rows, changed, byId, products])
  const siblingCount = picked.reduce((n, r) => n + (r.withLine ? (siblings.get(r.key)?.length ?? 0) : 0), 0)

  async function apply() {
    // Same-price lines go too: they confirm the price (a data point for Price watch) without changing it.
    const lineFollowers = picked.flatMap((r) =>
      r.withLine
        ? (siblings.get(r.key) ?? []).map((s) => ({
            productId: s.id,
            barcode: s.barcode,
            name: s.name,
            brand: s.brand,
            size: s.size,
            category: s.category,
            vendor: s.vendor || r.vendor || vendor,
            qty: null,
            unitCostCents: r.newCents,
            retailPriceCents: 0,
          }))
        : [],
    )
    const lines = [...picked, ...same].map((r) => ({
      productId: r.productId,
      barcode: r.barcode,
      name: r.name,
      brand: r.brand,
      size: r.size,
      category: r.category,
      vendor: r.vendor || vendor,
      qty: null,
      unitCostCents: r.newCents,
      retailPriceCents: 0,
    }))
    if (picked.length === 0) return
    setStage({ kind: 'saving' })
    try {
      const summary = await applyImport({
        data: {
          mode: 'prices',
          staffName,
          source: ['Invoice', vendor, date].filter(Boolean).join(' · ').slice(0, 160),
          lines: [...lines, ...lineFollowers],
          priceDate: date,
          priceSource: 'invoice',
        },
      })
      await onDone()
      const historical = summary.historical ?? 0
      setStage({
        kind: 'done',
        changed: Math.max(0, picked.length + lineFollowers.length - historical),
        up: picked.filter((r) => r.newCents > r.oldCents).length,
        down: picked.filter((r) => r.newCents < r.oldCents).length,
        historical,
      })
    } catch {
      setStage({ kind: 'review', fileName: '' })
      toast("Couldn't save those prices. Try again.")
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Invoice prices" subtitle="Upload a supplier invoice and Bintro updates your costs for you, then keeps every price so you can watch them change.">
      <div className="flex gap-1.5 mb-3" role="tablist">
        <button type="button" role="tab" className="chip" aria-pressed={view === 'upload'} onClick={() => setView('upload')}>
          Upload invoice
        </button>
        <button type="button" role="tab" className="chip" aria-pressed={view === 'watch'} onClick={() => setView('watch')}>
          Price watch
        </button>
      </div>

      {view === 'watch' ? (
        <PriceWatchView open={open} money={money} />
      ) : (
        <>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => (read(e.target.files?.[0]), (e.target.value = ''))} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (read(e.target.files?.[0]), (e.target.value = ''))} />

          {stage.kind === 'start' && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-primary" onClick={() => cameraRef.current?.click()}>
                  <Camera size={18} /> Take a photo
                </button>
                <button type="button" className="btn btn-tonal" onClick={() => fileRef.current?.click()}>
                  <FileUp size={18} /> Choose PDF or photo
                </button>
              </div>
              {stage.error && <p className="m-0 text-sm text-bad font-semibold">{stage.error}</p>}
              <p className="m-0 text-[12px] text-ink-2">
                Only costs change. Stock and your retail prices stay as they are. To add the delivery to stock too, use Restock → Deliveries.
              </p>
            </div>
          )}

          {stage.kind === 'reading' && (
            <div className="grid gap-2">
              <p className="m-0 text-sm">Reading {stage.fileName}… this takes about 20 seconds.</p>
              <div className="skel h-14 rounded-xl" />
              <div className="skel h-14 rounded-xl" />
            </div>
          )}

          {stage.kind === 'saving' && <p className="text-sm">Saving prices…</p>}

          {stage.kind === 'done' && (
            <div className="grid gap-3">
              <div className="rounded-2xl bg-good-tint p-3 text-sm">
                <b>
                  {stage.changed} cost{stage.changed === 1 ? '' : 's'} updated
                </b>
                <span className="block text-[12px] text-ink-2">
                  {stage.up} went up · {stage.down} went down · saved to Price watch{date ? ` as of ${shortDate(`${date}T12:00:00Z`)}` : ''}
                </span>
                {stage.historical > 0 && (
                  <span className="block text-[12px] text-ink-2 mt-1">
                    {stage.historical} came from an invoice older than the cost you already have, so {stage.historical === 1 ? 'it was' : 'they were'} saved to history and today's cost was left alone.
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setStage({ kind: 'start' })}>
                  Upload another
                </button>
                <button type="button" className="btn btn-tonal btn-sm" onClick={() => setView('watch')}>
                  See Price watch
                </button>
              </div>
            </div>
          )}

          {stage.kind === 'review' && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[12px] text-ink-2">
                  Supplier
                  <input className="field-input !py-2" value={vendor} onChange={(e) => setVendor(e.target.value)} />
                </label>
                <label className="text-[12px] text-ink-2">
                  Invoice date
                  <input className="field-input !py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
              </div>

              {changed.length > 0 ? (
                <section>
                  <h3 className="m-0 mb-1.5 text-sm font-bold">
                    {changed.length} price{changed.length === 1 ? '' : 's'} changed
                  </h3>
                  <ul className="list-none m-0 p-0 grid gap-1.5">
                    {changed.map((r) => {
                      const p = byId.get(r.productId!)
                      const change = pct(r.oldCents, r.newCents)
                      return (
                        <li key={r.key} className="rounded-xl bg-surface p-2.5">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input type="checkbox" className="mt-1" checked={r.pick} onChange={(e) => patch(r.key, { pick: e.target.checked })} />
                            <span className="flex-1 min-w-0 text-sm">
                              <b className="block break-words">{p?.name ?? r.name}</b>
                              <span className="text-[12px] text-ink-2">
                                {r.oldCents ? money(r.oldCents) : 'No cost'} →{' '}
                              </span>
                              <input
                                className="field-input !inline-block !w-24 !py-1 !px-2 !text-sm"
                                inputMode="decimal"
                                aria-label={`Invoice cost for ${p?.name ?? r.name}`}
                                defaultValue={centsToDollars(r.newCents)}
                                onBlur={(e) => {
                                  const c = toCents(e.target.value)
                                  if (c) patch(r.key, { newCents: c })
                                }}
                              />
                              {r.oldCents > 0 && (
                                <span className={`ml-2 text-[12px] font-semibold ${change > 0 ? 'text-bad' : 'text-good'}`}>
                                  {change > 0 ? '+' : ''}
                                  {change}%
                                </span>
                              )}
                              {p && p.name.toLowerCase() !== r.name.toLowerCase() && <span className="block text-[12px] text-ink-2">On the invoice: {r.name}</span>}
                            </span>
                          </label>
                          {siblings.get(r.key) && r.pick && (
                            <label className="flex items-start gap-2.5 mt-2 ml-6 text-[12px] cursor-pointer">
                              <input type="checkbox" className="mt-0.5" checked={r.withLine} onChange={(e) => patch(r.key, { withLine: e.target.checked })} />
                              <span>
                                <b className="text-ink">
                                  Also update {siblings.get(r.key)!.length} more in this line
                                </b>
                                <span className="block text-ink-2">
                                  {siblings
                                    .get(r.key)!
                                    .slice(0, 6)
                                    .map((s) => s.name)
                                    .join(', ')}
                                  {siblings.get(r.key)!.length > 6 ? ` +${siblings.get(r.key)!.length - 6}` : ''} · same brand and size, were at{' '}
                                  {r.oldCents ? money(r.oldCents) : 'no cost'}
                                </span>
                              </span>
                            </label>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ) : (
                <p className="m-0 text-sm">No price changes on this invoice{same.length ? ` — ${same.length} matched at the same price.` : '.'}</p>
              )}

              {same.length > 0 && (
                <button type="button" className="text-left text-[12px] text-ink-2 bg-transparent border-0 p-0 cursor-pointer flex items-center gap-1" onClick={() => setShowSame((v) => !v)}>
                  <ChevronDown size={14} className={showSame ? 'rotate-180' : ''} /> {same.length} at the same price (saved to Price watch as a check)
                </button>
              )}
              {showSame && (
                <ul className="list-none m-0 p-0 text-[12px] text-ink-2">
                  {same.map((r) => (
                    <li key={r.key}>
                      {byId.get(r.productId!)?.name ?? r.name} · {money(r.newCents)}
                    </li>
                  ))}
                </ul>
              )}

              {unmatched.length > 0 && (
                <section>
                  <h3 className="m-0 mb-1 text-sm font-bold">{unmatched.length} not matched to a product</h3>
                  <p className="m-0 mb-1.5 text-[12px] text-ink-2">Type to pick the product it is, or leave it to skip.</p>
                  <datalist id="invoice-products">
                    {[...byName.keys()].map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                  <ul className="list-none m-0 p-0 grid gap-1.5">
                    {unmatched.map((r) => (
                      <li key={r.key} className="rounded-xl border border-line p-2.5 text-sm">
                        <b className="block break-words">{[r.brand, r.name, r.size].filter(Boolean).join(' · ')}</b>
                        <span className="text-[12px] text-ink-2">{money(r.newCents)} each</span>
                        <input
                          className="field-input !py-1.5 !text-[13px] mt-1.5"
                          list="invoice-products"
                          placeholder="Which product is this?"
                          value={r.matchName}
                          onChange={(e) => link(r, e.target.value)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="m-0 text-[12px] text-ink-2">Check the numbers against the invoice. Each price is saved with the invoice date for Price watch.</p>
            </div>
          )}

          {stage.kind === 'review' && (
            <SheetActions>
              <button type="button" className="btn btn-text" onClick={() => setStage({ kind: 'start' })}>
                Start over
              </button>
              <button type="button" className="btn btn-primary" disabled={picked.length === 0} onClick={apply}>
                Update {picked.length + siblingCount} cost{picked.length + siblingCount === 1 ? '' : 's'}
              </button>
            </SheetActions>
          )}
        </>
      )}
    </Sheet>
  )
}

function PriceWatchView({ open, money }: { open: boolean; money: (c: number) => string }) {
  const [months, setMonths] = useState<3 | 6 | 12 | 24>(12)
  const [watch, setWatch] = useState<Watch | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setWatch(null)
    getPriceWatch({ data: { months } })
      .then((w) => setWatch(w as Watch))
      .catch(() => setWatch(null))
  }, [open, months])

  if (!watch) return <div className="skel h-40 rounded-2xl" />

  const up = (watch.basketPct ?? 0) > 0
  return (
    <div className="grid gap-4">
      <div className="flex gap-1.5">
        {([3, 6, 12, 24] as const).map((m) => (
          <button key={m} type="button" className="chip !py-1" aria-pressed={months === m} onClick={() => setMonths(m)}>
            {m < 12 ? `${m} mo` : `${m / 12} yr`}
          </button>
        ))}
      </div>

      {watch.basketPct === null ? (
        <div className="rounded-2xl bg-surface p-3 text-sm">
          <b>Not enough history yet.</b>
          <span className="block text-[12px] text-ink-2 mt-1">
            Price watch needs two invoice prices for a product. Each invoice you upload and each delivery you check in adds one. Typed-in costs don't count, so a
            corrected guess never looks like a price rise.
          </span>
        </div>
      ) : (
        <>
          <section className={`rounded-2xl p-3 ${up ? 'bg-bad-tint' : 'bg-good-tint'}`}>
            <div className="text-[12px] text-ink-2">Your supply costs over {months < 12 ? `${months} months` : months === 12 ? 'the last year' : '2 years'}</div>
            <div className="text-2xl font-bold flex items-center gap-1.5">
              {up ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
              {up ? '+' : ''}
              {watch.basketPct}%
            </div>
            <div className="text-[12px] text-ink-2">
              Across {watch.tracked} product{watch.tracked === 1 ? '' : 's'} with more than one price on record, weighted by what you use.
              {watch.monthlyImpactCents !== 0 &&
                ` That's about ${money(Math.abs(watch.monthlyImpactCents))} a month ${watch.monthlyImpactCents > 0 ? 'more' : 'less'} at your current use.`}
            </div>
            {watch.index.length > 1 && <IndexChart index={watch.index} />}
          </section>

          {watch.risers.length > 0 && (
            <MoveList title="Went up the most" moves={watch.risers} money={money} openId={openId} setOpenId={setOpenId} />
          )}
          {watch.fallers.length > 0 && <MoveList title="Went down" moves={watch.fallers} money={money} openId={openId} setOpenId={setOpenId} />}

          {watch.bySupplier.length > 1 && (
            <section>
              <h3 className="m-0 mb-1.5 text-sm font-bold">By supplier</h3>
              <ul className="list-none m-0 p-0 text-sm">
                {watch.bySupplier.map((s) => (
                  <li key={s.vendor} className="flex justify-between py-1 border-b border-line last:border-b-0">
                    <span>
                      {s.vendor} <span className="text-[12px] text-ink-2">· {s.products}</span>
                    </span>
                    <b className={s.changePct > 0 ? 'text-bad' : s.changePct < 0 ? 'text-good' : ''}>
                      {s.changePct > 0 ? '+' : ''}
                      {s.changePct}%
                    </b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {watch.byCategory.length > 1 && (
            <section>
              <h3 className="m-0 mb-1.5 text-sm font-bold">By category</h3>
              <ul className="list-none m-0 p-0 text-sm">
                {watch.byCategory.map((c) => (
                  <li key={c.category} className="flex justify-between py-1 border-b border-line last:border-b-0">
                    <span>
                      {c.category} <span className="text-[12px] text-ink-2">· {c.products}</span>
                    </span>
                    <b className={c.changePct > 0 ? 'text-bad' : c.changePct < 0 ? 'text-good' : ''}>
                      {c.changePct > 0 ? '+' : ''}
                      {c.changePct}%
                    </b>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <p className="m-0 text-[12px] text-ink-2">
        Only prices your invoices and deliveries actually charged — {watch.recorded} recorded prices in all{watch.lastInvoiceAt ? `, last invoice ${shortDate(watch.lastInvoiceAt)}` : ''}. A rise can be the supplier,
        a size change or a lost discount; tap a product to see each price and where it came from.
      </p>
    </div>
  )
}

function MoveList({
  title,
  moves,
  money,
  openId,
  setOpenId,
}: {
  title: string
  moves: PriceMove[]
  money: (c: number) => string
  openId: number | null
  setOpenId: (id: number | null) => void
}) {
  const SOURCE: Record<string, string> = { invoice: 'Invoice', delivery: 'Delivery', import: 'Import', manual: 'Edited', ai: 'AI check', switch: 'Switched seller', new: 'Added', baseline: 'On file', 'invoice-fix': 'Fixed from invoice' }
  return (
    <section>
      <h3 className="m-0 mb-1.5 text-sm font-bold">{title}</h3>
      <ul className="list-none m-0 p-0 grid gap-1.5">
        {moves.map((m) => (
          <li key={m.productId} className="rounded-xl bg-surface">
            <button type="button" className="w-full text-left p-2.5 bg-transparent border-0 cursor-pointer flex items-center gap-2" onClick={() => setOpenId(openId === m.productId ? null : m.productId)}>
              <span className="flex-1 min-w-0 text-sm">
                <b className="block truncate">{m.name}</b>
                <span className="text-[12px] text-ink-2">
                  {money(m.fromCents)} → {money(m.toCents)}
                  {m.vendor ? ` · ${m.vendor}` : ''}
                </span>
              </span>
              <b className={m.changePct > 0 ? 'text-bad' : 'text-good'}>
                {m.changePct > 0 ? '+' : ''}
                {m.changePct}%
              </b>
            </button>
            {openId === m.productId && (
              <ul className="list-none m-0 px-2.5 pb-2.5 text-[12px] text-ink-2">
                {[...m.points].reverse().map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {shortDate(p.at)} · {SOURCE[p.source] ?? p.source}
                      {p.vendor ? ` · ${p.vendor}` : ''}
                    </span>
                    <b className="text-ink">{money(p.cents)}</b>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Small line of the basket, 100 = start of the window. */
function IndexChart({ index }: { index: { month: string; value: number }[] }) {
  const w = 300
  const h = 70
  const vals = index.map((i) => i.value)
  const lo = Math.min(100, ...vals) - 1
  const hi = Math.max(100, ...vals) + 1
  const x = (i: number) => (i / (index.length - 1)) * w
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h
  const d = index.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  return (
    <figure className="m-0 mt-2" aria-label={`Cost index from ${index[0].value} to ${index.at(-1)!.value}`}>
      <svg viewBox={`0 0 ${w} ${h + 14}`} className="w-full h-auto" role="img">
        <line x1="0" x2={w} y1={y(100)} y2={y(100)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
        <text x="0" y={h + 12} fontSize="10" fill="currentColor" opacity="0.6">
          {monthName(index[0].month)}
        </text>
        <text x={w} y={h + 12} fontSize="10" fill="currentColor" opacity="0.6" textAnchor="end">
          {monthName(index.at(-1)!.month)}
        </text>
      </svg>
    </figure>
  )
}
