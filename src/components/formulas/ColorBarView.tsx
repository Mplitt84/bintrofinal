import { useCallback, useEffect, useMemo, useState } from 'react'
import { Beaker, Minus, Plus, Trash2 } from 'lucide-react'
import { useMoney } from '@/components/business/BusinessContext'
import { useToast } from '@/components/ui/Toast'
import { toastUndo } from '@/components/ui/undo'
import { EmptyState, centsToDollars } from '@/components/ui/bits'
import { Field, Sheet, SheetActions } from '@/components/ui/Sheet'
import { todayKey } from '@/components/formulas/ClientProfilePanel'
import {
  bowlGrams,
  bowlReport,
  costPerGram,
  lineCost,
  serviceProfits,
  suggestedCharge,
  wasteCents,
  type Bowl,
  type Service,
} from '@/lib/color-bar'
import { addDays } from '@/lib/client-profile'
import type { FormulaKind } from '@/lib/formulas'
import type { Product } from '@/components/inventory/types'
import {
  deleteBowlFn,
  deleteServiceFn,
  getColorBar,
  saveBowlFn,
  saveColorBarSettingsFn,
  saveServiceFn,
} from '@/server/color-bar.functions'

type Data = Awaited<ReturnType<typeof getColorBar>>
const PERIODS = [
  { days: 7, label: 'Week' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const
const toCents = (s: string) => Math.max(0, Math.round((Number(s.replace(/[^\d.]/g, '')) || 0) * 100))

function useColorBar() {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<Data | null>(null)
  const load = useCallback(async () => {
    try {
      setData(await getColorBar({ data: { since: addDays(todayKey(), -days) } }))
    } catch {
      setData({ services: [], bowls: [], settings: { laborCentsPerHour: 0, productMarkupPct: 0 } })
    }
  }, [days])
  useEffect(() => {
    load()
  }, [load])
  return { days, setDays, data, load, setData }
}

/** Formulas tab → Color bar (SalonScale-style): weigh each bowl, see its cost, waste and the charge. */
export function ColorBarView({
  products,
  staffName,
  team,
  kind,
  clientNames,
  isOwner,
}: {
  products: Product[]
  staffName: string
  team: string[]
  kind: FormulaKind
  clientNames: string[]
  isOwner: boolean
}) {
  const toast = useToast()
  const { money, short } = useMoney()
  const { days, setDays, data, load, setData } = useColorBar()
  const [mixing, setMixing] = useState(false)
  const report = useMemo(() => bowlReport(data?.bowls ?? []), [data])

  async function saveMarkup(pct: number) {
    try {
      const settings = await saveColorBarSettingsFn({ data: { productMarkupPct: pct } })
      setData((d) => (d ? { ...d, settings } : d))
    } catch {
      toast('Only the owner can change the markup.')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button type="button" className="btn btn-primary" onClick={() => setMixing(true)}>
          <Beaker size={16} /> Mix a bowl
        </button>
        <div className="flex gap-1.5 ml-auto" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.days} type="button" className="chip" aria-pressed={days === p.days} onClick={() => setDays(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="skel h-32 rounded-2xl" />
      ) : data.bowls.length === 0 ? (
        <EmptyState title="No bowls weighed yet">
          Put the bowl on your scale, tap “Mix a bowl”, and type the grams of each tube and developer. Bintro works out what the bowl cost, what went in the bin, and what to
          charge. It never changes your stock counts — keep scanning tubes out as you open them.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 min-[700px]:grid-cols-4 gap-2 mb-4">
            <Stat label="Bowls" value={String(report.total.bowls)} sub={`${Math.round(report.total.grams)} g mixed`} />
            <Stat label="Product cost" value={short(report.total.costCents)} sub={`${money(report.total.avgCostCents)} a bowl`} />
            <Stat
              label="Wasted"
              value={`${report.total.wastePct}%`}
              sub={`${Math.round(report.total.wasteGrams)} g · ${money(report.total.wasteCents)}`}
              warn={report.total.wastePct >= 15}
            />
            <Stat label="Charged" value={short(report.total.chargedCents)} sub={report.total.chargedCents >= report.total.costCents ? 'covers the cost' : 'less than it cost'} warn={report.total.chargedCents < report.total.costCents} />
          </div>

          <Breakdown title="By team member" rows={report.byStaff} money={money} />
          <Breakdown title="By service" rows={report.byService} money={money} />

          <h3 className="text-sm font-bold mt-5 mb-2">Bowls</h3>
          <ul className="list-none m-0 p-0 grid gap-2">
            {data.bowls.slice(0, 60).map((b) => (
              <BowlRow
                key={b.id}
                bowl={b}
                money={money}
                onDelete={async () => {
                  const r = await deleteBowlFn({ data: { id: b.id } })
                  await load()
                  toastUndo(toast, 'Bowl deleted', r.undoId, load)
                }}
              />
            ))}
          </ul>
        </>
      )}

      {data && (
        <p className="text-[12px] text-ink-2 mt-4">
          Costs use each product’s cost ÷ its size (oz and ml are read as about 1 g per ml, close for color and developer). Products with no cost or size count as $0 — fix
          them in Products → Missing costs.{' '}
          {isOwner && (
            <>
              Product charge markup:{' '}
              <select className="field-input !w-auto !py-1 !inline-block" value={data.settings.productMarkupPct} onChange={(e) => saveMarkup(Number(e.target.value))} aria-label="Product charge markup">
                {[0, 10, 20, 25, 30, 40, 50, 75, 100].map((p) => (
                  <option key={p} value={p}>
                    {p === 0 ? 'at cost' : `+${p}%`}
                  </option>
                ))}
              </select>
            </>
          )}
        </p>
      )}

      {mixing && data && (
        <MixBowlSheet
          products={products}
          services={data.services.filter((s) => s.active)}
          staffName={staffName}
          team={team}
          kind={kind}
          clientNames={clientNames}
          markupPct={data.settings.productMarkupPct}
          onClose={() => setMixing(false)}
          onSaved={(undoId) => {
            setMixing(false)
            load()
            toastUndo(toast, 'Bowl saved', undoId, load)
          }}
        />
      )}
    </>
  )
}

function Stat({ label, value, sub, warn = false }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl px-3.5 py-3 ${warn ? 'bg-warn-tint' : 'bg-surface'}`}>
      <span className="block text-[11px] uppercase tracking-wide font-semibold text-ink-2">{label}</span>
      <b className="block text-xl leading-tight">{value}</b>
      {sub && <span className={`block text-[12px] ${warn ? 'text-warn font-semibold' : 'text-ink-2'}`}>{sub}</span>}
    </div>
  )
}

function Breakdown({ title, rows, money }: { title: string; rows: ReturnType<typeof bowlReport>['byStaff']; money: (c: number) => string }) {
  if (rows.length < 2 && rows[0]?.key === 'Not recorded') return null
  return (
    <section className="mb-4">
      <h3 className="text-sm font-bold mb-1.5">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[460px]">
          <thead>
            <tr className="text-left text-[11px] uppercase text-ink-2">
              <th className="py-1.5 pr-2 font-semibold">Name</th>
              <th className="py-1.5 pr-2 font-semibold text-right">Bowls</th>
              <th className="py-1.5 pr-2 font-semibold text-right">Avg bowl</th>
              <th className="py-1.5 pr-2 font-semibold text-right">Wasted</th>
              <th className="py-1.5 font-semibold text-right">Charged</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="py-1.5 pr-2">{r.key}</td>
                <td className="py-1.5 pr-2 text-right">{r.bowls}</td>
                <td className="py-1.5 pr-2 text-right">{money(r.avgCostCents)}</td>
                <td className={`py-1.5 pr-2 text-right ${r.wastePct >= 15 ? 'text-warn font-semibold' : ''}`}>
                  {r.wastePct}% · {money(r.wasteCents)}
                </td>
                <td className="py-1.5 text-right">{money(r.chargedCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function BowlRow({ bowl, money, onDelete }: { bowl: Bowl; money: (c: number) => string; onDelete: () => void }) {
  const [sure, setSure] = useState(false)
  return (
    <li className="bg-white border border-line rounded-2xl p-3 flex gap-3 items-start">
      <span className="flex-1 min-w-0">
        <b className="block text-[15px] truncate">
          {bowl.clientName || 'No client'} {bowl.serviceName && <span className="font-normal text-ink-2">· {bowl.serviceName}</span>}
        </b>
        <span className="block text-[12px] text-ink-2">
          {new Date(`${bowl.dayKey}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          {bowl.staffName && ` · ${bowl.staffName}`} · {Math.round(bowlGrams(bowl.lines))} g
          {bowl.leftoverGrams > 0 && ` · ${bowl.leftoverGrams} g left (${money(wasteCents(bowl))})`}
        </span>
        <span className="block text-[12px] truncate">{bowl.lines.map((l) => `${l.name} ${l.grams} g`).join(' · ')}</span>
      </span>
      <span className="text-right shrink-0">
        <b className="block">{money(bowl.costCents)}</b>
        {bowl.chargedCents > 0 && <span className="block text-[12px] text-ink-2">charged {money(bowl.chargedCents)}</span>}
        <button
          type="button"
          className={`btn btn-sm ${sure ? 'btn-danger' : 'btn-text !text-bad'} mt-1`}
          onClick={() => (sure ? onDelete() : setSure(true))}
          aria-label="Delete bowl"
        >
          <Trash2 size={14} /> {sure ? 'Delete' : ''}
        </button>
      </span>
    </li>
  )
}

type Line = { productId: number | null; name: string; grams: string }

function MixBowlSheet({
  products,
  services,
  staffName,
  team,
  kind,
  clientNames,
  markupPct,
  onClose,
  onSaved,
}: {
  products: Product[]
  services: Service[]
  staffName: string
  team: string[]
  kind: FormulaKind
  clientNames: string[]
  markupPct: number
  onClose: () => void
  onSaved: (undoId: number) => void
}) {
  const toast = useToast()
  const { money } = useMoney()
  const [client, setClient] = useState('')
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [who, setWho] = useState(staffName)
  const [lines, setLines] = useState<Line[]>([{ productId: null, name: '', grams: '' }])
  const [leftover, setLeftover] = useState('')
  const [charge, setCharge] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [toRecord, setToRecord] = useState(true)
  const [saving, setSaving] = useState(false)

  // Color first: anything that reads as grams and looks like color or developer.
  const pickable = useMemo(() => {
    const colorish = /colou?r|dev|toner|gloss|lighten|bleach|dye|oxid|tint|ink|pigment/i
    return [...products]
      .filter((p) => costPerGram(p) != null || colorish.test(`${p.category} ${p.name}`))
      .sort((a, b) => Number(colorish.test(`${b.category} ${b.name}`)) - Number(colorish.test(`${a.category} ${a.name}`)) || a.name.localeCompare(b.name))
  }, [products])
  const byName = useMemo(() => new Map(pickable.map((p) => [`${p.brand ? `${p.brand} ` : ''}${p.name}${p.size ? ` · ${p.size}` : ''}`.toLowerCase(), p])), [pickable])
  const label = (p: Product) => `${p.brand ? `${p.brand} ` : ''}${p.name}${p.size ? ` · ${p.size}` : ''}`

  const costed = lines.map((l) => {
    const p = l.productId != null ? products.find((x) => x.id === l.productId) ?? null : null
    const g = Number(l.grams) || 0
    return { ...l, product: p, g, cost: lineCost(p, g), noCost: Boolean(p && costPerGram(p) == null) }
  })
  const total = costed.reduce((s, l) => s + l.cost, 0)
  const grams = costed.reduce((s, l) => s + l.g, 0)
  const suggested = suggestedCharge(total, markupPct)
  const chargeCents = charge == null ? suggested : toCents(charge)

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }
  function pick(i: number, text: string) {
    const p = byName.get(text.toLowerCase())
    setLine(i, { name: p ? label(p) : text, productId: p?.id ?? null })
  }
  function step(i: number, by: number) {
    setLine(i, { grams: String(Math.max(0, (Number(lines[i].grams) || 0) + by)) })
  }

  async function save() {
    setSaving(true)
    try {
      const r = await saveBowlFn({
        data: {
          dayKey: todayKey(),
          clientName: client,
          serviceId,
          staffName: who,
          lines: costed.filter((l) => l.name.trim() && l.g > 0).map((l) => ({ productId: l.productId, name: l.product ? l.product.name : l.name, grams: l.g })),
          leftoverGrams: Number(leftover) || 0,
          chargedCents: chargeCents,
          note,
          addToRecord: toRecord && client.trim() ? { kind } : null,
        },
      })
      if (!r.ok) return toast(r.message)
      onSaved(r.undoId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Mix a bowl" subtitle="Weigh as you go. Bintro prices the bowl from your product costs." wide>
      <div className="grid gap-3">
        <div className="grid grid-cols-1 min-[600px]:grid-cols-3 gap-3">
          <Field label="Client">
            <input className="field-input" list="cb-clients" value={client} onChange={(e) => setClient(e.target.value)} placeholder="First name, last initial" />
            <datalist id="cb-clients">
              {clientNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="Service">
            <select className="field-input" value={serviceId ?? ''} onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">{services.length ? 'Pick a service' : 'Add services in Services'}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mixed by">
            <select className="field-input" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">—</option>
              {[...new Set([staffName, ...team].filter(Boolean))].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <datalist id="cb-products">
          {pickable.map((p) => (
            <option key={p.id} value={label(p)} />
          ))}
        </datalist>
        <div className="grid gap-2">
          {costed.map((l, i) => (
            <div key={i} className="bg-surface rounded-xl p-2.5 grid gap-2 min-[600px]:grid-cols-[1fr_auto_auto] items-center">
              <input
                className="field-input"
                list="cb-products"
                value={l.name}
                placeholder="Tube, developer, lightener…"
                onChange={(e) => pick(i, e.target.value)}
                aria-label={`Product ${i + 1}`}
              />
              <div className="flex items-center gap-1">
                <button type="button" className="btn btn-tonal btn-sm !px-2" onClick={() => step(i, -5)} aria-label="5 grams less">
                  <Minus size={14} />
                </button>
                <input
                  className="field-input !w-20 text-center"
                  inputMode="decimal"
                  value={l.grams}
                  placeholder="g"
                  onChange={(e) => setLine(i, { grams: e.target.value.replace(/[^\d.]/g, '') })}
                  aria-label={`Grams of product ${i + 1}`}
                />
                <button type="button" className="btn btn-tonal btn-sm !px-2" onClick={() => step(i, 5)} aria-label="5 grams more">
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-sm text-right min-w-[90px]">
                {l.product ? (l.noCost ? <span className="text-warn text-[12px]">no cost or size</span> : money(l.cost)) : l.name ? <span className="text-ink-2 text-[12px]">not in Products</span> : ''}
                {lines.length > 1 && (
                  <button type="button" className="btn btn-text btn-sm !px-1 ml-1" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove line">
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
            </div>
          ))}
          <button type="button" className="btn btn-text btn-sm justify-self-start" onClick={() => setLines((ls) => [...ls, { productId: null, name: '', grams: '' }])}>
            <Plus size={14} /> Add a product
          </button>
        </div>

        <div className="grid grid-cols-2 min-[600px]:grid-cols-4 gap-2">
          <Stat label="Mixed" value={`${Math.round(grams)} g`} />
          <Stat label="Bowl cost" value={money(total)} />
          <Field label="Left in the bowl (g)">
            <input className="field-input" inputMode="decimal" value={leftover} onChange={(e) => setLeftover(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" />
          </Field>
          <Field label={`Product charge${markupPct ? ` (+${markupPct}%)` : ''}`}>
            <input className="field-input" inputMode="decimal" value={charge ?? centsToDollars(suggested)} onChange={(e) => setCharge(e.target.value)} />
          </Field>
        </div>
        <Field label="Note">
          <input className="field-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Processing, placement, what to change next time" />
        </Field>
        {client.trim() && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={toRecord} onChange={(e) => setToRecord(e.target.checked)} /> Also save it on {client.trim()}’s record as today’s formula
          </label>
        )}
      </div>
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={saving || grams <= 0} onClick={save}>
          Save bowl
        </button>
      </SheetActions>
    </Sheet>
  )
}

/** Formulas tab → Services: the menu, and what each service really keeps after product and team time. */
export function ServicesView({ isOwner }: { isOwner: boolean }) {
  const toast = useToast()
  const { money } = useMoney()
  const { data, load, setData } = useColorBar()
  const [editing, setEditing] = useState<(Omit<Service, 'id'> & { id?: number }) | null>(null)
  const [labor, setLabor] = useState<string | null>(null)
  const rows = useMemo(() => (data ? serviceProfits(data.services, data.bowls, data.settings.laborCentsPerHour) : []), [data])
  const off = data?.services.filter((s) => !s.active) ?? []

  async function saveLabor() {
    if (labor == null) return
    try {
      const settings = await saveColorBarSettingsFn({ data: { laborCentsPerHour: toCents(labor) } })
      setData((d) => (d ? { ...d, settings } : d))
      setLabor(null)
      toast('Saved')
    } catch {
      toast('Only the owner can set team cost.')
    }
  }

  async function remove(s: Service) {
    const r = await deleteServiceFn({ data: { id: s.id } })
    setData((d) => (d ? { ...d, services: r.services } : d))
    toastUndo(toast, `Removed ${s.name}`, r.undoId, load)
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ name: '', priceCents: 0, minutes: 60, productCents: 0, active: true })}>
          <Plus size={16} /> Add a service
        </button>
        {isOwner && data && (
          <label className="text-sm ml-auto">
            <span className="block font-semibold mb-1">Team cost per hour (pay + taxes)</span>
            <span className="flex gap-2">
              <input
                className="field-input !w-28"
                inputMode="decimal"
                value={labor ?? centsToDollars(data.settings.laborCentsPerHour)}
                onChange={(e) => setLabor(e.target.value)}
              />
              {labor != null && (
                <button type="button" className="btn btn-tonal btn-sm" onClick={saveLabor}>
                  Save
                </button>
              )}
            </span>
          </label>
        )}
      </div>

      {!data ? (
        <div className="skel h-32 rounded-2xl" />
      ) : data.services.length === 0 ? (
        <EmptyState title="No services yet">
          Add what you offer with its price and how long it takes. Product cost comes from bowls weighed in Color bar (last 30 days), or your own estimate until then.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] uppercase text-ink-2">
                <th className="py-2 pr-2 font-semibold">Service</th>
                <th className="py-2 pr-2 font-semibold text-right">Price</th>
                <th className="py-2 pr-2 font-semibold text-right">Product</th>
                <th className="py-2 pr-2 font-semibold text-right">Team time</th>
                <th className="py-2 pr-2 font-semibold text-right">Keeps</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.service.id} className="border-t border-line">
                  <td className="py-2 pr-2">
                    <b>{r.service.name}</b>
                    <span className="block text-[12px] text-ink-2">{r.service.minutes} min</span>
                  </td>
                  <td className="py-2 pr-2 text-right">{money(r.service.priceCents)}</td>
                  <td className="py-2 pr-2 text-right">
                    {r.productFrom === 'none' ? '—' : money(r.productCents)}
                    <span className="block text-[11px] text-ink-2">
                      {r.productFrom === 'bowls' ? `avg of ${r.bowls} bowl${r.bowls === 1 ? '' : 's'}` : r.productFrom === 'estimate' ? 'your estimate' : 'not known'}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-right">{data.settings.laborCentsPerHour ? money(r.laborCents) : '—'}</td>
                  <td className={`py-2 pr-2 text-right font-semibold ${r.profitCents < 0 ? 'text-bad' : (r.marginPct ?? 100) < 30 ? 'text-warn' : 'text-good'}`}>
                    {money(r.profitCents)}
                    {r.marginPct != null && <span className="block text-[11px] font-normal">{r.marginPct}%</span>}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button type="button" className="btn btn-text btn-sm" onClick={() => setEditing({ ...r.service })}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-text btn-sm !text-bad" onClick={() => remove(r.service)} aria-label={`Remove ${r.service.name}`}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {off.length > 0 && (
            <p className="text-[12px] text-ink-2 mt-2">
              Turned off:{' '}
              {off.map((s) => (
                <button key={s.id} type="button" className="btn btn-text btn-sm !px-1" onClick={() => setEditing({ ...s })}>
                  {s.name}
                </button>
              ))}
            </p>
          )}
          <p className="text-[12px] text-ink-2 mt-3">
            Keeps = price − product − team time ({data.settings.laborCentsPerHour ? `${money(data.settings.laborCentsPerHour)} an hour` : 'set team cost per hour to include it'}). Thinnest first. Card fees, rent and
            supplies you don’t weigh aren’t in it.
          </p>
        </div>
      )}

      {editing && (
        <ServiceSheet
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={(services, undoId) => {
            setEditing(null)
            setData((d) => (d ? { ...d, services } : d))
            toastUndo(toast, 'Saved', undoId, load)
          }}
        />
      )}
    </>
  )
}

