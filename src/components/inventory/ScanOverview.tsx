import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ChevronRight, ClipboardCheck, ShoppingBag, Sparkles, Undo2 } from 'lucide-react'
import type { MovementRow, Product } from '@/components/inventory/types'
import { EmptyState, Thumb, dollarsShort, timeAgo } from '@/components/ui/bits'
import { getOverview } from '@/server/overview.functions'
import { countIdFromNote } from '@/lib/counts'
import { CountDetailSheet } from '@/components/inventory/CountDetailSheet'
import {
  OVERVIEW_PERIODS,
  changeLabel,
  movementKind,
  overviewWindows,
  type MovementKind,
  type Overview,
  type OverviewPeriod,
} from '@/lib/overview'

const PERIOD_KEY = 'bintro.overviewPeriod'

const KIND_LABEL: Record<MovementKind, { text: string; className: string }> = {
  sold: { text: 'Sold', className: 'bg-good-tint text-good' },
  square: { text: 'Square sale', className: 'bg-good-tint text-good' },
  used: { text: 'Used', className: 'bg-surface text-ink' },
  received: { text: 'Received', className: 'bg-gold-tint text-gold-ink' },
  count: { text: 'Count', className: 'bg-surface text-ink-2' },
  other: { text: 'Change', className: 'bg-surface text-ink-2' },
}

type Filter = 'all' | 'out' | 'in' | 'count'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'out', label: 'Sold & used' },
  { id: 'in', label: 'Received' },
  { id: 'count', label: 'Counts' },
]

/**
 * Scan page, below the scanner: a calm, Square-style look at the business for
 * Today / Week / Month / Quarter, then Recent with every row labeled so a
 * recount never looks like a sale.
 */
