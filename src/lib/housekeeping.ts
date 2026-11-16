/**
 * Housekeeping: the shop's cleaning, closing and inventory jobs, who does each one
 * today, and the thank-you that follows. Client-safe and pure, so the rules have one
 * home and are tested (housekeeping.test.ts).
 *
 * Every job happens at one of three moments in a stylist's day:
 * - Arrive (`open`), Client done (`client`, every client, counts up), Close out
 *   (`close`, plus the day's `daily` jobs).
 * How often a job comes up is its `repeat` (every day, certain weekdays, every few
 * weeks, every few days, monthly; `flex` = any day in that week/month/stretch).
 * Turns advance once per time the job comes up, so a Mon/Thu job alternates fairly.
 * Every job says who does it (`assign`), so nothing depends on volunteers:
 * - `everyone`: on every list in its section (their own station, or a shop job the
 *   first person covers);
 * - `rotate`: one person's turn each time it comes up, rotating through who's working;
 * - `assigned`: the specific people a manager picked.
 * Sections (`role`): Technician (everyone who works on clients) and Inventory
 * Management (team members marked "Manages inventory").
 */

export type HkCadence = 'client' | 'open' | 'daily' | 'close'

/** How often a job comes up. */
export type HkRepeatKind = 'daily' | 'days' | 'weeks' | 'interval' | 'monthly'
export type HkRepeat = {
  kind: HkRepeatKind
  /** Weekdays (0 = Sunday) for `days` and `weeks`. */
  days: number[]
  /** Every N weeks (`weeks`) or every N days (`interval`). */
  every: number
  /** YYYY-MM-DD the count starts from (`weeks`, `interval`); '' = a fixed Sunday. */
  anchor: string
  /** Day of the month for `monthly` (31 = the last day). */
  monthDay: number
  /** Any day in that week / month / stretch, done once, instead of a set day. */
  flex: boolean
}
export const DEFAULT_REPEAT: HkRepeat = { kind: 'daily', days: [], every: 1, anchor: '', monthDay: 1, flex: false }
export const HK_REPEATS: { id: HkRepeatKind; label: string }[] = [
  { id: 'daily', label: 'Every day' },
  { id: 'days', label: 'Certain days' },
  { id: 'weeks', label: 'Every few weeks' },
  { id: 'interval', label: 'Every few days' },
  { id: 'monthly', label: 'Monthly' },
]
const ANCHOR_SUNDAY = '2026-01-04'
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Which section: technicians (everyone who works on clients) or inventory management (Team → Manages inventory). */
export type HkRole = 'artist' | 'inventory'
/** Who does it: everyone in the section, one person's turn each day, or specific people. */
export type HkAssign = 'everyone' | 'rotate' | 'assigned'
/** The three moments in a stylist's day that every job belongs to. */
export type HkMoment = 'arrive' | 'client' | 'close'
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
  { id: 'open', label: 'When you arrive', hint: 'Once, at the start of your day' },
  { id: 'client', label: 'After each client', hint: 'Every client' },
  { id: 'daily', label: 'During the day', hint: 'Any time before you leave' },
  { id: 'close', label: 'When you close out', hint: 'After your last client' },
]

export const HK_ROLES: { id: HkRole; label: string; hint: string }[] = [
  { id: 'artist', label: 'Technician', hint: 'Everyone who works on clients' },
  { id: 'inventory', label: 'Inventory Management', hint: 'Restock · Recount · Refill · Recycle' },
]

export const HK_ASSIGNS: { id: HkAssign; label: string; hint: string }[] = [
  { id: 'everyone', label: 'Everyone', hint: 'On every list in its section' },
  { id: 'rotate', label: 'Takes turns', hint: 'One person each time it comes up, rotating through who’s working' },
  { id: 'assigned', label: 'Assigned', hint: 'The people you pick' },
]

export const HK_MOMENTS: { id: HkMoment; label: string; verb: string }[] = [
  { id: 'arrive', label: 'Arrive', verb: 'Start your day' },
  { id: 'client', label: 'Client done', verb: 'Reset for the next client' },
  { id: 'close', label: 'Close out', verb: 'Finish your day' },
]

/** Which moment a job is done at. During-the-day jobs are checked at close-out so nothing slips. */
export function momentOf(cadence: HkCadence): HkMoment {
  return cadence === 'open' ? 'arrive' : cadence === 'client' ? 'client' : 'close'
}

