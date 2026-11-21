import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, Store } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { useBusiness, useMoney } from '@/components/business/BusinessContext'
import { timeAgo } from '@/components/ui/bits'
import { BUYING_PREFERENCES, SELLER_LABEL, type BetterPricesState, type BuyingPreference } from '@/lib/better-prices'
import { dismissOffer, getBetterPrices, scanPricesNow, setBuyingPreference, switchSeller, undoSwitchSeller } from '@/server/better-prices.functions'

type State = BetterPricesState & { canScan?: boolean }

/**
 * Better prices: cheaper places to buy what the shop already stocks, found by the weekly
 * scan (and "Check now"). The shop says how it likes to buy; marketplaces are only ever
 * offered for supplies, and only to shops that buy there. Switching changes the product's
 * supplier and cost (Undo puts them back); nothing is ordered.
 */
export function BetterPricesSheet({ open, onClose, staffName, onChanged }: { open: boolean; onClose: () => void; staffName: string; onChanged?: () => void | Promise<void> }) {
  const toast = useToast()
  const { can } = useBusiness()
  const { money } = useMoney()
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    getBetterPrices()
      .then((s) => setState(s as State))
      .catch(() => setState(null))

  useEffect(() => {
    if (open) load()
  }, [open])

  async function pickPref(preference: BuyingPreference) {
    if (state?.preference === preference) return
    setBusy('pref')
    try {
      setState({ ...(await setBuyingPreference({ data: { preference } })), canScan: state?.canScan })
      toast(preference === 'local' ? 'Got it. Amazon, Walmart and Target are off the list.' : 'Saved. The next check uses it.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save that.')
    } finally {
      setBusy(null)
    }
  }

  async function scan() {
    setBusy('scan')
    try {
      const r = await scanPricesNow()
      if (!r.ok) return toast(r.message)
      setState({ ...r.state, canScan: true })
      const { checked, found, failed } = r.run
      toast(
        checked === 0 && failed === 0
          ? 'Everything was checked this week. The next check is Wednesday.'
          : failed && !checked
            ? "The price search isn't answering right now. Try again later."
            : `Checked ${checked} product${checked === 1 ? '' : 's'} · ${found ? `${found} cheaper offer${found === 1 ? '' : 's'}` : 'nothing cheaper'}`,
      )
    } finally {
      setBusy(null)
    }
  }

  async function doSwitch(id: number, seller: string, product: string) {
    setBusy(`s${id}`)
    try {
      const r = await switchSeller({ data: { id, staffName } })
      if (!r.ok) return toast(r.message)
      setState({ ...r.state, canScan: state?.canScan })
      await onChanged?.()
      toast(`${product} now comes from ${seller}`, async () => {
        setState({ ...(await undoSwitchSeller({ data: { id, before: r.before } })), canScan: state?.canScan })
        await onChanged?.()
      })
    } finally {
      setBusy(null)
    }
  }

  async function dismiss(id: number) {
    setBusy(`d${id}`)
    try {
      setState({ ...(await dismissOffer({ data: { id, staffName } })), canScan: state?.canScan })
      toast('Hidden. It won’t be offered again.', async () => {
        setState({ ...(await dismissOffer({ data: { id, undo: true, staffName } })), canScan: state?.canScan })
      })
    } finally {
      setBusy(null)
    }
  }

  // Group offers by product so a product with 3 sellers reads as one card.
  const groups = new Map<number, NonNullable<State>['offers']>()
  for (const o of state?.offers ?? []) groups.set(o.productId, [...(groups.get(o.productId) ?? []), o])

  return (
    <Sheet open={open} onClose={onClose} title="Better prices" subtitle="Bintro checks what you stock against other sellers every week and shows where the same product costs less.">
      {!state ? (
        <div className="grid gap-2">
          <div className="skel h-20 rounded-xl" />
          <div className="skel h-20 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4">
          <section>
            <span className="block text-sm font-semibold mb-1.5">How you like to buy</span>
            <div className="grid gap-1.5" role="radiogroup" aria-label="How you like to buy">
              {BUYING_PREFERENCES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={state.preference === p.id}
                  disabled={busy === 'pref'}
                  onClick={() => pickPref(p.id)}
                  className={`text-left rounded-xl border p-2.5 ${state.preference === p.id ? 'border-action bg-surface' : 'border-line bg-white'}`}
                >
                  <b className="text-sm">{p.label}</b>
                  <span className="block text-[12px] text-ink-2">{p.detail}</span>
                </button>
              ))}
            </div>
            <p className="m-0 mt-1.5 text-[12px] text-ink-2">Color, backbar and retail products are only ever checked against pro suppliers.</p>
          </section>

          <section className="rounded-2xl bg-good-tint p-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[10rem]">
              <div className="text-[12px] text-ink-2">You could save</div>
              <div className="text-xl font-bold">
                {money(state.monthlySavingCents)}
                <span className="text-sm font-normal text-ink-2"> a month</span>
              </div>
              <div className="text-[12px] text-ink-2">
                At what you used the last 30 days ·{' '}
                {state.lastScanAt ? `last checked ${timeAgo(state.lastScanAt)}` : 'not checked yet'}
              </div>
            </div>
            {state.canScan !== false && can('ai') ? (
              <button type="button" className="btn btn-tonal btn-sm" disabled={busy === 'scan'} onClick={scan}>
                <RefreshCw size={14} className={busy === 'scan' ? 'animate-spin' : ''} /> {busy === 'scan' ? 'Checking… (about a minute)' : 'Check now'}
              </button>
            ) : (
              <span className="text-[12px] text-ink-2">Price checks come with Plus.</span>
            )}
          </section>

          {state.missingCost > 0 && (
            <p className="m-0 text-[12px] text-ink-2">
              {state.missingCost} product{state.missingCost === 1 ? ' has' : 's have'} no cost yet, so there's nothing to compare. Add costs under Products → Missing costs.
            </p>
          )}

          {groups.size === 0 ? (
            <p className="m-0 text-sm text-ink-2">
              {state.lastScanAt ? 'No cheaper sellers right now. Bintro checks again every Wednesday.' : 'Tap Check now, or wait for Wednesday’s check.'}
            </p>
          ) : (
            <ul className="list-none m-0 p-0 grid gap-2.5">
              {[...groups.values()].map((offers) => {
                const first = offers[0]
                return (
                  <li key={first.productId} className="rounded-2xl border border-line p-3">
                    <div className="text-sm font-semibold break-words">{first.productName}</div>
                    <div className="text-[12px] text-ink-2">
                      {[first.brand, first.size].filter(Boolean).join(' · ')}
                      {first.brand || first.size ? ' · ' : ''}
                      Now {money(first.currentCostCents)} {first.currentVendor ? `from ${first.currentVendor}` : ''}
                      {first.out30 ? ` · ${first.out30} used last 30 days` : ''}
                    </div>
                    <ul className="list-none m-0 p-0 mt-2 grid gap-2">
                      {offers.map((o) => (
                        <li key={o.id} className="rounded-xl bg-surface p-2.5">
                          <div className="flex items-start gap-2">
                            <Store size={16} className="mt-0.5 text-ink-2 shrink-0" />
                            <div className="flex-1 min-w-0 text-sm">
                              <b>{o.sellerName}</b> <span className="text-[12px] text-ink-2">· {SELLER_LABEL[o.sellerType]}</span>
                              <div>
                                {money(o.unitCostCents)} each ·{' '}
                                <b className="text-good">
                                  save {money(o.savingPerUnitCents)} ({o.savingPct}%)
                                </b>
                                {o.monthlySavingCents > 0 && <span className="text-ink-2"> · about {money(o.monthlySavingCents)}/month</span>}
                              </div>
                              {o.note && <div className="text-[12px] text-ink-2">{o.note}</div>}
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-wrap mt-2">
                            <a href={o.sellerUrl} target="_blank" rel="noreferrer" className="btn btn-tonal btn-sm">
                              See it <ExternalLink size={13} />
                            </a>
                            <button type="button" className="btn btn-primary btn-sm" disabled={busy === `s${o.id}`} onClick={() => doSwitch(o.id, o.sellerName, o.productName)}>
                              Switch to {o.sellerName}
                            </button>
                            <button type="button" className="btn btn-text btn-sm" disabled={busy === `d${o.id}`} onClick={() => dismiss(o.id)}>
                              Not for us
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="m-0 text-[12px] text-ink-2">
            Prices are what each seller lists online; some need a pro account. Check the page before you order. Switching changes the supplier and cost in Bintro so your next order goes to them. It doesn't buy anything.
          </p>
        </div>
      )}
    </Sheet>
  )
}
