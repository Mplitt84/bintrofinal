import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, FileSpreadsheet } from 'lucide-react'
import type { Product } from './types'
import type { StaffPrompt } from './StaffPicker'
import { Sheet, SheetActions } from '@/components/ui/Sheet'
import { logSalesReport, parseSalesReport } from '@/server/import.functions'
import { shrinkImage } from '@/lib/images'
import { MAX_IMPORT_BYTES } from '@/lib/bulk-import'
import { SALES_REPORT_APPS, type SalesReportLine } from '@/lib/sales-report'

type App = (typeof SALES_REPORT_APPS)[number]

type Row = SalesReportLine & { sold: string; include: boolean }

type Stage =
  | { kind: 'start'; error?: string }
  | { kind: 'reading'; fileName: string }
  | { kind: 'review'; error?: string; duplicate?: boolean }
  | { kind: 'saving' }
  | { kind: 'done'; units: number; products: number }

const APP_KEY = 'bintro.salesReportApp'

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function savedApp(): App {
  try {
    const v = localStorage.getItem(APP_KEY)
    if (v && (SALES_REPORT_APPS as readonly string[]).includes(v)) return v as App
  } catch {
    // Storage can be blocked; fall back to the first app.
  }
  return SALES_REPORT_APPS[0]
}

/**
 * For booking apps Bintro can't connect to: upload the product sales report they
 * export (CSV, PDF or a photo of the screen). Each product's units sold are taken
 * off the shelf as one scan-out, tagged with the app and the report period.
 */
