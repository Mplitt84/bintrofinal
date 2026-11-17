import { describe, expect, it } from 'vitest'
import { marketplaceAllowed, monthlySaving, pickScanQueue, worthSwitching } from './better-prices'

describe('better prices rules', () => {
  it('only lets marketplaces in for shop supplies, and only when the shop buys there', () => {
    expect(marketplaceAllowed('marketplace', 'disposables')).toBe(true)
    expect(marketplaceAllowed('marketplace', 'linens')).toBe(true)
    expect(marketplaceAllowed('marketplace', 'office')).toBe(true)
    expect(marketplaceAllowed('marketplace', 'service')).toBe(false) // color & backbar
    expect(marketplaceAllowed('marketplace', 'resale')).toBe(false)
    expect(marketplaceAllowed('marketplace', 'amenities')).toBe(false)
    expect(marketplaceAllowed('local', 'disposables')).toBe(false)
    expect(marketplaceAllowed('pro', 'office')).toBe(false)
  })

  it('needs a real saving before suggesting a switch', () => {
    expect(worthSwitching(1000, 990)).toBe(false) // 10¢
    expect(worthSwitching(10000, 9800)).toBe(false) // 2%
    expect(worthSwitching(1000, 900)).toBe(true)
    expect(worthSwitching(0, 500)).toBe(false)
    expect(monthlySaving(1000, 900, 12)).toBe(1200)
    expect(monthlySaving(900, 1000, 12)).toBe(0)
  })

  it('checks the biggest spend first and skips recent or costless products', () => {
    const now = new Date('2026-11-17T12:00:00Z')
    const queue = pickScanQueue(
      [
        { id: 1, name: 'Foils', unitCostCents: 2000, out30: 2, sellerScanAt: null },
        { id: 2, name: 'Developer', unitCostCents: 1500, out30: 10, sellerScanAt: '2026-10-01T00:00:00Z' },
        { id: 3, name: 'Gloves', unitCostCents: 1200, out30: 30, sellerScanAt: '2026-11-15T00:00:00Z' },
        { id: 4, name: 'Towels', unitCostCents: 0, out30: 50, sellerScanAt: null },
        { id: 5, name: 'Pens', unitCostCents: 300, out30: 0, sellerScanAt: null },
      ],
      now,
      10,
    )
    expect(queue.map((p) => p.id)).toEqual([2, 1, 5])
  })
})
