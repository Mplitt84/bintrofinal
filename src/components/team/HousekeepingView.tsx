import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bath,
  Bell,
  BellOff,
  BrushCleaning,
  Check,
  CheckCheck,
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
  Moon,
  Package,
  Paintbrush,
  Plus,
  Recycle,
  Refrigerator,
  Scissors,
  Shirt,
  ShowerHead,
  Smartphone,
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
  HK_ASSIGNS,
  HK_CADENCES,
  HK_ICONS,
  HK_MOMENTS,
  HK_ROLES,
  HK_TONES,
  appreciation,
  buildButtons,
  dayNumberOf,
  localDayKey,
  momentOf,
  nameKey,
  openJobs,
  summarizePeople,
  type HkAssign,
  type HkButton,
  type HkCadence,
  type HkCheck,
  type HkDay,
  type HkIcon,
  type HkMoment,
  type HkReminder,
  type HkRole,
  type HkScope,
  type HkTask,
  type HkTone,
} from '@/lib/housekeeping'
import { DEFAULT_PREFS, WEEKDAYS, scheduleSummary, type ReminderPrefs, type ScheduleDay } from '@/lib/schedule'
import {
  addHousekeepingTask,
  checkHousekeeping,
  deleteHousekeepingTask,
  dismissHousekeepingReminder,
  getHousekeeping,
  getReminderSettings,
  saveReminderSettings,
  subscribePhone,
  undoHousekeeping,
  unsubscribePhone,
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

const MOMENT_LOOK: Record<HkMoment, { icon: typeof Sun; tone: HkTone }> = {
  arrive: { icon: Sun, tone: 'yellow' },
  client: { icon: Sparkles, tone: 'garnet' },
  close: { icon: Moon, tone: 'royal' },
}

const tone = (t: HkTone) => TOOL_TONES[t] ?? TOOL_TONES.garnet
const first = (n: string) => n.trim().split(/\s+/)[0] ?? n
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** The last 7 local days, today first. */
function weekKeys(today = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    return localDayKey(d)
  })
}

type Board = Awaited<ReturnType<typeof getHousekeeping>>
type Thanks = { title: string; body: string; tone: HkTone; key: number }