export type HkTaskSpec = {
  key: string
  name: string
  icon: HkIcon
  tone: HkTone
  cadence: HkCadence
  scope: HkScope
  /** On everyone's list. Optional jobs are ones a team member chooses to take on. */
  required: boolean
  /** artist = technicians; inventory = whoever manages inventory. */
  role: HkRole
  /** Filled in from `required` and `scope` by housekeepingDefaultsFor. */
  assign?: HkAssign
  repeat?: Partial<HkRepeat>
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
  cadence: 'client',
  scope: 'each',
  required: true,
  why: 'A clean floor around your chair is the first thing the next client sees.',
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
    cadence: 'daily',
    repeat: { kind: 'weeks', every: 1, flex: true },
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
    cadence: 'daily',
    repeat: { kind: 'weeks', every: 1, flex: true },
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
    name: 'Disinfect shampoo bowl',
    icon: 'droplets',
    tone: 'royal',
    cadence: 'client',
    scope: 'each',
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
    name: 'Disinfect shampoo bowl',
    icon: 'droplets',
    tone: 'royal',
    cadence: 'client',
    scope: 'each',
    required: true,
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
export type HkTaskDefault = Omit<HkTaskSpec, 'assign' | 'repeat'> & { assign: HkAssign; repeat: HkRepeat }
export function housekeepingDefaultsFor(businessType: string): HkTaskDefault[] {
  return (BY_TYPE[businessType] ?? GENERAL).map((t) => ({ ...t, assign: defaultAssign(t), repeat: { ...DEFAULT_REPEAT, ...t.repeat } }))
}

/**
 * Nothing is left to volunteers: required jobs are everyone's; a shared shop job that
 * used to be optional becomes a daily turn; a job at your own station is everyone's.
 */
export function defaultAssign(t: Pick<HkTaskSpec, 'required' | 'scope'>): HkAssign {
  if (t.required) return 'everyone'
  return t.scope === 'shop' ? 'rotate' : 'everyone'
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
  role: HkRole
  assign: HkAssign
  /** For `assigned` jobs: who it's assigned to (as the team list spells them). */
  assignees: string[]
  repeat: HkRepeat
  why: string
  active: boolean
}

export type HkCheck = { id: number; taskId: number; staffName: string; at: string; dayKey: string }

export type HkReminder = { id: number; staffName: string; detail: string; at: string }

/** Lower-cased, trimmed: how names are compared, so "Beth " and "beth" are one person. */
export const nameKey = (name: string) => name.trim().toLowerCase()

/** Who the shop has today, for turns and for who sees which section. */
export type HkDay = {
  /** Everyone on the team (the technicians' pool when nobody's schedule says otherwise). */
  team: string[]
  /** People scheduled or already in today; turns rotate through them. Empty = use the whole team. */
  working: string[]
  /** Team members marked "Manages inventory". */
  inventoryManagers: string[]
  /** The shop's local date, YYYY-MM-DD. */
  dayKey: string
}

const weekdayOf = (dayKey: string) => new Date(Date.UTC(...(dayKey.split('-').map(Number) as [number, number, number]).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number])).getUTCDay()
const mod = (a: number, n: number) => ((a % n) + n) % n
export function shiftDay(dayKey: string, days: number) {
  return new Date((dayNumberOf(dayKey) + days) * 86_400_000).toISOString().slice(0, 10)
}

export type HkPeriod = {
  /** The job comes up today. */
  due: boolean
  /** First day of the stretch it can be done in (today unless flexible). */
  start: string
  /** How many times it has come up: turns rotate on this. */
  index: number
  /** Spans several days (flexible week / month / stretch). */
  long: boolean
}

