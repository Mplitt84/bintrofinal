import { describe, expect, it } from 'vitest'
import { birthdayLabel, clientKey, clientSummary, daysToBirthday, dialable } from './client-profile'
import type { ClientFormula } from './formulas'

const visit = (serviceDate: string, extra: Partial<ClientFormula> = {}): ClientFormula => ({
  id: Math.floor(Math.random() * 1e6),
  kind: 'hair',
  clientName: 'Ana R',
  serviceDate,
  service: '',
  lines: [],
  tags: [],
  retail: [],
  developer: '',
  ratio: '',
  processingMinutes: 0,
  leftover: '',
  aftercare: '',
  followUpOn: '',
  notes: '',
  staffName: '',
  createdAt: '',
  updatedAt: '',
  photoCount: 0,
  ...extra,
})

describe('clientSummary', () => {
  it('works out rhythm, due date and overdue from visit gaps', () => {
    const s = clientSummary([visit('2026-08-01'), visit('2026-09-12'), visit('2026-10-20')], new Map(), '2026-12-15')
    expect(s.visits).toBe(3)
    expect(s.rhythmDays).toBe(40) // gaps 42 and 38
    expect(s.dueOn).toBe('2026-11-29')
    expect(s.overdue).toBe(true)
    expect(s.daysSinceLast).toBe(56)
  })

  it('prefers the profile rebook days, and one visit gives no rhythm', () => {
    const one = clientSummary([visit('2026-11-01')], new Map(), '2026-11-10')
    expect(one.rhythmDays).toBeNull()
    expect(one.dueOn).toBe('')
    expect(clientSummary([visit('2026-11-01')], new Map(), '2026-11-10', 28).dueOn).toBe('2026-11-29')
  })

  it('adds up bought take-homes at current retail and counts the ones that stayed', () => {
    const s = clientSummary(
      [
        visit('2026-10-01', { retail: [{ productId: 7, name: 'Curl cream', qty: 1, sold: true }, { productId: 8, name: 'Mask', qty: 1, sold: false }] }),
        visit('2026-11-01', { retail: [{ productId: 7, name: 'Curl cream', qty: 2, sold: true }], staffName: 'Beth', followUpOn: '2026-12-01' }),
      ],
      new Map([[7, 2400]]),
      '2026-11-17',
    )
    expect(s.bought).toEqual([{ productId: 7, name: 'Curl cream', qty: 3, cents: 7200, lastOn: '2026-11-01' }])
    expect(s.retailCents).toBe(7200)
    expect(s.recommendedNotBought).toBe(1)
    expect(s.nextFollowUp).toBe('2026-12-01')
    expect(s.seenBy).toEqual([{ name: 'Beth', visits: 1 }])
  })
})

describe('helpers', () => {
  it('matches names loosely', () => expect(clientKey('  Ana   R ')).toBe(clientKey('ana r')))
  it('counts days to a birthday across the new year', () => {
    expect(daysToBirthday('11-20', '2026-11-17')).toBe(3)
    expect(daysToBirthday('01-02', '2026-12-31')).toBe(2)
    expect(daysToBirthday('', '2026-12-31')).toBeNull()
    expect(daysToBirthday('02-29', '2027-02-27')).toBe(1)
  })
  it('labels and dials', () => {
    expect(birthdayLabel('05-14')).toMatch(/May/)
    expect(dialable('(512) 729-6764')).toBe('5127296764')
  })
})
