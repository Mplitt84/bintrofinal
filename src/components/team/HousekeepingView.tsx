import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bath,
  Bell,
  BrushCleaning,
  Check,
  ClipboardCheck,
  Coffee,
  Droplets,
  Eraser,
  FlaskConical,
  HandHeart,
  Heart,
  KeyRound,
  LayoutGrid,
  Lightbulb,
  Lock,
  Package,
  Paintbrush,
  Plus,
  Recycle,
  Refrigerator,
  Scissors,
  Shirt,
  ShowerHead,
  Sparkles,
  SprayCan,
  Sprout,
  Sun,
  Trash2,
  Wind,
  X,
} from 'lucide-react'
import { Sheet, Field, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { TOOL_TONES } from '@/components/ui/ToolButton'
import { deriveInitials } from '@/lib/inventory-defaults'
import {
  HK_CADENCES,
  HK_ICONS,
  HK_TONES,
  STATION_TASK_KEY,
  appreciation,
  buildButtons,
  localDayKey,
  nameKey,
  openShopJobs,
  summarizePeople,
  type HkButton,
  type HkCadence,
  type HkCheck,
  type HkIcon,
  type HkReminder,
  type HkScope,
  type HkTask,
  type HkTone,
} from '@/lib/housekeeping'
import {
  addHousekeepingTask,
  checkHousekeeping,
  deleteHousekeepingTask,
  dismissHousekeepingReminder,
  getHousekeeping,
  undoHousekeeping,
  updateHousekeepingTask,
} from '@/server/housekeeping.functions'

const GLYPHS: Record<HkIcon, typeof Sparkles> = {
  sparkles: Sparkles,
  spray: SprayCan,
  droplets: Droplets,
  broom: BrushCleaning,
  towel: Bath,
  fridge: Refrigerator,
  flask: FlaskConical,
  paintbrush: Paintbrush,
  eraser: Eraser,
  grid: LayoutGrid,
  sprout: Sprout,
  lock: Lock,
  trash: Trash2,
  shirt: Shirt,
  wind: Wind,
  sun: Sun,
  coffee: Coffee,
  package: Package,
  scissors: Scissors,
  heart: Heart,
  bell: Bell,
  clipboard: ClipboardCheck,
  shower: ShowerHead,
  recycle: Recycle,
  key: KeyRound,
  light: Lightbulb,
}

function tone(t: HkTone) {
  return TOOL_TONES[t] ?? TOOL_TONES.garnet
}

/** The last 7 local days, today first. */
function weekKeys(today = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    return localDayKey(d)
  })
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

type Board = Awaited<ReturnType<typeof getHousekeeping>>
type Thanks = { title: string; body: string; tone: HkTone; key: number }

/**
 * Team → Housekeeping. Pick who you are, then tap a bold circle when a job is done.
 * Every tap is logged under your name and answered with a thank-you; shop-wide jobs
 * show who covered them, and checkout reminders from Square ask for a station reset.
 */
