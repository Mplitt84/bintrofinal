/**
 * Light-bulb tips: short, practical reminders about saving money, planning
 * purchases, sustainability and running stock well. Shown in the tip sheet
 * (bulb in the header) and as a once-a-day pop-up drawn from a small weekly set
 * (`weeklyTips`). New tips are added each quarter with `added` set. Client-safe.
 */

export type TipCategory = 'save' | 'value' | 'plan' | 'green' | 'stock' | 'stylist'

/** Tabs a tip can be tied to; mirrors the tab ids in `routes/index.tsx`. */
export type TipTab = 'scan' | 'products' | 'restock' | 'calendar' | 'budget' | 'activity' | 'formulas' | 'team' | 'settings'

/** Which kinds of business a tip is written for. Omitted = everyone. */
/** Groups (beauty, hair = salons + barbers) or a single business type id. */
type Audience = 'beauty' | 'hair' | 'barber' | 'spa' | 'tattoo' | 'nails' | 'brows'

export type Tip = {
  id: string
  category: TipCategory
  title: string
  body: string
  /** Tabs where this tip is most useful; it's shown first there. Omitted = anywhere. */
  tabs?: TipTab[]
  /** One audience, or several trades (`['nails', 'spa']`). */
  audience?: Audience | Audience[]
  /** Quarter the tip was added (`2026-Q4`). New tips lead the weekly rotation in their quarter. */
  added?: string
  /** Optional shortcut to the tab where the tip can be acted on. */
  action?: { label: string; tab: TipTab; section?: 'import' | 'categories' }
}

export const TIP_CATEGORIES: { id: TipCategory; label: string; short: string }[] = [
  { id: 'save', label: 'Save money', short: 'Save' },
  { id: 'value', label: 'Add value', short: 'Value' },
  { id: 'plan', label: 'Plan ahead', short: 'Plan' },
  { id: 'green', label: 'Sustainability', short: 'Green' },
  { id: 'stock', label: 'Smarter stock', short: 'Stock' },
  { id: 'stylist', label: 'Stylist tips', short: 'Stylist' },
]

