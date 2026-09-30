/**
 * Light-bulb tips: short, practical reminders about saving money, planning
 * purchases, sustainability and running stock well. Shown in the tip sheet
 * (bulb in the header) and as a once-a-day pop-up. Client-safe.
 */

export type TipCategory = 'save' | 'plan' | 'green' | 'stock'

/** Tabs a tip can be tied to; mirrors the tab ids in `routes/index.tsx`. */
export type TipTab = 'scan' | 'products' | 'restock' | 'calendar' | 'budget' | 'activity' | 'settings'

/** Which kinds of business a tip is written for. Omitted = everyone. */
type Audience = 'beauty' | 'bar'

export type Tip = {
  id: string
  category: TipCategory
  title: string
  body: string
  /** Tabs where this tip is most useful; it's shown first there. Omitted = anywhere. */
  tabs?: TipTab[]
  audience?: Audience
  /** Optional shortcut to the tab where the tip can be acted on. */
  action?: { label: string; tab: TipTab; section?: 'import' | 'categories' }
}

export const TIP_CATEGORIES: { id: TipCategory; label: string; short: string }[] = [
  { id: 'save', label: 'Save money', short: 'Save' },
  { id: 'plan', label: 'Plan ahead', short: 'Plan' },
  { id: 'green', label: 'Sustainability', short: 'Green' },
  { id: 'stock', label: 'Smarter stock', short: 'Stock' },
]

