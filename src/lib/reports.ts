/**
 * The Reports screen's arithmetic (client-safe, pure, tested).
 *
 * `reports.server.ts` only fetches rows and hands them to `buildReport`, so every
 * number on the screen has one home, the way `profitRowsFor` does for Profit.
 *
 * Only Bintro's own records go in: units scanned out, in or corrected, priced with
 * the product's current cost and retail. Nothing is estimated. A checkout discount
 * in Square isn't known here, so sales are "what the shelf price says it sold for" —
 * `ReportGaps` carries what the numbers are missing so the screen can say so.
 */
import type { OverviewPeriod } from './overview.js'

export type ReportPeriod = OverviewPeriod

/** A movement, as the report needs it. */
export type ReportMovement = {
  productId: number
  type: string
  delta: number
  staffName: string
  note: string
  at: Date
}

/** A product, as the report needs it. */
export type ReportProduct = {
  id: number
  name: string
  brand: string
  category: string
  vendor: string
  imageUrl: string
  unitCostCents: number
  retailPriceCents: number
  /** Whether scanning this out is a sale or product used on a client. */
  kind: 'sold' | 'used'
}

/** One expense row (Premium; empty for everyone else). */
export type ReportExpense = { category: string; vendor: string; amountCents: number; at: Date }

/** A client visit, for the trades that keep client records. */
export type ReportVisit = { at: Date; service: string; tags: string[]; staffName: string }

export type ReportTotals = {
  /** Units of "sold" products scanned out, and what the shelf price makes that. */
  soldUnits: number
  soldCents: number
  /** What those units cost the business, so profit is honest. */
  soldCostCents: number
  /** Sold units with no retail price saved, so they are missing from soldCents. */
  soldUnpricedUnits: number
  /** Product used on clients: units and cost. */
  usedUnits: number
  usedCents: number
  /** Stock that came in: units and cost. */
  receivedUnits: number
  receivedCents: number
  /** Count corrections: how many, and the value of what went missing. */
  corrections: number
  shrinkCents: number
  /** Expenses outside stock (Premium). */
  expensesCents: number
  /** Client visits logged, for trades that keep records. */
  visits: number
}

export type ReportBucket = {
  /** Short tick label for the chart; blank on buckets between ticks. */
  label: string
  /** When the bucket starts, so a spreadsheet row can carry a real date. */
  startIso: string
  soldCents: number
  soldUnits: number
  usedCents: number
  receivedCents: number
  profitCents: number
}

/** One row of a breakdown (by category, team member, vendor, reason…). */
export type ReportSlice = {
  key: string
  label: string
  units: number
  cents: number
  /** Share of this breakdown's total, 0–1. */
  share: number
}

export type ReportItem = {
  productId: number
  name: string
  brand: string
  imageUrl: string
  units: number
  cents: number
  /** Profit on what sold, for sold items; 0 for product used on clients. */
  profitCents: number
}

/** What the report can't see, said plainly so nobody trusts a number too far. */
export type ReportGaps = {
  /** Sold units with no retail price: missing from sales. */
  unpricedSoldUnits: number
  /** Products that sold with no cost saved: missing from profit. */
  noCostProducts: number
  /** True when Square or a sales report is the only place discounts live. */
  pricesAreShelfPrices: boolean
}

export type Report = {
  period: ReportPeriod
  current: ReportTotals
  previous: ReportTotals
  buckets: ReportBucket[]
  topSold: ReportItem[]
  topUsed: ReportItem[]
  byCategory: ReportSlice[]
  byStaff: ReportSlice[]
  byVendor: ReportSlice[]
  byReason: ReportSlice[]
  byService: ReportSlice[]
  gaps: ReportGaps
}

export type ReportWindow = {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  edges: Date[]
  labels: string[]
}

export type ReportInput = {
  period: ReportPeriod
  window: ReportWindow
  movements: ReportMovement[]
  products: ReportProduct[]
  expenses: ReportExpense[]
  visits: ReportVisit[]
}

const TOP = 8

function emptyTotals(): ReportTotals {
  return {
    soldUnits: 0,
    soldCents: 0,
    soldCostCents: 0,
    soldUnpricedUnits: 0,
    usedUnits: 0,
    usedCents: 0,
    receivedUnits: 0,
    receivedCents: 0,
    corrections: 0,
    shrinkCents: 0,
    expensesCents: 0,
    visits: 0,
  }
}

/** Gross profit on what sold: shelf price less what it cost. */
export function profitOf(t: ReportTotals) {
  return t.soldCents - t.soldCostCents
}

/** Kept margin as a percentage of sales, or null when nothing sold. */
export function marginOf(t: ReportTotals) {
  if (t.soldCents <= 0) return null
  return Math.round((profitOf(t) / t.soldCents) * 100)
}

