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

export type HkCadence = 'client' | 'open' | 'daily' | 'close' | 'weekly'
/** Whose obligations: artists and technicians, or whoever manages inventory (Team → Manages inventory). */
export type HkRole = 'artist' | 'inventory'
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
  { id: 'weekly', label: 'Every week', hint: 'Once in any 7 days' },
]

export const HK_ROLES: { id: HkRole; label: string; hint: string }[] = [
  { id: 'artist', label: 'Artist & technician obligations', hint: 'Everyone who works on clients' },
  { id: 'inventory', label: 'Inventory manager obligations', hint: 'Restock · Recount · Refill · Recycle' },
]

export type HkTaskSpec = {
  key: string
  name: string
  icon: HkIcon
  tone: HkTone
  cadence: HkCadence
  scope: HkScope
  /** On everyone's list. Optional jobs are ones a team member chooses to take on. */
  required: boolean
  /** artist = artists & technicians; inventory = whoever manages inventory. */
  role: HkRole
  why: string
}

type Spec = HkTaskSpec

const station = (name: string, why: string): Spec => ({
  role: 'artist',
  key: 'station-client',
  name,
  icon: 'spray',
  tone: 'garnet',
  cadence: 'client',
  scope: 'each',
  required: true,
  why,
})
const stationClose: Spec = {
  role: 'artist',
  key: 'station-close',
  name: 'Disinfect station before leaving',
  icon: 'sparkles',
  tone: 'garnet',
  cadence: 'close',
  scope: 'each',
  required: true,
  why: 'Tomorrow starts clean because of you.',
}
const sweep: Spec = {
  role: 'artist',
  key: 'sweep-floor',
  name: 'Sweep floor',
  icon: 'broom',
  tone: 'orange',
  cadence: 'daily',
  scope: 'shop',
  required: true,
  why: 'Clean floors keep everyone safe and the shop looking its best.',
}
const fridge: Spec = {
  role: 'artist',
  key: 'restock-fridge',
  name: 'Restock refrigerator',
  icon: 'fridge',
  tone: 'teal',
  cadence: 'open',
  scope: 'shop',
  required: true,
  why: 'A stocked fridge makes every guest feel welcome.',
}
const organize: Spec = {
  role: 'artist',
  key: 'organize-station',
  name: 'Organize station',
  icon: 'grid',
  tone: 'purple',
  cadence: 'open',
  scope: 'each',
  required: false,
  why: 'An organized station saves you time on every client.',
}
const towels: Spec = {
  role: 'artist',
  key: 'discard-towels',
  name: 'Discard towels',
  icon: 'towel',
  tone: 'charcoal',
  cadence: 'daily',
  scope: 'shop',
  required: false,
  why: 'Fresh towels for every client. That’s the standard.',
}
const plants: Spec = {
  role: 'artist',
  key: 'water-plants',
  name: 'Water plants',
  icon: 'sprout',
  tone: 'green',
  cadence: 'daily',
  scope: 'shop',
  required: false,
  why: 'The plants keep the shop feeling alive.',
}
const lock: Spec = {
  role: 'artist',
  key: 'lock-doors',
  name: 'Lock doors',
  icon: 'lock',
  tone: 'royal',
  cadence: 'close',
  scope: 'shop',
  required: false,
  why: 'The shop is safe for the night. Thank you for closing up.',
}
/** Artists' share of keeping the shop green. */
const trash: Spec = {
  role: 'artist',
  key: 'take-out-trash',
  name: 'Take out trash',
  icon: 'trash',
  tone: 'charcoal',
  cadence: 'close',
  scope: 'shop',
  required: false,
  why: 'A fresh start tomorrow, and no smells for the first client.',
}
const sortRecycling: Spec = {
  role: 'artist',
  key: 'sort-recycling',
  name: 'Sort recycling',
  icon: 'recycle',
  tone: 'green',
  cadence: 'daily',
  scope: 'shop',
  required: false,
  why: 'Sorted waste can actually be recycled. That’s the shop’s sustainability promise kept.',
}

