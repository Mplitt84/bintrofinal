import { useEffect, useState } from 'react'
import { ArrowRight, ExternalLink, Flame, Globe, Sparkles, Tag, TrendingDown, TrendingUp, X } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Thumb, centsToDollars, dollarsShort } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import {
  BULK_COVER_DAYS,
  PRICE_STALE_DAYS,
  SLOW_GROUP_LABELS,
  SLOW_WINDOW_DAYS,
  WEB_PRICE_SOURCE_LABELS,
  daysBetween,
  daysLabel,
  outVerb,
  type BestSeller,
  type InsightKind,
  type Insights,
  type SlowGroup,
  type WebPriceResult,
} from '@/lib/insights'
import { applyWebPrice, checkWebPrice, confirmPrices, getInsightSummary } from '@/server/insights.functions'

export type InsightSegment = 'fast' | 'best' | 'slow' | 'prices'

const SEGMENTS: { id: InsightSegment; label: string }[] = [
  { id: 'fast', label: 'Moving fast' },
  { id: 'best', label: 'Sold & used' },
  { id: 'slow', label: 'Slow movers' },
  { id: 'prices', label: 'Prices' },
]

const SEEN_KEYS: Record<InsightKind, string> = {
  fast: 'bintro-insights-fast-seen',
  weekly: 'bintro-insights-week-seen',
  monthly: 'bintro-insights-month-seen',
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private mode: the pop-up may show again, which is harmless.
  }
}

function label(i: { name: string; brand: string; size: string }) {
  return [i.brand, i.size].filter(Boolean).join(' · ')
}

function money(cents: number) {
  return `$${centsToDollars(cents)}`
}

/** "$42", or "−$3" when an item sells below cost. */
function signedShort(cents: number) {
  return cents < 0 ? `−${dollarsShort(-cents)}` : dollarsShort(cents)
}

/** Right-hand money line for a weekly item: expected profit if sold, product cost if used. */
function weekMoney(b: BestSeller) {
  if (b.useKind === 'used') return b.costCents ? `${dollarsShort(b.costCents)} of product` : 'Used in services'
  if (b.profitCents === null) return b.revenueCents ? `${dollarsShort(b.revenueCents)} sales` : 'Add price & cost'
  return `${signedShort(b.profitCents)} profit`
}

/** Sold vs used totals for the week, e.g. "12 sold · $180 expected profit" / "18 used in services · $64 of product". */
function WeekTotals({ insights, compact = false }: { insights: Insights; compact?: boolean }) {
  const w = insights.week
  if (!w.soldUnits && !w.usedUnits) return null
  return (
    <div className={`grid gap-1 ${compact ? 'mb-2 text-[13px]' : 'mb-3 text-[14px] rounded-2xl border border-line p-3'}`}>
      {w.soldUnits > 0 && (
        <p className="m-0">
          <b>{w.soldUnits}</b> sold to clients ·{' '}
          <span className="text-ink-2">expected profit</span>{' '}
          <b className={w.soldProfitCents < 0 ? 'text-bad' : 'text-good'}>{signedShort(w.soldProfitCents)}</b>
          {w.soldUnpriced > 0 && (
            <span className="text-warn text-[12px] font-semibold">
              {' '}
              · {w.soldUnpriced} item{w.soldUnpriced === 1 ? '' : 's'} missing price or cost
            </span>
          )}
        </p>
      )}
      {w.usedUnits > 0 && (
        <p className="m-0">
          <b>{w.usedUnits}</b> used in services <span className="text-ink-2">(not sold)</span>
          {w.usedCostCents > 0 && (
            <>
              {' '}
              · <span className="text-ink-2">product cost</span> <b className="text-royal">{dollarsShort(w.usedCostCents)}</b>
            </>
          )}
        </p>
      )}
    </div>
  )
}

function fastSignature(insights: Insights) {
  return insights.fastMovers
    .map((f) => f.productId)
    .sort((a, b) => a - b)
    .join(',')
}

function Summary({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="tip-card p-4 mb-4">
      <p className="m-0 mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-ink flex items-center gap-1.5">
        <Sparkles size={13} /> AI summary
      </p>
      <p className="m-0 text-[14px] text-ink whitespace-pre-line">{text}</p>
    </div>
  )
}