/** Whether a job comes up on a day, the stretch it can be done in, and which time this is. */
export function periodOf(repeat: HkRepeat, dayKey: string): HkPeriod {
  const n = dayNumberOf(dayKey)
  const wd = weekdayOf(dayKey)
  const every = Math.max(1, Math.round(repeat.every || 1))
  const days = [...new Set(repeat.days)].filter((d) => d >= 0 && d <= 6).sort()
  const today: Omit<HkPeriod, 'index' | 'due'> = { start: dayKey, long: false }
  switch (repeat.kind) {
    case 'days': {
      if (days.length === 0) return { ...today, due: true, index: n }
      const week = Math.floor((n - dayNumberOf(ANCHOR_SUNDAY)) / 7)
      return { ...today, due: days.includes(wd), index: week * days.length + Math.max(0, days.indexOf(wd)) }
    }
    case 'weeks': {
      const anchor = dayNumberOf(repeat.anchor || ANCHOR_SUNDAY)
      const anchorSunday = anchor - weekdayOf(repeat.anchor || ANCHOR_SUNDAY)
      const weekStart = n - wd
      const week = Math.floor((weekStart - anchorSunday) / 7)
      const on = mod(week, every) === 0
      const turn = Math.floor(week / every)
      if (repeat.flex || days.length === 0) {
        return { due: on, start: shiftDay(dayKey, -wd), index: turn, long: true }
      }
      return { ...today, due: on && days.includes(wd), index: turn * days.length + Math.max(0, days.indexOf(wd)) }
    }
    case 'interval': {
      const diff = n - dayNumberOf(repeat.anchor || ANCHOR_SUNDAY)
      const turn = Math.floor(diff / every)
      if (repeat.flex && every > 1) return { due: true, start: shiftDay(dayKey, -mod(diff, every)), index: turn, long: true }
      return { ...today, due: mod(diff, every) === 0, index: turn }
    }
    case 'monthly': {
      const [y, m, d] = dayKey.split('-').map(Number)
      const turn = y * 12 + (m - 1)
      if (repeat.flex) return { due: true, start: `${dayKey.slice(0, 8)}01`, index: turn, long: true }
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
      return { ...today, due: d === Math.min(Math.max(1, repeat.monthDay || 1), last), index: turn }
    }
    default:
      return { ...today, due: true, index: n }
  }
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`
const dayList = (days: number[]) => [...days].sort().map((d) => WEEKDAY_SHORT[d]).join(', ')

/** "Every day", "Mon, Thu", "Every 2 weeks · any day", "Every 3 days", "Monthly on the 1st". */
export function repeatLabel(r: HkRepeat) {
  const every = Math.max(1, r.every || 1)
  switch (r.kind) {
    case 'days':
      return r.days.length ? dayList(r.days) : 'Every day'
    case 'weeks': {
      const base = every === 1 ? 'Weekly' : `Every ${every} weeks`
      return r.flex || r.days.length === 0 ? `${base} · any day` : `${base} · ${dayList(r.days)}`
    }
    case 'interval':
      return every === 1 ? 'Every day' : `Every ${every} days${r.flex ? ' · any of them' : ''}`
    case 'monthly':
      return r.flex ? 'Monthly · any day' : r.monthDay >= 31 ? 'Monthly · last day' : `Monthly · the ${ordinal(r.monthDay || 1)}`
    default:
      return 'Every day'
  }
}

/** When it comes up next (today included), within ~two months: for "Next: Thu". */
export function nextDue(repeat: HkRepeat, dayKey: string): string | null {
  for (let i = 0; i < 62; i++) {
    const d = shiftDay(dayKey, i)
    if (periodOf(repeat, d).due) return d
  }
  return null
}

function sortedPool(names: string[]) {
  const seen = new Map<string, string>()
  for (const n of names) if (n.trim() && !seen.has(nameKey(n))) seen.set(nameKey(n), n)
  return [...seen.values()].sort((a, b) => nameKey(a).localeCompare(nameKey(b)))
}

/** The people a job could fall to: inventory managers for Inventory Management, otherwise who's working (or the team). */
export function poolFor(task: Pick<HkTask, 'role' | 'repeat'>, day: HkDay) {
  if (task.role === 'inventory') return sortedPool(day.inventoryManagers)
  // A job open for a whole week or month belongs to the same person all stretch.
  if (periodOf(task.repeat, day.dayKey).long) return sortedPool(day.team)
  return sortedPool(day.working.length ? day.working : day.team)
}

/** Whose turn a rotating job is: moves on one person each time the job comes up. */
export function turnFor(task: Pick<HkTask, 'id' | 'role' | 'repeat'>, day: HkDay): string | null {
  const pool = poolFor(task, day)
  if (pool.length === 0) return null
  return pool[mod(periodOf(task.repeat, day.dayKey).index + task.id, pool.length)]
}

/** Who a job belongs to today. */
export function ownersOf(task: HkTask, day: HkDay): string[] {
  if (!task.active || !periodOf(task.repeat, day.dayKey).due) return []
  if (task.assign === 'assigned') return sortedPool(task.assignees)
  if (task.assign === 'rotate') {
    const t = turnFor(task, day)
    return t ? [t] : []
  }
  return poolFor(task, day)
}

/** True when the job is on this person's list today. */
export function isMine(task: HkTask, day: HkDay, staffName: string) {
  return ownersOf(task, day).some((n) => nameKey(n) === nameKey(staffName))
}

/** One job's state today, for one person. */
export type HkButton = {
  task: HkTask
  /** Times this person tapped it today (after-client jobs count up). */
  mine: number
  /** Who did it (first, in this stretch); null = nobody yet. */
  doneBy: { staffName: string; at: string; checkId: number; dayKey: string } | null
  /** Nothing left to do on it for this person. */
  done: boolean
  /** The job comes up today. */
  due: boolean
  /** Open for a whole week / month / stretch (done once, any day). */
  long: boolean
  /** On this person's list today. */
  onList: boolean
  /** Who it belongs to today (for "Beth's turn"). */
  owners: string[]
}

/**
 * Every active job's state for this person on `day`. `history` holds recent taps (each
 * with its dayKey); a job counts in its own stretch: today, or the whole week / month
 * for flexible jobs. Own-station jobs (`each`) are done when they did them; shop jobs
 * when anyone covered them.
 */
export function buildButtons(tasks: HkTask[], history: HkCheck[], staffName: string, day: HkDay): HkButton[] {
  const me = nameKey(staffName)
  return tasks
    .filter((t) => t.active)
    .map((task) => {
      const period = task.cadence === 'client' ? { due: true, start: day.dayKey, long: false, index: 0 } : periodOf(task.repeat, day.dayKey)
      const forTask = history
        .filter((c) => c.taskId === task.id && c.dayKey >= period.start && c.dayKey <= day.dayKey)
        .sort((a, b) => a.at.localeCompare(b.at))
      const mineChecks = forTask.filter((c) => nameKey(c.staffName) === me)
      const relevant = task.scope === 'shop' ? forTask : mineChecks
      const first = relevant[0]
      const owners = ownersOf(task, day)
      return {
        task,
        mine: task.cadence === 'client' ? mineChecks.filter((c) => c.dayKey === day.dayKey).length : mineChecks.length,
        doneBy: first ? { staffName: first.staffName, at: first.at, checkId: first.id, dayKey: first.dayKey } : null,
        done: task.cadence === 'client' ? false : Boolean(first),
        due: period.due,
        long: period.long,
        onList: period.due && owners.some((n) => nameKey(n) === me),
        owners,
      }
    })
}

export type HkPersonSummary = { staffName: string; done: number; total: number; clients: number }

/** How far along each person is on `day` against their own list (after-client jobs are counted as resets instead). */
export function summarizePeople(tasks: HkTask[], history: HkCheck[], people: string[], day: HkDay): HkPersonSummary[] {
  const clientIds = new Set(tasks.filter((t) => t.active && t.cadence === 'client').map((t) => t.id))
  return people.map((staffName) => {
    const list = buildButtons(tasks, history, staffName, day).filter((b) => b.onList && b.task.cadence !== 'client')
    const me = nameKey(staffName)
    return {
      staffName,
      done: list.filter((b) => b.done).length,
      total: list.length,
      clients: history.filter((c) => c.dayKey === day.dayKey && clientIds.has(c.taskId) && nameKey(c.staffName) === me).length,
    }
  })
}

/** Shop jobs that come up today and nobody has covered yet in their stretch, with whose they are. */
export function openJobs(tasks: HkTask[], history: HkCheck[], day: HkDay) {
  return buildButtons(tasks, history, '', day)
    .filter((b) => b.due && !b.done && b.task.cadence !== 'client' && b.task.scope === 'shop')
    .map((b) => ({ task: b.task, owners: b.owners, long: b.long }))
}

/** Jobs that don't come up today, soonest first: "Coming up". */
export function comingUp(tasks: HkTask[], day: HkDay, limit = 6) {
  return tasks
    .filter((t) => t.active && t.cadence !== 'client' && !periodOf(t.repeat, day.dayKey).due)
    .map((t) => ({ task: t, next: nextDue(t.repeat, shiftDay(day.dayKey, 1)) }))
    .filter((x): x is { task: HkTask; next: string } => Boolean(x.next))
    .sort((a, b) => a.next.localeCompare(b.next))
    .slice(0, limit)
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

/** Days since the epoch for a local date: the same number on the phone and on the server, so turns agree. */
export function dayNumberOf(dayKey: string) {
  const [y, m, d] = dayKey.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
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
