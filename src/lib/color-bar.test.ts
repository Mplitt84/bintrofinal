import { describe, expect, it } from 'vitest'
import { bowlReport, costPerGram, gramsPerUnit, lineCost, serviceProfits, suggestedCharge, wasteCents, type Bowl, type Service } from './color-bar'

const tube = { name: 'EVO 7.1', size: '60 ml', unitCostCents: 900 }
const bowl = (over: Partial<Bowl>): Bowl => ({
  id: 1, dayKey: '2026-11-17', clientName: 'Ana', serviceId: 1, serviceName: 'Root touch-up', staffName: 'Beth',
  lines: [{ productId: 1, name: 'EVO 7.1', grams: 40, costCents: 600 }, { productId: 2, name: 'Dev 20', grams: 60, costCents: 120 }],
  leftoverGrams: 10, costCents: 720, chargedCents: 800, note: '', ...over,
})

describe('grams and cost', () => {
  it('reads grams from sizes', () => {
    expect(gramsPerUnit({ name: '', size: '60 ml' })).toBe(60)
    expect(gramsPerUnit({ name: '', size: '1 kg' })).toBe(1000)
    expect(gramsPerUnit({ name: 'Foil', size: '500 ct' })).toBeNull()
    expect(gramsPerUnit({ name: 'Gloss 2oz', size: '' })).toBeCloseTo(59.14)
  })
  it('costs a line and rounds up', () => {
    expect(costPerGram(tube)).toBe(15)
    expect(lineCost(tube, 30)).toBe(450)
    expect(lineCost({ ...tube, unitCostCents: 1000 }, 7)).toBe(117) // 116.67 → 117
    expect(lineCost({ ...tube, unitCostCents: 0 }, 30)).toBe(0)
  })
  it('suggests a product charge with markup, to the next 50¢', () => {
    expect(suggestedCharge(720, 0)).toBe(750)
    expect(suggestedCharge(720, 25)).toBe(900)
    expect(suggestedCharge(0, 25)).toBe(0)
  })
})

describe('reports', () => {
  it('works out waste and groups by stylist and service', () => {
    expect(wasteCents(bowl({}))).toBe(72)
    const r = bowlReport([bowl({}), bowl({ id: 2, staffName: 'KaNesha', leftoverGrams: 0, costCents: 500 })])
    expect(r.total).toMatchObject({ bowls: 2, grams: 200, wasteGrams: 10, wastePct: 5, costCents: 1220, avgCostCents: 610 })
    expect(r.byStaff.map((s) => s.key)).toEqual(['Beth', 'KaNesha'])
    expect(r.byService[0]).toMatchObject({ key: 'Root touch-up', bowls: 2 })
  })

  it('profit per service uses bowls first, then the estimate, then labor', () => {
    const services: Service[] = [
      { id: 1, name: 'Root touch-up', priceCents: 9500, minutes: 90, productCents: 1500, active: true },
      { id: 2, name: 'Silk press', priceCents: 8500, minutes: 60, productCents: 400, active: true },
      { id: 3, name: 'Old', priceCents: 1, minutes: 0, productCents: 0, active: false },
    ]
    const r = serviceProfits(services, [bowl({ costCents: 700 }), bowl({ costCents: 900 })], 3000)
    expect(r).toHaveLength(2)
    const root = r.find((x) => x.service.id === 1)!
    expect(root).toMatchObject({ productCents: 800, productFrom: 'bowls', bowls: 2, laborCents: 4500, profitCents: 4200, marginPct: 44 })
    expect(r.find((x) => x.service.id === 2)).toMatchObject({ productFrom: 'estimate', profitCents: 5100 })
    expect(r[0].service.id).toBe(1) // thinnest margin first
  })
})
