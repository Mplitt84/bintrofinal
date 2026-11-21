import { PageHead } from '@/components/ui/bits'
import { TeamManager } from '@/components/business/SettingsView'
import { ShopCleanup } from '@/components/team/ShopCleanup'
import { ScheduleCard } from '@/components/team/ScheduleCard'
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
      <ScheduleCard me={staffName} team={team.map((t) => t.name)} isOwner={isOwner} />
      {isOwner ? (
        <TeamManager
          team={team}
          onTeam={onTeam}
          staffName={staffName}
          onStaffName={onStaffName}
          providerNoun={providerNounFor(profile.businessType)}
        />
      ) : (
        <section>
          <h2 className="m-0 mb-2 text-lg font-bold">The team</h2>
          <ul className="list-none m-0 p-0 flex flex-wrap gap-2">
            {team.map((t) => (
              <li key={t.id} className="chip">
                {t.name}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-ink-2 mt-2">The owner adds people and sets who does what.</p>
        </section>
      )}
    </>
  )
}
