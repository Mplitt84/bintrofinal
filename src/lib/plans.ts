/**
 * Bintro account tiers. Free covers day-to-day scanning; Plus adds ordering,
 * planning, AI and Square; Premium adds money management, QuickBooks and CRM.
 * Prices are in cents. Change them here (and in Stripe) — nothing else hardcodes them.
 */

export type PlanId = 'free' | 'plus' | 'premium'
export type BillingInterval = 'month' | 'year'
/** active = paid (or free) and running; trialing = Premium trial; paused = billing paused, Free features only. */
export type AccountStatus = 'active' | 'trialing' | 'paused' | 'canceled'

export type Feature =
  | 'orders'
  | 'calendar'
  | 'import'
  | 'ai'
  | 'insights'
  | 'square'
  | 'budget'
  | 'quickbooks'
  | 'crm'
  | 'priority_support'

export type Plan = {
  id: PlanId
  name: string
  tagline: string
  monthlyCents: number
  /** Yearly price, about two months free. */
  yearlyCents: number
  /** null = unlimited */
  productLimit: number | null
  teamLimit: number | null
  features: Feature[]
  /** Short list shown on the plan card, beyond what the plan below it has. */
  highlights: string[]
}

export const TRIAL_DAYS = 30

const PLUS_FEATURES: Feature[] = ['orders', 'calendar', 'import', 'ai', 'insights', 'square']

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Scan stock in and out, and see what’s running low.',
    monthlyCents: 0,
    yearlyCents: 0,
    productLimit: 150,
    teamLimit: 2,
    features: [],
    highlights: [
      'Scan in / out with camera or wand',
      'Up to 150 products',
      'Up to 2 team members',
      'Below-par list and activity history',
      'Barcode lookups from public product databases',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    tagline: 'Everything in Free, plus ordering, planning and AI help.',
    monthlyCents: 2900,
    yearlyCents: 29000,
    productLimit: null,
    teamLimit: 10,
    features: PLUS_FEATURES,
    highlights: [
      'Unlimited products, up to 10 team members',
      'Vendor purchase orders to email, print or download',
      'Business calendar with Google / Outlook sync',
      'Bulk import from CSV, PDF or photo',
      'AI label reading and price checks',
      'Weekly, monthly and fast-mover reports',
      'Square POS item and sales sync',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Everything in Plus, plus money management and your books.',
    monthlyCents: 6900,
    yearlyCents: 69000,
    productLimit: null,
    teamLimit: null,
    features: [...PLUS_FEATURES, 'budget', 'quickbooks', 'crm', 'priority_support'],
    highlights: [
      'Unlimited team members',
      'Budget, expenses and AI receipt reading',
      'QuickBooks Online sync',
      'Client CRM connections (coming soon)',
      'Priority support',
    ],
  },
]

export const FEATURE_INFO: Record<Feature, { label: string; blurb: string }> = {
  orders: { label: 'Vendor orders', blurb: 'Turn the below-par list into a vendor-grouped order you can email, print or download.' },
  calendar: { label: 'Business calendar', blurb: 'Plan reorders, deliveries, counts, bills and tax dates, synced to Google or Outlook.' },
  import: { label: 'Bulk import', blurb: 'Load a whole stock list or vendor invoice from a CSV, PDF or photo.' },
  ai: { label: 'AI help', blurb: 'Read product labels and receipts from a photo and check prices with AI.' },
  insights: { label: 'Sales reports', blurb: 'Best sellers, slow movers and fast-mover alerts, in the app and by email.' },
  square: { label: 'Square POS', blurb: 'Import your Square item library and count sales out of stock automatically.' },
  budget: { label: 'Budget & expenses', blurb: 'Track monthly spend against a budget, log expenses and read receipts with AI.' },
  quickbooks: { label: 'QuickBooks Online', blurb: 'Send expenses and stock purchases to QuickBooks so your books match.' },
  crm: { label: 'Client CRM', blurb: 'Connect your client list and booking tools.' },
  priority_support: { label: 'Priority support', blurb: 'Jump the queue when you need help.' },
}

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]
}

export function isPlanId(id: unknown): id is PlanId {
  return PLANS.some((p) => p.id === id)
}

/** The cheapest plan that includes a feature. */
export function planFor(feature: Feature): Plan {
  return PLANS.find((p) => p.features.includes(feature)) ?? PLANS[PLANS.length - 1]
}

export function planHas(plan: PlanId, feature: Feature) {
  return planById(plan).features.includes(feature)
}

export function planRank(plan: PlanId) {
  return PLANS.findIndex((p) => p.id === plan)
}

export function priceFor(plan: Plan, interval: BillingInterval) {
  return interval === 'year' ? plan.yearlyCents : plan.monthlyCents
}

export type PaymentMethod = { brand: string; last4: string; expMonth: number; expYear: number }

export type BillingEvent = {
  id: number
  kind: string
  detail: string
  amountCents: number
  createdAt: string
  /** Hosted invoice link when the event came from Stripe. */
  url?: string
}

/** What the client knows about the account. Never includes processor secrets. */
export type AccountSummary = {
  plan: PlanId
  /** The plan whose features are on right now (Free while paused or after a trial ends). */
  effectivePlan: PlanId
  interval: BillingInterval
  status: AccountStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  pausedUntil: string | null
  ownerName: string
  billingEmail: string
  paymentMethod: PaymentMethod | null
  /** true when Stripe keys are set; otherwise plan changes apply with no charge (pilot mode). */
  billingLive: boolean
  memberSince: string
  usage: { products: number; team: number }
}

export const PAUSE_OPTIONS = [1, 2, 3] as const

export const CANCEL_REASONS = [
  'Too expensive',
  'Missing a feature I need',
  'Too hard to use',
  'Business is closing or seasonal',
  'Switching to another app',
  'Something else',
]

/** $29 / $29.50 / Free */
export function centsLabel(cents: number) {
  if (!cents) return 'Free'
  return `$${cents % 100 ? (cents / 100).toFixed(2) : cents / 100}`
}