export const TIPS: Tip[] = [
  // Barbershops
  {
    id: 'barber-blades',
    category: 'save',
    title: 'Clean and oil clippers every day',
    body: 'Blades last much longer when they’re brushed, disinfected and oiled daily. Replacing blades early costs more than the oil.',
    tabs: ['scan', 'budget'],
    audience: 'barber',
  },
  {
    id: 'barber-bulk',
    category: 'save',
    title: 'Bulk-buy only what every chair uses',
    body: 'Neck strips, disinfectant and blades used every cut are worth buying by the case. Specialty products aren’t.',
    tabs: ['restock'],
    audience: 'barber',
  },
  {
    id: 'barber-retail',
    category: 'save',
    title: 'Sell what you style with',
    body: 'Use your retail pomade or oil in the chair and tell the client what it is. Products you show sell far better than products on a shelf.',
    tabs: ['products', 'activity'],
    audience: 'barber',
  },
  // Spas and med spas
  {
    id: 'spa-lots',
    category: 'stock',
    title: 'Track lot numbers and dates',
    body: 'Write the lot number and expiration on high-cost products when they arrive, and use the soonest-expiring first.',
    tabs: ['restock', 'products'],
    audience: 'spa',
  },
  {
    id: 'spa-group-bookings',
    category: 'save',
    title: 'Book the same treatments back to back',
    body: 'Products that only last a short time once opened go further when appointments using them are grouped together. Follow the maker’s directions for how long an opened product is good.',
    tabs: ['calendar'],
    audience: 'spa',
  },
  {
    id: 'spa-count-high-cost',
    category: 'stock',
    title: 'Count expensive items every week',
    body: 'Your priciest products deserve a weekly count with a reason for every difference. Small gaps there cost more than big gaps on cheap supplies.',
    tabs: ['products', 'activity'],
    audience: 'spa',
  },
  {
    id: 'spa-pumps',
    category: 'green',
    title: 'Pumps and spatulas, not fingers',
    body: 'Measured pumps and clean spatulas stop over-use and keep jars from spoiling, so every container lasts more services.',
    tabs: ['scan'],
    audience: 'spa',
  },
  // Tattoo and nails
  {
    id: 'tattoo-caps',
    category: 'save',
    title: 'Pour small ink caps',
    body: 'Leftover ink in caps gets thrown away. Pour a little, top up as you go.',
    tabs: ['scan', 'formulas'],
    audience: 'tattoo',
  },
  {
    id: 'nails-palette',
    category: 'save',
    title: 'Mix custom shades in small amounts',
    body: 'Mix on a palette, a little at a time, and save the recipe for repeat clients so you never remake a whole batch.',
    tabs: ['scan', 'formulas'],
    audience: 'nails',
  },
  // Stylist tips (hair salons and barbers): less waste at the bowl and the shampoo bowl
  {
    id: 'stylist-color-32g',
    category: 'stylist',
    title: 'Mix 32 grams for a root touch-up',
    body: '32 grams of color is the average amount for a root touch-up. Start there instead of eyeballing a full bowl.',
    tabs: ['formulas', 'scan', 'activity'],
    audience: 'hair',
  },
  {
    id: 'stylist-remix-color',
    category: 'stylist',
    title: 'Remix instead of over-mixing',
    body: 'Running short? Always go back and mix a little more. A second small mix beats tossing leftover color down the sink.',
    tabs: ['formulas', 'scan', 'activity'],
    audience: 'hair',
  },
  {
    id: 'stylist-shampoo-pumps',
    category: 'stylist',
    title: '1–2 pumps of shampoo and conditioner',
    body: 'Saturate the hair with water first, then use 1–2 pumps per client and work it through with water. More pumps just rinse product down the drain.',
    tabs: ['formulas', 'scan', 'activity'],
    audience: 'hair',
  },

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
  // Added 2026-Q4: nails (money, value, sustainability, sanitation & organization),
  // several shared with other trades. Sanitation tips defer to the state board on purpose:
  // the rules differ by state.
  {
    id: 'nails-half-files',
    category: 'save',
    title: 'Cut files and buffers in half',
    body: 'Files and buffers are one client only, so get two clients out of each one by cutting them in half before use. Build what they cost into your price.',
    tabs: ['restock', 'budget'],
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'nails-dappen-dish',
    category: 'save',
    title: 'Dispense gel and dip into a dappen dish',
    body: 'Pour or brush out only what one set needs instead of working straight from the bottle. Less waste, and the bottle stays clean.',
    tabs: ['scan'],
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'nails-cap-bottles',
    category: 'save',
    title: 'Close bottles between every step',
    body: 'Gel and acrylic liquid go off when they sit open or near the lamp. Cap them as you go.',
    tabs: ['scan'],
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'nails-capsule-colors',
    category: 'save',
    title: 'Build a capsule color wall',
    body: 'Lots of shades that hardly anyone picks are money sitting on a shelf. Keep the colors clients actually choose, rotate a few seasonal ones, and let slow movers sell out.',
    tabs: ['products', 'activity'],
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'beauty-gallon-cleaners',
    category: 'save',
    title: 'Buy cleaning supplies and disinfectant by the gallon',
    body: 'Big sizes poured into labeled small bottles at the station cost less per use.',
    tabs: ['restock'],
    audience: 'beauty',
    added: '2026-Q4',
  },
  {
    id: 'beauty-addons-at-consult',
    category: 'value',
    title: 'Offer add-ons at the start, not mid-service',
    body: 'Bring them up during the consult, while the client is choosing. Halfway through, it feels like pressure.',
    tabs: ['formulas', 'calendar'],
    audience: 'beauty',
    added: '2026-Q4',
  },
  {
    id: 'nails-two-addons',
    category: 'value',
    title: 'Name two add-ons that fit this client',
    body: 'A cuticle treatment for dry cuticles, or one accent nail for someone who loves art. Pick from their history. Don’t read off the whole menu.',
    tabs: ['formulas'],
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'beauty-named-bundles',
    category: 'value',
    title: 'Bundle add-ons into a named set',
    body: '“Express mani + one statement nail” feels like a treat. Three separate add-ons feel like a growing bill.',
    tabs: ['activity'],
    audience: 'beauty',
    added: '2026-Q4',
  },
  {
    id: 'nails-wear-your-work',
    category: 'value',
    title: 'Wear your work',
    body: 'Keep your own nails done with what you’re offering. It’s the easiest way to sell art without saying a word.',
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'nails-cuticle-oil-home',
    category: 'value',
    title: 'Send them home with the cuticle oil you used',
    body: 'Show it, tell them why it helps their set last, and have it on the shelf.',
    tabs: ['products', 'formulas'],
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'nails-short-massage',
    category: 'value',
    title: 'A short hand or calf massage makes the service feel bigger',
    body: 'It takes almost no product and a few minutes, and clients remember it.',
    audience: ['nails', 'spa'],
    added: '2026-Q4',
  },
  {
    id: 'nails-waterless',
    category: 'green',
    title: 'Try waterless manis and pedis',
    body: 'You use less water and fewer paper towels, and there’s no basin to drain and disinfect.',
    audience: ['nails', 'spa'],
    added: '2026-Q4',
  },
  {
    id: 'beauty-washable-wipes',
    category: 'green',
    title: 'Swap single-use cotton for washable wipes where your state board allows',
    body: 'Use them for tables and prep, not for anything that touches a client’s open skin.',
    tabs: ['budget'],
    audience: 'beauty',
    added: '2026-Q4',
  },
  {
    id: 'nails-reuse-displays',
    category: 'green',
    title: 'Reuse display stands',
    body: 'When a new collection comes out, change the color cards and keep the stand.',
    tabs: ['products'],
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'beauty-safer-choice',
    category: 'green',
    title: 'Use EPA Safer Choice cleaners for general cleaning',
    body: 'That’s floors, counters and the restroom. Tools still need your state board–approved disinfectant.',
    tabs: ['restock'],
    audience: 'beauty',
    added: '2026-Q4',
  },
  {
    id: 'nails-practice-tips',
    category: 'green',
    title: 'Send old nail tips home for practice',
    body: 'Clean leftover tips work well for practicing French and art, so they don’t all go in the trash.',
    audience: 'nails',
    added: '2026-Q4',
  },
  {
    id: 'beauty-two-tool-sets',
    category: 'stock',
    title: 'Keep two sets of metal tools per station',
    body: 'One gets cleaned and sterilized while you use the other, so nobody waits and nothing gets rushed.',
    tabs: ['products', 'restock'],
    audience: ['nails', 'brows', 'barber'],
    added: '2026-Q4',
  },
  {
    id: 'beauty-clean-before-disinfect',
    category: 'stock',
    title: 'Clean before you disinfect',
    body: 'Scrub off dust and product with soap and water first. Disinfectant can’t reach a dirty tool.',
    audience: 'beauty',
    added: '2026-Q4',
  },
  {
    id: 'beauty-sealed-pouches',
    category: 'stock',
    title: 'Keep sterilized tools sealed until the client sits down',
    body: 'Open the pouch in front of them. Clients notice, and it builds trust.',
    audience: ['nails', 'brows', 'tattoo'],
    added: '2026-Q4',
  },
  {
    id: 'beauty-dry-storage',
    category: 'stock',
    title: 'Never store clean tools wet or next to dirty ones',
    body: 'Dry them fully, then keep them in a closed container away from used tools and single-use items.',
    audience: 'beauty',
    added: '2026-Q4',
  },
  {
    id: 'beauty-uv-storage',
    category: 'stock',
    title: 'UV boxes are for storage, not sterilizing',
    body: 'Use them to hold clean tools if your state board allows. Sterilizing needs an autoclave or dry heat sterilizer.',
    audience: ['nails', 'brows'],
    added: '2026-Q4',
  },
  {
    id: 'beauty-scan-disposables',
    category: 'stock',
    title: 'Scan pouches, files and liners like stock',
    body: 'The things you throw away after every client run out fastest. Give them a par in Bintro so you never run out mid-day.',
    tabs: ['products', 'restock', 'scan'],
    audience: 'beauty',
    added: '2026-Q4',
    action: { label: 'Open Products', tab: 'products' },
  },
  {
    id: 'beauty-autoclave-log',
    category: 'stock',
    title: 'Log every autoclave cycle',
    body: 'Write down the date and cycle on each batch. If an inspector asks, it’s all there.',
    tabs: ['calendar'],
    audience: ['nails', 'tattoo', 'brows'],
    added: '2026-Q4',
  },
]

