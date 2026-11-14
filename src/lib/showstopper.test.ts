import { describe, expect, it } from 'vitest'
import { BADGE_RULES, buildShowstopper, goalPeriodKey, initialsOf } from './showstopper.js'
import type { SaleRow, ShowstopperInput, VisitRow } from './showstopper.js'
import { RETAIL_TIPS, TIP_RULES, tipById, tipsFor, triggersFor } from './retail-tips.js'

const at = (iso: string) => new Date(`${iso}T12:00:00`)

const sale = (staffName: string, over: Partial<SaleRow> = {}): SaleRow => ({
  staffName,
  productId: 1,
  name: 'Curl Cream',
  brand: 'The Doux',
  imageUrl: '',
  units: 1,
  centsEach: 2800,
  costEach: 1000,
  at: at('2026-03-05'),
  client: '',
  ...over,
})

const visit = (staffName: string, over: Partial<VisitRow> = {}): VisitRow => ({
  staffName,
  client: 'Ada',
  at: at('2026-03-05'),
  recommended: 1,
  takenHome: 1,
  ...over,
})

function input(over: Partial<ShowstopperInput> = {}): ShowstopperInput {
  return {
    periodLabel: 'March 2026',
    start: at('2026-03-01'),
    end: at('2026-04-01'),
    prevStart: at('2026-02-01'),
    prevEnd: at('2026-03-01'),
    sales: [],
    visits: [],
    team: [],
    goals: [],
    commissionPct: 0,
    businessType: 'salon',
    ...over,
  }
}

describe('buildShowstopper cards', () => {
  it('adds up what each person sold, and keeps last period beside it', () => {
    const r = buildShowstopper(
      input({
        sales: [
          sale('Minnie', { units: 2 }),
          sale('Minnie', { at: at('2026-02-10') }),
          sale('KaNesha', { units: 1, centsEach: 4000, costEach: 1500 }),
        ],
      }),
    )
    const minnie = r.cards.find((c) => c.name === 'Minnie')!
    expect(minnie.soldCents).toBe(5600)
    expect(minnie.soldUnits).toBe(2)
    expect(minnie.profitCents).toBe(3600)
    expect(minnie.prevSoldCents).toBe(2800)
    expect(r.teamSoldCents).toBe(9600)
    expect(r.cards[0].name).toBe('Minnie')
  })

  it('leaves out sales from outside both windows', () => {
    const r = buildShowstopper(input({ sales: [sale('Minnie', { at: at('2025-12-01') })] }))
    expect(r.cards).toHaveLength(0)
  })

  it('counts take-home rate from what was written on the record', () => {
    const r = buildShowstopper(
      input({ visits: [visit('Minnie', { recommended: 4, takenHome: 1 }), visit('Minnie', { recommended: 0, takenHome: 0 })] }),
    )
    const minnie = r.cards.find((c) => c.name === 'Minnie')!
    expect(minnie.visits).toBe(2)
    expect(minnie.recommended).toBe(4)
    expect(minnie.attachRate).toBe(0.25)
    expect(r.teamAttachRate).toBe(0.25)
  })

  it('divides retail by clients seen, and leaves it blank with no visits', () => {
    const withVisits = buildShowstopper(input({ sales: [sale('Minnie', { units: 4 })], visits: [visit('Minnie'), visit('Minnie')] }))
    expect(withVisits.cards[0].perVisitCents).toBe(5600)
    const none = buildShowstopper(input({ sales: [sale('Minnie')] }))
    expect(none.cards[0].perVisitCents).toBeNull()
  })

  it('counts days sold and distinct products, not just totals', () => {
    const r = buildShowstopper(
      input({
        sales: [
          sale('Minnie', { at: at('2026-03-02') }),
          sale('Minnie', { at: at('2026-03-02'), productId: 2, name: 'Tonik' }),
          sale('Minnie', { at: at('2026-03-09') }),
        ],
      }),
    )
    expect(r.cards[0].daysSold).toBe(2)
    expect(r.cards[0].distinctProducts).toBe(2)
    expect(r.cards[0].top[0].units).toBe(2)
  })

  it('spots a client who came back for more', () => {
    const r = buildShowstopper(
      input({
        sales: [
          sale('Minnie', { client: 'Ada' }),
          sale('Minnie', { client: 'ada ', at: at('2026-03-20') }),
          sale('Minnie', { client: 'Bo' }),
        ],
      }),
    )
    expect(r.cards[0].buyers).toBe(2)
    expect(r.cards[0].repeatBuyers).toBe(1)
  })

  it('names a quiet team member instead of ranking them last', () => {
    const r = buildShowstopper(
      input({ sales: [sale('Minnie')], team: [
          { name: 'Minnie', isProvider: true, sellsRetail: true },
          { name: 'Marsherrie', isProvider: false, sellsRetail: true },
        ] }),
    )
    expect(r.cards.map((c) => c.name)).toEqual(['Minnie'])
    expect(r.quiet.map((c) => c.name)).toEqual(['Marsherrie'])
    expect(r.quiet[0].tips.length).toBeGreaterThan(0)
  })

  it('works out what the commission rate makes of it, and nothing when unset', () => {
    const paid = buildShowstopper(input({ sales: [sale('Minnie', { units: 2 })], commissionPct: 10 }))
    expect(paid.cards[0].earnedCents).toBe(560)
    const unset = buildShowstopper(input({ sales: [sale('Minnie', { units: 2 })] }))
    expect(unset.cards[0].earnedCents).toBeNull()
  })

  it('tracks a goal, matching the name however it is capitalised', () => {
    const r = buildShowstopper(
      input({
        sales: [sale('Minnie', { units: 2 })],
        goals: [{ staffName: 'minnie', targetCents: 11_200, focusTips: ['show-the-amount'] }],
      }),
    )
    expect(r.cards[0].goalProgress).toBe(0.5)
    expect(r.cards[0].goal?.focusTips).toEqual(['show-the-amount'])
  })
})

