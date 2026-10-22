import { useState } from 'react'
import { ClipboardList, Mail, RefreshCw } from 'lucide-react'
import type { Product } from './types'
import { emailBelowPar } from '@/server/inventory.functions'
import { STOCK_STATUS_LABEL, onHandQty, stockStatus, unitsToPar, type StockStatus } from '@/lib/inventory-defaults'
import { useBusiness } from '@/components/business/BusinessContext'
import { EmptyState, PageHead, StatGrid, StatTile, Thumb, dollarsShort } from '@/components/ui/bits'

const STATUS_PILL: Record<StockStatus, string> = {
  out: 'bg-bad-tint text-bad',
  low: 'bg-warn-tint text-warn',
  in: 'bg-good-tint text-good',
}

type MailState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; message: string }
  | { kind: 'error'; message: string }

export function BelowParView({
  items,
  products,
  staffName,
  onChanged,
  onBuildOrder,
}: {
  items: Product[]
  products: Product[]
  staffName: string
  onChanged: () => void | Promise<void>
  onBuildOrder?: () => void
}) {
  const [mail, setMail] = useState<MailState>({ kind: 'idle' })
  const [showInStock, setShowInStock] = useState(false)
  const { profile } = useBusiness()
  const sendTo = profile.orderEmail.trim() || profile.email.trim()

  const outOfStock = items.filter((p) => stockStatus(p) === 'out')
  const inStock = products.filter((p) => stockStatus(p) === 'in')
  const unitsNeeded = items.reduce((sum, p) => sum + (unitsToPar(p) || 1), 0)
  const restockCostCents = items.reduce((sum, p) => sum + (unitsToPar(p) || 1) * p.unitCostCents, 0)

  async function handleEmail() {
    setMail({ kind: 'sending' })
    const result = await emailBelowPar({ data: { staffName } })
    if (result.ok) {
      setMail({
        kind: 'sent',
        message: `Sent ${result.count} item${result.count === 1 ? '' : 's'} to ${result.to}.`,
      })
    } else {
      setMail({ kind: 'error', message: result.message })
    }
  }

  return (
    <div>
      <PageHead title="Below Par" lead="Everything at or under its restock level, ready to send off for reordering." />

      <StatGrid>
        <StatTile label="Below par" value={items.length} tone={items.length > 0 ? 'warn' : 'good'} />
        <StatTile label="Out of stock" value={outOfStock.length} tone={outOfStock.length > 0 ? 'bad' : 'good'} />
        <StatTile label="Units to reorder" value={unitsNeeded} />
        <StatTile label="Est. restock cost" value={dollarsShort(restockCostCents)} />
      </StatGrid>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        {onBuildOrder && (
          <button className="btn btn-primary btn-sm" onClick={onBuildOrder} disabled={items.length === 0}>
            <ClipboardList size={16} />
            Build vendor order
          </button>
        )}
        <button
          className={`btn btn-sm ${onBuildOrder ? 'btn-tonal' : 'btn-primary'}`}
          onClick={handleEmail}
          disabled={mail.kind === 'sending' || items.length === 0}
        >
          <Mail size={16} />
          {mail.kind === 'sending' ? 'Sending…' : sendTo ? `Email list to ${sendTo}` : 'Email the list'}
        </button>
        <button
          className="btn btn-tonal btn-sm"
          onClick={() => {
            setMail({ kind: 'idle' })
            onChanged()
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {mail.kind === 'sent' && <p className="text-good text-sm font-semibold mt-1 mb-3">✓ {mail.message}</p>}
      {mail.kind === 'error' && <p className="text-bad text-sm mt-1 mb-3 max-w-[560px]">{mail.message}</p>}

      <div className="mt-4">
        {items.length === 0 ? (
          <EmptyState title="Fully stocked">Nothing is at or below its par level right now.</EmptyState>
        ) : (
          <ul className="list-none m-0 p-0">
            {items.map((p) => {
              const status = stockStatus(p)
              return (
                <li key={p.id} className="flex items-center gap-3 py-3 border-b border-line last:border-b-0">
                  <Thumb imageUrl={p.imageUrl} label={p.brand || p.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-[13px] text-ink-2 truncate">
                      {[p.brand, p.size, p.category].filter(Boolean).join(', ') || p.barcode}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap text-[13px] text-ink-2">
                    <span className={`inline-block text-[12px] font-semibold px-2 rounded-full ${STATUS_PILL[status]}`}>
                      {STOCK_STATUS_LABEL[status]}
                    </span>
                    <div className="num mt-0.5">
                      {Math.max(0, onHandQty(p))} on hand · par {p.reorderThreshold}
                    </div>
                  </div>
                  <div className="text-right min-w-14">
                    <b className="num block text-lg leading-tight">{unitsToPar(p) || 1}+</b>
                    <span className="text-[12px] text-ink-2">to order</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {inStock.length > 0 && (
        <div className="mt-4">
          <button className="btn btn-text btn-sm" onClick={() => setShowInStock((v) => !v)} aria-expanded={showInStock}>
            {showInStock ? 'Hide' : 'Show'} in-stock items ({inStock.length})
          </button>
          {showInStock && (
            <ul className="list-none m-0 p-0 mt-2">
              {inStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 border-b border-line last:border-b-0">
                  <Thumb imageUrl={p.imageUrl} label={p.brand || p.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-[13px] text-ink-2 truncate">
                      {[p.brand, p.size, p.category].filter(Boolean).join(', ') || p.barcode}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap text-[13px] text-ink-2">
                    <span className={`inline-block text-[12px] font-semibold px-2 rounded-full ${STATUS_PILL.in}`}>
                      {STOCK_STATUS_LABEL.in}
                    </span>
                    <div className="num mt-0.5">
                      {onHandQty(p)} on hand{p.reorderThreshold > 0 ? ` · par ${p.reorderThreshold}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-ink-2 text-[13px] mt-5 leading-relaxed">
        Out means none on hand; Low means 1 or more but at or under the product's par level. Products with no par level set only show here once they run out. The email is sent from the server, so
        it goes out even if this device has no mail app set up. Build a vendor order from these items in step 2.
      </p>
    </div>
  )
}
