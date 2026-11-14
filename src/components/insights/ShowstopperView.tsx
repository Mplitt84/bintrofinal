/**
 * Reports tab → Showstopper: who is moving retail, what they are moving, and one
 * habit worth working on next.
 *
 * It is a celebration board, not a scoreboard to beat anyone with. Badges are plain
 * facts about the period and each says what earned it; a quiet month is named kindly
 * instead of ranked last; and the tips are technique and product science from
 * `src/lib/retail-tips.ts`, chosen by the person's own numbers — never a script and
 * never a claim a product cannot keep.
 *
 * All the arithmetic lives in `buildShowstopper` (`src/lib/showstopper.ts`).
 */
import { useEffect, useMemo, useState } from 'react'
import { Award, Check, ChevronRight, Copy, Target, TrendingUp } from 'lucide-react'
import { changeLabel, overviewWindows } from '@/lib/overview'
import type { OverviewPeriod } from '@/lib/overview'
import { goalPeriodKey } from '@/lib/showstopper'
import type { Showstopper, StaffCard } from '@/lib/showstopper'
import type { RetailTip } from '@/lib/retail-tips'
import { tipById } from '@/lib/retail-tips'
import { getShowstopper, setRetailCommission, setRetailGoal } from '@/server/showstopper.functions'
import { useBusiness, useMoney } from '@/components/business/BusinessContext'
import { GENERIC_PROVIDER_NOUN, providerNounFor } from '@/lib/industry'
import { Sheet, Field, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { EmptyState, PageHead } from '@/components/ui/bits'

const PERIOD_KEY = 'bintro.showstopperPeriod'
const PERIODS: { id: OverviewPeriod; label: string; compare: string }[] = [
  { id: 'week', label: 'This week', compare: 'vs. last week' },
  { id: 'month', label: 'This month', compare: 'vs. last month' },
  { id: 'quarter', label: 'This quarter', compare: 'vs. last quarter' },
]

export function ShowstopperView({ staffName, isOwner }: { staffName: string; isOwner: boolean }) {
  const { money: fmt } = useMoney()
  const { type, name: businessName } = useBusiness()
  const toast = useToast()
  const [period, setPeriod] = useState<OverviewPeriod>('month')
  const [board, setBoard] = useState<Showstopper | null>(null)
  const [failed, setFailed] = useState(false)
  const [goalFor, setGoalFor] = useState<StaffCard | null>(null)
  const [openTip, setOpenTip] = useState<{ tip: RetailTip; card: StaffCard } | null>(null)
  const [rateOpen, setRateOpen] = useState(false)
  const windows = useMemo(() => overviewWindows(period), [period])
  const label = PERIODS.find((p) => p.id === period)!

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERIOD_KEY) as OverviewPeriod | null
      if (saved && PERIODS.some((p) => p.id === saved)) setPeriod(saved)
    } catch {
      // A device that blocks storage just starts on the month.
    }
  }, [])

  const load = useMemo(
    () => () => {
      setFailed(false)
      return getShowstopper({
        data: {
          periodLabel: label.label,
          start: windows.start.toISOString(),
          end: windows.end.toISOString(),
          prevStart: windows.prevStart.toISOString(),
          prevEnd: windows.prevEnd.toISOString(),
          goalKey: goalPeriodKey(windows.start),
        },
      })
        .then((b) => setBoard(b as Showstopper))
        .catch(() => setFailed(true))
    },
    [label.label, windows],
  )

  useEffect(() => {
    let live = true
    setBoard(null)
    load().then(() => live)
    return () => {
      live = false
    }
  }, [load])

  const pick = (p: OverviewPeriod) => {
    setPeriod(p)
    try {
      localStorage.setItem(PERIOD_KEY, p)
    } catch {
      // Nothing to remember on a device that blocks storage.
    }
  }

  // Trades with a word of their own get it ("each stylist", "each artist"); the rest
  // read better as "team member" than as "service provider".
  const providerNoun = providerNounFor(type.id)
  const provider = providerNoun === GENERIC_PROVIDER_NOUN ? 'team member' : providerNoun.toLowerCase()

  const shoutOut = async () => {
    if (!board) return
    const lines = [`${businessName || 'We'} — retail, ${board.periodLabel.toLowerCase()}`]
    for (const c of board.cards.slice(0, 5)) {
      const badges = c.badges.map((b) => b.label).join(', ')
      lines.push(`${c.name}: ${fmt(c.soldCents)}${badges ? ` — ${badges}` : ''}`)
    }
    lines.push(`Together: ${fmt(board.teamSoldCents)}`)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      toast('Copied — paste it in the team chat')
    } catch {
      toast("This browser wouldn't let me copy it")
    }
  }

  return (
    <>
      <PageHead
        title="Showstopper"
        lead={`Who is moving retail, what they are moving, and one thing worth working on next. Every number here is something ${businessName || 'the shop'} already logged.`}
        action={
          board && board.cards.length > 0 ? (
            <button type="button" className="btn btn-tonal btn-sm" onClick={shoutOut}>
              <Copy size={15} /> Copy the shout-out
            </button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Showstopper period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            className="chip"
            aria-pressed={period === p.id}
            onClick={() => pick(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {failed ? (
        <EmptyState title="Showstopper didn't load">
          <p className="text-sm text-ink-2 m-0">Check your signal and tap a period again.</p>
        </EmptyState>
      ) : !board ? (
        <div className="grid gap-3 mt-3" aria-hidden="true">
          <div className="skel h-[72px] rounded-2xl" />
          <div className="skel h-[190px] rounded-2xl" />
          <div className="skel h-[190px] rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 mt-3">
          <TeamStrip board={board} compare={label.compare} />

          {board.cards.length === 0 ? (
            <EmptyState title="Nothing logged yet this period">
              <p className="text-sm text-ink-2 m-0">
                As soon as retail is scanned out under a name, or ticked as bought on a client record, it shows up here.
              </p>
            </EmptyState>
          ) : (
            board.cards.map((card, i) => (
              <PersonCard
                key={card.name}
                card={card}
                rank={i + 1}
                isYou={card.name.trim().toLowerCase() === staffName.trim().toLowerCase()}
                compare={label.compare}
                onGoal={() => setGoalFor(card)}
                onTip={(tip) => setOpenTip({ tip, card })}
              />
            ))
          )}

          {board.quiet.length > 0 && (
            <section className="bg-surface rounded-2xl p-4">
              <h3 className="m-0 text-[14px] font-bold mb-1">Not on the board yet</h3>
              <p className="m-0 text-[13px] text-ink-2 mb-2">
                No retail logged this period. One take-home written on a client record puts them up here — tap a name to set
                them a goal.
              </p>
              <ul className="list-none p-0 m-0 flex flex-wrap gap-1.5">
                {board.quiet.map((c) => (
                  <li key={c.name}>
                    <button type="button" className="chip" onClick={() => setGoalFor(c)}>
                      <Target size={13} /> {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CommissionCard board={board} isOwner={isOwner} onEdit={() => setRateOpen(true)} provider={provider} />

          <section className="bg-gold-tint border border-line rounded-2xl p-4">
            <h3 className="m-0 text-[14px] font-bold mb-2">How to read this</h3>
            <ul className="list-disc pl-5 m-0 grid gap-1.5 text-[13px] text-ink-2">
              {board.blindSpots.map((b) => (
                <li key={b}>{b}</li>
              ))}
              <li>These are the shop's own records, not a performance review. A quiet month is often a thin-records month.</li>
            </ul>
          </section>
        </div>
      )}

      {goalFor && (
        <GoalSheet
          card={goalFor}
          periodKey={goalPeriodKey(windows.start)}
          setBy={staffName}
          onClose={() => setGoalFor(null)}
          onSaved={() => {
            setGoalFor(null)
            toast('Goal saved')
            load()
          }}
        />
      )}

      {openTip && (
        <TipSheet
          tip={openTip.tip}
          card={openTip.card}
          periodKey={goalPeriodKey(windows.start)}
          setBy={staffName}
          onClose={() => setOpenTip(null)}
          onSaved={(message) => {
            setOpenTip(null)
            toast(message)
            load()
          }}
        />
      )}

      {rateOpen && (
        <RateSheet
          current={board?.commissionPct ?? 0}
          onClose={() => setRateOpen(false)}
          onSaved={() => {
            setRateOpen(false)
            toast('Saved')
            load()
          }}
        />
      )}
    </>
  )
}

/** Where the whole team stands, so the board reads as "us" before it reads as "me". */
function TeamStrip({ board, compare }: { board: Showstopper; compare: string }) {
  const { money: fmt } = useMoney()
  const change = changeLabel(board.teamSoldCents, board.teamPrevSoldCents)
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <div>
          <p className="m-0 text-[12px] text-ink-2 font-semibold">Together, {board.periodLabel.toLowerCase()}</p>
          <p className="m-0 text-[26px] font-extrabold leading-none tabular-nums">{fmt(board.teamSoldCents)}</p>
        </div>
        {change && (
          <p className={`m-0 text-[13px] font-semibold ${board.teamSoldCents >= board.teamPrevSoldCents ? 'text-good' : 'text-ink-2'}`}>
            {change} <span className="text-ink-2 font-normal">{compare}</span>
          </p>
        )}
        {board.uncreditedCents > 0 && (
          <p className="m-0 text-[13px] text-ink-2">
            includes <span className="font-semibold text-ink">{fmt(board.uncreditedCents)}</span> on no card
          </p>
        )}
        {board.teamAttachRate !== null && (
          <p className="m-0 text-[13px] text-ink-2">
            <span className="font-semibold text-ink">{Math.round(board.teamAttachRate * 100)}%</span> of what the team wrote down
            went home
          </p>
        )}
      </div>
    </section>
  )
}

function PersonCard({
  card,
  rank,
  isYou,
  compare,
  onGoal,
  onTip,
}: {
  card: StaffCard
  rank: number
  isYou: boolean
  compare: string
  onGoal: () => void
  onTip: (tip: RetailTip) => void
}) {
  const { money: fmt } = useMoney()
  const [showTips, setShowTips] = useState(false)
  const change = changeLabel(card.soldCents, card.prevSoldCents)
  const focus = (card.goal?.focusTips ?? []).map(tipById).filter((t): t is RetailTip => !!t)

  return (
    <section className={`bg-white border rounded-2xl p-4 ${isYou ? 'border-action ring-1 ring-action/30' : 'border-line'}`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-surface grid place-items-center text-[14px] font-extrabold shrink-0">
          {card.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[15px] font-bold truncate">
            {card.name}
            {isYou && <span className="ml-2 text-[11px] font-bold text-action align-middle">YOU</span>}
          </p>
          <p className="m-0 text-[12px] text-ink-2">
            #{rank} this period
            {card.daysSold > 0 && ` · sold on ${card.daysSold} ${card.daysSold === 1 ? 'day' : 'days'}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="m-0 text-[20px] font-extrabold leading-none tabular-nums">{fmt(card.soldCents)}</p>
          {change && <p className="m-0 mt-1 text-[12px] text-ink-2">{change} {compare}</p>}
        </div>
      </div>

      {card.badges.length > 0 && (
        <ul className="list-none p-0 m-0 mt-3 flex flex-wrap gap-1.5">
          {card.badges.map((b) => (
            <li key={b.id} className="bg-gold-tint border border-line rounded-full px-2.5 py-1 text-[12px] font-bold" title={b.because}>
              <Award size={12} className="inline-block mr-1 -mt-0.5" />
              {b.label}
              <span className="font-normal text-ink-2"> · {b.because}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 m-0">
        <Stat label="Items sold" value={String(card.soldUnits)} />
        {card.perVisitCents !== null && <Stat label="Per client seen" value={fmt(card.perVisitCents)} />}
        {card.attachRate !== null && (
          <Stat label="Went home" value={`${Math.round(card.attachRate * 100)}%`} hint={`${card.takenHome} of ${card.recommended}`} />
        )}
        {card.earnedCents !== null && <Stat label="Earned on retail" value={fmt(card.earnedCents)} />}
      </dl>

      {card.top.length > 0 && (
        <p className="m-0 mt-3 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">Moving for them:</span>{' '}
          {card.top.map((t) => `${t.name} (${t.units})`).join(' · ')}
        </p>
      )}

      <GoalBar card={card} onGoal={onGoal} />

      {focus.length > 0 && (
        <div className="mt-3">
          <p className="m-0 text-[12px] font-semibold text-ink-2">Working on</p>
          <ul className="list-none p-0 m-0 mt-1 grid gap-1">
            {focus.map((t) => (
              <li key={t.id}>
                <button type="button" className="btn btn-text btn-sm text-left" onClick={() => onTip(t)}>
                  <Check size={14} className="text-good" /> {t.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.tips.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <button
            type="button"
            className="btn btn-text btn-sm"
            aria-expanded={showTips}
            onClick={() => setShowTips((s) => !s)}
          >
            <TrendingUp size={15} /> {showTips ? 'Hide' : `${card.tips.length} ways to sell more, by the numbers`}
          </button>
          {showTips && (
            <ul className="list-none p-0 m-0 mt-2 grid gap-1.5">
              {card.tips.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="w-full text-left bg-surface rounded-xl px-3 py-2 flex items-center gap-2"
                    onClick={() => onTip(t)}
                  >
                    <span className="min-w-0 flex-1 text-[13px] font-semibold">{t.title}</span>
                    <ChevronRight size={16} className="text-ink-2 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface rounded-xl px-3 py-2">
      <dt className="m-0 text-[11px] text-ink-2 font-semibold">{label}</dt>
      <dd className="m-0 text-[15px] font-bold tabular-nums">
        {value}
        {hint && <span className="text-[11px] text-ink-2 font-normal"> · {hint}</span>}
      </dd>
    </div>
  )
}

function GoalBar({ card, onGoal }: { card: StaffCard; onGoal: () => void }) {
  const { money: fmt } = useMoney()
  if (!card.goal || card.goal.targetCents <= 0) {
    return (
      <button type="button" className="btn btn-tonal btn-sm mt-3" onClick={onGoal}>
        <Target size={15} /> Set a goal for the month
      </button>
    )
  }
  const pct = Math.min(1, card.goalProgress ?? 0)
  const met = (card.goalProgress ?? 0) >= 1
  const left = card.goal.targetCents - card.soldCents
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-[12px] font-semibold">
          {met ? 'Goal met' : `${fmt(left)} to go`}
          <span className="text-ink-2 font-normal"> · aiming at {fmt(card.goal.targetCents)}</span>
        </span>
        <button type="button" className="btn btn-text btn-sm" onClick={onGoal}>
          Change
        </button>
      </div>
      <div className="h-2.5 rounded-full bg-surface overflow-hidden">
        <div className={`h-full rounded-full ${met ? 'bg-good' : 'bg-action'}`} style={{ width: `${Math.max(2, pct * 100)}%` }} />
      </div>
    </div>
  )
}

/** What retail puts on a team member's cheque — only once the owner has set a rate. */
function CommissionCard({
  board,
  isOwner,
  onEdit,
  provider,
}: {
  board: Showstopper
  isOwner: boolean
  onEdit: () => void
  provider: string
}) {
  if (!isOwner && board.commissionPct <= 0) return null
  return (
    <section className="bg-white border border-line rounded-2xl p-4">
      <h3 className="m-0 text-[14px] font-bold mb-1">What retail pays</h3>
      {board.commissionPct > 0 ? (
        <p className="m-0 text-[13px] text-ink-2">
          Each {provider} earns {board.commissionPct}% of what they sell, so every card shows what this period put on
          their cheque.
          {isOwner && ' Change it any time.'}
        </p>
      ) : (
        <p className="m-0 text-[13px] text-ink-2">
          Set the share of retail your team earns and every card will show what this period made them. Bintro won't guess at
          anybody's pay.
        </p>
      )}
      {isOwner && (
        <button type="button" className="btn btn-tonal btn-sm mt-3" onClick={onEdit}>
          {board.commissionPct > 0 ? 'Change the rate' : 'Set the rate'}
        </button>
      )}
    </section>
  )
}

function GoalSheet({
  card,
  periodKey,
  setBy,
  onClose,
  onSaved,
}: {
  card: StaffCard
  periodKey: string
  setBy: string
  onClose: () => void
  onSaved: () => void
}) {
  const [dollars, setDollars] = useState(card.goal && card.goal.targetCents > 0 ? String(card.goal.targetCents / 100) : '')
  const [picked, setPicked] = useState<string[]>(card.goal?.focusTips ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await setRetailGoal({
        data: {
          staffName: card.name,
          periodKey,
          targetCents: Math.round(Number(dollars || 0) * 100),
          focusTips: picked,
          setBy,
        },
      })
      onSaved()
    } catch {
      setError("That didn't save. Check your signal and try again.")
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={`${card.name}'s month`}>
      <Field label="Aiming to sell">
        <input
          className="field-input"
          inputMode="decimal"
          placeholder="0"
          value={dollars}
          onChange={(e) => setDollars(e.target.value.replace(/[^0-9.]/g, ''))}
        />
      </Field>
      <p className="text-[12px] text-ink-2 mt-1">
        A goal is a thing to aim at, not a quota. Leave it empty to take it off the card.
      </p>

      {card.tips.length > 0 && (
        <>
          <p className="text-[13px] font-semibold mt-4 mb-1">Pick up to three habits to work on</p>
          <ul className="list-none p-0 m-0 grid gap-1.5">
            {card.tips.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="w-full text-left bg-surface rounded-xl px-3 py-2 flex items-start gap-2"
                  aria-pressed={picked.includes(t.id)}
                  onClick={() => toggle(t.id)}
                >
                  <span
                    className={`w-4 h-4 mt-0.5 rounded border grid place-items-center shrink-0 ${
                      picked.includes(t.id) ? 'bg-action border-action' : 'border-line'
                    }`}
                  >
                    {picked.includes(t.id) && <Check size={12} className="text-white" />}
                  </span>
                  <span className="min-w-0 text-[13px] font-semibold">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && <p className="text-[13px] text-bad mt-3">{error}</p>}
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </SheetActions>
    </Sheet>
  )
}

function TipSheet({
  tip,
  card,
  periodKey,
  setBy,
  onClose,
  onSaved,
}: {
  tip: RetailTip
  card: StaffCard
  periodKey: string
  setBy: string
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const chosen = (card.goal?.focusTips ?? []).includes(tip.id)
  const full = card.goal?.focusTips?.length === 3 && !chosen

  const work = async () => {
    setSaving(true)
    const focusTips = chosen
      ? (card.goal?.focusTips ?? []).filter((id) => id !== tip.id)
      : [...(card.goal?.focusTips ?? []), tip.id].slice(0, 3)
    try {
      await setRetailGoal({
        data: { staffName: card.name, periodKey, targetCents: card.goal?.targetCents ?? 0, focusTips, setBy },
      })
      onSaved(chosen ? 'Taken off the list' : "Added to what they're working on")
    } catch {
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={tip.title}>
      <p className="m-0 text-[14px]">{tip.how}</p>
      <div className="bg-surface rounded-xl p-3 mt-3">
        <p className="m-0 text-[12px] font-bold text-ink-2 uppercase tracking-wide">Why it works</p>
        <p className="m-0 mt-1 text-[13px]">{tip.why}</p>
      </div>
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={work} disabled={saving || full}>
          {chosen ? 'Stop working on this' : full ? 'Three already picked' : 'Work on this'}
        </button>
      </SheetActions>
    </Sheet>
  )
}

function RateSheet({ current, onClose, onSaved }: { current: number; onClose: () => void; onSaved: () => void }) {
  const [pct, setPct] = useState(String(current || ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await setRetailCommission({ data: { pct: Math.max(0, Math.min(100, Math.round(Number(pct || 0)))) } })
      onSaved()
    } catch {
      setError("That didn't save — the owner sets this one.")
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="What retail pays">
      <Field label="Share of retail the team earns (%)">
        <input
          className="field-input"
          inputMode="numeric"
          placeholder="0"
          value={pct}
          onChange={(e) => setPct(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </Field>
      <p className="text-[12px] text-ink-2 mt-1">
        Used only to show what a period made each person. It changes nothing about payroll, and 0 hides the line.
      </p>
      {error && <p className="text-[13px] text-bad mt-3">{error}</p>}
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </SheetActions>
    </Sheet>
  )
}
