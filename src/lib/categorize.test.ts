import { describe, expect, it } from 'vitest'
import { formatName, formatSize, parseSize, suggestCategories, type CategorizeInput } from './categorize'

let id = 1
const p = (name: string, category = '', size = '', brand = ''): CategorizeInput => ({ id: id++, name, category, size, brand })

describe('sizes', () => {
  it('reads sizes from the size or the name', () => {
    expect(parseSize('33.8 OZ')?.unit).toBe('oz')
    expect(parseSize('1 Liter')?.base).toBe(1000)
    expect(parseSize('', 'Curl Cream 8oz')?.amount).toBe(8)
    expect(parseSize('60g')?.kind).toBe('weight')
  })
  it('formats sizes and leaves tidy ones alone', () => {
    expect(formatSize('33.8OZ')).toBe('33.8 oz')
    expect(formatSize('1 LITER')).toBe('1 L')
    expect(formatSize('250 ML')).toBe('250 ml')
    expect(formatSize('8.5 oz')).toBeNull()
    expect(formatSize('large')).toBeNull()
  })
})

describe('names', () => {
  it('fixes shouting and whispering, keeps shade codes and mixed case', () => {
    expect(formatName('CURL DEFINING CREAM')).toBe('Curl Defining Cream')
    expect(formatName('evo shade 7n gloss')).toBe('Evo Shade 7N Gloss')
    expect(formatName('Olaplex No.3')).toBeNull()
    expect(formatName('K18  Mask')).toBe('K18 Mask')
  })
})

describe('suggestCategories', () => {
  it('learns from the business’s own filing, including brand and bottle size', () => {
    const shelf = [
      p('Hydrate Shampoo', 'Backbar', '33.8 oz', 'Pureology'),
      p('Hydrate Conditioner', 'Backbar', '33.8 oz', 'Pureology'),
      p('Hydrate Shampoo', 'Retail', '9 oz', 'Pureology'),
      p('Hydrate Conditioner', 'Retail', '9 oz', 'Pureology'),
      p('Strength Cure Shampoo', '', '33.8 oz', 'Pureology'),
      p('Strength Cure Shampoo', '', '9 oz', 'Pureology'),
    ]
    const out = suggestCategories(shelf)
    const big = out.find((s) => s.size === '33.8 oz')!
    const small = out.find((s) => s.size === '9 oz')!
    expect(big.suggested).toBe('Backbar')
    expect(small.suggested).toBe('Retail')
  })

  it('falls back to keywords mapped onto existing categories', () => {
    const out = suggestCategories([p('Curl Gel', 'Styling products', '8 oz'), p('20 Vol Developer', '', '32 oz'), p('Edge Control', '', '4 oz')])
    expect(out.find((s) => s.name === '20 Vol Developer')!.suggested).toBe('Developer')
    expect(out.find((s) => s.name === 'Edge Control')!.suggested).toBe('Styling products')
  })

  it('skips filed products unless re-checking, and only flags clear misfiles', () => {
    const shelf = [p('Gloves Nitrile', 'Supplies'), p('Gloves Black Nitrile', 'Supplies'), p('Gloves Latex', 'Supplies'), p('Gloves Large', 'Shampoo')]
    expect(suggestCategories(shelf)).toHaveLength(0)
    const re = suggestCategories(shelf, { recheck: true })
    expect(re.map((s) => s.name)).toEqual(['Gloves Large'])
    expect(re[0].suggested).toBe('Supplies')
  })
})

describe('starter names', () => {
  it('uses the trade’s starter categories before inventing one, split by size', () => {
    const starter = ['Retail hair care', 'Hair color', 'Developer', 'Backbar shampoo & conditioner', 'Foils & color wrap', 'Gloves']
    const out = suggestCategories([p('Moisture Shampoo', '', '33.8 oz'), p('Moisture Shampoo', '', '8.5 oz'), p('Nitrile Gloves', ''), p('Evo Permanent Color 7N', '', '2.06 oz')], { starter })
    const by = (n: string, size = '') => out.find((s) => s.name === n && (!size || s.size === size))!.suggested
    expect(by('Moisture Shampoo', '33.8 oz')).toBe('Backbar shampoo & conditioner')
    expect(by('Moisture Shampoo', '8.5 oz')).toBe('Retail hair care')
    expect(by('Nitrile Gloves')).toBe('Gloves')
    expect(by('Evo Permanent Color 7N')).toBe('Hair color')
  })
})
