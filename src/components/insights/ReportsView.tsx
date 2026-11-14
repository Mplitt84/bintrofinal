/**
 * Reports tab: the business's own numbers for a day, week, month, quarter or year,
 * with the same stretch of the period before it beside them.
 *
 * Every figure comes from `buildReport` (`src/lib/reports.ts`) over Bintro's own
 * records — nothing is estimated, and what the numbers can't see is said out loud at
 * the bottom. The wording follows the trade: a tattoo shop reads "Artist" where a
 * salon reads "Stylist", and the services section only appears for trades that keep
 * client records.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, Download, ShoppingBag, Sparkles, TriangleAlert, Users } from 'lucide-react'
import { OVERVIEW_PERIODS, changeLabel, type OverviewPeriod } from '@/lib/overview'
import { marginOf, profitOf, reportCsvRows, type Report, type ReportSlice, type ReportTotals } from '@/lib/reports'
import { overviewWindows } from '@/lib/overview'
import { getReport } from '@/server/reports.functions'
import { useBusiness, useMoney } from '@/components/business/BusinessContext'
import { GENERIC_PROVIDER_NOUN, providerNounFor, recordSpecFor } from '@/lib/industry'
import { toCsv, exportStamp } from '@/lib/csv'
import { EmptyState, PageHead, Thumb } from '@/components/ui/bits'

const PERIOD_KEY = 'bintro.reportPeriod'

/** What one bar on the chart covers, for the hint above it. */
const BAR_IS: Record<OverviewPeriod, string> = {
  today: 'part of the day',
  week: 'day',
  month: 'day',
  quarter: 'week',
  year: 'month',
}

/** What the chosen period is called in a sentence, for the CSV and the sub-heading. */
function periodTitle(period: OverviewPeriod, start: Date) {
  if (period === 'today') return start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  if (period === 'week') return `Week of ${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
  if (period === 'month') return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  if (period === 'quarter') return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`
  return String(start.getFullYear())
}

export function ReportsView() {
  const { type, name } = useBusiness()
  const [period, setPeriod] = useState<OverviewPeriod>('month')
  const [report, setReport] = useState<Report | null>(null)
  const [failed, setFailed] = useState(false)
  const windows = useMemo(() => overviewWindows(period), [period])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERIOD_KEY) as OverviewPeriod | null
      if (saved && OVERVIEW_PERIODS.some((p) => p.id === saved)) setPeriod(saved)
    } catch {
      // A device that blocks storage just starts on the month.
    }
  }, [])

  useEffect(() => {
    let live = true
    setReport(null)
    setFailed(false)
    getReport({
      data: {
        period,
        start: windows.start.toISOString(),
        end: windows.end.toISOString(),
        prevStart: windows.prevStart.toISOString(),
        prevEnd: windows.prevEnd.toISOString(),
        edges: windows.edges.map((e) => e.toISOString()),
        labels: windows.labels,
      },
    })
      .then((r) => live && setReport(r as Report))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [period, windows])

  const pick = (p: OverviewPeriod) => {
    setPeriod(p)
    try {
      localStorage.setItem(PERIOD_KEY, p)
    } catch {
      // Nothing to remember on a device that blocks storage.
    }
  }

  const title = periodTitle(period, windows.start)
  const compare = OVERVIEW_PERIODS.find((p) => p.id === period)!.compare
  const spec = recordSpecFor(type.id)
  const provider = providerNounFor(type.id)
  // Trades with a word of their own get it ("by stylist", "by artist"); the rest
  // read better as "team member" than as "service provider".
  const whoLabel = provider === GENERIC_PROVIDER_NOUN ? 'team member' : provider.toLowerCase()
  const keepsClients = !!spec

  const download = () => {
    if (!report) return
    const [head, ...body] = reportCsvRows(report, title)
    const columns = head.map((label, i) => ({ key: `c${i}`, label: String(label) }))
    const csv = toCsv(
      columns,
      body.map((row) => Object.fromEntries(row.map((cell, i) => [`c${i}`, cell]))),
    )
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportStamp(`${name || 'bintro'}-report`, windows.start)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHead
        title="Reports"
        lead="What sold, what you used, what came in and what it all made — for the day, week, month, quarter or year."
        action={
          report ? (
            <button type="button" className="btn btn-tonal btn-sm" onClick={download}>
              <Download size={15} /> Download
            </button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Report period">
        {OVERVIEW_PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            className="chip shrink-0"
            aria-pressed={period === p.id}
            onClick={() => pick(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-ink-2 mt-2 mb-3">
        {title} · compared {compare}
      </p>

      {failed ? (
        <EmptyState title="That report didn't load">
          <p className="text-sm text-ink-2 m-0">Check your signal and tap a period again.</p>
        </EmptyState>
      ) : !report ? (
        <Skeleton />
      ) : (
        <div className="grid gap-4">
          <Headline report={report} compare={compare} />
          <SalesChart report={report} />
          {report.current.soldCents > 0 && (
            <Breakdown title="Sales by category" rows={report.byCategory} empty="Nothing sold yet in this period." />
          )}
          <TopItems title="Top sellers" rows={report.topSold} kind="sold" />
          <TopItems title="Most used on clients" rows={report.topUsed} kind="used" />
          {report.current.soldCents > 0 && (
            <Breakdown
              title={`Sales by ${whoLabel}`}
              rows={report.byStaff}
              empty="No names on sales yet in this period."
              icon={<Users size={15} />}
            />
          )}
          {keepsClients && report.byService.length > 0 && <Services report={report} whoLabel={whoLabel} />}
          <Breakdown
            title="Stock received by supplier"
            rows={report.byVendor}
            empty="No deliveries checked in yet in this period."
            icon={<ArrowDownToLine size={15} />}
          />
          {report.byReason.length > 0 && (
            <Breakdown
              title="Lost by reason"
              rows={report.byReason}
              empty=""
              icon={<TriangleAlert size={15} />}
              note="From count corrections, priced at what each item cost you."
            />
          )}
          <Gaps report={report} />
        </div>
      )}
    </>
  )
}

function Skeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel h-[84px] rounded-2xl" />
        ))}
      </div>
      <div className="skel h-[220px] rounded-2xl" />
      <div className="skel h-[160px] rounded-2xl" />
    </div>
  )
}

