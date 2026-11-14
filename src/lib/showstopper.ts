/**
 * Showstopper's arithmetic (client-safe, pure, tested).
 *
 * Reports answers "how did the business do"; this answers "how are we doing" for each
 * person on the team, so the screen can celebrate it and give them something to aim at.
 *
 * Every figure is a record Bintro already holds: units scanned out under their name,
 * the take-home products written on their client records, and whether those went home.
 * Nothing is scored, weighted or invented — a badge is a fact about the period, and
 * anything the numbers cannot see is listed in `blindSpots` so a thin month is read as
 * thin records rather than as thin work.
 */
import type { RetailTip, TipPattern } from './retail-tips.js'
import { tipsFor } from './retail-tips.js'

/** A sale: one unit of a "sold" product leaving under someone's name. */
export type SaleRow = {
  staffName: string
  productId: number
  name: string
  brand: string
  imageUrl: string
  units: number
  centsEach: number
  costEach: number
  at: Date
  /** The client it was written against, when it came from a client record. */
  client: string
}

/** A visit from the client records, with what was recommended on it. */
export type VisitRow = {
  staffName: string
  client: string
  at: Date
  /** Take-home lines written on the visit. */
  recommended: number
  /** Of those, the ones ticked as bought. */
  takenHome: number
}

/** What a team member is aiming at this month, and the habits they picked. */
export type Goal = {
  staffName: string
  targetCents: number
  focusTips: string[]
}

export type BadgeId =
  | 'top-seller'
  | 'most-improved'
  | 'best-prescriber'
  | 'widest-range'
  | 'goal-hit'
  | 'first-sale'

export type Badge = {
  id: BadgeId
  label: string
  /** The fact behind it, so a badge is never a mystery. */
  because: string
}

export type StaffCard = {
  name: string
  initials: string
  soldCents: number
  soldUnits: number
  profitCents: number
  prevSoldCents: number
  /** Distinct products they sold: how much of the shelf they know. */
  distinctProducts: number
  /** Days they logged at least one sale. */
  daysSold: number
  visits: number
  recommended: number
  takenHome: number
  /** Of the clients who bought, how many bought on more than one visit. */
  buyers: number
  repeatBuyers: number
  /** Retail per client seen, when there are visits to divide by. */
  perVisitCents: number | null
  /** Take-home rate: of what they wrote down, how much went home. */
  attachRate: number | null
  /** What the business's commission rate makes of it; null when no rate is set. */
  earnedCents: number | null
  top: { productId: number; name: string; brand: string; imageUrl: string; units: number; cents: number }[]
  badges: Badge[]
  goal: Goal | null
  /** Share of the goal reached, 0–1+; null when no goal is set. */
  goalProgress: number | null
  tips: RetailTip[]
}

/**
 * Names that are not a person: the blank the scanner leaves when nobody picked a name,
 * the label older prescription sales were logged under, and the till Square sales
 * arrive on. They hold real sales, so they count in the team total — but a rewards
 * board that ranks "Square POS" above a stylist is worse than useless.
 */
export const PLACEHOLDER_NAMES = ['not recorded', 'formulas', 'square pos']

export function isPlaceholder(name: string) {
  return PLACEHOLDER_NAMES.includes(name.trim().toLowerCase())
}

export type Showstopper = {
  periodLabel: string
  /** Everyone with something to show this period, strongest first. */
  cards: StaffCard[]
  /** Team members with no retail logged yet this period — still cards, so a goal
   * can be set with them before the month gets away. */
  quiet: StaffCard[]
  teamSoldCents: number
  teamPrevSoldCents: number
  /** Retail that is real but belongs to no card: unnamed scans and Square sales. */
  uncreditedCents: number
  teamAttachRate: number | null
  commissionPct: number
  /** What these numbers cannot see, said plainly. */
  blindSpots: string[]
}

export type ShowstopperInput = {
  periodLabel: string
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  sales: SaleRow[]
  visits: VisitRow[]
  /**
   * Everyone on the team, so somebody with a quiet month is still named. A member
   * with `sellsRetail: false` — a contractor or back-of-house person who never rings
   * anything up — is left off the board entirely rather than shown with nothing sold.
   */
  team: { name: string; isProvider: boolean; sellsRetail: boolean }[]
  goals: Goal[]
  commissionPct: number
  businessType: string
}

const TOP_PRODUCTS = 3

/** Initials for the avatar circle, from however the name is written. */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** A local-day key, so "days sold" follows the shop's day, not UTC. */
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

type Working = {
  name: string
  soldCents: number
  soldUnits: number
  profitCents: number
  prevSoldCents: number
  products: Map<number, { productId: number; name: string; brand: string; imageUrl: string; units: number; cents: number }>
  days: Set<string>
  visits: number
  recommended: number
  takenHome: number
  clientBuys: Map<string, number>
}

