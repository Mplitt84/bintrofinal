/** Profit page types and thresholds (client-safe). */

export type ProfitPeriod = 30 | 90 | 365

/** Margin under this (%) is called "thin" on things you sell. */
export const THIN_MARGIN_PCT = 30
/** In stock with no use or sale for this many days = sitting still. */
export const DEAD_STOCK_DAYS = 90
/** On hand above this × Fill to = too much on the shelf. */
export const OVERSTOCK_RATIO = 1.5

export type ProductRef = { productId: number; name: string; brand: string; size: string; vendor: string; imageUrl: string }

export type MoneyMaker = ProductRef & {
  units: number
  revenueCents: number
  costCents: number
  profitCents: number
  marginPct: number
}

export type LoserKind = 'loss' | 'thin' | 'dead' | 'overstock' | 'shrink' | 'expired' | 'expiring'

export type MoneyLoser = ProductRef & {
  kind: LoserKind
  /** Money lost, or cash tied up, for this reason. */
  amountCents: number
  /** One plain sentence: why it's on the list. */
  why: string
  /** What to do about it. */
  fix: string
}

/** A row on the Profit page: the making-money list, the services list, or one reason on the costing-money list. */
export type ProfitListKey = 'maker' | 'service' | LoserKind
export const PROFIT_LIST_KEYS = ['maker', 'service', 'loss', 'thin', 'dead', 'overstock', 'shrink', 'expired', 'expiring'] as const

export type ServiceCost = ProductRef & { units: number; costCents: number }

export type ProfitReport = {
  days: ProfitPeriod
  totals: {
    revenueCents: number
    profitCents: number
    marginPct: number
    soldUnits: number
    /** Cost of products used on clients (backbar). */
    usedCostCents: number
    /** Lost to damage, theft and missing items found in counts. */
    shrinkCents: number
    /** Cash sitting in stock that hasn't moved. */
    deadStockCents: number
    overstockCents: number
    expiredCents: number
  }
  makers: MoneyMaker[]
  losers: MoneyLoser[]
  serviceCosts: ServiceCost[]
  /** Shrink by count reason (Damaged, Theft, Missing SKU…). */
  shrinkByReason: { reason: string; units: number; costCents: number }[]
  /** Rows the business removed from this report as incorrect; they are left out of the totals too. */
  removed: (ProductRef & { key: ProfitListKey })[]
  /** Data gaps that make the numbers less sure. */
  gaps: { soldNoCost: ProductRef[]; soldNoRetail: ProductRef[]; neverCounted: number; productsTotal: number }
}
