import { describe, expect, it } from 'vitest'
import type { Product } from '@/components/inventory/types'
import { linePrice, lineSiblings } from './entry-predictions'

let id = 1
const p = (name: string, brand: string, size: string, cost: number): Product =>
  ({ id: id++, name, brand, size, unitCostCents: cost, retailPriceCents: 0, category: '', vendor: '', barcode: '', createdAt: new Date().toISOString() }) as unknown as Product

describe('linePrice', () => {
  const shelf = [
    p('Evo 7N', 'Evo', '2.06 oz', 1080),
    p('Evo 8N', 'Evo', '2.06oz', 1080),
    p('Evo 9V', 'Evo', '2.06 OZ', 1080),
    p('Evo Developer 20 Vol', 'Evo', '33.8 oz', 1600),
    p('Gloss 7N', 'Evo', '2 oz', 950),
  ]
  it('prices a new shade like the rest of its line, ignoring size spelling', () => {
    const r = linePrice(shelf, 'unitCostCents', { brand: 'evo', name: 'Evo 6RV', size: '2.06 oz' })!
    expect(r.cents).toBe(1080)
    expect(r.confident).toBe(true)
    expect(r.matches).toBe(3)
  })
  it('keeps lines and sizes apart', () => {
    expect(linePrice(shelf, 'unitCostCents', { brand: 'Evo', name: 'Gloss 9V', size: '2 oz' })!.cents).toBe(950)
    expect(linePrice(shelf, 'unitCostCents', { brand: 'Evo', name: 'Evo 6RV', size: '4 oz' })).toBeNull()
    expect(linePrice(shelf, 'unitCostCents', { brand: 'Redken', name: 'Evo 6RV', size: '2.06 oz' })).toBeNull()
    expect(linePrice(shelf, 'unitCostCents', { brand: 'Evo', name: 'Evo Developer 30 Vol', size: '33.8 oz' })!.cents).toBe(1600)
  })
})

describe('lineSiblings', () => {
  it('moves the shades that shared the old price (or had none), not ones priced on purpose', () => {
    const shelf = [
      p('Evo 7N', 'Evo', '2.06 oz', 1080),
      p('Evo 8N', 'Evo', '2.06 oz', 1080),
      p('Evo 10V', 'Evo', '2.06 oz', 0),
      p('Evo Clear', 'Evo', '2.06 oz', 1080),
      p('Evo 9V', 'Evo', '2.06 oz', 1250),
      p('Evo 6N', 'Evo', '4 oz', 1080),
    ]
    const names = lineSiblings(shelf, shelf[0], 1080).map((x) => x.name)
    expect(names).toEqual(['Evo 8N', 'Evo 10V'])
  })
})