export function SalesReportSheet({
  open,
  products,
  askStaff,
  onClose,
  onDone,
}: {
  open: boolean
  products: Product[]
  askStaff: (prompt: StaffPrompt) => Promise<string | null>
  onClose: () => void
  onDone: () => void | Promise<void>
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'start' })
  const [app, setApp] = useState<App>(SALES_REPORT_APPS[0])
  const [period, setPeriod] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const byId = new Map(products.map((p) => [p.id, p]))

  useEffect(() => {
    if (open) {
      setStage({ kind: 'start' })
      setRows([])
      setPeriod('')
      setApp(savedApp())
    }
  }, [open])

  function pickApp(next: App) {
    setApp(next)
    try {
      localStorage.setItem(APP_KEY, next)
    } catch {
      // Not remembered this time; harmless.
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return
    const name = file.name.toLowerCase()
    const isCsv = file.type === 'text/csv' || name.endsWith('.csv') || name.endsWith('.txt')
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
    if (isPdf && file.size > MAX_IMPORT_BYTES) {
      setStage({ kind: 'start', error: 'That PDF is over 4 MB. Export a CSV or a shorter date range instead.' })
      return
    }
    setStage({ kind: 'reading', fileName: file.name })
    try {
      const parsed = await parseSalesReport({
        data: isCsv
          ? { kind: 'csv', text: await file.text() }
          : isPdf
            ? { kind: 'document', data: await readAsBase64(file), mediaType: 'application/pdf' }
            : { kind: 'document', data: await shrinkImage(file, 2000), mediaType: 'image/jpeg' },
      })
      if (!parsed.ok) {
        setStage({ kind: 'start', error: parsed.message })
        return
      }
      setRows(parsed.lines.map((l) => ({ ...l, sold: String(l.qty), include: l.productId !== null })))
      if (parsed.period) setPeriod(parsed.period.slice(0, 60))
      setStage({ kind: 'review' })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setStage({
        kind: 'start',
        error: /plan|upgrade|feature/i.test(message)
          ? 'Sales report upload is on the Plus plan.'
          : isCsv
            ? "Couldn't read that file. Check your connection and try again."
            : "Couldn't read that file. A CSV export works best; PDFs and photos need Bintro's AI reader.",
      })
    }
  }

  function patch(key: number, change: Partial<Row>) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)))
  }

  const ready = rows.filter((r) => r.include && r.productId !== null && Number(r.sold) > 0)
  const units = ready.reduce((s, r) => s + Math.trunc(Number(r.sold)), 0)
  const unmatched = rows.filter((r) => r.productId === null).length

  async function confirm(force: boolean) {
    if (ready.length === 0) return
    const who = await askStaff({ direction: 'out' })
    if (!who) return
    setStage({ kind: 'saving' })
    try {
      const result = await logSalesReport({
        data: {
          app,
          period: period.trim(),
          staffName: who,
          force,
          lines: ready.map((r) => ({ productId: r.productId!, qty: Math.trunc(Number(r.sold)) })),
        },
      })
      if (!result.ok) {
        setStage({ kind: 'review', duplicate: true, error: result.message })
        return
      }
      setStage({ kind: 'done', units: result.units, products: result.products })
      await onDone()
    } catch {
      setStage({ kind: 'review', error: "Couldn't log the report. Check your connection and try again." })
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Upload a sales report"
      subtitle="For booking apps Bintro can't connect to. Retail sold comes off your shelf counts."
    >
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv,application/pdf,image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          readFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {stage.kind === 'start' && (
        <div className="grid gap-3">
          {stage.error && <p className="m-0 text-bad text-sm font-semibold">{stage.error}</p>}
          <label className="text-sm font-semibold">
            Booking app
            <select className="field-input !py-2 mt-1" value={app} onChange={(e) => pickApp(e.target.value as App)}>
              {SALES_REPORT_APPS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary justify-start" onClick={() => fileInput.current?.click()}>
            <FileSpreadsheet size={18} />
            Choose the report (CSV, PDF or photo)
          </button>
          <p className="m-0 text-[13px] text-ink-2">
            In {app === 'Other' ? 'your booking app' : app}, export the <b className="text-ink">product sales</b> report for
            the days since your last upload. A CSV works best. You check every line before anything changes.
          </p>
          <p className="m-0 text-[13px] text-ink-2">Square sales already sync on their own, so don't upload those here.</p>
        </div>
      )}

      {stage.kind === 'reading' && <p className="text-ink-2 text-sm">Reading {stage.fileName}…</p>}
      {stage.kind === 'saving' && <p className="text-ink-2 text-sm">Logging the sales…</p>}

      {stage.kind === 'review' && (
        <>
          <label className="block text-sm font-semibold mb-3">
            Report period
            <input
              className="field-input !py-2 mt-1"
              value={period}
              maxLength={60}
              placeholder="e.g. Nov 1–7"
              onChange={(e) => setPeriod(e.target.value)}
            />
            <span className="block text-[12px] font-normal text-ink-2 mt-1">
              Bintro uses this to stop the same report being logged twice.
            </span>
          </label>

          {unmatched > 0 && (
            <p className="m-0 mb-2 text-[13px] text-ink-2">
              {unmatched} line{unmatched === 1 ? '' : 's'} didn't match a product. Pick the product, or leave it unticked to skip it.
            </p>
          )}

          <ul className="list-none m-0 p-0 max-h-[48vh] overflow-auto">
            {rows.map((r) => {
              const product = r.productId !== null ? byId.get(r.productId) : undefined
              return (
                <li key={r.key} className={`py-3 border-b border-line last:border-b-0 ${r.include ? '' : 'opacity-50'}`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={r.include}
                      disabled={r.productId === null}
                      onChange={(e) => patch(r.key, { include: e.target.checked })}
                      aria-label={`Include ${r.name}`}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      <div className="text-[12px] text-ink-2 truncate">{[r.brand, r.size].filter(Boolean).join(' · ')}</div>
                      {r.productId === null ? (
                        <select
                          className="field-input !py-1.5 text-sm mt-1"
                          value=""
                          onChange={(e) => {
                            const id = Number(e.target.value)
                            const p = byId.get(id)
                            if (p) patch(r.key, { productId: id, name: p.name, brand: p.brand, size: p.size, include: true })
                          }}
                        >
                          <option value="">Which product is this?</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {[p.brand, p.name, p.size].filter(Boolean).join(' · ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        product && <div className="text-[11px] text-ink-2 mt-0.5">{product.qty} on hand now</div>
                      )}
                    </div>
                    <label className="text-[11px] text-ink-2 text-center">
                      Sold
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={r.sold}
                        onChange={(e) => patch(r.key, { sold: e.target.value })}
                        className="field-input w-16 text-center px-1 py-1.5 mt-0.5"
                      />
                    </label>
                  </div>
                </li>
              )
            })}
          </ul>

          {stage.error && (
            <p className="text-sm mt-2 mb-0 flex items-start gap-1.5 text-bad">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {stage.error}
            </p>
          )}
          <p className="text-[13px] text-ink-2 mt-3 mb-0">
            Takes <b className="text-ink">{units}</b> unit{units === 1 ? '' : 's'} off {ready.length} product
            {ready.length === 1 ? '' : 's'}, logged as {app} sales.
          </p>
          <SheetActions>
            <button type="button" className="btn btn-tonal" onClick={() => setStage({ kind: 'start' })}>
              Back
            </button>
            {stage.duplicate ? (
              <button type="button" className="btn btn-primary" onClick={() => confirm(true)} disabled={units === 0}>
                Log it again anyway
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => confirm(false)} disabled={units === 0}>
                Take off the shelf
              </button>
            )}
          </SheetActions>
        </>
      )}

      {stage.kind === 'done' && (
        <>
          <p className="m-0 font-semibold">
            Logged {stage.units} unit{stage.units === 1 ? '' : 's'} sold across {stage.products} product
            {stage.products === 1 ? '' : 's'} from {app}.
          </p>
          <p className="m-0 mt-1 text-[13px] text-ink-2">They show in Activity as {app} sales, and anything now below par is on your restock list.</p>
          <SheetActions>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </SheetActions>
        </>
      )}
    </Sheet>
  )
}
