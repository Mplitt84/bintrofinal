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

/**
 * A color line as the shop mixes it: what a tube and the developer cost, and the mix
 * ratio (color : developer, by weight, e.g. 1 : 1.5 permanent, 1 : 2 gloss). Each shop
 * enters its own; nothing is assumed about a brand.
 */
export type ColorMix = {
  id: number
  name: string
  /** Price of one tube (or bottle) of color, in cents. */
  colorCents: number
  /** Its size in ounces. */
  colorOz: number
  /** Price of one bottle of developer, in cents; 0 = not entered yet. */
  developerCents: number
  /** Its size in ounces; 0 = not entered yet. */
  developerOz: number
  /** Parts of color in the ratio (the 1 in 1 : 1.5). */
  colorParts: number
  /** Parts of developer (the 1.5). 0 = color used on its own. */
  developerParts: number
}

export type MixMath = {
  /** Cents per ounce of color straight from the tube; null until price and size are in. */
  colorPerOz: number | null
  /** Cents per ounce of developer; null until price and size are in. */
  developerPerOz: number | null
  /** Cents per ounce once mixed; null until everything it needs is in. */
  mixedPerOz: number | null
  /** Ounces of mixed color one tube makes. */
  ozPerTube: number | null
  /** What's missing for the mixed cost, in plain words ('' = nothing). */
  missing: string
}

const perOz = (cents: number, oz: number) => (cents > 0 && oz > 0 ? cents / oz : null)

/** The cost of an ounce of mixed color: (color $/oz × color parts + developer $/oz × developer parts) ÷ all parts. */
export function mixMath(m: Pick<ColorMix, 'colorCents' | 'colorOz' | 'developerCents' | 'developerOz' | 'colorParts' | 'developerParts'>): MixMath {
  const colorPerOz = perOz(m.colorCents, m.colorOz)
  const developerPerOz = perOz(m.developerCents, m.developerOz)
  const cp = m.colorParts > 0 ? m.colorParts : 0
  const dp = m.developerParts > 0 ? m.developerParts : 0
  const ozPerTube = m.colorOz > 0 && cp > 0 ? (m.colorOz * (cp + dp)) / cp : null
  let missing = ''
  if (colorPerOz === null) missing = 'the tube price and size'
  else if (cp <= 0) missing = 'the mix ratio'
  else if (dp > 0 && developerPerOz === null) missing = 'the developer price and size'
  const mixedPerOz = missing ? null : (colorPerOz! * cp + (dp > 0 ? developerPerOz! * dp : 0)) / (cp + dp)
  return { colorPerOz, developerPerOz, mixedPerOz, ozPerTube, missing }
}

/** "1:1.5", "1 : 2", "1-2", "1/1.5" → parts; null when it can't be read. */
export function parseRatio(text: string): { colorParts: number; developerParts: number } | null {
  const m = text.trim().match(/^(\d+(?:\.\d+)?)\s*[:/\-x]\s*(\d+(?:\.\d+)?)$/i)
  if (!m) return null
  const colorParts = Number(m[1])
  const developerParts = Number(m[2])
  return colorParts > 0 && developerParts >= 0 ? { colorParts, developerParts } : null
}

const trim = (n: number) => String(Number(n.toFixed(2)))
export const ratioLabel = (m: Pick<ColorMix, 'colorParts' | 'developerParts'>) => `${trim(m.colorParts)} : ${trim(m.developerParts)}`

/** A plain average of the mixes that are complete, in cents per mixed ounce; null when none are. */
export function averageMixCost(mixes: ColorMix[]): number | null {
  const costs = mixes.map((m) => mixMath(m).mixedPerOz).filter((c): c is number => c !== null)
  return costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null
}

/** One-tap starts for hair color: name and ratio only; every price is the shop's own. */
export const MIX_STARTERS: Array<Pick<ColorMix, 'name' | 'colorParts' | 'developerParts'>> = [
  { name: 'Permanent color', colorParts: 1, developerParts: 1.5 },
  { name: 'Gloss / toner', colorParts: 1, developerParts: 2 },
]