describe('badges', () => {
  it('gives top seller to the biggest, and most improved to the biggest climb', () => {
    const r = buildShowstopper(
      input({
        sales: [
          sale('Minnie', { units: 10 }),
          sale('Minnie', { units: 9, at: at('2026-02-10') }),
          sale('KaNesha', { units: 4 }),
          sale('KaNesha', { units: 1, at: at('2026-02-10') }),
        ],
      }),
    )
    const minnie = r.cards.find((c) => c.name === 'Minnie')!
    const kanesha = r.cards.find((c) => c.name === 'KaNesha')!
    expect(minnie.badges.map((b) => b.id)).toContain('top-seller')
    expect(kanesha.badges.map((b) => b.id)).toContain('most-improved')
    expect(kanesha.badges.find((b) => b.id === 'most-improved')!.because).toBe('Up 300% on last period')
  })

  it('will not call a tiny climb an improvement', () => {
    const r = buildShowstopper(
      input({
        sales: [
          sale('KaNesha', { units: 1, centsEach: 500 }),
          sale('KaNesha', { units: 1, centsEach: 100, at: at('2026-02-10') }),
        ],
      }),
    )
    expect(r.cards[0].soldCents).toBeLessThan(BADGE_RULES.improvedFloor)
    expect(r.cards[0].badges.map((b) => b.id)).not.toContain('most-improved')
  })

  it('needs enough recommendations before the prescriber badge', () => {
    const thin = buildShowstopper(input({ sales: [sale('Minnie')], visits: [visit('Minnie', { recommended: 2, takenHome: 2 })] }))
    expect(thin.cards[0].badges.map((b) => b.id)).not.toContain('best-prescriber')
    const enough = buildShowstopper(input({ sales: [sale('Minnie')], visits: [visit('Minnie', { recommended: 4, takenHome: 3 })] }))
    expect(enough.cards[0].badges.find((b) => b.id === 'best-prescriber')!.because).toBe('75% of what they wrote down went home')
  })

  it('celebrates a first sale and a goal met', () => {
    const r = buildShowstopper(
      input({
        sales: [sale('KaNesha', { units: 2 })],
        goals: [{ staffName: 'KaNesha', targetCents: 5000, focusTips: [] }],
      }),
    )
    const ids = r.cards[0].badges.map((b) => b.id)
    expect(ids).toContain('first-sale')
    expect(ids).toContain('goal-hit')
  })

  it('gives the shelf badge only to someone selling a real range', () => {
    const many = Array.from({ length: 5 }, (_, i) => sale('Minnie', { productId: i + 1, name: `Item ${i}` }))
    const r = buildShowstopper(input({ sales: many }))
    expect(r.cards[0].badges.find((b) => b.id === 'widest-range')!.because).toBe('Sold 5 different products')
  })
})

