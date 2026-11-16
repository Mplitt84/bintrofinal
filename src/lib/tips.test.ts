import { describe, expect, it } from 'vitest'
import { TIPS, TIPS_PER_WEEK, TIP_CATEGORIES, quarterOf, tipFits, tipIsForTrade, weekOfQuarter, weeklyTips } from './tips'

describe('tips', () => {
  it('has unique ids and a known category for every tip', () => {
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length)
    const cats = new Set(TIP_CATEGORIES.map((c) => c.id))
    for (const t of TIPS) expect(cats.has(t.category)).toBe(true)
  })

  it('sends a multi-trade tip to each trade on its list and nobody else', () => {
    const tip = TIPS.find((t) => t.id === 'nails-short-massage')!
    expect(tipFits(tip, 'nails')).toBe(true)
    expect(tipFits(tip, 'spa')).toBe(true)
    expect(tipFits(tip, 'barber')).toBe(false)
    expect(tipIsForTrade(tip, 'spa')).toBe(true)
  })

  it('counts all-beauty tips as fitting, but not as trade-specific', () => {
    const tip = TIPS.find((t) => t.id === 'beauty-clean-before-disinfect')!
    expect(tipFits(tip, 'tattoo')).toBe(true)
    expect(tipIsForTrade(tip, 'tattoo')).toBe(false)
  })

  it('gives nails far more than one trade tip now', () => {
    expect(TIPS.filter((t) => tipIsForTrade(t, 'nails')).length).toBeGreaterThan(10)
  })
})

describe('weekly rotation', () => {
  const nov16 = new Date(2026, 10, 16) // Monday
  it('works out the quarter and the week inside it', () => {
    expect(quarterOf(nov16)).toBe('2026-Q4')
    expect(weekOfQuarter(new Date(2026, 9, 1))).toBe(0)
    expect(weekOfQuarter(new Date(2026, 9, 5))).toBe(1) // first Monday after Oct 1 (a Thursday)
    expect(weekOfQuarter(nov16)).toBe(7)
  })

  it('keeps the same small set all week and moves on the next week', () => {
    const mon = weeklyTips('nails', nov16)
    const sun = weeklyTips('nails', new Date(2026, 10, 22))
    const next = weeklyTips('nails', new Date(2026, 10, 23))
    expect(mon).toHaveLength(TIPS_PER_WEEK)
    expect(sun.map((t) => t.id)).toEqual(mon.map((t) => t.id))
    expect(next.map((t) => t.id)).not.toEqual(mon.map((t) => t.id))
    for (const t of mon) expect(tipFits(t, 'nails')).toBe(true)
  })

  it('leads with tips added this quarter and mixes the themes', () => {
    const first = weeklyTips('nails', new Date(2026, 9, 1))
    expect(first.every((t) => t.added === '2026-Q4')).toBe(true)
    expect(new Set(first.map((t) => t.category)).size).toBeGreaterThan(2)
  })

  it('shows every fitting tip over enough weeks', () => {
    const fits = TIPS.filter((t) => tipFits(t, 'nails'))
    const seen = new Set<string>()
    const weeks = Math.ceil(fits.length / TIPS_PER_WEEK)
    for (let w = 0; w < weeks; w++) {
      for (const t of weeklyTips('nails', new Date(2026, 9, 5 + w * 7))) seen.add(t.id)
    }
    expect(seen.size).toBe(fits.length)
  })
})
