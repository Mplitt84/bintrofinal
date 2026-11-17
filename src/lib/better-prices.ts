/**
 * Better prices: the rules for where Bintro may look for a cheaper seller, which
 * products the weekly scan checks, and how savings are counted. Client-safe and pure.
 *
 * Every business picks how it likes to buy (Settings → Better prices):
 * - pro          professional distributors and the brand's own pro store only.
 * - local        the same, plus local and independent beauty supply near the shop.
 *                Amazon, Walmart and Target are never suggested.
 * - marketplace  the same as pro, plus Amazon, Walmart and Target — but only for
 *                shop supplies (foils, gloves, towels, tools, front desk). Never for
 *                color and backbar, retail for resale, or anything clients consume.
 */
import type { TaxGroupId } from './tax-categories'

export type BuyingPreference = 'pro' | 'local' | 'marketplace'

export const BUYING_PREFERENCES: { id: BuyingPreference; label: string; detail: string }[] = [
  { id: 'pro', label: 'Pro suppliers', detail: 'Professional distributors and brand pro stores only.' },
  {
    id: 'local',
    label: 'Support local',
    detail: 'Pro suppliers plus local, independent beauty supply. Never Amazon, Walmart or Target.',
  },
  {
    id: 'marketplace',
    label: 'We buy on Amazon',
    detail: 'Pro suppliers, plus Amazon, Walmart and Target for supplies like foils, gloves, towels and front-desk items.',
  },
]

export const isBuyingPreference = (v: string): v is BuyingPreference => v === 'pro' || v === 'local' || v === 'marketplace'

/**
 * The only tax groups a consumer marketplace may be suggested for. Color and backbar
 * (`service`), retail for resale, client amenities, food and drink are never on it.
 */
export const MARKETPLACE_GROUPS: TaxGroupId[] = ['disposables', 'tools', 'linens', 'office']

export const marketplaceAllowed = (pref: BuyingPreference, group: TaxGroupId) => pref === 'marketplace' && MARKETPLACE_GROUPS.includes(group)

export type SellerType = 'distributor' | 'brand' | 'local' | 'marketplace'

export const SELLER_LABEL: Record<SellerType, string> = {
  distributor: 'Pro distributor',
  brand: 'Brand pro store',
  local: 'Local & independent',
  marketplace: 'Marketplace',
}

/** How many products the scan checks per run, so the AI bill stays small and predictable. */
export const SCAN_PER_WEEK = 12
export const SCAN_PER_TAP = 6
/** A product isn't looked at again for this long. */
export const RESCAN_DAYS = 6
/** An offer must beat today's cost by at least this much per unit (and 3%) to be worth a switch. */
export const MIN_SAVING_CENTS = 25
export const MIN_SAVING_PCT = 3

export type ScanCandidate = {
  id: number
  unitCostCents: number
  /** Units out in the last 30 days. */
  out30: number
  sellerScanAt: Date | string | null
  /** Product has a name worth searching. */
  name: string
}

/**
 * Which products this run checks: ones with a cost (so there's something to beat),
 * not checked in the last RESCAN_DAYS, biggest monthly spend first, then the ones
 * checked longest ago. Products with no use still get their turn after the rest.
 */
export function pickScanQueue(products: ScanCandidate[], now: Date, limit: number) {
  const cutoff = now.getTime() - RESCAN_DAYS * 86_400_000
  return products
    .filter((p) => p.name.trim() && p.unitCostCents > 0)
    .filter((p) => !p.sellerScanAt || new Date(p.sellerScanAt).getTime() < cutoff)
    .sort((a, b) => {
      const spend = b.unitCostCents * b.out30 - a.unitCostCents * a.out30
      if (spend) return spend
      const at = (p: ScanCandidate) => (p.sellerScanAt ? new Date(p.sellerScanAt).getTime() : 0)
      return at(a) - at(b)
    })
    .slice(0, limit)
}

/** True when an offer is cheap enough to be worth showing. */
export function worthSwitching(currentCents: number, offerCents: number) {
  if (offerCents <= 0 || currentCents <= 0) return false
  const saving = currentCents - offerCents
  return saving >= MIN_SAVING_CENTS && (saving / currentCents) * 100 >= MIN_SAVING_PCT
}

/** Savings a month at the product's last-30-day pace (0 when it isn't used). */
export function monthlySaving(currentCents: number, offerCents: number, out30: number) {
  return Math.max(0, currentCents - offerCents) * Math.max(0, out30)
}

export type BetterPrice = {
  id: number
  productId: number
  productName: string
  brand: string
  size: string
  category: string
  currentVendor: string
  currentCostCents: number
  sellerName: string
  sellerUrl: string
  sellerType: SellerType
  unitCostCents: number
  savingPerUnitCents: number
  savingPct: number
  /** At the last 30 days' pace. */
  monthlySavingCents: number
  out30: number
  note: string
  foundAt: string
}

export type BetterPricesState = {
  preference: BuyingPreference
  offers: BetterPrice[]
  monthlySavingCents: number
  lastScanAt: string | null
  checkedThisWeek: number
  /** Products with no cost yet — the scan can't compare them. */
  missingCost: number
}
