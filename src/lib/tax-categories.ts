/**
 * Product categories that line up with how an accountant books the spend.
 * Every category a business adds belongs to one tax group, and each group
 * names the US Schedule C line (and the usual QuickBooks account) it rolls up
 * to, so a bookkeeper can read the category list and see why it exists.
 * Client-safe.
 */

export type TaxGroupId =
  | 'resale'
  | 'service'
  | 'beverage'
  | 'food'
  | 'disposables'
  | 'tools'
  | 'linens'
  | 'amenities'
  | 'office'

export type TaxGroup = {
  id: TaxGroupId
  label: string
  /** Plain-English reason the group exists, shown to staff. */
  why: string
  /** Where it lands on the return, for the accountant. */
  taxLine: string
  /** The QuickBooks Online account it usually maps to. */
  qbAccount: string
  /** Counts toward cost of goods sold rather than operating expenses. */
  cogs: boolean
}

export const TAX_GROUPS: TaxGroup[] = [
  {
    id: 'resale',
    label: 'Retail for resale',
    why: 'Products clients buy and take home. Held as inventory and expensed when sold.',
    taxLine: 'Cost of goods sold · Sch. C Part III, line 36 (Purchases)',
    qbAccount: 'Cost of Goods Sold',
    cogs: true,
  },
  {
    id: 'service',
    label: 'Professional & backbar',
    why: 'Used up while doing the service, like color, gel, wax, ink or massage oil.',
    taxLine: 'Cost of goods sold · Sch. C line 38 (Materials & supplies), or Supplies line 22',
    qbAccount: 'Supplies & Materials – COGS',
    cogs: true,
  },
  {
    id: 'beverage',
    label: 'Beverage cost',
    why: 'Liquor, beer, wine and mixers poured for guests. Tracked as pour cost.',
    taxLine: 'Cost of goods sold · Sch. C Part III, line 36 (Purchases)',
    qbAccount: 'Cost of Goods Sold – Beverage',
    cogs: true,
  },
  {
    id: 'food',
    label: 'Food cost',
    why: 'Food and snacks that are sold to guests.',
    taxLine: 'Cost of goods sold · Sch. C Part III, line 36 (Purchases)',
    qbAccount: 'Cost of Goods Sold – Food',
    cogs: true,
  },
  {
    id: 'disposables',
    label: 'Disposables & sanitation',
    why: 'Single-use and cleaning items: gloves, liners, foils, disinfectant.',
    taxLine: 'Supplies · Sch. C line 22',
    qbAccount: 'Supplies & Materials',
    cogs: false,
  },
  {
    id: 'tools',
    label: 'Tools & small equipment',
    why: 'Reusable implements and devices. Big-ticket items may need to be depreciated.',
    taxLine: 'Supplies line 22 if $2,500 or less per item; otherwise Depreciation / Sec. 179, line 13',
    qbAccount: 'Small Tools & Equipment',
    cogs: false,
  },
  {
    id: 'linens',
    label: 'Linens & laundry',
    why: 'Towels, sheets, robes and capes that wear out and get replaced.',
    taxLine: 'Supplies · Sch. C line 22',
    qbAccount: 'Supplies & Materials',
    cogs: false,
  },
  {
    id: 'amenities',
    label: 'Client amenities',
    why: 'Complimentary drinks and treats for clients while they wait.',
    taxLine: 'Other expenses · Sch. C line 27a (client amenities, not meals)',
    qbAccount: 'Client Amenities',
    cogs: false,
  },
  {
    id: 'office',
    label: 'Office & front desk',
    why: 'Receipt paper, gift-card stock, pens and front-desk supplies.',
    taxLine: 'Office expense · Sch. C line 18',
    qbAccount: 'Office Supplies & Software',
    cogs: false,
  },
]

export const DEFAULT_TAX_GROUP: TaxGroupId = 'service'

