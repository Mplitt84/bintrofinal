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

/** Money as the Profit page writes it: $12.50. */
export const profitMoney = (cents: number) => `$${(Math.round(cents) / 100).toFixed(2)}`

/** One product, with everything the Profit rules need, and nothing about the database. */
export type ProfitProduct = ProductRef & {
  /** Sold to clients, or used behind the chair. */
  useKind: 'sold' | 'used'
  /** Units that went out in the period. */
  unitsOut: number
  onHand: number
  costCents: number
  retailCents: number
  /** Days until it expires; negative once past, null when no date is set. */
  expiryDays: number | null
  /** On the shelf long enough that no movement really means it is not moving. */
  oldEnough: boolean
  /** Last time a unit went out, ever. */
  lastOutAt: Date | null
  /** True when nothing has gone out within the dead-stock window. */
  noRecentOut: boolean
  /** Fill to level; 0 when the business has not set one. */
  fillTo: number
}

/** What one product adds to the Profit page. */
export type ProfitRows = {
  maker: MoneyMaker | null
  losers: MoneyLoser[]
  serviceCost: ServiceCost | null
  /** Sold but priced wrong in the records, so it is left out and listed as a gap. */
  gapNoCost: boolean
  gapNoRetail: boolean
  /** What this product adds to the totals at the top. */
  totals: {
    revenueCents: number
    profitCents: number
    soldUnits: number
    usedCostCents: number
    deadStockCents: number
    overstockCents: number
    expiredCents: number
  }
}

const NO_TOTALS = {
  revenueCents: 0,
  profitCents: 0,
  soldUnits: 0,
  usedCostCents: 0,
  deadStockCents: 0,
  overstockCents: 0,
  expiredCents: 0,
}

/**
 * The whole Profit rulebook for one product, with no database in sight, so it can be
 * read and tested on its own. `isRemoved` answers whether the business has taken that
 * row off the report as incorrect; a removed row leaves both its list and the totals.
 */
export function profitRowsFor(
  p: ProfitProduct,
  isRemoved: (key: ProfitListKey) => boolean = () => false,
): ProfitRows {
  const out: ProfitRows = {
    maker: null,
    losers: [],
    serviceCost: null,
    gapNoCost: false,
    gapNoRetail: false,
    totals: { ...NO_TOTALS },
  }
  const ref: ProductRef = {
    productId: p.productId,
    name: p.name,
    brand: p.brand,
    size: p.size,
    vendor: p.vendor,
    imageUrl: p.imageUrl,
  }
  const cost = p.costCents
  const retail = p.retailCents
  const units = Math.max(0, p.unitsOut)
  const onHand = Math.max(0, p.onHand)

  if (p.useKind === 'sold' && units > 0) {
    if (!cost) out.gapNoCost = true
    if (!retail) out.gapNoRetail = true
    if (cost && retail && !isRemoved(retail <= cost ? 'loss' : 'maker')) {
      const revenue = units * retail
      const profit = units * (retail - cost)
      const marginPct = Math.round(((retail - cost) / retail) * 100)
      out.totals.revenueCents += revenue
      out.totals.profitCents += profit
      out.totals.soldUnits += units
      if (profit > 0)
        out.maker = {
          ...ref,
          units,
          revenueCents: revenue,
          costCents: units * cost,
          profitCents: profit,
          marginPct,
        }
      if (retail <= cost) {
        out.losers.push({
          ...ref,
          kind: 'loss',
          amountCents: units * (cost - retail),
          why: `Sells for ${profitMoney(retail)} but costs you ${profitMoney(cost)}. You lost money on all ${units} sold.`,
          fix: 'Raise the price or stop carrying it.',
        })
      } else if (marginPct < THIN_MARGIN_PCT && !isRemoved('thin')) {
        const target = Math.ceil(cost / (1 - THIN_MARGIN_PCT / 100))
        out.losers.push({
          ...ref,
          kind: 'thin',
          // Money left on the table at a fair price.
          amountCents: units * (target - retail),
          why: `You keep only ${marginPct}% (${profitMoney(retail - cost)} each) after cost.`,
          fix: `A price of ${profitMoney(target)} would keep ${THIN_MARGIN_PCT}%.`,
        })
      }
    }
  }

  if (p.useKind === 'used' && units > 0 && cost && !isRemoved('service')) {
    out.totals.usedCostCents += units * cost
    out.serviceCost = { ...ref, units, costCents: units * cost }
  }

  // Everything below is about stock sitting on the shelf, so it needs a cost and units.
  if (!cost || onHand === 0) return out
  const value = onHand * cost

  if (p.expiryDays !== null && p.expiryDays < 0) {
    // Expired stock is never also called "not moving" — it is one problem, not two.
    if (isRemoved('expired')) return out
    out.totals.expiredCents += value
    out.losers.push({
      ...ref,
      kind: 'expired',
      amountCents: value,
      why: `${onHand} on the shelf are past their date.`,
      fix: 'Pull them, then count them out as Expired so the numbers stay right.',
    })
    return out
  }
  if (p.expiryDays !== null && p.expiryDays <= 60 && !isRemoved('expiring')) {
    out.losers.push({
      ...ref,
      kind: 'expiring',
      amountCents: value,
      why: `${onHand} expire in ${p.expiryDays} day${p.expiryDays === 1 ? '' : 's'}.`,
      fix: p.useKind === 'sold' ? 'Put them on special or bundle them.' : 'Use these first.',
    })
  }

  if (p.oldEnough && p.noRecentOut) {
    if (isRemoved('dead')) return out
    out.totals.deadStockCents += value
    const word = p.useKind === 'sold' ? 'sold' : 'used'
    out.losers.push({
      ...ref,
      kind: 'dead',
      amountCents: value,
      why: p.lastOutAt
        ? `Not ${word} since ${p.lastOutAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. ${profitMoney(value)} is sitting on the shelf.`
        : `Never ${word} in Bintro. ${profitMoney(value)} is sitting on the shelf.`,
      fix:
        p.useKind === 'sold'
          ? 'Mark it down, bundle it, or ask the vendor about a return.'
          : 'Stop reordering it, or check if staff use something else.',
    })
    return out
  }

  // Only when the business has set a Fill to; the default par alone is too low a bar.
  if (p.fillTo > 0 && onHand > p.fillTo * OVERSTOCK_RATIO && !isRemoved('overstock')) {
    const extra = onHand - p.fillTo
    out.totals.overstockCents += extra * cost
    out.losers.push({
      ...ref,
      kind: 'overstock',
      amountCents: extra * cost,
      why: `${onHand} on hand but Fill to is ${p.fillTo}. ${extra} extra = ${profitMoney(extra * cost)} of cash on the shelf.`,
      fix: 'Skip the next order for this one.',
    })
  }

  return out
}
