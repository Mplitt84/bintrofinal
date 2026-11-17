import { describe, expect, it } from 'vitest'
import type { Product } from '@/components/inventory/types'
import { linePrice, lineSiblings, sameLine } from './entry-predictions'

let id = 1
const p = (name: string, brand: string, size: string, cost: number, category = 'Color'): Product =>
  ({ id: id++, name, brand, size, category, unitCostCents: cost, retailPriceCents: 0, vendor: '', barcode: '', createdAt: new Date().toISOString() }) as unknown as Product

const A = 'Alfaparf Milano'
describe('sameLine — names from a real salon shelf', () => {
  it('groups shades named with a code and a description', () => {
    expect(sameLine(p('EVO 7.31 Medium Blonde Golden Ash', A, '', 0), p('EVO 10 Lightest Natural Blonde', A, '2.06oz', 0))).toBe(true)
    expect(sameLine(p('EVO 05N Light Brown', A, '60 ml', 0), p('EVO 9 NB Warm Very Light Blonde', A, '', 0))).toBe(true)
    expect(sameLine(p('EVO .03 Soft Gold', A, '', 0), p('EVO 000sss Lifting Reinforcer', A, '', 0))).toBe(true)
    expect(sameLine(p('Gloss Toner 08.21', A, '60 ml', 0), p('Gloss Toner 010N', A, '', 0))).toBe(true)
    expect(sameLine(p('Colorwear 4.66 Medium Intense Red Brown', A, '2.05oz', 0), p('Colorwear 9.13 very light blonde ash gold', A, '60 ml', 0))).toBe(true)
    expect(sameLine(p('Alfaparf Milano 10 Volume Developer', A, '33.8 oz', 0), p('Alfaparf Milano 20 Volume Developer', A, '1 L', 0))).toBe(true)
  })
  it('keeps different lines apart', () => {
    expect(sameLine(p('EVO 7 Medium Blonde', A, '', 0), p('Gloss Toner 07N', A, '', 0))).toBe(false)
    expect(sameLine(p('EVO 7 Medium Blonde', A, '', 0), p('Colorwear 7 Medium Pure Blonde', A, '', 0))).toBe(false)
    expect(sameLine(p('EVO 7 Medium Blonde', A, '', 0), p('EVO Harmonizer .01 Soft Ash', A, '', 0))).toBe(false)
    expect(sameLine(p('Gloss Toner 08.21', A, '60 ml', 0), p('Gloss Toner 08.2', A, '4 oz', 0))).toBe(false)
  })
  it('groups color-named lines, never shampoo and conditioner', () => {
    expect(sameLine(p('Danger Jones Adrenaline', 'Danger Jones', '', 0), p('Danger Jones Cheap Date', 'Danger Jones', '', 0))).toBe(true)
    expect(
      sameLine(
        p('Pravana Chromasilk Vivids Direct Dye Blue topaz', 'Pravana', '90 ml', 0),
        p('Pravana Chromasilk Vivids Direct Dye Emerald', 'Pravana', '90 ml', 0),
      ),
    ).toBe(true)
    expect(
      sameLine(
        p('Cult + King Astral Amino Shampoo', 'Cult + King', '32 fl oz', 0, 'Back bar'),
        p('Cult + King Astral Amino Conditioner', 'Cult + King', '32 fl oz', 0, 'Back bar'),
      ),
    ).toBe(false)
  })
})

describe('linePrice and lineSiblings', () => {
  const shelf = [
    p('EVO 7.31 Medium Blonde Golden Ash', A, '', 1104),
    p('EVO 8.1 Light Ash Blonde', A, '', 1104),
    p('EVO 10.21 Lightest Blonde Violet Ash', A, '2.06oz', 1104),
    p('EVO 6.66I Dark Blonde Intense Red', A, '', 0),
    p('EVO 9NI Intense Very Light Blonde', A, '', 1250),
    p('Gloss Toner 08.21', A, '60 ml', 836),
  ]
  it('prices a new shade like its line', () => {
    expect(linePrice(shelf, 'unitCostCents', { brand: A, name: 'EVO 4.52 Medium Mahogany Violet Brown', size: '' })!.cents).toBe(1104)
  })
  it('moves shades that shared the old price (or had none), not ones priced on purpose', () => {
    const names = lineSiblings(shelf, shelf[0], 1104).map((x) => x.name)
    expect(names).toEqual(['EVO 8.1 Light Ash Blonde', 'EVO 10.21 Lightest Blonde Violet Ash', 'EVO 6.66I Dark Blonde Intense Red'])
  })
})
