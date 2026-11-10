import { useEffect, useState } from 'react'
import type { Product } from './types'
import { getOrders } from '@/server/orders.functions'
import { BelowParView } from './BelowParView'
import { PurchaseOrderView } from './PurchaseOrderView'
import { DeliveriesView } from './DeliveriesView'
import { PlanGate } from '@/components/business/PlanGate'

export type RestockMode = 'below-par' | 'order' | 'deliveries'

/**
 * Restock tab: the below-par list and the vendor purchase order are two steps
 * of one job, so they share a tab with a switch instead of taking two.
 */
export function RestockView({
  mode,
  onMode,
  items,
  products,
  staffName,
  onChanged,
  autoReceive,
  onAutoReceiveHandled,
}: {
  mode: RestockMode
  onMode: (m: RestockMode) => void
  items: Product[]
  /** Every product, straight from the Products list; `items` is the below-par subset of it. */
  products: Product[]
  staffName: string
  onChanged: () => void | Promise<void>
  /** Open "Receive a delivery" as soon as Deliveries shows (from the Scan tab). */
  autoReceive?: boolean | File
  onAutoReceiveHandled?: () => void
}) {
  // Units already on open orders, shown on Below par so nothing gets ordered twice.
  const [onOrder, setOnOrder] = useState<Record<number, number>>({})
  useEffect(() => {
    getOrders()
      .then((o) => setOnOrder(o.onOrder))
      .catch(() => {})
  }, [mode, items])
  return (
    <div>
      <div
        className="inline-flex p-1 rounded-full bg-surface mb-4 print:hidden max-w-full overflow-x-auto"
        role="tablist"
        aria-label="Restock step"
      >
        {(
          [
            { id: 'below-par', label: `1 · Below par${items.length ? ` (${items.length})` : ''}` },
            { id: 'order', label: '2 · Build order' },
            { id: 'deliveries', label: '3 · Deliveries' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={mode === t.id}
            onClick={() => onMode(t.id)}
            className={`px-4 py-2 rounded-full border-0 text-sm font-semibold cursor-pointer ${
              mode === t.id ? 'bg-white text-ink shadow-card' : 'bg-transparent text-ink-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {mode === 'below-par' ? (
        <BelowParView items={items} products={products} staffName={staffName} onChanged={onChanged} onBuildOrder={() => onMode('order')} onOrder={onOrder} />
      ) : mode === 'order' ? (
        <PlanGate feature="orders">
          <PurchaseOrderView items={items} staffName={staffName} onChanged={onChanged} onOpenDeliveries={() => onMode('deliveries')} onOrder={onOrder} />
        </PlanGate>
      ) : (
        <PlanGate feature="orders">
          <DeliveriesView
            products={products}
            staffName={staffName}
            onChanged={onChanged}
            autoReceive={autoReceive}
            onAutoReceiveHandled={onAutoReceiveHandled}
          />
        </PlanGate>
      )}
    </div>
  )
}