describe('blind spots', () => {
  it('says when sales have no name, and when they came from Square', () => {
    const r = buildShowstopper(input({ sales: [sale(''), sale('Square POS')] }))
    expect(r.blindSpots.join(' ')).toContain("nobody's name")
    expect(r.blindSpots.join(' ')).toContain('Square')
  })

  it('always says retail is counted at the shelf price', () => {
    expect(buildShowstopper(input()).blindSpots.at(-1)).toContain('shelf price')
  })
})

describe('tips', () => {
  it('points at writing it down when visits have no recommendations', () => {
    const hit = triggersFor({ visits: 6, recommended: 1, takenHome: 1, distinctProducts: 1, soldUnits: 1, repeatBuyers: 0, buyers: 1 })
    expect(hit).toContain('few-recs')
  })

  it('points at the ask when plenty is written down but little goes home', () => {
    const hit = triggersFor({
      visits: 10,
      recommended: TIP_RULES.recsForAttach + 6,
      takenHome: 1,
      distinctProducts: 3,
      soldUnits: 1,
      repeatBuyers: 0,
      buyers: 1,
    })
    expect(hit).toContain('low-attach')
  })

  it('points at the shelf when the same thing sells over and over', () => {
    const hit = triggersFor({ visits: 8, recommended: 8, takenHome: 8, distinctProducts: 1, soldUnits: 9, repeatBuyers: 2, buyers: 3 })
    expect(hit).toContain('narrow-range')
  })

  it('tells a strong seller to name what works rather than inventing a problem', () => {
    const hit = triggersFor({ visits: 8, recommended: 8, takenHome: 7, distinctProducts: 6, soldUnits: 9, repeatBuyers: 3, buyers: 4 })
    expect(hit).toEqual(['strong'])
  })

  it('gives a tattoo shop its own tips and not the hair ones', () => {
    const ink = tipsFor({ visits: 0, recommended: 0, takenHome: 0, distinctProducts: 0, soldUnits: 0, repeatBuyers: 0, buyers: 0 }, 'tattoo')
    const ids = ink.map((t) => t.id)
    expect(ids).toContain('aftercare-is-the-work')
    expect(ids).not.toContain('porosity-not-price')
  })

  it('gives a salon the hair science and never more than asked for', () => {
    const hair = tipsFor({ visits: 0, recommended: 0, takenHome: 0, distinctProducts: 0, soldUnits: 0, repeatBuyers: 0, buyers: 0 }, 'salon', 4)
    expect(hair).toHaveLength(4)
    expect(hair.every((t) => t.audience.includes('all') || t.audience.includes('hair'))).toBe(true)
  })

  it('never repeats a tip in one list', () => {
    const list = tipsFor({ visits: 9, recommended: 9, takenHome: 1, distinctProducts: 1, soldUnits: 9, repeatBuyers: 0, buyers: 4 }, 'salon', 12)
    expect(new Set(list.map((t) => t.id)).size).toBe(list.length)
  })

  it('every tip says both what to do and why it works', () => {
    for (const tip of RETAIL_TIPS) {
      expect(tip.how.length, tip.id).toBeGreaterThan(20)
      expect(tip.why.length, tip.id).toBeGreaterThan(40)
      expect(tip.audience.length, tip.id).toBeGreaterThan(0)
    }
    expect(new Set(RETAIL_TIPS.map((t) => t.id)).size).toBe(RETAIL_TIPS.length)
  })

  it('finds a tip by id, and says so when there is none', () => {
    expect(tipById('show-the-amount')?.title).toContain('real amount')
    expect(tipById('nope')).toBeNull()
  })
})