export const TIPS: Tip[] = [
  // Save money
  {
    id: 'save-bulk-fast-movers',
    category: 'save',
    title: 'Buy bulk only on fast movers',
    body: 'Case discounts pay off on items you go through every week. For slow sellers, the cash tied up on the shelf usually costs more than the discount saves.',
    tabs: ['restock', 'activity'],
    action: { label: 'See what moves fastest', tab: 'activity' },
  },
  {
    id: 'save-combine-orders',
    category: 'save',
    title: 'Combine orders to clear free-shipping minimums',
    body: 'Build one order per vendor instead of topping up item by item. Fewer, fuller orders mean fewer shipping fees and less time on the phone.',
    tabs: ['restock'],
    action: { label: 'Build a vendor order', tab: 'restock' },
  },
  {
    id: 'save-price-check',
    category: 'save',
    title: 'Re-check costs twice a year',
    body: 'Supplier prices creep up quietly. Compare your saved unit costs against the latest invoice — importing it as a price update takes a minute.',
    tabs: ['products', 'settings'],
    action: { label: 'Import an invoice', tab: 'settings', section: 'import' },
  },
  {
    id: 'save-web-price',
    category: 'save',
    title: 'Keep your prices current',
    body: 'Old costs make order predictions wrong. Open Insights → Prices, tap Check online and Bintro compares the manufacturer, authorized distributors and Amazon — skipping third-party resellers.',
    tabs: ['products', 'restock', 'activity'],
    action: { label: 'See sales insights', tab: 'activity' },
  },
  {
    id: 'save-dead-stock',
    category: 'save',
    title: 'Turn dead stock back into cash',
    body: "Anything that hasn't moved in 90 days is costing you shelf space. Bundle it, run it as a promo, or ask the vendor about a return or credit.",
    tabs: ['products', 'activity'],
  },
  {
    id: 'save-budget-line',
    category: 'save',
    title: 'Give every month a spending line',
    body: 'A monthly budget makes overspending obvious by the second week, not after the bank statement arrives. Tap a month to set its own amount.',
    tabs: ['budget'],
    action: { label: 'Open Budget', tab: 'budget' },
  },
  {
    id: 'save-receipts',
    category: 'save',
    title: 'Snap receipts the day you spend',
    body: 'Small cash buys are the easiest deductions to lose. Photograph the receipt straight into Budget so it lands under the right tax line.',
    tabs: ['budget'],
  },
  {
    id: 'save-early-pay',
    category: 'save',
    title: 'Ask vendors about early-pay discounts',
    body: 'Terms like "2/10 net 30" take 2% off if you pay within 10 days. On regular orders that adds up to real money over a year.',
    tabs: ['restock', 'budget'],
  },
  {
    id: 'save-backbar-portions',
    category: 'save',
    title: 'Measure back-bar product per service',
    body: 'Scales and pumps for color, lightener and treatments stop over-mixing. Even a few grams saved per service shows up in your monthly supply spend.',
    audience: 'beauty',
    tabs: ['scan', 'budget'],
  },
  {
    id: 'save-pour-cost',
    category: 'save',
    title: 'Watch pour cost, not just sales',
    body: "Jiggers and regular counts keep over-pours in check. If a bottle empties faster than the sales say it should, that's where the money is going.",
    audience: 'bar',
    tabs: ['scan', 'activity'],
  },

  // Plan ahead
  {
    id: 'plan-lead-time',
    category: 'plan',
    title: 'Set par to cover the delivery wait',
    body: "Par should hold enough for the days it takes an order to arrive, plus a small buffer. If you run out before deliveries land, raise that item's par by a few.",
    tabs: ['restock', 'products'],
  },
  {
    id: 'plan-seasonal',
    category: 'plan',
    title: 'Stock up before your busy season',
    body: 'Holidays, prom and wedding season (or game nights and patio season) spike demand. Order two to three weeks early so you are not paying rush prices.',
    tabs: ['calendar', 'restock'],
    action: { label: 'Add a reorder date', tab: 'calendar' },
  },
  {
    id: 'plan-reorder-day',
    category: 'plan',
    title: 'Pick one reorder day a week',
    body: 'A regular order day turns restocking into a habit instead of an emergency. Add it to the calendar as a weekly event so it shows up on your phone.',
    tabs: ['calendar', 'restock'],
    action: { label: 'Open Calendar', tab: 'calendar' },
  },
  {
    id: 'plan-tax-set-aside',
    category: 'plan',
    title: 'Set aside for quarterly taxes',
    body: 'Moving a fixed share of each week\'s takings into a separate account makes estimated-tax dates painless. The calendar can add those dates for you.',
    tabs: ['calendar', 'budget'],
  },
  {
    id: 'plan-equipment-fund',
    category: 'plan',
    title: 'Start a small replacement fund',
    body: 'Dryers, chairs, clippers and fridges all wear out. A little set aside each month means a breakdown is an inconvenience, not a crisis.',
    tabs: ['budget'],
  },
  {
    id: 'plan-price-rise',
    category: 'plan',
    title: 'Heard a price rise is coming? Buy one cycle ahead',
    body: 'When a vendor announces an increase, one extra order at the old price on your steady sellers is usually worth it. Just don\'t overbuy slow movers.',
    tabs: ['restock'],
  },
  {
    id: 'plan-monthly-count',
    category: 'plan',
    title: 'Count once a month',
    body: 'A quick monthly count catches drift between the app and the shelf before it snowballs. Schedule it as a repeating count event.',
    tabs: ['calendar', 'products'],
    action: { label: 'Schedule a count', tab: 'calendar' },
  },

  // Sustainability
  {
    id: 'green-fifo',
    category: 'green',
    title: 'First in, first out',
    body: 'Put new deliveries behind older stock. Less product expires on the shelf, which is better for the planet and your margins.',
    tabs: ['scan', 'restock'],
  },
  {
    id: 'green-fewer-deliveries',
    category: 'green',
    title: 'Fewer, fuller deliveries',
    body: 'One consolidated weekly order means fewer trucks, less packaging and fewer boxes to break down.',
    tabs: ['restock'],
  },
  {
    id: 'green-refill',
    category: 'green',
    title: 'Ask for refills and backbar sizes',
    body: 'Liter and gallon sizes, or brands with refill programs, cut plastic and usually cost less per ounce.',
    audience: 'beauty',
    tabs: ['restock', 'products'],
  },
  {
    id: 'green-salon-recycling',
    category: 'green',
    title: 'Recycle the hard stuff',
    body: 'Color tubes, foils and hair can be recycled through salon recycling programs. Many clients choose salons that take this seriously.',
    audience: 'beauty',
  },
  {
    id: 'green-bar-returns',
    category: 'green',
    title: 'Return kegs and crates promptly',
    body: 'Returnable kegs, crates and bottles earn deposits back and stay out of the waste stream. Keep a spot by the door for pickups.',
    audience: 'bar',
  },
  {
    id: 'green-bar-garnish',
    category: 'green',
    title: 'Prep garnish to the forecast',
    body: 'Cut fruit and herbs for the night you expect, not the night you hope for. Leftover peels make great syrups and cordials.',
    audience: 'bar',
  },
  {
    id: 'green-paperless',
    category: 'green',
    title: 'Go paperless with orders',
    body: 'Email vendor orders and keep receipts as photos. It saves paper, and nothing gets lost in the back office.',
    tabs: ['restock', 'budget'],
  },
  {
    id: 'green-energy',
    category: 'green',
    title: 'Switch off standby equipment',
    body: 'Dryers, heaters, glass washers and displays draw power all night. A smart plug or a closing checklist trims the energy bill.',
    tabs: ['budget'],
  },

  // Smarter stock
  {
    id: 'stock-scan-every-use',
    category: 'stock',
    title: 'Scan it out when you open it',
    body: 'Scanning at the moment a product is opened keeps counts honest and makes below-par alerts arrive right on time.',
    tabs: ['scan'],
  },
  {
    id: 'stock-scan-deliveries',
    category: 'stock',
    title: 'Scan deliveries in as they arrive',
    body: 'Receiving stock straight away keeps your budget accurate and catches short shipments while the driver is still there.',
    tabs: ['scan', 'budget'],
    action: { label: 'Go to Scan', tab: 'scan' },
  },
  {
    id: 'stock-costs-in',
    category: 'stock',
    title: 'Add unit costs to every product',
    body: "Costs power your spend chart, stock value and order totals. Tap a product to add one — or let AI suggest a price when you're unsure.",
    tabs: ['products', 'budget'],
    action: { label: 'Open Products', tab: 'products' },
  },
  {
    id: 'stock-par-review',
    category: 'stock',
    title: 'Review par levels each season',
    body: 'Demand shifts over the year. Lower par on things that slowed down and raise it on the new favourites so cash sits where it earns.',
    tabs: ['products', 'restock'],
  },
  {
    id: 'stock-retail-vs-backbar',
    category: 'stock',
    title: 'Track retail and back-bar separately',
    body: 'Products for resale and products used on clients are filed under different tax lines. Separate categories keep your accountant happy.',
    audience: 'beauty',
    tabs: ['products', 'settings'],
    action: { label: 'Review categories', tab: 'settings', section: 'categories' },
  },
  {
    id: 'stock-staff-names',
    category: 'stock',
    title: 'Everyone scans under their own name',
    body: 'Named scans show who used what, which makes training easier and unexplained shrinkage much easier to spot.',
    tabs: ['activity', 'scan'],
  },
]

const BEAUTY_TYPES = new Set(['salon', 'barber', 'nails', 'brows', 'tattoo', 'spa', 'other'])

function audienceFor(businessType: string): Audience | null {
  if (businessType === 'bar') return 'bar'
  return BEAUTY_TYPES.has(businessType) ? 'beauty' : null
}

/**
 * Tips that fit this business, with the ones tied to `tab` first. The order
 * within each group rotates daily so the first tip isn't always the same.
 */
export function tipsFor(businessType: string, tab: TipTab, category?: TipCategory, day = dayNumber()): Tip[] {
  const audience = audienceFor(businessType)
  const fits = TIPS.filter((t) => (!t.audience || t.audience === audience) && (!category || t.category === category))
  const rotate = (list: Tip[]) => {
    if (!list.length) return list
    const start = day % list.length
    return [...list.slice(start), ...list.slice(0, start)]
  }
  const here = fits.filter((t) => t.tabs?.includes(tab))
  const rest = fits.filter((t) => !t.tabs?.includes(tab))
  return [...rotate(here), ...rotate(rest)]
}

/** Days since the epoch in local time; changes once a day at local midnight. */
export function dayNumber(date = new Date()) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000)
}