/** Which bucket a moment falls in, or -1 when it is outside the chart. */
function bucketFor(edges: Date[], at: number) {
  for (let i = 0; i < edges.length - 1; i++) {
    if (at >= edges[i].getTime() && at < edges[i + 1].getTime()) return i
  }
  return -1
}

/** The reason written on a count correction, from its note (`Count #12 · Damaged`). */
export function reasonOf(note: string) {
  const after = note.split('·')[1]
  return (after ?? '').trim() || 'No reason given'
}

function slices(totals: Map<string, { label: string; units: number; cents: number }>, limit = TOP): ReportSlice[] {
  const rows = [...totals.entries()].map(([key, v]) => ({ key, ...v, share: 0 }))
  const sum = rows.reduce((n, r) => n + Math.abs(r.cents), 0)
  rows.sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents) || b.units - a.units)
  const kept = rows.slice(0, limit)
  const rest = rows.slice(limit)
  if (rest.length) {
    kept.push({
      key: '__rest',
      label: `${rest.length} more`,
      units: rest.reduce((n, r) => n + r.units, 0),
      cents: rest.reduce((n, r) => n + r.cents, 0),
      share: 0,
    })
  }
  return kept.map((r) => ({ ...r, share: sum > 0 ? Math.abs(r.cents) / sum : 0 }))
}

function add(
  map: Map<string, { label: string; units: number; cents: number }>,
  key: string,
  label: string,
  units: number,
  cents: number,
) {
  const row = map.get(key) ?? { label, units: 0, cents: 0 }
  row.units += units
  row.cents += cents
  map.set(key, row)
}

/**
 * Everything the Reports screen shows, from the rows it was given. Movements
 * outside both windows are ignored, so the caller can fetch one span and let this
 * split it into "this period" and "the same stretch of the one before".
 */
export function buildReport(input: ReportInput): Report {
  const { window: w, movements, products, expenses, visits } = input
  const byId = new Map(products.map((p) => [p.id, p]))
  const current = emptyTotals()
  const previous = emptyTotals()
  const buckets: ReportBucket[] = w.labels.map((label, i) => ({
    label,
    startIso: (w.edges[i] ?? w.start).toISOString(),
    soldCents: 0,
    soldUnits: 0,
    usedCents: 0,
    receivedCents: 0,
    profitCents: 0,
  }))

  const categories = new Map<string, { label: string; units: number; cents: number }>()
  const staff = new Map<string, { label: string; units: number; cents: number }>()
  const vendors = new Map<string, { label: string; units: number; cents: number }>()
  const reasons = new Map<string, { label: string; units: number; cents: number }>()
  const services = new Map<string, { label: string; units: number; cents: number }>()
  const sold = new Map<number, ReportItem>()
  const used = new Map<number, ReportItem>()
  const noCost = new Set<number>()

  const inCurrent = (at: number) => at >= w.start.getTime() && at < w.end.getTime()
  const inPrevious = (at: number) => at >= w.prevStart.getTime() && at < w.prevEnd.getTime()

  for (const m of movements) {
    const p = byId.get(m.productId)
    if (!p) continue
    const at = m.at.getTime()
    const now = inCurrent(at)
    if (!now && !inPrevious(at)) continue
    const totals = now ? current : previous
    const bucket = now ? buckets[bucketFor(w.edges, at)] : undefined

    if (m.type === 'out' && m.delta < 0) {
      const units = -m.delta
      if (p.kind === 'sold') {
        const cents = units * p.retailPriceCents
        const cost = units * p.unitCostCents
        totals.soldUnits += units
        totals.soldCents += cents
        totals.soldCostCents += cost
        if (p.retailPriceCents <= 0) totals.soldUnpricedUnits += units
        if (bucket) {
          bucket.soldCents += cents
          bucket.soldUnits += units
          bucket.profitCents += cents - cost
        }
        if (now) {
          if (p.unitCostCents <= 0) noCost.add(p.id)
          add(categories, p.category || 'No category', p.category || 'No category', units, cents)
          const who = m.staffName.trim() || 'Not recorded'
          add(staff, who, who, units, cents)
          const item = sold.get(p.id) ?? { productId: p.id, name: p.name, brand: p.brand, imageUrl: p.imageUrl, units: 0, cents: 0, profitCents: 0 }
          item.units += units
          item.cents += cents
          item.profitCents += cents - cost
          sold.set(p.id, item)
        }
      } else {
        const cost = units * p.unitCostCents
        totals.usedUnits += units
        totals.usedCents += cost
        if (bucket) bucket.usedCents += cost
        if (now) {
          const item = used.get(p.id) ?? { productId: p.id, name: p.name, brand: p.brand, imageUrl: p.imageUrl, units: 0, cents: 0, profitCents: 0 }
          item.units += units
          item.cents += cost
          used.set(p.id, item)
        }
      }
      continue
    }

    if ((m.type === 'in' || m.type === 'receive') && m.delta > 0) {
      const cost = m.delta * p.unitCostCents
      totals.receivedUnits += m.delta
      totals.receivedCents += cost
      if (bucket) bucket.receivedCents += cost
      if (now) add(vendors, p.vendor || 'No supplier', p.vendor || 'No supplier', m.delta, cost)
      continue
    }

    if (m.type === 'adjust') {
      totals.corrections += 1
      if (m.delta < 0) {
        const lost = -m.delta * p.unitCostCents
        totals.shrinkCents += lost
        if (now) add(reasons, reasonOf(m.note), reasonOf(m.note), -m.delta, lost)
      }
    }
  }

  for (const e of expenses) {
    const at = e.at.getTime()
    if (inCurrent(at)) current.expensesCents += e.amountCents
    else if (inPrevious(at)) previous.expensesCents += e.amountCents
  }

  for (const v of visits) {
    const at = v.at.getTime()
    const now = inCurrent(at)
    if (!now && !inPrevious(at)) continue
    ;(now ? current : previous).visits += 1
    if (!now) continue
    const named = v.tags.length ? v.tags : v.service.trim() ? [v.service.trim()] : []
    for (const tag of named) add(services, tag.toLowerCase(), tag, 1, 0)
  }

  const rank = (m: Map<number, ReportItem>, by: 'cents' | 'units' = 'cents') =>
    [...m.values()].sort((a, b) => b[by] - a[by] || b.units - a.units).slice(0, TOP)

  // Services are counted, not priced, so they rank by how often they came up.
  const serviceRows = [...services.entries()]
    .map(([key, v]) => ({ key, ...v, share: 0 }))
    .sort((a, b) => b.units - a.units)
    .slice(0, TOP)
  const serviceTotal = serviceRows.reduce((n, r) => n + r.units, 0)

  return {
    period: input.period,
    current,
    previous,
    buckets,
    topSold: rank(sold),
    topUsed: rank(used),
    byCategory: slices(categories),
    byStaff: slices(staff),
    byVendor: slices(vendors),
    byReason: slices(reasons, 6),
    byService: serviceRows.map((r) => ({ ...r, share: serviceTotal > 0 ? r.units / serviceTotal : 0 })),
    gaps: {
      unpricedSoldUnits: current.soldUnpricedUnits,
      noCostProducts: noCost.size,
      pricesAreShelfPrices: current.soldUnits > 0,
    },
  }
}