export function ScanOverview({
  recent,
  products,
  belowParCount,
  onOpenRestock,
  onUndo,
  staffName,
  onChanged,
}: {
  staffName: string
  /** Reload after a count is undone. */
  onChanged: () => void | Promise<void>
  recent: MovementRow[]
  products: Product[]
  belowParCount: number
  onOpenRestock?: () => void
  onUndo: (m: MovementRow) => void
}) {
  const [period, setPeriod] = useState<OverviewPeriod>('today')
  const [data, setData] = useState<Overview | null>(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [openCount, setOpenCount] = useState<number | null>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PERIOD_KEY) as OverviewPeriod | null
      if (saved && OVERVIEW_PERIODS.some((p) => p.id === saved)) setPeriod(saved)
    } catch {}
  }, [])

  // Reload on period change and after every scan / undo (recent changes).
  useEffect(() => {
    let live = true
    const w = overviewWindows(period)
    getOverview({
      data: {
        start: w.start.toISOString(),
        end: w.end.toISOString(),
        prevStart: w.prevStart.toISOString(),
        prevEnd: w.prevEnd.toISOString(),
        edges: w.edges.map((e) => e.toISOString()),
        labels: w.labels,
      },
    })
      .then((o) => {
        if (!live) return
        setData(o)
        setFailed(false)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [period, recent])

  const pick = (p: OverviewPeriod) => {
    setPeriod(p)
    try {
      window.localStorage.setItem(PERIOD_KEY, p)
    } catch {}
  }

  const stockValue = useMemo(() => products.reduce((sum, p) => sum + Math.max(0, p.qty) * p.unitCostCents, 0), [products])
  const compare = OVERVIEW_PERIODS.find((p) => p.id === period)!.compare
  const soldIds = useMemo(() => new Set(data?.soldIds ?? []), [data])
  const c = data?.current
  const prev = data?.previous

  const rows = recent
    .map((m) => ({ m, kind: movementKind(m, soldIds) }))
    .filter(({ kind }) =>
      filter === 'all'
        ? true
        : filter === 'out'
          ? kind === 'sold' || kind === 'used' || kind === 'square'
          : filter === 'in'
            ? kind === 'received'
            : kind === 'count',
    )
    .slice(0, 12)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-lg font-bold m-0">At a glance</h2>
        <div className="flex gap-1 bg-surface rounded-full p-1" role="tablist" aria-label="Period">
          {OVERVIEW_PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => pick(p.id)}
              className={`border-0 rounded-full px-3 py-1.5 text-[13px] font-semibold cursor-pointer ${
                period === p.id ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-ink-2'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 min-[560px]:grid-cols-4 gap-2.5 mb-3">
        <Metric
          label="Retail sold"
          value={c ? dollarsShort(c.soldCents) : '—'}
          sub={c ? `${c.soldUnits} item${c.soldUnits === 1 ? '' : 's'}` : ''}
          change={c && prev ? changeLabel(c.soldCents, prev.soldCents) : ''}
          compare={compare}
          upIsGood
        />
        <Metric
          label="Product used"
          value={c ? dollarsShort(c.usedCents) : '—'}
          sub={c ? `${c.usedUnits} in services` : ''}
          change={c && prev ? changeLabel(c.usedCents, prev.usedCents) : ''}
          compare={compare}
        />
        <Metric
          label="Received"
          value={c ? dollarsShort(c.receivedCents) : '—'}
          sub={c ? `${c.receivedUnits} unit${c.receivedUnits === 1 ? '' : 's'}` : ''}
          change={c && prev ? changeLabel(c.receivedCents, prev.receivedCents) : ''}
          compare={compare}
        />
        <button
          type="button"
          onClick={onOpenRestock}
          className="text-left bg-white border border-line rounded-2xl p-3.5 min-w-0 cursor-pointer hover:bg-surface"
        >
          <span className="text-[13px] text-ink-2 flex items-center justify-between">
            To reorder <ChevronRight size={15} />
          </span>
          <b className="num block text-[22px] font-bold tracking-tight">{belowParCount}</b>
          <span className="text-[12px] text-ink-2">Stock on hand {dollarsShort(stockValue)}</span>
        </button>
      </div>

      {failed && <p className="text-sm text-ink-2 mt-0">Couldn’t load the numbers. They’ll try again after your next scan.</p>}

      {data && <ActivityChart data={data} />}

      {c && (c.counts > 0 || c.soldUnpriced > 0) && (
        <p className="text-[13px] text-ink-2 mt-2 mb-0">
          {c.counts > 0 && (
            <>
              <ClipboardCheck size={13} className="inline -mt-0.5 mr-1" />
              {c.counts} count correction{c.counts === 1 ? '' : 's'}, net {c.countNetUnits > 0 ? '+' : ''}
              {c.countNetUnits} unit{Math.abs(c.countNetUnits) === 1 ? '' : 's'} ({c.countNetCents < 0 ? '−' : ''}
              {dollarsShort(Math.abs(c.countNetCents))}). Not counted as sales or use.
            </>
          )}
          {c.soldUnpriced > 0 && (
            <span className="block">
              {c.soldUnpriced} sold item{c.soldUnpriced === 1 ? ' has' : 's have'} no retail price, so {c.soldUnpriced === 1 ? 'it isn’t' : 'they aren’t'} in Retail sold.
            </span>
          )}
        </p>
      )}

      {data && data.top.length > 0 && (
        <section className="bg-white border border-line rounded-2xl px-4 py-3 mt-3">
          <h3 className="m-0 mb-1 text-[15px] font-bold">Top items</h3>
          <ul className="list-none m-0 p-0">
            {data.top.map((t) => (
              <li key={t.productId} className="flex items-center gap-3 py-2 border-b border-line last:border-b-0">
                <Thumb imageUrl={t.imageUrl} label={t.brand || t.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-[14px]">{t.name}</div>
                  <div className="text-[12px] text-ink-2 truncate">
                    {[t.brand, t.kind === 'sold' ? 'retail' : 'used in services'].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="text-right">
                  <b className="num block text-[15px]">{t.units}</b>
                  <span className="text-[12px] text-ink-2">{t.cents ? dollarsShort(t.cents) : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 mt-6 mb-2 flex-wrap">
        <h2 className="text-lg font-bold m-0">Recent</h2>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.id} className="chip !py-1 !text-[12px]" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {recent.length === 0 ? (
        <EmptyState title="Nothing scanned yet">Tap the circle to scan your first product.</EmptyState>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-2">Nothing like that in the latest activity.</p>
      ) : (
        <ul className="list-none m-0 p-0">
          {rows.map(({ m, kind }) => {
            const label = KIND_LABEL[kind]
            const isCount = kind === 'count'
            return (
              <li key={m.id} className="flex items-center gap-3 py-3 border-b border-line last:border-b-0">
                <Thumb imageUrl={m.productImageUrl} label={m.productBrand || m.productName} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{m.productName}</div>
                  <div className="text-[13px] text-ink-2 truncate flex items-center gap-1.5">
                    <span className={`shrink-0 rounded-full px-2 py-[1px] text-[11px] font-bold ${label.className}`}>{label.text}</span>
                    <span className="truncate">{[m.staffName || m.staffInitials, timeAgo(m.createdAt)].filter(Boolean).join(' · ')}</span>
                  </div>
                </div>
                <b className={`num text-[15px] ${isCount ? 'text-ink-2' : m.delta > 0 ? 'text-good' : 'text-ink'}`}>
                  {m.delta > 0 ? '+' : ''}
                  {m.delta}
                </b>
                {isCount ? (
                  countIdFromNote(m.note) ? (
                    <button
                      onClick={() => setOpenCount(countIdFromNote(m.note))}
                      aria-label={`Open the count for ${m.productName}`}
                      title="See this count / undo it"
                      className="w-10 h-10 rounded-full border-0 bg-transparent grid place-items-center text-ink-2 cursor-pointer hover:bg-surface"
                    >
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <span className="w-10" aria-hidden="true" />
                  )
                ) : (
                  <button
                    onClick={() => onUndo(m)}
                    aria-label={`Undo ${m.productName}`}
                    title="Undo"
                    className="w-10 h-10 rounded-full border-0 bg-transparent grid place-items-center text-ink-2 cursor-pointer hover:bg-surface"
                  >
                    <Undo2 size={18} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <CountDetailSheet countId={openCount} staffName={staffName} onClose={() => setOpenCount(null)} onUndone={onChanged} />
    </div>
  )
}

function Metric({
  label,
  value,
  sub,
  change,
  compare,
  upIsGood,
}: {
  label: string
  value: string
  sub: string
  change: string
  compare: string
  /** Only sales get green/red; use and deliveries going up isn't good or bad. */
  upIsGood?: boolean
}) {
  const up = change.startsWith('+') || change === 'new'
  const down = change.startsWith('−')
  const tone = upIsGood ? (up ? 'text-good' : down ? 'text-bad' : 'text-ink-2') : 'text-ink-2'
  return (
    <div className="bg-white border border-line rounded-2xl p-3.5 min-w-0">
      <span className="text-[13px] text-ink-2">{label}</span>
      <b className="num block text-[22px] font-bold tracking-tight truncate">{value}</b>
      <span className="text-[12px] text-ink-2 block truncate">{sub}</span>
      {change && (
        <span className={`text-[12px] font-semibold block truncate ${tone}`}>
          {change} <span className="font-normal text-ink-2">{compare}</span>
        </span>
      )}
    </div>
  )
}

/** Units out per bar (sold on top of used), with received as a thin marker. */
function ActivityChart({ data }: { data: Overview }) {
  const [hover, setHover] = useState<number | null>(null)
  const H = 96
  const max = Math.max(1, ...data.buckets.map((b) => Math.max(b.soldUnits + b.usedUnits, b.receivedUnits)))
  const any = data.buckets.some((b) => b.soldUnits + b.usedUnits + b.receivedUnits > 0)
  return (
    <section className="bg-white border border-line rounded-2xl px-4 pt-3 pb-2">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <h3 className="m-0 text-[15px] font-bold">Activity</h3>
        <div className="flex gap-3 text-[12px] text-ink-2" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-action" /> <ShoppingBag size={12} /> Sold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-action/35" /> <Sparkles size={12} /> Used
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-[3px] rounded-sm bg-gold" /> <ArrowDownToLine size={12} /> Received
          </span>
        </div>
      </div>
      {!any ? (
        <p className="text-sm text-ink-2 my-6 text-center">No sales, use or deliveries yet in this period.</p>
      ) : (
        <div className="flex items-end gap-[3px]" style={{ height: H + 18 }}>
          {data.buckets.map((b, i) => {
            const out = b.soldUnits + b.usedUnits
            return (
              <div
                key={i}
                className="relative flex-1 h-full flex flex-col justify-end items-center min-w-0"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
              >
                {hover === i && (
                  <span className="absolute z-10 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink text-white text-[12px] rounded-lg px-2.5 py-1.5 whitespace-nowrap pointer-events-none">
                    Sold {b.soldUnits}
                    {b.soldCents ? ` (${dollarsShort(b.soldCents)})` : ''} · Used {b.usedUnits} · In {b.receivedUnits}
                  </span>
                )}
                <span className="relative w-full max-w-[28px] flex flex-col justify-end" style={{ height: H }}>
                  {b.receivedUnits > 0 && (
                    <span className="absolute -left-0.5 -right-0.5 h-[3px] rounded-full bg-gold" style={{ bottom: (b.receivedUnits / max) * H }} />
                  )}
                  {b.soldUnits > 0 && (
                    <span className="block w-full bg-action rounded-t-[3px]" style={{ height: Math.max(2, (b.soldUnits / max) * H) }} />
                  )}
                  {b.usedUnits > 0 && (
                    <span
                      className={`block w-full bg-action/35 ${b.soldUnits ? '' : 'rounded-t-[3px]'}`}
                      style={{ height: Math.max(2, (b.usedUnits / max) * H) }}
                    />
                  )}
                  {out === 0 && <span className="block w-full h-[2px] bg-line rounded" />}
                </span>
                <span className="text-[10px] text-ink-2 h-[14px] mt-1 leading-none">{b.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
