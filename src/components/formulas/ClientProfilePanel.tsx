import { useMemo, useState } from 'react'
import { AlertTriangle, Cake, Mail, MessageSquare, Pencil, Phone, Trash2, UserRoundPen } from 'lucide-react'
import { useMoney } from '@/components/business/BusinessContext'
import { useToast } from '@/components/ui/Toast'
import { toastUndo } from '@/components/ui/undo'
import { Field, Sheet, SheetActions } from '@/components/ui/Sheet'
import {
  birthdayLabel,
  clientSummary,
  daysToBirthday,
  dialable,
  emptyProfile,
  type ClientProfile,
  type ClientProfileInput,
} from '@/lib/client-profile'
import type { ClientFormula } from '@/lib/formulas'
import type { Product } from '@/components/inventory/types'
import { deleteClientFn, renameClientFn, saveClientProfile } from '@/server/client-profiles.functions'

export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const pretty = (ymd: string) => (ymd ? new Date(`${ymd}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '')
const every = (days: number) => (days % 7 === 0 && days >= 14 ? `${days / 7} weeks` : `${days} days`)

/**
 * The top of a client's page (Vagaro-style): care alerts, contact buttons, how often they come,
 * when they're due back, what they've bought, and their notes. Edit, rename / merge and delete
 * all come back with Undo.
 */
export function ClientProfilePanel({
  name,
  visits,
  profile,
  products,
  onChanged,
  onRenamed,
  onDeleted,
}: {
  name: string
  visits: ClientFormula[]
  profile: ClientProfile | null
  products: Product[]
  onChanged: () => void | Promise<void>
  onRenamed: (name: string) => void
  onDeleted: () => void
}) {
  const toast = useToast()
  const { money, short } = useMoney()
  const today = todayKey()
  const [editing, setEditing] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const prices = useMemo(() => new Map(products.map((p) => [p.id, p.retailPriceCents])), [products])
  const s = useMemo(() => clientSummary(visits, prices, today, profile?.rebookDays ?? 0), [visits, prices, today, profile?.rebookDays])
  const bday = profile ? daysToBirthday(profile.birthday, today) : null

  async function remove() {
    const r = await deleteClientFn({ data: { name } })
    onDeleted()
    toastUndo(toast, `Deleted ${name} and ${r.visits} visit${r.visits === 1 ? '' : 's'}`, r.undoId, onChanged)
  }

  return (
    <section className="mb-4">
      {profile?.sensitivities && (
        <p className="flex gap-2 items-start bg-bad-tint text-bad rounded-xl px-3.5 py-2.5 m-0 mb-3 text-sm font-semibold">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" /> {profile.sensitivities}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {profile?.phone && (
          <>
            <a className="btn btn-tonal btn-sm" href={`tel:${dialable(profile.phone)}`}>
              <Phone size={14} /> Call
            </a>
            <a className="btn btn-tonal btn-sm" href={`sms:${dialable(profile.phone)}`}>
              <MessageSquare size={14} /> Text
            </a>
          </>
        )}
        {profile?.email && (
          <a className="btn btn-tonal btn-sm" href={`mailto:${profile.email}`}>
            <Mail size={14} /> Email
          </a>
        )}
        <button type="button" className="btn btn-tonal btn-sm" onClick={() => setEditing(true)}>
          <Pencil size={14} /> {profile ? 'Edit profile' : 'Add phone, birthday, notes'}
        </button>
        <button type="button" className="btn btn-text btn-sm" onClick={() => setRenaming(true)}>
          <UserRoundPen size={14} /> Rename or merge
        </button>
      </div>

      <div className="grid grid-cols-2 min-[600px]:grid-cols-4 gap-2 mb-3">
        <Tile label="Visits" value={String(s.visits)} sub={s.firstVisit ? `since ${pretty(s.firstVisit)}` : ''} />
        <Tile label="Last visit" value={s.daysSinceLast === 0 ? 'Today' : `${s.daysSinceLast}d ago`} sub={pretty(s.lastVisit)} />
        <Tile
          label="Due back"
          value={s.dueOn ? pretty(s.dueOn).replace(/, \d{4}$/, '') : '—'}
          sub={
            s.dueOn
              ? `${s.overdue ? 'Overdue · ' : ''}every ${every(profile?.rebookDays || s.rhythmDays || 0)}`
              : 'after 2 visits'
          }
          warn={s.overdue}
        />
        <Tile label="Retail bought" value={short(s.retailCents)} sub={`${s.bought.reduce((n, b) => n + b.qty, 0)} items`} />
      </div>

      {(bday !== null && bday <= 30) || s.nextFollowUp ? (
        <p className="text-sm m-0 mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {bday !== null && bday <= 30 && (
            <span>
              <Cake size={14} className="inline -mt-0.5" /> Birthday {bday === 0 ? 'today!' : `in ${bday} day${bday === 1 ? '' : 's'}`} ({birthdayLabel(profile!.birthday)})
            </span>
          )}
          {s.nextFollowUp && <span>Follow-up {pretty(s.nextFollowUp)}</span>}
        </p>
      ) : null}

      {(profile?.preferences || profile?.notes || (profile?.birthday && (bday ?? 99) > 30)) && (
        <div className="bg-surface rounded-xl px-3.5 py-2.5 mb-3 text-sm grid gap-1">
          {profile?.preferences && (
            <p className="m-0">
              <b>Likes:</b> {profile.preferences}
            </p>
          )}
          {profile?.notes && <p className="m-0 whitespace-pre-wrap">{profile.notes}</p>}
          {profile?.birthday && (bday ?? 99) > 30 && <p className="m-0 text-ink-2">Birthday {birthdayLabel(profile.birthday)}</p>}
        </div>
      )}

      {s.bought.length > 0 && (
        <details className="mb-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Products they’ve bought ({s.bought.length}){s.recommendedNotBought > 0 ? ` · ${s.recommendedNotBought} recommended didn’t go home` : ''}
          </summary>
          <ul className="list-none m-0 mt-2 p-0 text-sm">
            {s.bought.map((b) => (
              <li key={`${b.productId}-${b.name}`} className="flex justify-between gap-2 py-1.5 border-b border-line last:border-b-0">
                <span className="min-w-0 truncate">
                  {b.name} <span className="text-ink-2">× {b.qty} · last {pretty(b.lastOn)}</span>
                </span>
                {b.cents > 0 && <span className="shrink-0">{money(b.cents)}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="text-right">
        {confirmDelete ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={remove}>
            <Trash2 size={14} /> Tap again to delete {name} and all {s.visits} visits
          </button>
        ) : (
          <button type="button" className="btn btn-text btn-sm !text-bad" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Delete client
          </button>
        )}
      </div>

      {editing && (
        <ProfileForm
          value={profile ? { ...profile } : emptyProfile(name)}
          suggestedEvery={s.rhythmDays}
          onClose={() => setEditing(false)}
          onSaved={(undoId) => {
            setEditing(false)
            onChanged()
            toastUndo(toast, `Saved ${name}’s profile`, undoId, onChanged)
          }}
        />
      )}
      {renaming && (
        <RenameSheet
          name={name}
          onClose={() => setRenaming(false)}
          onDone={(newName, undoId, merged) => {
            setRenaming(false)
            onRenamed(newName)
            toastUndo(toast, merged ? `Merged into ${newName}` : `Renamed to ${newName}`, undoId, async () => {
              await onChanged()
              onRenamed(name)
            })
          }}
        />
      )}
    </section>
  )
}

function Tile({ label, value, sub, warn = false }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${warn ? 'bg-warn-tint' : 'bg-surface'}`}>
      <span className="block text-[11px] uppercase tracking-wide text-ink-2 font-semibold">{label}</span>
      <b className="block text-[17px] leading-tight">{value}</b>
      {sub && <span className={`block text-[11px] ${warn ? 'text-warn font-semibold' : 'text-ink-2'}`}>{sub}</span>}
    </div>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ProfileForm({
  value,
  suggestedEvery,
  onClose,
  onSaved,
}: {
  value: ClientProfileInput
  suggestedEvery: number | null
  onClose: () => void
  onSaved: (undoId: number) => void
}) {
  const toast = useToast()
  const [f, setF] = useState(value)
  const [saving, setSaving] = useState(false)
  const [mm, dd] = f.birthday ? f.birthday.split('-') : ['', '']
  const set = (patch: Partial<ClientProfileInput>) => setF({ ...f, ...patch })
  const setBirthday = (m: string, d: string) => set({ birthday: m && d ? `${m}-${d.padStart(2, '0')}` : '' })

  async function save() {
    setSaving(true)
    try {
      const r = await saveClientProfile({ data: { ...f, name: value.name } })
      if (!r.ok) return toast(r.message)
      onSaved(r.undoId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={value.name} subtitle="Everything here is optional. Only your shop can see it.">
      <div className="grid gap-3">
        <div className="grid grid-cols-1 min-[500px]:grid-cols-2 gap-3">
          <Field label="Phone">
            <input className="field-input" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="field-input" type="email" inputMode="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
        </div>
        <Field label="Birthday (month and day)">
          <div className="flex gap-2">
            <select className="field-input" value={mm} onChange={(e) => setBirthday(e.target.value, dd || '01')} aria-label="Birthday month">
              <option value="">—</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')}>
                  {m}
                </option>
              ))}
            </select>
            <select className="field-input" value={dd} onChange={(e) => setBirthday(mm, e.target.value)} disabled={!mm} aria-label="Birthday day">
              <option value="">—</option>
              {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                <option key={d} value={d}>
                  {+d}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Allergies, sensitivities, patch test">
          <input className="field-input" value={f.sensitivities} placeholder="Sensitive scalp · patch tested 3/2026" onChange={(e) => set({ sensitivities: e.target.value })} />
        </Field>
        <Field label="What they like">
          <input className="field-input" value={f.preferences} placeholder="Quiet appointment, oat milk, no heat" onChange={(e) => set({ preferences: e.target.value })} />
        </Field>
        <Field label="Notes">
          <textarea className="field-input min-h-[80px]" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        <Field label="Rebook every">
          <div className="flex flex-wrap gap-1.5">
            {[0, 28, 42, 56, 84].map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={f.rebookDays === d} onClick={() => set({ rebookDays: d })}>
                {d === 0 ? (suggestedEvery ? `Their usual (${every(suggestedEvery)})` : 'From their visits') : every(d)}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          Save
        </button>
      </SheetActions>
    </Sheet>
  )
}

function RenameSheet({ name, onClose, onDone }: { name: string; onClose: () => void; onDone: (name: string, undoId: number, merged: boolean) => void }) {
  const toast = useToast()
  const [to, setTo] = useState(name)
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try {
      const r = await renameClientFn({ data: { from: name, to } })
      if (!r.ok) return toast(r.message)
      onDone(r.name, r.undoId, r.merged)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open onClose={onClose} title="Rename or merge" subtitle="Every visit moves to the new name. Type another client’s name to merge the two (same person typed two ways).">
      <Field label="New name">
        <input className="field-input" value={to} onChange={(e) => setTo(e.target.value)} autoFocus />
      </Field>
      <SheetActions>
        <button type="button" className="btn btn-text" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={busy || !to.trim() || to.trim() === name} onClick={go}>
          Save
        </button>
      </SheetActions>
    </Sheet>
  )
}
