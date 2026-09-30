import { Lock, Sparkles } from 'lucide-react'
import { FEATURE_INFO, centsLabel, planFor, type Feature } from '@/lib/plans'
import { useBusiness } from '@/components/business/BusinessContext'

/** Shows children when the plan includes `feature`; otherwise a card explaining what upgrading unlocks. */
export function PlanGate({ feature, children, compact = false }: { feature: Feature; children: React.ReactNode; compact?: boolean }) {
  const { can } = useBusiness()
  if (can(feature)) return <>{children}</>
  return <UpgradeCard feature={feature} compact={compact} />
}

export function UpgradeCard({ feature, compact = false }: { feature: Feature; compact?: boolean }) {
  const { openPlans, account } = useBusiness()
  const plan = planFor(feature)
  const info = FEATURE_INFO[feature]
  const paused = account?.status === 'paused'

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-gold-tint rounded-2xl px-4 py-3 text-sm">
        <Lock size={18} className="text-gold-ink shrink-0" />
        <span className="flex-1">
          <b>{info.label}</b> {paused ? 'is off while billing is paused.' : `comes with ${plan.name}.`}
        </span>
        <button type="button" className="btn btn-gold btn-sm" onClick={openPlans}>
          {paused ? 'Resume' : 'Upgrade'}
        </button>
      </div>
    )
  }

  return (
    <section className="max-w-[560px] mx-auto text-center bg-white border border-line rounded-3xl px-6 py-10 shadow-card">
      <span className="brand-tile w-14 h-14 rounded-2xl text-white grid place-items-center mx-auto mb-4" aria-hidden="true">
        <Lock size={24} />
      </span>
      <p className="text-[12px] font-bold uppercase tracking-wider text-gold-ink m-0 mb-1">Bintro {plan.name}</p>
      <h2 className="text-[22px] font-extrabold text-royal m-0 mb-2">{info.label}</h2>
      <p className="text-ink-2 m-0 mb-5">{info.blurb}</p>
      {paused ? (
        <p className="text-sm m-0 mb-5">Your plan is paused, so the account is on Free features until you resume.</p>
      ) : (
        <p className="text-sm m-0 mb-5">
          {plan.name} is <b>{centsLabel(plan.monthlyCents)}/month</b> — or {centsLabel(plan.yearlyCents)}/year.
        </p>
      )}
      <button type="button" className="btn btn-gold" onClick={openPlans}>
        <Sparkles size={18} />
        {paused ? 'Resume my plan' : `See ${plan.name}`}
      </button>
    </section>
  )
}