/**
 * Team → Housekeeping, built around a stylist's day: Arrive, Client done, Close out.
 * Every job already belongs to someone (everyone, today's turn, or assigned), so the
 * page only asks one thing: tap when it's done. Each moment is one big button that
 * opens just its jobs, with one button to finish them all at once.
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
  const [busy, setBusy] = useState(false)
  const [thanks, setThanks] = useState<Thanks | null>(null)
  const [moment, setMoment] = useState<HkMoment | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100))

  const today = localDayKey()
  const load = useCallback(async () => {
    try {
      setBoard(await getHousekeeping({ data: { dayKey: localDayKey(), weekKeys: weekKeys(), weekday: new Date().getDay() } }))
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
    const t = setTimeout(() => setThanks(null), 4500)
    return () => clearTimeout(t)
  }, [thanks])

  const me = staffName.trim()
  const day: HkDay | null = useMemo(
    () =>
      board
        ? {
            team: board.people,
            // You're working if you're here tapping, whatever the schedule says.
            working: me && !board.working.some((w) => nameKey(w) === nameKey(me)) ? [...board.working, me] : board.working,
            inventoryManagers: board.inventoryManagers,
            dayNumber: dayNumberOf(today),
          }
        : null,
    [board, me, today],
  )
  const people = useMemo(() => {
    const list = board?.people ?? []
    return me && !list.some((p) => nameKey(p) === nameKey(me)) ? [me, ...list] : list
  }, [board?.people, me])
  const buttons = useMemo(() => (board && day && me ? buildButtons(board.tasks, board.checks, me, day, board.week) : []), [board, day, me])
  const mine = buttons.filter((b) => b.onList)
  const byMoment = (m: HkMoment) => mine.filter((b) => momentOf(b.task.cadence) === m)
  const summary = useMemo(
    () => (board && day && me ? summarizePeople(board.tasks, board.checks, [me], day, board.week)[0] : null),
    [board, day, me],
  )
  const myReminders = (board?.reminders ?? []).filter((r) => !r.staffName || !me || nameKey(r.staffName) === nameKey(me))
  const clientJobCount = Math.max(1, byMoment('client').length)

  /** Logs jobs in one go, then one thank-you for the lot. */
  async function complete(list: HkButton[], reminder?: HkReminder) {
    if (!me) return toast('Tap your name first.')
    if (list.length === 0) return
    setBusy(true)
    const before = summary
    let added = 0
    for (const b of list) {
      const r = await checkHousekeeping({
        data: { taskId: b.task.id, staffName: me, dayKey: today, weekKeys: weekKeys(), reminderId: reminder?.id },
      })
      if (!r.ok) {
        setBusy(false)
        return toast(r.message)
      }
      if (r.added) added++
    }
    setBusy(false)
    navigator.vibrate?.(25)
    await load()
    setSeed((s) => s + 1)
    const lead = list[0].task
    const isClient = lead.cadence === 'client'
    const finishing = Boolean(before) && before!.total > 0 && !isClient && before!.done + added >= before!.total
    const why = isClient && list.length > 1 ? 'Fresh station, clean bowl, clear floor. The next client walks into your best.' : lead.why
    const resets = Math.round((before?.clients ?? 0) / clientJobCount) + 1
    setThanks({
      ...appreciation({ staffName: me, task: { ...lead, why }, seed, count: isClient ? resets : undefined, allDone: finishing }),
      tone: lead.tone,
      key: Date.now(),
    })
  }

  async function toggle(b: HkButton) {
    if (!me) return toast('Tap your name first.')
    if (b.task.cadence !== 'client' && b.done) {
      if (b.doneBy && nameKey(b.doneBy.staffName) === nameKey(me)) {
        const r = await undoHousekeeping({ data: { checkId: b.doneBy.checkId, staffName: me, dayKey: today } })
        if (!r.ok) return toast(r.message)
        await load()
        return toast(`${b.task.name} unchecked.`)
      }
      return toast(`${b.doneBy ? first(b.doneBy.staffName) : 'Someone'} already did this. Thank you, team!`)
    }
    await complete([b])
  }

  async function resetForReminder(reminder: HkReminder) {
    const clientJobs = byMoment('client')
    if (clientJobs.length === 0) {
      await dismissHousekeepingReminder({ data: { id: reminder.id, staffName: me || 'Team' } })
      return load()
    }
    await complete(clientJobs, reminder)
  }

  if (error && !board) return <p className="text-bad">{error}</p>
  if (!board || !day) {
    return (
      <div className="grid gap-3" aria-busy="true">
        <div className="skel h-20 rounded-2xl" />
        <div className="skel h-40 rounded-2xl" />
      </div>
    )
  }

  const everyone = summarizePeople(board.tasks, board.checks, people, day, board.week)
  const working = new Set(day.working.map(nameKey))
  const stillOpen = openJobs(board.tasks, board.checks, day, board.week)
  const resetsToday = Math.round((summary?.clients ?? 0) / clientJobCount)

  return (
    <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0">
      {/* Who's in today. */}
      <section aria-labelledby="hk-who" className="bg-white border border-line rounded-2xl p-4">
        <div className="flex items-baseline justify-between gap-x-3 gap-y-1 flex-wrap mb-3">
          <h2 id="hk-who" className="m-0 text-[17px] font-bold">
            Who’s working today?
          </h2>
          <span className="text-ink-2 text-[13px]">Tap your name to see your list.</span>
        </div>
        {people.length === 0 ? (
          <p className="text-ink-2 text-sm m-0">Add your team on the Team page first.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]" role="group" aria-label="Team">
            {[...everyone]
              .sort((a, b) => Number(working.has(nameKey(b.staffName))) - Number(working.has(nameKey(a.staffName))))
              .map((p) => {
                const active = me && nameKey(p.staffName) === nameKey(me)
                const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
                const isIn = working.has(nameKey(p.staffName))
                return (
                  <button
                    key={p.staffName}
                    type="button"
                    onClick={() => onStaffName(p.staffName)}
                    aria-pressed={Boolean(active)}
                    className={`flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer shrink-0 w-[76px] ${isIn ? '' : 'opacity-55'}`}
                  >
                    <span
                      className="relative grid place-items-center w-14 h-14 rounded-full"
                      style={{ background: `conic-gradient(${TOOL_TONES.green.bg} ${pct}%, var(--color-line) 0)` }}
                      aria-hidden="true"
                    >
                      <span className={`grid place-items-center w-[48px] h-[48px] rounded-full text-[15px] font-bold ${active ? 'bg-royal text-white' : 'bg-white text-ink'}`}>
                        {deriveInitials(p.staffName)}
                      </span>
                      {isIn && <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white" style={{ background: TOOL_TONES.green.bg }} />}
                    </span>
                    <span className={`text-[12px] leading-tight text-center truncate w-full ${active ? 'font-bold text-royal' : 'text-ink'}`}>{first(p.staffName)}</span>
                    <span className="text-[11px] text-ink-2 leading-none">{isIn ? `${p.done}/${p.total}` : 'Off today'}</span>
                  </button>
                )
              })}
          </div>
        )}
      </section>

      {/* Checkout reminders from Square. */}
      {myReminders.length > 0 && (
        <section aria-label="Checkout reminders" className="grid gap-2">
          {myReminders.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl p-3 pr-2 border border-line bg-white" style={{ boxShadow: `inset 4px 0 0 ${TOOL_TONES.garnet.bg}` }}>
              <span className="grid place-items-center w-10 h-10 rounded-full shrink-0" style={{ background: TOOL_TONES.garnet.bg, color: '#fff' }} aria-hidden="true">
                <Bell size={18} />
              </span>
              <span className="flex-1 min-w-0 text-sm">
                <b className="block">A client just checked out{r.staffName ? `, ${first(r.staffName)}` : ''}</b>
                <span className="text-ink-2">
                  {r.detail} · {timeLabel(r.at)}
                </span>
              </span>
              <button className="btn btn-primary btn-sm shrink-0" disabled={!me || busy} onClick={() => void resetForReminder(r)}>
                <CheckCheck size={15} /> Reset done
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

      {/* The three moments of the day: one big button each, then the whole list as circles. */}
      {!me ? (
        <p className="text-ink-2 m-0">Tap your name above to see your list.</p>
      ) : (
        <section aria-label={`${me}’s day`} className="bg-white border border-line rounded-2xl p-4">
          {summary && summary.total > 0 && (
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5 gap-3">
                <b className="text-[15px]">
                  {summary.done >= summary.total ? `Your list is done, ${first(me)} ✨` : `Your list today: ${summary.done} of ${summary.total}`}
                </b>
                <span className="text-[13px] text-ink-2">{resetsToday ? `${resetsToday} client reset${resetsToday === 1 ? '' : 's'}` : ''}</span>
              </div>
              <div className="h-2 rounded-full bg-line overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(summary.done / summary.total) * 100}%`, background: TOOL_TONES.green.bg }} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2.5">
            {HK_MOMENTS.map((m) => {
              const list = byMoment(m.id)
              const left = list.filter((b) => !b.done).length
              const look = MOMENT_LOOK[m.id]
              const t = tone(look.tone)
              const Icon = look.icon
              const status =
                m.id === 'client'
                  ? `${list.length} job${list.length === 1 ? '' : 's'} · every client`
                  : list.length === 0
                    ? 'Nothing today'
                    : left === 0
                      ? 'All done ✓'
                      : `${left} to do`
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMoment(m.id)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface/60 px-2 py-4 cursor-pointer text-center hover:bg-surface"
                >
                  <span
                    className="relative grid place-items-center w-[64px] h-[64px] rounded-full shadow-[0_6px_14px_-8px_rgba(0,0,0,.45)] transition-transform group-active:scale-90"
                    style={{ background: t.bg, color: t.fg }}
                  >
                    <Icon size={28} strokeWidth={2.2} />
                    {m.id !== 'client' && list.length > 0 && left === 0 && (
                      <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-6 h-6 rounded-full ring-2 ring-white" style={{ background: TOOL_TONES.green.bg, color: '#fff' }}>
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <b className="text-[15px] leading-tight">{m.label}</b>
                  <span className={`text-[12px] leading-tight ${m.id !== 'client' && left > 0 ? 'text-ink font-semibold' : 'text-ink-2'}`}>{status}</span>
                </button>
              )
            })}
          </div>

          {HK_ROLES.map((role) => {
            const list = mine.filter((b) => b.task.role === role.id)
            if (list.length === 0) return null
            return (
              <div key={role.id} className="mt-6">
                <div className="flex items-baseline gap-2 flex-wrap mb-3 pb-2 border-b border-line">
                  <h2 className="m-0 text-[17px] font-bold text-royal">{role.label}</h2>
                  <span className="text-[12px] text-ink-2">{role.hint}</span>
                </div>
                <div className="grid grid-cols-3 min-[480px]:grid-cols-4 min-[760px]:grid-cols-6 gap-x-2 gap-y-4">
                  {list.map((b) => (
                    <JobCircle key={b.task.id} button={b} me={me} onTap={() => void toggle(b)} />
                  ))}
                </div>
              </div>
            )
          })}
          <TurnsLine buttons={buttons} />
        </section>
      )}

      {/* The team's day: what's still open and whose it is, then the week. */}
      <section aria-labelledby="hk-board" className="bg-white border border-line rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 id="hk-board" className="m-0 text-[17px] font-bold">
            Today’s board
          </h2>
          <div className="flex gap-2 flex-wrap">
            {me && (
              <button className="btn btn-tonal btn-sm" onClick={() => setRemindersOpen(true)}>
                <Bell size={15} /> My reminders
              </button>
            )}
            {isOwner && (
              <button className="btn btn-tonal btn-sm" onClick={() => setManageOpen(true)}>
                <Plus size={15} /> Edit duties
              </button>
            )}
          </div>
        </div>
        {stillOpen.length > 0 ? (
          <ul className="list-none m-0 p-0 mb-4 grid gap-1.5">
            {stillOpen.map(({ task, owners }) => (
              <li key={task.id} className="flex items-center gap-2 text-sm flex-wrap">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TOOL_TONES.orange.bg }} aria-hidden="true" />
                <b>{task.name}</b>
                <span className="text-ink-2">
                  · {owners.length === 0 ? (task.role === 'inventory' ? 'no inventory manager set' : 'nobody assigned') : owners.length === 1 ? `${first(owners[0])}’s` : 'anyone'}
                  {task.cadence === 'weekly' ? ' · this week' : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm m-0 mb-4 text-good font-semibold">Every shared job is covered. Thank you, team.</p>
        )}
        <WeekTable tasks={board.tasks} week={board.week} people={people} day={day} />
      </section>

      <MomentSheet
        moment={moment}
        buttons={moment ? byMoment(moment) : []}
        me={me}
        busy={busy}
        onClose={() => setMoment(null)}
        onToggle={(b) => void toggle(b)}
        onAllDone={async (list) => {
          setMoment(null)
          await complete(list)
        }}
      />
      {thanks && <ThanksCard thanks={thanks} onClose={() => setThanks(null)} />}
      {me && <RemindersSheet open={remindersOpen} onClose={() => setRemindersOpen(false)} staffName={me} />}
      {isOwner && (
        <ManageJobsSheet
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          tasks={board.tasks}
          people={board.people}
          onTasks={(tasks) => setBoard((b) => (b ? { ...b, tasks } : b))}
        />
      )}
    </div>
  )
}

/** "Today's turns for others: Towels → Beth · Water plants → KaNesha", so everyone knows who has what. */
function TurnsLine({ buttons }: { buttons: HkButton[] }) {
  const others = buttons.filter((b) => b.task.assign !== 'everyone' && !b.onList && b.owners.length > 0)
  if (others.length === 0) return null
  return (
    <p className="text-[13px] text-ink-2 mt-5 mb-0">
      <b className="text-ink">Today’s turns for others:</b>{' '}
      {others.map((b, i) => (
        <span key={b.task.id}>
          {i > 0 && ' · '}
          {b.task.name} → {b.owners.map(first).join(', ')}
          {b.done ? ' ✓' : ''}
        </span>
      ))}
    </p>
  )
}

/** One bold circle: color, icon, a check once done, a count for after-client jobs. */
function JobCircle({ button, me, onTap }: { button: HkButton; me: string; onTap: () => void }) {
  const { task, done, mine, doneBy } = button
  const t = tone(task.tone)
  const Icon = GLYPHS[task.icon] ?? Sparkles
  const status =
    task.cadence === 'client'
      ? mine
        ? `${mine} today`
        : 'Every client'
      : doneBy
        ? `${nameKey(doneBy.staffName) === nameKey(me) ? 'You' : first(doneBy.staffName)} · ${
            task.cadence === 'weekly' ? new Date(doneBy.at).toLocaleDateString([], { weekday: 'short' }) : timeLabel(doneBy.at)
          }`
        : task.assign === 'rotate'
          ? 'Your turn today'
          : task.assign === 'assigned'
            ? 'Assigned to you'
            : HK_CADENCES.find((c) => c.id === task.cadence)?.label ?? ''
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`${task.name}${done ? ', done' : ''}`}
      className="group flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-center"
    >
      <span
        className="relative grid place-items-center w-[60px] h-[60px] rounded-full shadow-[0_6px_14px_-8px_rgba(0,0,0,.45)] transition-transform duration-150 group-active:scale-90"
        style={{ background: t.bg, color: t.fg, opacity: done ? 0.5 : 1 }}
      >
        <Icon size={26} strokeWidth={2.2} />
        {done && (
          <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-6 h-6 rounded-full ring-2 ring-white" style={{ background: TOOL_TONES.green.bg, color: '#fff' }} aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        {task.cadence === 'client' && mine > 0 && (
          <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 grid place-items-center rounded-full ring-2 ring-white text-[12px] font-bold" style={{ background: TOOL_TONES.royal.bg, color: '#fff' }}>
            {mine}
          </span>
        )}
      </span>
      <span className="text-[12.5px] font-semibold leading-tight text-ink px-0.5">{task.name}</span>
      <span className={`text-[11px] leading-tight ${!done && task.assign !== 'everyone' && task.cadence !== 'client' ? 'text-action font-semibold' : 'text-ink-2'}`}>{status}</span>
    </button>
  )
}

/** One moment's checklist: big rows, tap to tick, or one button to finish them all. */
function MomentSheet({
  moment,
  buttons,
  me,
  busy,
  onClose,
  onToggle,
  onAllDone,
}: {
  moment: HkMoment | null
  buttons: HkButton[]
  me: string
  busy: boolean
  onClose: () => void
  onToggle: (b: HkButton) => void
  onAllDone: (list: HkButton[]) => void
}) {
  const info = HK_MOMENTS.find((m) => m.id === moment)
  const left = buttons.filter((b) => b.task.cadence === 'client' || !b.done)
  return (
    <Sheet
      open={moment !== null}
      onClose={onClose}
      title={info ? info.label : ''}
      subtitle={
        moment === 'client'
          ? 'Do these after every client. One tap logs the whole reset.'
          : moment === 'close'
            ? 'Your end-of-day jobs, plus anything from today still open.'
            : 'Your start-of-day jobs.'
      }
    >
      {!me ? (
        <p className="text-sm text-ink-2">Tap your name first.</p>
      ) : buttons.length === 0 ? (
        <p className="text-sm text-ink-2">Nothing on your list for this one today.</p>
      ) : (
        <>
          <ul className="list-none m-0 p-0 grid gap-2">
            {buttons.map((b) => {
              const t = tone(b.task.tone)
              const Icon = GLYPHS[b.task.icon] ?? Sparkles
              const done = b.task.cadence !== 'client' && b.done
              return (
                <li key={b.task.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(b)}
                    className={`w-full flex items-center gap-3 rounded-2xl border border-line p-3 text-left cursor-pointer ${done ? 'bg-surface' : 'bg-white'}`}
                  >
                    <span className="relative grid place-items-center w-12 h-12 rounded-full shrink-0" style={{ background: t.bg, color: t.fg, opacity: done ? 0.5 : 1 }}>
                      <Icon size={22} strokeWidth={2.2} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <b className={`block text-[15px] ${done ? 'line-through text-ink-2' : ''}`}>{b.task.name}</b>
                      <span className="block text-[12px] text-ink-2 leading-snug">
                        {b.task.role === 'inventory' ? 'Inventory Management · ' : ''}
                        {b.task.assign === 'rotate' ? 'Your turn today · ' : b.task.assign === 'assigned' ? 'Assigned to you · ' : ''}
                        {b.task.cadence === 'client'
                          ? b.mine
                            ? `${b.mine} today`
                            : 'Every client'
                          : b.doneBy
                            ? `Done by ${first(b.doneBy.staffName)}`
                            : HK_CADENCES.find((c) => c.id === b.task.cadence)?.label}
                      </span>
                    </span>
                    <span
                      className="grid place-items-center w-8 h-8 rounded-full shrink-0 border-2"
                      style={done ? { background: TOOL_TONES.green.bg, borderColor: TOOL_TONES.green.bg, color: '#fff' } : { borderColor: 'var(--color-line)' }}
                      aria-hidden="true"
                    >
                      {done && <Check size={16} strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <SheetActions>
            <button className="btn btn-primary" disabled={busy || left.length === 0} onClick={() => onAllDone(left)}>
              <CheckCheck size={17} /> {left.length === 0 ? 'All done ✓' : moment === 'client' ? 'Reset done' : `All done (${left.length})`}
            </button>
          </SheetActions>
        </>
      )}
    </Sheet>
  )
}

/** The thank-you: warm, specific, gone in a few seconds. */
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
        <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 -mt-1 rounded-full border-0 bg-transparent text-ink-2 grid place-items-center cursor-pointer shrink-0">
          <X size={17} />
        </button>
      </div>
    </div>
  )
}

/** The week at a glance: each person's list, day by day (✓ all done, n/N partly, · not in). */
function WeekTable({ tasks, week, people, day }: { tasks: HkTask[]; week: Array<HkCheck & { dayKey: string }>; people: string[]; day: HkDay }) {
  const days = weekKeys().reverse()
  if (people.length === 0) return null
  const clientIds = new Set(tasks.filter((t) => t.cadence === 'client').map((t) => t.id))
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-sm border-collapse min-w-[460px]">
        <caption className="text-left text-[12px] text-ink-2 pb-2">Last 7 days · each person’s list done (✦ = clients reset)</caption>
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
                const checks = week.filter((c) => c.dayKey === d)
                const did = checks.some((c) => nameKey(c.staffName) === nameKey(p))
                const s = summarizePeople(tasks, checks, [p], { ...day, working: [...new Set([...checks.map((c) => c.staffName), p])], dayNumber: dayNumberOf(d) })[0]
                const full = did && s.total > 0 && s.done === s.total
                const resets = Math.round(checks.filter((c) => clientIds.has(c.taskId) && nameKey(c.staffName) === nameKey(p)).length / Math.max(1, clientIds.size))
                return (
                  <td key={d} className="py-2 px-1 text-center whitespace-nowrap">
                    <span className={full ? 'text-good font-bold' : did ? 'text-ink' : 'text-ink-2'}>{full ? '✓' : did ? `${s.done}/${s.total}` : '·'}</span>
                    {resets > 0 && <span className="block text-[11px] text-ink-2">{resets} ✦</span>}
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

// ---------------------------------------------------------------------------
// My reminders: phone notifications + where my day comes from
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function ReminderToggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-0 cursor-pointer">
      <span className="text-sm">
        <b className="block">{label}</b>
        <span className="text-ink-2 text-[12px]">{hint}</span>
      </span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-[var(--color-action)] shrink-0" />
    </label>
  )
}

function RemindersSheet({ open, onClose, staffName }: { open: boolean; onClose: () => void; staffName: string }) {
  const toast = useToast()
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS)
  const [schedule, setSchedule] = useState<ScheduleDay[]>([])
  const [publicKey, setPublicKey] = useState('')
  const [phones, setPhones] = useState(0)
  const [thisPhone, setThisPhone] = useState<PushSubscription | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    void getReminderSettings({ data: { staffName } }).then((s) => {
      setPrefs({ enabled: s.enabled, onArrive: s.onArrive, onClient: s.onClient, onClose: s.onClose, source: s.source, timeZone: s.timeZone })
      setSchedule(s.schedule)
      setPublicKey(s.publicKey)
      setPhones(s.phones)
    })
    if (pushSupported()) {
      void navigator.serviceWorker.getRegistration('/').then((reg) => reg?.pushManager.getSubscription().then(setThisPhone))
    }
  }, [open, staffName])

  async function turnOnPhone() {
    if (!pushSupported()) {
      return toast('This browser can’t show reminders. On iPhone, add Bintro to your Home Screen first (Share → Add to Home Screen), then open it from there.')
    }
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setBusy(false)
        return toast('Notifications are blocked for Bintro. Allow them in your phone’s settings, then try again.')
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }))
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await subscribePhone({ data: { staffName, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent } })
      setThisPhone(sub)
      setPhones((n) => n + 1)
      toast('Reminders are on for this phone. A test one is on its way.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t turn reminders on.')
    }
    setBusy(false)
  }

  async function turnOffPhone() {
    if (!thisPhone) return
    await unsubscribePhone({ data: { endpoint: thisPhone.endpoint } })
    await thisPhone.unsubscribe().catch(() => {})
    setThisPhone(null)
    setPhones((n) => Math.max(0, n - 1))
    toast('Reminders are off for this phone.')
  }

  async function save() {
    setBusy(true)
    const r = await saveReminderSettings({
      data: { staffName, prefs: { ...prefs, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || prefs.timeZone }, schedule },
    })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    toast('Saved. Your reminders follow this schedule.')
    onClose()
  }

  const setDay = (weekday: number, patch: Partial<ScheduleDay> | null) => {
    setSchedule((s) => {
      const rest = s.filter((d) => d.weekday !== weekday)
      if (patch === null) return rest
      const cur = s.find((d) => d.weekday === weekday) ?? { weekday, start: '10:00', end: '18:00' }
      return [...rest, { ...cur, ...patch }].sort((a, b) => a.weekday - b.weekday)
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title={`${first(staffName)}’s reminders`} subtitle="A nudge on your phone when you arrive, after each checkout, and when it’s time to close out.">
      <div className="rounded-2xl border border-line p-3 mb-4 flex items-center gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-full shrink-0" style={{ background: thisPhone ? TOOL_TONES.green.bg : TOOL_TONES.charcoal.bg, color: '#fff' }}>
          <Smartphone size={18} />
        </span>
        <span className="flex-1 text-sm">
          <b className="block">{thisPhone ? 'On for this phone' : 'Not on for this phone yet'}</b>
          <span className="text-ink-2 text-[12px]">{phones > 0 ? `${phones} device${phones === 1 ? '' : 's'} get your reminders.` : 'Turn it on from the phone you carry at work.'}</span>
        </span>
        {thisPhone ? (
          <button className="btn btn-text btn-sm" onClick={() => void turnOffPhone()}>
            <BellOff size={15} /> Turn off
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" disabled={busy || !publicKey} onClick={() => void turnOnPhone()}>
            <Bell size={15} /> Turn on
          </button>
        )}
      </div>

      <ReminderToggle label="Reminders" hint="Turn off to pause all of them" value={prefs.enabled} onChange={(v) => setPrefs({ ...prefs, enabled: v })} />
      {prefs.enabled && (
        <>
          <ReminderToggle label="When I arrive" hint="Your start-of-day jobs" value={prefs.onArrive} onChange={(v) => setPrefs({ ...prefs, onArrive: v })} />
          <ReminderToggle label="After each checkout" hint="Reset your station (needs Square)" value={prefs.onClient} onChange={(v) => setPrefs({ ...prefs, onClient: v })} />
          <ReminderToggle label="When I close out" hint="After your last client: anything still open" value={prefs.onClose} onChange={(v) => setPrefs({ ...prefs, onClose: v })} />

          <span className="block text-sm font-semibold mt-4 mb-1.5">Where your day comes from</span>
          <div className="flex gap-2 flex-wrap mb-1">
            <button type="button" className="chip" aria-pressed={prefs.source === 'square'} onClick={() => setPrefs({ ...prefs, source: 'square' })}>
              My Square Appointments bookings
            </button>
            <button type="button" className="chip" aria-pressed={prefs.source === 'schedule'} onClick={() => setPrefs({ ...prefs, source: 'schedule' })}>
              My usual schedule
            </button>
          </div>
          <p className="text-[12px] text-ink-2 mt-1 mb-3">
            {prefs.source === 'square'
              ? 'Uses your first and last booking each day. On days with no bookings, your usual schedule below is used.'
              : 'Arriving fires at your start time; close-out 15 minutes before you finish.'}
          </p>
          <div className="grid gap-1.5">
            {WEEKDAYS.map((label, weekday) => {
              const d = schedule.find((x) => x.weekday === weekday)
              return (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-2 w-[72px] shrink-0 cursor-pointer">
                    <input type="checkbox" checked={Boolean(d)} onChange={(e) => setDay(weekday, e.target.checked ? {} : null)} className="w-4 h-4 accent-[var(--color-action)]" />
                    <b>{label}</b>
                  </label>
                  {d ? (
                    <>
                      <input className="field-input !py-1.5 !w-auto" type="time" value={d.start} onChange={(e) => setDay(weekday, { start: e.target.value })} aria-label={`${label} start`} />
                      <span className="text-ink-2">to</span>
                      <input className="field-input !py-1.5 !w-auto" type="time" value={d.end} onChange={(e) => setDay(weekday, { end: e.target.value })} aria-label={`${label} end`} />
                    </>
                  ) : (
                    <span className="text-ink-2">Off</span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[12px] text-ink-2 mt-2 mb-0">{scheduleSummary(schedule)}</p>
        </>
      )}
      <SheetActions>
        <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>
          Save
        </button>
      </SheetActions>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Edit duties (owners): every duty fully editable
// ---------------------------------------------------------------------------

type Draft = {
  name: string
  why: string
  icon: HkIcon
  tone: HkTone
  cadence: HkCadence
  scope: HkScope
  role: HkRole
  assign: HkAssign
  assignees: string[]
}
const EMPTY_DRAFT: Draft = { name: '', why: '', icon: 'sparkles', tone: 'garnet', cadence: 'daily', scope: 'shop', role: 'artist', assign: 'rotate', assignees: [] }

function ChipRow<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <span className="block text-sm font-semibold mb-1.5">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button key={o.id} type="button" className="chip" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ManageJobsSheet({
  open,
  onClose,
  tasks,
  people,
  onTasks,
}: {
  open: boolean
  onClose: () => void
  tasks: HkTask[]
  people: string[]
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
    setDraft({ name: t.name, why: t.why, icon: t.icon, tone: t.tone, cadence: t.cadence, scope: t.scope, role: t.role, assign: t.assign, assignees: t.assignees })
    setFormOpen(true)
  }

  async function save() {
    if (draft.assign === 'assigned' && draft.assignees.length === 0) return toast('Pick who this is assigned to.')
    setBusy(true)
    const payload = { ...draft, scope: draft.assign === 'rotate' ? ('shop' as const) : draft.scope }
    const r = editing ? await updateHousekeepingTask({ data: { id: editing.id, patch: payload } }) : await addHousekeepingTask({ data: payload })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    onTasks(r.tasks)
    setFormOpen(false)
    toast(editing ? 'Saved.' : `Added “${draft.name.trim()}”.`)
  }

  async function setActive(t: HkTask, active: boolean) {
    const r = await updateHousekeepingTask({ data: { id: t.id, patch: { active } } })
    if (!r.ok) return toast(r.message)
    onTasks(r.tasks)
  }

  async function remove(t: HkTask) {
    const r = await deleteHousekeepingTask({ data: { id: t.id } })
    onTasks(r.tasks)
    setFormOpen(false)
    toast(`Removed “${t.name}”.`)
  }

  const preview = tone(draft.tone)
  const PreviewIcon = GLYPHS[draft.icon]
  const whoLabel = (t: HkTask) =>
    t.assign === 'assigned' ? `Assigned: ${t.assignees.map(first).join(', ') || 'nobody yet'}` : t.assign === 'rotate' ? 'Takes turns' : t.scope === 'each' ? 'Everyone, own station' : 'Everyone'

  return (
    <Sheet open={open} onClose={onClose} title="Edit duties" subtitle="Every duty is yours to change: name, when, who, color, icon." wide>
      {!formOpen ? (
        <>
          <button className="btn btn-primary mb-4" onClick={startAdd}>
            <Plus size={16} /> Add a duty
          </button>
          {HK_ROLES.map((role) => (
            <div key={role.id} className="mb-4">
              <h3 className="m-0 mb-1 text-[15px] font-bold text-royal">{role.label}</h3>
              <ul className="list-none m-0 p-0 divide-y divide-line">
                {tasks
                  .filter((t) => t.role === role.id)
                  .map((t) => {
                    const Icon = GLYPHS[t.icon] ?? Sparkles
                    const c = tone(t.tone)
                    return (
                      <li key={t.id} className="flex items-center gap-3 py-2.5">
                        <span className="grid place-items-center w-10 h-10 rounded-full shrink-0" style={{ background: c.bg, color: c.fg, opacity: t.active ? 1 : 0.35 }} aria-hidden="true">
                          <Icon size={19} />
                        </span>
                        <span className="flex-1 min-w-0 text-sm">
                          <b className={t.active ? '' : 'text-ink-2'}>{t.name}</b>
                          <span className="block text-[12px] text-ink-2">
                            {HK_MOMENTS.find((m) => m.id === momentOf(t.cadence))?.label} · {HK_CADENCES.find((x) => x.id === t.cadence)?.label} · {whoLabel(t)}
                            {t.active ? '' : ' · off'}
                          </span>
                        </span>
                        <button className="btn btn-text btn-sm" onClick={() => startEdit(t)}>
                          Edit
                        </button>
                        <button className="btn btn-text btn-sm" onClick={() => void setActive(t, !t.active)}>
                          {t.active ? 'Turn off' : 'Turn on'}
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </div>
          ))}
        </>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <span className="grid place-items-center w-[72px] h-[72px] rounded-full shrink-0 shadow-[0_6px_14px_-8px_rgba(0,0,0,.45)]" style={{ background: preview.bg, color: preview.fg }} aria-hidden="true">
              <PreviewIcon size={32} strokeWidth={2.2} />
            </span>
            <div className="flex-1">
              <Field label="Duty">
                <input className="field-input" maxLength={40} value={draft.name} placeholder="Wipe down mirrors" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
            </div>
          </div>
          <Field label="Why it matters (shown in the thank-you)">
            <input className="field-input" maxLength={140} value={draft.why} placeholder="Clean mirrors make every finished look shine." onChange={(e) => setDraft({ ...draft, why: e.target.value })} />
          </Field>
          <ChipRow label="Section" value={draft.role} options={HK_ROLES.map((r) => ({ id: r.id, label: r.label }))} onChange={(role) => setDraft({ ...draft, role })} />
          <ChipRow label="When" value={draft.cadence} options={HK_CADENCES.map((c) => ({ id: c.id, label: c.label }))} onChange={(cadence) => setDraft({ ...draft, cadence })} />
          <ChipRow label="Who" value={draft.assign} options={HK_ASSIGNS.map((a) => ({ id: a.id, label: a.label }))} onChange={(assign) => setDraft({ ...draft, assign })} />
          <p className="text-[12px] text-ink-2 -mt-2 mb-0">{HK_ASSIGNS.find((a) => a.id === draft.assign)?.hint}</p>
          {draft.assign === 'everyone' && (
            <ChipRow
              label="Done by"
              value={draft.scope}
              options={[
                { id: 'each' as HkScope, label: 'Each person, at their own station' },
                { id: 'shop' as HkScope, label: 'Whoever gets to it first' },
              ]}
              onChange={(scope) => setDraft({ ...draft, scope })}
            />
          )}
          {draft.assign === 'assigned' && (
            <div>
              <span className="block text-sm font-semibold mb-1.5">Assigned to</span>
              <div className="flex gap-2 flex-wrap">
                {people.map((p) => {
                  const on = draft.assignees.some((a) => nameKey(a) === nameKey(p))
                  return (
                    <button
                      key={p}
                      type="button"
                      className="chip"
                      aria-pressed={on}
                      onClick={() => setDraft({ ...draft, assignees: on ? draft.assignees.filter((a) => nameKey(a) !== nameKey(p)) : [...draft.assignees, p] })}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
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
                  style={{ background: TOOL_TONES[t].bg, boxShadow: draft.tone === t ? '0 0 0 3px #fff, 0 0 0 5px var(--color-ink)' : 'none' }}
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
                Remove
              </button>
            )}
            <button className="btn btn-text" onClick={() => setFormOpen(false)}>
              Back
            </button>
            <button className="btn btn-primary" disabled={busy || !draft.name.trim()} onClick={() => void save()}>
              {editing ? 'Save' : 'Add duty'}
            </button>
          </SheetActions>
        </div>
      )}
    </Sheet>
  )
}
