import { categorySuggestionsFor } from './tax-categories'

/**
 * Kinds of business Bintro is set up for: small beauty and wellness shops,
 * plus bars. The type tunes the AI prompts, the category set-up pop-up, size
 * suggestions and a few placeholders. Client-safe.
 */

export type BusinessType = {
  id: string
  label: string
  /** One line under the label in the picker. */
  blurb: string
  /** How the AI should think of an item, e.g. "hair salon product". */
  itemNoun: string
  /** Category names the AI prefers. Overridden by the business's own list once it has one. */
  categories: string[]
  sizes: string[]
  vendorExample: string
  expenseCategories: string[]
  /** Kept so businesses set up before the beauty & wellness focus still work, but not offered. */
  legacy?: boolean
}

const COMMON_EXPENSES = [
  'Inventory',
  'Supplies',
  'Rent',
  'Utilities',
  'Equipment',
  'Marketing',
  'Software',
  'Repairs',
  'Licenses & permits',
  'Insurance',
  'Education',
  'Other',
]
const withExtra = (...extra: string[]) => [...COMMON_EXPENSES.slice(0, -1), ...extra, 'Other']

type TypeSeed = Omit<BusinessType, 'categories'>

const SEEDS: TypeSeed[] = [
  {
    id: 'salon',
    label: 'Hair salon',
    blurb: 'Color, cuts, styling',
    itemNoun: 'hair salon product',
    sizes: ['60 ml', '90 ml', '250 ml', '300 ml', '1 L', '8 oz', '33.8 oz'],
    vendorExample: 'SalonCentric',
    expenseCategories: withExtra('Laundry'),
  },
  {
    id: 'barber',
    label: 'Barbershop',
    blurb: 'Cuts, fades, shaves',
    itemNoun: 'barbershop product',
    sizes: ['4 oz', '8 oz', '16 oz', '1 L', '10 ct', '100 ct'],
    vendorExample: 'Barber Depot',
    expenseCategories: withExtra('Laundry'),
  },
  {
    id: 'nails',
    label: 'Nail salon',
    blurb: 'Manicures, pedicures, enhancements',
    itemNoun: 'nail salon product',
    sizes: ['0.5 oz', '15 ml', '1 oz', '4 oz', '16 oz', '100 ct', '500 ct'],
    vendorExample: 'Nail Supply Co.',
    expenseCategories: withExtra('Laundry'),
  },
  {
    id: 'brows',
    label: 'Brow & lash studio',
    blurb: 'Brows, lashes, waxing',
    itemNoun: 'brow, lash and waxing product',
    sizes: ['5 ml', '10 ml', '14 oz', '1 lb', '100 ct', 'Tray'],
    vendorExample: 'Lash Affair',
    expenseCategories: withExtra('Laundry'),
  },
  {
    id: 'tattoo',
    label: 'Tattoo & piercing',
    blurb: 'Tattoo, piercing, aftercare',
    itemNoun: 'tattoo and piercing studio supply',
    sizes: ['1 oz', '2 oz', '4 oz', '8 oz', '20 ct', '100 ct', 'Box'],
    vendorExample: 'Kingpin Tattoo Supply',
    expenseCategories: withExtra('Medical waste'),
  },
  {
    id: 'spa',
    label: 'Spa & massage',
    blurb: 'Massage, facials, body',
    itemNoun: 'spa and massage product',
    sizes: ['8 oz', '16 oz', '1 gal', '15 ml', '100 ml', '1 L'],
    vendorExample: 'Massage Warehouse',
    expenseCategories: withExtra('Laundry'),
  },
  {
    id: 'bar',
    label: 'Bar & lounge',
    blurb: 'Liquor, beer, wine, food',
    itemNoun: 'bar item (liquor, beer, wine, mixers, food supplies)',
    sizes: ['750 ml', '1 L', '1.75 L', '12 oz', '16 oz', '24 pack', '1/2 keg'],
    vendorExample: 'Southern Glazer’s',
    expenseCategories: withExtra('Entertainment'),
  },
  {
    id: 'other',
    label: 'Other beauty & wellness',
    blurb: 'Med spa, makeup, tanning…',
    itemNoun: 'beauty and wellness product',
    sizes: ['Each', 'Box', 'Case', '1 L', '16 oz'],
    vendorExample: 'Costco Business',
    expenseCategories: COMMON_EXPENSES,
  },
  {
    id: 'retail',
    label: 'Retail shop',
    blurb: 'Retail',
    itemNoun: 'retail store product',
    sizes: ['S', 'M', 'L', 'XL', 'One size', 'Each', '6 pack'],
    vendorExample: 'Faire',
    expenseCategories: withExtra('Shipping'),
    legacy: true,
  },
  {
    id: 'bookstore',
    label: 'Bookstore',
    blurb: 'Books',
    itemNoun: 'book or bookstore item',
    sizes: ['Hardcover', 'Paperback', 'Mass market', 'Board book', 'Each'],
    vendorExample: 'Ingram',
    expenseCategories: withExtra('Shipping', 'Events'),
    legacy: true,
  },
]

