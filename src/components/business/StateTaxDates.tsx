import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Landmark, MapPin } from 'lucide-react'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { useBusiness } from './BusinessContext'
import { estimatedTaxDates, type EventInput } from '@/lib/calendar'
import { STATE_TAXES, nextYearly, salesRuleLabel, salesTaxDueDates, stateTax } from '@/lib/state-taxes'
import { updateBusinessProfile } from '@/server/business.functions'

type Group = 'federal' | 'state' | 'sales'
const Q = ['Q1', 'Q2', 'Q3', 'Q4']
const WEEKEND = 'If this falls on a weekend or holiday, it is usually due the next business day.'

/**
 * Calendar → "Your state's tax dates": pick the state once (saved on the business
 * profile), then add the federal and state quarterly estimated-tax dates and the
 * state's quarterly sales tax return dates, each repeating yearly, with a link to
 * the state's tax website.
 */
export function StateTaxDates({
  existingTitles,
  staffName,
  onAdd,
}: {
  /** Titles already on the calendar, so nothing is added twice. */
  existingTitles: Set<string>
  staffName: string
  onAdd: (items: EventInput[], message: string) => Promise<void>
}) {
  const { profile } = useBusiness()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState(profile.taxState || '')
  const [pick, setPick] = useState<Record<Group, boolean>>({ federal: true, state: true, sales: true })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (profile.taxState) setCode(profile.taxState)
  }, [profile.taxState])

  const st = stateTax(code)

  const groups = useMemo(() => {
    const base = { kind: 'tax' as const, startTime: '', durationMinutes: 60, staffName, repeat: 'yearly' as const }
    const out: { id: Group; label: string; sub: string; items: EventInput[] }[] = []
    out.push({
      id: 'federal',
      label: 'Federal estimated tax (IRS)',
      sub: 'April 15, June 15, September 15 and January 15',
      items: estimatedTaxDates().map((t) => ({
        ...base,
        title: t.title,
        date: t.date,
        notes: `Federal estimated tax (Form 1040-ES). Pay at https://www.irs.gov/payments\n${WEEKEND}`,
      })),
    })
    if (!st) return out
    if (st.incomeTax && st.estimated) {
      out.push({
        id: 'state',
        label: `${st.name} estimated income tax`,
        sub: st.estimated.map((md) => monthDay(md)).join(', '),
        items: st.estimated.map((md, i) => ({
          ...base,
          title: `${st.name} ${Q[i]} estimated tax payment due`,
          date: nextYearly(md),
          notes: `${st.name} estimated income tax, ${Q[i]}. ${st.agency}: ${st.url}\n${WEEKEND}`,
        })),
      })
    }
    const sales = salesTaxDueDates(st.sales)
    if (sales.length) {
      const url = st.salesUrl ?? st.url
      out.push({
        id: 'sales',
        label: `${st.name} sales tax return (quarterly filers)`,
        sub: sales.map((s) => monthDay(s.md)).join(', '),
        items: sales.map((s) => ({
          ...base,
          title: `${st.name} sales tax return due (${s.period})`,
          date: nextYearly(s.md),
          notes: `Quarterly sales tax return for ${s.period}. Only if ${st.name} has you filing quarterly; monthly and yearly filers have other dates. File at ${url}\n${WEEKEND}`,
        })),
      })
    }
    return out.map((g) => ({ ...g, items: g.items.filter((it) => !existingTitles.has(it.title)) }))
  }, [st, staffName, existingTitles])

  const chosen = groups.filter((g) => pick[g.id]).flatMap((g) => g.items)

  async function chooseState(next: string) {
    setCode(next)
    try {
      await updateBusinessProfile({ data: { taxState: next } })
    } catch {
      // The dates can still be added; the state just isn't remembered.
    }
  }

  async function add() {
    if (!chosen.length) return
    setBusy(true)
    try {
      await onAdd(chosen, `Added ${chosen.length} tax date${chosen.length === 1 ? '' : 's'}${st ? ` for ${st.name}` : ''}`)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 text-left rounded-2xl border border-line bg-white hover:bg-surface px-3.5 py-3 cursor-pointer"
      >
        <Landmark size={20} className="text-action shrink-0" />
        <span className="flex-1 min-w-0 text-sm">
          <b className="block">Your state’s tax dates</b>
          <span className="text-ink-2 text-[13px]">{st ? `${st.name} · quarterly tax and sales tax dates` : 'Pick your state to add its quarterly dates'}</span>
        </span>
        <MapPin size={18} className="text-ink-2 shrink-0" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Tax dates for your state" subtitle="Pick your state. Bintro adds the quarterly due dates to your calendar every year.">
        <label className="block mb-3">
          <span className="text-sm font-semibold">State</span>
          <select className="field-input mt-1" value={code} onChange={(e) => chooseState(e.target.value)}>
            <option value="">Choose your state…</option>
            {STATE_TAXES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {st && (
          <a
            href={st.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2.5 mb-3 text-sm font-semibold no-underline text-ink"
          >
            <ExternalLink size={16} className="text-action shrink-0" />
            <span className="flex-1 min-w-0">
              {st.agency}
              <span className="block text-[12px] text-ink-2 font-normal truncate">{st.url.replace(/^https?:\/\//, '')}</span>
            </span>
          </a>
        )}
        {st?.salesUrl && (
          <a href={st.salesUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2.5 mb-3 text-sm font-semibold no-underline text-ink">
            <ExternalLink size={16} className="text-action shrink-0" />
            <span className="flex-1 min-w-0">
              Sales tax ({st.name})
              <span className="block text-[12px] text-ink-2 font-normal truncate">{st.salesUrl.replace(/^https?:\/\//, '')}</span>
            </span>
          </a>
        )}

        <ul className="list-none m-0 p-0 grid gap-2">
          {groups.map((g) => (
            <li key={g.id}>
              <label className={`flex items-start gap-3 rounded-xl border border-line px-3.5 py-3 ${g.items.length ? 'cursor-pointer' : 'opacity-60'}`}>
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={!g.items.length}
                  checked={pick[g.id] && g.items.length > 0}
                  onChange={(e) => setPick((p) => ({ ...p, [g.id]: e.target.checked }))}
                />
                <span className="text-sm min-w-0">
                  <b className="block">{g.label}</b>
                  <span className="text-ink-2 text-[13px]">{g.items.length ? g.sub : 'Already on your calendar'}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {st && (
          <div className="text-[13px] text-ink-2 mt-3 grid gap-1">
            {!st.incomeTax && <p className="m-0">{st.name} has no state income tax, so there are no state estimated payments.</p>}
            {st.incomeTax && !st.estimated && (
              <p className="m-0">We couldn’t confirm {st.name}’s estimated tax dates, so none are added. Check the link above.</p>
            )}
            <p className="m-0">Sales tax: {salesRuleLabel(st.sales)}.</p>
            <p className="m-0">
              Your state decides if you file sales tax monthly, quarterly or yearly. Dates move to the next business day on weekends and holidays. Check with your accountant.
            </p>
          </div>
        )}

        <SheetActions>
          <button type="button" className="btn btn-tonal" onClick={() => setOpen(false)}>
            Close
          </button>
          <button type="button" className="btn btn-primary" disabled={busy || chosen.length === 0} onClick={add}>
            {busy ? 'Adding…' : chosen.length ? `Add ${chosen.length} dates` : 'Nothing new to add'}
          </button>
        </SheetActions>
      </Sheet>
    </>
  )
}

function monthDay(md: string) {
  const [m, d] = md.split('-').map(Number)
  return new Date(2001, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