/** The inventory manager's four Rs: restock, recount, refill, recycle. Required for whoever manages inventory. */
const INVENTORY: Spec[] = [
  {
    role: 'inventory',
    key: 'inv-restock',
    name: 'Restock shelves & backbar',
    icon: 'package',
    tone: 'green',
    cadence: 'daily',
    scope: 'shop',
    required: true,
    why: 'Full shelves mean nobody runs out mid-service.',
  },
  {
    role: 'inventory',
    key: 'inv-refill',
    name: 'Refill bottles & dispensers',
    icon: 'droplets',
    tone: 'royal',
    cadence: 'daily',
    scope: 'shop',
    required: true,
    why: 'Refilling instead of opening new keeps waste and spending down.',
  },
  {
    role: 'inventory',
    key: 'inv-recount',
    name: 'Recount stock',
    icon: 'clipboard',
    tone: 'garnet',
    cadence: 'weekly',
    scope: 'shop',
    required: true,
    why: 'Accurate counts mean smarter orders and no surprises.',
  },
  {
    role: 'inventory',
    key: 'inv-recycle',
    name: 'Send recycling to our partner',
    icon: 'recycle',
    tone: 'teal',
    cadence: 'weekly',
    scope: 'shop',
    required: true,
    why: 'Every box that goes out keeps salon waste out of the landfill.',
  },
]

const job = (spec: Omit<Spec, 'required' | 'role'> & { required?: boolean; role?: HkRole }): Spec => ({ required: false, role: 'artist', ...spec })

/** Hair salons: the list the owner first wrote it for. */
const SALON: Spec[] = [
  station('Clean & disinfect station', 'A freshly disinfected station tells every client they’re safe in your chair.'),
  organize,
  fridge,
  job({
    key: 'shampoo-bowls',
    name: 'Disinfect shampoo bowls',
    icon: 'droplets',
    tone: 'royal',
    cadence: 'daily',
    scope: 'shop',
    required: true,
    why: 'Clean bowls are the first thing a client feels at the shampoo.',
  }),
  sweep,
  towels,
  job({
    key: 'brushes-replaced',
    name: 'Brushes replaced',
    icon: 'paintbrush',
    tone: 'yellow',
    cadence: 'daily',
    scope: 'each',
    why: 'Fresh brushes keep color and product working the way they should.',
  }),
  job({
    key: 'stain-removal',
    name: 'Stain removal at station',
    icon: 'eraser',
    tone: 'red',
    cadence: 'daily',
    scope: 'each',
    why: 'No stains, no second looks. Your station looks as good as your work.',
  }),
  plants,
  job({
    key: 'clean-dispensary',
    name: 'Clean dispensary',
    icon: 'flask',
    tone: 'teal',
    cadence: 'close',
    scope: 'shop',
    why: 'A clean dispensary means accurate mixing and less waste.',
  }),
  trash,
  sortRecycling,
  stationClose,
  lock,
  ...INVENTORY,
]

const BARBER: Spec[] = [
  station('Clean & disinfect chair and station', 'A fresh chair and clean tools tell every client they’re in good hands.'),
  job({
    key: 'clippers-oil',
    name: 'Brush, disinfect & oil clippers',
    icon: 'scissors',
    tone: 'charcoal',
    cadence: 'close',
    scope: 'each',
    required: true,
    why: 'Cared-for blades cut cleaner and last longer.',
  }),
  organize,
  fridge,
  sweep,
  job({
    key: 'capes-strips',
    name: 'Restock neck strips & capes',
    icon: 'package',
    tone: 'yellow',
    cadence: 'open',
    scope: 'shop',
    why: 'Nobody should wait mid-cut for a neck strip.',
  }),
  job({
    key: 'hot-towels',
    name: 'Fill & wipe hot towel cabinet',
    icon: 'towel',
    tone: 'orange',
    cadence: 'open',
    scope: 'shop',
    why: 'A warm towel to finish is the part clients remember.',
  }),
  job({
    key: 'shampoo-bowls',
    name: 'Disinfect shampoo bowls',
    icon: 'droplets',
    tone: 'royal',
    cadence: 'daily',
    scope: 'shop',
    why: 'Clean bowls are the first thing a client feels at the shampoo.',
  }),
  towels,
  plants,
  trash,
  sortRecycling,
  stationClose,
  lock,
  ...INVENTORY,
]

const NAILS: Spec[] = [
  station('Clean & disinfect station', 'A fresh table and new files tell every client they’re safe with you.'),
  job({
    key: 'pedi-tubs',
    name: 'Disinfect pedicure tubs',
    icon: 'shower',
    tone: 'royal',
    cadence: 'daily',
    scope: 'shop',
    required: true,
    why: 'Clean tubs protect every client’s feet. Follow your state board’s steps.',
  }),
  job({
    key: 'sterilize-tools',
    name: 'Clean & sterilize metal tools',
    icon: 'spray',
    tone: 'charcoal',
    cadence: 'close',
    scope: 'each',
    required: true,
    why: 'Sterile tools are the promise behind every service.',
  }),
  fridge,
  sweep,
  organize,
  job({
    key: 'lamps',
    name: 'Wipe down UV/LED lamps',
    icon: 'light',
    tone: 'yellow',
    cadence: 'daily',
    scope: 'each',
    why: 'Clean lamps cure evenly and look professional.',
  }),
  job({
    key: 'polish-wall',
    name: 'Organize polish wall',
    icon: 'grid',
    tone: 'purple',
    cadence: 'daily',
    scope: 'shop',
    why: 'Clients pick faster when every shade is where it belongs.',
  }),
  job({
    key: 'dust-collector',
    name: 'Empty dust collectors',
    icon: 'wind',
    tone: 'teal',
    cadence: 'close',
    scope: 'each',
    why: 'Less dust in the air for you and every client.',
  }),
  towels,
  plants,
  trash,
  sortRecycling,
  stationClose,
  lock,
  ...INVENTORY,
]

