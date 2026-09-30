import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, ChevronLeft, ChevronRight, Download, Pencil, Plus, Send } from 'lucide-react'
import type { Expense, IntegrationStatus, MonthSpend, MovementRow } from '@/components/inventory/types'
import { dayKey, monthKey, monthLabel, monthRange, recentMonths } from '@/lib/business-types'
import { shrinkImage } from '@/lib/images'
import { Sheet, Field, SheetActions } from '@/components/ui/Sheet'
import { AutoInput, QuickChips } from '@/components/ui/AutoInput'
import { EmptyState, PageHead, StatGrid, StatTile, centsToDollars, dollarsShort } from '@/components/ui/bits'
import { useToast } from '@/components/ui/Toast'
import { useBusiness } from './BusinessContext'
import { TAX_GROUPS, findCategory, type TaxGroup } from '@/lib/tax-categories'
import {
  createExpense,
  editExpense,
  getBudgetOverview,
  getIntegrations,
  listExpenses,
  quickbooksPushMonth,
  readReceiptPhoto,
  removeExpense,
  saveMonthBudget,
} from '@/server/business.functions'

const CHART_MONTHS = 6

/**
 * Budget & Expenses tab: a rolling month-by-month view of what the business
 * spends on stock (from scanned-in deliveries) and everything else (logged
 * expenses), measured against a monthly budget.
 */
