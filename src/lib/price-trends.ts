/**
 * Price watch: what the shop's own invoices say about prices going up or down.
 * Client-safe and pure. Every number comes from recorded costs (price_history);
 * nothing is estimated, and a product with a single price has no trend.
 */

export type PricePoint = { productId: number; cents: number; at: string | Date; vendor: string; source: string }
export type WatchProduct = { id: number; name: string; brand: string; size: string; vendor: string; category: string; out30: number }

export type PriceMove = {
  productId: number
  name: string
  brand: string
  size: string
  vendor: string
  fromCents: number
  toCents: number
  fromAt: string
  toAt: string
  changePct: number
  /** Extra a month at last-30-day use (negative = saving). */
  monthlyImpactCents: number
  points: { cents: number; at: string; vendor: string; source: string }[]
}

export type PriceWatch = {
  months: number
  /** Change of the shop's basket over the window, weighted by what's used (equal weight when nothing is). */
  basketPct: number | null
  /** Month-by-month basket, 100 = the window's start. */
  index: { month: string; value: number }[]
  risers: PriceMove[]
  fallers: PriceMove[]
  bySupplier: { vendor: string; changePct: number; products: number }[]
  byCategory: { category: string; changePct: number; products: number }[]
  /** Products with at least two recorded prices in the window. */
  tracked: number
  /** Extra spent a month at current use because of increases (less any decreases). */
  monthlyImpactCents: number
}

const iso = (d: string | Date) => (typeof d === 'string' ? d : d.toISOString())
const monthOf = (d: string | Date) => iso(d).slice(0, 7)

function addMonths(key: string, n: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

/** The cost in force at the end of `month` (the last recorded on or before it), or 0. */
function priceAt(points: { cents: number; at: string }[], month: string) {
  let cents = 0
  for (const p of points) if (monthOf(p.at) <= month) cents = p.cents
  return cents
}

function weightedChange(moves: PriceMove[], use: Map<number, number>) {
  let base = 0
  let now = 0
  for (const m of moves) {
    const w = Math.max(1, use.get(m.productId) ?? 0)
    base += m.fromCents * w
    now += m.toCents * w
  }
  return base > 0 ? ((now - base) / base) * 100 : 0
}

const round1 = (n: number) => (Math.sign(n) * Math.round(Math.abs(n) * 10)) / 10

export function buildPriceWatch(history: PricePoint[], products: WatchProduct[], now: Date, months = 12): PriceWatch {
  const end = monthOf(now)
  const start = addMonths(end, -(months - 1))
  const byProduct = new Map<number, PricePoint[]>()
  for (const h of history) byProduct.set(h.productId, [...(byProduct.get(h.productId) ?? []), h])
  const info = new Map(products.map((p) => [p.id, p]))
  const use = new Map(products.map((p) => [p.id, p.out30]))

  const moves: PriceMove[] = []
  for (const [productId, raw] of byProduct) {
    const p = info.get(productId)
    if (!p) continue
    const points = raw
      .filter((h) => h.cents > 0)
      .map((h) => ({ cents: h.cents, at: iso(h.at), vendor: h.vendor, source: h.source }))
      .sort((a, b) => a.at.localeCompare(b.at))
    // The price at the start of the window is the last one before it (if any), else the first inside it.
    const before = points.filter((x) => monthOf(x.at) < start)
    const inside = points.filter((x) => monthOf(x.at) >= start)
    const first = before.at(-1) ?? inside[0]
    const last = points.at(-1)
    if (!first || !last || inside.length === 0 || first === last) continue
    moves.push({
      productId,
      name: p.name,
      brand: p.brand,
      size: p.size,
      vendor: last.vendor || p.vendor,
      fromCents: first.cents,
      toCents: last.cents,
      fromAt: first.at,
      toAt: last.at,
      changePct: round1(((last.cents - first.cents) / first.cents) * 100),
      monthlyImpactCents: (last.cents - first.cents) * Math.max(0, p.out30),
      points: [...(before.length ? [first] : []), ...inside],
    })
  }

  const index: { month: string; value: number }[] = []
  if (moves.length) {
    for (let k = start; k <= end; k = addMonths(k, 1)) {
      let base = 0
      let at = 0
      for (const m of moves) {
        const w = Math.max(1, use.get(m.productId) ?? 0)
        const price = priceAt(m.points, k) || m.fromCents
        base += m.fromCents * w
        at += price * w
      }
      index.push({ month: k, value: round1((at / base) * 100) })
    }
  }

  const group = (key: (m: PriceMove) => string, label: string) => {
    const g = new Map<string, PriceMove[]>()
    for (const m of moves) {
      const k = key(m).trim() || label
      g.set(k, [...(g.get(k) ?? []), m])
    }
    return [...g].map(([name, list]) => ({ name, changePct: round1(weightedChange(list, use)), products: list.length }))
  }

  const changed = moves.filter((m) => m.changePct !== 0)
  return {
    months,
    basketPct: moves.length ? round1(weightedChange(moves, use)) : null,
    index,
    risers: changed.filter((m) => m.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 10),
    fallers: changed.filter((m) => m.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 5),
    bySupplier: group((m) => m.vendor, 'No supplier')
      .map(({ name, ...r }) => ({ vendor: name, ...r }))
      .sort((a, b) => b.changePct - a.changePct),
    byCategory: group((m) => info.get(m.productId)?.category ?? '', 'No category')
      .map(({ name, ...r }) => ({ category: name, ...r }))
      .sort((a, b) => b.changePct - a.changePct),
    tracked: moves.length,
    monthlyImpactCents: moves.reduce((s, m) => s + m.monthlyImpactCents, 0),
  }
}