export function taxGroupById(id: string | undefined | null): TaxGroup {
  return TAX_GROUPS.find((g) => g.id === id) ?? TAX_GROUPS.find((g) => g.id === DEFAULT_TAX_GROUP)!
}

export function isTaxGroupId(id: string): id is TaxGroupId {
  return TAX_GROUPS.some((g) => g.id === id)
}

/** A category the business has chosen to use, as stored. */
export type ProductCategory = { id: number; name: string; taxGroup: TaxGroupId }

/** A category offered in the set-up pop-up. */
export type CategorySuggestion = { name: string; group: TaxGroupId; hint?: string }

const fold = (v: string) => v.trim().toLowerCase()

/** The saved category matching a product's free-text category, if any. */
export function findCategory(categories: ProductCategory[], name: string) {
  const n = fold(name)
  return n ? categories.find((c) => fold(c.name) === n) : undefined
}

/**
 * Best tax group for a category name: the business's own mapping first, then
 * the suggestion lists, then a few keywords. Used to pre-pick a group when an
 * existing product category is being added.
 */
export function guessTaxGroup(name: string, suggestions: CategorySuggestion[], saved: ProductCategory[] = []): TaxGroupId {
  const own = findCategory(saved, name)
  if (own) return own.taxGroup
  const n = fold(name)
  const exact = suggestions.find((s) => fold(s.name) === n)
  if (exact) return exact.group
  if (/retail|resale|take.?home|merch/.test(n)) return 'resale'
  if (/glove|liner|foil|wipe|towel.?paper|cotton|strip|spatula|barrier|disinfect|sanit|clean|cup|straw|napkin/.test(n)) return 'disposables'
  if (/towel|sheet|robe|linen|blanket|cape/.test(n)) return 'linens'
  if (/shear|clipper|tool|lamp|machine|brush|comb|tweezer|nipper|warmer|glassware|dryer|iron/.test(n)) return 'tools'
  if (/vodka|whisk|tequila|rum|gin|liqu|wine|beer|spirit|mixer|seltzer/.test(n)) return 'beverage'
  if (/food|snack|garnish/.test(n)) return 'food'
  if (/coffee|tea|water|refresh|champagne/.test(n)) return 'amenities'
  if (/office|paper|receipt|gift.?card|pen/.test(n)) return 'office'
  return DEFAULT_TAX_GROUP
}

const s = (group: TaxGroupId, names: string[]): CategorySuggestion[] => names.map((name) => ({ name, group }))

const FRONT_DESK = [
  ...s('amenities', ['Coffee, tea & water']),
  ...s('office', ['Front desk supplies']),
]

