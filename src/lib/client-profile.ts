import type { ClientFormula } from './formulas'

/** What a business keeps about one client, beyond their visits. Every field is optional. */
export type ClientProfile = {
  id: number
  name: string
  phone: string
  email: string
  /** MM-DD or "". */
  birthday: string
  sensitivities: string
  preferences: string
  notes: string
  /** Rebook every N days; 0 = work it out from their visits. */
  rebookDays: number
}

export type ClientProfileInput = Omit<ClientProfile, 'id'>

export const emptyProfile = (name: string): ClientProfileInput => ({
  name,
  phone: '',
  email: '',
  birthday: '',
  sensitivities: '',
  preferences: '',
  notes: '',
  rebookDays: 0,
})

/** How client names are compared: "Ana R " and "ana r" are one client. */
export const clientKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

const DAY = 86_400_000
const dayNum = (ymd: string) => Math.round(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / DAY)
export const addDays = (ymd: string, n: number) => new Date((dayNum(ymd) + n) * DAY).toISOString().slice(0, 10)

export type BoughtProduct = { productId: number | null; name: string; qty: number; cents: number; lastOn: string }

export type ClientSummary = {
  visits: number
  firstVisit: string
  lastVisit: string
  daysSinceLast: number
  /** Typical days between visits (median of gaps), null with fewer than 2 visits. */
  rhythmDays: number | null
  /** When they're due back (profile's own rebook days first, else their rhythm), "" when unknown. */
  dueOn: string
  overdue: boolean
  /** Take-home products they bought (ticked "Bought"), most recent first. */
  bought: BoughtProduct[]
  retailCents: number
  /** Recommended take-homes that didn't go home. */
  recommendedNotBought: number
  /** The next follow-up date on any visit that is today or later. */
  nextFollowUp: string
  /** Who has seen them, most visits first. */
  seenBy: { name: string; visits: number }[]
}

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/**
 * Everything the client page shows that's worked out from their visits (pure, tested).
 * `retailCents` = each product's current retail price, by product id.
 */
export function clientSummary(
  visits: ClientFormula[],
  retailCents: Map<number, number>,
  today: string,
  rebookDays = 0,
): ClientSummary {
  const sorted = [...visits].sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : -1))
  const dates = [...new Set(sorted.map((v) => v.serviceDate))].sort()
  const gaps = dates.slice(1).map((d, i) => dayNum(d) - dayNum(dates[i])).filter((g) => g > 0)
  const rhythmDays = gaps.length ? median(gaps) : null
  const lastVisit = dates.at(-1) ?? ''
  const every = rebookDays > 0 ? rebookDays : rhythmDays
  const dueOn = lastVisit && every ? addDays(lastVisit, every) : ''

  const bought = new Map<string, BoughtProduct>()
  let notBought = 0
  for (const v of sorted) {
    for (const r of v.retail) {
      if (!r.sold) {
        notBought++
        continue
      }
      const key = r.productId != null ? `#${r.productId}` : r.name.trim().toLowerCase()
      const price = r.productId != null ? (retailCents.get(r.productId) ?? 0) : 0
      const prev = bought.get(key)
      if (prev) {
        prev.qty += r.qty
        prev.cents += price * r.qty
      } else {
        bought.set(key, { productId: r.productId, name: r.name, qty: r.qty, cents: price * r.qty, lastOn: v.serviceDate })
      }
    }
  }

  const staff = new Map<string, number>()
  for (const v of sorted) if (v.staffName) staff.set(v.staffName, (staff.get(v.staffName) ?? 0) + 1)

  const follow = sorted
    .map((v) => v.followUpOn)
    .filter((d) => d && d >= today)
    .sort()

  return {
    visits: sorted.length,
    firstVisit: dates[0] ?? '',
    lastVisit,
    daysSinceLast: lastVisit ? Math.max(0, dayNum(today) - dayNum(lastVisit)) : 0,
    rhythmDays,
    dueOn,
    overdue: Boolean(dueOn && dueOn < today),
    bought: [...bought.values()],
    retailCents: [...bought.values()].reduce((s, b) => s + b.cents, 0),
    recommendedNotBought: notBought,
    nextFollowUp: follow[0] ?? '',
    seenBy: [...staff.entries()].map(([name, n]) => ({ name, visits: n })).sort((a, b) => b.visits - a.visits),
  }
}

/** Days until their next birthday (0 = today), null when no birthday is saved. */
export function daysToBirthday(birthday: string, today: string): number | null {
  const m = /^(\d{2})-(\d{2})$/.exec(birthday)
  if (!m) return null
  const year = +today.slice(0, 4)
  for (const y of [year, year + 1]) {
    // Feb 29 counts as Feb 28 in other years.
    const md = birthday === '02-29' && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? '02-28' : birthday
    const d = dayNum(`${y}-${md}`) - dayNum(today)
    if (d >= 0) return d
  }
  return null
}

/** "05-14" → "May 14". */
export function birthdayLabel(birthday: string) {
  const m = /^(\d{2})-(\d{2})$/.exec(birthday)
  if (!m) return ''
  return new Date(Date.UTC(2000, +m[1] - 1, +m[2])).toLocaleDateString([], { month: 'long', day: 'numeric', timeZone: 'UTC' })
}

/** A phone number reduced to what a tel: / sms: link needs. */
export const dialable = (phone: string) => phone.replace(/[^\d+]/g, '')