export const BUSINESS_TYPES: BusinessType[] = SEEDS.map((t) => ({
  ...t,
  categories: categorySuggestionsFor(t.id).map((c) => c.name),
}))

/** Types offered in Settings. A legacy type still shows while it's the one selected. */
export function selectableBusinessTypes(currentId?: string) {
  return BUSINESS_TYPES.filter((t) => !t.legacy || t.id === currentId)
}

export function businessTypeById(id: string | undefined | null): BusinessType {
  return BUSINESS_TYPES.find((t) => t.id === id) ?? BUSINESS_TYPES.find((t) => t.id === 'other')!
}

/** Shown in the header and emails until the owner names their business. */
export const FALLBACK_BUSINESS_NAME = 'My Business'

export type BusinessProfile = {
  name: string
  businessType: string
  email: string
  phone: string
  address: string
  website: string
  orderEmail: string
  monthlyBudgetCents: number
  /** Weekly best-sellers email (Mondays). */
  weeklyReportEmail: boolean
  /** Monthly slow-movers + price-check email (1st of the month). */
  monthlyReportEmail: boolean
  /** Email as soon as items start selling out fast. */
  fastMoverAlertEmail: boolean
}

export const EMPTY_PROFILE: BusinessProfile = {
  name: '',
  businessType: 'salon',
  email: '',
  phone: '',
  address: '',
  website: '',
  orderEmail: '',
  monthlyBudgetCents: 0,
  weeklyReportEmail: true,
  monthlyReportEmail: true,
  fastMoverAlertEmail: true,
}

export function displayBusinessName(profile: { name: string } | null | undefined) {
  return profile?.name.trim() || FALLBACK_BUSINESS_NAME
}

/** "Shag Noir Salon" -> "shag-noir-salon", for download filenames. */
export function businessSlug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'bintro'
  )
}

/** YYYY-MM key for a local date. */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** YYYY-MM-DD for a local date. */
export function dayKey(date = new Date()) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`
}

/** Local start/end of a YYYY-MM month as ISO strings, so the server can filter timestamps. */
export function monthRange(key: string) {
  const [y, m] = key.split('-').map(Number)
  const start = new Date(y!, m! - 1, 1)
  const end = new Date(y!, m!, 1)
  return { key, start: start.toISOString(), end: end.toISOString() }
}

/** The `count` most recent month keys ending with `end`, oldest first. */
export function recentMonths(end: string, count: number) {
  const [y, m] = end.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => monthKey(new Date(y!, m! - 1 - (count - 1 - i), 1)))
}

export function monthLabel(key: string, style: 'long' | 'short' = 'long') {
  const [y, m] = key.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('en-US', style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short' })
}