/**
 * A bucket's name in a spreadsheet: a real date, because the chart's tick labels are
 * blank between ticks and "15" on its own means nothing in a file.
 */
function bucketName(b: ReportBucket, period: ReportPeriod) {
  const d = new Date(b.startIso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (period === 'today') return `${date} ${String(d.getHours()).padStart(2, '0')}:00`
  if (period === 'year') return date.slice(0, 7)
  return date
}

/** The report as spreadsheet rows, for the Download button. */
export function reportCsvRows(r: Report, periodLabel: string): (string | number)[][] {
  const money = (cents: number) => (cents / 100).toFixed(2)
  const rows: (string | number)[][] = [
    ['Section', 'Name', 'Units', 'Amount'],
    ['Period', periodLabel, '', ''],
    ['Totals', 'Retail sold', r.current.soldUnits, money(r.current.soldCents)],
    ['Totals', 'Cost of what sold', '', money(r.current.soldCostCents)],
    ['Totals', 'Gross profit on retail', '', money(profitOf(r.current))],
    ['Totals', 'Product used on clients', r.current.usedUnits, money(r.current.usedCents)],
    ['Totals', 'Stock received', r.current.receivedUnits, money(r.current.receivedCents)],
    ['Totals', 'Lost to corrections', r.current.corrections, money(r.current.shrinkCents)],
    ['Totals', 'Other spending', '', money(r.current.expensesCents)],
  ]
  if (r.current.visits) rows.push(['Totals', 'Client visits logged', r.current.visits, ''])
  for (const b of r.buckets) rows.push(['Over time', bucketName(b, r.period), b.soldUnits, money(b.soldCents)])
  for (const s of r.byCategory) rows.push(['Sales by category', s.label, s.units, money(s.cents)])
  for (const s of r.byStaff) rows.push(['Sales by team member', s.label, s.units, money(s.cents)])
  for (const i of r.topSold) rows.push(['Top sellers', `${i.brand} ${i.name}`.trim(), i.units, money(i.cents)])
  for (const i of r.topUsed) rows.push(['Most used on clients', `${i.brand} ${i.name}`.trim(), i.units, money(i.cents)])
  for (const s of r.byVendor) rows.push(['Stock received by supplier', s.label, s.units, money(s.cents)])
  for (const s of r.byReason) rows.push(['Lost by reason', s.label, s.units, money(s.cents)])
  for (const s of r.byService) rows.push(['Services logged', s.label, s.units, ''])
  return rows
}
