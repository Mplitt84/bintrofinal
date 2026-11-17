import { PageHead } from '@/components/ui/bits'
import { TeamManager } from '@/components/business/SettingsView'
import { ShopCleanup } from '@/components/team/ShopCleanup'
import { providerNounFor } from '@/lib/industry'
import { useBusiness } from '@/components/business/BusinessContext'
import type { TeamMember } from '@/components/inventory/types'

/** Kept so old #housekeeping links still open this page. */
export type TeamPage = 'team' | 'housekeeping'

/** The Team page: the shop's three shared clean-up checklists, then the people. */
export function TeamView({
  team,
  onTeam,
  staffName,
  onStaffName,
  isOwner,
}: {
  page?: TeamPage
  onPage?: (p: TeamPage) => void
  team: TeamMember[]
  onTeam: (t: TeamMember[]) => void
  staffName: string
  onStaffName: (name: string) => void
  isOwner: boolean
}) {
  const { profile } = useBusiness()
  return (
    <>
      <PageHead title="Team" lead="Shop clean-up anyone can tick off, and everyone who works here." />
      <ShopCleanup staffName={staffName} isOwner={isOwner} />
      <TeamManager
        team={team}
        onTeam={onTeam}
        staffName={staffName}
        onStaffName={onStaffName}
        providerNoun={providerNounFor(profile.businessType)}
      />
    </>
  )
}
