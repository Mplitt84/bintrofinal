import { describe, expect, it } from 'vitest'
import { renewalEmail, renewalNoticeDue, type RenewalInput } from './renewals'

const day = 24 * 60 * 60 * 1000
const now = new Date('2026-11-21T15:00:00Z')
const base: RenewalInput = {
  plan: 'plus', interval: 'year', status: 'active', cancelAtPeriodEnd: false, hasSubscription: true,
  currentPeriodEnd: new Date(now.getTime() + 30 * day), paidSince: new Date('2026-01-01'), renewalNoticeFor: null, annualReminderAt: null,
}

describe('renewalNoticeDue', () => {
  it('sends a yearly renewal notice between 15 and 30 days out, once per period', () => {
    expect(renewalNoticeDue(base, now)).toBe('renewal')
    expect(renewalNoticeDue({ ...base, currentPeriodEnd: new Date(now.getTime() + 16 * day) }, now)).toBe('renewal')
    expect(renewalNoticeDue({ ...base, currentPeriodEnd: new Date(now.getTime() + 40 * day) }, now)).toBeNull()
    expect(renewalNoticeDue({ ...base, currentPeriodEnd: new Date(now.getTime() + 10 * day) }, now)).toBeNull()
    expect(renewalNoticeDue({ ...base, renewalNoticeFor: base.currentPeriodEnd }, now)).toBeNull()
  })
  it('skips free, canceling, paused, trialing and unsubscribed accounts', () => {
    expect(renewalNoticeDue({ ...base, plan: 'free' }, now)).toBeNull()
    expect(renewalNoticeDue({ ...base, cancelAtPeriodEnd: true }, now)).toBeNull()
    expect(renewalNoticeDue({ ...base, status: 'paused' }, now)).toBeNull()
    expect(renewalNoticeDue({ ...base, status: 'trialing' }, now)).toBeNull()
    expect(renewalNoticeDue({ ...base, hasSubscription: false }, now)).toBeNull()
  })
  it('reminds monthly plans once a year', () => {
    const monthly = { ...base, interval: 'month' as const }
    expect(renewalNoticeDue({ ...monthly, paidSince: new Date(now.getTime() - 100 * day) }, now)).toBeNull()
    expect(renewalNoticeDue({ ...monthly, paidSince: new Date(now.getTime() - 340 * day) }, now)).toBe('annual')
    expect(renewalNoticeDue({ ...monthly, paidSince: new Date('2024-01-01'), annualReminderAt: new Date(now.getTime() - 20 * day) }, now)).toBeNull()
    expect(renewalNoticeDue({ ...monthly, paidSince: null }, now)).toBeNull()
  })
})

describe('renewalEmail', () => {
  it('says what renews, the price, how often and how to cancel', () => {
    const e = renewalEmail({ shop: 'Shag Noir', planName: 'Plus', interval: 'year', priceLabel: '$490', renewsOn: 'Dec 21, 2026', manageUrl: 'https://app.example/?settings=account', kind: 'renewal' })
    expect(e.subject).toContain('Dec 21, 2026')
    expect(e.text).toContain('every year at $490')
    expect(e.text).toContain('Cancel plan')
    expect(e.text).toContain('https://app.example/?settings=account')
  })
})