const BEAUTY_TYPES = new Set(['salon', 'barber', 'nails', 'brows', 'tattoo', 'spa', 'other'])

const HAIR_TYPES = new Set(['salon', 'barber'])

function audienceFor(businessType: string): Audience | null {
  return BEAUTY_TYPES.has(businessType) ? 'beauty' : null
}

function fitsOne(audience: Audience, businessType: string) {
  if (audience === 'hair') return HAIR_TYPES.has(businessType)
  if (audience === 'beauty') return audience === audienceFor(businessType)
  return audience === businessType
}

/** Hair tips go to salons and barbers; beauty tips to every beauty business; a list to each trade on it. */
export function tipFits(tip: Tip, businessType: string) {
  if (!tip.audience) return true
  const list = Array.isArray(tip.audience) ? tip.audience : [tip.audience]
  return list.some((a) => fitsOne(a, businessType))
}

/** Written for this trade in particular (not the everyone or all-beauty tips). For the industry preview. */
export function tipIsForTrade(tip: Tip, businessType: string) {
  if (!tip.audience) return false
  const list = (Array.isArray(tip.audience) ? tip.audience : [tip.audience]).filter((a) => a !== 'beauty')
  return list.some((a) => fitsOne(a, businessType))
}

/**
 * Tips that fit this business, with the ones tied to `tab` first. The order
 * within each group rotates daily so the first tip isn't always the same.
 */
