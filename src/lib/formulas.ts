/** Formulas tab types (client-safe). */

export type FormulaKind = 'hair' | 'tattoo'

export type FormulaLine = { item: string; amount: string }

/** A take-home product recommended to the client. `sold` = they bought it at the visit; `logged` = Bintro took it out of stock. */
export type RetailLine = { productId: number | null; name: string; qty: number; sold: boolean; logged?: boolean }

export type FormulaPhoto = { id: number; label: 'before' | 'after'; url: string }

export type FormulaInput = {
  kind: FormulaKind
  clientName: string
  serviceDate: string
  service: string
  lines: FormulaLine[]
  retail: RetailLine[]
  developer: string
  ratio: string
  processingMinutes: number
  leftover: string
  aftercare: string
  followUpOn: string
  notes: string
  staffName: string
}

export type ClientFormula = FormulaInput & { id: number; createdAt: string; updatedAt: string; photoCount: number }

/** One client and every visit, newest first. */
export type ClientRecord = { name: string; visits: ClientFormula[]; lastVisit: string }

/** Groups visits by client name (case and spacing ignored). */
export function groupByClient(rows: ClientFormula[]): ClientRecord[] {
  const map = new Map<string, ClientRecord>()
  for (const r of rows) {
    const key = r.clientName.trim().toLowerCase().replace(/\s+/g, ' ')
    const rec = map.get(key) ?? { name: r.clientName.trim(), visits: [], lastVisit: r.serviceDate }
    rec.visits.push(r)
    if (r.serviceDate > rec.lastVisit) rec.lastVisit = r.serviceDate
    map.set(key, rec)
  }
  return [...map.values()].sort((a, b) => b.lastVisit.localeCompare(a.lastVisit))
}

export const HAIR_SERVICES = ['Root touch-up', 'All-over color', 'Toner / gloss', 'Highlights', 'Balayage', 'Lowlights', 'Grey blending', 'Color correction']

/** Tattoo shops log ink and aftercare; everyone else logs hair color formulas. */
export function formulaKindFor(businessType: string): FormulaKind {
  return businessType === 'tattoo' ? 'tattoo' : 'hair'
}

export function formulaTabLabel(businessType: string) {
  return businessType === 'tattoo' ? 'Ink log' : 'Formulas'
}

/** One line of text for lists and CSV: "7N 30 g + 7.3 10 g". */
export function linesText(lines: FormulaLine[]) {
  return lines
    .filter((l) => l.item.trim())
    .map((l) => [l.item.trim(), l.amount.trim()].filter(Boolean).join(' '))
    .join(' + ')
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

/** Every saved formula as a spreadsheet, so a copy can be kept outside Bintro. */
export function formulasCsv(rows: ClientFormula[]) {
  const head = ['Client', 'Date', 'Type', 'Service / placement', 'Products / colors', 'Retail prescription', 'Developer', 'Ratio', 'Minutes', 'Left over', 'Aftercare', 'Follow-up', 'Notes', 'Saved by']
  const body = rows.map((r) =>
    [r.clientName, r.serviceDate, r.kind, r.service, linesText(r.lines), r.retail.map((x) => `${x.qty} × ${x.name}${x.sold ? ' (sold)' : ''}`).join('; '), r.developer, r.ratio, r.processingMinutes || '', r.leftover, r.aftercare, r.followUpOn, r.notes, r.staffName]
      .map(csvCell)
      .join(','),
  )
  return [head.map(csvCell).join(','), ...body].join('\n')
}