/** "Check online" for one product: looks up the manufacturer / distributor / Amazon price and offers to apply it. */
function PriceCheck({
  productId,
  unitCostCents,
  retailPriceCents,
  onChanged,
  compact = false,
}: {
  productId: number
  unitCostCents: number
  retailPriceCents: number
  onChanged: () => void
  compact?: boolean
}) {
  const toast = useToast()
  const [busy, setBusy] = useState<'check' | 'apply' | 'confirm' | null>(null)
  const [result, setResult] = useState<WebPriceResult | null>(null)

  async function check() {
    setBusy('check')
    try {
      setResult(await checkWebPrice({ data: { productId } }))
    } catch {
      setResult({ ok: false, message: "Couldn't check prices right now. Try again in a minute." })
    } finally {
      setBusy(null)
    }
  }

  async function apply() {
    if (!result?.ok) return
    setBusy('apply')
    try {
      await applyWebPrice({ data: { productId, checkId: result.checkId || undefined, unitCostCents: result.unitCostCents || undefined, retailPriceCents: result.retailPriceCents || undefined } })
      toast('Prices updated')
      setResult(null)
      onChanged()
    } catch {
      toast("Couldn't save the prices")
    } finally {
      setBusy(null)
    }
  }

  async function confirm() {
    setBusy('confirm')
    try {
      await confirmPrices({ data: { productId } })
      toast('Marked as up to date')
      onChanged()
    } catch {
      toast("Couldn't save that")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={compact ? 'mt-2' : 'mt-2.5'}>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-tonal btn-sm" onClick={check} disabled={busy !== null}>
          <Globe size={15} />
          {busy === 'check' ? 'Checking sites…' : result ? 'Check again' : 'Check online'}
        </button>
        {!result?.ok && (
          <button type="button" className="btn btn-text btn-sm" onClick={confirm} disabled={busy !== null}>
            {busy === 'confirm' ? 'Saving…' : 'Price still right'}
          </button>
        )}
      </div>
      {busy === 'check' && (
        <p className="m-0 mt-1.5 text-[12px] text-ink-2">Searching manufacturer, distributor and Amazon listings — this can take up to a minute.</p>
      )}
      {result && !result.ok && <p className="m-0 mt-2 text-[13px] text-bad">{result.message}</p>}
      {result?.ok && (
        <div className="mt-2 rounded-xl border border-gold/40 bg-gold-tint p-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
            <span>
              Cost <b className="num">{result.unitCostCents ? money(result.unitCostCents) : '—'}</b>
              {unitCostCents > 0 && result.unitCostCents > 0 && result.unitCostCents !== unitCostCents && (
                <span className="text-ink-2 text-[12px]"> (was {money(unitCostCents)})</span>
              )}
            </span>
            <span>
              Retail <b className="num">{result.retailPriceCents ? money(result.retailPriceCents) : '—'}</b>
              {retailPriceCents > 0 && result.retailPriceCents > 0 && result.retailPriceCents !== retailPriceCents && (
                <span className="text-ink-2 text-[12px]"> (was {money(retailPriceCents)})</span>
              )}
            </span>
          </div>
          <p className="m-0 mt-1 text-[12px] text-gold-ink font-semibold">
            {WEB_PRICE_SOURCE_LABELS[result.sourceType]}
            {result.sourceName && result.sourceType !== 'estimate' ? ` · ${result.sourceName}` : ''}
          </p>
          {result.sourceUrl && (
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] text-action font-medium break-all"
            >
              View listing <ExternalLink size={13} />
            </a>
          )}
          {result.note && <p className="m-0 mt-1 text-[13px] text-ink-2">{result.note}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={apply} disabled={busy !== null}>
              {busy === 'apply' ? 'Saving…' : 'Use these prices'}
            </button>
            <button type="button" className="btn btn-text btn-sm" onClick={confirm} disabled={busy !== null}>
              Keep mine
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <li className="py-3 border-b border-line last:border-0">{children}</li>
}

function ItemHead({
  item,
  right,
}: {
  item: { name: string; brand: string; size: string; imageUrl: string }
  right: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <Thumb imageUrl={item.imageUrl} label={item.brand || item.name} />
      <div className="min-w-0 flex-1">
        <b className="block truncate">{item.name}</b>
        <span className="block text-[13px] text-ink-2 truncate">{label(item) || '—'}</span>
      </div>
      <div className="text-right shrink-0">{right}</div>
    </div>
  )
}

/** Sales insights: what's selling fast, best sellers, slow movers and prices to update. */
export function InsightsSheet({
  open,
  onClose,
  insights,
  segment,
  onSegment,
  onChanged,
  onOpenRestock,
}: {
  open: boolean
  onClose: () => void
  insights: Insights | null
  segment: InsightSegment
  onSegment: (s: InsightSegment) => void
  onChanged: () => void
  onOpenRestock: () => void
}) {
  const [slowGroup, setSlowGroup] = useState<SlowGroup | 'all'>('all')

  const counts: Record<InsightSegment, number> = {
    fast: insights?.fastMovers.length ?? 0,
    best: insights?.bestSellers.length ?? 0,
    slow: insights?.slowMovers.length ?? 0,
    prices: insights?.priceReminders.length ?? 0,
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sales insights"
      subtitle="What's selling, what's sitting, and prices to keep current. Updated with every scan."
      wide
    >
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-4 [scrollbar-width:none]" role="group" aria-label="Insight type">
        {SEGMENTS.map((s) => (
          <button key={s.id} type="button" className="chip whitespace-nowrap" aria-pressed={segment === s.id} onClick={() => onSegment(s.id)}>
            {s.label}
            {counts[s.id] > 0 && <span className="num ml-1.5 opacity-75">{counts[s.id]}</span>}
          </button>
        ))}
      </div>

      {!insights && (
        <div aria-busy="true">
          <div className="skel" />
          <div className="skel w-2/3" />
          <div className="skel w-1/2" />
        </div>
      )}

      {insights && segment === 'fast' && (
        <>
          <Summary text={insights.summaries.fast} />
          {insights.fastMovers.length === 0 ? (
            <p className="text-ink-2">Nothing is selling out unusually fast right now. Bintro checks every few hours and emails you if that changes.</p>
          ) : (
            <>
              <div className="rounded-2xl bg-royal text-white p-4 mb-3 flex items-center gap-3 flex-wrap">
                <Flame size={22} className="text-gold-bright shrink-0" />
                <div className="flex-1 min-w-[180px]">
                  <b className="block text-[17px]">Predicted bulk order: {dollarsShort(insights.fastOrderTotalCents)}</b>
                  <span className="text-[13px] text-white/80">
                    Covers {BULK_COVER_DAYS} days of sales or service use plus par, at your most recent costs.
                  </span>
                </div>
                <button type="button" className="btn btn-gold btn-sm" onClick={onOpenRestock}>
                  Open Restock <ArrowRight size={15} />
                </button>
              </div>
              <ul className="list-none m-0 p-0">
                {insights.fastMovers.map((f) => (
                  <Row key={f.productId}>
                    <ItemHead
                      item={f}
                      right={
                        <>
                          <b className="num block">Order {f.orderQty}</b>
                          <span className="num text-[13px] text-ink-2">{f.unitCostCents ? `≈ ${money(f.orderCostCents)}` : 'Add a cost'}</span>
                        </>
                      }
                    />
                    <p className="m-0 mt-1.5 text-[13px] text-ink-2 pl-14">
                      <b className="text-ink">{f.weekUnits}</b> {f.useKind === 'sold' ? 'sold' : 'used in services'} in 7 days · {f.qty} on hand ·{' '}
                      <b className={f.daysLeft <= 7 ? 'text-bad' : 'text-warn'}>
                        {f.qty <= 0 ? 'out now' : `runs out in ${daysLabel(f.daysLeft)}`}
                      </b>
                      {f.surge && <span className="text-gold-ink font-semibold"> · selling above usual</span>}
                    </p>
                    {f.priceStale && (
                      <div className="pl-14">
                        <p className="m-0 mt-1 text-[12px] text-warn font-semibold">
                          {f.unitCostCents ? `Cost last updated ${f.priceUpdatedAt ? `${daysBetween(f.priceUpdatedAt)} days ago` : 'never'} — check it before ordering.` : 'No cost saved yet.'}
                        </p>
                        <PriceCheck productId={f.productId} unitCostCents={f.unitCostCents} retailPriceCents={f.retailPriceCents} onChanged={onChanged} compact />
                      </div>
                    )}
                  </Row>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {insights && segment === 'best' && (
        <>
          <Summary text={insights.summaries.weekly} />
          <WeekTotals insights={insights} />
          {insights.bestSellers.length === 0 ? (
            <p className="text-ink-2">No sales or usage scanned in the last 7 days yet.</p>
          ) : (
            <ol className="list-none m-0 p-0">
              {insights.bestSellers.map((b, i) => (
                <Row key={b.productId}>
                  <div className="flex items-center gap-3">
                    <span className={`num w-6 text-center font-bold ${i < 3 ? 'text-gold-ink' : 'text-ink-2'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <ItemHead
                        item={b}
                        right={
                          <>
                            <b className="num block">
                              {b.weekUnits} {outVerb(b.useKind)}
                            </b>
                            <span className={`num text-[13px] block ${b.useKind === 'sold' && b.profitCents !== null ? (b.profitCents < 0 ? 'text-bad' : 'text-good') : 'text-ink-2'}`}>
                              {weekMoney(b)}
                            </span>
                            <span
                              className={`num text-[13px] inline-flex items-center gap-1 ${
                                b.trendPct === null ? 'text-gold-ink' : b.trendPct >= 0 ? 'text-good' : 'text-bad'
                              }`}
                            >
                              {b.trendPct === null ? (
                                'New'
                              ) : (
                                <>
                                  {b.trendPct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                  {b.trendPct > 0 ? '+' : ''}
                                  {b.trendPct}%
                                </>
                              )}
                            </span>
                          </>
                        }
                      />
                    </div>
                  </div>
                </Row>
              ))}
            </ol>
          )}
          <p className="text-[12px] text-ink-2 mt-3 mb-0">
            Last 7 days vs the week before. Retail items count as sold with profit at your retail price minus cost; backbar and other
            service supplies count as used, not sold. This follows each product's category (Settings → Categories). Emailed every Monday.
          </p>
        </>
      )}

      {insights && segment === 'slow' && (
        <>
          <Summary text={insights.summaries.monthly} />
          <div className="flex gap-2 flex-wrap mb-3" role="group" aria-label="Slow mover group">
            {(['all', 'color', 'retail', 'other'] as const).map((g) => (
              <button key={g} type="button" className="chip !py-1.5 !px-3 !text-[13px]" aria-pressed={slowGroup === g} onClick={() => setSlowGroup(g)}>
                {g === 'all' ? 'All' : SLOW_GROUP_LABELS[g]}
              </button>
            ))}
          </div>
          {(() => {
            const items = insights.slowMovers.filter((m) => slowGroup === 'all' || m.group === slowGroup)
            if (!items.length) return <p className="text-ink-2">Nothing in stock has gone unused for {SLOW_WINDOW_DAYS} days. 🎉</p>
            const tied = items.reduce((s, m) => s + m.tiedUpCents, 0)
            return (
              <>
                {tied > 0 && (
                  <p className="m-0 mb-2 text-[14px]">
                    <b className="text-royal">{dollarsShort(tied)}</b> <span className="text-ink-2">of cash is sitting on the shelf. Try a promo or bundle, return unopened stock, or lower par.</span>
                  </p>
                )}
                <ul className="list-none m-0 p-0">
                  {items.map((m) => (
                    <Row key={m.productId}>
                      <ItemHead
                        item={m}
                        right={
                          <>
                            <b className="num block">{m.qty} on hand</b>
                            <span className="num text-[13px] text-ink-2">{m.tiedUpCents ? dollarsShort(m.tiedUpCents) : ''}</span>
                          </>
                        }
                      />
                      <p className="m-0 mt-1 text-[13px] text-ink-2 pl-14">
                        <span className="text-gold-ink font-semibold">{SLOW_GROUP_LABELS[m.group]}</span> · used {m.monthUnits}× in{' '}
                        {SLOW_WINDOW_DAYS} days · last used {m.daysSinceUsed === null ? 'never' : `${m.daysSinceUsed}d ago`}
                      </p>
                    </Row>
                  ))}
                </ul>
              </>
            )
          })()}
          <p className="text-[12px] text-ink-2 mt-3 mb-0">Emailed on the 1st of each month.</p>
        </>
      )}

      {insights && segment === 'prices' && (
        <>
          <div className="tip-card p-4 mb-3 flex gap-3 items-start">
            <Tag size={20} className="text-gold-ink shrink-0 mt-0.5" />
            <p className="m-0 text-[14px]">
              Costs change quietly. Bintro reminds you when a price is over {PRICE_STALE_DAYS} days old. <b>Check online</b> looks at the
              manufacturer's site, authorized distributors and Amazon — never third-party resellers.
            </p>
          </div>
          {insights.priceReminders.length === 0 ? (
            <p className="text-ink-2">Every price has been updated in the last {PRICE_STALE_DAYS} days. Nice work.</p>
          ) : (
            <ul className="list-none m-0 p-0">
              {insights.priceReminders.map((r) => (
                <Row key={r.productId}>
                  <ItemHead
                    item={r}
                    right={
                      <>
                        <b className="num block">{r.unitCostCents ? money(r.unitCostCents) : 'No cost'}</b>
                        <span className="text-[13px] text-ink-2">{r.priceUpdatedAt ? `${r.daysOld}d ago` : 'Never updated'}</span>
                      </>
                    }
                  />
                  <div className="pl-14">
                    <PriceCheck productId={r.productId} unitCostCents={r.unitCostCents} retailPriceCents={r.retailPriceCents} onChanged={onChanged} />
                  </div>
                </Row>
              ))}
            </ul>
          )}
        </>
      )}
    </Sheet>
  )
}

/** Tappable card at the top of Activity / Restock that opens the insights sheet. */
export function InsightsBanner({ insights, onOpen }: { insights: Insights | null; onOpen: (s: InsightSegment) => void }) {
  if (!insights) return null
  const fast = insights.fastMovers.length
  const top = insights.bestSellers.find((b) => b.useKind === 'sold') ?? insights.bestSellers[0]
  const topLabel = top?.useKind === 'used' ? 'Most used this week' : 'Top seller this week'
  const slow = insights.slowMovers.length
  const prices = insights.priceReminders.length
  if (!fast && !top && !slow && !prices) return null
  const first: InsightSegment = fast ? 'fast' : top ? 'best' : slow ? 'slow' : 'prices'
  return (
    <button
      type="button"
      onClick={() => onOpen(first)}
      className="w-full text-left rounded-2xl p-4 mb-4 border-0 cursor-pointer bg-gradient-to-br from-royal to-royal-2 text-white shadow-card flex items-center gap-3"
    >
      <span className="w-10 h-10 rounded-full bg-white/12 grid place-items-center shrink-0 text-gold-bright">
        {fast ? <Flame size={20} /> : <Sparkles size={20} />}
      </span>
      <span className="flex-1 min-w-0 text-[14px] leading-snug">
        <b className="block text-[15px]">
          {fast
            ? `${fast} item${fast === 1 ? ' is' : 's are'} running out fast · ≈ ${dollarsShort(insights.fastOrderTotalCents)} to restock`
            : top
              ? `${topLabel}: ${top.name}`
              : 'Sales insights'}
        </b>
        <span className="text-white/80">
          {[top && fast ? `${top.useKind === 'used' ? 'Most used' : 'Top seller'}: ${top.name}` : '', slow ? `${slow} slow mover${slow === 1 ? '' : 's'}` : '', prices ? `${prices} price${prices === 1 ? '' : 's'} to update` : '']
            .filter(Boolean)
            .join(' · ') || 'See best sellers and trends'}
        </span>
      </span>
      <ArrowRight size={18} className="text-gold-bright shrink-0" />
    </button>
  )
}

type Popup = { kind: InsightKind; mark: () => void }

/**
 * App pop-up for new insights: a fast-mover alert whenever new items start
 * selling out, the weekly best sellers once a week, and slow movers + price
 * reminders once a month. Waits for a quiet moment and never covers an open sheet.
 */
export function InsightPopup({
  insights,
  onOpen,
  onVisible,
}: {
  insights: Insights | null
  onOpen: (s: InsightSegment) => void
  onVisible: (visible: boolean) => void
}) {
  const [popup, setPopup] = useState<Popup | null>(null)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!insights || popup) return
    const fastSig = fastSignature(insights)
    const seenFast = readStorage(SEEN_KEYS.fast) ?? ''
    const seenFastIds = new Set(seenFast.split(',').filter(Boolean))
    const newFast = insights.fastMovers.some((f) => !seenFastIds.has(String(f.productId)))
    let next: Popup | null = null
    if (newFast) next = { kind: 'fast', mark: () => writeStorage(SEEN_KEYS.fast, fastSig) }
    else if (insights.bestSellers.length && readStorage(SEEN_KEYS.weekly) !== insights.weekKey)
      next = { kind: 'weekly', mark: () => writeStorage(SEEN_KEYS.weekly, insights.weekKey) }
    else if ((insights.slowMovers.length || insights.priceReminders.length) && readStorage(SEEN_KEYS.monthly) !== insights.monthKey)
      next = { kind: 'monthly', mark: () => writeStorage(SEEN_KEYS.monthly, insights.monthKey) }
    if (!next) return
    const chosen = next
    const timer = setTimeout(() => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      chosen.mark()
      setSummary(insights.summaries[chosen.kind])
      setPopup(chosen)
      onVisible(true)
      if (!insights.summaries[chosen.kind]) {
        getInsightSummary({ data: { kind: chosen.kind } })
          .then((r) => setSummary(r.summary))
          .catch(() => {})
      }
    }, 1800)
    return () => clearTimeout(timer)
  }, [insights, popup, onVisible])

  if (!popup || !insights) return null

  function close() {
    setPopup(null)
    setSummary('')
    onVisible(false)
  }

  const segment: InsightSegment = popup.kind === 'fast' ? 'fast' : popup.kind === 'weekly' ? 'best' : insights.slowMovers.length ? 'slow' : 'prices'
  const title =
    popup.kind === 'fast'
      ? 'Moving fast — buy in higher volume'
      : popup.kind === 'weekly'
        ? insights.week.soldUnits && insights.week.usedUnits
          ? 'This week: sold & used'
          : insights.week.soldUnits
            ? 'Selling very well this week'
            : 'Used most in services this week'
        : 'Monthly check: slow movers & prices'
  const Icon = popup.kind === 'fast' ? Flame : popup.kind === 'weekly' ? TrendingUp : TrendingDown

  const lines =
    popup.kind === 'fast'
      ? insights.fastMovers.slice(0, 3).map((f) => ({
          id: f.productId,
          name: f.name,
          detail: `${f.qty <= 0 ? 'Out now' : `Out in ${daysLabel(f.daysLeft)}`} · order ${f.orderQty}${f.unitCostCents ? ` ≈ ${dollarsShort(f.orderCostCents)}` : ''}`,
        }))
      : popup.kind === 'weekly'
        ? insights.bestSellers.slice(0, 3).map((b) => ({
            id: b.productId,
            name: b.name,
            detail: `${b.weekUnits} ${b.useKind === 'sold' ? 'sold' : 'used in services'} · ${weekMoney(b)}`,
          }))
        : insights.slowMovers.slice(0, 3).map((m) => ({
            id: m.productId,
            name: m.name,
            detail: `${SLOW_GROUP_LABELS[m.group]} · ${m.qty} on hand${m.tiedUpCents ? ` · ${dollarsShort(m.tiedUpCents)}` : ''}`,
          }))

  return (
    <aside
      role="status"
      aria-label={title}
      className="tip-nudge print:hidden fixed z-40 right-4 left-4 min-[560px]:left-auto min-[560px]:w-[400px] bottom-[calc(92px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-6 min-[1060px]:right-6"
    >
      <div className="rounded-[20px] bg-white overflow-hidden" style={{ boxShadow: 'var(--shadow-lift), inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 35%, transparent)' }}>
        <div className="bg-gradient-to-br from-royal to-royal-2 text-white px-4 py-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-white/12 grid place-items-center shrink-0 text-gold-bright" aria-hidden="true">
            <Icon size={18} />
          </span>
          <b className="flex-1 text-[15px] leading-snug">{title}</b>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss"
            className="w-8 h-8 rounded-full border-0 bg-transparent text-white/80 grid place-items-center cursor-pointer hover:bg-white/10 shrink-0"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-4 pt-3">
          {lines.length > 0 && (
            <ul className="list-none m-0 p-0 mb-2">
              {lines.map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-3 py-1 text-[14px]">
                  <span className="truncate font-semibold">{l.name}</span>
                  <span className="num text-[13px] text-ink-2 shrink-0">{l.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {popup.kind === 'weekly' && <WeekTotals insights={insights} compact />}
          {popup.kind === 'fast' && insights.fastOrderTotalCents > 0 && (
            <p className="m-0 mb-2 text-[13px]">
              Predicted cost at latest prices: <b className="text-royal">{dollarsShort(insights.fastOrderTotalCents)}</b>
            </p>
          )}
          {popup.kind === 'monthly' && insights.priceReminders.length > 0 && (
            <p className="m-0 mb-2 text-[13px] text-warn font-semibold">
              {insights.priceReminders.length} price{insights.priceReminders.length === 1 ? '' : 's'} need updating.
            </p>
          )}
          {summary && (
            <p className="m-0 mb-2 text-[13px] text-ink bg-gold-tint rounded-xl px-3 py-2">
              <Sparkles size={12} className="inline text-gold-ink mr-1 -mt-0.5" />
              {summary}
            </p>
          )}
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                close()
                onOpen(segment)
              }}
            >
              See details
            </button>
            {popup.kind === 'monthly' && insights.priceReminders.length > 0 && segment !== 'prices' && (
              <button
                type="button"
                className="btn btn-text btn-sm !text-gold-ink"
                onClick={() => {
                  close()
                  onOpen('prices')
                }}
              >
                Update prices
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