export function tipsFor(businessType: string, tab: TipTab, category?: TipCategory, day = dayNumber()): Tip[] {
  const fits = TIPS.filter((t) => tipFits(t, businessType) && (!category || t.category === category))
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

// ---------------------------------------------------------------------------
// Weekly rotation for the pop-up
// ---------------------------------------------------------------------------

/** How many tips make up one week's pop-up set. One pops up a day. */
export const TIPS_PER_WEEK = 5

/** Calendar quarter of a date in local time, as `2026-Q4`. */
export function quarterOf(date = new Date()) {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`
}

/** Whole weeks (Monday start, local time) since the first Monday on or before this quarter began. */
export function weekOfQuarter(date = new Date()) {
  const start = new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(Math.round((today.getTime() - start.getTime()) / 86_400_000) / 7)
}

/** Key for the current week (`2026-Q4-w6`), so a device can tell when the set has changed. */
export function weekKey(date = new Date()) {
  return `${quarterOf(date)}-w${weekOfQuarter(date)}`
}

/**
 * This week's pop-up tips: a small, fixed set so the pop-up never feels like a flood.
 * The order puts tips added this quarter first, then mixes the themes (one money tip,
 * one value tip, one green tip…) so a week isn't five of the same kind. Each week
 * moves on by TIPS_PER_WEEK, and the rotation starts over each quarter, so new tips
 * lead after every quarterly update.
 */
export function weeklyTips(businessType: string, date = new Date(), size = TIPS_PER_WEEK): Tip[] {
  const fits = TIPS.filter((t) => tipFits(t, businessType))
  if (fits.length <= size) return fits
  const quarter = quarterOf(date)
  const mix = (list: Tip[]) => {
    const byCat = TIP_CATEGORIES.map((c) => list.filter((t) => t.category === c.id))
    const out: Tip[] = []
    for (let i = 0; out.length < list.length; i++) {
      for (const group of byCat) if (group[i]) out.push(group[i])
    }
    return out
  }
  const order = [...mix(fits.filter((t) => t.added === quarter)), ...mix(fits.filter((t) => t.added !== quarter))]
  const startAt = (weekOfQuarter(date) * size) % order.length
  return Array.from({ length: size }, (_, i) => order[(startAt + i) % order.length])
}
