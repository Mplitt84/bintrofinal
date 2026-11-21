/**
 * Renewal notices for paid plans (California's automatic renewal law is the strictest
 * we sell into, so every customer gets its treatment):
 * - yearly plans: a notice 15–45 days before each renewal (we aim for ~30, never under 15)
 * - every plan: a reminder at least once a year of what renews, how much, how often, and how to cancel
 * Pure, so the scheduled job and the tests share one rule.
 */
import type { BillingInterval } from './plans'

const DAY = 24 * 60 * 60 * 1000

export type RenewalInput = {
  plan: string
  interval: BillingInterval
  status: string
  cancelAtPeriodEnd: boolean
  hasSubscription: boolean
  currentPeriodEnd: Date | null
  paidSince: Date | null
  renewalNoticeFor: Date | null
  annualReminderAt: Date | null
}

export type RenewalNotice = 'renewal' | 'annual' | null

/** Which notice (if any) is due today. A yearly plan's pre-renewal notice also counts as its annual reminder. */
export function renewalNoticeDue(r: RenewalInput, now: Date): RenewalNotice {
  if (r.plan === 'free' || !r.hasSubscription || r.cancelAtPeriodEnd) return null
  if (r.status !== 'active') return null
  if (r.interval === 'year') {
    if (!r.currentPeriodEnd) return null
    const days = (r.currentPeriodEnd.getTime() - now.getTime()) / DAY
    const already = r.renewalNoticeFor && r.renewalNoticeFor.getTime() === r.currentPeriodEnd.getTime()
    return !already && days <= 30 && days >= 15 ? 'renewal' : null
  }
  // Monthly: once a year, starting about eleven months in.
  const from = r.annualReminderAt ?? r.paidSince
  if (!from) return null
  return now.getTime() - from.getTime() >= 335 * DAY ? 'annual' : null
}

export function renewalEmail(input: {
  shop: string
  planName: string
  interval: BillingInterval
  priceLabel: string
  renewsOn: string | null
  manageUrl: string
  kind: Exclude<RenewalNotice, null>
}) {
  const every = input.interval === 'year' ? 'year' : 'month'
  const subject =
    input.kind === 'renewal' && input.renewsOn
      ? `Your Bintro ${input.planName} plan renews on ${input.renewsOn}`
      : `Reminder: your Bintro ${input.planName} plan renews automatically`
  const when = input.renewsOn ? ` Your next renewal is ${input.renewsOn}.` : ''
  const text =
    `Hi ${input.shop},\n\n` +
    `This is your reminder that Bintro ${input.planName} renews automatically every ${every} at ${input.priceLabel} until you cancel.${when}\n\n` +
    `Want to keep it? You don't need to do anything.\n\n` +
    `Want to change or cancel? Open Bintro, go to Settings → Account & billing, and tap Cancel plan, or switch plans there. ` +
    `Canceling takes one tap, and you keep everything you paid for until the end of the current ${every}.\n\n` +
    `${input.manageUrl}\n\n` +
    `Questions? Reply to this email or write to hello@bintroapp.com.\n\n` +
    `Bintro`
  return { subject, text }
}