const BROWS: Spec[] = [
  station('Change bed paper & disinfect station', 'A fresh bed and clean tools tell every client they’re safe with you.'),
  job({
    key: 'sterilize-tools',
    name: 'Clean & sterilize tweezers and tools',
    icon: 'spray',
    tone: 'charcoal',
    cadence: 'close',
    scope: 'each',
    required: true,
    why: 'Sterile tools are the promise behind every service.',
  }),
  fridge,
  sweep,
  organize,
  job({
    key: 'wax-warmer',
    name: 'Clean wax warmer',
    icon: 'flask',
    tone: 'orange',
    cadence: 'close',
    scope: 'each',
    why: 'A clean warmer heats evenly and keeps wax clean.',
  }),
  job({
    key: 'lash-supplies',
    name: 'Check lash glue & supplies',
    icon: 'clipboard',
    tone: 'purple',
    cadence: 'open',
    scope: 'each',
    why: 'Fresh glue holds better. No surprises mid-set.',
  }),
  towels,
  plants,
  trash,
  sortRecycling,
  stationClose,
  lock,
  ...INVENTORY,
]

const TATTOO: Spec[] = [
  station('Break down & disinfect station', 'A clean break-down protects the next client and you.'),
  job({
    key: 'autoclave',
    name: 'Run & log autoclave',
    icon: 'clipboard',
    tone: 'charcoal',
    cadence: 'close',
    scope: 'shop',
    required: true,
    why: 'A logged cycle is proof every tool was safe.',
  }),
  fridge,
  sweep,
  organize,
  job({
    key: 'barrier-stock',
    name: 'Restock barrier film & supplies',
    icon: 'package',
    tone: 'yellow',
    cadence: 'open',
    scope: 'shop',
    why: 'No running for film with a client in the chair.',
  }),
  job({
    key: 'sharps',
    name: 'Check sharps containers',
    icon: 'trash',
    tone: 'red',
    cadence: 'close',
    scope: 'shop',
    why: 'Swap them before they’re full. Safety first.',
  }),
  plants,
  trash,
  sortRecycling,
  stationClose,
  lock,
  ...INVENTORY,
]

const SPA: Spec[] = [
  station('Reset & disinfect treatment room', 'A fresh room tells every client this time is all about them.'),
  job({
    key: 'linens',
    name: 'Change linens',
    icon: 'shirt',
    tone: 'royal',
    cadence: 'daily',
    scope: 'shop',
    required: true,
    why: 'Fresh linens for every client. That’s the standard.',
  }),
  job({
    key: 'fridge-temp',
    name: 'Check & log fridge temperature',
    icon: 'clipboard',
    tone: 'teal',
    cadence: 'open',
    scope: 'shop',
    why: 'Products stored right work the way they should.',
  }),
  fridge,
  sweep,
  organize,
  job({
    key: 'equipment',
    name: 'Clean steamer & equipment',
    icon: 'wind',
    tone: 'purple',
    cadence: 'close',
    scope: 'each',
    why: 'Clean equipment, consistent results.',
  }),
  job({
    key: 'robes',
    name: 'Restock robes & slippers',
    icon: 'heart',
    tone: 'orange',
    cadence: 'open',
    scope: 'shop',
    why: 'The little comforts are what clients remember.',
  }),
  plants,
  trash,
  sortRecycling,
  stationClose,
  lock,
  ...INVENTORY,
]

const GENERAL: Spec[] = [
  station('Clean & disinfect station', 'A freshly disinfected station tells every client they’re safe with you.'),
  organize,
  fridge,
  sweep,
  towels,
  plants,
  trash,
  sortRecycling,
  stationClose,
  lock,
  ...INVENTORY,
]

const BY_TYPE: Record<string, Spec[]> = { salon: SALON, barber: BARBER, nails: NAILS, brows: BROWS, tattoo: TATTOO, spa: SPA }

