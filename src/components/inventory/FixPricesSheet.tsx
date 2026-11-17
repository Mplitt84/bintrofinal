import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { useMoney } from '@/components/business/BusinessContext'
import type { PriceFixGroup } from '@/lib/invoice-fixes'
import { applyPriceFixesFn, getPriceFixes } from '@/server/price-watch.functions'

type Data = { groups: PriceFixGroup[]; checked: number; evidence: number }
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/**
 * Products → Fix prices: every cost that doesn't match what an invoice charged, by
 * product line. A product with its own invoice price gets that; the rest of its line
 * gets the line's newest invoice price. Tick, Fix all, Undo from the toast.
 */
export function FixPricesSheet({
  open,
  onClose,
  onDone,
  onUploadInvoice,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void | Promise<void>
  onUploadInvoice: () => void
}) {
  const toast = useToast()
  const { money } = useMoney()
  const [data, setData] = useState<Data | null>(null)
  const [off, setOff] = useState<Set<number>>(new Set())
  const [openLine, setOpenLine] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setData(null)
    try {
      const d = (await getPriceFixes()) as Data
      setData(d)
      // Unsure suggestions (invoices in the line disagree) start unticked.
      setOff(new Set(d.groups.flatMap((g) => g.fixes.filter((f) => !f.sure).map((f) => f.productId))))
      setOpenLine(d.groups[0]?.line ?? null)
    } catch {
      setData({ groups: [], checked: 0, evidence: 0 })
    }
  }
  useEffect(() => {
    if (open) load()
  }, [open])

  const all = data?.groups.flatMap((g) => g.fixes) ?? []
  const ticked = all.filter((f) => !off.has(f.productId))
  const toggle = (ids: number[], on: boolean) =>
    setOff((s) => {
      const n = new Set(s)
      ids.forEach((id) => (on ? n.delete(id) : n.add(id)))
      return n
    })

  async function fix() {
    if (ticked.length === 0) return
    setSaving(true)
    try {
      const before = await applyPriceFixesFn({ data: { items: ticked.map((f) => ({ productId: f.productId, cents: f.cents })) } })
      await onDone()
      toast(`Fixed ${before.length} price${before.length === 1 ? '' : 's'} from your invoices`, async () => {
        if (before.length) await applyPriceFixesFn({ data: { items: before, undo: true } })
        await onDone()
        await load()
      })
      await load()
    } catch {
      toast("Couldn't save those. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Fix prices from invoices"
      subtitle="Costs that were guessed get corrected to what your invoices actually charged, and every shade in the same line follows."
    >
      {!data ? (
        <div className="grid gap-2">
          <div className="skel h-16 rounded-xl" />
          <div className="skel h-16 rounded-xl" />
        </div>
      ) : data.evidence === 0 ? (
        <div className="grid gap-3">
          <p className="m-0 text-sm">
            Bintro doesn't have any invoice prices yet. Upload one or two invoices from each supplier and this screen will fix every guessed price they cover, plus the rest of each line.
          </p>
          <button type="button" className="btn btn-primary" onClick={onUploadInvoice}>
            Upload an invoice
          </button>
        </div>
      ) : all.length === 0 ? (
        <div className="grid gap-3">
          <p className="m-0 text-sm text-good font-semibold">Every price matches your invoices.</p>
          <p className="m-0 text-[12px] text-ink-2">
            Checked against invoice prices for {data.evidence} product{data.evidence === 1 ? '' : 's'}. Products in lines no invoice has covered yet aren't checked — upload an invoice to cover them.
          </p>
          <button type="button" className="btn btn-tonal btn-sm" onClick={onUploadInvoice}>
            Upload another invoice
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-2xl bg-warn-tint p-3 text-sm">
            <b>
              {all.length} price{all.length === 1 ? '' : 's'} don't match your invoices
            </b>
            <span className="block text-[12px] text-ink-2">
              In {data.groups.length} product line{data.groups.length === 1 ? '' : 's'}. From invoice prices for {data.evidence} product{data.evidence === 1 ? '' : 's'}.
            </span>
          </div>

          <ul className="list-none m-0 p-0 grid gap-2">
            {data.groups.map((g) => {
              const ids = g.fixes.map((f) => f.productId)
              const on = ids.filter((id) => !off.has(id)).length
              const isOpen = openLine === g.line
              const newest = g.fixes.reduce((a, b) => (b.at > a.at ? b : a))
              return (
                <li key={g.line} className="rounded-2xl border border-line">
                  <div className="flex items-center gap-2 p-3">
                    <input
                      type="checkbox"
                      aria-label={`Fix all in ${g.line}`}
                      checked={on === ids.length}
                      ref={(el) => {
                        if (el) el.indeterminate = on > 0 && on < ids.length
                      }}
                      onChange={(e) => toggle(ids, e.target.checked)}
                    />
                    <button type="button" className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer" onClick={() => setOpenLine(isOpen ? null : g.line)}>
                      <b className="block text-sm truncate">{g.line}</b>
                      <span className="text-[12px] text-ink-2">
                        {on} of {ids.length} · invoice {money(newest.cents)}
                        {newest.vendor ? ` from ${newest.vendor}` : ''}, {shortDate(newest.at)}
                      </span>
                      {newest.old && (
                        <span className="block text-[12px] text-bad font-semibold">Old invoice — prices may have gone up since. Upload a recent one to be sure.</span>
                      )}
                    </button>
                    <ChevronDown size={18} className={`text-ink-2 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isOpen && (
                    <ul className="list-none m-0 px-3 pb-3 grid gap-1">
                      {g.fixes.map((f) => (
                        <li key={f.productId}>
                          <label className="flex items-start gap-2.5 text-sm cursor-pointer py-1">
                            <input type="checkbox" className="mt-1" checked={!off.has(f.productId)} onChange={(e) => toggle([f.productId], e.target.checked)} />
                            <span className="flex-1 min-w-0">
                              <span className="block break-words">
                                {f.name}
                                {f.size ? <span className="text-ink-2"> · {f.size}</span> : null}
                              </span>
                              <span className="text-[12px] text-ink-2">
                                {f.currentCents ? money(f.currentCents) : 'No cost'} → <b className="text-ink">{money(f.cents)}</b> · {f.reason}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="m-0 text-[12px] text-ink-2">
            Only costs change, never stock or retail. Shades whose invoice shows their own price keep it. Lines whose invoices disagree, or whose newest invoice is more than 6 months old, start unticked so you can check.
          </p>
        </div>
      )}

      {data && all.length > 0 && (
        <SheetActions>
          <button type="button" className="btn btn-text" onClick={onUploadInvoice}>
            Upload invoice
          </button>
          <button type="button" className="btn btn-primary" disabled={saving || ticked.length === 0} onClick={fix}>
            {saving ? 'Fixing…' : `Fix ${ticked.length} price${ticked.length === 1 ? '' : 's'}`}
          </button>
        </SheetActions>
      )}
    </Sheet>
  )
}
