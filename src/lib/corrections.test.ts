import { describe, expect, it } from 'vitest'
import { correctionKind, reasonFor, sourceLabel, withReason } from './corrections'

describe('correctionKind', () => {
  it('counts real losses', () => {
    expect(correctionKind('Count #12 · Damaged or spilled', -2)).toBe('loss')
    expect(correctionKind('Count #12 · Theft', -1)).toBe('loss')
    expect(correctionKind('Count #12', -1)).toBe('loss') // no reason given
  })
  it('does not count record fixes, unscanned use or sales as lost', () => {
    expect(correctionKind('Count #12 · Miscounted before', -5)).toBe('fix')
    expect(correctionKind('Count #12 · Used on a client, not scanned', -1)).toBe('used')
    expect(correctionKind('Count #12 · Sold, not scanned', -1)).toBe('sold')
    expect(correctionKind('Manual on-hand edit', -10)).toBe('fix')
    expect(correctionKind('Import: SalonCentric · stock.csv', -3)).toBe('fix') // a file name, not a reason
    expect(correctionKind('Import: stock.csv', -3)).toBe('fix')
    expect(correctionKind('Undo count #12', -4)).toBe('fix')
    expect(correctionKind('Starting count from Square', -1)).toBe('fix')
  })
  it('a re-filed reason always wins, and stock going up is never a correction loss', () => {
    expect(correctionKind('Manual on-hand edit · Missing', -1)).toBe('loss')
    expect(correctionKind('Count #3 · Data clean-up', -9)).toBe('fix')
    expect(correctionKind('Count #3 · Missing', 4)).toBeNull()
  })
})

describe('notes', () => {
  it('re-files and labels', () => {
    expect(withReason('Count #12 · Missing', 'Expired')).toBe('Count #12 · Expired')
    expect(withReason('Manual on-hand edit', 'Data clean-up')).toBe('Manual on-hand edit · Data clean-up')
    expect(reasonFor('Count #12')).toBe('No reason given')
    expect(reasonFor('Manual on-hand edit')).toBe('')
    expect(sourceLabel('Count #12 · Missing')).toBe('Stock count')
    expect(sourceLabel('Import: x.csv')).toBe('Stock-count import')
    expect(withReason('Import: SalonCentric · stock.csv', 'Missing')).toBe('Import: SalonCentric · stock.csv · Missing')
    expect(correctionKind('Import: SalonCentric · stock.csv · Missing', -1)).toBe('loss')
    expect(sourceLabel('Import: SalonCentric · stock.csv · Missing')).toBe('Stock-count import')
    expect(reasonFor('Import: SalonCentric · stock.csv')).toBe('')
  })
})
