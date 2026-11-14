/**
 * Showstopper's selling tips (client-safe, pure, tested).
 *
 * Two rules decide what goes in this file:
 *
 * 1. **No snake oil.** Every tip is either a technique (what to do and when) or
 *    product science a licensed professional already learned — how porosity, build-up,
 *    humectants, surfactants, sun sensitivity or healing actually behave. Nothing here
 *    claims a product does something it doesn't, and there are no invented statistics:
 *    where a number would be needed, the tip points at the person's own figures instead.
 * 2. **No scripts.** A tip never tells anyone what to say word for word, never leans on
 *    urgency or flattery, and never asks a client to buy something that won't help them.
 *    The honest trade-off is itself one of the tips.
 *
 * Which tips someone sees is decided by their own numbers (`tipsFor`), so the advice
 * matches where they actually are rather than being a wall of generic selling talk.
 */

/** What in a person's numbers makes a tip worth showing. */
export type TipTrigger =
  /** Worth reading whatever the numbers say. */
  | 'always'
  /** Seeing clients but rarely writing a take-home on the record. */
  | 'few-recs'
  /** Recommending plenty, but little of it goes home. */
  | 'low-attach'
  /** Selling the same one or two things over and over. */
  | 'narrow-range'
  /** Clients who buy aren't coming back for more of it. */
  | 'no-repeat'
  /** Already doing well — keep the habit, don't fix what works. */
  | 'strong'

/** Trades a tip belongs to. `all` means it holds for every trade Bintro serves. */
export type TipAudience = 'all' | 'hair' | 'barber' | 'nails' | 'brows' | 'tattoo' | 'spa'

export type RetailTip = {
  id: string
  title: string
  /** What to do, in plain words. */
  how: string
  /** Why it works — the mechanism, not a sales pitch. */
  why: string
  audience: TipAudience[]
  trigger: TipTrigger
}