/** The four numbers the owner looks at first, each against the period before. */
function Headline({ report, compare }: { report: Report; compare: string }) {
  const { money: fmt } = useMoney()
  const { current, previous } = report
  const margin = marginOf(current)
  const tiles: { label: string; value: string; sub: string; change: string; tone?: 'good' | 'bad' }[] = [
    {
      label: 'Retail sold',
      value: fmt(current.soldCents),
      sub: `${current.soldUnits} ${current.soldUnits === 1 ? 'item' : 'items'}`,
      change: changeLabel(current.soldCents, previous.soldCents),
      tone: current.soldCents >= previous.soldCents ? 'good' : 'bad',
    },
    {
      label: 'Kept as profit',
      value: fmt(profitOf(current)),
      sub: margin === null ? 'on retail sold' : `${margin}% of sales`,
      change: changeLabel(profitOf(current), profitOf(previous)),
      tone: profitOf(current) >= profitOf(previous) ? 'good' : 'bad',
    },
    {
      label: 'Product used on clients',
      value: fmt(current.usedCents),
      sub: `${current.usedUnits} ${current.usedUnits === 1 ? 'item' : 'items'}`,
      change: changeLabel(current.usedCents, previous.usedCents),
    },
    {
      label: 'Stock received',
      value: fmt(current.receivedCents),
      sub: `${current.receivedUnits} ${current.receivedUnits === 1 ? 'item' : 'items'} in`,
      change: changeLabel(current.receivedCents, previous.receivedCents),
    },
  ]
  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white border border-line rounded-2xl p-3">
            <p className="m-0 text-[12px] text-ink-2 font-semibold leading-tight">{t.label}</p>
            <p className="m-0 mt-1 text-[22px] font-extrabold leading-none tabular-nums">{t.value}</p>
            <p className="m-0 mt-1 text-[12px] text-ink-2">{t.sub}</p>
            {t.change && (
              <p
                className={`m-0 mt-1.5 text-[12px] font-semibold ${
                  !t.tone ? 'text-ink-2' : t.tone === 'good' ? 'text-good' : 'text-bad'
                }`}
              >
                {t.change} <span className="text-ink-2 font-normal">{compare}</span>
              </p>
            )}
          </div>
        ))}
      </section>
      <SecondRow current={current} previous={previous} />
    </>
  )
}

