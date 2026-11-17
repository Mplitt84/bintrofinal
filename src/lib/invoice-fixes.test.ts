import { describe, expect, it } from 'vitest'
import { invoiceFixes, type FixProduct } from './invoice-fixes'

let id = 1
const p = (name: string, cost: number, size = ''): FixProduct => ({ id: id++, name, brand: 'Alfaparf Milano', size, category: 'Color', vendor: '', unitCostCents: cost })

describe('invoiceFixes', () => {
  const evo731 = p('EVO 7.31 Medium Blonde Golden Ash', 1104)
  const evo81 = p('EVO 8.1 Light Ash Blonde', 1300) // staff guess
  const evo4 = p('EVO 4 Medium Brown', 0)
  const evo9 = p('EVO 9 Very Light Blonde', 1104) // already right
  const gloss = p('Gloss Toner 08.21', 900, '60 ml') // guess, own invoice says 836
  const gloss2 = p('Gloss Toner 09.23', 900, '60 ml')
  const shelf = [evo731, evo81, evo4, evo9, gloss, gloss2]
  const evidence = [
    { productId: evo731.id, cents: 1104, at: '2026-10-02T12:00:00Z', vendor: 'Salon Service Group', from: 'invoice' as const },
    { productId: gloss.id, cents: 820, at: '2026-08-01T12:00:00Z', vendor: 'SSG', from: 'delivery' as const },
    { productId: gloss.id, cents: 836, at: '2026-10-02T12:00:00Z', vendor: 'SSG', from: 'invoice' as const },
  ]
  const { groups } = invoiceFixes(shelf, evidence, new Date('2026-11-17T12:00:00Z'))
  const all = groups.flatMap((g) => g.fixes)

  it('corrects guesses across the line to the invoice price, leaving right ones alone', () => {
    expect(all.find((f) => f.productId === evo81.id)).toMatchObject({ cents: 1104, own: false, sure: true })
    expect(all.find((f) => f.productId === evo4.id)!.cents).toBe(1104)
    expect(all.some((f) => f.productId === evo9.id || f.productId === evo731.id)).toBe(false)
  })

  it("uses a product's own newest invoice first, and its line follows", () => {
    expect(all.find((f) => f.productId === gloss.id)).toMatchObject({ cents: 836, own: true })
    expect(all.find((f) => f.productId === gloss2.id)!.cents).toBe(836)
    expect(groups.map((g) => g.line).sort()).toEqual(['Alfaparf Milano · EVO', 'Alfaparf Milano · Gloss Toner'])
  })
})

describe('old invoices', () => {
  it('start unticked and say how old they are', () => {
    const a = p('EVO 7.31 Medium Blonde Golden Ash', 1104)
    const b = p('EVO 8.1 Light Ash Blonde', 1104)
    const { groups } = invoiceFixes([a, b], [{ productId: a.id, cents: 988, at: '2024-10-28T12:00:00Z', vendor: 'Alfaparf Group', from: 'invoice' }], new Date('2026-11-17T12:00:00Z'))
    const fixes = groups[0].fixes
    expect(fixes.every((f) => f.old && !f.sure)).toBe(true)
    expect(fixes[0].reason).toMatch(/invoice is 2 years old/)
  })
})
