/**
 * Sales insights shared by the server (reports, emails, scheduled alerts) and
 * the client (pop-ups, Insights sheet). Client-safe: types, thresholds and
 * small formatting helpers only.
 */

/** Rolling windows, in days. */
export const WEEK_DAYS = 7
export const SLOW_WINDOW_DAYS = 30
/** Products younger than this aren't called slow — they haven't had a fair chance. */
export const SLOW_MIN_AGE_DAYS = 30
/** Units used in the slow window at or below which an in-stock item counts as slow. */
export const SLOW_MAX_UNITS = 1
/** Prices older than this (or never set) get an "update prices" reminder. */
export const PRICE_STALE_DAYS = 90
/** A fast mover is flagged once it will run out within this many days… */
export const FAST_RUNOUT_DAYS = 14
/** …or is selling at least this many times its usual rate. */
export const FAST_SURGE_RATIO = 1.5
/** Fewer weekly units than this are too few to call a trend. */
export const FAST_MIN_WEEK_UNITS = 3
/** Bulk orders for fast movers cover this many days of sales on top of par. */
export const BULK_COVER_DAYS = 30
export const BEST_SELLER_LIMIT = 10

export type InsightKind = 'weekly' | 'monthly' | 'fast'

/**
 * How an item leaves the shelf: `sold` to a client or guest (retail for resale,
 * drinks, food) or `used` up by staff while doing a service (backbar, color,
 * disposables…). Decided from the category's tax group, so "sold" and profit
 * are only claimed for things that are actually sold.
 */
export type UseKind = 'sold' | 'used'

/** Tax groups whose items are sold to clients / guests; everything else is used in-house. */
export const SOLD_TAX_GROUPS: readonly string[] = ['resale', 'beverage', 'food']

type ItemBase = {
  productId: number
  name: string
  brand: string
  size: string
  category: string
  vendor: string
  imageUrl: string
  qty: number
  unitCostCents: number
  retailPriceCents: number
  useKind: UseKind
}

export type BestSeller = ItemBase & {
  weekUnits: number
  prevWeekUnits: number
  /** Percent change vs the week before; null when there were no sales then. */
  trendPct: number | null
  /** Sold items: units × retail price. 0 for used items. */
  revenueCents: number
  /** Units × current unit cost: cost of goods for sold items, cost of product used for service items. */
  costCents: number
  /** Sold items with both a retail price and a cost: revenue − cost. Null otherwise. */
  profitCents: number | null
}

export type SlowGroup = 'color' | 'retail' | 'other'

export type SlowMover = ItemBase & {
  monthUnits: number
  /** Days since it was last used / sold; null if never. */
  daysSinceUsed: number | null
  /** Cash sitting on the shelf at current cost. */
  tiedUpCents: number
  group: SlowGroup
}

export type FastMover = ItemBase & {
  weekUnits: number
  /** Units per day over the last 7 days. */
  dailyRate: number
  /** Days until it runs out at that rate. */
  daysLeft: number
  surge: boolean
  /** Suggested bulk order: covers BULK_COVER_DAYS of sales plus par. */
  orderQty: number
  /** orderQty × most recent unit cost. */
  orderCostCents: number
  priceUpdatedAt: string | null
  priceStale: boolean
}

export type PriceReminder = ItemBase & {
  priceUpdatedAt: string | null
  /** Days since the price was last updated (from creation when never set). */
  daysOld: number
  missingCost: boolean
}

export type Insights = {
  generatedAt: string
  /** Period keys in the business time zone, used to show each pop-up once. */
  weekKey: string
  monthKey: string
  /** Top items by units out this week — sold and used together. */
  bestSellers: BestSeller[]
  /** Totals over every item that went out this week, split by sold vs used. */
  week: {
    soldUnits: number
    soldRevenueCents: number
    /** Profit from sold items that have both a retail price and a cost. */
    soldProfitCents: number
    /** Sold items missing a retail price or cost, left out of the profit. */
    soldUnpriced: number
    usedUnits: number
    usedCostCents: number
  }
  slowMovers: SlowMover[]
  fastMovers: FastMover[]
  fastOrderTotalCents: number
  priceReminders: PriceReminder[]
  /** AI-written summaries from the latest saved reports, if any. */
  summaries: { weekly: string; monthly: string; fast: string }
}

export const SLOW_GROUP_LABELS: Record<SlowGroup, string> = {
  color: 'Color',
  retail: 'Retail',
  other: 'Other stock',
}

export type WebPriceSource = 'manufacturer' | 'distributor' | 'amazon' | 'estimate'

export const WEB_PRICE_SOURCE_LABELS: Record<WebPriceSource, string> = {
  manufacturer: 'Manufacturer',
  distributor: 'Authorized distributor',
  amazon: 'Amazon',
  estimate: 'AI estimate (not verified online)',
}

export type WebPriceResult =
  | {
      ok: true
      checkId: number
      unitCostCents: number
      retailPriceCents: number
      sourceName: string
      sourceUrl: string
      sourceType: WebPriceSource
      note: string
    }
  | { ok: false; message: string }

/** "sold" / "used" — the verb for how an item went out. */
export function outVerb(kind: UseKind) {
  return kind === 'sold' ? 'sold' : 'used'
}

/** Color lines (hair color, developer, toner, lightener, tattoo ink, gel color…) — slow color ties up the most cash. */
export function isColorCategory(category: string, name = '') {
  return /colou?r|dye|toner|gloss|developer|lighten|bleach|tint|ink|pigment|shade/i.test(`${category} ${name}`)
}

export function daysBetween(from: Date | string, to = new Date()) {
  return Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000)
}

/** "3 days", "under a day". */
export function daysLabel(days: number) {
  if (days < 1) return 'under a day'
  const d = Math.round(days)
  return `${d} day${d === 1 ? '' : 's'}`
}
