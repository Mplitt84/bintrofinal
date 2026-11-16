import { describe, expect, it } from 'vitest'
import {
  HOUSEKEEPING_DEFAULTS,
  housekeepingDefaultsFor,
  appreciation,
  buildButtons,
  matchTeamName,
  openShopJobs,
  reminderDetail,
  summarizePeople,
  type HkCheck,
  type HkTask,
} from './housekeeping'

const tasks: HkTask[] = HOUSEKEEPING_DEFAULTS.map((t, i) => ({ ...t, id: i + 1, active: true }))
const byKey = (k: string) => tasks.find((t) => t.key === k)!
const check = (key: string, staffName: string, at = '2026-11-16T15:00:00Z', id = Math.random()): HkCheck => ({
  id,
  taskId: byKey(key).id,
  staffName,
  at,
})

describe('housekeeping defaults', () => {
  it('has every job she listed, with unique keys and names', () => {
    const names = tasks.map((t) => t.name.toLowerCase()).join(' | ')
    for (const word of ['station', 'shampoo bowls', 'sweep', 'towels', 'refrigerator', 'dispensary', 'brushes', 'stain', 'organize', 'plants', 'lock']) {
      expect(names).toContain(word)
    }
    expect(new Set(tasks.map((t) => t.key)).size).toBe(tasks.length)
    expect(new Set(tasks.map((t) => t.name)).size).toBe(tasks.length)
  })
})

describe('buildButtons', () => {
  it('counts after-client taps and never marks them done', () => {
    const b = buildButtons(tasks, [check('station-client', 'Beth'), check('station-client', 'Beth'), check('station-client', 'Kanesha')], 'beth ')
    const station = b.find((x) => x.task.key === 'station-client')!
    expect(station.mine).toBe(2)
    expect(station.done).toBe(false)
  })

  it('a shop job covered by one person is done for everyone, and says who', () => {
    const b = buildButtons(tasks, [check('lock-doors', 'Kanesha', '2026-11-16T23:00:00Z')], 'Beth')
    const lock = b.find((x) => x.task.key === 'lock-doors')!
    expect(lock.done).toBe(true)
    expect(lock.coveredBy?.staffName).toBe('Kanesha')
  })

  it('an own-station job is only done by the person who did it', () => {
    const checks = [check('organize-station', 'Kanesha')]
    expect(buildButtons(tasks, checks, 'Beth').find((x) => x.task.key === 'organize-station')!.done).toBe(false)
    expect(buildButtons(tasks, checks, 'Kanesha').find((x) => x.task.key === 'organize-station')!.done).toBe(true)
  })

  it('leaves hidden jobs off', () => {
    const hidden = tasks.map((t) => (t.key === 'water-plants' ? { ...t, active: false } : t))
    expect(buildButtons(hidden, [], 'Beth').some((x) => x.task.key === 'water-plants')).toBe(false)
  })
})

describe('required and optional jobs', () => {
  it('makes station cleaning, bowls, sweeping and the fridge required, towels and plants optional', () => {
    for (const k of ['station-client', 'station-close', 'shampoo-bowls', 'sweep-floor', 'restock-fridge']) expect(byKey(k).required).toBe(true)
    for (const k of ['discard-towels', 'water-plants']) expect(byKey(k).required).toBe(false)
  })

  it('counts a person’s list as required jobs plus the extras they chose', () => {
    const requiredOnce = tasks.filter((t) => t.required && t.role === 'artist' && t.cadence !== 'client' && t.cadence !== 'weekly').length
    const [plain] = summarizePeople(tasks, [], ['Beth'])
    expect(plain.total).toBe(requiredOnce)
    const [withPlants] = summarizePeople(tasks, [], ['Beth'], { Beth: [byKey('water-plants').id] })
    expect(withPlants.total).toBe(requiredOnce + 1)
  })

  it('counts a shop job on your list as done once anyone covers it, and own jobs only when you do them', () => {
    const checks = [check('sweep-floor', 'Kanesha'), check('station-close', 'Kanesha'), check('station-client', 'Beth')]
    const [beth] = summarizePeople(tasks, checks, ['Beth'])
    expect(beth.done).toBe(1)
    expect(beth.clients).toBe(1)
  })

  it('only lists open shop jobs someone is responsible for', () => {
    const open = openShopJobs(tasks, [check('sweep-floor', 'Beth')]).map((t) => t.key)
    expect(open).not.toContain('sweep-floor')
    expect(open).toContain('shampoo-bowls')
    expect(open).not.toContain('water-plants')
    expect(openShopJobs(tasks, [], { Beth: [byKey('water-plants').id] }).map((t) => t.key)).toContain('water-plants')
  })
})

