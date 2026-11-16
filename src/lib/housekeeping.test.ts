import { describe, expect, it } from 'vitest'
import {
  HK_MOMENTS,
  DEFAULT_REPEAT,
  appreciation,
  buildButtons,
  comingUp,
  periodOf,
  repeatLabel,
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
  type HkRepeat,
  type HkTask,
} from './housekeeping'

const tasks: HkTask[] = housekeepingDefaultsFor('salon').map(({ required: _r, ...t }, i) => ({ ...t, assign: t.assign ?? 'everyone', id: i + 1, active: true, assignees: [] }))
const byKey = (k: string) => tasks.find((t) => t.key === k)!
let n = 0
const check = (key: string, staffName: string, dayKey = '2026-11-16'): HkCheck => ({ id: ++n, taskId: byKey(key).id, staffName, at: `${dayKey}T15:00:00Z`, dayKey })
const day = (over: Partial<HkDay> = {}): HkDay => ({
  team: ['Beth', 'KaNesha', 'Minnie'],
  working: ['Beth', 'KaNesha'],
  inventoryManagers: ['Minnie'],
  dayKey: '2026-11-16', // a Monday
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
    for (const c of ['daily', 'close'] as const) expect(momentOf(c)).toBe('close')
  })
})

describe('who owns a job', () => {
  it('takes turns through who is working, one person a day, moving on daily', () => {
    const plants = byKey('water-plants')
    const today = ownersOf(plants, day())
    expect(today).toHaveLength(1)
    expect(['Beth', 'KaNesha']).toContain(today[0])
    const tomorrow = turnFor(plants, day({ dayKey: '2026-11-17' }))
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
    expect(byKey('inv-recount').repeat).toMatchObject({ kind: 'weeks', flex: true })
    const sunday = [check('inv-recount', 'Minnie', '2026-11-15')]
    expect(buildButtons(tasks, sunday, 'Minnie', day()).find((x) => x.task.key === 'inv-recount')!.done).toBe(true)
    const lastWeek = [check('inv-recount', 'Minnie', '2026-11-12')]
    expect(buildButtons(tasks, lastWeek, 'Minnie', day()).find((x) => x.task.key === 'inv-recount')!.done).toBe(false)
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

describe('how often a duty comes up', () => {
  const r = (over: Partial<HkRepeat>): HkRepeat => ({ ...DEFAULT_REPEAT, ...over })
  const due = (rep: HkRepeat, d: string) => periodOf(rep, d).due

  it('certain days: only on those weekdays', () => {
    const monThu = r({ kind: 'days', days: [1, 4] })
    expect(due(monThu, '2026-11-16')).toBe(true) // Mon
    expect(due(monThu, '2026-11-17')).toBe(false)
    expect(due(monThu, '2026-11-19')).toBe(true) // Thu
    expect(repeatLabel(monThu)).toBe('Mon, Thu')
  })

  it('takes turns per time it comes up, not per calendar day', () => {
    const plants = { ...byKey('water-plants'), repeat: r({ kind: 'days', days: [1, 4] }) }
    const turns = ['2026-11-16', '2026-11-19', '2026-11-23', '2026-11-26'].map((d) => turnFor(plants, day({ dayKey: d })))
    expect(new Set(turns.slice(0, 2)).size).toBe(2)
    expect(turns[0]).toBe(turns[2])
    expect(turns[1]).toBe(turns[3])
    expect(ownersOf(plants, day({ dayKey: '2026-11-17' }))).toEqual([])
  })

  it('every 2 weeks from a start date', () => {
    const fortnight = r({ kind: 'weeks', every: 2, days: [1], anchor: '2026-11-16' })
    expect(due(fortnight, '2026-11-16')).toBe(true)
    expect(due(fortnight, '2026-11-23')).toBe(false)
    expect(due(fortnight, '2026-11-30')).toBe(true)
    expect(repeatLabel(fortnight)).toBe('Every 2 weeks · Mon')
  })

  it('every few days', () => {
    const three = r({ kind: 'interval', every: 3, anchor: '2026-11-16' })
    expect(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map((d) => due(three, d))).toEqual([true, false, false, true])
  })

  it('monthly on a day, and the last day of any month', () => {
    expect(due(r({ kind: 'monthly', monthDay: 16 }), '2026-11-16')).toBe(true)
    const last = r({ kind: 'monthly', monthDay: 31 })
    expect(due(last, '2026-11-30')).toBe(true)
    expect(due(last, '2027-02-28')).toBe(true)
    expect(due(last, '2026-11-29')).toBe(false)
  })

  it('flexible month: open all month, done once', () => {
    const towels = { ...byKey('discard-towels'), repeat: r({ kind: 'monthly', flex: true }) }
    const list = tasks.map((t) => (t.id === towels.id ? towels : t))
    const early = [{ ...check('discard-towels', 'Beth', '2026-11-03') }]
    const b = buildButtons(list, early, 'Beth', day()).find((x) => x.task.id === towels.id)!
    expect(b.due && b.done && b.long).toBe(true)
    const nextMonth = buildButtons(list, early, 'Beth', day({ dayKey: '2026-12-01' })).find((x) => x.task.id === towels.id)!
    expect(nextMonth.done).toBe(false)
  })

  it('lists what is coming up, soonest first', () => {
    const list = tasks.map((t) => (t.key === 'water-plants' ? { ...t, repeat: r({ kind: 'days', days: [4] }) } : t))
    const up = comingUp(list, day())
    expect(up[0]).toMatchObject({ next: '2026-11-19' })
    expect(up[0].task.key).toBe('water-plants')
  })
})
