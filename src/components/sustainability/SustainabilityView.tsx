import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Handshake, Leaf, Pencil, Plus, Scale, Trash2 } from 'lucide-react'
import { PageHead, StatGrid, StatTile, centsToDollars } from '@/components/ui/bits'
import { Field, Sheet, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { TOOL_TONES } from '@/components/ui/ToolButton'
import { useBusiness, useMoney } from '@/components/business/BusinessContext'
import {
  PARTNER_KINDS,
  PARTNER_SUGGESTIONS,
  WASTE_UNITS,
  currentMonthKey,
  formatWeight,
  fromGrams,
  monthLabel,
  toGrams,
  wasteMonths,
  wasteTotals,
  type Partner,
  type PartnerKind,
  type WasteLog,
  type WasteUnit,
} from '@/lib/sustainability'
import {
  deletePartnerFn,
  deleteWasteLogFn,
  getSustainability,
  savePartnerFn,
  saveWasteLogFn,
} from '@/server/sustainability.functions'

const UNIT_KEY = 'bintro.wasteUnit'
const BEAUTY = new Set(['salon', 'barber', 'nails', 'brows', 'tattoo', 'spa', 'other'])

function savedUnit(): WasteUnit {
  try {
    const u = window.localStorage.getItem(UNIT_KEY)
    return WASTE_UNITS.some((x) => x.id === u) ? (u as WasteUnit) : 'lb'
  } catch {
    return 'lb'
  }
}

/**
 * Sustainability: who the shop partners with to stay green (written in by the team),
 * and color waste weighed each month, so less waste shows up as inventory savings.
 */
export function SustainabilityView({ staffName }: { staffName: string }) {
  const toast = useToast()
  const { profile } = useBusiness()
  const { money } = useMoney()
  const [partners, setPartners] = useState<Partner[] | null>(null)
  const [logs, setLogs] = useState<WasteLog[]>([])
  const [unit, setUnit] = useState<WasteUnit>('lb')
  const [editingPartner, setEditingPartner] = useState<Partial<Partner> | null>(null)
  const [wasteOpen, setWasteOpen] = useState<WasteLog | 'new' | null>(null)

  useEffect(() => {
    setUnit(savedUnit())
    getSustainability()
      .then((r) => {
        setPartners(r.partners)
        setLogs(r.logs)
      })
      .catch(() => setPartners([]))
  }, [])

  const pickUnit = (u: WasteUnit) => {
    setUnit(u)
    try {
      window.localStorage.setItem(UNIT_KEY, u)
    } catch {
      // Private mode: the unit just won't be remembered.
    }
  }

  const months = useMemo(() => wasteMonths(logs), [logs])
  const totals = useMemo(() => wasteTotals(months), [months])
  const latest = months[months.length - 1]
  const recent = months.slice(-12)
  const peak = Math.max(1, ...recent.map((m) => m.grams))
  const suggestions = BEAUTY.has(profile.businessType)
    ? PARTNER_SUGGESTIONS.filter((s) => !(partners ?? []).some((p) => p.name.toLowerCase() === s.name.toLowerCase()))
    : []

  return (
    <>
      <PageHead
        title="Sustainability"
        lead="Who you partner with to stay green, and the color waste you weigh each month. Less waste is money that stays in your inventory."
      />

      {/* Partners */}
      <section aria-labelledby="sus-partners" className="bg-white border border-line rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h2 id="sus-partners" className="m-0 text-[17px] font-bold flex items-center gap-2">
            <Handshake size={18} className="text-ink-2" /> Our partners
          </h2>
          <button className="btn btn-tonal btn-sm" onClick={() => setEditingPartner({ kind: 'recycling' })}>
            <Plus size={15} /> Add a partner
          </button>
        </div>
        <p className="text-ink-2 text-[13px] mt-0 mb-3">
          Recycling programs, certifications, donation partners and green suppliers. Write in whoever you work with.
        </p>
        {suggestions.map((s) => (
          <button
            key={s.name}
            type="button"
            className="w-full text-left flex items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-3 mb-2 cursor-pointer"
            onClick={() => setEditingPartner({ ...s })}
          >
            <span className="grid place-items-center w-10 h-10 rounded-full shrink-0" style={{ background: TOOL_TONES.green.bg, color: '#fff' }}>
              <Leaf size={18} />
            </span>
            <span className="flex-1 text-sm">
              <b>Work with {s.name}?</b>
              <span className="block text-ink-2 text-[12px]">Tap to add them, then fill in your contact and start date.</span>
            </span>
            <Plus size={18} className="text-ink-2" />
          </button>
        ))}
        {partners === null ? (
          <div className="skel h-16 rounded-2xl" />
        ) : partners.length === 0 ? (
          <p className="text-sm text-ink-2 m-0">No partners yet.</p>
        ) : (
          <ul className="list-none m-0 p-0 grid gap-2 min-[760px]:grid-cols-2">
            {partners.map((p) => (
              <li key={p.id} className="rounded-2xl border border-line p-3 flex items-start gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-full shrink-0" style={{ background: TOOL_TONES.green.bg, color: '#fff' }} aria-hidden="true">
                  <Leaf size={18} />
                </span>
                <div className="flex-1 min-w-0 text-sm">
                  <b className="block">{p.name}</b>
                  <span className="text-[12px] text-ink-2">
                    {PARTNER_KINDS.find((k) => k.id === p.kind)?.label}
                    {p.since ? ` · since ${monthLabel(p.since)}` : ''}
                  </span>
                  {p.contact && <span className="block mt-1">{p.contact}</span>}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-[13px] font-semibold">
                      {p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} <ExternalLink size={12} />
                    </a>
                  )}
                  {p.notes && <p className="m-0 mt-1 text-ink-2 text-[13px] whitespace-pre-wrap">{p.notes}</p>}
                </div>
                <button className="btn btn-text btn-sm !px-2" aria-label={`Edit ${p.name}`} onClick={() => setEditingPartner(p)}>
                  <Pencil size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Color waste */}
      <section aria-labelledby="sus-waste" className="bg-white border border-line rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h2 id="sus-waste" className="m-0 text-[17px] font-bold flex items-center gap-2">
            <Scale size={18} className="text-ink-2" /> Color waste
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-surface rounded-full p-0.5" role="group" aria-label="Weight unit">
              {WASTE_UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={unit === u.id}
                  onClick={() => pickUnit(u.id)}
                  className={`px-2.5 py-1 rounded-full border-0 cursor-pointer text-[12px] font-semibold ${unit === u.id ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-ink-2'}`}
                >
                  {u.label}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setWasteOpen('new')}>
              <Plus size={15} /> Log a month
            </button>
          </div>
        </div>
        <p className="text-ink-2 text-[13px] mt-0 mb-4">
          Weigh the leftover color you throw away (or send to your recycling partner) once a month. Add what an ounce of mixed color costs you, and Bintro turns less waste into money saved.
        </p>

        {months.length === 0 ? (
          <p className="text-sm text-ink-2 m-0">Nothing logged yet. Your first month becomes the starting point.</p>
        ) : (
          <>
            <StatGrid>
              <StatTile label={`${monthLabel(latest.month)} waste`} value={formatWeight(latest.grams, unit)} />
              <StatTile
                label="vs the month before"
                value={latest.changeGrams === null ? '—' : `${latest.changeGrams <= 0 ? '↓' : '↑'} ${formatWeight(Math.abs(latest.changeGrams), unit)}`}
                tone={latest.changeGrams === null ? undefined : latest.changeGrams <= 0 ? 'good' : 'bad'}
              />
              <StatTile
                label="Saved vs the month before"
                value={latest.savedVsLastCents === null ? '—' : money(latest.savedVsLastCents)}
                tone={latest.savedVsLastCents === null ? undefined : latest.savedVsLastCents >= 0 ? 'good' : 'bad'}
              />
              <StatTile
                label={`Saved since ${monthLabel(months[0].month)}`}
                value={totals.savedCents === null ? '—' : money(totals.savedCents)}
                tone={totals.savedCents === null ? undefined : totals.savedCents >= 0 ? 'good' : 'bad'}
              />
            </StatGrid>

            {/* The last 12 months as bars: lower is better. */}
            <div className="mb-4" aria-hidden="true">
              <div className="flex items-end gap-1.5 h-[140px] border-b border-line px-1">
                {recent.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <span className="text-[10px] text-ink-2 mb-1 whitespace-nowrap">{fromGrams(m.grams, unit).toFixed(unit === 'g' ? 0 : 1)}</span>
                    <div
                      className="w-full max-w-[34px] rounded-t-md"
                      style={{
                        height: `${Math.max(4, (m.grams / peak) * 110)}px`,
                        background: m.changeGrams !== null && m.changeGrams > 0 ? TOOL_TONES.orange.bg : TOOL_TONES.green.bg,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 px-1 mt-1">
                {recent.map((m) => (
                  <span key={m.month} className="flex-1 text-center text-[10px] text-ink-2 truncate">
                    {monthLabel(m.month, true)}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-sm border-collapse min-w-[460px]">
                <thead>
                  <tr className="text-[12px] text-ink-2 text-left">
                    <th className="font-semibold py-1.5">Month</th>
                    <th className="font-semibold py-1.5 text-right">Waste</th>
                    <th className="font-semibold py-1.5 text-right">Change</th>
                    <th className="font-semibold py-1.5 text-right">Saved</th>
                    <th className="sr-only">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((m) => (
                    <tr key={m.id} className="border-t border-line">
                      <td className="py-2">
                        <b>{monthLabel(m.month)}</b>
                        {m.note && <span className="block text-[12px] text-ink-2">{m.note}</span>}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">{formatWeight(m.grams, unit)}</td>
                      <td className={`py-2 text-right whitespace-nowrap ${m.changeGrams === null ? 'text-ink-2' : m.changeGrams <= 0 ? 'text-good' : 'text-bad'}`}>
                        {m.changeGrams === null ? 'Start' : `${m.changeGrams <= 0 ? '−' : '+'}${formatWeight(Math.abs(m.changeGrams), unit)}`}
                        {m.changePct !== null && <span className="block text-[11px]">{m.changePct > 0 ? '+' : ''}{m.changePct}%</span>}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">{m.savedVsLastCents === null ? '—' : money(m.savedVsLastCents)}</td>
                      <td className="py-2 text-right">
                        <button className="btn btn-text btn-sm !px-2" aria-label={`Edit ${monthLabel(m.month)}`} onClick={() => setWasteOpen(m)}>
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] text-ink-2 mt-3 mb-0">
              Saved = the color you didn’t throw away compared with the month before, times what you said an ounce costs that month. Months without a cost show no money.
            </p>
          </>
        )}
      </section>

      <PartnerSheet
        partner={editingPartner}
        onClose={() => setEditingPartner(null)}
        staffName={staffName}
        onSaved={(list, message) => {
          setPartners(list)
          setEditingPartner(null)
          toast(message)
        }}
      />
      <WasteSheet
        open={wasteOpen}
        unit={unit}
        lastCost={[...logs].sort((a, b) => b.month.localeCompare(a.month))[0]?.costCentsPerOz ?? 0}
        staffName={staffName}
        onClose={() => setWasteOpen(null)}
        onSaved={(list, message) => {
          setLogs(list)
          setWasteOpen(null)
          toast(message)
        }}
      />
    </>
  )
}

function PartnerSheet({
  partner,
  onClose,
  staffName,
  onSaved,
}: {
  partner: Partial<Partner> | null
  onClose: () => void
  staffName: string
  onSaved: (partners: Partner[], message: string) => void
}) {
  const toast = useToast()
  const [draft, setDraft] = useState<Partial<Partner>>({})
  const [busy, setBusy] = useState(false)
  useEffect(() => setDraft(partner ?? {}), [partner])

  async function save() {
    setBusy(true)
    const r = await savePartnerFn({
      data: {
        id: draft.id,
        name: draft.name ?? '',
        kind: (draft.kind ?? 'recycling') as PartnerKind,
        contact: draft.contact ?? '',
        website: draft.website ?? '',
        since: draft.since ?? '',
        notes: draft.notes ?? '',
        addedBy: staffName,
      },
    })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    onSaved(r.partners, draft.id ? 'Saved.' : `Added ${draft.name?.trim()}. Thank you for building a greener shop.`)
  }

  return (
    <Sheet open={partner !== null} onClose={onClose} title={draft.id ? 'Edit partner' : 'Add a partner'} subtitle="Who you work with to stay green.">
      <div className="grid gap-3">
        <Field label="Name">
          <input className="field-input" maxLength={80} value={draft.name ?? ''} placeholder="Green Circle Salons" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <div>
          <span className="block text-sm font-semibold mb-1.5">What they do with you</span>
          <div className="flex gap-2 flex-wrap">
            {PARTNER_KINDS.map((k) => (
              <button key={k.id} type="button" className="chip" aria-pressed={draft.kind === k.id} onClick={() => setDraft({ ...draft, kind: k.id })}>
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Contact (name, phone or email)">
          <input className="field-input" maxLength={120} value={draft.contact ?? ''} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} />
        </Field>
        <Field label="Website">
          <input className="field-input" maxLength={200} inputMode="url" value={draft.website ?? ''} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
        </Field>
        <Field label="Partners since">
          <input className="field-input" type="month" value={draft.since ?? ''} onChange={(e) => setDraft({ ...draft, since: e.target.value })} />
        </Field>
        <Field label="Notes (pickup days, what they take, member number…)">
          <textarea className="field-input min-h-[80px]" maxLength={400} value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </Field>
      </div>
      <SheetActions>
        {draft.id && (
          <button
            className="btn btn-text !text-bad"
            onClick={async () => {
              const r = await deletePartnerFn({ data: { id: draft.id! } })
              onSaved(r.partners, `Removed ${draft.name}.`)
            }}
          >
            <Trash2 size={15} /> Remove
          </button>
        )}
        <button className="btn btn-primary" disabled={busy || !(draft.name ?? '').trim()} onClick={() => void save()}>
          {draft.id ? 'Save' : 'Add partner'}
        </button>
      </SheetActions>
    </Sheet>
  )
}

function WasteSheet({
  open,
  unit,
  lastCost,
  staffName,
  onClose,
  onSaved,
}: {
  open: WasteLog | 'new' | null
  unit: WasteUnit
  lastCost: number
  staffName: string
  onClose: () => void
  onSaved: (logs: WasteLog[], message: string) => void
}) {
  const toast = useToast()
  const { symbol } = useMoney()
  const [month, setMonth] = useState(currentMonthKey())
  const [amount, setAmount] = useState('')
  const [entryUnit, setEntryUnit] = useState<WasteUnit>(unit)
  const [cost, setCost] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const editing = open && open !== 'new' ? open : null

  useEffect(() => {
    if (!open) return
    setEntryUnit(unit)
    if (editing) {
      setMonth(editing.month)
      setAmount(String(Number(fromGrams(editing.grams, unit).toFixed(2))))
      setCost(editing.costCentsPerOz ? centsToDollars(editing.costCentsPerOz) : '')
      setNote(editing.note)
    } else {
      setMonth(currentMonthKey())
      setAmount('')
      setCost(lastCost ? centsToDollars(lastCost) : '')
      setNote('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) return toast('Enter the weight as a number.')
    const costCents = cost.trim() ? Math.round(Number(cost) * 100) : 0
    if (!Number.isFinite(costCents) || costCents < 0) return toast('Enter the cost as a number, or leave it blank.')
    setBusy(true)
    const r = await saveWasteLogFn({ data: { month, grams: toGrams(value, entryUnit), costCentsPerOz: costCents, note, loggedBy: staffName } })
    setBusy(false)
    if (!r.ok) return toast(r.message)
    onSaved(r.logs, `${monthLabel(month)} saved. Every ounce you keep out of the bin counts.`)
  }

  return (
    <Sheet open={open !== null} onClose={onClose} title={editing ? `Edit ${monthLabel(editing.month)}` : 'Log a month of color waste'} subtitle="One weight per month. Logging a month again replaces it.">
      <div className="grid gap-3">
        <Field label="Month">
          <input className="field-input" type="month" value={month} max={currentMonthKey()} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <div>
          <span className="block text-sm font-semibold mb-1.5">Color waste weight</span>
          <div className="flex gap-2">
            <input className="field-input flex-1" inputMode="decimal" value={amount} placeholder="0.0" onChange={(e) => setAmount(e.target.value)} />
            <div className="flex bg-surface rounded-full p-0.5 self-center" role="group" aria-label="Unit">
              {WASTE_UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={entryUnit === u.id}
                  onClick={() => setEntryUnit(u.id)}
                  className={`px-2.5 py-1.5 rounded-full border-0 cursor-pointer text-[12px] font-semibold ${entryUnit === u.id ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-ink-2'}`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Field label={`What an ounce of mixed color costs you (${symbol}, optional)`}>
          <input className="field-input" inputMode="decimal" value={cost} placeholder="e.g. 1.25" onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <input className="field-input" maxLength={300} value={note} placeholder="Started weighing bowls before mixing" onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <SheetActions>
        {editing && (
          <button
            className="btn btn-text !text-bad"
            onClick={async () => {
              const r = await deleteWasteLogFn({ data: { id: editing.id } })
              onSaved(r.logs, `${monthLabel(editing.month)} removed.`)
            }}
          >
            <Trash2 size={15} /> Remove
          </button>
        )}
        <button className="btn btn-primary" disabled={busy || !amount.trim()} onClick={() => void save()}>
          Save
        </button>
      </SheetActions>
    </Sheet>
  )
}