function SecondRow({ current, previous }: { current: ReportTotals; previous: ReportTotals }) {
  const { money: fmt } = useMoney()
  const items: { label: string; value: string; hint?: string }[] = []
  if (current.visits || previous.visits) {
    items.push({ label: 'Client visits logged', value: String(current.visits), hint: changeLabel(current.visits, previous.visits) })
  }
  if (current.shrinkCents || previous.shrinkCents) {
    items.push({
      label: 'Lost to corrections',
      value: fmt(current.shrinkCents),
      hint: `${current.corrections} ${current.corrections === 1 ? 'correction' : 'corrections'}`,
    })
  }
  if (current.expensesCents || previous.expensesCents) {
    items.push({ label: 'Other spending', value: fmt(current.expensesCents), hint: 'bills and expenses' })
  }
  if (!items.length) return null
  return (
    <section className="flex flex-wrap gap-2">
      {items.map((i) => (
        <div key={i.label} className="bg-surface rounded-xl px-3 py-2 flex-1 min-w-[150px]">
          <p className="m-0 text-[12px] text-ink-2 font-semibold">{i.label}</p>
          <p className="m-0 text-[16px] font-bold tabular-nums">
            {i.value} {i.hint && <span className="text-[12px] text-ink-2 font-normal">· {i.hint}</span>}
          </p>
        </div>
      ))}
    </section>
  )
}

/**
 * Sales per bar with the cost of product used behind them, so a heavy service week
 * next to a thin sales week is obvious. Bars are flex children, not fixed widths, so
 * the chart fits a phone and a wide screen without a second layout.
 */
