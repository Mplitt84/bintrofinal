/**
 * Housekeeping: the shop's cleaning and closing jobs as bold round buttons, who did
 * each one today, and the thank-you that follows a tap. Client-safe and pure, so the
 * board's rules have one home and are tested (housekeeping.test.ts).
 *
 * Two kinds of job:
 * - `each`: every team member does their own (their station, their brushes).
 * - `shop`: one person covers it for everyone today (lock the doors, water the plants).
 * And four times of day: after each client (counts up all day), opening, during the
 * day, and before you leave.
 */

export type HkCadence = 'client' | 'open' | 'daily' | 'close'
export type HkScope = 'each' | 'shop'

/** Fixed tones, the same bold brand circles as the round action buttons (ToolButton). */
export const HK_TONES = ['garnet', 'royal', 'green', 'teal', 'purple', 'orange', 'yellow', 'red', 'charcoal'] as const
export type HkTone = (typeof HK_TONES)[number]

/** Icon ids; the screen maps each to a drawing. Owners pick from these for their own jobs. */
export const HK_ICONS = [
  'sparkles',
  'spray',
  'droplets',
  'broom',
  'towel',
  'fridge',
  'flask',
  'paintbrush',
  'eraser',
  'grid',
  'sprout',
  'lock',
  'trash',
  'shirt',
  'wind',
  'sun',
  'coffee',
  'package',
  'scissors',
  'heart',
  'bell',
  'clipboard',
  'shower',
  'recycle',
  'key',
  'light',
] as const
export type HkIcon = (typeof HK_ICONS)[number]

export const HK_CADENCES: { id: HkCadence; label: string; hint: string }[] = [
  { id: 'open', label: 'Opening', hint: 'Once, when the day starts' },
  { id: 'client', label: 'After each client', hint: 'Tap every time · counts up all day' },
  { id: 'daily', label: 'During the day', hint: 'Once a day' },
  { id: 'close', label: 'Before you leave', hint: 'Once, at the end of the day' },
]

export type HkTaskSpec = {
  key: string
  name: string
  icon: HkIcon
  tone: HkTone
  cadence: HkCadence
  scope: HkScope
  why: string
}

/** What every new shop starts with. Owners can hide any of them and add their own. */
export const HOUSEKEEPING_DEFAULTS: HkTaskSpec[] = [
  {
    key: 'station-client',
    name: 'Clean & disinfect station',
    icon: 'spray',
    tone: 'garnet',
    cadence: 'client',
    scope: 'each',
    why: 'A freshly disinfected station tells every client they’re safe in your chair.',
  },
  {
    key: 'organize-station',
    name: 'Organize station',
    icon: 'grid',
    tone: 'purple',
    cadence: 'open',
    scope: 'each',
    why: 'An organized station saves you time on every client.',
  },
  {
    key: 'restock-fridge',
    name: 'Restock refrigerator',
    icon: 'fridge',
    tone: 'teal',
    cadence: 'open',
    scope: 'shop',
    why: 'A stocked fridge makes every guest feel welcome.',
  },
  {
    key: 'shampoo-bowls',
    name: 'Disinfect shampoo bowls',
    icon: 'droplets',
    tone: 'royal',
    cadence: 'daily',
    scope: 'shop',
    why: 'Clean bowls are the first thing a client feels at the shampoo.',
  },
  {
    key: 'sweep-floor',
    name: 'Sweep floor',
    icon: 'broom',
    tone: 'orange',
    cadence: 'daily',
    scope: 'shop',
    why: 'Clean floors keep everyone safe and the shop looking its best.',
  },
  {
    key: 'discard-towels',
    name: 'Discard towels',
    icon: 'towel',
    tone: 'charcoal',
    cadence: 'daily',
    scope: 'shop',
    why: 'Fresh towels for every client. That’s the standard.',
  },
  {
    key: 'brushes-replaced',
    name: 'Brushes replaced',
    icon: 'paintbrush',
    tone: 'yellow',
    cadence: 'daily',
    scope: 'each',
    why: 'Fresh brushes keep color and product working the way they should.',
  },
  {
    key: 'stain-removal',
    name: 'Stain removal at station',
    icon: 'eraser',
    tone: 'red',
    cadence: 'daily',
    scope: 'each',
    why: 'No stains, no second looks. Your station looks as good as your work.',
  },
  {
    key: 'water-plants',
    name: 'Water plants',
    icon: 'sprout',
    tone: 'green',
    cadence: 'daily',
    scope: 'shop',
    why: 'The plants keep the shop feeling alive.',
  },
  {
    key: 'clean-dispensary',
    name: 'Clean dispensary',
    icon: 'flask',
    tone: 'teal',
    cadence: 'close',
    scope: 'shop',
    why: 'A clean dispensary means accurate mixing and less waste.',
  },
  {
    key: 'station-close',
    name: 'Disinfect station before leaving',
    icon: 'sparkles',
    tone: 'garnet',
    cadence: 'close',
    scope: 'each',
    why: 'Tomorrow starts clean because of you.',
  },
  {
    key: 'lock-doors',
    name: 'Lock doors',
    icon: 'lock',
    tone: 'royal',
    cadence: 'close',
    scope: 'shop',
    why: 'The shop is safe for the night. Thank you for closing up.',
  },
]

