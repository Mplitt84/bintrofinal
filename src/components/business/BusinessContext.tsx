import { createContext, useContext } from 'react'
import { EMPTY_PROFILE, businessTypeById, displayBusinessName, type BusinessProfile, type BusinessType } from '@/lib/business-types'
import type { ProductCategory } from '@/lib/tax-categories'
import { planById, planHas, type AccountSummary, type Feature, type Plan } from '@/lib/plans'

type BusinessContextValue = {
  profile: BusinessProfile
  type: BusinessType
  name: string
  /** Categories the business has added, each filed under a tax group. */
  categories: ProductCategory[]
  onCategories: (next: ProductCategory[]) => void
  account: AccountSummary | null
  onAccount: (next: AccountSummary) => void
  /** The plan whose features are on right now. */
  plan: Plan
  can: (feature: Feature) => boolean
  /** Opens Settings → Account & billing on the plan picker. */
  openPlans: () => void
}

const BusinessContext = createContext<BusinessContextValue>({
  profile: EMPTY_PROFILE,
  type: businessTypeById(EMPTY_PROFILE.businessType),
  name: displayBusinessName(EMPTY_PROFILE),
  categories: [],
  onCategories: () => {},
  account: null,
  onAccount: () => {},
  plan: planById('free'),
  can: () => true,
  openPlans: () => {},
})

/** Makes the business profile (name, type, contact details), its category list and its plan available to every tab. */
export function BusinessProvider({
  profile,
  categories,
  onCategories,
  account,
  onAccount,
  openPlans,
  children,
}: {
  profile: BusinessProfile
  categories: ProductCategory[]
  onCategories: (next: ProductCategory[]) => void
  account: AccountSummary | null
  onAccount: (next: AccountSummary) => void
  openPlans: () => void
  children: React.ReactNode
}) {
  // Until the account loads, nothing is locked so the app never flashes upgrade prompts.
  const can = (feature: Feature) => (account ? planHas(account.effectivePlan, feature) : true)
  return (
    <BusinessContext.Provider
      value={{
        profile,
        type: businessTypeById(profile.businessType),
        name: displayBusinessName(profile),
        categories,
        onCategories,
        account,
        onAccount,
        plan: planById(account?.effectivePlan ?? 'premium'),
        can,
        openPlans,
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  return useContext(BusinessContext)
}