function SalesChart({ report }: { report: Report }) {
  const { money: fmt, short: fmtShort } = useMoney()
  const [hover, setHover] = useState<number | null>(null)
  const strip = useRef<HTMLDivElement>(null)
  const H = 150
  const max = Math.max(1, ...report.buckets.map((b) => Math.max(b.soldCents, b.usedCents)))
  const any = report.buckets.some((b) => b.soldCents + b.usedCents + b.receivedCents > 0)
  const shown = hover === null ? null : report.buckets[hover]

  return (
    <section className="bg-white border border-line rounded-2xl px-3 pt-3 pb-2 lg:px-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <h3 className="m-0 text-[15px] font-bold">Over time</h3>
          <p className="m-0 text-[12px] text-ink-2">
            {shown ? (
              <>
                <span className="font-semibold text-ink">{shown.label}</span> · {fmt(shown.soldCents)} sold ·{' '}
                {fmt(shown.usedCents)} used
              </>
            ) : (
              `Tap a bar for that ${BAR_IS[report.period]}`
            )}
          </p>
        </div>
        <div className="flex gap-3 text-[12px] text-ink-2 shrink-0" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-action" /> Sold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-action/30" /> Used
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-[3px] rounded-sm bg-gold" /> Received
          </span>
        </div>
      </div>

      {!any ? (
        <p className="text-sm text-ink-2 my-10 text-center">Nothing sold, used or received yet in this period.</p>
      ) : (
        <>
          <div ref={strip} className="flex items-end gap-[3px]" style={{ height: H + 20 }}>
            {report.buckets.map((b, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${b.label}: ${fmt(b.soldCents)} sold, ${fmt(b.usedCents)} used`}
                className="relative flex-1 h-full min-w-0 flex flex-col justify-end items-center bg-transparent border-0 p-0 cursor-pointer"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
              >
                <span className="w-full flex items-end justify-center gap-[2px]" style={{ height: H }}>
                  <span
                    className={`flex-1 max-w-[14px] rounded-t-[3px] bg-action ${hover === i ? '' : 'opacity-90'}`}
                    style={{ height: Math.max(b.soldCents > 0 ? 2 : 0, Math.round((b.soldCents / max) * H)) }}
                  />
                  <span
                    className="flex-1 max-w-[14px] rounded-t-[3px] bg-action/30"
                    style={{ height: Math.max(b.usedCents > 0 ? 2 : 0, Math.round((b.usedCents / max) * H)) }}
                  />
                </span>
                {b.receivedCents > 0 && <span className="absolute left-1/2 -translate-x-1/2 w-3 h-[3px] rounded-sm bg-gold" style={{ bottom: 18 }} />}
                {/* A month has 31 bars on a phone, so the tick sits in its own
                    row below, free to spill over its bar's width. */}
                <span className="h-[18px]" />
              </button>
            ))}
          </div>
          <div className="flex gap-[3px] -mt-[18px] pointer-events-none" aria-hidden="true">
            {report.buckets.map((b, i) => (
              <span key={i} className="flex-1 min-w-0 h-[18px] leading-[18px] text-[10px] text-ink-2 text-center whitespace-nowrap overflow-visible">
                {b.label}
              </span>
            ))}
          </div>
          <p className="m-0 mt-1 text-[11px] text-ink-2 text-center">
            Tallest bar {fmtShort(max)} · sales at your shelf price, use at what it cost you
          </p>
        </>
      )}
    </section>
  )
}

/** One breakdown: a labelled bar per row, longest first. */
function Breakdown({
  title,
  rows,
  empty,
  icon,
  note,
}: {
  title: string
  rows: ReportSlice[]
  empty: string
  icon?: React.ReactNode
  note?: string
}) {
  const { money: fmt } = useMoney()
  if (!rows.length) {
    if (!empty) return null
    return (
      <section className="bg-white border border-line rounded-2xl p-4">
        <h3 className="m-0 text-[15px] font-bold mb-1 flex items-center gap-2">
          {icon} {title}
        </h3>
        <p className="m-0 text-sm text-ink-2">{empty}</p>
      </section>
    )
  }
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <h3 className="m-0 text-[15px] font-bold mb-3 flex items-center gap-2">
        {icon} {title}
      </h3>
      <ul className="list-none p-0 m-0 grid gap-2.5">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-[13px] font-semibold truncate">{r.label}</span>
              <span className="text-[13px] tabular-nums shrink-0">
                {fmt(r.cents)}
                <span className="text-ink-2 font-normal"> · {Math.round(r.share * 100)}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full bg-action" style={{ width: `${Math.max(2, Math.round(r.share * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {note && <p className="m-0 mt-3 text-[12px] text-ink-2">{note}</p>}
    </section>
  )
}

function TopItems({ title, rows, kind }: { title: string; rows: Report['topSold']; kind: 'sold' | 'used' }) {
  const { money: fmt } = useMoney()
  if (!rows.length) return null
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <h3 className="m-0 text-[15px] font-bold mb-3 flex items-center gap-2">
        {kind === 'sold' ? <ShoppingBag size={15} /> : <Sparkles size={15} />} {title}
      </h3>
      <ul className="list-none p-0 m-0 grid gap-2">
        {rows.map((i, n) => (
          <li key={i.productId} className="flex items-center gap-3">
            <span className="w-5 text-[12px] text-ink-2 font-bold tabular-nums shrink-0">{n + 1}</span>
            <Thumb imageUrl={i.imageUrl} label={i.name} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold truncate">{i.name}</span>
              <span className="block text-[12px] text-ink-2 truncate">
                {i.brand ? `${i.brand} · ` : ''}
                {i.units} {kind === 'sold' ? (i.units === 1 ? 'sold' : 'sold') : 'used'}
              </span>
            </span>
            <span className="text-right shrink-0">
              <span className="block text-[14px] font-bold tabular-nums">{fmt(i.cents)}</span>
              {kind === 'sold' && i.profitCents !== 0 && (
                <span className="block text-[12px] text-ink-2 tabular-nums">{fmt(i.profitCents)} profit</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** What the trade actually did: the practices ticked on client records. */
function Services({ report, whoLabel }: { report: Report; whoLabel: string }) {
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <h3 className="m-0 text-[15px] font-bold mb-1">Services logged</h3>
      <p className="m-0 text-[12px] text-ink-2 mb-3">
        From client records — what each {whoLabel} ticked on a visit. Counts, not money.
      </p>
      <ul className="list-none p-0 m-0 flex flex-wrap gap-2">
        {report.byService.map((s) => (
          <li key={s.key} className="bg-surface rounded-full px-3 py-1.5 text-[13px] font-semibold">
            {s.label} <span className="text-ink-2 font-normal">· {s.units}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** What these numbers can't see, so nobody trusts them further than they go. */
function Gaps({ report }: { report: Report }) {
  const { gaps } = report
  const lines: string[] = []
  if (gaps.unpricedSoldUnits > 0) {
    const one = gaps.unpricedSoldUnits === 1
    lines.push(
      `${gaps.unpricedSoldUnits} ${one ? 'item' : 'items'} sold with no retail price saved, so ${one ? 'it is' : 'they are'} missing from sales. Add a price on the product.`,
    )
  }
  if (gaps.noCostProducts > 0) {
    const one = gaps.noCostProducts === 1
    lines.push(
      `${gaps.noCostProducts} ${one ? 'product' : 'products'} that sold ${one ? 'has' : 'have'} no cost saved, so profit on ${one ? 'it' : 'them'} reads high. Products → Missing costs fills ${one ? 'it' : 'them'} in.`,
    )
  }
  if (gaps.pricesAreShelfPrices) {
    lines.push('Sales are counted at your shelf price, so a discount given at checkout is not taken off.')
  }
  lines.push('Only what Bintro has a record of is here: scans, Square sales, uploaded sales reports, deliveries and counts.')
  return (
    <section className="bg-gold-tint border border-line rounded-2xl p-4">
      <h3 className="m-0 text-[14px] font-bold mb-2">How to read these numbers</h3>
      <ul className="list-disc pl-5 m-0 grid gap-1.5 text-[13px] text-ink-2">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  )
}
