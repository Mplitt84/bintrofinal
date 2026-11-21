import { parseSize } from './categorize'

/**
 * Color bar (SalonScale-style) and service costs: the arithmetic, pure and tested.
 * Grams come from the product's size: weights convert exactly; volumes (oz, ml) are read
 * as about 1 g per ml, which is close for color cream and developer and is said on screen.
 */

export type BowlLine = { productId: number | null; name: string; grams: number; costCents: number }
export type Bowl = {
  id: number
  dayKey: string
  clientName: string
  serviceId: number | null
  serviceName: string
  staffName: string
  lines: BowlLine[]
  leftoverGrams: number
  costCents: number
  chargedCents: number
  note: string
}
export type Service = {
  id: number
  name: string
  priceCents: number
  minutes: number
  /** What the owner expects product to cost per visit, used until bowls exist. */
  productCents: number
  active: boolean
}

type Costed = { unitCostCents: number; size: string; name: string }

/** Grams in one unit of the product, or null when the size can't be read as grams. */
export function gramsPerUnit(p: { size: string; name: string }): number | null {
  const s = parseSize(p.size, p.name)
  if (!s || s.kind === 'count') return null
  return s.base
}

/** Cost of one gram, in (fractional) cents. Null without a cost or a readable size. */
export function costPerGram(p: Costed): number | null {
  const g = gramsPerUnit(p)
  if (!g || p.unitCostCents <= 0) return null
  return p.unitCostCents / g
}

/** Cost of `grams` of a product, whole cents (rounded up so a bowl is never undercharged). */
export function lineCost(p: Costed | null, grams: number): number {
  if (!p || grams <= 0) return 0
  const per = costPerGram(p)
  return per == null ? 0 : Math.ceil(per * grams)
}

export const bowlGrams = (lines: BowlLine[]) => lines.reduce((s, l) => s + Math.max(0, l.grams), 0)
export const bowlCost = (lines: BowlLine[]) => lines.reduce((s, l) => s + Math.max(0, l.costCents), 0)

/** Cost of what was mixed and thrown away: leftover share of the bowl. */
export function wasteCents(b: Pick<Bowl, 'lines' | 'leftoverGrams'>) {
  const g = bowlGrams(b.lines)
  if (g <= 0 || b.leftoverGrams <= 0) return 0
  return Math.round(bowlCost(b.lines) * Math.min(1, b.leftoverGrams / g))
}

/** Product charge for the client: cost plus the shop's markup, rounded up to the next 50¢. */
export function suggestedCharge(costCents: number, markupPct: number) {
  if (costCents <= 0) return 0
  const raw = costCents * (1 + Math.max(0, markupPct) / 100)
  return Math.ceil(raw / 50) * 50
}

export type BowlGroup = {
  key: string
  bowls: number
  grams: number
  wasteGrams: number
  /** Waste as a whole percent of what was mixed. */
  wastePct: number
  costCents: number
  wasteCents: number
  chargedCents: number
  avgCostCents: number
}

function group(bowls: Bowl[], keyOf: (b: Bowl) => string): BowlGroup[] {
  const m = new Map<string, Bowl[]>()
  for (const b of bowls) {
    const k = keyOf(b) || 'Not recorded'
    m.set(k, [...(m.get(k) ?? []), b])
  }
  return [...m.entries()]
    .map(([key, list]) => {
      const grams = list.reduce((s, b) => s + bowlGrams(b.lines), 0)
      const wasteGrams = list.reduce((s, b) => s + Math.min(b.leftoverGrams, bowlGrams(b.lines)), 0)
      const costCents = list.reduce((s, b) => s + b.costCents, 0)
      return {
        key,
        bowls: list.length,
        grams,
        wasteGrams,
        wastePct: grams > 0 ? Math.round((wasteGrams / grams) * 100) : 0,
        costCents,
        wasteCents: list.reduce((s, b) => s + wasteCents(b), 0),
        chargedCents: list.reduce((s, b) => s + b.chargedCents, 0),
        avgCostCents: Math.round(costCents / list.length),
      }
    })
    .sort((a, b) => b.costCents - a.costCents)
}

/** Totals plus per-stylist and per-service breakdowns for a set of bowls. */
export function bowlReport(bowls: Bowl[]) {
  const [total] = group(bowls, () => 'All')
  return {
    total: total ?? { key: 'All', bowls: 0, grams: 0, wasteGrams: 0, wastePct: 0, costCents: 0, wasteCents: 0, chargedCents: 0, avgCostCents: 0 },
    byStaff: group(bowls, (b) => b.staffName),
    byService: group(bowls, (b) => b.serviceName),
  }
}

export type ServiceProfit = {
  service: Service
  /** Average product cost per visit: from bowls when there are some, else the owner's estimate. */
  productCents: number
  productFrom: 'bowls' | 'estimate' | 'none'
  bowls: number
  laborCents: number
  profitCents: number
  /** Whole percent of the price kept; null when there's no price. */
  marginPct: number | null
}

/** What each service really keeps once product and team time are paid for. */
export function serviceProfits(services: Service[], bowls: Bowl[], laborCentsPerHour: number): ServiceProfit[] {
  return services
    .filter((s) => s.active)
    .map((service) => {
      const mine = bowls.filter((b) => b.serviceId === service.id)
      const fromBowls = mine.length ? Math.round(mine.reduce((s, b) => s + b.costCents, 0) / mine.length) : null
      const productCents = fromBowls ?? service.productCents
      const laborCents = Math.round((Math.max(0, service.minutes) / 60) * Math.max(0, laborCentsPerHour))
      const profitCents = service.priceCents - productCents - laborCents
      return {
        service,
        productCents,
        productFrom: fromBowls != null ? 'bowls' : service.productCents > 0 ? 'estimate' : 'none',
        bowls: mine.length,
        laborCents,
        profitCents,
        marginPct: service.priceCents > 0 ? Math.round((profitCents / service.priceCents) * 100) : null,
      } satisfies ServiceProfit
    })
    .sort((a, b) => (a.marginPct ?? 999) - (b.marginPct ?? 999))
}

export type ColorBarTotals = { bowls: number; grams: number; costCents: number; chargedCents: number; wasteGrams: number; wasteCents: number }

/** Reports' color bar line: what the bowls in a period cost, what was charged for product, and what was thrown away. */
export function colorBarTotals(bowls: Pick<Bowl, 'lines' | 'leftoverGrams' | 'chargedCents'>[]): ColorBarTotals {
  const t: ColorBarTotals = { bowls: 0, grams: 0, costCents: 0, chargedCents: 0, wasteGrams: 0, wasteCents: 0 }
  for (const b of bowls) {
    t.bowls += 1
    t.grams += bowlGrams(b.lines)
    t.costCents += bowlCost(b.lines)
    t.chargedCents += Math.max(0, b.chargedCents)
    t.wasteGrams += Math.max(0, b.leftoverGrams)
    t.wasteCents += wasteCents(b)
  }
  t.grams = Math.round(t.grams)
  return t
}
