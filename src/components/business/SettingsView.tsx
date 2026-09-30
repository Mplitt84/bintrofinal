import { useEffect, useState } from 'react'
import { Check, ExternalLink, Mail, Plug, RefreshCw, Trash2, UserPlus, X } from 'lucide-react'
import type { IntegrationStatus, Product, TeamMember } from '@/components/inventory/types'
import { ImportView } from '@/components/business/ImportView'
import { AccountView, type AccountPanel } from '@/components/business/AccountView'
import { PlanGate, UpgradeCard } from '@/components/business/PlanGate'
import { businessTypeById, selectableBusinessTypes, type BusinessProfile } from '@/lib/business-types'
import { CategoryManager, CategorySetupSheet } from '@/components/business/CategorySetupSheet'
import { useBusiness } from '@/components/business/BusinessContext'
import { deriveInitials } from '@/lib/inventory-defaults'
import { Field } from '@/components/ui/Sheet'
import { PageHead, centsToDollars, timeAgo } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import {
  addTeamMember,
  disconnect,
  getIntegrations,
  removeTeamMember,
  squareImportCatalog,
  squareSyncSales,
  updateBusinessProfile,
} from '@/server/business.functions'
import { sendInsightReportNow } from '@/server/insights.functions'

export type SettingsSection = 'profile' | 'account' | 'categories' | 'team' | 'import' | 'integrations'

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'profile', label: 'Business profile' },
  { id: 'account', label: 'Account & billing' },
  { id: 'categories', label: 'Categories' },
  { id: 'team', label: 'Team' },
  { id: 'import', label: 'Import inventory' },
  { id: 'integrations', label: 'Connections' },
]

