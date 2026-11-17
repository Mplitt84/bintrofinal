import type { Product } from '@/components/inventory/types'
import { parseSize } from './categorize'

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

/* ------------------------------------------------------------------ Same-line prices */

/**
 * Product lines. Salons name shades two ways, and both must group:
 * - with a shade code: "EVO 7.31 Medium Blonde Golden Ash", "Gloss Toner 08.21",
 *   "Colorwear 9.3 Very Light Gold Blonde", "Alfaparf Milano 20 Volume Developer".
 *   The line is everything before the code (EVO, Gloss Toner, Colorwear…); the words
 *   after it describe that one shade, so they don't count.
 * - with a color name only: "Danger Jones Adrenaline", "Pravana Chromasilk Vivids Direct
 *   Dye Emerald". The line is the shared start of the name, and only for color products,
 *   so "Astral Amino Shampoo" and "Astral Amino Conditioner" never count as one line.
 * Brand must match. Size must match when both have one; a blank size doesn't block.
 */
const SHADE = /^(#?\d+([.,/]\d+)?[a-z]{0,4}|\.\d+[a-z]{0,3}|[a-z]{1,2}\d+[a-z]?)$/i
const COLORISH = /colou?r|toner|gloss|dye|pigment|lighten|developer|vivid|chromasilk|semi|demi|tint|harmoni/i

function nameTokens(name: string) {
  return fold(name)
    .split(/[\s\-/,'()+&]+/)
    .filter(Boolean)
}

type LineKey = { coded: true; prefix: string } | { coded: false; words: string[] }
function lineKey(name: string): LineKey {
  const t = nameTokens(name)
  const i = t.findIndex((w) => SHADE.test(w))
  if (i >= 0) return { coded: true, prefix: t.slice(0, i).join(' ') }
  return { coded: false, words: t }
}

const sameSize = (a: string, b: string) => {
  if (!a.trim() || !b.trim()) return true
  const pa = parseSize(a)
  const pb = parseSize(b)
  if (pa && pb) return pa.kind === pb.kind && Math.abs(pa.base - pb.base) / Math.max(pa.base, pb.base) < 0.02
  return fold(a) === fold(b)
}

type LineFields = Pick<Product, 'brand' | 'name' | 'size'> & { category?: string }

/** Same brand, same product line (see above), and not two different sizes. */
export function sameLine(a: LineFields, b: LineFields) {
  if (!a.brand.trim() || fold(a.brand) !== fold(b.brand)) return false
  if (!sameSize(a.size, b.size)) return false
  const ka = lineKey(a.name)
  const kb = lineKey(b.name)
  if (ka.coded && kb.coded) return ka.prefix === kb.prefix && (ka.prefix.length > 0 || fold(a.brand).length > 0)
  if (ka.coded || kb.coded) return false
  const colorish = (x: LineFields) => COLORISH.test(`${x.category ?? ''} ${x.name}`)
  if (!colorish(a) || !colorish(b)) return false
  const wa = (ka as { words: string[] }).words
  const wb = (kb as { words: string[] }).words
  let shared = 0
  while (shared < wa.length && shared < wb.length && wa[shared] === wb[shared]) shared++
  // Everything but the last one or two words (the color's own name) is shared.
  return shared >= 2 && shared >= Math.max(wa.length, wb.length) - 2
}

export type LinePrice = { cents: number; hint: string; matches: number; confident: boolean }

/**
 * The price a new shade or variant almost certainly has: products in the same line
 * (`sameLine`) that already carry a price. Lines usually price every shade alike, so
 * when they agree (at least two-thirds on one price) that's the answer, offered with
 * the products it came from. Nothing is filled without a person tapping it.
 */
export function linePrice(products: Product[], field: PriceField, target: LineFields & { id?: number }): LinePrice | null {
  if (!target.brand.trim() || !target.name.trim()) return null
  const alike = products.filter((p) => p.id !== target.id && p[field] > 0 && sameLine(target, p))
  if (alike.length === 0) return null
  const tally = new Map<number, Product[]>()
  for (const p of alike) tally.set(p[field], [...(tally.get(p[field]) ?? []), p])
  const [cents, from] = [...tally].sort((a, b) => b[1].length - a[1].length)[0]
  const confident = from.length / alike.length >= 2 / 3
  if (!confident && from.length < 2) return null
  const names = from.slice(0, 2).map((p) => p.name).join(', ')
  return { cents, matches: from.length, confident, hint: `Same as ${names}${from.length > 2 ? ` +${from.length - 2}` : ''}` }
}

/**
 * The other products in a product's line that should move with it when its price
 * changes: they were at the same old price (or had no cost yet). A shade priced
 * differently on purpose is left alone.
 */
export function lineSiblings<T extends Pick<Product, 'id' | 'brand' | 'name' | 'size' | 'unitCostCents'> & { category?: string }>(
  products: T[],
  product: Pick<Product, 'id'> & LineFields,
  oldCents: number,
  skip: Set<number> = new Set(),
): T[] {
  return products.filter(
    (p) => p.id !== product.id && !skip.has(p.id) && (p.unitCostCents === oldCents || p.unitCostCents <= 0) && sameLine(product, p),
  )
}
