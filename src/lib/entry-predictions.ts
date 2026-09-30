import type { Product } from '@/components/inventory/types'

export type PriceField = 'unitCostCents' | 'retailPriceCents'
export type PriceOption = { cents: number; hint: string }
export type EntryContext = { name: string; brand: string; category: string; size: string; vendor: string }

const fold = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

function words(v: string) {
  return fold(v)
    .split(/[\s\-/.,'()]+/)
    .filter((w) => w.length >= 3)
}

/** How much a previous entry looks like the one being typed (0 = nothing in common). */
export function similarity(p: Product, ctx: Partial<EntryContext>) {
  let score = 0
  if (ctx.brand?.trim() && fold(p.brand) === fold(ctx.brand)) score += 4
  if (ctx.category?.trim() && fold(p.category) === fold(ctx.category)) score += 2
  if (ctx.size?.trim() && fold(p.size) === fold(ctx.size)) score += 2
  if (ctx.vendor?.trim() && fold(p.vendor) === fold(ctx.vendor)) score += 1
  if (ctx.name?.trim()) {
    const mine = new Set(words(ctx.name))
    score += Math.min(3, words(p.name).filter((w) => mine.has(w)).length)
  }
  return score
}

const newestFirst = (a: Product, b: Product) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id

/** Previous entries to offer for copying: the most alike first, then the most recently added. */
export function rankPreviousEntries(products: Product[], ctx: Partial<EntryContext>, query = '', limit = 6) {
  const q = fold(query)
  const pool = q
    ? products.filter((p) => fold([p.name, p.brand, p.category, p.vendor, p.size, p.barcode].join(' ')).includes(q))
    : products
  return pool
    .map((p) => ({ p, score: similarity(p, ctx) }))
    .sort((a, b) => b.score - a.score || newestFirst(a.p, b.p))
    .slice(0, limit)
    .map(({ p, score }) => ({ product: p, similar: score >= 3 }))
}

/** The single best "looks like" match, if one is close enough to be worth offering. */
export function bestSimilarEntry(products: Product[], ctx: Partial<EntryContext>) {
  let best: Product | null = null
  let bestScore = 0
  for (const p of products) {
    const s = similarity(p, ctx)
    if (s > bestScore || (s === bestScore && best && newestFirst(p, best) < 0)) {
      best = p
      bestScore = s
    }
  }
  return bestScore >= 3 ? best : null
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/**
 * Predicted prices for the cost or "sells for" field, from what's already been
 * entered: prices of alike products (same brand, category, size, supplier or
 * name words) rank first, then the business's most-used prices. When the other
 * price is known, the usual markup is offered on top.
 */
export function predictPrices(
  products: Product[],
  field: PriceField,
  ctx: EntryContext & { excludeId?: number; otherCents: number },
  limit = 6,
): PriceOption[] {
  const groups = new Map<number, { total: number; count: number; best: Product; bestScore: number }>()
  for (const p of products) {
    const cents = p[field]
    if (p.id === ctx.excludeId || cents <= 0) continue
    const score = similarity(p, ctx)
    const g = groups.get(cents)
    if (!g) groups.set(cents, { total: 1 + score, count: 1, best: p, bestScore: score })
    else {
      g.total += 1 + score
      g.count += 1
      if (score > g.bestScore) {
        g.best = p
        g.bestScore = score
      }
    }
  }
  const options: (PriceOption & { rank: number })[] = Array.from(groups, ([cents, g]) => ({
    cents,
    rank: g.total,
    hint:
      g.bestScore > 0
        ? `Same as ${g.best.name}${g.count > 1 ? ` +${g.count - 1}` : ''}`
        : g.count > 1
          ? `Used on ${g.count} products`
          : `From ${g.best.name}`,
  }))

  if (ctx.otherCents > 0) {
    // Markup between cost and retail, from alike products when there are enough, else the whole shelf.
    const paired = products.filter((p) => p.id !== ctx.excludeId && p.unitCostCents > 0 && p.retailPriceCents > p.unitCostCents)
    const alike = paired.filter((p) => similarity(p, ctx) >= 2)
    const basis = alike.length >= 2 ? alike : paired
    const ratio = median(basis.map((p) => p.retailPriceCents / p.unitCostCents))
    if (ratio > 1) {
      const raw = field === 'retailPriceCents' ? ctx.otherCents * ratio : ctx.otherCents / ratio
      // Retail rounds to the nearest 50¢ like a shelf price; cost stays exact to the cent.
      const cents = field === 'retailPriceCents' ? Math.max(50, Math.round(raw / 50) * 50) : Math.round(raw)
      const existing = options.find((o) => o.cents === cents)
      const hint = `Your usual ${ratio.toFixed(1)}× markup${alike.length >= 2 ? ' for items like this' : ''}`
      if (existing) {
        existing.rank = Number.POSITIVE_INFINITY
        existing.hint = hint
      } else options.push({ cents, hint, rank: Number.POSITIVE_INFINITY })
    }
  }

  return options
    .sort((a, b) => b.rank - a.rank || a.cents - b.cents)
    .slice(0, limit)
    .map(({ cents, hint }) => ({ cents, hint }))
}