export const RETAIL_TIPS: RetailTip[] = [
  {
    id: 'prescribe-in-the-chair',
    title: 'Write the take-home while they are still in the chair',
    how: 'As you finish, put what you used and what they need on their client record — then hand them the names on the way out.',
    why: 'At the front desk the product is competing with paying the bill. In the chair you are still holding the result in your hands, and the record gives them the exact names to re-order instead of guessing at a shelf later.',
    audience: ['all'],
    trigger: 'few-recs',
  },
  {
    id: 'one-problem-one-product',
    title: 'One problem, one product',
    how: 'Pick the single thing that fixes what they complained about today. Say which problem it solves. Leave the rest for next time.',
    why: 'Four products is four decisions, and a client who cannot decide buys nothing. One named fix is one decision — and next visit you can tell whether it worked, which is how the second sale happens.',
    audience: ['all'],
    trigger: 'low-attach',
  },
  {
    id: 'show-the-amount',
    title: 'Show them the real amount',
    how: 'Dispense what they should actually use into their hand and say it out loud: this much, this often.',
    why: 'Most products that "did not work" at home were under-dosed or over-dosed. Showing the amount also makes the bottle last a predictable time, which is what turns one sale into a refill on a schedule.',
    audience: ['all'],
    trigger: 'always',
  },
  {
    id: 'porosity-not-price',
    title: 'Match to porosity, not to price',
    how: 'Choose by how their hair takes and holds water, not by which bottle costs more.',
    why: 'Porous hair — chemically treated, heat-worn, or coarse and coily — lets water in and out fast, so it holds heavier creams and a sealing step. Hair that resists water does better with lighter products and warmth to help them absorb. Price has nothing to do with either.',
    audience: ['hair', 'barber'],
    trigger: 'always',
  },
  {
    id: 'humectants-and-weather',
    title: 'Humectants follow the weather',
    how: 'In a wet week, steer a frizz-prone client toward creams and sealers over glycerin-forward products. In a dry snap, pair the humectant with something that holds the moisture in.',
    why: 'Humectants like glycerin are hygroscopic: they pull water toward whichever side has more of it. Very humid air can push water into the hair and swell it; very dry air can pull it back out. Same bottle, opposite result, which is why a client can love it in March and hate it in August.',
    audience: ['hair', 'barber'],
    trigger: 'always',
  },
  {
    id: 'cleansing-strength',
    title: 'Talk about how strongly it cleans, not "sulfate-free"',
    how: 'Ask what builds up on their hair and how often they wash, then match the cleansing strength. Keep a clarifying wash in the conversation for anyone using heavy stylers.',
    why: 'Sulfates are simply strong surfactants. The real question is build-up versus colour fade versus what their scalp is doing — a gentle cleanser protects fresh colour, and a clarifying wash removes the film that makes every other product stop working. Selling "free from" instead of fit is how a client ends up with a bottle that cannot do their job.',
    audience: ['hair', 'barber'],
    trigger: 'always',
  },
  {
    id: 'scalp-is-skin',
    title: 'Treat the scalp as skin',
    how: 'When they mention itch, flaking or oiliness, work out what the skin is doing before you reach for a bottle.',
    why: 'Flaking from dryness and flaking from oil-loving yeast look alike and need opposite products. Getting that right is why a scalp recommendation sticks — and it is a conversation nobody at a drugstore shelf is having with them.',
    audience: ['hair', 'barber', 'spa'],
    trigger: 'always',
  },
  {
    id: 'heat-only-if-heat',
    title: 'Only sell heat protection to people who use heat',
    how: 'Ask which tool and roughly what setting before you recommend anything for heat.',
    why: 'Protectants work by slowing how fast heat reaches the hair and how much water it loses, so they matter to someone who flat-irons and do nothing for someone who air-dries. Recommending it to everyone is exactly the habit that makes clients stop believing you.',
    audience: ['hair', 'barber'],
    trigger: 'always',
  },
  {
    id: 'aftercare-is-the-work',
    title: 'The aftercare is the tattoo',
    how: 'Send them home with the aftercare you actually want on it, and say what to avoid while it heals.',
    why: 'The healed result is your portfolio, not the fresh one. Left to a drugstore aisle, people reach for heavy petroleum or a fragranced lotion on broken skin. Handing over what you trust is protecting your own work.',
    audience: ['tattoo'],
    trigger: 'always',
  },
  {
    id: 'sun-after-treatment',
    title: 'Sun protection is part of the result, not an add-on',
    how: 'After exfoliation, a peel, laser or fresh ink, make sunscreen part of the aftercare you hand over.',
    why: 'Freshly treated skin is more sun-sensitive, and sun is what fades pigment and undoes the evenness they paid for. Framed as protecting the result they just bought, it is not an upsell — it is the condition the result depends on.',
    audience: ['spa', 'tattoo', 'brows'],
    trigger: 'always',
  },
  {
    id: 'refill-rhythm',
    title: 'Book the refill with the appointment',
    how: 'Work out roughly how long the bottle lasts at the amount you showed them, and say when they will be due. Note it on the record.',
    why: 'Retail follows the appointment calendar. A client who runs out three weeks before their next visit buys a replacement somewhere else — and whatever they buy there is what they come back using.',
    audience: ['all'],
    trigger: 'no-repeat',
  },
  {
    id: 'honest-trade-off',
    title: 'Say the trade-off honestly',
    how: 'Tell them plainly what happens if they change nothing — and that it is their call.',
    why: 'A client who feels pushed may buy once and not rebook. The trade-off said straight ("that clarifying shampoo will pull this colour faster") respects them and is usually more persuasive than any pitch, because it is checkable.',
    audience: ['all'],
    trigger: 'always',
  },
  {
    id: 'write-it-on-the-record',
    title: 'Put it on the record so anyone can repeat it',
    how: 'Log what you used and what they took home on their client record, every visit.',
    why: 'It is how you pick the thread back up in twelve weeks, how a colleague covers for you without starting over, and how they re-order by name. It is also where these numbers come from — an unlogged sale is invisible to everyone, including you.',
    audience: ['all'],
    trigger: 'always',
  },
  {
    id: 'learn-one-product',
    title: 'Learn one product you have never sold',
    how: 'Pick something on the shelf you never reach for. Read what it is actually for, try it on one client this month, and tell the team how it went.',
    why: 'Nobody recommends what they do not understand, so a narrow shelf knowledge shows up directly as a narrow sales list. One product a month is a different shelf by next season.',
    audience: ['all'],
    trigger: 'narrow-range',
  },
  {
    id: 'ask-a-colleague',
    title: 'Ask whoever is moving something you are not',
    how: 'Look at what your colleagues are selling that you never do, and ask one of them what they say about it and to whom.',
    why: 'The fastest education on this shelf is already in the building, and the person who sells it has a reason that works on real clients. It also makes the Showstopper numbers something you trade notes over rather than compete over.',
    audience: ['all'],
    trigger: 'narrow-range',
  },
  {
    id: 'name-what-works',
    title: 'Name what you are already doing',
    how: 'Look at your top product this period and write down, in one sentence, what you say about it. Then try that same sentence on your second-best.',
    why: 'Strong sellers usually have one habit they cannot see — a question they always ask, a demonstration they always do. Naming it is what makes it repeatable on a slow week, and teachable to everyone else.',
    audience: ['all'],
    trigger: 'strong',
  },
]