/** Settings tab: who the business is, who works there, and which outside systems are connected. */
export function SettingsView({
  section,
  onSection,
  accountPanel,
  onAccountPanel,
  profile,
  onProfile,
  team,
  onTeam,
  products,
  staffName,
  onStaffName,
  notice,
  onDismissNotice,
  onChanged,
}: {
  section: SettingsSection
  onSection: (s: SettingsSection) => void
  accountPanel: AccountPanel
  onAccountPanel: (p: AccountPanel) => void
  profile: BusinessProfile
  onProfile: (p: BusinessProfile) => void
  team: TeamMember[]
  onTeam: (t: TeamMember[]) => void
  products: Product[]
  staffName: string
  onStaffName: (name: string) => void
  notice: { tone: 'good' | 'bad'; text: string } | null
  onDismissNotice: () => void
  onChanged: () => void | Promise<void>
}) {
  return (
    <div className="max-w-[680px]">
      <PageHead title="Settings" lead="Make Bintro fit your business. Changes are shared with every device." />

      {notice && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-2xl px-4 py-3 mb-4 text-sm ${
            notice.tone === 'good' ? 'bg-good-tint text-good' : 'bg-bad-tint text-bad'
          }`}
        >
          {notice.tone === 'good' ? <Check size={18} className="shrink-0 mt-0.5" /> : <X size={18} className="shrink-0 mt-0.5" />}
          <span className="flex-1 font-semibold">{notice.text}</span>
          <button className="btn btn-text btn-sm !p-0" onClick={onDismissNotice} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5" role="group" aria-label="Settings section">
        {SECTIONS.map((s) => (
          <button key={s.id} className="chip" aria-pressed={section === s.id} onClick={() => onSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'profile' && (
        <>
          <ProfileForm profile={profile} onProfile={onProfile} productCategories={products.map((p) => p.category)} />
          <ReportSettings profile={profile} onProfile={onProfile} />
        </>
      )}
      {section === 'account' && <AccountView panel={accountPanel} onPanel={onAccountPanel} />}
      {section === 'categories' && <CategoryManager productCategories={products.map((p) => p.category)} />}
      {section === 'team' && (
        <TeamManager team={team} onTeam={onTeam} staffName={staffName} onStaffName={onStaffName} />
      )}
      {section === 'import' && (
        <PlanGate feature="import">
          <ImportView products={products} staffName={staffName} onChanged={onChanged} />
        </PlanGate>
      )}
      {section === 'integrations' && <Integrations onChanged={onChanged} />}
    </div>
  )
}

type ReportPref = 'weeklyReportEmail' | 'monthlyReportEmail' | 'fastMoverAlertEmail'

const REPORTS: { key: ReportPref; kind: 'weekly' | 'monthly' | 'fast'; title: string; body: string }[] = [
  {
    key: 'weeklyReportEmail',
    kind: 'weekly',
    title: 'Weekly best sellers',
    body: 'Mondays: what sold very well last week, with trends and anything to stock deeper on.',
  },
  {
    key: 'monthlyReportEmail',
    kind: 'monthly',
    title: 'Monthly slow movers & prices',
    body: 'On the 1st: color, retail and other stock that barely moved, the cash tied up, and prices due for an update.',
  },
  {
    key: 'fastMoverAlertEmail',
    kind: 'fast',
    title: 'Fast-mover alerts',
    body: 'Within a few hours of an item selling out fast: how much to buy in bulk and the predicted cost at your latest prices.',
  },
]

/** Settings → Business profile → Reports & alerts: AI insight emails (pop-ups always show in the app). */
function ReportSettings({ profile, onProfile }: { profile: BusinessProfile; onProfile: (p: BusinessProfile) => void }) {
  const toast = useToast()
  const { can } = useBusiness()
  const [sending, setSending] = useState<string | null>(null)
  const recipient = profile.email || profile.orderEmail

  async function toggle(key: ReportPref, value: boolean) {
    onProfile({ ...profile, [key]: value })
    try {
      onProfile((await updateBusinessProfile({ data: { [key]: value } })) as BusinessProfile)
    } catch {
      onProfile({ ...profile, [key]: !value })
      toast("Couldn't save that setting")
    }
  }

  async function sendNow(kind: 'weekly' | 'monthly' | 'fast') {
    setSending(kind)
    try {
      const r = await sendInsightReportNow({ data: { kind } })
      toast(r.message)
    } catch {
      toast("Couldn't send the report. Try again.")
    } finally {
      setSending(null)
    }
  }

  return (
    <section className="mt-8 pt-6 border-t border-line" aria-labelledby="reports-title">
      <h2 id="reports-title" className="text-[18px] font-bold text-royal m-0 mb-1 flex items-center gap-2">
        <Mail size={18} className="text-gold-ink" /> Reports & alerts
      </h2>
      <p className="text-ink-2 text-[13px] mt-0 mb-3">
        AI-written summaries of your sales, emailed to {recipient ? <b className="text-ink">{recipient}</b> : 'the email above'}. The same
        insights pop up in the app.
      </p>
      {!can('insights') ? (
        <UpgradeCard feature="insights" compact />
      ) : (
      <ul className="list-none m-0 p-0 border border-line rounded-2xl divide-y divide-line">
        {REPORTS.map((r) => (
          <li key={r.key} className="p-3.5">
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <span className="text-sm">
                <b className="block">{r.title}</b>
                <span className="text-ink-2 text-[13px]">{r.body}</span>
              </span>
              <input
                type="checkbox"
                checked={profile[r.key]}
                onChange={(e) => toggle(r.key, e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-[var(--color-action)] shrink-0"
              />
            </label>
            <button
              type="button"
              className="btn btn-text btn-sm !px-0 mt-1"
              disabled={sending !== null}
              onClick={() => sendNow(r.kind)}
            >
              {sending === r.kind ? 'Sending…' : 'Send one now'}
            </button>
          </li>
        ))}
      </ul>
      )}
    </section>
  )
}

function ProfileForm({
  profile,
  onProfile,
  productCategories,
}: {
  profile: BusinessProfile
  onProfile: (p: BusinessProfile) => void
  productCategories: string[]
}) {
  const toast = useToast()
  const { categories } = useBusiness()
  const [setupOpen, setSetupOpen] = useState(false)
  const [draft, setDraft] = useState(profile)
  const [budget, setBudget] = useState(profile.monthlyBudgetCents ? centsToDollars(profile.monthlyBudgetCents) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof BusinessProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) {
      setError('Add your business name.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await updateBusinessProfile({
        data: {
          name: draft.name,
          businessType: draft.businessType,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          website: draft.website,
          orderEmail: draft.orderEmail,
          monthlyBudgetCents: Math.max(0, Math.round((Number(budget) || 0) * 100)),
        },
      })
      const typeChanged = (saved as BusinessProfile).businessType !== profile.businessType
      onProfile(saved as BusinessProfile)
      setDraft(saved as BusinessProfile)
      toast('Business profile saved')
      // A new business type is the moment to pick categories that fit it.
      if (typeChanged || categories.length === 0) setTimeout(() => setSetupOpen(true), 300)
    } catch {
      setError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <Field label="Business name" htmlFor="bp-name">
        <input
          id="bp-name"
          className="field-input"
          value={draft.name}
          onChange={set('name')}
          placeholder="e.g. Shag Noir Salon"
          autoComplete="organization"
        />
      </Field>

      <Field label="What kind of business?">
        <div className="grid grid-cols-2 min-[560px]:grid-cols-3 gap-2" role="radiogroup" aria-label="Business type">
          {selectableBusinessTypes(profile.businessType).map((t) => {
            const on = draft.businessType === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                className="chip !rounded-xl !py-2.5 text-left !whitespace-normal"
                aria-pressed={on}
                onClick={() => setDraft((d) => ({ ...d, businessType: t.id }))}
              >
                <span className="block">{t.label}</span>
                <span className={`block text-[12px] font-normal ${on ? 'text-white/75' : 'text-ink-2'}`}>
                  {t.legacy ? 'No longer offered' : t.blurb}
                </span>
              </button>
            )
          })}
        </div>
      </Field>
      <p className="text-ink-2 text-[13px] -mt-1 mb-4">
        Tunes AI label reading, price estimates, sizes and the{' '}
        <button type="button" className="border-0 bg-transparent p-0 text-action font-semibold cursor-pointer" onClick={() => setSetupOpen(true)}>
          category suggestions for a {businessTypeById(profile.businessType).label.toLowerCase()}
        </button>
        .
      </p>

      <div className="grid min-[560px]:grid-cols-2 gap-x-2.5">
        <Field label="Email" htmlFor="bp-email">
          <input id="bp-email" type="email" className="field-input" value={draft.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Phone" htmlFor="bp-phone">
          <input id="bp-phone" type="tel" className="field-input" value={draft.phone} onChange={set('phone')} autoComplete="tel" />
        </Field>
      </div>
      <Field label="Address" htmlFor="bp-address">
        <textarea
          id="bp-address"
          rows={2}
          className="field-input resize-none"
          value={draft.address}
          onChange={set('address')}
          autoComplete="street-address"
        />
      </Field>
      <Field label="Website" htmlFor="bp-website">
        <input
          id="bp-website"
          type="url"
          inputMode="url"
          className="field-input"
          value={draft.website}
          onChange={set('website')}
          placeholder="https://"
          autoComplete="url"
        />
      </Field>
      <Field label="Send restock lists and orders to" htmlFor="bp-order-email">
        <input
          id="bp-order-email"
          type="email"
          className="field-input"
          value={draft.orderEmail}
          onChange={set('orderEmail')}
          placeholder={draft.email || 'Same as the email above'}
        />
      </Field>
      <Field label="Monthly budget for stock and supplies" htmlFor="bp-budget">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2">$</span>
          <input
            id="bp-budget"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            className="field-input num !pl-7"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="0"
          />
        </div>
      </Field>
      <p className="text-ink-2 text-[13px] -mt-1 mb-0">Used every month unless you set a different amount on the Budget tab.</p>

      {error && <p className="text-bad text-sm mt-3 mb-0">{error}</p>}
      <button type="submit" className="btn btn-primary w-full mt-5" disabled={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
      <CategorySetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} productCategories={productCategories} />
    </form>
  )
}

function TeamManager({
  team,
  onTeam,
  staffName,
  onStaffName,
}: {
  team: TeamMember[]
  onTeam: (t: TeamMember[]) => void
  staffName: string
  onStaffName: (name: string) => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const next = name.trim()
    if (!next) return
    setBusy(true)
    try {
      onTeam((await addTeamMember({ data: { name: next } })) as TeamMember[])
      setName('')
      toast(`${next} added to the team`)
    } catch (err) {
      toast(err instanceof Error && err.message.includes('plan') ? err.message : 'Could not add. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(member: TeamMember) {
    try {
      onTeam((await removeTeamMember({ data: { id: member.id } })) as TeamMember[])
      if (member.name === staffName) onStaffName('')
      toast(`${member.name} removed`, async () => {
        onTeam((await addTeamMember({ data: { name: member.name } })) as TeamMember[])
      })
    } catch {
      toast('Could not remove. Try again.')
    }
  }

  return (
    <div>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <label htmlFor="team-name" className="sr-only">
          Team member name
        </label>
        <input
          id="team-name"
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder="Add a team member"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={busy || !name.trim()}>
          <UserPlus size={18} />
          Add
        </button>
      </form>

      {team.length === 0 ? (
        <p className="text-ink-2 bg-surface rounded-2xl px-4 py-5 text-center m-0">
          No one saved yet. Add your team so everyone can pick their name with one tap.
        </p>
      ) : (
        <ul className="list-none m-0 p-0 bg-surface rounded-2xl px-4">
          {team.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0">
              <span className="w-9 h-9 rounded-full bg-action text-white text-[13px] font-bold grid place-items-center shrink-0">
                {deriveInitials(m.name)}
              </span>
              <span className="flex-1 min-w-0 font-semibold truncate">
                {m.name}
                {m.name === staffName && <span className="ml-2 text-[12px] font-semibold text-good">Working now</span>}
              </span>
              <button
                className="btn btn-text btn-sm !text-bad"
                onClick={() => remove(m)}
                aria-label={`Remove ${m.name}`}
              >
                <Trash2 size={16} />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-ink-2 text-[13px] mt-3 mb-0">
        Removing someone keeps their past scans and expenses in the history.
      </p>
    </div>
  )
}

const PROVIDER_INFO = {
  square: {
    name: 'Square POS',
    blurb: 'Import your Square item library with prices and barcodes, and count Square sales out of stock automatically every 15 minutes.',
    envVars: ['SQUARE_APPLICATION_ID', 'SQUARE_APPLICATION_SECRET'],
    envName: 'SQUARE_ENVIRONMENT',
    dashboard: 'https://developer.squareup.com/apps',
    dashboardLabel: 'Square Developer dashboard',
  },
  quickbooks: {
    name: 'QuickBooks Online',
    blurb: 'Send expenses and each month’s stock purchases to QuickBooks so your books match the Budget tab.',
    envVars: ['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET'],
    envName: 'QUICKBOOKS_ENVIRONMENT',
    dashboard: 'https://developer.intuit.com/app/developer/dashboard',
    dashboardLabel: 'Intuit Developer dashboard',
  },
} as const

function Integrations({ onChanged }: { onChanged: () => void | Promise<void> }) {
  const toast = useToast()
  const { can } = useBusiness()
  const [status, setStatus] = useState<IntegrationStatus[] | null>(null)
  const [busy, setBusy] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    getIntegrations()
      .then((s) => setStatus(s as IntegrationStatus[]))
      .catch(() => setStatus([]))
  }, [])

  async function run<T>(
    key: string,
    fn: () => Promise<{ ok: true; result: T } | { ok: false; message: string }>,
    done: (result: T) => string,
  ) {
    setBusy(key)
    try {
      const r = await fn()
      if (r.ok) {
        toast(done(r.result))
        await onChanged()
        setStatus((await getIntegrations()) as IntegrationStatus[])
      } else {
        toast(r.message)
      }
    } catch {
      toast('Something went wrong. Try again.')
    } finally {
      setBusy('')
    }
  }

  async function onDisconnect(provider: IntegrationStatus['provider']) {
    if (!window.confirm(`Disconnect ${PROVIDER_INFO[provider].name}? Nothing already imported is removed.`)) return
    setStatus((await disconnect({ data: { provider } })) as IntegrationStatus[])
    toast(`${PROVIDER_INFO[provider].name} disconnected`)
  }

  if (status === null) {
    return (
      <div className="bg-surface rounded-2xl p-4">
        <div className="skel w-[60%]" />
        <div className="skel w-[40%]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {status.map((s) => {
        const info = PROVIDER_INFO[s.provider]
        return (
          <section key={s.provider} className="bg-white border border-line rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="m-0 text-[17px] font-bold flex items-center gap-2">
                <Plug size={18} className="text-ink-2" />
                {info.name}
              </h3>
              <span
                className={`text-[12px] font-bold rounded-full px-2.5 py-1 ${
                  s.connected ? 'bg-good-tint text-good' : 'bg-surface text-ink-2'
                }`}
              >
                {s.connected ? 'Connected' : s.configured ? 'Not connected' : 'Needs setup'}
              </span>
            </div>
            <p className="text-ink-2 text-sm mt-0 mb-3">{info.blurb}</p>

            {!can(s.provider) ? (
              <UpgradeCard feature={s.provider} compact />
            ) : s.connected ? (
              <>
                <p className="text-sm m-0 mb-3">
                  {s.accountName ? <b>{s.accountName}</b> : 'Account linked'}
                  {s.sandbox && <span className="text-warn"> · sandbox</span>}
                  {s.lastSyncAt && <span className="text-ink-2"> · last sync {timeAgo(s.lastSyncAt)}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {s.provider === 'square' ? (
                    <>
                      <button
                        className="btn btn-tonal btn-sm"
                        disabled={!!busy}
                        onClick={() =>
                          run('import', () => squareImportCatalog(), (r) =>
                            `Imported ${r.created} new item${r.created === 1 ? '' : 's'}, updated ${r.updated}`,
                          )
                        }
                      >
                        {busy === 'import' ? 'Importing…' : 'Import item library'}
                      </button>
                      <button
                        className="btn btn-tonal btn-sm"
                        disabled={!!busy}
                        onClick={() =>
                          run('sales', () => squareSyncSales(), (r) =>
                            `${r.sales} sale${r.sales === 1 ? '' : 's'}, ${r.units} unit${r.units === 1 ? '' : 's'} counted out${
                              r.skipped ? ` (${r.skipped} unmatched line${r.skipped === 1 ? '' : 's'})` : ''
                            }`,
                          )
                        }
                      >
                        <RefreshCw size={15} />
                        {busy === 'sales' ? 'Syncing…' : 'Sync sales now'}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-ink-2 m-0 self-center">Send a month from the Budget tab.</p>
                  )}
                  <button className="btn btn-text btn-sm !text-bad ml-auto" onClick={() => onDisconnect(s.provider)}>
                    Disconnect
                  </button>
                </div>
              </>
            ) : s.configured ? (
              <a className="btn btn-primary btn-sm no-underline" href={`/api/integrations/${s.provider}/connect`}>
                Connect {info.name}
              </a>
            ) : (
              <details className="bg-surface rounded-xl px-3.5 py-2.5 text-sm">
                <summary className="cursor-pointer font-semibold">How to set it up (about 10 minutes, one time)</summary>
                <ol className="pl-5 mt-2 mb-1 flex flex-col gap-1.5">
                  <li>
                    Create an app in the{' '}
                    <a href={info.dashboard} target="_blank" rel="noreferrer" className="text-action font-semibold">
                      {info.dashboardLabel} <ExternalLink size={12} className="inline" />
                    </a>
                    .
                  </li>
                  <li>
                    Add this redirect URL to the app:
                    <code className="block mt-1 bg-white border border-line rounded-lg px-2 py-1.5 text-[12px] break-all">
                      {origin}/api/integrations/{s.provider}/callback
                    </code>
                  </li>
                  <li>
                    In Netlify, under Project configuration → Environment variables, add{' '}
                    {info.envVars.map((v, i) => (
                      <span key={v}>
                        <code className="text-[12px]">{v}</code>
                        {i < info.envVars.length - 1 ? ' and ' : ''}
                      </span>
                    ))}{' '}
                    from the app. Set <code className="text-[12px]">{info.envName}</code> to{' '}
                    <code className="text-[12px]">sandbox</code> while testing.
                  </li>
                  <li>Redeploy, then come back here and tap Connect.</li>
                </ol>
              </details>
            )}
          </section>
        )
      })}
    </div>
  )
}
