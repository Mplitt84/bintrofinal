import { describe, expect, it } from 'vitest'
import { overviewWindows } from './overview.js'
import { buildReport, marginOf, profitOf, reasonOf, reportCsvRows } from './reports.js'
import type { ReportInput, ReportMovement, ReportProduct } from './reports.js'

const shampoo: ReportProduct = {
  id: 1,
  name: 'Curl Cream',
  brand: 'The Doux',
  category: 'Retail',
  vendor: 'SalonCentric',
  imageUrl: '',
  unitCostCents: 1000,
  retailPriceCents: 2800,
  kind: 'sold',
}
const color: ReportProduct = {
  id: 2,
  name: 'Developer 20 vol',
  brand: 'Alfaparf',
  category: 'Color',
  vendor: 'CosmoProf',
  imageUrl: '',
  unitCostCents: 1500,
  retailPriceCents: 0,
  kind: 'used',
}
const unpriced: ReportProduct = { ...shampoo, id: 3, name: 'Edge Gel', retailPriceCents: 0, unitCostCents: 0 }

const noon = (iso: string) => new Date(`${iso}T12:00:00`)

function input(movements: ReportMovement[], extra: Partial<ReportInput> = {}): ReportInput {
  const now = noon('2026-03-12')
  return {
    period: 'month',
    window: overviewWindows('month', now),
    products: [shampoo, color, unpriced],
    movements,
    expenses: [],
    visits: [],
    ...extra,
  }
}

const sale = (at: Date, units = 1, productId = 1): ReportMovement => ({
  productId,
  type: 'out',
  delta: -units,
  staffName: 'Minnie',
  note: '',
  at,
})

describe('buildReport totals', () => {
  it('prices sales at the shelf price and keeps the cost beside it', () => {
    const r = buildReport(input([sale(noon('2026-03-05'), 2)]))
    expect(r.current.soldUnits).toBe(2)
    expect(r.current.soldCents).toBe(5600)
    expect(r.current.soldCostCents).toBe(2000)
    expect(profitOf(r.current)).toBe(3600)
    expect(marginOf(r.current)).toBe(64)
  })

  it('counts product used on clients as cost, never as a sale', () => {
    const r = buildReport(input([sale(noon('2026-03-05'), 3, 2)]))
    expect(r.current.soldUnits).toBe(0)
    expect(r.current.soldCents).toBe(0)
    expect(r.current.usedUnits).toBe(3)
    expect(r.current.usedCents).toBe(4500)
    expect(marginOf(r.current)).toBeNull()
  })

  it('splits the period from the same stretch of the one before', () => {
    const r = buildReport(input([sale(noon('2026-03-04'), 1), sale(noon('2026-02-04'), 2)]))
    expect(r.current.soldUnits).toBe(1)
    expect(r.previous.soldUnits).toBe(2)
  })

  it('leaves out movements outside both windows', () => {
    const r = buildReport(input([sale(noon('2025-11-04'), 5)]))
    expect(r.current.soldUnits).toBe(0)
    expect(r.previous.soldUnits).toBe(0)
  })

  it('counts stock in as received at cost, by supplier', () => {
    const r = buildReport(
      input([{ productId: 1, type: 'receive', delta: 6, staffName: 'Marsherrie', note: '', at: noon('2026-03-06') }]),
    )
    expect(r.current.receivedUnits).toBe(6)
    expect(r.current.receivedCents).toBe(6000)
    expect(r.byVendor[0]).toMatchObject({ label: 'SalonCentric', units: 6, cents: 6000 })
  })

  it('values what count corrections took off the shelf, by reason', () => {
    const r = buildReport(
      input([
        { productId: 1, type: 'adjust', delta: -2, staffName: 'Minnie', note: 'Count #7 · Damaged', at: noon('2026-03-07') },
        { productId: 1, type: 'adjust', delta: 1, staffName: 'Minnie', note: 'Count #7', at: noon('2026-03-07') },
      ]),
    )
    expect(r.current.corrections).toBe(2)
    expect(r.current.shrinkCents).toBe(2000)
    expect(r.byReason[0]).toMatchObject({ label: 'Damaged', units: 2, cents: 2000 })
  })
})

