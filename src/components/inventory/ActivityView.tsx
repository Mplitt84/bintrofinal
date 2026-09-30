import { useEffect, useMemo, useState } from 'react'
import type { ActivityRow, MovementRow } from './types'
import { getMovementsSince } from '@/server/inventory.functions'
import { EmptyState, PageHead, StatGrid, StatTile, Thumb, centsToDollars, dollarsShort } from '@/components/ui/bits'

type Period = 'today' | 'week' | '7' | 'all'
type Kind = 'out' | 'in'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This week',
  '7': 'Last 7 days',
  all: 'All time',
}

/** Start of the period in local time; weeks start on Monday. */
function periodStart(period: Period): Date | null {
  if (period === 'all') return null
  if (period === '7') return new Date(Date.now() - 7 * 86_400_000)
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

type Line = { key: number; name: string; size: string; imageUrl: string; brand: string; units: number; cents: number }

export function ActivityView({ recent }: { recent: MovementRow[] }) {
  const [period, setPeriod] = useState<Period>('week')
  const [kind, setKind] = useState<Kind>('out')
  const [rows, setRows] = useState<ActivityRow[] | null>(null)

  // Reload when the period changes or a new scan lands in the recent feed.
  useEffect(() => {
    let live = true
    const since = periodStart(period)
    getMovementsSince({ data: { since: since ? since.toISOString() : null } })
      .then((r) => live && setRows(r as ActivityRow[]))
      .catch(() => live && setRows([]))
    return () => {
      live = false
    }
  }, [period, recent])

  const summary = useMemo(() => {
    const all = rows ?? []
    const used = all.filter((m) => m.type === 'out')
    const received = all.filter((m) => m.type === 'in' || m.type === 'receive')
    const pick = kind === 'out' ? used : received

    const brands = new Map<string, Map<number, Line>>()
    for (const m of pick) {
      const brand = m.productBrand.trim() || 'No brand'
      const lines = brands.get(brand) ?? new Map<number, Line>()
      const line = lines.get(m.productId) ?? {
        key: m.productId,
        name: m.productName,
        size: m.productSize,
        imageUrl: m.productImageUrl,
        brand,
        units: 0,
        cents: 0,
      }
      const units = Math.abs(m.delta)
      line.units += units
      line.cents += units * m.unitCostCents
      lines.set(m.productId, line)
      brands.set(brand, lines)
    }

    const groups = Array.from(brands, ([brand, lines]) => {
      const items = Array.from(lines.values()).sort((a, b) => b.units - a.units || a.name.localeCompare(b.name))
      return {
        brand,
        items,
        units: items.reduce((s, l) => s + l.units, 0),
        cents: items.reduce((s, l) => s + l.cents, 0),
      }
    }).sort((a, b) => b.units - a.units || a.brand.localeCompare(b.brand))

    const sum = (list: ActivityRow[]) => list.reduce((s, m) => s + Math.abs(m.delta), 0)
    const cost = (list: ActivityRow[]) => list.reduce((s, m) => s + Math.abs(m.delta) * m.unitCostCents, 0)
    return {
      groups,
      unitsUsed: sum(used),
      usedCents: cost(used),
      unitsReceived: sum(received),
      brandCount: new Set(used.map((m) => m.productBrand.trim() || 'No brand')).size,
      staff: Array.from(
        pick.reduce((map, m) => {
          const name = m.staffName || m.staffInitials || 'Unnamed'
          return map.set(name, (map.get(name) ?? 0) + Math.abs(m.delta))
        }, new Map<string, number>()),
      ).sort((a, b) => b[1] - a[1]),
    }
  }, [rows, kind])

  return (
    <div>
      <PageHead title="Activity" lead="What got used up, what it cost, and what came in." />

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4" role="group" aria-label="Time period">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button key={p} className="chip" aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <StatGrid>
        <StatTile label="Units used" value={rows ? summary.unitsUsed : '–'} />
        <StatTile label="Product used" value={rows ? dollarsShort(summary.usedCents) : '–'} />
        <StatTile label="Units received" value={rows ? summary.unitsReceived : '–'} tone="good" />
        <StatTile label="Brands used" value={rows ? summary.brandCount : '–'} />
      </StatGrid>

      <div className="flex gap-2 mb-4" role="group" aria-label="Show">
        <button className="chip" aria-pressed={kind === 'out'} onClick={() => setKind('out')}>
          Used
        </button>
        <button className="chip" aria-pressed={kind === 'in'} onClick={() => setKind('in')}>
          Received
        </button>
      </div>

      {rows === null ? (
        <div className="bg-surface rounded-2xl p-4">
          <div className="skel w-[60%]" />
          <div className="skel w-[40%]" />
        </div>
      ) : summary.groups.length === 0 ? (
        <EmptyState title={kind === 'out' ? 'Nothing used in this period' : 'Nothing received in this period'}>
          Scan a product on the Scan tab and it shows up here.
        </EmptyState>
      ) : (
        <>
          {summary.groups.map((g) => (
            <section key={g.brand} className="bg-white border border-line rounded-2xl px-4 py-1 mb-3.5">
              <div className="flex justify-between items-baseline gap-3 pt-3 pb-1.5">
                <h3 className="m-0 text-[17px] font-bold">{g.brand}</h3>
                <span className="num font-bold text-sm">
                  {g.units} {kind === 'out' ? 'used' : 'in'} · ${centsToDollars(g.cents)}
                </span>
              </div>
              <ul className="list-none m-0 p-0">
                {g.items.map((l) => (
                  <li key={l.key} className="flex items-center gap-3 py-3 border-b border-line last:border-b-0">
                    <Thumb imageUrl={l.imageUrl} label={l.brand} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{l.name}</div>
                      <div className="text-[13px] text-ink-2 truncate">
                        {[l.size, l.units ? `$${centsToDollars(l.cents / l.units)} each` : ''].filter(Boolean).join(', ')}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <b className="num block">{l.units}</b>
                      <span className="num text-[13px] text-ink-2">${centsToDollars(l.cents)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {summary.staff.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-bold mt-0 mb-2.5">By staff</h2>
              <ul className="list-none m-0 p-0 bg-surface rounded-2xl px-4">
                {summary.staff.map(([name, units]) => (
                  <li key={name} className="flex justify-between py-3 border-b border-line last:border-b-0">
                    <span className="font-semibold">{name}</span>
                    <span className="num text-ink-2">
                      {units} unit{units === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
