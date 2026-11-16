/**
 * Sustainability: the partners a shop works with, and color waste weighed each month.
 * Client-safe and pure (tested in sustainability.test.ts). Weights are stored in grams
 * and shown in the unit the shop picks; money only appears when the shop has said what
 * an ounce of color costs it. Nothing here is estimated.
 */

export type PartnerKind = 'recycling' | 'certification' | 'donation' | 'supplier' | 'other'

export const PARTNER_KINDS: { id: PartnerKind; label: string }[] = [
  { id: 'recycling', label: 'Recycling program' },
  { id: 'certification', label: 'Certification' },
  { id: 'donation', label: 'Donations' },
  { id: 'supplier', label: 'Green supplier' },
  { id: 'other', label: 'Other' },
]

export type Partner = {
  id: number
  name: string
  kind: PartnerKind
  contact: string
  website: string
  since: string
  notes: string
}

/** A one-tap start for beauty businesses. Everything else is written in by the shop. */
export const PARTNER_SUGGESTIONS: Array<Omit<Partner, 'id' | 'contact' | 'since' | 'notes'>> = [
  { name: 'Green Circle Salons', kind: 'recycling', website: 'https://greencirclesalons.com' },
]

export type WasteUnit = 'lb' | 'oz' | 'kg' | 'g'

export const WASTE_UNITS: { id: WasteUnit; label: string; grams: number }[] = [
  { id: 'lb', label: 'lb', grams: 453.59237 },
  { id: 'oz', label: 'oz', grams: 28.349523125 },
  { id: 'kg', label: 'kg', grams: 1000 },
  { id: 'g', label: 'g', grams: 1 },
]

export const toGrams = (amount: number, unit: WasteUnit) =>
  Math.round(amount * (WASTE_UNITS.find((u) => u.id === unit)?.grams ?? 1))

export const fromGrams = (grams: number, unit: WasteUnit) => grams / (WASTE_UNITS.find((u) => u.id === unit)?.grams ?? 1)

export const gramsToOz = (grams: number) => fromGrams(grams, 'oz')

/** "3.2 lb" / "51.5 oz" / "1.45 kg" / "1,450 g". */
export function formatWeight(grams: number, unit: WasteUnit) {
  const v = fromGrams(grams, unit)
  const digits = unit === 'g' ? 0 : unit === 'kg' ? 2 : 1
  return `${v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: unit === 'g' ? 0 : 1 })} ${unit}`
}

export type WasteLog = { id: number; month: string; grams: number; costCentsPerOz: number; note: string; loggedBy: string }

export type WasteMonth = WasteLog & {
  /** Grams more (+) or less (−) than the month before it; null for the first month logged. */
  changeGrams: number | null
  /** Percent change against the month before; null when there's nothing to compare with. */
  changePct: number | null
  /** Money kept by wasting less than last month (negative = it cost more). Null without a cost per ounce. */
  savedVsLastCents: number | null
  /** Money kept against the first month logged. Null without a cost per ounce. */
  savedVsStartCents: number | null
}

/** "2026-11" → "Nov 2026" (or "Nov" when short). */
export function monthLabel(month: string, short = false) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, 1)
  return d.toLocaleDateString(undefined, short ? { month: 'short' } : { month: 'short', year: 'numeric' })
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Each logged month, oldest first, with the change against the month before and the
 * money that change is worth at that month's cost per ounce. The first month logged
 * is the starting point: it never shows savings of its own.
 */
export function wasteMonths(logs: WasteLog[]): WasteMonth[] {
  const sorted = [...logs].sort((a, b) => a.month.localeCompare(b.month))
  const start = sorted[0]
  return sorted.map((log, i) => {
    const prev = i > 0 ? sorted[i - 1] : null
    const changeGrams = prev ? log.grams - prev.grams : null
    const changePct = prev && prev.grams > 0 ? Math.round(((log.grams - prev.grams) / prev.grams) * 100) : null
    const cost = log.costCentsPerOz
    const worth = (gramsLess: number) => Math.round(gramsToOz(gramsLess) * cost)
    return {
      ...log,
      changeGrams,
      changePct,
      savedVsLastCents: prev && cost > 0 ? worth(prev.grams - log.grams) : null,
      savedVsStartCents: start && i > 0 && cost > 0 ? worth(start.grams - log.grams) : null,
    }
  })
}

/** Totals for the tiles: money kept month over month, added up (only months with a cost). */
export function wasteTotals(months: WasteMonth[]) {
  const priced = months.filter((m) => m.savedVsLastCents !== null)
  return {
    months: months.length,
    totalGrams: months.reduce((sum, m) => sum + m.grams, 0),
    savedCents: priced.length ? priced.reduce((sum, m) => sum + (m.savedVsLastCents ?? 0), 0) : null,
  }
}