describe('buildReport breakdowns', () => {
  it('ranks sellers by money and splits sales by category and team member', () => {
    const r = buildReport(
      input([
        sale(noon('2026-03-02'), 1),
        sale(noon('2026-03-03'), 4),
        { ...sale(noon('2026-03-04'), 2, 3), staffName: 'Marsherrie' },
      ]),
    )
    expect(r.topSold[0]).toMatchObject({ name: 'Curl Cream', units: 5, cents: 14_000, profitCents: 9000 })
    expect(r.byCategory.map((s) => s.label)).toEqual(['Retail'])
    expect(r.byStaff.map((s) => s.label)).toEqual(['Minnie', 'Marsherrie'])
    expect(r.byStaff[0].share).toBeCloseTo(1, 5)
  })

  it('shares add up to one, with the tail rolled into one row', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...shampoo,
      id: 100 + i,
      name: `Item ${i}`,
      category: `Cat ${i}`,
    }))
    const r = buildReport(
      input(
        many.map((p, i) => sale(noon('2026-03-02'), i + 1, p.id)),
        { products: many },
      ),
    )
    expect(r.byCategory).toHaveLength(9)
    expect(r.byCategory.at(-1)!.label).toBe('4 more')
    expect(r.byCategory.reduce((n, s) => n + s.share, 0)).toBeCloseTo(1, 5)
  })

  it('notes sold units with no price and products with no cost', () => {
    const r = buildReport(input([sale(noon('2026-03-02'), 3, 3)]))
    expect(r.current.soldUnpricedUnits).toBe(3)
    expect(r.gaps.unpricedSoldUnits).toBe(3)
    expect(r.gaps.noCostProducts).toBe(1)
  })

  it('counts client visits and ranks the practices on them', () => {
    const r = buildReport(
      input([], {
        visits: [
          { at: noon('2026-03-02'), service: 'Facial', tags: ['Hydrofacial', 'Extractions'], staffName: 'Minnie' },
          { at: noon('2026-03-03'), service: 'Facial', tags: ['Hydrofacial'], staffName: 'Minnie' },
          { at: noon('2026-02-03'), service: 'Facial', tags: ['Hydrofacial'], staffName: 'Minnie' },
        ],
      }),
    )
    expect(r.current.visits).toBe(2)
    expect(r.previous.visits).toBe(1)
    expect(r.byService[0]).toMatchObject({ label: 'Hydrofacial', units: 2 })
    expect(r.byService[0].share).toBeCloseTo(2 / 3, 5)
  })

  it('falls back to the service name when no practices are ticked', () => {
    const r = buildReport(input([], { visits: [{ at: noon('2026-03-02'), service: 'Balayage', tags: [], staffName: 'Minnie' }] }))
    expect(r.byService.map((s) => s.label)).toEqual(['Balayage'])
  })
})

describe('buildReport chart buckets', () => {
  it('drops each sale in its own day of the month', () => {
    const r = buildReport(input([sale(noon('2026-03-01'), 1), sale(noon('2026-03-03'), 2)]))
    expect(r.buckets[0].soldUnits).toBe(1)
    expect(r.buckets[2].soldUnits).toBe(2)
    expect(r.buckets[1].soldUnits).toBe(0)
    expect(r.buckets[2].profitCents).toBe(3600)
  })

  it('gives the year twelve bars and compares with last year', () => {
    const w = overviewWindows('year', noon('2026-03-12'))
    expect(w.labels).toHaveLength(12)
    expect(w.start.getMonth()).toBe(0)
    expect(w.start.getDate()).toBe(1)
    expect(w.prevStart.getFullYear()).toBe(2025)
    const r = buildReport(
      input([sale(noon('2026-02-10'), 1), sale(noon('2025-02-10'), 4)], { period: 'year', window: w }),
    )
    expect(r.buckets[1].soldUnits).toBe(1)
    expect(r.current.soldUnits).toBe(1)
    expect(r.previous.soldUnits).toBe(4)
  })
})

describe('reasonOf', () => {
  it('reads the reason off a count note, or says none was given', () => {
    expect(reasonOf('Count #12 · Damaged')).toBe('Damaged')
    expect(reasonOf('Count #12')).toBe('No reason given')
  })
})

describe('reportCsvRows', () => {
  it('writes the totals and every breakdown as dollars', () => {
    const r = buildReport(input([sale(noon('2026-03-05'), 2)]))
    const rows = reportCsvRows(r, 'March 2026')
    expect(rows[0]).toEqual(['Section', 'Name', 'Units', 'Amount'])
    expect(rows).toContainEqual(['Totals', 'Retail sold', 2, '56.00'])
    expect(rows).toContainEqual(['Totals', 'Gross profit on retail', '', '36.00'])
    expect(rows.some((row) => row[0] === 'Top sellers' && row[1] === 'The Doux Curl Cream')).toBe(true)
  })
})

describe('CSV bucket names', () => {
  it('writes a real date on every row, not the chart tick', () => {
    const r = buildReport(input([sale(noon('2026-03-05'), 1)]))
    const overTime = reportCsvRows(r, 'March 2026').filter((row) => row[0] === 'Over time')
    expect(overTime).toHaveLength(31)
    expect(overTime[0][1]).toBe('2026-03-01')
    expect(overTime[4][1]).toBe('2026-03-05')
    expect(overTime[4][3]).toBe('28.00')
  })

  it('names the year by month and the day by hour', () => {
    const year = buildReport(input([], { period: 'year', window: overviewWindows('year', noon('2026-03-12')) }))
    expect(reportCsvRows(year, '2026').find((row) => row[0] === 'Over time')![1]).toBe('2026-01')
    const today = buildReport(input([], { period: 'today', window: overviewWindows('today', noon('2026-03-12')) }))
    expect(reportCsvRows(today, 'today').find((row) => row[0] === 'Over time')![1]).toBe('2026-03-12 00:00')
  })
})