/** What a new shop starts with, by trade. Owners can switch any job between required and optional, hide it, or add their own. */
export function housekeepingDefaultsFor(businessType: string): HkTaskSpec[] {
  return BY_TYPE[businessType] ?? GENERAL
}

/** Jobs added after shops were first set up: given to every shop that doesn't have them yet. */
export const ADDED_LATER_KEYS = ['take-out-trash', 'sort-recycling', 'inv-restock', 'inv-refill', 'inv-recount', 'inv-recycle']

/** The hair salon list (kept for anything that needs one example list). */
export const HOUSEKEEPING_DEFAULTS: HkTaskSpec[] = SALON

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
  required: boolean
  role: HkRole
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

/**
 * Whether a job is on one person's list: required artist jobs are on everyone's,
 * required inventory jobs on the inventory managers', and any optional job a person chose.
 */
export function onMyList(task: HkTask, committed: ReadonlySet<number>, managesInventory = false) {
  if (!task.active) return false
  if (committed.has(task.id)) return true
  if (!task.required) return false
  return task.role === 'inventory' ? managesInventory : true
}

/**
 * This person's buttons (every active job; the screen sorts theirs from the extras).
 * Weekly jobs look at the last 7 days of taps; everything else at today's.
 */
export function buildButtons(tasks: HkTask[], checks: HkCheck[], staffName: string, weekChecks: HkCheck[] = checks): HkButton[] {
  const me = nameKey(staffName)
  return tasks
    .filter((t) => t.active)
    .map((task) => {
      const pool = task.cadence === 'weekly' ? weekChecks : checks
      const forTask = pool.filter((c) => c.taskId === task.id)
      const mine = forTask.filter((c) => nameKey(c.staffName) === me).length
      const first = [...forTask].sort((a, b) => a.at.localeCompare(b.at))[0]
      const coveredBy = task.scope === 'shop' && first ? { staffName: first.staffName, at: first.at } : null
      const done = task.cadence === 'client' ? false : task.scope === 'shop' ? Boolean(coveredBy) : mine > 0
      return { task, mine, coveredBy, done }
    })
}

/** One person's choices: staff name → optional job ids they've taken on. */
export type HkCommitments = Record<string, number[]>

export function commitmentsOf(commitments: HkCommitments, staffName: string): Set<number> {
  const key = nameKey(staffName)
  const found = Object.entries(commitments).find(([name]) => nameKey(name) === key)
  return new Set(found?.[1] ?? [])
}

/**
 * How far along each person is today, against their own list: required jobs for
 * their role(s) plus the optional ones they chose. After-client jobs count separately
 * as resets, and weekly jobs aren't part of a day's list. A shop job on their list
 * counts once anyone has covered it today.
 */
export function summarizePeople(
  tasks: HkTask[],
  checks: HkCheck[],
  people: string[],
  commitments: HkCommitments = {},
  inventoryManagers: string[] = [],
): HkPersonSummary[] {
  const clientIds = new Set(tasks.filter((t) => t.active && t.cadence === 'client').map((t) => t.id))
  const coveredShop = new Set(checks.map((c) => c.taskId))
  const managers = new Set(inventoryManagers.map(nameKey))
  return people.map((staffName) => {
    const me = nameKey(staffName)
    const mine = commitmentsOf(commitments, staffName)
    const list = tasks.filter((t) => t.cadence !== 'client' && t.cadence !== 'weekly' && onMyList(t, mine, managers.has(me)))
    const mineChecks = checks.filter((c) => nameKey(c.staffName) === me)
    const doneIds = new Set(mineChecks.map((c) => c.taskId))
    return {
      staffName,
      done: list.filter((t) => (t.scope === 'shop' ? coveredShop.has(t.id) : doneIds.has(t.id))).length,
      total: list.length,
      clients: mineChecks.filter((c) => clientIds.has(c.taskId)).length,
    }
  })
}

/**
 * Shop jobs still open that someone is on the hook for: required ones and optional
 * ones somebody chose. Weekly jobs are open until covered in the last 7 days.
 */
export function openShopJobs(
  tasks: HkTask[],
  checks: HkCheck[],
  commitments: HkCommitments = {},
  weekChecks: HkCheck[] = checks,
): HkTask[] {
  const today = new Set(checks.map((c) => c.taskId))
  const week = new Set(weekChecks.map((c) => c.taskId))
  const chosen = new Set(Object.values(commitments).flat())
  return tasks.filter(
    (t) =>
      t.active &&
      t.scope === 'shop' &&
      (t.required || chosen.has(t.id)) &&
      !(t.cadence === 'weekly' ? week : today).has(t.id),
  )
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