export function HousekeepingView({
  staffName,
  onStaffName,
  isOwner,
}: {
  staffName: string
  onStaffName: (name: string) => void
  isOwner: boolean
}) {
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [thanks, setThanks] = useState<Thanks | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100))

  const today = localDayKey()
  const load = useCallback(async () => {
    try {
      setBoard(await getHousekeeping({ data: { dayKey: localDayKey(), weekKeys: weekKeys() } }))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t load housekeeping.')
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(load, 60_000)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  useEffect(() => {
    if (!thanks) return
    const t = setTimeout(() => setThanks(null), 4200)
    return () => clearTimeout(t)
  }, [thanks])

  const me = staffName.trim()
  const people = useMemo(() => {
    const list = board?.people ?? []
    return me && !list.some((p) => nameKey(p) === nameKey(me)) ? [me, ...list] : list
  }, [board?.people, me])

  const buttons = useMemo(() => (board && me ? buildButtons(board.tasks, board.checks, me) : []), [board, me])
  const mySummary = useMemo(
    () => (board && me ? summarizePeople(board.tasks, board.checks, [me])[0] : null),
    [board, me],
  )
  const myReminders = useMemo(
    () => (board?.reminders ?? []).filter((r) => !r.staffName || !me || nameKey(r.staffName) === nameKey(me)),
    [board?.reminders, me],
  )

  async function tap(button: HkButton, reminder?: HkReminder) {
    if (!me) return toast('Pick who you are first.')
    const { task } = button
    if (!reminder && task.cadence !== 'client' && button.done) {
      if (task.scope === 'shop' && button.coveredBy && nameKey(button.coveredBy.staffName) !== nameKey(me)) {
        return toast(`${button.coveredBy.staffName} already covered this today. Thank you, team!`)
      }
      const mine = [...(board?.checks ?? [])]
        .reverse()
        .find((c) => c.taskId === task.id && nameKey(c.staffName) === nameKey(me))
      if (mine) {
        return toast(`${task.name}: done today.`, () => void takeBack(mine))
      }
      return
    }
    setBusyId(task.id)
    const before = mySummary
    const r = await checkHousekeeping({ data: { taskId: task.id, staffName: me, dayKey: today, reminderId: reminder?.id } })
    setBusyId(null)
    if (!r.ok) return toast(r.message)
    navigator.vibrate?.(25)
    await load()
    const count = task.cadence === 'client' ? button.mine + 1 : undefined
    const finishing =
      Boolean(before) && task.scope === 'each' && task.cadence !== 'client' && before!.done + 1 === before!.total && before!.total > 1
    setSeed((s) => s + 1)
    setThanks({ ...appreciation({ staffName: me, task, seed, count, allDone: finishing }), tone: task.tone, key: Date.now() })
  }

  async function takeBack(check: HkCheck) {
    const r = await undoHousekeeping({ data: { checkId: check.id, staffName: me, dayKey: today } })
    if (!r.ok) return toast(r.message)
    await load()
  }

  async function resetForReminder(reminder: HkReminder) {
    const station = buttons.find((b) => b.task.key === STATION_TASK_KEY) ?? buttons.find((b) => b.task.cadence === 'client')
    if (!station) {
      await dismissHousekeepingReminder({ data: { id: reminder.id, staffName: me || 'Team' } })
      return load()
    }
    await tap(station, reminder)
  }

  if (error && !board) {
    return <p className="text-bad">{error}</p>
  }
  if (!board) {
    return (
      <div className="grid gap-3" aria-busy="true">
        <div className="skel h-20 rounded-2xl" />
        <div className="skel h-48 rounded-2xl" />
      </div>
    )
  }

  const grouped = HK_CADENCES.map((c) => ({ ...c, items: buttons.filter((b) => b.task.cadence === c.id) })).filter(
    (g) => g.items.length,
  )
  const stillOpen = openShopJobs(board.tasks, board.checks)
  const everyone = summarizePeople(board.tasks, board.checks, people)

  return (
    <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0">
      {/* Who's working: every stylist, with today's progress. Tapping one makes this device theirs. */}
      <section aria-labelledby="hk-who" className="bg-white border border-line rounded-2xl p-4">
        <div className="flex items-baseline justify-between gap-x-3 gap-y-1 flex-wrap mb-3">
          <h2 id="hk-who" className="m-0 text-[17px] font-bold">
            Who’s working?
          </h2>
          <span className="text-ink-2 text-[13px]">Tap your name, then tap a job when it’s done.</span>
        </div>
        {people.length === 0 ? (
          <p className="text-ink-2 text-sm m-0">Add your team on the Team page first.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]" role="group" aria-label="Team">
            {everyone.map((p) => {
              const active = me && nameKey(p.staffName) === nameKey(me)
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
              return (
                <button
                  key={p.staffName}
                  type="button"
                  onClick={() => onStaffName(p.staffName)}
                  aria-pressed={Boolean(active)}
                  className="flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer shrink-0 w-[76px]"
                >
                  <span
                    className="relative grid place-items-center w-14 h-14 rounded-full"
                    style={{ background: `conic-gradient(${TOOL_TONES.green.bg} ${pct}%, var(--color-line) 0)` }}
                    aria-hidden="true"
                  >
                    <span
                      className={`grid place-items-center w-[48px] h-[48px] rounded-full text-[15px] font-bold ${
                        active ? 'bg-royal text-white' : 'bg-white text-ink'
                      }`}
                    >
                      {deriveInitials(p.staffName)}
                    </span>
                  </span>
                  <span className={`text-[12px] leading-tight text-center truncate w-full ${active ? 'font-bold text-royal' : 'text-ink'}`}>
                    {p.staffName.split(/\s+/)[0]}
                  </span>
                  <span className="text-[11px] text-ink-2 leading-none">
                    {p.done}/{p.total}
                    {p.clients ? ` · ${p.clients} ✦` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Checkout reminders: Square sales ask for a station reset. */}
      {myReminders.length > 0 && (
        <section aria-label="Checkout reminders" className="grid gap-2">
          {myReminders.slice(0, 4).map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-2xl p-3 pr-2 border border-line bg-white"
              style={{ boxShadow: `inset 4px 0 0 ${TOOL_TONES.garnet.bg}` }}
            >
              <span
                className="grid place-items-center w-10 h-10 rounded-full shrink-0"
                style={{ background: TOOL_TONES.garnet.bg, color: TOOL_TONES.garnet.fg }}
                aria-hidden="true"
              >
                <Bell size={18} />
              </span>
              <span className="flex-1 min-w-0 text-sm">
                <b className="block">A client just checked out{r.staffName ? `, ${r.staffName.split(/\s+/)[0]}` : ''}</b>
                <span className="text-ink-2">
                  {r.detail} · {timeLabel(r.at)} · reset your station for the next one
                </span>
              </span>
              <button className="btn btn-primary btn-sm shrink-0" disabled={!me} onClick={() => void resetForReminder(r)}>
                <Check size={15} /> Reset
              </button>
              <button
                className="btn btn-text btn-sm !px-2 shrink-0"
                aria-label="Not mine"
                title="Not mine"
                onClick={async () => {
                  await dismissHousekeepingReminder({ data: { id: r.id, staffName: me || 'Team' } })
                  await load()
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* The buttons. */}
      {!me ? (
        <p className="text-ink-2 m-0">Tap your name above to see your list.</p>
      ) : (
        <section aria-label={`${me}’s housekeeping`} className="bg-white border border-line rounded-2xl p-4">
          {mySummary && mySummary.total > 0 && (
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <b className="text-[15px]">
                  {mySummary.done === mySummary.total ? 'Your list is done today ✨' : `Your list today: ${mySummary.done} of ${mySummary.total}`}
                </b>
                {mySummary.clients > 0 && (
                  <span className="text-[13px] text-ink-2">
                    {mySummary.clients} station reset{mySummary.clients === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <div className="h-2 rounded-full bg-line overflow-hidden" aria-hidden="true">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${(mySummary.done / mySummary.total) * 100}%`, background: TOOL_TONES.green.bg }}
                />
              </div>
            </div>
          )}
          <div className="grid gap-5">
            {grouped.map((g) => (
              <div key={g.id}>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <h3 className="m-0 text-[15px] font-bold">{g.label}</h3>
                  <span className="text-[12px] text-ink-2">{g.hint}</span>
                </div>
                <div className="grid grid-cols-3 min-[480px]:grid-cols-4 min-[760px]:grid-cols-6 gap-x-2 gap-y-4">
                  {g.items.map((b) => (
                    <JobButton key={b.task.id} button={b} me={me} busy={busyId === b.task.id} onTap={() => void tap(b)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The team's day, for accountability: who has done their list, and what nobody has covered yet. */}
      <section aria-labelledby="hk-board" className="bg-white border border-line rounded-2xl p-4">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h2 id="hk-board" className="m-0 text-[17px] font-bold">
            Today’s board
          </h2>
          {isOwner && (
            <button className="btn btn-tonal btn-sm" onClick={() => setManageOpen(true)}>
              <Plus size={15} /> Customize jobs
            </button>
          )}
        </div>
        {stillOpen.length > 0 ? (
          <p className="text-sm m-0 mb-3">
            <b>Still open for the shop:</b> <span className="text-ink-2">{stillOpen.map((t) => t.name).join(' · ')}</span>
          </p>
        ) : (
          <p className="text-sm m-0 mb-3 text-good font-semibold">Every shop job is covered today. Thank you, team.</p>
        )}
        <WeekTable tasks={board.tasks} week={board.week} people={people} />
      </section>

      {thanks && <ThanksCard thanks={thanks} onClose={() => setThanks(null)} />}

      {isOwner && (
        <ManageJobsSheet
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          tasks={board.tasks}
          onTasks={(tasks) => setBoard((b) => (b ? { ...b, tasks } : b))}
        />
      )}
    </div>
  )
}

/** One bold circle: the job's color and icon, a check once done, a count for after-client jobs. */
function JobButton({ button, me, busy, onTap }: { button: HkButton; me: string; busy: boolean; onTap: () => void }) {
  const { task, done, mine, coveredBy } = button
  const t = tone(task.tone)
  const Icon = GLYPHS[task.icon] ?? Sparkles
  const byOther = coveredBy && nameKey(coveredBy.staffName) !== nameKey(me)
  const status =
    task.cadence === 'client'
      ? mine
        ? `${mine} today`
        : 'Tap after each client'
      : coveredBy
        ? `${byOther ? coveredBy.staffName.split(/\s+/)[0] : 'You'} · ${timeLabel(coveredBy.at)}`
        : done
          ? 'Done'
          : task.scope === 'shop'
            ? 'For the shop'
            : 'Your station'
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={busy}
      aria-label={`${task.name}${done ? ', done' : ''}`}
      className="group flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-center disabled:cursor-wait"
    >
      <span
        className="relative grid place-items-center w-[64px] h-[64px] rounded-full shadow-[0_6px_14px_-8px_rgba(0,0,0,.45)] transition-transform duration-150 group-active:scale-90"
        style={{ background: t.bg, color: t.fg, opacity: done ? 0.55 : 1 }}
      >
        <Icon size={28} strokeWidth={2.2} />
        {done && (
          <span
            className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-6 h-6 rounded-full ring-2 ring-white"
            style={{ background: TOOL_TONES.green.bg, color: '#fff' }}
            aria-hidden="true"
          >
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        {task.cadence === 'client' && mine > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 grid place-items-center rounded-full ring-2 ring-white text-[12px] font-bold"
            style={{ background: TOOL_TONES.royal.bg, color: '#fff' }}
          >
            {mine}
          </span>
        )}
      </span>
      <span className="text-[12.5px] font-semibold leading-tight text-ink px-0.5">{task.name}</span>
      <span className="text-[11px] leading-tight text-ink-2">{status}</span>
    </button>
  )
}

/** The thank-you that answers a tap: warm, specific, gone in a few seconds. */
function ThanksCard({ thanks, onClose }: { thanks: Thanks; onClose: () => void }) {
  const t = tone(thanks.tone)
  return (
    <div
      key={thanks.key}
      role="status"
      aria-live="polite"
      className="tip-nudge fixed z-[45] left-4 right-4 min-[560px]:left-auto min-[560px]:w-[380px] bottom-[calc(92px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-6 min-[1060px]:right-6"
    >
      <div className="bg-white rounded-2xl p-4 pr-3 border border-line shadow-[var(--shadow-lift)] flex items-start gap-3">
        <span className="grid place-items-center w-11 h-11 rounded-full shrink-0" style={{ background: t.bg, color: t.fg }} aria-hidden="true">
          <HandHeart size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <b className="block text-[16px] leading-snug text-royal">{thanks.title}</b>
          <p className="m-0 mt-0.5 text-[14px] leading-snug text-ink">{thanks.body}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 -mt-1 rounded-full border-0 bg-transparent text-ink-2 grid place-items-center cursor-pointer shrink-0"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  )
}

/** The week at a glance: each person's own list, day by day (✓ all done, n/N partly, · nothing). */
function WeekTable({
  tasks,
  week,
  people,
}: {
  tasks: HkTask[]
  week: Array<HkCheck & { dayKey: string }>
  people: string[]
}) {
  const days = weekKeys().reverse()
  if (people.length === 0) return null
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-sm border-collapse min-w-[460px]">
        <caption className="text-left text-[12px] text-ink-2 pb-2">
          Last 7 days · each person’s own jobs done (✦ = station resets after clients)
        </caption>
        <thead>
          <tr className="text-[12px] text-ink-2">
            <th className="text-left font-semibold py-1.5 pr-2">Team</th>
            {days.map((d) => (
              <th key={d} className="font-semibold py-1.5 px-1 text-center">
                {new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'short' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p} className="border-t border-line">
              <td className="py-2 pr-2 font-semibold whitespace-nowrap">{p}</td>
              {days.map((d) => {
                const s = summarizePeople(
                  tasks,
                  week.filter((c) => c.dayKey === d),
                  [p],
                )[0]
                const full = s.total > 0 && s.done === s.total
                return (
                  <td key={d} className="py-2 px-1 text-center whitespace-nowrap">
                    <span className={full ? 'text-good font-bold' : s.done ? 'text-ink' : 'text-ink-2'}>
                      {full ? '✓' : s.done ? `${s.done}/${s.total}` : '·'}
                    </span>
                    {s.clients > 0 && <span className="block text-[11px] text-ink-2">{s.clients} ✦</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Draft = { name: string; why: string; icon: HkIcon; tone: HkTone; cadence: HkCadence; scope: HkScope }
const EMPTY_DRAFT: Draft = { name: '', why: '', icon: 'sparkles', tone: 'garnet', cadence: 'daily', scope: 'shop' }

/** Owners shape the list: add a job (bold circle with an icon and color), restyle, hide or remove. */
function ManageJobsSheet({
  open,
  onClose,
  tasks,
  onTasks,
}: {
  open: boolean
  onClose: () => void
  tasks: HkTask[]
  onTasks: (tasks: HkTask[]) => void
}) {
  const toast = useToast()
  const [editing, setEditing] = useState<HkTask | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function startAdd() {
    setEditing(null)
    setDraft(EMPTY_DRAFT)
    setFormOpen(true)
  }
  function startEdit(t: HkTask) {
    setEditing(t)
    setDraft({ name: t.name, why: t.why, icon: t.icon, tone: t.tone, cadence: t.cadence, scope: t.scope })
    setFormOpen(true)
  }

  async function save() {
    setBusy(true)
    const r = editing
      ? await updateHousekeepingTask({ data: { id: editing.id, patch: draft } })
      : await addHousekeepingTask({ data: draft })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    onTasks(r.tasks)
    setFormOpen(false)
    toast(editing ? 'Saved.' : `Added “${draft.name.trim()}”.`)
  }

  async function toggle(t: HkTask) {
    const r = await updateHousekeepingTask({ data: { id: t.id, patch: { active: !t.active } } })
    if (!r.ok) return toast(r.message)
    onTasks(r.tasks)
  }

  async function remove(t: HkTask) {
    const r = await deleteHousekeepingTask({ data: { id: t.id } })
    onTasks(r.tasks)
    setFormOpen(false)
    toast(t.key ? `Hid “${t.name}”.` : `Removed “${t.name}”.`)
  }

  const preview = tone(draft.tone)
  const PreviewIcon = GLYPHS[draft.icon]

  return (
    <Sheet open={open} onClose={onClose} title="Customize jobs" subtitle="Add your own, restyle, or hide what your shop doesn’t do." wide>
      {!formOpen ? (
        <>
          <button className="btn btn-primary mb-4" onClick={startAdd}>
            <Plus size={16} /> Add a job
          </button>
          <ul className="list-none m-0 p-0 divide-y divide-line">
            {tasks.map((t) => {
              const Icon = GLYPHS[t.icon] ?? Sparkles
              const c = tone(t.tone)
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="grid place-items-center w-10 h-10 rounded-full shrink-0"
                    style={{ background: c.bg, color: c.fg, opacity: t.active ? 1 : 0.4 }}
                    aria-hidden="true"
                  >
                    <Icon size={19} />
                  </span>
                  <span className="flex-1 min-w-0 text-sm">
                    <b className={t.active ? '' : 'text-ink-2'}>{t.name}</b>
                    <span className="block text-[12px] text-ink-2">
                      {HK_CADENCES.find((x) => x.id === t.cadence)?.label} · {t.scope === 'shop' ? 'one person for the shop' : 'everyone’s own'}
                      {t.active ? '' : ' · hidden'}
                    </span>
                  </span>
                  <button className="btn btn-text btn-sm" onClick={() => startEdit(t)}>
                    Edit
                  </button>
                  <button className="btn btn-text btn-sm" onClick={() => void toggle(t)}>
                    {t.active ? 'Hide' : 'Show'}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <span
              className="grid place-items-center w-[72px] h-[72px] rounded-full shrink-0 shadow-[0_6px_14px_-8px_rgba(0,0,0,.45)]"
              style={{ background: preview.bg, color: preview.fg }}
              aria-hidden="true"
            >
              <PreviewIcon size={32} strokeWidth={2.2} />
            </span>
            <div className="flex-1 grid gap-2">
              <Field label="Job name">
                <input
                  className="field-input"
                  maxLength={40}
                  value={draft.name}
                  placeholder="Wipe down mirrors"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <Field label="Why it matters (shown in the thank-you)">
            <input
              className="field-input"
              maxLength={140}
              value={draft.why}
              placeholder="Clean mirrors make every finished look shine."
              onChange={(e) => setDraft({ ...draft, why: e.target.value })}
            />
          </Field>
          <div>
            <span className="block text-sm font-semibold mb-1.5">When</span>
            <div className="flex gap-2 flex-wrap">
              {HK_CADENCES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={draft.cadence === c.id}
                  onClick={() => setDraft({ ...draft, cadence: c.id })}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-sm font-semibold mb-1.5">Who</span>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="chip" aria-pressed={draft.scope === 'each'} onClick={() => setDraft({ ...draft, scope: 'each' })}>
                Everyone does their own
              </button>
              <button type="button" className="chip" aria-pressed={draft.scope === 'shop'} onClick={() => setDraft({ ...draft, scope: 'shop' })}>
                One person covers the shop
              </button>
            </div>
          </div>
          <div>
            <span className="block text-sm font-semibold mb-1.5">Color</span>
            <div className="flex gap-2 flex-wrap">
              {HK_TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-label={t}
                  aria-pressed={draft.tone === t}
                  onClick={() => setDraft({ ...draft, tone: t })}
                  className="w-9 h-9 rounded-full border-0 cursor-pointer"
                  style={{
                    background: TOOL_TONES[t].bg,
                    boxShadow: draft.tone === t ? '0 0 0 3px #fff, 0 0 0 5px var(--color-ink)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="block text-sm font-semibold mb-1.5">Icon</span>
            <div className="grid grid-cols-7 min-[480px]:grid-cols-9 gap-2">
              {HK_ICONS.map((id) => {
                const Icon = GLYPHS[id]
                const on = draft.icon === id
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={id}
                    aria-pressed={on}
                    onClick={() => setDraft({ ...draft, icon: id })}
                    className="grid place-items-center w-10 h-10 rounded-full border-0 cursor-pointer"
                    style={on ? { background: preview.bg, color: preview.fg } : { background: 'var(--color-surface)', color: 'var(--color-ink)' }}
                  >
                    <Icon size={18} />
                  </button>
                )
              })}
            </div>
          </div>
          <SheetActions>
            {editing && (
              <button className="btn btn-text !text-bad mr-auto" onClick={() => void remove(editing)}>
                {editing.key ? 'Hide this job' : 'Remove this job'}
              </button>
            )}
            <button className="btn btn-text" onClick={() => setFormOpen(false)}>
              Back
            </button>
            <button className="btn btn-primary" disabled={busy || !draft.name.trim()} onClick={() => void save()}>
              {editing ? 'Save' : 'Add job'}
            </button>
          </SheetActions>
        </div>
      )}
    </Sheet>
  )
}
