import { describe, expect, it } from 'vitest'
import { formatWeight, fromGrams, toGrams, wasteMonths, wasteTotals, type WasteLog } from './sustainability'

const log = (month: string, grams: number, costCentsPerOz = 0): WasteLog => ({ id: Number(month.replace('-', '')), month, grams, costCentsPerOz, note: '', loggedBy: '' })

describe('weights', () => {
  it('converts between units and back', () => {
    expect(toGrams(1, 'lb')).toBe(454)
    expect(toGrams(16, 'oz')).toBe(454)
    expect(fromGrams(toGrams(2.5, 'kg'), 'kg')).toBe(2.5)
    expect(formatWeight(454, 'lb')).toBe('1.0 lb')
  })
})

describe('color waste months', () => {
  it('treats the first month as the start and shows change after that', () => {
    const m = wasteMonths([log('2026-10', 1000), log('2026-09', 1200)])
    expect(m.map((x) => x.month)).toEqual(['2026-09', '2026-10'])
    expect(m[0].changeGrams).toBeNull()
    expect(m[1].changeGrams).toBe(-200)
    expect(m[1].changePct).toBe(-17)
  })

  it('only shows money when the shop gave a cost per ounce', () => {
    const m = wasteMonths([log('2026-09', 1200), log('2026-10', 1000)])
    expect(m[1].savedVsLastCents).toBeNull()
    expect(wasteTotals(m).savedCents).toBeNull()
  })

  it('values the waste avoided at that month’s cost, and counts more waste as a cost', () => {
    // 283.5 g = 10 oz less, at $1.00/oz = $10.00 kept.
    const m = wasteMonths([log('2026-09', 1000, 100), log('2026-10', 717, 100), log('2026-11', 1000, 100)])
    expect(m[1].savedVsLastCents).toBe(998)
    expect(m[2].savedVsLastCents).toBe(-998)
    expect(m[1].savedVsStartCents).toBe(998)
    expect(wasteTotals(m).savedCents).toBe(0)
  })
})
