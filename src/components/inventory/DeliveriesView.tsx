import { useCallback, useEffect, useState } from 'react'
import { PackagePlus, Truck } from 'lucide-react'
import { ToolButton } from '@/components/ui/ToolButton'
import type { Product } from './types'
import { EmptyState, PageHead, StatGrid, StatTile, centsToDollars, timeAgo } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { cancelSavedOrder, getOrders } from '@/server/orders.functions'
import type { OrdersOverview, SavedOrder } from '@/lib/orders'
import { ReceiveDeliverySheet } from './ReceiveDeliverySheet'

function orderUnits(o: SavedOrder) {
  return o.lines.reduce((s, l) => s + l.qtyOrdered, 0)
}
function orderLeft(o: SavedOrder) {
  return o.lines.reduce((s, l) => s + Math.max(0, l.qtyOrdered - l.qtyReceived), 0)
}
function orderCost(o: SavedOrder) {
  return o.lines.reduce((s, l) => s + l.qtyOrdered * l.unitCostCents, 0)
}

/**
 * Restock step 3: orders that went out, waiting to be checked in. Staff check a
 * delivery in from the invoice photo / PDF or by hand; shortages stay on order and
 * every vendor gets an accuracy score (fill rate, price changes, days to arrive).
 */
export function DeliveriesView({
  products,
  staffName,
  onChanged,
  autoReceive,
  onAutoReceiveHandled,
}: {
  products: Product[]
  staffName: string
  onChanged: () => void | Promise<void>
  /** Open the "Receive a delivery" sheet straight away (from the Scan tab button). */
  /** true, or a receipt photo from Snap & log to read right away. */
  autoReceive?: boolean | File
  onAutoReceiveHandled?: () => void
}) {
  const toast = useToast()
  const [data, setData] = useState<OrdersOverview | null>(null)
  const [receiving, setReceiving] = useState<{ order: SavedOrder | null; file?: File | null } | null>(null)
  const [armedCancel, setArmedCancel] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await getOrders())
    } catch {
      setData((d) => d ?? { open: [], done: [], onOrder: {}, vendors: [] })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (autoReceive) {
      setReceiving({ order: null, file: autoReceive instanceof File ? autoReceive : null })
      onAutoReceiveHandled?.()
    }
  }, [autoReceive, onAutoReceiveHandled])

  async function cancel(order: SavedOrder) {
    if (armedCancel !== order.id) {
      setArmedCancel(order.id)
      return
    }
    setArmedCancel(null)
    setData(await cancelSavedOrder({ data: { orderId: order.id } }))
    toast(`Canceled the ${order.vendor} order`)
  }

  const open = data?.open ?? []
  const unitsOnOrder = open.reduce((s, o) => s + orderLeft(o), 0)
  const valueOnOrder = open.reduce((s, o) => s + orderCost(o), 0)

  return (
    <div>
      <PageHead
        title="Deliveries"
        lead="Orders you've sent, waiting to arrive. Check each delivery in from the invoice in seconds."
        action={<ToolButton icon={<PackagePlus size={24} />} tone="green" label="Receive delivery" onClick={() => setReceiving({ order: null })} />}
      />

      <StatGrid>
        <StatTile label="Open orders" value={open.length} />
        <StatTile label="Units on order" value={unitsOnOrder} />
        <StatTile label="Value on order" value={`$${centsToDollars(valueOnOrder)}`} />
        <StatTile label="Vendors scored" value={data?.vendors.length ?? 0} />
      </StatGrid>

      <h2 className="text-lg font-bold mt-2 mb-2.5">Waiting to arrive</h2>
      {!data ? (
        <div className="bg-surface rounded-2xl p-4">
          <div className="skel w-[60%]" />
        </div>
      ) : open.length === 0 ? (
        <EmptyState title="No open orders">
          When you email, print or download an order in Build order, it's saved here so you can check the delivery in
          against it.
        </EmptyState>
      ) : (
        <ul className="list-none m-0 p-0 grid gap-2.5">
          {open.map((o) => (
            <li key={o.id} className="bg-surface rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Truck size={20} className="text-action mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{o.vendor}</div>
                  <div className="text-[13px] text-ink-2">
                    Ordered {timeAgo(o.createdAt)} · {o.lines.length} item{o.lines.length === 1 ? '' : 's'} · {orderUnits(o)} units
                    {o.staffName ? ` · by ${o.staffName}` : ''}
                  </div>
                  {o.status === 'partial' && (
                    <div className="text-[13px] text-warn font-semibold mt-0.5">
                      Part received · {orderLeft(o)} unit{orderLeft(o) === 1 ? '' : 's'} still to come
                    </div>
                  )}
                  <div className="text-[12px] text-ink-2 mt-1 line-clamp-2">
                    {o.lines.map((l) => `${l.qtyOrdered - l.qtyReceived}× ${l.name}`).join(' · ')}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="btn btn-primary btn-sm" onClick={() => setReceiving({ order: o })}>
                  Check in delivery
                </button>
                <button className="btn btn-text btn-sm" onClick={() => cancel(o)}>
                  {armedCancel === o.id ? 'Tap again to cancel order' : 'Cancel order'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.vendors.length > 0 && (
        <>
          <h2 className="text-lg font-bold mt-6 mb-1">Vendor accuracy</h2>
          <p className="text-[13px] text-ink-2 mt-0 mb-2.5">From every delivery checked in: how much of what you ordered arrived, price surprises and how long it took.</p>
          <ul className="list-none m-0 p-0">
            {data.vendors.map((v) => {
              const pct = Math.round(v.fillRate * 100)
              const tone = pct >= 98 ? 'text-good' : pct >= 90 ? 'text-warn' : 'text-bad'
              return (
                <li key={v.vendor} className="flex items-center gap-3 py-3 border-b border-line last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{v.vendor}</div>
                    <div className="text-[13px] text-ink-2">
                      {v.orders} deliver{v.orders === 1 ? 'y' : 'ies'}
                      {v.avgDays !== null && ` · ${v.avgDays} day${v.avgDays === 1 ? '' : 's'} to arrive`}
                      {v.shortLines > 0 && ` · ${v.shortLines} short line${v.shortLines === 1 ? '' : 's'}`}
                      {v.priceChanges > 0 && ` · ${v.priceChanges} price change${v.priceChanges === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <b className={`num text-lg ${tone}`}>{pct}%</b>
                    <div className="text-[11px] text-ink-2">filled</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {data && data.done.length > 0 && (
        <>
          <h2 className="text-lg font-bold mt-6 mb-2.5">Recently received</h2>
          <ul className="list-none m-0 p-0">
            {data.done.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0 text-sm">
                <span className="flex-1 min-w-0 truncate">
                  <b>{o.vendor}</b> · {o.lines.length} item{o.lines.length === 1 ? '' : 's'}
                </span>
                <span className="text-ink-2">{o.receivedAt ? timeAgo(o.receivedAt) : ''}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <ReceiveDeliverySheet
        open={receiving !== null}
        order={receiving?.order ?? null}
        initialFile={receiving?.file ?? null}
        products={products}
        staffName={staffName}
        onClose={() => setReceiving(null)}
        onDone={async () => {
          await Promise.all([load(), onChanged()])
        }}
      />
    </div>
  )
}