/** How the trade maps onto a tip's audience. */
export function audienceFor(businessType: string): TipAudience {
  if (businessType === 'salon' || businessType === 'other') return 'hair'
  if (businessType === 'barber') return 'barber'
  if (businessType === 'nails') return 'nails'
  if (businessType === 'brows') return 'brows'
  if (businessType === 'tattoo') return 'tattoo'
  if (businessType === 'spa') return 'spa'
  return 'all'
}

/** What a person's numbers have to say about which habit would help most. */
export type TipPattern = {
  visits: number
  recommended: number
  takenHome: number
  distinctProducts: number
  soldUnits: number
  repeatBuyers: number
  buyers: number
}

/** The thresholds behind the triggers, in one place so a tip's reason is checkable. */
export const TIP_RULES = {
  /** Seeing this many clients with almost nothing written down. */
  visitsWithFewRecs: 3,
  /** Recommending at least this much before a low take-home rate means anything. */
  recsForAttach: 4,
  /** Below this share going home, the problem is the ask, not the shelf. */
  lowAttachRate: 0.3,
  /** Selling this many units out of this few products is a narrow shelf. */
  unitsForRange: 5,
  narrowProducts: 2,
  /** Enough buyers to tell whether anybody came back for more. */
  buyersForRepeat: 3,
}

/** Which triggers this person's numbers set off, strongest reason first. */
export function triggersFor(p: TipPattern): TipTrigger[] {
  const hit: TipTrigger[] = []
  if (p.visits >= TIP_RULES.visitsWithFewRecs && p.recommended < p.visits / 2) hit.push('few-recs')
  if (p.recommended >= TIP_RULES.recsForAttach && p.takenHome / p.recommended < TIP_RULES.lowAttachRate) hit.push('low-attach')
  if (p.soldUnits >= TIP_RULES.unitsForRange && p.distinctProducts <= TIP_RULES.narrowProducts) hit.push('narrow-range')
  if (p.buyers >= TIP_RULES.buyersForRepeat && p.repeatBuyers === 0) hit.push('no-repeat')
  if (!hit.length && p.soldUnits > 0) hit.push('strong')
  return hit
}

/**
 * Tips for one person: the ones their own numbers call for first, then the standing
 * ones for their trade. Never more than `limit`, so the screen stays a nudge rather
 * than a lecture.
 */
export function tipsFor(pattern: TipPattern, businessType: string, limit = 6): RetailTip[] {
  const mine = audienceFor(businessType)
  const forTrade = RETAIL_TIPS.filter((t) => t.audience.includes('all') || t.audience.includes(mine))
  const hit = triggersFor(pattern)
  const triggered = hit.flatMap((trigger) => forTrade.filter((t) => t.trigger === trigger))
  const standing = forTrade.filter((t) => t.trigger === 'always')
  const seen = new Set<string>()
  return [...triggered, ...standing].filter((t) => !seen.has(t.id) && seen.add(t.id)).slice(0, limit)
}

/** One tip by id, for showing what somebody has chosen to work on. */
export function tipById(id: string) {
  return RETAIL_TIPS.find((t) => t.id === id) ?? null
}