function blank(name: string): Working {
  return {
    name,
    soldCents: 0,
    soldUnits: 0,
    profitCents: 0,
    prevSoldCents: 0,
    products: new Map(),
    days: new Set(),
    visits: 0,
    recommended: 0,
    takenHome: 0,
    clientBuys: new Map(),
  }
}

/**
 * Everyone's period, with the badges worked out across the team once every card's
 * numbers are known.
 */
export function buildShowstopper(input: ShowstopperInput): Showstopper {
  const { start, end, prevStart, prevEnd } = input
  const people = new Map<string, Working>()
  const get = (name: string) => {
    const key = name.trim() || 'Not recorded'
    const found = people.get(key) ?? blank(key)
    people.set(key, found)
    return found
  }

  for (const s of input.sales) {
    const at = s.at.getTime()
    const now = at >= start.getTime() && at < end.getTime()
    const before = at >= prevStart.getTime() && at < prevEnd.getTime()
    if (!now && !before) continue
    const p = get(s.staffName)
    const cents = s.units * s.centsEach
    if (before) {
      p.prevSoldCents += cents
      continue
    }
    p.soldCents += cents
    p.soldUnits += s.units
    p.profitCents += cents - s.units * s.costEach
    p.days.add(dayKey(s.at))
    const row = p.products.get(s.productId) ?? {
      productId: s.productId,
      name: s.name,
      brand: s.brand,
      imageUrl: s.imageUrl,
      units: 0,
      cents: 0,
    }
    row.units += s.units
    row.cents += cents
    p.products.set(s.productId, row)
    const client = s.client.trim().toLowerCase()
    if (client) p.clientBuys.set(client, (p.clientBuys.get(client) ?? 0) + 1)
  }

  for (const v of input.visits) {
    const at = v.at.getTime()
    if (at < start.getTime() || at >= end.getTime()) continue
    const p = get(v.staffName)
    p.visits += 1
    p.recommended += v.recommended
    p.takenHome += v.takenHome
  }

  // Everyone who sells gets a place, even on a quiet month.
  const offBoard = new Set(
    input.team.filter((m) => !m.sellsRetail).map((m) => m.name.trim().toLowerCase()),
  )
  for (const member of input.team) if (member.sellsRetail) get(member.name)

  const goalFor = (name: string) =>
    input.goals.find((g) => g.staffName.trim().toLowerCase() === name.trim().toLowerCase()) ?? null

  const cards: StaffCard[] = [...people.values()].map((p) => {
    const buyers = p.clientBuys.size
    const repeatBuyers = [...p.clientBuys.values()].filter((n) => n > 1).length
    const goal = goalFor(p.name)
    const pattern: TipPattern = {
      visits: p.visits,
      recommended: p.recommended,
      takenHome: p.takenHome,
      distinctProducts: p.products.size,
      soldUnits: p.soldUnits,
      repeatBuyers,
      buyers,
    }
    return {
      name: p.name,
      initials: initialsOf(p.name),
      soldCents: p.soldCents,
      soldUnits: p.soldUnits,
      profitCents: p.profitCents,
      prevSoldCents: p.prevSoldCents,
      distinctProducts: p.products.size,
      daysSold: p.days.size,
      visits: p.visits,
      recommended: p.recommended,
      takenHome: p.takenHome,
      buyers,
      repeatBuyers,
      perVisitCents: p.visits > 0 ? Math.round(p.soldCents / p.visits) : null,
      attachRate: p.recommended > 0 ? p.takenHome / p.recommended : null,
      earnedCents: input.commissionPct > 0 ? Math.round((p.soldCents * input.commissionPct) / 100) : null,
      top: [...p.products.values()].sort((a, b) => b.cents - a.cents || b.units - a.units).slice(0, TOP_PRODUCTS),
      badges: [],
      goal,
      goalProgress: goal && goal.targetCents > 0 ? p.soldCents / goal.targetCents : null,
      tips: tipsFor(pattern, input.businessType),
    }
  })

  awardBadges(cards.filter((c) => !offBoard.has(c.name.trim().toLowerCase())))

  const real = cards.filter((c) => !isPlaceholder(c.name) && !offBoard.has(c.name.trim().toLowerCase()))
  const active = real.filter((c) => c.soldUnits > 0 || c.visits > 0).sort((a, b) => b.soldCents - a.soldCents)
  const quiet = real.filter((c) => c.soldUnits === 0 && c.visits === 0).sort((a, b) => a.name.localeCompare(b.name))
  const teamRecommended = real.reduce((n, c) => n + c.recommended, 0)
  const teamTakenHome = real.reduce((n, c) => n + c.takenHome, 0)

  return {
    periodLabel: input.periodLabel,
    cards: active,
    quiet,
    teamSoldCents: cards.reduce((n, c) => n + c.soldCents, 0),
    teamPrevSoldCents: cards.reduce((n, c) => n + c.prevSoldCents, 0),
    uncreditedCents: cards
      .filter((c) => isPlaceholder(c.name) || offBoard.has(c.name.trim().toLowerCase()))
      .reduce((n, c) => n + c.soldCents, 0),
    teamAttachRate: teamRecommended > 0 ? teamTakenHome / teamRecommended : null,
    commissionPct: input.commissionPct,
    blindSpots: blindSpotsFor(cards, offBoard),
  }
}

