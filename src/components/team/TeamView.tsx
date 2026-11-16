import { PageHead } from '@/components/ui/bits'
import { TeamManager } from '@/components/business/SettingsView'
import { HousekeepingView } from '@/components/team/HousekeepingView'
import { providerNounFor } from '@/lib/industry'
import { useBusiness } from '@/components/business/BusinessContext'
import type { TeamMember } from '@/components/inventory/types'

export type TeamPage = 'team' | 'housekeeping'

/** The Team page: the people (roles, rename) and, as a subpage, the shop's housekeeping. */
export function TeamView({
  page,
  onPage,
  team,
  onTeam,
  staffName,
  onStaffName,
  isOwner,
}: {
  page: TeamPage
  onPage: (p: TeamPage) => void
  team: TeamMember[]
  onTeam: (t: TeamMember[]) => void
  staffName: string
  onStaffName: (name: string) => void
  isOwner: boolean
}) {
  const { profile } = useBusiness()
  return (
    <>
      <PageHead
        title={page === 'housekeeping' ? 'Housekeeping' : 'Team'}
        lead={
          page === 'housekeeping'
            ? 'Every job, every day, with a thank-you for each one. Tap your name, then tap a circle when it’s done.'
            : 'Everyone who works here, what they do, and the shop’s daily housekeeping.'
        }
      />
      <div className="flex max-w-full overflow-x-auto bg-surface rounded-full p-1 mb-4 w-fit" role="tablist" aria-label="Team pages">
        {(
          [
            ['team', 'Team'],
            ['housekeeping', 'Housekeeping'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={page === id}
            onClick={() => onPage(id)}
            className={`px-4 py-2 rounded-full border-0 cursor-pointer text-sm font-semibold shrink-0 whitespace-nowrap ${
              page === id ? 'bg-white text-ink shadow-sm' : 'bg-transparent text-ink-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {page === 'housekeeping' ? (
        <HousekeepingView staffName={staffName} onStaffName={onStaffName} isOwner={isOwner} />
      ) : (
        <TeamManager
          team={team}
          onTeam={onTeam}
          staffName={staffName}
          onStaffName={onStaffName}
          providerNoun={providerNounFor(profile.businessType)}
        />
      )}
    </>
  )
}
