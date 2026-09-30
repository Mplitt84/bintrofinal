import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Activity, Boxes, CalendarDays, Check, Lock, ScanBarcode, Settings, Store, Truck, TriangleAlert, UserPlus, Wallet } from 'lucide-react'
import type { MovementRow, Product, Stats, TeamMember } from '@/components/inventory/types'
import { ScanView } from '@/components/inventory/ScanView'
import { InventoryView } from '@/components/inventory/InventoryView'
import { ActivityView } from '@/components/inventory/ActivityView'
import { RestockView, type RestockMode } from '@/components/inventory/RestockView'
import { CalendarView } from '@/components/business/CalendarView'
import { BudgetView } from '@/components/business/BudgetView'
import { SettingsView, type SettingsSection } from '@/components/business/SettingsView'
import { BusinessProvider } from '@/components/business/BusinessContext'
import { PlanGate } from '@/components/business/PlanGate'
import type { AccountPanel } from '@/components/business/AccountView'
import { planHas, type AccountSummary, type Feature } from '@/lib/plans'
import { getAccount } from '@/server/account.functions'
import { Sheet, Field, SheetActions } from '@/components/ui/Sheet'
import { ToastProvider } from '@/components/ui/Toast'
import { InsightPopup, InsightsBanner, InsightsSheet, type InsightSegment } from '@/components/insights/InsightsSheet'
import { TipBulb, TipNudge, TipSheet, useFreshTip, type TipNavigate } from '@/components/ui/Tips'
import { deriveInitials } from '@/lib/inventory-defaults'
import { displayBusinessName, type BusinessProfile } from '@/lib/business-types'
import type { ProductCategory } from '@/lib/tax-categories'
import { listProducts, getStats, getRecentMovements, getBelowPar } from '@/server/inventory.functions'
import { getInsights } from '@/server/insights.functions'
import type { Insights } from '@/lib/insights'
import { addTeamMember, getBusinessProfile, listProductCategories, listTeamMembers } from '@/server/business.functions'

// Keys predate the Bintro rename; keeping them preserves each device's saved name and order draft.
const STAFF_NAME_KEY = 'shagnoir-staff-name'
const LEGACY_INITIALS_KEY = 'shagnoir-staff-initials'

type Tab = 'scan' | 'products' | 'restock' | 'calendar' | 'budget' | 'activity' | 'settings'

const TABS: { id: Tab; label: string; Icon: typeof ScanBarcode; feature?: Feature }[] = [
  { id: 'scan', label: 'Scan', Icon: ScanBarcode },
  { id: 'products', label: 'Products', Icon: Boxes },
  { id: 'restock', label: 'Restock', Icon: Truck },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays, feature: 'calendar' },
  { id: 'budget', label: 'Budget', Icon: Wallet, feature: 'budget' },
  { id: 'activity', label: 'Activity', Icon: Activity },
]

const TAB_IDS = new Set<string>([...TABS.map((t) => t.id), 'settings'])

/** Reads the tab from the URL hash so refreshes and shared links land in the same place. */
function tabFromHash(hash: string): { tab: Tab; restock?: RestockMode } | null {
  const id = hash.replace(/^#/, '')
  // Old bookmarks from before Below Par and Reorder were merged.
  if (id === 'below-par') return { tab: 'restock', restock: 'below-par' }
  if (id === 'reorder') return { tab: 'restock', restock: 'order' }
  return TAB_IDS.has(id) ? { tab: id as Tab } : null
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const [products, stats, recent, belowPar, profile, team, categories, account] = await Promise.all([
      listProducts(),
      getStats(),
      getRecentMovements({ data: { limit: 25 } }),
      getBelowPar(),
      getBusinessProfile(),
      listTeamMembers(),
      listProductCategories(),
      getAccount(),
    ])
    return { products, stats, recent, belowPar, profile, team, categories, account }
  },
  component: Home,
})

