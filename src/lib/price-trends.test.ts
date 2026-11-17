import { describe, expect, it } from 'vitest'
import { buildPriceWatch } from './price-trends'

const prod = (id: number, name: string, vendor: string, out30: number) => ({ id, name, brand: '', size: '', vendor, category: id < 3 ? 'Color' : 'Supplies', out30 })

describe('buildPriceWatch', () => {
  const now = new Date('2026-11-17T12:00:00Z')
  const products = [prod(1, 'Evo 7N', 'SalonCentric', 10), prod(2, 'Developer', 'SalonCentric', 2), prod(3, 'Foils', 'Amazon', 0), prod(4, 'Gloves', 'CosmoProf', 5)]
  const history = [
    { productId: 1, cents: 1000, at: '2025-06-01T00:00:00Z', vendor: 'SalonCentric', source: 'baseline' }, // before window → start price
    { productId: 1, cents: 1080, at: '2026-08-10T00:00:00Z', vendor: 'SalonCentric', source: 'invoice' },
    { productId: 2, cents: 1600, at: '2026-01-05T00:00:00Z', vendor: 'SalonCentric', source: 'invoice' },
    { productId: 2, cents: 1500, at: '2026-10-05T00:00:00Z', vendor: 'SalonCentric', source: 'invoice' },
    { productId: 3, cents: 2400, at: '2026-03-01T00:00:00Z', vendor: 'Amazon', source: 'invoice' }, // one price: no trend
    { productId: 4, cents: 900, at: '2024-01-01T00:00:00Z', vendor: 'CosmoProf', source: 'baseline' }, // nothing inside the window
  ]
  const w = buildPriceWatch(history, products, now)

  it('only trends products with a price change on record in the window', () => {
    expect(w.tracked).toBe(2)
    expect(w.risers.map((m) => m.name)).toEqual(['Evo 7N'])
    expect(w.risers[0].changePct).toBe(8)
    expect(w.fallers[0].changePct).toBe(-6.3)
  })

  it('weights the basket by use and prices the monthly impact', () => {
    // (1080*10 + 1500*2) / (1000*10 + 1600*2) = 13800/13200 → +4.5%
    expect(w.basketPct).toBe(4.5)
    expect(w.monthlyImpactCents).toBe(80 * 10 - 100 * 2)
    expect(w.index).toHaveLength(12)
    expect(w.index[0].value).toBe(100)
    expect(w.index.at(-1)!.value).toBe(104.5)
  })

  it('is honest with no data', () => {
    const empty = buildPriceWatch([], products, now)
    expect(empty.basketPct).toBeNull()
    expect(empty.index).toEqual([])
  })
})
