import { describe, expect, it } from 'vitest'
import {
  HOUSEKEEPING_DEFAULTS,
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

describe('summaries', () => {
  it('counts each person’s own once-a-day jobs and their station resets', () => {
    const own = tasks.filter((t) => t.scope === 'each' && t.cadence !== 'client').length
    const [beth] = summarizePeople(tasks, [check('organize-station', 'Beth'), check('station-client', 'Beth'), check('lock-doors', 'Beth')], ['Beth'])
    expect(beth).toEqual({ staffName: 'Beth', done: 1, total: own, clients: 1 })
  })

  it('lists shop jobs nobody has covered', () => {
    const open = openShopJobs(tasks, [check('lock-doors', 'Beth')]).map((t) => t.key)
    expect(open).not.toContain('lock-doors')
    expect(open).toContain('water-plants')
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