function Home() {
  const initial = Route.useLoaderData()
  const [tab, setTab] = useState<Tab>('scan')
  const [products, setProducts] = useState<Product[]>(initial.products as Product[])
  const [stats, setStats] = useState<Stats>(initial.stats as Stats)
  const [recent, setRecent] = useState<MovementRow[]>(initial.recent as MovementRow[])
  const [belowPar, setBelowPar] = useState<Product[]>(initial.belowPar as Product[])
  const [staffName, setStaffName] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)
  const [staffDraft, setStaffDraft] = useState('')
  const [profile, setProfile] = useState<BusinessProfile>(initial.profile as BusinessProfile)
  const [team, setTeam] = useState<TeamMember[]>(initial.team as TeamMember[])
  const [categories, setCategories] = useState<ProductCategory[]>(initial.categories as ProductCategory[])
  const [restockMode, setRestockMode] = useState<RestockMode>('below-par')
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile')
  const [accountPanel, setAccountPanel] = useState<AccountPanel>('account')
  const [account, setAccount] = useState<AccountSummary>(initial.account as AccountSummary)
  const insightsOn = planHas(account.effectivePlan, 'insights')
  const [notice, setNotice] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [insightSegment, setInsightSegment] = useState<InsightSegment>('fast')
  const [insightPopupShowing, setInsightPopupShowing] = useState(false)
  const { fresh: freshTip, markSeen: markTipSeen } = useFreshTip()
  const businessName = displayBusinessName(profile)

  useEffect(() => {
    const saved =
      window.localStorage.getItem(STAFF_NAME_KEY) ?? window.localStorage.getItem(LEGACY_INITIALS_KEY)
    if (saved) setStaffName(saved)
    setHydrated(true)

    const fromHash = tabFromHash(window.location.hash)
    if (fromHash) {
      setTab(fromHash.tab)
      if (fromHash.restock) setRestockMode(fromHash.restock)
    }
    const onHash = () => {
      const next = tabFromHash(window.location.hash)
      if (next) setTab(next.tab)
    }
    window.addEventListener('hashchange', onHash)

    // Back from a Square / QuickBooks connection: open Settings and say how it went.
    const params = new URLSearchParams(window.location.search)
    const section = params.get('settings')
    if (section) {
      setTab('settings')
      setSettingsSection(
        section === 'integrations' ||
          section === 'categories' ||
          section === 'team' ||
          section === 'import' ||
          section === 'account'
          ? section
          : 'profile',
      )
      const connected = params.get('connected')
      const error = params.get('error')
      const billing = params.get('billing')
      const label = (p: string) => (p.startsWith('square') ? 'Square' : 'QuickBooks')
      // Back from Stripe Checkout.
      if (billing === 'subscribed') setNotice({ tone: 'good', text: `Welcome to Bintro ${params.get('plan') || 'Plus'}. Your plan is active.` })
      else if (billing === 'canceled') setNotice({ tone: 'bad', text: 'Checkout was cancelled. Your plan hasn’t changed.' })
      else if (billing === 'failed') setNotice({ tone: 'bad', text: "We couldn't confirm the payment. Check Billing or try again." })
      else if (error?.endsWith('upgrade'))
        setNotice({ tone: 'bad', text: `${label(error)} comes with ${error.startsWith('square') ? 'Plus' : 'Premium'}. Pick a plan below.` })
      else if (connected) setNotice({ tone: 'good', text: `${label(connected)} is connected.` })
      else if (error?.endsWith('not-configured'))
        setNotice({ tone: 'bad', text: `${label(error)} isn't set up on this site yet. See the steps below.` })
      else if (error?.endsWith('declined')) setNotice({ tone: 'bad', text: `${label(error)} connection was cancelled.` })
      else if (error) setNotice({ tone: 'bad', text: `${label(error)} couldn't connect. Try again.` })
      window.history.replaceState(null, '', `${window.location.pathname}#settings`)
    }
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.title = `Bintro — ${businessName}`
  }, [businessName])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STAFF_NAME_KEY, staffName)
  }, [staffName, hydrated])

  // Insights are computed from the whole movement log, so they load after the page instead of blocking it.
  const loadInsights = useCallback(() => {
    if (!insightsOn) {
      setInsights(null)
      return
    }
    getInsights()
      .then((i) => setInsights(i as Insights))
      .catch(() => {})
  }, [insightsOn])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  function openInsights(segment: InsightSegment) {
    setInsightSegment(segment)
    setInsightsOpen(true)
  }

  async function refresh() {
    loadInsights()
    const [p, s, r, b] = await Promise.all([
      listProducts(),
      getStats(),
      getRecentMovements({ data: { limit: 25 } }),
      getBelowPar(),
    ])
    setProducts(p as Product[])
    setStats(s as Stats)
    setRecent(r as MovementRow[])
    setBelowPar(b as Product[])
    // Usage (products, team) shows on the Account page.
    getAccount()
      .then((acct) => setAccount(acct as AccountSummary))
      .catch(() => {})
  }

  function openStaff() {
    setStaffDraft(staffName)
    setStaffOpen(true)
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault()
    const next = staffDraft.trim().slice(0, 60)
    setStaffName(next)
    setStaffOpen(false)
    // New names join the saved team so they're one tap away next time, on every device.
    if (next && !team.some((m) => m.name.toLowerCase() === next.toLowerCase())) {
      try {
        setTeam((await addTeamMember({ data: { name: next } })) as TeamMember[])
      } catch {
        // Still logged in on this device; the team list can be fixed in Settings.
      }
    }
  }

  function pickStaff(member: string) {
    setStaffName(member)
    setStaffOpen(false)
  }

  function openPlans() {
    setAccountPanel('account')
    openSettings('account')
  }

  function openSettings(section: SettingsSection = 'profile') {
    setSettingsSection(section)
    setStaffOpen(false)
    selectTab('settings')
  }

  function selectTab(next: Tab) {
    setTab(next)
    window.history.replaceState(null, '', `${window.location.pathname}#${next}`)
    window.scrollTo({ top: 0 })
  }

  function openTips() {
    setTipsOpen(true)
    markTipSeen()
  }

  const navigateFromTip: TipNavigate = (next, section) => {
    if (next === 'settings') openSettings(section ?? 'profile')
    else selectTab(next)
  }

  const name = staffName.trim()
  const tabButtons = (layout: 'bar' | 'inline') =>
    TABS.map(({ id, label, Icon, feature }) => {
      const active = tab === id
      const locked = feature ? !planHas(account.effectivePlan, feature) : false
      const badge = id === 'restock' && belowPar.length > 0 ? belowPar.length : null
      return (
        <button
          key={id}
          onClick={() => selectTab(id)}
          aria-current={active ? 'page' : undefined}
          className={
            layout === 'bar'
              ? `relative flex-1 flex flex-col items-center gap-1 pt-2 pb-1.5 px-0.5 border-0 bg-transparent cursor-pointer text-[11px] font-semibold whitespace-nowrap min-w-0 ${
                  active ? 'text-action' : 'text-ink-2'
                }`
              : `relative flex items-center gap-2 px-3.5 py-2 rounded-full border-0 cursor-pointer text-sm font-semibold ${
                  active ? 'bg-action-tint text-action' : 'bg-transparent text-ink-2 hover:bg-surface'
                }`
          }
        >
          <span
            className={
              layout === 'bar'
                ? `relative grid place-items-center w-12 h-8 rounded-full transition-colors ${active ? 'bg-action-tint' : ''}`
                : 'relative grid place-items-center'
            }
          >
            <Icon size={layout === 'bar' ? 22 : 18} strokeWidth={active ? 2.4 : 2} />
            {locked && (
              <span className="absolute -top-1 -right-1.5 w-[16px] h-[16px] rounded-full bg-gold text-white grid place-items-center">
                <Lock size={9} strokeWidth={3} />
                <span className="sr-only"> (upgrade)</span>
              </span>
            )}
            {badge !== null && (
              <span className="num absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-bad text-white text-[11px] leading-[18px] font-bold text-center">
                {badge}
              </span>
            )}
          </span>
          {label}
          {active && layout === 'bar' && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-b-full bg-gold" aria-hidden="true" />
          )}
        </button>
      )
    })

  return (
    <BusinessProvider
      profile={profile}
      categories={categories}
      onCategories={setCategories}
      account={account}
      onAccount={setAccount}
      openPlans={openPlans}
    >
    <ToastProvider>
      <div className="min-h-dvh bg-page text-ink">
        <header className="sticky top-0 z-30 bg-page/95 backdrop-blur pt-[env(safe-area-inset-top)]">
          <div className="max-w-[1100px] mx-auto px-4 h-16 flex items-center gap-2 min-[420px]:gap-3">
            <div className="flex items-center gap-2.5 mr-auto">
              <span className="brand-tile w-9 h-9 rounded-[11px] text-white grid place-items-center" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16" />
                  <path d="M9 7V4.5h6V7" />
                  <path d="M6 7l1 13h10l1-13" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
              </span>
              <span className="text-[22px] font-extrabold tracking-tight text-royal max-[389px]:hidden">
                Bintro<span className="text-gold">.</span>
              </span>
            </div>

            <nav className="hidden min-[1060px]:flex items-center gap-1" aria-label="Sections">
              {tabButtons('inline')}
            </nav>

            <TipBulb onClick={openTips} fresh={freshTip} />

            <button
              onClick={() => openSettings('profile')}
              className={`w-10 h-10 rounded-full grid place-items-center border-0 cursor-pointer shrink-0 ${
                tab === 'settings' ? 'bg-action-tint text-action' : 'bg-surface text-ink-2 hover:bg-surface-2'
              }`}
              aria-label="Settings: business profile, team, inventory import and connections"
              aria-current={tab === 'settings' ? 'page' : undefined}
            >
              <Settings size={20} />
            </button>

            <button
              onClick={openStaff}
              className="flex items-center gap-2 bg-surface rounded-full pl-1 pr-3.5 py-1 border-0 cursor-pointer max-w-[210px] min-w-0"
              aria-label={name ? `Working as ${name}. Change` : "Set who's working"}
            >
              <span className="brand-tile w-8 h-8 rounded-full text-white text-[13px] font-bold grid place-items-center shrink-0">
                {deriveInitials(name || businessName) || 'B'}
              </span>
              <span className="flex flex-col items-start leading-tight min-w-0">
                <span className="text-[13px] font-semibold truncate max-w-[150px]">{name || businessName}</span>
                <span className="text-[11px] text-ink-2 truncate max-w-[150px]">
                  {name ? businessName : 'Tap to add your name'}
                </span>
              </span>
            </button>
          </div>
          <div className="royal-rule opacity-80" aria-hidden="true" />
        </header>

        <main className="max-w-[1100px] mx-auto px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] min-[1060px]:pb-12">
          {!profile.name.trim() && tab !== 'settings' && (
            <button
              onClick={() => openSettings('profile')}
              className="w-full text-left flex items-center gap-3 bg-action-tint text-action rounded-2xl px-4 py-3 mb-4 border-0 cursor-pointer"
            >
              <Store size={20} className="shrink-0" />
              <span className="text-sm text-ink">
                <b>Make Bintro yours.</b> Add your business name, type and contact details — it takes a minute.
              </span>
            </button>
          )}
          {hydrated && !name && tab !== 'settings' && (
            <button
              onClick={openStaff}
              className="w-full text-left flex items-center gap-3 bg-warn-tint text-warn rounded-2xl px-4 py-3 mb-4 border-0 cursor-pointer"
            >
              <TriangleAlert size={20} className="shrink-0" />
              <span className="text-sm">
                <b>Who's working?</b> Add your name so scans, edits and emails are logged under you.
              </span>
            </button>
          )}

          {tab === 'scan' && (
            <ScanView
              staffName={staffName}
              recent={recent}
              products={products}
              belowParCount={belowPar.length}
              onChanged={refresh}
              onOpenRestock={() => {
                setRestockMode('below-par')
                selectTab('restock')
              }}
            />
          )}
          {tab === 'products' && (
            <InventoryView products={products} stats={stats} staffName={staffName} onChanged={refresh} />
          )}
          {tab === 'activity' && (
            <>
              <InsightsBanner insights={insights} onOpen={openInsights} />
              <ActivityView recent={recent} />
            </>
          )}
          {tab === 'budget' && (
            <PlanGate feature="budget">
              <BudgetView staffName={staffName} recent={recent} onOpenSettings={() => openSettings('integrations')} />
            </PlanGate>
          )}
          {tab === 'settings' && (
            <SettingsView
              section={settingsSection}
              onSection={setSettingsSection}
              accountPanel={accountPanel}
              onAccountPanel={setAccountPanel}
              profile={profile}
              onProfile={setProfile}
              team={team}
              onTeam={setTeam}
              products={products}
              staffName={staffName}
              onStaffName={setStaffName}
              notice={notice}
              onDismissNotice={() => setNotice(null)}
              onChanged={refresh}
            />
          )}
          {tab === 'restock' && <InsightsBanner insights={insights} onOpen={openInsights} />}
          {tab === 'restock' && (
            <RestockView
              mode={restockMode}
              onMode={setRestockMode}
              items={belowPar}
              staffName={staffName}
              onChanged={refresh}
            />
          )}
          {tab === 'calendar' && (
            <PlanGate feature="calendar">
              <CalendarView belowPar={belowPar} staffName={staffName} />
            </PlanGate>
          )}
        </main>

        <nav
          className="min-[1060px]:hidden fixed bottom-0 inset-x-0 z-30 bg-page/95 backdrop-blur border-t border-line flex pb-[env(safe-area-inset-bottom)] print:hidden shadow-[0_-6px_20px_-12px_rgba(13,27,82,0.25)]"
          aria-label="Sections"
        >
          {tabButtons('bar')}
        </nav>

        <TipNudge
          tab={tab}
          enabled={freshTip && !insightPopupShowing}
          onSeen={markTipSeen}
          onOpenAll={() => setTipsOpen(true)}
          onNavigate={navigateFromTip}
        />
        <InsightPopup insights={insights} onOpen={openInsights} onVisible={setInsightPopupShowing} />
        <InsightsSheet
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          insights={insights}
          segment={insightSegment}
          onSegment={setInsightSegment}
          onChanged={refresh}
          onOpenRestock={() => {
            setInsightsOpen(false)
            setRestockMode('order')
            selectTab('restock')
          }}
        />
        <TipSheet open={tipsOpen} onClose={() => setTipsOpen(false)} tab={tab} onNavigate={navigateFromTip} />

        <Sheet
          open={staffOpen}
          onClose={() => setStaffOpen(false)}
          title="Who's working?"
          subtitle="Scans, stock edits and expenses are logged under this name on this device."
        >
          {team.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Team members">
              {team.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="chip flex items-center gap-2 !pl-1.5"
                  aria-pressed={m.name === name}
                  onClick={() => pickStaff(m.name)}
                >
                  <span className="w-7 h-7 rounded-full bg-action text-white text-[12px] font-bold grid place-items-center">
                    {deriveInitials(m.name)}
                  </span>
                  {m.name}
                  {m.name === name && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={saveStaff}>
            <Field label={team.length ? 'Someone new' : 'Your name'} htmlFor="staff-name">
              <input
                id="staff-name"
                value={staffDraft}
                onChange={(e) => setStaffDraft(e.target.value.slice(0, 60))}
                placeholder="Type a name"
                autoComplete="name"
                autoFocus={team.length === 0}
                className="field-input"
              />
            </Field>
            <p className="text-ink-2 text-[13px] m-0">New names are saved to your team list for next time.</p>
            <SheetActions>
              <button type="button" className="btn btn-tonal" onClick={() => openSettings('team')}>
                Manage team
              </button>
              <button type="submit" className="btn btn-primary" disabled={!staffDraft.trim()}>
                <UserPlus size={18} />
                Save
              </button>
            </SheetActions>
          </form>
        </Sheet>
      </div>
    </ToastProvider>
    </BusinessProvider>
  )
}
