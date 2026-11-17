/**
 * Fix prices from invoices: costs typed in by guess are corrected to what invoices
 * actually charged, and the whole product line follows. Client-safe and pure.
 *
 * Evidence = a price read from an invoice or delivery check-in for that exact product
 * (never one Bintro copied across a line, never a typed guess). For each product:
 * - it has its own invoice price and its cost differs → its own invoice price;
 * - otherwise, products in its line (`sameLine`) have invoice prices → the newest one.
 *   When those invoices disagree, the suggestion starts unticked.
 * A product whose cost already matches is left out. An invoice older than STALE_DAYS
 * may simply be out of date (prices rise), so its suggestions start unticked and say
 * how old it is. Nothing changes until applied.
 */
import { lineLabel, sameLine } from './entry-predictions'

export type Evidence = { productId: number; cents: number; at: string; vendor: string; from: 'invoice' | 'delivery' }
export type FixProduct = { id: number; name: string; brand: string; size: string; category: string; vendor: string; unitCostCents: number }

export type PriceFix = {
  productId: number
  name: string
  size: string
  currentCents: number
  cents: number
  /** "Your invoice" or "Same line as EVO 7.31". */
  reason: string
  at: string
  vendor: string
  own: boolean
  sure: boolean
  /** The invoice is older than STALE_DAYS. */
  old: boolean
}

export const STALE_DAYS = 180

function ago(at: string, now: Date) {
  const days = Math.floor((now.getTime() - new Date(at).getTime()) / 86_400_000)
  if (days < 60) return `${days} days old`
  const months = Math.round(days / 30.4)
  return months < 24 ? `${months} months old` : `${Math.round(months / 12)} years old`
}
export type PriceFixGroup = { line: string; fixes: PriceFix[] }

export function invoiceFixes(products: FixProduct[], evidence: Evidence[], now = new Date()): { groups: PriceFixGroup[]; checked: number } {
  const isOld = (at: string) => now.getTime() - new Date(at).getTime() > STALE_DAYS * 86_400_000
  const age = (at: string) => (isOld(at) ? ` · invoice is ${ago(at, now)}` : '')
  // Newest invoice price per product.
  const latest = new Map<number, Evidence>()
  for (const e of evidence) {
    if (e.cents <= 0) continue
    const cur = latest.get(e.productId)
    if (!cur || e.at > cur.at) latest.set(e.productId, e)
  }
  const byId = new Map(products.map((p) => [p.id, p]))
  const anchors = [...latest.values()].filter((e) => byId.has(e.productId))

  const groups = new Map<string, PriceFix[]>()
  const add = (p: FixProduct, fix: Omit<PriceFix, 'productId' | 'name' | 'size' | 'currentCents' | 'old'>, lineOf: FixProduct) => {
    if (fix.cents === p.unitCostCents) return
    const key = lineLabel(lineOf)
    const old = isOld(fix.at)
    groups.set(key, [
      ...(groups.get(key) ?? []),
      { productId: p.id, name: p.name, size: p.size, currentCents: p.unitCostCents, ...fix, reason: fix.reason + age(fix.at), sure: fix.sure && !old, old },
    ])
  }

  for (const p of products) {
    const own = latest.get(p.id)
    if (own) {
      add(p, { cents: own.cents, reason: `Your ${own.from}`, at: own.at, vendor: own.vendor, own: true, sure: true }, p)
      continue
    }
    const kin = anchors.filter((e) => sameLine(p, byId.get(e.productId)!)).sort((a, b) => b.at.localeCompare(a.at))
    if (kin.length === 0) continue
    const newest = kin[0]
    const source = byId.get(newest.productId)!
    const prices = new Set(kin.map((k) => k.cents))
    add(
      p,
      {
        cents: newest.cents,
        reason: `Same line as ${source.name}${prices.size > 1 ? ` (invoices in this line show ${prices.size} prices)` : kin.length > 1 ? ` +${kin.length - 1} more invoices agree` : ''}`,
        at: newest.at,
        vendor: newest.vendor,
        own: false,
        sure: prices.size === 1,
      },
      source,
    )
  }

  return {
    groups: [...groups]
      .map(([line, fixes]) => ({ line, fixes: fixes.sort((a, b) => Number(b.own) - Number(a.own) || a.name.localeCompare(b.name)) }))
      .sort((a, b) => b.fixes.length - a.fixes.length || a.line.localeCompare(b.line)),
    checked: products.length,
  }
}