describe('small helpers', () => {
  it('makes initials from one or two names', () => {
    expect(initialsOf('Minnie Little')).toBe('ML')
    expect(initialsOf('KaNesha')).toBe('KA')
    expect(initialsOf('  ')).toBe('?')
  })

  it('keys a goal by the local month', () => {
    expect(goalPeriodKey(at('2026-03-09'))).toBe('2026-03')
  })
})

describe('names that are not people', () => {
  it('keeps Square, blanks and the old Formulas label off the cards', () => {
    const r = buildShowstopper(
      input({
        sales: [sale('Minnie'), sale('Square POS', { units: 3 }), sale(''), sale('Formulas')],
        team: [{ name: 'Minnie', isProvider: true, sellsRetail: true }],
      }),
    )
    expect(r.cards.map((c) => c.name)).toEqual(['Minnie'])
    expect(r.quiet).toHaveLength(0)
  })

  it('still counts their money in the team total, and says how much is uncredited', () => {
    const r = buildShowstopper(input({ sales: [sale('Minnie'), sale('Square POS', { units: 2 })] }))
    expect(r.teamSoldCents).toBe(8400)
    expect(r.uncreditedCents).toBe(5600)
    expect(r.blindSpots.join(' ')).toContain('credited to nobody')
  })

  it('never hands a badge to a placeholder', () => {
    const r = buildShowstopper(input({ sales: [sale('Square POS', { units: 9 }), sale('Minnie')] }))
    expect(r.cards.find((c) => c.name === 'Minnie')!.badges.map((b) => b.id)).toContain('top-seller')
  })

  it('counts visits with no team member as a gap, not as a person', () => {
    const r = buildShowstopper(input({ visits: [visit('', { recommended: 2, takenHome: 0 })] }))
    expect(r.cards).toHaveLength(0)
    expect(r.blindSpots.join(' ')).toContain('no team member')
  })
})

describe('people who do not sell retail', () => {
  const team = [
    { name: 'Minnie', isProvider: true, sellsRetail: true },
    { name: 'Marsherrie', isProvider: false, sellsRetail: false },
  ]

  it('leaves a contractor off the board entirely, not at the bottom of it', () => {
    const r = buildShowstopper(input({ sales: [sale('Minnie')], team }))
    expect(r.cards.map((c) => c.name)).toEqual(['Minnie'])
    expect(r.quiet.map((c) => c.name)).toEqual([])
  })

  it('flags money logged under their name instead of swallowing it', () => {
    const r = buildShowstopper(input({ sales: [sale('Minnie'), sale('Marsherrie', { units: 2 })], team }))
    expect(r.cards.map((c) => c.name)).toEqual(['Minnie'])
    expect(r.uncreditedCents).toBe(5600)
    expect(r.teamSoldCents).toBe(8400)
    expect(r.blindSpots.join(' ')).toContain('Marsherrie is marked as not selling retail')
  })

  it('never hands them a badge', () => {
    const r = buildShowstopper(input({ sales: [sale('Marsherrie', { units: 9 }), sale('Minnie')], team }))
    expect(r.cards.find((c) => c.name === 'Minnie')!.badges.map((b) => b.id)).toContain('top-seller')
  })
})
