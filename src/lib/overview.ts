/** Scan page "at a glance" overview (client-safe). */
export type OverviewPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year'

export const OVERVIEW_PERIODS: { id: OverviewPeriod; label: string; compare: string }[] = [
  { id: 'today', label: 'Today', compare: 'vs. yesterday' },
  { id: 'week', label: 'Week', compare: 'vs. last week' },
  { id: 'month', label: 'Month', compare: 'vs. last month' },
  { id: 'quarter', label: 'Quarter', compare: 'vs. last quarter' },
  { id: 'year', label: 'Year', compare: 'vs. last year' },
]

/** The periods the Scan tab's "At a glance" offers; Reports adds the year. */
export const GLANCE_PERIODS = OVERVIEW_PERIODS.filter((p) => p.id !== 'year')

export type OverviewTotals = {
  soldUnits: number
  /** Retail value of what sold (retail price × units). */
  soldCents: number
  /** Sold units with no retail price, so not in soldCents. */
  soldUnpriced: number
  usedUnits: number
  /** Cost of product used in services. */
  usedCents: number
  receivedUnits: number
  receivedCents: number
  /** Count corrections (adjust movements): how many, and their net effect. */
  counts: number
  countNetUnits: number
  countNetCents: number
}

export type OverviewBucket = { label: string; soldUnits: number; usedUnits: number; receivedUnits: number; soldCents: number; usedCents: number }

export type OverviewTopItem = {
  productId: number
  name: string
  brand: string
  imageUrl: string
  kind: 'sold' | 'used'
  units: number
  cents: number
}

export type Overview = {
  current: OverviewTotals
  previous: OverviewTotals
  buckets: OverviewBucket[]
  top: OverviewTopItem[]
  /** Product ids whose "out" scans are sales (retail), so Recent can label them. */
  soldIds: number[]
}

/** Local-time windows for a period: [start, now) and the same stretch of the period before. */
export function overviewWindows(period: OverviewPeriod, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  let prevStart: Date
  const edges: Date[] = []
  const labels: string[] = []
  if (period === 'today') {
    prevStart = new Date(start)
    prevStart.setDate(prevStart.getDate() - 1)
    // Business hours, 7am–9pm, in 2-hour bars.
    for (let h = 7; h <= 21; h += 2) {
      const d = new Date(start)
      d.setHours(h)
      edges.push(d)
      if (h < 21) labels.push(h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`)
    }
    edges[0] = new Date(start)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    edges[edges.length - 1] = end
  } else if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)) // Monday
    prevStart = new Date(start)
    prevStart.setDate(prevStart.getDate() - 7)
    for (let i = 0; i <= 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      edges.push(d)
      if (i < 7) labels.push(['M', 'T', 'W', 'T', 'F', 'S', 'S'][i])
    }
  } else if (period === 'month') {
    start.setDate(1)
    prevStart = new Date(start)
    prevStart.setMonth(prevStart.getMonth() - 1)
    const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    for (let i = 0; i <= days; i++) {
      const d = new Date(start)
      d.setDate(1 + i)
      edges.push(d)
      if (i < days) labels.push(i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '')
    }
  } else if (period === 'year') {
    start.setMonth(0, 1)
    prevStart = new Date(start)
    prevStart.setFullYear(prevStart.getFullYear() - 1)
    // One bar a month, January to December.
    for (let i = 0; i <= 12; i++) {
      const d = new Date(start)
      d.setMonth(i, 1)
      edges.push(d)
      if (i < 12) labels.push('JFMAMJJASOND'[i])
    }
  } else {
    start.setDate(1)
    start.setMonth(Math.floor(start.getMonth() / 3) * 3)
    prevStart = new Date(start)
    prevStart.setMonth(prevStart.getMonth() - 3)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 3)
    // Weekly bars across the quarter.
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 7)) {
      edges.push(new Date(d))
      labels.push(d.getDate() <= 7 ? d.toLocaleString('en-US', { month: 'short' }) : '')
    }
    edges.push(end)
  }
  // Compare like with like: the previous period up to the same point in it.
  const prevEnd = new Date(prevStart.getTime() + (now.getTime() - start.getTime()))
  return { start, end: now, prevStart, prevEnd, edges, labels }
}

/** "+12%" / "−8%" / "new" / "" for a change between periods. */
export function changeLabel(now: number, before: number) {
  if (before === 0) return now > 0 ? 'new' : ''
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return 'same'
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`
}

export type MovementKind = 'sold' | 'used' | 'square' | 'received' | 'count' | 'other'

/** What a movement really was, for labels in Recent. */
export function movementKind(m: { type: string; delta: number; staffName: string; productId: number }, soldIds: Set<number>): MovementKind {
  if (m.type === 'adjust') return 'count'
  if (m.type === 'in' || m.type === 'receive') return m.delta >= 0 ? 'received' : 'other'
  if (m.type === 'out') {
    if (m.staffName === 'Square POS') return 'square'
    return soldIds.has(m.productId) ? 'sold' : 'used'
  }
  return 'other'
}