export function BudgetView({
  staffName,
  recent,
  onOpenSettings,
}: {
  staffName: string
  recent: MovementRow[]
  onOpenSettings: () => void
}) {
  const toast = useToast()
  const { type, name: businessName, categories } = useBusiness()
  const thisMonth = monthKey()
  const [month, setMonth] = useState(thisMonth)
  const [overview, setOverview] = useState<MonthSpend[] | null>(null)
  const [items, setItems] = useState<Expense[] | null>(null)
  const [qb, setQb] = useState<IntegrationStatus | null>(null)
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [version, setVersion] = useState(0)

  const months = useMemo(() => recentMonths(month, CHART_MONTHS), [month])

  useEffect(() => {
    let live = true
    Promise.all([
      getBudgetOverview({ data: { months: months.map(monthRange) } }),
      listExpenses({ data: { month } }),
    ])
      .then(([o, e]) => {
        if (!live) return
        setOverview(o as MonthSpend[])
        setItems(e as Expense[])
      })
      .catch(() => {
        if (!live) return
        setOverview([])
        setItems([])
      })
    return () => {
      live = false
    }
  }, [months, month, recent, version])

  useEffect(() => {
    getIntegrations()
      .then((s) => setQb((s as IntegrationStatus[]).find((i) => i.provider === 'quickbooks') ?? null))
      .catch(() => setQb(null))
  }, [])

  const current = overview?.find((m) => m.month === month)

  /** Stock received this month rolled up to the tax line each product category is filed under. */
  const taxRollup = useMemo(() => {
    const groups = new Map<string, { group: TaxGroup | null; cents: number; categories: Set<string> }>()
    for (const c of current?.stockCategories ?? []) {
      const saved = findCategory(categories, c.category)
      const group = saved ? TAX_GROUPS.find((g) => g.id === saved.taxGroup) ?? null : null
      const id = group?.id ?? 'unfiled'
      const row = groups.get(id) ?? { group, cents: 0, categories: new Set<string>() }
      row.cents += c.cents
      row.categories.add(c.category || 'No category')
      groups.set(id, row)
    }
    return Array.from(groups.values()).sort((a, b) => b.cents - a.cents)
  }, [current, categories])
  const spent = current ? current.inventoryCents + current.expenseCents : 0
  const budget = current?.budgetCents ?? 0
  const left = budget - spent
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : null
  const avg = overview?.length
    ? Math.round(overview.reduce((s, m) => s + m.inventoryCents + m.expenseCents, 0) / overview.length)
    : 0

  const vendorSuggestions = useMemo(
    () => Array.from(new Set([...(items ?? []).map((e) => e.vendor), ...(current?.vendors ?? []).map((v) => v.vendor)])).filter(Boolean),
    [items, current],
  )

  function reload() {
    setVersion((v) => v + 1)
  }

  async function pushToQuickBooks() {
    setPushing(true)
    try {
      const r = await quickbooksPushMonth({ data: monthRange(month) })
      if (!r.ok) {
        toast(r.message)
        return
      }
      const { sentExpenses, sentVendors, monthClosed } = r.result
      const total = sentExpenses + sentVendors
      toast(
        total === 0
          ? 'QuickBooks is already up to date for this month'
          : `Sent ${total} entr${total === 1 ? 'y' : 'ies'} to QuickBooks${monthClosed ? '' : '. Stock purchases go once the month ends'}`,
      )
      reload()
    } catch {
      toast('Could not reach QuickBooks. Try again.')
    } finally {
      setPushing(false)
    }
  }

  function exportCsv() {
    if (!current || !items) return
    const cell = (v: string | number) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows: (string | number)[][] = [['Date', 'Type', 'Vendor / payee', 'Category', 'Tax group', 'Tax line', 'Description', 'Amount']]
    for (const e of items) rows.push([e.spentOn, 'Expense', e.vendor, e.category, '', '', e.note, centsToDollars(e.amountCents)])
    const last = new Date(new Date(monthRange(month).end).getTime() - 1)
    // Stock is listed per product category so each line carries the tax group an accountant books it to.
    for (const c of current.stockCategories) {
      const saved = findCategory(categories, c.category)
      const group = saved ? TAX_GROUPS.find((g) => g.id === saved.taxGroup) : undefined
      rows.push([
        dayKey(last),
        'Inventory received',
        '',
        c.category || 'No category',
        group?.label ?? 'Not filed',
        group?.taxLine ?? '',
        'Stock scanned in this month',
        centsToDollars(c.cents),
      ])
    }
    const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-spending-${month}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const status =
    pct === null
      ? null
      : pct > 100
        ? { tone: 'bad' as const, label: `Over budget by ${dollarsShort(-left)}`, Icon: AlertTriangle }
        : pct >= 85
          ? { tone: 'warn' as const, label: `${pct}% used — getting close`, Icon: AlertTriangle }
          : { tone: 'good' as const, label: `${pct}% used — on track`, Icon: CheckCircle2 }

  return (
    <div>
      <PageHead
        title="Budget & Expenses"
        lead="What the team spends each month on stock and everything else, against your budget."
        action={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={18} />
            Add expense
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <button
          className="btn btn-tonal btn-sm !px-2.5"
          onClick={() => setMonth(recentMonths(month, 2)[0]!)}
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="m-0 text-lg font-bold min-w-[150px] text-center">{monthLabel(month)}</h2>
        <button
          className="btn btn-tonal btn-sm !px-2.5"
          disabled={month >= thisMonth}
          onClick={() => {
            const [y, m] = month.split('-').map(Number)
            setMonth(monthKey(new Date(y!, m!, 1)))
          }}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
        {month !== thisMonth && (
          <button className="btn btn-text btn-sm" onClick={() => setMonth(thisMonth)}>
            This month
          </button>
        )}
      </div>

      <StatGrid>
        <StatTile label={current?.hasOverride ? 'Budget (this month)' : 'Monthly budget'} value={overview ? (budget ? dollarsShort(budget) : 'Not set') : '–'} />
        <StatTile label="Spent" value={overview ? dollarsShort(spent) : '–'} />
        <StatTile
          label={left < 0 ? 'Over budget' : 'Left to spend'}
          value={overview ? (budget ? dollarsShort(Math.abs(left)) : '–') : '–'}
          tone={!budget ? undefined : left < 0 ? 'bad' : pct !== null && pct >= 85 ? 'warn' : 'good'}
        />
        <StatTile label={`${CHART_MONTHS}-month average`} value={overview ? dollarsShort(avg) : '–'} />
      </StatGrid>

      <div className="bg-surface rounded-2xl p-4 mb-5">
        {budget > 0 && pct !== null && status ? (
          <>
            <div className="h-3 rounded-full bg-white overflow-hidden mb-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
              <div
                className={`h-full rounded-full ${status.tone === 'bad' ? 'bg-bad' : status.tone === 'warn' ? 'bg-warn' : 'bg-good'}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
              <span className={`flex items-center gap-1.5 font-semibold ${status.tone === 'bad' ? 'text-bad' : status.tone === 'warn' ? 'text-warn' : 'text-good'}`}>
                <status.Icon size={16} />
                {status.label}
              </span>
              <button className="btn btn-text btn-sm !p-0" onClick={() => setBudgetOpen(true)}>
                <Pencil size={14} />
                Change budget
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
            <span className="text-ink-2">Set a monthly budget to see how much is left to spend.</span>
            <button className="btn btn-tonal btn-sm" onClick={() => setBudgetOpen(true)}>
              Set budget
            </button>
          </div>
        )}
      </div>

      {overview && overview.length > 0 && <SpendChart data={overview} selected={month} onSelect={setMonth} />}

      <div className="grid min-[760px]:grid-cols-2 gap-3.5 mb-5">
        <Breakdown
          title="Stock received"
          total={current?.inventoryCents ?? 0}
          empty="Nothing scanned in this month. Scan deliveries in on the Scan tab and they’re counted here."
          rows={(current?.vendors ?? []).map((v) => ({ label: v.vendor, sub: `${v.units} unit${v.units === 1 ? '' : 's'}`, cents: v.cents }))}
        />
        <Breakdown
          title="Other expenses"
          total={current?.expenseCents ?? 0}
          empty="No expenses logged. Snap a receipt with Add expense."
          rows={(current?.categories ?? []).map((c) => ({ label: c.category, cents: c.cents }))}
        />
      </div>

      {taxRollup.length > 0 && (
        <section className="bg-white border border-line rounded-2xl px-4 py-1 mb-5">
          <div className="flex justify-between items-baseline gap-3 pt-3 pb-1">
            <h3 className="m-0 text-[17px] font-bold">Stock by tax line</h3>
            <span className="text-[12px] text-ink-2">For your accountant</span>
          </div>
          <ul className="list-none m-0 p-0">
            {taxRollup.map((r) => (
              <li key={r.group?.id ?? 'unfiled'} className="flex justify-between gap-3 py-2.5 border-b border-line last:border-b-0 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold">{r.group?.label ?? 'Not filed under a tax group'}</span>
                  {r.group?.cogs && <span className="ml-1.5 text-[11px] font-bold text-ink-2">COGS</span>}
                  <span className="block text-[12px] text-ink-2 truncate">
                    {r.group ? r.group.taxLine : 'Add these categories in Settings → Categories'} · {Array.from(r.categories).join(', ')}
                  </span>
                </span>
                <span className="num whitespace-nowrap font-semibold">${centsToDollars(r.cents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
        <h2 className="text-lg font-bold m-0">Expenses in {monthLabel(month, 'short')}</h2>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-tonal btn-sm" onClick={exportCsv} disabled={!current}>
            <Download size={16} />
            CSV
          </button>
          {qb?.connected ? (
            <button className="btn btn-tonal btn-sm" onClick={pushToQuickBooks} disabled={pushing}>
              <Send size={16} />
              {pushing ? 'Sending…' : 'Send to QuickBooks'}
            </button>
          ) : (
            <button className="btn btn-text btn-sm" onClick={onOpenSettings}>
              Connect QuickBooks
            </button>
          )}
        </div>
      </div>

      {items === null ? (
        <div className="bg-surface rounded-2xl p-4">
          <div className="skel w-[60%]" />
          <div className="skel w-[40%]" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No expenses yet this month">
          Log rent, supplies or stock bought outside the scanner. A receipt photo fills it in for you.
        </EmptyState>
      ) : (
        <ul className="list-none m-0 p-0 bg-white border border-line rounded-2xl px-4">
          {items.map((e) => (
            <li key={e.id}>
              <button
                className="w-full flex items-center gap-3 py-3 border-0 border-b border-line bg-transparent text-left cursor-pointer text-ink"
                onClick={() => setEditing(e)}
              >
                <div className="w-11 text-center shrink-0">
                  <b className="num block text-lg leading-none">{Number(e.spentOn.slice(8))}</b>
                  <span className="text-[11px] text-ink-2 uppercase">{monthLabel(e.spentOn.slice(0, 7), 'short')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{e.vendor || e.category || 'Expense'}</div>
                  <div className="text-[13px] text-ink-2 truncate">
                    {[e.category, e.note, e.staffName && `by ${e.staffName}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <b className="num block">${centsToDollars(e.amountCents)}</b>
                  {e.quickbooksId && <span className="text-[11px] font-semibold text-good">In QuickBooks</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add expense' : 'Edit expense'}
        subtitle={editing === 'new' ? 'Snap the receipt and Bintro fills in the total, store and date.' : undefined}
      >
        {editing !== null && (
          <ExpenseForm
            expense={editing === 'new' ? undefined : editing}
            defaultDay={month === thisMonth ? dayKey() : `${month}-01`}
            categories={type.expenseCategories}
            vendors={vendorSuggestions}
            staffName={staffName}
            onCancel={() => setEditing(null)}
            onSaved={(message) => {
              setEditing(null)
              toast(message)
              reload()
            }}
          />
        )}
      </Sheet>

      <Sheet open={budgetOpen} onClose={() => setBudgetOpen(false)} title={`Budget for ${monthLabel(month)}`}>
        {budgetOpen && (
          <BudgetForm
            month={month}
            current={current}
            onCancel={() => setBudgetOpen(false)}
            onSaved={() => {
              setBudgetOpen(false)
              toast('Budget saved')
              reload()
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

/**
 * Rolling six-month spend: one stacked bar per month (stock received + other
 * expenses) with a tick for that month's budget. Tap a month to open it.
 */
function SpendChart({ data, selected, onSelect }: { data: MonthSpend[]; selected: string; onSelect: (m: string) => void }) {
  const [hover, setHover] = useState<string | null>(null)
  const max = Math.max(1, ...data.map((m) => Math.max(m.inventoryCents + m.expenseCents, m.budgetCents)))
  const H = 160

  return (
    <section className="bg-white border border-line rounded-2xl p-4 mb-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h3 className="m-0 text-[17px] font-bold">Last {data.length} months</h3>
        <div className="flex gap-3 text-[13px] text-ink-2" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-action" /> Stock
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-gold" /> Other expenses
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-ink" /> Budget
          </span>
        </div>
      </div>
      <div className="flex items-end gap-2 min-[560px]:gap-4" style={{ height: H + 28 }}>
        {data.map((m) => {
          const total = m.inventoryCents + m.expenseCents
          const inv = (m.inventoryCents / max) * H
          const exp = (m.expenseCents / max) * H
          const over = m.budgetCents > 0 && total > m.budgetCents
          const active = m.month === selected
          const showTip = hover === m.month
          return (
            <button
              key={m.month}
              type="button"
              onClick={() => onSelect(m.month)}
              onMouseEnter={() => setHover(m.month)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(m.month)}
              onBlur={() => setHover(null)}
              aria-pressed={active}
              aria-label={`${monthLabel(m.month)}: ${dollarsShort(total)} spent${m.budgetCents ? ` of ${dollarsShort(m.budgetCents)} budget` : ''}`}
              className="relative flex-1 h-full flex flex-col justify-end items-center border-0 bg-transparent cursor-pointer p-0"
            >
              {showTip && (
                <span className="absolute z-10 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink text-white text-[12px] rounded-lg px-2.5 py-1.5 whitespace-nowrap text-left shadow-card pointer-events-none">
                  <b className="block">{monthLabel(m.month)}</b>
                  Stock {dollarsShort(m.inventoryCents)} · Other {dollarsShort(m.expenseCents)}
                  {m.budgetCents > 0 && <span className="block">Budget {dollarsShort(m.budgetCents)}</span>}
                </span>
              )}
              <span className="relative w-full max-w-[44px] flex flex-col justify-end" style={{ height: H }}>
                {m.budgetCents > 0 && (
                  <span
                    className="absolute -left-1 -right-1 border-t-2 border-dashed border-ink"
                    style={{ bottom: (m.budgetCents / max) * H }}
                  />
                )}
                {exp > 0 && (
                  <span
                    className={`block w-full bg-gold ${inv > 0 ? 'rounded-t-[4px] mb-[2px]' : 'rounded-t-[4px]'} ${active ? '' : 'opacity-70'}`}
                    style={{ height: Math.max(2, exp - (inv > 0 ? 2 : 0)) }}
                  />
                )}
                {inv > 0 && (
                  <span
                    className={`block w-full bg-action ${exp > 0 ? '' : 'rounded-t-[4px]'} ${active ? '' : 'opacity-70'}`}
                    style={{ height: Math.max(2, inv) }}
                  />
                )}
              </span>
              <span className={`text-[12px] mt-1.5 ${active ? 'font-bold text-ink' : 'text-ink-2'} ${over ? 'underline decoration-bad decoration-2' : ''}`}>
                {monthLabel(m.month, 'short')}
              </span>
            </button>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>Monthly spending</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Stock</th>
            <th>Other expenses</th>
            <th>Budget</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.month}>
              <td>{monthLabel(m.month)}</td>
              <td>{dollarsShort(m.inventoryCents)}</td>
              <td>{dollarsShort(m.expenseCents)}</td>
              <td>{m.budgetCents ? dollarsShort(m.budgetCents) : 'Not set'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Breakdown({
  title,
  total,
  rows,
  empty,
}: {
  title: string
  total: number
  rows: { label: string; sub?: string; cents: number }[]
  empty: string
}) {
  return (
    <section className="bg-surface rounded-2xl px-4 py-1">
      <div className="flex justify-between items-baseline gap-3 pt-3 pb-1.5">
        <h3 className="m-0 text-[17px] font-bold">{title}</h3>
        <span className="num font-bold">${centsToDollars(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-ink-2 text-sm mt-1 mb-3">{empty}</p>
      ) : (
        <ul className="list-none m-0 p-0">
          {rows.map((r) => (
            <li key={r.label} className="flex justify-between gap-3 py-2.5 border-b border-line last:border-b-0 text-sm">
              <span className="min-w-0">
                <span className="font-semibold">{r.label}</span>
                {r.sub && <span className="text-ink-2"> · {r.sub}</span>}
              </span>
              <span className="num whitespace-nowrap">${centsToDollars(r.cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ExpenseForm({
  expense,
  defaultDay,
  categories,
  vendors,
  staffName,
  onCancel,
  onSaved,
}: {
  expense?: Expense
  defaultDay: string
  categories: string[]
  vendors: string[]
  staffName: string
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const [amount, setAmount] = useState(expense ? centsToDollars(expense.amountCents) : '')
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? defaultDay)
  const [category, setCategory] = useState(expense?.category ?? '')
  const [vendor, setVendor] = useState(expense?.vendor ?? '')
  const [note, setNote] = useState(expense?.note ?? '')
  const [reading, setReading] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onReceipt(file: File) {
    setReading(true)
    setError('')
    setInfo('')
    try {
      const image = await shrinkImage(file, 1600)
      const r = await readReceiptPhoto({ data: { image, mediaType: 'image/jpeg' } })
      if (!r.ok) {
        setError(r.message)
        return
      }
      setAmount(centsToDollars(r.amountCents))
      if (r.vendor) setVendor(r.vendor)
      if (r.spentOn) setSpentOn(r.spentOn)
      if (r.category) setCategory((v) => v || r.category)
      if (r.note) setNote((v) => v || r.note)
      setInfo('Read from your receipt. Check the total before saving.')
    } catch {
      setError('That photo could not be opened. Try another one.')
    } finally {
      setReading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round((Number(amount) || 0) * 100)
    if (cents <= 0) {
      setError('Enter the amount spent.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
      setError('Pick the date it was spent.')
      return
    }
    setSaving(true)
    setError('')
    const values = { spentOn, amountCents: cents, category: category.trim(), vendor: vendor.trim(), note: note.trim() }
    try {
      if (expense) {
        await editExpense({ data: { id: expense.id, ...values } })
        onSaved('Expense updated')
      } else {
        await createExpense({ data: { ...values, staffName } })
        onSaved(`$${centsToDollars(cents)} expense added`)
      }
    } catch {
      setError('Could not save. Check your connection and try again.')
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!expense || !window.confirm('Delete this expense?')) return
    setSaving(true)
    try {
      await removeExpense({ data: { id: expense.id } })
      onSaved('Expense deleted')
    } catch {
      setError('Could not delete. Try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <button
        type="button"
        className="btn btn-tonal w-full mb-2"
        disabled={reading}
        onClick={() => {
          if (fileRef.current) fileRef.current.value = ''
          fileRef.current?.click()
        }}
      >
        <Camera size={18} />
        {reading ? 'Reading the receipt…' : 'Fill in from a receipt photo'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onReceipt(file)
        }}
      />
      <p className="text-[13px] text-ink-2 min-h-[18px] mt-0 mb-2">{info}</p>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Amount" htmlFor="ex-amount">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2">$</span>
            <input
              id="ex-amount"
              className="field-input num !pl-7"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus={!expense}
            />
          </div>
        </Field>
        <Field label="Date" htmlFor="ex-date">
          <input id="ex-date" className="field-input" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
        </Field>
      </div>
      <Field label="Category" htmlFor="ex-category">
        <AutoInput id="ex-category" value={category} onChange={setCategory} suggestions={categories} />
      </Field>
      <QuickChips label="Categories" options={categories} value={category} onPick={setCategory} />
      <Field label="Paid to" htmlFor="ex-vendor">
        <AutoInput id="ex-vendor" value={vendor} onChange={setVendor} suggestions={vendors} placeholder="Store or supplier" />
      </Field>
      <Field label="Note" htmlFor="ex-note">
        <input id="ex-note" className="field-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </Field>
      {expense?.quickbooksId && (
        <p className="text-[13px] text-ink-2 m-0">Already sent to QuickBooks — edits here won’t update it there.</p>
      )}

      {error && <p className="text-bad text-sm mt-3 mb-0">{error}</p>}
      <SheetActions>
        {expense ? (
          <button type="button" className="btn btn-tonal !text-bad" onClick={onDelete} disabled={saving}>
            Delete
          </button>
        ) : (
          <button type="button" className="btn btn-tonal" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving || reading}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </SheetActions>
    </form>
  )
}

function BudgetForm({
  month,
  current,
  onCancel,
  onSaved,
}: {
  month: string
  current?: MonthSpend
  onCancel: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(current?.budgetCents ? String(Math.round(current.budgetCents / 100)) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(amountCents: number | null) {
    setSaving(true)
    setError('')
    try {
      await saveMonthBudget({ data: { month, amountCents } })
      onSaved()
    } catch {
      setError('Could not save. Try again.')
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save(Math.max(0, Math.round((Number(amount) || 0) * 100)))
      }}
    >
      <Field label="Budget for stock and expenses" htmlFor="bf-amount">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2">$</span>
          <input
            id="bf-amount"
            className="field-input num !pl-7"
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>
      </Field>
      <p className="text-ink-2 text-[13px] m-0">
        Only changes {monthLabel(month)}. Your standing monthly budget lives in Settings → Business profile.
      </p>
      {current?.hasOverride && (
        <button type="button" className="btn btn-text btn-sm !px-0 mt-2" onClick={() => save(null)} disabled={saving}>
          Use the standing monthly budget instead
        </button>
      )}
      {error && <p className="text-bad text-sm mt-3 mb-0">{error}</p>}
      <SheetActions>
        <button type="button" className="btn btn-tonal" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </SheetActions>
    </form>
  )
}