describe('artist and inventory manager obligations', () => {
  it('puts the four Rs on inventory managers’ lists only, and trash and recycling in the artist section', () => {
    for (const k of ['inv-restock', 'inv-recount', 'inv-refill', 'inv-recycle']) {
      expect(byKey(k).role).toBe('inventory')
      expect(byKey(k).required).toBe(true)
    }
    for (const k of ['take-out-trash', 'sort-recycling']) expect(byKey(k).role).toBe('artist')
    const daily = tasks.filter((t) => t.role === 'inventory' && t.required && t.cadence !== 'weekly').length
    const [artist] = summarizePeople(tasks, [], ['Beth'])
    const [manager] = summarizePeople(tasks, [], ['Marsherrie'], {}, ['marsherrie'])
    expect(manager.total - artist.total).toBe(daily)
  })

  it('treats a weekly job as done if anyone did it in the last 7 days', () => {
    const lastWeek = [check('inv-recount', 'Marsherrie', '2026-11-12T15:00:00Z')]
    const recount = buildButtons(tasks, [], 'Marsherrie', lastWeek).find((b) => b.task.key === 'inv-recount')!
    expect(recount.done).toBe(true)
    expect(openShopJobs(tasks, [], {}, lastWeek).some((t) => t.key === 'inv-recount')).toBe(false)
    expect(openShopJobs(tasks, [], {}, []).some((t) => t.key === 'inv-recount')).toBe(true)
  })
})

describe('starting jobs by trade', () => {
  it('gives every trade the required basics and a station job checkout reminders can tick off', () => {
    for (const type of ['salon', 'barber', 'nails', 'brows', 'tattoo', 'spa', 'other', 'anything']) {
      const list = housekeepingDefaultsFor(type)
      expect(list.find((t) => t.key === 'station-client')?.required).toBe(true)
      expect(list.find((t) => t.key === 'sweep-floor')?.required).toBe(true)
      expect(list.find((t) => t.key === 'restock-fridge')?.required).toBe(true)
      expect(new Set(list.map((t) => t.key)).size).toBe(list.length)
      expect(new Set(list.map((t) => t.name)).size).toBe(list.length)
    }
  })

  it('tailors the jobs to the trade', () => {
    expect(housekeepingDefaultsFor('barber').some((t) => t.key === 'clippers-oil')).toBe(true)
    expect(housekeepingDefaultsFor('nails').some((t) => t.key === 'pedi-tubs' && t.required)).toBe(true)
    expect(housekeepingDefaultsFor('tattoo').some((t) => t.key === 'autoclave' && t.required)).toBe(true)
    expect(housekeepingDefaultsFor('spa').some((t) => t.key === 'linens')).toBe(true)
    expect(housekeepingDefaultsFor('tattoo').some((t) => t.key === 'shampoo-bowls')).toBe(false)
  })
})

describe('thank-yous', () => {
  const task = byKey('shampoo-bowls')
  it('uses the first name and the job’s reason', () => {
    const t = appreciation({ staffName: 'Beth Englert', task, seed: 0 })
    expect(t.title).toContain('Beth')
    expect(t.title).not.toContain('Englert')
    expect(t.body).toBe(task.why)
  })
  it('changes its opening from one tap to the next', () => {
    expect(appreciation({ staffName: 'Beth', task, seed: 1 }).title).not.toBe(appreciation({ staffName: 'Beth', task, seed: 2 }).title)
  })
  it('counts stations and celebrates a finished list', () => {
    expect(appreciation({ staffName: 'Beth', task: byKey('station-client'), seed: 0, count: 3 }).title).toContain('#3')
    expect(appreciation({ staffName: 'Beth', task, seed: 0, allDone: true }).title).toContain('whole list')
  })
})

describe('checkout reminders', () => {
  it('describes what was checked out', () => {
    expect(reminderDetail([])).toBe('A client checked out')
    expect(reminderDetail(['Curl cream'])).toBe('Curl cream')
    expect(reminderDetail(['Curl cream', 'Gel', ''])).toBe('Curl cream + 1 more')
  })
  it('matches a Square name to the team by full name, then a unique first name', () => {
    const team = ['Beth Englert', 'KaNesha Huey', 'Minnie']
    expect(matchTeamName('beth englert', team)).toBe('Beth Englert')
    expect(matchTeamName('Kanesha H', team)).toBe('KaNesha Huey')
    expect(matchTeamName('Minnie Little', team)).toBe('Minnie')
    expect(matchTeamName('Sam', team)).toBe('')
    expect(matchTeamName('Beth', ['Beth A', 'Beth B'])).toBe('')
  })
})