/** The built-in job a checkout reminder ticks off. */
export const STATION_TASK_KEY = 'station-client'

export type HkTask = {
  id: number
  key: string
  name: string
  icon: HkIcon
  tone: HkTone
  cadence: HkCadence
  scope: HkScope
  why: string
  active: boolean
}

export type HkCheck = { id: number; taskId: number; staffName: string; at: string }

export type HkReminder = { id: number; staffName: string; detail: string; at: string }

/** One button's state on the board, for the person whose board it is. */
export type HkButton = {
  task: HkTask
  /** Times this person tapped it today (after-client jobs count up). */
  mine: number
  /** For a shop job: who covered it today and when; null = nobody yet. */
  coveredBy: { staffName: string; at: string } | null
  /** Nothing left to do on it today for this person. */
  done: boolean
}

export type HkPersonSummary = { staffName: string; done: number; total: number; clients: number }

/** Lower-cased, trimmed: how names are compared, so "Beth " and "beth" are one person. */
export const nameKey = (name: string) => name.trim().toLowerCase()

/** This person's buttons for today, grouped later by cadence on screen. */
export function buildButtons(tasks: HkTask[], checks: HkCheck[], staffName: string): HkButton[] {
  const me = nameKey(staffName)
  return tasks
    .filter((t) => t.active)
    .map((task) => {
      const forTask = checks.filter((c) => c.taskId === task.id)
      const mine = forTask.filter((c) => nameKey(c.staffName) === me).length
      const first = [...forTask].sort((a, b) => a.at.localeCompare(b.at))[0]
      const coveredBy = task.scope === 'shop' && first ? { staffName: first.staffName, at: first.at } : null
      const done = task.cadence === 'client' ? false : task.scope === 'shop' ? Boolean(coveredBy) : mine > 0
      return { task, mine, coveredBy, done }
    })
}

/** How far along each person is today: their own once-a-day jobs done, plus clients reset. */
export function summarizePeople(tasks: HkTask[], checks: HkCheck[], people: string[]): HkPersonSummary[] {
  const own = tasks.filter((t) => t.active && t.scope === 'each' && t.cadence !== 'client')
  const clientIds = new Set(tasks.filter((t) => t.active && t.cadence === 'client').map((t) => t.id))
  return people.map((staffName) => {
    const me = nameKey(staffName)
    const mineChecks = checks.filter((c) => nameKey(c.staffName) === me)
    const doneIds = new Set(mineChecks.map((c) => c.taskId))
    return {
      staffName,
      done: own.filter((t) => doneIds.has(t.id)).length,
      total: own.length,
      clients: mineChecks.filter((c) => clientIds.has(c.taskId)).length,
    }
  })
}

/** Shop jobs still open today, so the board can say what nobody has covered yet. */
export function openShopJobs(tasks: HkTask[], checks: HkCheck[]): HkTask[] {
  const covered = new Set(checks.map((c) => c.taskId))
  return tasks.filter((t) => t.active && t.scope === 'shop' && !covered.has(t.id))
}

const OPENERS = ['Thank you', 'Appreciate you', 'Nicely done', 'That’s care', 'Love to see it', 'Thanks for that']

/**
 * The thank-you after a tap: personal, specific to the job, and never the same twice
 * in a row (the seed is the person's tap count, so it moves on each time).
 */
export function appreciation(input: {
  staffName: string
  task: Pick<HkTask, 'name' | 'why' | 'cadence'>
  seed: number
  /** After-client jobs: how many this person has done today, including this one. */
  count?: number
  /** True when this tap finished the person's whole list for today. */
  allDone?: boolean
}): { title: string; body: string } {
  const first = input.staffName.trim().split(/\s+/)[0] || 'friend'
  if (input.allDone) {
    return {
      title: `That’s your whole list, ${first}!`,
      body: 'Every job done today. The whole team feels the difference. Thank you.',
    }
  }
  const opener = OPENERS[Math.abs(input.seed) % OPENERS.length]
  const why = input.task.why || `${input.task.name}: done.`
  if (input.task.cadence === 'client' && input.count && input.count > 1) {
    return { title: `${opener}, ${first}. Station #${input.count} today.`, body: why }
  }
  return { title: `${opener}, ${first}.`, body: why }
}

/** Local date of a device as YYYY-MM-DD: the day the shop is working in. */
export function localDayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** A reminder line for a checkout: "Curl cream + 2 more" or "A client checked out". */
export function reminderDetail(items: string[]) {
  const names = items.map((n) => n.trim()).filter(Boolean)
  if (names.length === 0) return 'A client checked out'
  return names.length === 1 ? names[0] : `${names[0]} + ${names.length - 1} more`
}

/** Matches a Square team member's name to the team list: full name first, then a unique first name. */
export function matchTeamName(squareName: string, team: string[]): string {
  const full = nameKey(squareName)
  if (!full) return ''
  const exact = team.find((t) => nameKey(t) === full)
  if (exact) return exact
  const firstOf = (n: string) => nameKey(n).split(/\s+/)[0]
  const first = firstOf(squareName)
  const byFirst = team.filter((t) => firstOf(t) === first)
  return byFirst.length === 1 ? byFirst[0] : ''
}
