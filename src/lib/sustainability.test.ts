import { describe, expect, it } from 'vitest'
import { averageMixCost, formatWeight, fromGrams, mixMath, parseRatio, ratioLabel, toGrams, wasteMonths, wasteTotals, type WasteLog } from './sustainability'

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

describe('color mixes', () => {
  const permanent = { colorCents: 1080, colorOz: 2.06, developerCents: 1600, developerOz: 32, colorParts: 1, developerParts: 1.5 }

  it('works out the tube cost per ounce: $10.80 for 2.06 oz is about $5.24', () => {
    expect(mixMath(permanent).colorPerOz! / 100).toBeCloseTo(5.24, 2)
  })

  it('blends color and developer by the ratio', () => {
    const m = mixMath(permanent)
    // (524.27 × 1 + 50 × 1.5) ÷ 2.5
    expect(m.mixedPerOz!).toBeCloseTo((1080 / 2.06 + (1600 / 32) * 1.5) / 2.5, 6)
    expect(m.ozPerTube!).toBeCloseTo(2.06 * 2.5, 6)
    expect(m.missing).toBe('')
  })

  it('says what is missing instead of guessing', () => {
    expect(mixMath({ ...permanent, developerCents: 0 }).mixedPerOz).toBeNull()
    expect(mixMath({ ...permanent, developerCents: 0 }).missing).toContain('developer')
    expect(mixMath({ ...permanent, colorCents: 0 }).missing).toContain('tube')
    expect(mixMath({ ...permanent, developerParts: 0, developerCents: 0 }).mixedPerOz!).toBeCloseTo(1080 / 2.06, 6)
  })

  it('reads ratios the way people type them', () => {
    expect(parseRatio('1:1.5')).toEqual({ colorParts: 1, developerParts: 1.5 })
    expect(parseRatio('1 : 2')).toEqual({ colorParts: 1, developerParts: 2 })
    expect(parseRatio('1/2')).toEqual({ colorParts: 1, developerParts: 2 })
    expect(parseRatio('abc')).toBeNull()
    expect(ratioLabel({ colorParts: 1, developerParts: 1.5 })).toBe('1 : 1.5')
  })

  it('averages only complete mixes', () => {
    const gloss = { ...permanent, developerParts: 2 }
    const avg = averageMixCost([
      { id: 1, name: 'a', ...permanent },
      { id: 2, name: 'b', ...gloss },
      { id: 3, name: 'c', ...permanent, developerCents: 0 },
    ])
    expect(avg!).toBeCloseTo((mixMath(permanent).mixedPerOz! + mixMath(gloss).mixedPerOz!) / 2, 6)
  })
})