/** What most businesses of each type track, grouped the way their accountant will want it. */
export const CATEGORY_SUGGESTIONS: Record<string, CategorySuggestion[]> = {
  salon: [
    ...s('resale', ['Retail hair care', 'Retail styling', 'Retail tools & brushes']),
    ...s('service', ['Hair color', 'Developer', 'Lightener', 'Toner & gloss', 'Backbar shampoo & conditioner', 'Treatments & bond builders', 'Perm & relaxer', 'Smoothing & keratin', 'Extensions']),
    ...s('disposables', ['Foils & color wrap', 'Gloves', 'Neck strips', 'Disinfectant']),
    ...s('tools', ['Shears & razors', 'Hot tools', 'Brushes, combs & bowls', 'Clips & sectioning']),
    ...s('linens', ['Towels', 'Capes']),
    ...FRONT_DESK,
  ],
  barber: [
    ...s('resale', ['Retail grooming', 'Retail beard care']),
    ...s('service', ['Shave cream & aftershave', 'Pomade & styling (backbar)', 'Backbar shampoo', 'Hot towel products']),
    ...s('disposables', ['Razor blades', 'Neck strips', 'Gloves', 'Disinfectant & Barbicide']),
    ...s('tools', ['Clippers & trimmers', 'Shears', 'Blades & guards', 'Brushes & combs']),
    ...s('linens', ['Towels', 'Capes']),
    ...FRONT_DESK,
  ],
  nails: [
    ...s('resale', ['Retail polish', 'Retail nail & hand care', 'Retail press-ons']),
    ...s('service', ['Gel polish', 'Lacquer', 'Base & top coat', 'Acrylic powder & liquid', 'Builder & hard gel', 'Dip powder', 'Tips & forms', 'Nail art & gems', 'Pedicure scrubs, soaks & masks', 'Cuticle oil & lotion', 'Acetone & remover']),
    ...s('disposables', ['Files & buffers', 'Pedicure liners', 'Gloves & masks', 'Cotton & wipes', 'Toe separators & slippers', 'Disinfectant']),
    ...s('tools', ['Nippers & pushers', 'E-file & bits', 'UV/LED lamps', 'Brushes']),
    ...s('linens', ['Towels']),
    ...FRONT_DESK,
  ],
  brows: [
    ...s('resale', ['Retail brow & lash serums', 'Retail aftercare']),
    ...s('service', ['Lash extensions', 'Lash adhesive', 'Primer & remover', 'Lash lift kits', 'Brow tint & henna', 'Brow lamination', 'Hard & soft wax', 'Pre & post wax care', 'Threading thread']),
    ...s('disposables', ['Micro brushes & wands', 'Eye pads & tape', 'Wax strips & spatulas', 'Gloves', 'Disinfectant']),
    ...s('tools', ['Tweezers', 'Wax warmers', 'Lash lamps & beds']),
    ...s('linens', ['Pillow covers & towels']),
    ...FRONT_DESK,
  ],
  tattoo: [
    ...s('resale', ['Retail aftercare', 'Merch & apparel', 'Body jewelry']),
    ...s('service', ['Tattoo ink', 'Cartridges & needles', 'Stencil paper & solution', 'Green soap & rinse', 'Ointment & glide', 'Healing film & bandages', 'Numbing']),
    ...s('disposables', ['Gloves', 'Barrier film & bags', 'Ink caps & cups', 'Razors', 'Paper towels', 'Disinfectant & Cavicide']),
    ...s('tools', ['Machines & pens', 'Power supplies', 'Grips & tubes']),
    ...s('office', ['Front desk supplies']),
  ],
  spa: [
    ...s('resale', ['Retail skincare', 'Retail body care', 'Candles & gifts']),
    ...s('service', ['Massage oil & lotion', 'Essential oils', 'Facial backbar', 'Body scrubs & wraps', 'Wax']),
    ...s('disposables', ['Table paper & face covers', 'Cotton & sponges', 'Gloves', 'Disinfectant']),
    ...s('tools', ['Hot stones & warmers', 'Steamers & devices']),
    ...s('linens', ['Sheets & blankets', 'Towels & robes', 'Slippers']),
    ...FRONT_DESK,
  ],
  bar: [
    ...s('beverage', ['Vodka', 'Whiskey', 'Tequila', 'Rum', 'Gin', 'Liqueur', 'Wine', 'Beer', 'Non-alcoholic', 'Mixers & juice', 'Garnish']),
    ...s('food', ['Food', 'Bar snacks']),
    ...s('disposables', ['Napkins & straws', 'To-go cups', 'Cleaning chemicals']),
    ...s('tools', ['Glassware', 'Bar tools']),
    ...s('resale', ['Merch']),
    ...s('office', ['Front desk supplies']),
  ],
  other: [
    ...s('resale', ['Retail products']),
    ...s('service', ['Professional products']),
    ...s('disposables', ['Disposables', 'Cleaning & sanitation']),
    ...s('tools', ['Tools & equipment']),
    ...s('linens', ['Linens']),
    ...FRONT_DESK,
  ],
}

export function categorySuggestionsFor(typeId: string): CategorySuggestion[] {
  return CATEGORY_SUGGESTIONS[typeId] ?? CATEGORY_SUGGESTIONS.other!
}
