import { describe, expect, it } from 'vitest'
import {
  HK_MOMENTS,
  appreciation,
  buildButtons,
  dayNumberOf,
  housekeepingDefaultsFor,
  matchTeamName,
  momentOf,
  openJobs,
  ownersOf,
  reminderDetail,
  summarizePeople,
  turnFor,
  type HkCheck,
  type HkDay,
  type HkTask,
} from './housekeeping'

const tasks: HkTask[] = housekeepingDefaultsFor('salon').map(({ required: _r, ...t }, i) => ({ ...t, assign: t.assign ?? 'everyone', id: i + 1, active: true, assignees: [] }))
const byKey = (k: string) => tasks.find((t) => t.key === k)!
let n = 0
const check = (key: string, staffName: string, at = '2026-11-16T15:00:00Z'): HkCheck => ({ id: ++n, taskId: byKey(key).id, staffName, at })
const day = (over: Partial<HkDay> = {}): HkDay => ({
  team: ['Beth', 'KaNesha', 'Minnie'],
  working: ['Beth', 'KaNesha'],
  inventoryManagers: ['Minnie'],
  dayNumber: dayNumberOf('2026-11-16'),
  ...over,
})

describe('housekeeping defaults', () => {
  it('has every job she listed, with unique keys and names, in every trade', () => {
    const names = tasks.map((t) => t.name.toLowerCase()).join(' | ')
    for (const word of ['station', 'shampoo bowl', 'sweep', 'towels', 'refrigerator', 'dispensary', 'brushes', 'stain', 'organize', 'plants', 'lock']) {
      expect(names).toContain(word)
    }
    for (const type of ['salon', 'barber', 'nails', 'brows', 'tattoo', 'spa', 'other']) {
      const list = housekeepingDefaultsFor(type)
      expect(new Set(list.map((t) => t.key)).size).toBe(list.length)
      expect(new Set(list.map((t) => t.name)).size).toBe(list.length)
      expect(list.filter((t) => t.role === 'inventory').map((t) => t.key).sort()).toEqual(['inv-recount', 'inv-recycle', 'inv-refill', 'inv-restock'])
      expect(list.some((t) => t.key === 'take-out-trash' && t.role === 'artist')).toBe(true)
    }
  })

  it('does bowls and sweeping after every client, for everyone', () => {
    for (const key of ['shampoo-bowls', 'sweep-floor', 'station-client']) {
      expect(byKey(key)).toMatchObject({ cadence: 'client', scope: 'each', assign: 'everyone' })
    }
  })

  it('maps every cadence to one of the three moments', () => {
    expect(HK_MOMENTS.map((m) => m.id)).toEqual(['arrive', 'client', 'close'])
    expect(momentOf('open')).toBe('arrive')
    expect(momentOf('client')).toBe('client')
    for (const c of ['daily', 'close', 'weekly'] as const) expect(momentOf(c)).toBe('close')
  })
})

describe('who owns a job', () => {
  it('takes turns through who is working, one person a day, moving on daily', () => {
    const plants = byKey('water-plants')
    const today = ownersOf(plants, day())
    expect(today).toHaveLength(1)
    expect(['Beth', 'KaNesha']).toContain(today[0])
    const tomorrow = turnFor(plants, day({ dayNumber: day().dayNumber + 1 }))
    expect(tomorrow).not.toBe(today[0])
  })

  it('falls back to the whole team when nobody is scheduled', () => {
    const t = turnFor(byKey('lock-doors'), day({ working: [] }))
    expect(['Beth', 'KaNesha', 'Minnie']).toContain(t)
  })

  it('gives Inventory Management jobs to inventory managers only', () => {
    expect(ownersOf(byKey('inv-restock'), day())).toEqual(['Minnie'])
    expect(ownersOf(byKey('inv-restock'), day({ inventoryManagers: [] }))).toEqual([])
  })

  it('gives assigned jobs to exactly who the owner picked', () => {
    const towels = { ...byKey('discard-towels'), assign: 'assigned' as const, assignees: ['KaNesha'] }
    expect(ownersOf(towels, day())).toEqual(['KaNesha'])
  })

  it('puts everyone-jobs on everyone working', () => {
    expect(ownersOf(byKey('organize-station'), day())).toEqual(['Beth', 'KaNesha'])
  })
})

describe('buildButtons', () => {
  it('counts after-client taps and never marks them done', () => {
    const b = buildButtons(tasks, [check('station-client', 'Beth'), check('station-client', 'Beth'), check('station-client', 'KaNesha')], 'beth ', day())
    const station = b.find((x) => x.task.key === 'station-client')!
    expect(station.mine).toBe(2)
    expect(station.done).toBe(false)
    expect(station.onList).toBe(true)
  })

  it('marks own-station jobs done per person and shop jobs done for everyone', () => {
    const checks = [check('organize-station', 'Beth'), check('restock-fridge', 'KaNesha')]
    const beth = buildButtons(tasks, checks, 'Beth', day())
    const kanesha = buildButtons(tasks, checks, 'KaNesha', day())
    expect(beth.find((x) => x.task.key === 'organize-station')!.done).toBe(true)
    expect(kanesha.find((x) => x.task.key === 'organize-station')!.done).toBe(false)
    expect(beth.find((x) => x.task.key === 'restock-fridge')!.doneBy?.staffName).toBe('KaNesha')
  })

  it('counts weekly jobs done for the whole week', () => {
    const week = [check('inv-recount', 'Minnie', '2026-11-12T15:00:00Z')]
    const b = buildButtons(tasks, [], 'Minnie', day(), week)
    expect(b.find((x) => x.task.key === 'inv-recount')!.done).toBe(true)
  })
})

describe('summaries and the board', () => {
  it('counts only what is on each person’s list, not after-client jobs', () => {
    const [beth] = summarizePeople(tasks, [check('station-client', 'Beth')], ['Beth'], day())
    const mine = buildButtons(tasks, [], 'Beth', day()).filter((b) => b.onList && b.task.cadence !== 'client')
    expect(beth.total).toBe(mine.length)
    expect(beth.done).toBe(0)
    expect(beth.clients).toBe(1)
    expect(mine.some((b) => b.task.role === 'inventory')).toBe(false)
  })

  it('lists open shop jobs with their owner, and drops them once covered', () => {
    const open = openJobs(tasks, [], day())
    const plants = open.find((o) => o.task.key === 'water-plants')!
    expect(plants.owners).toHaveLength(1)
    const after = openJobs(tasks, [check('water-plants', 'Beth')], day())
    expect(after.some((o) => o.task.key === 'water-plants')).toBe(false)
    expect(open.some((o) => o.task.cadence === 'client' || o.task.scope === 'each')).toBe(false)
  })
})

describe('words', () => {
  it('thanks by name and celebrates a finished list', () => {
    const a = appreciation({ staffName: 'Beth Englert', task: byKey('water-plants'), seed: 1 })
    expect(a.title + a.body).toContain('Beth')
    const done = appreciation({ staffName: 'Beth', task: byKey('lock-doors'), seed: 2, allDone: true })
    expect(done.title.length).toBeGreaterThan(0)
  })

  it('summarizes checkout items and matches Square names to the team', () => {
    expect(reminderDetail(['Curl cream'])).toContain('Curl cream')
    expect(matchTeamName('beth englert', ['Beth Englert', 'KaNesha Huey'])).toBe('Beth Englert')
  })
})
