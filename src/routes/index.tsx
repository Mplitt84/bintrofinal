import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Boxes, CalendarDays, Lock, ScanBarcode, Settings, Store, Truck, TriangleAlert, Wallet } from 'lucide-react'
import type { MovementRow, Product, TeamMember } from '@/components/inventory/types'
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
import { StaffPicker, type StaffPrompt } from '@/components/inventory/StaffPicker'
import { ToastProvider } from '@/components/ui/Toast'
import { InsightPopup, InsightsBanner, InsightsSheet, type InsightSegment } from '@/components/insights/InsightsSheet'
import { TipBulb, TipNudge, TipSheet, useFreshTip, type TipNavigate } from '@/components/ui/Tips'
import { deriveInitials, selectBelowPar, stockStats } from '@/lib/inventory-defaults'
import { paletteStyle } from '@/lib/palettes'
import { reconnectSavedBluetoothScanner } from '@/lib/bluetooth-scanner'
import { displayBusinessName, type BusinessProfile } from '@/lib/business-types'
import type { ProductCategory } from '@/lib/tax-categories'
import { listProducts, getRecentMovements } from '@/server/inventory.functions'
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
    const [products, recent, profile, team, categories, account] = await Promise.all([
      listProducts(),
      getRecentMovements({ data: { limit: 25 } }),
      getBusinessProfile(),
      listTeamMembers(),
      listProductCategories(),
      getAccount(),
    ])
    return { products, recent, profile, team, categories, account }
  },
  component: Home,
})

function Home() {
  const initial = Route.useLoaderData()
  const [tab, setTab] = useState<Tab>('scan')
  const [products, setProducts] = useState<Product[]>(initial.products as Product[])
  const [recent, setRecent] = useState<MovementRow[]>(initial.recent as MovementRow[])
  // Restock and the stat tiles come from the same list the Products tab shows, so every
  // scan or edit moves all of them together.
  const belowPar = useMemo(() => selectBelowPar(products), [products])
  const stats = useMemo(() => stockStats(products), [products])
  const refreshSeq = useRef(0)
  const [staffName, setStaffName] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [staffPrompt, setStaffPrompt] = useState<StaffPrompt | null>(null)
  const staffResolver = useRef<((name: string | null) => void) | null>(null)
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
    reconnectSavedBluetoothScanner().catch(() => {})

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
          section === 'account' ||
          section === 'appearance' ||
          section === 'scanner'
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

  // The palette goes on <html> too so sheets and pop-ups (portalled to <body>) pick it up.
  const palette = paletteStyle(profile.palette)
  useEffect(() => {
    const root = document.documentElement
    for (const [key, value] of Object.entries(palette)) root.style.setProperty(key, value)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette['--color-page'])
  }, [profile.palette])

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

  /** Drops a just-saved product into the list right away, before the full refresh lands. */
  const applyProduct = useCallback((next: Product | null | undefined) => {
    if (!next) return
    setProducts((current) => {
      const found = current.some((p) => p.id === next.id)
      const merged = found ? current.map((p) => (p.id === next.id ? next : p)) : [...current, next]
      return found ? merged : merged.sort((a, b) => a.name.localeCompare(b.name))
    })
  }, [])

  /**
   * Re-reads products and the recent feed. Each part updates on its own so one slow or
   * failed call never leaves the rest stale, and only the newest refresh is applied so an
   * older response can't overwrite a newer scan.
   */
  const refresh = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      const seq = ++refreshSeq.current
      if (!quiet) loadInsights()
      const [p, r] = await Promise.allSettled([listProducts(), getRecentMovements({ data: { limit: 25 } })])
      if (seq !== refreshSeq.current) return
      if (p.status === 'fulfilled') setProducts(p.value as Product[])
      if (r.status === 'fulfilled') setRecent(r.value as MovementRow[])
      if (quiet) return
      // Usage (products, team) shows on the Account page.
      getAccount()
        .then((acct) => setAccount(acct as AccountSummary))
        .catch(() => {})
    },
    [loadInsights],
  )

  // Other devices, the Square sync and imports change stock too: catch up when the app
  // comes back to the foreground and every 30 seconds while it's open.
  useEffect(() => {
    const catchUp = () => {
      if (document.visibilityState === 'visible') refresh({ quiet: true }).catch(() => {})
    }
    const timer = window.setInterval(catchUp, 30_000)
    document.addEventListener('visibilitychange', catchUp)
    window.addEventListener('focus', catchUp)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', catchUp)
      window.removeEventListener('focus', catchUp)
    }
  }, [refresh])

  // Opening Restock always pulls fresh counts, so changes made on another device show up too.
  useEffect(() => {
    if (tab === 'restock') refresh({ quiet: true }).catch(() => {})
  }, [tab, refresh])

  /** Opens the centered name picker; resolves with the picked name, or null if it was closed. */
  const askStaff = useCallback((prompt: StaffPrompt = {}) => {
    staffResolver.current?.(null)
    setStaffPrompt(prompt)
    return new Promise<string | null>((resolve) => {
      staffResolver.current = resolve
    })
  }, [])

  function closeStaff(picked: string | null) {
    setStaffPrompt(null)
    const resolve = staffResolver.current
    staffResolver.current = null
    resolve?.(picked)
  }

  async function pickStaff(member: string) {
    const existing = team.find((m) => m.name.toLowerCase() === member.toLowerCase())
    const next = existing?.name ?? member
    setStaffName(next)
    closeStaff(next)
    // New names join the saved team so they're one tap away next time, on every device.
    if (!existing) {
      try {
        setTeam((await addTeamMember({ data: { name: next } })) as TeamMember[])
      } catch {
        // Still logged in on this device; the team list can be fixed in Settings.
      }
    }
  }

  function openStaff() {
    askStaff()
  }

  function openPlans() {
    setAccountPanel('account')
    openSettings('account')
  }

  function openSettings(section: SettingsSection = 'profile') {
    setSettingsSection(section)
    closeStaff(null)
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
      <div className="min-h-dvh bg-page text-ink" style={palette as React.CSSProperties}>
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
              askStaff={askStaff}
              recent={recent}
              products={products}
              belowParCount={belowPar.length}
              onProduct={applyProduct}
              onChanged={refresh}
              onOpenRestock={() => {
                setRestockMode('below-par')
                selectTab('restock')
              }}
            />
          )}
          {tab === 'products' && (
            <InventoryView
              products={products}
              stats={stats}
              staffName={staffName}
              onProduct={applyProduct}
              onChanged={refresh}
            />
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
              products={products}
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
          className="min-[1060px]:hidden fixed bottom-0 inset-x-0 z-30 bg-page/95 backdrop-blur border-t border-line flex pb-[env(safe-area-inset-bottom)] print:hidden shadow-[0_-6px_20px_-12px_color-mix(in_srgb,var(--color-royal)_25%,transparent)]"
          aria-label="Sections"
        >
          {tabButtons('bar')}
        </nav>

        <TipNudge
          tab={tab}
          enabled={!insightPopupShowing}
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

        <StaffPicker
          open={staffPrompt !== null}
          prompt={staffPrompt ?? {}}
          team={team}
          current={name}
          onPick={pickStaff}
          onClose={() => closeStaff(null)}
          onManageTeam={() => openSettings('team')}
        />
      </div>
    </ToastProvider>
    </BusinessProvider>
  )
}