function ServiceSheet({
  value,
  onClose,
  onSaved,
}: {
  value: Omit<Service, 'id'> & { id?: number }
  onClose: () => void
  onSaved: (services: Service[], undoId: number) => void
}) {
  const toast = useToast()
  const [name, setName] = useState(value.name)
  const [price, setPrice] = useState(value.priceCents ? centsToDollars(value.priceCents) : '')
  const [minutes, setMinutes] = useState(String(value.minutes))
  const [product, setProduct] = useState(value.productCents ? centsToDollars(value.productCents) : '')
  const [active, setActive] = useState(value.active)
  const [saving, setSaving] = useState(false)
  async function save() {
    setSaving(true)
    try {
      const r = await saveServiceFn({
        data: { id: value.id, name, priceCents: toCents(price), minutes: Math.round(Number(minutes) || 0), productCents: toCents(product), active },
      })
      if (!r.ok) return toast(r.message)
      onSaved(r.services, r.undoId)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Sheet open onClose={onClose} title={value.id ? 'Edit service' : 'Add a service'}>
      <div className="grid gap-3">
        <Field label="Name">
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Root touch-up" autoFocus />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Price">
            <input className="field-input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Minutes">
            <input className="field-input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="Product (estimate)">
            <input className="field-input" inputMode="decimal" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="until bowls" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> On the menu
        </label>
      </div>
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={saving || !name.trim()} onClick={save}>
          Save
        </button>
      </SheetActions>
    </Sheet>
  )
}