/** Minimums, so a badge means something rather than rewarding a single lucky sale. */
export const BADGE_RULES = {
  /** Sales before "most improved" is worth saying. */
  improvedFloor: 2_000,
  /** Take-home lines before a prescribing badge can be earned. */
  prescriberRecs: 4,
  /** Distinct products before the range badge can be earned. */
  rangeProducts: 4,
}

/** Badges are facts about the period: who led, who grew, who got it home. */
function awardBadges(all: StaffCard[]) {
  const cards = all.filter((c) => !isPlaceholder(c.name))
  const selling = cards.filter((c) => c.soldCents > 0)
  if (!selling.length) return

  const top = selling.reduce((best, c) => (c.soldCents > best.soldCents ? c : best))
  top.badges.push({ id: 'top-seller', label: 'Top seller', because: 'Most retail sold this period' })

  const grew = selling
    .filter((c) => c.prevSoldCents > 0 && c.soldCents > c.prevSoldCents && c.soldCents >= BADGE_RULES.improvedFloor)
    .map((c) => ({ card: c, lift: (c.soldCents - c.prevSoldCents) / c.prevSoldCents }))
    .sort((a, b) => b.lift - a.lift)[0]
  if (grew) {
    grew.card.badges.push({
      id: 'most-improved',
      label: 'Most improved',
      because: `Up ${Math.round(grew.lift * 100)}% on last period`,
    })
  }

  const prescriber = cards
    .filter((c) => c.recommended >= BADGE_RULES.prescriberRecs && c.attachRate !== null)
    .sort((a, b) => (b.attachRate ?? 0) - (a.attachRate ?? 0))[0]
  if (prescriber && (prescriber.attachRate ?? 0) > 0) {
    prescriber.badges.push({
      id: 'best-prescriber',
      label: 'Best prescriber',
      because: `${Math.round((prescriber.attachRate ?? 0) * 100)}% of what they wrote down went home`,
    })
  }

  const range = selling
    .filter((c) => c.distinctProducts >= BADGE_RULES.rangeProducts)
    .sort((a, b) => b.distinctProducts - a.distinctProducts)[0]
  if (range) {
    range.badges.push({
      id: 'widest-range',
      label: 'Knows the shelf',
      because: `Sold ${range.distinctProducts} different products`,
    })
  }

  for (const c of cards) {
    if (c.goalProgress !== null && c.goalProgress >= 1) {
      c.badges.push({ id: 'goal-hit', label: 'Goal met', because: 'Reached the goal they set this month' })
    }
    if (c.soldCents > 0 && c.prevSoldCents === 0) {
      c.badges.push({ id: 'first-sale', label: 'On the board', because: 'First retail logged since last period' })
    }
  }
}

/** What the numbers cannot see — so nobody reads a quiet card as a quiet person. */
function blindSpotsFor(cards: StaffCard[], offBoard: Set<string>): string[] {
  const notes: string[] = []
  // Somebody marked as not selling should not quietly swallow a sale: if money is
  // logged under their name it was probably scanned by the wrong person.
  for (const c of cards) {
    if (!offBoard.has(c.name.trim().toLowerCase()) || c.soldCents <= 0) continue
    notes.push(
      `${c.name} is marked as not selling retail, so they are off the board — but ${(c.soldCents / 100).toFixed(2)} is logged under their name. Worth checking who scanned it.`,
    )
  }
  const unnamed = cards.filter((c) => isPlaceholder(c.name) && !c.name.toLowerCase().includes('square'))
  const unnamedUnits = unnamed.reduce((n, c) => n + c.soldUnits, 0)
  if (unnamedUnits > 0) {
    notes.push(
      `${unnamedUnits} ${unnamedUnits === 1 ? 'item' : 'items'} sold with nobody's name on them, so they are on no card. Picking a name at the scanner, and naming the team member on a client record, is what credits them.`,
    )
  }
  const unnamedVisits = unnamed.reduce((n, c) => n + c.visits, 0)
  if (unnamedVisits > 0) {
    notes.push(
      `${unnamedVisits} ${unnamedVisits === 1 ? 'visit' : 'visits'} on the client records have no team member on them.`,
    )
  }
  const square = cards.find((c) => c.name.toLowerCase().includes('square') && c.soldUnits > 0)
  if (square) {
    notes.push('Sales that came in from Square are counted in the team total but credited to nobody, because Square does not say who rang them up.')
  }
  if (cards.some((c) => c.visits > 0 && c.recommended === 0)) {
    notes.push('Visits with no take-home written on the record count as a visit, not as a recommendation that was turned down.')
  }
  notes.push('Retail is counted at the shelf price, and only when it was scanned out or ticked on a client record.')
  return notes
}

/** The month key a goal is stored under, in the shop's own local time. */
export function goalPeriodKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
