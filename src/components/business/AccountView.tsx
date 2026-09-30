import { useEffect, useState } from 'react'
import {
  Boxes,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Lock,
  PauseCircle,
  PlayCircle,
  Receipt,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react'
import {
  CANCEL_REASONS,
  FEATURE_INFO,
  PAUSE_OPTIONS,
  PLANS,
  centsLabel,
  planById,
  planRank,
  priceFor,
  type AccountSummary,
  type BillingEvent,
  type BillingInterval,
  type Feature,
  type Plan,
  type PlanId,
} from '@/lib/plans'
import { useBusiness } from '@/components/business/BusinessContext'
import { Field, Sheet, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import {
  cancelSubscription,
  getBillingHistory,
  openPaymentPortal,
  pausePlan,
  resumePlan,
  saveAccountDetails,
  selectPlan,
} from '@/server/account.functions'

export type AccountPanel = 'account' | 'billing'

const DAY_MS = 24 * 60 * 60 * 1000

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS))
}

type BillingCall = { ok: true; result: { account: AccountSummary; redirect?: string; message: string } } | { ok: false; message: string }

/** Settings → Account & billing: the plan the business is on, usage, plan picker, payment, pause and cancel. */
export function AccountView({ panel, onPanel }: { panel: AccountPanel; onPanel: (p: AccountPanel) => void }) {
  const { account, onAccount } = useBusiness()
  const toast = useToast()
  const [busy, setBusy] = useState('')

  async function run(key: string, call: () => Promise<BillingCall>) {
    setBusy(key)
    try {
      const r = await call()
      if (!r.ok) {
        toast(r.message)
        return false
      }
      onAccount(r.result.account)
      if (r.result.redirect) {
        window.location.href = r.result.redirect
        return true
      }
      toast(r.result.message)
      return true
    } catch {
      toast('Something went wrong. Try again.')
      return false
    } finally {
      setBusy('')
    }
  }

  if (!account) {
    return (
      <div className="bg-surface rounded-2xl p-4">
        <div className="skel w-[60%]" />
        <div className="skel w-[40%]" />
      </div>
    )
  }

  return (
    <div>
      <div className="inline-flex p-1 rounded-full bg-surface mb-4" role="tablist" aria-label="Account or billing">
        {(
          [
            { id: 'account', label: 'Account' },
            { id: 'billing', label: 'Billing' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={panel === t.id}
            onClick={() => onPanel(t.id)}
            className={`px-5 py-2 rounded-full border-0 text-sm font-semibold cursor-pointer ${
              panel === t.id ? 'bg-white text-ink shadow-card' : 'bg-transparent text-ink-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <PlanSummary account={account} onBilling={() => onPanel('billing')} busy={busy} run={run} />

      {panel === 'account' ? (
        <>
          <Usage account={account} />
          <IncludedFeatures account={account} />
          <PlanPicker account={account} busy={busy} run={run} />
          <AccountDetails account={account} />
        </>
      ) : (
        <Billing account={account} busy={busy} run={run} />
      )}
    </div>
  )
}

type RunFn = (key: string, call: () => Promise<BillingCall>) => Promise<boolean>

function statusLine(account: AccountSummary): { tone: 'good' | 'warn' | 'bad' | 'plain'; label: string; detail: string } {
  const plan = planById(account.plan)
  if (account.status === 'trialing') {
    const left = daysUntil(account.trialEndsAt)
    return {
      tone: left <= 5 ? 'warn' : 'good',
      label: `Trial · ${left} day${left === 1 ? '' : 's'} left`,
      detail: `Every ${plan.name} feature is on until ${fmtDate(account.trialEndsAt)}. Pick a plan to keep them, or you'll move to Free.`,
    }
  }
  if (account.status === 'paused') {
    return {
      tone: 'warn',
      label: `Paused until ${fmtDate(account.pausedUntil)}`,
      detail: `No charges while paused. Your data is safe, and you're on Free features until ${plan.name} resumes.`,
    }
  }
  if (account.cancelAtPeriodEnd) {
    return {
      tone: 'bad',
      label: `Ends ${fmtDate(account.currentPeriodEnd)}`,
      detail: `${plan.name} stays on until then, then the account moves to Free. Nothing is deleted.`,
    }
  }
  if (account.plan === 'free') {
    return { tone: 'plain', label: 'Free forever', detail: 'Upgrade any time for ordering, planning, AI help and more.' }
  }
  return {
    tone: 'good',
    label: 'Active',
    detail: `Renews ${fmtDate(account.currentPeriodEnd)} for ${centsLabel(priceFor(plan, account.interval))}/${account.interval}.`,
  }
}

const TONE: Record<'good' | 'warn' | 'bad' | 'plain', string> = {
  good: 'bg-good-tint text-good',
  warn: 'bg-warn-tint text-warn',
  bad: 'bg-bad-tint text-bad',
  plain: 'bg-white/15 text-white',
}

function PlanSummary({
  account,
  onBilling,
  busy,
  run,
}: {
  account: AccountSummary
  onBilling: () => void
  busy: string
  run: RunFn
}) {
  const { name } = useBusiness()
  const plan = planById(account.plan)
  const status = statusLine(account)
  const canResume = account.status === 'paused' || account.cancelAtPeriodEnd

  return (
    <section className="brand-tile rounded-3xl text-white p-5 mb-6 shadow-lift" aria-labelledby="plan-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[12px] font-bold uppercase tracking-wider text-gold-bright">{name}</p>
          <h2 id="plan-title" className="m-0 text-[26px] font-extrabold flex items-center gap-2">
            {account.plan === 'premium' && <Crown size={22} className="text-gold-bright" />}
            Bintro {plan.name}
          </h2>
        </div>
        <span className={`text-[12px] font-bold rounded-full px-2.5 py-1 shrink-0 ${TONE[status.tone]}`}>{status.label}</span>
      </div>
      <p className="m-0 mt-2 text-[14px] text-white/85">{status.detail}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {canResume && (
          <button
            className="btn btn-gold btn-sm"
            disabled={!!busy}
            onClick={() => run('resume', () => resumePlan() as Promise<BillingCall>)}
          >
            <PlayCircle size={16} />
            {busy === 'resume' ? 'Working…' : account.status === 'paused' ? 'Resume now' : `Keep ${plan.name}`}
          </button>
        )}
        <button className="btn btn-sm bg-white/15 text-white border-0 hover:bg-white/25" onClick={onBilling}>
          <CreditCard size={16} />
          Billing, pause & cancel
        </button>
      </div>
    </section>
  )
}

function Meter({ Icon, label, used, limit }: { Icon: typeof Boxes; label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const full = limit !== null && used >= limit
  return (
    <div className="bg-surface rounded-2xl p-3.5">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-2 font-semibold">
          <Icon size={16} className="text-ink-2" />
          {label}
        </span>
        <span className="num">
          <b>{used}</b>
          <span className="text-ink-2"> / {limit === null ? 'Unlimited' : limit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
        <div
          className={`h-full rounded-full ${full ? 'bg-bad' : pct >= 80 ? 'bg-warn' : 'bg-action'}`}
          style={{ width: limit === null ? '100%' : `${Math.max(pct, used ? 4 : 0)}%`, opacity: limit === null ? 0.25 : 1 }}
        />
      </div>
      {full && <p className="text-bad text-[12px] font-semibold m-0 mt-1.5">Limit reached. Upgrade to add more.</p>}
    </div>
  )
}

function Usage({ account }: { account: AccountSummary }) {
  const plan = planById(account.effectivePlan)
  return (
    <section className="mb-6" aria-labelledby="usage-title">
      <h3 id="usage-title" className="text-[17px] font-bold text-royal m-0 mb-2">Usage</h3>
      <div className="grid min-[520px]:grid-cols-2 gap-2.5">
        <Meter Icon={Boxes} label="Products" used={account.usage.products} limit={plan.productLimit} />
        <Meter Icon={Users} label="Team members" used={account.usage.team} limit={plan.teamLimit} />
      </div>
    </section>
  )
}

function IncludedFeatures({ account }: { account: AccountSummary }) {
  const plan = planById(account.effectivePlan)
  const all = Object.keys(FEATURE_INFO) as Feature[]
  return (
    <section className="mb-6" aria-labelledby="features-title">
      <h3 id="features-title" className="text-[17px] font-bold text-royal m-0 mb-2">What's on right now</h3>
      <ul className="list-none m-0 p-0 border border-line rounded-2xl divide-y divide-line">
        <li className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
          <Check size={17} className="text-good shrink-0" />
          <span className="flex-1">Scanning, products, below-par list and activity</span>
          <span className="text-[12px] text-ink-2">Every plan</span>
        </li>
        {all.map((f) => {
          const on = plan.features.includes(f)
          const needs = PLANS.find((p) => p.features.includes(f))
          return (
            <li key={f} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
              {on ? <Check size={17} className="text-good shrink-0" /> : <Lock size={16} className="text-ink-2 shrink-0" />}
              <span className={`flex-1 ${on ? '' : 'text-ink-2'}`}>{FEATURE_INFO[f].label}</span>
              <span className={`text-[12px] font-semibold ${on ? 'text-good' : 'text-gold-ink'}`}>
                {on ? 'Included' : needs?.name}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PlanPicker({ account, busy, run }: { account: AccountSummary; busy: string; run: RunFn }) {
  const [interval, setBillingInterval] = useState<BillingInterval>(account.plan === 'free' ? 'month' : account.interval)
  const [confirm, setConfirm] = useState<Plan | null>(null)
  const current = planById(account.plan)

  function action(target: Plan): { label: string; disabled: boolean; tone: string } {
    const trial = account.status === 'trialing'
    const same = target.id === account.plan && (target.id === 'free' || interval === account.interval)
    if (same && !trial && account.status !== 'paused' && !account.cancelAtPeriodEnd) {
      return { label: 'Current plan', disabled: true, tone: 'btn-tonal' }
    }
    if (trial) return { label: target.id === 'free' ? 'Switch to Free' : `Choose ${target.name}`, disabled: false, tone: target.id === 'free' ? 'btn-tonal' : 'btn-primary' }
    if (target.id === account.plan) {
      if (account.status === 'paused' || account.cancelAtPeriodEnd) return { label: `Keep ${target.name}`, disabled: false, tone: 'btn-primary' }
      return { label: `Switch to ${interval}ly`, disabled: false, tone: 'btn-tonal' }
    }
    return planRank(target.id) > planRank(account.plan)
      ? { label: `Upgrade to ${target.name}`, disabled: false, tone: target.id === 'premium' ? 'btn-gold' : 'btn-primary' }
      : { label: `Downgrade to ${target.name}`, disabled: false, tone: 'btn-tonal' }
  }

  function choose(target: Plan) {
    // Downgrades lose features, so they get a second look first.
    if (account.status !== 'trialing' && planRank(target.id) < planRank(account.plan)) setConfirm(target)
    else if (target.id === account.plan && (account.status === 'paused' || account.cancelAtPeriodEnd))
      run('resume', () => resumePlan() as Promise<BillingCall>)
    else commit(target.id)
  }

  function commit(plan: PlanId) {
    setConfirm(null)
    run(`plan-${plan}`, () => selectPlan({ data: { plan, interval } }) as Promise<BillingCall>)
  }

  const losing = confirm ? current.features.filter((f) => !confirm.features.includes(f)) : []

  return (
    <section className="mb-6" aria-labelledby="plans-title">
      <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 id="plans-title" className="text-[17px] font-bold text-royal m-0">Plans</h3>
          <p className="text-ink-2 text-[13px] m-0">Change or cancel any time. Your data always stays.</p>
        </div>
        <div className="inline-flex p-1 rounded-full bg-surface" role="radiogroup" aria-label="Billing period">
          {(['month', 'year'] as const).map((i) => (
            <button
              key={i}
              role="radio"
              aria-checked={interval === i}
              onClick={() => setBillingInterval(i)}
              className={`px-3.5 py-1.5 rounded-full border-0 text-[13px] font-semibold cursor-pointer ${
                interval === i ? 'bg-white text-ink shadow-card' : 'bg-transparent text-ink-2'
              }`}
            >
              {i === 'month' ? 'Monthly' : 'Yearly · 2 months free'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-[640px]:grid-cols-3 gap-3">
        {PLANS.map((p) => {
          const a = action(p)
          const isCurrent = p.id === account.plan
          const price = priceFor(p, interval)
          return (
            <article
              key={p.id}
              className={`relative flex flex-col rounded-2xl p-4 border ${
                p.id === 'premium' ? 'border-gold bg-gold-tint/60' : isCurrent ? 'border-action bg-action-tint/40' : 'border-line bg-white'
              }`}
            >
              {p.id === 'plus' && !isCurrent && (
                <span className="absolute -top-2.5 left-4 text-[11px] font-bold uppercase tracking-wider bg-action text-white rounded-full px-2 py-0.5">
                  Most popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-2.5 left-4 text-[11px] font-bold uppercase tracking-wider bg-royal text-white rounded-full px-2 py-0.5">
                  {account.status === 'trialing' ? 'Trying now' : 'Your plan'}
                </span>
              )}
              <h4 className="m-0 text-[18px] font-extrabold flex items-center gap-1.5">
                {p.id === 'premium' && <Crown size={17} className="text-gold-ink" />}
                {p.name}
              </h4>
              <p className="m-0 mt-1 mb-3">
                <span className="num text-[28px] font-extrabold text-royal">{centsLabel(price)}</span>
                {price > 0 && <span className="text-ink-2 text-sm">/{interval}</span>}
                {price > 0 && interval === 'year' && (
                  <span className="block text-[12px] text-good font-semibold">
                    {centsLabel(Math.round(p.yearlyCents / 12))}/mo, saves {centsLabel(p.monthlyCents * 12 - p.yearlyCents)}
                  </span>
                )}
              </p>
              <p className="text-ink-2 text-[13px] m-0 mb-3">{p.tagline}</p>
              <ul className="list-none m-0 p-0 mb-4 flex flex-col gap-1.5 text-[13px] flex-1">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <Check size={15} className="text-good shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
              <button
                className={`btn btn-sm w-full ${a.tone}`}
                disabled={a.disabled || !!busy}
                onClick={() => choose(p)}
              >
                {busy === `plan-${p.id}` ? 'Working…' : a.label}
              </button>
            </article>
          )
        })}
      </div>
      {!account.billingLive && (
        <p className="text-ink-2 text-[12px] mt-2 mb-0">
          Pilot mode: payments aren't turned on for this site, so plan changes apply right away with no charge.
        </p>
      )}

      <Sheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={`Move to ${confirm?.name ?? ''}?`}
        subtitle={
          confirm?.id === 'free'
            ? `${current.name} stays on until ${fmtDate(account.currentPeriodEnd)}, then these switch off:`
            : 'These switch off after the change:'
        }
      >
        <ul className="list-none m-0 p-0 flex flex-col gap-2 text-sm">
          {losing.map((f) => (
            <li key={f} className="flex gap-2">
              <XCircle size={17} className="text-bad shrink-0" />
              <span>
                <b>{FEATURE_INFO[f].label}</b> — <span className="text-ink-2">{FEATURE_INFO[f].blurb}</span>
              </span>
            </li>
          ))}
        </ul>
        {confirm && confirm.productLimit !== null && account.usage.products > confirm.productLimit && (
          <p className="text-warn text-sm mt-3 mb-0">
            You have {account.usage.products} products. {confirm.name} holds {confirm.productLimit}; existing ones are kept but
            you can't add more.
          </p>
        )}
        <p className="text-ink-2 text-[13px] mt-3 mb-0">Nothing is deleted. Upgrade again any time to switch them back on.</p>
        <SheetActions>
          <button className="btn btn-tonal" onClick={() => setConfirm(null)}>
            Keep {current.name}
          </button>
          <button className="btn btn-danger" disabled={!!busy} onClick={() => confirm && commit(confirm.id)}>
            Move to {confirm?.name}
          </button>
        </SheetActions>
      </Sheet>
    </section>
  )
}

function AccountDetails({ account }: { account: AccountSummary }) {
  const { profile, onAccount } = useBusiness()
  const toast = useToast()
  const [ownerName, setOwnerName] = useState(account.ownerName)
  const [billingEmail, setBillingEmail] = useState(account.billingEmail)
  const [saving, setSaving] = useState(false)
  const dirty = ownerName !== account.ownerName || billingEmail !== account.billingEmail

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      onAccount((await saveAccountDetails({ data: { ownerName, billingEmail } })) as AccountSummary)
      toast('Account details saved')
    } catch {
      toast("Couldn't save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="pt-6 border-t border-line" aria-labelledby="details-title">
      <h3 id="details-title" className="text-[17px] font-bold text-royal m-0 mb-3">Account details</h3>
      <div className="grid min-[560px]:grid-cols-2 gap-x-2.5">
        <Field label="Account owner" htmlFor="acct-owner">
          <input
            id="acct-owner"
            className="field-input"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value.slice(0, 120))}
            placeholder="Who pays for Bintro"
            autoComplete="name"
          />
        </Field>
        <Field label="Billing email" htmlFor="acct-email">
          <input
            id="acct-email"
            type="email"
            className="field-input"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value.slice(0, 200))}
            placeholder={profile.email || 'Where receipts go'}
            autoComplete="email"
          />
        </Field>
      </div>
      <dl className="grid grid-cols-2 gap-2.5 text-sm m-0 mb-4">
        <div className="bg-surface rounded-xl px-3.5 py-2.5">
          <dt className="text-ink-2 text-[12px]">Member since</dt>
          <dd className="m-0 font-semibold">{fmtDate(account.memberSince)}</dd>
        </div>
        <div className="bg-surface rounded-xl px-3.5 py-2.5">
          <dt className="text-ink-2 text-[12px]">Billing</dt>
          <dd className="m-0 font-semibold">
            {account.plan === 'free' ? 'None' : `${account.interval === 'year' ? 'Yearly' : 'Monthly'}`}
          </dd>
        </div>
      </dl>
      <button type="submit" className="btn btn-primary w-full" disabled={saving || !dirty}>
        {saving ? 'Saving…' : 'Save account details'}
      </button>
    </form>
  )
}

function Billing({ account, busy, run }: { account: AccountSummary; busy: string; run: RunFn }) {
  const toast = useToast()
  const [history, setHistory] = useState<BillingEvent[] | null>(null)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [months, setMonths] = useState<number>(1)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [portalBusy, setPortalBusy] = useState(false)
  const plan = planById(account.plan)
  const paid = account.plan !== 'free'
  const trial = account.status === 'trialing'

  useEffect(() => {
    getBillingHistory()
      .then((h) => setHistory(h as BillingEvent[]))
      .catch(() => setHistory([]))
  }, [account])

  async function openPortal() {
    setPortalBusy(true)
    try {
      const r = await openPaymentPortal()
      if (r.ok) window.location.href = r.result
      else toast(r.message)
    } catch {
      toast("Couldn't open the payment page. Try again.")
    } finally {
      setPortalBusy(false)
    }
  }

  async function pause() {
    if (await run('pause', () => pausePlan({ data: { months } }) as Promise<BillingCall>)) setPauseOpen(false)
  }

  async function cancel() {
    const why = [reason, note.trim()].filter(Boolean).join(': ')
    if (await run('cancel', () => cancelSubscription({ data: { reason: why } }) as Promise<BillingCall>)) {
      setCancelOpen(false)
      setReason('')
      setNote('')
    }
  }

  const resumeDate = new Date()
  resumeDate.setMonth(resumeDate.getMonth() + months)
  const nextCharge =
    paid && account.status === 'active' && !account.cancelAtPeriodEnd
      ? { amount: priceFor(plan, account.interval), on: account.currentPeriodEnd }
      : trial && account.paymentMethod
        ? { amount: priceFor(plan, account.interval), on: account.trialEndsAt }
        : null

  return (
    <div className="flex flex-col gap-6">
      {!account.billingLive && (
        <details className="bg-gold-tint rounded-2xl px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-gold-ink">
            Pilot mode — no card is charged. How to turn on payments
          </summary>
          <ol className="pl-5 mt-2 mb-1 flex flex-col gap-1.5">
            <li>
              In{' '}
              <a href="https://dashboard.stripe.com/products" target="_blank" rel="noreferrer" className="text-action font-semibold">
                Stripe <ExternalLink size={12} className="inline" />
              </a>
              , create Plus and Premium products, each with a monthly and a yearly price.
            </li>
            <li>
              In Netlify → Project configuration → Environment variables, add <code className="text-[12px]">STRIPE_SECRET_KEY</code>,{' '}
              <code className="text-[12px]">STRIPE_PRICE_PLUS_MONTHLY</code>, <code className="text-[12px]">STRIPE_PRICE_PLUS_YEARLY</code>,{' '}
              <code className="text-[12px]">STRIPE_PRICE_PREMIUM_MONTHLY</code> and <code className="text-[12px]">STRIPE_PRICE_PREMIUM_YEARLY</code>.
            </li>
            <li>
              Add a webhook endpoint for <code className="text-[12px] break-all">/api/billing/webhook</code> (subscription and
              invoice events) and save its signing secret as <code className="text-[12px]">STRIPE_WEBHOOK_SECRET</code>.
            </li>
            <li>Turn on the Stripe customer portal so owners can update their card, then redeploy.</li>
          </ol>
        </details>
      )}

      <section aria-labelledby="pm-title">
        <h3 id="pm-title" className="text-[17px] font-bold text-royal m-0 mb-2">Payment method</h3>
        <div className="flex items-center gap-3 border border-line rounded-2xl p-4">
          <span className="w-12 h-9 rounded-lg bg-surface grid place-items-center shrink-0">
            <CreditCard size={20} className="text-ink-2" />
          </span>
          <div className="flex-1 min-w-0 text-sm">
            {account.paymentMethod ? (
              <>
                <b className="capitalize">{account.paymentMethod.brand}</b> •••• {account.paymentMethod.last4}
                <span className="block text-ink-2 text-[13px]">
                  Expires {String(account.paymentMethod.expMonth).padStart(2, '0')}/{account.paymentMethod.expYear}
                </span>
              </>
            ) : (
              <>
                <b>No card on file</b>
                <span className="block text-ink-2 text-[13px]">
                  {account.billingLive ? "You'll add one securely at checkout when you pick a paid plan." : 'Not needed in pilot mode.'}
                </span>
              </>
            )}
          </div>
          {account.billingLive && account.paymentMethod && (
            <button className="btn btn-tonal btn-sm shrink-0" disabled={portalBusy} onClick={openPortal}>
              {portalBusy ? 'Opening…' : 'Update'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5 mt-2.5 text-sm">
          <div className="bg-surface rounded-xl px-3.5 py-2.5">
            <p className="text-ink-2 text-[12px] m-0">Next payment</p>
            <p className="m-0 font-semibold">
              {nextCharge ? `${centsLabel(nextCharge.amount)} on ${fmtDate(nextCharge.on)}` : 'None scheduled'}
            </p>
          </div>
          <div className="bg-surface rounded-xl px-3.5 py-2.5">
            <p className="text-ink-2 text-[12px] m-0">Plan</p>
            <p className="m-0 font-semibold">
              {plan.name}
              {paid && ` · ${centsLabel(priceFor(plan, account.interval))}/${account.interval}`}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="manage-title">
        <h3 id="manage-title" className="text-[17px] font-bold text-royal m-0 mb-2">Pause or cancel</h3>
        {!paid ? (
          <p className="text-ink-2 text-sm bg-surface rounded-2xl px-4 py-4 m-0">
            You're on Free, so there's nothing to pause or cancel. Your data stays as long as you like.
          </p>
        ) : (
          <div className="grid min-[520px]:grid-cols-2 gap-2.5">
            {account.status === 'paused' ? (
              <button
                className="flex items-start gap-3 text-left border border-good bg-good-tint rounded-2xl p-4 cursor-pointer"
                disabled={!!busy}
                onClick={() => run('resume', () => resumePlan() as Promise<BillingCall>)}
              >
                <PlayCircle size={24} className="text-good shrink-0" />
                <span className="text-sm">
                  <b className="block text-[15px]">{busy === 'resume' ? 'Resuming…' : 'Resume now'}</b>
                  <span className="text-ink-2">Paused until {fmtDate(account.pausedUntil)}. Switch everything back on today.</span>
                </span>
              </button>
            ) : (
              <button
                className="flex items-start gap-3 text-left border border-line bg-white rounded-2xl p-4 cursor-pointer hover:border-warn disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={trial || !!busy}
                onClick={() => setPauseOpen(true)}
              >
                <PauseCircle size={24} className="text-warn shrink-0" />
                <span className="text-sm">
                  <b className="block text-[15px]">Pause billing</b>
                  <span className="text-ink-2">
                    {trial ? 'Available once you’re on a paid plan.' : 'Take 1–3 months off. No charges, data kept, restarts on its own.'}
                  </span>
                </span>
              </button>
            )}
            {account.cancelAtPeriodEnd ? (
              <button
                className="flex items-start gap-3 text-left border border-good bg-good-tint rounded-2xl p-4 cursor-pointer"
                disabled={!!busy}
                onClick={() => run('resume', () => resumePlan() as Promise<BillingCall>)}
              >
                <PlayCircle size={24} className="text-good shrink-0" />
                <span className="text-sm">
                  <b className="block text-[15px]">Keep {plan.name}</b>
                  <span className="text-ink-2">Cancellation is set for {fmtDate(account.currentPeriodEnd)}. Undo it.</span>
                </span>
              </button>
            ) : (
              <button
                className="flex items-start gap-3 text-left border border-line bg-white rounded-2xl p-4 cursor-pointer hover:border-bad"
                disabled={!!busy}
                onClick={() => setCancelOpen(true)}
              >
                <XCircle size={24} className="text-bad shrink-0" />
                <span className="text-sm">
                  <b className="block text-[15px]">{trial ? 'End trial' : `Cancel ${plan.name}`}</b>
                  <span className="text-ink-2">
                    {trial ? 'Move to Free now. No charge.' : `Keeps working until ${fmtDate(account.currentPeriodEnd)}, then moves to Free.`}
                  </span>
                </span>
              </button>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="history-title">
        <h3 id="history-title" className="text-[17px] font-bold text-royal m-0 mb-2 flex items-center gap-2">
          <Receipt size={17} className="text-ink-2" />
          Billing history
        </h3>
        {history === null ? (
          <div className="bg-surface rounded-2xl p-4">
            <div className="skel w-[70%]" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-ink-2 text-sm bg-surface rounded-2xl px-4 py-4 m-0">No billing activity yet.</p>
        ) : (
          <ul className="list-none m-0 p-0 border border-line rounded-2xl divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                <span className="text-ink-2 text-[12px] w-[88px] shrink-0">{fmtDate(h.createdAt)}</span>
                <span className="flex-1 min-w-0">{h.detail}</span>
                {h.amountCents > 0 && <b className="num shrink-0">{centsLabel(h.amountCents)}</b>}
                {h.url && (
                  <a href={h.url} target="_blank" rel="noreferrer" className="text-action shrink-0" aria-label="View invoice">
                    <ExternalLink size={15} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title="Pause billing"
        subtitle="Great for slow seasons, renovations or time off."
      >
        <div className="grid grid-cols-3 gap-2 mb-4" role="radiogroup" aria-label="Pause length">
          {PAUSE_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={months === m}
              aria-pressed={months === m}
              className="chip !rounded-xl !py-3 justify-center"
              onClick={() => setMonths(m)}
            >
              {m} month{m === 1 ? '' : 's'}
            </button>
          ))}
        </div>
        <ul className="list-none m-0 p-0 flex flex-col gap-2 text-sm">
          <li className="flex gap-2">
            <Check size={16} className="text-good shrink-0 mt-0.5" /> No charges until{' '}
            <b>{resumeDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</b>
          </li>
          <li className="flex gap-2">
            <Check size={16} className="text-good shrink-0 mt-0.5" /> Products, history and settings are all kept
          </li>
          <li className="flex gap-2">
            <Check size={16} className="text-good shrink-0 mt-0.5" /> Scanning keeps working on Free features
          </li>
          <li className="flex gap-2">
            <Check size={16} className="text-good shrink-0 mt-0.5" /> {plan.name} restarts on its own, or resume any time
          </li>
        </ul>
        <SheetActions>
          <button className="btn btn-tonal" onClick={() => setPauseOpen(false)}>
            Never mind
          </button>
          <button className="btn btn-primary" disabled={!!busy} onClick={pause}>
            <PauseCircle size={18} />
            {busy === 'pause' ? 'Pausing…' : `Pause ${months} month${months === 1 ? '' : 's'}`}
          </button>
        </SheetActions>
      </Sheet>

      <Sheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={trial ? 'End your trial?' : `Cancel ${plan.name}?`}
        subtitle={
          trial
            ? 'You move to Free right away. Nothing is charged and nothing is deleted.'
            : `${plan.name} stays on until ${fmtDate(account.currentPeriodEnd)}. After that you move to Free — nothing is deleted.`
        }
      >
        <p className="text-sm font-semibold m-0 mb-2">What's the main reason? (optional)</p>
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Reason">
          {CANCEL_REASONS.map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={reason === r} onClick={() => setReason(reason === r ? '' : r)}>
              {r}
            </button>
          ))}
        </div>
        <Field label="Anything we could do better?" htmlFor="cancel-note">
          <textarea
            id="cancel-note"
            rows={2}
            className="field-input resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 400))}
          />
        </Field>
        {!trial && account.status !== 'paused' && (
          <button
            type="button"
            className="w-full flex items-center gap-3 text-left bg-gold-tint rounded-2xl px-4 py-3 border-0 cursor-pointer mb-1"
            onClick={() => {
              setCancelOpen(false)
              setPauseOpen(true)
            }}
          >
            <Sparkles size={18} className="text-gold-ink shrink-0" />
            <span className="text-sm">
              <b>Just need a break?</b> Pause for up to 3 months instead and keep everything ready to go.
            </span>
          </button>
        )}
        <SheetActions>
          <button className="btn btn-tonal" onClick={() => setCancelOpen(false)}>
            Keep {plan.name}
          </button>
          <button className="btn btn-danger" disabled={!!busy} onClick={cancel}>
            {busy === 'cancel' ? 'Canceling…' : trial ? 'End trial' : 'Cancel plan'}
          </button>
        </SheetActions>
      </Sheet>
    </div>
  )
}
