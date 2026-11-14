import { describe, expect, it } from 'vitest'
import { groupVendors, looksLikeUrl, vendorKey } from './tidy.js'

describe('suppliers that are really one supplier', () => {
  it('matches a shop however its web address was typed', () => {
    expect(vendorKey('https://www.cultandking.com')).toBe(vendorKey('www.cultandking.com'))
    expect(vendorKey('http://www.cultandking.com/')).toBe(vendorKey('cultandking.com'))
    expect(vendorKey('https://www.hairstory.com')).toBe('hairstory')
  })

  it('matches a name typed with different spacing or case', () => {
    expect(vendorKey('SalonCentric')).toBe(vendorKey('saloncentric'))
    expect(vendorKey('Salon Service Group')).toBe(vendorKey('salon  service   group'))
    expect(vendorKey('Armstrong McCall')).toBe(vendorKey('armstrong mccall'))
  })

  it('keeps two different suppliers apart', () => {
    expect(vendorKey('SalonCentric')).not.toBe(vendorKey('CosmoProf'))
    expect(vendorKey('hairstory.com')).not.toBe(vendorKey('cultandking.com'))
  })

  it('groups the spellings, most products first, and leaves singles alone', () => {
    const groups = groupVendors([
      { vendor: 'https://www.cultandking.com', products: 2 },
      { vendor: 'www.cultandking.com', products: 5 },
      { vendor: 'CosmoProf', products: 9 },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].names.map((n) => n.name)).toEqual(['www.cultandking.com', 'https://www.cultandking.com'])
    expect(groups[0].total).toBe(7)
  })

  it('ignores products with no supplier', () => {
    expect(groupVendors([{ vendor: '', products: 4 }, { vendor: '  ', products: 2 }])).toEqual([])
  })
})

describe('which spelling the tidy tool offers first', () => {
  it('puts the plain name ahead of a web address on a tie', () => {
    const [group] = groupVendors([
      { vendor: 'https://www.reverie.com', products: 1 },
      { vendor: 'Reverie', products: 1 },
    ])
    expect(group.names[0].name).toBe('Reverie')
  })

  it('still puts the most-used spelling first', () => {
    const [group] = groupVendors([
      { vendor: 'https://www.reverie.com', products: 9 },
      { vendor: 'Reverie', products: 1 },
    ])
    expect(group.names[0].name).toBe('https://www.reverie.com')
  })

  it('knows a web address from a name', () => {
    expect(looksLikeUrl('https://www.hairstory.com')).toBe(true)
    expect(looksLikeUrl('cultandking.com')).toBe(true)
    expect(looksLikeUrl('SalonCentric')).toBe(false)
    expect(looksLikeUrl('Armstrong McCall')).toBe(false)
  })
})
